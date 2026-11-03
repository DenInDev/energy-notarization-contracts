import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { toBeHex } from "ethers";
import { LifecycleWorkerClient } from "../tasks/lifecycle/workerClient";
import { runLifecycleCampaign } from "../tasks/lifecycle/campaign";
import { continueLifecycleCampaign } from "../tasks/lifecycle/continuation";
import { planIsolatedLifecycleContinuation } from "../tasks/lifecycle/continuationPlan";
import { generateAccounts } from "../tasks/experiments/accounts";

describe("isolated continuation after late receipt inclusion", () => {
  for (const invalid of [undefined, "nonce", "code", "state", "canonical"] as const) {
    it(invalid ? `sends nothing on ${invalid} mismatch` :
      "uses three persistent processes, sends only missing operations and retains the failed observation", async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "energy-resume-process-"));
      const accountsFile = path.join(folder, "keys.json"), output = path.join(folder, "pilot");
      generateAccounts(accountsFile, 3);
      const clients = require("../tasks/lifecycle/workerClient"), original = clients.createLifecycleWorker;
      clients.createLifecycleWorker = (event: (message: any) => void) => new LifecycleWorkerClient(event,
        path.resolve("scripts/test-fixtures/lifecycle-full-worker.cjs"));
      const hre: any = { network: { config: { url: "https://example.org/rpc" } }, run: async () => {},
        ethers: { provider: { getNetwork: async () => ({ chainId: 11155111n }), send: async () => "0x0",
          getBalance: async () => 1n, getFeeData: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 2n }) } } };
      try {
        await runLifecycleCampaign({ runs: 1, platform: "all", seed: "isolated-resume-test", timeout: 10,
          accountsFile, outputDir: output, execution: "processes" }, hre);
        const report = JSON.parse(fs.readFileSync(path.join(output, "report.json"), "utf8"));
        report.complete = false; delete report.completedAt;
        report.samples = report.samples.slice(0, 21); report.barriers = report.barriers.slice(0, 7);
        const failed = report.samples.find((s: any) => s.platform === "zama" && !s.warmup && s.operation === "add");
        failed.status = "error"; failed.error = "transaction receipt deadline exceeded (10000 ms)";
        const lateReceipt = { transactionHash: failed.transactionHash, status: "0x1", blockNumber: "0x3e8",
          blockHash: toBeHex(999, 32), gasUsed: "0x5208", effectiveGasPrice: "0x14" };
        for (const key of ["blockHash", "blockNumber", "receiptStatus", "receiptObservedAt", "gasUsed", "gasCostWei",
          "effectiveGasPriceWei", "plaintext", "confirmationMs", "transactionToValidatedPlaintextMs",
          "postReceiptToValidatedPlaintextMs", "outputHandle", "alreadyReadyDecryptMs"])
          delete failed[key];
        const receiptMap: Record<string, any> = { [failed.transactionHash]: lateReceipt };
        const plan = planIsolatedLifecycleContinuation(report, receiptMap);
        assert.deepEqual(plan.remaining.map(c => c.operation), ["mul_scalar", "mean", "max"]);
        assert.equal(plan.states.get("zama")!.total, 85n);
        assert.throws(() => planIsolatedLifecycleContinuation(report, {}), /supplementary receipt/);
        assert.throws(() => planIsolatedLifecycleContinuation(report, { [failed.transactionHash]: { ...lateReceipt, status: "0x0" } }));
        const uncertain = JSON.parse(JSON.stringify(report)); uncertain.samples.find((s: any) => s.status === "error").broadcastState = "uncertain";
        assert.throws(() => planIsolatedLifecycleContinuation(uncertain, receiptMap), /ambiguous/);
        const sourcePath = path.join(folder, "source.json"), outputDir = path.join(folder, "continued");
        const bytes = JSON.stringify(report); fs.writeFileSync(sourcePath, bytes);
        const platforms = ["baseline", "zama", "fhenix"];
        for (const p of platforms) fs.unlinkSync(path.join(folder, `sent-${p}.jsonl`));
        if (invalid && invalid !== "canonical") fs.writeFileSync(path.join(folder, `fail-resume-${invalid}`), "test");
        hre.ethers.provider.send = async (method: string, params: any[]) => {
          if (method === "eth_getTransactionCount") return toBeHex(8);
          const last = report.samples.find((s: any) => s.transactionHash === params[0]);
          const setup = last && report.setup.find((s: any) => s.platform === last.platform);
          if (method === "eth_getTransactionReceipt") return { ...lateReceipt, transactionHash: params[0], blockHash: toBeHex(999, 32) };
          if (method === "eth_getTransactionByHash") return { hash: params[0], nonce: toBeHex(last.transactionNonce),
            from: report.platformOwners[last.platform], to: setup.address };
          if (method === "eth_getBlockByNumber") return { hash: toBeHex(invalid === "canonical" ? 998 : 999, 32),
            number: "0x3e8", timestamp: "0x1", gasUsed: "0x64", gasLimit: "0x3e8" };
          throw new Error("Unexpected coordinator RPC");
        };
        const run = continueLifecycleCampaign({ report: sourcePath, outputDir, accountsFile }, hre);
        if (invalid) await assert.rejects(run);
        else await run;
        const result = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
        assert.equal(fs.readFileSync(sourcePath, "utf8"), bytes);
        assert.deepEqual(result.samples.slice(0, 21), report.samples);
        assert.equal(result.complete, false);
        if (invalid) {
          assert.equal(result.continuations[0].status, "failed");
          for (const p of platforms) assert(!fs.existsSync(path.join(folder, `sent-${p}.jsonl`)));
        } else {
          assert.equal(result.executionComplete, true); assert.equal(result.continuations[0].status, "finished");
          assert.equal(result.samples.length, 30); assert.equal(result.samples.filter((s: any) => s.status === "error").length, 1);
          assert.equal(result.continuations[0].recoveries[0].plaintext, "85");
          assert.equal(result.continuations[0].recoveries[0].getter, "getEncryptedTotalHandle");
          assert.equal(new Set(result.samples.slice(21).map((s: any) => s.workerPid)).size, 3);
          assert.equal(result.setup.length, 3);
          for (const p of platforms) {
            const sent = fs.readFileSync(path.join(folder, `sent-${p}.jsonl`), "utf8").trim().split("\n").map(l => JSON.parse(l));
            assert.deepEqual(sent.map(s => s.nonce), [8, 9, 10]);
          }
          assert.equal(result.barriers.length, 10);
          assert(result.barriers.slice(7).every((b: any) => !b.warmup));
        }
        assert(!fs.existsSync(path.join(folder, "campaign.lock")));
      } finally { clients.createLifecycleWorker = original; fs.rmSync(folder, { recursive: true, force: true }); }
    });
  }
});
