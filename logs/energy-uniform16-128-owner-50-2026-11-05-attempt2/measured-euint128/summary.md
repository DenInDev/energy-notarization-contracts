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
| fhenix | set_meter_owner | 10/10 | 306292.8 +/- 12.9 | 7296.0 +/- 96.8 | 12261.5 +/- 5819.0 | 12624.7 +/- 5840.4 | 363.2 +/- 62.0 | n/a |
| fhenix | notarize | 10/10 | 306163.2 +/- 6.2 | 7234.7 +/- 154.9 | 11704.3 +/- 829.0 | 12046.5 +/- 817.3 | 342.2 +/- 58.3 | n/a |
| fhenix | add | 10/10 | 318066.0 +/- 0.0 | n/a | 7558.8 +/- 1164.2 | 7959.7 +/- 1083.9 | 400.9 +/- 139.4 | n/a |
| fhenix | mul_scalar | 10/10 | 342550.0 +/- 0.0 | n/a | 6866.4 +/- 1161.1 | 9009.4 +/- 1208.2 | 2143.1 +/- 643.2 | n/a |
| fhenix | mean | 9/10 | 373742.0 +/- 0.0 | n/a | 11009.2 +/- 5824.6 | 24028.5 +/- 6304.2 | 12566.2 +/- 1123.1 | n/a |
| fhenix | max | 9/9 | 322190.0 +/- 0.0 | n/a | 14218.8 +/- 8308.3 | 14840.7 +/- 8292.9 | 621.9 +/- 393.0 | n/a |

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
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 10 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 10 | 686.6 +/- 17.6 |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 10 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 10 | 5443.2 +/- 44.2 |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 10 | 1165.9 +/- 102.2 |
| fhenix | set_meter_owner | encrypt.sdk_total | 10 | 7296.0 +/- 96.8 |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 10 | 221.2 +/- 21.4 |
| fhenix | set_meter_owner | barrier.wait | 10 | 891.2 +/- 115.4 |
| fhenix | set_meter_owner | transaction.raw_broadcast | 10 | 110.6 +/- 9.8 |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 10 | 111.0 +/- 9.8 |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 223 | 59.5 +/- 15.5 |
| fhenix | set_meter_owner | transaction.wait_receipt | 10 | 12150.5 +/- 5817.5 |
| fhenix | set_meter_owner | completion.handle.read_attempt | 10 | 125.1 +/- 25.7 |
| fhenix | set_meter_owner | completion.read_persisted_handle | 10 | 125.1 +/- 25.7 |
| fhenix | set_meter_owner | completion.read_attempt | 10 | 237.6 +/- 41.1 |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 10 | 237.7 +/- 41.1 |
| fhenix | set_meter_owner | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 10 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 10 | 721.7 +/- 26.9 |
| fhenix | notarize | encrypt.sdk_observed.pack | 10 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 10 | 5448.9 +/- 42.1 |
| fhenix | notarize | encrypt.sdk_observed.verify | 10 | 1063.9 +/- 140.1 |
| fhenix | notarize | encrypt.sdk_total | 10 | 7234.7 +/- 154.9 |
| fhenix | notarize | transaction.prepare_and_sign | 10 | 257.7 +/- 103.6 |
| fhenix | notarize | barrier.wait | 10 | 892.0 +/- 189.0 |
| fhenix | notarize | transaction.raw_broadcast | 10 | 122.0 +/- 29.4 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 10 | 122.4 +/- 29.4 |
| fhenix | notarize | transaction.receipt.read_attempt | 214 | 57.2 +/- 13.2 |
| fhenix | notarize | transaction.wait_receipt | 10 | 11581.9 +/- 825.6 |
| fhenix | notarize | completion.handle.read_attempt | 10 | 114.7 +/- 26.2 |
| fhenix | notarize | completion.read_persisted_handle | 10 | 137.9 +/- 56.5 |
| fhenix | notarize | completion.read_attempt | 10 | 204.0 +/- 14.7 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 10 | 204.0 +/- 14.7 |
| fhenix | notarize | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | notarize | completion.handle.retry_backoff | 1 | 110.4 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 10 | 130.7 +/- 50.2 |
| fhenix | add | barrier.wait | 10 | 329.3 +/- 46.0 |
| fhenix | add | transaction.raw_broadcast | 10 | 101.7 +/- 10.5 |
| fhenix | add | transaction.invoke_sign_and_submit | 10 | 102.0 +/- 10.5 |
| fhenix | add | transaction.receipt.read_attempt | 141 | 56.9 +/- 16.8 |
| fhenix | add | transaction.wait_receipt | 10 | 7456.8 +/- 1160.1 |
| fhenix | add | completion.handle.read_attempt | 10 | 111.6 +/- 21.5 |
| fhenix | add | completion.read_persisted_handle | 10 | 132.9 +/- 50.9 |
| fhenix | add | completion.read_attempt | 10 | 267.7 +/- 139.0 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 10 | 267.8 +/- 139.0 |
| fhenix | add | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 1 | 104.6 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 10 | 173.2 +/- 50.9 |
| fhenix | mul_scalar | barrier.wait | 10 | 333.2 +/- 61.0 |
| fhenix | mul_scalar | transaction.raw_broadcast | 10 | 109.9 +/- 8.2 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 10 | 110.2 +/- 8.2 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 128 | 58.8 +/- 21.9 |
| fhenix | mul_scalar | transaction.wait_receipt | 10 | 6756.2 +/- 1159.1 |
| fhenix | mul_scalar | completion.handle.read_attempt | 10 | 113.1 +/- 13.2 |
| fhenix | mul_scalar | completion.read_persisted_handle | 10 | 113.1 +/- 13.2 |
| fhenix | mul_scalar | completion.read_attempt | 10 | 2029.7 +/- 645.6 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 10 | 2029.7 +/- 645.6 |
| fhenix | mul_scalar | completion.validate_plaintext | 10 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.prepare_and_sign | 10 | 130.5 +/- 30.3 |
| fhenix | mean | barrier.wait | 10 | 340.7 +/- 24.8 |
| fhenix | mean | transaction.raw_broadcast | 10 | 107.1 +/- 5.5 |
| fhenix | mean | transaction.invoke_sign_and_submit | 10 | 107.4 +/- 5.5 |
| fhenix | mean | transaction.receipt.read_attempt | 202 | 56.0 +/- 12.4 |
| fhenix | mean | transaction.wait_receipt | 10 | 10901.8 +/- 5826.2 |
| fhenix | mean | completion.handle.read_attempt | 10 | 104.2 +/- 23.2 |
| fhenix | mean | completion.read_persisted_handle | 10 | 126.1 +/- 50.4 |
| fhenix | mean | completion.read_attempt | 9 | 12438.0 +/- 1175.1 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 9 | 12438.0 +/- 1175.1 |
| fhenix | mean | completion.validate_plaintext | 9 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 1 | 100.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 9 | 167.1 +/- 22.8 |
| fhenix | max | barrier.wait | 9 | 365.1 +/- 25.0 |
| fhenix | max | transaction.raw_broadcast | 9 | 110.7 +/- 24.6 |
| fhenix | max | transaction.invoke_sign_and_submit | 9 | 110.9 +/- 24.6 |
| fhenix | max | transaction.receipt.read_attempt | 232 | 59.2 +/- 32.1 |
| fhenix | max | transaction.wait_receipt | 9 | 14107.8 +/- 8303.0 |
| fhenix | max | completion.handle.read_attempt | 9 | 102.5 +/- 20.1 |
| fhenix | max | completion.read_persisted_handle | 9 | 153.2 +/- 83.3 |
| fhenix | max | completion.read_attempt | 9 | 468.5 +/- 391.0 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 9 | 468.5 +/- 391.0 |
| fhenix | max | completion.validate_plaintext | 9 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 2 | 104.0 +/- 5.8 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
