# Expanded experimental evaluation

The existing `benchmark:pilot` / `benchmark:sepolia` commands retain the original energy lifecycle. The new `benchmark:expanded` command adds six parameterized suites, independent accounts, and analysis that accepts incomplete reports. All three platforms use separate contracts generated from one template with the same storage layout and operation graph.

## Implemented matrix

| Suite | Default sweep | Measured workload |
| --- | --- | --- |
| `width` | 16, 32, 64, 128 bits | Addition, ciphertext-by-ciphertext multiplication, comparison followed by selection, threshold tariff |
| `inputs` | 1, 4, 8, 16, 32 inputs at 64 bits | Fresh batch encryption/proof, import, and validation of every imported value |
| `depth` | 4, 8, 16, 32 inputs at 64 bits | Linear fold versus balanced sum; both use exactly N−1 encrypted additions and one persisted output |
| `chain` | 1, 2, 4, 8 transactions | Dependent `result = result * b + a`; one final decryption |
| `state` | 16, 64, 256 stored entries × 1, 4, 16 accessed entries | Fixed-index read or contiguous-range sum, with population excluded from measurement |
| `concurrency` | 1, 2, 4, 8 independent accounts | Closed-loop requests: encrypt two fresh values, import them, add them, decrypt and validate the sum |

The default is 46 cases per platform, three measured repetitions, and 16 **total** requests per load window. It is a pilot, not a publication-sized sample. The non-width sweeps use 64 bits. This avoids a full factorial matrix. Optional filters also support 8-bit integers, input count 2, chain length 16, state size 1024, and 32 touched entries.

The width sweep defaults to `--widths 16,32,64,128`. Generated plaintext, Zama and CoFHE contracts include native 128-bit variants; inputs and expected results use `bigint` and unsigned arithmetic modulo 2^128. Installed libraries expose the required 128-bit operations and encryption/decryption types. Local correctness tests cover plaintext and simulated Zama at 128 bits; compilation also checks the CoFHE contract. These checks do not establish public Sepolia service availability or performance.

The tariff selects price 7 or 3 using an encrypted comparison against an encrypted threshold. The price constants are trivially encrypted by the FHE contracts. `operationCount` records data-path arithmetic/comparison/selection calls, excluding imports, trivial encryption, and permission grants. `depth` is the logical dependency depth, not a measurement of internal bootstrapping or backend scheduling. No claim is made that a balanced expression forces a public service to execute it in parallel.

All values use unsigned arithmetic modulo 2^width. The plaintext contracts use `unchecked` arithmetic to match encrypted integer semantics. Tests exercise overflow explicitly. Datasets are seeded and reproducible; linear/tree reductions use the same plaintext operands, and batch-size/chain-length sweeps use matching input prefixes/operands. Each compute replicate gets freshly encrypted inputs and validates their readiness before timing computation.

State entries are individually imported ciphertexts, not repeated references to one handle. Every stored value is validated during setup. Separate contracts isolate state sizes. The read workload always starts at index zero, holding access location fixed as total state grows. Contract state here means arrays of stored handles/plaintext values; it does not measure an FHE service's total ciphertext-storage footprint. Repeated state measurements use the same populated data, so platform caching may affect them.

## Dedicated accounts and funding

Eight accounts have been generated for this workspace:

- Public funding addresses: `.benchmark-accounts/addresses.json`.
- Local private keys: `.benchmark-accounts/accounts.secret.json`.

The directory is ignored by Git. The generated files in this workspace have Windows permissions restricted to the current user. Back up the secret file privately; do not put it in a paper archive or commit it. Reports contain public addresses only. Local correctness tests use Hardhat's disposable accounts and do not use these Sepolia keys.

```powershell
npm run benchmark:accounts
npm run benchmark:accounts:balances
```

The first command prints public addresses and file locations. If keys already exist, it preserves them, even when `--count` changes. The second command reads balances without sending transactions. The existing mnemonic account remains the deployment/single-user signer; the eight generated accounts submit concurrent requests and sign their own decryption authorizations. Fund that existing owner as well as the workers.

The first accounts are reused in each larger cohort. For example, a default all-platform run requires 564 worker transactions from user-1, 270 from user-2, 120 each from users 3–4, and 42 each from users 5–8, assuming every planned warmup/window executes. These counts include load warmups and exclude owner deployment/setup. Funding cost depends on the actual gas used and fee conditions; use receipt gas/cost from a small pilot to size the full run. There is no automatic funding or transfer command.

One explicit nonce cursor per signer covers all transactions it sends. A local lock prevents two expanded load campaigns from using the same account file at once. Do not run the old lifecycle campaign, another wallet process, or a second owner-only experiment using the same owner simultaneously. A `campaign.lock` left after a process crash must only be removed after checking that the old process stopped and its pending transactions settled.

## Commands

Preview the matrix without reading accounts, connecting to a chain, or sending transactions:

```powershell
npm run benchmark:matrix
npm run benchmark:matrix -- --suite concurrency --users 1,2,4,8 --requests 8 --runs 1
```

After funding, start with an eight-request concurrency pilot on each platform:

```powershell
npm run benchmark:expanded -- --suite concurrency --platform baseline --users 1,2,4,8 --requests 8 --runs 1 --timeout 180
npm run benchmark:expanded -- --suite concurrency --platform zama --users 1,2,4,8 --requests 8 --runs 1 --timeout 600
npm run benchmark:expanded -- --suite concurrency --platform fhenix --users 1,2,4,8 --requests 8 --runs 1 --timeout 180
```

For cross-platform comparisons use the same timeout budget; the commands above are service/readiness pilots. A longer deadline does not resolve a persistent backend failure. The existing read-only diagnostic remains available for old lifecycle reports. Expanded failures retain result handles and SDK job traces in their own reports.

Run suites separately to control cost and inspection time:

```powershell
npm run benchmark:expanded -- --suite width --runs 30 --timeout 600
npm run benchmark:expanded -- --suite inputs,depth --runs 30 --timeout 600
npm run benchmark:expanded -- --suite chain --runs 30 --timeout 600
npm run benchmark:expanded -- --suite state --runs 30 --timeout 600
npm run benchmark:expanded -- --suite concurrency --runs 5 --requests 80 --timeout 600
```

`--requests` is the fixed total per platform/window, not per user, and must divide evenly by every selected user count. Eight requests suffice for a smoke test; 80 gives even the eight-user cohort ten requests per worker. Choose repetitions and request counts after assessing pilot variability and resources; these examples do not guarantee statistical power. Repeat campaigns in separate time windows and record network conditions before making broad claims.

For the complete default pilot matrix:

```powershell
npm run benchmark:expanded -- --suite all --runs 3 --requests 16 --timeout 600
```

`--output-dir` must be a fresh folder. Existing reports are never overwritten. The account path can be changed with `--accounts-file`; keep any replacement secret file outside version control.

## Timing and load semantics

- `inputPreparationMs`: local encryption/proof work plus any remote input approval, when part of the measured request.
- `transactionToReceiptMs`: first transaction invocation through observation of the last successful receipt. A chain includes each submission and intermediate receipt wait.
- `postReceiptMs`: final receipt observation through receipt-pinned getter, authorization, remote availability/decryption, and plaintext validation.
- `transactionToValidatedMs`: first transaction invocation through validated final plaintext.
- `endToEndMs`: the measured request from its start, including input preparation for import and load requests.

Compute-only cases have fresh input preparation/readiness in separate setup records. Chains do not decrypt intermediate results. Load requests have two transactions and one output decryption. There is no extra already-ready decryption delaying the next request. Import cases validate all N inputs: Zama uses a batch user-decrypt request, while the installed CoFHE view API is invoked sequentially per handle; this difference is part of the reported post-receipt cost, not encryption cost.

Each transaction has one `--timeout` budget covering submission and receipt. Final result retrieval/decryption/validation shares one further budget. Input preparation has its own budget. Thus `--timeout 600` does not mean the entire multi-transaction request is limited to 600 seconds. Polling and retries stay inside the corresponding observed intervals. No sleeps or metadata lookups are inserted between the final receipt and validation except SDK/service retries needed to retrieve the result.

Load workers are independent asynchronous loops in one Node process, with separate signers, nonces, SDK authorization, and caller-specific contract state. The client CPU, event loop, and RPC endpoint are shared; local proof generation may affect end-to-end throughput. This is a controlled single-client load generator, not eight isolated client machines or an open-loop offered-rate saturation test. Each worker has at most one logical request active. A slow worker does not hold a per-request barrier over faster workers. All current workers settle before the platform window ends. Platforms have separate windows, avoiding cross-platform service interference from simultaneous benchmark requests. Case order is seeded and randomized each repetition, and platform order rotates across repetitions.

The load-window clock starts immediately before launching the workers and stops after all workers settle, including failed/timeout requests and the final drain. Reported rates are validated logical requests, requests whose final receipt arrived, and individual observed transaction receipts per second, all using that same wall-time denominator. They are distinct metrics. Setup, warmup and writing the report happen outside this clock.

## Failures, reports and analysis

Each campaign writes `report.json`, `summary.json`, `summary.csv`, and `summary.md` under `logs/energy-experiments-*`. Reports include scenario parameters, source hashes, Git revision/dirty status, chain/mock identity, public addresses, per-transaction nonces/receipts/gas, SDK stages, setup records, and load windows. Setup and warmup are retained but excluded from measured latency summaries.

A failed warmup/setup blocks that case/platform. Other independent cases still run. Measured decryption failures after confirmed transactions are retained and independent requests can continue. An ambiguous transaction submission/receipt halts that account; the runner never guesses a new nonce or automatically resubmits it. Skipped work is reported as **not attempted**, rather than fabricated failure or success. `complete` means the planned measured requests were all attempted and settled; successful completion of the campaign does not imply every request validated. Any recorded failure produces a nonzero CLI exit code. Abrupt process termination can lose the currently running window; the last saved checkpoint remains analyzable.

Only an administrative timeout while awaiting post-receipt validation is marked as right-censored completion. Input/receipt timeouts and explicit SDK errors are separate failures. Completion latency statistics are conditional on success, and no complete-population latency mean/percentile is inferred by dropping censored observations. Input and receipt summaries retain observations even if a later stage fails. Report timeout budgets and success fractions alongside latency. The Wilson interval is descriptive and assumes independent attempts; it is not a dependence-corrected confidence claim. Throughput uncertainty resamples whole replicate windows, requiring at least three, rather than treating requests within one window as independent replicates. SDKs without cancellation support may keep a request running after the observation deadline; a recorded timeout does not claim server-side cancellation.

```powershell
npx hardhat benchmark:experiments:analyze --report logs/<expanded-campaign>/report.json
npm run analyze:availability -- logs/<any-lifecycle-or-expanded-campaign>/report.json
```

The availability analyzer works on old incomplete lifecycle reports as well as new reports, separates warmup from measurement, and needs only Python's standard library. Older schemas do not contain typed censoring information; their generic errors are not retrospectively relabeled as censored observations. The original `npm run analyze` retains its strict complete-lifecycle statistical checks.

## Local verification and code layout

```powershell
npm run verify
npx hardhat benchmark:experiments --platform baseline --suite all --runs 1 --requests 8
```

`npm test` runs Hardhat's local network and initializes Zama's simulator through the supported test task. Tests cover all four widths, overflow, linear/tree equivalence, dependent chains, state/ACL isolation, independent nonces, ambiguous/failed observations, account-file preservation, and full runner execution through baseline and mock Zama. CoFHE contracts compile against the pinned 0.2.0 library; their live SDK/service behavior requires a funded Sepolia pilot. Local results are explicitly marked `mock` and cannot establish remote service performance. The local Zama simulator serializes decryption to protect its shared event cursor; this simulator-only lock is absent on Sepolia.

For a standalone local Zama campaign, start `npx hardhat node` and run the task with `--network localhost --platform zama`. The plugin's CLI initializer does not support a fresh in-process `hardhat` network outside its test task.

- `scripts/generate-experiment-contracts.cjs`: common contract template; `npm run contracts:generate` regenerates the three Solidity files and `contracts:check` detects drift.
- `tasks/experiments/plan.ts`: matrix, operation IDs, deterministic data, reference arithmetic.
- `tasks/experiments/accounts.ts`: account creation/loading and account-file lock.
- `tasks/experiments/adapters.ts`: width-aware batch input/decryption adapters.
- `tasks/experiments/measurement.ts`: receipt-pinned measurement, deadlines, independent load loops.
- `tasks/experiments/runner.ts`: setup, shared signer nonce ownership, case scheduling and checkpoints.
- `tasks/experiments/report.ts`: failure-aware summaries and window-level throughput uncertainty.

These experiments broaden the tested workload classes. Conclusions should still be scoped to the pinned platforms, versions, testnet, client setup, operations and parameter ranges actually observed.
