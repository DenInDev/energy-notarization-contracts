# Paired statistical comparisons: completed uniform energy workloads

The four main lifecycle tables preserve the earlier baseline and direct-comparison columns. Four separate tables cover the already-ready view/decrypt endpoint. Original 16-bit labels are reused; 128-bit and view labels have unique suffixes. Add \usepackage{multirow} to the paper preamble.

Lifecycle includes complete preparation/signing and transaction-to-validated plaintext, exactly matching the new performance tables. This differs from the older October input-encryption-only lifecycle definition.

Arithmetic means are computed on the same successful round-matched pairs. The paired ratio is geometric and need not equal the ratio of displayed arithmetic means. Overhead = 100*(ratio-1). Baseline means are merged when pair sets match; the two 128-bit mean baseline values remain distinct because their pair sets differ.

Primary inference: two-sided null-centered circular moving-block bootstrap, 199999 replicates, block length 3, resampled separately within each observation segment with fixed segment sizes. Basic pointwise 95% log-scale CIs are exponentiated. Holm adjustment is joint over all 42 comparisons across both widths and both endpoints. CIs are pointwise, not simultaneous. Sensitivity uses block lengths 1,2,3,5.

Zama128 mean comparisons use n=49, excluding the failed observation from both sides. All other comparisons use n=50. The raw failed observation remains intact. Late correctness recovery does not enter timing. All pairs and segment assignments are in paired-inference.json.

These exploratory results are conditional on successful retrievals and assumptions about stationarity/dependence within segments. Pairing and segmentation do not remove public-network confounding or outcome-dependent missingness. A non-significant result does not prove equivalence. Low p-values at finite resampling resolution are not zeros.

| Width | Endpoint | Operation | Candidate/reference | n | Ratio | Pointwise 95% CI | Holm p (42) | Reject .05 | Stable for lengths 1,2,3,5 |
|---:|---|---|---|---:|---:|---|---:|---|---|
| 16 | client_lifecycle | set_meter_owner | zama/baseline | 50 | 4.198027 | [3.713779, 4.744725] | 0.00042 | True | True |
| 16 | client_lifecycle | set_meter_owner | fhenix/baseline | 50 | 3.340294 | [2.992894, 3.724371] | 0.00042 | True | True |
| 16 | client_lifecycle | set_meter_owner | zama/fhenix | 50 | 1.256784 | [1.237164, 1.277146] | 0.00042 | True | True |
| 16 | client_lifecycle | notarize | zama/baseline | 50 | 3.215771 | [3.004166, 3.467291] | 0.00042 | True | True |
| 16 | client_lifecycle | notarize | fhenix/baseline | 50 | 2.554178 | [2.407500, 2.726029] | 0.00042 | True | True |
| 16 | client_lifecycle | notarize | zama/fhenix | 50 | 1.259024 | [1.245332, 1.274372] | 0.00042 | True | True |
| 16 | client_lifecycle | add | zama/baseline | 50 | 1.544596 | [1.487796, 1.608809] | 0.00042 | True | True |
| 16 | client_lifecycle | add | fhenix/baseline | 50 | 1.023409 | [1.018284, 1.028596] | 0.00042 | True | True |
| 16 | client_lifecycle | add | zama/fhenix | 50 | 1.509265 | [1.453719, 1.570926] | 0.00042 | True | True |
| 16 | client_lifecycle | mul_scalar | zama/baseline | 50 | 1.579348 | [1.528139, 1.637749] | 0.00042 | True | True |
| 16 | client_lifecycle | mul_scalar | fhenix/baseline | 50 | 1.055657 | [1.035082, 1.075765] | 0.00042 | True | True |
| 16 | client_lifecycle | mul_scalar | zama/fhenix | 50 | 1.496081 | [1.453516, 1.543886] | 0.00042 | True | True |
| 16 | client_lifecycle | mean | zama/baseline | 50 | 1.561920 | [1.507343, 1.621877] | 0.00042 | True | True |
| 16 | client_lifecycle | mean | fhenix/baseline | 50 | 1.127157 | [1.089060, 1.161593] | 0.00042 | True | True |
| 16 | client_lifecycle | mean | zama/fhenix | 50 | 1.385717 | [1.328645, 1.450134] | 0.00042 | True | True |
| 16 | client_lifecycle | max | zama/baseline | 50 | 1.631975 | [1.576858, 1.689318] | 0.00042 | True | True |
| 16 | client_lifecycle | max | fhenix/baseline | 50 | 1.038426 | [1.022122, 1.052534] | 0.00042 | True | True |
| 16 | client_lifecycle | max | zama/fhenix | 50 | 1.571585 | [1.515903, 1.629478] | 0.00042 | True | True |
| 16 | already_ready_retrieval | view_decrypt | zama/baseline | 50 | 31.912706 | [29.075324, 34.909834] | 0.00042 | True | True |
| 16 | already_ready_retrieval | view_decrypt | fhenix/baseline | 50 | 2.331168 | [2.163927, 2.503692] | 0.00042 | True | True |
| 16 | already_ready_retrieval | view_decrypt | zama/fhenix | 50 | 13.689577 | [12.261215, 15.354329] | 0.00042 | True | True |
| 128 | client_lifecycle | set_meter_owner | zama/baseline | 50 | 3.359807 | [2.956976, 3.805893] | 0.00042 | True | True |
| 128 | client_lifecycle | set_meter_owner | fhenix/baseline | 50 | 2.635035 | [2.348507, 2.949697] | 0.00042 | True | True |
| 128 | client_lifecycle | set_meter_owner | zama/fhenix | 50 | 1.275052 | [1.251426, 1.301018] | 0.00042 | True | True |
| 128 | client_lifecycle | notarize | zama/baseline | 50 | 2.517058 | [2.332174, 2.721878] | 0.00042 | True | True |
| 128 | client_lifecycle | notarize | fhenix/baseline | 50 | 2.040833 | [1.900691, 2.191801] | 0.00042 | True | True |
| 128 | client_lifecycle | notarize | zama/fhenix | 50 | 1.233348 | [1.215038, 1.251136] | 0.00042 | True | True |
| 128 | client_lifecycle | add | zama/baseline | 50 | 1.626239 | [1.542950, 1.708543] | 0.00042 | True | True |
| 128 | client_lifecycle | add | fhenix/baseline | 50 | 1.059477 | [1.037736, 1.078900] | 0.00042 | True | True |
| 128 | client_lifecycle | add | zama/fhenix | 50 | 1.534945 | [1.450946, 1.616471] | 0.00042 | True | True |
| 128 | client_lifecycle | mul_scalar | zama/baseline | 50 | 1.627987 | [1.505444, 1.734476] | 0.00042 | True | True |
| 128 | client_lifecycle | mul_scalar | fhenix/baseline | 50 | 1.328230 | [1.285678, 1.369789] | 0.00042 | True | True |
| 128 | client_lifecycle | mul_scalar | zama/fhenix | 50 | 1.225682 | [1.152466, 1.278802] | 0.00042 | True | True |
| 128 | client_lifecycle | mean | zama/baseline | 49 | 1.641586 | [1.549966, 1.739913] | 0.00042 | True | True |
| 128 | client_lifecycle | mean | fhenix/baseline | 50 | 2.963660 | [2.695371, 3.273352] | 0.00042 | True | True |
| 128 | client_lifecycle | mean | zama/fhenix | 49 | 0.551403 | [0.525972, 0.576676] | 0.00042 | True | True |
| 128 | client_lifecycle | max | zama/baseline | 50 | 1.525205 | [1.473572, 1.577667] | 0.00042 | True | True |
| 128 | client_lifecycle | max | fhenix/baseline | 50 | 1.042983 | [1.006974, 1.072740] | 0.02136 | True | True |
| 128 | client_lifecycle | max | zama/fhenix | 50 | 1.462348 | [1.399337, 1.530678] | 0.00042 | True | True |
| 128 | already_ready_retrieval | view_decrypt | zama/baseline | 50 | 27.105991 | [23.961992, 30.551224] | 0.00042 | True | True |
| 128 | already_ready_retrieval | view_decrypt | fhenix/baseline | 50 | 2.335969 | [2.115855, 2.582325] | 0.00042 | True | True |
| 128 | already_ready_retrieval | view_decrypt | zama/fhenix | 50 | 11.603746 | [10.592072, 12.704820] | 0.00042 | True | True |

Method references:

- https://stat.ethz.ch/R-manual/R-patched/library/boot/html/tsboot.html
- https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html
