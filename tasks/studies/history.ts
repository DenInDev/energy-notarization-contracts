import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { StudyReport } from "./report";
import type { SettledSetupReceipt, StudyArgs } from "./types";
import { planSummary } from "./plan";

export const allStudyTrials = (report: Pick<StudyReport,"trials"|"supplementaryTrials">) =>
  [...report.trials,...(report.supplementaryTrials??[])];

export const allStudyCases = (report: StudyReport) =>
  [...new Map([...report.cases,...(report.scopeRevision?.originalCases??[])].map(c=>[c.id,c])).values()];

export const allStudyTransactions = (report: StudyReport) => [
  ...report.setups.map(s=>s.transaction),
  ...allStudyTrials(report).flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)]),
];

const sha=(file:string)=>createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// A documented projection, not a replacement of the original raw report.
// Selection depends only on predeclared cases/rounds, never success or latency.
export function deriveSelectedStudyScope(sourceFile:string,args:StudyArgs,settled:SettledSetupReceipt[]=[]):StudyReport {
  const source=JSON.parse(fs.readFileSync(sourceFile,"utf8")) as StudyReport;
  const plan=planSummary(args),originalSha256=sha(sourceFile);
  if(source.kind!=="concurrency-circuit-studies" || source.config.suite!=="concurrency" ||
      args.suite!==source.config.suite || args.seed!==source.config.seed || args.widths!==source.config.widths ||
      args.repetitions>source.config.repetitions || JSON.stringify(plan.platforms)!==JSON.stringify(source.platforms))
    throw new Error("Scope selection must retain the source protocol, seed, width and platforms");
  for(const c of plan.cases)if(!source.cases.some(old=>JSON.stringify(old)===JSON.stringify(c)))
    throw new Error("Selected workload differs from the original case");
  const ids=new Set(plan.cases.map(c=>c.id)),selectedIndices:number[]=[],supplementaryIndices:number[]=[];
  source.trials.forEach((t,index)=>(ids.has(t.caseId)&&t.repetition<=args.repetitions?selectedIndices:supplementaryIndices).push(index));
  const report=structuredClone(source),{accountsFile:_secret,...config}=args;
  report.config={...config,live:true};report.cases=plan.cases;
  report.trials=selectedIndices.map(i=>structuredClone(source.trials[i]));
  report.supplementaryTrials=[...structuredClone(source.supplementaryTrials??[]),...supplementaryIndices.map(i=>structuredClone(source.trials[i]))];
  report.complete=false;report.executionComplete=false;delete report.finishedAt;
  report.scopeRevision={originalReport:path.resolve(sourceFile),originalSha256,originalConfig:source.config,originalCases:allStudyCases(source),
    selectedIndices,supplementaryIndices,selectedCaseIds:[...ids],repetitions:args.repetitions,
    reason:"User approved reducing both matrices: retain compatible observations and preserve all other attempts as supplementary. Timed workload and RPC/SDK policy unchanged; the resumed interleaving and sessions form a separate segment.",at:new Date().toISOString()};
  const setupTransactions=[...source.setups.map(s=>s.transaction),...allStudyTrials(source).flatMap(t=>t.setup)];
  for(const receipt of settled){
    const tx=setupTransactions.find(t=>t.transactionHash===receipt.transactionHash);
    if(!tx || tx.receiptStatus!==undefined || tx.preparedTransactionHash!==receipt.transactionHash ||
        tx.user!==receipt.user || tx.transactionNonce!==receipt.transactionNonce || sha(receipt.auditFile)!==receipt.auditSha256)
      throw new Error("Late receipt does not match an original unobserved setup");
    const audit=JSON.parse(fs.readFileSync(receipt.auditFile,"utf8"));
    const proof=audit.receipts.find((r:any)=>r.transactionHash===receipt.transactionHash);
    if(audit.status!=="settled" || audit.mutationCalls!==0 || !audit.safeToTerminateVerifiedProcess ||
        audit.report.sha256!==originalSha256 || path.resolve(audit.report.file)!==path.resolve(sourceFile) ||
        !proof || proof.nonce!==tx.transactionNonce || proof.status!==1 || proof.blockHash!==receipt.canonical.blockHash ||
        proof.gasCostWei!==receipt.canonical.gasCostWei)
      throw new Error("Settled setup lacks the exact canonical stop-audit evidence");
    (report.settledSetupReceipts??=[]).push(structuredClone(receipt));
  }
  // Prove a lossless partition of every original observation.
  for(const [index,trial] of source.trials.entries()){
    const selected=selectedIndices.indexOf(index),extra=supplementaryIndices.indexOf(index);
    const copy=selected>=0?report.trials[selected]:report.supplementaryTrials[(source.supplementaryTrials?.length??0)+extra];
    if(JSON.stringify(copy)!==JSON.stringify(trial))throw new Error("Selection changed an original observation");
  }
  return report;
}
