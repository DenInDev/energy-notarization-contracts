import type { Contract } from "ethers";
import { toQuantity } from "ethers";
import { deadline, type TimingTrace } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import type { Fees } from "./transactions";

// A provider's pending state may differ from the canonical state already read.
// Estimate at the same receipt hash; never fall back to latest/pending or send.
export async function estimateCircuitAtReceipt(contract: Contract, args: unknown[], caller: string,
  fees: Fees, blockHash: string, send: (method:string,params:any[])=>Promise<any>,
  trace: TimingTrace, budget: number): Promise<bigint> {
  return estimateStudyCallAtBlock(contract,"executeCircuit",args,caller,fees,blockHash,send,trace,budget);
}

export async function estimateStudyCallAtBlock(contract: Contract, method: "executeCircuit" | "submit", args: unknown[], caller: string,
  fees: Fees, blockHash: string, send: (method:string,params:any[])=>Promise<any>,
  trace: TimingTrace, budget: number): Promise<bigint> {
  const call=await deadline(()=>contract.getFunction(method).populateTransaction(...args),budget,"populate pinned gas estimate");
  if(!call.data) throw new Error("Missing circuit calldata for gas estimation");
  const tx={from:caller,to:String(contract.target),data:call.data,type:"0x2",
    maxFeePerGas:toQuantity(fees.maxFeePerGas),maxPriorityFeePerGas:toQuantity(fees.maxPriorityFeePerGas)};
  trace.event("preparation.gas_estimate_anchor",{blockHash,requireCanonical:true,method});
  return deadline(()=>retryLifecycleRead(trace,"preparation.gas",budget,async()=>{
    const value=await send("eth_estimateGas",[tx,{blockHash,requireCanonical:true}]);
    const gas=BigInt(value);
    if(gas<=0n) throw new Error("Invalid pinned gas estimate");
    return gas;
  },1000,false,false,true),budget,"receipt-pinned circuit gas estimate");
}
