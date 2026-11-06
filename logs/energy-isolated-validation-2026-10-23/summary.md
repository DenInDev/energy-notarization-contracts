# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 34185.0 +/- n/a | n/a | 8691.0 +/- n/a | 8822.6 +/- n/a | 131.6 +/- n/a | n/a |
| baseline | add | 1/1 | 36022.0 +/- n/a | n/a | 4696.3 +/- n/a | 4827.0 +/- n/a | 130.8 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 36011.0 +/- n/a | n/a | 2970.5 +/- n/a | 3022.4 +/- n/a | 51.8 +/- n/a | n/a |
| baseline | mean | 1/1 | 37938.0 +/- n/a | n/a | 14316.2 +/- n/a | 14449.3 +/- n/a | 133.0 +/- n/a | n/a |
| baseline | max | 1/1 | 37945.0 +/- n/a | n/a | 15826.8 +/- n/a | 15965.0 +/- n/a | 138.2 +/- n/a | n/a |
| zama | notarize | 1/1 | 486176.0 +/- n/a | 8986.4 +/- n/a | 8909.1 +/- n/a | 13762.1 +/- n/a | 4852.9 +/- n/a | 2367.8 +/- n/a |
| zama | add | 1/1 | 343061.0 +/- n/a | n/a | 4794.2 +/- n/a | 9625.3 +/- n/a | 4831.0 +/- n/a | 2329.3 +/- n/a |
| zama | mul_scalar | 1/1 | 339216.0 +/- n/a | n/a | 2462.2 +/- n/a | 9042.1 +/- n/a | 6579.9 +/- n/a | 2556.1 +/- n/a |
| zama | mean | 1/1 | 358388.0 +/- n/a | n/a | 14087.2 +/- n/a | 19013.2 +/- n/a | 4926.0 +/- n/a | 2358.7 +/- n/a |
| zama | max | 1/1 | 344627.0 +/- n/a | n/a | 16075.7 +/- n/a | 20939.0 +/- n/a | 4863.3 +/- n/a | 2345.6 +/- n/a |
| fhenix | notarize | 1/1 | 320496.0 +/- n/a | 7803.0 +/- n/a | 8639.1 +/- n/a | 8906.6 +/- n/a | 267.5 +/- n/a | 133.5 +/- n/a |
| fhenix | add | 1/1 | 343751.0 +/- n/a | n/a | 4708.1 +/- n/a | 5021.5 +/- n/a | 313.4 +/- n/a | 151.1 +/- n/a |
| fhenix | mul_scalar | 1/1 | 482917.0 +/- n/a | n/a | 2443.5 +/- n/a | 3730.5 +/- n/a | 1287.0 +/- n/a | 156.2 +/- n/a |
| fhenix | mean | 1/1 | 406004.0 +/- n/a | n/a | 14279.7 +/- n/a | 20110.3 +/- n/a | 5830.6 +/- n/a | 135.5 +/- n/a |
| fhenix | max | 1/1 | 347930.0 +/- n/a | n/a | 16023.2 +/- n/a | 16342.0 +/- n/a | 318.8 +/- n/a | 145.8 +/- n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 1 | 248.8 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 9272.7 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 121.4 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 121.7 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 16 | 60.3 +/- 16.4 |
| baseline | notarize | transaction.wait_receipt | 1 | 8569.3 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 131.5 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 131.5 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 296.1 +/- n/a |
| baseline | add | barrier.wait | 1 | 258.1 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 128.1 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 128.4 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 9 | 56.6 +/- 2.2 |
| baseline | add | transaction.wait_receipt | 1 | 4567.9 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 130.7 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 130.7 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 237.8 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 294.5 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 115.2 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 115.6 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 6 | 54.7 +/- 3.2 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 2854.9 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 51.8 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 51.8 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 244.9 +/- n/a |
| baseline | mean | barrier.wait | 1 | 287.3 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 149.6 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 149.9 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 26 | 58.1 +/- 8.9 |
| baseline | mean | transaction.wait_receipt | 1 | 14166.3 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 132.9 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 132.9 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 301.9 +/- n/a |
| baseline | max | barrier.wait | 1 | 265.4 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 121.5 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 121.8 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 28 | 69.2 +/- 19.4 |
| baseline | max | transaction.wait_receipt | 1 | 15705.1 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 138.0 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 138.1 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 6774.4 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2212.0 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 274.7 +/- n/a |
| zama | notarize | barrier.wait | 1 | 260.4 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 147.4 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 147.7 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 16 | 72.0 +/- 4.2 |
| zama | notarize | transaction.wait_receipt | 1 | 8761.4 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 123.6 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 123.6 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.3 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 4727.8 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 4727.8 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | already_ready.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | notarize | already_ready.read_attempt | 1 | 2366.2 +/- n/a |
| zama | notarize | already_ready.sdk_user_decrypt | 1 | 2366.2 +/- n/a |
| zama | notarize | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 185.2 +/- n/a |
| zama | add | barrier.wait | 1 | 385.2 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 122.2 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 122.5 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 9 | 63.0 +/- 3.0 |
| zama | add | transaction.wait_receipt | 1 | 4671.7 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 138.1 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 138.1 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4691.6 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4691.6 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | already_ready.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | add | already_ready.read_attempt | 1 | 2328.1 +/- n/a |
| zama | add | already_ready.sdk_user_decrypt | 1 | 2328.1 +/- n/a |
| zama | add | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 192.5 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 339.9 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 157.5 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 157.8 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 5 | 58.1 +/- 2.6 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 2304.4 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 55.6 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 55.6 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 6522.6 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 6522.6 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mul_scalar | already_ready.read_attempt | 1 | 2555.1 +/- n/a |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 1 | 2555.1 +/- n/a |
| zama | mul_scalar | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 198.3 +/- n/a |
| zama | mean | barrier.wait | 1 | 333.9 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 149.4 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 149.7 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 25 | 69.1 +/- 10.9 |
| zama | mean | transaction.wait_receipt | 1 | 13937.5 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 147.6 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 147.6 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 4777.2 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 4777.2 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | already_ready.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mean | already_ready.read_attempt | 1 | 2357.7 +/- n/a |
| zama | mean | already_ready.sdk_user_decrypt | 1 | 2357.7 +/- n/a |
| zama | mean | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 194.4 +/- n/a |
| zama | max | barrier.wait | 1 | 372.8 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 133.5 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 133.8 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 29 | 60.5 +/- 6.5 |
| zama | max | transaction.wait_receipt | 1 | 15941.9 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 127.3 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 127.3 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | max | completion.read_attempt | 1 | 4734.8 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 4734.8 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | already_ready.local_keypair_and_authorization | 1 | 1.3 +/- n/a |
| zama | max | already_ready.read_attempt | 1 | 2344.2 +/- n/a |
| zama | max | already_ready.sdk_user_decrypt | 1 | 2344.2 +/- n/a |
| zama | max | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 751.6 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 6410.9 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 640.2 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 7802.9 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 358.6 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 1359.8 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 139.4 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 139.8 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 16 | 52.8 +/- 4.6 |
| fhenix | notarize | transaction.wait_receipt | 1 | 8499.2 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 123.5 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 123.5 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 143.8 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 143.8 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | already_ready.read_attempt | 1 | 133.4 +/- n/a |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 1 | 133.4 +/- n/a |
| fhenix | notarize | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 256.6 +/- n/a |
| fhenix | add | barrier.wait | 1 | 297.6 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 127.8 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 128.2 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 9 | 56.9 +/- 5.1 |
| fhenix | add | transaction.wait_receipt | 1 | 4579.9 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 129.9 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 130.0 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 183.2 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 183.2 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | already_ready.read_attempt | 1 | 151.1 +/- n/a |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 1 | 151.1 +/- n/a |
| fhenix | add | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 260.6 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 271.7 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 126.8 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 127.1 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 5 | 55.1 +/- 3.9 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 2316.3 +/- n/a |
| fhenix | mul_scalar | completion.handle.retry_backoff | 1 | 1007.2 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 59.9 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 1131.6 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 155.3 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 155.3 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | already_ready.read_attempt | 1 | 156.1 +/- n/a |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 1 | 156.1 +/- n/a |
| fhenix | mul_scalar | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 268.5 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 263.7 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 169.1 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 169.4 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 26 | 53.9 +/- 9.4 |
| fhenix | mean | transaction.wait_receipt | 1 | 14110.3 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 130.9 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 130.9 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 5699.4 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 5699.4 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | already_ready.read_attempt | 1 | 135.5 +/- n/a |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 1 | 135.5 +/- n/a |
| fhenix | mean | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 186.5 +/- n/a |
| fhenix | max | barrier.wait | 1 | 380.7 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 121.5 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 121.8 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 29 | 58.7 +/- 5.9 |
| fhenix | max | transaction.wait_receipt | 1 | 15901.4 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 154.7 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 154.7 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 163.9 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 163.9 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | already_ready.read_attempt | 1 | 145.8 +/- n/a |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 1 | 145.8 +/- n/a |
| fhenix | max | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
