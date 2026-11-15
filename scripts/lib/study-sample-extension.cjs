// Execute exactly two fresh compact sessions. The original ten observations
// per cell remain immutable, and no failed/confirmed historical send is replayed.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { validateFreshManifest, fingerprint, runReviewedCampaign } = require('./study-campaign.cjs');
const { latestAttempts } = require('../../tasks/studies/continuation');
const { writeLifecycleJson } = require('../../tasks/lib/lifecycleReportWrite');
const { safeError } = require('../../tasks/lifecycle/errors');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function validateExtensionManifest(manifest, folder) {
  if (manifest.kind !== 'compact-16bit-sample-extension' || manifest.status !== 'funded_ready' ||
      manifest.chainId !== 11155111 || manifest.targetRepetitions !== 30 ||
      manifest.originalRepetitions !== 10 || manifest.sessions.length !== 2 || manifest.originalReports.length !== 2)
    throw Error('Reviewed 10 + 10 + 10 sample extension required');
  const seeds = new Set();
  for (const [index, source] of manifest.originalReports.entries()) {
    if (hash(source.file) !== source.sha256) throw Error('Original report SHA mismatch');
    const report = JSON.parse(fs.readFileSync(source.file));
    const suite = ['concurrency', 'circuits'][index];
    if (!report.executionComplete || report.chainId !== 11155111 || report.mock ||
        report.config.suite !== suite || report.config.widths !== '16' || report.config.repetitions !== 10 ||
        latestAttempts(report).some(t => !['ok', 'capacity_rejected'].includes(t.status)))
      throw Error('Original completed compact report required, retaining its failures and late audits');
    const measured = latestAttempts(report).filter(t => !t.warmup);
    const expected = new Set(report.cases.flatMap(c => report.platforms.flatMap(p =>
      Array.from({ length: 10 }, (_, i) => `${c.id}/${p}/${i + 1}`))));
    if (measured.length !== expected.size || measured.some(t => !expected.delete(`${t.caseId}/${t.platform}/${t.repetition}`)) || expected.size)
      throw Error('Original measured coverage is incomplete or duplicated');
    if (JSON.stringify(report.provenance.decryptionPolling) !==
        JSON.stringify(require('../../tasks/lib/decryptionPolling.cjs').pollingProvenance()))
      throw Error('SDK policy differs from the original sample');
    for (const [file, checksum] of Object.entries(report.provenance.sha256)) {
      if ((file.startsWith('contracts/studies/') || /studies\/(adapters|transactions|plan|oracle|capacity)\.ts$/.test(file) ||
          file.startsWith('tasks/lib/') || file === 'tasks/lifecycle/broadcast.ts') && hash(file) !== checksum)
        throw Error('Timed workload differs from the original sample');
    }
    seeds.add(report.config.seed);
  }
  for (const [index, session] of manifest.sessions.entries()) {
    const file = path.resolve(session.manifest), child = JSON.parse(fs.readFileSync(file));
    if (session.status !== 'planned' || session.repetitions !== 10 || session.id !== `session-${index + 2}` ||
        path.dirname(path.dirname(file)) !== path.resolve(folder) || hash(file) !== session.manifestSha256 ||
        path.resolve(child.accountsFile) !== path.resolve(manifest.accountsFile) ||
        path.resolve(child.parentAccountsFile) !== path.resolve(manifest.parentAccountsFile))
      throw Error('Extension session identity or account mismatch');
    const policy = session.executionPolicy ?? 'compact-fresh';
    if (!['compact-fresh','compact-continue'].includes(policy) || (policy==='compact-continue'&&index!==0))
      throw Error('Only the interrupted first extension session may be continued');
    validateFreshManifest(child, path.dirname(file), policy);
    if ((policy==='compact-fresh'&&child.stages.some(s => s.sourceReport)) || new Set(child.stages.map(s => s.args.seed)).size !== 1 ||
        seeds.has(child.stages[0].args.seed)) throw Error('Each fresh session needs its declared distinct seed');
    seeds.add(child.stages[0].args.seed);
    for (const [i, stage] of child.stages.entries()) {
      const original = JSON.parse(fs.readFileSync(manifest.originalReports[i].file));
      if (JSON.stringify(stage.plan.cases) !== JSON.stringify(original.cases))
        throw Error('New session changes the original workload matrix');
    }
  }
}

function validateTwoWriterManifest(manifest,folder){
  if(manifest.kind!=='two-writer-16bit-study'||manifest.status!=='funded_ready'||manifest.chainId!==11155111||
    manifest.targetRepetitions!==20||manifest.sessions.length!==2||manifest.originalReports.length!==2)
    throw Error('Reviewed two-session 20-window two-writer study required');
  for(const [i,session] of manifest.sessions.entries()){
    const original=manifest.originalReports[i];
    if(hash(original.file)!==original.sha256)throw Error('Reference concurrency report changed');
    const source=JSON.parse(fs.readFileSync(original.file));
    const file=path.resolve(session.manifest),child=JSON.parse(fs.readFileSync(file));
    if(!source.executionComplete||source.config.suite!=='concurrency'||source.config.repetitions!==10||
      source.config.users!=='1,4'||source.config.modes!=='shared_sum,shared_ordered'||source.mock||source.chainId!==11155111||
      session.status!=='planned'||session.id!==`session-${i+1}`||session.repetitions!==10||
      session.executionPolicy!=='two-writer-fresh10'||hash(file)!==session.manifestSha256||
      path.dirname(path.dirname(file))!==path.resolve(folder)||child.stages[0].args.seed!==source.config.seed||
      path.resolve(child.accountsFile)!==path.resolve(manifest.accountsFile)||
      path.resolve(child.parentAccountsFile)!==path.resolve(manifest.parentAccountsFile))throw Error('Two-writer session differs from its reference protocol');
    validateFreshManifest(child,path.dirname(file),'two-writer-fresh10');
    if(JSON.stringify(source.provenance.decryptionPolling)!==JSON.stringify(require('../../tasks/lib/decryptionPolling.cjs').pollingProvenance()))
      throw Error('Reference SDK/polling policy changed');
    for(const [f,checksum] of Object.entries(source.provenance.sha256))if((f.startsWith('contracts/studies/')||
      /studies\/(adapters|transactions|plan|oracle|capacity)\.ts$/.test(f)||f.startsWith('tasks/lib/')||f==='tasks/lifecycle/broadcast.ts')&&hash(f)!==checksum)
      throw Error('Timed reference workload changed');
  }
}

async function runSampleExtension(manifestFile, entry) {
  const file = path.resolve(manifestFile), folder = path.dirname(file);
  const manifest = JSON.parse(fs.readFileSync(file));
  const twoWriters=manifest.kind==='two-writer-16bit-study';
  if(twoWriters)validateTwoWriterManifest(manifest,folder);else validateExtensionManifest(manifest, folder);
  const analysisScript=twoWriters?'scripts/analysis/analyze-two-writer-study.py':'scripts/analysis/analyze-study-sample-extension.py';
  const lock = path.join(folder, 'launcher.lock');
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { flag: 'wx' });
  const frozen = fingerprint(entry);
  // Include this orchestrator and the final aggregation in the frozen audit.
  frozen.extensionFiles = Object.fromEntries([__filename, analysisScript]
    .map(f => [path.relative(process.cwd(), f), hash(f)]));
  const verify = () => {
    const current = fingerprint(entry);
    current.extensionFiles = Object.fromEntries(Object.keys(frozen.extensionFiles).map(f => [f, hash(f)]));
    if (JSON.stringify(current) !== JSON.stringify(frozen)) throw Error('Source or SDK changed during extension');
    if (manifest.originalReports.some(s => hash(s.file) !== s.sha256)) throw Error('Original report changed');
  };
  const save = () => {
    writeLifecycleJson(file, manifest);
    writeLifecycleJson(path.resolve('logs/study-active-campaign.json'), {
      pid: process.pid, status: manifest.status, manifest: file, startedAt: manifest.startedAt,
      currentSession: manifest.currentSession, childManifest: manifest.currentManifest,
      finishedAt: manifest.finishedAt, error: manifest.error,
    });
  };
  try {
    manifest.pid = process.pid; manifest.startedAt = new Date().toISOString();
    manifest.sourceSnapshot = frozen; manifest.status = 'running'; save();
    for (const session of manifest.sessions) {
      verify();
      if (hash(session.manifest) !== session.manifestSha256) throw Error('Unstarted session manifest changed');
      session.status = 'running'; session.startedAt = new Date().toISOString();
      manifest.currentSession = session.id; manifest.currentManifest = session.manifest; save();
      await runReviewedCampaign(session.manifest, session.executionPolicy ?? 'compact-fresh', entry);
      verify();
      const child = JSON.parse(fs.readFileSync(session.manifest));
      if (child.stages.some(s => s.status !== 'finished')) throw Error('Extension session is not finished');
      session.status = 'finished'; session.finishedAt = new Date().toISOString();
      session.finishedManifestSha256 = hash(session.manifest); save();
    }
    manifest.status = 'analysis_running'; save();
    const result = await promisify(execFile)(path.resolve('.venv/Scripts/python.exe'),
      [analysisScript, folder], { maxBuffer: 4 * 1024 * 1024 });
    fs.writeFileSync(path.join(folder, 'aggregation.stdout.log'), result.stdout);
    verify();
    manifest.status = twoWriters ? (manifest.sessions.every(s=>JSON.parse(fs.readFileSync(s.manifest)).stages.every(t=>t.allValid))?
      'finished':'execution_complete_with_retained_failures') : 'execution_complete_with_retained_failures_and_capacity_rejections';
    manifest.finishedAt = new Date().toISOString(); manifest.analysis = path.join(folder, 'analysis/combined-results.md'); save();
  } catch (error) {
    manifest.status = 'failed'; manifest.error = safeError(error); manifest.finishedAt = new Date().toISOString();
    const session = manifest.sessions.find(s => s.status === 'running');
    if (session) { session.status = 'failed'; session.error = manifest.error; }
    save(); throw error;
  } finally {
    fs.unlinkSync(lock);
  }
}

module.exports = { validateExtensionManifest, validateTwoWriterManifest, runSampleExtension };
