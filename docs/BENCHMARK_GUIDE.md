# Sepolia Benchmark Guide

## 1. Scope

This repository reproduces the public-Sepolia comparison among:

1. `EnergyNotarizationPlainTest`, the plaintext EVM baseline;
2. `EnergyNotarizationFHETest`, using Zama fhEVM;
3. `EnergyLifecycleCoFHE`, using Fhenix CoFHE.

Each measured round executes `notarize`, `add`, `mul_scalar`, `mean`, and `max`. The benchmark deploys a fresh contract for every selected platform, performs one unmeasured warm-up per operation, and then executes a seeded, position-balanced interleaved schedule. With the default settings, the measured workload is 50 rounds x 5 operations x 3 platforms = 750 application transactions, in addition to 15 warm-up transactions and 3 deployments.

The study concerns observable operational performance. It does not claim to isolate internal TFHE, coprocessor, KMS, MPC, or relayer service execution that the public SDK does not expose.

## 2. Requirements

- Node.js 22 or newer (required by the pinned Zama relayer SDK);
- npm;
- Python 3.10 or newer for statistical analysis;
- a dedicated Sepolia account with enough ETH for all deployments and transactions;
- a stable Sepolia JSON-RPC endpoint supporting EIP-1898 block-hash `eth_call` requests;
- outbound access to the Zama and Fhenix services used by their SDKs.

The exact JavaScript dependency versions are pinned in `package.json` and `package-lock.json`. Python analysis versions are pinned in `scripts/analysis/requirements-lifecycle.txt`.

## 3. Installation

```bash
git clone https://github.com/DenInDev/energy-notarization-contracts.git
cd energy-notarization-contracts
npm ci
python -m venv .venv
source .venv/bin/activate
pip install -r scripts/analysis/requirements-lifecycle.txt
```

PowerShell activation:

```powershell
.venv\Scripts\Activate.ps1
```

## 4. Secrets and RPC configuration

The benchmark requires a mnemonic only to derive the funded Sepolia signer. Secrets are not present in the source tree.

Recommended Hardhat configuration:

```bash
npx hardhat vars set SEPOLIA_MNEMONIC
npx hardhat vars set SEPOLIA_RPC_URL
```

The same values can be supplied as environment variables:

```bash
export SEPOLIA_MNEMONIC="word1 word2 ... word12"
export SEPOLIA_RPC_URL="https://your-sepolia-rpc.example"
```

Use a dedicated account containing only the funds needed by the campaign. Do not reuse a production wallet or commit a mnemonic to Git.

## 5. Build and infrastructure tests

```bash
npm run compile
npm test
npm run analysis:test
```

The TypeScript tests check timing semantics, deterministic balanced scheduling, canonical block-hash reads, retry boundaries, plaintext validation, and safe HTTP instrumentation. The Python test constructs a complete synthetic report and verifies the analysis outputs.

## 6. Pilot campaign

Run a short three-round campaign before spending funds on the full experiment:

```bash
npm run benchmark:pilot
```

Equivalent explicit command:

```bash
npx hardhat benchmark:energy:lifecycle \
  --network sepolia \
  --runs 3 \
  --platform all \
  --seed pilot \
  --timeout 180
```

The task refuses any network whose chain ID is not Sepolia's `11155111`.

## 7. Full interleaved campaign

```bash
npm run benchmark:sepolia
```

Equivalent explicit command:

```bash
npx hardhat benchmark:energy:lifecycle \
  --network sepolia \
  --runs 50 \
  --platform all \
  --seed reviewer-revision-20260917 \
  --timeout 180 \
  --output-dir logs/sepolia-interleaved-50
```

Supported `--platform` values are `all`, `both`, `baseline`, `zama`, and `fhenix`. Statistical cross-platform analysis requires a complete `all` campaign. Transactions are sent sequentially and the script waits for one receipt before continuing. There is no MetaMask interaction and no transaction batching.

## 8. Measurement semantics

For every successful sample, the task validates the decrypted or plaintext result against the expected value. The primary durations are:

- `inputPreparationMs`: encryption and input-proof preparation required by a notarization sample;
- `confirmationMs`: transaction submission to the first observed successful receipt;
- `postReceiptToValidatedPlaintextMs`: receipt observation to validated plaintext availability;
- `transactionToValidatedPlaintextMs`: transaction submission to validated plaintext availability;
- `alreadyReadyDecryptMs`: a separate repeat decryption after readiness has already been established.

The timing identity enforced by the analyzer is:

```text
transactionToValidatedPlaintextMs
  = confirmationMs + postReceiptToValidatedPlaintextMs
```

For a full client-observed notarization lifecycle, add the non-overlapping input-preparation duration:

```text
inputPreparationMs + transactionToValidatedPlaintextMs
```

Do not add `alreadyReadyDecryptMs` to this total. It is an ancillary measurement of later access to an already-ready result. SDK sub-stages and HTTP spans can overlap; they are diagnostic observations and must not be summed blindly.

Receipt observation is one inclusion confirmation, not consensus finality.

## 9. Interleaving and warm-up

For each operation and round, the scheduler permutes the three configurations. Across 50 rounds, each platform appears in every submission position either 16 or 17 times. The seed makes the order reproducible.

Every platform-operation pair receives one unmeasured warm-up transaction before measured rounds begin. This initializes contract state and avoids comparing a first cold write with later warm updates. Warm-up observations remain in `report.json` for audit but are excluded from statistics.

## 10. Output files

Each campaign creates a new folder under `logs/` unless `--output-dir` is specified:

- `schedule.json`: seed and planned interleaving order;
- `report.json`: complete configuration, machine metadata, setup records, samples, block metadata, gas, timings, errors, and completion status;
- `stages.jsonl`: one timing-stage record per line for SDK and HTTP diagnostics;
- `summary.md`: immediate descriptive overview produced by the benchmark.

The task never overwrites an existing `report.json`. If setup, warm-up, a primary SDK call, a transaction, result retrieval, or plaintext validation fails, the partial report is retained and the campaign exits unsuccessfully. Transport failures during result retrieval are retried up to five times with bounded exponential backoff; semantic and authorization failures are not retried.

Result getters are executed with EIP-1898 against the receipt block hash and `requireCanonical: true`. This prevents a later `latest` state from being mistaken for the result associated with the measured transaction.

## 11. Statistical analysis

Analyze a completed three-platform report:

```bash
npm run analyze -- logs/sepolia-interleaved-50/report.json
```

The analyzer first verifies completeness, expected plaintexts, timing identities, transaction/block provenance, schedule conformance, and position balance. It also computes the full client lifecycle (`inputPreparationMs + transactionToValidatedPlaintextMs`) and round-matched FHE/baseline lifecycle ratios. It then writes:

- `analysis.json`;
- `operational-performance.md`;
- `operational-performance.tex`.

Reported descriptive statistics use sample standard deviation. Direct comparisons are paired by operation and round, preserving the interleaved design. Paired t-tests are performed on receipt/completion differences and Holm-adjusted across that 30-test family. Full-lifecycle comparisons use paired log ratios, geometric mean FHE/baseline ratios, and a separate Holm correction across ten tests. Circular block-bootstrap confidence intervals are included as a dependence-sensitive check. These are pointwise intervals, not simultaneous confidence bands.

## 12. Reproducibility metadata

`report.json` records:

- campaign start and completion timestamps;
- chain ID and redacted RPC host;
- signer address;
- contract names, deployed addresses, deployment transactions, blocks, gas, and bytecode hashes;
- SDK and contract-library versions;
- OS, CPU, logical CPU count, RAM, architecture, and Node version;
- transaction hashes, block numbers, block hashes, block timestamps, gas limits, block gas usage, and target utilization;
- all warm-up and measured sample outcomes.

The Solidity configuration is compiler `0.8.27`, optimizer enabled with 800 runs, Cancun EVM, and `viaIR` disabled.

## 13. Interpretation limits

The public SDKs expose client-side phases, network calls, polling, and validated result availability, but they do not expose a trustworthy isolated duration for every internal cryptographic service. Consequently:

- receipt latency is affected by Sepolia inclusion and current public-network load;
- completion latency includes observable post-receipt service delay and SDK polling;
- individual TFHE, coprocessor, KMS, or MPC execution times must not be inferred from the residual as if it were a direct server timer;
- the interleaved schedule reduces temporal confounding but cannot make public Sepolia deterministic;
- a failed or incomplete campaign must not be silently reduced to successful observations.

## 14. Publishing a run

Generated logs are ignored by Git because they may contain large raw traces and endpoint metadata. For an archival release, inspect the report for sensitive endpoint information, publish the selected result folder as a release asset, and record its SHA-256 digest in the paper or artifact manifest.
