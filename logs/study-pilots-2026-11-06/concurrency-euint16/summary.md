# Concurrency and circuit studies

Execution complete: false. All trials valid: false. Local mock: false.
Local mock results validate implementation only; they are not public-network performance evidence.
Concurrency snapshots and final state are replayed in (blockNumber, transactionIndex) order. A different valid order/result is not an inconsistency.
Concurrency audits are deferred until all window receipts: audit-call latency is already-ready retrieval plus client RPC/SDK work, not transaction-to-FHE-completion latency.
Circuit completion is measured immediately from its prepared compute broadcast through equality-validated plaintext; setup input loading/readiness and signing are separate.
Receipts retain confirmed transactions whose later retrieval failed. Completion statistics use validated successes only. Failures are not zero-latency samples.
Exact known HCU rejections during estimateGas are capacity observations, without a compute broadcast or receipt. Their gas and completion latency are unavailable, not zero. Other errors still stop execution.
A resumed preparation reuses already-confirmed input loads, preserves the original failed preparation as an additional attempt, and has a separately scoped preparation duration. Source trial prefixes are immutable. Deployment and warmup are not repeated.
Binomial zero-bad-window bounds are conditional on independent windows, never IID requests; no robustness guarantee follows from zero observed failures.

| Case | Platform | Valid windows / attempted / planned | Valid requests / attempted / planned | Inconsistent | Incomplete | HCU rejected | Mean gas | Receipt ms (n) | Immediate circuit completion ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c1-independent | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-independent | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-independent | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-shared_sum | baseline | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-shared_sum | zama | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| concurrency-w16-c1-shared_sum | fhenix | 0/0/3 | 0/0/24 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
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

Actual recorded gas cost including setup/warmup: 406232454 wei.

Failure: execution reverted: Bad request
