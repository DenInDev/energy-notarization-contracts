# Uniform 16-bit lifecycle campaign

Status: completed campaign.
Primary success count: 900/900 attempted; 900 planned.
Same-block comparisons: 300/300 eligible.
Actual gas cost including deployment and warmup: 0.000000004917 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50/50 | 9683.6 | 126.8 | 9810.5 | -- |
| baseline | notarize | 50/50 | 12799.1 | 131.2 | 12930.3 | -- |
| baseline | add | 50/50 | 8961.7 | 137.8 | 9099.5 | -- |
| baseline | mul_scalar | 50/50 | 7333.8 | 132.0 | 7465.8 | -- |
| baseline | mean | 50/50 | 9088.7 | 130.8 | 9219.5 | -- |
| baseline | max | 50/50 | 9227.3 | 129.1 | 9356.5 | -- |
| baseline | view_decrypt | 50/50 | -- | -- | -- | 78.1 |
| zama | set_meter_owner | 50/50 | 9688.1 | 3961.1 | 13649.1 | -- |
| zama | notarize | 50/50 | 12753.9 | 3871.6 | 16625.5 | -- |
| zama | add | 50/50 | 8928.2 | 4179.1 | 13107.4 | -- |
| zama | mul_scalar | 50/50 | 7300.1 | 4315.9 | 11616.1 | -- |
| zama | mean | 50/50 | 9056.5 | 4237.4 | 13293.9 | -- |
| zama | max | 50/50 | 9257.4 | 3856.6 | 13114.0 | -- |
| zama | view_decrypt | 50/50 | -- | -- | -- | 2385.1 |
| fhenix | set_meter_owner | 50/50 | 9701.5 | 349.0 | 10050.5 | -- |
| fhenix | notarize | 50/50 | 12749.4 | 281.5 | 13030.9 | -- |
| fhenix | add | 50/50 | 8923.6 | 433.8 | 9357.3 | -- |
| fhenix | mul_scalar | 50/50 | 7308.0 | 350.4 | 7658.4 | -- |
| fhenix | mean | 50/50 | 9088.8 | 716.6 | 9805.4 | -- |
| fhenix | max | 50/50 | 9270.8 | 357.1 | 9627.8 | -- |
| fhenix | view_decrypt | 50/50 | -- | -- | -- | 168.9 |
