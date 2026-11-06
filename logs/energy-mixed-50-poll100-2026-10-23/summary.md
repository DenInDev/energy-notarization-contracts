# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 42/42 | 34185.0 +/- 0.0 | n/a | 20541.8 +/- 14851.6 | 20614.5 +/- 14847.3 | 72.7 +/- 26.3 | n/a |
| baseline | add | 42/42 | 36022.0 +/- 0.0 | n/a | 12967.0 +/- 12536.1 | 13028.9 +/- 12535.2 | 61.9 +/- 7.4 | n/a |
| baseline | mul_scalar | 42/42 | 36011.0 +/- 0.0 | n/a | 10165.5 +/- 7965.7 | 10232.2 +/- 7967.8 | 66.7 +/- 20.4 | n/a |
| baseline | mean | 41/41 | 37938.0 +/- 0.0 | n/a | 10714.3 +/- 10019.7 | 10833.4 +/- 9992.9 | 119.1 +/- 232.9 | n/a |
| baseline | max | 41/41 | 37945.0 +/- 0.0 | n/a | 8739.5 +/- 6516.6 | 8803.1 +/- 6516.7 | 63.6 +/- 9.1 | n/a |
| zama | notarize | 42/42 | 486176.6 +/- 13.5 | 14505.0 +/- 628.4 | 13724.6 +/- 13499.2 | 17923.8 +/- 13369.1 | 4199.2 +/- 1730.0 | 2818.2 +/- 1485.5 |
| zama | add | 42/42 | 343060.7 +/- 1.0 | n/a | 13196.6 +/- 12535.6 | 17596.4 +/- 12540.3 | 4399.8 +/- 1480.2 | 2520.6 +/- 892.2 |
| zama | mul_scalar | 41/42 | 339219.7 +/- 1.0 | n/a | 10667.1 +/- 9141.9 | 15295.3 +/- 9176.7 | 4489.4 +/- 1595.9 | 2702.4 +/- 1288.9 |
| zama | mean | 41/41 | 358387.5 +/- 1.3 | n/a | 10661.3 +/- 10004.6 | 15484.5 +/- 10068.6 | 4823.1 +/- 1588.3 | 2357.0 +/- 29.9 |
| zama | max | 41/41 | 344626.7 +/- 1.1 | n/a | 9049.9 +/- 6707.8 | 13521.2 +/- 6706.8 | 4471.2 +/- 1177.8 | 2682.4 +/- 1189.0 |
| fhenix | notarize | 42/42 | 320491.7 +/- 6.9 | 9869.8 +/- 3093.9 | 12047.1 +/- 11889.2 | 12266.4 +/- 11886.6 | 219.3 +/- 21.3 | 149.7 +/- 17.7 |
| fhenix | add | 42/42 | 343751.0 +/- 0.0 | n/a | 13200.4 +/- 12501.0 | 13545.7 +/- 12519.7 | 345.3 +/- 260.1 | 154.7 +/- 25.3 |
| fhenix | mul_scalar | 42/42 | 482917.0 +/- 0.0 | n/a | 10662.7 +/- 9186.3 | 11255.7 +/- 9111.5 | 593.0 +/- 763.7 | 151.9 +/- 21.6 |
| fhenix | mean | 41/41 | 406004.0 +/- 0.0 | n/a | 10662.3 +/- 10041.4 | 15593.6 +/- 9953.1 | 4931.3 +/- 947.2 | 150.7 +/- 18.4 |
| fhenix | max | 41/41 | 347930.0 +/- 0.0 | n/a | 9044.7 +/- 6660.9 | 9354.0 +/- 6624.8 | 309.3 +/- 218.9 | 150.4 +/- 27.9 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.invoke_sign_and_submit | 42 | 6543.7 +/- 378.9 |
| baseline | notarize | transaction.wait_receipt | 42 | 13998.1 +/- 14860.4 |
| baseline | notarize | completion.handle.read_attempt | 42 | 72.7 +/- 26.3 |
| baseline | notarize | completion.read_persisted_handle | 42 | 72.7 +/- 26.3 |
| baseline | notarize | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| baseline | add | transaction.invoke_sign_and_submit | 42 | 467.0 +/- 98.0 |
| baseline | add | transaction.wait_receipt | 42 | 12500.0 +/- 12521.5 |
| baseline | add | completion.handle.read_attempt | 42 | 61.8 +/- 7.4 |
| baseline | add | completion.read_persisted_handle | 42 | 61.9 +/- 7.4 |
| baseline | add | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 42 | 465.6 +/- 95.5 |
| baseline | mul_scalar | transaction.wait_receipt | 42 | 9699.9 +/- 7959.6 |
| baseline | mul_scalar | completion.handle.read_attempt | 42 | 66.6 +/- 20.4 |
| baseline | mul_scalar | completion.read_persisted_handle | 42 | 66.6 +/- 20.4 |
| baseline | mul_scalar | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| baseline | mean | transaction.invoke_sign_and_submit | 41 | 429.1 +/- 51.5 |
| baseline | mean | transaction.wait_receipt | 41 | 10285.2 +/- 10007.5 |
| baseline | mean | completion.handle.read_attempt | 41 | 66.9 +/- 19.6 |
| baseline | mean | completion.read_persisted_handle | 41 | 119.0 +/- 232.9 |
| baseline | mean | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| baseline | mean | completion.handle.retry_backoff | 2 | 1005.1 +/- 5.3 |
| baseline | max | transaction.invoke_sign_and_submit | 41 | 436.8 +/- 75.1 |
| baseline | max | transaction.wait_receipt | 41 | 8302.8 +/- 6515.8 |
| baseline | max | completion.handle.read_attempt | 41 | 63.6 +/- 9.1 |
| baseline | max | completion.read_persisted_handle | 41 | 63.6 +/- 9.1 |
| baseline | max | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 42 | 6051.2 +/- 401.0 |
| zama | notarize | encrypt.remote_input_approval | 42 | 8453.8 +/- 322.2 |
| zama | notarize | transaction.invoke_sign_and_submit | 42 | 426.7 +/- 74.0 |
| zama | notarize | transaction.wait_receipt | 42 | 13298.0 +/- 13486.8 |
| zama | notarize | completion.handle.read_attempt | 42 | 65.6 +/- 13.8 |
| zama | notarize | completion.read_persisted_handle | 42 | 65.6 +/- 13.8 |
| zama | notarize | completion.local_keypair_and_authorization | 42 | 1.1 +/- 0.2 |
| zama | notarize | completion.read_attempt | 42 | 4073.0 +/- 1769.7 |
| zama | notarize | completion.sdk_user_decrypt | 42 | 4132.2 +/- 1730.9 |
| zama | notarize | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 42 | 1.0 +/- 0.2 |
| zama | notarize | already_ready.read_attempt | 42 | 2817.0 +/- 1485.5 |
| zama | notarize | already_ready.sdk_user_decrypt | 42 | 2817.0 +/- 1485.5 |
| zama | notarize | already_ready.validate_plaintext | 42 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 2 | 1004.4 +/- 2.1 |
| zama | add | transaction.invoke_sign_and_submit | 42 | 471.0 +/- 102.0 |
| zama | add | transaction.wait_receipt | 42 | 12725.6 +/- 12532.5 |
| zama | add | completion.handle.read_attempt | 42 | 68.4 +/- 18.8 |
| zama | add | completion.read_persisted_handle | 42 | 68.4 +/- 18.8 |
| zama | add | completion.local_keypair_and_authorization | 42 | 1.0 +/- 0.2 |
| zama | add | completion.read_attempt | 42 | 4183.0 +/- 1585.9 |
| zama | add | completion.sdk_user_decrypt | 42 | 4330.0 +/- 1479.2 |
| zama | add | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 42 | 0.9 +/- 0.2 |
| zama | add | already_ready.read_attempt | 41 | 2519.5 +/- 892.2 |
| zama | add | already_ready.sdk_user_decrypt | 41 | 2519.5 +/- 892.2 |
| zama | add | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 5 | 1004.1 +/- 2.1 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 42 | 461.9 +/- 107.5 |
| zama | mul_scalar | transaction.wait_receipt | 42 | 10205.2 +/- 9151.6 |
| zama | mul_scalar | completion.handle.read_attempt | 42 | 62.5 +/- 8.1 |
| zama | mul_scalar | completion.read_persisted_handle | 42 | 62.5 +/- 8.1 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 42 | 1.0 +/- 0.2 |
| zama | mul_scalar | completion.read_attempt | 41 | 4305.0 +/- 1690.9 |
| zama | mul_scalar | completion.sdk_user_decrypt | 41 | 4425.5 +/- 1594.8 |
| zama | mul_scalar | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 41 | 0.9 +/- 0.2 |
| zama | mul_scalar | already_ready.read_attempt | 41 | 2701.2 +/- 1288.8 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 41 | 2701.2 +/- 1288.8 |
| zama | mul_scalar | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 4 | 1009.0 +/- 5.3 |
| zama | mean | transaction.invoke_sign_and_submit | 41 | 440.4 +/- 51.1 |
| zama | mean | transaction.wait_receipt | 41 | 10221.0 +/- 10018.1 |
| zama | mean | completion.handle.read_attempt | 41 | 66.7 +/- 38.3 |
| zama | mean | completion.read_persisted_handle | 41 | 66.7 +/- 38.3 |
| zama | mean | completion.local_keypair_and_authorization | 41 | 1.0 +/- 0.4 |
| zama | mean | completion.read_attempt | 41 | 4605.7 +/- 1733.0 |
| zama | mean | completion.sdk_user_decrypt | 41 | 4755.1 +/- 1587.9 |
| zama | mean | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 41 | 1.0 +/- 0.2 |
| zama | mean | already_ready.read_attempt | 41 | 2355.8 +/- 29.8 |
| zama | mean | already_ready.sdk_user_decrypt | 41 | 2355.9 +/- 29.8 |
| zama | mean | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 5 | 1007.5 +/- 5.9 |
| zama | max | transaction.invoke_sign_and_submit | 41 | 449.4 +/- 85.6 |
| zama | max | transaction.wait_receipt | 41 | 8600.5 +/- 6724.0 |
| zama | max | completion.handle.read_attempt | 41 | 70.5 +/- 29.1 |
| zama | max | completion.read_persisted_handle | 41 | 70.5 +/- 29.1 |
| zama | max | completion.local_keypair_and_authorization | 41 | 1.1 +/- 0.4 |
| zama | max | completion.read_attempt | 41 | 4309.4 +/- 1270.6 |
| zama | max | completion.sdk_user_decrypt | 41 | 4399.3 +/- 1176.7 |
| zama | max | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 41 | 1.0 +/- 0.2 |
| zama | max | already_ready.read_attempt | 41 | 2681.2 +/- 1189.1 |
| zama | max | already_ready.sdk_user_decrypt | 41 | 2681.2 +/- 1189.1 |
| zama | max | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| zama | max | completion.retry_backoff | 3 | 1004.6 +/- 1.7 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 42 | 2866.8 +/- 3048.7 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 42 | 721.3 +/- 47.2 |
| fhenix | notarize | encrypt.sdk_observed.pack | 42 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 42 | 5630.1 +/- 291.1 |
| fhenix | notarize | encrypt.sdk_observed.verify | 42 | 651.4 +/- 75.0 |
| fhenix | notarize | encrypt.sdk_total | 42 | 9869.8 +/- 3093.9 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 42 | 392.6 +/- 88.8 |
| fhenix | notarize | transaction.wait_receipt | 42 | 11654.5 +/- 11869.8 |
| fhenix | notarize | completion.handle.read_attempt | 42 | 66.4 +/- 17.4 |
| fhenix | notarize | completion.read_persisted_handle | 42 | 66.4 +/- 17.4 |
| fhenix | notarize | completion.read_attempt | 42 | 152.7 +/- 12.7 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 42 | 152.7 +/- 12.7 |
| fhenix | notarize | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 42 | 149.7 +/- 17.7 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 42 | 149.7 +/- 17.7 |
| fhenix | notarize | already_ready.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 42 | 455.9 +/- 107.1 |
| fhenix | add | transaction.wait_receipt | 42 | 12744.4 +/- 12505.9 |
| fhenix | add | completion.handle.read_attempt | 42 | 64.9 +/- 10.5 |
| fhenix | add | completion.read_persisted_handle | 42 | 90.8 +/- 167.7 |
| fhenix | add | completion.read_attempt | 42 | 254.3 +/- 209.9 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 42 | 254.3 +/- 209.9 |
| fhenix | add | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 42 | 154.7 +/- 25.3 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 42 | 154.7 +/- 25.3 |
| fhenix | add | already_ready.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 1 | 1012.4 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 42 | 468.6 +/- 100.3 |
| fhenix | mul_scalar | transaction.wait_receipt | 42 | 10194.1 +/- 9178.0 |
| fhenix | mul_scalar | completion.handle.read_attempt | 42 | 64.4 +/- 11.9 |
| fhenix | mul_scalar | completion.read_persisted_handle | 42 | 64.4 +/- 11.9 |
| fhenix | mul_scalar | completion.read_attempt | 42 | 528.4 +/- 766.0 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 42 | 528.4 +/- 766.0 |
| fhenix | mul_scalar | completion.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 42 | 151.9 +/- 21.6 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 42 | 151.9 +/- 21.6 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 42 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.invoke_sign_and_submit | 41 | 433.4 +/- 58.8 |
| fhenix | mean | transaction.wait_receipt | 41 | 10228.9 +/- 10025.3 |
| fhenix | mean | completion.handle.read_attempt | 41 | 65.8 +/- 16.0 |
| fhenix | mean | completion.read_persisted_handle | 41 | 91.8 +/- 166.0 |
| fhenix | mean | completion.read_attempt | 41 | 4839.3 +/- 965.7 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 41 | 4839.3 +/- 965.7 |
| fhenix | mean | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 41 | 150.7 +/- 18.4 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 41 | 150.7 +/- 18.4 |
| fhenix | mean | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 1 | 1002.0 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 41 | 444.0 +/- 64.2 |
| fhenix | max | transaction.wait_receipt | 41 | 8600.7 +/- 6660.8 |
| fhenix | max | completion.handle.read_attempt | 41 | 62.1 +/- 6.5 |
| fhenix | max | completion.read_persisted_handle | 41 | 88.1 +/- 165.9 |
| fhenix | max | completion.read_attempt | 41 | 220.9 +/- 153.4 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 41 | 220.9 +/- 153.4 |
| fhenix | max | completion.validate_plaintext | 41 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 41 | 150.4 +/- 27.9 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 41 | 150.4 +/- 27.9 |
| fhenix | max | already_ready.validate_plaintext | 41 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 1 | 1006.5 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
