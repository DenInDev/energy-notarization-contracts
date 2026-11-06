# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-mixed16-64-independent-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 7/7 | 34185.0 +/- 0.0 | n/a | 11936.6 +/- 8642.9 | 12076.5 +/- 8651.4 | 139.9 +/- 18.7 | n/a |
| baseline | add | 7/7 | 36022.0 +/- 0.0 | n/a | 11537.8 +/- 10634.3 | 11642.1 +/- 10669.3 | 104.3 +/- 42.5 | n/a |
| baseline | mul_scalar | 6/6 | 36011.0 +/- 0.0 | n/a | 10385.3 +/- 10446.3 | 10482.3 +/- 10474.6 | 96.9 +/- 39.8 | n/a |
| baseline | mean | 6/6 | 37938.0 +/- 0.0 | n/a | 7338.9 +/- 6913.4 | 7426.1 +/- 6953.0 | 87.2 +/- 41.3 | n/a |
| baseline | max | 6/6 | 37945.0 +/- 0.0 | n/a | 12409.4 +/- 9015.2 | 12528.7 +/- 9039.5 | 119.3 +/- 33.1 | n/a |
| zama | notarize | 7/7 | 486172.6 +/- 18.0 | 11354.8 +/- 296.0 | 11951.1 +/- 8672.0 | 17096.0 +/- 8568.8 | 5144.9 +/- 852.4 | 2413.1 +/- 111.9 |
| zama | add | 6/7 | 343061.0 +/- 0.0 | n/a | 9500.5 +/- 10041.0 | 15674.0 +/- 9686.0 | 6173.5 +/- 3427.2 | 2382.8 +/- 78.3 |
| zama | mul_scalar | 6/6 | 339219.3 +/- 1.6 | n/a | 10413.1 +/- 10427.5 | 15522.5 +/- 10396.2 | 5109.3 +/- 839.7 | 2425.3 +/- 138.7 |
| zama | mean | 6/6 | 358387.3 +/- 1.6 | n/a | 7339.6 +/- 6958.4 | 12319.3 +/- 6128.6 | 4979.7 +/- 1630.8 | 2370.2 +/- 40.5 |
| zama | max | 6/6 | 344627.0 +/- 0.0 | n/a | 12469.2 +/- 9099.5 | 17977.9 +/- 9903.6 | 5508.6 +/- 2744.9 | 2355.1 +/- 36.7 |
| fhenix | notarize | 7/7 | 320490.9 +/- 6.4 | 10231.9 +/- 318.0 | 11864.4 +/- 8686.1 | 12140.6 +/- 8679.1 | 276.2 +/- 22.5 | 175.0 +/- 51.8 |
| fhenix | add | 7/7 | 343751.0 +/- 0.0 | n/a | 11509.8 +/- 10632.9 | 11819.3 +/- 10684.7 | 309.5 +/- 90.1 | 149.2 +/- 11.9 |
| fhenix | mul_scalar | 6/6 | 482917.0 +/- 0.0 | n/a | 10316.5 +/- 10440.5 | 10961.9 +/- 10335.2 | 645.4 +/- 218.9 | 153.9 +/- 22.0 |
| fhenix | mean | 6/6 | 406004.0 +/- 0.0 | n/a | 7287.8 +/- 6863.3 | 11856.4 +/- 6550.6 | 4568.6 +/- 768.7 | 156.2 +/- 14.1 |
| fhenix | max | 6/6 | 347930.0 +/- 0.0 | n/a | 12328.0 +/- 9185.5 | 12880.9 +/- 9072.5 | 552.9 +/- 408.2 | 172.4 +/- 53.0 |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | notarize | transaction.prepare_and_sign | 7 | 273.8 +/- 24.1 |
| baseline | notarize | barrier.wait | 7 | 11643.4 +/- 358.4 |
| baseline | notarize | transaction.raw_broadcast | 7 | 127.2 +/- 18.2 |
| baseline | notarize | transaction.invoke_sign_and_submit | 7 | 127.6 +/- 18.2 |
| baseline | notarize | transaction.receipt.read_attempt | 146 | 83.1 +/- 180.2 |
| baseline | notarize | transaction.wait_receipt | 7 | 11809.0 +/- 8641.1 |
| baseline | notarize | completion.handle.read_attempt | 7 | 139.7 +/- 18.6 |
| baseline | notarize | completion.read_persisted_handle | 7 | 139.8 +/- 18.6 |
| baseline | notarize | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| baseline | add | transaction.prepare_and_sign | 7 | 274.1 +/- 24.0 |
| baseline | add | barrier.wait | 7 | 328.7 +/- 101.0 |
| baseline | add | transaction.raw_broadcast | 7 | 128.9 +/- 13.9 |
| baseline | add | transaction.invoke_sign_and_submit | 7 | 129.2 +/- 13.9 |
| baseline | add | transaction.receipt.read_attempt | 143 | 76.1 +/- 117.9 |
| baseline | add | transaction.wait_receipt | 7 | 11408.5 +/- 10638.6 |
| baseline | add | completion.handle.read_attempt | 7 | 104.2 +/- 42.5 |
| baseline | add | completion.read_persisted_handle | 7 | 104.2 +/- 42.5 |
| baseline | add | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| baseline | mul_scalar | transaction.prepare_and_sign | 6 | 257.9 +/- 14.2 |
| baseline | mul_scalar | barrier.wait | 6 | 297.6 +/- 16.3 |
| baseline | mul_scalar | transaction.raw_broadcast | 6 | 123.2 +/- 6.3 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 6 | 123.5 +/- 6.3 |
| baseline | mul_scalar | transaction.receipt.read_attempt | 112 | 69.6 +/- 45.3 |
| baseline | mul_scalar | transaction.wait_receipt | 6 | 10261.8 +/- 10448.3 |
| baseline | mul_scalar | completion.handle.read_attempt | 6 | 96.8 +/- 39.8 |
| baseline | mul_scalar | completion.read_persisted_handle | 6 | 96.9 +/- 39.8 |
| baseline | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | mean | transaction.prepare_and_sign | 6 | 283.4 +/- 19.2 |
| baseline | mean | barrier.wait | 6 | 289.2 +/- 16.6 |
| baseline | mean | transaction.raw_broadcast | 6 | 136.7 +/- 12.2 |
| baseline | mean | transaction.invoke_sign_and_submit | 6 | 137.1 +/- 12.2 |
| baseline | mean | transaction.receipt.read_attempt | 81 | 64.0 +/- 22.9 |
| baseline | mean | transaction.wait_receipt | 6 | 7201.8 +/- 6908.1 |
| baseline | mean | completion.handle.read_attempt | 6 | 87.1 +/- 41.2 |
| baseline | mean | completion.read_persisted_handle | 6 | 87.1 +/- 41.2 |
| baseline | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| baseline | max | transaction.prepare_and_sign | 6 | 273.0 +/- 28.3 |
| baseline | max | barrier.wait | 6 | 303.6 +/- 25.7 |
| baseline | max | transaction.raw_broadcast | 6 | 138.0 +/- 15.1 |
| baseline | max | transaction.invoke_sign_and_submit | 6 | 138.4 +/- 15.1 |
| baseline | max | transaction.receipt.read_attempt | 134 | 64.6 +/- 19.6 |
| baseline | max | transaction.wait_receipt | 6 | 12271.0 +/- 9019.4 |
| baseline | max | completion.handle.read_attempt | 6 | 119.2 +/- 33.0 |
| baseline | max | completion.read_persisted_handle | 6 | 119.2 +/- 33.0 |
| baseline | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 7 | 9099.5 +/- 270.2 |
| zama | notarize | encrypt.remote_input_approval | 7 | 2255.4 +/- 94.4 |
| zama | notarize | transaction.prepare_and_sign | 7 | 243.8 +/- 37.8 |
| zama | notarize | barrier.wait | 7 | 318.6 +/- 89.6 |
| zama | notarize | transaction.raw_broadcast | 7 | 140.7 +/- 21.5 |
| zama | notarize | transaction.invoke_sign_and_submit | 7 | 141.2 +/- 21.4 |
| zama | notarize | transaction.receipt.read_attempt | 147 | 79.3 +/- 185.7 |
| zama | notarize | transaction.wait_receipt | 7 | 11809.9 +/- 8677.1 |
| zama | notarize | completion.handle.read_attempt | 7 | 145.7 +/- 19.4 |
| zama | notarize | completion.read_persisted_handle | 7 | 145.7 +/- 19.4 |
| zama | notarize | completion.local_keypair_and_authorization | 7 | 1.7 +/- 0.3 |
| zama | notarize | completion.read_attempt | 7 | 4997.1 +/- 836.8 |
| zama | notarize | completion.sdk_user_decrypt | 7 | 4997.1 +/- 836.8 |
| zama | notarize | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| zama | notarize | already_ready.local_keypair_and_authorization | 7 | 1.5 +/- 0.3 |
| zama | notarize | already_ready.read_attempt | 7 | 2411.3 +/- 111.8 |
| zama | notarize | already_ready.sdk_user_decrypt | 7 | 2411.4 +/- 111.8 |
| zama | notarize | already_ready.validate_plaintext | 7 | 0.0 +/- 0.0 |
| zama | add | transaction.prepare_and_sign | 7 | 198.7 +/- 18.9 |
| zama | add | barrier.wait | 7 | 404.2 +/- 105.8 |
| zama | add | transaction.raw_broadcast | 7 | 127.0 +/- 12.1 |
| zama | add | transaction.invoke_sign_and_submit | 7 | 127.4 +/- 12.1 |
| zama | add | transaction.receipt.read_attempt | 416 | 69.0 +/- 66.6 |
| zama | add | transaction.wait_receipt | 6 | 9373.7 +/- 10043.3 |
| zama | add | completion.handle.read_attempt | 6 | 102.6 +/- 32.8 |
| zama | add | completion.read_persisted_handle | 6 | 102.6 +/- 32.8 |
| zama | add | completion.local_keypair_and_authorization | 6 | 1.4 +/- 0.4 |
| zama | add | completion.read_attempt | 6 | 6069.2 +/- 3423.2 |
| zama | add | completion.sdk_user_decrypt | 6 | 6069.2 +/- 3423.2 |
| zama | add | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | add | already_ready.local_keypair_and_authorization | 6 | 1.7 +/- 0.3 |
| zama | add | already_ready.read_attempt | 6 | 2381.0 +/- 78.0 |
| zama | add | already_ready.sdk_user_decrypt | 6 | 2381.0 +/- 78.0 |
| zama | add | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mul_scalar | transaction.prepare_and_sign | 6 | 191.2 +/- 23.0 |
| zama | mul_scalar | barrier.wait | 6 | 366.8 +/- 21.7 |
| zama | mul_scalar | transaction.raw_broadcast | 6 | 129.0 +/- 7.7 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 6 | 129.4 +/- 7.7 |
| zama | mul_scalar | transaction.receipt.read_attempt | 113 | 65.7 +/- 41.3 |
| zama | mul_scalar | transaction.wait_receipt | 6 | 10283.7 +/- 10429.4 |
| zama | mul_scalar | completion.handle.read_attempt | 6 | 111.9 +/- 36.9 |
| zama | mul_scalar | completion.read_persisted_handle | 6 | 111.9 +/- 36.9 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 6 | 1.4 +/- 0.4 |
| zama | mul_scalar | completion.read_attempt | 6 | 4995.7 +/- 827.1 |
| zama | mul_scalar | completion.sdk_user_decrypt | 6 | 4995.7 +/- 827.1 |
| zama | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mul_scalar | already_ready.local_keypair_and_authorization | 6 | 1.6 +/- 0.3 |
| zama | mul_scalar | already_ready.read_attempt | 6 | 2423.5 +/- 138.7 |
| zama | mul_scalar | already_ready.sdk_user_decrypt | 6 | 2423.5 +/- 138.7 |
| zama | mul_scalar | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mean | transaction.prepare_and_sign | 6 | 196.4 +/- 20.0 |
| zama | mean | barrier.wait | 6 | 376.2 +/- 27.2 |
| zama | mean | transaction.raw_broadcast | 6 | 135.0 +/- 20.7 |
| zama | mean | transaction.invoke_sign_and_submit | 6 | 135.3 +/- 20.8 |
| zama | mean | transaction.receipt.read_attempt | 81 | 63.3 +/- 39.9 |
| zama | mean | transaction.wait_receipt | 6 | 7204.3 +/- 6941.9 |
| zama | mean | completion.handle.read_attempt | 6 | 150.3 +/- 130.1 |
| zama | mean | completion.read_persisted_handle | 6 | 150.3 +/- 130.1 |
| zama | mean | completion.local_keypair_and_authorization | 6 | 1.3 +/- 0.2 |
| zama | mean | completion.read_attempt | 6 | 4620.6 +/- 1305.7 |
| zama | mean | completion.sdk_user_decrypt | 6 | 4827.8 +/- 1717.6 |
| zama | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mean | already_ready.local_keypair_and_authorization | 6 | 1.5 +/- 0.2 |
| zama | mean | already_ready.read_attempt | 6 | 2368.6 +/- 40.6 |
| zama | mean | already_ready.sdk_user_decrypt | 6 | 2368.6 +/- 40.6 |
| zama | mean | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | mean | completion.retry_backoff | 1 | 1013.2 +/- n/a |
| zama | max | transaction.prepare_and_sign | 6 | 203.8 +/- 44.2 |
| zama | max | barrier.wait | 6 | 372.8 +/- 47.7 |
| zama | max | transaction.raw_broadcast | 6 | 123.9 +/- 9.2 |
| zama | max | transaction.invoke_sign_and_submit | 6 | 124.2 +/- 9.2 |
| zama | max | transaction.receipt.read_attempt | 134 | 67.6 +/- 34.8 |
| zama | max | transaction.wait_receipt | 6 | 12345.0 +/- 9097.1 |
| zama | max | completion.handle.read_attempt | 6 | 147.8 +/- 70.4 |
| zama | max | completion.read_persisted_handle | 6 | 147.8 +/- 70.4 |
| zama | max | completion.local_keypair_and_authorization | 6 | 1.8 +/- 0.2 |
| zama | max | completion.read_attempt | 6 | 5358.7 +/- 2770.5 |
| zama | max | completion.sdk_user_decrypt | 6 | 5358.7 +/- 2770.5 |
| zama | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| zama | max | already_ready.local_keypair_and_authorization | 6 | 1.8 +/- 0.2 |
| zama | max | already_ready.read_attempt | 6 | 2353.0 +/- 36.7 |
| zama | max | already_ready.sdk_user_decrypt | 6 | 2353.1 +/- 36.7 |
| zama | max | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 7 | 0.1 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 7 | 1033.2 +/- 64.5 |
| fhenix | notarize | encrypt.sdk_observed.pack | 7 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 7 | 8545.0 +/- 268.2 |
| fhenix | notarize | encrypt.sdk_observed.verify | 7 | 653.4 +/- 38.8 |
| fhenix | notarize | encrypt.sdk_total | 7 | 10231.9 +/- 318.0 |
| fhenix | notarize | transaction.prepare_and_sign | 7 | 267.5 +/- 11.6 |
| fhenix | notarize | barrier.wait | 7 | 1417.7 +/- 139.3 |
| fhenix | notarize | transaction.raw_broadcast | 7 | 169.0 +/- 112.3 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 7 | 169.5 +/- 112.3 |
| fhenix | notarize | transaction.receipt.read_attempt | 146 | 77.9 +/- 181.5 |
| fhenix | notarize | transaction.wait_receipt | 7 | 11694.9 +/- 8685.3 |
| fhenix | notarize | completion.handle.read_attempt | 7 | 127.8 +/- 7.7 |
| fhenix | notarize | completion.read_persisted_handle | 7 | 127.8 +/- 7.7 |
| fhenix | notarize | completion.read_attempt | 7 | 148.1 +/- 15.0 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 7 | 148.1 +/- 15.0 |
| fhenix | notarize | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| fhenix | notarize | already_ready.read_attempt | 7 | 174.9 +/- 51.8 |
| fhenix | notarize | already_ready.sdk_sealoutput_and_unseal | 7 | 174.9 +/- 51.8 |
| fhenix | notarize | already_ready.validate_plaintext | 7 | 0.0 +/- 0.0 |
| fhenix | add | transaction.prepare_and_sign | 7 | 313.0 +/- 121.9 |
| fhenix | add | barrier.wait | 7 | 289.9 +/- 17.6 |
| fhenix | add | transaction.raw_broadcast | 7 | 126.8 +/- 14.7 |
| fhenix | add | transaction.invoke_sign_and_submit | 7 | 127.2 +/- 14.8 |
| fhenix | add | transaction.receipt.read_attempt | 142 | 79.0 +/- 102.5 |
| fhenix | add | transaction.wait_receipt | 7 | 11382.6 +/- 10632.4 |
| fhenix | add | completion.handle.read_attempt | 7 | 106.0 +/- 44.7 |
| fhenix | add | completion.read_persisted_handle | 7 | 106.0 +/- 44.7 |
| fhenix | add | completion.read_attempt | 7 | 203.2 +/- 71.3 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 7 | 203.2 +/- 71.3 |
| fhenix | add | completion.validate_plaintext | 7 | 0.0 +/- 0.0 |
| fhenix | add | already_ready.read_attempt | 7 | 149.1 +/- 11.9 |
| fhenix | add | already_ready.sdk_sealoutput_and_unseal | 7 | 149.1 +/- 11.9 |
| fhenix | add | already_ready.validate_plaintext | 7 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | transaction.prepare_and_sign | 6 | 260.4 +/- 24.4 |
| fhenix | mul_scalar | barrier.wait | 6 | 295.2 +/- 16.0 |
| fhenix | mul_scalar | transaction.raw_broadcast | 6 | 123.7 +/- 6.9 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 6 | 124.1 +/- 6.9 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 112 | 66.6 +/- 46.6 |
| fhenix | mul_scalar | transaction.wait_receipt | 6 | 10192.4 +/- 10440.5 |
| fhenix | mul_scalar | completion.handle.read_attempt | 6 | 99.7 +/- 49.8 |
| fhenix | mul_scalar | completion.read_persisted_handle | 6 | 99.7 +/- 49.8 |
| fhenix | mul_scalar | completion.read_attempt | 6 | 545.4 +/- 230.7 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 6 | 545.4 +/- 230.7 |
| fhenix | mul_scalar | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | already_ready.read_attempt | 6 | 153.8 +/- 22.0 |
| fhenix | mul_scalar | already_ready.sdk_sealoutput_and_unseal | 6 | 153.8 +/- 22.0 |
| fhenix | mul_scalar | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mean | transaction.prepare_and_sign | 6 | 268.1 +/- 30.7 |
| fhenix | mean | barrier.wait | 6 | 304.5 +/- 13.7 |
| fhenix | mean | transaction.raw_broadcast | 6 | 132.5 +/- 16.7 |
| fhenix | mean | transaction.invoke_sign_and_submit | 6 | 132.8 +/- 16.7 |
| fhenix | mean | transaction.receipt.read_attempt | 81 | 59.2 +/- 12.2 |
| fhenix | mean | transaction.wait_receipt | 6 | 7154.9 +/- 6857.7 |
| fhenix | mean | completion.handle.read_attempt | 6 | 76.0 +/- 41.9 |
| fhenix | mean | completion.read_persisted_handle | 6 | 267.5 +/- 459.2 |
| fhenix | mean | completion.read_attempt | 6 | 4300.9 +/- 797.3 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 6 | 4300.9 +/- 797.3 |
| fhenix | mean | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mean | already_ready.read_attempt | 6 | 156.2 +/- 14.1 |
| fhenix | mean | already_ready.sdk_sealoutput_and_unseal | 6 | 156.2 +/- 14.1 |
| fhenix | mean | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 1 | 1006.7 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 6 | 232.7 +/- 46.6 |
| fhenix | max | barrier.wait | 6 | 344.0 +/- 59.7 |
| fhenix | max | transaction.raw_broadcast | 6 | 140.7 +/- 35.4 |
| fhenix | max | transaction.invoke_sign_and_submit | 6 | 141.0 +/- 35.4 |
| fhenix | max | transaction.receipt.read_attempt | 132 | 69.4 +/- 39.9 |
| fhenix | max | transaction.wait_receipt | 6 | 12187.0 +/- 9200.4 |
| fhenix | max | completion.handle.read_attempt | 6 | 137.4 +/- 27.6 |
| fhenix | max | completion.read_persisted_handle | 6 | 137.4 +/- 27.6 |
| fhenix | max | completion.read_attempt | 6 | 415.2 +/- 411.6 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 6 | 415.2 +/- 411.6 |
| fhenix | max | completion.validate_plaintext | 6 | 0.0 +/- 0.0 |
| fhenix | max | already_ready.read_attempt | 6 | 172.4 +/- 53.0 |
| fhenix | max | already_ready.sdk_sealoutput_and_unseal | 6 | 172.4 +/- 53.0 |
| fhenix | max | already_ready.validate_plaintext | 6 | 0.0 +/- 0.0 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
