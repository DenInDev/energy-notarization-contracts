process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
try {
  require('ts-node/register');
  const hre = require('hardhat');
  require('../tasks/lifecycle/processWorker').startLifecycleWorker(hre);
} catch (error) {
  // Worker stdio is intentionally not forwarded: SDK errors must be sanitized
  // through structured IPC, never leak local credentials through startup logs.
  const message = require('../tasks/lifecycle/errors').safeError(error);
  if (process.connected) process.send({ type: 'fatal', error: message }, () => {
    process.exitCode = 1; process.disconnect?.();
  });
  else { process.exitCode = 1; }
}
