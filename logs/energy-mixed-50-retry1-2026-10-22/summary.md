# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 50/50 | 34185.0 +/- 0.0 | n/a | 13088.4 +/- 5190.9 | 13150.7 +/- 5191.5 | 62.2 +/- 9.2 | n/a |
| baseline | add | 50/50 | 36022.0 +/- 0.0 | n/a | 8574.1 +/- 6599.3 | 8636.1 +/- 6599.4 | 62.0 +/- 7.1 | n/a |
| baseline | mul_scalar | 50/50 | 36011.0 +/- 0.0 | n/a | 6812.8 +/- 5229.9 | 6875.3 +/- 5231.2 | 62.5 +/- 8.9 | n/a |
| baseline | mean | 50/50 | 37938.0 +/- 0.0 | n/a | 7718.3 +/- 6889.8 | 7783.3 +/- 6887.6 | 65.0 +/- 15.2 | n/a |
| baseline | max | 50/50 | 37945.0 +/- 0.0 | n/a | 8161.6 +/- 8423.1 | 8245.5 +/- 8414.9 | 83.9 +/- 153.6 | n/a |
| zama | notarize | 50/50 | 486177.2 +/- 11.9 | 13870.5 +/- 93.4 | 6552.7 +/- 5630.6 | 10933.8 +/- 5876.6 | 4381.1 +/- 898.9 | 2385.5 +/- 182.1 |
| zama | add | 50/50 | 343059.0 +/- 2.0 | n/a | 8580.8 +/- 6560.7 | 13132.9 +/- 6749.1 | 4552.1 +/- 925.2 | 2360.1 +/- 39.7 |
| zama | mul_scalar | 50/50 | 339217.3 +/- 1.9 | n/a | 6823.0 +/- 5148.6 | 11782.3 +/- 5115.6 | 4959.3 +/- 1279.3 | 2371.2 +/- 59.2 |
| zama | mean | 50/50 | 358385.5 +/- 2.0 | n/a | 7763.6 +/- 6829.3 | 12434.1 +/- 6889.9 | 4670.6 +/- 447.1 | 2364.1 +/- 57.5 |
| zama | max | 50/50 | 344625.0 +/- 2.0 | n/a | 8219.8 +/- 8412.8 | 12977.4 +/- 8507.6 | 4757.6 +/- 639.0 | 2374.1 +/- 93.0 |
| fhenix | notarize | 50/50 | 320492.2 +/- 6.6 | 9565.4 +/- 2872.6 | 6608.0 +/- 5198.8 | 6844.1 +/- 5194.6 | 236.2 +/- 81.8 | 155.8 +/- 35.4 |
| fhenix | add | 50/50 | 343751.0 +/- 0.0 | n/a | 8545.5 +/- 6564.0 | 9041.1 +/- 6608.8 | 495.5 +/- 454.5 | 162.4 +/- 46.2 |
| fhenix | mul_scalar | 50/50 | 482917.0 +/- 0.0 | n/a | 6863.1 +/- 5201.3 | 7858.3 +/- 5140.6 | 995.2 +/- 581.4 | 152.1 +/- 22.9 |
| fhenix | mean | 50/50 | 406004.0 +/- 0.0 | n/a | 7733.5 +/- 6847.9 | 13217.2 +/- 6962.4 | 5483.7 +/- 1434.3 | 255.4 +/- 704.7 |
| fhenix | max | 50/50 | 347930.0 +/- 0.0 | n/a | 8222.2 +/- 8463.2 | 8778.2 +/- 8410.5 | 556.0 +/- 492.2 | 148.8 +/- 23.3 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 50 | 6261.8 +/- 181.6 |
| baseline | notarize | transaction.wait_receipt | 50 | 6826.6 +/- 5140.1 |
| baseline | notarize | completion.handle.read_attempt | 50 | 62.2 +/- 9.2 |
| baseline | notarize | completion.read_persisted_handle | 50 | 62.2 +/- 9.2 |
| baseline | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | add | transaction.invoke_sign_and_submit | 50 | 443.5 +/- 55.5 |
| baseline | add | transaction.wait_receipt | 50 | 8130.6 +/- 6592.5 |
| baseline | add | completion.handle.read_attempt | 50 | 62.0 +/- 7.1 |
| baseline | add | completion.read_persisted_handle | 50 | 62.0 +/- 7.1 |
| baseline | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 50 | 437.6 +/- 98.8 |
| baseline | mul_scalar | transaction.wait_receipt | 50 | 6375.2 +/- 5211.2 |
| baseline | mul_scalar | completion.handle.read_attempt | 50 | 62.5 +/- 8.9 |
| baseline | mul_scalar | completion.read_persisted_handle | 50 | 62.5 +/- 8.9 |
| baseline | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | transaction.invoke_sign_and_submit | 50 | 438.0 +/- 66.0 |
| baseline | mean | transaction.wait_receipt | 50 | 7280.3 +/- 6901.8 |
| baseline | mean | completion.handle.read_attempt | 50 | 65.0 +/- 15.2 |
| baseline | mean | completion.read_persisted_handle | 50 | 65.0 +/- 15.2 |
| baseline | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | transaction.invoke_sign_and_submit | 50 | 460.8 +/- 126.3 |
| baseline | max | transaction.wait_receipt | 50 | 7700.7 +/- 8402.8 |
| baseline | max | completion.handle.read_attempt | 50 | 62.2 +/- 9.1 |
| baseline | max | completion.read_persisted_handle | 50 | 83.9 +/- 153.6 |
| baseline | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | completion.handle.retry_backoff | 1 | 1014.2 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 50 | 5712.2 +/- 36.3 |
| zama | notarize | encrypt.remote_input_approval | 50 | 8158.2 +/- 77.5 |
| zama | notarize | transaction.invoke_sign_and_submit | 50 | 413.9 +/- 71.7 |
| zama | notarize | transaction.wait_receipt | 50 | 6138.8 +/- 5618.4 |
| zama | notarize | completion.handle.read_attempt | 50 | 62.4 +/- 7.4 |
| zama | notarize | completion.read_persisted_handle | 50 | 62.4 +/- 7.4 |
| zama | notarize | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | notarize | completion.read_attempt | 50 | 4292.8 +/- 936.1 |
| zama | notarize | completion.sdk_user_decrypt | 50 | 4317.6 +/- 898.6 |
| zama | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 50 | 0.8 +/- 0.1 |
| zama | notarize | already_ready.read_attempt | 50 | 2384.5 +/- 182.1 |
| zama | notarize | already_ready.sdk_user_decrypt | 50 | 2384.5 +/- 182.1 |
| zama | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 1 | 1013.4 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 50 | 434.8 +/- 57.1 |
| zama | add | transaction.wait_receipt | 50 | 8146.0 +/- 6558.0 |
| zama | add | completion.handle.read_attempt | 50 | 63.9 +/- 15.9 |
| zama | add | completion.read_persisted_handle | 50 | 85.6 +/- 153.5 |
| zama | add | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | add | completion.read_attempt | 50 | 4440.0 +/- 993.3 |
| zama | add | completion.sdk_user_decrypt | 50 | 4465.3 +/- 956.9 |
| zama | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | add | already_ready.read_attempt | 50 | 2359.1 +/- 39.7 |
| zama | add | already_ready.sdk_user_decrypt | 50 | 2359.1 +/- 39.7 |
| zama | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 1 | 1003.2 +/- n/a |
| zama | add | completion.handle.retry_backoff | 1 | 1013.2 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 50 | 453.7 +/- 90.1 |
| zama | mul_scalar | transaction.wait_receipt | 50 | 6369.3 +/- 5144.1 |
| zama | mul_scalar | completion.handle.read_attempt | 50 | 62.3 +/- 9.6 |
| zama | mul_scalar | completion.read_persisted_handle | 50 | 62.3 +/- 9.6 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mul_scalar | completion.read_attempt | 50 | 4872.0 +/- 1314.4 |
| zama | mul_scalar | completion.sdk_user_decrypt | 50 | 4895.9 +/- 1279.3 |
| zama | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mul_scalar | already_ready.read_attempt | 50 | 2370.1 +/- 59.2 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 50 | 2370.1 +/- 59.2 |
| zama | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 1 | 1004.2 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 50 | 442.3 +/- 61.0 |
| zama | mean | transaction.wait_receipt | 50 | 7321.2 +/- 6832.7 |
| zama | mean | completion.handle.read_attempt | 50 | 64.2 +/- 18.9 |
| zama | mean | completion.read_persisted_handle | 50 | 64.2 +/- 18.9 |
| zama | mean | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mean | completion.retry_backoff | 2 | 1006.8 +/- 2.5 |
| zama | mean | completion.read_attempt | 50 | 4556.0 +/- 497.0 |
| zama | mean | completion.sdk_user_decrypt | 50 | 4605.2 +/- 444.0 |
| zama | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | mean | already_ready.read_attempt | 50 | 2363.1 +/- 57.4 |
| zama | mean | already_ready.sdk_user_decrypt | 50 | 2363.1 +/- 57.4 |
| zama | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | transaction.invoke_sign_and_submit | 50 | 463.6 +/- 144.4 |
| zama | max | transaction.wait_receipt | 50 | 7756.1 +/- 8393.2 |
| zama | max | completion.handle.read_attempt | 50 | 65.5 +/- 16.1 |
| zama | max | completion.read_persisted_handle | 50 | 65.5 +/- 16.1 |
| zama | max | completion.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | max | completion.read_attempt | 50 | 4641.4 +/- 754.2 |
| zama | max | completion.sdk_user_decrypt | 50 | 4691.0 +/- 635.5 |
| zama | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 50 | 0.9 +/- 0.1 |
| zama | max | already_ready.read_attempt | 50 | 2373.1 +/- 93.0 |
| zama | max | already_ready.sdk_user_decrypt | 50 | 2373.1 +/- 93.0 |
| zama | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | completion.retry_backoff | 2 | 1011.5 +/- 0.5 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 2859.5 +/- 2886.9 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 690.0 +/- 27.4 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 5359.5 +/- 42.8 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 656.1 +/- 78.2 |
| fhenix | notarize | encrypt.sdk_total | 50 | 9565.4 +/- 2872.6 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 407.0 +/- 145.3 |
| fhenix | notarize | transaction.wait_receipt | 50 | 6201.0 +/- 5227.5 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 62.3 +/- 12.8 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 62.4 +/- 12.8 |
| fhenix | notarize | completion.read_attempt | 50 | 173.6 +/- 76.9 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 173.6 +/- 76.9 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 50 | 155.8 +/- 35.4 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 50 | 155.8 +/- 35.4 |
| fhenix | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 440.1 +/- 61.9 |
| fhenix | add | transaction.wait_receipt | 50 | 8105.4 +/- 6575.2 |
| fhenix | add | completion.handle.read_attempt | 50 | 67.7 +/- 27.9 |
| fhenix | add | completion.read_persisted_handle | 50 | 67.7 +/- 27.9 |
| fhenix | add | completion.read_attempt | 50 | 427.7 +/- 458.0 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 427.7 +/- 458.0 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 50 | 162.4 +/- 46.2 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 50 | 162.4 +/- 46.2 |
| fhenix | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 449.0 +/- 87.0 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 6414.1 +/- 5191.3 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 64.7 +/- 14.4 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 64.7 +/- 14.4 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 930.4 +/- 585.1 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 930.4 +/- 585.1 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 50 | 152.1 +/- 22.9 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 50 | 152.1 +/- 22.9 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 441.9 +/- 57.4 |
| fhenix | mean | transaction.wait_receipt | 50 | 7291.6 +/- 6857.9 |
| fhenix | mean | completion.handle.read_attempt | 50 | 65.9 +/- 16.4 |
| fhenix | mean | completion.read_persisted_handle | 50 | 65.9 +/- 16.4 |
| fhenix | mean | completion.read_attempt | 50 | 5417.6 +/- 1430.7 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 50 | 5417.6 +/- 1430.7 |
| fhenix | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 50 | 255.4 +/- 704.7 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 50 | 255.4 +/- 704.7 |
| fhenix | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 464.6 +/- 127.9 |
| fhenix | max | transaction.wait_receipt | 50 | 7757.6 +/- 8438.9 |
| fhenix | max | completion.handle.read_attempt | 50 | 65.1 +/- 17.5 |
| fhenix | max | completion.read_persisted_handle | 50 | 86.8 +/- 155.0 |
| fhenix | max | completion.read_attempt | 50 | 469.0 +/- 481.1 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 50 | 469.0 +/- 481.1 |
| fhenix | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 50 | 148.8 +/- 23.3 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 50 | 148.8 +/- 23.3 |
| fhenix | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 1 | 1008.9 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
