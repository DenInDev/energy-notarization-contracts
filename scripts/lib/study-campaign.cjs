// Shared launch/preflight/analysis orchestration. Timed study execution stays in runner.ts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { defaults, planSummary } = require('../../tasks/studies/plan');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runFile = promisify(execFile);

function validateFreshManifest(manifest, folder, policy) {
  const circuitsOnly = policy === 'circuits-fresh30';
  const twoWriters = policy === 'two-writer-fresh10';
  const reduced = policy === 'reduced', fresh = policy === 'fresh', resume = policy === 'compact-resume';
  const compactContinue = policy === 'compact-continue';
  const compactFresh = policy === 'compact-fresh', compact = policy === 'compact' || resume || compactFresh || compactContinue;
  if(!['full','reduced','fresh','compact','compact-resume','compact-fresh','compact-continue','circuits-fresh30','two-writer-fresh10'].includes(policy))throw Error('Unknown study launch policy');
  const suites = twoWriters ? ['concurrency'] : circuitsOnly ? ['circuits'] : (fresh || compact) ? ['concurrency','circuits'] : reduced ? ['concurrency'] : ['circuits', 'concurrency'];
  if (manifest.kind !== (twoWriters ? 'fresh-16bit-two-writer-session' : circuitsOnly ? 'fresh-16bit-circuits-30' : compact ? 'compact-16bit-selected-studies' : fresh ? 'fresh-16bit-concurrency-and-circuits' : reduced ? 'reduced-16bit-concurrency' : 'full-16bit-concurrency-and-circuits') ||
      manifest.chainId !== 11155111 || manifest.status !== 'funded_ready' || manifest.stages.length !== suites.length)
    throw Error('Reviewed, funded and unstarted study manifest required');
  for (const [i, stage] of manifest.stages.entries()) {
    if(resume && i===0){
      const prior=JSON.parse(fs.readFileSync(stage.report));
      if(stage.suite!=='concurrency' || stage.status!=='finished' || hash(stage.report)!==stage.rawSha256 ||
          !prior.executionComplete || prior.chainId!==11155111 || prior.mock || prior.config.widths!=='16' ||
          prior.config.users!=='1,4' || prior.config.modes!=='shared_sum,shared_ordered' || prior.config.repetitions!==10 ||
          require('../../tasks/studies/continuation').latestAttempts(prior).length!==138)
        throw Error('Finished concurrency evidence must remain unchanged');
      continue;
    }
    const expected = { ...defaults, suite: suites[i], widths: '16', seed: manifest.stages[0].args.seed,
      accountsFile: manifest.accountsFile, outputDir: stage.args.outputDir, live: false,
      ...((reduced || (fresh && suites[i]==='concurrency')) ? { users: '1,2,4', requests: 8, repetitions: 20 } : {}),
      ...(circuitsOnly ? {sizes:'2,8,32',depths:'1,8,16,32',repetitions:30} : {}),
      ...(twoWriters ? {users:'2',modes:'shared_sum,shared_ordered',requests:8,repetitions:10} : {}),
      ...(compact ? (suites[i]==='concurrency' ? {users:'1,4',modes:'shared_sum,shared_ordered',requests:8,repetitions:10}
        : {sizes:'2,8,32',depths:'1,8,16,32',repetitions:10}) : {}) };
    if(compact && !compactFresh && i===0){
      if(!stage.sourceReport || hash(stage.sourceReport)!==stage.sourceSha256)throw Error('Selected checkpoint SHA mismatch');
      const source=JSON.parse(fs.readFileSync(stage.sourceReport));
      if((!compactContinue&&!source.scopeRevision) || source.executionComplete || source.chainId!==11155111 || source.mock ||
          source.config.repetitions!==10 || source.config.users!=='1,4' || source.config.modes!=='shared_sum,shared_ordered' ||
          JSON.stringify(source.cases)!==JSON.stringify(planSummary(expected).cases) ||
          (source.scopeRevision&&hash(source.scopeRevision.originalReport)!==source.scopeRevision.originalSha256))throw Error('Invalid selected-scope checkpoint');
      if(compactContinue)require('../../tasks/studies/continuation').validateStudyContinuation(source);
    }else if(resume && i===1){
      if(!stage.sourceReport || hash(stage.sourceReport)!==stage.sourceSha256)throw Error('Circuit source SHA mismatch');
      const source=JSON.parse(fs.readFileSync(stage.sourceReport));
      if(source.executionComplete || source.config.suite!=='circuits' || source.mock || source.chainId!==11155111 ||
          source.config.widths!=='16' || source.config.sizes!=='2,8,32' || source.config.depths!=='1,8,16,32' ||
          source.config.repetitions!==10 || JSON.stringify(source.cases)!==JSON.stringify(planSummary(expected).cases))
        throw Error('Circuit continuation differs from the approved compact matrix');
    }else if(stage.sourceReport)throw Error('Unexpected source checkpoint for a fresh stage');
    if (stage.status !== 'planned' || Object.keys(stage.args).length !== Object.keys(expected).length ||
        Object.entries(expected).some(([k, value]) => k === 'accountsFile'
          ? path.resolve(stage.args[k]) !== path.resolve(value) : stage.args[k] !== value) ||
        JSON.stringify(stage.plan) !== JSON.stringify(planSummary(expected)) ||
        path.dirname(path.resolve(stage.args.outputDir)) !== path.resolve(folder) || fs.existsSync(stage.args.outputDir) ||
        path.resolve(stage.report) !== path.resolve(stage.args.outputDir, 'report.json'))
      throw Error('Stage differs from the authorized matrix or output already exists');
  }
}

function fingerprint(entry) {
  const files = [entry, __filename, 'hardhat.config.ts', 'package-lock.json', 'tasks/benchmarkExperiments.ts',
    'tasks/experiments/accounts.ts', 'tasks/lifecycle/broadcast.ts', 'tasks/lifecycle/errors.ts',
    ...fs.readdirSync('tasks/studies').filter(f => f.endsWith('.ts')).map(f => `tasks/studies/${f}`),
    ...fs.readdirSync('tasks/lib').filter(f => /lifecycle|cofheReadPolicy|decryptionPolling/.test(f)).map(f => `tasks/lib/${f}`),
    ...fs.readdirSync('contracts/studies').map(f => `contracts/studies/${f}`),
    'scripts/analysis/analyze-study-campaign.py', 'scripts/analysis/collect-operation-block-metadata.cjs'];
  return { files: Object.fromEntries(files.map(f => [path.relative(process.cwd(), f).replaceAll('\\', '/'), hash(f)])),
    polling: require('../../tasks/lib/decryptionPolling.cjs').pollingProvenance() };
}

async function analyzeCompletedCampaign(folder) {
  const python = path.resolve('.venv/Scripts/python.exe');
  const script = path.resolve('scripts/analysis/analyze-study-campaign.py');
  const preparation = await runFile(python, [script, folder, '--prepare-metadata'], { maxBuffer: 1024 * 1024 });
  fs.writeFileSync(path.join(folder, 'analysis-prepare.stdout.log'), preparation.stdout);
  const metadata = await runFile(process.execPath, ['scripts/analysis/collect-operation-block-metadata.cjs', path.join(folder, 'network/input-plan.json')],
    { maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(path.join(folder, 'metadata.stdout.log'), metadata.stdout);
  const analysis = await runFile(python, [script, folder], { maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(path.join(folder, 'analysis.stdout.log'), analysis.stdout);
}

async function runReviewedCampaign(manifestFile, policy, entry) {
  const hre = require('hardhat');
  const { runStudy } = require('../../tasks/studies/runner');
  const { continueStudy } = require('../../tasks/studies/continuation');
  const { latestAttempts } = require('../../tasks/studies/continuation');
  const { loadAccounts, acquireAccountLock } = require('../../tasks/experiments/accounts');
  const { deadline } = require('../../tasks/lib/lifecycleTiming');
  const { writeLifecycleJson } = require('../../tasks/lib/lifecycleReportWrite');
  const { safeError } = require('../../tasks/lifecycle/errors');
  const file = path.resolve(manifestFile), folder = path.dirname(file), manifest = JSON.parse(fs.readFileSync(file));
  validateFreshManifest(manifest, folder, policy);
  const lock = path.join(folder, 'launcher.lock');
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { flag: 'wx' });
  let parentLease, releaseParent, restoreRpc;
  const save = () => {
    writeLifecycleJson(file, manifest);
    writeLifecycleJson(path.resolve('logs/study-active-campaign.json'), {
      pid: process.pid, status: manifest.status, startedAt: manifest.startedAt, manifest: file,
      currentStage: manifest.currentStage, report: manifest.currentReport,
      finishedAt: manifest.finishedAt, error: manifest.error,
    });
  };
  try {
    if (manifest.parentAccountsFile) releaseParent=acquireAccountLock(manifest.parentAccountsFile);
    if (manifest.parentAccountReservation) {
      const reservation = manifest.parentAccountReservation;
      const prior = JSON.parse(fs.readFileSync(reservation.lock));
      const audit = JSON.parse(fs.readFileSync(reservation.audit));
      if (prior.pid !== 8964 || prior.status !== 'paused_after_settled_checkpoint' ||
          audit.status !== 'settled' || !audit.safeToTerminateVerifiedProcess || hash(reservation.audit) !== reservation.auditSha256)
        throw Error('Parent circuit account reservation is not settled');
      let alive = true;
      try { process.kill(prior.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
      if (alive) throw Error('Parent circuit process is still active');
      parentLease = reservation.lock;
      writeLifecycleJson(parentLease, { pid: process.pid, startedAt: new Date().toISOString(),
        status: 'reserved_by_reduced_concurrency', accountsFile: manifest.accountsFile, manifest: file,
        originalCircuitCheckpoint: reservation.audit });
    }
    const frozen = fingerprint(entry);
    manifest.pid = process.pid; manifest.startedAt = new Date().toISOString();
    manifest.status = 'preflight'; manifest.sourceSnapshot = frozen; save();
    const {installStudyRpcReadResilience}=require('../../tasks/studies/rpc');
    restoreRpc=installStudyRpcReadResilience(hre.ethers.provider,path.join(folder,'rpc-read-retries.jsonl'));
    manifest.rpcReadPolicy=require('../../tasks/studies/rpc').studyRpcReadPolicy(hre.ethers.provider);save();
    if ((await deadline(() => hre.ethers.provider.getNetwork(), 20000, 'chain identity')).chainId !== 11155111n)
      throw Error('Sepolia required');
    const accounts = loadAccounts(manifest.accountsFile, hre.ethers.provider);
    const required = Math.max(...manifest.stages.map(s => s.plan.requiredAccounts));
    if (accounts.length !== required) throw Error('Unexpected saved study account count');
    if (manifest.expectedAccounts && JSON.stringify(accounts.map(a => a.address)) !== JSON.stringify(manifest.expectedAccounts))
      throw Error('Saved account identities differ from the reviewed subset');
    manifest.launchPreflight = [];
    for (const account of accounts) {
      const read = (method, params) => deadline(() => hre.ethers.provider.send(method, params), 20000, 'launch account read');
      const latest = Number(BigInt(await read('eth_getTransactionCount', [account.address, 'latest'])));
      const pending = Number(BigInt(await read('eth_getTransactionCount', [account.address, 'pending'])));
      const balanceWei = BigInt(await read('eth_getBalance', [account.address, 'latest']));
      if (latest !== pending || balanceWei <= 0n) throw Error('Every study account must be funded with settled nonces');
      manifest.launchPreflight.push({ address: account.address, latest, pending, balanceWei: balanceWei.toString() });
    }
    save();
    for (const stage of manifest.stages) {
      if(stage.status==='finished'){
        if(hash(stage.report)!==stage.rawSha256)throw Error('Completed stage bytes changed');
        continue;
      }
      if(stage.sourceReport && hash(stage.sourceReport)!==stage.sourceSha256)throw Error('Selected checkpoint bytes changed');
      if(manifest.originalSource && hash(manifest.originalSource.file)!==manifest.originalSource.sha256)throw Error('Original raw source changed');
      if (JSON.stringify(fingerprint(entry)) !== JSON.stringify(frozen)) throw Error('Source or SDK changed between stages');
      manifest.status = 'running'; manifest.currentStage = `${stage.suite}/euint16`;
      manifest.currentReport = stage.report; stage.status = 'running'; stage.startedAt = new Date().toISOString(); save();
      const report = stage.sourceReport
        ? await continueStudy(stage.sourceReport,stage.args.outputDir,hre,stage.args.accountsFile)
        : await runStudy({ ...stage.args, live: true }, hre);
      if(report.scopeRevision && hash(report.scopeRevision.originalReport)!==report.scopeRevision.originalSha256)throw Error('Original scope bytes changed');
      if(stage.sourceReport && hash(stage.sourceReport)!==stage.sourceSha256)throw Error('Selected checkpoint changed during continuation');
      if(manifest.originalSource && hash(manifest.originalSource.file)!==manifest.originalSource.sha256)throw Error('Original raw source changed during stage');
      const latest = latestAttempts(report), requests = stage.suite === 'concurrency' ? stage.args.requests : 1;
      if (!report.executionComplete || latest.length !== (stage.plan.measuredTransactions + stage.plan.warmupTransactions) / requests ||
          latest.some(t => !['ok', 'capacity_rejected'].includes(t.status)))
        throw Error('Planned-slot coverage or completion validation failed');
      stage.status = 'finished'; stage.finishedAt = new Date().toISOString(); stage.rawSha256 = hash(stage.report);
      stage.allValid = report.complete;
      stage.counts = { measuredTrials: latest.filter(t => !t.warmup).length,
        validatedRequests: report.trials.filter(t => !t.warmup).flatMap(t => t.requests).filter(r => r.status === 'ok').length,
        capacityRejections: latest.filter(t => !t.warmup && t.status === 'capacity_rejected').length };
      save();
    }
    if (JSON.stringify(fingerprint(entry)) !== JSON.stringify(frozen)) throw Error('Source or SDK changed during measurement');
    manifest.status = 'analysis_running'; manifest.currentStage = 'canonical network audit and tables'; save();
    await analyzeCompletedCampaign(folder);
    manifest.status = manifest.stages.every(s => s.allValid) ? 'finished' :
      manifest.stages.some(s=>s.suite==='concurrency'&&!s.allValid) ? 'execution_complete_with_retained_failure' : 'execution_complete_with_capacity_rejections';
    manifest.finishedAt = new Date().toISOString(); manifest.networkReport = path.join(folder, 'network/network-report.md'); save();
  } catch (error) {
    manifest.status = 'failed'; manifest.error = safeError(error); manifest.finishedAt = new Date().toISOString();
    const stage = manifest.stages.find(s => s.status === 'running');
    if (stage) { stage.status = 'failed'; stage.error = manifest.error; }
    save(); throw error;
  } finally {
    if(restoreRpc)restoreRpc();
    fs.unlinkSync(lock);
    if (releaseParent && !fs.existsSync(path.join(path.dirname(manifest.accountsFile),'campaign.lock')))releaseParent();
    if (parentLease && fs.existsSync(parentLease)) {
      const active = JSON.parse(fs.readFileSync(parentLease));
      const unresolved = manifest.currentReport && fs.existsSync(path.join(path.dirname(manifest.currentReport), 'costs.json')) &&
        JSON.parse(fs.readFileSync(path.join(path.dirname(manifest.currentReport), 'costs.json'))).unresolvedBroadcasts;
      const subsetLockRetained = fs.existsSync(path.join(path.dirname(manifest.accountsFile), 'campaign.lock'));
      if (active.pid === process.pid && !unresolved && !subsetLockRetained) fs.unlinkSync(parentLease);
    }
  }
}

module.exports = { validateFreshManifest, fingerprint, analyzeCompletedCampaign, runReviewedCampaign };
