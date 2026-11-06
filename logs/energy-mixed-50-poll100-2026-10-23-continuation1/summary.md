# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 50/50 | 34185.0 +/- 0.0 | n/a | 19358.5 +/- 13975.6 | 19452.1 +/- 13976.1 | 93.6 +/- 152.3 | n/a |
| baseline | add | 50/50 | 36022.0 +/- 0.0 | n/a | 12129.9 +/- 11838.5 | 12191.0 +/- 11838.2 | 61.1 +/- 7.2 | n/a |
| baseline | mul_scalar | 50/50 | 36011.0 +/- 0.0 | n/a | 9473.3 +/- 7602.8 | 9538.7 +/- 7605.2 | 65.5 +/- 19.0 | n/a |
| baseline | mean | 50/50 | 37938.0 +/- 0.0 | n/a | 10050.4 +/- 9487.6 | 10159.0 +/- 9468.4 | 108.6 +/- 211.7 | n/a |
| baseline | max | 50/50 | 37945.0 +/- 0.0 | n/a | 8701.6 +/- 6433.9 | 8765.7 +/- 6432.8 | 64.1 +/- 15.7 | n/a |
| zama | notarize | 50/50 | 486177.0 +/- 13.5 | 14576.6 +/- 663.7 | 13244.2 +/- 12502.4 | 17538.1 +/- 12377.3 | 4293.8 +/- 1631.6 | 2741.3 +/- 1370.5 |
| zama | add | 50/50 | 343060.8 +/- 1.0 | n/a | 12334.8 +/- 11851.2 | 16819.5 +/- 11816.3 | 4484.7 +/- 1393.5 | 2490.1 +/- 817.5 |
| zama | mul_scalar | 49/50 | 339219.8 +/- 1.0 | n/a | 9895.9 +/- 8661.1 | 14509.6 +/- 8667.9 | 4513.4 +/- 1500.7 | 2643.4 +/- 1184.3 |
| zama | mean | 50/50 | 358387.6 +/- 1.2 | n/a | 10029.4 +/- 9469.3 | 14851.1 +/- 9525.1 | 4821.7 +/- 1478.1 | 2356.5 +/- 35.6 |
| zama | max | 50/50 | 344626.7 +/- 1.1 | n/a | 8969.2 +/- 6580.9 | 13503.5 +/- 6541.1 | 4534.4 +/- 1118.0 | 2623.9 +/- 1081.9 |
| fhenix | notarize | 50/50 | 320491.2 +/- 7.7 | 10112.6 +/- 3152.6 | 11323.5 +/- 11204.5 | 11542.0 +/- 11202.4 | 218.5 +/- 20.4 | 149.6 +/- 16.3 |
| fhenix | add | 50/50 | 343751.0 +/- 0.0 | n/a | 12326.8 +/- 11828.3 | 12689.1 +/- 11825.2 | 362.3 +/- 280.3 | 154.1 +/- 23.5 |
| fhenix | mul_scalar | 50/50 | 482917.0 +/- 0.0 | n/a | 9647.7 +/- 8729.7 | 10237.1 +/- 8665.5 | 589.4 +/- 702.1 | 153.8 +/- 24.8 |
| fhenix | mean | 50/50 | 406004.0 +/- 0.0 | n/a | 10016.2 +/- 9506.0 | 15029.7 +/- 9370.1 | 5013.5 +/- 971.4 | 150.0 +/- 16.9 |
| fhenix | max | 50/50 | 347930.0 +/- 0.0 | n/a | 8960.0 +/- 6559.0 | 9260.3 +/- 6531.9 | 300.3 +/- 200.7 | 152.0 +/- 28.4 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 50 | 6609.5 +/- 387.1 |
| baseline | notarize | transaction.wait_receipt | 50 | 12749.0 +/- 14022.8 |
| baseline | notarize | completion.handle.read_attempt | 50 | 72.1 +/- 26.3 |
| baseline | notarize | completion.read_persisted_handle | 50 | 93.6 +/- 152.3 |
| baseline | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | notarize | completion.handle.retry_backoff | 1 | 1000.8 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 50 | 467.7 +/- 106.3 |
| baseline | add | transaction.wait_receipt | 50 | 11662.2 +/- 11828.9 |
| baseline | add | completion.handle.read_attempt | 50 | 61.1 +/- 7.2 |
| baseline | add | completion.read_persisted_handle | 50 | 61.1 +/- 7.2 |
| baseline | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 50 | 452.3 +/- 93.6 |
| baseline | mul_scalar | transaction.wait_receipt | 50 | 9021.0 +/- 7590.9 |
| baseline | mul_scalar | completion.handle.read_attempt | 50 | 65.4 +/- 19.0 |
| baseline | mul_scalar | completion.read_persisted_handle | 50 | 65.5 +/- 19.0 |
| baseline | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | transaction.invoke_sign_and_submit | 50 | 427.2 +/- 49.5 |
| baseline | mean | transaction.wait_receipt | 50 | 9623.2 +/- 9479.4 |
| baseline | mean | completion.handle.read_attempt | 50 | 65.8 +/- 18.0 |
| baseline | mean | completion.read_persisted_handle | 50 | 108.6 +/- 211.7 |
| baseline | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | completion.handle.retry_backoff | 2 | 1005.1 +/- 5.3 |
| baseline | max | transaction.invoke_sign_and_submit | 50 | 442.3 +/- 80.7 |
| baseline | max | transaction.wait_receipt | 50 | 8259.4 +/- 6426.1 |
| baseline | max | completion.handle.read_attempt | 50 | 64.1 +/- 15.7 |
| baseline | max | completion.read_persisted_handle | 50 | 64.1 +/- 15.7 |
| baseline | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 50 | 6107.3 +/- 404.8 |
| zama | notarize | encrypt.remote_input_approval | 50 | 8469.2 +/- 398.4 |
| zama | notarize | transaction.invoke_sign_and_submit | 50 | 422.8 +/- 69.6 |
| zama | notarize | transaction.wait_receipt | 50 | 12821.4 +/- 12489.4 |
| zama | notarize | completion.handle.read_attempt | 50 | 65.2 +/- 13.1 |
| zama | notarize | completion.read_persisted_handle | 50 | 86.6 +/- 150.7 |
| zama | notarize | completion.local_keypair_and_authorization | 50 | 1.1 +/- 0.3 |
| zama | notarize | completion.read_attempt | 50 | 4156.1 +/- 1684.2 |
| zama | notarize | completion.sdk_user_decrypt | 50 | 4205.8 +/- 1647.7 |
| zama | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 50 | 1.0 +/- 0.3 |
| zama | notarize | already_ready.read_attempt | 50 | 2740.1 +/- 1370.5 |
| zama | notarize | already_ready.sdk_user_decrypt | 50 | 2740.1 +/- 1370.5 |
| zama | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 2 | 1004.4 +/- 2.1 |
| zama | notarize | completion.handle.retry_backoff | 1 | 1000.1 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 50 | 476.8 +/- 113.8 |
| zama | add | transaction.wait_receipt | 50 | 11858.0 +/- 11851.4 |
| zama | add | completion.handle.read_attempt | 50 | 66.7 +/- 17.8 |
| zama | add | completion.read_persisted_handle | 50 | 66.7 +/- 17.8 |
| zama | add | completion.local_keypair_and_authorization | 50 | 1.1 +/- 0.2 |
| zama | add | completion.read_attempt | 50 | 4293.1 +/- 1496.6 |
| zama | add | completion.sdk_user_decrypt | 50 | 4416.6 +/- 1393.3 |
| zama | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 50 | 1.0 +/- 0.2 |
| zama | add | already_ready.read_attempt | 49 | 2489.0 +/- 817.5 |
| zama | add | already_ready.sdk_user_decrypt | 49 | 2489.0 +/- 817.5 |
| zama | add | already_ready.validate_plaintext | 49 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 5 | 1004.1 +/- 2.1 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 50 | 458.0 +/- 100.2 |
| zama | mul_scalar | transaction.wait_receipt | 50 | 9437.9 +/- 8669.1 |
| zama | mul_scalar | completion.handle.read_attempt | 50 | 61.8 +/- 8.2 |
| zama | mul_scalar | completion.read_persisted_handle | 50 | 83.5 +/- 152.3 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 50 | 1.0 +/- 0.2 |
| zama | mul_scalar | completion.read_attempt | 49 | 4302.2 +/- 1623.3 |
| zama | mul_scalar | completion.sdk_user_decrypt | 49 | 4428.0 +/- 1520.4 |
| zama | mul_scalar | completion.validate_plaintext | 49 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 49 | 1.0 +/- 0.2 |
| zama | mul_scalar | already_ready.read_attempt | 49 | 2642.2 +/- 1184.3 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 49 | 2642.2 +/- 1184.3 |
| zama | mul_scalar | already_ready.validate_plaintext | 49 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 5 | 1009.6 +/- 4.7 |
| zama | mul_scalar | completion.handle.retry_backoff | 1 | 1005.1 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 50 | 442.1 +/- 56.9 |
| zama | mean | transaction.wait_receipt | 50 | 9587.3 +/- 9474.5 |
| zama | mean | completion.handle.read_attempt | 50 | 65.3 +/- 34.8 |
| zama | mean | completion.read_persisted_handle | 50 | 87.2 +/- 156.7 |
| zama | mean | completion.local_keypair_and_authorization | 50 | 1.0 +/- 0.4 |
| zama | mean | completion.read_attempt | 50 | 4610.6 +/- 1626.5 |
| zama | mean | completion.sdk_user_decrypt | 50 | 4733.1 +/- 1501.4 |
| zama | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 50 | 1.0 +/- 0.2 |
| zama | mean | already_ready.read_attempt | 50 | 2355.4 +/- 35.6 |
| zama | mean | already_ready.sdk_user_decrypt | 50 | 2355.4 +/- 35.6 |
| zama | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 5 | 1007.5 +/- 5.9 |
| zama | mean | completion.handle.retry_backoff | 1 | 1010.5 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 50 | 456.6 +/- 89.5 |
| zama | max | transaction.wait_receipt | 50 | 8512.5 +/- 6591.6 |
| zama | max | completion.handle.read_attempt | 50 | 68.7 +/- 26.6 |
| zama | max | completion.read_persisted_handle | 50 | 68.7 +/- 26.6 |
| zama | max | completion.local_keypair_and_authorization | 50 | 1.1 +/- 0.4 |
| zama | max | completion.read_attempt | 50 | 4366.0 +/- 1230.9 |
| zama | max | completion.sdk_user_decrypt | 50 | 4464.2 +/- 1117.4 |
| zama | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 50 | 1.0 +/- 0.3 |
| zama | max | already_ready.read_attempt | 50 | 2622.6 +/- 1082.0 |
| zama | max | already_ready.sdk_user_decrypt | 50 | 2622.6 +/- 1082.0 |
| zama | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | completion.retry_backoff | 4 | 1004.9 +/- 1.5 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 3054.1 +/- 3093.7 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 725.2 +/- 47.6 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 5683.1 +/- 295.2 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 650.1 +/- 69.8 |
| fhenix | notarize | encrypt.sdk_total | 50 | 10112.6 +/- 3152.6 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 393.0 +/- 92.5 |
| fhenix | notarize | transaction.wait_receipt | 50 | 10930.6 +/- 11183.4 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 65.2 +/- 16.2 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 65.2 +/- 16.2 |
| fhenix | notarize | completion.read_attempt | 50 | 153.0 +/- 13.3 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 153.0 +/- 13.3 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 50 | 149.6 +/- 16.3 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 50 | 149.6 +/- 16.3 |
| fhenix | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 463.4 +/- 120.7 |
| fhenix | add | transaction.wait_receipt | 50 | 11863.4 +/- 11838.3 |
| fhenix | add | completion.handle.read_attempt | 50 | 63.3 +/- 10.4 |
| fhenix | add | completion.read_persisted_handle | 50 | 106.9 +/- 214.9 |
| fhenix | add | completion.read_attempt | 50 | 255.2 +/- 200.5 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 255.2 +/- 200.5 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 50 | 154.1 +/- 23.5 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 50 | 154.1 +/- 23.5 |
| fhenix | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 2 | 1013.6 +/- 1.6 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 468.6 +/- 100.2 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 9179.1 +/- 8721.7 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 63.6 +/- 11.4 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 63.6 +/- 11.4 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 525.6 +/- 704.1 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 525.6 +/- 704.1 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 50 | 153.8 +/- 24.8 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 50 | 153.8 +/- 24.8 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 435.2 +/- 60.3 |
| fhenix | mean | transaction.wait_receipt | 50 | 9580.9 +/- 9489.2 |
| fhenix | mean | completion.handle.read_attempt | 50 | 65.1 +/- 14.7 |
| fhenix | mean | completion.read_persisted_handle | 50 | 108.1 +/- 212.0 |
| fhenix | mean | completion.read_attempt | 50 | 4905.2 +/- 951.9 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 50 | 4905.2 +/- 951.9 |
| fhenix | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 50 | 150.0 +/- 16.9 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 50 | 150.0 +/- 16.9 |
| fhenix | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 2 | 1006.7 +/- 6.6 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 446.3 +/- 73.0 |
| fhenix | max | transaction.wait_receipt | 50 | 8513.6 +/- 6559.8 |
| fhenix | max | completion.handle.read_attempt | 50 | 64.4 +/- 20.9 |
| fhenix | max | completion.read_persisted_handle | 50 | 85.8 +/- 151.2 |
| fhenix | max | completion.read_attempt | 50 | 214.3 +/- 141.5 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 50 | 214.3 +/- 141.5 |
| fhenix | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 50 | 152.0 +/- 28.4 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 50 | 152.0 +/- 28.4 |
| fhenix | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 1 | 1006.5 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
