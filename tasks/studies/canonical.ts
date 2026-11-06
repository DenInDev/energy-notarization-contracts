import { deadline } from "../lib/lifecycleTiming";
import type { CanonicalReceiptRecovery, ReceiptAnchor, StudyTransaction } from "./types";

type Recoveries = { canonicalReceipts?: CanonicalReceiptRecovery[] };
type Send = (method:string,params:any[])=>Promise<any>;

// A derived read/gas view only. Never change the first-observed raw receipt or
// attach a new inclusion latency to a transaction which was later reincluded.
export function effectiveReceipt(tx: StudyTransaction, report: Recoveries): StudyTransaction {
  const recovery=report.canonicalReceipts?.filter(r=>r.transactionHash===tx.transactionHash).at(-1);
  return recovery?{...tx,...recovery.canonical,receiptMs:undefined,receiptOffsetMs:undefined}:tx;
}

export function receiptWasReconciled(tx: StudyTransaction, report: Recoveries) {
  return !!report.canonicalReceipts?.some(r=>r.transactionHash===tx.transactionHash);
}

function anchor(receipt:any): ReceiptAnchor {
  return {blockHash:receipt.blockHash,blockNumber:Number(BigInt(receipt.blockNumber)),
    transactionIndex:Number(BigInt(receipt.transactionIndex)),receiptStatus:Number(BigInt(receipt.status)),
    gasUsed:Number(BigInt(receipt.gasUsed)),effectiveGasPriceWei:BigInt(receipt.effectiveGasPrice).toString(),
    gasCostWei:(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString()};
}

// Read-only reconciliation accepts only the SAME successful transaction, now
// in a stable canonical block, after proving its old block is no longer canonical.
// Missing/failed receipts, changed identity and conflicting backends still stop.
export async function verifyCanonicalReceipt(tx: StudyTransaction, target:string|null, chainId:number,
  send:Send,budget:number,blocks=new Map<number,string>()):Promise<CanonicalReceiptRecovery|undefined> {
  const end=Date.now()+budget;
  const read=(method:string,params:any[])=>deadline(()=>send(method,params),Math.max(1,end-Date.now()),"canonical receipt verification");
  const receipt=await read("eth_getTransactionReceipt",[tx.transactionHash]);
  if(!receipt || receipt.status!=="0x1" || receipt.transactionHash!==tx.transactionHash ||
    receipt.from?.toLowerCase()!==tx.user.toLowerCase() || (receipt.to?.toLowerCase()??null)!==(target?.toLowerCase()??null))
    throw new Error("Historical receipt identity/status mismatch; no sends permitted");
  const current=anchor(receipt);
  if(!blocks.has(current.blockNumber)){
    const block=await read("eth_getBlockByNumber",["0x"+current.blockNumber.toString(16),false]);
    if(!block?.hash)throw new Error("Canonical receipt block unavailable");
    blocks.set(current.blockNumber,block.hash);
  }
  if(blocks.get(current.blockNumber)!==current.blockHash)throw new Error("Receipt is not canonical");
  const previous:ReceiptAnchor={blockHash:tx.blockHash!,blockNumber:tx.blockNumber!,transactionIndex:tx.transactionIndex!,
    receiptStatus:tx.receiptStatus!,gasUsed:tx.gasUsed!,effectiveGasPriceWei:tx.effectiveGasPriceWei!,gasCostWei:tx.gasCostWei!};
  if(current.blockHash===previous.blockHash && current.blockNumber===previous.blockNumber && current.transactionIndex===previous.transactionIndex){
    if(JSON.stringify(current)!==JSON.stringify(previous))throw new Error("Receipt gas/status changed without reinclusion");
    return;
  }
  const transaction=await read("eth_getTransactionByHash",[tx.transactionHash]);
  if(!transaction || transaction.hash!==tx.transactionHash || transaction.from?.toLowerCase()!==tx.user.toLowerCase() ||
    Number(BigInt(transaction.nonce))!==tx.transactionNonce || Number(BigInt(transaction.chainId))!==chainId ||
    (transaction.to?.toLowerCase()??null)!==(target?.toLowerCase()??null) || transaction.blockHash!==current.blockHash)
    throw new Error("Reincluded transaction identity mismatch");
  const oldBlock=await read("eth_getBlockByNumber",["0x"+previous.blockNumber.toString(16),false]);
  if(!oldBlock?.hash || oldBlock.hash===previous.blockHash)throw new Error("Conflicting canonical receipt evidence");
  const repeated=await read("eth_getTransactionReceipt",[tx.transactionHash]);
  const block=await read("eth_getBlockByNumber",[receipt.blockNumber,false]);
  if(!repeated || repeated.transactionHash!==receipt.transactionHash || repeated.from!==receipt.from || repeated.to!==receipt.to ||
    JSON.stringify(anchor(repeated))!==JSON.stringify(current) || block?.hash!==current.blockHash)
    throw new Error("Canonical receipt changed during reconciliation");
  return {transactionHash:tx.transactionHash!,observedAt:new Date().toISOString(),previous,canonical:current,
    sameHashSenderNonceTargetVerified:true,previousBlockNoLongerCanonical:true,canonicalReceiptRepeated:true,
    timingUse:"Supplementary canonical identity/gas only; first-observed timing retained and excluded from canonical latency statistics."};
}
