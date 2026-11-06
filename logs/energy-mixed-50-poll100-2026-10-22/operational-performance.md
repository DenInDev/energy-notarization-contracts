# Observable operational performance: complete interleaved campaign

Campaign period (including excluded setup): 2026-10-22T20:34:19.178Z to 2026-10-22T21:48:20.173Z. 50 rounds per operation/configuration.
Times are milliseconds, mean +/- sample SD. Backend TFHE evaluation and KMS compute are not isolated.

| Configuration | Operation | Gas | Receipt (ms) | Validated completion (ms) | Post-receipt (ms) | Already-ready decrypt (ms) | Ready n / failures |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 34185.0 +/- 0.0 | 13226.6 +/- 5895.5 | 13295.2 +/- 5897.0 | 68.6 +/- 28.3 | n/a | 0 / 0 |
| baseline | add | 36022.0 +/- 0.0 | 9570.4 +/- 7160.8 | 9632.3 +/- 7162.6 | 61.8 +/- 21.7 | n/a | 0 / 0 |
| baseline | mul_scalar | 36011.0 +/- 0.0 | 8617.3 +/- 6826.5 | 8677.3 +/- 6824.7 | 60.0 +/- 17.6 | n/a | 0 / 0 |
| baseline | mean | 37938.0 +/- 0.0 | 7368.6 +/- 5857.1 | 7426.4 +/- 5856.0 | 57.8 +/- 12.8 | n/a | 0 / 0 |
| baseline | max | 37945.0 +/- 0.0 | 6875.4 +/- 5603.1 | 6939.7 +/- 5604.9 | 64.3 +/- 35.4 | n/a | 0 / 0 |
| zama | notarize | 486176.5 +/- 12.8 | 5244.7 +/- 5943.6 | 9290.6 +/- 6081.4 | 4045.9 +/- 911.9 | 2337.1 +/- 41.8 | 50 / 0 |
| zama | add | 343060.5 +/- 1.3 | 9595.2 +/- 7132.4 | 13838.1 +/- 7229.4 | 4242.9 +/- 855.3 | 2334.5 +/- 25.4 | 50 / 0 |
| zama | mul_scalar | 339219.4 +/- 1.4 | 8637.0 +/- 6914.5 | 13126.3 +/- 7043.8 | 4489.3 +/- 564.9 | 2341.2 +/- 43.1 | 50 / 0 |
| zama | mean | 358387.5 +/- 1.3 | 7364.2 +/- 5850.4 | 11827.2 +/- 5898.9 | 4463.0 +/- 548.7 | 2478.2 +/- 774.4 | 50 / 0 |
| zama | max | 344626.8 +/- 1.0 | 6912.5 +/- 5667.9 | 11484.0 +/- 5506.1 | 4571.5 +/- 374.1 | 2347.0 +/- 41.8 | 50 / 0 |
| fhenix | notarize | 320492.6 +/- 6.0 | 6656.4 +/- 5978.8 | 6878.9 +/- 5979.3 | 222.5 +/- 46.3 | 146.9 +/- 26.8 | 50 / 0 |
| fhenix | add | 343751.0 +/- 0.0 | 9560.6 +/- 7173.0 | 9899.2 +/- 7185.6 | 338.7 +/- 230.4 | 149.3 +/- 25.7 | 50 / 0 |
| fhenix | mul_scalar | 482917.0 +/- 0.0 | 8647.4 +/- 6891.0 | 9145.3 +/- 6953.4 | 497.9 +/- 282.7 | 149.1 +/- 14.5 | 50 / 0 |
| fhenix | mean | 406004.0 +/- 0.0 | 7373.1 +/- 5883.9 | 12394.7 +/- 5915.8 | 5021.6 +/- 997.6 | 151.2 +/- 23.8 | 50 / 0 |
| fhenix | max | 347930.0 +/- 0.0 | 6926.9 +/- 5578.5 | 7284.8 +/- 5550.5 | 358.0 +/- 246.4 | 149.7 +/- 37.2 | 50 / 0 |

## Client-observed SDK stages

Notarization only; mean +/- sample SD. Stage definitions differ across SDKs and do not isolate individual server compute times.
Zama key preparation occurs in excluded setup; CoFHE exposes per-request key-fetch/preparation. Ready decrypt is a separate repeat after successful first completion.

| Stage | Zama (ms) | Fhenix (ms) |
|---|---:|---:|
| Ciphertext + ZKP | 5724.4 +/- 52.4 | 5350.2 +/- 48.5 |
| Input approval | 8137.7 +/- 52.9 | 668.0 +/- 123.3 |
| Key fetch/preparation | n/a | 691.0 +/- 24.5 |
| First SDK decrypt | 3985.2 +/- 911.9 | 151.6 +/- 17.3 |
| Total input preparation | 13862.1 +/- 89.5 | 9574.4 +/- 2884.5 |
| Ready decrypt + auth | 2337.1 +/- 41.8 | 146.9 +/- 26.8 |

## Direct round-matched comparisons

Negative mean difference means the left configuration completed sooner. Pointwise confidence intervals are not multiplicity-adjusted.
Paired-t p-values are Holm-adjusted jointly over 30 comparisons. Non-rejection does not establish equivalence.
Bootstrap intervals and lag-one correlations in analysis.json assess sensitivity to local serial dependence; they do not remove confounding.

| Metric | Operation | Left - right | Mean difference (ms) | Pointwise 95% CI | Holm p |
|---|---|---|---:|---:|---:|
| receipt | notarize | baseline - zama | 7982.0 | [7864.9, 8099.0] | 1.60608e-63 |
| receipt | notarize | baseline - fhenix | 6570.3 | [6470.8, 6669.7] | 7.31676e-63 |
| receipt | notarize | zama - fhenix | -1411.7 | [-1495.0, -1328.4] | 1.78725e-34 |
| receipt | add | baseline - zama | -24.8 | [-96.4, 46.9] | 1 |
| receipt | add | baseline - fhenix | 9.9 | [-61.9, 81.7] | 1 |
| receipt | add | zama - fhenix | 34.6 | [-30.5, 99.8] | 1 |
| receipt | mul_scalar | baseline - zama | -19.7 | [-88.1, 48.7] | 1 |
| receipt | mul_scalar | baseline - fhenix | -30.2 | [-86.5, 26.2] | 1 |
| receipt | mul_scalar | zama - fhenix | -10.5 | [-87.0, 66.1] | 1 |
| receipt | mean | baseline - zama | 4.4 | [-42.7, 51.5] | 1 |
| receipt | mean | baseline - fhenix | -4.5 | [-60.5, 51.6] | 1 |
| receipt | mean | zama - fhenix | -8.9 | [-65.7, 47.9] | 1 |
| receipt | max | baseline - zama | -37.1 | [-107.7, 33.5] | 1 |
| receipt | max | baseline - fhenix | -51.5 | [-112.1, 9.2] | 1 |
| receipt | max | zama - fhenix | -14.3 | [-91.7, 63.0] | 1 |
| validated completion | notarize | baseline - zama | 4004.6 | [3744.8, 4264.4] | 1.37648e-32 |
| validated completion | notarize | baseline - fhenix | 6416.3 | [6313.7, 6518.9] | 1.0423e-61 |
| validated completion | notarize | zama - fhenix | 2411.7 | [2156.2, 2667.2] | 5.50928e-23 |
| validated completion | add | baseline - zama | -4205.8 | [-4439.5, -3972.2] | 1.15333e-35 |
| validated completion | add | baseline - fhenix | -267.0 | [-355.4, -178.5] | 2.61031e-06 |
| validated completion | add | zama - fhenix | 3938.9 | [3706.4, 4171.3] | 1.78725e-34 |
| validated completion | mul_scalar | baseline - zama | -4449.1 | [-4633.6, -4264.5] | 1.11945e-41 |
| validated completion | mul_scalar | baseline - fhenix | -468.1 | [-550.6, -385.6] | 3.45514e-14 |
| validated completion | mul_scalar | zama - fhenix | 3981.0 | [3808.3, 4153.7] | 9.27184e-41 |
| validated completion | mean | baseline - zama | -4400.7 | [-4562.8, -4238.7] | 3.7972e-44 |
| validated completion | mean | baseline - fhenix | -4968.2 | [-5253.1, -4683.4] | 4.90768e-35 |
| validated completion | mean | zama - fhenix | -567.5 | [-877.3, -257.7] | 0.00750763 |
| validated completion | max | baseline - zama | -4544.3 | [-4670.5, -4418.0] | 4.8713e-50 |
| validated completion | max | baseline - fhenix | -345.1 | [-430.4, -259.8] | 1.80027e-09 |
| validated completion | max | zama - fhenix | 4199.2 | [4081.2, 4317.2] | 8.27157e-50 |

## Full client lifecycle relative to baseline

Client lifecycle is input preparation plus transaction-to-validated-plaintext. Ready-repeat decryption is excluded.
Ratios are geometric means of round-matched FHE/baseline ratios; confidence intervals use the circular block bootstrap.

| Operation | Configuration | Baseline (ms) | Configuration (ms) | Lifecycle ratio | Overhead | 95% ratio CI | Baseline gas | Configuration gas | Gas ratio | Holm p |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | zama | 13295.2 | 23152.7 | 1.805x | +80.5% | [1.749, 1.861] | 34185.0 | 486176.5 | 14.222x | 4.46973e-35 |
| notarize | fhenix | 13295.2 | 16453.3 | 1.234x | +23.4% | [1.185, 1.283] | 34185.0 | 320492.6 | 9.375x | 7.12933e-09 |
| add | zama | 9632.3 | 13838.1 | 1.593x | +59.3% | [1.524, 1.666] | 36022.0 | 343060.5 | 9.524x | 2.74996e-20 |
| add | fhenix | 9632.3 | 9899.2 | 1.037x | +3.7% | [1.024, 1.051] | 36022.0 | 343751.0 | 9.543x | 3.04375e-06 |
| mul_scalar | zama | 8677.3 | 13126.3 | 1.682x | +68.2% | [1.580, 1.788] | 36011.0 | 339219.4 | 9.420x | 4.11277e-23 |
| mul_scalar | fhenix | 8677.3 | 9145.3 | 1.069x | +6.9% | [1.053, 1.086] | 36011.0 | 482917.0 | 13.410x | 1.85024e-12 |
| mean | zama | 7426.4 | 11827.2 | 1.753x | +75.3% | [1.673, 1.835] | 37938.0 | 358387.5 | 9.447x | 5.04221e-26 |
| mean | fhenix | 7426.4 | 12394.7 | 1.848x | +84.8% | [1.754, 1.945] | 37938.0 | 406004.0 | 10.702x | 2.48185e-24 |
| max | zama | 6939.7 | 11484.0 | 1.831x | +83.1% | [1.737, 1.918] | 37945.0 | 344626.8 | 9.082x | 1.07018e-27 |
| max | fhenix | 6939.7 | 7284.8 | 1.066x | +6.6% | [1.049, 1.085] | 37945.0 | 347930.0 | 9.169x | 1.26511e-09 |

## Provenance

| Configuration | Contract | Measured block range | Mean block gas/target | Retrieval transport retries |
|---|---|---|---:|---:|
| baseline | 0x4A82630Ad382Afabd36339B734d4Ea1799DBdac0 | 11971963-11972316 | 0.676 | 0 |
| zama | 0x4Cb8B87df63FD45d7F7eEdc5FC7094b8BA478960 | 11971963-11972316 | 0.676 | 0 |
| fhenix | 0x1B602B517E0A2aCA7308c6bdB81DAecdFBeE0df7 | 11971963-11972316 | 0.676 | 0 |
