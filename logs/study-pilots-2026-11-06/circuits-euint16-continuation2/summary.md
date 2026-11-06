# Concurrency and circuit studies

Execution complete: true. All trials valid: false. Local mock: false.
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
| circuits-w16-sum_linear-n2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465283.0 | 9373.1 (3) | 9500.5 (3) |
| circuits-w16-sum_linear-n2 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 761411.0 | 6274.5 (3) | 9726.3 (3) |
| circuits-w16-sum_linear-n2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 751590.0 | 10414.9 (3) | 12135.4 (3) |
| circuits-w16-sum_tree-n2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465616.0 | 9912.3 (3) | 10416.2 (3) |
| circuits-w16-sum_tree-n2 | zama | 3/4/3 | 3/4/3 | 0 | 1 | 0 | 762169.7 | 9647.5 (3) | 14239.3 (3) |
| circuits-w16-sum_tree-n2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 752354.0 | 9040.0 (3) | 9748.1 (3) |
| circuits-w16-sum_linear-n4 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 466113.0 | 10287.7 (3) | 10785.0 (3) |
| circuits-w16-sum_linear-n4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 801583.7 | 6788.3 (3) | 13323.5 (3) |
| circuits-w16-sum_linear-n4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 815268.0 | 10591.6 (3) | 17081.3 (3) |
| circuits-w16-sum_tree-n4 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 466808.0 | 13634.7 (3) | 13750.4 (3) |
| circuits-w16-sum_tree-n4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 803441.7 | 12046.0 (3) | 17623.9 (3) |
| circuits-w16-sum_tree-n4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 817126.0 | 8135.8 (3) | 8435.5 (3) |
| circuits-w16-sum_linear-n8 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 467761.0 | 15000.1 (3) | 15490.7 (3) |
| circuits-w16-sum_linear-n8 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 881928.7 | 10227.1 (3) | 13719.5 (3) |
| circuits-w16-sum_linear-n8 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 942600.0 | 9870.8 (3) | 10861.4 (3) |
| circuits-w16-sum_tree-n8 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 469102.0 | 16061.7 (3) | 16190.3 (3) |
| circuits-w16-sum_tree-n8 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 885734.7 | 6679.1 (3) | 11816.3 (3) |
| circuits-w16-sum_tree-n8 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 946410.0 | 24326.5 (3) | 25709.0 (3) |
| circuits-w16-affine_chain-k1 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465353.0 | 8609.1 (3) | 8718.0 (3) |
| circuits-w16-affine_chain-k1 | zama | 3/4/3 | 3/4/3 | 0 | 1 | 0 | 777263.7 | 4866.3 (3) | 9611.8 (3) |
| circuits-w16-affine_chain-k1 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 780214.0 | 10491.9 (3) | 11256.0 (3) |
| circuits-w16-affine_chain-k2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465533.0 | 14208.7 (3) | 14325.5 (3) |
| circuits-w16-affine_chain-k2 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 809043.0 | 7931.6 (3) | 12167.6 (3) |
| circuits-w16-affine_chain-k2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 836521.0 | 9056.2 (3) | 10081.1 (3) |
| circuits-w16-affine_chain-k4 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465885.0 | 18184.1 (3) | 18664.7 (3) |
| circuits-w16-affine_chain-k4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 872601.7 | 6551.8 (3) | 12374.2 (3) |
| circuits-w16-affine_chain-k4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 949116.0 | 12570.4 (3) | 13546.1 (3) |

Actual recorded gas cost including setup/warmup: 4466025756 wei.

No error recorded.
