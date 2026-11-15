import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { StudyReport } from "./report";
import type { Trial } from "./types";
import { defaults } from "./plan";
import { AbiCoder } from "ethers";
import { capacityRejection } from "./capacity";
import { effectiveReceipt } from "./canonical";
import { allStudyTransactions } from "./history";

export const trialKey = (t: Trial) => [t.caseId,t.platform,t.repetition,t.warmup,t.controlDirection ?? "main"].join("/");

function hasRevertReason(error: unknown, expected: string): boolean {
  const queue:unknown[]=[error],seen=new Set<unknown>();
  while(queue.length&&seen.size<20){
    const current=queue.shift();if(!current||seen.has(current))continue;seen.add(current);
    if(typeof current==="string"&&current.startsWith("0x08c379a0")){
      try{if(AbiCoder.defaultAbiCoder().decode(["string"],"0x"+current.slice(10))[0]===expected)return true;}catch{}
    }else if(typeof current==="object"){
      const e=current as Record<string,unknown>;
      if(e.reason===expected)return true;
      queue.push(e.data,e.error,e.info,e.cause);
    }
  }
  return false;
}

export const isUnusedSnapshot = (error: unknown) => hasRevertReason(error,"Not your request");
export const isUnopenedWindow = (error: unknown) => hasRevertReason(error,"Unknown window");

// Confirmed compute attempts may receive a separate correctness audit, never a replay.
export function validateCircuitContinuation(source: StudyReport) {
  if(source.config.suite!=="circuits")throw new Error("Circuit continuation requires a circuit study");
  return validateStudyContinuation(source);
}

export function validateStudyContinuation(source: StudyReport) {
  if (source.kind !== "concurrency-circuit-studies" || source.executionComplete ||
      !["circuits","concurrency"].includes(source.config.suite) || source.cases.some(c=>c.suite!==source.config.suite))
    throw new Error("Only interrupted single-suite preparations can be continued");
  const transactions = allStudyTransactions(source).map(t=>effectiveReceipt(t,source));
  if (transactions.some(t=>t.broadcastState!=="prepared" && t.status!=="confirmed"))
    throw new Error("Unsettled or failed broadcast prevents continuation");
  const successful = new Set(latestAttempts(source).filter(t=>["ok","capacity_rejected"].includes(t.status)).map(trialKey));
  const knownCapacity=(t:Trial)=>t.platform==="zama"&&t.status==="capacity_rejected"&&t.rejection?.source==="estimateGas"&&
    t.rejection.broadcast===false&&capacityRejection({message:t.rejection.limit+"()"})===t.rejection.limit&&
    t.requests.length===1&&t.requests[0].transaction.transactionNonce===-1&&
    t.requests[0].transaction.broadcastState==="prepared"&&!t.requests[0].transaction.preparedTransactionHash&&!t.requests[0].transaction.transactionHash;
  if(source.trials.some(t=>t.status==="capacity_rejected"&&!knownCapacity(t)))throw new Error("Invalid capacity-rejection evidence");
  if(source.config.suite==="circuits"&&source.cases.some(c=>source.platforms.some(p=>!source.trials.some(t=>
    t.caseId===c.id&&t.platform===p&&t.warmup&&(t.status==="ok"||knownCapacity(t))))))
    throw new Error("All original circuit warmups must already be valid or known unsent capacity rejections");
  for (const t of source.trials.filter(t=>!["ok","capacity_rejected"].includes(t.status))) {
    if (successful.has(trialKey(t))) continue;
    const c = source.cases.find(c=>c.id===t.caseId)!;
    if(c.suite==="concurrency"){
      const confirmedWindow=t.status==="incomplete"&&t.requests.length===source.config.requests&&
        t.requests.every(r=>r.transaction.status==="confirmed"&&r.transaction.receiptStatus===1);
      if(confirmedWindow)continue;
      // No signed window or request exists: only a setup gas estimate failed.
      if(t.status==="incomplete" && t.setup.length===0 && t.requests.length===0)continue;
      if(t.status!=="incomplete" || t.setup.length!==1 || t.setup[0].status!=="confirmed" ||
        t.requests.some(r=>r.transaction.broadcastState!=="prepared" || r.transaction.transactionHash || r.transaction.broadcastStartedAt))
        throw new Error("Partially broadcast windows cannot be replayed");
      continue;
    }
    if(t.status==="incomplete" && t.requests.length===1 &&
        effectiveReceipt(t.requests[0].transaction,source).status==="confirmed" &&
        effectiveReceipt(t.requests[0].transaction,source).receiptStatus===1 &&
        t.setup.length>0 && t.setup.every(tx=>effectiveReceipt(tx,source).status==="confirmed") &&
        t.inputValues?.length===c.inputCount)continue;
    const pausedSetup=t===source.trials.at(-1)&&t.status==="pending"&&t.setup.some(tx=>
      source.settledSetupReceipts?.some(r=>r.transactionHash===tx.transactionHash));
    if (t.warmup || (t.status!=="incomplete"&&!pausedSetup) || t.requests.length!==1 ||
        t.requests[0].transaction.broadcastState!=="prepared" ||
        t.requests[0].transaction.preparedTransactionHash || t.requests[0].transaction.transactionNonce!==-1 ||
        !t.setup.length || t.setup.some(tx=>effectiveReceipt(tx,source).status!=="confirmed") || t.inputValues?.length!==c.inputCount)
      throw new Error("Preparation checkpoint is not safe to resume");
  }
  const measured = source.trials.filter(t=>!t.warmup && t.status==="ok");
  if(new Set(measured.map(trialKey)).size!==measured.length) throw new Error("Duplicate successful planned slot");
  return transactions.filter(t=>t.status==="confirmed");
}

export type StudyContinuation = { sourceFile: string; sourceSha256: string; report: StudyReport };

export async function continueStudy(sourceFile: string, outputDir: string, hre: HardhatRuntimeEnvironment,
  accountsFile = defaults.accountsFile, checkpointAudit?: string) {
  const bytes=fs.readFileSync(sourceFile);
  let report=JSON.parse(bytes.toString()) as StudyReport;
  if(report.scopeRevision && createHash("sha256").update(fs.readFileSync(report.scopeRevision.originalReport)).digest("hex")!==report.scopeRevision.originalSha256)
    throw new Error("Original raw scope report changed");
  if(checkpointAudit){
    const {recoverPausedSetup}=await import("./checkpoint");
    report=await recoverPausedSetup(sourceFile,report,checkpointAudit,hre);
  }
  if(report.config.suite==="circuits"){
    const {recoverLateComputeReceipts}=await import("./checkpoint");
    report=await recoverLateComputeReceipts(sourceFile,report,hre);
  }
  validateStudyContinuation(report);
  const continuation: StudyContinuation = {sourceFile:path.resolve(sourceFile),
    sourceSha256:createHash("sha256").update(bytes).digest("hex"),report};
  const {runStudy}=await import("./runner");
  return runStudy({...defaults,...report.config,accountsFile,outputDir,live:true},hre,continuation);
}

// A retained pre-broadcast preparation failure is not a second primary result.
// Coverage uses the latest attempt of each planned slot, while reports retain all.
export function latestAttempts(report: StudyReport) {
  return [...new Map(report.trials.map(t=>[trialKey(t),t])).values()].map(t=>{
    const late=report.recoveredAudits?.find(a=>a.key===trialKey(t)&&a.status==="ok");
    return late?{...t,status:"ok" as const,expectedFinal:late.expectedFinal,finalPlaintexts:late.finalPlaintexts}:t;
  });
}
