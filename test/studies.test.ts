import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import hre from "hardhat";
import { defaults, buildPlan, expectedCircuit, ordered, planSummary } from "../tasks/studies/plan";
import { replay, zeroFailureUpper95 } from "../tasks/studies/oracle";
import { capacityRejection } from "../tasks/studies/capacity";
import { continueStudy, latestAttempts, validateCircuitContinuation, validateStudyContinuation } from "../tasks/studies/continuation";
import { estimateCircuitAtReceipt } from "../tasks/studies/preparation";
import { TimingTrace } from "../tasks/lib/lifecycleTiming";
import { runStudy } from "../tasks/studies/runner";
import { readWindowLogs } from "../tasks/studies/logs";
import { effectiveReceipt, verifyCanonicalReceipt } from "../tasks/studies/canonical";
import type { StudyReport } from "../tasks/studies/report";

describe("focused study planning and canonical oracle", () => {
  it("reconciles only stable same-transaction reinclusions without replacing latency", async () => {
    const tx:any={transactionHash:"tx",user:"alice",transactionNonce:7,blockHash:"old",blockNumber:10,transactionIndex:2,
      receiptStatus:1,gasUsed:20,effectiveGasPriceWei:"3",gasCostWei:"60",receiptMs:123};
    const receipt={transactionHash:"tx",from:"alice",to:"contract",blockHash:"new",blockNumber:"0xb",transactionIndex:"0x1",status:"0x1",gasUsed:"0x15",effectiveGasPrice:"0x4"};
    let receiptReads=0;
    const send=async(method:string,params:any[])=>{
      if(method==="eth_getTransactionReceipt"){receiptReads++;return receipt;}
      if(method==="eth_getTransactionByHash")return {hash:"tx",from:"alice",to:"contract",nonce:"0x7",chainId:"0xaa36a7",blockHash:"new"};
      if(method==="eth_getBlockByNumber")return {hash:params[0]==="0xb"?"new":"replacement"};
      throw new Error("Unexpected RPC mutation/read");
    };
    const saved=JSON.stringify(tx),recovery=await verifyCanonicalReceipt(tx,"contract",11155111,send,1000);
    assert(recovery);assert.equal(receiptReads,2);assert.equal(JSON.stringify(tx),saved);
    const effective=effectiveReceipt(tx,{canonicalReceipts:[recovery]});
    assert.equal(effective.blockHash,"new");assert.equal(effective.gasCostWei,"84");assert.equal(effective.receiptMs,undefined);
    await assert.rejects(verifyCanonicalReceipt({...tx,transactionNonce:8},"contract",11155111,send,1000),/identity mismatch/);
    await assert.rejects(verifyCanonicalReceipt(tx,"wrong",11155111,send,1000),/identity\/status mismatch/);
    await assert.rejects(verifyCanonicalReceipt(tx,"contract",11155111,async(m,p)=>m==="eth_getBlockByNumber"&&p[0]==="0xa"?{hash:"old"}:send(m,p),1000),/Conflicting/);
    await assert.rejects(verifyCanonicalReceipt(tx,"contract",11155111,async(m,p)=>m==="eth_getTransactionReceipt"?{...receipt,status:"0x0"}:send(m,p),1000),/status mismatch/);
  });
  it("waits for an indexing backend without changing the confirmed log range", async () => {
    const filter={fromBlock:"0xa",toBlock:"0xb",topics:["scope"]},trace=new TimingTrace();
    let calls=0;
    const result=await readWindowLogs(async(method,params)=>{
      assert.equal(method,"eth_getLogs");assert.deepEqual(params,[filter]);
      if(calls++===0)throw new Error("block range extends beyond current head block: requested 11, head 10");
      if(calls===2)throw {info:{error:{message:"block range extends beyond current head block"}}};
      return ["log"];
    },filter,trace,1000,1);
    assert.deepEqual(result,["log"]);assert.equal(calls,3);
    assert(trace.stages.some(s=>s.stage==="audit.logs.index_lag_retry"));
    calls=0;
    await assert.rejects(readWindowLogs(async()=>{calls++;throw new Error("invalid filter");},filter,new TimingTrace(),1000,1),/invalid filter/);
    assert.equal(calls,1);
  });
  it("pins compute estimation to canonical loaded state instead of pending", async () => {
    const trace=new TimingTrace(),hash="0x"+"ab".repeat(32);
    const contract:any={target:"contract",getFunction:()=>({populateTransaction:async()=>({data:"0x1234"})})};
    const gas=await estimateCircuitAtReceipt(contract,[],"operator",{maxFeePerGas:34n,maxPriorityFeePerGas:2n},hash,
      async(method,params)=>{assert.equal(method,"eth_estimateGas");assert.deepEqual(params[1],{blockHash:hash,requireCanonical:true});return "0x5208";},trace,1000);
    assert.equal(gas,21000n);
    assert(trace.stages.some(s=>s.stage==="preparation.gas_estimate_anchor"));
  });
  it("contains only the two studies, equal-work reduction pairs and explicit transaction budgets", () => {
    const plan = planSummary(defaults);
    assert.equal(plan.cases.filter(c => c.suite === "concurrency").length,24);
    assert.equal(plan.cases.filter(c => c.suite === "circuits").length,32);
    assert.equal(plan.measuredTransactions,120000);
    assert.equal(plan.warmupTransactions,2976);
    assert.equal(plan.setupTransactions,8904);
    assert.equal(plan.requiredAccounts,9);
    for (const width of [16,128]) for (const n of [2,4,8,16,32]) {
      const pair = plan.cases.filter(c => c.width === width && c.inputCount === n && c.circuit?.startsWith("sum_"));
      assert.deepEqual(pair.map(c => c.additions),[n-1,n-1]);
      assert.deepEqual(pair.map(c => c.dependencyDepth),[n-1,Math.log2(n)]);
    }
    assert.throws(() => buildPlan({...defaults,suite:"state"}),/Only concurrency/);
    assert.throws(() => buildPlan({...defaults,requests:10}),/divisible/);
    assert.throws(() => buildPlan({...defaults,widths:"64"}),/Widths/);
    assert.equal(capacityRejection({info:{error:{data:hre.ethers.id("HCUTransactionLimitExceeded()").slice(0,10)}}}),"HCUTransactionLimitExceeded");
    assert.equal(capacityRejection(new Error("Timeout, out of gas or arbitrary revert")),undefined);
  });

  it("does not touch providers, accounts or directories in default planning mode", async () => {
    const plan: any = await runStudy({...defaults,accountsFile:"missing-secret-file"},{} as any);
    assert.equal(plan.networkAccess,false);
  });

  it("treats valid order-dependent outputs as expected and rejects duplicate/missing canonical evidence", () => {
    const inputs = [{requestId:"a",user:"alice",value:2n,blockNumber:10,transactionIndex:1,sequence:2},
      {requestId:"b",user:"bob",value:7n,blockNumber:10,transactionIndex:0,sequence:1}];
    assert.equal(replay(inputs,"shared_ordered",16).state.shared,23n);
    const forward = inputs.map((r,i) => ({...r,transactionIndex:i,sequence:i+1}));
    assert.equal(replay(forward,"shared_ordered",16).state.shared,13n);
    assert.equal(replay(inputs,"shared_sum",16).state.shared,9n);
    assert.equal(replay(forward,"shared_sum",16).state.shared,9n);
    assert.throws(() => replay([inputs[0],inputs[0]],"shared_sum",16),/Duplicate request/);
    assert.throws(() => replay(inputs.map(r => ({...r,transactionIndex:0})),"shared_sum",16),/Duplicate canonical/);
    assert.throws(() => replay(inputs.map(r => ({...r,sequence:1})),"shared_sum",16),/sequence/);
    assert.throws(() => replay([{...inputs[0],transactionIndex:NaN}],"shared_sum",16),/Missing canonical/);
  });

  it("checks 10,000 valid sender-order-preserving permutations without confusing commutativity with races", () => {
    let seed=17, changed=0;
    const random=() => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
    for (let trial=0;trial<10000;trial++) {
      const queues=Array.from({length:4},(_,u) => Array.from({length:8},(_,i) => ({
        requestId:`${u}/${i}`,user:`user${u}`,value:BigInt(u*19+i*7+1),blockNumber:1,transactionIndex:0})));
      const all=queues.flat(), canonical=[];
      while (canonical.length<32) {
        const nonempty=queues.filter(q => q.length), q=nonempty[Math.floor(random()*nonempty.length)];
        canonical.push({...q.shift()!,transactionIndex:canonical.length});
      }
      const sum=all.reduce((n,r)=>n+r.value,0n);
      assert.equal(replay(canonical,"shared_sum",16).state.shared,BigInt.asUintN(16,sum));
      const independent=replay(canonical,"independent",16).state;
      for (let u=0;u<4;u++) assert.equal(independent[`user${u}`],all.filter(r=>r.user===`user${u}`).reduce((n,r)=>n+r.value,0n));
      const forward=all.map((r,i)=>({...r,transactionIndex:i}));
      if(replay(canonical,"shared_ordered",16).state.shared!==replay(forward,"shared_ordered",16).state.shared)changed++;
    }
    assert(changed>9000);
  });

  it("uses full-width modular arithmetic and labels robustness at the window level", () => {
    const c=buildPlan({...defaults,suite:"circuits",widths:"128",sizes:"2",depths:"2"});
    const values=[(1n<<128n)-1n,3n];
    assert.equal(expectedCircuit(c[0],values),2n);
    assert.equal(expectedCircuit(c[1],values),2n);
    assert.equal(expectedCircuit(c[2],values),(1n<<128n)-13n);
    assert(Math.abs(zeroFailureUpper95(50)-0.0581550791)<1e-9);
    assert(zeroFailureUpper95(300)<0.01);
  });
});

describe("local study integration (not public-network performance)", function () {
  this.timeout(180000);
  it("resumes a circuit load reinclusion while retaining known unsent warmup HCU limits", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"circuit-reinclude-")),original=path.join(parent,"source"),continued=path.join(parent,"continued");
    const send=hre.ethers.provider.send.bind(hre.ethers.provider),selector=hre.ethers.id("executeCircuit(bytes32,bytes32,uint8,uint32)").slice(0,10);
    let injected=false;
    (hre.ethers.provider as any).send=async(method:string,params:any[])=>{
      const file=path.join(original,"report.json");
      if(!injected&&method==="eth_estimateGas"&&params[0]?.data?.startsWith(selector)&&fs.existsSync(file)){
        const r=JSON.parse(fs.readFileSync(file,"utf8"));
        if(r.trials.at(-1)?.repetition===1&&r.trials.some((t:any)=>!t.warmup&&t.status==="ok")){
          injected=true;throw new Error("header for hash not found");
        }
      }
      return send(method,params);
    };
    try{
      await assert.rejects(runStudy({...defaults,suite:"circuits",platform:"zama",widths:"128",sizes:"2,32",depths:"1",
        repetitions:1,live:true,outputDir:original},hre),/header for hash/);
      (hre.ethers.provider as any).send=send;
      const file=path.join(original,"report.json"),source=JSON.parse(fs.readFileSync(file,"utf8")) as StudyReport;
      assert(source.trials.some(t=>t.warmup&&t.status==="capacity_rejected"));
      source.trials.at(-1)!.setup.at(-1)!.blockHash="0x"+"11".repeat(32);
      fs.writeFileSync(file,JSON.stringify(source));const bytes=fs.readFileSync(file);
      validateCircuitContinuation(source);
      const unsafe=structuredClone(source);unsafe.trials.find(t=>t.status==="capacity_rejected")!.rejection!.limit="arbitrary";
      assert.throws(()=>validateCircuitContinuation(unsafe),/Invalid capacity/);
      const report=await continueStudy(file,continued,hre) as StudyReport;
      assert(report.executionComplete&&!report.complete);assert.equal(report.canonicalReceipts?.length,1);
      assert(latestAttempts(report).every(t=>["ok","capacity_rejected"].includes(t.status)));
      assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(JSON.stringify(report.trials.slice(0,source.trials.length)),JSON.stringify(source.trials));
      const resumed=report.trials.find(t=>t.resumedPreparation)!;assert.equal(resumed.setup.length,0);assert(["ok","capacity_rejected"].includes(resumed.status));
      assert.equal(report.trials.filter(t=>t.warmup).length,source.trials.filter(t=>t.warmup).length);
    }finally{
      (hre.ethers.provider as any).send=send;
      for(const folder of [original,continued]){
        for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){const f=path.join(folder,name);if(fs.existsSync(f))fs.unlinkSync(f);}
        if(fs.existsSync(folder))fs.rmdirSync(folder);
      }
      fs.rmdirSync(parent);
    }
  });
  it("recovers a fully confirmed measured window using supplementary canonical receipts, never duplicate sends", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"measured-reinclude-")),original=path.join(parent,"source"),continued=path.join(parent,"continued");
    const send=hre.ethers.provider.send.bind(hre.ethers.provider);let injected=false;
    (hre.ethers.provider as any).send=async(method:string,params:any[])=>{
      const file=path.join(original,"report.json");
      if(!injected&&method==="eth_getLogs"&&fs.existsSync(file)){
        const r=JSON.parse(fs.readFileSync(file,"utf8"));
        if(r.trials.at(-1)?.repetition===1){injected=true;throw new Error("Injected measured audit interruption");}
      }
      return send(method,params);
    };
    try{
      await assert.rejects(runStudy({...defaults,suite:"concurrency",platform:"baseline",widths:"16",users:"1",modes:"independent",
        requests:2,repetitions:1,live:true,outputDir:original},hre),/Injected measured/);
      (hre.ethers.provider as any).send=send;
      const file=path.join(original,"report.json"),source=JSON.parse(fs.readFileSync(file,"utf8")) as StudyReport;
      // Simulate a first-seen orphaned receipt in this local fixture only.
      source.trials.at(-1)!.requests[0].transaction.blockHash="0x"+"11".repeat(32);
      fs.writeFileSync(file,JSON.stringify(source));const bytes=fs.readFileSync(file);
      let mutations=0;
      (hre.ethers.provider as any).send=async(method:string,params:any[])=>{
        if(/sendTransaction|sendRawTransaction/.test(method))mutations++;
        return send(method,params);
      };
      const report=await continueStudy(file,continued,hre) as StudyReport;
      assert(report.executionComplete);assert(!report.complete);assert.equal(mutations,0);
      assert.equal(report.canonicalReceipts?.length,1);assert.equal(report.recoveredAudits?.length,1);
      const audit=report.recoveredAudits![0];assert(!audit.warmup&&audit.status==="ok");assert.equal(audit.snapshots.length,2);
      assert(latestAttempts(report).every(t=>t.status==="ok"));assert.deepEqual(fs.readFileSync(file),bytes);
      assert.equal(JSON.stringify(report.trials),JSON.stringify(source.trials));
      assert.equal(report.trials.at(-1)!.requests[0].auditCallMs,undefined);
      const summary=JSON.parse(fs.readFileSync(path.join(continued,"summary.json"),"utf8"))[0];
      assert.equal(summary.receiptMs.n,1);assert.equal(summary.receiptWindowMs.n,0);
      assert.equal(summary.separatelyLateValidatedRequests,2);assert.equal(summary.deferredAuditCallMs.n,0);
      const costs=JSON.parse(fs.readFileSync(path.join(continued,"costs.json"),"utf8"));assert.equal(costs.reconciledCanonicalReceipts,1);
    }finally{
      (hre.ethers.provider as any).send=send;
      for(const folder of [original,continued]){
        for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){const f=path.join(folder,name);if(fs.existsSync(f))fs.unlinkSync(f);}
        if(fs.existsSync(folder))fs.rmdirSync(folder);
      }
      fs.rmdirSync(parent);
    }
  });
  it("audits a confirmed warmup later without replaying it or restoring its timing", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"late-warmup-")),original=path.join(parent,"source"),continued=path.join(parent,"continued");
    const send=hre.ethers.provider.send.bind(hre.ethers.provider);
    let injected=false;
    (hre.ethers.provider as any).send=async(method:string,params:any[])=>{
      const file=path.join(original,"report.json");
      if(!injected&&method==="eth_getLogs"&&fs.existsSync(file)){
        const r=JSON.parse(fs.readFileSync(file,"utf8")) as StudyReport;
        if(r.trials.at(-1)?.controlDirection==="reverse"){
          injected=true;throw new Error("Injected interruption before audit");
        }
      }
      return send(method,params);
    };
    try{
      await assert.rejects(runStudy({...defaults,suite:"concurrency",platform:"baseline",widths:"16",users:"1",modes:"independent",
        requests:2,repetitions:1,live:true,outputDir:original},hre),/Injected interruption/);
      (hre.ethers.provider as any).send=send;
      const file=path.join(original,"report.json"),bytes=fs.readFileSync(file),source=JSON.parse(bytes.toString()) as StudyReport;
      assert(injected);assert(source.trials[1].requests.every(r=>r.transaction.status==="confirmed"&&r.auditCallMs===undefined));
      const unsafe=structuredClone(source);unsafe.trials[1].requests[0].transaction.status="pending";
      assert.throws(()=>validateStudyContinuation(unsafe),/Unsettled/);
      const report=await continueStudy(file,continued,hre) as StudyReport;
      assert(report.executionComplete);assert(!report.complete);assert(latestAttempts(report).every(t=>t.status==="ok"));
      assert.deepEqual(fs.readFileSync(file),bytes);
      assert.equal(JSON.stringify(report.trials.slice(0,source.trials.length)),JSON.stringify(source.trials));
      assert.equal(report.trials.length,3);assert.equal(report.setups.length,source.setups.length);
      const audit=report.recoveredAudits![0];assert.equal(audit.status,"ok");assert.equal(audit.snapshots.length,2);
      assert(audit.snapshots.every(r=>r.expected===r.plaintext));assert.match(audit.timingUse,/excluded/);
      assert(report.trials[1].requests.every(r=>r.auditCallMs===undefined&&r.status==="pending"));
      const control=JSON.parse(fs.readFileSync(path.join(continued,"controls.json"),"utf8"))[0];
      assert(control.complete&&control.lateAuditUsed);assert.equal(control.retainedPriorAuditFailures,1);
      const txs=[...report.setups.map(s=>s.transaction),...report.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])];
      assert.equal(txs.length,new Set(txs.map(t=>t.transactionHash)).size);
      for(const user of report.accounts){const ns=txs.filter(t=>t.user===user).map(t=>t.transactionNonce).sort((a,b)=>a-b);assert(ns.every((n,i)=>n===ns[0]+i));}
    }finally{
      (hre.ethers.provider as any).send=send;
      for(const folder of [original,continued]){
        for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){const f=path.join(folder,name);if(fs.existsSync(f))fs.unlinkSync(f);}
        if(fs.existsSync(folder))fs.rmdirSync(folder);
      }
      fs.rmdirSync(parent);
    }
  });
  it("runs both studies on baseline and mock Zama with stable snapshots, controls, unique nonces and preserved classics", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"focused-studies-")), output=path.join(parent,"run");
    try {
      const args={...defaults,platform:"baseline,zama",widths:"16",users:"1,2",sizes:"2,4",depths:"1,2",
        requests:4,repetitions:1,live:true,outputDir:output};
      const report=await runStudy(args,hre) as StudyReport;
      assert(report.complete,report.error);
      assert(report.trials.every(t=>t.status==="ok"));
      const controls=JSON.parse(fs.readFileSync(path.join(output,"controls.json"),"utf8"));
      assert(controls.every((c:any)=>c.complete&&c.sameObservedFinal===c.expectedSameFinal));
      assert.equal(controls.length,6);
      const transactions=[...report.setups.map(s=>s.transaction),...report.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])];
      for(const user of report.accounts){
        const nonces=transactions.filter(t=>t.user===user).map(t=>t.transactionNonce).sort((a,b)=>a-b);
        assert.equal(nonces.length,new Set(nonces).size);
        assert(nonces.every((n,i)=>n===nonces[0]+i));
      }
      assert(report.trials.filter(t=>!t.warmup&&t.requests.length===4).every(t=>t.requests.every(r=>r.auditCallMs!==undefined&&r.transactionToValidatedMs===undefined)));
      for (const trial of report.trials.filter(t=>t.requests.length===1)) {
        const r=trial.requests[0];
        assert(Math.abs(r.transaction.receiptMs!+r.postReceiptMs!-r.transactionToValidatedMs!)<0.0001);
      }
      const before=fs.readFileSync(path.join(output,"report.json"),"utf8");
      assert(!before.includes("privateKey")&&!before.includes('"raw"'));
      await assert.rejects(runStudy(args,hre),/fresh output/);
      assert.equal(fs.readFileSync(path.join(output,"report.json"),"utf8"),before);
    } finally {
      for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){
        const f=path.join(output,name);if(fs.existsSync(f))fs.unlinkSync(f);
      }
      if(fs.existsSync(output))fs.rmdirSync(output);fs.rmdirSync(parent);
    }
  });

  it("records rejected circuits without fake gas/latency, and continues with contiguous nonces", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"study-capacity-")),output=path.join(parent,"run");
    try {
      const report=await runStudy({...defaults,suite:"circuits",platform:"zama",widths:"128",sizes:"2,32",
        depths:"2,32",repetitions:1,live:true,outputDir:output},hre) as StudyReport;
      assert(report.executionComplete);
      assert.equal(report.complete,false);
      assert(report.trials.some(t=>t.status==="ok"));
      const rejected=report.trials.filter(t=>t.status==="capacity_rejected");
      assert(rejected.length>=4); // Warmup and measured depth/linear boundaries.
      for(const t of rejected) {
        const r=t.requests[0];
        assert.equal(t.rejection?.broadcast,false);
        assert.equal(r.transaction.transactionNonce,-1);
        assert.equal(r.transaction.transactionHash,undefined);
        assert.equal(r.transaction.gasUsed,undefined);
        assert.equal(r.transactionToValidatedMs,undefined);
      }
      const txs=[...report.setups.map(s=>s.transaction),...report.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])];
      const nonces=txs.filter(t=>t.transactionNonce>=0).map(t=>t.transactionNonce).sort((a,b)=>a-b);
      assert(nonces.every((n,i)=>n===nonces[0]+i));
    } finally {
      for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){
        const f=path.join(output,name);if(fs.existsSync(f))fs.unlinkSync(f);
      }
      if(fs.existsSync(output))fs.rmdirSync(output);fs.rmdirSync(parent);
    }
  });

  it("continues only missing circuit sends, retaining the failed preparation and every historical byte", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"study-resume-"));
    const original=path.join(parent,"source"),continued=path.join(parent,"continued"),blocked=path.join(parent,"blocked");
    const rpcSend=hre.ethers.provider.send.bind(hre.ethers.provider);
    const computeSelector=hre.ethers.id("executeCircuit(bytes32,bytes32,uint8,uint32)").slice(0,10);
    let injected=false;
    (hre.ethers.provider as any).send=async (method:string,params:any[])=>{
      const file=path.join(original,"report.json");
      if(!injected&&method==="eth_estimateGas"&&params[0]?.data?.startsWith(computeSelector)&&fs.existsSync(file)){
        const r=JSON.parse(fs.readFileSync(file,"utf8")) as StudyReport;
        if(r.trials.at(-1)?.repetition===1&&r.trials.some(t=>!t.warmup&&t.status==="ok")){
          injected=true;throw new Error("The Hardhat Fhevm plugin is not initialized.");
        }
      }
      return rpcSend(method,params);
    };
    try {
      await assert.rejects(runStudy({...defaults,suite:"circuits",platform:"baseline",widths:"16",sizes:"2",depths:"1",
        repetitions:1,live:true,outputDir:original},hre),/plugin is not initialized/);
      (hre.ethers.provider as any).send=rpcSend;
      const sourceFile=path.join(original,"report.json"),bytes=fs.readFileSync(sourceFile),source=JSON.parse(bytes.toString()) as StudyReport;
      assert(injected);validateCircuitContinuation(source);
      const last=source.trials.at(-1)!;
      assert.equal(last.requests[0].transaction.transactionNonce,-1);
      assert(last.setup.length>0&&last.setup.every(t=>t.status==="confirmed"));
      const unsafe=structuredClone(source);
      unsafe.trials.at(-1)!.requests[0].transaction.broadcastState="uncertain";
      assert.throws(()=>validateCircuitContinuation(unsafe),/Unsettled/);
      const send=hre.ethers.provider.send.bind(hre.ethers.provider);
      const maxNonce=Math.max(...validateCircuitContinuation(source).map(t=>t.transactionNonce));
      (hre.ethers.provider as any).send=async(method:string,params:any[])=>method==="eth_getTransactionCount"?
        hre.ethers.toQuantity(maxNonce+2):send(method,params);
      try { await assert.rejects(continueStudy(sourceFile,blocked,hre),/nonce mismatch/); }
      finally { (hre.ethers.provider as any).send=send; }
      assert.deepEqual(fs.readFileSync(sourceFile),bytes);
      const report=await continueStudy(sourceFile,continued,hre) as StudyReport;
      assert(report.executionComplete);assert.equal(report.complete,false);
      assert.equal(report.continuations?.at(-1)?.status,"finished");
      assert.equal(report.continuations?.at(-1)?.preflight?.exactNonces,true);
      assert(latestAttempts(report).every(t=>t.status==="ok"));
      assert.equal(report.trials.filter(t=>t.status==="incomplete").length,1);
      assert.equal(JSON.stringify(report.trials.slice(0,source.trials.length)),JSON.stringify(source.trials));
      assert.deepEqual(report.setups,source.setups);
      assert.deepEqual(fs.readFileSync(sourceFile),bytes);
      const reused=report.trials.find(t=>t.resumedPreparation)!;
      assert.equal(reused.scopeId,last.scopeId);assert.equal(reused.setup.length,0);
      const txs=[...report.setups.map(s=>s.transaction),...report.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])];
      const nonces=txs.filter(t=>t.status==="confirmed").map(t=>t.transactionNonce).sort((a,b)=>a-b);
      assert.equal(new Set(nonces).size,nonces.length);
      assert(nonces.every((n,i)=>n===nonces[0]+i));
      assert.equal(report.trials.filter(t=>t.warmup).length,source.trials.filter(t=>t.warmup).length);
    } finally {
      (hre.ethers.provider as any).send=rpcSend;
      for(const folder of [original,continued,blocked]){
        for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){
          const f=path.join(folder,name);if(fs.existsSync(f))fs.unlinkSync(f);
        }
        if(fs.existsSync(folder))fs.rmdirSync(folder);
      }
      fs.rmdirSync(parent);
    }
  });

  it("resumes a never-submitted window without repeating the completed control or its setup", async () => {
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),"window-resume-")),original=path.join(parent,"source"),continued=path.join(parent,"continued");
    const rpcSend=hre.ethers.provider.send.bind(hre.ethers.provider);
    const selector=hre.ethers.id("submit(bytes32,bytes32,uint16[],bytes)").slice(0,10);
    let seed="",injected=false;
    for(let i=0;!seed;i++){
      const candidate=`resume-window-${i}`;
      if(ordered(["baseline","zama"],`${candidate}/concurrency-w16-c1-independent/platforms`)[0]==="baseline")seed=candidate;
    }
    (hre.ethers.provider as any).send=async(method:string,params:any[])=>{
      const file=path.join(original,"report.json");
      if(!injected&&method==="eth_estimateGas"&&params[0]?.data?.startsWith(selector)&&fs.existsSync(file)){
        const r=JSON.parse(fs.readFileSync(file,"utf8")) as StudyReport,t=r.trials.at(-1)!;
        // The persisted checkpoint contains the first prepared request while
        // the second request is being estimated in memory.
        if(t.platform==="baseline"&&t.controlDirection==="reverse"&&t.requests.length===1){injected=true;throw new Error("execution reverted: Bad request");}
      }
      return rpcSend(method,params);
    };
    try{
      await assert.rejects(runStudy({...defaults,suite:"concurrency",platform:"baseline,zama",widths:"16",users:"1",modes:"independent",
        requests:2,repetitions:1,seed,live:true,outputDir:original},hre),/Bad request/);
      (hre.ethers.provider as any).send=rpcSend;
      const file=path.join(original,"report.json"),bytes=fs.readFileSync(file),source=JSON.parse(bytes.toString()) as StudyReport;
      assert(injected);assert.equal(source.trials[0].status,"ok");assert.equal(source.trials[1].status,"incomplete");
      const unsafe=structuredClone(source);unsafe.trials[1].requests[0].transaction.broadcastState="started";
      assert.throws(()=>validateStudyContinuation(unsafe),/Unsettled|Partially broadcast/);
      const report=await continueStudy(file,continued,hre) as StudyReport;
      assert(report.executionComplete);assert(!report.complete);
      assert(latestAttempts(report).every(t=>t.status==="ok"));
      assert.deepEqual(fs.readFileSync(file),bytes);
      assert.equal(JSON.stringify(report.trials.slice(0,source.trials.length)),JSON.stringify(source.trials));
      assert.deepEqual(report.setups.slice(0,source.setups.length),source.setups);
      assert.equal(report.setups.filter(s=>s.kind==="deployment").length,2);
      const resumed=report.trials.find(t=>t.resumedPreparation)!;
      assert.equal(resumed.controlDirection,"reverse");assert.equal(resumed.setup.length,0);
      assert.equal(resumed.scopeId,source.trials[1].scopeId);
      assert.equal(report.trials.filter(t=>t.platform==="baseline"&&t.controlDirection==="forward").length,1);
      const controls=JSON.parse(fs.readFileSync(path.join(continued,"controls.json"),"utf8"));
      assert(controls.every((c:any)=>c.complete&&c.sameObservedFinal===true));
      assert.equal(controls.find((c:any)=>c.platform==="baseline").retainedPriorPreparationFailures,1);
      const txs=[...report.setups.map(s=>s.transaction),...report.trials.flatMap(t=>[...t.setup,...t.requests.map(r=>r.transaction)])].filter(t=>t.status==="confirmed");
      assert.equal(txs.length,new Set(txs.map(t=>t.transactionHash)).size);
      for(const user of report.accounts){const ns=txs.filter(t=>t.user===user).map(t=>t.transactionNonce).sort((a,b)=>a-b);assert(ns.every((n,i)=>n===ns[0]+i));}
    }finally{
      (hre.ethers.provider as any).send=rpcSend;
      for(const folder of [original,continued]){
        for(const name of ["report.json","summary.json","summary.md","controls.json","costs.json","transactions.jsonl"]){const f=path.join(folder,name);if(fs.existsSync(f))fs.unlinkSync(f);}
        if(fs.existsSync(folder))fs.rmdirSync(folder);
      }
      fs.rmdirSync(parent);
    }
  });
});
