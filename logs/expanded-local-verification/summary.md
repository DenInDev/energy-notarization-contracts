# Expanded experiment results

Campaign finished: true. Mock execution: true.

Latency statistics describe validated successes only; counts retain failures, pending requests and unattempted work.
Administrative completion timeouts are right-censored observations, never zero-latency samples. SDK errors are separate failures.
No percentile or mean of the full completion-time distribution is inferred from success-only latencies.
Throughput uses the entire measured window including timeout waits; warmup/setup are excluded. Tail percentiles from small samples are exploratory.

| Case | Platform | Success / attempted / planned | Timeouts | Median successful ms | Validated requests/s |
| --- | --- | --- | --- | --- | --- |
| width-add-w8-n2-d1-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 2.2 | — |
| width-mul-w8-n2-d1-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 2.2 | — |
| width-compare_select-w8-n2-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 2.0 | — |
| width-tariff-w8-n2-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.8 | — |
| width-add-w64-n2-d1-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.9 | — |
| width-mul-w64-n2-d1-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 2.0 | — |
| width-compare_select-w64-n2-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.8 | — |
| width-tariff-w64-n2-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.8 | — |
| inputs-import-w64-n1-d0-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.9 | — |
| inputs-import-w64-n4-d0-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.9 | — |
| depth-sum_linear-w64-n4-d3-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.8 | — |
| depth-sum_tree-w64-n4-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.7 | — |
| chain-chain-w64-n2-d2-l1-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 1.6 | — |
| chain-chain-w64-n2-d8-l4-u1-s0-t0 | baseline | 1 / 1 / 1 | 0 | 5.2 | — |
| state-state_read-w64-n0-d0-l1-u1-s16-t1 | baseline | 1 / 1 / 1 | 0 | 1.8 | — |
| state-state_sum-w64-n0-d3-l1-u1-s16-t4 | baseline | 1 / 1 / 1 | 0 | 1.5 | — |
| concurrency-load_add-w64-n2-d1-l1-u1-s0-t0 | baseline | 8 / 8 / 8 | 0 | 2.7 | 362.835 |
| concurrency-load_add-w64-n2-d1-l1-u2-s0-t0 | baseline | 8 / 8 / 8 | 0 | 4.3 | 465.398 |
| concurrency-load_add-w64-n2-d1-l1-u4-s0-t0 | baseline | 8 / 8 / 8 | 0 | 8.7 | 449.946 |
| concurrency-load_add-w64-n2-d1-l1-u8-s0-t0 | baseline | 8 / 8 / 8 | 0 | 17.0 | 461.425 |
