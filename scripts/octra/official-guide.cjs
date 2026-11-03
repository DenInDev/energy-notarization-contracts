// Reproduce the official first-program tutorial on the dedicated Octra devnet.
// Never print keys, signed transactions, or automatically replay a submission.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { encodeBase58 } = require('ethers');
const { loadAccount } = require('./account.cjs');

const root = 'logs/octra-official-guide-2026-11-02';
const journalPath = root + '/deployment.json';
const lockPath = '.benchmark-accounts/octra-official-guide.lock';
const a = loadAccount();
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const provenance = JSON.parse(fs.readFileSync(root + '/upstream-provenance.json'));
for (const file of provenance.files) {
  if (sha(fs.readFileSync(root + '/upstream/' + file.path)) !== file.sha256)
    throw new Error('Pinned upstream source hash mismatch');
}
const compiledFile = fs.readFileSync(root + '/compilation.json');
const compilation = JSON.parse(compiledFile).response.result;
if (!compilation?.bytecode || !compilation.deploy_payload ||
    compilation.bytecode !== compilation.program_envelope ||
    compilation.verification?.errors !== 0 || !compilation.verification?.verified)
  throw new Error('Source-bound program compilation checks failed');
const compilationHash = sha(compiledFile);
const constructorParams = ['MyToken', 'MTK', 1000000000000, 6];
const files = ['main.aml', 'interfaces/IOCS01.aml'].map(p => ({ path: p,
  source: fs.readFileSync(root + '/upstream/static/templates/token/' + p, 'utf8') }));
let journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath)) : {
  startedAt: new Date().toISOString(), status: 'prepared', endpoint: a.rpc,
  network: 'devnet', owner: a.address, upstreamCommit: provenance.commit,
  compilationSha256: compilationHash, constructorParams, transactions: [], checks: [], reads: []
};
if (a.rpc !== 'https://devnet.octrascan.io/rpc' || a.network !== 'devnet' ||
    journal.endpoint !== a.rpc || journal.owner !== a.address ||
    journal.compilationSha256 !== compilationHash)
  throw new Error('Devnet identity or immutable compilation mismatch');
function save() {
  const temporary = journalPath + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(journal, null, 2) + '\n');
  fs.renameSync(temporary, journalPath);
}
async function rpc(method, params = [], retry = 0) {
  const mutation = method === 'octra_submit';
  const response = await fetch(a.rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(25000) });
  let body;
  try { body = await response.json(); } catch { throw new Error(method + ': non-JSON HTTP ' + response.status); }
  if (!mutation && retry < 2 && (response.status === 429 || response.status === 503 ||
      /capacity|busy/i.test(body.error?.message || ''))) {
    await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retry));
    return rpc(method, params, retry + 1);
  }
  if (!response.ok || body.error || !Object.hasOwn(body, 'result'))
    throw new Error(method + ': ' + (body.error?.message || ('HTTP ' + response.status)));
  return body.result;
}
async function read(method, params = []) {
  const result = await rpc(method, params);
  journal.reads.push({ at: new Date().toISOString(), method, params, result }); save();
  return result;
}
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  journal.checks.push({ label, actual, expected, ok }); save();
  if (!ok) throw new Error('Verification failed: ' + label);
}
async function awaitTransaction(entry) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    let state;
    try { state = await rpc('octra_transaction', [entry.hash]); }
    catch (error) { if (!/not found/i.test(error.message)) throw error; }
    if (state) {
      entry.state = state; save();
      if (['rejected', 'dropped'].includes(state.status)) {
        entry.status = state.status; save(); throw new Error(entry.label + ': ' + state.status);
      }
      if (state.status === 'confirmed') {
        entry.status = 'confirmed'; entry.confirmedAt = new Date().toISOString(); save();
        entry.receipt = await rpc('contract_receipt', [entry.hash]); save();
        if (entry.receipt.success !== true) throw new Error(entry.label + ': contract receipt unsuccessful');
        return;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  throw new Error(entry.label + ': confirmation deadline exceeded; reconcile this hash without resubmitting');
}
async function send(label, op_type, to_, encrypted_data, message, ou) {
  const previous = journal.transactions.find(tx => tx.label === label);
  if (previous) {
    if (['rejected', 'dropped'].includes(previous.status))
      throw new Error(label + ': retained terminal failure; no replacement transaction');
    await awaitTransaction(previous); return previous;
  }
  const balance = await read('octra_balance', [a.address]);
  if (balance.nonce !== balance.pending_nonce) throw new Error('Pending nonce differs; no new submission');
  const fee = BigInt(ou);
  const total = journal.transactions.reduce((sum, tx) => sum + BigInt(tx.ou), fee);
  if (fee > 500000n || total > 600000n || BigInt(balance.balance_raw) < fee)
    throw new Error('Tutorial fee cap or actual native balance insufficient');
  // A half-second timestamp is exactly representable and matches upstream formatting.
  const timestamp = Math.floor(Date.now() / 1000) - 0.5;
  const tx = { from: a.address, to_, amount: '0', nonce: balance.nonce + 1,
    ou: String(ou), timestamp, op_type, encrypted_data, message };
  const signingJson = JSON.stringify(tx);
  tx.signature = crypto.sign(null, Buffer.from(signingJson), a.privateKey).toString('base64');
  tx.public_key = a.publicKeyBase64;
  // Field order and null handling match pinned lib/tx_builder.hpp::hash_json.
  const hashJson = JSON.stringify({ from: tx.from, to_: tx.to_, amount: tx.amount,
    nonce: tx.nonce, ou: tx.ou, timestamp, signature: tx.signature, op_type,
    public_key: tx.public_key, message: message || null, encrypted_data: encrypted_data || null });
  const entry = { label, op_type, nonce: tx.nonce, to: to_, amount: '0', ou: tx.ou,
    hash: sha(hashJson), signingJsonSha256: sha(signingJson), status: 'prepared',
    timestamp, preparedAt: new Date().toISOString() };
  journal.transactions.push(entry); save();
  entry.status = 'broadcast_started'; entry.broadcastAt = new Date().toISOString(); save();
  try {
    entry.submission = await rpc('octra_submit', [tx]);
    if (entry.submission.tx_hash !== entry.hash) throw new Error('Canonical transaction hash mismatch');
    entry.status = 'acknowledged'; save();
  } catch (error) { entry.status = 'uncertain'; save(); throw error; }
  console.log('Submitted', label, entry.hash);
  await awaitTransaction(entry);
  console.log('Confirmed', label);
  return entry;
}
function recipient() {
  const filename = '.benchmark-accounts/octra-official-guide-recipient.secret.json';
  if (!fs.existsSync(filename)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const pub = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
    const address = 'oct' + encodeBase58(crypto.createHash('sha256').update(pub).digest()).padStart(44, '1');
    fs.writeFileSync(filename, JSON.stringify({ network: 'devnet', address,
      publicKeyBase64: pub.toString('base64'), privateKeyBase64: seed.toString('base64') }, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 });
  }
  const account = JSON.parse(fs.readFileSync(filename));
  if (account.network !== 'devnet' || account.address === a.address) throw new Error('Invalid test recipient');
  return account.address;
}
async function view(method, params = []) {
  const response = await read('contract_call', [journal.contractAddress, method, params, a.address]);
  if (response.error || response.success === false) throw new Error('View failed: ' + method);
  return response.result;
}
async function main() {
  save();
  for (const file of files) {
    const dest = path.join(root, 'project', file.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, file.source);
  }
  journal.node = await read('node_status');
  journal.balanceBefore ??= await read('octra_balance', [a.address]);
  const fee = await read('octra_recommendedFee', ['program_deploy',
    { encrypted_data_len: Buffer.byteLength(compilation.deploy_payload) }]);
  const base = 200000 + Math.ceil(Buffer.byteLength(compilation.deploy_payload) / 1024) * 1000;
  if (![base, base * 2, base * 5].includes(Number(fee.minimum))) throw new Error('Unexpected program-package fee');
  journal.deploymentFeeOU = fee.minimum;
  if (!journal.contractAddress) {
    const preview = await read('octra_computeContractAddress', [compilation.bytecode, a.address, journal.balanceBefore.nonce + 1]);
    journal.contractAddress = preview.address; journal.preview = preview; save();
  }
  if (!process.argv.includes('--send')) {
    console.log(JSON.stringify({ status: 'prepared', address: journal.contractAddress,
      balance: journal.balanceBefore.balance, feeOU: fee.minimum, constructorParams }, null, 2)); return;
  }
  journal.status = 'running'; save();
  const current = await read('octra_balance', [a.address]);
  if (!journal.transactions.length && current.nonce + 1 !== journal.preview.nonce)
    throw new Error('Nonce changed since preview; prepare a new reviewed address');
  await send('deploy', 'program_deploy', journal.contractAddress, compilation.deploy_payload,
    JSON.stringify(constructorParams), journal.deploymentFeeOU);
  const metadata = await read('vm_contract', [journal.contractAddress]);
  check('owner', metadata.owner, a.address);
  check('deployed_code_hash', metadata.code_hash, sha(Buffer.from(compilation.bytecode, 'base64')));
  check('name', await view('get_name'), 'MyToken');
  check('symbol', await view('get_symbol'), 'MTK');
  check('decimals', String(await view('decimals')), '6');
  check('total_supply', String(await view('get_total_supply')), '1000000000000');
  check('token_owner', await view('get_owner'), a.address);
  journal.recipient ??= recipient(); save();
  const transfer = journal.transactions.find(tx => tx.label === 'transfer');
  if (!transfer) {
    check('initial_deployer_token_balance', String(await view('balance_of', [a.address])), '1000000000000');
    check('initial_recipient_token_balance', String(await view('balance_of', [journal.recipient])), '0');
  }
  const callFee = await read('octra_recommendedFee', ['call']);
  await send('transfer', 'call', journal.contractAddress, 'transfer',
    JSON.stringify([journal.recipient, 1000000]), callFee.recommended);
  check('recipient_token_balance_after_transfer', String(await view('balance_of', [journal.recipient])), '1000000');
  check('deployer_token_balance_after_transfer', String(await view('balance_of', [a.address])), '999999000000');
  check('total_supply_after_transfer', String(await view('get_total_supply')), '1000000000000');
  journal.sourceVerification = await read('contract_verify', [journal.contractAddress,
    files[0].source, files.slice(1)]);
  journal.balanceAfter = await read('octra_balance', [a.address]);
  journal.status = 'passed'; journal.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ status: journal.status, contractAddress: journal.contractAddress,
    checks: journal.checks.length, totalFeesOU: journal.transactions.reduce((sum, tx) => sum + BigInt(tx.ou), 0n).toString(),
    balanceAfter: journal.balanceAfter.balance, journal: journalPath }, null, 2));
}
let locked = false;
try { fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' }); locked = true; }
catch { throw new Error('Tutorial lock exists; inspect its process before continuing'); }
main().catch(error => {
  journal.status = 'stopped'; journal.error = error.cause?.code || error.message;
  save(); console.error('Official-guide run stopped:', journal.error); process.exitCode = 1;
}).finally(() => { if (locked) fs.unlinkSync(lockPath); });
