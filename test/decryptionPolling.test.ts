import {strict as assert} from "node:assert";
import fs from "node:fs";
import vm from "node:vm";
import {execFileSync} from "node:child_process";
const {decryptionPollDelay,pollingProvenance,targets}=require("../tasks/lib/decryptionPolling.cjs");

const response=(status:number, body:any={}, retryAfter?:string)=>({status,ok:status===200,
  headers:new Headers(retryAfter===undefined ? {} : {"Retry-After":retryAfter}),json:async()=>body});

describe("100ms decryption polling policy",()=>{
  it("uses 100ms by default and honors numeric or date server delays",()=>{
    assert.equal(decryptionPollDelay(response(204)),100);
    assert.equal(decryptionPollDelay(response(204,{},"0")),100);
    assert.equal(decryptionPollDelay(response(204,{},"2")),2000);
    assert.equal(decryptionPollDelay(response(204,{},"0.3")),300);
    assert.equal(decryptionPollDelay(response(204,{},"Thu, 01 Jan 1970 00:00:05 GMT"),1000),4000);
    assert.equal(decryptionPollDelay(response(204,{},"bad-header")),100);
  });
  it("patches the actual Zama Node entry points without changing input-proof polling",()=>{
    for(const name of ["zama","zamaEsm"]){
      const source=fs.readFileSync(targets[name],"utf8");
      const from=source.indexOf("    _getRetryAfterHeaderValueInMs(response) {");
      const to=source.indexOf("    //////////////////////////////////////////////////////////////////////////////",from+10);
      const method=vm.runInNewContext(`({${source.slice(from,to)}})._getRetryAfterHeaderValueInMs`,{
        benchmarkDecryptionPollDelay:decryptionPollDelay,
        RelayerV2AsyncRequest:{DEFAULT_RETRY_AFTER_MS:2500,MINIMUM_RETRY_AFTER_MS:1000},
        isUint:(n:number)=>Number.isInteger(n)&&n>=0,
      });
      assert.equal(method.call({_relayerOperation:"USER_DECRYPT"},response(202)),100);
      assert.equal(method.call({_relayerOperation:"USER_DECRYPT"},response(202,{},"2")),2000);
      assert.equal(method.call({_relayerOperation:"INPUT_PROOF"},response(202)),2500);
    }
  });
  function cofhe(responses:any[]){
    const source=fs.readFileSync(targets.fhenix,"utf8");
    const start=source.indexOf("async function submitSealOutputRequest(");
    const middle=source.indexOf("async function pollSealOutputStatus(",start);
    const end=source.indexOf("async function tnSealOutputV2(",middle);
    const waits:number[]=[],polls:any[]=[];let requests=0;
    const context:any={benchmarkDecryptionPollDelay:decryptionPollDelay,SEAL_OUTPUT_TIMEOUT_MS:300000,
      Date,setTimeout:(fn:()=>void,ms:number)=>{waits.push(ms);fn();},
      cofheFetch:async()=>{requests++;assert.ok(responses.length);return responses.shift();},
      classifySubmitResponse:async({response:r}:any)=>r.status===200?{kind:"parse-json"}:r.status===429?
        {kind:"fatal-http",errorMessage:"rate limited"}:{kind:"retryable",status:r.status},
      throwIfSubmitRetryTimedOut:()=>{},getSealedDataFromSubmitResponse:(v:any)=>v.sealed,
      parseCompletedSealOutputResponse:({value}:any)=>value.sealed,
      CofheError:class extends Error{constructor(o:any){super(o.message);}},
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start,end)+";this.submit=submitSealOutputRequest;this.poll=pollSealOutputStatus;",context);
    return {waits,polls,requests:()=>requests,
      submit:()=>context.submit("https://example.invalid",1n,11155111,null,Date.now(),10000,(p:any)=>polls.push(p)),
      poll:()=>context.poll("https://example.invalid","job",Date.now(),(p:any)=>polls.push(p))};
  }
  it("retries CoFHE POST at 100ms, honors server hints and returns immediately on success",async()=>{
    const f=cofhe([response(204),response(404,{},"2"),response(200,{sealed:{data:[1]}})]);
    assert.equal((await f.submit()).kind,"completed");
    assert.deepEqual(f.waits,[100,2000]);
    assert.deepEqual(f.polls.map(p=>p.intervalMs),[100,2000]);
    assert.equal(f.requests(),3);
    const rateLimited=cofhe([response(429)]);
    await assert.rejects(rateLimited.submit(),/rate limited/);
    assert.deepEqual(rateLimited.waits,[]);
  });
  it("polls CoFHE jobs immediately and waits only for incomplete responses",async()=>{
    const f=cofhe([response(200,{status:"PROCESSING"}),response(200,{status:"PROCESSING"},"2"),
      response(200,{status:"COMPLETED",sealed:{data:[1]}})]);
    await f.poll();assert.deepEqual(f.waits,[100,2000]);
    assert.equal(f.requests(),3);assert.equal(f.polls.length,2);
    const done=cofhe([response(200,{status:"COMPLETED",sealed:{data:[1]}})]);
    await done.poll();assert.deepEqual(done.waits,[]);
  });
  it("records patched bundle hashes and reapplies idempotently",()=>{
    const before=pollingProvenance();
    execFileSync(process.execPath,["scripts/patch-decryption-polling.cjs"]);
    assert.deepEqual(pollingProvenance(),before);
    assert.equal(before.requestedIntervalMs,100);
  });
});
