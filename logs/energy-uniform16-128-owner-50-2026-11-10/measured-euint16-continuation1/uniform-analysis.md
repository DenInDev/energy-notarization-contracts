# Uniform 16-bit lifecycle campaign

Status: completed segmented campaign.
Primary success count: 900/900 attempted; 900 planned.
Same-block comparisons: 300/300 eligible.
Actual gas cost including deployment and warmup: 0.000000017430 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50/50 | 7015.1 | 119.4 | 7134.4 | -- |
| baseline | notarize | 50/50 | 8197.6 | 122.9 | 8320.5 | -- |
| baseline | add | 50/50 | 8871.1 | 126.1 | 8997.2 | -- |
| baseline | mul_scalar | 50/50 | 8229.2 | 116.5 | 8345.7 | -- |
| baseline | mean | 50/50 | 8560.7 | 139.5 | 8700.2 | -- |
| baseline | max | 50/50 | 7159.7 | 131.8 | 7291.5 | -- |
| baseline | view_decrypt | 50/50 | -- | -- | -- | 80.2 |
| zama | set_meter_owner | 50/50 | 7008.9 | 4251.7 | 11260.7 | -- |
| zama | notarize | 50/50 | 8206.0 | 4290.1 | 12496.1 | -- |
| zama | add | 50/50 | 8873.5 | 4337.0 | 13210.5 | -- |
| zama | mul_scalar | 50/50 | 8188.8 | 4430.0 | 12618.8 | -- |
| zama | mean | 50/50 | 8551.2 | 4401.4 | 12952.6 | -- |
| zama | max | 50/50 | 7134.4 | 4497.7 | 11632.1 | -- |
| zama | view_decrypt | 50/50 | -- | -- | -- | 2393.0 |
| fhenix | set_meter_owner | 50/50 | 6994.4 | 288.0 | 7282.4 | -- |
| fhenix | notarize | 50/50 | 8240.2 | 286.2 | 8526.4 | -- |
| fhenix | add | 50/50 | 8880.8 | 308.6 | 9189.3 | -- |
| fhenix | mul_scalar | 50/50 | 8247.6 | 504.1 | 8751.7 | -- |
| fhenix | mean | 50/50 | 8565.3 | 1101.7 | 9667.0 | -- |
| fhenix | max | 50/50 | 7169.9 | 405.3 | 7575.2 | -- |
| fhenix | view_decrypt | 50/50 | -- | -- | -- | 191.4 |
