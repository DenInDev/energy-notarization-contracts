import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { StudyReport } from "./report";
import { deadline } from "../lib/lifecycleTiming";

const sha = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// An acknowledged compute may have confirmed while the observer was asleep.
// Recover identity/gas only; runner.ts must audit its snapshot before any new send.
export async function recoverLateComputeReceipts(sourceFile:string, source:StudyReport,
  hre:HardhatRuntimeEnvironment):Promise<StudyReport>{
  const report=structuredClone(source);
  if(source.config.suite!=="circuits" || source.executionComplete)return report;
  const read=(method:string,params:any[])=>deadline(()=>hre.ethers.provider.send(method,params),20000,"late compute receipt verification");
  if(Number((await hre.ethers.provider.getNetwork()).chainId)!==source.chainId ||
      (!source.mock&&source.chainId!==11155111))throw new Error("Late compute chain mismatch");
  for(const trial of source.trials.filter(t=>t.status==="incomplete")){
    for(const result of trial.requests){
      const tx=result.transaction;
      if(tx.status==="confirmed" || source.lateComputeReceipts?.some(r=>r.transactionHash===tx.transactionHash) ||
          tx.broadcastState==="prepared")continue;
      if(trial.requests.length!==1 || tx.method!=="executeCircuit" || tx.broadcastState!=="acknowledged" ||
          !tx.transactionHash || tx.transactionHash!==tx.preparedTransactionHash || tx.blockHash || tx.blockNumber!==undefined)
        throw new Error("Only an acknowledged compute with a missing receipt can be recovered; no replay");
      const receipt=await read("eth_getTransactionReceipt",[tx.transactionHash]);
      const transaction=await read("eth_getTransactionByHash",[tx.transactionHash]);
      const target=source.setups.find(s=>s.kind==="deployment"&&s.platform===trial.platform&&
        s.width===source.cases.find(c=>c.id===trial.caseId)!.width)?.address;
      const block=receipt&&await read("eth_getBlockByNumber",[receipt.blockNumber,false]);
      if(!receipt || !transaction || receipt.status!=="0x1" || receipt.transactionHash!==tx.transactionHash ||
          receipt.from?.toLowerCase()!==tx.user.toLowerCase() || transaction.hash!==tx.transactionHash ||
          transaction.from?.toLowerCase()!==tx.user.toLowerCase() || Number(BigInt(transaction.nonce))!==tx.transactionNonce ||
          Number(BigInt(transaction.chainId))!==source.chainId || !target ||
          transaction.to?.toLowerCase()!==target.toLowerCase() || receipt.to?.toLowerCase()!==target.toLowerCase() ||
          transaction.blockHash!==receipt.blockHash || receipt.blockHash!==block?.hash)
        throw new Error("Late compute is not the same successful canonical transaction; no sends permitted");
      // Bind the call itself to the immutable request ID, scope, kind and size.
      const c=source.cases.find(c=>c.id===trial.caseId)!;
      const contract=await hre.ethers.getContractAt(`Study${{baseline:"Plain",zama:"Zama",fhenix:"CoFHE"}[trial.platform]}${c.width}`,target);
      const decoded=contract.interface.parseTransaction({data:transaction.input});
      if(decoded?.name!=="executeCircuit" || decoded.args[0]!==trial.scopeId || decoded.args[1]!==result.requestId ||
          Number(decoded.args[2])!=={sum_linear:0,sum_tree:1,affine_chain:2}[c.circuit!] || Number(decoded.args[3])!==c.size)
        throw new Error("Late compute calldata differs from the planned operation");
      const repeated=await read("eth_getTransactionReceipt",[tx.transactionHash]);
      if(JSON.stringify(repeated)!==JSON.stringify(receipt))throw new Error("Late compute receipt changed during verification");
      (report.lateComputeReceipts??=[]).push({transactionHash:tx.transactionHash,user:tx.user,transactionNonce:tx.transactionNonce,
        canonical:{blockHash:receipt.blockHash,blockNumber:Number(BigInt(receipt.blockNumber)),
          transactionIndex:Number(BigInt(receipt.transactionIndex)),receiptStatus:1,gasUsed:Number(BigInt(receipt.gasUsed)),
          effectiveGasPriceWei:BigInt(receipt.effectiveGasPrice).toString(),
          gasCostWei:(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString()},
        auditFile:path.resolve(sourceFile),auditSha256:sha(sourceFile),verifiedAt:new Date().toISOString(),
        sameHashSenderNonceTargetVerified:true,
        timingUse:"Receipt first observed after interruption. Canonical identity and gas only; no original receipt or completion latency reconstructed."});
    }
  }
  return report;
}

// Only a user-paused input load with an unsent compute request is recoverable.
// Original setup/trial fields remain intact; the receipt is supplementary.
export async function recoverPausedSetup(sourceFile: string, source: StudyReport, auditFile: string,
  hre: HardhatRuntimeEnvironment): Promise<StudyReport> {
  const audit = JSON.parse(fs.readFileSync(auditFile,"utf8"));
  if (source.config.suite !== "circuits" || source.executionComplete || audit.status !== "settled" ||
      audit.mutationCalls !== 0 || !audit.safeToTerminateVerifiedProcess ||
      path.resolve(audit.report.file) !== path.resolve(sourceFile) || audit.report.sha256 !== sha(sourceFile))
    throw new Error("A settled read-only audit of this exact paused circuit report is required");
  const trial = source.trials.at(-1);
  if (!trial || trial.status !== "pending" || trial.warmup || trial.requests.length !== 1 ||
      trial.requests[0].transaction.transactionNonce !== -1 ||
      trial.requests[0].transaction.broadcastState !== "prepared" ||
      trial.requests[0].transaction.preparedTransactionHash || trial.requests[0].transaction.transactionHash)
    throw new Error("Paused checkpoint has a compute attempt; replay forbidden");
  const missing = trial.setup.filter(t => t.status !== "confirmed");
  if (missing.length !== 1 || missing[0].method !== "loadCircuit" ||
      missing[0].broadcastState !== "acknowledged" ||
      missing[0].transactionHash !== missing[0].preparedTransactionHash)
    throw new Error("Only one acknowledged, unobserved final input-load receipt may be recovered");
  const tx = missing[0], evidence = audit.receipts.find((r: any) => r.transactionHash === tx.transactionHash);
  if (!evidence || evidence.status !== 1 || evidence.nonce !== tx.transactionNonce || !evidence.lateObservation)
    throw new Error("Paused audit does not settle the input-load identity");
  const read = (method: string, params: any[]) => deadline(() => hre.ethers.provider.send(method,params),20000,"paused input verification");
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n && !source.mock)
    throw new Error("Paused circuit recovery requires Sepolia");
  const receipt = await read("eth_getTransactionReceipt",[tx.transactionHash]);
  const transaction = await read("eth_getTransactionByHash",[tx.transactionHash]);
  const target = source.setups.find(s => s.kind === "deployment" && s.platform === trial.platform)?.address;
  const block = receipt && await read("eth_getBlockByNumber",[receipt.blockNumber,false]);
  if (!receipt || !transaction || receipt.status !== "0x1" || receipt.transactionHash !== tx.transactionHash ||
      transaction.hash !== tx.transactionHash || transaction.from.toLowerCase() !== tx.user.toLowerCase() ||
      Number(BigInt(transaction.nonce)) !== tx.transactionNonce ||
      Number(BigInt(transaction.chainId)) !== source.chainId ||
      transaction.to?.toLowerCase() !== target?.toLowerCase() ||
      receipt.blockHash !== block?.hash || receipt.blockHash !== evidence.blockHash)
    throw new Error("Paused input receipt is not the same successful canonical transaction");
  const report = structuredClone(source);
  (report.settledSetupReceipts ??= []).push({transactionHash: tx.transactionHash!,user:tx.user,
    transactionNonce:tx.transactionNonce, canonical:{blockHash:receipt.blockHash,
      blockNumber:Number(BigInt(receipt.blockNumber)),transactionIndex:Number(BigInt(receipt.transactionIndex)),
      receiptStatus:1,gasUsed:Number(BigInt(receipt.gasUsed)),effectiveGasPriceWei:BigInt(receipt.effectiveGasPrice).toString(),
      gasCostWei:(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString()},
    auditFile:path.resolve(auditFile),auditSha256:sha(auditFile),verifiedAt:new Date().toISOString(),
    sameHashSenderNonceTargetVerified:true,
    timingUse:"Input setup confirmed after user stop; canonical state and gas only. No original setup receipt latency is reconstructed."});
  return report;
}
