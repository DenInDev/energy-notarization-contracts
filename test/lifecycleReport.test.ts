import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { createLifecycleReport, saveLifecycleReport } from "../tasks/lifecycle/report";
import type { Sample } from "../tasks/lifecycle/types";

describe("lifecycle reporting", () => {
  it("excludes warmup, retains receipt samples after failure, and saves compatible artifacts", () => {
    const samples: Sample[] = [
      { platform: "baseline", operation: "add", run: 0, warmup: true,
        startedAt: "warmup", status: "ok", stages: [], expectedPlaintext: "42", confirmationMs: 999 },
      { platform: "baseline", operation: "add", run: 1, warmup: false,
        startedAt: "first", status: "ok", expectedPlaintext: "42",
        confirmationMs: 100, transactionToValidatedPlaintextMs: 120,
        postReceiptToValidatedPlaintextMs: 20,
        stages: [{ stage: "completion.read_attempt", startMs: 100, durationMs: 20, status: "ok" }] },
      { platform: "baseline", operation: "add", run: 2, warmup: false,
        startedAt: "second", status: "error", expectedPlaintext: "42", confirmationMs: 200,
        stages: [{ stage: "completion.read_attempt", startMs: 200, durationMs: 30, status: "error" }] },
    ];
    const hre = { network: { config: { url: "https://example.org/rpc" } } } as unknown as HardhatRuntimeEnvironment;
    const report = createLifecycleReport(
      { runs: 2, platform: "baseline", seed: "test", timeout: 10, outputDir: "" },
      hre, { address: "owner" } as HardhatEthersSigner, ["baseline"], [], [], samples,
    );
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "lifecycle-report-test-"));
    try {
      saveLifecycleReport(report, folder);
      const saved = JSON.parse(fs.readFileSync(path.join(folder, "report.json"), "utf8"));
      assert.equal(saved.schemaVersion,11);
      assert.equal(saved.decryptionPolling.requestedIntervalMs,10);
      assert.ok(saved.decryptionPolling.bundles.zama.sha256);
      assert.ok(saved.decryptionPolling.bundles.fhenix.sha256);
      assert.equal(saved.energyRepresentation.readingBits,16);
      assert.equal(saved.energyRepresentation.accumulatorBits,64);
      const row = saved.summary.find((row: { operation: string }) => row.operation === "add");
      assert.equal(row.attempted, 2);
      assert.equal(row.validated, 1);
      assert.equal(row.failed, 1);
      assert.equal(row.confirmationMs.n, 2);
      assert.equal(row.confirmationMs.mean, 150);
      assert.equal(row.transactionToValidatedPlaintextMs.n, 1);
      assert.equal(row.alreadyReadyDecryptMs.n, 0);
      assert.equal(saved.stageSummary[0].n, 1);
      assert.equal(saved.stageSummary[0].mean, 20);
      assert.ok(saved.sourceSha256["tasks/lifecycle/measurement.ts"]);
      assert.ok(fs.readFileSync(path.join(folder, "summary.md"), "utf8").includes("Receipt to validated plaintext"));
      assert.equal(fs.readFileSync(path.join(folder, "stages.jsonl"), "utf8").trim().split("\n").length, 2);
    } finally {
      for (const file of ["report.json", "summary.md", "stages.jsonl"]) {
        fs.rmSync(path.join(folder, file), { force: true });
      }
      fs.rmdirSync(folder);
    }
  });
});
