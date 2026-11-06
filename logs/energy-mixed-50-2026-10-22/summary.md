# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 11/11 | 34185.0 +/- 0.0 | n/a | 16487.0 +/- 8159.3 | 16556.7 +/- 8154.9 | 69.7 +/- 18.2 | n/a |
| baseline | add | 10/11 | 36022.0 +/- 0.0 | n/a | 7068.0 +/- 3050.7 | 7220.6 +/- 3200.6 | 69.6 +/- 24.5 | n/a |
| baseline | mul_scalar | 10/10 | 36011.0 +/- 0.0 | n/a | 7363.2 +/- 5295.9 | 7423.9 +/- 5296.1 | 60.7 +/- 6.1 | n/a |
| baseline | mean | 10/10 | 37938.0 +/- 0.0 | n/a | 8930.5 +/- 5619.6 | 8991.4 +/- 5613.2 | 60.9 +/- 10.2 | n/a |
| baseline | max | 10/10 | 37945.0 +/- 0.0 | n/a | 10428.6 +/- 8564.9 | 10496.4 +/- 8567.3 | 67.8 +/- 21.4 | n/a |
| zama | notarize | 11/11 | 486174.9 +/- 14.7 | 13791.5 +/- 95.9 | 13191.5 +/- 9879.2 | 16513.2 +/- 9431.5 | 3321.8 +/- 1056.3 | 2365.4 +/- 36.1 |
| zama | add | 11/11 | 343061.0 +/- 0.0 | n/a | 7067.8 +/- 3032.6 | 11353.2 +/- 3107.0 | 4285.3 +/- 811.7 | 2377.7 +/- 63.4 |
| zama | mul_scalar | 10/10 | 339220.0 +/- 0.0 | n/a | 7340.2 +/- 5303.6 | 11658.5 +/- 5572.3 | 4318.3 +/- 871.5 | 2356.0 +/- 20.5 |
| zama | mean | 10/10 | 358387.6 +/- 1.3 | n/a | 8866.2 +/- 5600.4 | 13555.6 +/- 5603.1 | 4689.4 +/- 78.4 | 2374.0 +/- 75.3 |
| zama | max | 10/10 | 344627.0 +/- 0.0 | n/a | 10532.2 +/- 8615.8 | 15067.4 +/- 8512.5 | 4535.2 +/- 560.6 | 2338.0 +/- 27.7 |
| fhenix | notarize | 11/11 | 320489.5 +/- 8.3 | 8728.6 +/- 2879.8 | 10079.8 +/- 8166.8 | 10297.6 +/- 8175.0 | 217.8 +/- 14.2 | 146.4 +/- 11.7 |
| fhenix | add | 10/11 | 343751.0 +/- 0.0 | n/a | 7073.5 +/- 3078.2 | 7721.1 +/- 3419.1 | 558.6 +/- 520.6 | 165.3 +/- 33.4 |
| fhenix | mul_scalar | 10/10 | 482917.0 +/- 0.0 | n/a | 7357.1 +/- 5298.1 | 8340.0 +/- 5204.1 | 982.9 +/- 518.6 | 164.2 +/- 39.9 |
| fhenix | mean | 10/10 | 406004.0 +/- 0.0 | n/a | 8848.2 +/- 5452.3 | 16249.1 +/- 7430.7 | 7400.9 +/- 4330.9 | 165.1 +/- 27.8 |
| fhenix | max | 10/10 | 347930.0 +/- 0.0 | n/a | 10476.7 +/- 8436.2 | 10951.8 +/- 8386.3 | 475.1 +/- 461.8 | 152.5 +/- 14.2 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 11 | 6312.4 +/- 211.6 |
| baseline | notarize | transaction.wait_receipt | 11 | 10174.5 +/- 8168.0 |
| baseline | notarize | completion.handle.read_attempt | 11 | 69.7 +/- 18.2 |
| baseline | notarize | completion.read_persisted_handle | 11 | 69.7 +/- 18.2 |
| baseline | notarize | completion.validate_plaintext | 11 | 0.0 +/- 0.0 |
| baseline | add | transaction.invoke_sign_and_submit | 11 | 453.6 +/- 46.8 |
| baseline | add | transaction.wait_receipt | 11 | 6614.4 +/- 3042.3 |
| baseline | add | completion.handle.read_attempt | 10 | 69.5 +/- 24.5 |
| baseline | add | completion.read_persisted_handle | 10 | 69.6 +/- 24.5 |
| baseline | add | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 10 | 482.1 +/- 166.1 |
| baseline | mul_scalar | transaction.wait_receipt | 10 | 6881.1 +/- 5319.0 |
| baseline | mul_scalar | completion.handle.read_attempt | 10 | 60.7 +/- 6.1 |
| baseline | mul_scalar | completion.read_persisted_handle | 10 | 60.7 +/- 6.1 |
| baseline | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | mean | transaction.invoke_sign_and_submit | 10 | 430.1 +/- 65.6 |
| baseline | mean | transaction.wait_receipt | 10 | 8500.4 +/- 5590.5 |
| baseline | mean | completion.handle.read_attempt | 10 | 60.8 +/- 10.2 |
| baseline | mean | completion.read_persisted_handle | 10 | 60.9 +/- 10.2 |
| baseline | mean | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | max | transaction.invoke_sign_and_submit | 10 | 411.2 +/- 48.8 |
| baseline | max | transaction.wait_receipt | 10 | 10017.4 +/- 8573.9 |
| baseline | max | completion.handle.read_attempt | 10 | 67.8 +/- 21.4 |
| baseline | max | completion.read_persisted_handle | 10 | 67.8 +/- 21.4 |
| baseline | max | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 11 | 5642.9 +/- 65.8 |
| zama | notarize | encrypt.remote_input_approval | 11 | 8148.5 +/- 81.3 |
| zama | notarize | transaction.invoke_sign_and_submit | 11 | 412.0 +/- 49.7 |
| zama | notarize | transaction.wait_receipt | 11 | 12779.5 +/- 9858.8 |
| zama | notarize | completion.handle.read_attempt | 11 | 59.5 +/- 6.3 |
| zama | notarize | completion.read_persisted_handle | 11 | 59.5 +/- 6.3 |
| zama | notarize | completion.local_keypair_and_authorization | 11 | 1.0 +/- 0.1 |
| zama | notarize | completion.read_attempt | 11 | 3261.0 +/- 1056.4 |
| zama | notarize | completion.sdk_user_decrypt | 11 | 3261.0 +/- 1056.4 |
| zama | notarize | completion.validate_plaintext | 11 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 11 | 0.9 +/- 0.1 |
| zama | notarize | already_ready.read_attempt | 11 | 2364.4 +/- 36.1 |
| zama | notarize | already_ready.sdk_user_decrypt | 11 | 2364.4 +/- 36.1 |
| zama | notarize | already_ready.validate_plaintext | 11 | 0.0 +/- 0.0 |
| zama | add | transaction.invoke_sign_and_submit | 11 | 439.4 +/- 66.2 |
| zama | add | transaction.wait_receipt | 11 | 6628.4 +/- 3060.4 |
| zama | add | completion.handle.read_attempt | 11 | 65.8 +/- 9.3 |
| zama | add | completion.read_persisted_handle | 11 | 65.8 +/- 9.3 |
| zama | add | completion.local_keypair_and_authorization | 11 | 1.0 +/- 0.2 |
| zama | add | completion.read_attempt | 11 | 4108.0 +/- 947.4 |
| zama | add | completion.sdk_user_decrypt | 11 | 4218.2 +/- 816.9 |
| zama | add | completion.validate_plaintext | 11 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 11 | 0.9 +/- 0.2 |
| zama | add | already_ready.read_attempt | 11 | 2376.6 +/- 63.4 |
| zama | add | already_ready.sdk_user_decrypt | 11 | 2376.6 +/- 63.4 |
| zama | add | already_ready.validate_plaintext | 11 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 1 | 1001.4 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 10 | 460.6 +/- 159.3 |
| zama | mul_scalar | transaction.wait_receipt | 10 | 6879.6 +/- 5322.9 |
| zama | mul_scalar | completion.handle.read_attempt | 10 | 63.0 +/- 10.2 |
| zama | mul_scalar | completion.read_persisted_handle | 10 | 63.0 +/- 10.2 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 10 | 1.0 +/- 0.2 |
| zama | mul_scalar | completion.read_attempt | 10 | 4254.0 +/- 870.9 |
| zama | mul_scalar | completion.sdk_user_decrypt | 10 | 4254.0 +/- 870.9 |
| zama | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 10 | 0.9 +/- 0.1 |
| zama | mul_scalar | already_ready.read_attempt | 10 | 2354.9 +/- 20.5 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 10 | 2355.0 +/- 20.5 |
| zama | mul_scalar | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | mean | transaction.invoke_sign_and_submit | 10 | 444.4 +/- 65.0 |
| zama | mean | transaction.wait_receipt | 10 | 8421.8 +/- 5625.8 |
| zama | mean | completion.handle.read_attempt | 10 | 63.8 +/- 7.2 |
| zama | mean | completion.read_persisted_handle | 10 | 63.8 +/- 7.2 |
| zama | mean | completion.local_keypair_and_authorization | 10 | 0.9 +/- 0.2 |
| zama | mean | completion.read_attempt | 10 | 4624.4 +/- 79.5 |
| zama | mean | completion.sdk_user_decrypt | 10 | 4624.4 +/- 79.5 |
| zama | mean | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 10 | 0.9 +/- 0.1 |
| zama | mean | already_ready.read_attempt | 10 | 2372.9 +/- 75.3 |
| zama | mean | already_ready.sdk_user_decrypt | 10 | 2372.9 +/- 75.3 |
| zama | mean | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | max | transaction.invoke_sign_and_submit | 10 | 457.9 +/- 52.7 |
| zama | max | transaction.wait_receipt | 10 | 10074.3 +/- 8609.9 |
| zama | max | completion.handle.read_attempt | 10 | 96.2 +/- 98.8 |
| zama | max | completion.read_persisted_handle | 10 | 96.2 +/- 98.8 |
| zama | max | completion.local_keypair_and_authorization | 10 | 0.9 +/- 0.1 |
| zama | max | completion.read_attempt | 10 | 4437.9 +/- 658.2 |
| zama | max | completion.sdk_user_decrypt | 10 | 4437.9 +/- 658.2 |
| zama | max | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 10 | 0.9 +/- 0.2 |
| zama | max | already_ready.read_attempt | 10 | 2336.9 +/- 27.6 |
| zama | max | already_ready.sdk_user_decrypt | 10 | 2336.9 +/- 27.6 |
| zama | max | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 11 | 2047.6 +/- 2837.8 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 11 | 683.4 +/- 19.9 |
| fhenix | notarize | encrypt.sdk_observed.pack | 11 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 11 | 5365.4 +/- 69.4 |
| fhenix | notarize | encrypt.sdk_observed.verify | 11 | 632.0 +/- 14.3 |
| fhenix | notarize | encrypt.sdk_total | 11 | 8728.6 +/- 2879.8 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 11 | 362.5 +/- 15.4 |
| fhenix | notarize | transaction.wait_receipt | 11 | 9717.3 +/- 8165.1 |
| fhenix | notarize | completion.handle.read_attempt | 11 | 67.7 +/- 10.4 |
| fhenix | notarize | completion.read_persisted_handle | 11 | 67.7 +/- 10.4 |
| fhenix | notarize | completion.read_attempt | 11 | 149.9 +/- 8.3 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 11 | 149.9 +/- 8.3 |
| fhenix | notarize | completion.validate_plaintext | 11 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 11 | 146.4 +/- 11.7 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 11 | 146.4 +/- 11.7 |
| fhenix | notarize | already_ready.validate_plaintext | 11 | 0.0 +/- 0.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 11 | 411.6 +/- 42.6 |
| fhenix | add | transaction.wait_receipt | 11 | 6661.9 +/- 3075.8 |
| fhenix | add | completion.handle.read_attempt | 10 | 68.0 +/- 12.0 |
| fhenix | add | completion.read_persisted_handle | 10 | 68.0 +/- 12.0 |
| fhenix | add | completion.read_attempt | 10 | 490.4 +/- 522.7 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 10 | 490.4 +/- 522.7 |
| fhenix | add | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 10 | 165.3 +/- 33.4 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 10 | 165.3 +/- 33.4 |
| fhenix | add | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 10 | 471.8 +/- 152.4 |
| fhenix | mul_scalar | transaction.wait_receipt | 10 | 6885.3 +/- 5332.6 |
| fhenix | mul_scalar | completion.handle.read_attempt | 10 | 58.5 +/- 5.8 |
| fhenix | mul_scalar | completion.read_persisted_handle | 10 | 58.5 +/- 5.8 |
| fhenix | mul_scalar | completion.read_attempt | 10 | 924.2 +/- 523.6 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 10 | 924.2 +/- 523.6 |
| fhenix | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 10 | 164.2 +/- 39.9 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 10 | 164.2 +/- 39.9 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.invoke_sign_and_submit | 10 | 438.1 +/- 52.9 |
| fhenix | mean | transaction.wait_receipt | 10 | 8410.0 +/- 5432.4 |
| fhenix | mean | completion.handle.read_attempt | 10 | 88.1 +/- 87.9 |
| fhenix | mean | completion.read_persisted_handle | 10 | 88.1 +/- 87.9 |
| fhenix | mean | completion.read_attempt | 10 | 7312.6 +/- 4350.0 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 10 | 7312.6 +/- 4349.9 |
| fhenix | mean | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 10 | 165.1 +/- 27.8 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 10 | 165.1 +/- 27.8 |
| fhenix | mean | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | max | transaction.invoke_sign_and_submit | 10 | 408.4 +/- 52.6 |
| fhenix | max | transaction.wait_receipt | 10 | 10068.3 +/- 8463.2 |
| fhenix | max | completion.handle.read_attempt | 10 | 95.8 +/- 94.8 |
| fhenix | max | completion.read_persisted_handle | 10 | 95.8 +/- 94.8 |
| fhenix | max | completion.read_attempt | 10 | 379.1 +/- 467.7 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 10 | 379.1 +/- 467.7 |
| fhenix | max | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 10 | 152.5 +/- 14.2 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 10 | 152.5 +/- 14.2 |
| fhenix | max | already_ready.validate_plaintext | 10 | 0.0 +/- 0.0 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
