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
| circuits-w128-sum_linear-n2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465333.0 | 10886.8 (3) | 11057.6 (3) |
| circuits-w128-sum_linear-n2 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 761558.0 | 6991.7 (3) | 11079.7 (3) |
| circuits-w128-sum_linear-n2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 751676.0 | 10004.0 (3) | 11024.2 (3) |
| circuits-w128-sum_tree-n2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465674.0 | 15334.1 (3) | 15456.1 (3) |
| circuits-w128-sum_tree-n2 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 762322.0 | 10951.7 (3) | 14641.2 (3) |
| circuits-w128-sum_tree-n2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 752440.0 | 15590.7 (3) | 15885.4 (3) |
| circuits-w128-sum_linear-n4 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 468157.0 | 14527.0 (3) | 14634.8 (3) |
| circuits-w128-sum_linear-n4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 802024.7 | 5309.2 (3) | 10430.1 (3) |
| circuits-w128-sum_linear-n4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 815494.0 | 14844.0 (3) | 15497.7 (3) |
| circuits-w128-sum_tree-n4 | baseline | 3/4/3 | 3/4/3 | 0 | 1 | 0 | 468892.0 | 10771.3 (3) | 11248.0 (3) |
| circuits-w128-sum_tree-n4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 803888.0 | 7162.7 (3) | 11993.3 (3) |
| circuits-w128-sum_tree-n4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 817364.0 | 11550.5 (3) | 12586.2 (3) |
| circuits-w128-sum_linear-n8 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 473809.0 | 15418.6 (3) | 15537.9 (3) |
| circuits-w128-sum_linear-n8 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 882963.0 | 8821.2 (3) | 15667.4 (3) |
| circuits-w128-sum_linear-n8 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 943154.0 | 14373.1 (3) | 16498.5 (3) |
| circuits-w128-sum_tree-n8 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 475238.0 | 10651.8 (3) | 10792.0 (3) |
| circuits-w128-sum_tree-n8 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 886763.7 | 4569.9 (3) | 10442.7 (3) |
| circuits-w128-sum_tree-n8 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 946956.0 | 10395.4 (3) | 11782.8 (3) |
| circuits-w128-affine_chain-k1 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465407.0 | 14983.9 (3) | 15457.9 (3) |
| circuits-w128-affine_chain-k1 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 777557.7 | 10778.8 (3) | 18749.6 (3) |
| circuits-w128-affine_chain-k1 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 780386.0 | 10588.4 (3) | 13539.5 (3) |
| circuits-w128-affine_chain-k2 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465583.0 | 8927.1 (3) | 9073.1 (3) |
| circuits-w128-affine_chain-k2 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 809635.0 | 11114.9 (3) | 22608.0 (3) |
| circuits-w128-affine_chain-k2 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 836837.0 | 8422.9 (3) | 14010.2 (3) |
| circuits-w128-affine_chain-k4 | baseline | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 465931.0 | 19495.0 (3) | 19622.9 (3) |
| circuits-w128-affine_chain-k4 | zama | 0/3/3 | 0/3/3 | 0 | 0 | 3 | -- | -- (0) | -- (0) |
| circuits-w128-affine_chain-k4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 949752.0 | 10520.7 (3) | 20644.0 (3) |

Actual recorded gas cost including setup/warmup: 3889423955 wei.

No error recorded.
