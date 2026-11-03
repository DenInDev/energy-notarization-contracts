import {strict as assert} from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Interface} from "ethers";
import {buildPlan,expectedResult,valuesFor,scenarioValues} from "../tasks/experiments/plan";
import {generateAccounts,loadAccounts,acquireAccountLock} from "../tasks/experiments/accounts";
import {measure,runLoadWindow,sendTransaction} from "../tasks/experiments/measurement";
import {TimingTrace,ObservationDeadlineError} from "../tasks/lib/lifecycleTiming";
import {summarizeExperiments} from "../tasks/experiments/report";
import type {Context,ExperimentArgs,ExperimentReport,Observation} from "../tasks/experiments/types";

export const experimentDefaults: ExperimentArgs={suite:"all",platform:"all",runs:3,requests:16,timeout:30,seed:"test",
  widths:"16,32,64,128",counts:"1,4,8,16,32",chains:"1,2,4,8",users:"1,2,4,8",states:"16,64,256",touched:"1,4,16",
  accountsFile:"unused",outputDir:"",dryRun:false};

describe("expanded experiments", () => {
  it("builds orthogonal sweeps and rejects unfair load counts", () => {
    const plan=buildPlan(experimentDefaults);
    assert.equal(plan.length,46);
    assert.equal(new Set(plan.map(s=>s.id)).size,plan.length);
    assert.equal(plan.filter(s=>s.suite==="width").length,16);
    for (const n of [4,8,16,32]) {
      const pair=plan.filter(s=>s.suite==="depth" && s.inputCount===n);
      assert.deepEqual(pair.map(s=>s.operationCount),[n-1,n-1]);
      assert.deepEqual(pair.map(s=>s.depth),[n-1,Math.log2(n)]);
      assert.deepEqual(scenarioValues("test",pair[0],0),scenarioValues("test",pair[1],0));
    }
    assert.throws(()=>buildPlan({...experimentDefaults,requests:10}),/divisible/);
    assert.throws(()=>buildPlan({...experimentDefaults,widths:"8,8"}),/distinct/);
    assert.throws(()=>buildPlan({...experimentDefaults,timeout:NaN}),/Timeout/);
  });
  it("matches width-specific modular arithmetic and deterministic datasets", () => {
    const s=buildPlan({...experimentDefaults,suite:"width",widths:"8"})[0];
    assert.equal(expectedResult(s,[255n,3n]),2n);
    assert.equal(expectedResult({...s,operation:"mul"},[255n,3n]),253n);
    assert.equal(expectedResult({...s,operation:"chain",chainLength:2},[255n,3n]),243n);
    assert.deepEqual(valuesFor("seed","case",8,16),valuesFor("seed","case",8,16));
    assert.notDeepEqual(valuesFor("seed","case",8,16),valuesFor("seed","other",8,16));
  });
  it("keeps full 128-bit operands and validates modular overflow above 64 bits", () => {
    const scenarios=buildPlan({...experimentDefaults,suite:"width",widths:"128"});
    assert.equal(scenarios.length,4);
    const max=(1n<<128n)-1n,high=(1n<<100n)+7n;
    assert.equal(expectedResult(scenarios.find(s=>s.operation==="add")!,[max,3n]),2n);
    assert.equal(expectedResult(scenarios.find(s=>s.operation==="mul")!,[max,3n]),max-2n);
    assert.equal(expectedResult(scenarios.find(s=>s.operation==="compare_select")!,[high,3n]),high);
    assert.equal(expectedResult(scenarios.find(s=>s.operation==="tariff")!,[high,3n]),7n);
    const values=valuesFor("seed","128-bit-inputs",32,128);
    assert.ok(values.every(v=>v>=0n && v<=max));
    assert.ok(values.some(v=>v>(1n<<64n)-1n));
    assert.throws(()=>buildPlan({...experimentDefaults,widths:"256"}),/Widths/);
  });
  it("never replaces existing keys, rejects duplicates and locks concurrent runs", () => {
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),"experiment-accounts-")),file=path.join(directory,"keys.json");
    try {
      const first=generateAccounts(file,2),bytes=fs.readFileSync(file,"utf8");
      const again=generateAccounts(file,8);
      assert.deepEqual(first.accounts,again.accounts);
      assert.equal(fs.readFileSync(file,"utf8"),bytes);
      assert.equal(loadAccounts(file).length,2);
      assert.ok(!fs.readFileSync(first.publicFile,"utf8").includes("privateKey"));
      const release=acquireAccountLock(file);
      assert.throws(()=>acquireAccountLock(file),/locked/); release();
      const duplicate=JSON.parse(bytes); duplicate.accounts.push(duplicate.accounts[0]);
      fs.writeFileSync(file,JSON.stringify(duplicate));
      assert.throws(()=>loadAccounts(file),/Duplicate/);
    } finally {
      for (const name of ["keys.json","addresses.json","campaign.lock"]) fs.rmSync(path.join(directory,name),{force:true});
      fs.rmdirSync(directory);
    }
  });
  it("runs independent closed loops and drains other users after one halts", async () => {
    const contexts=Array.from({length:4},(_,i)=>({user:String(i),halted:false} as Context));
    const active=new Set<string>(),seen:number[]=[],max:{value:number}={value:0};
    const samples=await runLoadWindow(contexts,16,async (ctx,request)=>{
      assert.ok(!active.has(ctx.user));active.add(ctx.user);max.value=Math.max(max.value,active.size);
      await new Promise(resolve=>setTimeout(resolve,2));
      if (ctx.user==="0") ctx.halted=true;
      active.delete(ctx.user);seen.push(request);
      return {user:ctx.user,request,status:"ok"} as Observation;
    });
    assert.equal(max.value,4);assert.equal(samples.length,13);
    assert.equal(new Set(seen).size,13);
    assert.ok(seen.includes(15));assert.ok(!seen.includes(4));
  });
  it("pins the final read, decrypts a chain once, and reports administrative censoring", async () => {
    const scenario=buildPlan({...experimentDefaults,suite:"chain",chains:"4"})[0];
    const abi=new Interface(["function getResult() view returns (uint64)"]);
    let nonce=20,submitted=0,decrypts=0;
    const blocks:string[]=[];
    const ctx={platform:"baseline",user:"user",timeoutMs:20,halted:false,reserveNonce:()=>nonce++,
      signer:{provider:{send:async (_method:string,params:any[])=>{
        blocks.push(params[1].blockHash);return abi.encodeFunctionResult("getResult",[121n]);
      }}},contract:{getAddress:async()=>"contract",interface:abi,getFunction:()=>async (...args:any[])=>{
        assert.equal(args[args.length-1].nonce,20+submitted++);
        return {hash:`tx-${submitted}`,wait:async()=>({status:1,blockHash:`block-${submitted}`,blockNumber:submitted,gasUsed:100n,gasPrice:2n})};
      }},adapter:{decrypt:async ()=>{decrypts++;return [121n];}},
    } as unknown as Context;
    const success=await measure(ctx,scenario,[1n,3n],121n,0,0);
    assert.equal(success.status,"ok");assert.equal(submitted,4);assert.equal(decrypts,1);
    assert.deepEqual(blocks,["block-4"]);
    assert.equal(success.transactions.reduce((n,t)=>n+BigInt(t.costWei!),0n),800n);
    ctx.adapter.decrypt=()=>new Promise(()=>{});
    const timeout=await measure(ctx,scenario,[1n,3n],121n,1,0);
    assert.equal(timeout.status,"timeout");assert.equal(timeout.completionCensored,true);
    assert.equal(timeout.transactionToValidatedMs,undefined);assert.equal(ctx.halted,false);
    assert.ok(timeout.completionObservedMs!>=15);
  });
  it("retains partial reports without treating failures as zero latency", () => {
    const scenario=buildPlan({...experimentDefaults,suite:"inputs",counts:"1"})[0];
    const report={config:experimentDefaults,scenarios:[scenario],schedule:[{caseId:scenario.id,platforms:["baseline","zama"]}],
      samples:[{caseId:scenario.id,platform:"baseline",warmup:false,status:"ok",endToEndMs:12,transactions:[]},
        {caseId:scenario.id,platform:"baseline",warmup:false,status:"timeout",completionCensored:true,transactionToReceiptMs:18,transactions:[]}],windows:[],
    } as unknown as ExperimentReport;
    const result=summarizeExperiments(report);
    assert.equal(result[0].attempted,2);assert.equal(result[0].notAttempted,1);
    assert.equal(result[0].endToEndMs.mean,12);assert.equal(result[0].successFraction,0.5);
    assert.equal(result[0].completionCensored,1);assert.equal(result[1].attempted,0);assert.equal(result[1].notAttempted,3);
    assert.equal(result[0].transactionToReceiptMs.mean,18);
  });
  it("halts ambiguous submissions without retry or allocating another nonce", async () => {
    let allocations=0,sends=0;
    const ctx={halted:false,timeoutMs:5,reserveNonce:()=>allocations++,contract:{getFunction:()=>async()=>{
      sends++;throw new Error("RPC disconnected after broadcast");
    }}} as unknown as Context;
    await assert.rejects(sendTransaction(ctx,"execute",[],new TimingTrace(),[]),/disconnected/);
    assert.ok(ctx.halted);
    await assert.rejects(sendTransaction(ctx,"execute",[],new TimingTrace(),[]),/halted/);
    assert.equal(allocations,1);assert.equal(sends,1);
  });
  it("retains mined reverts and classifies the ethers receipt timeout as administrative", async () => {
    const receipt={status:0,blockHash:"block",blockNumber:1,gasUsed:50n,gasPrice:2n};
    let problem:any={receipt};
    const ctx={halted:false,timeoutMs:5,reserveNonce:()=>0,contract:{getFunction:()=>async()=>({hash:"tx",wait:async()=>{throw problem;}})}} as unknown as Context;
    const transactions:any[]=[];
    await assert.rejects(sendTransaction(ctx,"execute",[],new TimingTrace(),transactions));
    assert.equal(ctx.halted,false);assert.equal(transactions[0].status,0);assert.equal(transactions[0].costWei,"100");
    problem={code:"TIMEOUT"};
    await assert.rejects(sendTransaction(ctx,"execute",[],new TimingTrace(),[]),ObservationDeadlineError);
    assert.equal(ctx.halted,true);
  });
});
