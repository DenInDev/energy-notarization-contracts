# Descriptive segmented energy campaign

All 750 scheduled primary observations attempted: 749 validated, one historical failure retained; 15 valid warmups. All 126 continuation observations validated. Original report and sample prefix unchanged.

Receipt includes all confirmed samples; validated completion and post-receipt statistics use successful primary observations only. Times in seconds. No inferential tests.

| Platform | Operation | Valid / attempted | Receipt n | Receipt mean s | Completion n | Completion mean s | Post-receipt mean s | Worker wall mean s | Ready success / failure |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | notarize | 50/50 | 50 | 19.359 | 50 | 19.452 | 0.094 | 22.499 | 0/0 |
| baseline | add | 50/50 | 50 | 12.130 | 50 | 12.191 | 0.061 | 12.191 | 0/0 |
| baseline | mul_scalar | 50/50 | 50 | 9.473 | 50 | 9.539 | 0.065 | 9.539 | 0/0 |
| baseline | mean | 50/50 | 50 | 10.050 | 50 | 10.159 | 0.109 | 10.159 | 0/0 |
| baseline | max | 50/50 | 50 | 8.702 | 50 | 8.766 | 0.064 | 8.766 | 0/0 |
| zama | notarize | 50/50 | 50 | 13.244 | 50 | 17.538 | 4.294 | 32.114 | 50/0 |
| zama | add | 50/50 | 50 | 12.335 | 50 | 16.819 | 4.485 | 16.820 | 49/1 |
| zama | mul_scalar | 49/50 | 50 | 9.896 | 49 | 14.510 | 4.513 | 14.510 | 49/0 |
| zama | mean | 50/50 | 50 | 10.029 | 50 | 14.851 | 4.822 | 14.851 | 50/0 |
| zama | max | 50/50 | 50 | 8.969 | 50 | 13.504 | 4.534 | 13.504 | 50/0 |
| fhenix | notarize | 50/50 | 50 | 11.324 | 50 | 11.542 | 0.218 | 21.655 | 50/0 |
| fhenix | add | 50/50 | 50 | 12.327 | 50 | 12.689 | 0.362 | 12.689 | 50/0 |
| fhenix | mul_scalar | 50/50 | 50 | 9.648 | 50 | 10.237 | 0.589 | 10.237 | 50/0 |
| fhenix | mean | 50/50 | 50 | 10.016 | 50 | 15.030 | 5.014 | 15.030 | 50/0 |
| fhenix | max | 50/50 | 50 | 8.960 | 50 | 9.260 | 0.300 | 9.260 | 50/0 |

## Segments

| Segment | Valid / attempted | Start | End |
|---|---:|---|---|
| original | 623/624 | 2026-10-23T13:47:01.828Z | 2026-10-23T15:06:02.356Z |
| continuation | 126/126 | 2026-10-23T15:45:34.315Z | 2026-10-23T15:58:19.906Z |

Per-platform and operation summaries for each segment are in the JSON artifact.

## Paired descriptive differences

Negative values mean the left platform completed sooner; pairs require both primary outcomes to be successful.

| Operation | Left - right | n | Receipt difference s | Completion difference s | Gas difference |
|---|---|---:|---:|---:|---:|
| notarize | baseline - zama | 50 | 6.114 | 1.914 | -451991.960 |
| notarize | baseline - fhenix | 50 | 8.035 | 7.910 | -286306.200 |
| notarize | zama - fhenix | 50 | 1.921 | 5.996 | 165685.760 |
| add | baseline - zama | 50 | -0.205 | -4.628 | -307038.760 |
| add | baseline - fhenix | 50 | -0.197 | -0.498 | -307729.000 |
| add | zama - fhenix | 50 | 0.008 | 4.130 | -690.240 |
| mul_scalar | baseline - zama | 49 | -0.429 | -4.877 | -303208.755 |
| mul_scalar | baseline - fhenix | 50 | -0.174 | -0.698 | -446906.000 |
| mul_scalar | zama - fhenix | 49 | 0.252 | 4.169 | -143697.245 |
| mean | baseline - zama | 50 | 0.021 | -4.692 | -320449.600 |
| mean | baseline - fhenix | 50 | 0.034 | -4.871 | -368066.000 |
| mean | zama - fhenix | 50 | 0.013 | -0.179 | -47616.400 |
| max | baseline - zama | 50 | -0.268 | -4.738 | -306681.680 |
| max | baseline - fhenix | 50 | -0.258 | -0.495 | -309985.000 |
| max | zama - fhenix | 50 | 0.009 | 4.243 | -3303.320 |

## Actual gas costs

| Platform | Total Sepolia ETH including deployment and warmup |
|---|---:|
| baseline | 0.000000000298073977 |
| zama | 0.000000001951069290 |
| fhenix | 0.000000001882295166 |

Total: 0.000000004131438433 Sepolia ETH. Same-block triples: 233/250.

## Polling and retry observations

```json
[
  {
    "platform": "zama",
    "primarySdkWaitHintsMs": {
      "2000": 435,
      "4000": 2,
      "5000": 10
    },
    "primaryPollHintsMs": {},
    "primaryHttpStatuses": null,
    "readySdkWaitHintsMs": {
      "2000": 249,
      "4000": 4,
      "5000": 7
    },
    "retryEvents": {
      "completion.acl_check_retry": 21,
      "completion.handle.receipt_block_retry": 3
    },
    "recordedHttp429": null,
    "reportedRateLimitFailures": 0
  },
  {
    "platform": "fhenix",
    "primarySdkWaitHintsMs": {},
    "primaryPollHintsMs": {
      "100": 1391
    },
    "primaryHttpStatuses": {
      "200": 250,
      "204": 1375,
      "404": 16
    },
    "readySdkWaitHintsMs": {},
    "retryEvents": {
      "completion.handle.receipt_block_retry": 5
    },
    "recordedHttp429": 0,
    "reportedRateLimitFailures": 0
  }
]
```

## Retained failures and separate recovery

```json
{
  "primary": [
    {
      "platform": "zama",
      "run": 42,
      "operation": "mul_scalar",
      "error": "Response body does not match the expected schema\n\nstatus: 503\nurl: [endpoint]\nmethod: POST\noperation: USER_DECRYPT\nretryCount: 0\n\nVersion: @zama-fhe/relayer-sdk@0.4.1",
      "transactionHash": "0xdddbd425d7e7788103e21d20b4ccdaa14a20a5f7c0230d0dacffd3f36e6de731"
    }
  ],
  "ready": [
    {
      "platform": "zama",
      "run": 42,
      "operation": "add",
      "error": "Response body does not match the expected schema\n\nstatus: 503\nurl: [endpoint]\nmethod: GET\noperation: USER_DECRYPT\nretryCount: 1\njobId: 16e7400a-dfd4-410b-a4d1-6ce396b52bbb\n\nVersion: @zama-fhe/relayer-sdk@0.4.1"
    }
  ],
  "recoveries": [
    {
      "platform": "zama",
      "run": 42,
      "operation": "mul_scalar",
      "originalTransactionHash": "0xdddbd425d7e7788103e21d20b4ccdaa14a20a5f7c0230d0dacffd3f36e6de731",
      "plaintext": "3780",
      "verifiedAt": "2026-10-23T15:45:31.769Z",
      "note": "Late value recovery only; original failed primary latency observation is retained."
    }
  ]
}
```

## Interpretation limits

- Descriptive analysis with a retained failed primary sample; completion means exclude that observation with explicit n. No inferential p-values or all-valid campaign claim.
- Original and continuation segments are separated by an interruption. New bounded 503 read retries apply only to the continuation; source/code provenance is recorded per segment.
- Receipts include all confirmed observations, including the failed Zama decrypt. Paired summaries use only pairs with both primary observations successful.
- Receipt and validated timings start at transaction invocation and exclude input preparation and earlier worker delays. Worker wall timings include those intervals but use wall timestamps, not a cross-process monotonic clock.
- Shared Node proof preparation can contend with signing/submission; notarization rankings do not isolate computational performance.
- Post-receipt delay includes RPC, authorization, network, SDK polling and retries; it is not pure FHE evaluation.
- Polling hints are chosen waits after responses; HTTP duration adds to request spacing. Zama HTTP statuses are not fully instrumented; its rate-limit count only covers reported SDK failures.
- Already-ready timings are success-only separate repeats; retain failures and explicit denominators.
- Late recovery verifies value only; it contributes no primary or repeat latency.
- Gas includes all confirmed primary transactions (including failed decryption), original deployment and warmups; no new deployment or warmup occurred in continuation.
