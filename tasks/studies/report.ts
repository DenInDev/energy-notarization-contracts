import fs from "node:fs";
import path from "node:path";
import { formatEther } from "ethers";
import { writeLifecycleJson } from "../lib/lifecycleReportWrite";
import { summarize } from "../lib/lifecycleTiming";
import type { Platform } from "../lifecycle/types";
import type { CanonicalReceiptRecovery, LateWindowAudit, StudyArgs, StudyCase, StudyTransaction, Trial, Width } from "./types";
import { effectiveReceipt, receiptWasReconciled } from "./canonical";
import { latestAttempts, trialKey } from "./continuation";
import { zeroFailureUpper95 } from "./oracle";

export type StudyReport = {
  schemaVersion: 1;
  kind: "concurrency-circuit-studies";
  complete: boolean;
  executionComplete?: boolean;
  mock: boolean;
  chainId: number;
  startedAt: string;
  finishedAt?: string;
  config: Omit<StudyArgs,"accountsFile">;
  accounts: string[];
  initialNonces?: Record<string,number>;
  cases: StudyCase[];
  platforms: Platform[];
  provenance: Record<string,unknown>;
  methodology: Record<string,unknown>;
  setups: { platform: Platform; width: Width; kind: string; transaction: StudyTransaction; address?: string; bytecodeHash?: string }[];
  trials: Trial[];
  error?: string;
  historicalErrors?: string[];
  recoveredAudits?: LateWindowAudit[];
  canonicalReceipts?: CanonicalReceiptRecovery[];
  continuations?: {
    sourceFile: string; sourceSha256: string; sourceTrialCount: number;
    startedAt: string; finishedAt?: string; status: "preflight" | "running" | "finished" | "failed";
    provenance: Record<string,unknown>; error?: string; preflight?: Record<string,unknown>;
  }[];
};

export function summarizeStudy(report: StudyReport) {
  return report.cases.flatMap(c => report.platforms.map(platform => {
    const trials = report.trials.filter(t => t.caseId === c.id && t.platform === platform && !t.warmup);
    const requests = trials.flatMap(t => t.requests);
    const ok = requests.filter(r => r.status === "ok"&&!receiptWasReconciled(r.transaction,report));
    const canonicalWindows=trials.filter(t=>!t.requests.some(r=>receiptWasReconciled(r.transaction,report)));
    const lateAudits=(report.recoveredAudits??[]).filter(a=>!a.warmup&&a.status==="ok"&&trials.some(t=>trialKey(t)===a.key));
    const successfulWindows = trials.filter(t => t.status === "ok");
    const inconsistentWindows = trials.filter(t => t.status === "inconsistent").length;
    const capacityRejectedWindows = trials.filter(t => t.status === "capacity_rejected").length;
    const incompleteWindows = trials.filter(t => ["pending","incomplete"].includes(t.status)).length;
    return { caseId:c.id,platform,...c,plannedWindows:report.config.repetitions,attemptedWindows:trials.length,
      successfulWindows:successfulWindows.length,inconsistentWindows,incompleteWindows,capacityRejectedWindows,
      plannedRequests:report.config.repetitions*(c.suite === "concurrency" ? report.config.requests : 1),
      attemptedRequests:requests.length,validatedRequests:ok.length,failedRequests:requests.filter(r => r.status === "error").length,
      separatelyLateValidatedRequests:lateAudits.reduce((n,a)=>n+a.snapshots.length,0),
      reconciledReceipts:requests.filter(r=>receiptWasReconciled(r.transaction,report)).length,
      broadcastRequests:requests.filter(r => r.transaction.broadcastState !== "prepared").length,
      orderChangedWindows:trials.filter(t => t.orderChanged).length,
      finalDiffersFromPlannedOrderWindows:trials.filter(t => t.finalMatchesPlannedOrder === false).length,
      preparationMs:summarize(trials.flatMap(t => t.preparationMs === undefined ? [] : [t.preparationMs])),
      receiptWindowMs:summarize(canonicalWindows.flatMap(t => t.receiptWindowMs === undefined ? [] : [t.receiptWindowMs])),
      fullWindowMs:summarize(canonicalWindows.flatMap(t => t.fullWindowMs === undefined ? [] : [t.fullWindowMs])),
      broadcastSpreadMs:summarize(trials.flatMap(t => t.broadcastSpreadsMs)),
      broadcastAckMs:summarize(requests.flatMap(r => r.transaction.broadcastAckMs === undefined ? [] : [r.transaction.broadcastAckMs])),
      receiptMs:summarize(requests.flatMap(r => effectiveReceipt(r.transaction,report).receiptMs === undefined ? [] : [r.transaction.receiptMs!])),
      validatedMs:summarize(ok.flatMap(r => r.transactionToValidatedMs === undefined ? [] : [r.transactionToValidatedMs])),
      postReceiptMs:summarize(ok.flatMap(r => r.postReceiptMs === undefined ? [] : [r.postReceiptMs])),
      deferredAuditCallMs:summarize(ok.flatMap(r => r.auditCallMs === undefined ? [] : [r.auditCallMs])),
      measuredGas:summarize(requests.flatMap(r => effectiveReceipt(r.transaction,report).gasUsed === undefined ? [] : [effectiveReceipt(r.transaction,report).gasUsed!])),
      receiptTransactionsPerSecond:summarize(canonicalWindows.flatMap(t => t.receiptTransactionsPerSecond === undefined ? [] : [t.receiptTransactionsPerSecond])),
      conditionalZeroBadWindowUpper95:c.suite === "concurrency" && trials.length && !inconsistentWindows && !incompleteWindows && !capacityRejectedWindows ? zeroFailureUpper95(trials.length) : null,
      intervalAssumption:"Illustrative only if these windows are independent and representative; temporal clustering can invalidate this binomial bound.",
    };
  }));
}

// Persist raw observations even on failure; no source report is overwritten.
// Summary denominators keep unattempted, failed and validated work distinct.
export function saveStudy(folder: string, report: StudyReport) {
  writeLifecycleJson(path.join(folder,"report.json"),report);
  const summary = summarizeStudy(report);
  writeLifecycleJson(path.join(folder,"summary.json"),summary);
  const controls = report.cases.filter(c => c.suite === "concurrency" && c.users === 1).flatMap(c =>
    report.platforms.map(platform => {
      const rawPair=report.trials.filter(t=>t.caseId===c.id&&t.platform===platform&&t.warmup&&t.controlDirection);
      const pair = latestAttempts(report).filter(t => t.caseId === c.id && t.platform === platform && t.warmup && t.controlDirection);
      const forward = pair.filter(t => t.controlDirection === "forward").at(-1), reverse = pair.filter(t => t.controlDirection === "reverse").at(-1);
      return {caseId:c.id,platform,complete:forward?.status === "ok" && reverse?.status === "ok",
        retainedPriorPreparationFailures:rawPair.filter(t=>t.status==="incomplete"&&t.requests.every(r=>r.transaction.broadcastState==="prepared")).length,
        retainedPriorAuditFailures:rawPair.filter(t=>t.status==="incomplete"&&t.requests.every(r=>r.transaction.status==="confirmed")).length,
        lateAuditUsed:pair.some(t=>report.recoveredAudits?.some(a=>a.key===trialKey(t)&&a.status==="ok")),
        expectedSameFinal:c.mode !== "shared_ordered",sameObservedFinal:forward?.finalPlaintexts && reverse?.finalPlaintexts ?
          JSON.stringify(forward.finalPlaintexts) === JSON.stringify(reverse.finalPlaintexts) : null,
        interpretation:"Controlled serial forward/reverse executions use identical plaintext inputs, fresh ciphertexts and fresh zero state; this is a legitimate order effect, not an inconsistency."};
    }));
  writeLifecycleJson(path.join(folder,"controls.json"),controls);
  const transactions = [...report.setups.map(s => s.transaction), ...report.trials.flatMap(t => [...t.setup,...t.requests.map(r => r.transaction)])];
  const gasCostWei = transactions.reduce((n,t) => n+BigInt(effectiveReceipt(t,report).gasCostWei ?? 0),0n).toString();
  writeLifecycleJson(path.join(folder,"costs.json"),{gasCostWei,gasCostEth:formatEther(BigInt(gasCostWei)),
    confirmedReceipts:transactions.filter(t => t.receiptStatus !== undefined).length,
    reconciledCanonicalReceipts:report.canonicalReceipts?.length??0,
    unresolvedBroadcasts:transactions.filter(t => ["started","uncertain","acknowledged"].includes(t.broadcastState) && t.receiptStatus === undefined).length,
    includes:"deployment, authorization, window/input setup, warmup, measured receipts, including confirmed failed observations; unresolved broadcasts excluded until recovered"});
  fs.writeFileSync(path.join(folder,"summary.md"),[
    "# Concurrency and circuit studies", "",`Execution complete: ${report.executionComplete ?? false}. All trials valid: ${report.complete}. Local mock: ${report.mock}.`,
    "Local mock results validate implementation only; they are not public-network performance evidence.",
    "Concurrency snapshots and final state are replayed in (blockNumber, transactionIndex) order. A different valid order/result is not an inconsistency.",
    "Concurrency audits are deferred until all window receipts: audit-call latency is already-ready retrieval plus client RPC/SDK work, not transaction-to-FHE-completion latency.",
    "Circuit completion is measured immediately from its prepared compute broadcast through equality-validated plaintext; setup input loading/readiness and signing are separate.",
    "Receipts retain confirmed transactions whose later retrieval failed. Completion statistics use validated successes only. Failures are not zero-latency samples.",
    "Exact known HCU rejections during estimateGas are capacity observations, without a compute broadcast or receipt. Their gas and completion latency are unavailable, not zero. Other errors still stop execution.",
    "A resumed preparation reuses already-confirmed input loads, preserves the original failed preparation as an additional attempt, and has a separately scoped preparation duration. Source trial prefixes are immutable. Deployment and warmup are not repeated.",
    "Late read-only audits, including measured windows, are stored separately and excluded from original latency statistics. Reincluded receipts retain their first-observed raw fields; supplementary canonical evidence supplies only identity, order and actual gas cost. No canonical latency is reconstructed. Controls explicitly flag late audits.",
    "Binomial zero-bad-window bounds are conditional on independent windows, never IID requests; no robustness guarantee follows from zero observed failures.", "",
    "| Case | Platform | Valid windows / attempted / planned | Valid requests / attempted / planned | Inconsistent | Incomplete | HCU rejected | Mean gas | Receipt ms (n) | Immediate circuit completion ms (n) |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summary.map(s => `| ${s.caseId} | ${s.platform} | ${s.successfulWindows}/${s.attemptedWindows}/${s.plannedWindows} | ${s.validatedRequests}/${s.attemptedRequests}/${s.plannedRequests} | ${s.inconsistentWindows} | ${s.incompleteWindows} | ${s.capacityRejectedWindows} | ${s.measuredGas.mean?.toFixed(1) ?? "--"} | ${s.receiptMs.mean?.toFixed(1) ?? "--"} (${s.receiptMs.n}) | ${s.validatedMs.mean?.toFixed(1) ?? "--"} (${s.validatedMs.n}) |`),
    "",`Actual recorded gas cost including setup/warmup: ${gasCostWei} wei.`, "",
    report.error ? `Failure: ${report.error}` : "No error recorded.", "",
  ].join("\n"));
}
