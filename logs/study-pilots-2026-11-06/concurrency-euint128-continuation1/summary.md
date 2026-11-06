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
| concurrency-w128-c1-independent | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407921.5 | 12984.9 (24) | -- (0) |
| concurrency-w128-c1-independent | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989825.7 | 15493.4 (24) | -- (0) |
| concurrency-w128-c1-independent | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813408.0 | 13414.5 (24) | -- (0) |
| concurrency-w128-c1-shared_sum | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407667.0 | 12217.7 (24) | -- (0) |
| concurrency-w128-c1-shared_sum | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989564.8 | 14067.2 (24) | -- (0) |
| concurrency-w128-c1-shared_sum | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813148.0 | 13806.7 (24) | -- (0) |
| concurrency-w128-c1-shared_ordered | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 395627.5 | 12517.7 (24) | -- (0) |
| concurrency-w128-c1-shared_ordered | zama | 2/3/3 | 16/24/24 | 0 | 1 | 0 | 1009603.2 | 15634.6 (23) | -- (0) |
| concurrency-w128-c1-shared_ordered | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 845884.5 | 12270.0 (24) | -- (0) |
| concurrency-w128-c2-independent | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 420166.5 | 11511.8 (24) | -- (0) |
| concurrency-w128-c2-independent | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989827.2 | 14227.6 (24) | -- (0) |
| concurrency-w128-c2-independent | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813402.0 | 15515.4 (24) | -- (0) |
| concurrency-w128-c2-shared_sum | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 407657.0 | 14212.2 (24) | -- (0) |
| concurrency-w128-c2-shared_sum | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 989566.3 | 11343.9 (24) | -- (0) |
| concurrency-w128-c2-shared_sum | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 813147.5 | 14720.7 (24) | -- (0) |
| concurrency-w128-c2-shared_ordered | baseline | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 395626.5 | 13762.5 (24) | -- (0) |
| concurrency-w128-c2-shared_ordered | zama | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 1009599.2 | 11317.9 (24) | -- (0) |
| concurrency-w128-c2-shared_ordered | fhenix | 3/3/3 | 24/24/24 | 0 | 0 | 0 | 845883.0 | 13419.3 (24) | -- (0) |

Actual recorded gas cost including setup/warmup: 10947972204 wei.

No error recorded.
