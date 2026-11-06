# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 31556.0 +/- n/a | n/a | 21076.6 +/- n/a | 21210.4 +/- n/a | 133.8 +/- n/a | n/a |
| baseline | add | 1/1 | 33449.0 +/- n/a | n/a | 7792.4 +/- n/a | 7900.7 +/- n/a | 108.3 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33713.0 +/- n/a | n/a | 18680.2 +/- n/a | 18801.4 +/- n/a | 121.1 +/- n/a | n/a |
| baseline | mean | 1/1 | 35707.0 +/- n/a | n/a | 7012.3 +/- n/a | 7130.4 +/- n/a | 118.1 +/- n/a | n/a |
| baseline | max | 1/1 | 35869.0 +/- n/a | n/a | 7899.7 +/- n/a | 8014.5 +/- n/a | 114.8 +/- n/a | n/a |
| zama | notarize | 1/1 | 471960.0 +/- n/a | 7963.3 +/- n/a | 20891.0 +/- n/a | 23502.0 +/- n/a | 2611.1 +/- n/a | n/a |
| zama | add | 1/1 | 328035.0 +/- n/a | n/a | 8181.0 +/- n/a | 13030.1 +/- n/a | 4849.1 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 324061.0 +/- n/a | n/a | 18714.8 +/- n/a | 23438.6 +/- n/a | 4723.8 +/- n/a | n/a |
| zama | mean | 1/1 | 343891.0 +/- n/a | n/a | 7036.9 +/- n/a | 10823.1 +/- n/a | 3786.2 +/- n/a | n/a |
| zama | max | 1/1 | 330103.0 +/- n/a | n/a | 8024.9 +/- n/a | 11989.8 +/- n/a | 3964.9 +/- n/a | n/a |
| fhenix | notarize | 1/1 | 306052.0 +/- n/a | 6799.9 +/- n/a | 20941.4 +/- n/a | 21211.2 +/- n/a | 269.8 +/- n/a | n/a |
| fhenix | add | 1/1 | 318099.0 +/- n/a | n/a | 8115.5 +/- n/a | 8577.5 +/- n/a | 462.1 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342345.0 +/- n/a | n/a | 18738.8 +/- n/a | 19054.1 +/- n/a | 315.3 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373596.0 +/- n/a | n/a | 7126.0 +/- n/a | 7415.4 +/- n/a | 289.5 +/- n/a | n/a |
| fhenix | max | 1/1 | 322273.0 +/- n/a | n/a | 7862.9 +/- n/a | 8353.8 +/- n/a | 490.9 +/- n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 1 | 168.8 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 8332.2 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 99.3 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 99.6 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 37 | 73.6 +/- 13.9 |
| baseline | notarize | transaction.wait_receipt | 1 | 20976.9 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 133.7 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 133.7 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 119.7 +/- n/a |
| baseline | add | barrier.wait | 1 | 292.0 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 97.6 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 97.9 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 13 | 124.2 +/- 141.6 |
| baseline | add | transaction.wait_receipt | 1 | 7694.5 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 108.2 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 108.2 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 224.6 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 273.6 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 118.5 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 118.7 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 33 | 68.7 +/- 18.8 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 18561.5 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 121.0 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 121.0 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 230.7 +/- n/a |
| baseline | mean | barrier.wait | 1 | 269.6 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 128.6 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 128.8 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 13 | 59.4 +/- 8.3 |
| baseline | mean | transaction.wait_receipt | 1 | 6883.5 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 118.0 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 118.0 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 135.3 +/- n/a |
| baseline | max | barrier.wait | 1 | 350.0 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 94.2 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 94.6 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 14 | 86.6 +/- 83.4 |
| baseline | max | transaction.wait_receipt | 1 | 7805.1 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 114.7 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 114.7 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 5754.9 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2208.4 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 265.1 +/- n/a |
| zama | notarize | barrier.wait | 1 | 272.7 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 126.5 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 127.1 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 37 | 68.7 +/- 20.0 |
| zama | notarize | transaction.wait_receipt | 1 | 20763.9 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 161.5 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 161.5 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.5 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2447.7 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 2447.7 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 114.9 +/- n/a |
| zama | add | barrier.wait | 1 | 296.8 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 106.4 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 106.7 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 14 | 105.5 +/- 72.0 |
| zama | add | transaction.wait_receipt | 1 | 8074.3 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 120.8 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 120.8 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4727.0 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4727.0 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 205.4 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 292.8 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 118.2 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 118.4 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 33 | 70.6 +/- 18.1 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 18596.3 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 126.1 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 126.1 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 4596.6 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 4596.6 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 152.3 +/- n/a |
| zama | mean | barrier.wait | 1 | 348.0 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 125.6 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 125.8 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 13 | 62.5 +/- 7.0 |
| zama | mean | transaction.wait_receipt | 1 | 6911.1 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 128.0 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 128.0 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 1.2 +/- n/a |
| zama | mean | completion.retry_backoff | 1 | 1003.4 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 2414.9 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 3656.7 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 193.9 +/- n/a |
| zama | max | barrier.wait | 1 | 291.5 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 126.4 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 126.7 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 14 | 93.7 +/- 82.0 |
| zama | max | transaction.wait_receipt | 1 | 7898.2 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 149.0 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 149.0 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | max | completion.retry_backoff | 1 | 1001.0 +/- n/a |
| zama | max | completion.read_attempt | 1 | 2616.1 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 3814.5 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 778.4 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 5316.8 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 704.4 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 6799.9 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 213.5 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 1487.6 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 139.1 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 139.7 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 37 | 69.2 +/- 22.7 |
| fhenix | notarize | transaction.wait_receipt | 1 | 20801.6 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 115.7 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 115.7 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 153.8 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 153.8 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 147.9 +/- n/a |
| fhenix | add | barrier.wait | 1 | 263.7 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 106.3 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 106.6 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 14 | 101.4 +/- 88.9 |
| fhenix | add | transaction.wait_receipt | 1 | 8008.9 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 131.0 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 131.0 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 330.9 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 330.9 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 198.1 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 300.0 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 124.4 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 124.7 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 33 | 71.9 +/- 22.4 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 18614.1 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 163.4 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 163.4 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 151.8 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 151.8 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 216.2 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 284.1 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 114.5 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 114.8 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 13 | 72.3 +/- 14.7 |
| fhenix | mean | transaction.wait_receipt | 1 | 7011.2 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 121.4 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 121.4 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 167.8 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 167.8 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 114.1 +/- n/a |
| fhenix | max | barrier.wait | 1 | 371.3 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 112.4 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 112.7 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 14 | 83.6 +/- 55.6 |
| fhenix | max | transaction.wait_receipt | 1 | 7750.2 +/- n/a |
| fhenix | max | completion.handle.retry_backoff | 1 | 100.4 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 95.9 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 337.8 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 152.8 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 152.8 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
