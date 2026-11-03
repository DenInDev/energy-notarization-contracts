import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { LifecycleWorkerClient } from "../tasks/lifecycle/workerClient";
import { runLifecycleCampaign } from "../tasks/lifecycle/campaign";
import { generateAccounts } from "../tasks/experiments/accounts";

describe("isolated campaign integration with actual worker processes", () => {
  for (const failure of ["none", "preparation", "persistence"]) {
    const failPreparation = failure === "preparation", failPersistence = failure === "persistence";
    it(failPreparation ? "cancels every prepared worker without broadcasting when one preparation fails" : failPersistence ?
      "drains released transactions before stopping on an IPC report-write failure" :
      "journals, prepares, releases, broadcasts and validates all platforms in separate processes", async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "energy-process-campaign-"));
      const accountsFile = path.join(folder, "keys.json"), output = path.join(folder, "report");
      generateAccounts(accountsFile, 3);
      if (failPreparation) fs.writeFileSync(path.join(folder, "fail-prepare"), "test");
      const clients = require("../tasks/lifecycle/workerClient"), original = clients.createLifecycleWorker;
      const writer = require("../tasks/lib/lifecycleReportWrite"), originalWrite = writer.writeLifecycleJson;
      let writeFailureTriggered = false;
      writer.writeLifecycleJson = (file: string, report: any) => {
        if (failPersistence && !writeFailureTriggered && report.samples.some((s: any) => s.broadcastState === "started")) {
          writeFailureTriggered = true; throw Object.assign(new Error("Injected persistence sharing failure"), { code: "EPERM" });
        }
        return originalWrite(file, report);
      };
      clients.createLifecycleWorker = (event: (message: any) => void) => new LifecycleWorkerClient(event,
        path.resolve("scripts/test-fixtures/lifecycle-full-worker.cjs"));
      const hre: any = { network: { config: { url: "https://example.org/rpc" } }, run: async () => {},
        ethers: { provider: { getNetwork: async () => ({ chainId: 11155111n }), send: async () => "0x0",
          getBalance: async () => 1n, getFeeData: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 2n }) } } };
      try {
        const run = runLifecycleCampaign({ runs: 1, platform: "all", seed: "isolated-integration", timeout: 10,
          accountsFile, outputDir: output, execution: "processes" }, hre);
        if (failPreparation) await assert.rejects(run, /Preparation failed before barrier/);
        else if (failPersistence) await assert.rejects(run, /Report persistence failed/);
        else await run;
        const report = JSON.parse(fs.readFileSync(path.join(output, "report.json"), "utf8"));
        assert.equal(new Set(Object.values(report.workers).map((w: any) => w.pid)).size, 3);
        assert.equal(report.complete, failure === "none");
        if (failPreparation) {
          assert.equal(report.barriers.length, 0);
          for (const p of ["baseline", "zama", "fhenix"]) assert(!fs.existsSync(path.join(folder, `sent-${p}.jsonl`)));
        } else if (failPersistence) {
          assert.equal(report.samples.length, 3);
          assert(report.samples.every((s: any) => s.status === "ok" && s.broadcastState === "acknowledged"));
          for (const p of ["baseline", "zama", "fhenix"])
            assert.equal(fs.readFileSync(path.join(folder, `sent-${p}.jsonl`), "utf8").trim().split("\n").length, 1);
        } else {
          assert.equal(report.samples.length, 30); assert.equal(report.barriers.length, 10);
          for (const barrier of report.barriers) {
            const rows = report.samples.filter((s: any) => s.warmup === barrier.warmup && s.run === barrier.run && s.operation === barrier.operation);
            const readyAt = Math.max(...Object.values(barrier.prepared).map((x: any) => Date.parse(x.at)));
            assert(rows.every((s: any) => Date.parse(s.broadcastStartedAt) >= readyAt));
            assert.equal(new Set(rows.map((s: any) => s.workerPid)).size, 3);
            assert(rows.every((s: any) => s.status === "ok" && s.preparedTransactionHash === s.transactionHash));
            assert(rows.every((s: any) => s.broadcastState === "acknowledged" && s.broadcastAckMs >= 0));
            assert(rows.every((s: any) => Math.abs(s.confirmationMs + s.postReceiptToValidatedPlaintextMs - s.transactionToValidatedPlaintextMs) < 0.01));
          }
          for (const p of ["baseline", "zama", "fhenix"]) {
            const sends = fs.readFileSync(path.join(folder, `sent-${p}.jsonl`), "utf8").trim().split("\n").map(line => JSON.parse(line));
            assert.deepEqual(sends.map(s => s.nonce), Array.from({ length: 10 }, (_, i) => i + 1));
          }
          const baseline = report.samples.find((s: any) => s.platform === "baseline" && s.operation === "notarize" && !s.warmup);
          assert(baseline.barrierWaitMs > 150, "Baseline must wait outside its broadcast/completion timer");
          assert(baseline.broadcastAckMs < baseline.barrierWaitMs);
        }
        assert(!fs.existsSync(path.join(folder, "campaign.lock")));
      } finally { clients.createLifecycleWorker = original; writer.writeLifecycleJson = originalWrite;
        fs.rmSync(folder, { recursive: true, force: true }); }
    });
  }
});
