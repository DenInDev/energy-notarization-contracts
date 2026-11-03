process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register');
const hre = require('hardhat');
const report = process.argv[2], outputDir = process.argv[3];
if (!report || !outputDir) throw new Error('Source report and new output directory required');
hre.run('benchmark:energy:continue', { report, outputDir,
  accountsFile: process.argv[4] || '.benchmark-accounts/accounts.secret.json' }).catch(() => {
  console.error('Continuation failed; inspect retained sanitized report. No automatic transaction retries.');
  process.exitCode = 1;
});
