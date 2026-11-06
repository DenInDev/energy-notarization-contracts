# Observable operational performance: complete interleaved campaign

Campaign period (including excluded setup): 2026-10-22T18:50:36.097Z to 2026-10-22T20:06:09.185Z. 50 rounds per operation/configuration.
Times are milliseconds, mean +/- sample SD. Backend TFHE evaluation and KMS compute are not isolated.

| Configuration | Operation | Gas | Receipt (ms) | Validated completion (ms) | Post-receipt (ms) | Already-ready decrypt (ms) | Ready n / failures |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 34185.0 +/- 0.0 | 13088.4 +/- 5190.9 | 13150.7 +/- 5191.5 | 62.2 +/- 9.2 | n/a | 0 / 0 |
| baseline | add | 36022.0 +/- 0.0 | 8574.1 +/- 6599.3 | 8636.1 +/- 6599.4 | 62.0 +/- 7.1 | n/a | 0 / 0 |
| baseline | mul_scalar | 36011.0 +/- 0.0 | 6812.8 +/- 5229.9 | 6875.3 +/- 5231.2 | 62.5 +/- 8.9 | n/a | 0 / 0 |
| baseline | mean | 37938.0 +/- 0.0 | 7718.3 +/- 6889.8 | 7783.3 +/- 6887.6 | 65.0 +/- 15.2 | n/a | 0 / 0 |
| baseline | max | 37945.0 +/- 0.0 | 8161.6 +/- 8423.1 | 8245.5 +/- 8414.9 | 83.9 +/- 153.6 | n/a | 0 / 0 |
| zama | notarize | 486177.2 +/- 11.9 | 6552.7 +/- 5630.6 | 10933.8 +/- 5876.6 | 4381.1 +/- 898.9 | 2385.5 +/- 182.1 | 50 / 0 |
| zama | add | 343059.0 +/- 2.0 | 8580.8 +/- 6560.7 | 13132.9 +/- 6749.1 | 4552.1 +/- 925.2 | 2360.1 +/- 39.7 | 50 / 0 |
| zama | mul_scalar | 339217.3 +/- 1.9 | 6823.0 +/- 5148.6 | 11782.3 +/- 5115.6 | 4959.3 +/- 1279.3 | 2371.2 +/- 59.2 | 50 / 0 |
| zama | mean | 358385.5 +/- 2.0 | 7763.6 +/- 6829.3 | 12434.1 +/- 6889.9 | 4670.6 +/- 447.1 | 2364.1 +/- 57.5 | 50 / 0 |
| zama | max | 344625.0 +/- 2.0 | 8219.8 +/- 8412.8 | 12977.4 +/- 8507.6 | 4757.6 +/- 639.0 | 2374.1 +/- 93.0 | 50 / 0 |
| fhenix | notarize | 320492.2 +/- 6.6 | 6608.0 +/- 5198.8 | 6844.1 +/- 5194.6 | 236.2 +/- 81.8 | 155.8 +/- 35.4 | 50 / 0 |
| fhenix | add | 343751.0 +/- 0.0 | 8545.5 +/- 6564.0 | 9041.1 +/- 6608.8 | 495.5 +/- 454.5 | 162.4 +/- 46.2 | 50 / 0 |
| fhenix | mul_scalar | 482917.0 +/- 0.0 | 6863.1 +/- 5201.3 | 7858.3 +/- 5140.6 | 995.2 +/- 581.4 | 152.1 +/- 22.9 | 50 / 0 |
| fhenix | mean | 406004.0 +/- 0.0 | 7733.5 +/- 6847.9 | 13217.2 +/- 6962.4 | 5483.7 +/- 1434.3 | 255.4 +/- 704.7 | 50 / 0 |
| fhenix | max | 347930.0 +/- 0.0 | 8222.2 +/- 8463.2 | 8778.2 +/- 8410.5 | 556.0 +/- 492.2 | 148.8 +/- 23.3 | 50 / 0 |

## Client-observed SDK stages

Notarization only; mean +/- sample SD. Stage definitions differ across SDKs and do not isolate individual server compute times.
Zama key preparation occurs in excluded setup; CoFHE exposes per-request key-fetch/preparation. Ready decrypt is a separate repeat after successful first completion.

| Stage | Zama (ms) | Fhenix (ms) |
|---|---:|---:|
| Ciphertext + ZKP | 5712.2 +/- 36.3 | 5359.5 +/- 42.8 |
| Input approval | 8158.2 +/- 77.5 | 656.1 +/- 78.2 |
| Key fetch/preparation | n/a | 690.0 +/- 27.4 |
| First SDK decrypt | 4317.6 +/- 898.6 | 173.6 +/- 76.9 |
| Total input preparation | 13870.5 +/- 93.4 | 9565.4 +/- 2872.6 |
| Ready decrypt + auth | 2385.5 +/- 182.1 | 155.8 +/- 35.4 |

## Direct round-matched comparisons

Negative mean difference means the left configuration completed sooner. Pointwise confidence intervals are not multiplicity-adjusted.
Paired-t p-values are Holm-adjusted jointly over 30 comparisons. Non-rejection does not establish equivalence.
Bootstrap intervals and lag-one correlations in analysis.json assess sensitivity to local serial dependence; they do not remove confounding.

| Metric | Operation | Left - right | Mean difference (ms) | Pointwise 95% CI | Holm p |
|---|---|---|---:|---:|---:|
| receipt | notarize | baseline - zama | 6535.7 | [5434.7, 7636.7] | 7.98631e-15 |
| receipt | notarize | baseline - fhenix | 6480.5 | [6417.4, 6543.6] | 3.25902e-72 |
| receipt | notarize | zama - fhenix | -55.2 | [-1161.7, 1051.2] | 1 |
| receipt | add | baseline - zama | -6.7 | [-71.4, 58.0] | 1 |
| receipt | add | baseline - fhenix | 28.6 | [-50.6, 107.7] | 1 |
| receipt | add | zama - fhenix | 35.2 | [-32.8, 103.3] | 1 |
| receipt | mul_scalar | baseline - zama | -10.2 | [-81.6, 61.2] | 1 |
| receipt | mul_scalar | baseline - fhenix | -50.3 | [-101.2, 0.6] | 0.686438 |
| receipt | mul_scalar | zama - fhenix | -40.1 | [-101.8, 21.6] | 1 |
| receipt | mean | baseline - zama | -45.3 | [-130.8, 40.3] | 1 |
| receipt | mean | baseline - fhenix | -15.2 | [-87.3, 56.9] | 1 |
| receipt | mean | zama - fhenix | 30.1 | [-47.1, 107.3] | 1 |
| receipt | max | baseline - zama | -58.2 | [-125.4, 9.1] | 0.972286 |
| receipt | max | baseline - fhenix | -60.7 | [-127.2, 5.9] | 0.876608 |
| receipt | max | zama - fhenix | -2.5 | [-81.4, 76.5] | 1 |
| validated completion | notarize | baseline - zama | 2216.8 | [1126.5, 3307.1] | 0.00243355 |
| validated completion | notarize | baseline - fhenix | 6306.6 | [6240.5, 6372.6] | 1.09007e-70 |
| validated completion | notarize | zama - fhenix | 4089.7 | [2996.6, 5182.8] | 1.78182e-08 |
| validated completion | add | baseline - zama | -4496.8 | [-4741.9, -4251.7] | 5.3631e-36 |
| validated completion | add | baseline - fhenix | -405.0 | [-537.6, -272.4] | 2.30078e-06 |
| validated completion | add | zama - fhenix | 4091.8 | [3820.4, 4363.3] | 5.18969e-32 |
| validated completion | mul_scalar | baseline - zama | -4907.0 | [-5276.3, -4537.8] | 1.6945e-29 |
| validated completion | mul_scalar | baseline - fhenix | -983.0 | [-1143.4, -822.5] | 2.61725e-15 |
| validated completion | mul_scalar | zama - fhenix | 3924.0 | [3556.8, 4291.2] | 2.94496e-25 |
| validated completion | mean | baseline - zama | -4650.8 | [-4811.4, -4490.2] | 1.93424e-45 |
| validated completion | mean | baseline - fhenix | -5433.9 | [-5853.8, -5014.0] | 5.46216e-29 |
| validated completion | mean | zama - fhenix | -783.1 | [-1210.2, -356.0] | 0.00801621 |
| validated completion | max | baseline - zama | -4731.9 | [-4923.4, -4540.3] | 3.91097e-42 |
| validated completion | max | baseline - fhenix | -532.7 | [-670.1, -395.3] | 7.18616e-09 |
| validated completion | max | zama - fhenix | 4199.2 | [3978.2, 4420.1] | 1.04851e-36 |

## Full client lifecycle relative to baseline

Client lifecycle is input preparation plus transaction-to-validated-plaintext. Ready-repeat decryption is excluded.
Ratios are geometric means of round-matched FHE/baseline ratios; confidence intervals use the circular block bootstrap.

| Operation | Configuration | Baseline (ms) | Configuration (ms) | Lifecycle ratio | Overhead | 95% ratio CI | Baseline gas | Configuration gas | Gas ratio | Holm p |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | zama | 13150.7 | 24804.3 | 1.946x | +94.6% | [1.859, 2.041] | 34185.0 | 486177.2 | 14.222x | 1.65691e-25 |
| notarize | fhenix | 13150.7 | 16409.5 | 1.263x | +26.3% | [1.215, 1.309] | 34185.0 | 320492.2 | 9.375x | 1.81846e-09 |
| add | zama | 8636.1 | 13132.9 | 1.684x | +68.4% | [1.599, 1.771] | 36022.0 | 343059.0 | 9.524x | 4.08193e-23 |
| add | fhenix | 8636.1 | 9041.1 | 1.061x | +6.1% | [1.039, 1.086] | 36022.0 | 343751.0 | 9.543x | 7.99689e-07 |
| mul_scalar | zama | 6875.3 | 11782.3 | 1.908x | +90.8% | [1.731, 2.123] | 36011.0 | 339217.3 | 9.420x | 1.06466e-20 |
| mul_scalar | fhenix | 6875.3 | 7858.3 | 1.190x | +19.0% | [1.151, 1.230] | 36011.0 | 482917.0 | 13.410x | 3.27307e-13 |
| mean | zama | 7783.3 | 12434.1 | 1.871x | +87.1% | [1.746, 2.023] | 37938.0 | 358385.5 | 9.447x | 1.06466e-20 |
| mean | fhenix | 7783.3 | 13217.2 | 2.005x | +100.5% | [1.854, 2.183] | 37938.0 | 406004.0 | 10.702x | 1.10517e-19 |
| max | zama | 8245.5 | 12977.4 | 1.816x | +81.6% | [1.690, 1.941] | 37945.0 | 344625.0 | 9.082x | 1.32722e-23 |
| max | fhenix | 8245.5 | 8778.2 | 1.095x | +9.5% | [1.066, 1.126] | 37945.0 | 347930.0 | 9.169x | 4.50945e-08 |

## Provenance

| Configuration | Contract | Measured block range | Mean block gas/target | Retrieval transport retries |
|---|---|---|---:|---:|
| baseline | 0x7af0e0eb8E8D0b39CD6d951629Cf39ae3bB83C19 | 11971451-11971811 | 0.702 | 0 |
| zama | 0xF4353B4CA3aA45E0ceAbAb2da59DA138dD807D47 | 11971451-11971811 | 0.702 | 0 |
| fhenix | 0x679Fc58C05e1916079D6924385ec7d541fc6c30B | 11971451-11971811 | 0.702 | 0 |
