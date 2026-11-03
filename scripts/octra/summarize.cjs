const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const base = 'logs/octra-pilot/';
const state = JSON.parse(fs.readFileSync(base + 'live-pilot.json', 'utf8'));
const views = JSON.parse(fs.readFileSync(base + 'live-views.json', 'utf8'));
const diagnostic = JSON.parse(fs.readFileSync(base + 'view-diagnostics.json', 'utf8'));
const preflight = JSON.parse(fs.readFileSync(base + 'online-preflight.json', 'utf8'));
async function read(method, params) {
  const response = await fetch(state.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(method + ': ' + (body.error?.message || 'HTTP error'));
  return body.result;
}
(async () => {
  const balance = await read('octra_balance', [state.address]);
  const result = await read('contract_call', [state.contractAddress, 'get_result', [], state.address]);
  const cipherFile = base + 'original-result-after-rejection.json';
  fs.writeFileSync(cipherFile, JSON.stringify({ ciphertext: result.result }) + '\n');
  const root = path.resolve('.').replaceAll('\\', '/');
  const wslRoot = '/mnt/' + root[0].toLowerCase() + root.slice(2);
  const plaintext = JSON.parse(cp.execFileSync('wsl', ['-d', 'Ubuntu-22.04', '--', 'python3',
    wslRoot + '/scripts/octra/local-probe.py', '--decrypt', wslRoot + '/' + cipherFile],
    { encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] }).trim()).value;
  const checks = {
    deployment: state.transactions.some(t => t.label === 'deploy' && t.receipt?.success === true),
    storage: state.checks.some(t => t.label === 'store' && t.correct && t.actual === '42'),
    readOnlyAddition: diagnostic.cases.some(t => t.method === 'add' && t.correct && t.actual === '59'),
    readOnlyScaling: diagnostic.cases.some(t => t.method === 'scale' && t.correct && t.actual === '126'),
    originalResultStill42: plaintext === '42',
    statefulCodeHashMatches: state.metadata?.code_hash === crypto.createHash('sha256')
      .update(Buffer.from(preflight.values.octra_compileAml.bytecode, 'base64')).digest('hex'),
    viewCodeHashMatches: views.codeHashVerified === true
  };
  const summary = { testedAt: new Date().toISOString(), endpoint: state.endpoint, address: state.address,
    status: Object.values(checks).every(Boolean) ? 'passed_scoped_checks' : 'partial',
    scope: 'deployment, encrypted storage roundtrip, read-only encrypted addition and scalar multiplication',
    checks, contracts: { stateful: state.contractAddress, readOnly: views.contractAddress },
    results: { stored: '42', sum: '59', scaled: '126' }, balance,
    transactions: [...state.transactions, ...views.transactions].map(t => ({ label: t.label, hash: t.hash,
      status: t.lastTransactionState?.status || t.status, epoch: t.lastTransactionState?.epoch,
      declaredOu: t.ou, receipt: t.receipt })),
    stateChangingArithmetic: { status: 'not_verified',
      observedFailure: state.transactions.find(t => t.label === 'add')?.lastTransactionState,
      diagnosis: 'Source-derived effort-budget explanation: low-fee calls receive 1,000,000 VM effort; loading this key costs about 1,262,744 effort before arithmetic. Not confirmed by a higher-budget write retry.',
      deferredByUser: true },
    readOnlyAttempts: diagnostic.cases,
    limitations: ['Feasibility check only; not a statistically replicated performance evaluation.',
      'Observed timeouts, HTTP 429 and Program view busy; successful read-only calls required bounded backoff.',
      'Inputs are synthetic; no input range proofs or multiuser/threshold behavior tested.'] };
  fs.writeFileSync(base + 'summary.json', JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ status: summary.status, checks, results: summary.results, balance: balance.balance,
    report: base + 'summary.json' }, null, 2));
  if (summary.status !== 'passed_scoped_checks') process.exitCode = 1;
})().catch(error => {
  fs.writeFileSync(base + 'summary-refresh-error.json', JSON.stringify({ at: new Date().toISOString(),
    error: error.message, note: 'The previous successfully verified summary is preserved.' }, null, 2) + '\n');
  console.error(error.message); process.exitCode = 1;
});
