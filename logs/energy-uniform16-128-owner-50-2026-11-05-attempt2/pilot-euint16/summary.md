# Sepolia observable operational performance benchmark

Times in milliseconds; mean +/- sample standard deviation.
One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.
Measured rounds requested: 1; schedule seed: energy-uniform16-128-paired-v1; platforms: baseline, zama, fhenix.
Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.
Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.

| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 1/1 | 22086.0 +/- n/a | n/a | 3616.3 +/- n/a | 3737.1 +/- n/a | 120.8 +/- n/a | n/a |
| baseline | notarize | 1/1 | 31602.0 +/- n/a | n/a | 4806.7 +/- n/a | 4940.3 +/- n/a | 133.6 +/- n/a | n/a |
| baseline | add | 1/1 | 33356.0 +/- n/a | n/a | 8059.1 +/- n/a | 8177.8 +/- n/a | 118.7 +/- n/a | n/a |
| baseline | mul_scalar | 1/1 | 33634.0 +/- n/a | n/a | 30428.2 +/- n/a | 30553.1 +/- n/a | 124.8 +/- n/a | n/a |
| baseline | mean | 1/1 | 35542.0 +/- n/a | n/a | 5822.5 +/- n/a | 5955.6 +/- n/a | 133.0 +/- n/a | n/a |
| baseline | max | 1/1 | 35706.0 +/- n/a | n/a | 5753.3 +/- n/a | 5869.9 +/- n/a | 116.7 +/- n/a | n/a |
| zama | set_meter_owner | 1/1 | 472240.0 +/- n/a | 12455.3 +/- n/a | 3576.2 +/- n/a | 8185.0 +/- n/a | 4608.8 +/- n/a | n/a |
| zama | notarize | 1/1 | 472132.0 +/- n/a | 12492.9 +/- n/a | 4743.6 +/- n/a | 8450.2 +/- n/a | 3706.6 +/- n/a | n/a |
| zama | add | 1/1 | 327897.0 +/- n/a | n/a | 8192.7 +/- n/a | 13011.1 +/- n/a | 4818.4 +/- n/a | n/a |
| zama | mul_scalar | 1/1 | 323959.0 +/- n/a | n/a | 30780.2 +/- n/a | 35608.1 +/- n/a | 4827.9 +/- n/a | n/a |
| zama | mean | 1/1 | 343706.0 +/- n/a | n/a | 5817.9 +/- n/a | 10614.4 +/- n/a | 4796.5 +/- n/a | n/a |
| zama | max | 1/1 | 329941.0 +/- n/a | n/a | 5843.8 +/- n/a | 9543.8 +/- n/a | 3700.0 +/- n/a | n/a |
| fhenix | set_meter_owner | 1/1 | 306310.0 +/- n/a | 11920.9 +/- n/a | 3589.4 +/- n/a | 3859.8 +/- n/a | 270.4 +/- n/a | n/a |
| fhenix | notarize | 1/1 | 306190.0 +/- n/a | 11429.3 +/- n/a | 4847.4 +/- n/a | 5143.9 +/- n/a | 296.4 +/- n/a | n/a |
| fhenix | add | 1/1 | 317943.0 +/- n/a | n/a | 7938.7 +/- n/a | 8612.8 +/- n/a | 674.1 +/- n/a | n/a |
| fhenix | mul_scalar | 1/1 | 342266.0 +/- n/a | n/a | 30782.8 +/- n/a | 31099.5 +/- n/a | 316.8 +/- n/a | n/a |
| fhenix | mean | 1/1 | 373456.0 +/- n/a | n/a | 5857.0 +/- n/a | 6310.1 +/- n/a | 453.1 +/- n/a | n/a |
| fhenix | max | 1/1 | 322134.0 +/- n/a | n/a | 5837.8 +/- n/a | 6298.7 +/- n/a | 460.9 +/- n/a | n/a |

## SDK stages

Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.
SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.

| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |
|---|---|---|---:|---:|
| baseline | set_meter_owner | transaction.prepare_and_sign | 1 | 155.2 +/- n/a |
| baseline | set_meter_owner | barrier.wait | 1 | 12793.7 +/- n/a |
| baseline | set_meter_owner | transaction.raw_broadcast | 1 | 103.5 +/- n/a |
| baseline | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 103.9 +/- n/a |
| baseline | set_meter_owner | transaction.receipt.read_attempt | 7 | 68.6 +/- 18.9 |
| baseline | set_meter_owner | transaction.wait_receipt | 1 | 3512.4 +/- n/a |
| baseline | set_meter_owner | completion.handle.read_attempt | 1 | 120.5 +/- n/a |
| baseline | set_meter_owner | completion.read_persisted_handle | 1 | 120.5 +/- n/a |
| baseline | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | notarize | transaction.prepare_and_sign | 1 | 219.1 +/- n/a |
| baseline | notarize | barrier.wait | 1 | 12787.0 +/- n/a |
| baseline | notarize | transaction.raw_broadcast | 1 | 102.2 +/- n/a |
| baseline | notarize | transaction.invoke_sign_and_submit | 1 | 102.5 +/- n/a |
| baseline | notarize | transaction.receipt.read_attempt | 9 | 72.1 +/- 22.5 |
| baseline | notarize | transaction.wait_receipt | 1 | 4704.2 +/- n/a |
| baseline | notarize | completion.handle.read_attempt | 1 | 133.5 +/- n/a |
| baseline | notarize | completion.read_persisted_handle | 1 | 133.5 +/- n/a |
| baseline | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | add | transaction.prepare_and_sign | 1 | 117.0 +/- n/a |
| baseline | add | barrier.wait | 1 | 284.8 +/- n/a |
| baseline | add | transaction.raw_broadcast | 1 | 573.9 +/- n/a |
| baseline | add | transaction.invoke_sign_and_submit | 1 | 574.3 +/- n/a |
| baseline | add | transaction.receipt.read_attempt | 14 | 63.0 +/- 4.8 |
| baseline | add | transaction.wait_receipt | 1 | 7484.8 +/- n/a |
| baseline | add | completion.handle.read_attempt | 1 | 118.6 +/- n/a |
| baseline | add | completion.read_persisted_handle | 1 | 118.6 +/- n/a |
| baseline | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mul_scalar | transaction.prepare_and_sign | 1 | 212.0 +/- n/a |
| baseline | mul_scalar | barrier.wait | 1 | 285.8 +/- n/a |
| baseline | mul_scalar | transaction.raw_broadcast | 1 | 102.1 +/- n/a |
| baseline | mul_scalar | transaction.invoke_sign_and_submit | 1 | 102.5 +/- n/a |
| baseline | mul_scalar | transaction.receipt.read_attempt | 54 | 63.9 +/- 20.2 |
| baseline | mul_scalar | transaction.wait_receipt | 1 | 30325.6 +/- n/a |
| baseline | mul_scalar | completion.handle.read_attempt | 1 | 124.6 +/- n/a |
| baseline | mul_scalar | completion.read_persisted_handle | 1 | 124.6 +/- n/a |
| baseline | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | mean | transaction.prepare_and_sign | 1 | 232.5 +/- n/a |
| baseline | mean | barrier.wait | 1 | 312.3 +/- n/a |
| baseline | mean | transaction.raw_broadcast | 1 | 99.1 +/- n/a |
| baseline | mean | transaction.invoke_sign_and_submit | 1 | 99.4 +/- n/a |
| baseline | mean | transaction.receipt.read_attempt | 11 | 61.1 +/- 9.8 |
| baseline | mean | transaction.wait_receipt | 1 | 5723.1 +/- n/a |
| baseline | mean | completion.handle.read_attempt | 1 | 132.9 +/- n/a |
| baseline | mean | completion.read_persisted_handle | 1 | 132.9 +/- n/a |
| baseline | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| baseline | max | transaction.prepare_and_sign | 1 | 204.1 +/- n/a |
| baseline | max | barrier.wait | 1 | 297.2 +/- n/a |
| baseline | max | transaction.raw_broadcast | 1 | 112.7 +/- n/a |
| baseline | max | transaction.invoke_sign_and_submit | 1 | 113.0 +/- n/a |
| baseline | max | transaction.receipt.read_attempt | 11 | 50.8 +/- 3.6 |
| baseline | max | transaction.wait_receipt | 1 | 5640.2 +/- n/a |
| baseline | max | completion.handle.read_attempt | 1 | 116.5 +/- n/a |
| baseline | max | completion.read_persisted_handle | 1 | 116.6 +/- n/a |
| baseline | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | set_meter_owner | encrypt.local_ciphertext_and_zkproof | 1 | 10243.5 +/- n/a |
| zama | set_meter_owner | encrypt.remote_input_approval | 1 | 2211.8 +/- n/a |
| zama | set_meter_owner | transaction.prepare_and_sign | 1 | 219.6 +/- n/a |
| zama | set_meter_owner | barrier.wait | 1 | 274.8 +/- n/a |
| zama | set_meter_owner | transaction.raw_broadcast | 1 | 103.2 +/- n/a |
| zama | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 103.8 +/- n/a |
| zama | set_meter_owner | transaction.receipt.read_attempt | 7 | 61.5 +/- 3.6 |
| zama | set_meter_owner | transaction.wait_receipt | 1 | 3472.4 +/- n/a |
| zama | set_meter_owner | completion.handle.read_attempt | 1 | 61.4 +/- n/a |
| zama | set_meter_owner | completion.read_persisted_handle | 1 | 61.4 +/- n/a |
| zama | set_meter_owner | completion.local_keypair_and_authorization | 1 | 1.9 +/- n/a |
| zama | set_meter_owner | completion.read_attempt | 1 | 4544.9 +/- n/a |
| zama | set_meter_owner | completion.sdk_user_decrypt | 1 | 4545.0 +/- n/a |
| zama | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | notarize | encrypt.local_ciphertext_and_zkproof | 1 | 10254.6 +/- n/a |
| zama | notarize | encrypt.remote_input_approval | 1 | 2238.3 +/- n/a |
| zama | notarize | transaction.prepare_and_sign | 1 | 235.1 +/- n/a |
| zama | notarize | barrier.wait | 1 | 278.2 +/- n/a |
| zama | notarize | transaction.raw_broadcast | 1 | 105.7 +/- n/a |
| zama | notarize | transaction.invoke_sign_and_submit | 1 | 106.1 +/- n/a |
| zama | notarize | transaction.receipt.read_attempt | 9 | 63.8 +/- 9.2 |
| zama | notarize | transaction.wait_receipt | 1 | 4637.4 +/- n/a |
| zama | notarize | completion.handle.read_attempt | 1 | 125.0 +/- n/a |
| zama | notarize | completion.read_persisted_handle | 1 | 125.0 +/- n/a |
| zama | notarize | completion.local_keypair_and_authorization | 1 | 1.7 +/- n/a |
| zama | notarize | completion.retry_backoff | 1 | 1001.9 +/- n/a |
| zama | notarize | completion.read_attempt | 1 | 2388.4 +/- n/a |
| zama | notarize | completion.sdk_user_decrypt | 1 | 3579.5 +/- n/a |
| zama | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | add | transaction.prepare_and_sign | 1 | 118.8 +/- n/a |
| zama | add | barrier.wait | 1 | 282.7 +/- n/a |
| zama | add | transaction.raw_broadcast | 1 | 621.9 +/- n/a |
| zama | add | transaction.invoke_sign_and_submit | 1 | 622.3 +/- n/a |
| zama | add | transaction.receipt.read_attempt | 14 | 68.9 +/- 28.5 |
| zama | add | transaction.wait_receipt | 1 | 7570.4 +/- n/a |
| zama | add | completion.handle.read_attempt | 1 | 97.0 +/- n/a |
| zama | add | completion.read_persisted_handle | 1 | 97.0 +/- n/a |
| zama | add | completion.local_keypair_and_authorization | 1 | 1.4 +/- n/a |
| zama | add | completion.read_attempt | 1 | 4719.7 +/- n/a |
| zama | add | completion.sdk_user_decrypt | 1 | 4719.7 +/- n/a |
| zama | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mul_scalar | transaction.prepare_and_sign | 1 | 161.2 +/- n/a |
| zama | mul_scalar | barrier.wait | 1 | 336.6 +/- n/a |
| zama | mul_scalar | transaction.raw_broadcast | 1 | 117.4 +/- n/a |
| zama | mul_scalar | transaction.invoke_sign_and_submit | 1 | 117.8 +/- n/a |
| zama | mul_scalar | transaction.receipt.read_attempt | 55 | 58.6 +/- 6.5 |
| zama | mul_scalar | transaction.wait_receipt | 1 | 30662.4 +/- n/a |
| zama | mul_scalar | completion.handle.read_attempt | 1 | 121.3 +/- n/a |
| zama | mul_scalar | completion.read_persisted_handle | 1 | 121.3 +/- n/a |
| zama | mul_scalar | completion.local_keypair_and_authorization | 1 | 1.6 +/- n/a |
| zama | mul_scalar | completion.read_attempt | 1 | 4704.6 +/- n/a |
| zama | mul_scalar | completion.sdk_user_decrypt | 1 | 4704.6 +/- n/a |
| zama | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | mean | transaction.prepare_and_sign | 1 | 152.4 +/- n/a |
| zama | mean | barrier.wait | 1 | 392.4 +/- n/a |
| zama | mean | transaction.raw_broadcast | 1 | 112.2 +/- n/a |
| zama | mean | transaction.invoke_sign_and_submit | 1 | 112.5 +/- n/a |
| zama | mean | transaction.receipt.read_attempt | 11 | 57.2 +/- 6.7 |
| zama | mean | transaction.wait_receipt | 1 | 5705.4 +/- n/a |
| zama | mean | completion.handle.read_attempt | 1 | 137.5 +/- n/a |
| zama | mean | completion.read_persisted_handle | 1 | 137.5 +/- n/a |
| zama | mean | completion.local_keypair_and_authorization | 1 | 2.0 +/- n/a |
| zama | mean | completion.read_attempt | 1 | 4656.7 +/- n/a |
| zama | mean | completion.sdk_user_decrypt | 1 | 4656.7 +/- n/a |
| zama | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| zama | max | transaction.prepare_and_sign | 1 | 177.9 +/- n/a |
| zama | max | barrier.wait | 1 | 323.3 +/- n/a |
| zama | max | transaction.raw_broadcast | 1 | 106.6 +/- n/a |
| zama | max | transaction.invoke_sign_and_submit | 1 | 106.9 +/- n/a |
| zama | max | transaction.receipt.read_attempt | 11 | 61.6 +/- 6.0 |
| zama | max | transaction.wait_receipt | 1 | 5736.9 +/- n/a |
| zama | max | completion.handle.read_attempt | 1 | 106.3 +/- n/a |
| zama | max | completion.read_persisted_handle | 1 | 106.3 +/- n/a |
| zama | max | completion.local_keypair_and_authorization | 1 | 1.7 +/- n/a |
| zama | max | completion.retry_backoff | 1 | 1012.5 +/- n/a |
| zama | max | completion.read_attempt | 1 | 2387.1 +/- n/a |
| zama | max | completion.sdk_user_decrypt | 1 | 3591.7 +/- n/a |
| zama | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.fetchKeys | 1 | 1139.0 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.pack | 1 | 0.3 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.prove | 1 | 9615.4 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_observed.verify | 1 | 1165.7 +/- n/a |
| fhenix | set_meter_owner | encrypt.sdk_total | 1 | 11920.8 +/- n/a |
| fhenix | set_meter_owner | transaction.prepare_and_sign | 1 | 234.3 +/- n/a |
| fhenix | set_meter_owner | barrier.wait | 1 | 794.3 +/- n/a |
| fhenix | set_meter_owner | transaction.raw_broadcast | 1 | 101.2 +/- n/a |
| fhenix | set_meter_owner | transaction.invoke_sign_and_submit | 1 | 101.8 +/- n/a |
| fhenix | set_meter_owner | transaction.receipt.read_attempt | 7 | 62.8 +/- 6.6 |
| fhenix | set_meter_owner | transaction.wait_receipt | 1 | 3487.6 +/- n/a |
| fhenix | set_meter_owner | completion.handle.read_attempt | 1 | 54.7 +/- n/a |
| fhenix | set_meter_owner | completion.read_persisted_handle | 1 | 54.7 +/- n/a |
| fhenix | set_meter_owner | completion.read_attempt | 1 | 215.2 +/- n/a |
| fhenix | set_meter_owner | completion.sdk_sealoutput_and_unseal | 1 | 215.2 +/- n/a |
| fhenix | set_meter_owner | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.initTfhe | 1 | 0.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.fetchKeys | 1 | 1113.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.pack | 1 | 0.0 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.prove | 1 | 9606.1 +/- n/a |
| fhenix | notarize | encrypt.sdk_observed.verify | 1 | 709.8 +/- n/a |
| fhenix | notarize | encrypt.sdk_total | 1 | 11429.3 +/- n/a |
| fhenix | notarize | transaction.prepare_and_sign | 1 | 214.9 +/- n/a |
| fhenix | notarize | barrier.wait | 1 | 1362.0 +/- n/a |
| fhenix | notarize | transaction.raw_broadcast | 1 | 105.7 +/- n/a |
| fhenix | notarize | transaction.invoke_sign_and_submit | 1 | 106.1 +/- n/a |
| fhenix | notarize | transaction.receipt.read_attempt | 9 | 75.7 +/- 51.5 |
| fhenix | notarize | transaction.wait_receipt | 1 | 4741.3 +/- n/a |
| fhenix | notarize | completion.handle.read_attempt | 1 | 130.8 +/- n/a |
| fhenix | notarize | completion.read_persisted_handle | 1 | 130.8 +/- n/a |
| fhenix | notarize | completion.read_attempt | 1 | 165.3 +/- n/a |
| fhenix | notarize | completion.sdk_sealoutput_and_unseal | 1 | 165.3 +/- n/a |
| fhenix | notarize | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | add | transaction.prepare_and_sign | 1 | 115.5 +/- n/a |
| fhenix | add | barrier.wait | 1 | 286.0 +/- n/a |
| fhenix | add | transaction.raw_broadcast | 1 | 105.1 +/- n/a |
| fhenix | add | transaction.invoke_sign_and_submit | 1 | 105.7 +/- n/a |
| fhenix | add | transaction.receipt.read_attempt | 14 | 86.4 +/- 111.8 |
| fhenix | add | transaction.wait_receipt | 1 | 7833.0 +/- n/a |
| fhenix | add | completion.handle.read_attempt | 1 | 116.8 +/- n/a |
| fhenix | add | completion.read_persisted_handle | 1 | 116.8 +/- n/a |
| fhenix | add | completion.read_attempt | 1 | 557.1 +/- n/a |
| fhenix | add | completion.sdk_sealoutput_and_unseal | 1 | 557.1 +/- n/a |
| fhenix | add | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mul_scalar | transaction.prepare_and_sign | 1 | 221.2 +/- n/a |
| fhenix | mul_scalar | barrier.wait | 1 | 276.6 +/- n/a |
| fhenix | mul_scalar | transaction.raw_broadcast | 1 | 109.2 +/- n/a |
| fhenix | mul_scalar | transaction.invoke_sign_and_submit | 1 | 109.6 +/- n/a |
| fhenix | mul_scalar | transaction.receipt.read_attempt | 55 | 57.9 +/- 6.5 |
| fhenix | mul_scalar | transaction.wait_receipt | 1 | 30673.1 +/- n/a |
| fhenix | mul_scalar | completion.handle.read_attempt | 1 | 146.7 +/- n/a |
| fhenix | mul_scalar | completion.read_persisted_handle | 1 | 146.7 +/- n/a |
| fhenix | mul_scalar | completion.read_attempt | 1 | 169.8 +/- n/a |
| fhenix | mul_scalar | completion.sdk_sealoutput_and_unseal | 1 | 169.8 +/- n/a |
| fhenix | mul_scalar | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | mean | transaction.prepare_and_sign | 1 | 270.2 +/- n/a |
| fhenix | mean | barrier.wait | 1 | 274.6 +/- n/a |
| fhenix | mean | transaction.raw_broadcast | 1 | 109.5 +/- n/a |
| fhenix | mean | transaction.invoke_sign_and_submit | 1 | 109.9 +/- n/a |
| fhenix | mean | transaction.receipt.read_attempt | 11 | 60.1 +/- 5.9 |
| fhenix | mean | transaction.wait_receipt | 1 | 5747.1 +/- n/a |
| fhenix | mean | completion.handle.read_attempt | 1 | 109.9 +/- n/a |
| fhenix | mean | completion.read_persisted_handle | 1 | 109.9 +/- n/a |
| fhenix | mean | completion.read_attempt | 1 | 342.9 +/- n/a |
| fhenix | mean | completion.sdk_sealoutput_and_unseal | 1 | 342.9 +/- n/a |
| fhenix | mean | completion.validate_plaintext | 1 | 0.0 +/- n/a |
| fhenix | max | transaction.prepare_and_sign | 1 | 230.7 +/- n/a |
| fhenix | max | barrier.wait | 1 | 270.6 +/- n/a |
| fhenix | max | transaction.raw_broadcast | 1 | 101.1 +/- n/a |
| fhenix | max | transaction.invoke_sign_and_submit | 1 | 101.4 +/- n/a |
| fhenix | max | transaction.receipt.read_attempt | 11 | 57.4 +/- 4.8 |
| fhenix | max | transaction.wait_receipt | 1 | 5736.3 +/- n/a |
| fhenix | max | completion.handle.read_attempt | 1 | 118.6 +/- n/a |
| fhenix | max | completion.read_persisted_handle | 1 | 118.6 +/- n/a |
| fhenix | max | completion.read_attempt | 1 | 342.1 +/- n/a |
| fhenix | max | completion.sdk_sealoutput_and_unseal | 1 | 342.1 +/- n/a |
| fhenix | max | completion.validate_plaintext | 1 | 0.0 +/- n/a |

Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.
Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.
Timeout/failure observations are retained, not silently converted to successful latency samples.
