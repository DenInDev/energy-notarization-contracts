# Energy Notarization Contracts

Reproducible public-Sepolia benchmark comparing three implementations of the same energy-notarization lifecycle:

- Plaintext EVM baseline;
- Zama fhEVM;
- Fhenix CoFHE.

The campaign measures gas, input preparation, transaction to receipt latency, transaction-to validated plaintext completion and decryption of an already-ready result. Each operation runs concurrently across platforms using asynchronous workers, including warmup. A seeded, position balanced schedule assigns launch positions and unique nonces from the existing funded account. One nonce allocator covers deployment through the final round. Transactions still execute in sender nonce order. All workers finish before the next operation starts; deployments are sequential. Use a dedicated account with no other transaction producer during the campaign.

## Quick start

```bash
npm ci
npx hardhat vars set SEPOLIA_MNEMONIC
npx hardhat vars set SEPOLIA_RPC_URL
npm run compile
npm run typecheck
npm test
npm run benchmark:pilot
```

`--timeout` controls the observation deadline per receipt or SDK operation, including setup and warmup. Use `--setup-timeout` only to override the setup limit, for example `npm run benchmark:pilot -- --timeout 600 --setup-timeout 120`. Both effective limits are printed at startup. The campaign stops at the first failed setup stage or comparison and retains the failed observations.

Run the complete campaign only after the pilot succeeds and the benchmark account is sufficiently funded:

```bash
npm run benchmark:sepolia
```

If Zama reports that a ciphertext is not ready on the gateway, recheck the latest persisted handle without deploying or sending transactions:

```bash
npx hardhat benchmark:energy:diagnose --network sepolia --report logs/<campaign>/report.json --timeout 30
```

This diagnostic signs a decryption authorization, writes a separate trace, and leaves the original campaign results intact. Success means the old ciphertext is available now; its timing does not replace the failed benchmark observation.

An observation deadline is reported as `timed_out`, with the last observed USER_DECRYPT job state and job ID when available. It exits with code 1 and retains the trace, without an unexpected-error stack for this expected outcome. SDK failures remain errors; a previously queued job does not turn a later SDK failure into a timeout.

For recurring gateway-readiness failures, check the saved handle before spending funds on another deployment. The [readiness investigation](docs/ZAMA_READINESS_INVESTIGATION.md) records a standalone control whose gateway material consensus arrived over two hours after Sepolia inclusion and which subsequently decrypted successfully.

Analyze a completed report:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r scripts/analysis/requirements-lifecycle.txt
npm run analyze -- logs/<campaign>/report.json
```

On PowerShell, activate the environment with `.venv\Scripts\Activate.ps1`.


## Expanded experimental suites

Width, input-count, circuit-depth, transaction-chain, growing-state, and independent-account concurrency sweeps are available through `npm run benchmark:expanded`.

```powershell
npm run benchmark:accounts
npm run benchmark:matrix
npm run verify
```

The matrix preview sends no transactions. Eight generated Sepolia worker accounts are kept in the ignored `.benchmark-accounts/` directory; the existing owner pays deployment and single-user setup.

## Repository layout

- `contracts/`: benchmark contracts for the three configurations.
- `tasks/benchmarkEnergyLifecycle.ts`: interleaved Sepolia campaign.
- `tasks/lifecycle/`: campaign orchestration, per-platform SDK adapters, operation dispatch, measurement, and reporting. The Hardhat task only declares CLI options and delegates to the campaign runner.
- `tasks/lib/`: timing, scheduling, canonical result reads, and retry policy.
- `scripts/analysis/`: validation and statistical analysis.
- `test/`: deterministic unit tests for benchmark infrastructure.

Dedicated worker keys are stored locally in the ignored `.benchmark-accounts/` directory. Never commit that directory, `.env`, or generated logs.
