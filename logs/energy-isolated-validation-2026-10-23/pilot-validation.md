# Isolated-process pilot validation

15/15 measured observations and 15/15 warmups validated. Three distinct worker processes. Ready-repeat failures: 0.

| Platform | Operation | Preparation ms | Barrier wait ms (excluded) | Broadcast ack ms | Receipt ms | Post-receipt ms | Validated ms |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 248.8 | 9272.7 | 121.4 | 8691.0 | 131.6 | 8822.6 |
| fhenix | notarize | 8161.7 | 1359.8 | 139.5 | 8639.1 | 267.5 | 8906.6 |
| zama | notarize | 9261.1 | 260.4 | 147.4 | 8909.1 | 4852.9 | 13762.1 |
| zama | add | 185.2 | 385.2 | 122.2 | 4794.2 | 4831.0 | 9625.3 |
| fhenix | add | 256.6 | 297.6 | 127.8 | 4708.1 | 313.4 | 5021.5 |
| baseline | add | 296.1 | 258.1 | 128.1 | 4696.3 | 130.8 | 4827.0 |
| zama | mul_scalar | 192.5 | 339.9 | 157.5 | 2462.2 | 6579.9 | 9042.1 |
| baseline | mul_scalar | 237.8 | 294.5 | 115.3 | 2970.5 | 51.8 | 3022.4 |
| fhenix | mul_scalar | 260.7 | 271.7 | 126.8 | 2443.5 | 1287.0 | 3730.5 |
| zama | mean | 198.3 | 333.9 | 149.4 | 14087.2 | 4926.0 | 19013.2 |
| baseline | mean | 244.9 | 287.3 | 149.6 | 14316.2 | 133.0 | 14449.3 |
| fhenix | mean | 268.5 | 263.7 | 169.1 | 14279.7 | 5830.6 | 20110.3 |
| fhenix | max | 186.5 | 380.8 | 121.5 | 16023.2 | 318.8 | 16342.0 |
| zama | max | 194.5 | 372.8 | 133.5 | 16075.7 | 4863.3 | 20939.0 |
| baseline | max | 301.9 | 265.4 | 121.5 | 15826.8 | 138.2 | 15965.0 |

Measured broadcast-start spreads: [0, 16, 0, 0, 0] ms. Same-block triples: 5/5.
Actual gas including deployment and warmup: 0.000000000531423676 Sepolia ETH.

- Signing/estimation and encryption precede the common barrier. Intentional barrier waiting is recorded separately and excluded from completion.
- Receipt is observed inclusion, not isolated EVM execution; post-receipt includes retrieval, authorization and SDK waits.
- One measured round provides validation evidence, not confidence intervals or a controlled causal performance comparison.
- This validation uses saved accounts user-4/user-5/user-6. Earlier interrupted pilots and their unacknowledged hashes remain retained without retransmission.
