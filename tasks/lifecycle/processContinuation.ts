import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadAccounts } from "../experiments/accounts";
import { deadline } from "../lib/lifecycleTiming";
import { createLifecycleReport, saveLifecycleReport, type LifecycleReport } from "./report";
import { planIsolatedLifecycleContinuation } from "./continuationPlan";
import { runProcessLifecycleCampaign } from "./processCampaign";
import { safeError } from "./errors";
import type { Platform, Sample } from "./types";

// Called under the same account lock as the legacy continuation. No mutations
// occur here: each child verifies/rebuilds its persistent SDK/state, and only
// the existing isolated coordinator can release the remaining schedule.
// Verifies the settled prefix of an isolated campaign before resuming it.
// Collects supplementary receipt evidence and passes the remaining schedule to the runner.
export async function continueProcessLifecycleCampaign(args: { report: string; outputDir: string; accountsFile: string },
  hre: HardhatRuntimeEnvironment) {
  const sourcePath = path.resolve(args.report), output = path.resolve(args.outputDir);
  if (fs.existsSync(output)) throw new Error("Continuation output must be a new directory");
  const raw = fs.readFileSync(sourcePath), source: LifecycleReport = JSON.parse(raw.toString());
  const timeoutMs = source.observationTimeoutMs;
  if (source.schemaVersion !== 12 || source.executionMode !== "isolated_processes_prepared_submission_barrier" ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 10000 || timeoutMs > 600000)
    throw new Error("Unsupported isolated continuation source");
  const wallets = loadAccounts(args.accountsFile, hre.ethers.provider);
  const platforms: Platform[] = ["baseline", "zama", "fhenix"];
  if (JSON.stringify(source.selectedPlatforms) !== JSON.stringify(platforms) || wallets.length < 3 ||
      platforms.some((p, i) => wallets[i].address !== source.platformOwners[p])) throw new Error("Platform signer mismatch");
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Sepolia only");
  const campaignArgs = { runs: source.runs, platform: "all", seed: source.scheduleSeed, timeout: timeoutMs / 1000,
    setupTimeout: source.setupObservationTimeoutMs / 1000, outputDir: output, accountsFile: args.accountsFile, execution: "processes" as const };
  const current = createLifecycleReport(campaignArgs, hre, wallets[0] as any, platforms, source.schedule, [], []);
  // Only continuation orchestration/worker bootstrap may change. Timed
  // measurement, signing/broadcast, workloads, SDKs and polling stay identical.
  const allowed = new Set(["tasks/lifecycle/processCampaign.ts", "tasks/lifecycle/processWorker.ts", "tasks/lifecycle/report.ts"]);
  const changes = Object.entries(source.sourceSha256).filter(([file, hash]) => current.sourceSha256[file] !== hash);
  if (changes.some(([file]) => !allowed.has(file)) ||
      JSON.stringify(source.decryptionPolling) !== JSON.stringify(current.decryptionPolling))
    throw new Error("Workload, measurement or dependency provenance changed");
  const report: any = JSON.parse(raw.toString());
  const segment: any = { status: "preflight", resumedAt: new Date().toISOString(), sourceReport: sourcePath,
    sourceReportSha256: createHash("sha256").update(raw).digest("hex"), sourceSampleCount: source.samples.length,
    executionMode: source.executionMode, sourceSha256: { ...current.sourceSha256 },
    changedOrchestrationFiles: changes.map(([file, old]) => ({ file, sourceSha256: old, currentSha256: current.sourceSha256[file] })),
    machine: current.machine, sdkVersions: current.sdkVersions, observationTimeoutMs: timeoutMs,
    checks: [], recoveries: [], supplementaryReceipts: {},
    interpretation: "Interrupted segmented experiment. Original primary failures, receipt/completion timings and sample prefix remain immutable. Late receipts/plaintext recovery are supplementary evidence, excluded from original timing statistics. Same isolated process/barrier protocol; new SDK sessions after interruption." };
  for (const file of ["tasks/lifecycle/processContinuation.ts", "tasks/lifecycle/continuation.ts",
    "tasks/lifecycle/continuationPlan.ts", "scripts/continue-energy-campaign.cjs"])
    segment.sourceSha256[file] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  report.continuations = [...(report.continuations ?? []), segment]; report.executionComplete = false;
  fs.mkdirSync(output);
  // Persists the current continuation report in its output directory.
  // Checks the original report before writing continuation progress.
  const save = () => {
    if (!raw.equals(fs.readFileSync(sourcePath)) || JSON.stringify(report.samples.slice(0, source.samples.length)) !==
        JSON.stringify(source.samples)) throw new Error("Source report/prefix changed");
    saveLifecycleReport(report, output);
  };
  save();
  // Issues a provider RPC call during continuation preflight.
  // Bounds the time spent waiting for the response.
  const rpc = (method: string, params: any[]) => deadline(() => hre.ethers.provider.send(method, params),
    30000, "continuation canonical RPC");
  try {
    const receipts: Record<string, any> = {};
    const latestSamples = new Map<Platform, Sample>();
    for (const p of platforms) {
      const last = [...source.samples].reverse().find(s => s.platform === p);
      const setup: any = source.setup.find((s: any) => s.platform === p);
      if (!last?.transactionHash || !setup || setup.status !== "ok") throw new Error("Missing settled deployment/sample prefix");
      const receipt = await rpc("eth_getTransactionReceipt", [last.transactionHash]);
      const tx = await rpc("eth_getTransactionByHash", [last.transactionHash]);
      const block = receipt && await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
      if (!receipt || receipt.transactionHash?.toLowerCase() !== last.transactionHash.toLowerCase() ||
          BigInt(receipt.status) !== 1n || block?.hash !== receipt.blockHash ||
          (last.blockHash && receipt.blockHash !== last.blockHash) || !tx ||
          tx.hash?.toLowerCase() !== last.transactionHash.toLowerCase() ||
          Number(BigInt(tx.nonce)) !== last.transactionNonce || tx.from.toLowerCase() !== wallets[platforms.indexOf(p)].address.toLowerCase() ||
          tx.to?.toLowerCase() !== setup.address.toLowerCase()) throw new Error(`Canonical receipt/transaction mismatch for ${p}`);
      receipts[last.transactionHash] = receipt; latestSamples.set(p, last);
      if (!last.receiptObservedAt) segment.supplementaryReceipts[last.transactionHash] = {
        receipt, observedAt: new Date().toISOString(), blockTimestamp: Number(BigInt(block.timestamp)),
        blockGasUsed: block.gasUsed, blockGasLimit: block.gasLimit,
        note: "Recovered after primary deadline; not an original receipt observation or latency" };
    }
    const plan = planIsolatedLifecycleContinuation(source, receipts);
    segment.firstRemainingComparison = plan.remaining[0]; segment.remainingComparisons = plan.remaining.length;
    segment.expectedNewSamples = plan.remaining.length * 3;
    const resume = Object.fromEntries(platforms.map(p => {
      const last = latestSamples.get(p)!, model = plan.states.get(p)!;
      return [p, { setup: source.setup.find((s: any) => s.platform === p), lastSample: last,
        receipt: receipts[last.transactionHash!], nextNonce: plan.nextNonces.get(p),
        model: Object.fromEntries(Object.entries(model).map(([k, v]) => [k, String(v)])) }];
    })) as Record<Platform, any>;
    save();
    console.log(`Isolated continuation: ${plan.remaining.length} remaining comparisons; no deployments or warmups; original failures retained`);
    await runProcessLifecycleCampaign(campaignArgs, hre, { report, segment, sourcePath, sourceBytes: raw,
      remaining: plan.remaining, resume });
  } catch (error) {
    segment.status = "failed"; segment.error = safeError(error); segment.abortedAt ??= new Date().toISOString();
    report.complete = false; save(); throw new Error(`Isolated continuation failed: ${segment.error}`);
  }
}
