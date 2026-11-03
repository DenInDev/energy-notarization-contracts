import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { acquireAccountLock, loadAccounts } from "../experiments/accounts";
import { TimingTrace, deadline, validatePlaintext } from "../lib/lifecycleTiming";
import { readLifecycleResult, readDeploymentBytecode } from "../lib/lifecycleResult";
import { createNonceAllocator } from "../lib/lifecycleNonce";
import { runConcurrentWorkers } from "../lib/lifecycleConcurrent";
import { createLifecycleReport, saveLifecycleReport, type LifecycleReport } from "./report";
import { planLifecycleContinuation } from "./continuationPlan";
import { continueProcessLifecycleCampaign } from "./processContinuation";
import { createMeasurementRunner, collectBlockMetadata } from "./measurement";
import { makeAdapter } from "./adapters";
import { safeError } from "./errors";
import { contracts, type Platform, type PlatformContext } from "./types";

type Args = { report: string; outputDir: string; accountsFile: string };

export async function continueLifecycleCampaign(args: Args, hre: HardhatRuntimeEnvironment) {
  const release = acquireAccountLock(args.accountsFile);
  try {
    const source = JSON.parse(fs.readFileSync(path.resolve(args.report), "utf8"));
    return await (source.executionMode === "isolated_processes_prepared_submission_barrier" ?
      continueProcessLifecycleCampaign(args, hre) : continueCampaign(args, hre));
  } finally { release(); }
}

async function continueCampaign(args: Args, hre: HardhatRuntimeEnvironment) {
  const sourcePath = path.resolve(args.report), output = path.resolve(args.outputDir);
  if (fs.existsSync(output)) throw new Error("Continuation output must be a new directory");
  const raw = fs.readFileSync(sourcePath), source: LifecycleReport = JSON.parse(raw.toString());
  const plan = planLifecycleContinuation(source);
  const timeoutMs = source.observationTimeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10000 || timeoutMs > 600000)
    throw new Error("Unsupported source observation timeout");
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Sepolia only");
  const wallets = loadAccounts(args.accountsFile, hre.ethers.provider);
  if (wallets.length < 3) throw new Error("Three saved accounts required");
  const signers = new Map(source.selectedPlatforms.map((p, i) => [p, wallets[i] as unknown as HardhatEthersSigner]));
  for (const [p, s] of signers)
    if (s.address.toLowerCase() !== source.platformOwners[p]?.toLowerCase()) throw new Error("Platform owner changed");
  const newProvenance = createLifecycleReport({ runs: source.runs, platform: "all", seed: source.scheduleSeed,
    timeout: timeoutMs / 1000, outputDir: output }, hre, signers.get("baseline")!, source.selectedPlatforms,
    source.schedule, [], []);
  for (const file of ["contracts/EnergyNotarizationPlainTest.sol", "contracts/EnergyNotarizationFHETest.sol",
    "contracts/EnergyLifecycleCoFHE.sol", "package-lock.json"])
    if (source.sourceSha256[file] !== newProvenance.sourceSha256[file]) throw new Error(`Workload/dependency source changed: ${file}`);
  if (JSON.stringify(source.decryptionPolling) !== JSON.stringify(newProvenance.decryptionPolling))
    throw new Error("SDK polling configuration changed");
  const report: any = JSON.parse(raw.toString());
  const segment: any = { sourceReport: sourcePath, sourceReportSha256: createHash("sha256").update(raw).digest("hex"),
    resumedAt: new Date().toISOString(), sourceSampleCount: source.samples.length,
    firstRemainingComparison: plan.remaining[0], remainingComparisons: plan.remaining.length,
    sourceSha256: newProvenance.sourceSha256, retrievalRetry: newProvenance.methodology.retrievalRetry,
    machine: newProvenance.machine, sdkVersions: newProvenance.sdkVersions, observationTimeoutMs: timeoutMs,
    status: "preflight", checks: [], recoveries: [],
    interpretation: "Separate observation segment after an interruption. Original failures and latency samples remain unchanged. Recovery reads are not primary or already-ready latency observations." };
  for (const file of ["tasks/lifecycle/continuation.ts", "tasks/lifecycle/continuationPlan.ts", "scripts/continue-energy-campaign.cjs"])
    segment.sourceSha256[file] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  report.continuations = [...(report.continuations || []), segment];
  report.executionComplete = false;
  fs.mkdirSync(output, { recursive: false });
  fs.writeFileSync(path.join(output, "schedule.json"), JSON.stringify({ seed: source.scheduleSeed, schedule: source.schedule }, null, 2));
  const save = () => {
    if (!raw.equals(fs.readFileSync(sourcePath))) throw new Error("Source report changed during continuation");
    saveLifecycleReport(report, output);
  };
  save();
  console.log(`Continuation: ${output}\nRemaining comparisons: ${plan.remaining.length}; original failures retained`);
  const contexts = new Map<Platform, PlatformContext>();
  const nonces = new Map<Platform, ReturnType<typeof createNonceAllocator>>();
  const rpc = (method: string, params: any[]) => deadline(() => hre.ethers.provider.send(method, params),
    30000, "continuation RPC verification");
  async function verifyNonce(p: Platform) {
    const address = signers.get(p)!.address;
    const latest = BigInt(await rpc("eth_getTransactionCount", [address, "latest"]));
    const pending = BigInt(await rpc("eth_getTransactionCount", [address, "pending"]));
    if (latest !== pending || latest !== BigInt(plan.nextNonces.get(p)!)) throw new Error(`Unexpected nonce state for ${p}`);
    if (BigInt(await rpc("eth_getBalance", [address, "latest"])) === 0n) throw new Error(`Insufficient balance for ${p}`);
  }
  try {
    await hre.run("compile");
    const head = await rpc("eth_getBlockByNumber", ["latest", false]);
    if (!head?.hash) throw new Error("No canonical verification block");
    segment.verificationBlockHash = head.hash;
    for (const p of source.selectedPlatforms) {
      const signer = signers.get(p)!, last = plan.lastSamples.get(p)!;
      await verifyNonce(p);
      const receipt = await rpc("eth_getTransactionReceipt", [last.transactionHash]);
      const tx = await rpc("eth_getTransactionByHash", [last.transactionHash]);
      const canonical = receipt && await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
      const setup: any = source.setup.find((s: any) => s.platform === p);
      if (!receipt || BigInt(receipt.status) !== 1n || receipt.blockHash !== last.blockHash ||
          canonical?.hash !== last.blockHash || !tx || Number(BigInt(tx.nonce)) !== last.transactionNonce ||
          tx.from.toLowerCase() !== signer.address.toLowerCase() || tx.to?.toLowerCase() !== setup.address.toLowerCase() ||
          BigInt(head.number) < BigInt(receipt.blockNumber)) throw new Error(`Receipt/transaction verification failed for ${p}`);
      const trace = new TimingTrace();
      const check: any = { platform: p, receiptTransactionHash: last.transactionHash, stages: trace.stages };
      segment.checks.push(check); save();
      const code = await readDeploymentBytecode(rpc, setup.address, head.hash, trace, timeoutMs);
      if (hre.ethers.keccak256(code) !== setup.deployedBytecodeKeccak256) throw new Error(`Contract code changed for ${p}`);
      const contract = await hre.ethers.getContractAt(contracts[p], setup.address, signer);
      const adapter = await deadline(() => makeAdapter(p, hre, signer, setup.address, timeoutMs, trace), timeoutMs, "continuation SDK setup");
      const model = plan.states.get(p)!;
      for (const [getter, expected, width] of [
        ["getLastEntryValue", model.last, 16], ["getEncryptedTotalHandle", model.total, 64],
        ["getLastResult", model.result, 64],
      ] as const) {
        const handle = await readLifecycleResult(rpc, contract.interface, setup.address, signer.address, getter, head.hash);
        const value = p === "baseline" ? handle : await deadline(() => adapter.decrypt(handle, trace, "completion", timeoutMs, width), timeoutMs, "continuation state decryption");
        validatePlaintext(value, expected);
        if (getter === "getLastResult" && last.status === "error") {
          if (hre.ethers.toBeHex(handle, 32) !== last.outputHandle) throw new Error("Recovery handle changed");
          segment.recoveries.push({ platform: p, run: last.run, operation: last.operation,
            originalTransactionHash: last.transactionHash, plaintext: String(value), verifiedAt: new Date().toISOString(),
            note: "Late value recovery only; original failed primary latency observation is retained." });
        }
      }
      check.status = "ok"; save();
      contexts.set(p, { contract, adapter, last: model.last, total: model.total });
      console.log(`Verified ${p}: canonical receipt, nonce, bytecode and last/total/result plaintext`);
    }
    // Recheck after potentially slow SDK state verification, before any new send.
    for (const p of source.selectedPlatforms) {
      await verifyNonce(p);
      nonces.set(p, createNonceAllocator(plan.nextNonces.get(p)!));
    }
    segment.status = "running"; segment.measurementsStartedAt = new Date().toISOString(); save();
    const measure = createMeasurementRunner({ hre, signer: signers.get("baseline")!, timeoutMs,
      samples: report.samples, contexts, platformSigners: signers });
    for (const comparison of plan.remaining) {
      const results = await runConcurrentWorkers(comparison.order, async (platform, position) => {
        const s = await measure({ platform, operation: comparison.operation, run: comparison.run,
          value: BigInt(comparison.operation === "notarize" ? 42 + comparison.run : 3 + comparison.run),
          warmup: false, orderPosition: position + 1, nonce: nonces.get(platform)!.reserve() });
        console.log(`run ${s.run} ${platform} ${s.operation}: ${s.status}; receipt=${s.confirmationMs?.toFixed(0) ?? "n/a"} ms; completion=${s.transactionToValidatedPlaintextMs?.toFixed(0) ?? "n/a"} ms${s.error ? `; ${s.error}` : ""}`);
        return s;
      });
      await Promise.all(results.map(s => collectBlockMetadata(hre, s))); save();
      if (results.some(s => s.status !== "ok")) throw new Error("Continuation stopped after current comparison settled; all observations retained");
    }
    segment.status = "finished"; segment.completedAt = new Date().toISOString();
    report.executionCompletedAt = segment.completedAt;
    report.executionComplete = true;
    // Execution can finish with retained failures; do not mislabel it all-valid.
    report.complete = report.samples.filter((s: any) => !s.warmup).every((s: any) => s.status === "ok");
    save();
    console.log(`All scheduled operations attempted. All-primary-valid: ${report.complete}; original failures preserved.`);
  } catch (error) {
    segment.status = "failed"; segment.error = safeError(error); segment.abortedAt = new Date().toISOString();
    report.complete = false; save();
    throw new Error(`Continuation failed: ${segment.error}`);
  }
}
