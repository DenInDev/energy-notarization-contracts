# Sepolia Benchmark Guide

This guide covers the original five-operation lifecycle. The additional width, depth, input-count, chain, state, and multi-account experiments are documented in [EXPANDED_EXPERIMENTS.md](EXPANDED_EXPERIMENTS.md).

## 1. Scope

This repository reproduces the public-Sepolia comparison among:

1. `EnergyNotarizationPlainTest`, the plaintext EVM baseline;
2. `EnergyNotarizationFHETest`, using Zama fhEVM;
3. `EnergyLifecycleCoFHE`, using Fhenix CoFHE.

Each measured round executes `notarize`, `add`, `mul_scalar`, `mean`, and `max`. The benchmark deploys a fresh contract for every selected platform, performs one unmeasured warm-up per operation, and then executes a seeded, position-balanced interleaved schedule. With the default settings, the measured workload is 50 rounds x 5 operations x 3 platforms = 750 application transactions, in addition to 15 warm-up transactions and 3 deployments.

New energy campaigns use mixed widths: individual readings are unsigned 16-bit values in Wh (0–65,535 Wh per measurement interval), while cumulative totals and arithmetic results are 64-bit. Every computation widens the reading to 64 bits before addition, multiplication, mean or maximum; the conversion cost is included in the transaction measurement. The timestamp remains public `uint64`. Readings are synthetic; the benchmark does not validate a physical meter or prescribe an acquisition interval. Its configured inputs and accumulated values remain within the respective ranges. `mean` averages the latest reading and the cumulative total, not the complete history; `max` compares those same two values. Only the latest reading is retained.

Lifecycle schemas 9 and later record these widths and units in `energyRepresentation`. Earlier all-64-bit reports describe a different workload and must not be pooled with the new mixed-width results. Existing deployed contracts are unchanged; the campaign deploys the updated contracts afresh. The generic width suite remains a separate experiment.

The study concerns observable operational performance. It does not claim to isolate internal TFHE, coprocessor, KMS, MPC, or relayer service execution that the public SDK does not expose.

## 2. Requirements

- Node.js 22 or newer (required by the pinned Zama relayer SDK);
- npm;
- Python 3.10 or newer for statistical analysis;
- a dedicated Sepolia account with enough ETH for all deployments and transactions;
- three locally saved funded platform accounts for the default isolated-process campaign;
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

The lifecycle CLI uses the first three saved keys under the ignored `.benchmark-accounts/` directory: baseline=user-1, Zama=user-2, Fhenix=user-3. `node scripts/run-energy-campaign.cjs 1` runs a one-round pilot; use `50` for the full campaign. This launcher bypasses the legacy mnemonic configuration. A mnemonic remains necessary for workflows that explicitly use the old configured signer. No secrets are version-controlled.

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

Supported `--platform` values are `all`, `both`, `baseline`, `zama`, and `fhenix`. Statistical cross-platform analysis requires a complete `all` campaign. For each operation and round, one asynchronous worker per selected platform prepares and submits its transaction, observes its receipt, and retrieves its result concurrently with the other workers. Warmup follows the same concurrent operation comparisons. All current workers settle before the next operation begins, including after failure. Deployments remain sequential. There is no MetaMask interaction and no transaction batching.

Workers use three distinct saved accounts by default (`--accounts-file`). Each platform deploys and calls its own contract with its assigned signer, using a dedicated nonce cursor initialized from raw RPC. Pending nonces must match confirmed nonces before starting. The account-file lock excludes concurrent campaigns or local funding scripts. Do not use these accounts elsewhere during a run. These are asynchronous workers in one Node process. Input preparation durations can differ, so concurrent launch does not guarantee simultaneous submission or inclusion in the same block. Schema 10 records `platformOwners` and `signerMode`; the legacy `owner` field identifies the primary account. Earlier shared-account reports retain their recorded methodology.

`--timeout` defaults to 180 seconds and applies to measured stages as well as setup and warmup. `--setup-timeout` optionally overrides the deadline per deployment receipt, setup read, SDK initialization, or warmup observation stage; otherwise it inherits `--timeout`. Both effective limits are printed at startup. These are individual observation deadlines, not a total campaign deadline. A failed deployment/setup stage aborts immediately; a failed warmup or measured comparison aborts after its current workers settle. Increasing a deadline permits a longer observation; it does not make gateway ciphertext material available or fix a persistent readiness failure.

The specific Zama 503 `USER_DECRYPT` ciphertext-not-ready response may start another read request while the observation budget remains. Receipt-block `block not found` errors during bytecode or result reads likewise retry within the original deadline, always against the same hash with `requireCanonical: true`. These two conditions are not capped at five attempts; backoff increases from 1 to 8 seconds and stays capped there. Other retryable read failures retain the five-attempt limit. Non-canonical blocks, plaintext mismatches and semantic failures still fail. All attempts and backoff remain part of the recorded latency; transactions are never resubmitted by this read retry.

## 8. Measurement semantics

### Decryption polling policy (new campaigns only)

Node benchmark SDKs use a locally maintained, version-checked patch with a 100ms base decryption polling interval. `npm ci` reapplies it through `postinstall`; `npm run sdk:patch-polling` verifies/reapplies it idempotently. The patch targets Zama user decryption and CoFHE view decryption only; encryption polling, cryptography, access checks and transaction logic are unchanged. It returns immediately on a completed response. CoFHE pending POST and GET responses wait 100ms unless a server `Retry-After` requires longer. HTTP rate-limit errors remain failures, not rapid retries.

Zama's public service commonly sends `Retry-After: 2`, so a 100ms base does **not** imply 100ms effective polling there: server delays are preserved. Effective Zama delays are recorded in SDK progress events, and CoFHE wait events record the chosen interval after a pending response. Requests are sequential; HTTP duration adds to the interval, so this is a wait between attempts, not a guaranteed 10 requests/second. Transport/ACL error backoff is separate from pending-result polling.

Lifecycle schema 11 and expanded report methodology record the requested interval, patch identifier and SHA-256 hashes of the patched SDK bundles. SDK versions remain pinned; changing versions requires reviewing the patch rather than silently applying it to new code. Previously collected reports and timings are unchanged and must not be relabeled as 100ms-polling measurements. This policy does not remove the shared-process input-preparation interference identified in the earlier campaign.

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

For each operation and round, the scheduler permutes the three configurations. Across 50 rounds, each platform appears in every worker launch/nonce assignment position either 16 or 17 times. The seed makes the order reproducible. The recorded `orderPosition` identifies this planned assignment, not actual network arrival order.

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

## 15. Continuing an interrupted energy campaign

`node scripts/continue-energy-campaign.cjs SOURCE/report.json NEW_OUTPUT_DIRECTORY`
continues only the unattempted schedule on the existing contracts. It requires a settled,
receipt-confirmed schedule prefix and the original three saved signers. Before sending,
it verifies canonical receipts, exact nonces (latest equals pending equals the checkpoint),
deployed bytecode and decrypted last reading, total and result. Ambiguous submissions,
changed state, changed workload/dependencies or changed polling bundles block continuation.

The source report stays unchanged. The new report retains all historical samples and
records a separate continuation segment with source hash, code hashes, preflight traces
and any late value recovery. Late recovery never supplies a missing latency or replaces
a failed ready-repeat. `executionComplete: true` means all planned operations were attempted;
`complete` stays false when a historical primary failure remains. Analyze failures and
segments explicitly; do not feed this report to the strict all-valid campaign analyzer
as if it were an uninterrupted successful campaign.

Zama HTTP 503 responses for `USER_DECRYPT`, including schema-invalid proxy responses,
now allow at most five read attempts within the original deadline. All waits remain in
the measurement. This does not retry transactions or other HTTP status/operation errors.

## 16. Isolated processes and a prepared submission barrier (schema 12)

New lifecycle campaigns default to `--execution processes`. Each platform runs in
its own persistent Node process with its own saved signer and nonce cursor. SDK
proof generation therefore cannot block another platform's Node event loop.
CPU, operating-system scheduling and network resources are still shared.

For each operation, all workers first prepare their input, populate and estimate
the transaction, and sign it. One EIP-1559 fee quote is shared across platforms.
The coordinator journals every prepared hash and nonce, then releases a common
submission barrier. A failed preparation cancels the barrier: no worker sends.
The report records the actual spread between broadcast start timestamps rather
than claiming exact simultaneity or guaranteed inclusion in the same block.

The mutation uses one direct `eth_sendRawTransaction` HTTP request, bypassing
Hardhat's automatic HTTP-429 retries. Redirects and retries are disabled. A lost
or rejected acknowledgement is retained as uncertain; never resend it blindly.
Signed payloads and private keys are not included in IPC or reports.

New sample fields distinguish `preparationMs`, `transactionPreparationMs`,
`barrierWaitMs`, `broadcastStartedAt`, `broadcastAcknowledgedAt`,
`broadcastAckMs` and `broadcastToReceiptMs`. Receipt polling is immediate and
then every 500 ms after pending replies. Decryption retains the 100 ms base
policy and larger server Retry-After hints. Primary completion ends at equality-
validated plaintext; the already-ready repeat remains separate.

For schema 12, client lifecycle means preparationMs plus
transactionToValidatedPlaintextMs: input work plus estimation/signing plus
broadcast-to-validated completion, excluding intentional barrier waiting. Full
worker wall time includes that wait and must be labeled separately. Historical
shared-process reports use different timing boundaries and must not be pooled
with the new protocol. `--execution async` explicitly selects the legacy runner.
The continuation command dispatches schema-12 sources to the isolated coordinator;
the legacy planner still rejects them. Pass the same saved account file as the
fourth argument of `scripts/continue-energy-campaign.cjs`. It never deploys or
repeats warmups or settled comparisons. All three children verify canonical
receipts, exact latest/pending nonces, deployed bytecode and decrypted
last/total/result state before the next prepared submission barrier.

A receipt first recovered after a timeout is kept in the continuation segment's
`supplementaryReceipts`; it does not supply a historical inclusion latency or
turn the failed sample into a success. The original raw report and serialized
sample prefix remain unchanged and are checked at every save. Recovery plaintext
is separate from primary measurements and already-ready repeats. Completion of
the remaining schedule sets `executionComplete`, while `complete` remains false
if any historical primary failed. Analyze the interrupted segments descriptively
with explicit denominators, rather than applying the strict all-valid analyzer.
