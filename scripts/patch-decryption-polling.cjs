const fs = require('node:fs');
const path = require('node:path');
const {decryptionPollDelay, targets, marker} = require('../tasks/lib/decryptionPolling.cjs');
const root = path.resolve(__dirname, '..');
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('SDK source differs from pinned polling patch; refusing to patch');
  return source.replace(before, after);
}
const helper = `// ${marker}\nconst benchmarkDecryptionPollDelay = ${decryptionPollDelay.toString()};\n`;
const edits = [];
for (const [platform, relative] of Object.entries(targets)) {
  const zama = platform.startsWith('zama');
  const file = path.join(root, relative);
  const version = JSON.parse(fs.readFileSync(path.join(root, zama
    ? 'node_modules/@zama-fhe/relayer-sdk/package.json' : 'node_modules/@cofhe/sdk-current/package.json'), 'utf8')).version;
  if (version !== (zama ? '0.4.1' : '1.0.1')) throw new Error('Review polling patch before changing SDK versions');
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) continue;
  if (zama) {
    source = replaceOnce(source, 'class RelayerV2AsyncRequest {', helper + 'class RelayerV2AsyncRequest {');
    source = replaceOnce(source, '_getRetryAfterHeaderValueInMs(response) {',
      `_getRetryAfterHeaderValueInMs(response) {\n        if (this._relayerOperation === 'USER_DECRYPT' && !this._throwErrorIfNoRetryAfter) return benchmarkDecryptionPollDelay(response);`);
    source = replaceOnce(source, 'this._assert(delayMs >= RelayerV2AsyncRequest.MINIMUM_RETRY_AFTER_MS,',
      `this._assert(delayMs >= (this._relayerOperation === 'USER_DECRYPT' ? 100 : RelayerV2AsyncRequest.MINIMUM_RETRY_AFTER_MS),`);
  } else {
    const begin = source.indexOf('// core/decrypt/tnSealOutputV2.ts');
    const end = source.indexOf('// core/decrypt/decryptForViewBuilder.ts', begin);
    if (begin < 0 || end < 0) throw new Error('CoFHE sealoutput section not found');
    let section = source.slice(begin, end);
    // Retry an unindexed ciphertext after 100ms or the server's longer delay.
    section = replaceOnce(section, '    onPoll?.({\n      operation: "sealoutput",\n      requestId: "",',
      '    const intervalMs = benchmarkDecryptionPollDelay(response);\n    onPoll?.({\n      operation: "sealoutput",\n      requestId: "",');
    section = replaceOnce(section, 'intervalMs: SUBMIT_RETRY_INTERVAL_MS,', 'intervalMs,');
    section = replaceOnce(section, 'setTimeout(resolve, SUBMIT_RETRY_INTERVAL_MS)', 'setTimeout(resolve, intervalMs)');
    // Poll a submitted job immediately, then wait only after a PROCESSING response.
    const polling = section.indexOf('async function pollSealOutputStatus(');
    let tail = section.slice(polling);
    const from = tail.indexOf('    const intervalMs = computeMinuteRampPollIntervalMs(');
    const to = tail.indexOf('    if (elapsedMs > SEAL_OUTPUT_TIMEOUT_MS)', from);
    if (from < 0 || to < 0) throw new Error('CoFHE poll loop differs');
    tail = tail.slice(0, from) + tail.slice(to);
    tail = replaceOnce(tail, '    await new Promise((resolve) => setTimeout(resolve, intervalMs));',
      '    const intervalMs = benchmarkDecryptionPollDelay(response);\n' +
      '    onPoll?.({operation: "sealoutput", requestId, attemptIndex, elapsedMs: Date.now() - overallStartTime, intervalMs, timeoutMs: SEAL_OUTPUT_TIMEOUT_MS});\n' +
      '    await new Promise((resolve) => setTimeout(resolve, intervalMs));');
    section = section.slice(0, polling) + tail;
    source = source.slice(0, begin) + helper + section + source.slice(end);
  }
  // Validate both bundles before changing either file.
  require('node:child_process').execFileSync(process.execPath,
    ['--check', '--input-type', relative.endsWith('.cjs') ? 'commonjs' : 'module'],
    {input: source, stdio: ['pipe', 'pipe', 'pipe']});
  edits.push([file, source]);
}
for (const [file, source] of edits) fs.writeFileSync(file, source);
console.log(`Decryption polling patch verified: 100ms base; server Retry-After preserved (${edits.length} bundles updated).`);
