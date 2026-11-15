// Continue only the unattempted matched schedule after the reviewed confirmed read failure.
// No deployments, warmups, transaction repetition, or repair of historical latency.
process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hre = require('hardhat');
const { continueLifecycleCampaign } = require('../tasks/lifecycle/continuation');
const { writeLifecycleJson } = require('../tasks/lib/lifecycleReportWrite');
const { safeError } = require('../tasks/lifecycle/errors');
const root = path.resolve(process.argv[2]), accountsFile = path.resolve(process.argv[3]);
const sourceFile = path.join(root, 'measured-euint128/report.json');
const file = path.join(root, 'campaign-continuation2.json');
const outputDir = path.join(root, 'measured-euint128-continuation1');
const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let manifest;

function save() {
  writeLifecycleJson(file, manifest);
  writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'), {
    pid: process.pid, status: manifest.status, startedAt: manifest.startedAt,
    manifest: file, report: path.join(outputDir, 'report.json'), accountsFile,
    currentStage: 'measured-euint128-continuation1', runs: 50, widths: [16, 128],
    command: 'node scripts/continue-uniform-matched.cjs',
  });
}

async function main() {
  if (fs.existsSync(file) || fs.existsSync(outputDir)) throw Error('Fresh output required; never replay an existing continuation');
  const sourceSha256 = hash(sourceFile);
  if (sourceSha256 !== 'd5e56a04e28b146dca4f1b3ffba789b986df5931db612dedf2aa34da318e8e1e')
    throw Error('The reviewed source checkpoint changed');
  const parentFile = path.join(root, 'campaign-continuation1.json');
  const parent = JSON.parse(fs.readFileSync(parentFile));
  const source = JSON.parse(fs.readFileSync(sourceFile));
  if (parent.status !== 'failed' || source.samples.length !== 393 || source.samples.filter(s => s.status === 'error').length !== 1 ||
      source.viewDecryptSamples.length !== 63 || path.resolve(parent.accountsFile) !== accountsFile)
    throw Error('Unexpected reviewed checkpoint');
  manifest = {
    ...parent, pid: process.pid, startedAt: new Date().toISOString(), status: 'running',
    parentManifest: { file: parentFile, sha256: hash(parentFile) },
    sourceCheckpoint: { file: sourceFile, sha256: sourceSha256 },
    authorization: 'User chose only missing operations while retaining the failed primary observation.',
    currentStage: 'measured-euint128-continuation1', currentReport: path.join(outputDir, 'report.json'),
    expectedNewPrimarySamples: 525, expectedNewViews: 90, expectedNewDeployments: 0,
    expectedNewWarmups: 0, expectedRepeatedTransactions: 0,
    stages: [...parent.stages, { kind: 'measured', width: 128, status: 'running',
      report: path.join(outputDir, 'report.json'), startedAt: new Date().toISOString(), continuationFrom: sourceFile }],
  };
  delete manifest.error;
  delete manifest.abortedAt;
  save();
  await continueLifecycleCampaign({ report: sourceFile, outputDir, accountsFile,
    resumeUniformAll: true, retainConfirmedDecryptFailure: true }, hre);
  const report = JSON.parse(fs.readFileSync(manifest.currentReport));
  const segment = report.continuations.at(-1), measured = report.samples.filter(s => !s.warmup);
  if (!report.executionComplete || segment.status !== 'finished' || report.complete !== false ||
      measured.length !== 900 || measured.filter(s => s.status === 'ok').length !== 899 ||
      new Set(measured.map(s => `${s.platform}/${s.run}/${s.operation}`)).size !== 900 ||
      report.samples.slice(393).length !== 525 || report.samples.slice(393).some(s => s.status !== 'ok') ||
      report.viewDecryptSamples.length !== 153 || report.viewDecryptSamples.some(s => s.status !== 'ok') ||
      report.retrySamples.length || report.setup.length !== 3 || hash(sourceFile) !== sourceSha256)
    throw Error('Finished continuation did not match the authorized schedule and retained failure');
  const stage = manifest.stages.at(-1);
  stage.status = 'finished';
  stage.completedAt = new Date().toISOString();
  stage.rawSha256 = hash(manifest.currentReport);
  manifest.status = 'execution_complete_with_retained_failures';
  manifest.completedAt = stage.completedAt;
  manifest.counts = { width16: { successful: 900, planned: 900 }, width128: { successful: 899, planned: 900, retainedFailures: 1 } };
  save();
}

main().catch(error => {
  if (manifest) {
    manifest.status = 'failed'; manifest.error = safeError(error); manifest.abortedAt = new Date().toISOString();
    const stage = manifest.stages.at(-1);
    if (stage.status === 'running') stage.status = 'failed';
    save();
  }
  console.error(safeError(error));
  process.exitCode = 1;
});
