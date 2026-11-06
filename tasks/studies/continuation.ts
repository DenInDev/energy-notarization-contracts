import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { StudyReport } from "./report";
import type { Trial } from "./types";
import { defaults } from "./plan";
import { AbiCoder } from "ethers";
import { capacityRejection } from "./capacity";

export const trialKey = (t: Trial) => [t.caseId,t.platform,t.repetition,t.warmup,t.controlDirection ?? "main"].join("/");

export function isUnusedSnapshot(error: unknown): boolean {
  const queue:unknown[]=[error],seen=new Set<unknown>();
  while(queue.length&&seen.size<20){
    const current=queue.shift();if(!current||seen.has(current))continue;seen.add(current);
    if(typeof current==="string"&&current.startsWith("0x08c379a0")){
      try{if(AbiCoder.defaultAbiCoder().decode(["string"],"0x"+current.slice(10))[0]==="Not your request")return true;}catch{}
    }else if(typeof current==="object"){
      const e=current as Record<string,unknown>;
      if(e.reason==="Not your request")return true;
      queue.push(e.data,e.error,e.info,e.cause);
    }
  }
  return false;
}

// This continuation supports only failed preparations before a compute send.
// Confirmed/reverted/uncertain compute attempts must never be replayed here.
export function validateCircuitContinuation(source: StudyReport) {
  if(source.config.suite!=="circuits")throw new Error("Circuit continuation requires a circuit study");
  return validateStudyContinuation(source);
}

export function validateStudyContinuation(source: StudyReport) {
  if (source.kind !== "concurrency-circuit-studies" || source.executionComplete ||
      !["circuits","concurrency"].includes(source.config.suite) || source.cases.some(c=>c.suite!==source.config.suite))
    throw new Error("Only interrupted single-suite preparations can be continued");
  const transactions = [...source.setups.map(s=>s.transaction),...source.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])];
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
      if(t.status!=="incomplete" || t.setup.length!==1 || t.setup[0].status!=="confirmed" ||
        t.requests.some(r=>r.transaction.broadcastState!=="prepared" || r.transaction.transactionHash || r.transaction.broadcastStartedAt))
        throw new Error("Partially broadcast windows cannot be replayed");
      continue;
    }
    if (t.warmup || t.status!=="incomplete" || t.requests.length!==1 ||
        t.requests[0].transaction.broadcastState!=="prepared" ||
        t.requests[0].transaction.preparedTransactionHash || t.requests[0].transaction.transactionNonce!==-1 ||
        !t.setup.length || t.setup.some(tx=>tx.status!=="confirmed") || t.inputValues?.length!==c.inputCount)
      throw new Error("Preparation checkpoint is not safe to resume");
  }
  const measured = source.trials.filter(t=>!t.warmup && t.status==="ok");
  if(new Set(measured.map(trialKey)).size!==measured.length) throw new Error("Duplicate successful planned slot");
  return transactions.filter(t=>t.status==="confirmed");
}

export type StudyContinuation = { sourceFile: string; sourceSha256: string; report: StudyReport };

export async function continueStudy(sourceFile: string, outputDir: string, hre: HardhatRuntimeEnvironment,
  accountsFile = defaults.accountsFile) {
  const bytes=fs.readFileSync(sourceFile), report=JSON.parse(bytes.toString()) as StudyReport;
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
