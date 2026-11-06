# Baseline latency audit

The reported durations are client-observed transaction lifecycles, not EVM execution times.

| Operation | Baseline invocation mean s | Receipt wait mean s | Receipt wait median s | Post-receipt mean s |
|---|---:|---:|---:|---:|
| notarize | 6.610 | 12.749 | 5.894 | 0.094 |
| add | 0.468 | 11.662 | 6.205 | 0.061 |
| mul_scalar | 0.452 | 9.021 | 5.315 | 0.065 |
| mean | 0.427 | 9.623 | 5.491 | 0.109 |
| max | 0.442 | 8.259 | 4.681 | 0.064 |

- The displayed baseline notarization completion is mean6.6095s invoke/sign/submit +12.7490s receipt wait +0.0936s result read/validation. It is not EVM execution time.
- Concurrent workers are async callbacks in a single Node process, not CPU-isolated processes. CoFHE prove events report usedWorker:false. On run1, the 5.406s main-thread proof interval overlaps the baseline6.164s invoke/sign/submit span. This demonstrates client interference in the measured interval; there is no event-loop-delay probe that attributes every millisecond.
- FHE notarization timers start after input preparation, on average8.283s (Zama) and6.873s (Fhenix) after baseline invocation.37/50 notarization triples share a block. Unequal time origins prevent interpreting timer rankings as computation rankings.
- Baseline receipt wait is heavy-tailed: notarization mean12.749s vsmedian5.894s, maximum66.514s. Non-notarization baseline submission spans are0.427-0.468s on average.
- Read-only canonical block checks for run27 addition show regular12s block timestamps during a54.768s receipt-wait span; receipt was observed1.799s after its block timestamp. This is not a55-second block interval or a55-second post-inclusion wait.
- The exact source of delayed inclusion (RPC propagation, mempool, builder policy/fees) cannot be identified from these logs. Observed examples have priority fee2wei, blocks not full and nonce-ordered confirmed preceding operations; these facts alone do not prove a specific cause.
- Fix the comparison design using separate CPU worker processes, precompute inputs before a common submission barrier, and instrument raw send start/ack plus observed receipt separately. Historical measurements must remain unchanged.

Source hashes, complete summaries and a run1 overlap example are in baseline-timing-audit.json; canonical RPC block/fee evidence is in baseline-chain-evidence.json. Original report unchanged.
