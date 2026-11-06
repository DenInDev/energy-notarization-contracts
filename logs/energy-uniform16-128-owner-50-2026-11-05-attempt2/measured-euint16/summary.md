# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 50; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50/50 | 22086.0 +/- 0.0 | n/a | 9683.6 +/- 6874.0 | 9810.5 +/- 6867.4 | 126.8 +/- 37.0 | n/a |
| baseline | notarize | 50/50 | 31602.0 +/- 0.0 | n/a | 12799.1 +/- 7618.8 | 12930.3 +/- 7611.7 | 131.2 +/- 48.5 | n/a |
| baseline | add | 50/50 | 33356.0 +/- 0.0 | n/a | 8961.7 +/- 6380.7 | 9099.5 +/- 6427.1 | 137.8 +/- 72.9 | n/a |
| baseline | mul_scalar | 50/50 | 33634.0 +/- 0.0 | n/a | 7333.8 +/- 2638.1 | 7465.8 +/- 2636.2 | 132.0 +/- 52.7 | n/a |
| baseline | mean | 50/50 | 35542.0 +/- 0.0 | n/a | 9088.7 +/- 5496.5 | 9219.5 +/- 5492.2 | 130.8 +/- 47.9 | n/a |
| baseline | max | 50/50 | 35706.0 +/- 0.0 | n/a | 9227.3 +/- 5625.0 | 9356.5 +/- 5636.2 | 129.1 +/- 43.8 | n/a |
| zama | set_meter_owner | 50/50 | 472251.5 +/- 14.7 | 9808.6 +/- 2097.6 | 9688.1 +/- 6856.1 | 13649.1 +/- 7113.3 | 3961.1 +/- 927.8 | n/a |
| zama | notarize | 50/50 | 472121.4 +/- 12.3 | 9839.6 +/- 2122.6 | 12753.9 +/- 7657.9 | 16625.5 +/- 7537.0 | 3871.6 +/- 849.4 | n/a |
| zama | add | 50/50 | 327900.6 +/- 1.2 | n/a | 8928.2 +/- 6372.8 | 13107.4 +/- 6549.2 | 4179.1 +/- 804.3 | n/a |
| zama | mul_scalar | 50/50 | 323958.5 +/- 1.3 | n/a | 7300.1 +/- 2642.4 | 11616.1 +/- 2864.8 | 4315.9 +/- 1115.9 | n/a |
| zama | mean | 50/50 | 343705.8 +/- 0.8 | n/a | 9056.5 +/- 5494.2 | 13293.9 +/- 5612.3 | 4237.4 +/- 669.9 | n/a |
| zama | max | 50/50 | 329940.6 +/- 1.2 | n/a | 9257.4 +/- 5641.9 | 13114.0 +/- 5708.5 | 3856.6 +/- 849.6 | n/a |
| fhenix | set_meter_owner | 50/50 | 306317.4 +/- 6.8 | 9140.8 +/- 2128.4 | 9701.5 +/- 6918.4 | 10050.5 +/- 6909.1 | 349.0 +/- 129.0 | n/a |
| fhenix | notarize | 50/50 | 306184.7 +/- 8.1 | 8746.1 +/- 2130.1 | 12749.4 +/- 7626.8 | 13030.9 +/- 7627.6 | 281.5 +/- 52.1 | n/a |
| fhenix | add | 50/50 | 317943.0 +/- 0.0 | n/a | 8923.6 +/- 6391.8 | 9357.3 +/- 6393.0 | 433.8 +/- 354.1 | n/a |
| fhenix | mul_scalar | 50/50 | 342266.0 +/- 0.0 | n/a | 7308.0 +/- 2639.2 | 7658.4 +/- 2690.5 | 350.4 +/- 201.9 | n/a |
| fhenix | mean | 50/50 | 373456.0 +/- 0.0 | n/a | 9088.8 +/- 5494.8 | 9805.4 +/- 5578.6 | 716.6 +/- 430.4 | n/a |
| fhenix | max | 50/50 | 322134.0 +/- 0.0 | n/a | 9270.8 +/- 5627.0 | 9627.8 +/- 5696.9 | 357.1 +/- 248.7 | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | set_meter_owner | transaction.prepare_and_sign | 50 | 165.8 +/- 19.7 |
| baseline | set_meter_owner | barrier.wait | 50 | 10250.9 +/- 2063.0 |
| baseline | set_meter_owner | transaction.raw_broadcast | 50 | 115.6 +/- 43.6 |
| baseline | set_meter_owner | transaction.invoke_sign_and_submit | 50 | 115.9 +/- 43.6 |
| baseline | set_meter_owner | transaction.receipt.read_attempt | 876 | 66.7 +/- 44.8 |
| baseline | set_meter_owner | transaction.wait_receipt | 50 | 9567.7 +/- 6885.5 |
| baseline | set_meter_owner | completion.handle.read_attempt | 50 | 117.7 +/- 16.6 |
| baseline | set_meter_owner | completion.read_persisted_handle | 50 | 126.6 +/- 37.0 |
| baseline | set_meter_owner | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | set_meter_owner | completion.handle.retry_backoff | 2 | 105.3 +/- 2.5 |
| baseline | notarize | transaction.prepare_and_sign | 50 | 168.3 +/- 56.2 |
| baseline | notarize | barrier.wait | 50 | 10236.2 +/- 2083.4 |
| baseline | notarize | transaction.raw_broadcast | 50 | 108.7 +/- 8.7 |
| baseline | notarize | transaction.invoke_sign_and_submit | 50 | 109.0 +/- 8.7 |
| baseline | notarize | transaction.receipt.read_attempt | 1155 | 63.5 +/- 23.9 |
| baseline | notarize | transaction.wait_receipt | 50 | 12690.0 +/- 7619.9 |
| baseline | notarize | completion.handle.read_attempt | 50 | 117.3 +/- 30.1 |
| baseline | notarize | completion.read_persisted_handle | 50 | 131.1 +/- 48.5 |
| baseline | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | notarize | completion.handle.retry_backoff | 3 | 112.1 +/- 2.3 |
| baseline | add | transaction.prepare_and_sign | 50 | 162.4 +/- 53.6 |
| baseline | add | barrier.wait | 50 | 453.0 +/- 100.3 |
| baseline | add | transaction.raw_broadcast | 50 | 109.8 +/- 13.4 |
| baseline | add | transaction.invoke_sign_and_submit | 50 | 110.1 +/- 13.4 |
| baseline | add | transaction.receipt.read_attempt | 825 | 59.2 +/- 14.8 |
| baseline | add | transaction.wait_receipt | 50 | 8851.6 +/- 6380.3 |
| baseline | add | completion.handle.read_attempt | 50 | 122.5 +/- 53.8 |
| baseline | add | completion.read_persisted_handle | 50 | 137.7 +/- 72.9 |
| baseline | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | add | completion.handle.retry_backoff | 3 | 108.1 +/- 4.4 |
| baseline | mul_scalar | transaction.prepare_and_sign | 50 | 186.0 +/- 61.8 |
| baseline | mul_scalar | barrier.wait | 50 | 441.3 +/- 98.1 |
| baseline | mul_scalar | transaction.raw_broadcast | 50 | 107.7 +/- 18.7 |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 50 | 108.0 +/- 18.7 |
| baseline | mul_scalar | transaction.receipt.read_attempt | 680 | 60.8 +/- 24.1 |
| baseline | mul_scalar | transaction.wait_receipt | 50 | 7225.7 +/- 2637.3 |
| baseline | mul_scalar | completion.handle.retry_backoff | 5 | 106.8 +/- 2.7 |
| baseline | mul_scalar | completion.handle.read_attempt | 50 | 109.7 +/- 23.6 |
| baseline | mul_scalar | completion.read_persisted_handle | 50 | 131.9 +/- 52.7 |
| baseline | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | transaction.prepare_and_sign | 50 | 180.5 +/- 51.9 |
| baseline | mean | barrier.wait | 50 | 449.1 +/- 92.4 |
| baseline | mean | transaction.raw_broadcast | 50 | 112.5 +/- 21.9 |
| baseline | mean | transaction.invoke_sign_and_submit | 50 | 112.8 +/- 21.9 |
| baseline | mean | transaction.receipt.read_attempt | 833 | 61.3 +/- 33.7 |
| baseline | mean | transaction.wait_receipt | 50 | 8975.9 +/- 5495.0 |
| baseline | mean | completion.handle.read_attempt | 50 | 116.2 +/- 25.3 |
| baseline | mean | completion.read_persisted_handle | 50 | 130.7 +/- 47.9 |
| baseline | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | mean | completion.handle.retry_backoff | 3 | 110.7 +/- 3.1 |
| baseline | max | transaction.prepare_and_sign | 50 | 174.5 +/- 52.3 |
| baseline | max | barrier.wait | 50 | 441.4 +/- 98.6 |
| baseline | max | transaction.raw_broadcast | 50 | 107.0 +/- 11.3 |
| baseline | max | transaction.invoke_sign_and_submit | 50 | 107.2 +/- 11.4 |
| baseline | max | transaction.receipt.read_attempt | 847 | 60.4 +/- 23.1 |
| baseline | max | transaction.wait_receipt | 50 | 9120.1 +/- 5624.5 |
| baseline | max | completion.handle.read_attempt | 50 | 115.2 +/- 18.3 |
| baseline | max | completion.read_persisted_handle | 50 | 129.0 +/- 43.8 |
| baseline | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| baseline | max | completion.handle.retry_backoff | 3 | 105.0 +/- 4.1 |
| zama | set_meter_owner | encrypt.local_ciphertext_and_zkproof | 50 | 7601.2 +/- 2093.8 |
| zama | set_meter_owner | encrypt.remote_input_approval | 50 | 2207.4 +/- 20.9 |
| zama | set_meter_owner | transaction.prepare_and_sign | 50 | 243.5 +/- 68.9 |
| zama | set_meter_owner | barrier.wait | 50 | 365.0 +/- 50.6 |
| zama | set_meter_owner | transaction.raw_broadcast | 50 | 118.1 +/- 42.6 |
| zama | set_meter_owner | transaction.invoke_sign_and_submit | 50 | 118.5 +/- 42.6 |
| zama | set_meter_owner | transaction.receipt.read_attempt | 882 | 63.5 +/- 34.7 |
| zama | set_meter_owner | transaction.wait_receipt | 50 | 9569.6 +/- 6861.8 |
| zama | set_meter_owner | completion.handle.read_attempt | 50 | 111.0 +/- 29.2 |
| zama | set_meter_owner | completion.read_persisted_handle | 50 | 115.6 +/- 37.5 |
| zama | set_meter_owner | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | set_meter_owner | completion.read_attempt | 50 | 3603.5 +/- 1083.5 |
| zama | set_meter_owner | completion.sdk_user_decrypt | 50 | 3843.8 +/- 930.1 |
| zama | set_meter_owner | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | set_meter_owner | completion.retry_backoff | 10 | 1005.4 +/- 4.0 |
| zama | set_meter_owner | completion.handle.retry_backoff | 1 | 110.5 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 50 | 7632.1 +/- 2120.2 |
| zama | notarize | encrypt.remote_input_approval | 50 | 2207.5 +/- 15.6 |
| zama | notarize | transaction.prepare_and_sign | 50 | 198.5 +/- 37.6 |
| zama | notarize | barrier.wait | 50 | 366.8 +/- 49.3 |
| zama | notarize | transaction.raw_broadcast | 50 | 108.6 +/- 9.3 |
| zama | notarize | transaction.invoke_sign_and_submit | 50 | 109.0 +/- 9.3 |
| zama | notarize | transaction.receipt.read_attempt | 1157 | 60.7 +/- 22.0 |
| zama | notarize | transaction.wait_receipt | 50 | 12645.0 +/- 7656.5 |
| zama | notarize | completion.handle.read_attempt | 50 | 120.9 +/- 32.5 |
| zama | notarize | completion.read_persisted_handle | 50 | 131.3 +/- 46.6 |
| zama | notarize | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | notarize | completion.read_attempt | 50 | 3400.5 +/- 1038.4 |
| zama | notarize | completion.sdk_user_decrypt | 50 | 3738.8 +/- 859.6 |
| zama | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | notarize | completion.retry_backoff | 14 | 1008.2 +/- 4.1 |
| zama | notarize | completion.handle.retry_backoff | 2 | 107.9 +/- 3.8 |
| zama | add | transaction.prepare_and_sign | 50 | 142.7 +/- 30.8 |
| zama | add | barrier.wait | 50 | 473.0 +/- 100.2 |
| zama | add | transaction.raw_broadcast | 50 | 107.1 +/- 11.9 |
| zama | add | transaction.invoke_sign_and_submit | 50 | 107.4 +/- 11.9 |
| zama | add | transaction.receipt.read_attempt | 823 | 58.8 +/- 11.4 |
| zama | add | transaction.wait_receipt | 50 | 8820.9 +/- 6372.1 |
| zama | add | completion.handle.read_attempt | 50 | 118.0 +/- 28.8 |
| zama | add | completion.read_persisted_handle | 50 | 127.3 +/- 42.6 |
| zama | add | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | add | completion.read_attempt | 50 | 3809.3 +/- 1025.7 |
| zama | add | completion.sdk_user_decrypt | 50 | 4050.4 +/- 801.7 |
| zama | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | add | completion.retry_backoff | 10 | 1007.0 +/- 4.3 |
| zama | add | completion.handle.retry_backoff | 2 | 112.9 +/- 0.2 |
| zama | mul_scalar | transaction.prepare_and_sign | 50 | 150.9 +/- 34.5 |
| zama | mul_scalar | barrier.wait | 50 | 476.4 +/- 96.8 |
| zama | mul_scalar | transaction.raw_broadcast | 50 | 110.1 +/- 18.2 |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 50 | 110.4 +/- 18.2 |
| zama | mul_scalar | transaction.receipt.read_attempt | 677 | 60.7 +/- 31.0 |
| zama | mul_scalar | transaction.wait_receipt | 50 | 7189.7 +/- 2643.6 |
| zama | mul_scalar | completion.handle.read_attempt | 50 | 111.4 +/- 24.8 |
| zama | mul_scalar | completion.read_persisted_handle | 50 | 130.8 +/- 55.3 |
| zama | mul_scalar | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | mul_scalar | completion.retry_backoff | 12 | 1007.0 +/- 4.0 |
| zama | mul_scalar | completion.read_attempt | 50 | 3893.6 +/- 1335.0 |
| zama | mul_scalar | completion.sdk_user_decrypt | 50 | 4183.6 +/- 1116.5 |
| zama | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mul_scalar | completion.handle.retry_backoff | 4 | 108.3 +/- 3.3 |
| zama | mean | transaction.prepare_and_sign | 50 | 151.4 +/- 30.1 |
| zama | mean | barrier.wait | 50 | 478.2 +/- 85.6 |
| zama | mean | transaction.raw_broadcast | 50 | 112.9 +/- 20.9 |
| zama | mean | transaction.invoke_sign_and_submit | 50 | 113.2 +/- 20.9 |
| zama | mean | transaction.receipt.read_attempt | 830 | 61.4 +/- 24.7 |
| zama | mean | transaction.wait_receipt | 50 | 8943.2 +/- 5493.0 |
| zama | mean | completion.handle.read_attempt | 50 | 115.1 +/- 23.3 |
| zama | mean | completion.read_persisted_handle | 50 | 129.9 +/- 54.2 |
| zama | mean | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.4 |
| zama | mean | completion.retry_backoff | 16 | 1007.6 +/- 4.9 |
| zama | mean | completion.read_attempt | 50 | 3721.3 +/- 1057.9 |
| zama | mean | completion.sdk_user_decrypt | 50 | 4106.0 +/- 682.5 |
| zama | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | mean | completion.handle.retry_backoff | 3 | 112.8 +/- 2.8 |
| zama | max | transaction.prepare_and_sign | 50 | 147.6 +/- 29.8 |
| zama | max | barrier.wait | 50 | 468.2 +/- 98.9 |
| zama | max | transaction.raw_broadcast | 50 | 108.4 +/- 10.3 |
| zama | max | transaction.invoke_sign_and_submit | 50 | 108.7 +/- 10.3 |
| zama | max | transaction.receipt.read_attempt | 850 | 59.9 +/- 21.8 |
| zama | max | transaction.wait_receipt | 50 | 9148.7 +/- 5643.4 |
| zama | max | completion.handle.read_attempt | 50 | 113.6 +/- 17.8 |
| zama | max | completion.read_persisted_handle | 50 | 127.6 +/- 66.6 |
| zama | max | completion.local_keypair_and_authorization | 50 | 1.2 +/- 0.3 |
| zama | max | completion.retry_backoff | 15 | 1008.4 +/- 4.4 |
| zama | max | completion.read_attempt | 50 | 3366.9 +/- 1055.1 |
| zama | max | completion.sdk_user_decrypt | 50 | 3727.5 +/- 867.9 |
| zama | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| zama | max | completion.handle.retry_backoff | 3 | 143.1 +/- 53.1 |
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 50 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 50 | 842.5 +/- 181.9 |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 50 | 0.1 +/- 0.0 |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 50 | 7164.4 +/- 1956.5 |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 50 | 1133.5 +/- 78.4 |
| fhenix | set_meter_owner | encrypt.sdk_total | 50 | 9140.7 +/- 2128.4 |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 50 | 236.9 +/- 82.4 |
| fhenix | set_meter_owner | barrier.wait | 50 | 1039.1 +/- 125.2 |
| fhenix | set_meter_owner | transaction.raw_broadcast | 50 | 119.0 +/- 42.1 |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 50 | 119.4 +/- 42.1 |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 884 | 62.6 +/- 33.8 |
| fhenix | set_meter_owner | transaction.wait_receipt | 50 | 9582.1 +/- 6925.7 |
| fhenix | set_meter_owner | completion.handle.read_attempt | 50 | 117.2 +/- 41.9 |
| fhenix | set_meter_owner | completion.read_persisted_handle | 50 | 136.5 +/- 84.7 |
| fhenix | set_meter_owner | completion.read_attempt | 50 | 212.0 +/- 54.3 |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 50 | 212.0 +/- 54.3 |
| fhenix | set_meter_owner | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | set_meter_owner | completion.handle.retry_backoff | 4 | 108.7 +/- 3.2 |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 50 | 871.8 +/- 184.0 |
| fhenix | notarize | encrypt.sdk_observed.pack | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | encrypt.sdk_observed.prove | 50 | 7170.8 +/- 1958.2 |
| fhenix | notarize | encrypt.sdk_observed.verify | 50 | 703.4 +/- 62.0 |
| fhenix | notarize | encrypt.sdk_total | 50 | 8746.1 +/- 2130.1 |
| fhenix | notarize | transaction.prepare_and_sign | 50 | 225.1 +/- 25.1 |
| fhenix | notarize | barrier.wait | 50 | 1433.3 +/- 110.1 |
| fhenix | notarize | transaction.raw_broadcast | 50 | 107.9 +/- 12.2 |
| fhenix | notarize | transaction.invoke_sign_and_submit | 50 | 108.3 +/- 12.2 |
| fhenix | notarize | transaction.receipt.read_attempt | 1156 | 60.8 +/- 21.2 |
| fhenix | notarize | transaction.wait_receipt | 50 | 12641.1 +/- 7624.4 |
| fhenix | notarize | completion.handle.read_attempt | 50 | 116.7 +/- 26.5 |
| fhenix | notarize | completion.read_persisted_handle | 50 | 121.9 +/- 40.8 |
| fhenix | notarize | completion.read_attempt | 50 | 159.3 +/- 21.2 |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 50 | 159.3 +/- 21.2 |
| fhenix | notarize | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | notarize | completion.handle.retry_backoff | 1 | 101.8 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 50 | 167.1 +/- 62.4 |
| fhenix | add | barrier.wait | 50 | 448.6 +/- 98.3 |
| fhenix | add | transaction.raw_broadcast | 50 | 115.2 +/- 43.0 |
| fhenix | add | transaction.invoke_sign_and_submit | 50 | 115.5 +/- 43.0 |
| fhenix | add | transaction.receipt.read_attempt | 820 | 60.3 +/- 18.8 |
| fhenix | add | transaction.wait_receipt | 50 | 8808.1 +/- 6394.6 |
| fhenix | add | completion.handle.read_attempt | 50 | 117.7 +/- 34.2 |
| fhenix | add | completion.read_persisted_handle | 50 | 150.7 +/- 135.9 |
| fhenix | add | completion.read_attempt | 50 | 282.8 +/- 325.2 |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 50 | 282.8 +/- 325.2 |
| fhenix | add | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | add | completion.handle.retry_backoff | 6 | 173.2 +/- 121.3 |
| fhenix | mul_scalar | transaction.prepare_and_sign | 50 | 176.4 +/- 53.6 |
| fhenix | mul_scalar | barrier.wait | 50 | 450.6 +/- 96.8 |
| fhenix | mul_scalar | transaction.raw_broadcast | 50 | 105.8 +/- 9.0 |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 50 | 106.1 +/- 9.0 |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 679 | 60.1 +/- 20.9 |
| fhenix | mul_scalar | transaction.wait_receipt | 50 | 7201.9 +/- 2637.7 |
| fhenix | mul_scalar | completion.handle.read_attempt | 50 | 118.0 +/- 38.2 |
| fhenix | mul_scalar | completion.read_persisted_handle | 50 | 126.7 +/- 47.0 |
| fhenix | mul_scalar | completion.read_attempt | 50 | 223.5 +/- 196.8 |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 50 | 223.5 +/- 196.8 |
| fhenix | mul_scalar | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mul_scalar | completion.handle.retry_backoff | 2 | 110.4 +/- 2.1 |
| fhenix | mean | transaction.prepare_and_sign | 50 | 176.3 +/- 50.7 |
| fhenix | mean | barrier.wait | 50 | 453.3 +/- 87.0 |
| fhenix | mean | transaction.raw_broadcast | 50 | 110.6 +/- 16.5 |
| fhenix | mean | transaction.invoke_sign_and_submit | 50 | 110.9 +/- 16.5 |
| fhenix | mean | transaction.receipt.read_attempt | 834 | 60.6 +/- 28.7 |
| fhenix | mean | transaction.wait_receipt | 50 | 8977.8 +/- 5495.2 |
| fhenix | mean | completion.handle.read_attempt | 50 | 112.0 +/- 26.5 |
| fhenix | mean | completion.read_persisted_handle | 50 | 130.2 +/- 52.3 |
| fhenix | mean | completion.read_attempt | 50 | 586.2 +/- 437.6 |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 50 | 586.3 +/- 437.6 |
| fhenix | mean | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | mean | completion.handle.retry_backoff | 4 | 107.4 +/- 3.2 |
| fhenix | max | transaction.prepare_and_sign | 50 | 160.3 +/- 44.3 |
| fhenix | max | barrier.wait | 50 | 455.5 +/- 100.0 |
| fhenix | max | transaction.raw_broadcast | 50 | 111.0 +/- 22.6 |
| fhenix | max | transaction.invoke_sign_and_submit | 50 | 111.3 +/- 22.6 |
| fhenix | max | transaction.receipt.read_attempt | 850 | 60.6 +/- 22.2 |
| fhenix | max | transaction.wait_receipt | 50 | 9159.4 +/- 5621.6 |
| fhenix | max | completion.handle.read_attempt | 50 | 118.4 +/- 30.1 |
| fhenix | max | completion.read_persisted_handle | 50 | 128.4 +/- 47.6 |
| fhenix | max | completion.read_attempt | 50 | 228.4 +/- 248.0 |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 50 | 228.4 +/- 248.0 |
| fhenix | max | completion.validate_plaintext | 50 | 0.0 +/- 0.0 |
| fhenix | max | completion.handle.retry_backoff | 2 | 107.1 +/- 10.4 |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
