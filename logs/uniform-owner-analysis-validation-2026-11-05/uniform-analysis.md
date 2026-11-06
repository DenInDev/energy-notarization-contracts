# Uniform 16-bit lifecycle campaign

Primary success count: 18/18.
Same-block comparisons: 6/6 eligible.
Actual gas cost including deployment and warmup: 0.000000000000 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | notarize | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | add | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | mul_scalar | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | mean | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | max | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| baseline | view_decrypt | 1/1 | -- | -- | -- | 3.0 |
| zama | set_meter_owner | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | notarize | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | add | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | mul_scalar | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | mean | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | max | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| zama | view_decrypt | 1/1 | -- | -- | -- | 3.0 |
| fhenix | set_meter_owner | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | notarize | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | add | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | mul_scalar | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | mean | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | max | 1/1 | 5.0 | 3.0 | 8.0 | -- |
| fhenix | view_decrypt | 1/1 | -- | -- | -- | 3.0 |
