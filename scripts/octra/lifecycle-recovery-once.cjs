// One measured Octra trial per supported entrypoint; devnet only, no replay.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { loadAccount } = require('./account.cjs');
const a = loadAccount();
const out = 'logs/octra-lifecycle-once-2026-11-02-continuation1';
const reportPath = out + '/report.json';
const lockPath = '.benchmark-accounts/octra-lifecycle-once.lock';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const sourceFile = 'contracts/octra/EnergyLifecycleOnce.aml';
const source = fs.readFileSync(sourceFile, 'utf8');
const compiled = JSON.parse(fs.readFileSync(out + '/compilation.json')).response.result;
const nodeProvenance = JSON.parse(fs.readFileSync(out + '/node-source-provenance.json'));
if (a.network !== 'devnet' || a.rpc !== 'https://devnet.octrascan.io/rpc')
  throw new Error('Only the dedicated Octra devnet account is allowed');
if (!compiled?.deploy_payload || compiled.verification?.errors !== 0 || !compiled.verification?.verified)
  throw new Error('Workload compilation or admission checks failed');
const evidenceHashes = Object.fromEntries([sourceFile, __filename,
  'scripts/octra/lifecycle-crypto-worker.py', out + '/compilation.json'].map(p => [p, sha(fs.readFileSync(p))]));
let report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath)) : {
  schemaVersion: 1, startedAt: new Date().toISOString(), status: 'preparing', endpoint: a.rpc,
  address: a.address, sourceFile, sourceSha256: sha(source), evidenceHashes,
  nodeSourceCommit: nodeProvenance.commit, compiler: compiled.version,
  representation: { inputFixtureBits: 16, referenceArithmeticBits: 64,
    octraArithmetic: 'PVAC finite field F_(2^127-1), not unsigned-64 wrapping',
    clientInputRangeChecked: true, onchainInputRangeProof: false,
    securityParameterEquivalenceToOtherPlatforms: 'not_established' },
  workload: { reading: 43, initialTotal: 42, scalar: 3, measuredRounds: 1, warmups: 0,
    initialTotalExplanation: 'Encrypted setup value 42; matches a prior accumulated value without a repeated measured add.' },
  methodology: { receiptPollingMs: 500, primaryTimeoutMs: 180000,
    stages: 'fresh input encryption/serialization; local sign; single broadcast; receipt observation; persisted ciphertext read; local decryption and plaintext check',
    keys: 'existing saved owner key and registered public key; setup excluded from per-operation latency',
    repeats: 'none', statisticalInference: 'none; one observation per entrypoint',
    feeMetric: 'actual declared native fee OU and wallet balance reconciliation; VM effort is separate, not Ethereum gas',
    postReceiptMetric: 'persisted ciphertext RPC retrieval plus local deserialization/decryption/validation; not isolated FHE compute',
    lifecycleMetric: 'inputPreparationMs + transactionToValidatedPlaintextMs; signing recorded separately',
    limitations: ['different date, network and cryptographic scheme', 'no synchronized cross-platform pairing',
      'no general encrypted maximum exposed by live compiler', 'field mean only matches floor integer mean for even sums'] },
  transactions: [], samples: [], rpcEvents: [], diagnostics: [], setup: {},
  requestedOperations: ['notarize', 'add', 'mul_scalar', 'mean', 'max'], executionComplete: false
};
if (report.endpoint !== a.rpc || report.address !== a.address || report.sourceSha256 !== sha(source))
  throw new Error('Saved trial identity/source mismatch');
for (const [file, digest] of Object.entries(report.evidenceHashes))
  if (sha(fs.readFileSync(file)) !== digest) throw new Error('Trial source changed: ' + file);
function save() {
  fs.writeFileSync(reportPath + '.tmp', JSON.stringify(report, null, 2) + '\n');
  fs.renameSync(reportPath + '.tmp', reportPath);
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function rpc(method, params = [], attempts = 0, timeoutMs = 25000) {
  const start = performance.now();
  let response, body;
  try {
    response = await fetch(a.rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(timeoutMs) });
    body = await response.json();
  } catch (error) {
    report.rpcEvents.push({ at: new Date().toISOString(), method, attempt: attempts + 1,
      durationMs: performance.now() - start, error: error.cause?.code || error.name }); save();
    throw new Error(method + ': transport ' + (error.cause?.code || error.name));
  }
  const event = { at: new Date().toISOString(), method, attempt: attempts + 1,
    httpStatus: response.status, durationMs: performance.now() - start,
    rpcError: body.error || null, retryAfter: response.headers.get('retry-after') };
  report.rpcEvents.push(event); save();
  if (method !== 'octra_submit' && attempts < 3 && (response.status === 429 || response.status === 503 ||
      /busy|capacity reached/i.test(body.error?.message || ''))) {
    const hint = event.retryAfter && /^\d+$/.test(event.retryAfter) ? Number(event.retryAfter) * 1000 : 0;
    const delay = Math.max(hint, 1000 * 2 ** attempts);
    if (delay > 30000) throw new Error(method + ': server retry hint exceeds bounded retry window');
    event.retryWaitMs = delay; save(); await pause(delay);
    return rpc(method, params, attempts + 1, timeoutMs);
  }
  if (!response.ok || body.error || !Object.hasOwn(body, 'result'))
    throw new Error(method + ': ' + (body.error?.message || ('HTTP ' + response.status)));
  return body.result;
}
class CryptoWorker {
  constructor() {
    this.pending = []; this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    const absolute = path.resolve('scripts/octra/lifecycle-crypto-worker.py').replaceAll('\\', '/');
    const wslPath = '/mnt/' + absolute[0].toLowerCase() + absolute.slice(2);
    this.child = cp.spawn('wsl', ['-d', 'Ubuntu-22.04', '--', 'python3', '-u', wslPath],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.stderr = '';
    this.child.stderr.on('data', chunk => { this.stderr += String(chunk).slice(0, 1000); });
    readline.createInterface({ input: this.child.stdout }).on('line', line => {
      let value; try { value = JSON.parse(line); } catch { return; }
      if (value.ready) { this.readyResolve(value); return; }
      const waiting = this.pending.shift(); if (!waiting) return;
      clearTimeout(waiting.timer);
      value.ok ? waiting.resolve(value.result) : waiting.reject(new Error('Crypto worker: ' + value.error));
    });
    this.child.on('error', error => this.readyReject(new Error('Crypto worker launch: ' + error.name)));
    this.child.on('close', code => {
      this.readyReject(new Error('Crypto worker exited ' + code));
      for (const waiting of this.pending) { clearTimeout(waiting.timer); waiting.reject(new Error('Crypto worker exited ' + code)); }
      this.pending = [];
    });
  }
  async request(value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const waiting = { resolve, reject, timer: setTimeout(() => reject(new Error('Crypto worker deadline')), 120000) };
      this.pending.push(waiting); this.child.stdin.write(JSON.stringify(value) + '\n');
    });
  }
  close() { this.child.stdin.end(JSON.stringify({ op: 'close' }) + '\n'); }
}
async function balance() {
  const b = await rpc('octra_balance', [a.address]);
  if (b.nonce !== b.pending_nonce) throw new Error('Pending nonce differs; reconcile before new submission');
  return b;
}
async function confirmed(entry, sample) {
  const end = Date.now() + 180000;
  while (Date.now() < end) {
    let state;
    try { state = await rpc('octra_transaction', [entry.hash]); }
    catch (error) { if (!/not found/i.test(error.message)) throw error; }
    if (state) {
      entry.state = state; save();
      if (['rejected', 'dropped'].includes(state.status)) {
        entry.status = state.status; save(); throw new Error(entry.label + ': transaction ' + state.status);
      }
      if (state.status === 'confirmed') {
        entry.status = 'confirmed'; entry.confirmedAt = new Date().toISOString(); save();
        entry.receipt = await rpc('contract_receipt', [entry.hash]); save();
        if (sample && !sample.receiptObservedAt) sample.receiptObservedAt = new Date().toISOString();
        if (!entry.receipt.success) throw new Error(entry.label + ': receipt execution failed: ' + (entry.receipt.error || 'unspecified'));
        return entry;
      }
    }
    await pause(500);
  }
  throw new Error(entry.label + ': confirmation timeout; do not replay the existing hash');
}
async function send(label, op_type, target, encrypted_data, args, feeOU, sample) {
  const existing = report.transactions.find(tx => tx.label === label);
  if (existing) {
    if (['rejected', 'dropped'].includes(existing.status)) throw new Error(label + ': prior terminal failure retained');
    if (sample && sample.transactionStartedAt && !sample.plaintextValidatedAt)
      sample.recoveredAfterInterruption = true;
    return confirmed(existing, sample);
  }
  const b = await balance();
  const fee = BigInt(feeOU);
  if (fee > 2560000n || BigInt(b.balance_raw) < fee) throw new Error('Fee cap or native balance insufficient for ' + label);
  const message = JSON.stringify(args);
  const tx = { from: a.address, to_: target, amount: '0', nonce: b.nonce + 1,
    ou: String(feeOU), timestamp: Math.floor(Date.now() / 1000) - 0.5, op_type, encrypted_data, message };
  const signingJson = JSON.stringify(tx);
  const beforeSign = performance.now();
  tx.signature = crypto.sign(null, Buffer.from(signingJson), a.privateKey).toString('base64');
  tx.public_key = a.publicKeyBase64;
  const signingMs = performance.now() - beforeSign;
  const hashJson = JSON.stringify({ from: tx.from, to_: tx.to_, amount: tx.amount,
    nonce: tx.nonce, ou: tx.ou, timestamp: tx.timestamp, signature: tx.signature,
    op_type, public_key: tx.public_key, message, encrypted_data });
  const entry = { label, hash: sha(hashJson), nonce: tx.nonce, feeOU: tx.ou, op_type,
    signingJsonSha256: sha(signingJson), status: 'prepared', preparedAt: new Date().toISOString() };
  report.transactions.push(entry); save();
  if (sample) { sample.transactionHash = entry.hash; sample.nonce = tx.nonce; sample.signingMs = signingMs; }
  const txStart = performance.now();
  if (sample) sample.transactionStartedAt = new Date().toISOString();
  entry.status = 'broadcast_started'; save();
  const ackStart = performance.now();
  try {
    entry.submission = await rpc('octra_submit', [tx]);
    if (entry.submission.tx_hash !== entry.hash) throw new Error('Canonical transaction hash mismatch');
    entry.status = 'acknowledged'; save();
  } catch (error) { entry.status = 'uncertain'; save(); throw error; }
  if (sample) sample.broadcastAckMs = performance.now() - ackStart;
  console.log('Submitted', label, entry.hash);
  await confirmed(entry, sample);
  if (sample) {
    sample.transactionToReceiptMs = performance.now() - txStart;
    sample.receiptObservedAt = new Date().toISOString();
    sample.feeOU = tx.ou; sample.feeOCT = Number(fee) / 1000000;
    sample.receiptEffort = entry.receipt.effort;
  }
  save(); console.log('Confirmed', label); return entry;
}
async function validate(worker, sample, getter, expected) {
  const started = performance.now();
  const readStart = performance.now();
  const result = await rpc('contract_call', [report.contractAddress, getter, [], a.address], 0, 60000);
  sample.ciphertextRetrievalMs = performance.now() - readStart;
  if (typeof result.result !== 'string' || !result.result) throw new Error('No persisted ciphertext returned');
  const raw = Buffer.from(result.result, 'base64');
  sample.ciphertextSha256 = sha(raw); sample.ciphertextBytes = raw.length;
  fs.writeFileSync(out + '/result-' + sample.operation + '.json', JSON.stringify({ ciphertext: result.result }) + '\n');
  const decryptStart = performance.now();
  const value = await worker.request({ op: 'decrypt', ciphertext: result.result });
  sample.cryptoWorkerRoundTripMs = performance.now() - decryptStart;
  Object.assign(sample, value);
  sample.expectedPlaintext = String(expected);
  sample.correct = value.plaintext === String(expected);
  sample.postReceiptToValidatedPlaintextMs = performance.now() - started;
  sample.plaintextValidatedAt = new Date().toISOString();
  sample.transactionToValidatedPlaintextMs = sample.transactionToReceiptMs + sample.postReceiptToValidatedPlaintextMs;
  sample.derivedLifecycleMs = sample.inputPreparationMs + sample.transactionToValidatedPlaintextMs;
  if (!sample.correct) throw new Error(sample.operation + ': plaintext mismatch');
}
async function main(worker) {
  save();
  report.node = await rpc('node_status'); report.nodeVersion = await rpc('node_version');
  report.currentBalance = await balance(); save();
  const ready = await worker.ready;
  if (ready.address !== a.address) throw new Error('Local key worker belongs to another account');
  report.localKeySetupMs = ready.keySetupMs;
  if (!fs.existsSync(out + '/fixtures.json')) {
    const fixtures = await worker.request({ op: 'prepare' });
    fs.writeFileSync(out + '/fixtures.json', JSON.stringify(fixtures, null, 2) + '\n', { flag: 'wx' });
    const checks = await worker.request({ op: 'local_checks' });
    fs.writeFileSync(out + '/local-checks.json', JSON.stringify(checks, null, 2) + '\n', { flag: 'wx' });
  }
  const fixtures = JSON.parse(fs.readFileSync(out + '/fixtures.json'));
  if (fixtures.address !== a.address) throw new Error('Fixture identity mismatch');
  report.clientLibrarySha256 = fixtures.librarySha256; report.publicKeySha256 = fixtures.publicKeySha256;
  report.setup.fixtureKeygenMs = fixtures.keySetupMs;
  const registration = await rpc('octra_pvacPubkey', [a.address], 0, 45000);
  const registered = typeof registration === 'string' ? registration :
    registration?.pvac_pubkey || registration?.pubkey || registration?.public_key;
  if (!registered || sha(Buffer.from(registered, 'base64')) !== fixtures.publicKeySha256)
    throw new Error('Registered public key does not match the locally derived key');
  report.setup.registeredKeyVerifiedAt = new Date().toISOString();
  const fee = await rpc('octra_recommendedFee', ['program_deploy', { encrypted_data_len: Buffer.byteLength(compiled.deploy_payload) }]);
  const base = 200000 + Math.ceil(Buffer.byteLength(compiled.deploy_payload) / 1024) * 1000;
  if (![base, base * 2, base * 5].includes(Number(fee.minimum))) throw new Error('Unexpected source package fee');
  const planned = [
    { operation: 'add', label: 'add_effort_retry', attempt: 2, method: 'add', getter: 'get_total', expected: 85,
      fee: '2560000', args: [], inputPreparationMs: 0 },
    { operation: 'mul_scalar', label: 'mul_scalar', attempt: 1, method: 'mul_scalar', getter: 'get_result', expected: 129,
      fee: '2560000', args: [3], inputPreparationMs: 0 }
  ];
  const remainingFees = planned.filter(row => !report.transactions.some(tx => tx.label === row.label))
    .reduce((sum, row) => sum + BigInt(row.fee), report.contractAddress ? 0n : BigInt(fee.minimum));
  report.feePlan = { deploymentOU: fee.minimum, arithmeticCallOU: '2560000',
    remainingRequiredOU: String(remainingFees), remainingRequiredOCT: Number(remainingFees) / 1000000,
    rationale: 'Existing registered public key image exceeds the 1,000,000 VM effort floor. Current source vm_limit=max(1,000,000,declared OU); 2,560,000 OU is a bounded allowance for key loading plus one primitive key charge and VM overhead. The old failed attempt is retained.' };
  report.capabilities = { max: { status: 'unsupported_by_live_compiler', evidence: 'capability-preflight.json',
    reason: 'fhe_max unknown; numeric max rejects cipher' }, mean: { status: 'finite_field_candidate_only',
    reason: 'fhe_div_const is multiplication by modular inverse. An even test sum matches integer division; odd sums do not.' } };
  save();
  if (!process.argv.includes('--send')) {
    report.status = BigInt(report.currentBalance.balance_raw) >= remainingFees ? 'ready' : 'awaiting_funding'; save();
    console.log(JSON.stringify({ status: report.status, balance: report.currentBalance.balance,
      remainingRequiredOCT: report.feePlan.remainingRequiredOCT,
      localChecks: JSON.parse(fs.readFileSync(out + '/local-checks.json')).cases }, null, 2)); return;
  }
  if (BigInt(report.currentBalance.balance_raw) < remainingFees) {
    report.status = 'awaiting_funding'; save();
    throw new Error('Full remaining fee plan requires ' + report.feePlan.remainingRequiredOCT + ' devnet OCT; actual balance ' + report.currentBalance.balance);
  }
  report.balanceBeforeSend ??= report.currentBalance;
  report.status = 'running'; save();
  if (!report.contractAddress) {
    const preview = await rpc('octra_computeContractAddress', [compiled.bytecode, a.address, report.currentBalance.nonce + 1]);
    report.contractAddress = preview.address; report.setup.addressPreview = preview; save();
  }
  if (!report.transactions.some(t => t.label === 'deploy' && t.status === 'confirmed')) throw new Error('Continuation requires original confirmed deployment');
  const metadata = await rpc('vm_contract', [report.contractAddress]);
  report.setup.metadata = metadata;
  if (metadata.owner !== a.address || metadata.code_hash !== sha(Buffer.from(compiled.bytecode, 'base64')))
    throw new Error('Deployed contract identity/code hash mismatch');
  save();
  const recoveredState = {};
  for (const [name,getter] of [['last','get_last'],['total','get_total']]) {
    const stored = await rpc('contract_call', [report.contractAddress, getter, [], a.address], 0, 60000);
    const value = await worker.request({op:'decrypt', ciphertext:stored.result});
    recoveredState[name] = value.plaintext;
  }
  const expectedTotal = report.samples.some(s => s.operation === 'add' && s.status === 'ok') ? '85' : '42';
  if (recoveredState.last !== '43' || recoveredState.total !== expectedTotal)
    throw new Error('Confirmed ciphertext state differs from continuation prerequisites');
  report.continuation.confirmedPlaintextPreflight = recoveredState; save();
  for (const row of planned) {
    let sample = report.samples.find(s => s.operation === row.operation && s.attempt === row.attempt);
    if (sample?.status === 'ok') continue;
    if (sample?.status === 'failed') throw new Error('Prior primary failure retained; no automatic replacement');
    if (!sample) {
      sample = { operation: row.operation, method: row.method, status: 'running', run: 1, attempt: row.attempt, label: row.label,
        startedAt: new Date().toISOString(), inputPreparationMs: row.inputPreparationMs,
        equivalentGeneralIntegerSemantics: row.operation !== 'mean',
        inputBitsAreClientRangeConstraintOnly: true };
      report.samples.push(sample); save();
    }
    try {
      await send(row.label, 'call', report.contractAddress, row.method, row.args, row.fee, sample);
      if (sample.recoveredAfterInterruption) throw new Error('Interrupted primary timing cannot be reconstructed; late validation must be separate');
      await validate(worker, sample, row.getter, row.expected);
      sample.status = 'ok'; sample.completedAt = new Date().toISOString(); save();
      console.log(JSON.stringify({ operation: row.operation, correct: sample.correct,
        plaintext: sample.plaintext, receiptMs: sample.transactionToReceiptMs,
        validatedMs: sample.transactionToValidatedPlaintextMs, feeOU: sample.feeOU,
        effort: sample.receiptEffort }));
    } catch (error) {
      sample.status = 'failed'; sample.error = error.message; sample.failedAt = new Date().toISOString(); save();
      if (row.operation === 'add') { console.log('Retained add retry failure; proceeding to independent scalar attempt'); continue; }
      throw error;
    }
  }
  for (const test of [
    { name: 'mean_odd_sum', left: fixtures.fixtures.odd_left.ciphertext, right: fixtures.fixtures.odd_right.ciphertext,
      inputs: [42,17], expected: '29' },
    { name: 'mean_even_sum', left: fixtures.fixtures.reading.ciphertext,
      right: null, inputs: [43,85], expected: '64' }
  ]) {
    if (report.diagnostics.some(d => d.operation === test.name)) continue;
    const d = { operation: test.name, mode: 'read_only_semantic_probe', inputs: test.inputs, expectedInteger: test.expected };
    report.diagnostics.push(d); save();
    const started = performance.now();
    try {
      if (!test.right) {
        if (!report.samples.some(s => s.operation === 'add' && s.status === 'ok')) {
          d.status = 'skipped_failed_add_dependency'; save(); continue;
        }
        const stored = await rpc('contract_call', [report.contractAddress, 'get_total', [], a.address], 0, 60000);
        test.right = stored.result;
      }
      const result = await rpc('contract_call', [report.contractAddress, 'mean_probe',
        [test.left, test.right], a.address], 0, 60000);
      d.rpcElapsedMs = performance.now() - started;
      const decStart = performance.now();
      const value = await worker.request({ op: 'decrypt', ciphertext: result.result });
      d.cryptoWorkerRoundTripMs = performance.now() - decStart;
      Object.assign(d, value); d.matchesInteger = value.plaintext === d.expectedInteger;
      d.endToEndMs = performance.now() - started; d.status = 'observed';
      fs.writeFileSync(out + '/result-' + test.name + '.json', JSON.stringify({ciphertext:result.result}) + '\n');
    } catch (error) { d.status = 'failed'; d.error = error.message; }
    save();
  }
  report.setup.sourceVerification = await rpc('contract_verify', [report.contractAddress, source]); save();
  if (!report.setup.sourceVerification.verified) throw new Error('Deployed source verification did not pass');
  report.balanceAfter = await balance();
  const spent = report.transactions.filter(t => t.status === 'confirmed').reduce((sum, tx) => sum + BigInt(tx.feeOU), 0n);
  report.feeTotalOU = String(spent); report.feeTotalOCT = Number(spent) / 1000000;
  report.balanceDeltaOU = String(BigInt(report.balanceBeforeSend.balance_raw) - BigInt(report.balanceAfter.balance_raw));
  report.balanceReconciles = report.balanceDeltaOU === report.feeTotalOU;
  report.executionComplete = true; report.allFiveEquivalentOperationsCompleted = false;
  report.status = 'completed_with_capability_limits'; report.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ status: report.status, samples: report.samples.length,
    feesOCT: report.feeTotalOCT, balanceAfter: report.balanceAfter.balance, report: reportPath }, null, 2));
}
let worker, locked = false;
try { fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' }); locked = true; }
catch { throw new Error('Trial lock exists; verify prior process before proceeding'); }
worker = new CryptoWorker();
main(worker).catch(error => {
  if (report.status !== 'awaiting_funding') report.status = 'stopped';
  report.error = error.message; save(); console.error('Octra trial stopped:', report.error); process.exitCode = 1;
}).finally(() => { worker.close(); if (locked) fs.unlinkSync(lockPath); });
