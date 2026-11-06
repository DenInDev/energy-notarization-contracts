# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 34185.0 +/- n/a | n/a | 25331.7 +/- n/a | 25398.4 +/- n/a | 66.7 +/- n/a | n/a |
| baseline | add | 1/1 | 36022.0 +/- n/a | n/a | 19297.0 +/- n/a | 19357.9 +/- n/a | 60.9 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 36011.0 +/- n/a | n/a | 3490.8 +/- n/a | 3557.9 +/- n/a | 67.1 +/- n/a | n/a |
| baseline | mean | 1/1 | 37938.0 +/- n/a | n/a | 7825.4 +/- n/a | 7883.1 +/- n/a | 57.7 +/- n/a | n/a |
| baseline | max | 1/1 | 37945.0 +/- n/a | n/a | 26234.2 +/- n/a | 26306.7 +/- n/a | 72.5 +/- n/a | n/a |
| zama | notarize | 1/1 | 486188.0 +/- n/a | 13770.0 +/- n/a | 17745.8 +/- n/a | 20473.8 +/- n/a | 2728.0 +/- n/a | 2366.7 +/- n/a |
| zama | add | 1/1 | 343061.0 +/- n/a | n/a | 19492.4 +/- n/a | 24227.9 +/- n/a | 4735.5 +/- n/a | 2380.8 +/- n/a |
| zama | mul_scalar | 1/1 | 339220.0 +/- n/a | n/a | 4149.9 +/- n/a | 6627.9 +/- n/a | 2478.0 +/- n/a | 2357.5 +/- n/a |
| zama | mean | 1/1 | 358388.0 +/- n/a | n/a | 8008.7 +/- n/a | 12773.9 +/- n/a | 4765.2 +/- n/a | 2318.3 +/- n/a |
| zama | max | 1/1 | 344627.0 +/- n/a | n/a | 26120.1 +/- n/a | 30767.4 +/- n/a | 4647.3 +/- n/a | 2358.7 +/- n/a |
| fhenix | notarize | 1/1 | 320496.0 +/- n/a | 12313.7 +/- n/a | 19140.6 +/- n/a | 19345.4 +/- n/a | 204.9 +/- n/a | 146.4 +/- n/a |
| fhenix | add | 1/1 | 343751.0 +/- n/a | n/a | 19434.5 +/- n/a | 19713.4 +/- n/a | 278.9 +/- n/a | 142.3 +/- n/a |
| fhenix | mul_scalar | 1/1 | 482917.0 +/- n/a | n/a | 3546.0 +/- n/a | 4843.4 +/- n/a | 1297.5 +/- n/a | 143.8 +/- n/a |
| fhenix | mean | 1/1 | 406004.0 +/- n/a | n/a | 7944.2 +/- n/a | 16863.8 +/- n/a | 8919.6 +/- n/a | 242.7 +/- n/a |
| fhenix | max | 1/1 | 347930.0 +/- n/a | n/a | 25995.1 +/- n/a | 26347.9 +/- n/a | 352.8 +/- n/a | 252.5 +/- n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 6078.7 +/- n/a |
| baseline | notarize | transaction.wait_receipt | 1 | 19253.0 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 66.7 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 66.7 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 418.4 +/- n/a |
| baseline | add | transaction.wait_receipt | 1 | 18878.6 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 60.9 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 60.9 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 409.6 +/- n/a |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 3081.3 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 67.0 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 67.1 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 344.7 +/- n/a |
| baseline | mean | transaction.wait_receipt | 1 | 7480.7 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 57.7 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 57.7 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 537.8 +/- n/a |
| baseline | max | transaction.wait_receipt | 1 | 25696.3 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 72.5 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 72.5 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 5632.8 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 8137.1 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 439.9 +/- n/a |
| zama | notarize | transaction.wait_receipt | 1 | 17306.0 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 55.5 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 55.5 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.1 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2671.1 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 2671.1 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | already_ready.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | notarize | already_ready.read_attempt | 1 | 2365.5 +/- n/a |
| zama | notarize | already_ready.sdk_user_decrypt | 1 | 2365.5 +/- n/a |
| zama | notarize | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 470.4 +/- n/a |
| zama | add | transaction.wait_receipt | 1 | 19022.0 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 69.1 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 69.1 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4665.2 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4665.2 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | already_ready.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | add | already_ready.read_attempt | 1 | 2379.5 +/- n/a |
| zama | add | already_ready.sdk_user_decrypt | 1 | 2379.6 +/- n/a |
| zama | add | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 394.6 +/- n/a |
| zama | mul_scalar | transaction.wait_receipt | 1 | 3755.3 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 56.2 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 56.2 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.0 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 2420.0 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 2420.0 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mul_scalar | already_ready.read_attempt | 1 | 2356.4 +/- n/a |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 1 | 2356.4 +/- n/a |
| zama | mul_scalar | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 485.9 +/- n/a |
| zama | mean | transaction.wait_receipt | 1 | 7522.8 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 75.3 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 75.3 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 4688.7 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 4688.7 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | already_ready.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | mean | already_ready.read_attempt | 1 | 2317.2 +/- n/a |
| zama | mean | already_ready.sdk_user_decrypt | 1 | 2317.2 +/- n/a |
| zama | mean | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 477.1 +/- n/a |
| zama | max | transaction.wait_receipt | 1 | 25643.0 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 52.1 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 52.1 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 0.9 +/- n/a |
| zama | max | completion.read_attempt | 1 | 4594.1 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 4594.1 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | already_ready.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | max | already_ready.read_attempt | 1 | 2357.1 +/- n/a |
| zama | max | already_ready.sdk_user_decrypt | 1 | 2357.1 +/- n/a |
| zama | max | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 5632.9 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 718.8 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 5333.5 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 628.3 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 12313.7 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 346.3 +/- n/a |
| fhenix | notarize | transaction.wait_receipt | 1 | 18794.3 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 60.4 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 60.4 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 144.3 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 144.3 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | already_ready.read_attempt | 1 | 146.4 +/- n/a |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 1 | 146.4 +/- n/a |
| fhenix | notarize | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 443.1 +/- n/a |
| fhenix | add | transaction.wait_receipt | 1 | 18991.4 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 67.6 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 67.6 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 211.2 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 211.2 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | already_ready.read_attempt | 1 | 142.2 +/- n/a |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 1 | 142.2 +/- n/a |
| fhenix | add | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 538.8 +/- n/a |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 3007.1 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 54.1 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 54.2 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 1243.1 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 1243.1 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | already_ready.read_attempt | 1 | 143.8 +/- n/a |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 1 | 143.8 +/- n/a |
| fhenix | mul_scalar | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 404.8 +/- n/a |
| fhenix | mean | transaction.wait_receipt | 1 | 7539.4 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 63.3 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 63.3 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 8856.1 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 8856.1 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | already_ready.read_attempt | 1 | 242.7 +/- n/a |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 1 | 242.7 +/- n/a |
| fhenix | mean | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 412.9 +/- n/a |
| fhenix | max | transaction.wait_receipt | 1 | 25582.2 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 204.0 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 204.0 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 148.6 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 148.6 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | already_ready.read_attempt | 1 | 252.5 +/- n/a |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 1 | 252.5 +/- n/a |
| fhenix | max | already_ready.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
