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
| circuits-w128-sum_linear-n2 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 465331.0 | 9862.9 (2) | 9982.0 (2) |
| circuits-w128-sum_linear-n2 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 761558.0 | 7175.4 (2) | 10889.5 (2) |
| circuits-w128-sum_linear-n2 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 751676.0 | 10168.7 (2) | 11558.1 (2) |
| circuits-w128-sum_tree-n2 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 465678.0 | 16934.5 (2) | 17065.9 (2) |
| circuits-w128-sum_tree-n2 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 762320.0 | 13228.3 (2) | 16408.7 (2) |
| circuits-w128-sum_tree-n2 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 752444.0 | 17407.4 (2) | 17710.9 (2) |
| circuits-w128-sum_linear-n4 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 468161.0 | 16036.9 (2) | 16140.8 (2) |
| circuits-w128-sum_linear-n4 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 802024.0 | 6746.8 (2) | 11605.3 (2) |
| circuits-w128-sum_linear-n4 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 815490.0 | 10201.8 (2) | 11051.4 (2) |
| circuits-w128-sum_tree-n4 | baseline | 2/3/3 | 2/3/3 | 0 | 1 | 0 | 468896.0 | 11247.3 (2) | 11913.8 (2) |
| circuits-w128-sum_tree-n4 | zama | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 803888.0 | 7162.7 (3) | 11993.3 (3) |
| circuits-w128-sum_tree-n4 | fhenix | 3/3/3 | 3/3/3 | 0 | 0 | 0 | 817364.0 | 11550.5 (3) | 12586.2 (3) |
| circuits-w128-sum_linear-n8 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 473809.0 | 10944.4 (2) | 11058.3 (2) |
| circuits-w128-sum_linear-n8 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 882963.0 | 10620.7 (2) | 17402.8 (2) |
| circuits-w128-sum_linear-n8 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 943154.0 | 17102.9 (2) | 19589.5 (2) |
| circuits-w128-sum_tree-n8 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 475238.0 | 10922.3 (2) | 11067.6 (2) |
| circuits-w128-sum_tree-n8 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 886763.0 | 4512.2 (2) | 10369.8 (2) |
| circuits-w128-sum_tree-n8 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 946956.0 | 10139.1 (2) | 11523.8 (2) |
| circuits-w128-affine_chain-k1 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 465407.0 | 18102.8 (2) | 18223.9 (2) |
| circuits-w128-affine_chain-k1 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 777561.0 | 12722.1 (2) | 20695.5 (2) |
| circuits-w128-affine_chain-k1 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 780386.0 | 10669.4 (2) | 13874.6 (2) |
| circuits-w128-affine_chain-k2 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 465583.0 | 7880.9 (2) | 8038.1 (2) |
| circuits-w128-affine_chain-k2 | zama | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 809635.0 | 7487.2 (2) | 19155.9 (2) |
| circuits-w128-affine_chain-k2 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 836841.0 | 7503.9 (2) | 13566.3 (2) |
| circuits-w128-affine_chain-k4 | baseline | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 465935.0 | 12011.3 (2) | 12136.3 (2) |
| circuits-w128-affine_chain-k4 | zama | 0/2/3 | 0/2/3 | 0 | 0 | 2 | -- | -- (0) | -- (0) |
| circuits-w128-affine_chain-k4 | fhenix | 2/2/3 | 2/2/3 | 0 | 0 | 0 | 949752.0 | 10920.3 (2) | 21040.2 (2) |

Actual recorded gas cost including setup/warmup: 3039164056 wei.

Failure: header for hash not found
