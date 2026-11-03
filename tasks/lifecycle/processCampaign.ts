import fs from "node:fs";
import path from "node:path";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadAccounts } from "../experiments/accounts";
import { buildLifecycleSchedule, type ScheduledComparison } from "../lib/lifecycleSchedule";
import { createLifecycleReport, saveLifecycleReport, type LifecycleReport } from "./report";
import { createLifecycleWorker, type LifecycleWorkerClient } from "./workerClient";
import { safeError } from "./errors";
import { operations, type BenchmarkArgs, type Platform, type Sample } from "./types";

export type ProcessContinuation = { report: LifecycleReport; segment: any; sourcePath: string;
  sourceBytes: Buffer; remaining: ScheduledComparison[]; resume: Record<Platform, any> };

// Runs matched comparisons using one persistent process per platform.
// Coordinates preparation and barrier release and records each worker's results.
export async function runProcessLifecycleCampaign(args: BenchmarkArgs, hre: HardhatRuntimeEnvironment,
  continuation?: ProcessContinuation) {
  if (!args.accountsFile) throw new Error("Process isolation requires saved independent platform accounts");
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 1000 ||
      !Number.isInteger(args.timeout) || args.timeout < 10 || !Number.isInteger(args.setupTimeout ?? args.timeout) ||
      (args.setupTimeout ?? args.timeout) < 10) throw new Error("Invalid campaign limits");
  if (!["all", "both", "baseline", "zama", "fhenix"].includes(args.platform)) throw new Error("Invalid platform");
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Sepolia only");
  const wallets = loadAccounts(args.accountsFile, hre.ethers.provider);
  if (wallets.length < 3) throw new Error("Three saved platform accounts required");
  const selected: Platform[] = args.platform === "all" ? ["baseline", "zama", "fhenix"] :
    args.platform === "both" ? ["zama", "fhenix"] : [args.platform as Platform];
  const owners = new Map(selected.map(p => [p, wallets[{ baseline: 0, zama: 1, fhenix: 2 }[p]]]));
  const output = path.resolve(args.outputDir || `logs/energy-process-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  if (!continuation && fs.existsSync(path.join(output, "report.json"))) throw new Error("Output already contains a report");
  fs.mkdirSync(output, { recursive: true });
  const schedule = buildLifecycleSchedule(args.runs, selected, operations, args.seed);
  const samples: Sample[] = continuation?.report.samples ?? [], setup: any[] = continuation?.report.setup ?? [];
  const report = continuation?.report ?? createLifecycleReport(args, hre, owners.get(selected[0])! as unknown as HardhatEthersSigner,
    selected, schedule, setup, samples);
  report.schemaVersion = 12; report.executionMode = "isolated_processes_prepared_submission_barrier";
  report.platformOwners = Object.fromEntries([...owners].map(([p, s]) => [p, s.address]));
  report.signerMode = "independent_platform_accounts";
  report.methodology.confirmation = "Before prepared transaction broadcast invocation to observation of its successful receipt (1 inclusion confirmation; not finality); signing and gas estimation precede the barrier";
  report.methodology.completion = "Prepared broadcast invocation to equality-validated plaintext; input preparation, transaction preparation and barrier wait excluded and recorded separately";
  report.methodology.sequencing = "One persistent OS process, signer and nonce cursor per platform; sequential deployment/setup; all encrypted inputs and signed transactions prepared before a shared timed submission barrier; all workers settle before the next operation";
  report.methodology.receiptPolling = "Immediate eth_getTransactionReceipt, then 500 ms waits after pending responses; raw broadcast acknowledgement is separate; only receipt reads can retry";
  Object.assign(report.methodology, {
    broadcast: "Exactly one eth_sendRawTransaction per signed operation; predetermined hash journaled before barrier release; start and acknowledgement recorded separately; failed acknowledgement is uncertain and never automatically retransmitted",
    feeControl: "One recorded EIP-1559 fee quote shared by all platforms per comparison; gas estimated and transaction signed before the barrier",
    fullLifecycle: "preparationMs + transactionToValidatedPlaintextMs excludes intentional barrier waiting; worker wall time also includes the barrier and must be labeled separately",
    processIsolation: "Separate Node processes isolate SDK main-thread proof generation; OS scheduling and shared CPU/RPC/network contention remain possible",
  });
  const runtime: any = report;
  if (continuation) continuation.segment.previousWorkers = runtime.workers;
  runtime.workers = {}; runtime.barriers ??= [];
  let persistenceError: string | undefined;
  // Persists the current isolated campaign report and its continuation state.
  // Writes progress to the selected output directory.
  const save = () => {
    try {
      if (continuation && (!continuation.sourceBytes.equals(fs.readFileSync(continuation.sourcePath)) ||
          JSON.stringify(samples.slice(0, continuation.segment.sourceSampleCount)) !==
          JSON.stringify(JSON.parse(continuation.sourceBytes.toString()).samples)))
        throw new Error("Original source or inherited samples changed");
      saveLifecycleReport(report, output);
    }
    catch (error) { persistenceError = safeError(error); throw error; }
  };
  // Checks that the saved continuation prefix still matches the source.
  // Guards report persistence against changes to historical observations.
  const verifyPersistence = () => {
    if (persistenceError) throw new Error(`Report persistence failed; no further comparisons permitted: ${persistenceError}`);
  };
  fs.writeFileSync(path.join(output, "schedule.json"), JSON.stringify({ seed: args.seed, schedule }, null, 2)); save();
  console.log(`Isolated lifecycle benchmark: ${output}`);
  const workers = new Map<Platform, LifecycleWorkerClient>();
  const timeoutMs = args.timeout * 1000, setupTimeoutMs = (args.setupTimeout ?? args.timeout) * 1000;
  const commandBudget = 5 * Math.max(timeoutMs, setupTimeoutMs) + 60000;
  // Identifies a sample by platform, round, operation and warmup status.
  // Replaces its earlier snapshot or appends it when first observed.
  const upsertSample = (sample: Sample) => {
    const i = samples.findIndex(s => s.platform === sample.platform && s.run === sample.run && s.operation === sample.operation && s.warmup === sample.warmup);
    if (i < 0) samples.push(sample); else samples[i] = sample;
  };
  try {
    await hre.run("compile");
    for (const p of selected) {
      const owner = owners.get(p)!;
      const pending = BigInt(await hre.ethers.provider.send("eth_getTransactionCount", [owner.address, "pending"]));
      const latest = BigInt(await hre.ethers.provider.send("eth_getTransactionCount", [owner.address, "latest"]));
      if (pending !== latest || await hre.ethers.provider.getBalance(owner.address) === 0n)
        throw new Error(`Funded signer with no pending transactions required for ${p}`);
    }
    for (const p of selected) {
      const worker = createLifecycleWorker(message => {
        if (message?.type === "fatal") runtime.workerStartupError = { platform: p, error: message.error };
        if (message?.type === "sample" && message.sample?.platform === p) upsertSample(message.sample);
        if (message?.type === "setup" && message.entry?.platform === p) {
          const i = setup.findIndex(e => e.platform === p);
          if (i < 0) setup.push(message.entry); else setup[i] = message.entry;
        }
        try { save(); } catch { /* coordinator drains active observations before aborting */ }
      });
      workers.set(p, worker); runtime.workers[p] = { pid: worker.child.pid, owner: owners.get(p)!.address }; save();
      console.log(`${p}: starting isolated process ${worker.child.pid}; ${continuation ? "verifying existing contract/state" : "deploying and initializing SDK"}...`);
      const initialized = await worker.request("initialize", { platform: p, ownerAddress: owners.get(p)!.address,
        accountsFile: path.resolve(args.accountsFile), timeoutMs, setupTimeoutMs,
        resume: continuation?.resume[p] }, commandBudget);
      if (continuation) {
        continuation.segment.checks.push(initialized);
        continuation.segment.recoveries.push(...initialized.recoveries);
        save();
      }
      verifyPersistence();
    }
    if (continuation) {
      // Every platform must finish read-only recovery before any barrier can
      // release a new mutation. Nonces and canonical receipts are rechecked.
      continuation.segment.finalChecks = await Promise.all(selected.map(p =>
        workers.get(p)!.request("verify_resume", {}, commandBudget)));
      continuation.segment.status = "running";
      continuation.segment.measurementsStartedAt = new Date().toISOString(); save();
    }
    const warmup = buildLifecycleSchedule(1, selected, operations, args.seed).map(c => ({ ...c, run: 0, warmup: true }));
    const comparisons = continuation ? continuation.remaining.map(c => ({ ...c, warmup: false })) :
      [...warmup, ...schedule.map(c => ({ ...c, warmup: false }))];
    for (const comparison of comparisons) {
      const fee = await hre.ethers.provider.getFeeData();
      if (fee.maxFeePerGas === null || fee.maxPriorityFeePerGas === null || fee.maxFeePerGas < fee.maxPriorityFeePerGas)
        throw new Error("EIP-1559 fee quote unavailable");
      const fees = { maxFeePerGas: String(fee.maxFeePerGas), maxPriorityFeePerGas: String(fee.maxPriorityFeePerGas), quotedAt: new Date().toISOString() };
      const prepared = await Promise.allSettled(comparison.order.map((platform, position) =>
        workers.get(platform)!.request("prepare", { fees, request: { platform, operation: comparison.operation,
          run: comparison.run, warmup: comparison.warmup, orderPosition: position + 1,
          value: String(comparison.operation === "notarize" ? 42 + comparison.run : 3 + comparison.run) } }, commandBudget)));
      const preparationFailure = prepared.find(r => r.status === "rejected");
      verifyPersistence();
      if (preparationFailure?.status === "rejected") throw new Error(`Preparation failed before barrier release: ${safeError(preparationFailure.reason)}`);
      // Signed hashes/nonces are journaled before any permission to broadcast.
      const barrier: any = { run: comparison.run, operation: comparison.operation, warmup: comparison.warmup,
        fees, prepared: Object.fromEntries(comparison.order.map((p, i) =>
          [p, { hash: (prepared[i] as PromiseFulfilledResult<Sample>).value.preparedTransactionHash,
            at: (prepared[i] as PromiseFulfilledResult<Sample>).value.preparationCompletedAt }])) };
      runtime.barriers.push(barrier); save();
      const releaseAt = Date.now() + 250;
      barrier.releaseAt = new Date(releaseAt).toISOString();
      const key = `${comparison.warmup}/${comparison.run}/${comparison.operation}`;
      const executing = comparison.order.map(p => workers.get(p)!.request("execute", { key, releaseAt }, commandBudget));
      const settling = Promise.allSettled(executing);
      try { save(); } catch { /* sends were released: drain them before aborting */ }
      const settled = await settling;
      for (const result of settled) if (result.status === "fulfilled") upsertSample(result.value);
      const rows = samples.filter(s => s.run === comparison.run && s.operation === comparison.operation && s.warmup === comparison.warmup);
      const starts = rows.flatMap(s => s.broadcastStartedAt ? [Date.parse(s.broadcastStartedAt)] : []);
      barrier.broadcastStartSpreadMs = starts.length === selected.length ? Math.max(...starts) - Math.min(...starts) : null;
      for (const sample of rows) {
        console.log(`${sample.warmup ? "warmup" : `run ${sample.run}`} ${sample.platform} ${sample.operation}: ${sample.status}; broadcastAck=${sample.broadcastAckMs?.toFixed(0) ?? "n/a"} ms; receipt=${sample.confirmationMs?.toFixed(0) ?? "n/a"} ms; completion=${sample.transactionToValidatedPlaintextMs?.toFixed(0) ?? "n/a"} ms; startSpread=${barrier.broadcastStartSpreadMs} ms${sample.error ? `; ${sample.error}` : ""}`);
        if (!continuation && sample.warmup && sample.operation === "max" && sample.status === "ok") setup.find(e => e.platform === sample.platform).status = "ok";
      }
      save();
      verifyPersistence();
      if (settled.some(r => r.status === "rejected") || rows.length !== selected.length || rows.some(s => s.status !== "ok"))
        throw new Error("Isolated campaign stopped after all current workers settled; observations and prepared transaction hashes retained");
    }
    if (continuation) {
      continuation.segment.status = "finished";
      continuation.segment.completedAt = new Date().toISOString();
      runtime.executionComplete = true; runtime.executionCompletedAt = continuation.segment.completedAt;
      report.complete = samples.every(s => s.status === "ok");
    } else { report.complete = true; report.completedAt = new Date().toISOString(); }
    save();
    console.log(`All scheduled operations attempted; all-primary-valid: ${report.complete}; report: ${path.join(output, "report.json")}`);
  } catch (error) {
    report.complete = false;
    if (continuation) {
      continuation.segment.status = "failed"; continuation.segment.abortedAt = new Date().toISOString();
      continuation.segment.error = safeError(error);
    } else { report.abortedAt = new Date().toISOString(); runtime.error = safeError(error); }
    try { save(); } catch { /* fallback snapshot below, after workers settle */ }
    throw error;
  } finally {
    await Promise.allSettled([...workers.values()].map(w => w.close(commandBudget)));
    if (persistenceError) fs.writeFileSync(path.join(output, `persistence-recovery-${process.pid}.json`),
      JSON.stringify(report, null, 2));
  }
}
