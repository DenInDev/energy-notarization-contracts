# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| baseline | notarize | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| baseline | add | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| baseline | mul_scalar | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| baseline | mean | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| baseline | max | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | set_meter_owner | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | notarize | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | add | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | mul_scalar | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | mean | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | max | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | set_meter_owner | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | notarize | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | add | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | mul_scalar | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | mean | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | max | 0/0 | n/a | n/a | n/a | n/a | n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
