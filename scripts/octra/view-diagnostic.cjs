// Read-only diagnostics against the already deployed pilot; never sends a transaction.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const report = JSON.parse(fs.readFileSync('logs/octra-pilot/live-views.json', 'utf8'));
const fixture = JSON.parse(fs.readFileSync('logs/octra-pilot/fixtures.json', 'utf8'));
const file = 'logs/octra-pilot/view-diagnostics.json';
const output = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) :
  { testedAt: new Date().toISOString(), endpoint: report.endpoint, contract: report.contractAddress,
    address: report.address, scope: 'read-only online arithmetic', cases: [] };
if (output.address !== report.address || output.contract !== report.contractAddress) throw new Error('Diagnostic report mismatch');
function save() { fs.writeFileSync(file, JSON.stringify(output, null, 2) + '\n'); }
async function check(method, params, expected) {
  const started = performance.now();
  const row = { method, expected: String(expected), correct: false, timeoutMs: 60000 };
  output.cases.push(row); save();
  try {
    const response = await fetch(report.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'contract_call',
        params: [report.contractAddress, method, params, report.address] }), signal: AbortSignal.timeout(row.timeoutMs) });
    row.httpStatus = response.status;
    const body = await response.json(); row.elapsedMs = performance.now() - started;
    if (body.error) { row.rpcError = body.error; save(); return; }
    const ciphertext = body.result?.result;
    if (!response.ok || typeof ciphertext !== 'string' || !ciphertext) throw new Error('Missing result ciphertext');
    const cipherFile = 'logs/octra-pilot/online-result-view-' + method + '.json';
    fs.writeFileSync(cipherFile, JSON.stringify({ ciphertext }) + '\n');
    const root = path.resolve('.').replaceAll('\\', '/');
    const wslRoot = '/mnt/' + root[0].toLowerCase() + root.slice(2);
    const plaintext = cp.execFileSync('wsl', ['-d', 'Ubuntu-22.04', '--', 'python3',
      wslRoot + '/scripts/octra/local-probe.py', '--decrypt', wslRoot + '/' + cipherFile],
      { encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
    row.actual = JSON.parse(plaintext.trim()).value;
    row.correct = row.actual === row.expected;
    row.ciphertextSha256 = crypto.createHash('sha256').update(ciphertext).digest('hex');
  } catch (error) {
    row.elapsedMs = performance.now() - started;
    row.error = error.name === 'TimeoutError' ? 'RPC response deadline exceeded' : error.name;
  }
  save();
}
(async () => {
  // Single outstanding view: avoid parallel calls to the node's serialized view lane.
  if (!output.cases.some(row => row.method === 'scale' && row.correct)) {
    await check('scale', [fixture.left, 3], 126);
    console.log(JSON.stringify(output.cases.at(-1)));
  }
  for (let attempt = 0; attempt < 3 && !output.cases.some(row => row.method === 'add' && row.correct); attempt++) {
    if (output.cases.some(row => row.method === 'add')) await new Promise(resolve => setTimeout(resolve, 15000 * (attempt + 1)));
    await check('add', [fixture.left, fixture.right], 59);
    console.log(JSON.stringify(output.cases.at(-1)));
    const last = output.cases.at(-1);
    const busy = /busy|capacity reached/i.test(last.rpcError?.message || '');
    if (!last.correct && last.httpStatus !== 429 && last.error !== 'RPC response deadline exceeded' && !busy) break;
  }
  output.status = ['scale', 'add'].every(method => output.cases.some(row => row.method === method && row.correct)) ? 'passed' : 'failed'; save();
  if (output.status !== 'passed') process.exitCode = 1;
})().catch(error => { console.error(error.name); process.exitCode = 1; });
