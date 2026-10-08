# Energy Notarization Contracts

Reproducible public-Sepolia benchmark comparing three implementations of the same energy-notarization lifecycle:

- plaintext EVM baseline;
- Zama fhEVM;
- Fhenix CoFHE.

The campaign measures gas, input preparation, transaction-to-receipt latency, transaction-to-validated-plaintext completion, the post-receipt completion tail, and decryption of an already-ready result. It uses position-balanced, seeded interleaving across platforms instead of running each platform in a separate time window.

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

Run the complete campaign only after the pilot succeeds and the benchmark account is sufficiently funded:

```bash
npm run benchmark:sepolia
```

Analyze a completed report:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r scripts/analysis/requirements-lifecycle.txt
npm run analyze -- logs/<campaign>/report.json
```

On PowerShell, activate the environment with `.venv\Scripts\Activate.ps1`.

The complete setup, measurement semantics, output schema, and reproducibility procedure are in [docs/BENCHMARK_GUIDE.md](docs/BENCHMARK_GUIDE.md).

## Repository layout

- `contracts/`: benchmark contracts for the three configurations.
- `tasks/benchmarkEnergyLifecycle.ts`: interleaved Sepolia campaign.
- `tasks/lib/`: timing, scheduling, canonical result reads, and retry policy.
- `scripts/analysis/`: validation and statistical analysis.
- `test/`: deterministic unit tests for benchmark infrastructure.

No wallet secret is stored in this repository. Use a dedicated benchmark account and never commit `.env` or generated logs.
