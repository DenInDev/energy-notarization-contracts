# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 6/7 | 31556.0 +/- 0.0 | n/a | 8763.6 +/- 637.4 | 8955.0 +/- 701.9 | 257.6 +/- 112.2 | n/a |
| baseline | add | 6/6 | 33449.0 +/- 0.0 | n/a | 9600.0 +/- 4894.2 | 9857.5 +/- 4857.6 | 257.5 +/- 152.6 | n/a |
| baseline | mul_scalar | 6/6 | 33713.0 +/- 0.0 | n/a | 11000.3 +/- 10891.9 | 11208.3 +/- 10936.7 | 208.0 +/- 58.3 | n/a |
| baseline | mean | 6/6 | 35707.0 +/- 0.0 | n/a | 9011.7 +/- 5475.8 | 9380.6 +/- 5511.8 | 368.8 +/- 163.9 | n/a |
| baseline | max | 6/6 | 35869.0 +/- 0.0 | n/a | 9197.8 +/- 4218.2 | 9385.3 +/- 4197.1 | 187.5 +/- 68.5 | n/a |
| zama | notarize | 7/7 | 471968.6 +/- 5.9 | 7863.0 +/- 57.5 | 8705.2 +/- 675.2 | 12269.8 +/- 1000.3 | 3564.6 +/- 620.0 | n/a |
| zama | add | 6/6 | 328034.3 +/- 1.6 | n/a | 9415.3 +/- 4755.3 | 13605.2 +/- 5189.4 | 4189.8 +/- 1197.2 | n/a |
| zama | mul_scalar | 6/6 | 324060.3 +/- 1.6 | n/a | 10970.9 +/- 10871.5 | 14625.9 +/- 10532.6 | 3655.0 +/- 706.9 | n/a |
| zama | mean | 6/6 | 343891.0 +/- 0.0 | n/a | 9064.3 +/- 5537.9 | 13081.1 +/- 4987.5 | 4016.8 +/- 1035.1 | n/a |
| zama | max | 6/6 | 330103.0 +/- 0.0 | n/a | 9141.2 +/- 4373.3 | 12366.8 +/- 4704.0 | 3225.6 +/- 545.7 | n/a |
| fhenix | notarize | 7/7 | 306050.3 +/- 4.5 | 6779.9 +/- 72.3 | 8875.4 +/- 664.1 | 9214.3 +/- 675.4 | 339.0 +/- 78.3 | n/a |
| fhenix | add | 6/6 | 318099.0 +/- 0.0 | n/a | 9433.9 +/- 4736.9 | 9839.6 +/- 4691.0 | 405.6 +/- 136.2 | n/a |
| fhenix | mul_scalar | 6/6 | 342345.0 +/- 0.0 | n/a | 10895.8 +/- 10938.6 | 11293.1 +/- 10898.5 | 397.3 +/- 142.8 | n/a |
| fhenix | mean | 6/6 | 373596.0 +/- 0.0 | n/a | 8972.8 +/- 5439.7 | 9901.6 +/- 5188.4 | 928.8 +/- 477.7 | n/a |
| fhenix | max | 6/6 | 322273.0 +/- 0.0 | n/a | 9074.2 +/- 4577.4 | 9540.4 +/- 4516.4 | 466.2 +/- 176.7 | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 7 | 233.1 +/- 58.8 |
| baseline | notarize | barrier.wait | 7 | 8278.9 +/- 118.4 |
| baseline | notarize | transaction.raw_broadcast | 7 | 190.3 +/- 157.9 |
| baseline | notarize | transaction.invoke_sign_and_submit | 7 | 190.6 +/- 157.9 |
| baseline | notarize | transaction.receipt.read_attempt | 100 | 128.0 +/- 90.9 |
| baseline | notarize | transaction.wait_receipt | 7 | 8573.0 +/- 641.7 |
| baseline | notarize | completion.handle.retry_backoff | 1 | 111.9 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 6 | 194.7 +/- 83.6 |
| baseline | notarize | completion.read_persisted_handle | 6 | 257.5 +/- 112.1 |
| baseline | notarize | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | add | transaction.prepare_and_sign | 6 | 203.0 +/- 75.9 |
| baseline | add | barrier.wait | 6 | 303.5 +/- 45.5 |
| baseline | add | transaction.raw_broadcast | 6 | 116.4 +/- 17.6 |
| baseline | add | transaction.invoke_sign_and_submit | 6 | 116.7 +/- 17.7 |
| baseline | add | transaction.receipt.read_attempt | 97 | 110.4 +/- 82.9 |
| baseline | add | transaction.wait_receipt | 6 | 9483.3 +/- 4900.1 |
| baseline | add | completion.handle.read_attempt | 6 | 204.5 +/- 152.3 |
| baseline | add | completion.read_persisted_handle | 6 | 257.4 +/- 152.6 |
| baseline | add | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | add | completion.handle.retry_backoff | 1 | 113.1 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 6 | 261.9 +/- 149.0 |
| baseline | mul_scalar | barrier.wait | 6 | 304.0 +/- 52.9 |
| baseline | mul_scalar | transaction.raw_broadcast | 6 | 126.6 +/- 34.7 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 6 | 126.9 +/- 34.7 |
| baseline | mul_scalar | transaction.receipt.read_attempt | 110 | 113.0 +/- 70.0 |
| baseline | mul_scalar | transaction.wait_receipt | 6 | 10873.4 +/- 10903.3 |
| baseline | mul_scalar | completion.handle.read_attempt | 6 | 207.9 +/- 58.3 |
| baseline | mul_scalar | completion.read_persisted_handle | 6 | 207.9 +/- 58.3 |
| baseline | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | mean | transaction.prepare_and_sign | 6 | 180.7 +/- 70.7 |
| baseline | mean | barrier.wait | 6 | 295.2 +/- 22.6 |
| baseline | mean | transaction.raw_broadcast | 6 | 125.6 +/- 11.9 |
| baseline | mean | transaction.invoke_sign_and_submit | 6 | 125.9 +/- 11.9 |
| baseline | mean | transaction.receipt.read_attempt | 91 | 111.0 +/- 79.2 |
| baseline | mean | transaction.wait_receipt | 6 | 8885.8 +/- 5480.8 |
| baseline | mean | completion.handle.read_attempt | 6 | 288.8 +/- 143.4 |
| baseline | mean | completion.read_persisted_handle | 6 | 368.7 +/- 163.9 |
| baseline | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | mean | completion.handle.retry_backoff | 1 | 114.7 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 6 | 197.5 +/- 61.8 |
| baseline | max | barrier.wait | 6 | 311.7 +/- 37.6 |
| baseline | max | transaction.raw_broadcast | 6 | 116.2 +/- 7.2 |
| baseline | max | transaction.invoke_sign_and_submit | 6 | 116.5 +/- 7.2 |
| baseline | max | transaction.receipt.read_attempt | 90 | 131.5 +/- 138.5 |
| baseline | max | transaction.wait_receipt | 6 | 9081.3 +/- 4216.8 |
| baseline | max | completion.handle.read_attempt | 6 | 187.4 +/- 68.5 |
| baseline | max | completion.read_persisted_handle | 6 | 187.4 +/- 68.5 |
| baseline | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 7 | 5656.8 +/- 46.5 |
| zama | notarize | encrypt.remote_input_approval | 7 | 2206.2 +/- 16.2 |
| zama | notarize | transaction.prepare_and_sign | 7 | 371.1 +/- 168.6 |
| zama | notarize | barrier.wait | 7 | 277.9 +/- 6.0 |
| zama | notarize | transaction.raw_broadcast | 7 | 165.4 +/- 61.3 |
| zama | notarize | transaction.invoke_sign_and_submit | 7 | 165.8 +/- 61.3 |
| zama | notarize | transaction.receipt.read_attempt | 102 | 112.8 +/- 78.2 |
| zama | notarize | transaction.wait_receipt | 7 | 8539.4 +/- 682.6 |
| zama | notarize | completion.handle.read_attempt | 7 | 224.6 +/- 121.5 |
| zama | notarize | completion.read_persisted_handle | 7 | 224.6 +/- 121.5 |
| zama | notarize | completion.local_keypair_and_authorization | 7 | 1.1 +/- 0.2 |
| zama | notarize | completion.read_attempt | 7 | 2607.3 +/- 192.9 |
| zama | notarize | completion.sdk_user_decrypt | 7 | 3338.7 +/- 628.2 |
| zama | notarize | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 4 | 1005.5 +/- 3.1 |
| zama | add | transaction.prepare_and_sign | 6 | 195.1 +/- 63.1 |
| zama | add | barrier.wait | 6 | 311.4 +/- 59.3 |
| zama | add | transaction.raw_broadcast | 6 | 124.0 +/- 26.9 |
| zama | add | transaction.invoke_sign_and_submit | 6 | 124.3 +/- 26.9 |
| zama | add | transaction.receipt.read_attempt | 95 | 110.4 +/- 98.5 |
| zama | add | transaction.wait_receipt | 6 | 9291.0 +/- 4729.8 |
| zama | add | completion.handle.read_attempt | 6 | 220.3 +/- 131.6 |
| zama | add | completion.read_persisted_handle | 6 | 220.4 +/- 131.6 |
| zama | add | completion.local_keypair_and_authorization | 6 | 1.0 +/- 0.2 |
| zama | add | completion.read_attempt | 6 | 3968.2 +/- 1160.8 |
| zama | add | completion.sdk_user_decrypt | 6 | 3968.2 +/- 1160.8 |
| zama | add | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mul_scalar | transaction.prepare_and_sign | 6 | 226.8 +/- 134.4 |
| zama | mul_scalar | barrier.wait | 6 | 339.1 +/- 66.9 |
| zama | mul_scalar | transaction.raw_broadcast | 6 | 166.5 +/- 119.4 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 6 | 166.8 +/- 119.5 |
| zama | mul_scalar | transaction.receipt.read_attempt | 107 | 126.5 +/- 152.4 |
| zama | mul_scalar | transaction.wait_receipt | 6 | 10804.0 +/- 10753.0 |
| zama | mul_scalar | completion.handle.read_attempt | 6 | 271.6 +/- 193.1 |
| zama | mul_scalar | completion.read_persisted_handle | 6 | 271.6 +/- 193.1 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 6 | 1.2 +/- 0.2 |
| zama | mul_scalar | completion.retry_backoff | 2 | 1005.7 +/- 2.4 |
| zama | mul_scalar | completion.read_attempt | 6 | 2969.8 +/- 843.9 |
| zama | mul_scalar | completion.sdk_user_decrypt | 6 | 3381.8 +/- 791.3 |
| zama | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mean | transaction.prepare_and_sign | 6 | 144.0 +/- 46.8 |
| zama | mean | barrier.wait | 6 | 331.9 +/- 31.5 |
| zama | mean | transaction.raw_broadcast | 6 | 129.8 +/- 43.4 |
| zama | mean | transaction.invoke_sign_and_submit | 6 | 130.0 +/- 43.4 |
| zama | mean | transaction.receipt.read_attempt | 89 | 128.7 +/- 126.0 |
| zama | mean | transaction.wait_receipt | 6 | 8934.2 +/- 5554.9 |
| zama | mean | completion.handle.read_attempt | 6 | 192.6 +/- 64.5 |
| zama | mean | completion.read_persisted_handle | 6 | 344.3 +/- 236.1 |
| zama | mean | completion.local_keypair_and_authorization | 6 | 1.1 +/- 0.2 |
| zama | mean | completion.retry_backoff | 2 | 1010.9 +/- 1.1 |
| zama | mean | completion.read_attempt | 6 | 3256.7 +/- 1044.6 |
| zama | mean | completion.sdk_user_decrypt | 6 | 3671.0 +/- 823.1 |
| zama | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mean | completion.handle.retry_backoff | 2 | 108.3 +/- 3.6 |
| zama | max | transaction.prepare_and_sign | 6 | 197.4 +/- 77.4 |
| zama | max | barrier.wait | 6 | 309.3 +/- 37.0 |
| zama | max | transaction.raw_broadcast | 6 | 121.9 +/- 21.1 |
| zama | max | transaction.invoke_sign_and_submit | 6 | 122.2 +/- 21.1 |
| zama | max | transaction.receipt.read_attempt | 90 | 127.5 +/- 100.5 |
| zama | max | transaction.wait_receipt | 6 | 9019.0 +/- 4375.0 |
| zama | max | completion.handle.read_attempt | 6 | 201.0 +/- 77.7 |
| zama | max | completion.read_persisted_handle | 6 | 254.9 +/- 121.9 |
| zama | max | completion.local_keypair_and_authorization | 6 | 1.0 +/- 0.1 |
| zama | max | completion.read_attempt | 6 | 2550.2 +/- 118.8 |
| zama | max | completion.sdk_user_decrypt | 6 | 2969.4 +/- 604.8 |
| zama | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | max | completion.retry_backoff | 2 | 1010.8 +/- 4.4 |
| zama | max | completion.handle.retry_backoff | 1 | 105.8 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 7 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 7 | 693.0 +/- 25.8 |
| fhenix | notarize | encrypt.sdk_observed.pack | 7 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 7 | 5373.2 +/- 35.1 |
| fhenix | notarize | encrypt.sdk_observed.verify | 7 | 713.4 +/- 48.5 |
| fhenix | notarize | encrypt.sdk_total | 7 | 6779.9 +/- 72.3 |
| fhenix | notarize | transaction.prepare_and_sign | 7 | 421.3 +/- 222.4 |
| fhenix | notarize | barrier.wait | 7 | 1310.8 +/- 103.2 |
| fhenix | notarize | transaction.raw_broadcast | 7 | 189.2 +/- 82.8 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 7 | 189.7 +/- 82.8 |
| fhenix | notarize | transaction.receipt.read_attempt | 104 | 111.2 +/- 76.1 |
| fhenix | notarize | transaction.wait_receipt | 7 | 8685.7 +/- 659.7 |
| fhenix | notarize | completion.handle.read_attempt | 7 | 177.8 +/- 76.9 |
| fhenix | notarize | completion.read_persisted_handle | 7 | 177.8 +/- 76.9 |
| fhenix | notarize | completion.read_attempt | 7 | 160.9 +/- 10.3 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 7 | 160.9 +/- 10.3 |
| fhenix | notarize | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| fhenix | add | transaction.prepare_and_sign | 6 | 159.0 +/- 55.2 |
| fhenix | add | barrier.wait | 6 | 347.4 +/- 78.7 |
| fhenix | add | transaction.raw_broadcast | 6 | 118.3 +/- 12.4 |
| fhenix | add | transaction.invoke_sign_and_submit | 6 | 118.6 +/- 12.4 |
| fhenix | add | transaction.receipt.read_attempt | 97 | 99.1 +/- 108.7 |
| fhenix | add | transaction.wait_receipt | 6 | 9315.3 +/- 4742.5 |
| fhenix | add | completion.handle.read_attempt | 6 | 243.1 +/- 138.5 |
| fhenix | add | completion.read_persisted_handle | 6 | 243.1 +/- 138.5 |
| fhenix | add | completion.read_attempt | 6 | 162.4 +/- 6.5 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 6 | 162.4 +/- 6.5 |
| fhenix | add | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.prepare_and_sign | 6 | 284.1 +/- 196.7 |
| fhenix | mul_scalar | barrier.wait | 6 | 281.8 +/- 6.5 |
| fhenix | mul_scalar | transaction.raw_broadcast | 6 | 125.9 +/- 20.6 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 6 | 126.2 +/- 20.7 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 108 | 118.5 +/- 106.1 |
| fhenix | mul_scalar | transaction.wait_receipt | 6 | 10769.6 +/- 10942.4 |
| fhenix | mul_scalar | completion.handle.read_attempt | 6 | 162.0 +/- 40.8 |
| fhenix | mul_scalar | completion.read_persisted_handle | 6 | 162.0 +/- 40.8 |
| fhenix | mul_scalar | completion.read_attempt | 6 | 235.0 +/- 153.8 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 6 | 235.1 +/- 153.8 |
| fhenix | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.prepare_and_sign | 6 | 175.3 +/- 53.2 |
| fhenix | mean | barrier.wait | 6 | 300.7 +/- 43.8 |
| fhenix | mean | transaction.raw_broadcast | 6 | 117.1 +/- 14.9 |
| fhenix | mean | transaction.invoke_sign_and_submit | 6 | 117.4 +/- 14.9 |
| fhenix | mean | transaction.receipt.read_attempt | 91 | 110.3 +/- 79.2 |
| fhenix | mean | transaction.wait_receipt | 6 | 8855.4 +/- 5448.2 |
| fhenix | mean | completion.handle.read_attempt | 6 | 248.0 +/- 104.9 |
| fhenix | mean | completion.read_persisted_handle | 6 | 312.3 +/- 179.9 |
| fhenix | mean | completion.read_attempt | 6 | 616.3 +/- 367.2 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 6 | 616.3 +/- 367.2 |
| fhenix | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 1 | 112.6 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 6 | 193.6 +/- 69.8 |
| fhenix | max | barrier.wait | 6 | 315.6 +/- 40.0 |
| fhenix | max | transaction.raw_broadcast | 6 | 124.7 +/- 17.9 |
| fhenix | max | transaction.invoke_sign_and_submit | 6 | 125.1 +/- 17.9 |
| fhenix | max | transaction.receipt.read_attempt | 90 | 122.8 +/- 85.0 |
| fhenix | max | transaction.wait_receipt | 6 | 8949.2 +/- 4582.2 |
| fhenix | max | completion.handle.read_attempt | 6 | 231.7 +/- 164.9 |
| fhenix | max | completion.read_persisted_handle | 6 | 293.1 +/- 189.7 |
| fhenix | max | completion.read_attempt | 6 | 172.9 +/- 30.8 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 6 | 172.9 +/- 30.8 |
| fhenix | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 1 | 108.2 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
