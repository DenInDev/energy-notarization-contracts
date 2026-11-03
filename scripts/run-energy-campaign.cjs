// Use the saved platform wallets without loading the unrelated legacy mnemonic.
process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register');
const hre = require('hardhat');
const runs = Number(process.argv[2] || 1);
const outputDir = process.argv[3] || '';
hre.run('benchmark:energy:lifecycle', {
  runs, platform: 'all', seed: 'energy-mixed16-64-independent-v1', timeout: 180, execution: 'processes',
  accountsFile: process.argv[4] || '.benchmark-accounts/accounts.secret.json', outputDir,
}).catch(() => {
  console.error('Energy campaign failed; retained report contains the sanitized failure details.');
  process.exitCode = 1;
});
