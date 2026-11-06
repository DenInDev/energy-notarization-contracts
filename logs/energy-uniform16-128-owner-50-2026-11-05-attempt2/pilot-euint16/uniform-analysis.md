# Uniform 16-bit lifecycle campaign

Primary success count: 18/18.
Same-block comparisons: 6/6 eligible.
Actual gas cost including deployment and warmup: 0.000000000675 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 1/1 | 3616.3 | 120.8 | 3737.1 | -- |
| baseline | notarize | 1/1 | 4806.7 | 133.6 | 4940.3 | -- |
| baseline | add | 1/1 | 8059.1 | 118.7 | 8177.8 | -- |
| baseline | mul_scalar | 1/1 | 30428.2 | 124.8 | 30553.1 | -- |
| baseline | mean | 1/1 | 5822.5 | 133.0 | 5955.6 | -- |
| baseline | max | 1/1 | 5753.3 | 116.7 | 5869.9 | -- |
| baseline | view_decrypt | 1/1 | -- | -- | -- | 57.1 |
| zama | set_meter_owner | 1/1 | 3576.2 | 4608.8 | 8185.0 | -- |
| zama | notarize | 1/1 | 4743.6 | 3706.6 | 8450.2 | -- |
| zama | add | 1/1 | 8192.7 | 4818.4 | 13011.1 | -- |
| zama | mul_scalar | 1/1 | 30780.2 | 4827.9 | 35608.1 | -- |
| zama | mean | 1/1 | 5817.9 | 4796.5 | 10614.4 | -- |
| zama | max | 1/1 | 5843.8 | 3700.0 | 9543.8 | -- |
| zama | view_decrypt | 1/1 | -- | -- | -- | 2362.2 |
| fhenix | set_meter_owner | 1/1 | 3589.4 | 270.4 | 3859.8 | -- |
| fhenix | notarize | 1/1 | 4847.4 | 296.4 | 5143.9 | -- |
| fhenix | add | 1/1 | 7938.7 | 674.1 | 8612.8 | -- |
| fhenix | mul_scalar | 1/1 | 30782.8 | 316.8 | 31099.5 | -- |
| fhenix | mean | 1/1 | 5857.0 | 453.1 | 6310.1 | -- |
| fhenix | max | 1/1 | 5837.8 | 460.9 | 6298.7 | -- |
| fhenix | view_decrypt | 1/1 | -- | -- | -- | 144.4 |
