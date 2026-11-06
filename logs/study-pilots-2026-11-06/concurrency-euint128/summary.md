# Concurrency and circuit studies

Execution complete: false. All trials valid: false. Local mock: false.
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
| concurrency-w128-c1-independent | baseline | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 407913.0 | 11955.3 (8) | -- (0) |
| concurrency-w128-c1-independent | zama | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 989832.0 | 17272.7 (8) | -- (0) |
| concurrency-w128-c1-independent | fhenix | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 813414.0 | 12051.2 (8) | -- (0) |
| concurrency-w128-c1-shared_sum | baseline | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 407667.3 | 12475.9 (16) | -- (0) |
| concurrency-w128-c1-shared_sum | zama | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 989563.0 | 14948.6 (16) | -- (0) |
| concurrency-w128-c1-shared_sum | fhenix | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 813148.8 | 13293.9 (16) | -- (0) |
| concurrency-w128-c1-shared_ordered | baseline | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 395628.5 | 12798.6 (8) | -- (0) |
| concurrency-w128-c1-shared_ordered | zama | 1/2/3 | 8/16/24 | 0 | 1 | 0 | 1009604.3 | 17155.2 (16) | -- (0) |
| concurrency-w128-c1-shared_ordered | fhenix | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 845883.5 | 11926.0 (8) | -- (0) |
| concurrency-w128-c2-independent | baseline | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 420167.3 | 11620.9 (16) | -- (0) |
| concurrency-w128-c2-independent | zama | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 989827.0 | 16416.5 (16) | -- (0) |
| concurrency-w128-c2-independent | fhenix | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 813404.3 | 17295.7 (16) | -- (0) |
| concurrency-w128-c2-shared_sum | baseline | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 407652.3 | 14377.0 (16) | -- (0) |
| concurrency-w128-c2-shared_sum | zama | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 989564.8 | 10399.8 (16) | -- (0) |
| concurrency-w128-c2-shared_sum | fhenix | 2/2/3 | 16/16/24 | 0 | 0 | 0 | 813148.0 | 13342.1 (16) | -- (0) |
| concurrency-w128-c2-shared_ordered | baseline | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 395627.0 | 19551.8 (8) | -- (0) |
| concurrency-w128-c2-shared_ordered | zama | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 1009598.5 | 10548.3 (8) | -- (0) |
| concurrency-w128-c2-shared_ordered | fhenix | 1/1/3 | 8/8/24 | 0 | 0 | 0 | 845879.0 | 9344.5 (8) | -- (0) |

Actual recorded gas cost including setup/warmup: 8050598408 wei.

Failure: Duplicate or noncanonical Applied event
