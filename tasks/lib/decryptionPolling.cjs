const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Serialized into the pinned SDK bundles by scripts/patch-decryption-polling.cjs.
// Keep this function self-contained; never shorten a server Retry-After.
function decryptionPollDelay(response, now = Date.now()) {
  const baseMs = 100;
  const header = response?.headers?.get('Retry-After')?.trim();
  if (!header) return baseMs;
  const delayMs = /^\d+(?:\.\d+)?$/.test(header)
    ? Number(header) * 1000 : Date.parse(header) - now;
  return Number.isFinite(delayMs) ? Math.max(baseMs, delayMs) : baseMs;
}

const targets = {
  zama: 'node_modules/@zama-fhe/relayer-sdk/lib/node.cjs',
  zamaEsm: 'node_modules/@zama-fhe/relayer-sdk/lib/node.js',
  fhenix: 'node_modules/@cofhe/sdk-current/dist/node.cjs',
};
const marker = 'benchmark-decryption-polling-v1';
function pollingProvenance() {
  const root = path.resolve(__dirname, '../..');
  return {requestedIntervalMs: 100, serverRetryAfter: 'respected; can lengthen the effective interval',
    patch: marker, bundles: Object.fromEntries(Object.entries(targets).map(([name, file]) => {
      const bytes = fs.readFileSync(path.join(root, file));
      if (!bytes.includes(Buffer.from(marker))) throw new Error(`Run npm run sdk:patch-polling before using ${name}`);
      return [name, {file, sha256: createHash('sha256').update(bytes).digest('hex')}];
    }))};
}
module.exports = {decryptionPollDelay, pollingProvenance, targets, marker};
