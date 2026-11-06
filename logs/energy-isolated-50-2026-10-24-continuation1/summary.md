# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 50/50 | 34185.0 +/- 0.0 | n/a | 6341.6 +/- 3962.2 | 6495.5 +/- 3966.4 | 153.8 +/- 159.0 | n/a |
| baseline | add | 50/50 | 36022.0 +/- 0.0 | n/a | 4905.5 +/- 4674.9 | 4986.8 +/- 4694.3 | 81.3 +/- 34.4 | n/a |
| baseline | mul_scalar | 50/50 | 36011.0 +/- 0.0 | n/a | 6169.8 +/- 5579.3 | 6252.9 +/- 5603.2 | 83.1 +/- 33.7 | n/a |
| baseline | mean | 50/50 | 37938.0 +/- 0.0 | n/a | 4853.5 +/- 3884.2 | 4924.3 +/- 3908.0 | 70.8 +/- 28.7 | n/a |
| baseline | max | 50/50 | 37945.0 +/- 0.0 | n/a | 4721.7 +/- 4125.0 | 4822.2 +/- 4140.7 | 100.5 +/- 154.6 | n/a |
| zama | notarize | 50/50 | 486174.6 +/- 13.9 | 10358.5 +/- 922.1 | 6326.5 +/- 3980.4 | 10918.9 +/- 4091.8 | 4592.5 +/- 788.9 | 2350.1 +/- 63.8 |
| zama | add | 49/50 | 343060.1 +/- 1.7 | n/a | 4536.6 +/- 3840.8 | 9540.2 +/- 4062.0 | 5003.5 +/- 1367.7 | 2345.7 +/- 41.0 |
| zama | mul_scalar | 50/50 | 339218.6 +/- 1.9 | n/a | 6175.3 +/- 5562.2 | 11095.9 +/- 5755.8 | 4920.7 +/- 801.3 | 2363.3 +/- 69.5 |
| zama | mean | 50/50 | 358386.9 +/- 1.8 | n/a | 4850.2 +/- 3885.4 | 9626.1 +/- 3752.8 | 4775.9 +/- 719.9 | 2354.0 +/- 53.1 |
| zama | max | 50/50 | 344626.0 +/- 1.8 | n/a | 4719.0 +/- 4159.6 | 9675.0 +/- 4546.8 | 4956.0 +/- 1242.2 | 2347.4 +/- 39.4 |
| fhenix | notarize | 50/50 | 320491.0 +/- 7.7 | 9126.8 +/- 978.4 | 6312.8 +/- 3959.1 | 6602.7 +/- 3956.8 | 289.9 +/- 38.9 | 157.9 +/- 36.8 |
| fhenix | add | 50/50 | 343751.0 +/- 0.0 | n/a | 4915.6 +/- 4664.1 | 5303.0 +/- 4668.3 | 387.5 +/- 221.5 | 152.6 +/- 27.0 |
| fhenix | mul_scalar | 50/50 | 482917.0 +/- 0.0 | n/a | 6165.6 +/- 5555.4 | 6785.1 +/- 5664.3 | 619.5 +/- 328.6 | 147.9 +/- 17.3 |
| fhenix | mean | 50/50 | 406004.0 +/- 0.0 | n/a | 4855.4 +/- 3869.4 | 9449.1 +/- 3840.3 | 4593.7 +/- 420.1 | 155.5 +/- 35.5 |
| fhenix | max | 50/50 | 347930.0 +/- 0.0 | n/a | 4729.5 +/- 4141.7 | 5079.7 +/- 4175.0 | 350.2 +/- 219.6 | 153.4 +/- 49.3 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 50 | 260.0 +/- 19.9 |
| baseline | notarize | barrier.wait | 50 | 10694.9 +/- 948.4 |
| baseline | notarize | transaction.raw_broadcast | 50 | 128.0 +/- 11.2 |
| baseline | notarize | transaction.invoke_sign_and_submit | 50 | 128.3 +/- 11.2 |
| baseline | notarize | transaction.receipt.read_attempt | 580 | 72.0 +/- 95.7 |
| baseline | notarize | transaction.wait_receipt | 50 | 6213.3 +/- 3961.8 |
| baseline | notarize | completion.handle.read_attempt | 50 | 129.9 +/- 16.6 |
| baseline | notarize | completion.read_persisted_handle | 50 | 153.7 +/- 159.0 |
| baseline | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | notarize | completion.handle.retry_backoff | 1 | 1014.2 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 50 | 268.6 +/- 49.4 |
| baseline | add | barrier.wait | 50 | 422.7 +/- 81.3 |
| baseline | add | transaction.raw_broadcast | 50 | 127.4 +/- 19.3 |
| baseline | add | transaction.invoke_sign_and_submit | 50 | 127.7 +/- 19.3 |
| baseline | add | transaction.receipt.read_attempt | 461 | 65.9 +/- 71.2 |
| baseline | add | transaction.wait_receipt | 50 | 4777.8 +/- 4675.5 |
| baseline | add | completion.handle.read_attempt | 50 | 81.2 +/- 34.4 |
| baseline | add | completion.read_persisted_handle | 50 | 81.2 +/- 34.4 |
| baseline | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.prepare_and_sign | 50 | 255.7 +/- 25.9 |
| baseline | mul_scalar | barrier.wait | 50 | 426.0 +/- 78.0 |
| baseline | mul_scalar | transaction.raw_broadcast | 50 | 129.8 +/- 23.5 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 50 | 130.1 +/- 23.5 |
| baseline | mul_scalar | transaction.receipt.read_attempt | 574 | 62.8 +/- 32.8 |
| baseline | mul_scalar | transaction.wait_receipt | 50 | 6039.7 +/- 5583.2 |
| baseline | mul_scalar | completion.handle.read_attempt | 50 | 83.0 +/- 33.7 |
| baseline | mul_scalar | completion.read_persisted_handle | 50 | 83.0 +/- 33.7 |
| baseline | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | transaction.prepare_and_sign | 50 | 260.9 +/- 18.3 |
| baseline | mean | barrier.wait | 50 | 423.5 +/- 82.8 |
| baseline | mean | transaction.raw_broadcast | 50 | 134.4 +/- 44.5 |
| baseline | mean | transaction.invoke_sign_and_submit | 50 | 134.7 +/- 44.5 |
| baseline | mean | transaction.receipt.read_attempt | 460 | 60.8 +/- 20.3 |
| baseline | mean | transaction.wait_receipt | 50 | 4718.8 +/- 3883.8 |
| baseline | mean | completion.handle.read_attempt | 50 | 70.7 +/- 28.7 |
| baseline | mean | completion.read_persisted_handle | 50 | 70.7 +/- 28.7 |
| baseline | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | transaction.prepare_and_sign | 50 | 275.0 +/- 55.5 |
| baseline | max | barrier.wait | 50 | 415.5 +/- 83.8 |
| baseline | max | transaction.raw_broadcast | 50 | 138.4 +/- 32.3 |
| baseline | max | transaction.invoke_sign_and_submit | 50 | 138.7 +/- 32.3 |
| baseline | max | transaction.receipt.read_attempt | 445 | 64.4 +/- 31.7 |
| baseline | max | transaction.wait_receipt | 50 | 4582.9 +/- 4127.6 |
| baseline | max | completion.handle.read_attempt | 50 | 78.5 +/- 32.6 |
| baseline | max | completion.read_persisted_handle | 50 | 100.4 +/- 154.6 |
| baseline | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | completion.handle.retry_backoff | 1 | 1015.1 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 50 | 8132.6 +/- 913.9 |
| zama | notarize | encrypt.remote_input_approval | 50 | 2225.9 +/- 44.2 |
| zama | notarize | transaction.prepare_and_sign | 50 | 224.0 +/- 53.1 |
| zama | notarize | barrier.wait | 50 | 372.7 +/- 54.3 |
| zama | notarize | transaction.raw_broadcast | 50 | 129.8 +/- 13.2 |
| zama | notarize | transaction.invoke_sign_and_submit | 50 | 130.3 +/- 13.2 |
| zama | notarize | transaction.receipt.read_attempt | 584 | 66.5 +/- 97.5 |
| zama | notarize | transaction.wait_receipt | 50 | 6196.2 +/- 3978.6 |
| zama | notarize | completion.handle.read_attempt | 50 | 122.6 +/- 31.5 |
| zama | notarize | completion.read_persisted_handle | 50 | 122.6 +/- 31.5 |
| zama | notarize | completion.local_keypair_and_authorization | 50 | 1.4 +/- 0.3 |
| zama | notarize | completion.read_attempt | 50 | 4419.1 +/- 871.0 |
| zama | notarize | completion.sdk_user_decrypt | 50 | 4468.1 +/- 788.3 |
| zama | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | notarize | already_ready.read_attempt | 50 | 2348.7 +/- 63.7 |
| zama | notarize | already_ready.sdk_user_decrypt | 50 | 2348.7 +/- 63.7 |
| zama | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 2 | 1002.2 +/- 2.6 |
| zama | add | transaction.prepare_and_sign | 50 | 198.5 +/- 50.7 |
| zama | add | barrier.wait | 50 | 492.5 +/- 79.0 |
| zama | add | transaction.raw_broadcast | 50 | 129.8 +/- 13.7 |
| zama | add | transaction.invoke_sign_and_submit | 50 | 130.1 +/- 13.7 |
| zama | add | transaction.receipt.read_attempt | 735 | 66.0 +/- 52.7 |
| zama | add | transaction.wait_receipt | 49 | 4406.6 +/- 3842.4 |
| zama | add | completion.handle.read_attempt | 49 | 83.6 +/- 31.8 |
| zama | add | completion.read_persisted_handle | 49 | 130.1 +/- 227.2 |
| zama | add | completion.local_keypair_and_authorization | 49 | 1.3 +/- 0.4 |
| zama | add | completion.read_attempt | 49 | 4820.7 +/- 1451.4 |
| zama | add | completion.sdk_user_decrypt | 49 | 4871.8 +/- 1388.4 |
| zama | add | completion.validate_plaintext | 49 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 49 | 1.2 +/- 0.3 |
| zama | add | already_ready.read_attempt | 49 | 2344.3 +/- 40.9 |
| zama | add | already_ready.sdk_user_decrypt | 49 | 2344.3 +/- 40.9 |
| zama | add | already_ready.validate_plaintext | 49 | 0.0 +/- 0.0 |
| zama | add | completion.handle.retry_backoff | 2 | 1010.2 +/- 5.3 |
| zama | add | completion.retry_backoff | 2 | 1007.0 +/- 1.7 |
| zama | mul_scalar | transaction.prepare_and_sign | 50 | 192.8 +/- 35.3 |
| zama | mul_scalar | barrier.wait | 50 | 489.2 +/- 76.4 |
| zama | mul_scalar | transaction.raw_broadcast | 50 | 132.2 +/- 42.3 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 50 | 132.5 +/- 42.3 |
| zama | mul_scalar | transaction.receipt.read_attempt | 574 | 63.4 +/- 32.2 |
| zama | mul_scalar | transaction.wait_receipt | 50 | 6042.7 +/- 5561.3 |
| zama | mul_scalar | completion.handle.read_attempt | 50 | 96.6 +/- 40.0 |
| zama | mul_scalar | completion.read_persisted_handle | 50 | 96.6 +/- 40.0 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 50 | 1.3 +/- 0.4 |
| zama | mul_scalar | completion.read_attempt | 50 | 4699.2 +/- 1023.8 |
| zama | mul_scalar | completion.sdk_user_decrypt | 50 | 4822.5 +/- 796.8 |
| zama | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 50 | 1.3 +/- 0.4 |
| zama | mul_scalar | already_ready.read_attempt | 50 | 2361.9 +/- 69.5 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 50 | 2361.9 +/- 69.5 |
| zama | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 5 | 1008.3 +/- 4.1 |
| zama | mean | transaction.prepare_and_sign | 50 | 192.0 +/- 16.4 |
| zama | mean | barrier.wait | 50 | 492.0 +/- 73.0 |
| zama | mean | transaction.raw_broadcast | 50 | 131.6 +/- 14.8 |
| zama | mean | transaction.invoke_sign_and_submit | 50 | 132.0 +/- 14.8 |
| zama | mean | transaction.receipt.read_attempt | 458 | 63.7 +/- 32.4 |
| zama | mean | transaction.wait_receipt | 50 | 4718.3 +/- 3883.8 |
| zama | mean | completion.handle.read_attempt | 50 | 98.5 +/- 88.9 |
| zama | mean | completion.read_persisted_handle | 50 | 98.6 +/- 88.9 |
| zama | mean | completion.local_keypair_and_authorization | 50 | 1.3 +/- 0.3 |
| zama | mean | completion.read_attempt | 50 | 4553.0 +/- 784.9 |
| zama | mean | completion.sdk_user_decrypt | 50 | 4675.7 +/- 735.7 |
| zama | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 50 | 1.3 +/- 0.3 |
| zama | mean | already_ready.read_attempt | 50 | 2352.5 +/- 53.2 |
| zama | mean | already_ready.sdk_user_decrypt | 50 | 2352.5 +/- 53.2 |
| zama | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 5 | 1007.2 +/- 5.6 |
| zama | max | transaction.prepare_and_sign | 50 | 207.3 +/- 72.2 |
| zama | max | barrier.wait | 50 | 483.1 +/- 85.3 |
| zama | max | transaction.raw_broadcast | 50 | 132.2 +/- 30.5 |
| zama | max | transaction.invoke_sign_and_submit | 50 | 132.5 +/- 30.5 |
| zama | max | transaction.receipt.read_attempt | 443 | 67.4 +/- 40.3 |
| zama | max | transaction.wait_receipt | 50 | 4586.5 +/- 4162.9 |
| zama | max | completion.handle.read_attempt | 50 | 103.8 +/- 66.9 |
| zama | max | completion.read_persisted_handle | 50 | 169.6 +/- 260.4 |
| zama | max | completion.local_keypair_and_authorization | 50 | 1.3 +/- 0.3 |
| zama | max | completion.read_attempt | 50 | 4711.6 +/- 1413.3 |
| zama | max | completion.sdk_user_decrypt | 50 | 4784.8 +/- 1323.1 |
| zama | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 50 | 1.3 +/- 0.4 |
| zama | max | already_ready.read_attempt | 50 | 2346.0 +/- 39.4 |
| zama | max | already_ready.sdk_user_decrypt | 50 | 2346.0 +/- 39.4 |
| zama | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | completion.handle.retry_backoff | 3 | 1004.0 +/- 5.9 |
| zama | max | completion.retry_backoff | 3 | 1009.7 +/- 6.0 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 0.1 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 918.3 +/- 118.6 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.1 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 7565.7 +/- 881.4 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 642.4 +/- 58.2 |
| fhenix | notarize | encrypt.sdk_total | 50 | 9126.8 +/- 978.4 |
| fhenix | notarize | transaction.prepare_and_sign | 50 | 268.7 +/- 47.0 |
| fhenix | notarize | barrier.wait | 50 | 1559.4 +/- 123.4 |
| fhenix | notarize | transaction.raw_broadcast | 50 | 135.5 +/- 44.3 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 136.0 +/- 44.3 |
| fhenix | notarize | transaction.receipt.read_attempt | 583 | 65.9 +/- 96.3 |
| fhenix | notarize | transaction.wait_receipt | 50 | 6176.8 +/- 3951.0 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 133.5 +/- 17.5 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 133.5 +/- 17.5 |
| fhenix | notarize | completion.read_attempt | 50 | 156.1 +/- 32.4 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 156.1 +/- 32.4 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 50 | 157.9 +/- 36.8 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 50 | 157.9 +/- 36.8 |
| fhenix | notarize | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | transaction.prepare_and_sign | 50 | 278.2 +/- 61.1 |
| fhenix | add | barrier.wait | 50 | 412.7 +/- 78.5 |
| fhenix | add | transaction.raw_broadcast | 50 | 126.0 +/- 11.3 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 126.3 +/- 11.3 |
| fhenix | add | transaction.receipt.read_attempt | 461 | 67.2 +/- 64.5 |
| fhenix | add | transaction.wait_receipt | 50 | 4789.3 +/- 4663.5 |
| fhenix | add | completion.handle.read_attempt | 50 | 80.2 +/- 33.7 |
| fhenix | add | completion.read_persisted_handle | 50 | 80.3 +/- 33.7 |
| fhenix | add | completion.read_attempt | 50 | 307.0 +/- 220.8 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 307.0 +/- 220.8 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 50 | 152.6 +/- 27.0 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 50 | 152.6 +/- 27.0 |
| fhenix | add | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.prepare_and_sign | 50 | 261.2 +/- 27.4 |
| fhenix | mul_scalar | barrier.wait | 50 | 421.2 +/- 77.2 |
| fhenix | mul_scalar | transaction.raw_broadcast | 50 | 133.8 +/- 29.3 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 134.1 +/- 29.2 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 574 | 62.6 +/- 29.3 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 6031.5 +/- 5555.1 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 88.4 +/- 45.4 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 111.6 +/- 166.8 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 507.7 +/- 241.9 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 507.7 +/- 241.9 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 50 | 147.9 +/- 17.3 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 50 | 147.9 +/- 17.3 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | completion.handle.retry_backoff | 1 | 1009.9 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 50 | 264.5 +/- 21.8 |
| fhenix | mean | barrier.wait | 50 | 419.8 +/- 79.8 |
| fhenix | mean | transaction.raw_broadcast | 50 | 138.7 +/- 44.3 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 139.0 +/- 44.3 |
| fhenix | mean | transaction.receipt.read_attempt | 458 | 62.7 +/- 28.1 |
| fhenix | mean | transaction.wait_receipt | 50 | 4716.3 +/- 3870.9 |
| fhenix | mean | completion.handle.read_attempt | 50 | 73.1 +/- 29.2 |
| fhenix | mean | completion.read_persisted_handle | 50 | 117.6 +/- 217.6 |
| fhenix | mean | completion.read_attempt | 50 | 4475.9 +/- 419.7 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 50 | 4475.9 +/- 419.7 |
| fhenix | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 50 | 155.5 +/- 35.5 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 50 | 155.5 +/- 35.5 |
| fhenix | mean | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 2 | 1007.0 +/- 0.4 |
| fhenix | max | transaction.prepare_and_sign | 50 | 216.6 +/- 74.7 |
| fhenix | max | barrier.wait | 50 | 473.9 +/- 87.4 |
| fhenix | max | transaction.raw_broadcast | 50 | 139.0 +/- 34.7 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 139.4 +/- 34.6 |
| fhenix | max | transaction.receipt.read_attempt | 444 | 66.5 +/- 35.7 |
| fhenix | max | transaction.wait_receipt | 50 | 4590.1 +/- 4145.5 |
| fhenix | max | completion.handle.read_attempt | 50 | 92.3 +/- 39.0 |
| fhenix | max | completion.read_persisted_handle | 50 | 92.3 +/- 39.0 |
| fhenix | max | completion.read_attempt | 50 | 257.7 +/- 214.9 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 50 | 257.7 +/- 214.9 |
| fhenix | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 50 | 153.4 +/- 49.3 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 50 | 153.4 +/- 49.3 |
| fhenix | max | already_ready.validate_plaintext | 50 | 0.0 +/- 0.0 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
