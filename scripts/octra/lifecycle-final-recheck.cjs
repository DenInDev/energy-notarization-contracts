// Read-only reconciliation and capability diagnostics. Never submits a transaction.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { loadAccount } = require('./account.cjs');
const a = loadAccount();
const base = 'logs/octra-lifecycle-once-2026-11-02';
const priorDir = base + '-continuation1';
const out = base + '-final-recheck';
fs.mkdirSync(out, { recursive: true });
const priorRaw = fs.readFileSync(priorDir + '/report.json');
const prior = JSON.parse(priorRaw);
const originalRaw = fs.readFileSync(base + '/report.json');
const fixtures = JSON.parse(fs.readFileSync(base + '/fixtures.json'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
if (a.network !== 'devnet' || a.rpc !== prior.endpoint || fixtures.address !== a.address)
  throw new Error('Unexpected dedicated devnet identity');
const report = { startedAt: new Date().toISOString(), status: 'running', endpoint: a.rpc,
  address: a.address, contract: prior.contractAddress, scope: 'read-only reconciliation and diagnostics',
  sourceReports: [ { path: base + '/report.json', sha256: sha(originalRaw) },
    { path: priorDir + '/report.json', sha256: sha(priorRaw) } ],
  transactionObservations: [], reads: [], diagnostics: [], rpcEvents: [], newTransactionsSubmitted: 0 };
function save() {
  // Avoid Windows atomic-rename contention; retain append-only recovery snapshots too.
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.appendFileSync(out + '/observations.jsonl', JSON.stringify({at:new Date().toISOString(),report}) + '\n');
  for (let n = 0; ; n++) {
    try { fs.writeFileSync(out + '/observations.json', text); return; }
    catch (error) {
      if (n >= 4 || !['EPERM','EACCES','EBUSY'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100*(n+1));
    }
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function rpc(method, params = [], retry = 0, timeout = 25000) {
  if (!['octra_balance','octra_transaction','contract_receipt','contract_call','contract_verify','vm_contract','octra_account','octra_search'].includes(method))
    throw new Error('Mutation RPC forbidden in final diagnostics');
  const start = performance.now();
  let response, body;
  try {
    response = await fetch(a.rpc, { method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal:AbortSignal.timeout(timeout) });
    body = await response.json();
  } catch (error) {
    report.rpcEvents.push({method,durationMs:performance.now()-start,error:error.cause?.code||error.name}); save();
    throw new Error(method+': '+(error.cause?.code||error.name));
  }
  const event = {method,attempt:retry+1,httpStatus:response.status,durationMs:performance.now()-start,error:body.error||null};
  report.rpcEvents.push(event); save();
  if (retry < 3 && (response.status === 429 || response.status === 503 || /busy|capacity|resources unavailable/i.test(body.error?.message||''))) {
    const hint=response.headers.get('retry-after');
    const ms=Math.max(hint && /^\d+$/.test(hint)?Number(hint)*1000:0,2000*2**retry);
    if(ms>30000)throw new Error('Retry hint beyond bounded diagnostics window');
    event.retryWaitMs=ms; save(); await sleep(ms); return rpc(method,params,retry+1,timeout);
  }
  if(!response.ok||body.error||!Object.hasOwn(body,'result'))throw new Error(method+': '+(body.error?.message||response.status));
  return body.result;
}
class Worker {
  constructor(){
    this.pending=[];
    this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
    const absolute=path.resolve('scripts/octra/lifecycle-crypto-worker.py').replaceAll('\\','/');
    const script='/mnt/'+absolute[0].toLowerCase()+absolute.slice(2);
    this.child=cp.spawn('wsl',['-d','Ubuntu-22.04','--','python3','-u',script],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    this.child.stderr.on('data',()=>{});
    readline.createInterface({input:this.child.stdout}).on('line',line=>{
      let v;try{v=JSON.parse(line);}catch{return;}
      if(v.ready){this.resolveReady(v);return;}
      const p=this.pending.shift();if(!p)return;clearTimeout(p.timer);
      v.ok?p.resolve(v.result):p.reject(new Error('Crypto worker '+v.error));
    });
    this.child.on('error',()=>this.rejectReady(new Error('Crypto worker launch failed')));
    this.child.on('close',code=>{this.rejectReady(new Error('Crypto worker exited '+code));
      this.pending.forEach(p=>{clearTimeout(p.timer);p.reject(new Error('Crypto worker exited'));});this.pending=[];});
  }
  async decrypt(ciphertext){await this.ready;return new Promise((resolve,reject)=>{
    const p={resolve,reject,timer:setTimeout(()=>reject(new Error('Crypto worker timeout')),60000)};
    this.pending.push(p);this.child.stdin.write(JSON.stringify({op:'decrypt',ciphertext})+'\n');
  });}
  close(){this.child.stdin.end(JSON.stringify({op:'close'})+'\n');}
}
async function probe(worker,name,contract,method,params,expected,mode='read_only_arithmetic'){
  const row={name,mode,contract,method,expectedPlaintext:String(expected),startedAt:new Date().toISOString()};
  report.diagnostics.push(row);save();
  const start=performance.now();
  try{
    const result=await rpc('contract_call',[contract,method,params,a.address],0,60000);
    row.rpcMs=performance.now()-start;
    if(typeof result.result!=='string'||!result.result)throw new Error('No result ciphertext');
    const value=await worker.decrypt(result.result);Object.assign(row,value);
    row.correct=value.plaintext===String(expected);row.totalToValidatedMs=performance.now()-start;
    row.ciphertextSha256=sha(Buffer.from(result.result,'base64'));
    row.status=row.correct?'validated':'semantic_mismatch';
    fs.writeFileSync(out+'/result-'+name+'.json',JSON.stringify({ciphertext:result.result})+'\n');
    save();console.log(JSON.stringify({name,status:row.status,plaintext:row.plaintext,rpcMs:row.rpcMs}));
    return result.result;
  }catch(error){row.status='failed';row.error=error.message;row.elapsedMs=performance.now()-start;save();
    console.log(JSON.stringify({name,status:row.status,error:row.error}));return null;}
}
async function main(worker){
  save();await worker.ready;
  report.balanceBefore=await rpc('octra_balance',[a.address]);save();
  try {
    const history=await rpc('octra_account',[a.address,20]);
    report.accountHistory=history;save();
  } catch(error){ report.accountHistoryError=error.message;save(); }

  for(const entry of prior.transactions){
    const observation={label:entry.label,hash:entry.hash,declaredOU:entry.feeOU,nonce:entry.nonce};
    report.transactionObservations.push(observation);save();
    try{
      const end=Date.now()+180000;
      do{
        observation.state=await rpc('octra_transaction',[entry.hash]);save();
        if(['confirmed','rejected','dropped'].includes(observation.state.status))break;
        await sleep(3000);
      }while(Date.now()<end);
      observation.status=observation.state.status;
      if(observation.status==='confirmed')observation.receipt=await rpc('contract_receipt',[entry.hash]);
    }catch(error){observation.error=error.message;observation.status='unresolved';}
    save();
    console.log(JSON.stringify({label:observation.label,status:observation.status,error:observation.state?.error||observation.error}));
  }
  await probe(worker,'persisted_last',prior.contractAddress,'get_last',[],43,'persisted_state_read');
  const total=await probe(worker,'persisted_total',prior.contractAddress,'get_total',[],42,'persisted_state_read');
  const scalar=report.transactionObservations.find(t=>t.label==='mul_scalar');
  if(scalar?.status==='confirmed'&&scalar.receipt?.success)
    await probe(worker,'late_scalar_result',prior.contractAddress,'get_result',[],129,'late_recovery_excluded_from_primary_latency');
  const oldViews=JSON.parse(fs.readFileSync('logs/octra-pilot/live-views.json')).contractAddress;
  const added=await probe(worker,'add_view',oldViews,'add',
    [fixtures.fixtures.reading.ciphertext,fixtures.fixtures.initial_total.ciphertext],85);
  await sleep(2000);
  await probe(worker,'mul_scalar_view',oldViews,'scale',[fixtures.fixtures.reading.ciphertext,3],129);
  await sleep(2000);
  if(added)await probe(worker,'mean_even_field_view',prior.contractAddress,'mean_probe',
    [fixtures.fixtures.reading.ciphertext,added],64,'read_only_even_sum_field_candidate');
  await sleep(2000);
  await probe(worker,'mean_odd_field_view',prior.contractAddress,'mean_probe',
    [fixtures.fixtures.odd_left.ciphertext,fixtures.fixtures.odd_right.ciphertext],29,'read_only_integer_semantics_counterexample');
  try{report.sourceVerification=await rpc('contract_verify',[prior.contractAddress,
    fs.readFileSync('contracts/octra/EnergyLifecycleOnce.aml','utf8')]);}
  catch(error){report.sourceVerificationError=error.message;}
  const uncertain = report.transactionObservations.find(t=>t.label==='mul_scalar'&&t.status==='unresolved');
  if(uncertain){
    const previous=prior.transactions.find(t=>t.label==='mul_scalar');
    const expiry=(previous.state?.expires_at||Date.now()/1000)*1000;
    const end=Math.min(Date.now()+240000,expiry+20000);
    uncertain.readOnlyRechecks=[];
    while(Date.now()<end){
      try {
        const state=await rpc('octra_transaction',[uncertain.hash]);
        uncertain.readOnlyRechecks.push({at:new Date().toISOString(),state});save();
        if(['confirmed','rejected','dropped'].includes(state.status)){
          uncertain.state=state;uncertain.status=state.status;
          if(state.status==='confirmed')uncertain.receipt=await rpc('contract_receipt',[uncertain.hash]);
          save();break;
        }
      }catch(error){uncertain.readOnlyRechecks.push({at:new Date().toISOString(),error:error.message});save();}
      await sleep(10000);
    }
    if(uncertain.status==='unresolved'){
      uncertain.expiryObservedInPriorStaging=previous.state?.expires_at;
      uncertain.noAutomaticReplay=true;
      try{uncertain.search=await rpc('octra_search',[uncertain.hash]);}catch(error){uncertain.searchError=error.message;}
      save();
    }
  }
  report.balanceAfter=await rpc('octra_balance',[a.address]);
  report.status=report.transactionObservations.some(t=>!['confirmed','rejected','dropped'].includes(t.status))
    ?'requires_transaction_reconciliation':'completed_with_retained_failures_and_capability_limits';
  report.completedAt=new Date().toISOString();save();
  console.log(JSON.stringify({status:report.status,balance:report.balanceAfter.balance,report:out+'/observations.json'}));
}
const worker=new Worker();
main(worker).catch(error=>{report.status='stopped';report.error=error.message;save();console.error(report.error);process.exitCode=1;})
 .finally(()=>worker.close());
