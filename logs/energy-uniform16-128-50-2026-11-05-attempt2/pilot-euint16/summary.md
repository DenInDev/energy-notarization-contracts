# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 31556.0 +/- n/a | n/a | 7669.6 +/- n/a | 7774.6 +/- n/a | 104.9 +/- n/a | n/a |
| baseline | add | 1/1 | 33449.0 +/- n/a | n/a | 8121.4 +/- n/a | 8228.4 +/- n/a | 107.0 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33713.0 +/- n/a | n/a | 5862.8 +/- n/a | 5977.2 +/- n/a | 114.4 +/- n/a | n/a |
| baseline | mean | 1/1 | 35707.0 +/- n/a | n/a | 8642.9 +/- n/a | 8751.1 +/- n/a | 108.3 +/- n/a | n/a |
| baseline | max | 1/1 | 35869.0 +/- n/a | n/a | 6945.5 +/- n/a | 7096.9 +/- n/a | 151.5 +/- n/a | n/a |
| zama | notarize | 1/1 | 471972.0 +/- n/a | 9038.1 +/- n/a | 7592.1 +/- n/a | 10326.4 +/- n/a | 2734.2 +/- n/a | n/a |
| zama | add | 1/1 | 328035.0 +/- n/a | n/a | 8129.0 +/- n/a | 12790.0 +/- n/a | 4661.0 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 324057.0 +/- n/a | n/a | 5869.7 +/- n/a | 9610.5 +/- n/a | 3740.8 +/- n/a | n/a |
| zama | mean | 1/1 | 343891.0 +/- n/a | n/a | 8601.2 +/- n/a | 13231.8 +/- n/a | 4630.7 +/- n/a | n/a |
| zama | max | 1/1 | 330103.0 +/- n/a | n/a | 6959.6 +/- n/a | 11630.2 +/- n/a | 4670.6 +/- n/a | n/a |
| fhenix | notarize | 1/1 | 306040.0 +/- n/a | 7978.1 +/- n/a | 7655.2 +/- n/a | 7927.9 +/- n/a | 272.7 +/- n/a | n/a |
| fhenix | add | 1/1 | 318099.0 +/- n/a | n/a | 8103.5 +/- n/a | 8393.2 +/- n/a | 289.7 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342345.0 +/- n/a | n/a | 5920.4 +/- n/a | 6356.1 +/- n/a | 435.6 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373596.0 +/- n/a | n/a | 8767.8 +/- n/a | 9060.7 +/- n/a | 292.9 +/- n/a | n/a |
| fhenix | max | 1/1 | 322273.0 +/- n/a | n/a | 6995.5 +/- n/a | 7264.7 +/- n/a | 269.2 +/- n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 1 | 172.1 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 9358.3 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 110.9 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 111.2 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 14 | 67.5 +/- 24.0 |
| baseline | notarize | transaction.wait_receipt | 1 | 7558.4 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 104.8 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 104.8 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 119.5 +/- n/a |
| baseline | add | barrier.wait | 1 | 271.0 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 105.4 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 105.8 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 15 | 59.2 +/- 15.5 |
| baseline | add | transaction.wait_receipt | 1 | 8015.5 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 106.9 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 106.9 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 231.4 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 276.3 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 93.8 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 94.2 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 11 | 62.9 +/- 9.5 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 5768.5 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 114.2 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 114.3 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 138.3 +/- n/a |
| baseline | mean | barrier.wait | 1 | 279.6 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 104.2 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 104.6 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 16 | 55.4 +/- 4.1 |
| baseline | mean | transaction.wait_receipt | 1 | 8538.3 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 108.2 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 108.2 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 211.0 +/- n/a |
| baseline | max | barrier.wait | 1 | 283.1 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 118.4 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 118.8 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 13 | 57.5 +/- 6.4 |
| baseline | max | transaction.wait_receipt | 1 | 6826.6 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 151.4 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 151.4 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 6832.1 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2206.0 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 227.3 +/- n/a |
| zama | notarize | barrier.wait | 1 | 265.0 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 93.8 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 94.4 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 14 | 64.4 +/- 10.2 |
| zama | notarize | transaction.wait_receipt | 1 | 7497.7 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 129.3 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 129.3 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2603.0 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 2603.0 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 115.5 +/- n/a |
| zama | add | barrier.wait | 1 | 275.1 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 111.4 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 111.8 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 15 | 61.8 +/- 15.3 |
| zama | add | transaction.wait_receipt | 1 | 8017.2 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 111.1 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 111.1 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4548.2 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4548.2 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 178.8 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 328.8 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 107.2 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 107.6 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 11 | 62.0 +/- 8.5 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 5762.1 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 118.8 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 118.8 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.7 +/- n/a |
| zama | mul_scalar | completion.retry_backoff | 1 | 1010.7 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 2412.8 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 3620.0 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 125.5 +/- n/a |
| zama | mean | barrier.wait | 1 | 292.4 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 88.0 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 88.3 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 16 | 56.5 +/- 3.4 |
| zama | mean | transaction.wait_receipt | 1 | 8512.8 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 123.4 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 123.4 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 4505.9 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 4505.9 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 179.4 +/- n/a |
| zama | max | barrier.wait | 1 | 314.7 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 124.5 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 124.8 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 13 | 60.0 +/- 6.1 |
| zama | max | transaction.wait_receipt | 1 | 6834.8 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 150.8 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 150.8 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | max | completion.read_attempt | 1 | 4518.5 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 4518.5 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 848.2 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 6430.2 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 699.3 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 7978.1 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 229.2 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 1323.1 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 94.0 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 94.6 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 14 | 68.4 +/- 32.5 |
| fhenix | notarize | transaction.wait_receipt | 1 | 7560.6 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 108.4 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 108.5 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 164.0 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 164.0 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 121.4 +/- n/a |
| fhenix | add | barrier.wait | 1 | 269.1 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 111.4 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 111.8 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 15 | 57.2 +/- 12.0 |
| fhenix | add | transaction.wait_receipt | 1 | 7991.6 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 124.8 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 124.8 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 164.6 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 164.7 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 226.8 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 280.8 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 113.0 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 113.5 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 11 | 67.3 +/- 7.9 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 5806.9 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 104.7 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 104.8 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 330.7 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 330.7 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 120.8 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 297.1 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 115.4 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 115.8 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 16 | 64.3 +/- 15.1 |
| fhenix | mean | transaction.wait_receipt | 1 | 8652.0 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 128.8 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 128.8 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 163.8 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 163.8 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 215.2 +/- n/a |
| fhenix | max | barrier.wait | 1 | 278.9 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 118.5 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 118.8 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 13 | 58.9 +/- 7.6 |
| fhenix | max | transaction.wait_receipt | 1 | 6876.6 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 110.9 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 110.9 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 158.1 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 158.1 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
