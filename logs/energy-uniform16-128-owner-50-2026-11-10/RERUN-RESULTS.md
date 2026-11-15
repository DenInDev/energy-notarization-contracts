# Uniform energy workloads — 10 November 2026

All 50 scheduled rounds per width have been attempted on Sepolia (chain ID 11155111), using baseline, Zama and Fhenix with independent saved signers and three OS workers. Each round contains six transactions per platform: `set_meter_owner`, `notarize`, `add`, `mul_scalar`, `mean`, `max`. A separate view/decrypt of the persisted max result follows. The owner is an encrypted 160-bit address at both arithmetic widths.

**16 bit: 900/900 primary successes. 128 bit: 899/900 primary successes.** Both widths have 18/18 successful warmups, three deployments, 150/150 measured views and 3/3 warmup views. Baseline and Fhenix have 300/300 primary successes per width; Zama has 300/300 at 16 bits and 299/300 at 128 bits.

The 16-bit report has two observation segments after a local journal-write failure at round 15 mean. The original 267 successful measured samples, deployments, warmups and views are unchanged; continuation added 633 primary observations and 108 views. Derived journals now use atomic replacement.

The 128-bit report has two observation segments after Zama USER_DECRYPT returned HTTP 500, “Transaction simulation failed: Execution reverted”, SDK retryCount 5, at round 21 mean. Its transaction confirmed status 1. The failed observation remains unchanged, with its original receipt latency and no invented completion latency. A read-only preflight recovered plaintext 609 separately; recovery is excluded from timing and already-ready statistics. Continuation added only 525 new primary observations and 90 views, all successful. `executionComplete=true`, `complete=false` accurately retain the failure.

No deployments, warmups or transactions were repeated by either continuation. Timed workload, broadcasting, SDK bundles and read policy were unchanged. New SDK sessions and interruptions make these segmented observations. Widths and pilots are separate experiments; no causal or pure-FHE-compute claim is made.

## Measurement interpretation

Times are client-observed milliseconds. Receipt latency includes network inclusion and receipt polling. Post-receipt time includes result reads, authorization, service queues, retries, decryption and validation; it is not isolated FHE computation. Full client lifecycle = `preparationMs + transactionToValidatedPlaintextMs`; intentional barrier wait is separate. Worker-start-to-plaintext wall times, including barrier wait, are in the segment audit. Input encryption and transaction preparation are also recorded separately. Completion and post-receipt means use successful primary samples only. Receipt/gas means use all confirmed primary transactions, including the failed decryption. Each JSON metric includes n.

The separate view/decrypt measurements retrieve an already-ready persisted result after primary max validation; they are not fresh homomorphic computations.

## 16-bit arithmetic

Primary successes: 900/900. Recorded same-block triples: 300/300 (six operations × 50 rounds).

| Platform | Operation | Receipt n | Completion n | Receipt mean ms | Post-receipt mean ms | Validated mean ms | Preparation mean ms | Full client mean ms | Mean gas |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50 | 50 | 7015.1 | 119.4 | 7134.4 | 161.6 | 7296.0 | 22086.0 |
| baseline | notarize | 50 | 50 | 8197.6 | 122.9 | 8320.5 | 178.1 | 8498.6 | 31602.0 |
| baseline | add | 50 | 50 | 8871.1 | 126.1 | 8997.2 | 185.0 | 9182.2 | 33356.0 |
| baseline | mul_scalar | 50 | 50 | 8229.2 | 116.5 | 8345.7 | 178.9 | 8524.6 | 33634.0 |
| baseline | mean | 50 | 50 | 8560.7 | 139.5 | 8700.2 | 177.3 | 8877.5 | 35542.0 |
| baseline | max | 50 | 50 | 7159.7 | 131.8 | 7291.5 | 182.0 | 7473.6 | 35706.0 |
| zama | set_meter_owner | 50 | 50 | 7008.9 | 4251.7 | 11260.7 | 12662.9 | 23923.5 | 472250.6 |
| zama | notarize | 50 | 50 | 8206.0 | 4290.1 | 12496.1 | 12570.0 | 25066.1 | 472120.7 |
| zama | add | 50 | 50 | 8873.5 | 4337.0 | 13210.5 | 145.5 | 13356.0 | 327900.5 |
| zama | mul_scalar | 50 | 50 | 8188.8 | 4430.0 | 12618.8 | 155.5 | 12774.3 | 323958.3 |
| zama | mean | 50 | 50 | 8551.2 | 4401.4 | 12952.6 | 147.3 | 13099.9 | 343705.3 |
| zama | max | 50 | 50 | 7134.4 | 4497.7 | 11632.1 | 146.5 | 11778.6 | 329940.6 |
| fhenix | set_meter_owner | 50 | 50 | 6994.4 | 288.0 | 7282.4 | 11996.2 | 19278.6 | 306316.0 |
| fhenix | notarize | 50 | 50 | 8240.2 | 286.2 | 8526.4 | 11496.0 | 20022.4 | 306185.9 |
| fhenix | add | 50 | 50 | 8880.8 | 308.6 | 9189.3 | 179.9 | 9369.2 | 317943.0 |
| fhenix | mul_scalar | 50 | 50 | 8247.6 | 504.1 | 8751.7 | 173.9 | 8925.6 | 342266.0 |
| fhenix | mean | 50 | 50 | 8565.3 | 1101.7 | 9667.0 | 174.8 | 9841.8 | 373456.0 |
| fhenix | max | 50 | 50 | 7169.9 | 405.3 | 7575.2 | 165.2 | 7740.4 | 322134.0 |

| Platform | Already-ready view/decrypt n | Mean ms |
|---|---:|---:|
| baseline | 50 | 80.2 |
| zama | 50 | 2393.0 |
| fhenix | 50 | 191.4 |

| Platform | Gas cost ETH, deployment + warmup + all measured transactions |
|---|---:|
| baseline | 0.000000001101288 |
| zama | 0.000000008701548 |
| fhenix | 0.000000007627002 |

Broadcast start spread across the three workers: mean 0.897 ms, median 0 ms, p95 nearest rank 1 ms, maximum 16 ms (n=300). ACK and preparation/barrier distributions are in the analysis and segment audit.

Total actual receipt gas cost for this width: 0.000000017429837 ETH. Computed with integer `gasUsed × effectiveGasPriceWei`, including the failed confirmed transaction. Testnet fees during these runs were very low; gas units and ETH cost are separate quantities.

Observed CoFHE HTTP response status counts across setup/primary/view recorded events (warmups included): `{"200": 459, "204": 33, "404": 23}`. HTTP 429 observations: 0. Completed responses do not incur a wait merely because a hint is recorded.

- `zama:encrypt.sdk_progress:retryAfterMs`: `{"2000": 102}`
- `zama:completion.sdk_progress:retryAfterMs`: `{"2000": 502}`
- `fhenix:completion.sdk_poll:intervalMs`: `{"1000": 56}`
- `zama:already_ready.sdk_progress:retryAfterMs`: `{"2000": 51}`

SDK requested polling base is 10 ms. CoFHE has a 1000 ms client floor and honors larger server hints; bounded 429 waits are 5/10 seconds inside the original 180-second stage deadline. The recorded histograms describe observed hints/events, not exact measured sleep durations. Transaction receipt polling is separately 500 ms. Zama SDK queued retries and CoFHE 204/404 not-ready responses are retained; transient read/ACL/block-propagation retries are counted in the audit.

Artifacts:

- [report.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16-continuation1/report.json)
- [uniform-analysis.md](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16-continuation1/uniform-analysis.md)
- [uniform-analysis.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16-continuation1/uniform-analysis.json)
- [block-inclusion.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16-continuation1/block-inclusion.json)
- [rerun-audit.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16-continuation1/rerun-audit.json)

## 128-bit arithmetic

Primary successes: 899/900. Recorded same-block triples: 300/300 (six operations × 50 rounds).

| Platform | Operation | Receipt n | Completion n | Receipt mean ms | Post-receipt mean ms | Validated mean ms | Preparation mean ms | Full client mean ms | Mean gas |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50 | 50 | 9061.9 | 142.7 | 9204.6 | 193.7 | 9398.2 | 22064.0 |
| baseline | notarize | 50 | 50 | 10721.8 | 144.8 | 10866.6 | 214.4 | 11081.0 | 31671.0 |
| baseline | add | 50 | 50 | 8952.8 | 128.6 | 9081.4 | 202.7 | 9284.1 | 33358.0 |
| baseline | mul_scalar | 50 | 50 | 9211.0 | 140.3 | 9351.3 | 211.9 | 9563.2 | 33736.0 |
| baseline | mean | 50 | 50 | 8972.4 | 134.0 | 9106.4 | 228.0 | 9334.4 | 35556.0 |
| baseline | max | 50 | 50 | 9340.9 | 150.0 | 9490.9 | 289.5 | 9780.4 | 35732.0 |
| zama | set_meter_owner | 50 | 50 | 9090.4 | 4495.0 | 13585.4 | 10872.0 | 24457.5 | 472229.3 |
| zama | notarize | 50 | 50 | 10690.7 | 4304.3 | 14995.0 | 10591.2 | 25586.2 | 472101.6 |
| zama | add | 50 | 50 | 8963.1 | 4973.7 | 13936.8 | 170.3 | 14107.1 | 328024.7 |
| zama | mul_scalar | 50 | 50 | 9149.8 | 5262.7 | 14412.5 | 167.9 | 14580.4 | 324338.9 |
| zama | mean | 50 | 49 | 8930.8 | 4790.8 | 13696.5 | 182.6 | 13879.1 | 344191.1 |
| zama | max | 50 | 50 | 9363.5 | 4826.1 | 14189.7 | 244.2 | 14433.9 | 330054.3 |
| fhenix | set_meter_owner | 50 | 50 | 9082.5 | 370.1 | 9452.7 | 10182.6 | 19635.2 | 306294.5 |
| fhenix | notarize | 50 | 50 | 10682.3 | 348.5 | 11030.8 | 9886.2 | 20917.0 | 306164.2 |
| fhenix | add | 50 | 50 | 8994.4 | 550.0 | 9544.4 | 216.4 | 9760.8 | 318066.0 |
| fhenix | mul_scalar | 50 | 50 | 9200.5 | 2697.8 | 11898.4 | 189.7 | 12088.1 | 342550.0 |
| fhenix | mean | 50 | 50 | 8979.2 | 14763.9 | 23743.0 | 191.9 | 23934.9 | 373742.0 |
| fhenix | max | 50 | 50 | 9301.8 | 709.5 | 10011.3 | 191.4 | 10202.7 | 322190.0 |

| Platform | Already-ready view/decrypt n | Mean ms |
|---|---:|---:|
| baseline | 50 | 97.0 |
| zama | 50 | 2467.9 |
| fhenix | 50 | 225.6 |

| Platform | Gas cost ETH, deployment + warmup + all measured transactions |
|---|---:|
| baseline | 0.000000001088865 |
| zama | 0.000000008554296 |
| fhenix | 0.000000007502536 |

Broadcast start spread across the three workers: mean 0.997 ms, median 0 ms, p95 nearest rank 1 ms, maximum 16 ms (n=300). ACK and preparation/barrier distributions are in the analysis and segment audit.

Total actual receipt gas cost for this width: 0.000000017145697 ETH. Computed with integer `gasUsed × effectiveGasPriceWei`, including the failed confirmed transaction. Testnet fees during these runs were very low; gas units and ETH cost are separate quantities.

Observed CoFHE HTTP response status counts across setup/primary/view recorded events (warmups included): `{"200": 459, "204": 789, "404": 28}`. HTTP 429 observations: 0. Completed responses do not incur a wait merely because a hint is recorded.

- `zama:encrypt.sdk_progress:retryAfterMs`: `{"2000": 102}`
- `zama:completion.sdk_progress:retryAfterMs`: `{"2000": 545, "5000": 2}`
- `fhenix:completion.sdk_poll:intervalMs`: `{"1000": 817}`
- `zama:already_ready.sdk_progress:retryAfterMs`: `{"2000": 51}`

SDK requested polling base is 10 ms. CoFHE has a 1000 ms client floor and honors larger server hints; bounded 429 waits are 5/10 seconds inside the original 180-second stage deadline. The recorded histograms describe observed hints/events, not exact measured sleep durations. Transaction receipt polling is separately 500 ms. Zama SDK queued retries and CoFHE 204/404 not-ready responses are retained; transient read/ACL/block-propagation retries are counted in the audit.

Artifacts:

- [report.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128-continuation1/report.json)
- [uniform-analysis.md](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128-continuation1/uniform-analysis.md)
- [uniform-analysis.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128-continuation1/uniform-analysis.json)
- [block-inclusion.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128-continuation1/block-inclusion.json)
- [rerun-audit.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128-continuation1/rerun-audit.json)

## Receipt and integrity audit

Read-only canonical block audit checked all 1842 transaction references against 618 current canonical containing blocks: no changed block hashes or reinclusions found. The most recent blocks were not yet finalized at the audit checkpoint; canonical matching is reported without claiming finalized status for all blocks.

Raw reports are unchanged. Source prefixes were checked after JSON serialization; source-file SHA256 and deployment/view/barrier prefixes match their immutable checkpoint. SDK bundle hashes match. The 16-bit completion audit verified its source snapshot before the later 128-bit continuation-only changes. Those later changes affect continuation routing and provenance, not timed measurement or SDK behavior. The 128-bit continuation records the updated orchestration hashes.

Final latest=pending nonces are 1388 (baseline/Zama) and 1634 (Fhenix), exactly the original planned transaction budget. All final receipts are canonical status 1; no pending campaign transaction remains. The unrelated quarantined root lock is unchanged.

Both pilots are retained separately (18 measured + 18 warmup primary and 3 measured + 3 warmup views each). Total actual broadcasts for two pilots plus two measured widths: 1920; measured campaigns alone: 1842.

- [Complete data CSV](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/latency-and-gas.csv)
- [Final campaign manifest](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/campaign-continuation2.json)
- [Canonical block audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/canonical-audit/block-metadata.json)
- [Final accounts and nonce audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/final-account-audit.json)
- [Original 16-bit checkpoint](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint16/report.json)
- [Original 128-bit checkpoint including failed sample](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-10/measured-euint128/report.json)
