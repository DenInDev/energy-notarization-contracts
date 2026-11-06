# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 31558.0 +/- n/a | n/a | 8123.6 +/- n/a | 8230.8 +/- n/a | 107.2 +/- n/a | n/a |
| baseline | add | 1/1 | 33496.0 +/- n/a | n/a | 17809.4 +/- n/a | 17923.7 +/- n/a | 114.2 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33838.0 +/- n/a | n/a | 6429.1 +/- n/a | 6535.4 +/- n/a | 106.4 +/- n/a | n/a |
| baseline | mean | 1/1 | 35721.0 +/- n/a | n/a | 5968.4 +/- n/a | 6081.1 +/- n/a | 112.7 +/- n/a | n/a |
| baseline | max | 0/1 | n/a | n/a | n/a | n/a | n/a | n/a |
| zama | notarize | 1/1 | 471983.0 +/- n/a | 8778.3 +/- n/a | 8149.1 +/- n/a | 12796.2 +/- n/a | 4647.1 +/- n/a | n/a |
| zama | add | 1/1 | 328205.0 +/- n/a | n/a | 17695.8 +/- n/a | 22343.5 +/- n/a | 4647.7 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 324420.0 +/- n/a | n/a | 6469.3 +/- n/a | 11304.0 +/- n/a | 4834.7 +/- n/a | n/a |
| zama | mean | 1/1 | 344310.0 +/- n/a | n/a | 6023.6 +/- n/a | 9831.8 +/- n/a | 3808.2 +/- n/a | n/a |
| zama | max | 0/1 | n/a | n/a | n/a | n/a | n/a | n/a |
| fhenix | notarize | 1/1 | 306018.0 +/- n/a | 8083.8 +/- n/a | 8111.5 +/- n/a | 8443.3 +/- n/a | 331.8 +/- n/a | n/a |
| fhenix | add | 1/1 | 318200.0 +/- n/a | n/a | 17815.1 +/- n/a | 18117.3 +/- n/a | 302.2 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342652.0 +/- n/a | n/a | 6432.7 +/- n/a | 8123.4 +/- n/a | 1690.7 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373882.0 +/- n/a | n/a | 5591.5 +/- n/a | 19166.7 +/- n/a | 13575.3 +/- n/a | n/a |
| fhenix | max | 0/1 | n/a | n/a | n/a | n/a | n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 1 | 175.7 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 9097.2 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 120.2 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 120.6 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 15 | 58.1 +/- 13.6 |
| baseline | notarize | transaction.wait_receipt | 1 | 8003.1 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 107.1 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 107.1 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 209.2 +/- n/a |
| baseline | add | barrier.wait | 1 | 273.6 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 120.5 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 120.9 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 32 | 59.1 +/- 19.8 |
| baseline | add | transaction.wait_receipt | 1 | 17688.5 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 114.1 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 114.1 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 216.0 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 275.3 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 120.5 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 120.9 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 12 | 60.4 +/- 15.7 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 6308.2 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 106.3 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 106.3 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 223.4 +/- n/a |
| baseline | mean | barrier.wait | 1 | 275.9 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 116.3 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 116.6 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 11 | 71.0 +/- 39.9 |
| baseline | mean | transaction.wait_receipt | 1 | 5851.7 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 112.6 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 112.6 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 232.4 +/- n/a |
| baseline | max | barrier.wait | 1 | 275.0 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 121.2 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 121.5 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 6560.2 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2218.1 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 226.1 +/- n/a |
| zama | notarize | barrier.wait | 1 | 268.5 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 109.2 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 109.6 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 15 | 61.1 +/- 6.1 |
| zama | notarize | transaction.wait_receipt | 1 | 8039.4 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 106.4 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 106.4 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.3 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 4539.1 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 4539.1 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 162.4 +/- n/a |
| zama | add | barrier.wait | 1 | 320.4 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 93.1 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 93.5 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 32 | 57.8 +/- 5.8 |
| zama | add | transaction.wait_receipt | 1 | 17602.3 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 116.4 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 116.5 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.3 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4529.5 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4529.5 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 182.8 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 308.5 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 115.3 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 115.6 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 12 | 63.8 +/- 6.4 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 6353.7 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 108.8 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 108.8 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 4724.0 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 4724.0 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 162.8 +/- n/a |
| zama | mean | barrier.wait | 1 | 336.5 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 103.1 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 103.4 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 11 | 77.5 +/- 39.8 |
| zama | mean | transaction.wait_receipt | 1 | 5920.2 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 116.4 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 116.4 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | mean | completion.retry_backoff | 1 | 1001.3 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 2515.5 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 3690.1 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 223.1 +/- n/a |
| zama | max | barrier.wait | 1 | 284.3 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 118.3 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 118.6 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 879.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 6166.5 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 1037.9 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 8083.8 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 224.9 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 964.3 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 120.0 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 120.4 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 15 | 57.1 +/- 9.4 |
| fhenix | notarize | transaction.wait_receipt | 1 | 7991.0 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 124.9 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 124.9 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 206.6 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 206.6 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 215.1 +/- n/a |
| fhenix | add | barrier.wait | 1 | 267.7 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 98.9 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 99.3 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 32 | 62.4 +/- 15.6 |
| fhenix | add | transaction.wait_receipt | 1 | 17715.8 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 117.3 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 117.4 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 184.6 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 184.6 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 213.5 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 277.9 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 111.7 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 112.0 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 12 | 61.4 +/- 10.5 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 6320.7 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 102.5 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 102.6 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 1587.9 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 1587.9 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 176.6 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 322.8 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 95.4 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 95.7 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 10 | 93.6 +/- 86.9 |
| fhenix | mean | transaction.wait_receipt | 1 | 5495.8 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 121.9 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 121.9 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 13453.1 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 13453.1 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 158.0 +/- n/a |
| fhenix | max | barrier.wait | 1 | 349.3 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 125.9 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 126.2 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
