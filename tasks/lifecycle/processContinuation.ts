import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { deadline } from "../lib/lifecycleTiming";
import { createLifecycleReport, saveLifecycleReport, type LifecycleReport } from "./report";
import { planIsolatedLifecycleContinuation } from "./continuationPlan";
import { loadProcessOwners, runProcessLifecycleCampaign } from "./processCampaign";
import { safeError } from "./errors";
import type { Platform, Sample } from "./types";
import type { ContinuationArgs } from "./continuation";

// Called under the same account lock.
// Verifies the settled prefix of an isolated campaign before resuming it.
// Collects supplementary receipt evidence and passes the remaining schedule to the runner.
export async function continueProcessLifecycleCampaign(args: ContinuationArgs,
  hre: HardhatRuntimeEnvironment) {
  const sourcePath = path.resolve(args.report), output = path.resolve(args.outputDir);

  if (fs.existsSync(output)) throw new Error("Continuation output must be a new directory");

  const raw = fs.readFileSync(sourcePath), source: LifecycleReport = JSON.parse(raw.toString());
  const timeoutMs = source.observationTimeoutMs;

  const uniform = source.schemaVersion === 14 && source.uniformWidth === 128;
  if ((!uniform && source.schemaVersion !== 12) || source.executionMode !== "isolated_processes_prepared_submission_barrier" ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 10000 || timeoutMs > 600000)
    throw new Error("Unsupported isolated continuation source");
  if (uniform && (args.platformOnly !== "fhenix" ||
      Number(args.repeatFailedMean === true) + Number(args.resumeMissing === true) !== 1))
    throw new Error("Uniform continuation requires explicit Fhenix-only failed-mean retry authorization");
  if (!uniform && (args.platformOnly || args.repeatFailedMean || args.resumeMissing)) throw new Error("Targeted retry requires a uniform schema-14 source");
  if (args.resumeMissing && (!(source as any).continuations?.length ||
      (source as any).continuations.at(-1).platformOnly !== "fhenix" || (source as any).continuations.at(-1).status !== "failed"))
    throw new Error("Resume-missing requires a settled failed Fhenix-only segment");

  const platforms: Platform[] = ["baseline", "zama", "fhenix"];
  const owners = await loadProcessOwners(hre, args.accountsFile, platforms);

  if (JSON.stringify(source.selectedPlatforms) !== JSON.stringify(platforms) ||
      platforms.some(p => owners.get(p)!.address !== source.platformOwners[p])) {
    throw new Error("Platform signer mismatch");
  }

  const campaignArgs = { runs: source.runs, platform: uniform ? "fhenix" : "all", width: source.uniformWidth,
    seed: source.scheduleSeed, timeout: timeoutMs / 1000,
    setupTimeout: source.setupObservationTimeoutMs / 1000, outputDir: output, accountsFile: args.accountsFile, execution: "processes" as const };

  const signer = owners.get("baseline")! as unknown as HardhatEthersSigner;
  const current = createLifecycleReport(campaignArgs, hre, signer, platforms, source.schedule, [], []);

  // Only continuation orchestration/worker bootstrap may change. Timed
  // measurement, signing/broadcast, workloads, SDKs and polling stay identical.
  const allowed = new Set(["tasks/lifecycle/processCampaign.ts", "tasks/lifecycle/processWorker.ts", "tasks/lifecycle/report.ts"]);
  if (uniform) for (const file of ["tasks/lifecycle/processContinuation.ts", "tasks/lifecycle/continuationPlan.ts",
    "tasks/lifecycle/continuation.ts"]) allowed.add(file);
  if (args.resumeMissing) for (const file of ["tasks/lifecycle/adapters.ts", "tasks/lifecycle/cofhe.ts"]) allowed.add(file);
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
  if (uniform) Object.assign(segment, { platformOnly: "fhenix", uniformWidth: source.uniformWidth,
    retryAuthorization: "User explicitly requested continuing Fhenix and redoing the failed transaction with a new nonce",
    sourceViewCount: (source as any).viewDecryptSamples.length,
    interpretation: "Fhenix-only continuation with an explicitly authorized new mean transaction at a fresh nonce. Original failed primary sample remains immutable; repeat attempt is in retrySamples. New operations are a separate single-worker segment, not simultaneous or round-paired with baseline/Zama. No new deployments or warmups. Timed measurement, SDKs and polling unchanged." });
  if (args.resumeMissing) Object.assign(segment, {
    retryAuthorization: "Continue only the already-authorized unattempted Fhenix schedule; no further on-chain repetition",
    readPolicy: { minimumPollingMs: 1000, maxRateLimitAttempts: 3, rateLimitBackoffMs: 5000 },
    recoveryViews: [],
    changedReadPolicyFiles: changes.filter(([file]) => ["tasks/lifecycle/adapters.ts", "tasks/lifecycle/cofhe.ts"].includes(file))
      .map(([file, old]) => ({ file, sourceSha256: old, currentSha256: current.sourceSha256[file] })),
    interpretation: "Fhenix-only unattempted operations after another HTTP 429. Previous failures and mean retry stay immutable. No additional on-chain repetition. Off-chain retrieval uses a client floor of 1000 ms, honors larger server hints, and retries observed HTTP 429 at most three attempts with waits of at least 5/10 seconds within the original 180-second deadline. Changed read policy and interruption define a separate descriptive segment, not round-paired with the other platforms." });
  if (args.resumeMissing) segment.changedOrchestrationFiles = segment.changedOrchestrationFiles
    .filter((entry: any) => !["tasks/lifecycle/adapters.ts", "tasks/lifecycle/cofhe.ts"].includes(entry.file));

  for (const file of ["tasks/lifecycle/processContinuation.ts", "tasks/lifecycle/continuation.ts",
    "tasks/lifecycle/continuationPlan.ts", "scripts/continue-energy-campaign.cjs",
    ...(uniform ? ["scripts/continue-uniform-fhenix.cjs"] : []),
    ...(args.resumeMissing ? ["tasks/lib/cofheReadPolicy.ts"] : [])])
    segment.sourceSha256[file] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");

  report.continuations = [...(report.continuations ?? []), segment]; report.executionComplete = false;
  fs.mkdirSync(output);

  const sourcePrefix = JSON.stringify(source.samples);
  const sourceViews = JSON.stringify((source as any).viewDecryptSamples ?? []);
  const sourceSetup = JSON.stringify(source.setup);
  const sourceBarriers = JSON.stringify((source as any).barriers ?? []);
  const sourceRetries = JSON.stringify((source as any).retrySamples ?? []);
  const sourceRetryCount = ((source as any).retrySamples ?? []).length;

  // Persists the current continuation report in its output directory.
  // Checks the original report before writing continuation progress.
  const save = () => {
    if (!raw.equals(fs.readFileSync(sourcePath)) || JSON.stringify(report.samples.slice(0, source.samples.length)) !==
        sourcePrefix) throw new Error("Source report/prefix changed");
    if (uniform && (JSON.stringify(report.setup) !== sourceSetup ||
        JSON.stringify(report.viewDecryptSamples.slice(0, segment.sourceViewCount)) !== sourceViews ||
        JSON.stringify(report.barriers.slice(0, (source as any).barriers.length)) !== sourceBarriers ||
        JSON.stringify((report.retrySamples ?? []).slice(0, sourceRetryCount)) !== sourceRetries)) {
      throw new Error("Source deployment/view/barrier prefix changed");
    }

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
          Number(BigInt(tx.nonce)) !== last.transactionNonce || tx.from.toLowerCase() !== owners.get(p)!.address.toLowerCase() ||
          tx.to?.toLowerCase() !== setup.address.toLowerCase()) throw new Error(`Canonical receipt/transaction mismatch for ${p}`);

      receipts[last.transactionHash] = receipt; latestSamples.set(p, last);

      if (!last.receiptObservedAt) segment.supplementaryReceipts[last.transactionHash] = {
        receipt, observedAt: new Date().toISOString(), blockTimestamp: Number(BigInt(block.timestamp)),
        blockGasUsed: block.gasUsed, blockGasLimit: block.gasLimit,
        note: "Recovered after primary deadline; not an original receipt observation or latency" };
    }

    const plan = planIsolatedLifecycleContinuation(source, receipts);
    let remaining: (typeof plan.remaining[number] & { retryOfTransactionHash?: string })[] = plan.remaining;
    if (uniform && args.repeatFailedMean) {
      const failures = source.samples.filter(s => !s.warmup && s.status === "error");
      const failed = failures[0], last = latestSamples.get("fhenix");
      if (failures.length !== 1 || failed !== last || failed.platform !== "fhenix" || failed.operation !== "mean" ||
          failed.receiptStatus !== 1 || failed.broadcastState !== "acknowledged" || !failed.transactionHash ||
          plan.remaining[0]?.run !== failed.run || plan.remaining[0]?.operation !== "max") {
        throw new Error("Targeted retry requires exactly the latest confirmed Fhenix mean failure before max");
      }
      remaining = [{ run: failed.run, operation: "mean", order: ["fhenix"], retryOfTransactionHash: failed.transactionHash },
        ...plan.remaining.map(c => ({ ...c, order: ["fhenix"] as Platform[] }))];
      segment.expectedNewPrimarySamples = plan.remaining.length;
      segment.expectedRetrySamples = 1;
      segment.expectedNewViews = plan.remaining.filter(c => c.operation === "max").length;
      segment.failedPrimaryTransactionHash = failed.transactionHash;
      segment.firstNewNonce = plan.nextNonces.get("fhenix");
      segment.lastNewNonce = segment.firstNewNonce + remaining.length - 1;
      report.retrySamples ??= [];
    }
    if (uniform && args.resumeMissing) {
      remaining = plan.remaining.map(c => ({ ...c, order: ["fhenix"] as Platform[] }));
      Object.assign(segment, { expectedNewPrimarySamples: remaining.length, expectedRetrySamples: 0,
        expectedNewViews: remaining.filter(c => c.operation === "max").length,
        firstNewNonce: plan.nextNonces.get("fhenix"),
        lastNewNonce: plan.nextNonces.get("fhenix")! + remaining.length - 1 });
    }

    segment.firstRemainingComparison = remaining[0]; segment.remainingComparisons = remaining.length;
    segment.expectedNewSamples = uniform ? remaining.length : remaining.length * 3;

    const resume = Object.fromEntries(platforms.map(p => {
      const last = latestSamples.get(p)!, model = plan.states.get(p)!;

      return [p, { setup: source.setup.find((s: any) => s.platform === p), lastSample: last,
        receipt: receipts[last.transactionHash!], nextNonce: plan.nextNonces.get(p),
        recoverMaxView: args.resumeMissing && p === "fhenix" && last.operation === "max" && last.status === "error",
        model: Object.fromEntries(Object.entries(model).map(([k, v]) => [k, String(v)])) }];
    })) as Record<Platform, any>;

    save();
    console.log(`Isolated continuation: ${remaining.length} remaining releases; ${uniform ? `Fhenix only; ${args.repeatFailedMean ? "one authorized repeat" : "no new repeats"}; ` : ""}no deployments or warmups; original failures retained`);

    await runProcessLifecycleCampaign(campaignArgs, hre, {
      report,
      segment,
      owners,
      saveReport: save,
      remaining,
      resume,
    });
  } catch (error) {
    segment.status = "failed"; segment.error = safeError(error); segment.abortedAt ??= new Date().toISOString();
    report.complete = false; save(); throw new Error(`Isolated continuation failed: ${segment.error}`);
  }
}
