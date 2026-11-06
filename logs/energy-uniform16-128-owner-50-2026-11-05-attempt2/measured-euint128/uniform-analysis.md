# Uniform 128-bit lifecycle campaign

Status: partial campaign; scheduled operations remain unattempted.
Primary success count: 176/177 attempted; 900 planned.
Same-block comparisons: 59/59 eligible.
Actual gas cost including deployment and warmup: 0.000000001268 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 10/10 | 12332.5 | 125.2 | 12457.7 | -- |
| baseline | notarize | 10/10 | 11765.4 | 131.0 | 11896.3 | -- |
| baseline | add | 10/10 | 7519.1 | 110.8 | 7629.9 | -- |
| baseline | mul_scalar | 10/10 | 6752.0 | 140.6 | 6892.6 | -- |
| baseline | mean | 10/10 | 10967.3 | 127.6 | 11094.9 | -- |
| baseline | max | 9/9 | 14210.0 | 112.3 | 14322.3 | -- |
| baseline | view_decrypt | 9/9 | -- | -- | -- | 57.5 |
| zama | set_meter_owner | 10/10 | 12316.4 | 3460.7 | 15777.0 | -- |
| zama | notarize | 10/10 | 11805.1 | 3466.2 | 15271.3 | -- |
| zama | add | 10/10 | 7592.3 | 4503.2 | 12095.5 | -- |
| zama | mul_scalar | 10/10 | 6811.6 | 3989.4 | 10801.1 | -- |
| zama | mean | 10/10 | 11011.4 | 4184.5 | 15195.9 | -- |
| zama | max | 9/9 | 14252.5 | 3886.1 | 18138.6 | -- |
| zama | view_decrypt | 9/9 | -- | -- | -- | 2372.6 |
| fhenix | set_meter_owner | 10/10 | 12261.5 | 363.2 | 12624.7 | -- |
| fhenix | notarize | 10/10 | 11704.3 | 342.2 | 12046.5 | -- |
| fhenix | add | 10/10 | 7558.8 | 400.9 | 7959.7 | -- |
| fhenix | mul_scalar | 10/10 | 6866.4 | 2143.1 | 9009.4 | -- |
| fhenix | mean | 9/10 | 11009.2 | 12566.2 | 24028.5 | -- |
| fhenix | max | 9/9 | 14218.8 | 621.9 | 14840.7 | -- |
| fhenix | view_decrypt | 9/9 | -- | -- | -- | 204.7 |
