# Concurrency and circuit studies

Execution complete: true. All trials valid: false. Local mock: false.
Local mock results validate implementation only; they are not public-network performance evidence.
Concurrency snapshots and final state are replayed in (blockNumber, transactionIndex) order. A different valid order/result is not an inconsistency.
Concurrency audits are deferred until all window receipts: audit-call latency is already-ready retrieval plus client RPC/SDK work, not transaction-to-FHE-completion latency.
Circuit completion is measured immediately from its prepared compute broadcast through equality-validated plaintext; setup input loading/readiness and signing are separate.
Receipts retain confirmed transactions whose later retrieval failed. Completion statistics use validated successes only. Failures are not zero-latency samples.
Exact known HCU rejections during estimateGas are capacity observations, without a compute broadcast or receipt. Their gas and completion latency are unavailable, not zero. Other errors still stop execution.
A resumed preparation reuses already-confirmed input loads, preserves the original failed preparation as an additional attempt, and has a separately scoped preparation duration. Source trial prefixes are immutable. Deployment and warmup are not repeated.
Late read-only audits, including measured windows, are stored separately and excluded from original latency statistics. Reincluded receipts retain their first-observed raw fields; supplementary canonical evidence supplies only identity, order and actual gas cost. No canonical latency is reconstructed. Controls explicitly flag late audits.
Binomial zero-bad-window bounds are conditional on independent windows, never IID requests; no robustness guarantee follows from zero observed failures.

| Case | Platform | Valid windows / attempted / planned | Valid requests / attempted / planned | Inconsistent | Incomplete | HCU rejected | Mean gas | Receipt ms (n) | Immediate circuit completion ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c1-independent | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407653.0 | 11374.6 (24) | -- (0) |
| concurrency-w16-c1-independent | zama | 2/3/3 | 16/24/24 | 0 | 1 | 0 | 989680.7 | 14929.8 (23) | -- (0) |
| concurrency-w16-c1-independent | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813325.0 | 12742.0 (24) | -- (0) |
| concurrency-w16-c1-shared_sum | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407394.5 | 15026.1 (24) | -- (0) |
| concurrency-w16-c1-shared_sum | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989413.8 | 14537.1 (24) | -- (0) |
| concurrency-w16-c1-shared_sum | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813069.0 | 13794.1 (24) | -- (0) |
| concurrency-w16-c1-shared_ordered | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 395342.5 | 15675.6 (24) | -- (0) |
| concurrency-w16-c1-shared_ordered | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 1009304.8 | 12119.4 (24) | -- (0) |
| concurrency-w16-c1-shared_ordered | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 845737.0 | 12146.9 (24) | -- (0) |
| concurrency-w16-c2-independent | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 419896.5 | 14786.3 (24) | -- (0) |
| concurrency-w16-c2-independent | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989677.2 | 10257.1 (24) | -- (0) |
| concurrency-w16-c2-independent | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813325.0 | 17849.2 (24) | -- (0) |
| concurrency-w16-c2-shared_sum | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407396.5 | 12965.7 (24) | -- (0) |
| concurrency-w16-c2-shared_sum | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989414.3 | 11274.3 (24) | -- (0) |
| concurrency-w16-c2-shared_sum | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813070.5 | 14512.8 (24) | -- (0) |
| concurrency-w16-c2-shared_ordered | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 395347.0 | 17431.4 (24) | -- (0) |
| concurrency-w16-c2-shared_ordered | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 1009297.5 | 12140.0 (24) | -- (0) |
| concurrency-w16-c2-shared_ordered | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 845733.0 | 12801.9 (24) | -- (0) |

Actual recorded gas cost including setup/warmup: 10602020178 wei.

No error recorded.
