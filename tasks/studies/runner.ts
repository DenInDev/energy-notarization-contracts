import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { getCreateAddress, type Contract, type Signer } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { acquireAccountLock, loadAccounts } from "../experiments/accounts";
import { createNonceAllocator, readSettledNonce } from "../lib/lifecycleNonce";
import { readDeploymentBytecode, readLifecycleResult } from "../lib/lifecycleResult";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import { deadline, TimingTrace, validatePlaintext } from "../lib/lifecycleTiming";
import { safeError } from "../lifecycle/errors";
import type { Platform } from "../lifecycle/types";
import { makeStudyAdapter } from "./adapters";
import { expectedCircuit, inputBatchSize, ordered, planSummary, valuesFor } from "./plan";
import { replay } from "./oracle";
import { capacityRejection } from "./capacity";
import { isUnusedSnapshot, latestAttempts, trialKey, validateStudyContinuation, type StudyContinuation } from "./continuation";
import { readWindowLogs } from "./logs";
import { effectiveReceipt, verifyCanonicalReceipt } from "./canonical";
import { estimateCircuitAtReceipt, estimateStudyCallAtBlock } from "./preparation";
import { saveStudy, type StudyReport } from "./report";
import { executePrepared, prepareCall, prepareRequest, type Fees, type Prepared } from "./transactions";
import type { ExperimentAdapter, RequestResult, StudyArgs, StudyCase, Trial, Width } from "./types";

type Context = { platform: Platform; width: Width; contract: Contract; reader: ExperimentAdapter;
  writers: ExperimentAdapter[]; users: Signer[]; addresses: string[] };

function provenance() {
  const files = ["package-lock.json","hardhat.config.ts","tasks/benchmarkExperiments.ts","scripts/generate-study-contracts.cjs",
    "tasks/experiments/accounts.ts","tasks/lifecycle/broadcast.ts","tasks/lib/lifecycleTiming.ts",
    "tasks/lib/lifecycleReadRetry.ts","tasks/lib/cofheReadPolicy.ts","tasks/lib/decryptionPolling.cjs",
    "tasks/lib/lifecycleNonce.ts","tasks/lib/lifecycleResult.ts","tasks/lib/lifecycleReportWrite.ts","tasks/lifecycle/errors.ts",
    ...fs.readdirSync("tasks/studies").filter(f => f.endsWith(".ts")).map(f => `tasks/studies/${f}`),
    ...fs.readdirSync("contracts/studies").map(f => `contracts/studies/${f}`)];
  return { node:process.version, sha256:Object.fromEntries(files.map(file => [file,
    createHash("sha256").update(fs.readFileSync(file)).digest("hex")])),
    decryptionPolling:require("../lib/decryptionPolling.cjs").pollingProvenance(),
    cofheReadPolicy:{minimumPollingMs:1000,maxRateLimitAttempts:3,rateLimitBackoffMs:5000} };
}

// Planning is deliberately before every network, account or output-directory read.
// Live execution uses a fresh report and dedicated accounts, without funding.
export async function runStudy(args: StudyArgs, hre: HardhatRuntimeEnvironment, continuation?: StudyContinuation) {
  const plan = planSummary(args);
  if (!args.live) { console.log(JSON.stringify(plan,null,2)); return plan; }
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId), mock = chainId === 31337;
  if (![11155111,31337].includes(chainId)) throw new Error("Only Sepolia or explicit local Hardhat execution supported");
  if (mock && plan.platforms.includes("fhenix")) throw new Error("CoFHE requires a real Sepolia pilot; local tests support baseline/mock Zama");
  const folder = path.resolve(args.outputDir || `logs/studies-${new Date().toISOString().replace(/[:.]/g,"-")}`);
  if (fs.existsSync(folder)) throw new Error("Use a fresh output directory");
  const signers: Signer[] = mock ? (await hre.ethers.getSigners()).slice(0,plan.requiredAccounts) : loadAccounts(args.accountsFile,hre.ethers.provider).slice(0,plan.requiredAccounts);
  if (signers.length !== plan.requiredAccounts) throw new Error(`Need ${plan.requiredAccounts} dedicated saved accounts; no accounts are funded automatically`);
  const addresses = await Promise.all(signers.map(s => s.getAddress()));
  if (new Set(addresses).size !== addresses.length) throw new Error("Distinct operator/writer accounts required");
  const {accountsFile:_secret,...config} = args;
  let report: StudyReport = {schemaVersion:1,kind:"concurrency-circuit-studies",complete:false,mock,chainId,
    startedAt:new Date().toISOString(),config,accounts:addresses,cases:plan.cases,platforms:plan.platforms,
    provenance:provenance(),setups:[],trials:[],methodology:{
      execution:"One coordinator; platform windows are sequential and rotated. Encrypt/estimate/sign all window requests before broadcasting. At most C independent writer transactions in a receipt-synchronized wave. Actual broadcast spreads retained.",
      order:"Canonical (blockNumber,transactionIndex), checked against contract sequence; submission and decryption completion order are not state order.",
      snapshots:"Unique request IDs persist each intermediate output; reading shared latest state is never used as a per-request result.",
      concurrencyAudit:"Decrypt snapshots and final state after all window receipts, serially with the operator. Audit-call durations are already-ready retrieval, not primary completion latency or network capacity. Receipt throughput excludes preparation/audit.",
      circuits:"Fresh inputs loaded and every input decrypted/validated before one measured compute transaction. Linear/tree reductions have equal add counts; affine chains increase both operations and depth.",
      capacity:"Known exact Zama HCU-limit rejections at estimateGas are recorded without reserving a compute nonce, receipt, gas or completion latency. Continue the remaining planned cases; executionComplete does not imply every trial is valid. Unexpected errors stop execution.",
      setup:"Deployment, authorization, fresh window zero-state/input loading and readiness recorded separately, including gas. One warmup per case; C=1 concurrency uses forward/reverse controls on identical inputs.",
      failure:"No automatic retransmission of any on-chain mutation; save prepared hashes before release. Stop after any failed/inconsistent trial; drain a released wave. Reverts and unavailable plaintext are incomplete trials, not proven state inconsistencies.",
      observation:"Client/RPC/service latency on a public network, not isolated FHE compute. Larger server hints respected. All read waits counted. No live platform comparison is assumed causal.",
      local:"Local mode uses unlocked Hardhat sends for correctness tests; its timing and signing path are not Sepolia performance evidence.",
    }};
  if (continuation) {
    validateStudyContinuation(continuation.report);
    if (continuation.report.chainId!==chainId || JSON.stringify(continuation.report.accounts)!==JSON.stringify(addresses) ||
        JSON.stringify(continuation.report.cases)!==JSON.stringify(plan.cases)) throw new Error("Continuation plan/account/chain mismatch");
    const currentProvenance=report.provenance;
    if(JSON.stringify(currentProvenance.decryptionPolling)!==JSON.stringify(continuation.report.provenance.decryptionPolling))
      throw new Error("SDK bundle provenance changed; timed policy must remain unchanged");
    const protectedFiles=Object.entries(continuation.report.provenance.sha256 as Record<string,string>).filter(([f])=>
      f.startsWith("contracts/studies/") || /studies\/(adapters|transactions|plan|oracle|capacity)\.ts$/.test(f) ||
      f.startsWith("tasks/lib/") || f==="tasks/lifecycle/broadcast.ts");
    for(const [file,hash] of protectedFiles) if(createHash("sha256").update(fs.readFileSync(file)).digest("hex")!==hash)
      throw new Error(`Timed workload source changed: ${file}`);
    report=structuredClone(continuation.report);
    report.complete=false;report.executionComplete=false;delete report.finishedAt;
    if(report.error){(report.historicalErrors??=[]).push(report.error);delete report.error;}
    (report.continuations??=[]).push({sourceFile:continuation.sourceFile,sourceSha256:continuation.sourceSha256,
      sourceTrialCount:continuation.report.trials.length,startedAt:new Date().toISOString(),status:"preflight",
      provenance:{...currentProvenance,processId:process.pid,change:"Initialize the FHEVM provider; pin compute gas to the input-load receipt and concurrent submit gas to the opened-window receipt, passing explicit limits to signing. Recover zero-send preparations and separately audit fully confirmed interrupted windows without replaying sends. Canonical reinclusions require the same hash/sender/nonce/target, an orphaned old block and a repeated stable canonical receipt; supplementary evidence supplies order/gas but no replacement timing. Log-head lag retries preserve the exact confirmed range within the original read deadline. Contracts, timed broadcast transport, SDK bundles and decrypt policy unchanged."}});
    report.methodology.continuation="Original trials and setup prefixes retained exactly. Continue only never-submitted preparations and unattempted slots. Reuse confirmed circuit loads or a zero-window setup; skip completed controls/warmups and existing deployments. A partial prepared batch is recreated only after exact nonce and unused-request checks. Duration scope and discarded unused hashes are recorded. Fully confirmed interrupted windows receive a separate late read-only audit; original trials and timing gaps remain unchanged.";
  }
  fs.mkdirSync(path.dirname(folder),{recursive:true});
  fs.mkdirSync(folder);
  const save = () => {
    if(continuation && (createHash("sha256").update(fs.readFileSync(continuation.sourceFile)).digest("hex")!==continuation.sourceSha256 ||
      JSON.stringify(report.trials.slice(0,continuation.report.trials.length))!==JSON.stringify(continuation.report.trials) ||
      JSON.stringify(report.setups.slice(0,continuation.report.setups.length))!==JSON.stringify(continuation.report.setups) ||
      JSON.stringify((report.recoveredAudits??[]).slice(0,continuation.report.recoveredAudits?.length??0))!==JSON.stringify(continuation.report.recoveredAudits??[]) ||
      JSON.stringify((report.canonicalReceipts??[]).slice(0,continuation.report.canonicalReceipts?.length??0))!==JSON.stringify(continuation.report.canonicalReceipts??[])))
      throw new Error("Continuation source bytes or serialized historical prefix changed");
    saveStudy(folder,report);
  };
  // A small append-only journal avoids serializing the accumulated report
  // between writers in a measured wave. Prepared hashes are checkpointed first.
  const journal = (transaction: Prepared["record"]) => fs.appendFileSync(path.join(folder,"transactions.jsonl"),
    JSON.stringify({at:new Date().toISOString(),transaction},(_key,value) => typeof value === "bigint" ? String(value) : value)+"\n");
  const cursors = new Map<string,ReturnType<typeof createNonceAllocator>>();
  const reserve = (signer: Signer) => cursors.get(addresses[signers.indexOf(signer)])!.reserve();
  const budget = args.timeout*1000;
  const quote = async (): Promise<Fees> => {
    const fee = await deadline(() => hre.ethers.provider.getFeeData(),budget,"fee quote");
    if (fee.maxFeePerGas === null || fee.maxPriorityFeePerGas === null) throw new Error("Shared fee quote unavailable");
    return {maxFeePerGas:fee.maxFeePerGas,maxPriorityFeePerGas:fee.maxPriorityFeePerGas};
  };
  const rpc = (method: string, params: any[]) => hre.ethers.provider.send(method,params);
  const read = (ctx: Context, getter: string, hash: string, params: unknown[], trace: TimingTrace) =>
    deadline(() => retryLifecycleRead(trace,"audit.read",budget,() => readLifecycleResult(rpc,ctx.contract.interface,
      String(ctx.contract.target),addresses[0],getter,hash,params),1000,false,false,true),budget,"canonical study read");
  const transact = async (ctx: Context, method: string, params: unknown[], list: Trial["setup"]) => {
    const p = await prepareCall(ctx.contract,signers[0],method,params,reserve(signers[0]),await quote(),chainId,budget,`${method}/${list.length}`);
    list.push(p.record); save(); return executePrepared(p,hre,budget,chainId,save);
  };
  const contexts = new Map<string,Context>();
  const maxUsers = plan.requiredAccounts-1;
  const context = async (platform: Platform, width: Width): Promise<Context> => {
    const key = `${platform}/${width}`, existing = contexts.get(key);
    if (existing) return existing;
    const factory = await hre.ethers.getContractFactory(`Study${{baseline:"Plain",zama:"Zama",fhenix:"CoFHE"}[platform]}${width}`,signers[0]);
    const nonce = reserve(signers[0]), address = getCreateAddress({from:addresses[0],nonce});
    const deployment = await prepareRequest(await factory.getDeployTransaction(),signers[0],"deploy",nonce,await quote(),chainId,budget,key);
    const entry = {platform,width,kind:"deployment",transaction:deployment.record,address,bytecodeHash:""};
    report.setups.push(entry); save();
    const receipt = await executePrepared(deployment,hre,budget,chainId,save);
    const code = await readDeploymentBytecode(rpc,address,receipt.blockHash,new TimingTrace(),budget);
    entry.bytecodeHash = hre.ethers.keccak256(code);
    const contract = await hre.ethers.getContractAt(`Study${{baseline:"Plain",zama:"Zama",fhenix:"CoFHE"}[platform]}${width}`,address,signers[0]);
    const ctx: Context = {platform,width,contract,users:signers.slice(1),addresses:addresses.slice(1),writers:[],
      reader:await deadline(() => makeStudyAdapter(platform,width,hre,signers[0],address,new TimingTrace(),mock),budget,"reader SDK setup")};
    for (const signer of ctx.users) ctx.writers.push(await deadline(() =>
      makeStudyAdapter(platform,width,hre,signer,address,new TimingTrace(),mock),budget,"writer SDK setup"));
    const authorization = await prepareCall(contract,signers[0],"authorize",[addresses.slice(1)],reserve(signers[0]),await quote(),chainId,budget,key+"/authorize");
    report.setups.push({platform,width,kind:"authorization",transaction:authorization.record}); save();
    await executePrepared(authorization,hre,budget,chainId,save);
    contexts.set(key,ctx); return ctx;
  };
  const id = (value: string) => hre.ethers.id(`${args.seed}/${value}`);
  const newTrial = (c: StudyCase, platform: Platform, run: number, warmup: boolean, direction?: "forward" | "reverse"): Trial => {
    const t: Trial = {caseId:c.id,platform,repetition:run,warmup,scopeId:id(`${c.id}/${platform}/${run}/${warmup}/${direction ?? "main"}`),
      controlDirection:direction,status:"pending",requests:[],setup:[],plannedOrder:[],broadcastSpreadsMs:[]};
    report.trials.push(t); save(); return t;
  };
  const request = (trial: Trial, ordinal: number, user: string, input: bigint): RequestResult => {
    const requestId = id(`${trial.scopeId}/${ordinal}`), r: RequestResult = {requestId,ordinal,user,input:String(input),status:"pending",stages:[],
      transaction:{id:requestId,method:"unprepared",user,status:"prepared",transactionNonce:-1,preparedTransactionHash:"",broadcastState:"prepared",stages:[]}};
    trial.requests.push(r); return r;
  };

  // Keep the complete confirmed range and verify event identities before replay.
  const windowReplay = async (raw: Trial, c: StudyCase, ctx: Context, trace: TimingTrace) => {
    const t={...raw,requests:raw.requests.map(r=>({...r,transaction:effectiveReceipt(r.transaction,report)}))};
    const logs = await readWindowLogs(rpc,{
      address:String(ctx.contract.target),
      fromBlock:hre.ethers.toQuantity(Math.min(...t.requests.map(r=>r.transaction.blockNumber!))),
      toBlock:hre.ethers.toQuantity(Math.max(...t.requests.map(r=>r.transaction.blockNumber!))),
      topics:[ctx.contract.interface.getEvent("Applied")!.topicHash,t.scopeId],
    },trace,budget);
    const sequences=new Map<string,number>();
    for(const log of logs){
      const parsed=ctx.contract.interface.parseLog(log)!;
      const requestId=String(parsed.args.requestId),r=t.requests.find(item=>item.requestId===requestId);
      if(!r || sequences.has(requestId) || log.blockHash!==r.transaction.blockHash ||
        log.transactionHash!==r.transaction.transactionHash || Number(BigInt(log.transactionIndex))!==r.transaction.transactionIndex)
        throw new Error("Duplicate or noncanonical Applied event");
      sequences.set(requestId,Number(parsed.args.sequence));
    }
    const inputs=t.requests.map(r=>({requestId:r.requestId,user:r.user,value:BigInt(r.input),
      blockNumber:r.transaction.blockNumber!,transactionIndex:r.transaction.transactionIndex!,sequence:sequences.get(r.requestId)}));
    if(sequences.size!==args.requests || inputs.some(x=>x.sequence===undefined))throw new Error("Missing Applied event; window cannot be audited");
    return {sequences,canonical:replay(inputs,c.mode!,c.width)};
  };

  // One compute transaction after every encrypted operand is known ready.
  const circuitTrial = async (c: StudyCase, ctx: Context, run: number, warmup: boolean, previous?: Trial) => {
    const t = newTrial(c,ctx.platform,run,warmup), trace = new TimingTrace();
    const values = valuesFor(args.seed,`circuit/${c.width}/${run}`,c.inputCount,c.width);
    t.inputValues = values.map(String);
    const output = request(t,0,addresses[0],values[0]), expected = expectedCircuit(c,values);
    output.expected = String(expected); output.stages = trace.stages;
    const prepStarted = performance.now();
    try {
      let loaded: {blockHash:string} | undefined;
      if(previous) {
        if(previous.scopeId!==t.scopeId || JSON.stringify(previous.inputValues)!==JSON.stringify(t.inputValues))
          throw new Error("Resumed input identity differs from original preparation");
        t.resumedPreparation={sourceTrialIndex:continuation!.report.trials.indexOf(previous),
          reusedInputTransactions:previous.setup.map(tx=>tx.transactionHash!),
          durationScope:"Remaining readiness verification and transaction preparation only; historical input preparation/loading is retained separately."};
        loaded={blockHash:effectiveReceipt(previous.setup.at(-1)!,report).blockHash!};
      } else {
        for (let offset=0; offset<values.length; offset+=inputBatchSize(c.width)) {
          const batch = values.slice(offset,offset+inputBatchSize(c.width));
          const encrypted = await deadline(() => ctx.reader.encrypt(batch,trace,budget),budget,"circuit input encryption");
          loaded = await transact(ctx,"loadCircuit",[t.scopeId,...encrypted],t.setup);
        }
      }
      const handles = Array.from(await read(ctx,"getCircuitInputs",loaded!.blockHash,[t.scopeId],trace) as any) as (string|bigint)[];
      const plaintexts = await deadline(() => ctx.reader.decrypt(handles,trace,budget),budget,"input readiness");
      if (plaintexts.length !== values.length) throw new Error("Missing circuit operands");
      plaintexts.forEach((v,i) => validatePlaintext(v,values[i]));
      const kind = {sum_linear:0,sum_tree:1,affine_chain:2}[c.circuit!];
      const params = [t.scopeId,output.requestId,kind,c.size], fees = await quote();
      let gasLimit: bigint;
      // Probe before reserving a nonce. A known capacity boundary consumes no
      // compute nonce and must not strand subsequent planned transactions.
      try {
        gasLimit=await estimateCircuitAtReceipt(ctx.contract,params,addresses[0],fees,loaded!.blockHash,rpc,trace,budget);
      } catch (error) {
        const limit = ctx.platform === "zama" ? capacityRejection(error) : undefined;
        if (!limit) throw error;
        output.status = "error"; output.error = safeError(error);
        output.transaction.method = "executeCircuit"; output.transaction.status = "error";
        output.transaction.error = output.error;
        t.preparationMs = performance.now()-prepStarted;
        t.status = "capacity_rejected"; t.rejection = {source:"estimateGas",limit,broadcast:false};
        save(); return;
      }
      const prepared = await prepareCall(ctx.contract,signers[0],"executeCircuit",[...params,{gasLimit}],
        reserve(signers[0]),fees,chainId,budget,output.requestId);
      output.transaction = prepared.record; t.preparationMs = performance.now()-prepStarted; save();
      const started = performance.now(), receipt = await executePrepared(prepared,hre,budget,chainId,() => journal(prepared.record));
      const handle = await read(ctx,"getSnapshot",receipt.blockHash,[output.requestId],trace);
      if (ctx.platform !== "baseline") output.outputHandle = hre.ethers.toBeHex(handle,32);
      const [value] = await deadline(() => ctx.reader.decrypt([handle],trace,budget),budget,"circuit result decryption");
      output.plaintext = validatePlaintext(value,expected);
      const validated = performance.now();
      output.postReceiptMs = validated-prepared.record.receiptObservedMonotonicMs!;
      output.transactionToValidatedMs = validated-(prepared.record.rpcSendMonotonicMs ?? started);
      output.status = "ok"; t.status = "ok"; save();
    } catch (error) {
      output.status = "error"; output.error = safeError(error);
      t.status = /Plaintext mismatch/.test(output.error) ? "inconsistent" : "incomplete"; t.error = output.error; save(); throw error;
    }
  };

  // Submit receipt-synchronized waves, then audit immutable snapshots in chain order.
  const concurrencyTrial = async (c: StudyCase, ctx: Context, run: number, warmup: boolean, direction?: "forward" | "reverse", previous?: Trial) => {
    const t = newTrial(c,ctx.platform,run,warmup,direction), count = args.requests;
    const mode = {independent:0,shared_sum:1,shared_ordered:2}[c.mode!];
    try {
      let opened: {blockHash:string};
      if(previous){
        if(previous.scopeId!==t.scopeId)throw new Error("Resumed window identity differs");
        opened={blockHash:previous.setup[0].blockHash!};
        t.resumedPreparation={sourceTrialIndex:continuation!.report.trials.indexOf(previous),reusedWindowTransactions:previous.setup.map(x=>x.transactionHash!),
          discardedPreparedHashes:previous.requests.map(r=>r.transaction.preparedTransactionHash).filter(Boolean),
          durationScope:"Fresh preparation of the entire never-submitted batch, reusing its confirmed zero-window setup. Earlier partial preparation is retained separately."};
      }else opened=await transact(ctx,"openWindow",[t.scopeId,mode,ctx.addresses.slice(0,c.users)],t.setup);
      const values = valuesFor(args.seed,`${warmup ? "control" : "concurrency"}/${c.width}/${run}`,count,c.width);
      if (direction) {
        const affine = (xs: bigint[]) => xs.reduce((state,x) => BigInt.asUintN(c.width,3n*state+x),0n);
        if (affine(values) === affine([...values].reverse())) values[0] = BigInt.asUintN(c.width,values[0]+1n);
      }
      if(previous)for(const old of previous.requests)if(old.input!==String(values[old.ordinal]) ||
        old.user!==ctx.addresses[old.ordinal%c.users] || old.requestId!==id(`${t.scopeId}/${old.ordinal}`))
        throw new Error("Resumed batch inputs or request identities changed");
      const ordinals = Array.from({length:count},(_,i) => i);
      const order = direction === "forward" ? ordinals : direction === "reverse" ? [...ordinals].reverse() : ordered(ordinals,`${args.seed}/${c.id}/${run}`);
      const fees = await quote(), prepared: {item:Prepared; result:RequestResult}[] = [];
      const preparation = performance.now();
      for (const ordinal of order) {
        const userIndex = ordinal%c.users, signer = ctx.users[userIndex], r = request(t,ordinal,ctx.addresses[userIndex],values[ordinal]);
        const trace = new TimingTrace(); r.stages = trace.stages;
        const encrypted = await deadline(() => ctx.writers[userIndex].encrypt([values[ordinal]],trace,budget),budget,"window input encryption");
        if(encrypted[0].length!==1)throw new Error("Expected exactly one encrypted reading per concurrent request");
        const params=[t.scopeId,r.requestId,...encrypted];
        const gasLimit=await estimateStudyCallAtBlock(ctx.contract,"submit",params,r.user,fees,opened.blockHash,rpc,trace,budget);
        const item = await prepareCall(ctx.contract,signer,"submit",[...params,{gasLimit}],reserve(signer),fees,chainId,budget,r.requestId);
        r.transaction = item.record; prepared.push({item,result:r}); save();
      }
      t.preparationMs = performance.now()-preparation;
      // One request per user per wave, respecting each sender's reserved nonce.
      const queues = ctx.addresses.slice(0,c.users).map(address => prepared.filter(p => p.result.user === address));
      t.plannedOrder = Array.from({length:count/c.users},(_,wave) => queues.map(queue => queue[wave].result.requestId)).flat();
      save(); const started = performance.now();
      for (let wave=0; wave<count/c.users; wave++) {
        const batch = queues.map(queue => queue[wave]);
        const settled = await Promise.allSettled(batch.map(p => executePrepared(p.item,hre,budget,chainId,() => journal(p.item.record))));
        const starts = batch.map(p => p.result.transaction.rpcSendMonotonicMs!);
        if (starts.every(Number.isFinite)) t.broadcastSpreadsMs.push(Math.max(...starts)-Math.min(...starts));
        save();
        if (settled.some(s => s.status === "rejected")) throw new Error("Released wave drained; at least one receipt failed or is uncertain");
      }
      t.receiptWindowMs = performance.now()-started; t.receiptTransactionsPerSecond = count/(t.receiptWindowMs/1000);
      const logTrace=new TimingTrace();t.logReadStages=logTrace.stages;
      const {sequences,canonical}=await windowReplay(t,c,ctx,logTrace);
      t.canonicalOrder = canonical.canonical.map(x => x.requestId); t.expectedFinal = Object.fromEntries(Object.entries(canonical.state).map(([k,v]) => [k,String(v)]));
      t.orderChanged = JSON.stringify(t.canonicalOrder) !== JSON.stringify(t.plannedOrder);
      const intended = replay(t.plannedOrder.map((requestId,index) => {
        const r = t.requests.find(item => item.requestId === requestId)!;
        return {requestId,user:r.user,value:BigInt(r.input),blockNumber:0,transactionIndex:index};
      }),c.mode!,c.width);
      const normalized = (state: Record<string,bigint>) => JSON.stringify(Object.entries(state).map(([k,v]) => [k,String(v)]).sort());
      t.finalMatchesPlannedOrder = normalized(canonical.state) === normalized(intended.state);
      let mismatches = false, unavailable = false;
      for (const r of t.requests) {
        const trace = new TimingTrace(), auditStart = performance.now();
        r.expected = String(canonical.snapshots[r.requestId]); r.sequence = sequences.get(r.requestId);
        try {
          const handle = await read(ctx,"getSnapshot",r.transaction.blockHash!,[r.requestId],trace);
          if (ctx.platform !== "baseline") r.outputHandle = hre.ethers.toBeHex(handle,32);
          const [value] = await deadline(() => ctx.reader.decrypt([handle],trace,budget),budget,"snapshot audit");
          r.plaintext = validatePlaintext(value,BigInt(r.expected)); r.status = "ok";
        } catch (error) { r.status = "error"; r.error = safeError(error); if (/Plaintext mismatch/.test(r.error)) mismatches = true; else unavailable = true; }
        r.auditCallMs = performance.now()-auditStart; r.stages.push(...trace.stages); save();
      }
      const last = canonical.canonical.at(-1)!, finalHash = t.requests.find(r => r.requestId === last.requestId)!.transaction.blockHash!;
      t.finalPlaintexts = {};
      for (const [key,expected] of Object.entries(canonical.state)) {
        const trace = new TimingTrace(), user = key === "shared" ? addresses[0] : key;
        const handle = await read(ctx,"getWindowState",finalHash,[t.scopeId,user],trace);
        const [value] = await deadline(() => ctx.reader.decrypt([handle],trace,budget),budget,"final state audit");
        try { t.finalPlaintexts[key] = validatePlaintext(value,expected); }
        catch { mismatches = true; t.finalPlaintexts[key] = String(value); }
      }
      t.fullWindowMs = performance.now()-started;
      t.status = mismatches ? "inconsistent" : unavailable ? "incomplete" : "ok"; save();
      if (t.status !== "ok") throw new Error(`Window ${t.status}: inspect persisted requests and canonical replay`);
    } catch (error) {
      if (t.status === "pending") t.status = "incomplete";
      t.error = safeError(error); save(); throw error;
    }
  };

  const release = mock ? () => {} : acquireAccountLock(args.accountsFile);
  try {
    await hre.run("compile");
    if (plan.platforms.includes("zama")) await deadline(()=>hre.fhevm.initializeCLIApi(),budget,"FHEVM provider initialization");
    for (const signer of signers) {
      const address = await signer.getAddress();
      const nonce = await readSettledNonce(rpc,address);
      if (await hre.ethers.provider.getBalance(address) <= 0n) throw new Error("Saved study signer needs balance; no funding performed");
      cursors.set(address,createNonceAllocator(nonce));
      if(!continuation)(report.initialNonces??={})[address]=nonce;
    }
    save();
    if(continuation) {
      const confirmed=validateStudyContinuation(continuation.report);
      const expectedNonce=(address:string)=>{
        const txs=confirmed.filter(t=>t.user.toLowerCase()===address.toLowerCase());
        return txs.length?Math.max(...txs.map(t=>t.transactionNonce))+1:continuation.report.initialNonces?.[address]??0;
      };
      for(const address of addresses) {
        if(await readSettledNonce(rpc,address)!==expectedNonce(address)) throw new Error("Continuation nonce mismatch; no new sends");
      }
      const blockCache=new Map<number,string>();
      const targets=new Map<string,string|null>();
      for(const setup of report.setups){
        const deployment=report.setups.find(s=>s.platform===setup.platform&&s.width===setup.width&&s.kind==="deployment");
        targets.set(setup.transaction.transactionHash!,setup.kind==="deployment"?null:deployment!.address!);
      }
      for(const trial of report.trials){
        const width=plan.cases.find(c=>c.id===trial.caseId)!.width;
        const deployment=report.setups.find(s=>s.platform===trial.platform&&s.width===width&&s.kind==="deployment");
        for(const tx of [...trial.setup,...trial.requests.map(r=>r.transaction)])targets.set(tx.transactionHash!,deployment!.address!);
      }
      for(const tx of confirmed) {
        if(!targets.has(tx.transactionHash!))throw new Error("Missing original transaction target");
        const recovered=await verifyCanonicalReceipt(effectiveReceipt(tx,report),targets.get(tx.transactionHash!)!,chainId,rpc,budget,blockCache);
        if(recovered){(report.canonicalReceipts??=[]).push(recovered);save();}
      }
      for(const platform of plan.platforms) for(const width of [...new Set(plan.cases.map(c=>c.width))]) {
        const entry=report.setups.find(s=>s.platform===platform&&s.width===width&&s.kind==="deployment");
        if(!entry)continue;
        if(!entry.address || !entry.bytecodeHash || !report.setups.some(s=>s.platform===platform&&s.width===width&&s.kind==="authorization"&&s.transaction.status==="confirmed"))
          throw new Error("Missing original deployment/authorization evidence");
        const code=await deadline(()=>rpc("eth_getCode",[entry.address,"latest"]),budget,"continuation bytecode");
        if(hre.ethers.keccak256(code)!==entry.bytecodeHash) throw new Error("Continuation contract bytecode mismatch");
        const contract=await hre.ethers.getContractAt(`Study${{baseline:"Plain",zama:"Zama",fhenix:"CoFHE"}[platform]}${width}`,entry.address,signers[0]);
        const ctx: Context={platform,width,contract,users:signers.slice(1),addresses:addresses.slice(1),writers:[],reader:await deadline(()=>
          makeStudyAdapter(platform,width,hre,signers[0],entry.address!,new TimingTrace(),mock),budget,"continuation SDK setup")};
        for(const signer of ctx.users)ctx.writers.push(await deadline(()=>makeStudyAdapter(platform,width,hre,signer,entry.address!,new TimingTrace(),mock),budget,"continuation writer SDK setup"));
        contexts.set(`${platform}/${width}`,ctx);
        const last=continuation.report.trials.filter(t=>t.platform===platform&&t.status==="ok"&&
          plan.cases.find(c=>c.id===t.caseId)?.width===width).at(-1)!;
        if(last){
          for(const result of last.requests){
            const trace=new TimingTrace(),handle=await read(ctx,"getSnapshot",effectiveReceipt(result.transaction,report).blockHash!,[result.requestId],trace);
            const [value]=await deadline(()=>ctx.reader.decrypt([handle],trace,budget),budget,"historical snapshot verification");
            validatePlaintext(value,BigInt(result.expected!));
          }
          if(args.suite==="concurrency")for(const [key,expected] of Object.entries(last.expectedFinal!)){
            const final=last.requests.map(r=>effectiveReceipt(r.transaction,report)).sort((a,b)=>a.blockNumber!-b.blockNumber!||a.transactionIndex!-b.transactionIndex!).at(-1)!;
            const trace=new TimingTrace(),handle=await read(ctx,"getWindowState",final.blockHash!,[last.scopeId,key==="shared"?addresses[0]:key],trace);
            const [value]=await deadline(()=>ctx.reader.decrypt([handle],trace,budget),budget,"historical window final state");
            validatePlaintext(value,BigInt(expected));
          }
        }
      }
      const resolvedKeys=new Set(latestAttempts(report).filter(t=>["ok","capacity_rejected"].includes(t.status)).map(trialKey));
      for(const old of continuation.report.trials.filter(t=>t.status==="incomplete"&&!resolvedKeys.has(trialKey(t)))) {
        const c=plan.cases.find(c=>c.id===old.caseId)!,ctx=contexts.get(`${old.platform}/${c.width}`)!;
        if(c.suite==="concurrency"){
          const open=await deadline(()=>rpc("eth_getTransactionByHash",[old.setup[0].transactionHash]),budget,"window setup transaction");
          const decoded=ctx.contract.interface.parseTransaction({data:open.input})!;
          const mode={independent:0,shared_sum:1,shared_ordered:2}[c.mode!];
          if(decoded.name!=="openWindow" || decoded.args[0]!==old.scopeId || Number(decoded.args[1])!==mode ||
            JSON.stringify(Array.from(decoded.args[2] as string[]).map(s=>s.toLowerCase()))!==JSON.stringify(ctx.addresses.slice(0,c.users).map(s=>s.toLowerCase())))
            throw new Error("Saved window setup differs from planned participants/mode");
          if(old.requests.length===args.requests && old.requests.every(r=>r.transaction.status==="confirmed"&&r.transaction.receiptStatus===1)){
            // A completed send batch is audited only. Historical samples remain
            // byte-for-byte intact; these late reads cannot restore their latency.
            const trace=new TimingTrace();
            const audit:NonNullable<StudyReport["recoveredAudits"]>[number]={
              sourceTrialIndex:continuation.report.trials.indexOf(old),key:trialKey(old),scopeId:old.scopeId,
              warmup:old.warmup,status:"pending",startedAt:new Date().toISOString(),historicalError:old.error,
              snapshots:[],stages:trace.stages,
              timingUse:"Late read-only correctness verification; excluded from primary and already-ready timing statistics.",
            };
            (report.recoveredAudits??=[]).push(audit);save();
            try{
              const {canonical}=await windowReplay(old,c,ctx,trace);
              audit.canonicalOrder=canonical.canonical.map(r=>r.requestId);
              audit.expectedFinal=Object.fromEntries(Object.entries(canonical.state).map(([k,v])=>[k,String(v)]));
              for(const r of old.requests){
                const started=performance.now(),expected=canonical.snapshots[r.requestId];
                const handle=await read(ctx,"getSnapshot",effectiveReceipt(r.transaction,report).blockHash!,[r.requestId],trace);
                const [value]=await deadline(()=>ctx.reader.decrypt([handle],trace,budget),budget,"late warmup snapshot audit");
                audit.snapshots.push({requestId:r.requestId,expected:String(expected),plaintext:validatePlaintext(value,expected),lateAuditCallMs:performance.now()-started});save();
              }
              const last=canonical.canonical.at(-1)!;
              const finalHash=effectiveReceipt(old.requests.find(r=>r.requestId===last.requestId)!.transaction,report).blockHash!;
              audit.finalPlaintexts={};
              for(const [key,expected] of Object.entries(canonical.state)){
                const handle=await read(ctx,"getWindowState",finalHash,[old.scopeId,key==="shared"?addresses[0]:key],trace);
                const [value]=await deadline(()=>ctx.reader.decrypt([handle],trace,budget),budget,"late warmup final audit");
                audit.finalPlaintexts[key]=validatePlaintext(value,expected);
              }
              audit.status="ok";audit.completedAt=new Date().toISOString();save();
            }catch(error){audit.status="error";audit.error=safeError(error);audit.completedAt=new Date().toISOString();save();throw error;}
            continue;
          }
          for(const user of ctx.addresses.slice(0,c.users)){
            const trace=new TimingTrace(),handle=await read(ctx,"getWindowState",old.setup[0].blockHash!,[old.scopeId,user],trace);
            const [value]=await deadline(()=>ctx.reader.decrypt([handle],trace,budget),budget,"zero window verification");validatePlaintext(value,0n);
          }
          for(let ordinal=0;ordinal<args.requests;ordinal++){
            let unused=false;
            try{await deadline(()=>ctx.contract.getFunction("getSnapshot").staticCall(id(`${old.scopeId}/${ordinal}`)),budget,"unused window request");}
            catch(error){if(isUnusedSnapshot(error))unused=true;else throw error;}
            if(!unused)throw new Error("A window request already executed; replay forbidden");
          }
          continue;
        }
        const trace=new TimingTrace();
        const handles=Array.from(await read(ctx,"getCircuitInputs",effectiveReceipt(old.setup.at(-1)!,report).blockHash!,[old.scopeId],trace) as any) as (string|bigint)[];
        const values=await deadline(()=>ctx.reader.decrypt(handles,trace,budget),budget,"saved input verification");
        if(values.length!==old.inputValues!.length) throw new Error("Saved circuit operands are missing");
        values.forEach((v,i)=>validatePlaintext(v,BigInt(old.inputValues![i])));
        let unused=false;
        try { await deadline(()=>ctx.contract.getFunction("getSnapshot").staticCall(old.requests[0].requestId),budget,"unused request verification"); }
        catch(error) { if(isUnusedSnapshot(error)) unused=true;else throw error; }
        if(!unused) throw new Error("Interrupted request already has a snapshot; compute replay is forbidden");
      }
      const segment=report.continuations!.at(-1)!;
      for(const address of addresses) {
        if(await readSettledNonce(rpc,address)!==expectedNonce(address)) throw new Error("Continuation nonce changed during preflight");
      }
      segment.preflight={confirmedReceiptsVerified:confirmed.length,canonicalBlocksVerified:blockCache.size,
        canonicalReceiptRecoveries:report.canonicalReceipts?.length??0,
        exactNonces:true,expectedNextNonces:Object.fromEntries(addresses.map(a=>[a,expectedNonce(a)])),
        bytecodeAndLastPlatformSnapshotsVerified:true,savedInputsAndUnusedRequestsVerified:true};
      segment.status="running";save();
    }
    for (let run=0; run<=args.repetitions; run++) {
      const cases = ordered(plan.cases.map(c => c.id),`${args.seed}/case-order/${run}`);
      for (const caseId of cases) {
        const c = plan.cases.find(item => item.id === caseId)!;
        const base = ordered(plan.platforms,`${args.seed}/${caseId}/platforms`), offset=run%base.length;
        const platforms = [...base.slice(offset),...base.slice(0,offset)];
        for (const platform of platforms) {
          const directions:("forward"|"reverse"|undefined)[]=c.suite==="concurrency"&&run===0&&c.users===1?["forward","reverse"]:[undefined];
          for(const direction of directions){
            const historical=continuation?.report.trials.filter(t=>t.caseId===c.id&&t.platform===platform&&t.repetition===run&&t.warmup===(run===0)&&t.controlDirection===direction);
            if(latestAttempts(report).some(t=>t.caseId===c.id&&t.platform===platform&&t.repetition===run&&t.warmup===(run===0)&&t.controlDirection===direction&&["ok","capacity_rejected"].includes(t.status))) continue;
            const previous=historical?.at(-1),ctx=await context(platform,c.width);
            if(c.suite==="circuits")await circuitTrial(c,ctx,run,run===0,previous);
            else await concurrencyTrial(c,ctx,run,run===0,direction,previous);
            console.log(`${c.id} ${platform} ${run===0?"warmup/control":`run ${run}`}: ${report.trials.at(-1)?.status}`);
          }
        }
      }
    }
    report.executionComplete = true;
    report.complete = report.trials.every(t => t.status === "ok");
    if(continuation){report.continuations!.at(-1)!.status="finished";report.continuations!.at(-1)!.finishedAt=new Date().toISOString();}
    report.finishedAt = new Date().toISOString(); save(); return report;
  } catch (error) {
    if(continuation){const segment=report.continuations!.at(-1)!;segment.status="failed";segment.error=safeError(error);segment.finishedAt=new Date().toISOString();}
    report.error = safeError(error); report.finishedAt = new Date().toISOString(); save(); throw error;
  } finally {
    const transactions = [...report.setups.map(s => s.transaction),
      ...report.trials.flatMap(t => [...t.setup,...t.requests.map(r => r.transaction)])];
    const uncertain = transactions.some(t => ["started","uncertain","acknowledged"].includes(t.broadcastState) && t.receiptStatus === undefined);
    if (!mock && uncertain) {
      // A lost acknowledgement or receipt is not permission to replay a send.
      report.methodology.accountLockRetained = "Unsettled broadcast: reconcile canonical receipts and nonces before any further campaign.";
      save();
    } else release();
  }
}
