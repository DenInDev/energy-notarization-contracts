# 16-bit concurrency and circuit-depth experiments

Measured repetitions per case/platform: concurrency: 10. Capacity rejections and missing observations remain explicit; a missing receipt has no gas or latency value.

## Network-condition table definitions

Observed intervals are UTC timestamps of the first and last canonical containing blocks for measured primary transactions. They exclude setup, preparation and decryption. The network rows include confirmed transactions even if later plaintext retrieval failed.

Mean gas/target is the transaction-weighted mean of 100 × containing-block gasUsed / (containing-block gasLimit / 2). It measures sampled block utilization, not operation gas. A block containing several measured requests contributes once per request. Values can exceed 100%. Unique-block summaries are also recorded in JSON.

Platform windows are sequential with rotated order. Concurrent writers operate within a platform; these tables do not establish matched network conditions or causal latency differences across platforms.

Canonical metadata audit: 338 blocks, 600 transaction references; 0 reconciliations. All containing blocks finalized at the audit checkpoint: False.

## Concurrency

| Configuration | Observed interval (UTC) | Contract | Containing block range | Mean gas/target | Measured tx n |
|---|---|---|---|---:|---:|
| Plaintext baseline | 2026-11-15 02:11:24 — 2026-11-15 03:56:48 | `0x1d09655a9Be3B91940eF3143A2d461045401c67c` | 12137181–12137706 | 73.1% | 160 |
| Zama fhEVM | 2026-11-15 02:08:12 — 2026-11-15 03:53:24 | `0x3f09aC035155D844f779fb092Ef1Ee5B901280d9` | 12137166–12137689 | 77.3% | 160 |
| Fhenix CoFHE | 2026-11-15 02:10:24 — 2026-11-15 03:55:36 | `0x704Ed08EdeF50a65914b645fA929d91776669F4c` | 12137176–12137700 | 72.3% | 160 |

| Case | Platform | Successful / attempted windows | Capacity rejected | Validated requests | Receipt mean ms (n) | Immediate completion ms (n) | Deferred audit ms (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c2-shared_sum | baseline | 10/10 | 0 | 80 | 12608.9 (80) | -- (0) | 50.8 (80) |
| concurrency-w16-c2-shared_sum | zama | 10/10 | 0 | 80 | 12109.5 (80) | -- (0) | 2469.6 (80) |
| concurrency-w16-c2-shared_sum | fhenix | 10/10 | 0 | 80 | 11203.7 (80) | -- (0) | 137.5 (80) |
| concurrency-w16-c2-shared_ordered | baseline | 10/10 | 0 | 80 | 12521.3 (80) | -- (0) | 49.4 (80) |
| concurrency-w16-c2-shared_ordered | zama | 10/10 | 0 | 80 | 12616.8 (80) | -- (0) | 2398.7 (80) |
| concurrency-w16-c2-shared_ordered | fhenix | 10/10 | 0 | 80 | 10842.0 (80) | -- (0) | 144.1 (80) |

Actual canonical gas cost, including deployment, authorization, input/window setup and warmups: 10041699027 wei (0.000000010041699 ETH), from 600 confirmed receipts.

Supplementary observations retained outside the approved reduced matrix: 0 trials, 0 confirmed transactions, 0 wei. These are excluded from primary performance and network-condition table rows; their cost is included in the total above.

## Read-only RPC resilience

campaign: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.
metadata: 0 read calls with retries; 0 recorded retry events. Details and observed backoff durations: rpc-read-events.json.

## Interpretation

Concurrency receipt throughput is for receipt-synchronized waves, not continuous saturation or maximum network capacity. Audits decrypt snapshots after all receipts and measure already-ready retrieval. A changed canonical order with a matching modular replay is valid behavior, not an inconsistency.

Circuit completion runs from prepared compute broadcast to validated plaintext. Preparation/readiness, input loading and signing are separate. Post-receipt latency includes network/RPC/service waiting and decryption, not isolated FHE computation. Linear/tree pairs have equal addition counts; affine chains increase both operation count and depth.

All arithmetic uses unsigned 16-bit wrapping, including the baseline and replay oracle. Repeated requests in a window are not independent robustness trials. Capacity-rejected circuits have no compute transaction, receipt latency or compute gas; their setup still costs gas. No p-values or causal platform ranking are inferred here.

Recovered window correctness is labeled separately from primary successful windows. Late audits never restore missing original validation/full-window latency. Raw outcomes/timings are unchanged. Reconciled receipt timings and affected-window throughput are excluded; later canonical metadata is supplementary evidence. Hint histograms describe recorded hints, not independently measured sleep durations.

