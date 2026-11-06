# Uniform 128-bit lifecycle campaign

Primary success count: 15/15.
Same-block comparisons: 5/5 eligible.
Actual gas cost including deployment and warmup: 0.000000000625 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 7218.2 | 157.4 | 7375.6 | -- |
| baseline | add | 1/1 | 7778.3 | 134.7 | 7913.0 | -- |
| baseline | mul_scalar | 1/1 | 21506.0 | 231.4 | 21737.4 | -- |
| baseline | mean | 1/1 | 7190.2 | 129.2 | 7319.4 | -- |
| baseline | max | 1/1 | 8821.5 | 162.2 | 8983.7 | -- |
| baseline | view_decrypt | 1/1 | -- | -- | -- | 63.6 |
| zama | notarize | 1/1 | 7127.0 | 2813.9 | 9940.9 | -- |
| zama | add | 1/1 | 7682.9 | 3775.3 | 11458.2 | -- |
| zama | mul_scalar | 1/1 | 21355.4 | 2758.9 | 24114.4 | -- |
| zama | mean | 1/1 | 7106.2 | 2731.7 | 9838.0 | -- |
| zama | max | 1/1 | 8861.5 | 4681.7 | 13543.2 | -- |
| zama | view_decrypt | 1/1 | -- | -- | -- | 2387.1 |
| fhenix | notarize | 1/1 | 7120.9 | 284.9 | 7405.7 | -- |
| fhenix | add | 1/1 | 7748.4 | 841.2 | 8589.6 | -- |
| fhenix | mul_scalar | 1/1 | 21238.0 | 958.5 | 22196.4 | -- |
| fhenix | mean | 1/1 | 7134.4 | 12682.6 | 19817.0 | -- |
| fhenix | max | 1/1 | 9023.1 | 315.6 | 9338.7 | -- |
| fhenix | view_decrypt | 1/1 | -- | -- | -- | 151.9 |
