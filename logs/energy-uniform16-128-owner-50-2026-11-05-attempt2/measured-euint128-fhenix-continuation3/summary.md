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
| fhenix | set_meter_owner | 50/50 | 306295.9 +/- 8.3 | 7261.9 +/- 97.1 | 8100.3 +/- 8041.5 | 8416.4 +/- 8081.5 | 316.0 +/- 69.2 | n/a |
| fhenix | notarize | 50/50 | 306161.0 +/- 8.1 | 7151.0 +/- 145.7 | 8062.5 +/- 5802.6 | 8392.6 +/- 5885.7 | 330.0 +/- 122.5 | n/a |
| fhenix | add | 50/50 | 318066.0 +/- 0.0 | n/a | 11932.5 +/- 4878.6 | 12493.0 +/- 4992.5 | 560.5 +/- 433.4 | n/a |
| fhenix | mul_scalar | 50/50 | 342550.0 +/- 0.0 | n/a | 10803.2 +/- 4218.6 | 13319.7 +/- 4222.4 | 2516.5 +/- 688.9 | n/a |
| fhenix | mean | 49/50 | 373742.0 +/- 0.0 | n/a | 10190.1 +/- 4644.3 | 23505.4 +/- 4664.0 | 13248.8 +/- 953.2 | n/a |
| fhenix | max | 49/50 | 322190.0 +/- 0.0 | n/a | 11298.1 +/- 5092.7 | 12014.4 +/- 5049.5 | 674.8 +/- 492.4 | n/a |

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
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 50 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 50 | 707.1 +/- 52.2 |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 50 | 0.1 +/- 0.1 |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 50 | 5419.8 +/- 67.3 |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 50 | 1134.7 +/- 58.4 |
| fhenix | set_meter_owner | encrypt.sdk_total | 50 | 7261.9 +/- 97.1 |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 50 | 229.5 +/- 47.9 |
| fhenix | set_meter_owner | barrier.wait | 50 | 497.1 +/- 206.9 |
| fhenix | set_meter_owner | transaction.raw_broadcast | 50 | 109.8 +/- 9.6 |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 50 | 110.2 +/- 9.6 |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 747 | 60.5 +/- 31.5 |
| fhenix | set_meter_owner | transaction.wait_receipt | 50 | 7990.1 +/- 8039.4 |
| fhenix | set_meter_owner | completion.handle.read_attempt | 50 | 84.6 +/- 33.5 |
| fhenix | set_meter_owner | completion.read_persisted_handle | 50 | 96.0 +/- 49.4 |
| fhenix | set_meter_owner | completion.read_attempt | 50 | 219.6 +/- 38.4 |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 50 | 219.6 +/- 38.4 |
| fhenix | set_meter_owner | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | completion.handle.retry_backoff | 3 | 107.1 +/- 4.9 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 721.0 +/- 42.2 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 5410.7 +/- 67.9 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 1019.1 +/- 124.8 |
| fhenix | notarize | encrypt.sdk_total | 50 | 7151.0 +/- 145.7 |
| fhenix | notarize | transaction.prepare_and_sign | 50 | 238.4 +/- 53.4 |
| fhenix | notarize | barrier.wait | 50 | 496.2 +/- 217.2 |
| fhenix | notarize | transaction.raw_broadcast | 50 | 111.2 +/- 17.6 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 111.6 +/- 17.6 |
| fhenix | notarize | transaction.receipt.read_attempt | 747 | 58.1 +/- 14.6 |
| fhenix | notarize | transaction.wait_receipt | 50 | 7950.9 +/- 5803.7 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 87.1 +/- 31.9 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 125.4 +/- 116.6 |
| fhenix | notarize | completion.read_attempt | 50 | 204.3 +/- 32.8 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 204.3 +/- 32.8 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | completion.handle.retry_backoff | 8 | 134.2 +/- 42.8 |
| fhenix | add | transaction.prepare_and_sign | 50 | 117.7 +/- 30.0 |
| fhenix | add | barrier.wait | 50 | 392.6 +/- 49.4 |
| fhenix | add | transaction.raw_broadcast | 50 | 95.4 +/- 23.7 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 95.7 +/- 23.7 |
| fhenix | add | transaction.receipt.read_attempt | 1090 | 57.9 +/- 20.3 |
| fhenix | add | transaction.wait_receipt | 50 | 11836.7 +/- 4880.2 |
| fhenix | add | completion.handle.read_attempt | 50 | 110.1 +/- 23.5 |
| fhenix | add | completion.read_persisted_handle | 50 | 147.6 +/- 82.3 |
| fhenix | add | completion.read_attempt | 50 | 412.6 +/- 427.3 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 412.6 +/- 427.3 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 8 | 119.4 +/- 33.9 |
| fhenix | mul_scalar | transaction.prepare_and_sign | 50 | 125.6 +/- 36.8 |
| fhenix | mul_scalar | barrier.wait | 50 | 398.6 +/- 55.9 |
| fhenix | mul_scalar | transaction.raw_broadcast | 50 | 105.9 +/- 9.0 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 106.3 +/- 9.0 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 990 | 57.5 +/- 18.2 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 10696.9 +/- 4221.1 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 108.9 +/- 14.6 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 243.5 +/- 662.1 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 2272.7 +/- 704.9 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 2272.7 +/- 704.9 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | completion.handle.retry_backoff | 14 | 393.1 +/- 293.1 |
| fhenix | mean | transaction.prepare_and_sign | 50 | 115.5 +/- 19.5 |
| fhenix | mean | barrier.wait | 50 | 388.9 +/- 40.3 |
| fhenix | mean | transaction.raw_broadcast | 50 | 109.2 +/- 10.2 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 109.5 +/- 10.2 |
| fhenix | mean | transaction.receipt.read_attempt | 933 | 59.1 +/- 22.4 |
| fhenix | mean | transaction.wait_receipt | 50 | 10080.6 +/- 4644.5 |
| fhenix | mean | completion.handle.read_attempt | 50 | 107.8 +/- 16.5 |
| fhenix | mean | completion.read_persisted_handle | 50 | 121.9 +/- 44.9 |
| fhenix | mean | completion.read_attempt | 49 | 13126.4 +/- 963.3 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 49 | 13126.4 +/- 963.3 |
| fhenix | mean | completion.validate_plaintext | 49 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 3 | 101.2 +/- 1.1 |
| fhenix | max | transaction.prepare_and_sign | 50 | 168.3 +/- 25.9 |
| fhenix | max | barrier.wait | 50 | 395.8 +/- 36.2 |
| fhenix | max | transaction.raw_broadcast | 50 | 116.2 +/- 51.0 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 116.5 +/- 51.0 |
| fhenix | max | transaction.receipt.read_attempt | 1032 | 58.1 +/- 21.6 |
| fhenix | max | transaction.wait_receipt | 50 | 11181.6 +/- 5097.5 |
| fhenix | max | completion.handle.read_attempt | 50 | 112.0 +/- 23.6 |
| fhenix | max | completion.read_persisted_handle | 50 | 145.4 +/- 81.5 |
| fhenix | max | completion.read_attempt | 49 | 528.4 +/- 479.1 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 49 | 528.4 +/- 479.1 |
| fhenix | max | completion.validate_plaintext | 49 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 7 | 117.9 +/- 36.5 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
