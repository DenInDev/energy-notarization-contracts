# 16-bit concurrency and circuit-depth experiments

Measured repetitions per case/platform: concurrency: 10; circuits: 10. Capacity rejections and missing observations remain explicit; a missing receipt has no gas or latency value.

## Network-condition table definitions

Observed intervals are UTC timestamps of the first and last canonical containing blocks for measured primary transactions. They exclude setup, preparation and decryption. The network rows include confirmed transactions even if later plaintext retrieval failed.

Mean gas/target is the transaction-weighted mean of 100 × containing-block gasUsed / (containing-block gasLimit / 2). It measures sampled block utilization, not operation gas. A block containing several measured requests contributes once per request. Values can exceed 100%. Unique-block summaries are also recorded in JSON.

Platform windows are sequential with rotated order. Concurrent writers operate within a platform; these tables do not establish matched network conditions or causal latency differences across platforms.

Canonical metadata audit: 1862 blocks, 2487 transaction references; 0 reconciliations. All containing blocks finalized at the audit checkpoint: False.

## Concurrency

| Configuration | Observed interval (UTC) | Contract | Containing block range | Mean gas/target | Measured tx n |
|---|---|---|---|---:|---:|
| Plaintext baseline | 2026-11-11 15:06:12 — 2026-11-12 00:58:12 | `0x81E078B3F587c591a55Ab1FC9e8aA15F7Eff1532` | 12112499–12115432 | 81.5% | 320 |
| Zama fhEVM | 2026-11-11 15:05:00 — 2026-11-12 00:52:36 | `0xe605Bae4d497BB09876E7b9f37a01e8002f4fca6` | 12112493–12115404 | 85.9% | 320 |
| Fhenix CoFHE | 2026-11-11 15:03:24 — 2026-11-12 00:55:48 | `0xCFD347A3d3575e41fEe2dA63b456bABFa632e25E` | 12112485–12115420 | 85.3% | 320 |

| Case | Platform | Successful / attempted windows | Capacity rejected | Validated requests | Receipt mean ms (n) | Immediate completion ms (n) | Deferred audit ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c1-shared_sum | baseline | 10/10 | 0 | 80 | 13407.5 (80) | -- (0) | 73.1 (80) |
| concurrency-w16-c1-shared_sum | zama | 10/10 | 0 | 79 | 12161.0 (80) | -- (0) | 2721.3 (79) |
| concurrency-w16-c1-shared_sum | fhenix | 10/10 | 0 | 80 | 14995.6 (80) | -- (0) | 195.4 (80) |
| concurrency-w16-c1-shared_ordered | baseline | 10/10 | 0 | 80 | 14200.9 (80) | -- (0) | 75.2 (80) |
| concurrency-w16-c1-shared_ordered | zama | 10/10 | 0 | 80 | 13184.8 (80) | -- (0) | 2532.5 (80) |
| concurrency-w16-c1-shared_ordered | fhenix | 10/10 | 0 | 80 | 12394.9 (80) | -- (0) | 195.1 (80) |
| concurrency-w16-c4-shared_sum | baseline | 10/10 | 0 | 80 | 11213.1 (80) | -- (0) | 76.1 (80) |
| concurrency-w16-c4-shared_sum | zama | 10/10 | 0 | 80 | 9329.7 (80) | -- (0) | 2575.8 (80) |
| concurrency-w16-c4-shared_sum | fhenix | 10/10 | 0 | 80 | 11794.0 (80) | -- (0) | 186.2 (80) |
| concurrency-w16-c4-shared_ordered | baseline | 10/10 | 0 | 80 | 13460.8 (80) | -- (0) | 73.7 (80) |
| concurrency-w16-c4-shared_ordered | zama | 10/10 | 0 | 80 | 9446.0 (80) | -- (0) | 2509.1 (80) |
| concurrency-w16-c4-shared_ordered | fhenix | 10/10 | 0 | 80 | 11240.4 (80) | -- (0) | 188.3 (80) |

Actual canonical gas cost, including deployment, authorization, input/window setup and warmups: 98332629444 wei (0.000000098332629 ETH), from 1843 confirmed receipts.

Supplementary observations retained outside the approved reduced matrix: 67 trials, 595 confirmed transactions, 30085354676 wei. These are excluded from primary performance and network-condition table rows; their cost is included in the total above.

## Circuits

| Configuration | Observed interval (UTC) | Contract | Containing block range | Mean gas/target | Measured tx n |
|---|---|---|---|---:|---:|
| Plaintext baseline | 2026-11-12 01:16:12 — 2026-11-12 12:53:00 | `0x668123D59797Ca8720870cbb8a115fd26f7330c4` | 12115520–12118969 | 80.5% | 100 |
| Zama fhEVM | 2026-11-12 01:15:48 — 2026-11-12 12:52:24 | `0x255a1c8DAa52FF3548c9012E3Fa8E145c025F508` | 12115518–12118966 | 79.9% | 80 |
| Fhenix CoFHE | 2026-11-12 01:15:12 — 2026-11-12 12:53:24 | `0x4f4F6d57131FD8b1A9AE2e74D2Ea6Cc997411621` | 12115515–12118971 | 80.6% | 100 |

| Case | Platform | Successful / attempted windows | Capacity rejected | Validated requests | Receipt mean ms (n) | Immediate completion ms (n) | Deferred audit ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| circuits-w16-sum_linear-n2 | baseline | 10/10 | 0 | 10 | 13432.7 (10) | 13830.7 (10) | -- (0) |
| circuits-w16-sum_linear-n2 | zama | 10/10 | 0 | 10 | 9667.8 (10) | 14560.3 (10) | -- (0) |
| circuits-w16-sum_linear-n2 | fhenix | 10/10 | 0 | 10 | 15569.0 (10) | 15966.2 (10) | -- (0) |
| circuits-w16-sum_tree-n2 | baseline | 10/10 | 0 | 10 | 14012.1 (10) | 14175.5 (10) | -- (0) |
| circuits-w16-sum_tree-n2 | zama | 10/10 | 0 | 10 | 8812.2 (10) | 13728.4 (10) | -- (0) |
| circuits-w16-sum_tree-n2 | fhenix | 10/10 | 0 | 10 | 12128.0 (10) | 12541.3 (10) | -- (0) |
| circuits-w16-sum_linear-n8 | baseline | 10/10 | 0 | 10 | 13809.2 (10) | 13970.9 (10) | -- (0) |
| circuits-w16-sum_linear-n8 | zama | 10/10 | 0 | 10 | 9412.0 (10) | 18182.2 (10) | -- (0) |
| circuits-w16-sum_linear-n8 | fhenix | 10/10 | 0 | 10 | 11541.8 (10) | 12024.2 (10) | -- (0) |
| circuits-w16-sum_tree-n8 | baseline | 10/10 | 0 | 10 | 11420.6 (10) | 11585.4 (10) | -- (0) |
| circuits-w16-sum_tree-n8 | zama | 10/10 | 0 | 9 | 6423.9 (9) | 11253.5 (9) | -- (0) |
| circuits-w16-sum_tree-n8 | fhenix | 10/10 | 0 | 10 | 11571.5 (10) | 11946.6 (10) | -- (0) |
| circuits-w16-sum_linear-n32 | baseline | 10/10 | 0 | 10 | 10978.5 (10) | 11245.9 (10) | -- (0) |
| circuits-w16-sum_linear-n32 | zama | 10/10 | 0 | 10 | 11420.1 (10) | 20715.9 (10) | -- (0) |
| circuits-w16-sum_linear-n32 | fhenix | 10/10 | 0 | 10 | 12425.9 (10) | 14897.9 (10) | -- (0) |
| circuits-w16-sum_tree-n32 | baseline | 10/10 | 0 | 10 | 12956.1 (10) | 13221.7 (10) | -- (0) |
| circuits-w16-sum_tree-n32 | zama | 10/10 | 0 | 10 | 8318.2 (10) | 15118.9 (10) | -- (0) |
| circuits-w16-sum_tree-n32 | fhenix | 10/10 | 0 | 10 | 14017.1 (10) | 14634.3 (10) | -- (0) |
| circuits-w16-affine_chain-k1 | baseline | 10/10 | 0 | 10 | 13096.8 (10) | 13259.7 (10) | -- (0) |
| circuits-w16-affine_chain-k1 | zama | 10/10 | 0 | 10 | 10860.4 (10) | 15592.8 (10) | -- (0) |
| circuits-w16-affine_chain-k1 | fhenix | 10/10 | 0 | 10 | 14951.7 (10) | 15650.9 (10) | -- (0) |
| circuits-w16-affine_chain-k8 | baseline | 10/10 | 0 | 10 | 14842.9 (10) | 15121.1 (10) | -- (0) |
| circuits-w16-affine_chain-k8 | zama | 10/10 | 0 | 10 | 7427.4 (10) | 20936.7 (10) | -- (0) |
| circuits-w16-affine_chain-k8 | fhenix | 10/10 | 0 | 10 | 16686.4 (10) | 18459.9 (10) | -- (0) |
| circuits-w16-affine_chain-k16 | baseline | 10/10 | 0 | 10 | 16008.5 (10) | 16176.1 (10) | -- (0) |
| circuits-w16-affine_chain-k16 | zama | 0/10 | 10 | 0 | -- (0) | -- (0) | -- (0) |
| circuits-w16-affine_chain-k16 | fhenix | 10/10 | 0 | 10 | 11087.6 (10) | 14437.9 (10) | -- (0) |
| circuits-w16-affine_chain-k32 | baseline | 10/10 | 0 | 10 | 11226.9 (10) | 11515.9 (10) | -- (0) |
| circuits-w16-affine_chain-k32 | zama | 0/10 | 10 | 0 | -- (0) | -- (0) | -- (0) |
| circuits-w16-affine_chain-k32 | fhenix | 10/10 | 0 | 10 | 14621.3 (10) | 20961.6 (10) | -- (0) |

Actual canonical gas cost, including deployment, authorization, input/window setup and warmups: 63226096694 wei (0.000000063226097 ETH), from 644 confirmed receipts.

Supplementary observations retained outside the approved reduced matrix: 0 trials, 0 confirmed transactions, 0 wei. These are excluded from primary performance and network-condition table rows; their cost is included in the total above.

## Read-only RPC resilience

campaign: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.
metadata: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.
original-full-matrix-segment-including-supplementary-observations: 1 read calls with retries; 1 recorded retry events. Details and observed backoff durations: rpc-read-events.json.

## Interpretation

Concurrency receipt throughput is for receipt-synchronized waves, not continuous saturation or maximum network capacity. Audits decrypt snapshots after all receipts and measure already-ready retrieval. A changed canonical order with a matching modular replay is valid behavior, not an inconsistency.

Circuit completion runs from prepared compute broadcast to validated plaintext. Preparation/readiness, input loading and signing are separate. Post-receipt latency includes network/RPC/service waiting and decryption, not isolated FHE computation. Linear/tree pairs have equal addition counts; affine chains increase both operation count and depth.

All arithmetic uses unsigned 16-bit wrapping, including the baseline and replay oracle. Repeated requests in a window are not independent robustness trials. Capacity-rejected circuits have no compute transaction, receipt latency or compute gas; their setup still costs gas. No p-values or causal platform ranking are inferred here.

Recovered window correctness is labeled separately from primary successful windows. Late audits never restore missing original validation/full-window latency. Raw outcomes/timings are unchanged. Reconciled receipt timings and affected-window throughput are excluded; later canonical metadata is supplementary evidence. Hint histograms describe recorded hints, not independently measured sleep durations.

