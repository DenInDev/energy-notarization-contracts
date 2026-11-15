// Single guarded entry point for reviewed study manifests. Never resumes by guessing.
const fs = require('node:fs');

function launchPolicy(manifest, explicit) {
  const defaults = {
    'full-16bit-concurrency-and-circuits': 'full',
    'reduced-16bit-concurrency': 'reduced',
    'fresh-16bit-concurrency-and-circuits': 'fresh',
    'fresh-16bit-circuits-30': 'circuits-fresh30',
    'fresh-16bit-two-writer-session': 'two-writer-fresh10',
    'compact-16bit-sample-extension': 'sessions',
    'two-writer-16bit-study': 'sessions',
  };
  if (explicit) return explicit;
  if (defaults[manifest.kind]) return defaults[manifest.kind];
  if (manifest.kind === 'compact-16bit-selected-studies')
    throw Error('Compact history is ambiguous: specify --policy compact, compact-fresh, compact-continue or compact-resume');
  throw Error('Unsupported study manifest kind');
}

async function main(argv) {
  if (argv.length !== 1 && !(argv.length === 3 && argv[1] === '--policy'))
    throw Error('Usage: node scripts/run-study-campaign.cjs <new-reviewed-manifest.json> [--policy <policy>]');
  const manifest = JSON.parse(fs.readFileSync(argv[0]));
  const policy = launchPolicy(manifest, argv[2]);
  if (policy === 'sessions') {
    const { runSampleExtension } = require('./lib/study-sample-extension.cjs');
    return runSampleExtension(argv[0], __filename);
  }
  const { runReviewedCampaign } = require('./lib/study-campaign.cjs');
  return runReviewedCampaign(argv[0], policy, __filename);
}

if (require.main === module) {
  process.env.SEPOLIA_MNEMONIC = '';
  process.env.HARDHAT_NETWORK = 'sepolia';
  require('ts-node/register/transpile-only');

  main(process.argv.slice(2)).catch(error => {
    const { safeError } = require('../tasks/lifecycle/errors');
    console.error(safeError(error));
    process.exitCode = 1;
  });
}

module.exports = { launchPolicy };
