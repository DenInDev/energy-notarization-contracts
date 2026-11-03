import { buildLifecycleSchedule } from "../lib/lifecycleSchedule";
import { operations, type Platform, type Sample } from "./types";
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
  if (report.schemaVersion !== 12 || report.executionMode !== "isolated_processes_prepared_submission_barrier")
    throw new Error("An isolated schema-12 source is required");
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
  return planConfirmedPrefix(copy);
}

function planConfirmedPrefix(report: LifecycleReport) {
  const selected: Platform[] = ["baseline", "zama", "fhenix"];
  if (report.chainId !== "11155111" || report.complete !== false ||
      report.signerMode !== "independent_platform_accounts" ||
      JSON.stringify(report.selectedPlatforms) !== JSON.stringify(selected))
    throw new Error("Continuation requires an incomplete independent-account Sepolia campaign");
  const schedule = buildLifecycleSchedule(report.runs, selected, operations, report.scheduleSeed);
  if (JSON.stringify(schedule) !== JSON.stringify(report.schedule)) throw new Error("Schedule changed");
  const warmup = buildLifecycleSchedule(1, selected, operations, report.scheduleSeed)
    .map(c => ({ ...c, run: 0, warmup: true }));
  const rows = [...warmup, ...schedule.map(c => ({ ...c, warmup: false }))];
  if (report.samples.length % selected.length !== 0) throw new Error("Unsettled comparison");
  const completedRows = report.samples.length / selected.length;
  if (completedRows < warmup.length || completedRows >= rows.length) throw new Error("No remaining settled schedule prefix");
  const states = new Map(selected.map(p => [p, { last: 0n, total: 0n, result: 0n }]));
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
      const value = BigInt(s.operation === "notarize" ? 42 + s.run : 3 + s.run);
      const expected = s.operation === "notarize" ? value : s.operation === "add" ? state.total + state.last :
        s.operation === "mul_scalar" ? state.last * value : s.operation === "mean" ?
          (state.last + state.total) / 2n : state.last > state.total ? state.last : state.total;
      if (s.expectedPlaintext !== String(expected) || (s.status === "ok" && s.plaintext !== String(expected)))
        throw new Error("Recorded plaintext model does not match the schedule");
      if (s.operation === "notarize") state.last = value;
      else if (s.operation === "add") state.total = expected;
      else state.result = expected;
      nextNonces.set(s.platform, nextNonces.get(s.platform)! + 1);
      lastSamples.set(s.platform, s);
    }
  }
  return { states, lastSamples, nextNonces, remaining: schedule.slice(completedRows - warmup.length) };
}
