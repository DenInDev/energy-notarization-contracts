// Continue only Fhenix's existing uniform campaign after explicit retry authorization.
// The confirmed failed mean is repeated once at a fresh nonce and journaled separately.
process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register');
const path = require('node:path');
const fs = require('node:fs');
const hre = require('hardhat');
const { continueLifecycleCampaign } = require('../tasks/lifecycle/continuation');
const { writeLifecycleJson } = require('../tasks/lib/lifecycleReportWrite');
const { safeError } = require('../tasks/lifecycle/errors');

const [report, outputDir, accountsFile, authorization] = process.argv.slice(2);
if (!report || !outputDir || !accountsFile || !['--repeat-failed-mean', '--resume-missing'].includes(authorization)) {
  throw new Error('Pass source report, fresh output, saved accounts and an explicit continuation mode');
}
const journal = { pid: process.pid, startedAt: new Date().toISOString(), status: 'preflight',
  sourceReport: path.resolve(report), report: path.resolve(outputDir, 'report.json'),
  platformOnly: 'fhenix', uniformWidth: 128, accountsFile: path.resolve(accountsFile),
  command: 'node scripts/continue-uniform-fhenix.cjs',
  authorization: authorization === '--repeat-failed-mean' ?
    'User requested a new transaction for the confirmed failed mean and then Fhenix-only continuation' :
    'Continue the already-authorized unattempted Fhenix schedule with bounded read throttling; no further transaction repetition' };
writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'), journal);

continueLifecycleCampaign({ report, outputDir, accountsFile, platformOnly: 'fhenix',
  repeatFailedMean: authorization === '--repeat-failed-mean', resumeMissing: authorization === '--resume-missing' }, hre)
  .then(() => {
    journal.status = 'fhenix_execution_complete_with_retained_failure';
    journal.completedAt = new Date().toISOString();
    writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'), journal);
  }).catch(error => {
    journal.status = 'terminal_failure'; journal.terminalReason = safeError(error);
    journal.terminalAt = new Date().toISOString();
    writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'), journal);
    console.error(journal.terminalReason); process.exitCode = 1;
  });
