// Execute the reviewed reduced pilot manifest once. Never replay an existing run.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function loadStages(manifest, folder) {
  if (manifest.chainId !== 11155111 || manifest.status !== 'funded_ready_for_pilots' ||
      manifest.funding?.status !== 'finished') throw new Error('A funded, unstarted Sepolia pilot manifest is required');
  if (manifest.stages.length !== 4) throw new Error('Exactly four reviewed pilot stages required');
  const expected = ['circuits/16','concurrency/16','circuits/128','concurrency/128'];
  let reachedUnfinished=false;
  return manifest.stages.map((stage,index) => {
    if (`${stage.suite}/${stage.width}` !== expected[index])
      throw new Error('Pilot stage order or status differs from the reviewed plan');
    if(stage.status==='finished'){
      if(reachedUnfinished || !stage.report || createHash('sha256').update(fs.readFileSync(stage.report)).digest('hex')!==stage.rawSha256 ||
        !JSON.parse(fs.readFileSync(stage.report,'utf8')).executionComplete)throw new Error('Completed pilot evidence mismatch');
      return {stage,args:null};
    }
    reachedUnfinished=true;
    if(stage.status!=='planned')throw new Error('Pilot stage order or status differs from the reviewed plan');
    const planName = stage.planFile || `${stage.suite}-euint${stage.width}-plan.json`;
    if(path.basename(planName)!==planName) throw new Error('Pilot plan file must stay inside its manifest folder');
    const plan = JSON.parse(fs.readFileSync(path.join(folder,planName),'utf8'));
    const args = plan.args;
    if (args.suite !== stage.suite || args.widths !== String(stage.width) || args.platform !== 'all' ||
        args.repetitions !== 3 || args.requests !== 8 || args.users !== '1,2' ||
        args.sizes !== '2,4,8' || args.depths !== '1,2,4' || args.live !== false ||
        args.accountsFile !== manifest.accountsFile || path.resolve(args.outputDir) !== path.resolve(stage.outputDir) ||
        path.dirname(path.resolve(args.outputDir)) !== path.resolve(folder)) throw new Error('Pilot arguments differ from the reviewed reduced matrix');
    if (fs.existsSync(args.outputDir)) throw new Error('Pilot output already exists; automatic replay is forbidden');
    if(stage.continuationFrom){
      const source=path.resolve(stage.continuationFrom);
      if(!source.startsWith(path.resolve(folder)+path.sep))
        throw new Error('Only reviewed interrupted preparations within this pilot family may continue');
      if(createHash('sha256').update(fs.readFileSync(source)).digest('hex')!==stage.sourceReportSha256)
        throw new Error('Continuation source SHA256 mismatch');
      const original=JSON.parse(fs.readFileSync(source,'utf8'));
      for(const key of ['suite','platform','widths','users','modes','sizes','depths','repetitions','requests','timeout','seed'])
        if(original.config[key]!==args[key]) throw new Error('Continuation workload differs from reviewed pilot arguments');
    }
    return {stage,args};
  });
}

function fingerprint() {
  const files = [__filename,'hardhat.config.ts','package-lock.json','tasks/benchmarkExperiments.ts',
    'tasks/experiments/accounts.ts','tasks/lifecycle/broadcast.ts','tasks/lifecycle/errors.ts',
    'tasks/lib/lifecycleTiming.ts','tasks/lib/lifecycleReadRetry.ts','tasks/lib/lifecycleNonce.ts',
    'tasks/lib/lifecycleResult.ts','tasks/lib/lifecycleReportWrite.ts','tasks/lib/cofheReadPolicy.ts',
    'tasks/lib/decryptionPolling.cjs',
    ...fs.readdirSync('tasks/studies').map(f=>`tasks/studies/${f}`),
    ...fs.readdirSync('contracts/studies').map(f=>`contracts/studies/${f}`)];
  return {files:Object.fromEntries(files.map(f=>[path.relative(process.cwd(),f).replaceAll('\\','/'),
    createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
    polling:require('../tasks/lib/decryptionPolling.cjs').pollingProvenance()};
}

async function main(manifestFile) {
  process.env.SEPOLIA_MNEMONIC = '';
  process.env.HARDHAT_NETWORK = 'sepolia';
  require('ts-node/register/transpile-only');
  const hre = require('hardhat');
  const { deadline } = require('../tasks/lib/lifecycleTiming');
  const { safeError } = require('../tasks/lifecycle/errors');
  const { writeLifecycleJson } = require('../tasks/lib/lifecycleReportWrite');
  const { loadAccounts } = require('../tasks/experiments/accounts');
  const { runStudy } = require('../tasks/studies/runner');
  const { continueStudy, latestAttempts } = require('../tasks/studies/continuation');
  const folder = path.dirname(path.resolve(manifestFile));
  const manifest = JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const stages = loadStages(manifest,folder);
  const lock = path.join(folder,'launcher.lock');
  fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:new Date().toISOString()}),{flag:'wx'});
  const active = path.resolve('logs/study-active-campaign.json');
  const save = () => {
    writeLifecycleJson(manifestFile,manifest);
    writeLifecycleJson(active,{pid:process.pid,status:manifest.status,startedAt:manifest.startedAt,
      manifest:path.resolve(manifestFile),currentStage:manifest.currentStage,
      report:manifest.currentReport,finishedAt:manifest.finishedAt,error:manifest.error});
  };
  const snapshot = fingerprint();
  try {
    manifest.status = 'preflight'; manifest.startedAt = new Date().toISOString();
    manifest.pid = process.pid; manifest.sourceSnapshot = snapshot; save();
    if ((await deadline(()=>hre.ethers.provider.getNetwork(),20000,'pilot chain identity')).chainId !== 11155111n)
      throw new Error('Sepolia identity mismatch');
    const funding = JSON.parse(fs.readFileSync(manifest.funding.report,'utf8'));
    if (funding.status !== 'finished' || funding.totalTransferredEth !== '0.003') throw new Error('Funding is not settled');
    const accounts = loadAccounts(manifest.accountsFile,hre.ethers.provider).slice(0,3);
    for (let i=0;i<3;i++) {
      if (accounts[i].address !== funding.transfers[i].to) throw new Error('Funded account identity mismatch');
      const receipt = await deadline(()=>hre.ethers.provider.send('eth_getTransactionReceipt',
        [funding.transfers[i].transaction.transactionHash]),20000,'funding receipt');
      if (!receipt || receipt.status !== '0x1' || receipt.blockHash !== funding.transfers[i].transaction.blockHash)
        throw new Error('Funding receipt changed');
      const block = await deadline(()=>hre.ethers.provider.send('eth_getBlockByNumber',[receipt.blockNumber,false]),20000,'canonical funding block');
      if (block.hash !== receipt.blockHash) throw new Error('Funding receipt is not canonical');
      if (await deadline(()=>hre.ethers.provider.getBalance(accounts[i].address),20000,'funded balance') <= 0n)
        throw new Error('Pilot account balance is zero');
    }
    for (const {stage,args} of stages) {
      if(stage.status==='finished')continue;
      if (JSON.stringify(fingerprint()) !== JSON.stringify(snapshot)) throw new Error('Source or SDK changed during the pilot sequence');
      manifest.status = 'running'; manifest.currentStage = `${stage.suite}/euint${stage.width}`;
      manifest.currentReport = path.resolve(args.outputDir,'report.json');
      stage.status = 'running'; stage.startedAt = new Date().toISOString(); save();
      console.log(`Starting ${manifest.currentStage}: reviewed 3-repetition pilot`);
      const report = stage.continuationFrom ? await continueStudy(stage.continuationFrom,args.outputDir,hre,args.accountsFile) :
        await runStudy({...args,live:true},hre);
      const latest = latestAttempts(report);
      const requestsPerTrial=args.suite==='concurrency'?args.requests:1;
      if(latest.length!==(stage.measuredTransactions+stage.warmupTransactions)/requestsPerTrial)
        throw new Error('Pilot planned-slot coverage mismatch');
      if (!report.executionComplete || latest.some(t=>!['ok','capacity_rejected'].includes(t.status)))
        throw new Error('Pilot did not complete its planned attempts');
      stage.status = 'finished'; stage.finishedAt = new Date().toISOString();
      stage.allValid = report.complete; stage.report = manifest.currentReport;
      stage.rawSha256 = createHash('sha256').update(fs.readFileSync(stage.report)).digest('hex');
      stage.counts = {measuredTrials:report.trials.filter(t=>!t.warmup).length,
        validatedRequests:report.trials.filter(t=>!t.warmup).flatMap(t=>t.requests).filter(r=>r.status==='ok').length,
        capacityRejections:report.trials.filter(t=>!t.warmup&&t.status==='capacity_rejected').length,
        retainedPreparationFailures:report.trials.filter(t=>t.status==='incomplete'&&t.requests.every(r=>r.transaction.broadcastState==='prepared')).length,
        retainedAuditFailures:report.trials.filter(t=>t.status==='incomplete'&&t.requests.length&&t.requests.every(r=>r.transaction.status==='confirmed')).length,
        regularWarmupValidated:report.trials.filter(t=>t.warmup).flatMap(t=>t.requests).filter(r=>r.status==='ok').length,
        lateWarmupValidated:(report.recoveredAudits??[]).filter(a=>a.warmup&&a.status==='ok').reduce((n,a)=>n+a.snapshots.length,0),
        lateMeasuredValidated:(report.recoveredAudits??[]).filter(a=>!a.warmup&&a.status==='ok').reduce((n,a)=>n+a.snapshots.length,0),
        canonicalReinclusions:report.canonicalReceipts?.length??0};
      save(); console.log(`Finished ${manifest.currentStage}: ${JSON.stringify(stage.counts)}`);
    }
    manifest.status = stages.every(s=>s.stage.allValid) ? 'finished' :
      stages.some(s=>s.stage.counts.retainedPreparationFailures||s.stage.counts.retainedAuditFailures) ? 'execution_complete_with_retained_failures' : 'execution_complete_with_capacity_rejections';
    manifest.finishedAt = new Date().toISOString(); save();
  } catch (error) {
    manifest.status = 'failed'; manifest.error = safeError(error); manifest.finishedAt = new Date().toISOString();
    const current = manifest.stages.find(s=>s.status==='running');
    if (current) {current.status='failed';current.error=manifest.error;}
    save(); throw new Error(manifest.error);
  } finally {
    fs.unlinkSync(lock);
  }
}

module.exports = { loadStages };
if (require.main === module) main(process.argv[2] || 'logs/study-pilots-2026-11-06/campaign.json').catch(error=>{
  // All errors after provider creation are sanitized inside main.
  console.error(error.message); process.exitCode=1;
});
