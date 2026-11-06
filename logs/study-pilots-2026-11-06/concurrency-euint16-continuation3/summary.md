# Concurrency and circuit studies

Execution complete: false. All trials valid: false. Local mock: false.
Local mock results validate implementation only; they are not public-network performance evidence.
Concurrency snapshots and final state are replayed in (blockNumber, transactionIndex) order. A different valid order/result is not an inconsistency.
Concurrency audits are deferred until all window receipts: audit-call latency is already-ready retrieval plus client RPC/SDK work, not transaction-to-FHE-completion latency.
Circuit completion is measured immediately from its prepared compute broadcast through equality-validated plaintext; setup input loading/readiness and signing are separate.
Receipts retain confirmed transactions whose later retrieval failed. Completion statistics use validated successes only. Failures are not zero-latency samples.
Exact known HCU rejections during estimateGas are capacity observations, without a compute broadcast or receipt. Their gas and completion latency are unavailable, not zero. Other errors still stop execution.
A resumed preparation reuses already-confirmed input loads, preserves the original failed preparation as an additional attempt, and has a separately scoped preparation duration. Source trial prefixes are immutable. Deployment and warmup are not repeated.
A late warmup audit is stored separately, does not replay any send, and never replaces original timing fields or enters measured/already-ready latency statistics. Controls explicitly flag its use.
Binomial zero-bad-window bounds are conditional on independent windows, never IID requests; no robustness guarantee follows from zero observed failures.

| Case | Platform | Valid windows / attempted / planned | Valid requests / attempted / planned | Inconsistent | Incomplete | HCU rejected | Mean gas | Receipt ms (n) | Immediate circuit completion ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c1-independent | baseline | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 407658.0 | 11560.5 (8) | -- (0) |
| concurrency-w16-c1-independent | zama | 0/1/3 | 0/8/24 | 0 | 1 | 0 | 989680.5 | 18568.4 (8) | -- (0) |
| concurrency-w16-c1-independent | fhenix | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 813319.5 | 11943.4 (8) | -- (0) |
| concurrency-w16-c1-shared_sum | baseline | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 407395.0 | 12744.3 (8) | -- (0) |
| concurrency-w16-c1-shared_sum | zama | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 989422.0 | 12355.5 (8) | -- (0) |
| concurrency-w16-c1-shared_sum | fhenix | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 813068.5 | 10592.1 (8) | -- (0) |
| concurrency-w16-c1-shared_ordered | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-shared_ordered | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-shared_ordered | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-independent | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-independent | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-independent | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_sum | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_sum | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_sum | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_ordered | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_ordered | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c2-shared_ordered | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |

Actual recorded gas cost including setup/warmup: 4840041649 wei.

Failure: Duplicate or noncanonical Applied event
