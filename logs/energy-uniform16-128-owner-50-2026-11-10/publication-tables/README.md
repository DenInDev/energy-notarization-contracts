# Completed 16/128-bit energy tables

Copy tables.tex into the paper, or use the individual fragments. main.tex is only a compilation check, not a replacement paper.

Six performance tables preserve the earlier six-column layout. The first latency header is Preparation because it includes encryption/proofs plus transaction preparation/signing. All latency columns use the same success subset, so the lifecycle mean is consistent with their sum. Lifecycle CV is computed from per-observation totals, not by adding component CVs.

Zama128 mean: 49 successful latency observations, marked with a dagger; gas uses all 50 confirmed transactions. No missing latency is filled. Other performance rows use n=50. Mean gas excludes deployment and warmups. Full ETH costs remain in the campaign results.

Owner registration uses eaddress (160 bits) at both arithmetic widths. The six operations include set_meter_owner. Separate view/decrypt tables describe already-ready persisted max retrieval, not fresh FHE execution.

network-tables.tex preserves the paper-style client observed intervals. Block ranges and mean gas/target come from the read-only canonical audit and all 300 measured primary receipts per platform. Intervals include the interruption in each segmented campaign. network-inclusion-intervals.tex is an optional alternative using canonical block timestamps with distinct labels; do not mix the interval definitions silently.

The canonical audit was recorded at 2026-11-10T15:37:38.744Z; not every containing block was finalized at that checkpoint. These tables reuse that evidence and issue no new network requests during the currently running study.

The original baseline/Zama/Fhenix labels and deployment label are retained for the 16-bit tables. 128-bit labels have -128 suffixes. Replace the old tables instead of including duplicate labels. Captions identify the arithmetic width.

Files: tables.tex (all 10 tables), performance-tables.tex (6), network-tables.tex (2), view-decrypt-tables.tex (2), network-inclusion-intervals.tex (optional), individual platform-width files, and table-values-and-provenance.json (full precision and denominators).

## Statistical comparisons

`paired-comparison-tables.tex` contains the four state-changing lifecycle comparison tables (baseline comparisons and Zama/Fhenix at each width). `view-decrypt-comparison-tables.tex` contains four separate already-ready retrieval comparison tables. `statistical-comparison-tables.tex` contains all eight; `tables-with-statistics.tex` combines all 18 performance/network/descriptive/statistical tables. Add `\usepackage{multirow}` to the paper preamble.

All 42 comparisons are jointly Holm-adjusted. The bootstrap uses 199999 resamples, block length three, and fixed original/continuation segment counts; sensitivity uses lengths 1/2/5. Lifecycle matches the new preparation-inclusive performance tables. CI intervals are pointwise. See `paired-inference-methods.md`, `statistical-methods.tex`, and `paired-inference.json`. The original 16-bit statistical table labels are preserved and the others have unique suffixes.

Both performance and statistical compilation checks succeeded with the built-in LaTeX compiler. All sensitivity decisions were stable across lengths 1/2/3/5.
