import { buildLifecycleSchedule } from "../lib/lifecycleSchedule";
import { lifecycleOperations, smartMeterOwner, type Platform, type Sample, type PlatformContext } from "./types";
import { expectedPlaintext } from "./operations";
import type { LifecycleReport } from "./report";

// Only a settled, receipt-confirmed prefix can be continued. A failed read
// remains a failed latency observation even if its value is recovered later.
export function planLifecycleContinuation(report: LifecycleReport) {
  if (report.executionMode === "isolated_processes_prepared_submission_barrier")
    throw new Error("Refusing to continue an isolated-process report with the legacy async timing protocol");

  return planConfirmedPrefix(report);
}

// Receipt recovery is supplementary evidence, never a repair of a failed
// primary observation. Only the private planning copy receives its metadata.
export function planIsolatedLifecycleContinuation(report: LifecycleReport, receipts: Record<string, any>) {
  const uniform = report.schemaVersion === 14 && [16, 128].includes(report.uniformWidth!);
  if ((!uniform && report.schemaVersion !== 12) || report.executionMode !== "isolated_processes_prepared_submission_barrier")
    throw new Error("An isolated schema-12 or uniform schema-14 source is required");

  const copy = JSON.parse(JSON.stringify(report)) as LifecycleReport;

  for (const sample of copy.samples) {
    if (!sample.transactionHash || sample.preparedTransactionHash !== sample.transactionHash ||
        sample.broadcastState !== "acknowledged") throw new Error("Unacknowledged or ambiguous transaction");
    if (sample.receiptStatus !== undefined && sample.receiptStatus !== 1) throw new Error("Reverted transaction");
    if (!sample.blockHash || !sample.receiptObservedAt || sample.gasUsed === undefined) {
      const receipt = receipts[sample.transactionHash];

      if (sample.status !== "error" || sample.warmup || !receipt ||
          receipt.transactionHash?.toLowerCase() !== sample.transactionHash.toLowerCase() ||
          BigInt(receipt.status) !== 1n || !receipt.blockHash || !receipt.blockNumber || !receipt.gasUsed)
        throw new Error("Missing confirmed supplementary receipt");

      sample.blockHash = receipt.blockHash;
      sample.blockNumber = Number(BigInt(receipt.blockNumber));
      sample.gasUsed = Number(BigInt(receipt.gasUsed));
      // Placeholder only inside the planning copy. Never serialized as latency.
      sample.receiptObservedAt = "supplementary-receipt-not-primary-timing";
    }
  }

  return uniform && (copy as any).continuations?.some((s: any) => s.platformOnly === "fhenix") ?
    planUniformFhenixSegments(copy) : planConfirmedPrefix(copy);
}

// Validate each platform's prefix after an explicitly single-platform segment.
// Retry transactions consume nonces but never replace or advance primary slots.
function planUniformFhenixSegments(report: LifecycleReport) {
  const selected: Platform[] = ["baseline", "zama", "fhenix"];
  const operations = lifecycleOperations(report.uniformWidth);
  const schedule = buildLifecycleSchedule(report.runs, selected, operations, report.scheduleSeed);
  if (report.complete !== false || JSON.stringify(report.selectedPlatforms) !== JSON.stringify(selected) ||
      JSON.stringify(report.schedule) !== JSON.stringify(schedule)) throw new Error("Uniform segment schedule changed");
  const warmup = buildLifecycleSchedule(1, selected, operations, report.scheduleSeed).map(c => ({ ...c, run: 0, warmup: true }));
  const planned = [...warmup, ...schedule.map(c => ({ ...c, warmup: false }))];
  const states = new Map(selected.map(p => [p, { last: 0n, total: 0n, result: 0n, meterOwner: 0n }]));
  const lastSamples = new Map<Platform, Sample>(), nextNonces = new Map<Platform, number>();
  let fhenixCompleted = 0;
  for (const platform of selected) {
    const setup: any = report.setup.find((s: any) => s.platform === platform);
    if (setup?.status !== "ok" || !Number.isSafeInteger(setup.transactionNonce)) throw new Error("Invalid deployment prefix");
    const primary = report.samples.filter(s => s.platform === platform);
    if (primary.length < warmup.length || primary.length > planned.length) throw new Error("Invalid platform prefix length");
    for (let i = 0; i < primary.length; i++) {
      const s = primary[i], expected = planned[i];
      if (s.run !== expected.run || s.operation !== expected.operation || s.warmup !== expected.warmup)
        throw new Error("Platform samples are not a unique schedule prefix");
    }
    const retries: any[] = ((report as any).retrySamples ?? []).filter((s: any) => s.platform === platform);
    if (platform !== "fhenix" && retries.length) throw new Error("Unexpected other-platform retry");
    const combined: any[] = [...primary, ...retries].sort((a, b) => a.transactionNonce - b.transactionNonce);
    let nonce = setup.transactionNonce + 1, primaryIndex = 0;
    const retriedHashes = new Set<string>();
    const state = states.get(platform)!;
    for (const s of combined) {
      if (s.transactionNonce !== nonce++ || s.transactionHash !== s.preparedTransactionHash ||
          s.broadcastState !== "acknowledged" || s.receiptStatus !== 1 || !s.blockHash ||
          !["ok", "error"].includes(s.status) || (s.warmup && s.status !== "ok"))
        throw new Error("Ambiguous or non-contiguous confirmed transaction history");
      if (s.retryOfTransactionHash) {
        const original = primary[primaryIndex - 1];
        if (!original || original.status !== "error" || s.status !== "ok" || s.operation !== "mean" ||
            retriedHashes.has(s.retryOfTransactionHash) ||
            original.transactionHash !== s.retryOfTransactionHash || s.run !== original.run ||
            original.operation !== s.operation || s.warmup) throw new Error("Invalid historical explicit retry");
        retriedHashes.add(s.retryOfTransactionHash);
      } else if (primary[primaryIndex++] !== s) throw new Error("Primary transaction order changed");
      const value = s.operation === "set_meter_owner" ? BigInt(smartMeterOwner) : BigInt(s.operation === "notarize" ? 42 + s.run : 3 + s.run);
      const expected = expectedPlaintext(s.operation, { ...state, width: report.uniformWidth } as unknown as PlatformContext, value);
      if (s.expectedPlaintext !== String(expected) || (s.status === "ok" && s.plaintext !== String(expected)))
        throw new Error("Segment plaintext model mismatch");
      if (s.operation === "set_meter_owner") state.meterOwner = expected;
      else if (s.operation === "notarize") state.last = expected;
      else if (s.operation === "add") state.total = expected;
      else state.result = expected;
    }
    nextNonces.set(platform, nonce); lastSamples.set(platform, primary.at(-1)!);
    if (platform === "fhenix") fhenixCompleted = primary.length - warmup.length;
  }
  const remaining = schedule.slice(fhenixCompleted);
  if (!remaining.length) throw new Error("No unattempted Fhenix primary operations remain");
  return { states, lastSamples, nextNonces, remaining };
}

// Validates that the recorded samples form a settled schedule prefix.
// Reconstructs platform state and nonces and returns the remaining comparisons.
function planConfirmedPrefix(report: LifecycleReport) {
  const selected: Platform[] = ["baseline", "zama", "fhenix"];

  if (report.chainId !== "11155111" || report.complete !== false ||
      report.signerMode !== "independent_platform_accounts" ||
      JSON.stringify(report.selectedPlatforms) !== JSON.stringify(selected))
    throw new Error("Continuation requires an incomplete independent-account Sepolia campaign");

  const operations = lifecycleOperations(report.uniformWidth);
  const schedule = buildLifecycleSchedule(report.runs, selected, operations, report.scheduleSeed);

  if (JSON.stringify(schedule) !== JSON.stringify(report.schedule)) throw new Error("Schedule changed");

  const warmup = buildLifecycleSchedule(1, selected, operations, report.scheduleSeed)
    .map(c => ({ ...c, run: 0, warmup: true }));
  const rows = [...warmup, ...schedule.map(c => ({ ...c, warmup: false }))];

  if (report.samples.length % selected.length !== 0) throw new Error("Unsettled comparison");

  const completedRows = report.samples.length / selected.length;

  if (completedRows < warmup.length || completedRows >= rows.length) throw new Error("No remaining settled schedule prefix");

  const states = new Map(selected.map(p => [p, { last: 0n, total: 0n, result: 0n, meterOwner: 0n }]));
  const lastSamples = new Map<Platform, Sample>();
  const nextNonces = new Map(selected.map(p => {
    const setup: any = report.setup.find((s: any) => s.platform === p);

    if (!setup || setup.status !== "ok" || !Number.isSafeInteger(setup.transactionNonce))
      throw new Error("Deployment/warmup is not complete");

    return [p, setup.transactionNonce + 1] as const;
  }));

  for (let i = 0; i < completedRows; i++) {
    const row = rows[i], samples = report.samples.slice(i * 3, i * 3 + 3);

    if (new Set(samples.map(s => s.platform)).size !== 3) throw new Error("Duplicate or missing platform");

    for (const s of samples) {
      if (!selected.includes(s.platform) || s.run !== row.run || s.operation !== row.operation || s.warmup !== row.warmup)
        throw new Error("Samples are not a schedule prefix");
      if (!s.transactionHash || !s.blockHash || !s.receiptObservedAt || s.gasUsed === undefined ||
          s.transactionNonce !== nextNonces.get(s.platform) || !["ok", "error"].includes(s.status))
        throw new Error("Unconfirmed or ambiguous transaction; refusing to resubmit");
      if (s.warmup && s.status !== "ok") throw new Error("Failed warmup cannot be continued");

      const state = states.get(s.platform)!;
      const value = s.operation === "set_meter_owner" ? BigInt(smartMeterOwner) :
        BigInt(s.operation === "notarize" ? 42 + s.run : 3 + s.run);
      const expected = expectedPlaintext(s.operation, { ...state, width: report.uniformWidth } as unknown as PlatformContext, value);

      if (s.expectedPlaintext !== String(expected) || (s.status === "ok" && s.plaintext !== String(expected)))
        throw new Error("Recorded plaintext model does not match the schedule");
      if (s.operation === "set_meter_owner") state.meterOwner = expected;
      else if (s.operation === "notarize") state.last = value;
      else if (s.operation === "add") state.total = expected;
      else state.result = expected;

      nextNonces.set(s.platform, nextNonces.get(s.platform)! + 1);
      lastSamples.set(s.platform, s);
    }
  }

  return { states, lastSamples, nextNonces, remaining: schedule.slice(completedRows - warmup.length) };
}
