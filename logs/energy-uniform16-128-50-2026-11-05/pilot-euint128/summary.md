# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 31558.0 +/- n/a | n/a | 7218.2 +/- n/a | 7375.6 +/- n/a | 157.4 +/- n/a | n/a |
| baseline | add | 1/1 | 33496.0 +/- n/a | n/a | 7778.3 +/- n/a | 7913.0 +/- n/a | 134.7 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33838.0 +/- n/a | n/a | 21506.0 +/- n/a | 21737.4 +/- n/a | 231.4 +/- n/a | n/a |
| baseline | mean | 1/1 | 35721.0 +/- n/a | n/a | 7190.2 +/- n/a | 7319.4 +/- n/a | 129.2 +/- n/a | n/a |
| baseline | max | 1/1 | 35895.0 +/- n/a | n/a | 8821.5 +/- n/a | 8983.7 +/- n/a | 162.2 +/- n/a | n/a |
| zama | notarize | 1/1 | 471995.0 +/- n/a | 7973.3 +/- n/a | 7127.0 +/- n/a | 9940.9 +/- n/a | 2813.9 +/- n/a | n/a |
| zama | add | 1/1 | 328205.0 +/- n/a | n/a | 7682.9 +/- n/a | 11458.2 +/- n/a | 3775.3 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 324420.0 +/- n/a | n/a | 21355.4 +/- n/a | 24114.4 +/- n/a | 2758.9 +/- n/a | n/a |
| zama | mean | 1/1 | 344310.0 +/- n/a | n/a | 7106.2 +/- n/a | 9838.0 +/- n/a | 2731.7 +/- n/a | n/a |
| zama | max | 1/1 | 330217.0 +/- n/a | n/a | 8861.5 +/- n/a | 13543.2 +/- n/a | 4681.7 +/- n/a | n/a |
| fhenix | notarize | 1/1 | 305994.0 +/- n/a | 7085.2 +/- n/a | 7120.9 +/- n/a | 7405.7 +/- n/a | 284.9 +/- n/a | n/a |
| fhenix | add | 1/1 | 318200.0 +/- n/a | n/a | 7748.4 +/- n/a | 8589.6 +/- n/a | 841.2 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342652.0 +/- n/a | n/a | 21238.0 +/- n/a | 22196.4 +/- n/a | 958.5 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373882.0 +/- n/a | n/a | 7134.4 +/- n/a | 19817.0 +/- n/a | 12682.6 +/- n/a | n/a |
| fhenix | max | 1/1 | 322329.0 +/- n/a | n/a | 9023.1 +/- n/a | 9338.7 +/- n/a | 315.6 +/- n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 1 | 201.5 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 8282.3 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 119.0 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 119.3 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 13 | 79.0 +/- 18.4 |
| baseline | notarize | transaction.wait_receipt | 1 | 7098.9 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 157.3 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 157.3 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 123.3 +/- n/a |
| baseline | add | barrier.wait | 1 | 270.7 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 114.2 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 114.5 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 14 | 76.1 +/- 12.0 |
| baseline | add | transaction.wait_receipt | 1 | 7663.8 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 134.6 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 134.6 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 134.9 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 271.6 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 124.7 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 125.1 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 37 | 85.0 +/- 25.9 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 21380.9 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 231.3 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 231.3 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 174.1 +/- n/a |
| baseline | mean | barrier.wait | 1 | 265.3 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 100.7 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 101.1 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 13 | 74.8 +/- 17.7 |
| baseline | mean | transaction.wait_receipt | 1 | 7089.1 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 129.1 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 129.1 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 234.2 +/- n/a |
| baseline | max | barrier.wait | 1 | 272.4 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 100.8 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 101.1 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 15 | 108.5 +/- 106.4 |
| baseline | max | transaction.wait_receipt | 1 | 8720.4 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 162.1 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 162.1 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 5762.3 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2211.0 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 240.8 +/- n/a |
| zama | notarize | barrier.wait | 1 | 269.9 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 137.2 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 137.6 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 13 | 68.4 +/- 12.1 |
| zama | notarize | transaction.wait_receipt | 1 | 6989.4 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 119.5 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 119.5 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2693.1 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 2693.1 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 122.7 +/- n/a |
| zama | add | barrier.wait | 1 | 271.3 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 96.2 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 96.5 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 14 | 70.2 +/- 13.7 |
| zama | add | transaction.wait_receipt | 1 | 7586.3 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 122.1 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 122.1 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | add | completion.retry_backoff | 1 | 1003.7 +/- n/a |
| zama | add | completion.read_attempt | 1 | 2454.2 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 3651.7 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 124.3 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 282.2 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 108.4 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 108.7 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 37 | 80.0 +/- 49.4 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 21246.7 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 218.7 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 218.7 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 2538.4 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 2538.4 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 117.1 +/- n/a |
| zama | mean | barrier.wait | 1 | 322.4 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 112.4 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 112.7 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 13 | 71.1 +/- 25.5 |
| zama | mean | transaction.wait_receipt | 1 | 6993.5 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 125.0 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 125.0 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 1.2 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 2605.3 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 2605.3 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 230.0 +/- n/a |
| zama | max | barrier.wait | 1 | 276.6 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 111.4 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 111.7 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 15 | 108.2 +/- 104.3 |
| zama | max | transaction.wait_receipt | 1 | 8749.7 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 170.8 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 170.8 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | max | completion.read_attempt | 1 | 4509.2 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 4509.2 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 726.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 5333.3 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 1025.6 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 7085.2 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 249.9 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 1148.7 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 119.1 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 119.6 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 13 | 70.0 +/- 10.9 |
| fhenix | notarize | transaction.wait_receipt | 1 | 7001.3 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 120.9 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 120.9 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 163.7 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 163.8 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 115.2 +/- n/a |
| fhenix | add | barrier.wait | 1 | 278.7 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 146.1 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 146.4 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 14 | 70.6 +/- 11.2 |
| fhenix | add | transaction.wait_receipt | 1 | 7602.0 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 149.3 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 149.3 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 691.8 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 691.8 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 124.2 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 282.3 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 135.3 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 135.9 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 37 | 76.5 +/- 25.8 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 21102.0 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 233.0 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 233.0 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 725.2 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 725.2 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 145.6 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 293.9 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 128.0 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 128.4 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 13 | 70.8 +/- 22.4 |
| fhenix | mean | transaction.wait_receipt | 1 | 7006.0 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 134.6 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 134.6 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 12547.8 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 12547.8 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 162.9 +/- n/a |
| fhenix | max | barrier.wait | 1 | 343.8 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 135.3 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 135.6 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 15 | 118.3 +/- 149.9 |
| fhenix | max | transaction.wait_receipt | 1 | 8887.4 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 148.9 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 148.9 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 166.5 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 166.5 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
