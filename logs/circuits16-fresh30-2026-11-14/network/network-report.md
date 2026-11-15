# 16-bit concurrency and circuit-depth experiments

Measured repetitions per case/platform: circuits: 30. Capacity rejections and missing observations remain explicit; a missing receipt has no gas or latency value.

## Network-condition table definitions

Observed intervals are UTC timestamps of the first and last canonical containing blocks for measured primary transactions. They exclude setup, preparation and decryption. The network rows include confirmed transactions even if later plaintext retrieval failed.

Mean gas/target is the transaction-weighted mean of 100 × containing-block gasUsed / (containing-block gasLimit / 2). It measures sampled block utilization, not operation gas. A block containing several measured requests contributes once per request. Values can exceed 100%. Unique-block summaries are also recorded in JSON.

Platform windows are sequential with rotated order. Concurrent writers operate within a platform; these tables do not establish matched network conditions or causal latency differences across platforms.

Canonical metadata audit: 1804 blocks, 1804 transaction references; 0 reconciliations. All containing blocks finalized at the audit checkpoint: False.

## Circuits

| Configuration | Observed interval (UTC) | Contract | Containing block range | Mean gas/target | Measured tx n |
|---|---|---|---|---:|---:|
| Plaintext baseline | 2026-11-14 15:48:48 — 2026-11-14 23:21:00 | `0xe500d84D9A2B4d8976ce5a452C33418c5377227F` | 12134094–12136338 | 68.1% | 300 |
| Zama fhEVM | 2026-11-14 15:48:24 — 2026-11-14 23:20:12 | `0x096241F66410a6CAfcDD97338b6E357a35685ff1` | 12134092–12136334 | 69.7% | 240 |
| Fhenix CoFHE | 2026-11-14 15:49:12 — 2026-11-14 23:21:24 | `0xe62AD8B104D1f36842a2049a25667d197ff36aCb` | 12134096–12136340 | 69.6% | 300 |

| Case | Platform | Successful / attempted windows | Capacity rejected | Validated requests | Receipt mean ms (n) | Immediate completion ms (n) | Deferred audit ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| circuits-w16-sum_linear-n2 | baseline | 30/30 | 0 | 30 | 13615.1 (30) | 13765.7 (30) | -- (0) |
| circuits-w16-sum_linear-n2 | zama | 30/30 | 0 | 30 | 6874.5 (30) | 11518.5 (30) | -- (0) |
| circuits-w16-sum_linear-n2 | fhenix | 30/30 | 0 | 30 | 10833.7 (30) | 11668.2 (30) | -- (0) |
| circuits-w16-sum_tree-n2 | baseline | 30/30 | 0 | 30 | 13997.0 (30) | 14163.8 (30) | -- (0) |
| circuits-w16-sum_tree-n2 | zama | 30/30 | 0 | 30 | 7998.6 (30) | 12454.2 (30) | -- (0) |
| circuits-w16-sum_tree-n2 | fhenix | 30/30 | 0 | 30 | 13244.3 (30) | 13698.9 (30) | -- (0) |
| circuits-w16-sum_linear-n8 | baseline | 30/30 | 0 | 30 | 12048.0 (30) | 12312.2 (30) | -- (0) |
| circuits-w16-sum_linear-n8 | zama | 30/30 | 0 | 30 | 8643.1 (30) | 14026.6 (30) | -- (0) |
| circuits-w16-sum_linear-n8 | fhenix | 30/30 | 0 | 30 | 12151.9 (30) | 12958.0 (30) | -- (0) |
| circuits-w16-sum_tree-n8 | baseline | 30/30 | 0 | 30 | 13415.8 (30) | 13605.1 (30) | -- (0) |
| circuits-w16-sum_tree-n8 | zama | 30/30 | 0 | 30 | 8007.3 (30) | 12971.8 (30) | -- (0) |
| circuits-w16-sum_tree-n8 | fhenix | 30/30 | 0 | 30 | 12243.8 (30) | 12859.9 (30) | -- (0) |
| circuits-w16-sum_linear-n32 | baseline | 30/30 | 0 | 30 | 12818.7 (30) | 13047.2 (30) | -- (0) |
| circuits-w16-sum_linear-n32 | zama | 30/30 | 0 | 30 | 9091.4 (30) | 17434.6 (30) | -- (0) |
| circuits-w16-sum_linear-n32 | fhenix | 30/30 | 0 | 30 | 11299.6 (30) | 13760.1 (30) | -- (0) |
| circuits-w16-sum_tree-n32 | baseline | 30/30 | 0 | 30 | 12230.5 (30) | 12645.2 (30) | -- (0) |
| circuits-w16-sum_tree-n32 | zama | 30/30 | 0 | 30 | 9186.8 (30) | 14439.9 (30) | -- (0) |
| circuits-w16-sum_tree-n32 | fhenix | 30/30 | 0 | 30 | 11252.8 (30) | 11971.0 (30) | -- (0) |
| circuits-w16-affine_chain-k1 | baseline | 30/30 | 0 | 30 | 13694.9 (30) | 13848.8 (30) | -- (0) |
| circuits-w16-affine_chain-k1 | zama | 30/30 | 0 | 30 | 8534.0 (30) | 13082.3 (30) | -- (0) |
| circuits-w16-affine_chain-k1 | fhenix | 30/30 | 0 | 30 | 13853.3 (30) | 14306.6 (30) | -- (0) |
| circuits-w16-affine_chain-k8 | baseline | 30/30 | 0 | 30 | 13405.6 (30) | 13554.1 (30) | -- (0) |
| circuits-w16-affine_chain-k8 | zama | 30/30 | 0 | 30 | 7575.5 (30) | 15051.9 (30) | -- (0) |
| circuits-w16-affine_chain-k8 | fhenix | 30/30 | 0 | 30 | 12623.3 (30) | 14307.3 (30) | -- (0) |
| circuits-w16-affine_chain-k16 | baseline | 30/30 | 0 | 30 | 12115.7 (30) | 12238.6 (30) | -- (0) |
| circuits-w16-affine_chain-k16 | zama | 0/30 | 30 | 0 | -- (0) | -- (0) | -- (0) |
| circuits-w16-affine_chain-k16 | fhenix | 30/30 | 0 | 30 | 12592.8 (30) | 16091.2 (30) | -- (0) |
| circuits-w16-affine_chain-k32 | baseline | 30/30 | 0 | 30 | 13753.4 (30) | 13982.1 (30) | -- (0) |
| circuits-w16-affine_chain-k32 | zama | 0/30 | 30 | 0 | -- (0) | -- (0) | -- (0) |
| circuits-w16-affine_chain-k32 | fhenix | 30/30 | 0 | 30 | 13023.3 (30) | 19390.4 (30) | -- (0) |

Actual canonical gas cost, including deployment, authorization, input/window setup and warmups: 340114937707 wei (0.000000340114938 ETH), from 1804 confirmed receipts.

Supplementary observations retained outside the approved reduced matrix: 0 trials, 0 confirmed transactions, 0 wei. These are excluded from primary performance and network-condition table rows; their cost is included in the total above.

## Read-only RPC resilience

campaign: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.
metadata: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.

## Interpretation

Concurrency receipt throughput is for receipt-synchronized waves, not continuous saturation or maximum network capacity. Audits decrypt snapshots after all receipts and measure already-ready retrieval. A changed canonical order with a matching modular replay is valid behavior, not an inconsistency.

Circuit completion runs from prepared compute broadcast to validated plaintext. Preparation/readiness, input loading and signing are separate. Post-receipt latency includes network/RPC/service waiting and decryption, not isolated FHE computation. Linear/tree pairs have equal addition counts; affine chains increase both operation count and depth.

All arithmetic uses unsigned 16-bit wrapping, including the baseline and replay oracle. Repeated requests in a window are not independent robustness trials. Capacity-rejected circuits have no compute transaction, receipt latency or compute gas; their setup still costs gas. No p-values or causal platform ranking are inferred here.

Recovered window correctness is labeled separately from primary successful windows. Late audits never restore missing original validation/full-window latency. Raw outcomes/timings are unchanged. Reconciled receipt timings and affected-window throughput are excluded; later canonical metadata is supplementary evidence. Hint histograms describe recorded hints, not independently measured sleep durations.

