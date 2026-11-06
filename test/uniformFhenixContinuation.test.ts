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

describe("authorized Fhenix-only uniform continuation", function () {
  this.timeout(120000);

  for (const invalid of [undefined, "nonce", "owner"] as const) {
    it(invalid ? `broadcasts nothing when ${invalid} verification fails` :
      "repeats mean at a fresh nonce, keeps the failed primary, and sends only missing Fhenix operations", async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "uniform-fhenix-resume-"));
      const accountsFile = path.join(folder, "keys.json"), output = path.join(folder, "source-run");
      generateAccounts(accountsFile, 3);
      const clients = require("../tasks/lifecycle/workerClient"), original = clients.createLifecycleWorker;
      clients.createLifecycleWorker = (event: (message: any) => void) => new LifecycleWorkerClient(event,
        path.resolve("scripts/test-fixtures/lifecycle-full-worker.cjs"));
      const hre: any = { network: { config: { url: "https://example.org/rpc" } }, run: async () => {},
        ethers: { provider: { getNetwork: async () => ({ chainId: 11155111n }), send: async () => "0x0",
          getBalance: async () => 1n, getFeeData: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 2n }) } } };
      try {
        await runLifecycleCampaign({ runs: 3, platform: "all", seed: "uniform-continuation", timeout: 10,
          accountsFile, outputDir: output, execution: "processes", width: 128 }, hre);
        const source = JSON.parse(fs.readFileSync(path.join(output, "report.json"), "utf8"));
        source.complete = false; delete source.completedAt;
        source.samples = source.samples.slice(0, 33); source.barriers = source.barriers.slice(0, 11);
        source.viewDecryptSamples = source.viewDecryptSamples.filter((s: any) => s.warmup);
        const failed = source.samples.find((s: any) => s.platform === "fhenix" && s.run === 1 && s.operation === "mean");
        failed.status = "error"; failed.error = "sealOutput request failed: Too Many Requests";
        for (const key of ["plaintext", "plaintextValidatedAt", "transactionToValidatedPlaintextMs", "postReceiptToValidatedPlaintextMs"])
          delete failed[key];
        const plan = planIsolatedLifecycleContinuation(source, {});
        assert.equal(plan.remaining.length, 13); assert.equal(plan.remaining[0].operation, "max");
        assert.equal(plan.nextNonces.get("fhenix"), 12);
        const sourcePath = path.join(folder, "source.json"), outputDir = path.join(folder, "continued");
        const raw = JSON.stringify(source); fs.writeFileSync(sourcePath, raw);
        for (const p of ["baseline", "zama", "fhenix"]) fs.unlinkSync(path.join(folder, `sent-${p}.jsonl`));
        if (invalid === "nonce") fs.writeFileSync(path.join(folder, "fail-resume-fhenix-nonce"), "test");
        if (invalid === "owner") fs.writeFileSync(path.join(folder, "fail-resume-owner"), "test");
        let rpcSource = source, rpcNonce = 12;
        hre.ethers.provider.send = async (method: string, params: any[]) => {
          if (method === "eth_getTransactionCount") return toBeHex(rpcNonce);
          const last = rpcSource.samples.find((s: any) => s.transactionHash === params[0]);
          if (method === "eth_getTransactionReceipt") return { transactionHash: params[0], status: "0x1",
            blockHash: toBeHex(999, 32), blockNumber: "0x3e8", gasUsed: "0x5208", effectiveGasPrice: "0x14" };
          if (method === "eth_getTransactionByHash") return { hash: params[0], nonce: toBeHex(last.transactionNonce),
            from: rpcSource.platformOwners[last.platform], to: rpcSource.setup.find((s: any) => s.platform === last.platform).address };
          if (method === "eth_getBlockByNumber") return { hash: toBeHex(999, 32), number: "0x3e8", timestamp: "0x1" };
          throw new Error("Unexpected coordinator RPC");
        };
        const running = continueLifecycleCampaign({ report: sourcePath, outputDir, accountsFile,
          platformOnly: "fhenix", repeatFailedMean: true }, hre);
        if (invalid) await assert.rejects(running); else await running;
        const result = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
        assert.equal(fs.readFileSync(sourcePath, "utf8"), raw);
        assert.deepEqual(result.samples.slice(0, 33), source.samples);
        assert.deepEqual(result.setup, source.setup);
        assert.deepEqual(result.viewDecryptSamples.slice(0, 3), source.viewDecryptSamples);
        assert.equal(result.complete, false);
        for (const p of ["baseline", "zama"]) assert(!fs.existsSync(path.join(folder, `sent-${p}.jsonl`)));
        if (invalid) {
          assert.equal(result.continuations.at(-1).status, "failed");
          assert(!fs.existsSync(path.join(folder, "sent-fhenix.jsonl")));
        } else {
          assert.equal(result.continuations.at(-1).status, "finished");
          assert.equal(result.executionComplete, false);
          assert.equal(result.platformExecutionComplete.fhenix, true);
          assert.equal(result.samples.length, 46);
          assert(result.samples.slice(33).every((s: any) => s.platform === "fhenix" && s.status === "ok"));
          assert.equal(result.retrySamples.length, 1);
          assert.equal(result.retrySamples[0].status, "ok");
          assert.equal(result.retrySamples[0].attempt, 2);
          assert.equal(result.retrySamples[0].retryOfTransactionHash, failed.transactionHash);
          assert.notEqual(result.retrySamples[0].transactionHash, failed.transactionHash);
          assert.equal(result.retrySamples[0].transactionNonce, 12);
          assert.equal(result.viewDecryptSamples.length, 6);
          const sent = fs.readFileSync(path.join(folder, "sent-fhenix.jsonl"), "utf8").trim().split("\n").map(l => JSON.parse(l));
          assert.deepEqual(sent.map(s => s.nonce), Array.from({ length: 14 }, (_, i) => i + 12));
          assert.equal(result.samples.filter((s: any) => s.status === "error").length, 1);

          // A later failed max must be recovered read-only, never replayed.
          const checkpoint = JSON.parse(JSON.stringify(result));
          checkpoint.samples = checkpoint.samples.slice(0, 40); checkpoint.barriers = checkpoint.barriers.slice(0, 19);
          checkpoint.viewDecryptSamples = checkpoint.viewDecryptSamples.filter((s: any) => s.warmup || s.run === 1);
          checkpoint.platformExecutionComplete.fhenix = false;
          checkpoint.continuations.at(-1).status = "failed";
          const max = checkpoint.samples.find((s: any) => s.platform === "fhenix" && s.run === 2 && s.operation === "max");
          max.status = "error"; max.error = "sealOutput request failed: Too Many Requests";
          for (const key of ["plaintext", "plaintextValidatedAt", "transactionToValidatedPlaintextMs", "postReceiptToValidatedPlaintextMs"]) delete max[key];
          const checkpointPath = path.join(folder, "checkpoint.json"), secondDir = path.join(folder, "continued-again");
          const checkpointRaw = JSON.stringify(checkpoint); fs.writeFileSync(checkpointPath, checkpointRaw);
          rpcSource = checkpoint; rpcNonce = 20;
          fs.unlinkSync(path.join(folder, "sent-fhenix.jsonl"));
          await continueLifecycleCampaign({ report: checkpointPath, outputDir: secondDir, accountsFile,
            platformOnly: "fhenix", resumeMissing: true }, hre);
          const second = JSON.parse(fs.readFileSync(path.join(secondDir, "report.json"), "utf8"));
          assert.equal(fs.readFileSync(checkpointPath, "utf8"), checkpointRaw);
          assert.deepEqual(second.samples.slice(0, 40), checkpoint.samples);
          assert.equal(second.retrySamples.length, 1);
          assert.equal(second.continuations.at(-1).recoveryViews.length, 1);
          assert.equal(second.continuations.at(-1).recoveryViews[0].referenceTransactionHash, max.transactionHash);
          assert.equal(second.samples.length, 46);
          assert.equal(second.platformExecutionComplete.fhenix, true);
          const secondSent = fs.readFileSync(path.join(folder, "sent-fhenix.jsonl"), "utf8").trim().split("\n").map(l => JSON.parse(l));
          assert.deepEqual(secondSent.map(s => s.nonce), [20, 21, 22, 23, 24, 25]);
          assert.equal(second.samples.filter((s: any) => s.status === "error").length, 2);
        }
        assert(!fs.existsSync(path.join(folder, "campaign.lock")));
      } finally {
        clients.createLifecycleWorker = original;
        fs.rmSync(folder, { recursive: true, force: true });
      }
    });
  }
});
