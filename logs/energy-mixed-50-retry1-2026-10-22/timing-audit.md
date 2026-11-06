# Timing interpretation audit

The receipt proves successful host-chain execution, not off-chain FHE readiness. Post-receipt is measured from client receipt observation, not block production. A short residual can occur if ciphertext evaluation progressed before that observation. No internal server completion timestamp was measured, so backend compute time cannot be identified.

## Mean post-observed-receipt to validated plaintext (seconds)

| Operation | Baseline | Zama | Fhenix |
| --- | ---: | ---: | ---: |
| notarize | 0.062 | 4.381 | 0.236 |
| add | 0.062 | 4.552 | 0.496 |
| mul_scalar | 0.062 | 4.959 | 0.995 |
| mean | 0.065 | 4.671 | 5.484 |
| max | 0.084 | 4.758 | 0.556 |

All 50 ciphertext handles and expected plaintexts per operation/platform were distinct; every result was validated. Short CoFHE results include an HTTP sealoutput call, not only a handle read. This establishes observed successful retrieval, not instantaneous FHE or the absence of backend caching. Imported notarization ciphertexts were encrypted and approved before submission; this is not a fresh arithmetic evaluation.

## Client interference

During notarization baseline invoke/sign/submit spans average 6.262 seconds, versus 0.414 for Zama and 0.407 for CoFHE; baseline add spans average 0.444 seconds. Shared-process synchronous proof work is a plausible explanation supported by the timing pattern, but exact event-loop stalls were not independently instrumented. The reported span includes RPC preparation and scheduling delays and is not a pure broadcast timer.

Baseline notarization startedAt-to-validated averages 16.063 seconds, compared with transaction-invocation-to-validated 13.151 seconds. Therefore the prior baseline full-lifecycle figure omitted pre-invocation scheduling delay. Wall-clock-derived diagnostics are approximate; monotonic measured spans remain the primary durations.

These data do not show baseline computation slower than encrypted computation. Receipt and notarization end-to-end rankings are confounded by different preparation/submission times and shared-client scheduling. Do not subtract ready-repeat decryption or assume fixed extra block delays to estimate internal FHE. Use isolated preparation workers and a submission barrier for a new controlled comparison.
