// Run two width-specific pilots, then the two measured Sepolia campaigns.
process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hre = require('hardhat');
const { safeError } = require('../tasks/lifecycle/errors');
const { writeLifecycleJson } = require('../tasks/lib/lifecycleReportWrite');

const output = path.resolve(process.argv[2] || `logs/energy-uniform-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const accountsFile = path.resolve(process.argv[3] || '.benchmark-accounts/isolated-validation/accounts.secret.json');
const runs = Number(process.argv[4] || 50);
const resumePreflight = process.argv[5] === '--resume-preflight';
let manifest = {
  status: 'preflight', startedAt: new Date().toISOString(), pid: process.pid,
  chainId: 11155111, runs, widths: [16, 128], accountsFile,
  operationOrder: ['set_meter_owner', 'notarize', 'add', 'mul_scalar', 'mean', 'max', 'view_decrypt'],
  ownershipScope: '50 measured encrypted-address imports per platform and width, before the energy operations, with receipt-pinned owner getter and equality-validated authorized decryption',
  viewDecryptScope: 'One persisted getter plus fresh authorized decryption after max per round, separate warmups and samples',
  stages: [],
};
let pinnedSources;

function save() {
  writeLifecycleJson(path.join(output, 'campaign.json'), manifest);
  writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'), {
    pid: process.pid, startedAt: manifest.startedAt, status: manifest.status,
    manifest: path.join(output, 'campaign.json'), currentStage: manifest.currentStage,
    report: manifest.stages.at(-1)?.report, accountsFile, runs, widths: manifest.widths,
    command: 'node scripts/run-uniform-energy.cjs',
  });
}

async function main() {
  if (resumePreflight) {
    manifest = JSON.parse(fs.readFileSync(path.join(output, 'campaign.json')));
    const failed = manifest.stages.at(-1);
    const empty = JSON.parse(fs.readFileSync(failed.report));
    if (manifest.status !== 'failed' || failed.kind !== 'measured' ||
        empty.samples.length || empty.setup.length || empty.barriers.length ||
        manifest.accountsFile !== accountsFile || manifest.runs !== runs) {
      throw new Error('Preflight resume requires a failed measured stage with zero deployments, samples and broadcasts');
    }
    const pilot = JSON.parse(fs.readFileSync(manifest.stages.find(stage => stage.kind === 'pilot' && stage.width === 128 && stage.status === 'finished').report));
    pinnedSources = pilot.sourceSha256;
    const file = 'scripts/run-uniform-energy.cjs';
    const currentHash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    manifest.preflightResumes ??= [];
    manifest.preflightResumes.push({ at: new Date().toISOString(), previousPid: manifest.pid,
      failedReport: failed.report, reason: manifest.error, file, previousHash: pinnedSources[file], currentHash });
    pinnedSources = { ...pinnedSources, [file]: currentHash };
    manifest.pid = process.pid; manifest.status = 'preflight';
    delete manifest.error; delete manifest.abortedAt;
  } else if (fs.existsSync(output)) throw new Error('Uniform campaign output must be a new directory');
  if (!Number.isInteger(runs) || runs < 1 || runs > 1000) throw new Error('Invalid measured round count');
  fs.mkdirSync(output, { recursive: true });
  const previous = path.resolve('logs/energy-active-campaign.json');
  if (!resumePreflight && fs.existsSync(previous)) fs.copyFileSync(previous, path.join(output, 'previous-active-campaign.json'));
  save();

  for (const kind of ['pilot', 'measured']) {
    for (const width of manifest.widths) {
      if (manifest.stages.some(stage => stage.kind === kind && stage.width === width && stage.status === 'finished')) continue;
      if (pinnedSources) {
        for (const [file, digest] of Object.entries(pinnedSources)) {
          const actual = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
          if (actual !== digest) throw new Error(`Source or dependency changed between campaign stages: ${file}`);
        }
      }
      const attempts = manifest.stages.filter(stage => stage.kind === kind && stage.width === width).length;
      const folder = path.join(output, `${kind}-euint${width}${attempts ? `-preflight${attempts + 1}` : ''}`);
      const stage = { kind, width, status: 'running', startedAt: new Date().toISOString(), report: path.join(folder, 'report.json') };
      manifest.stages.push(stage);
      manifest.status = 'running'; manifest.currentStage = `${kind}-euint${width}`;
      save();
      await hre.run('benchmark:energy:lifecycle', {
        runs: kind === 'pilot' ? 1 : runs, width, platform: 'all',
        seed: 'energy-uniform16-128-paired-v1', timeout: 180, setupTimeout: 180,
        accountsFile, outputDir: folder, execution: 'processes',
      });
      const report = JSON.parse(fs.readFileSync(stage.report));
      const planned = report.runs * 18;
      const measured = report.samples.filter(sample => !sample.warmup);
      const unique = new Set(measured.map(sample => `${sample.platform}/${sample.run}/${sample.operation}`));
      if (report.schemaVersion !== 14 || !report.complete || measured.length !== planned || unique.size !== planned ||
          report.samples.filter(sample => sample.warmup).length !== 18 || report.setup.length !== 3 ||
          report.samples.some(sample => sample.status !== 'ok') ||
          report.viewDecryptSamples.length !== 3 * (report.runs + 1) ||
          report.viewDecryptSamples.some(sample => sample.status !== 'ok')) {
        throw new Error('Campaign validation failed; retained report must be inspected');
      }
      pinnedSources ??= report.sourceSha256;
      manifest.decryptionPolling ??= report.decryptionPolling;
      if (JSON.stringify(report.decryptionPolling) !== JSON.stringify(manifest.decryptionPolling)) {
        throw new Error('SDK polling provenance changed between campaign stages');
      }
      stage.status = 'finished'; stage.completedAt = new Date().toISOString();
      save();
    }
  }
  manifest.status = 'complete'; manifest.completedAt = new Date().toISOString();
  save();
}

main().catch(error => {
  if (fs.existsSync(path.join(output, 'campaign.json'))) {
    manifest.status = 'failed'; manifest.error = safeError(error);
    manifest.abortedAt = new Date().toISOString();
    const stage = manifest.stages.at(-1);
    if (stage && stage.status === 'running') stage.status = 'failed';
    save();
  }
  console.error(safeError(error));
  process.exitCode = 1;
});
