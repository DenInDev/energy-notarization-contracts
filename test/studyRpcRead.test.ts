import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { installStudyRpcReadResilience } from "../tasks/studies/rpc";
import { isRpcServiceReadFailure, rpcRetryAfterMs, retryLifecycleRead } from "../tasks/lib/lifecycleReadRetry";
import { TimingTrace } from "../tasks/lib/lifecycleTiming";

describe("study RPC read resilience", () => {
  it("recognizes HTTP proxy outages without treating contract reverts as transient", () => {
    assert(isRpcServiceReadFailure(new Error("HH110: Invalid JSON-RPC response received: Service Unavailable\n")));
    assert(isRpcServiceReadFailure({info:{error:{status:502}}}));
    assert(!isRpcServiceReadFailure(new Error("execution reverted: Service Unavailable")));
    assert(!isRpcServiceReadFailure({status:503,error:{code:"CALL_EXCEPTION",message:"execution reverted"}}));
    assert.equal(rpcRetryAfterMs({response:{headers:{"Retry-After":"2"}}}),2000);
    assert.equal(rpcRetryAfterMs({retryAfterMs:3000,headers:{"retry-after":"1"}}),3000);
  });

  it("retries only opted-in reads, respects hints and bounds persistent outages", async () => {
    const error=Object.assign(new Error("HH110: Invalid JSON-RPC response received: Service Unavailable"),{retryAfterMs:8});
    let calls=0;const trace=new TimingTrace();
    const result=await retryLifecycleRead(trace,"receipt",1000,async()=>{if(++calls<3)throw error;return 42;},1,false,false,false,true);
    assert.equal(result,42);assert.equal(calls,3);
    assert(trace.stages.filter(s=>s.stage.endsWith("rpc_service_retry")).every(s=>Number(s.detail?.backoffMs)>=8));
    calls=0;await assert.rejects(retryLifecycleRead(new TimingTrace(),"receipt",1000,async()=>{calls++;throw error;},1),e=>e===error);
    assert.equal(calls,1);
    calls=0;await assert.rejects(retryLifecycleRead(new TimingTrace(),"receipt",1000,async()=>{calls++;throw error;},1,false,false,false,true));
    assert.equal(calls,5);
    calls=0;await assert.rejects(retryLifecycleRead(new TimingTrace(),"receipt",1,async()=>{calls++;throw error;},1,false,false,false,true));
    assert.equal(calls,1);
  });

  it("journals recovered reads but calls mutations and unknown methods exactly once", async () => {
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),"study-rpc-")),journal=path.join(folder,"reads.jsonl");
    let reads=0,sends=0,unknown=0;
    const original=async(method:string)=>{
      if(method==="eth_getTransactionReceipt"){if(++reads<3)throw Error("HH110: Invalid JSON-RPC response received: Service Unavailable");return {status:"0x1"};}
      if(method==="eth_sendRawTransaction"){sends++;throw Error("fetch failed");}
      unknown++;throw Error("Service Unavailable");
    };
    const provider={send:original},restore=installStudyRpcReadResilience(provider,journal,1000,1);
    try{
      assert.equal((await provider.send("eth_getTransactionReceipt")).status,"0x1");
      await assert.rejects(provider.send("eth_sendRawTransaction"));
      await assert.rejects(provider.send("custom_mutation"));
      assert.equal(reads,3);assert.equal(sends,1);assert.equal(unknown,1);
      const record=JSON.parse(fs.readFileSync(journal,"utf8"));assert.equal(record.method,"eth_getTransactionReceipt");
      assert.equal(record.attempts,3);assert.equal(record.retries.length,2);
      assert.equal(record.params,undefined);
    }finally{restore();if(fs.existsSync(journal))fs.unlinkSync(journal);fs.rmdirSync(folder);}
    assert.equal(provider.send,original);
  });
});
