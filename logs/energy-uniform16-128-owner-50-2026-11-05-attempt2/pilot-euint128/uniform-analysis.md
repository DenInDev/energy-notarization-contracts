# Uniform 128-bit lifecycle campaign

Primary success count: 18/18.
Same-block comparisons: 6/6 eligible.
Actual gas cost including deployment and warmup: 0.000000000707 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 1/1 | 3044.4 | 108.7 | 3153.1 | -- |
| baseline | notarize | 1/1 | 19081.2 | 152.1 | 19233.3 | -- |
| baseline | add | 1/1 | 7595.2 | 109.4 | 7704.7 | -- |
| baseline | mul_scalar | 1/1 | 17880.3 | 139.6 | 18019.9 | -- |
| baseline | mean | 1/1 | 8046.9 | 119.2 | 8166.1 | -- |
| baseline | max | 1/1 | 22202.0 | 110.3 | 22312.3 | -- |
| baseline | view_decrypt | 1/1 | -- | -- | -- | 133.7 |
| zama | set_meter_owner | 1/1 | 2999.7 | 4554.4 | 7554.1 | -- |
| zama | notarize | 1/1 | 18613.8 | 3858.6 | 22472.5 | -- |
| zama | add | 1/1 | 7580.2 | 4773.7 | 12353.8 | -- |
| zama | mul_scalar | 1/1 | 17919.7 | 3909.5 | 21829.2 | -- |
| zama | mean | 1/1 | 8094.5 | 2705.6 | 10800.1 | -- |
| zama | max | 1/1 | 21933.4 | 4845.7 | 26779.1 | -- |
| zama | view_decrypt | 1/1 | -- | -- | -- | 2421.6 |
| fhenix | set_meter_owner | 1/1 | 3091.1 | 255.0 | 3346.0 | -- |
| fhenix | notarize | 1/1 | 18939.7 | 274.4 | 19214.1 | -- |
| fhenix | add | 1/1 | 7503.0 | 270.7 | 7773.7 | -- |
| fhenix | mul_scalar | 1/1 | 17410.5 | 1944.7 | 19355.2 | -- |
| fhenix | mean | 1/1 | 8611.3 | 11703.7 | 20315.0 | -- |
| fhenix | max | 1/1 | 22173.7 | 285.6 | 22459.3 | -- |
| fhenix | view_decrypt | 1/1 | -- | -- | -- | 215.6 |
