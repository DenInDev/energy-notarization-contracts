# Uniform 16-bit lifecycle campaign

Primary success count: 15/15.
Same-block comparisons: 5/5 eligible.
Actual gas cost including deployment and warmup: 0.000000000643 ETH.

Means below are client-observed milliseconds. Each metric records its denominator in the JSON.
Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.
The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.

| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |
|---|---|---:|---:|---:|---:|---:|
| baseline | notarize | 1/1 | 21076.6 | 133.8 | 21210.4 | -- |
| baseline | add | 1/1 | 7792.4 | 108.3 | 7900.7 | -- |
| baseline | mul_scalar | 1/1 | 18680.2 | 121.1 | 18801.4 | -- |
| baseline | mean | 1/1 | 7012.3 | 118.1 | 7130.4 | -- |
| baseline | max | 1/1 | 7899.7 | 114.8 | 8014.5 | -- |
| baseline | view_decrypt | 1/1 | -- | -- | -- | 54.7 |
| zama | notarize | 1/1 | 20891.0 | 2611.1 | 23502.0 | -- |
| zama | add | 1/1 | 8181.0 | 4849.1 | 13030.1 | -- |
| zama | mul_scalar | 1/1 | 18714.8 | 4723.8 | 23438.6 | -- |
| zama | mean | 1/1 | 7036.9 | 3786.2 | 10823.1 | -- |
| zama | max | 1/1 | 8024.9 | 3964.9 | 11989.8 | -- |
| zama | view_decrypt | 1/1 | -- | -- | -- | 2424.1 |
| fhenix | notarize | 1/1 | 20941.4 | 269.8 | 21211.2 | -- |
| fhenix | add | 1/1 | 8115.5 | 462.1 | 8577.5 | -- |
| fhenix | mul_scalar | 1/1 | 18738.8 | 315.3 | 19054.1 | -- |
| fhenix | mean | 1/1 | 7126.0 | 289.5 | 7415.4 | -- |
| fhenix | max | 1/1 | 7862.9 | 490.9 | 8353.8 | -- |
| fhenix | view_decrypt | 1/1 | -- | -- | -- | 140.4 |
