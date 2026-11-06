# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 50/50 | 34185.0 +/- 0.0 | n/a | 13226.6 +/- 5895.5 | 13295.2 +/- 5897.0 | 68.6 +/- 28.3 | n/a |
| baseline | add | 50/50 | 36022.0 +/- 0.0 | n/a | 9570.4 +/- 7160.8 | 9632.3 +/- 7162.6 | 61.8 +/- 21.7 | n/a |
| baseline | mul_scalar | 50/50 | 36011.0 +/- 0.0 | n/a | 8617.3 +/- 6826.5 | 8677.3 +/- 6824.7 | 60.0 +/- 17.6 | n/a |
| baseline | mean | 50/50 | 37938.0 +/- 0.0 | n/a | 7368.6 +/- 5857.1 | 7426.4 +/- 5856.0 | 57.8 +/- 12.8 | n/a |
| baseline | max | 50/50 | 37945.0 +/- 0.0 | n/a | 6875.4 +/- 5603.1 | 6939.7 +/- 5604.9 | 64.3 +/- 35.4 | n/a |
| zama | notarize | 50/50 | 486176.5 +/- 12.8 | 13862.1 +/- 89.5 | 5244.7 +/- 5943.6 | 9290.6 +/- 6081.4 | 4045.9 +/- 911.9 | 2337.1 +/- 41.8 |
| zama | add | 50/50 | 343060.5 +/- 1.3 | n/a | 9595.2 +/- 7132.4 | 13838.1 +/- 7229.4 | 4242.9 +/- 855.3 | 2334.5 +/- 25.4 |
| zama | mul_scalar | 50/50 | 339219.4 +/- 1.4 | n/a | 8637.0 +/- 6914.5 | 13126.3 +/- 7043.8 | 4489.3 +/- 564.9 | 2341.2 +/- 43.1 |
| zama | mean | 50/50 | 358387.5 +/- 1.3 | n/a | 7364.2 +/- 5850.4 | 11827.2 +/- 5898.9 | 4463.0 +/- 548.7 | 2478.2 +/- 774.4 |
| zama | max | 50/50 | 344626.8 +/- 1.0 | n/a | 6912.5 +/- 5667.9 | 11484.0 +/- 5506.1 | 4571.5 +/- 374.1 | 2347.0 +/- 41.8 |
| fhenix | notarize | 50/50 | 320492.6 +/- 6.0 | 9574.4 +/- 2884.5 | 6656.4 +/- 5978.8 | 6878.9 +/- 5979.3 | 222.5 +/- 46.3 | 146.9 +/- 26.8 |
| fhenix | add | 50/50 | 343751.0 +/- 0.0 | n/a | 9560.6 +/- 7173.0 | 9899.2 +/- 7185.6 | 338.7 +/- 230.4 | 149.3 +/- 25.7 |
| fhenix | mul_scalar | 50/50 | 482917.0 +/- 0.0 | n/a | 8647.4 +/- 6891.0 | 9145.3 +/- 6953.4 | 497.9 +/- 282.7 | 149.1 +/- 14.5 |
| fhenix | mean | 50/50 | 406004.0 +/- 0.0 | n/a | 7373.1 +/- 5883.9 | 12394.7 +/- 5915.8 | 5021.6 +/- 997.6 | 151.2 +/- 23.8 |
| fhenix | max | 50/50 | 347930.0 +/- 0.0 | n/a | 6926.9 +/- 5578.5 | 7284.8 +/- 5550.5 | 358.0 +/- 246.4 | 149.7 +/- 37.2 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 50 | 6234.4 +/- 178.2 |
| baseline | notarize | transaction.wait_receipt | 50 | 6992.2 +/- 5907.4 |
| baseline | notarize | completion.handle.read_attempt | 50 | 68.6 +/- 28.3 |
| baseline | notarize | completion.read_persisted_handle | 50 | 68.6 +/- 28.3 |
| baseline | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | add | transaction.invoke_sign_and_submit | 50 | 419.8 +/- 59.6 |
| baseline | add | transaction.wait_receipt | 50 | 9150.6 +/- 7164.4 |
| baseline | add | completion.handle.read_attempt | 50 | 61.8 +/- 21.7 |
| baseline | add | completion.read_persisted_handle | 50 | 61.8 +/- 21.7 |
| baseline | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 50 | 435.9 +/- 137.6 |
| baseline | mul_scalar | transaction.wait_receipt | 50 | 8181.4 +/- 6805.7 |
| baseline | mul_scalar | completion.handle.read_attempt | 50 | 60.0 +/- 17.6 |
| baseline | mul_scalar | completion.read_persisted_handle | 50 | 60.0 +/- 17.6 |
| baseline | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | transaction.invoke_sign_and_submit | 50 | 415.9 +/- 94.6 |
| baseline | mean | transaction.wait_receipt | 50 | 6952.7 +/- 5872.8 |
| baseline | mean | completion.handle.read_attempt | 50 | 57.8 +/- 12.8 |
| baseline | mean | completion.read_persisted_handle | 50 | 57.8 +/- 12.8 |
| baseline | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | transaction.invoke_sign_and_submit | 50 | 416.9 +/- 75.4 |
| baseline | max | transaction.wait_receipt | 50 | 6458.5 +/- 5590.7 |
| baseline | max | completion.handle.read_attempt | 50 | 64.3 +/- 35.4 |
| baseline | max | completion.read_persisted_handle | 50 | 64.3 +/- 35.4 |
| baseline | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 50 | 5724.4 +/- 52.4 |
| zama | notarize | encrypt.remote_input_approval | 50 | 8137.7 +/- 52.9 |
| zama | notarize | transaction.invoke_sign_and_submit | 50 | 371.7 +/- 69.2 |
| zama | notarize | transaction.wait_receipt | 50 | 4873.0 +/- 5952.1 |
| zama | notarize | completion.handle.read_attempt | 50 | 59.6 +/- 7.4 |
| zama | notarize | completion.read_persisted_handle | 50 | 59.6 +/- 7.4 |
| zama | notarize | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | notarize | completion.read_attempt | 50 | 3985.2 +/- 911.9 |
| zama | notarize | completion.sdk_user_decrypt | 50 | 3985.2 +/- 911.9 |
| zama | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 50 | 0.8 +/- 0.1 |
| zama | notarize | already_ready.read_attempt | 50 | 2336.1 +/- 41.8 |
| zama | notarize | already_ready.sdk_user_decrypt | 50 | 2336.1 +/- 41.8 |
| zama | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | transaction.invoke_sign_and_submit | 50 | 438.5 +/- 90.2 |
| zama | add | transaction.wait_receipt | 50 | 9156.7 +/- 7133.9 |
| zama | add | completion.handle.read_attempt | 50 | 67.7 +/- 42.0 |
| zama | add | completion.read_persisted_handle | 50 | 67.7 +/- 42.0 |
| zama | add | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.2 |
| zama | add | completion.read_attempt | 50 | 4174.0 +/- 847.6 |
| zama | add | completion.sdk_user_decrypt | 50 | 4174.0 +/- 847.6 |
| zama | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 50 | 0.8 +/- 0.1 |
| zama | add | already_ready.read_attempt | 50 | 2333.5 +/- 25.4 |
| zama | add | already_ready.sdk_user_decrypt | 50 | 2333.5 +/- 25.4 |
| zama | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 50 | 449.5 +/- 126.0 |
| zama | mul_scalar | transaction.wait_receipt | 50 | 8187.5 +/- 6894.4 |
| zama | mul_scalar | completion.handle.read_attempt | 50 | 65.3 +/- 56.5 |
| zama | mul_scalar | completion.read_persisted_handle | 50 | 65.3 +/- 56.5 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mul_scalar | completion.read_attempt | 50 | 4374.1 +/- 694.6 |
| zama | mul_scalar | completion.sdk_user_decrypt | 50 | 4422.9 +/- 589.5 |
| zama | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mul_scalar | already_ready.read_attempt | 50 | 2340.1 +/- 43.1 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 50 | 2340.1 +/- 43.1 |
| zama | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 2 | 1006.5 +/- 8.3 |
| zama | mean | transaction.invoke_sign_and_submit | 50 | 409.8 +/- 84.1 |
| zama | mean | transaction.wait_receipt | 50 | 6954.3 +/- 5847.7 |
| zama | mean | completion.handle.read_attempt | 50 | 59.6 +/- 13.6 |
| zama | mean | completion.read_persisted_handle | 50 | 59.6 +/- 13.6 |
| zama | mean | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mean | completion.read_attempt | 50 | 4305.1 +/- 748.2 |
| zama | mean | completion.sdk_user_decrypt | 50 | 4402.3 +/- 550.2 |
| zama | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.2 |
| zama | mean | already_ready.read_attempt | 50 | 2477.2 +/- 774.4 |
| zama | mean | already_ready.sdk_user_decrypt | 50 | 2477.2 +/- 774.4 |
| zama | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 4 | 1006.1 +/- 4.1 |
| zama | max | transaction.invoke_sign_and_submit | 50 | 410.4 +/- 59.0 |
| zama | max | transaction.wait_receipt | 50 | 6502.1 +/- 5683.0 |
| zama | max | completion.handle.read_attempt | 50 | 60.6 +/- 13.2 |
| zama | max | completion.read_persisted_handle | 50 | 60.6 +/- 13.2 |
| zama | max | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | max | completion.read_attempt | 50 | 4485.2 +/- 462.5 |
| zama | max | completion.sdk_user_decrypt | 50 | 4509.7 +/- 377.6 |
| zama | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | max | already_ready.read_attempt | 50 | 2345.9 +/- 41.8 |
| zama | max | already_ready.sdk_user_decrypt | 50 | 2345.9 +/- 41.8 |
| zama | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | completion.retry_backoff | 1 | 1000.6 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 2865.0 +/- 2892.5 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 691.0 +/- 24.5 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 5350.2 +/- 48.5 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 668.0 +/- 123.3 |
| fhenix | notarize | encrypt.sdk_total | 50 | 9574.4 +/- 2884.5 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 355.2 +/- 64.1 |
| fhenix | notarize | transaction.wait_receipt | 50 | 6301.2 +/- 5981.8 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 70.7 +/- 40.2 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 70.7 +/- 40.2 |
| fhenix | notarize | completion.read_attempt | 50 | 151.6 +/- 17.3 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 151.6 +/- 17.3 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 50 | 146.9 +/- 26.8 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 50 | 146.9 +/- 26.8 |
| fhenix | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 413.0 +/- 69.6 |
| fhenix | add | transaction.wait_receipt | 50 | 9147.6 +/- 7171.4 |
| fhenix | add | completion.handle.read_attempt | 50 | 67.9 +/- 49.0 |
| fhenix | add | completion.read_persisted_handle | 50 | 67.9 +/- 49.0 |
| fhenix | add | completion.read_attempt | 50 | 270.6 +/- 224.5 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 270.6 +/- 224.5 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 50 | 149.3 +/- 25.7 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 50 | 149.3 +/- 25.7 |
| fhenix | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 448.9 +/- 214.7 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 8198.6 +/- 6880.6 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 57.7 +/- 9.4 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 57.7 +/- 9.4 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 440.0 +/- 282.6 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 440.0 +/- 282.6 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 50 | 149.0 +/- 14.5 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 50 | 149.1 +/- 14.5 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 422.7 +/- 92.8 |
| fhenix | mean | transaction.wait_receipt | 50 | 6950.4 +/- 5889.4 |
| fhenix | mean | completion.handle.read_attempt | 50 | 58.7 +/- 15.0 |
| fhenix | mean | completion.read_persisted_handle | 50 | 58.7 +/- 15.0 |
| fhenix | mean | completion.read_attempt | 50 | 4962.7 +/- 999.2 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 50 | 4962.7 +/- 999.2 |
| fhenix | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 50 | 151.2 +/- 23.8 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 50 | 151.2 +/- 23.8 |
| fhenix | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 411.4 +/- 62.2 |
| fhenix | max | transaction.wait_receipt | 50 | 6515.5 +/- 5597.2 |
| fhenix | max | completion.handle.read_attempt | 50 | 61.3 +/- 24.7 |
| fhenix | max | completion.read_persisted_handle | 50 | 61.3 +/- 24.7 |
| fhenix | max | completion.read_attempt | 50 | 296.5 +/- 246.7 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 50 | 296.5 +/- 246.7 |
| fhenix | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 50 | 149.7 +/- 37.2 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 50 | 149.7 +/- 37.2 |
| fhenix | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
