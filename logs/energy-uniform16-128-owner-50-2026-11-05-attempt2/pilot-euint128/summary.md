# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 1/1 | 22064.0 +/- n/a | n/a | 3044.4 +/- n/a | 3153.1 +/- n/a | 108.7 +/- n/a | n/a |
| baseline | notarize | 1/1 | 31671.0 +/- n/a | n/a | 19081.2 +/- n/a | 19233.3 +/- n/a | 152.1 +/- n/a | n/a |
| baseline | add | 1/1 | 33358.0 +/- n/a | n/a | 7595.2 +/- n/a | 7704.7 +/- n/a | 109.4 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33736.0 +/- n/a | n/a | 17880.3 +/- n/a | 18019.9 +/- n/a | 139.6 +/- n/a | n/a |
| baseline | mean | 1/1 | 35556.0 +/- n/a | n/a | 8046.9 +/- n/a | 8166.1 +/- n/a | 119.2 +/- n/a | n/a |
| baseline | max | 1/1 | 35732.0 +/- n/a | n/a | 22202.0 +/- n/a | 22312.3 +/- n/a | 110.3 +/- n/a | n/a |
| zama | set_meter_owner | 1/1 | 472230.0 +/- n/a | 12489.3 +/- n/a | 2999.7 +/- n/a | 7554.1 +/- n/a | 4554.4 +/- n/a | n/a |
| zama | notarize | 1/1 | 472110.0 +/- n/a | 12609.4 +/- n/a | 18613.8 +/- n/a | 22472.5 +/- n/a | 3858.6 +/- n/a | n/a |
| zama | add | 1/1 | 328026.0 +/- n/a | n/a | 7580.2 +/- n/a | 12353.8 +/- n/a | 4773.7 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 324336.0 +/- n/a | n/a | 17919.7 +/- n/a | 21829.2 +/- n/a | 3909.5 +/- n/a | n/a |
| zama | mean | 1/1 | 344192.0 +/- n/a | n/a | 8094.5 +/- n/a | 10800.1 +/- n/a | 2705.6 +/- n/a | n/a |
| zama | max | 1/1 | 330055.0 +/- n/a | n/a | 21933.4 +/- n/a | 26779.1 +/- n/a | 4845.7 +/- n/a | n/a |
| fhenix | set_meter_owner | 1/1 | 306300.0 +/- n/a | 11866.9 +/- n/a | 3091.1 +/- n/a | 3346.0 +/- n/a | 255.0 +/- n/a | n/a |
| fhenix | notarize | 1/1 | 306168.0 +/- n/a | 11885.3 +/- n/a | 18939.7 +/- n/a | 19214.1 +/- n/a | 274.4 +/- n/a | n/a |
| fhenix | add | 1/1 | 318066.0 +/- n/a | n/a | 7503.0 +/- n/a | 7773.7 +/- n/a | 270.7 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342550.0 +/- n/a | n/a | 17410.5 +/- n/a | 19355.2 +/- n/a | 1944.7 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373742.0 +/- n/a | n/a | 8611.3 +/- n/a | 20315.0 +/- n/a | 11703.7 +/- n/a | n/a |
| fhenix | max | 1/1 | 322190.0 +/- n/a | n/a | 22173.7 +/- n/a | 22459.3 +/- n/a | 285.6 +/- n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | set_meter_owner | transaction.prepare_and_sign | 1 | 145.8 +/- n/a |
| baseline | set_meter_owner | barrier.wait | 1 | 12829.0 +/- n/a |
| baseline | set_meter_owner | transaction.raw_broadcast | 1 | 108.6 +/- n/a |
| baseline | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 109.0 +/- n/a |
| baseline | set_meter_owner | transaction.receipt.read_attempt | 6 | 65.6 +/- 24.5 |
| baseline | set_meter_owner | transaction.wait_receipt | 1 | 2935.4 +/- n/a |
| baseline | set_meter_owner | completion.handle.read_attempt | 1 | 108.4 +/- n/a |
| baseline | set_meter_owner | completion.read_persisted_handle | 1 | 108.4 +/- n/a |
| baseline | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | notarize | transaction.prepare_and_sign | 1 | 125.2 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 12929.2 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 112.6 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 113.0 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 34 | 64.0 +/- 36.7 |
| baseline | notarize | transaction.wait_receipt | 1 | 18968.2 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 151.9 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 152.0 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 114.6 +/- n/a |
| baseline | add | barrier.wait | 1 | 292.7 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 114.9 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 115.2 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 14 | 62.3 +/- 21.4 |
| baseline | add | transaction.wait_receipt | 1 | 7480.0 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 109.3 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 109.3 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 239.0 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 276.1 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 112.7 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 113.0 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 32 | 62.7 +/- 37.5 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 17767.2 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 139.5 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 139.5 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 114.3 +/- n/a |
| baseline | mean | barrier.wait | 1 | 333.1 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 111.2 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 111.5 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 15 | 55.5 +/- 3.7 |
| baseline | mean | transaction.wait_receipt | 1 | 7935.4 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 119.1 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 119.1 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 307.2 +/- n/a |
| baseline | max | barrier.wait | 1 | 273.0 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 114.4 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 114.9 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 40 | 56.6 +/- 8.2 |
| baseline | max | transaction.wait_receipt | 1 | 22087.1 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 110.1 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 110.1 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | set_meter_owner | encrypt.local_ciphertext_and_zkproof | 1 | 10288.7 +/- n/a |
| zama | set_meter_owner | encrypt.remote_input_approval | 1 | 2200.6 +/- n/a |
| zama | set_meter_owner | transaction.prepare_and_sign | 1 | 220.2 +/- n/a |
| zama | set_meter_owner | barrier.wait | 1 | 265.6 +/- n/a |
| zama | set_meter_owner | transaction.raw_broadcast | 1 | 112.3 +/- n/a |
| zama | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 112.8 +/- n/a |
| zama | set_meter_owner | transaction.receipt.read_attempt | 6 | 56.3 +/- 5.0 |
| zama | set_meter_owner | transaction.wait_receipt | 1 | 2886.9 +/- n/a |
| zama | set_meter_owner | completion.handle.read_attempt | 1 | 58.9 +/- n/a |
| zama | set_meter_owner | completion.read_persisted_handle | 1 | 58.9 +/- n/a |
| zama | set_meter_owner | completion.local_keypair_and_authorization | 1 | 1.7 +/- n/a |
| zama | set_meter_owner | completion.read_attempt | 1 | 4493.3 +/- n/a |
| zama | set_meter_owner | completion.sdk_user_decrypt | 1 | 4493.3 +/- n/a |
| zama | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 10415.5 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2193.9 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 168.3 +/- n/a |
| zama | notarize | barrier.wait | 1 | 276.8 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 105.4 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 106.0 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 33 | 70.5 +/- 35.2 |
| zama | notarize | transaction.wait_receipt | 1 | 18507.8 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 108.0 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 108.0 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.8 +/- n/a |
| zama | notarize | completion.retry_backoff | 1 | 1004.8 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2564.7 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 3748.5 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 114.7 +/- n/a |
| zama | add | barrier.wait | 1 | 292.5 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 101.6 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 102.0 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 14 | 62.3 +/- 6.9 |
| zama | add | transaction.wait_receipt | 1 | 7478.2 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 112.8 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 112.9 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.3 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4659.2 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4659.2 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 175.2 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 339.9 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 106.2 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 106.6 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 32 | 64.7 +/- 41.6 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 17813.1 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 121.7 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 121.7 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | mul_scalar | completion.retry_backoff | 1 | 1002.0 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 2585.2 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 3785.9 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 160.3 +/- n/a |
| zama | mean | barrier.wait | 1 | 287.0 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 104.1 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 104.4 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 15 | 58.2 +/- 8.3 |
| zama | mean | transaction.wait_receipt | 1 | 7990.1 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 117.7 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 117.7 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 2585.9 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 2585.9 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 278.0 +/- n/a |
| zama | max | barrier.wait | 1 | 302.1 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 141.2 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 141.7 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 39 | 63.6 +/- 5.2 |
| zama | max | transaction.wait_receipt | 1 | 21791.7 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 110.8 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 110.8 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | max | completion.read_attempt | 1 | 4733.4 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 4733.4 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 1 | 1158.6 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 1 | 0.2 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 1 | 9532.2 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 1 | 1175.5 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_total | 1 | 11866.9 +/- n/a |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 1 | 223.6 +/- n/a |
| fhenix | set_meter_owner | barrier.wait | 1 | 884.5 +/- n/a |
| fhenix | set_meter_owner | transaction.raw_broadcast | 1 | 112.6 +/- n/a |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 113.1 +/- n/a |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 6 | 72.5 +/- 43.9 |
| fhenix | set_meter_owner | transaction.wait_receipt | 1 | 2977.9 +/- n/a |
| fhenix | set_meter_owner | completion.handle.read_attempt | 1 | 61.6 +/- n/a |
| fhenix | set_meter_owner | completion.read_persisted_handle | 1 | 61.6 +/- n/a |
| fhenix | set_meter_owner | completion.read_attempt | 1 | 192.9 +/- n/a |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 1 | 192.9 +/- n/a |
| fhenix | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 1089.7 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 9777.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 1018.4 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 11885.3 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 213.2 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 955.8 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 105.4 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 105.9 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 34 | 59.9 +/- 9.9 |
| fhenix | notarize | transaction.wait_receipt | 1 | 18833.7 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 105.3 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 105.4 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 168.6 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 168.6 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 114.2 +/- n/a |
| fhenix | add | barrier.wait | 1 | 293.0 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 114.8 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 115.1 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 14 | 56.1 +/- 6.1 |
| fhenix | add | transaction.wait_receipt | 1 | 7387.9 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 113.3 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 113.4 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 157.0 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 157.0 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 175.3 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 339.8 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 106.4 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 106.7 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 31 | 67.1 +/- 34.5 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 17303.8 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 119.9 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 119.9 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 1824.4 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 1824.4 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 156.6 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 290.7 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 104.4 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 104.7 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 16 | 56.2 +/- 4.5 |
| fhenix | mean | transaction.wait_receipt | 1 | 8506.5 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 112.5 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 112.5 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 11591.0 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 11591.0 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 183.8 +/- n/a |
| fhenix | max | barrier.wait | 1 | 396.4 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 104.8 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 105.2 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 40 | 55.4 +/- 10.0 |
| fhenix | max | transaction.wait_receipt | 1 | 22068.5 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 127.0 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 127.0 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 158.3 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 158.3 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
