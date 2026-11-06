# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 10/10 | 22064.0 +/- 0.0 | n/a | 12332.5 +/- 5849.9 | 12457.7 +/- 5848.8 | 125.2 +/- 32.1 | n/a |
| baseline | notarize | 10/10 | 31671.0 +/- 0.0 | n/a | 11765.4 +/- 764.5 | 11896.3 +/- 730.5 | 131.0 +/- 58.6 | n/a |
| baseline | add | 10/10 | 33358.0 +/- 0.0 | n/a | 7519.1 +/- 1076.2 | 7629.9 +/- 1075.4 | 110.8 +/- 7.2 | n/a |
| baseline | mul_scalar | 10/10 | 33736.0 +/- 0.0 | n/a | 6752.0 +/- 1180.1 | 6892.6 +/- 1201.1 | 140.6 +/- 66.4 | n/a |
| baseline | mean | 10/10 | 35556.0 +/- 0.0 | n/a | 10967.3 +/- 5822.0 | 11094.9 +/- 5809.2 | 127.6 +/- 55.7 | n/a |
| baseline | max | 9/9 | 35732.0 +/- 0.0 | n/a | 14210.0 +/- 8363.5 | 14322.3 +/- 8366.1 | 112.3 +/- 8.0 | n/a |
| zama | set_meter_owner | 10/10 | 472236.0 +/- 6.3 | 7893.7 +/- 38.1 | 12316.4 +/- 5783.7 | 15777.0 +/- 5805.3 | 3460.7 +/- 933.7 | n/a |
| zama | notarize | 10/10 | 472102.8 +/- 10.1 | 7898.0 +/- 49.8 | 11805.1 +/- 797.6 | 15271.3 +/- 1455.2 | 3466.2 +/- 964.2 | n/a |
| zama | add | 10/10 | 328025.2 +/- 1.7 | n/a | 7592.3 +/- 1115.8 | 12095.5 +/- 1505.4 | 4503.2 +/- 780.1 | n/a |
| zama | mul_scalar | 10/10 | 324339.6 +/- 1.3 | n/a | 6811.6 +/- 1097.5 | 10801.1 +/- 1046.5 | 3989.4 +/- 844.1 | n/a |
| zama | mean | 10/10 | 344191.6 +/- 1.3 | n/a | 11011.4 +/- 5755.2 | 15195.9 +/- 6169.7 | 4184.5 +/- 919.9 | n/a |
| zama | max | 9/9 | 330055.0 +/- 0.0 | n/a | 14252.5 +/- 8327.0 | 18138.6 +/- 8272.8 | 3886.1 +/- 651.6 | n/a |
| fhenix | set_meter_owner | 16/16 | 306295.5 +/- 10.6 | 7243.3 +/- 107.5 | 10362.3 +/- 6242.3 | 10682.8 +/- 6286.4 | 320.5 +/- 76.1 | n/a |
| fhenix | notarize | 16/16 | 306162.8 +/- 6.1 | 7186.4 +/- 182.3 | 8700.7 +/- 4087.8 | 9007.9 +/- 4135.2 | 307.1 +/- 70.8 | n/a |
| fhenix | add | 16/16 | 318066.0 +/- 0.0 | n/a | 10089.2 +/- 4848.5 | 10455.5 +/- 4796.0 | 366.3 +/- 124.4 | n/a |
| fhenix | mul_scalar | 16/16 | 342550.0 +/- 0.0 | n/a | 8310.2 +/- 2161.9 | 10499.4 +/- 2219.3 | 2189.2 +/- 589.5 | n/a |
| fhenix | mean | 15/16 | 373742.0 +/- 0.0 | n/a | 10224.6 +/- 4641.9 | 23194.7 +/- 4891.8 | 12750.5 +/- 907.8 | n/a |
| fhenix | max | 15/16 | 322190.0 +/- 0.0 | n/a | 13113.4 +/- 7098.5 | 13979.8 +/- 7238.7 | 609.8 +/- 388.2 | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | set_meter_owner | transaction.prepare_and_sign | 10 | 160.4 +/- 8.6 |
| baseline | set_meter_owner | barrier.wait | 10 | 8247.7 +/- 39.7 |
| baseline | set_meter_owner | transaction.raw_broadcast | 10 | 110.6 +/- 5.6 |
| baseline | set_meter_owner | transaction.invoke_sign_and_submit | 10 | 110.9 +/- 5.6 |
| baseline | set_meter_owner | transaction.receipt.read_attempt | 223 | 62.9 +/- 29.5 |
| baseline | set_meter_owner | transaction.wait_receipt | 10 | 12221.6 +/- 5853.9 |
| baseline | set_meter_owner | completion.handle.read_attempt | 10 | 124.9 +/- 32.1 |
| baseline | set_meter_owner | completion.read_persisted_handle | 10 | 124.9 +/- 32.1 |
| baseline | set_meter_owner | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | notarize | transaction.prepare_and_sign | 10 | 134.7 +/- 48.9 |
| baseline | notarize | barrier.wait | 10 | 8249.7 +/- 111.5 |
| baseline | notarize | transaction.raw_broadcast | 10 | 126.1 +/- 31.8 |
| baseline | notarize | transaction.invoke_sign_and_submit | 10 | 126.4 +/- 31.8 |
| baseline | notarize | transaction.receipt.read_attempt | 212 | 64.9 +/- 26.7 |
| baseline | notarize | transaction.wait_receipt | 10 | 11638.9 +/- 765.8 |
| baseline | notarize | completion.handle.read_attempt | 10 | 107.0 +/- 19.8 |
| baseline | notarize | completion.read_persisted_handle | 10 | 130.9 +/- 58.6 |
| baseline | notarize | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | notarize | completion.handle.retry_backoff | 1 | 111.2 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 10 | 139.9 +/- 54.8 |
| baseline | add | barrier.wait | 10 | 320.2 +/- 38.0 |
| baseline | add | transaction.raw_broadcast | 10 | 110.0 +/- 12.5 |
| baseline | add | transaction.invoke_sign_and_submit | 10 | 110.2 +/- 12.5 |
| baseline | add | transaction.receipt.read_attempt | 140 | 57.8 +/- 11.2 |
| baseline | add | transaction.wait_receipt | 10 | 7408.9 +/- 1082.6 |
| baseline | add | completion.handle.read_attempt | 10 | 110.7 +/- 7.2 |
| baseline | add | completion.read_persisted_handle | 10 | 110.7 +/- 7.2 |
| baseline | add | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.prepare_and_sign | 10 | 198.5 +/- 75.8 |
| baseline | mul_scalar | barrier.wait | 10 | 307.9 +/- 23.1 |
| baseline | mul_scalar | transaction.raw_broadcast | 10 | 106.3 +/- 9.9 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 10 | 106.6 +/- 9.9 |
| baseline | mul_scalar | transaction.receipt.read_attempt | 126 | 59.2 +/- 17.3 |
| baseline | mul_scalar | transaction.wait_receipt | 10 | 6645.3 +/- 1178.7 |
| baseline | mul_scalar | completion.handle.read_attempt | 10 | 117.7 +/- 14.7 |
| baseline | mul_scalar | completion.read_persisted_handle | 10 | 140.5 +/- 66.4 |
| baseline | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | mul_scalar | completion.handle.retry_backoff | 1 | 103.7 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 10 | 161.6 +/- 57.3 |
| baseline | mean | barrier.wait | 10 | 309.6 +/- 33.7 |
| baseline | mean | transaction.raw_broadcast | 10 | 109.4 +/- 16.1 |
| baseline | mean | transaction.invoke_sign_and_submit | 10 | 109.7 +/- 16.1 |
| baseline | mean | transaction.receipt.read_attempt | 201 | 57.7 +/- 9.5 |
| baseline | mean | transaction.wait_receipt | 10 | 10857.6 +/- 5821.4 |
| baseline | mean | completion.handle.read_attempt | 10 | 103.5 +/- 21.4 |
| baseline | mean | completion.read_persisted_handle | 10 | 127.5 +/- 55.7 |
| baseline | mean | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| baseline | mean | completion.handle.retry_backoff | 1 | 112.9 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 9 | 229.3 +/- 33.1 |
| baseline | max | barrier.wait | 9 | 302.7 +/- 19.1 |
| baseline | max | transaction.raw_broadcast | 9 | 111.6 +/- 26.6 |
| baseline | max | transaction.invoke_sign_and_submit | 9 | 111.9 +/- 26.6 |
| baseline | max | transaction.receipt.read_attempt | 232 | 58.5 +/- 29.3 |
| baseline | max | transaction.wait_receipt | 9 | 14098.0 +/- 8354.9 |
| baseline | max | completion.handle.read_attempt | 9 | 112.2 +/- 7.9 |
| baseline | max | completion.read_persisted_handle | 9 | 112.2 +/- 7.9 |
| baseline | max | completion.validate_plaintext | 9 | 0.0 +/- 0.0 |
| zama | set_meter_owner | encrypt.local_ciphertext_and_zkproof | 10 | 5700.0 +/- 43.9 |
| zama | set_meter_owner | encrypt.remote_input_approval | 10 | 2193.7 +/- 11.0 |
| zama | set_meter_owner | transaction.prepare_and_sign | 10 | 223.8 +/- 8.5 |
| zama | set_meter_owner | barrier.wait | 10 | 290.9 +/- 13.4 |
| zama | set_meter_owner | transaction.raw_broadcast | 10 | 107.7 +/- 9.8 |
| zama | set_meter_owner | transaction.invoke_sign_and_submit | 10 | 108.1 +/- 9.8 |
| zama | set_meter_owner | transaction.receipt.read_attempt | 223 | 62.4 +/- 29.9 |
| zama | set_meter_owner | transaction.wait_receipt | 10 | 12208.3 +/- 5781.4 |
| zama | set_meter_owner | completion.handle.read_attempt | 10 | 135.8 +/- 96.5 |
| zama | set_meter_owner | completion.read_persisted_handle | 10 | 183.7 +/- 109.4 |
| zama | set_meter_owner | completion.local_keypair_and_authorization | 10 | 1.1 +/- 0.2 |
| zama | set_meter_owner | completion.read_attempt | 10 | 3155.7 +/- 1022.7 |
| zama | set_meter_owner | completion.sdk_user_decrypt | 10 | 3275.4 +/- 989.4 |
| zama | set_meter_owner | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | set_meter_owner | completion.handle.retry_backoff | 2 | 107.2 +/- 7.7 |
| zama | set_meter_owner | completion.retry_backoff | 1 | 1012.1 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 10 | 5691.6 +/- 46.4 |
| zama | notarize | encrypt.remote_input_approval | 10 | 2206.3 +/- 11.9 |
| zama | notarize | transaction.prepare_and_sign | 10 | 197.0 +/- 46.7 |
| zama | notarize | barrier.wait | 10 | 289.5 +/- 17.3 |
| zama | notarize | transaction.raw_broadcast | 10 | 118.0 +/- 29.9 |
| zama | notarize | transaction.invoke_sign_and_submit | 10 | 118.4 +/- 29.9 |
| zama | notarize | transaction.receipt.read_attempt | 214 | 62.1 +/- 21.5 |
| zama | notarize | transaction.wait_receipt | 10 | 11686.7 +/- 797.9 |
| zama | notarize | completion.handle.read_attempt | 10 | 107.5 +/- 11.2 |
| zama | notarize | completion.read_persisted_handle | 10 | 107.5 +/- 11.2 |
| zama | notarize | completion.local_keypair_and_authorization | 10 | 1.2 +/- 0.2 |
| zama | notarize | completion.read_attempt | 10 | 3117.0 +/- 1040.3 |
| zama | notarize | completion.sdk_user_decrypt | 10 | 3357.2 +/- 966.5 |
| zama | notarize | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 2 | 1000.9 +/- 0.5 |
| zama | add | transaction.prepare_and_sign | 10 | 125.2 +/- 29.7 |
| zama | add | barrier.wait | 10 | 334.9 +/- 30.7 |
| zama | add | transaction.raw_broadcast | 10 | 110.2 +/- 10.5 |
| zama | add | transaction.invoke_sign_and_submit | 10 | 110.5 +/- 10.5 |
| zama | add | transaction.receipt.read_attempt | 141 | 59.2 +/- 12.4 |
| zama | add | transaction.wait_receipt | 10 | 7481.8 +/- 1119.7 |
| zama | add | completion.handle.read_attempt | 10 | 110.7 +/- 6.4 |
| zama | add | completion.read_persisted_handle | 10 | 110.7 +/- 6.4 |
| zama | add | completion.local_keypair_and_authorization | 10 | 1.1 +/- 0.2 |
| zama | add | completion.read_attempt | 10 | 4023.3 +/- 960.5 |
| zama | add | completion.sdk_user_decrypt | 10 | 4391.2 +/- 781.2 |
| zama | add | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 3 | 1007.5 +/- 6.3 |
| zama | mul_scalar | transaction.prepare_and_sign | 10 | 148.3 +/- 28.1 |
| zama | mul_scalar | barrier.wait | 10 | 358.1 +/- 56.0 |
| zama | mul_scalar | transaction.raw_broadcast | 10 | 107.3 +/- 9.0 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 10 | 107.6 +/- 9.0 |
| zama | mul_scalar | transaction.receipt.read_attempt | 127 | 59.5 +/- 21.2 |
| zama | mul_scalar | transaction.wait_receipt | 10 | 6704.0 +/- 1097.7 |
| zama | mul_scalar | completion.handle.read_attempt | 10 | 107.5 +/- 5.8 |
| zama | mul_scalar | completion.read_persisted_handle | 10 | 107.5 +/- 5.8 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 10 | 1.1 +/- 0.3 |
| zama | mul_scalar | completion.read_attempt | 10 | 3523.0 +/- 1122.0 |
| zama | mul_scalar | completion.sdk_user_decrypt | 10 | 3880.6 +/- 844.2 |
| zama | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.retry_backoff | 3 | 1008.8 +/- 5.1 |
| zama | mean | transaction.prepare_and_sign | 10 | 138.0 +/- 27.2 |
| zama | mean | barrier.wait | 10 | 333.3 +/- 21.3 |
| zama | mean | transaction.raw_broadcast | 10 | 113.3 +/- 30.9 |
| zama | mean | transaction.invoke_sign_and_submit | 10 | 113.6 +/- 30.9 |
| zama | mean | transaction.receipt.read_attempt | 202 | 56.9 +/- 11.1 |
| zama | mean | transaction.wait_receipt | 10 | 10897.8 +/- 5763.4 |
| zama | mean | completion.handle.read_attempt | 10 | 114.0 +/- 12.1 |
| zama | mean | completion.read_persisted_handle | 10 | 114.0 +/- 12.1 |
| zama | mean | completion.local_keypair_and_authorization | 10 | 1.1 +/- 0.3 |
| zama | mean | completion.read_attempt | 10 | 3947.7 +/- 1058.7 |
| zama | mean | completion.sdk_user_decrypt | 10 | 4069.2 +/- 918.3 |
| zama | mean | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 1 | 1014.7 +/- n/a |
| zama | max | transaction.prepare_and_sign | 9 | 224.6 +/- 33.9 |
| zama | max | barrier.wait | 9 | 307.5 +/- 14.8 |
| zama | max | transaction.raw_broadcast | 9 | 111.5 +/- 22.9 |
| zama | max | transaction.invoke_sign_and_submit | 9 | 111.8 +/- 22.9 |
| zama | max | transaction.receipt.read_attempt | 231 | 62.8 +/- 39.6 |
| zama | max | transaction.wait_receipt | 9 | 14140.7 +/- 8323.5 |
| zama | max | completion.handle.read_attempt | 9 | 108.1 +/- 17.6 |
| zama | max | completion.read_persisted_handle | 9 | 135.5 +/- 65.3 |
| zama | max | completion.local_keypair_and_authorization | 9 | 1.1 +/- 0.2 |
| zama | max | completion.retry_backoff | 6 | 1008.7 +/- 6.4 |
| zama | max | completion.read_attempt | 9 | 2943.9 +/- 957.3 |
| zama | max | completion.sdk_user_decrypt | 9 | 3749.2 +/- 652.5 |
| zama | max | completion.validate_plaintext | 9 | 0.0 +/- 0.0 |
| zama | max | completion.handle.retry_backoff | 1 | 104.0 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 16 | 0.1 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 16 | 687.0 +/- 23.1 |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 16 | 0.1 +/- 0.1 |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 16 | 5403.5 +/- 64.8 |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 16 | 1152.5 +/- 82.7 |
| fhenix | set_meter_owner | encrypt.sdk_total | 16 | 7243.3 +/- 107.5 |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 16 | 241.2 +/- 79.4 |
| fhenix | set_meter_owner | barrier.wait | 16 | 688.1 +/- 285.2 |
| fhenix | set_meter_owner | transaction.raw_broadcast | 16 | 110.5 +/- 11.9 |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 16 | 110.9 +/- 11.9 |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 303 | 60.1 +/- 17.1 |
| fhenix | set_meter_owner | transaction.wait_receipt | 16 | 10251.4 +/- 6239.9 |
| fhenix | set_meter_owner | completion.handle.read_attempt | 16 | 106.1 +/- 37.1 |
| fhenix | set_meter_owner | completion.read_persisted_handle | 16 | 106.1 +/- 37.1 |
| fhenix | set_meter_owner | completion.read_attempt | 16 | 214.0 +/- 45.0 |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 16 | 214.0 +/- 45.0 |
| fhenix | set_meter_owner | completion.validate_plaintext | 16 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 16 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 16 | 710.9 +/- 30.1 |
| fhenix | notarize | encrypt.sdk_observed.pack | 16 | 0.0 +/- 0.1 |
| fhenix | notarize | encrypt.sdk_observed.prove | 16 | 5400.2 +/- 73.7 |
| fhenix | notarize | encrypt.sdk_observed.verify | 16 | 1075.2 +/- 155.9 |
| fhenix | notarize | encrypt.sdk_total | 16 | 7186.4 +/- 182.3 |
| fhenix | notarize | transaction.prepare_and_sign | 16 | 257.5 +/- 87.2 |
| fhenix | notarize | barrier.wait | 16 | 689.4 +/- 307.2 |
| fhenix | notarize | transaction.raw_broadcast | 16 | 119.1 +/- 27.1 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 16 | 119.5 +/- 27.1 |
| fhenix | notarize | transaction.receipt.read_attempt | 257 | 58.1 +/- 14.8 |
| fhenix | notarize | transaction.wait_receipt | 16 | 8581.2 +/- 4081.9 |
| fhenix | notarize | completion.handle.read_attempt | 16 | 100.5 +/- 31.5 |
| fhenix | notarize | completion.read_persisted_handle | 16 | 115.0 +/- 55.4 |
| fhenix | notarize | completion.read_attempt | 16 | 191.9 +/- 24.3 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 16 | 191.9 +/- 24.3 |
| fhenix | notarize | completion.validate_plaintext | 16 | 0.0 +/- 0.0 |
| fhenix | notarize | completion.handle.retry_backoff | 1 | 110.4 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 16 | 122.2 +/- 40.7 |
| fhenix | add | barrier.wait | 16 | 337.3 +/- 37.4 |
| fhenix | add | transaction.raw_broadcast | 16 | 95.6 +/- 19.6 |
| fhenix | add | transaction.invoke_sign_and_submit | 16 | 95.9 +/- 19.6 |
| fhenix | add | transaction.receipt.read_attempt | 297 | 57.5 +/- 13.0 |
| fhenix | add | transaction.wait_receipt | 16 | 9993.3 +/- 4848.3 |
| fhenix | add | completion.handle.read_attempt | 16 | 111.3 +/- 17.6 |
| fhenix | add | completion.read_persisted_handle | 16 | 124.6 +/- 41.4 |
| fhenix | add | completion.read_attempt | 16 | 241.4 +/- 121.5 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 16 | 241.5 +/- 121.5 |
| fhenix | add | completion.validate_plaintext | 16 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 1 | 104.6 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 16 | 148.7 +/- 51.3 |
| fhenix | mul_scalar | barrier.wait | 16 | 339.0 +/- 48.0 |
| fhenix | mul_scalar | transaction.raw_broadcast | 16 | 109.5 +/- 6.9 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 16 | 109.8 +/- 7.0 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 246 | 58.2 +/- 17.7 |
| fhenix | mul_scalar | transaction.wait_receipt | 16 | 8200.4 +/- 2161.4 |
| fhenix | mul_scalar | completion.handle.read_attempt | 16 | 112.1 +/- 11.8 |
| fhenix | mul_scalar | completion.read_persisted_handle | 16 | 112.1 +/- 11.8 |
| fhenix | mul_scalar | completion.read_attempt | 16 | 2076.9 +/- 590.2 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 16 | 2077.0 +/- 590.2 |
| fhenix | mul_scalar | completion.validate_plaintext | 16 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.prepare_and_sign | 16 | 121.1 +/- 26.7 |
| fhenix | mean | barrier.wait | 16 | 342.8 +/- 19.5 |
| fhenix | mean | transaction.raw_broadcast | 16 | 107.7 +/- 8.7 |
| fhenix | mean | transaction.invoke_sign_and_submit | 16 | 107.9 +/- 8.7 |
| fhenix | mean | transaction.receipt.read_attempt | 300 | 58.3 +/- 18.2 |
| fhenix | mean | transaction.wait_receipt | 16 | 10116.6 +/- 4643.4 |
| fhenix | mean | completion.handle.read_attempt | 16 | 106.2 +/- 18.2 |
| fhenix | mean | completion.read_persisted_handle | 16 | 119.9 +/- 40.0 |
| fhenix | mean | completion.read_attempt | 15 | 12629.7 +/- 946.8 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 15 | 12629.7 +/- 946.8 |
| fhenix | mean | completion.validate_plaintext | 15 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 1 | 100.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 16 | 169.0 +/- 31.6 |
| fhenix | max | barrier.wait | 16 | 360.8 +/- 19.8 |
| fhenix | max | transaction.raw_broadcast | 16 | 113.9 +/- 24.6 |
| fhenix | max | transaction.invoke_sign_and_submit | 16 | 114.2 +/- 24.6 |
| fhenix | max | transaction.receipt.read_attempt | 381 | 59.3 +/- 31.2 |
| fhenix | max | transaction.wait_receipt | 16 | 12999.2 +/- 7098.8 |
| fhenix | max | completion.handle.read_attempt | 16 | 116.1 +/- 28.0 |
| fhenix | max | completion.read_persisted_handle | 16 | 144.7 +/- 64.1 |
| fhenix | max | completion.read_attempt | 15 | 462.6 +/- 382.4 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 15 | 462.6 +/- 382.4 |
| fhenix | max | completion.validate_plaintext | 15 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 2 | 104.0 +/- 5.8 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
