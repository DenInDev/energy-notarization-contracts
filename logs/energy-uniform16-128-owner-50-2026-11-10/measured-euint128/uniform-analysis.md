# Uniform 128-bit lifecycle campaign

Status: partial campaign; scheduled operations remain unattempted.
Primary success count: 374/375 attempted; 900 planned.
Same-block comparisons: 125/125 eligible.
Actual gas cost including deployment and warmup: 0.000000008264 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 21/21 | 11105.8 | 143.6 | 11249.4 | -- |
| baseline | notarize | 21/21 | 9540.6 | 137.9 | 9678.5 | -- |
| baseline | add | 21/21 | 8566.6 | 131.5 | 8698.1 | -- |
| baseline | mul_scalar | 21/21 | 9275.2 | 117.3 | 9392.5 | -- |
| baseline | mean | 21/21 | 10553.8 | 135.4 | 10689.3 | -- |
| baseline | max | 20/20 | 10079.3 | 145.2 | 10224.5 | -- |
| baseline | view_decrypt | 20/20 | -- | -- | -- | 88.6 |
| zama | set_meter_owner | 21/21 | 11088.4 | 4527.8 | 15616.2 | -- |
| zama | notarize | 21/21 | 9547.9 | 4507.3 | 14055.2 | -- |
| zama | add | 21/21 | 8599.9 | 4663.2 | 13263.1 | -- |
| zama | mul_scalar | 21/21 | 9193.3 | 5704.6 | 14897.9 | -- |
| zama | mean | 20/21 | 10492.9 | 4761.7 | 15271.2 | -- |
| zama | max | 20/20 | 10093.2 | 5047.0 | 15140.3 | -- |
| zama | view_decrypt | 20/20 | -- | -- | -- | 2434.0 |
| fhenix | set_meter_owner | 21/21 | 11093.9 | 295.7 | 11389.6 | -- |
| fhenix | notarize | 21/21 | 9570.8 | 288.6 | 9859.4 | -- |
| fhenix | add | 21/21 | 8640.2 | 279.6 | 8919.7 | -- |
| fhenix | mul_scalar | 21/21 | 9284.1 | 2614.1 | 11898.2 | -- |
| fhenix | mean | 21/21 | 10497.9 | 14939.8 | 25437.7 | -- |
| fhenix | max | 20/20 | 10044.6 | 405.4 | 10450.0 | -- |
| fhenix | view_decrypt | 20/20 | -- | -- | -- | 208.2 |
