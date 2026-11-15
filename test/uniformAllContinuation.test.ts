import {strict as assert} from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {toBeHex} from "ethers";
import {LifecycleWorkerClient} from "../tasks/lifecycle/workerClient";
import {runLifecycleCampaign} from "../tasks/lifecycle/campaign";
import {continueLifecycleCampaign} from "../tasks/lifecycle/continuation";
import {generateAccounts} from "../tasks/experiments/accounts";

describe("matched uniform continuation after a settled interruption", function(){
  this.timeout(120000);
  for(const {width,retainedFailure} of [{width:16 as const,retainedFailure:false},{width:128 as const,retainedFailure:false},
    {width:128 as const,retainedFailure:true}]) it(`resumes missing ${width}-bit comparisons; retained failure=${retainedFailure}`,async()=>{
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),"uniform-all-resume-")),accountsFile=path.join(folder,"keys.json"),originalDir=path.join(folder,"original");
    generateAccounts(accountsFile,3);
    const clients=require("../tasks/lifecycle/workerClient"),originalFactory=clients.createLifecycleWorker;
    clients.createLifecycleWorker=(event:(message:any)=>void)=>new LifecycleWorkerClient(event,path.resolve("scripts/test-fixtures/lifecycle-full-worker.cjs"));
    const hre:any={network:{config:{url:"https://example.org/rpc"}},run:async()=>{},ethers:{provider:{
      getNetwork:async()=>({chainId:11155111n}),send:async()=>"0x0",getBalance:async()=>1n,
      getFeeData:async()=>({maxFeePerGas:100n,maxPriorityFeePerGas:2n})}}};
    try{
      await runLifecycleCampaign({runs:2,platform:"all",seed:"uniform-all",timeout:10,accountsFile,outputDir:originalDir,execution:"processes",width},hre);
      const source=JSON.parse(fs.readFileSync(path.join(originalDir,"report.json"),"utf8"));
      source.complete=false;delete source.completedAt;source.error="Report persistence failed; injected journal conflict";
      source.samples=source.samples.slice(0,33);source.barriers=source.barriers.slice(0,11);
      source.viewDecryptSamples=source.viewDecryptSamples.filter((v:any)=>v.warmup);
      if(retainedFailure){
        const failed=[...source.samples].reverse().find((s:any)=>s.platform==="zama");
        failed.status="error";failed.error="Transaction simulation failed; status: 500; operation: USER_DECRYPT; retryCount: 5";
        delete failed.plaintext;delete failed.transactionToValidatedPlaintextMs;delete failed.postReceiptToValidatedPlaintextMs;
        source.error="Isolated campaign stopped after all current workers settled; observations retained";
      }
      const sourceFile=path.join(folder,"source.json"),bytes=JSON.stringify(source);fs.writeFileSync(sourceFile,bytes);
      for(const p of ["baseline","zama","fhenix"])fs.unlinkSync(path.join(folder,`sent-${p}.jsonl`));
      hre.ethers.provider.send=async(method:string,params:any[])=>{
        if(method==="eth_getTransactionCount")return "0xc";
        const last=source.samples.find((s:any)=>s.transactionHash===params[0]);
        if(method==="eth_getTransactionReceipt")return {transactionHash:params[0],status:"0x1",blockHash:toBeHex(999,32),blockNumber:"0x3e8",gasUsed:"0x5208",effectiveGasPrice:"0x14"};
        if(method==="eth_getTransactionByHash")return {hash:params[0],nonce:toBeHex(last.transactionNonce),from:source.platformOwners[last.platform],to:source.setup.find((s:any)=>s.platform===last.platform).address};
        if(method==="eth_getBlockByNumber")return {hash:toBeHex(999,32),number:"0x3e8",timestamp:"0x1"};
        throw Error("Unexpected coordinator RPC");
      };
      const outputDir=path.join(folder,"continued");
      await continueLifecycleCampaign({report:sourceFile,outputDir,accountsFile,resumeUniformAll:true,
        retainConfirmedDecryptFailure:retainedFailure},hre);
      const result=JSON.parse(fs.readFileSync(path.join(outputDir,"report.json"),"utf8"));
      assert.equal(result.complete,!retainedFailure);assert(result.executionComplete);assert.equal(fs.readFileSync(sourceFile,"utf8"),bytes);
      assert.equal(result.samples.filter((s:any)=>s.status==="error").length,Number(retainedFailure));
      assert.deepEqual(result.samples.slice(0,33),source.samples);assert.deepEqual(result.setup,source.setup);
      assert.deepEqual(result.barriers.slice(0,11),source.barriers);assert.deepEqual(result.viewDecryptSamples.slice(0,3),source.viewDecryptSamples);
      assert.equal(result.samples.length,54);assert.equal(result.viewDecryptSamples.length,9);assert.equal(result.retrySamples.length,0);
      assert.equal((result.historicalOrchestrationFailures??[]).length,Number(!retainedFailure));assert.equal(result.continuations.at(-1).expectedNewPrimarySamples,21);
      assert.equal(new Set(Object.values(result.workers).map((w:any)=>w.pid)).size,3);
      for(const p of ["baseline","zama","fhenix"]){
        const sends=fs.readFileSync(path.join(folder,`sent-${p}.jsonl`),"utf8").trim().split("\n").map(x=>JSON.parse(x));
        assert.deepEqual(sends.map(x=>x.nonce),[12,13,14,15,16,17,18]);
      }
      const unsafe=JSON.parse(bytes);unsafe.samples[0].status="error";const bad=path.join(folder,"bad.json");fs.writeFileSync(bad,JSON.stringify(unsafe));
      await assert.rejects(continueLifecycleCampaign({report:bad,outputDir:path.join(folder,"blocked"),accountsFile,resumeUniformAll:true,
        retainConfirmedDecryptFailure:retainedFailure},hre),/settled all-valid prefix|reviewed confirmed Zama/);
    }finally{
      clients.createLifecycleWorker=originalFactory;
      const target=path.resolve(folder),base=path.resolve(os.tmpdir())+path.sep;
      assert(target.startsWith(base)&&path.basename(target).startsWith("uniform-all-resume-"));fs.rmSync(target,{recursive:true,force:true});
    }
  });
});
