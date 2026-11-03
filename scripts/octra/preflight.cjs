const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { loadAccount } = require('./account.cjs');
const account = loadAccount();
const out = 'logs/octra-pilot';
fs.mkdirSync(out, { recursive: true });
const observations = [];
async function rpc(method, params = []) {
  const started = performance.now();
  try {
    const response = await fetch(account.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: observations.length + 1,
        method,
        params
      }),
      signal: AbortSignal.timeout(30000)
    });
    const body = await response.json();
    const record = {
      method,
      httpStatus: response.status,
      elapsedMs: performance.now() - started,
      response: body
    };
    observations.push(record);
    if (!response.ok || body.error || !Object.hasOwn(body, 'result'))
      throw new Error(body.error?.message || 'Invalid RPC response');
    return body.result;
  } catch (error) {
    if (!observations.some((x) => x.method === method))
      observations.push({
        method,
        elapsedMs: performance.now() - started,
        error: error.cause?.code || error.name
      });
    throw error;
  }
}
async function main() {
  const source = fs.readFileSync('contracts/octra/EnergyPilot.aml', 'utf8');
  const requests = [
    ['node_status', []],
    ['node_version', []],
    ['octra_balance', [account.address]],
    ['octra_recommendedFee', ['deploy']],
    ['octra_recommendedFee', ['call']],
    ['octra_compileAml', [source]],
    ['octra_listContracts', []]
  ];
  const results = await Promise.allSettled(
    requests.map(([method, params]) => rpc(method, params))
  );
  const values = Object.fromEntries(
    requests.map(([method], i) => [
      method +
        (method === 'octra_recommendedFee' ? ':' + requests[i][1][0] : ''),
      results[i].status === 'fulfilled'
        ? results[i].value
        : { probeError: String(results[i].reason.message) }
    ])
  );
  const compiled = values.octra_compileAml;
  const abi =
    typeof compiled.abi === 'string' ? JSON.parse(compiled.abi) : compiled.abi;
  const expectedMethods = ['store', 'add', 'scale', 'get_result'];
  const checks = {
    networkReachable: !values.node_status.probeError,
    compilationSucceeded:
      typeof compiled.bytecode === 'string' && compiled.bytecode.length > 0,
    expectedMethods: expectedMethods.every((name) =>
      abi?.functions?.some((fn) => fn.name === name)
    ),
    encryptedOpcodes: ['FHE_ADD', 'FHE_SCALE', 'FHE_DESER', 'FHE_SER'].every(
      (op) => compiled.disasm?.includes(op)
    )
  };
  const vendorCommits = Object.fromEntries(
    ['webcli', 'amlc', 'pvac'].map((name) => [
      name,
      cp
        .execFileSync(
          'git',
          ['-C', out + '/vendor/' + name, 'rev-parse', 'HEAD'],
          { encoding: 'utf8' }
        )
        .trim()
    ])
  );
  const balance = values.octra_balance;
  const accountMissing = balance.probeError === 'sender not found';
  const status = !Object.values(checks).every(Boolean)
    ? 'preflight_failed'
    : accountMissing
      ? 'blocked_funding'
      : 'preflight_passed_deployment_unverified';
  const report = {
    testedAt: new Date().toISOString(),
    status,
    endpoint: account.rpc,
    account: account.address,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    vendorCommits,
    checks,
    values,
    observations,
    onlineDeployment: 'not_attempted',
    encryptedOnlineCorrectness: 'not_verified'
  };
  fs.writeFileSync(
    out + '/online-preflight.json',
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(
    JSON.stringify(
      {
        checks,
        balance: values.octra_balance,
        fees: {
          deploy: values['octra_recommendedFee:deploy'],
          call: values['octra_recommendedFee:call']
        },
        compiler: compiled.version,
        bytecodeBytes: compiled.size,
        contractCount: Array.isArray(values.octra_listContracts)
          ? values.octra_listContracts.length
          : undefined,
        status,
        report: out + '/online-preflight.json'
      },
      null,
      2
    )
  );
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
}
main().catch((error) => {
  console.error('Octra preflight failed:', error.cause?.code || error.name);
  process.exitCode = 1;
});
