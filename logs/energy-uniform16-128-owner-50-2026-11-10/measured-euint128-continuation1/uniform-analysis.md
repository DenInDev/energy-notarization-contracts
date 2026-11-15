# Uniform 128-bit lifecycle campaign

Status: all scheduled operations attempted; retained primary failures (segmented campaign).
Primary success count: 899/900 attempted; 900 planned.
Same-block comparisons: 300/300 eligible.
Actual gas cost including deployment and warmup: 0.000000017146 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | set_meter_owner | 50/50 | 9061.9 | 142.7 | 9204.6 | -- |
| baseline | notarize | 50/50 | 10721.8 | 144.8 | 10866.6 | -- |
| baseline | add | 50/50 | 8952.8 | 128.6 | 9081.4 | -- |
| baseline | mul_scalar | 50/50 | 9211.0 | 140.3 | 9351.3 | -- |
| baseline | mean | 50/50 | 8972.4 | 134.0 | 9106.4 | -- |
| baseline | max | 50/50 | 9340.9 | 150.0 | 9490.9 | -- |
| baseline | view_decrypt | 50/50 | -- | -- | -- | 97.0 |
| zama | set_meter_owner | 50/50 | 9090.4 | 4495.0 | 13585.4 | -- |
| zama | notarize | 50/50 | 10690.7 | 4304.3 | 14995.0 | -- |
| zama | add | 50/50 | 8963.1 | 4973.7 | 13936.8 | -- |
| zama | mul_scalar | 50/50 | 9149.8 | 5262.7 | 14412.5 | -- |
| zama | mean | 49/50 | 8930.8 | 4790.8 | 13696.5 | -- |
| zama | max | 50/50 | 9363.5 | 4826.1 | 14189.7 | -- |
| zama | view_decrypt | 50/50 | -- | -- | -- | 2467.9 |
| fhenix | set_meter_owner | 50/50 | 9082.5 | 370.1 | 9452.7 | -- |
| fhenix | notarize | 50/50 | 10682.3 | 348.5 | 11030.8 | -- |
| fhenix | add | 50/50 | 8994.4 | 550.0 | 9544.4 | -- |
| fhenix | mul_scalar | 50/50 | 9200.5 | 2697.8 | 11898.4 | -- |
| fhenix | mean | 50/50 | 8979.2 | 14763.9 | 23743.0 | -- |
| fhenix | max | 50/50 | 9301.8 | 709.5 | 10011.3 | -- |
| fhenix | view_decrypt | 50/50 | -- | -- | -- | 225.6 |
