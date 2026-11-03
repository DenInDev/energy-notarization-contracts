const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const path = require('node:path');
const { loadAccount } = require('./account.cjs');
const account = loadAccount();
const out = 'logs/octra-pilot';
const viewMode = process.argv.includes('--views');
const journalFile = out + (viewMode ? '/live-views.json' : '/live-pilot.json');
const lockFile = '.benchmark-accounts/octra-pilot.lock';
const report = fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile, 'utf8')) : {
  endpoint: account.rpc, address: account.address, startedAt: new Date().toISOString(), transactions: [], checks: []
};
function save() { fs.writeFileSync(journalFile, JSON.stringify(report, null, 2) + '\n'); }
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
async function rpc(method, params = [], retry = 0) {
  const res = await fetch(account.rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(45000) });
  const body = await res.json();
  if ((res.status === 429 || /RPC capacity reached/.test(body.error?.message || '')) && retry < 3 &&
      !['octra_submit', 'octra_registerPvacPubkey'].includes(method)) {
    await new Promise(resolve => setTimeout(resolve, 2000 * (2 ** retry)));
    return rpc(method, params, retry + 1);
  }
  if (!res.ok || body.error || !Object.hasOwn(body, 'result'))
    throw new Error(method + ': ' + (body.error?.message || 'invalid RPC response'));
  return body.result;
}
async function waitConfirmed(entry) {
  if (entry.submission?.tx_hash) {
    entry.localCanonicalSha256 ??= entry.hash;
    entry.hash = entry.submission.tx_hash;
    save();
  }
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    let tx;
    try { tx = await rpc('octra_transaction', [entry.hash]); }
    catch (error) {
      if (error.message !== 'octra_transaction: not found') throw error;
      await new Promise(resolve => setTimeout(resolve, 6000));
      continue;
    }
    entry.lastTransactionState = tx; save();
    const status = tx.status || tx.transaction?.status;
    if (status === 'confirmed') {
      entry.status = 'confirmed'; entry.confirmedAt = new Date().toISOString();
      entry.receipt = entry.label === 'register_key' ? null : await rpc('contract_receipt', [entry.hash]); save();
      const r = entry.receipt || {};
      if (r.error || (entry.label !== 'register_key' && r.success !== true) || r.status === 'reverted' || r.status === 'failed')
        throw new Error(entry.label + ': contract execution failed');
      return;
    }
    if (status === 'rejected' || status === 'dropped') {
      entry.status = status; save();
      throw new Error(entry.label + ': transaction ' + status);
    }
    await new Promise(resolve => setTimeout(resolve, 6000));
  }
  throw new Error('Confirmation deadline exceeded; reconcile existing transaction before sending again');
}
async function send(label, op_type, to_, encrypted_data, message = '') {
  const existing = report.transactions.find(x => x.label === label);
  if (existing) { await waitConfirmed(existing); return existing; }
  const balance = await rpc('octra_balance', [account.address]);
  if (balance.nonce !== balance.pending_nonce) throw new Error('Pending nonce differs; reconcile before sending');
  const fees = await rpc('octra_recommendedFee', [op_type]);
  const ou = String(fees.recommended);
  const spent = report.transactions.reduce((n, t) => n + BigInt(t.ou), 0n);
  if (BigInt(ou) > (op_type === 'key_switch' ? 1000000n : 300000n) || spent + BigInt(ou) > 1500000n || BigInt(balance.balance_raw) < BigInt(ou))
    throw new Error('Pilot fee or balance allowance exceeded');
  const tx = { from: account.address, to_, amount: '0', nonce: balance.nonce + 1,
    ou, timestamp: Date.now() / 1000, op_type };
  if (encrypted_data) tx.encrypted_data = encrypted_data;
  if (message) tx.message = message;
  const canonical = JSON.stringify(tx);
  const hash = sha(canonical);
  tx.signature = crypto.sign(null, Buffer.from(canonical), account.privateKey).toString('base64');
  tx.public_key = account.publicKeyBase64;
  const entry = { label, hash, nonce: tx.nonce, ou, status: 'prepared', submittedAt: new Date().toISOString() };
  report.transactions.push(entry); save();
  // Once journaled, an uncertain submission is reconciled, never blindly repeated.
  entry.submission = await rpc('octra_submit', [tx]); entry.status = 'submitted'; save();
  console.log('Submitted', label, entry.submission.tx_hash || hash);
  await waitConfirmed(entry);
  console.log('Confirmed', label);
  return entry;
}
function decryptResult(ciphertext) {
  const filename = out + '/online-result-cipher.json';
  fs.writeFileSync(filename, JSON.stringify({ ciphertext }) + '\n');
  const absolute = path.resolve('.').replaceAll('\\', '/');
  const wslRoot = '/mnt/' + absolute[0].toLowerCase() + absolute.slice(2);
  const result = cp.execFileSync('wsl', ['-d', 'Ubuntu-22.04', '--', 'python3',
    wslRoot + '/scripts/octra/local-probe.py', '--decrypt', wslRoot + '/' + filename],
    { encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(result.trim()).value;
}
async function verify(label, expected, method = 'get_result', params = []) {
  if (report.checks.some(check => check.label === label && check.correct && check.expected === String(expected))) return;
  const start = performance.now();
  const response = await rpc('contract_call', [report.contractAddress, method, params, account.address]);
  const ciphertext = response.result;
  if (typeof ciphertext !== 'string' || !ciphertext) throw new Error('No ciphertext returned');
  const retrievedMs = performance.now() - start;
  const actual = decryptResult(ciphertext);
  fs.writeFileSync(out + '/online-result-' + label + '.json', JSON.stringify({ ciphertext }) + '\n');
  const check = { label, expected: String(expected), actual, correct: actual === String(expected),
    ciphertextSha256: sha(ciphertext), retrievedMs, verifiedAt: new Date().toISOString() };
  report.checks.push(check); save();
  console.log('Decrypted', label, actual, check.correct ? 'PASS' : 'FAIL');
  if (!check.correct) throw new Error(label + ': plaintext mismatch');
}
async function main() {
  if (!process.argv.includes('--send')) throw new Error('Use --send to authorize this devnet-only pilot');
  if (report.endpoint !== account.rpc || report.address !== account.address) throw new Error('Journal account mismatch');
  report.status = 'running'; delete report.error; save();
  const fixture = JSON.parse(fs.readFileSync(out + '/fixtures.json', 'utf8'));
  if (fixture.address !== account.address || !fixture.aesKatHex) throw new Error('Regenerate local fixtures for this account');
  const balance = await rpc('octra_balance', [account.address]);
  if (BigInt(balance.balance_raw) < 210000n && report.transactions.length === 0) throw new Error('Fund devnet account first');
  report.node = await rpc('node_version'); report.initialBalance ??= balance;
  const source = fs.readFileSync('contracts/octra/' + (viewMode ? 'EnergyPilotViews.aml' : 'EnergyPilot.aml'), 'utf8');
  if (report.sourceSha256 && report.sourceSha256 !== sha(source)) throw new Error('Source changed during pilot');
  report.sourceSha256 = sha(source);
  const compilation = await rpc('octra_compileAml', [source]);
  report.compilerVersion = compilation.version;
  save();
  // Reuse the registration already read back and verified during this pilot.
  // Its multi-megabyte RPC response need not be downloaded on every resume.
  const prior = viewMode && fs.existsSync(out + '/live-pilot.json') ?
    JSON.parse(fs.readFileSync(out + '/live-pilot.json', 'utf8')) : report;
  const pkDigest = sha(Buffer.from(fixture.publicKeyBase64, 'base64'));
  const cachedRegistration = prior.address === account.address && prior.endpoint === account.rpc &&
    prior.registration?.verified && prior.registration.publicKeySha256 === pkDigest;
  const registered = cachedRegistration ? { pvac_pubkey: fixture.publicKeyBase64 } :
    await rpc('octra_pvacPubkey', [account.address]);
  if (cachedRegistration) report.registration = { verified: true, publicKeySha256: pkDigest,
    evidence: viewMode ? 'live-pilot.json' : 'previous verified registration' };
  else report.registrationBefore = registered;
  save();
  const registeredKey = typeof registered === 'string' ? registered : registered?.pubkey || registered?.pvac_pubkey || registered?.public_key;
  if (registeredKey && registeredKey !== fixture.publicKeyBase64) throw new Error('Existing PVAC key mismatch');
  if (!registeredKey) {
    const pkHash = sha(Buffer.from(fixture.publicKeyBase64, 'base64'));
    // Live v3 nodes require canonical registration transactions; the old RPC
    // returns "must be submitted as a canonical key_switch transaction".
    await send('register_key', 'key_switch', account.address,
      JSON.stringify({ aes_kat: fixture.aesKatHex, new_pubkey: fixture.publicKeyBase64 }),
      'encryption key switch | new_key:' + pkHash.slice(0, 16));
    const after = await rpc('octra_pvacPubkey', [account.address]);
    const key = typeof after === 'string' ? after : after?.pvac_pubkey || after?.pubkey || after?.public_key;
    if (key !== fixture.publicKeyBase64) throw new Error('PVAC registration did not match the local key');
    report.registration = { verified: true, publicKeySha256: pkHash }; save();
    console.log('PVAC key registered and verified');
  }
  if (!report.contractAddress) {
    const current = await rpc('octra_balance', [account.address]);
    const computed = await rpc('octra_computeContractAddress', [compilation.bytecode, account.address, current.nonce + 1]);
    report.contractAddress = computed.address; save();
  }
  await send('deploy', 'deploy', report.contractAddress, compilation.bytecode);
  const meta = await rpc('vm_contract', [report.contractAddress]);
  report.metadata = meta; save();
  if (meta.owner !== account.address) throw new Error('Unexpected contract owner');
  if (meta.code_hash !== sha(Buffer.from(compilation.bytecode, 'base64'))) throw new Error('Deployed code hash mismatch');
  report.codeHashVerified = true; save();
  if (viewMode) {
    await verify('view_add', 59, 'add', [fixture.left, fixture.right]);
    await verify('view_scale', 126, 'scale', [fixture.left, 3]);
    report.finalBalance = await rpc('octra_balance', [account.address]);
    report.status = 'passed'; report.completedAt = new Date().toISOString(); save();
    console.log(JSON.stringify({ status: report.status, scope: 'read-only encrypted operations', checks: report.checks }, null, 2));
    return;
  }
  await send('store', 'call', report.contractAddress, 'store', JSON.stringify([fixture.left, fixture.right]));
  await verify('store', 42);
  await send('add', 'call', report.contractAddress, 'add', '[]');
  await verify('add', 59);
  await send('scale', 'call', report.contractAddress, 'scale', '[3]');
  await verify('scale', 126);
  report.finalBalance = await rpc('octra_balance', [account.address]);
  report.status = 'passed'; report.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ status: report.status, contract: report.contractAddress,
    checks: report.checks, balance: report.finalBalance, journalFile }, null, 2));
}
let locked = false;
try { fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' }); locked = true; }
catch { throw new Error('An Octra pilot is already locked; check the previous process first'); }
main().catch(error => { report.status = 'stopped'; report.error = error.message;
  save(); console.error('Octra pilot stopped:', error.message); process.exitCode = 1; })
  .finally(() => { if (locked) fs.unlinkSync(lockFile); });
