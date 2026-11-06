# Paired lifecycle inference

Calculated at the user's explicit request after completion of the descriptive segmented analysis. Raw campaign reports are unchanged.

Estimand: geometric mean of round-matched lifecycle ratios. The lifecycle remains inputPreparationMs + confirmationMs + postReceiptToValidatedPlaintextMs, not the larger total including estimation/signing.
Successful pairs only: 50 except comparisons involving Zama add, which use 49. Original and continuation segment sample counts stay fixed during resampling.

Primary inference: two-sided null-centered circular-block-bootstrap test on mean log-ratio, B=199999, block length=3. Basic 95% bootstrap intervals on the log scale are exponentiated. The displayed p-values are Holm-adjusted across all 15 hypotheses. CIs are pointwise.
The raw two-sided Monte Carlo p-value has minimum resolution 2/(B+1)=0.00001. Values printed as <0.001 are bounded reports, never zeros. Repeated small values can reflect finite resampling resolution.
Exploratory conditional inference assumes approximate within-segment stationarity and weak dependence; preserving segments is not a cure for network confounding or selective success. This is not a causal benchmark of isolated computation.

| Operation | Numerator / denominator | n | Ratio | Pointwise 95% CI | Holm p (15) | Reject at .05 | Stable for block lengths 1,2,3,5 |
|---|---|---:|---:|---|---:|---|---|
| notarize | zama/baseline | 50 | 3.566531 | [3.296432, 3.814288] | 0.00015 | True | True |
| notarize | fhenix/baseline | 50 | 2.614616 | [2.425696, 2.784545] | 0.00015 | True | True |
| notarize | zama/fhenix | 50 | 1.364074 | [1.344832, 1.382329] | 0.00015 | True | True |
| add | zama/baseline | 49 | 2.247681 | [2.134632, 2.361491] | 0.00015 | True | True |
| add | fhenix/baseline | 50 | 1.082610 | [1.064490, 1.098981] | 0.00015 | True | True |
| add | zama/fhenix | 49 | 2.073084 | [1.965909, 2.181178] | 0.00015 | True | True |
| mul_scalar | zama/baseline | 50 | 2.082137 | [1.959336, 2.216467] | 0.00015 | True | True |
| mul_scalar | fhenix/baseline | 50 | 1.120419 | [1.098031, 1.142165] | 0.00015 | True | True |
| mul_scalar | zama/fhenix | 50 | 1.858355 | [1.757176, 1.961825] | 0.00015 | True | True |
| mean | zama/baseline | 50 | 2.231866 | [2.026957, 2.440240] | 0.00015 | True | True |
| mean | fhenix/baseline | 50 | 2.181109 | [2.028012, 2.346800] | 0.00015 | True | True |
| mean | zama/fhenix | 50 | 1.023271 | [0.990534, 1.055157] | 0.15935 | False | True |
| max | zama/baseline | 50 | 2.192613 | [2.087991, 2.294975] | 0.00015 | True | True |
| max | fhenix/baseline | 50 | 1.062963 | [1.052102, 1.073488] | 0.00015 | True | True |
| max | zama/fhenix | 50 | 2.062736 | [1.966462, 2.155922] | 0.00015 | True | True |

## Block-length sensitivity

| Operation | Ratio | Block length | CI | Raw p | Holm p (15) |
|---|---|---:|---|---:|---:|
| notarize | zama/baseline | 1 | [3.295529, 3.831949] | 1e-05 | 0.00015 |
| notarize | fhenix/baseline | 1 | [2.434753, 2.787901] | 1e-05 | 0.00015 |
| notarize | zama/fhenix | 1 | [1.344305, 1.384057] | 1e-05 | 0.00015 |
| add | zama/baseline | 1 | [2.119688, 2.381992] | 1e-05 | 0.00015 |
| add | fhenix/baseline | 1 | [1.062545, 1.100630] | 1e-05 | 0.00015 |
| add | zama/fhenix | 1 | [1.960300, 2.190599] | 1e-05 | 0.00015 |
| mul_scalar | zama/baseline | 1 | [1.933394, 2.243179] | 1e-05 | 0.00015 |
| mul_scalar | fhenix/baseline | 1 | [1.095870, 1.144580] | 1e-05 | 0.00015 |
| mul_scalar | zama/fhenix | 1 | [1.742280, 1.983714] | 1e-05 | 0.00015 |
| mean | zama/baseline | 1 | [2.053423, 2.417958] | 1e-05 | 0.00015 |
| mean | fhenix/baseline | 1 | [2.037142, 2.338820] | 1e-05 | 0.00015 |
| mean | zama/fhenix | 1 | [0.993964, 1.050834] | 0.11685 | 0.11685 |
| max | zama/baseline | 1 | [2.085084, 2.301354] | 1e-05 | 0.00015 |
| max | fhenix/baseline | 1 | [1.049578, 1.075613] | 1e-05 | 0.00015 |
| max | zama/fhenix | 1 | [1.965412, 2.160185] | 1e-05 | 0.00015 |
| notarize | zama/baseline | 2 | [3.302283, 3.814052] | 1e-05 | 0.00015 |
| notarize | fhenix/baseline | 2 | [2.431767, 2.779296] | 1e-05 | 0.00015 |
| notarize | zama/fhenix | 2 | [1.344411, 1.382720] | 1e-05 | 0.00015 |
| add | zama/baseline | 2 | [2.129621, 2.382318] | 1e-05 | 0.00015 |
| add | fhenix/baseline | 2 | [1.063150, 1.099934] | 1e-05 | 0.00015 |
| add | zama/fhenix | 2 | [1.965641, 2.193936] | 1e-05 | 0.00015 |
| mul_scalar | zama/baseline | 2 | [1.957816, 2.219103] | 1e-05 | 0.00015 |
| mul_scalar | fhenix/baseline | 2 | [1.099429, 1.141413] | 1e-05 | 0.00015 |
| mul_scalar | zama/fhenix | 2 | [1.757782, 1.963583] | 1e-05 | 0.00015 |
| mean | zama/baseline | 2 | [2.030770, 2.441686] | 1e-05 | 0.00015 |
| mean | fhenix/baseline | 2 | [2.026887, 2.350890] | 1e-05 | 0.00015 |
| mean | zama/fhenix | 2 | [0.992650, 1.052906] | 0.13393 | 0.13393 |
| max | zama/baseline | 2 | [2.090742, 2.294961] | 1e-05 | 0.00015 |
| max | fhenix/baseline | 2 | [1.051328, 1.074506] | 1e-05 | 0.00015 |
| max | zama/fhenix | 2 | [1.968434, 2.156711] | 1e-05 | 0.00015 |
| notarize | zama/baseline | 3 | [3.296432, 3.814288] | 1e-05 | 0.00015 |
| notarize | fhenix/baseline | 3 | [2.425696, 2.784545] | 1e-05 | 0.00015 |
| notarize | zama/fhenix | 3 | [1.344832, 1.382329] | 1e-05 | 0.00015 |
| add | zama/baseline | 3 | [2.134632, 2.361491] | 1e-05 | 0.00015 |
| add | fhenix/baseline | 3 | [1.064490, 1.098981] | 1e-05 | 0.00015 |
| add | zama/fhenix | 3 | [1.965909, 2.181178] | 1e-05 | 0.00015 |
| mul_scalar | zama/baseline | 3 | [1.959336, 2.216467] | 1e-05 | 0.00015 |
| mul_scalar | fhenix/baseline | 3 | [1.098031, 1.142165] | 1e-05 | 0.00015 |
| mul_scalar | zama/fhenix | 3 | [1.757176, 1.961825] | 1e-05 | 0.00015 |
| mean | zama/baseline | 3 | [2.026957, 2.440240] | 1e-05 | 0.00015 |
| mean | fhenix/baseline | 3 | [2.028012, 2.346800] | 1e-05 | 0.00015 |
| mean | zama/fhenix | 3 | [0.990534, 1.055157] | 0.15935 | 0.15935 |
| max | zama/baseline | 3 | [2.087991, 2.294975] | 1e-05 | 0.00015 |
| max | fhenix/baseline | 3 | [1.052102, 1.073488] | 1e-05 | 0.00015 |
| max | zama/fhenix | 3 | [1.966462, 2.155922] | 1e-05 | 0.00015 |
| notarize | zama/baseline | 5 | [3.293038, 3.802789] | 1e-05 | 0.00015 |
| notarize | fhenix/baseline | 5 | [2.423791, 2.781117] | 1e-05 | 0.00015 |
| notarize | zama/fhenix | 5 | [1.343822, 1.382957] | 1e-05 | 0.00015 |
| add | zama/baseline | 5 | [2.127771, 2.368695] | 1e-05 | 0.00015 |
| add | fhenix/baseline | 5 | [1.063709, 1.099628] | 1e-05 | 0.00015 |
| add | zama/fhenix | 5 | [1.955389, 2.190224] | 1e-05 | 0.00015 |
| mul_scalar | zama/baseline | 5 | [1.949083, 2.230195] | 1e-05 | 0.00015 |
| mul_scalar | fhenix/baseline | 5 | [1.097571, 1.143339] | 1e-05 | 0.00015 |
| mul_scalar | zama/fhenix | 5 | [1.746999, 1.971282] | 1e-05 | 0.00015 |
| mean | zama/baseline | 5 | [2.026486, 2.412673] | 1e-05 | 0.00015 |
| mean | fhenix/baseline | 5 | [2.037115, 2.323338] | 1e-05 | 0.00015 |
| mean | zama/fhenix | 5 | [0.986970, 1.057655] | 0.20019 | 0.20019 |
| max | zama/baseline | 5 | [2.085055, 2.290020] | 1e-05 | 0.00015 |
| max | fhenix/baseline | 5 | [1.053353, 1.072238] | 1e-05 | 0.00015 |
| max | zama/fhenix | 5 | [1.962098, 2.152347] | 1e-05 | 0.00015 |

## Sources

- https://stat.ethz.ch/R-manual/R-patched/RHOME/library/boot/html/tsboot.html
- https://stat.ethz.ch/CRAN/web/packages/boot.pval/vignettes/boot_summary.html
- https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html

Reproduction: run compute_paired_inference.py with the repository .venv Python. Seeds and every paired observation are in paired-inference.json.
Source report SHA256: 1d2461641eb45460379ee8e7aeea1ce58c8f5700419b7659ded945e42b59b63d
