import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { deadline, TimingTrace } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";

const marker = Symbol.for("energy.study.rpcReadPolicy");
const reads = new Set([
  "eth_chainId", "net_version", "eth_blockNumber", "eth_getBalance", "eth_getCode",
  "eth_getTransactionCount", "eth_getBlockByNumber", "eth_getBlockByHash",
  "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_getLogs",
  "eth_call", "eth_estimateGas", "eth_feeHistory", "eth_gasPrice", "eth_maxPriorityFeePerGas",
]);

export function studyRpcReadPolicy(provider: any) {
  return provider[marker] ?? {enabled:false};
}

// Mutations and unknown methods pass through once, without retry wrapping.
// All waits remain inside callers' observation deadlines and wall-clock timing.
export function installStudyRpcReadResilience(provider: any, journal: string, timeoutMs = 180000, backoffMs = 5000) {
  if(provider[marker])throw new Error("Study RPC read guard already installed");
  const original=provider.send, send=original.bind(provider);
  provider[marker]={enabled:true,maxAttempts:5,backoffMs,timeoutMs,retryAfter:"respected",journal,
    methods:[...reads],mutationRetry:false};
  provider.send=async(method:string,params:any[])=>{
    if(!reads.has(method))return send(method,params);
    const trace=new TimingTrace(),startedAt=new Date().toISOString(),start=performance.now();
    try{
      return await deadline(()=>retryLifecycleRead(trace,"rpc."+method,timeoutMs,
        remaining=>deadline(()=>send(method,params),remaining,"RPC read attempt"),
        backoffMs,false,false,false,true),timeoutMs,"bounded RPC read");
    }finally{
      const retries=trace.stages.filter(s=>s.status==="event"&&s.stage.endsWith("_retry"));
      if(retries.length)fs.appendFileSync(journal,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),method,
        durationMs:performance.now()-start,retries,backoffs:trace.stages.filter(s=>s.stage.endsWith(".retry_backoff")),attempts:trace.stages.filter(s=>s.stage.endsWith(".read_attempt")).length})+"\n");
    }
  };
  return ()=>{provider.send=original;delete provider[marker];};
}
