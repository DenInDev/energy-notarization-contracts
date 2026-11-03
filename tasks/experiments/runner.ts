import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import type { Signer, Contract, ContractTransactionReceipt } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { TimingTrace, deadline, ObservationDeadlineError } from "../lib/lifecycleTiming";
import { createNonceAllocator } from "../lib/lifecycleNonce";
import { readDeploymentBytecode } from "../lib/lifecycleResult";
import { safeError } from "../lifecycle/errors";
import type { Platform } from "../lifecycle/types";
import { loadAccounts, acquireAccountLock } from "./accounts";
import { makeExperimentAdapter } from "./adapters";
import { buildPlan, platforms, orderedPlatforms, valuesFor, scenarioValues, expectedResult } from "./plan";
import { measure, prepareInputs, runLoadWindow, sendTransaction, readAt } from "./measurement";
import { saveReport, analyzeReport } from "./report";
import type { Context, ExperimentArgs, ExperimentReport, Scenario, TxObservation } from "./types";

function provenance() {
  const files=["package-lock.json","hardhat.config.ts","scripts/generate-experiment-contracts.cjs",
    "scripts/patch-decryption-polling.cjs", "tasks/lib/decryptionPolling.cjs",
    ...fs.readdirSync("tasks/experiments").filter(f => f.endsWith(".ts")).map(f => `tasks/experiments/${f}`),
    ...fs.readdirSync("contracts/experiments").filter(f => f.endsWith(".sol")).map(f => `contracts/experiments/${f}`)];
  let commit="unavailable",dirty=true;
  try {
    commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
    dirty=!!execFileSync("git",["status","--porcelain"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  } catch { /* Source hashes remain available without Git. */ }
  return {node:process.version,commit,dirty,sha256:Object.fromEntries(files.filter(fs.existsSync)
    .map(file => [file,createHash("sha256").update(fs.readFileSync(file)).digest("hex")]))};
}

export async function runExperiments(args: ExperimentArgs, hre: HardhatRuntimeEnvironment) {
  const scenarios=buildPlan(args), choices=platforms(args.platform);
  const schedule=scenarios.map(s => ({caseId:s.id,platforms:orderedPlatforms(args.seed,s.id,choices)}));
  if (args.dryRun) {
    console.log(JSON.stringify({scenarios,schedule,runs:args.runs,requestsPerLoadWindow:args.requests,
      measuredRequests:choices.length*scenarios.reduce((n,s) => n+args.runs*(s.suite==="concurrency" ? args.requests : 1),0),
      note:"No connections, account reads, deployments or transactions. Setup and warmup add transactions."},null,2));
    return;
  }
  const chainId=Number((await hre.ethers.provider.getNetwork()).chainId),mock=chainId===31337;
  if (chainId!==11155111 && !mock) throw new Error("Only Sepolia or local chain 31337 is supported");
  if (mock && choices.includes("fhenix")) throw new Error("CoFHE requires Sepolia; local verification supports baseline and mock Zama");
  const signers=await hre.ethers.getSigners();
  if (!signers.length) throw new Error("Configure the existing owner account for deployment and single-user experiments");
  const owner=signers[0],maxUsers=Math.max(0,...scenarios.filter(s => s.suite==="concurrency").map(s => s.users));
  const users: Signer[]=maxUsers ? (mock ? signers.slice(1,1+maxUsers) : loadAccounts(args.accountsFile,hre.ethers.provider).slice(0,maxUsers)) : [];
  if (users.length!==maxUsers) throw new Error(`Need ${maxUsers} separate benchmark accounts`);
  const addresses=await Promise.all([owner,...users].map(s => s.getAddress()));
  if (new Set(addresses).size!==addresses.length) throw new Error("Owner and every concurrent user must have distinct addresses");
  const folder=path.resolve(args.outputDir || `logs/energy-experiments-${new Date().toISOString().replace(/[:.]/g,"-")}`);
  if (fs.existsSync(path.join(folder,"report.json"))) throw new Error("Output folder already contains a report; choose a fresh directory");
  const release=maxUsers && !mock ? acquireAccountLock(args.accountsFile) : () => {};
  const {accountsFile:_,...publicConfig}=args;
  const report: ExperimentReport={schemaVersion:1,kind:"expanded-experiments",complete:false,startedAt:new Date().toISOString(),
    chainId,mock,config:publicConfig,scenarios,schedule,accounts:addresses,provenance:provenance(),
    methodology:{decryptionPolling:require("../lib/decryptionPolling.cjs").pollingProvenance(),integerSemantics:"unsigned modular arithmetic at the selected width",
      timeouts:"One budget for submission+receipt per transaction, and one for final receipt through validated plaintext; input preparation has its own budget.",
      timing:"Monotonic wall time. Input preparation is excluded from transaction-to-result and included in end-to-end when performed inside the request.",
      postReceipt:"Receipt-pinned read + authorization + SDK/network/service wait + decryption + validation; not isolated FHE compute time.",
      computeSetup:"Every compute replicate uses fresh encrypted inputs, all decrypted/validated before its measured transaction. State is populated separately.",
      chain:"Each step waits only for the preceding receipt; only the final result is decrypted. First step resets the accumulator from input[0].",
      load:"Separate platform windows, fixed total requests, C independent accounts, closed-loop one logical request per account; load then add = two transactions/request. No repeat-ready decryption.",
      import:"Imports validate all N inputs; CoFHE view decrypts them sequentially and Zama uses one batch. Post-receipt costs include this SDK difference.",
      warmup:"One validated request per case/account excluded from measurements. Failed warmup/setup is retained and blocks that case/platform, not unrelated cases.",
      failures:"All attempts retained. Only administrative post-receipt timeouts are completion censoring. Ambiguous transactions halt the affected account without resubmission.",
      units:{latency:"milliseconds",cost:"wei",throughput:"validated logical requests per second; receipt transactions also reported"}},
    setups:[],samples:[],windows:[],errors:[]};
  const halted=new Set<string>(),nonceCursors=new Map<string,ReturnType<typeof createNonceAllocator>>();
  const contracts=new Map<string,Contract>(),contexts=new Map<string,Context>();
  const unavailable=new Set<string>();
  const timeoutMs=args.timeout*1000;
  const nonce=(user:string) => {
    if (halted.has(user)) throw new Error(`Account ${user} halted after ambiguous submission`);
    return nonceCursors.get(user)!.reserve();
  };
  const recordSetup=async <T>(label:string,platform:Platform,caseId:string,user:string,
    fn:(trace:TimingTrace,transactions:TxObservation[])=>Promise<T>): Promise<T> => {
    const trace=new TimingTrace(),transactions:TxObservation[]=[];
    const record:Record<string,unknown>={label,platform,caseId,user,startedAt:new Date().toISOString(),status:"pending",transactions,stages:trace.stages};
    report.setups.push(record);
    try { const result=await fn(trace,transactions); record.status="ok"; return result; }
    catch(error) { record.status=error instanceof ObservationDeadlineError ? "timeout" : "error"; record.error=safeError(error); throw error; }
    finally { record.durationMs=trace.now(); record.endedAt=new Date().toISOString(); saveReport(folder,report); }
  };
  const context=async (platform:Platform,s:Scenario,signer:Signer):Promise<Context> => {
    const user=await signer.getAddress();
    if (halted.has(user)) throw new Error(`Account ${user} halted; no further transactions`);
    const key=`${platform}/${s.width}/${s.suite==="state" ? s.stateSize : 0}`;
    let contract=contracts.get(key);
    if (!contract) {
      contract=await recordSetup("deploy_and_authorize",platform,s.id,owner.address,async (trace,transactions) => {
        if (halted.has(owner.address)) throw new Error("Deployment owner halted");
        const name=`Experiment${{baseline:"Plain",zama:"Zama",fhenix:"CoFHE"}[platform]}${s.width}`;
        const factory=await hre.ethers.getContractFactory(name,owner);
        let deployed: Contract;
        let receipt: ContractTransactionReceipt | null=null;
        const record:TxObservation={nonce:nonce(owner.address),startedMs:trace.now()}; transactions.push(record);
        try {
          deployed=await deadline(() => factory.deploy({nonce:record.nonce}),timeoutMs,"deployment submission") as unknown as Contract;
          const tx=deployed.deploymentTransaction()!; record.hash=tx.hash;
          receipt=await deadline(() => tx.wait(1,timeoutMs),timeoutMs,"deployment receipt");
          if (!receipt) throw new Error("Missing deployment receipt");
          Object.assign(record,{receiptMs:trace.now(),status:receipt.status,blockHash:receipt.blockHash,blockNumber:receipt.blockNumber,
            gasUsed:String(receipt.gasUsed),gasPriceWei:String(receipt.gasPrice),costWei:String(receipt.gasUsed*receipt.gasPrice)});
          if (receipt.status!==1) throw new Error("Deployment reverted");
        } catch(error) { if (!receipt) halted.add(owner.address); throw error; }
        const address=await deployed.getAddress();
        const code=await readDeploymentBytecode((method,params) => hre.ethers.provider.send(method,params),address,receipt.blockHash,trace,timeoutMs);
        trace.event("deployment.identity",{address,contract:name,bytecodeHash:hre.ethers.keccak256(code)});
        const authorization:Context={platform,signer:owner,user:owner.address,contract:deployed,adapter:null as any,
          reserveNonce:()=>nonce(owner.address),timeoutMs,halted:false};
        if (users.length) {
          try { await sendTransaction(authorization,"authorize",[addresses.slice(1)],trace,transactions); }
          finally { if (authorization.halted) halted.add(owner.address); }
        }
        return deployed;
      });
      contracts.set(key,contract);
    }
    const ctxKey=`${key}/${user}`;
    let ctx=contexts.get(ctxKey);
    if (!ctx) {
      const connected=contract.connect(signer) as Contract;
      const adapter=await recordSetup("sdk",platform,s.id,user,trace => deadline(() =>
        makeExperimentAdapter(platform,s.width,hre,signer,String(connected.target),trace,mock),timeoutMs,"SDK setup"));
      ctx={platform,signer,user,contract:connected,adapter,reserveNonce:()=>nonce(user),timeoutMs,halted:false};
      contexts.set(ctxKey,ctx);
    }
    return ctx;
  };
  const stateValues=(s:Scenario) => valuesFor(args.seed,"state",s.stateSize,s.width);
  const prepare=async (ctx:Context,s:Scenario,values:bigint[]) => {
    if (s.suite==="inputs" || s.suite==="concurrency") return;
    try {
      await recordSetup(s.suite==="state" ? "state_population" : "ready_inputs",ctx.platform,s.id,ctx.user,async (trace,transactions) => {
        if (s.suite!=="state") return prepareInputs(ctx,values,trace,transactions);
        const existing=Number(await deadline(() => ctx.contract.getStateCount(),timeoutMs,"state count read"));
        if (existing===s.stateSize) return;
        if (existing!==0) throw new Error("Partial state setup detected; use a fresh campaign");
        for (let start=0;start<s.stateSize;start+=16) {
          const input=await deadline(() => ctx.adapter.encrypt(values.slice(start,start+16),trace,timeoutMs),timeoutMs,"state input preparation");
          const receipt=await sendTransaction(ctx,"append",input,trace,transactions);
          // Validate EVERY imported state value before a state measurement can start.
          await deadline(async () => {
            const handles=Array.from(await readAt(ctx,"getStateRange",receipt.blockHash,trace,timeoutMs,
              [start,Math.min(16,s.stateSize-start)])) as (bigint|string)[];
            const results=await ctx.adapter.decrypt(handles,trace,timeoutMs);
            if (results.length!==handles.length || results.some((v,i)=>BigInt(v as any)!==values[start+i]))
              throw new Error("State setup plaintext mismatch");
          },timeoutMs,"state input readiness");
        }
        if (Number(await ctx.contract.getStateCount())!==s.stateSize) throw new Error("State size mismatch");
      });
    } finally { if (ctx.halted) halted.add(ctx.user); }
  };
  try {
    console.log(`Expanded experiments: ${folder}\n${scenarios.length} cases; ${args.runs} repetitions; ${mock ? "LOCAL MOCK" : "Sepolia"}`);
    await hre.run("compile");
    if (mock && choices.includes("zama")) await hre.fhevm.initializeCLIApi();
    for (const user of addresses) {
      const [balance,pending,latest]=await Promise.all([hre.ethers.provider.getBalance(user),
        hre.ethers.provider.send("eth_getTransactionCount",[user,"pending"]),hre.ethers.provider.send("eth_getTransactionCount",[user,"latest"])]);
      if (balance===0n) throw new Error(`Fund Sepolia account ${user} before running experiments`);
      if (pending!==latest) throw new Error(`Account ${user} has pending transactions; wait for them before starting`);
      nonceCursors.set(user,createNonceAllocator(Number(BigInt(pending))));
    }
    saveReport(folder,report);
    for (let run=-1;run<args.runs;run++) {
      const caseOrder=[...scenarios].sort((a,b)=>createHash("sha256").update(`${args.seed}/${run}/${a.id}`).digest("hex")
        .localeCompare(createHash("sha256").update(`${args.seed}/${run}/${b.id}`).digest("hex")));
      for (const s of caseOrder) {
        const baseOrder=schedule.find(item=>item.caseId===s.id)!.platforms;
        // Rotate platforms across replicates; randomize case order; isolate load windows.
        const offset=(run+1)%baseOrder.length,order=[...baseOrder.slice(offset),...baseOrder.slice(0,offset)];
        for (const platform of order) {
          const blockedKey=`${s.id}/${platform}`;
          if (unavailable.has(blockedKey)) continue;
          try {
            if (s.suite==="concurrency") {
              const workers:Context[]=[];
              for (const signer of users.slice(0,s.users)) workers.push(await context(platform,s,signer));
              if (workers.some(ctx=>ctx.halted)) throw new Error("A load worker is halted; incomplete windows are not comparable");
              const started=performance.now(),start=new Date().toISOString();
              const samples=await runLoadWindow(workers,run<0 ? s.users : args.requests,async (ctx,request) => {
                const values=valuesFor(args.seed,`load/${run}/${request}`,2,s.width);
                const sample=await measure(ctx,s,values,expectedResult(s,values),run,request,run<0);
                report.samples.push(sample);
                if (ctx.halted) halted.add(ctx.user);
                return sample;
              });
              const durationMs=performance.now()-started;
              if (run>=0) {
                const completed=samples.filter(sample=>sample.status==="ok").length;
                const receiptTransactions=samples.reduce((n,sample)=>n+sample.transactions.filter(tx=>tx.receiptMs!==undefined).length,0);
                const receiptRequests=samples.filter(sample=>sample.transactionToReceiptMs!==undefined).length;
                report.windows.push({caseId:s.id,platform,run,users:s.users,planned:args.requests,attempted:samples.length,
                  completed,receiptTransactions,receiptRequests,durationMs,start,end:new Date().toISOString(),
                  validatedRequestsPerSecond:completed*1000/durationMs,receiptTransactionsPerSecond:receiptTransactions*1000/durationMs,
                  receiptRequestsPerSecond:receiptRequests*1000/durationMs});
              }
              console.log(`${s.id} ${platform} ${run<0 ? "warmup" : `run ${run+1}`}: ${samples.filter(sample=>sample.status==="ok").length}/${samples.length} validated`);
              if (run<0 && samples.some(sample=>sample.status!=="ok")) throw new Error("Load warmup failed; measured windows skipped for this case/platform");
              if (workers.some(ctx=>ctx.halted)) throw new Error("Ambiguous load transaction; this case/platform stopped");
            } else {
              const ctx=await context(platform,s,owner);
              const values=s.suite==="state" ? stateValues(s) : scenarioValues(args.seed,s,run);
              await prepare(ctx,s,values);
              const sample=await measure(ctx,s,values,expectedResult(s,values,s.suite==="state" ? values : []),run,0,run<0);
              report.samples.push(sample);
              if (ctx.halted) halted.add(ctx.user);
              console.log(`${s.id} ${platform} ${run<0 ? "warmup" : `run ${run+1}`}: ${sample.status}${sample.error ? `; ${sample.error}` : ""}`);
              if (run<0 && sample.status!=="ok") throw new Error("Warmup failed; measured samples skipped for this case/platform");
              if (ctx.halted) throw new Error("Ambiguous transaction; account halted");
            }
          } catch(error) {
            report.errors.push({caseId:s.id,platform,message:safeError(error)});
            unavailable.add(blockedKey);
            console.error(`${s.id} ${platform}: ${safeError(error)}`);
          }
          saveReport(folder,report);
        }
      }
    }
    // Complete means all planned requests were attempted and settled, not that they all succeeded.
    report.complete=report.errors.length===0 && report.samples.filter(s=>!s.warmup).length===
      choices.length*scenarios.reduce((n,s)=>n+args.runs*(s.suite==="concurrency" ? args.requests : 1),0);
  } catch(error) {
    report.errors.push({message:safeError(error)});
    throw error;
  } finally {
    report.finishedAt=new Date().toISOString();
    try { saveReport(folder,report); analyzeReport(folder,report); } finally { release(); }
  }
  console.log(`Report: ${path.join(folder,"report.json")}`);
  if (!report.complete || report.samples.some(s=>s.status!=="ok")) process.exitCode=1;
  return report;
}
