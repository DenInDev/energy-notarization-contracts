import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { summarize } from "../lib/lifecycleTiming";
import type { ExperimentReport, Observation } from "./types";

function distribution(values: number[]) {
  const sorted = [...values].sort((a,b) => a-b);
  return { ...summarize(values), p95: sorted.length ? sorted[Math.ceil(sorted.length*0.95)-1] : null };
}
function rateInterval(success: number, total: number) {
  if (!total) return null;
  const z=1.959963984540054, p=success/total, d=1+z*z/total;
  const center=(p+z*z/(2*total))/d;
  const half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Math.max(0,center-half),Math.min(1,center+half)];
}
// Resample entire repeated windows, preserving dependence between requests within a window.
function bootstrapMean(values: number[], seed: string): number[] | null {
  if (values.length < 3) return null;
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0) || 1;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0)/4294967296; };
  const means = Array.from({length:2000}, () => values.reduce(sum => sum+values[Math.floor(random()*values.length)],0)/values.length)
    .sort((a,b) => a-b);
  return [means[49],means[1949]];
}

export function summarizeExperiments(report: ExperimentReport) {
  const groups = new Map<string,Observation[]>();
  for (const sample of report.samples.filter(s => !s.warmup)) {
    const key=`${sample.caseId}/${sample.platform}`;
    const group=groups.get(key) ?? []; group.push(sample); groups.set(key,group);
  }
  // Include planned combinations with no measured samples (e.g. SDK/setup failure).
  for (const item of report.schedule) for (const platform of item.platforms)
    if (!groups.has(`${item.caseId}/${platform}`)) groups.set(`${item.caseId}/${platform}`,[]);
  return [...groups].map(([key,samples]) => {
    const split=key.lastIndexOf("/"),caseId=key.slice(0,split),platform=key.slice(split+1);
    const scenario=report.scenarios.find(s => s.id===caseId)!;
    const successes=samples.filter(s => s.status==="ok");
    const windows=report.windows.filter(w => w.caseId===caseId && w.platform===platform);
    const metric=(name: "inputPreparationMs"|"transactionToReceiptMs"|"postReceiptMs"|"endToEndMs") =>
      distribution(successes.flatMap(s => s[name]===undefined ? [] : [s[name]!]));
    const planned=report.config.runs*(scenario.suite==="concurrency" ? report.config.requests : 1);
    return { caseId,platform,...scenario,planned,attempted:samples.length,notAttempted:planned-samples.length,
      succeeded:successes.length,timedOut:samples.filter(s => s.status==="timeout").length,
      errors:samples.filter(s => s.status==="error").length,pending:samples.filter(s => s.status==="pending").length,
      completionCensored:samples.filter(s => s.completionCensored).length,
      successFraction:samples.length ? successes.length/samples.length : null,
      // Descriptive interval only: requests share service conditions, so independence may not hold.
      descriptiveWilson95:rateInterval(successes.length,samples.length),
      inputPreparationMs:distribution(samples.flatMap(s=>s.inputPreparationMs===undefined ? [] : [s.inputPreparationMs])),
      transactionToReceiptMs:distribution(samples.flatMap(s=>s.transactionToReceiptMs===undefined ? [] : [s.transactionToReceiptMs])),
      postReceiptMs:metric("postReceiptMs"),endToEndMs:metric("endToEndMs"),
      gasUsedPerTransaction:distribution(samples.flatMap(s => s.transactions.filter(tx => tx.gasUsed !== undefined).map(tx => Number(tx.gasUsed)))),
      observedGasUsedPerRequest:distribution(samples.filter(s=>s.transactions.some(tx=>tx.gasUsed!==undefined))
        .map(s=>s.transactions.reduce((sum,tx)=>sum+Number(tx.gasUsed??0),0))),
      totalGasCostWei:samples.reduce((sum,s) => sum+s.transactions.reduce((a,tx) => a+BigInt(tx.costWei??0),0n),0n).toString(),
      validatedRequestsPerSecond:distribution(windows.map(w => w.validatedRequestsPerSecond)),
      throughputMeanBootstrap95:bootstrapMean(windows.map(w => w.validatedRequestsPerSecond),`${report.config.seed}/${key}`),
    };
  });
}

export function saveReport(folder: string, report: ExperimentReport) {
  fs.mkdirSync(folder,{recursive:true});
  const target=path.join(folder,"report.json"), temp=path.join(folder,"report.json.tmp");
  fs.writeFileSync(temp,JSON.stringify(report,null,2)+"\n");
  fs.renameSync(temp,target);
}
export function analyzeReport(folder: string, report: ExperimentReport) {
  const summary=summarizeExperiments(report);
  fs.writeFileSync(path.join(folder,"summary.json"),JSON.stringify(summary,null,2)+"\n");
  const rows=["case_id,platform,planned,attempted,succeeded,timeouts,errors,not_attempted,completion_censored,median_end_to_end_ms,p95_end_to_end_ms,mean_validated_requests_per_second,total_gas_cost_wei"];
  for (const s of summary) rows.push([s.caseId,s.platform,s.planned,s.attempted,s.succeeded,s.timedOut,s.errors,s.notAttempted,
    s.completionCensored,s.endToEndMs.median,s.endToEndMs.p95,s.validatedRequestsPerSecond.mean,s.totalGasCostWei].join(","));
  fs.writeFileSync(path.join(folder,"summary.csv"),rows.join("\n")+"\n");
  fs.writeFileSync(path.join(folder,"summary.md"),[
    "# Expanded experiment results", "",`Campaign finished: ${report.complete}. Mock execution: ${report.mock}.`,"",
    "Completion latency statistics describe validated successes only. Input and receipt statistics retain observed values even when a later stage fails. Counts retain failures, pending requests and unattempted work.",
    "Administrative completion timeouts are right-censored observations, never zero-latency samples. SDK errors are separate failures.",
    "No percentile or mean of the full completion-time distribution is inferred from success-only latencies.",
    "Throughput uses the entire measured window including timeout waits; warmup/setup are excluded. Tail percentiles from small samples are exploratory.","",
    "| Case | Platform | Success / attempted / planned | Timeouts | Median successful ms | Validated requests/s |",
    "| --- | --- | --- | --- | --- | --- |",
    ...summary.map(s => `| ${s.caseId} | ${s.platform} | ${s.succeeded} / ${s.attempted} / ${s.planned} | ${s.timedOut} | ${s.endToEndMs.median?.toFixed(1)??"—"} | ${s.validatedRequestsPerSecond.mean?.toFixed(3)??"—"} |`),"",
  ].join("\n"));
}
