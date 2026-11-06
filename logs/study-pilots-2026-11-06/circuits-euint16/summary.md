# Concurrency and circuit studies

Execution complete: false. All trials valid: false. Local mock: false.
Local mock results validate implementation only; they are not public-network performance evidence.
Concurrency snapshots and final state are replayed in (blockNumber, transactionIndex) order. A different valid order/result is not an inconsistency.
Concurrency audits are deferred until all window receipts: audit-call latency is already-ready retrieval plus client RPC/SDK work, not transaction-to-FHE-completion latency.
Circuit completion is measured immediately from its prepared compute broadcast through equality-validated plaintext; setup input loading/readiness and signing are separate.
Receipts retain confirmed transactions whose later retrieval failed. Completion statistics use validated successes only. Failures are not zero-latency samples.
Exact known HCU rejections during estimateGas are capacity observations, without a compute broadcast or receipt. Their gas and completion latency are unavailable, not zero. Other errors still stop execution.
Binomial zero-bad-window bounds are conditional on independent windows, never IID requests; no robustness guarantee follows from zero observed failures.

| Case | Platform | Valid windows / attempted / planned | Valid requests / attempted / planned | Inconsistent | Incomplete | HCU rejected | Mean gas | Receipt ms (n) | Immediate circuit completion ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| circuits-w16-sum_linear-n2 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n2 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n2 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n2 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n2 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n2 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n4 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n4 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n4 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n4 | baseline | 1/1/3 | 1/1/3 | 0 | 0 | 0 | 466812.0 | 22464.6 (1) | 22558.9 (1) |
| circuits-w16-sum_tree-n4 | zama | 1/1/3 | 1/1/3 | 0 | 0 | 0 | 803431.0 | 5786.0 (1) | 10765.8 (1) |
| circuits-w16-sum_tree-n4 | fhenix | 1/1/3 | 1/1/3 | 0 | 0 | 0 | 817130.0 | 11579.0 (1) | 11980.6 (1) |
| circuits-w16-sum_linear-n8 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n8 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_linear-n8 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n8 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n8 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-sum_tree-n8 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k1 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k1 | zama | 0/1/3 | 0/1/3 | 0 | 1 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k1 | fhenix | 1/1/3 | 1/1/3 | 0 | 0 | 0 | 780230.0 | 10295.3 (1) | 10778.0 (1) |
| circuits-w16-affine_chain-k2 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k2 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k2 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k4 | baseline | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k4 | zama | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |
| circuits-w16-affine_chain-k4 | fhenix | 0/0/3 | 0/0/3 | 0 | 0 | 0 | -- | -- (0) | -- (0) |

Actual recorded gas cost including setup/warmup: 1752589274 wei.

Failure: The Hardhat Fhevm plugin is not initialized.
