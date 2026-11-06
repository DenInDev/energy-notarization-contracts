import { performance } from "node:perf_hooks";
import { deadline, type TimingTrace } from "../lib/lifecycleTiming";

// Receipts and log queries can be served by backends with different heads.
// Retry this exact read range; never shrink it or skip confirmed transactions.
export async function readWindowLogs(send:(method:string,params:any[])=>Promise<any>,filter:Record<string,unknown>,
  trace:TimingTrace,budget:number,backoffMs=1000):Promise<any[]> {
  const end=performance.now()+budget;
  for(let attempt=0;;attempt++){
    try{return await trace.span("audit.logs.read",()=>deadline(()=>send("eth_getLogs",[filter]),Math.max(1,end-performance.now()),"window log read"));}
    catch(error){
      const e=error as {message?:string;info?:{error?:{message?:string}};error?:{message?:string}};
      const texts=[e?.message,e?.info?.error?.message,e?.error?.message];
      const match=texts.map(s=>s?.match(/block range extends beyond current head block(?:: requested (\d+), head (\d+))?/i)).find(Boolean);
      const delay=backoffMs*2**Math.min(attempt,2);
      if(!match||(match[1]!==undefined&&Number(match[1])<=Number(match[2]))||performance.now()+delay>=end)throw error;
      trace.event("audit.logs.index_lag_retry",{requestedBlock:match[1]===undefined?filter.toBlock:Number(match[1]),
        backendHead:match[2]===undefined?null:Number(match[2]),delayMs:delay});
      await trace.span("audit.logs.index_lag_wait",()=>new Promise(resolve=>setTimeout(resolve,delay)));
    }
  }
}
