# Campaign completion audit

750 measured observations and 15 warmups validated; no primary or ready-repeat failures. All 250 measured triples share a block. Raw report unchanged.

Gas including deployment and warmup: 0.000000013962263659 Sepolia ETH.

| Platform | Gas cost ETH | Transactions |
|---|---:|---:|
| baseline | 0.000000000918997641 | 256 |
| zama | 0.000000006530060872 | 256 |
| fhenix | 0.000000006513205146 | 256 |

Polling audit:

```json
[
  {
    "platform": "zama",
    "primaryQueuedDelayMs": {
      "2000": 460
    },
    "primarySdkPollDelayMs": {},
    "primaryHttpStatuses": {},
    "readyQueuedDelayMs": {
      "2000": 250,
      "5000": 1
    },
    "readySdkPollDelayMs": {},
    "recorded429": 0
  },
  {
    "platform": "fhenix",
    "primaryQueuedDelayMs": {},
    "primarySdkPollDelayMs": {
      "100": 1409
    },
    "primaryHttpStatuses": {
      "200": 250,
      "204": 1386,
      "404": 23
    },
    "readyQueuedDelayMs": {},
    "readySdkPollDelayMs": {},
    "recorded429": 0
  }
]
```

| Platform | Operation | Receipt s | Validated s | Post-receipt s | Worker wall s |
|---|---|---:|---:|---:|---:|
| baseline | notarize | 13.227 | 13.295 | 0.069 | 16.220 |
| baseline | add | 9.570 | 9.632 | 0.062 | 9.632 |
| baseline | mul_scalar | 8.617 | 8.677 | 0.060 | 8.677 |
| baseline | mean | 7.369 | 7.426 | 0.058 | 7.427 |
| baseline | max | 6.875 | 6.940 | 0.064 | 6.940 |
| zama | notarize | 5.245 | 9.291 | 4.046 | 23.153 |
| zama | add | 9.595 | 13.838 | 4.243 | 13.838 |
| zama | mul_scalar | 8.637 | 13.126 | 4.489 | 13.126 |
| zama | mean | 7.364 | 11.827 | 4.463 | 11.827 |
| zama | max | 6.913 | 11.484 | 4.571 | 11.484 |
| fhenix | notarize | 6.656 | 6.879 | 0.223 | 16.453 |
| fhenix | add | 9.561 | 9.899 | 0.339 | 9.899 |
| fhenix | mul_scalar | 8.647 | 9.145 | 0.498 | 9.145 |
| fhenix | mean | 7.373 | 12.395 | 5.022 | 12.395 |
| fhenix | max | 6.927 | 7.285 | 0.358 | 7.285 |

- Receipt and validated columns start at transaction invocation; notarization input preparation and earlier worker delays are excluded.
- Worker wall time uses recorded wall-clock timestamps and is approximate.
- Shared Node input preparation can contend with signing/submission; notarization rankings do not isolate computational performance.
- SDK poll delay is time waited after a pending response; HTTP duration adds to the spacing between requests.
- Zama server Retry-After hints remain respected. Already-ready repeats follow a successful primary completion and are separate measurements.
- Public-network comparison to prior campaign is observational, not causal.
