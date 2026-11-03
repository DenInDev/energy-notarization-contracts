// One source-informed final addition attempt, preserving all earlier failures.
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process'),path=require('node:path'),readline=require('node:readline');
const {loadAccount}=require('./account.cjs');const a=loadAccount();
const base='logs/octra-lifecycle-once-2026-11-02';const out=base+'-add-final';fs.mkdirSync(out,{recursive:true});
const prior=JSON.parse(fs.readFileSync(base+'-continuation1/report.json'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
if(a.network!=='devnet'||a.rpc!=='https://devnet.octrascan.io/rpc'||prior.address!==a.address)throw new Error('Unexpected devnet identity');
if(fs.existsSync(out+'/report.json'))throw new Error('Final attempt already exists; reconcile it without replaying');
const r={status:'preflight',startedAt:new Date().toISOString(),endpoint:a.rpc,address:a.address,contract:prior.contractAddress,
  operation:'add',attempt:3,declaredOU:'2570000',priorReportSha256:sha(fs.readFileSync(base+'-continuation1/report.json')),
  rationale:'Scalar receipt effort 2542977; addition has another operand and larger output. One bounded 2570000-OU trial; prior rejections retained.',rpcEvents:[]};
function save(){const text=JSON.stringify(r,null,2)+'\n';fs.appendFileSync(out+'/snapshots.jsonl',JSON.stringify(r)+'\n');
  for(let n=0;;n++){try{fs.writeFileSync(out+'/report.json',text);return;}catch(e){if(n>=4||!['EPERM','EACCES','EBUSY'].includes(e.code))throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100*(n+1));}}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function rpc(method,params=[],retry=0){const start=performance.now();let response,body;
  try{response=await fetch(a.rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(25000)});body=await response.json();}
  catch(e){r.rpcEvents.push({method,durationMs:performance.now()-start,error:e.name});save();throw new Error(method+': '+e.name);}
  const event={method,httpStatus:response.status,durationMs:performance.now()-start,error:body.error||null};r.rpcEvents.push(event);save();
  if(method!=='octra_submit'&&retry<3&&(response.status===429||/busy|capacity/.test(body.error?.message||''))){await sleep(2000*2**retry);return rpc(method,params,retry+1);}
  if(!response.ok||body.error||!Object.hasOwn(body,'result'))throw new Error(method+': '+(body.error?.message||response.status));return body.result;}
class Worker{constructor(){this.pending=[];this.ready=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  const p=path.resolve('scripts/octra/lifecycle-crypto-worker.py').replaceAll('\\','/');this.child=cp.spawn('wsl',['-d','Ubuntu-22.04','--','python3','-u','/mnt/'+p[0].toLowerCase()+p.slice(2)],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  this.child.stderr.on('data',()=>{});readline.createInterface({input:this.child.stdout}).on('line',line=>{let v;try{v=JSON.parse(line);}catch{return;}if(v.ready){this.resolve(v);return;}const q=this.pending.shift();if(q){clearTimeout(q.timer);v.ok?q.resolve(v.result):q.reject(new Error('Crypto '+v.error));}});
  this.child.on('error',()=>this.reject(new Error('Worker launch failed')));this.child.on('close',code=>{this.reject(new Error('Worker exit '+code));this.pending.forEach(q=>{clearTimeout(q.timer);q.reject(new Error('Worker exited'));});});}
  async decrypt(ciphertext){await this.ready;return new Promise((resolve,reject)=>{this.pending.push({resolve,reject,timer:setTimeout(()=>reject(new Error('Worker timeout')),60000)});this.child.stdin.write(JSON.stringify({op:'decrypt',ciphertext})+'\n');});}
  close(){this.child.stdin.end(JSON.stringify({op:'close'})+'\n');}}
async function main(worker){save();const ready=await worker.ready;r.keySetupMs=ready.keySetupMs;if(ready.address!==a.address)throw new Error('Worker identity mismatch');
  for(const [getter,expected] of [['get_last','43'],['get_total','42']]){const view=await rpc('contract_call',[r.contract,getter,[],a.address]);const d=await worker.decrypt(view.result);if(d.plaintext!==expected)throw new Error('State changed; no submission');}
  const b=await rpc('octra_balance',[a.address]);r.balanceBefore=b;save();if(b.nonce!==b.pending_nonce||b.nonce!==9||BigInt(b.balance_raw)<2570000n)throw new Error('Nonce or balance preflight failed');
  const tx={from:a.address,to_:r.contract,amount:'0',nonce:b.nonce+1,ou:r.declaredOU,timestamp:Math.floor(Date.now()/1000)-0.5,op_type:'call',encrypted_data:'add',message:'[]'};
  const startSign=performance.now();tx.signature=crypto.sign(null,Buffer.from(JSON.stringify(tx)),a.privateKey).toString('base64');tx.public_key=a.publicKeyBase64;r.signingMs=performance.now()-startSign;
  r.hash=sha(JSON.stringify({from:tx.from,to_:tx.to_,amount:tx.amount,nonce:tx.nonce,ou:tx.ou,timestamp:tx.timestamp,signature:tx.signature,op_type:tx.op_type,public_key:tx.public_key,message:tx.message,encrypted_data:tx.encrypted_data}));r.nonce=tx.nonce;r.status='broadcast_started';r.transactionStartedAt=new Date().toISOString();save();
  const started=performance.now();r.submission=await rpc('octra_submit',[tx]);if(r.submission.tx_hash!==r.hash)throw new Error('Hash mismatch');r.broadcastAckMs=performance.now()-started;r.status='acknowledged';save();console.log('Submitted final add',r.hash);
  const end=Date.now()+180000;
  while(Date.now()<end){r.state=await rpc('octra_transaction',[r.hash]);save();if(r.state.status==='confirmed'){r.receipt=await rpc('contract_receipt',[r.hash]);r.transactionToReceiptMs=performance.now()-started;r.receiptObservedAt=new Date().toISOString();save();if(!r.receipt.success)throw new Error('Receipt execution unsuccessful');break;}
    if(['rejected','dropped'].includes(r.state.status)){r.status=r.state.status;r.balanceAfter=await rpc('octra_balance',[a.address]);save();console.log(JSON.stringify({status:r.status,error:r.state.error,balance:r.balanceAfter.balance}));return;}await sleep(500);}
  if(!r.receipt)throw new Error('Confirmation timeout; no automatic replay');
  const postStart=performance.now();const readStart=performance.now();const view=await rpc('contract_call',[r.contract,'get_total',[],a.address]);r.ciphertextRetrievalMs=performance.now()-readStart;
  const dec=await worker.decrypt(view.result);Object.assign(r,dec);r.correct=dec.plaintext==='85';r.postReceiptToValidatedPlaintextMs=performance.now()-postStart;r.transactionToValidatedPlaintextMs=performance.now()-started;r.plaintextValidatedAt=new Date().toISOString();
  fs.writeFileSync(out+'/result.json',JSON.stringify({ciphertext:view.result})+'\n');r.balanceAfter=await rpc('octra_balance',[a.address]);r.status=r.correct?'validated':'plaintext_mismatch';r.completedAt=new Date().toISOString();save();console.log(JSON.stringify({status:r.status,plaintext:r.plaintext,effort:r.receipt.effort,receiptMs:r.transactionToReceiptMs,validatedMs:r.transactionToValidatedPlaintextMs,balance:r.balanceAfter.balance}));}
const worker=new Worker();main(worker).catch(e=>{r.status='stopped';r.error=e.message;save();console.error(e.message);process.exitCode=1;}).finally(()=>worker.close());
