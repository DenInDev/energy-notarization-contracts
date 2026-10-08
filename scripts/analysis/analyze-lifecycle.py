"""Analyze a complete interleaved lifecycle report without reclassifying SDK times."""

import argparse
import hashlib
import itertools
import json
import math
import platform
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

OPERATIONS = ("notarize", "add", "mul_scalar", "mean", "max")
PLATFORMS = ("baseline", "zama", "fhenix")
METRICS = ("confirmationMs", "transactionToValidatedPlaintextMs")


def holm_adjust(pvalues):
    order = sorted(range(len(pvalues)), key=pvalues.__getitem__)
    adjusted = [None] * len(pvalues)
    previous = 0.0
    for rank, index in enumerate(order):
        previous = max(previous, min(1.0, (len(pvalues) - rank) * pvalues[index]))
        adjusted[index] = previous
    return adjusted


def descriptive(values):
    if not values:
        return {"n": 0, "mean": None, "stddev": None, "median": None, "p95": None}
    array = np.asarray(values, dtype=float)
    mean = float(np.mean(array))
    sd = float(np.std(array, ddof=1)) if len(array) > 1 else None
    return {
        "n": len(array),
        "mean": mean,
        "stddev": sd,
        "relativeStdPct": sd / mean * 100 if sd is not None and mean else None,
        "median": float(np.median(array)),
        "p95": float(np.percentile(array, 95)),
        "min": float(np.min(array)),
        "max": float(np.max(array)),
    }


def block_bootstrap_interval(values, seed, block_length=3, resamples=20000):
    array = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    starts = rng.integers(0, len(array), size=(resamples, math.ceil(len(array) / block_length)))
    indices = (starts[:, :, None] + np.arange(block_length)) % len(array)
    means = array[indices.reshape(resamples, -1)[:, :len(array)]].mean(axis=1)
    return [float(value) for value in np.percentile(means, [2.5, 97.5])]


def block_bootstrap_geometric_ratio(log_ratios, seed, block_length=3, resamples=20000):
    low, high = block_bootstrap_interval(log_ratios, seed, block_length, resamples)
    return [math.exp(low), math.exp(high)]


def client_lifecycle_ms(row):
    return float(row.get("inputPreparationMs", 0.0)) + float(row["transactionToValidatedPlaintextMs"])


def lag_one(values):
    array = np.asarray(values, dtype=float)
    if len(array) < 3 or np.std(array[:-1]) == 0 or np.std(array[1:]) == 0:
        return None
    return float(np.corrcoef(array[:-1], array[1:])[0, 1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    raw = args.report.read_bytes()
    report = json.loads(raw)
    if not report.get("complete") or report.get("selectedPlatforms") != list(PLATFORMS):
        raise ValueError("Analysis requires a complete all-three-platform interleaved campaign")
    runs = report["runs"]
    measured = [row for row in report["samples"] if not row["warmup"]]
    index = {}
    for row in measured:
        key = (row["platform"], row["operation"], row["run"])
        if key in index or row["status"] != "ok":
            raise ValueError(f"Duplicate or unsuccessful observation: {key}")
        if row["plaintext"] != row["expectedPlaintext"]:
            raise ValueError(f"Plaintext mismatch: {key}")
        if not row.get("transactionHash") or row.get("blockTimestamp") is None or row.get("metadataError"):
            raise ValueError(f"Missing transaction/block provenance: {key}")
        if row["platform"] != "baseline" and not (row.get("readyDecryptError") or row.get("alreadyReadyDecryptMs") is not None):
            raise ValueError(f"Missing ancillary ready-repeat outcome: {key}")
        if abs(row["transactionToValidatedPlaintextMs"] - row["confirmationMs"] - row["postReceiptToValidatedPlaintextMs"]) > 0.01:
            raise ValueError(f"Inconsistent timing identity: {key}")
        index[key] = row
    if len(index) != runs * len(OPERATIONS) * len(PLATFORMS):
        raise ValueError("Unexpected number of measured observations")
    for comparison in report["schedule"]:
        for position, name in enumerate(comparison["order"], 1):
            key = (name, comparison["operation"], comparison["run"])
            if index[key]["orderPosition"] != position:
                raise ValueError(f"Recorded submission order differs from plan: {key}")
    for operation in OPERATIONS:
        planned = [row for row in report["schedule"] if row["operation"] == operation]
        if len(planned) != runs or {row["run"] for row in planned} != set(range(1, runs + 1)):
            raise ValueError("Planned round coverage is invalid")
        for name in PLATFORMS:
            counts = [sum(row["order"][position] == name for row in planned) for position in range(3)]
            if max(counts) - min(counts) > 1:
                raise ValueError("Submission positions are not balanced")

    summary = []
    provenance = []
    for name in PLATFORMS:
        rows = [row for row in measured if row["platform"] == name]
        provenance.append({
            "platform": name,
            "address": next(row["address"] for row in report["setup"] if row["platform"] == name),
            "firstMeasuredBlock": min(row["blockNumber"] for row in rows),
            "lastMeasuredBlock": max(row["blockNumber"] for row in rows),
            "measuredApplicationTransactions": len(rows),
            "observedRetrievalTransportRetries": sum(entry["stage"].endswith(".transport_retry") for row in rows for entry in row["stages"]),
            "failedReadyDecryptRepeats": sum(bool(row.get("readyDecryptError")) for row in rows),
            "measuredGasCostWei": str(sum(int(row["gasCostWei"]) for row in rows)),
            "blockGasTargetUtilization": descriptive([row["blockTargetUtilization"] for row in rows]),
        })
        for operation in OPERATIONS:
            rows = [index[(name, operation, run)] for run in range(1, runs + 1)]
            summary.append({
                "platform": name,
                "operation": operation,
                "readyDecryptFailures": sum(bool(row.get("readyDecryptError")) for row in rows),
                **{metric: descriptive([row[metric] for row in rows if metric in row]) for metric in (
                    "gasUsed", "inputPreparationMs", "confirmationMs", "transactionToValidatedPlaintextMs",
                    "postReceiptToValidatedPlaintextMs", "alreadyReadyDecryptMs",
                )},
                "clientLifecycleMs": descriptive([client_lifecycle_ms(row) for row in rows]),
            })

    comparisons = []
    for metric, operation, pair in itertools.product(METRICS, OPERATIONS, itertools.combinations(PLATFORMS, 2)):
        left, right = pair
        a = np.array([index[(left, operation, run)][metric] for run in range(1, runs + 1)])
        b = np.array([index[(right, operation, run)][metric] for run in range(1, runs + 1)])
        difference = a - b
        test = stats.ttest_rel(a, b, alternative="two-sided")
        interval = test.confidence_interval(0.95)
        if not math.isfinite(float(test.pvalue)):
            raise ValueError("Degenerate inferential sample; do not silently interpret NaN")
        seed = int.from_bytes(hashlib.sha256(f"{report['scheduleSeed']}:{metric}:{operation}:{left}:{right}".encode()).digest()[:8], "big")
        comparisons.append({
            "metric": metric,
            "operation": operation,
            "left": left,
            "right": right,
            "pairedRounds": runs,
            "differenceMs": descriptive(difference.tolist()),
            "pairedTStatistic": float(test.statistic),
            "pUnadjusted": float(test.pvalue),
            "pointwise95PctMeanDifferenceCI": [float(interval.low), float(interval.high)],
            "circularBlockBootstrap95PctCI": block_bootstrap_interval(difference, seed),
            "pairedDifferenceLagOneCorrelation": lag_one(difference),
        })
    for row, adjusted in zip(comparisons, holm_adjust([row["pUnadjusted"] for row in comparisons])):
        row["pHolmAll30Comparisons"] = adjusted
        row["rejectEqualMeansAt05AfterHolm"] = adjusted < 0.05

    lifecycle_comparisons = []
    for operation, name in itertools.product(OPERATIONS, ("zama", "fhenix")):
        baseline = np.asarray([client_lifecycle_ms(index[("baseline", operation, run)]) for run in range(1, runs + 1)])
        candidate = np.asarray([client_lifecycle_ms(index[(name, operation, run)]) for run in range(1, runs + 1)])
        log_ratios = np.log(candidate / baseline)
        test = stats.ttest_1samp(log_ratios, 0.0, alternative="two-sided")
        if not math.isfinite(float(test.pvalue)):
            raise ValueError("Degenerate lifecycle ratio sample; do not silently interpret NaN")
        ratio = math.exp(float(np.mean(log_ratios)))
        seed = int.from_bytes(
            hashlib.sha256(f"{report['scheduleSeed']}:clientLifecycleMs:{operation}:{name}".encode()).digest()[:8],
            "big",
        )
        baseline_gas = np.asarray([index[("baseline", operation, run)]["gasUsed"] for run in range(1, runs + 1)])
        candidate_gas = np.asarray([index[(name, operation, run)]["gasUsed"] for run in range(1, runs + 1)])
        lifecycle_comparisons.append({
            "operation": operation,
            "configuration": name,
            "pairedRounds": runs,
            "baselineClientLifecycleMs": descriptive(baseline.tolist()),
            "configurationClientLifecycleMs": descriptive(candidate.tolist()),
            "geometricMeanLifecycleRatio": ratio,
            "lifecycleOverheadPct": (ratio - 1.0) * 100.0,
            "circularBlockBootstrap95PctRatioCI": block_bootstrap_geometric_ratio(log_ratios, seed),
            "pUnadjustedLogRatio": float(test.pvalue),
            "baselineGasUsed": descriptive(baseline_gas.tolist()),
            "configurationGasUsed": descriptive(candidate_gas.tolist()),
            "arithmeticMeanGasRatio": float(np.mean(candidate_gas) / np.mean(baseline_gas)),
        })
    for row, adjusted in zip(
        lifecycle_comparisons,
        holm_adjust([row["pUnadjustedLogRatio"] for row in lifecycle_comparisons]),
    ):
        row["pHolmAll10LifecycleComparisons"] = adjusted
        row["rejectUnitLifecycleRatioAt05AfterHolm"] = adjusted < 0.05

    def stage_stats(name, stage):
        return descriptive([entry["durationMs"] for row in measured if row["platform"] == name and row["operation"] == "notarize"
                            for entry in row["stages"] if entry["stage"] == stage and entry["status"] == "ok"])

    sdk_summary = []
    for label, zama_stage, fhenix_stage in (
        ("Ciphertext + ZKP", "encrypt.local_ciphertext_and_zkproof", "encrypt.sdk_observed.prove"),
        ("Input approval", "encrypt.remote_input_approval", "encrypt.sdk_observed.verify"),
        ("Key fetch/preparation", "not_applicable", "encrypt.sdk_observed.fetchKeys"),
        ("First SDK decrypt", "completion.sdk_user_decrypt", "completion.sdk_sealoutput_and_unseal"),
    ):
        sdk_summary.append({"stage": label, "zama": stage_stats("zama", zama_stage), "fhenix": stage_stats("fhenix", fhenix_stage)})
    for metric, label in (("inputPreparationMs", "Total input preparation"), ("alreadyReadyDecryptMs", "Ready decrypt + auth")):
        sdk_summary.append({"stage": label, **{name: next(row[metric] for row in summary if row["platform"] == name and row["operation"] == "notarize")
                                               for name in ("zama", "fhenix")}})

    result = {
        "sourceReportSha256": hashlib.sha256(raw).hexdigest(),
        "experimentalPeriod": {
            "startedAt": report["startedAt"], "completedAt": report["completedAt"],
            "measuredSamplesStartedAt": min(row.get("startedAt", report["startedAt"]) for row in measured),
            "firstMeasuredTransactionInvokedAt": min(row.get("transactionStartedAt", report["startedAt"]) for row in measured),
            "lastMeasuredPlaintextValidatedAt": max(row.get("plaintextValidatedAt", report["completedAt"]) for row in measured),
            "scope": "campaign start/end include excluded setup; measured timestamps are client wall-clock context, not latency clocks",
        },
        "analysisVersions": {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__},
        "methodology": {
            "pairing": "same operation and round; nearby observations, not identical network conditions",
            "tests": "two-sided paired t-tests of round-matched mean differences; approximate inference assumes independent round differences",
            "multiplicity": "Holm adjustment across all 30 operation/configuration/receipt-and-completion comparisons",
            "uncertainty": "sample SD; pointwise paired-t 95% CIs are not simultaneous; circular paired-difference block bootstrap is a sensitivity analysis (length 3, 20000 resamples)",
            "scope": "observable deployment-level performance, not pure TFHE compute; serial correlation/heavy tails can limit paired-t inference",
            "readyDecrypt": "reported separately by operation; primary classic ready-decrypt comparison uses notarize only, not pooled across operations",
            "clientLifecycle": "input preparation plus transaction-to-validated-plaintext; geometric FHE/baseline ratios use round-matched log ratios and Holm correction over ten tests",
        },
        "provenance": provenance,
        "summary": summary,
        "sdkNotarizationStages": sdk_summary,
        "comparisons": comparisons,
        "lifecycleComparisons": lifecycle_comparisons,
    }
    folder = args.report.parent
    (folder / "analysis.json").write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    lines = [
        "# Observable operational performance: complete interleaved campaign", "",
        f"Campaign period (including excluded setup): {report['startedAt']} to {report['completedAt']}. {runs} rounds per operation/configuration.",
        "Times are milliseconds, mean +/- sample SD. Backend TFHE evaluation and KMS compute are not isolated.", "",
        "| Configuration | Operation | Gas | Receipt (ms) | Validated completion (ms) | Post-receipt (ms) | Already-ready decrypt (ms) | Ready n / failures |",
        "|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    def fmt(value):
        if value["mean"] is None:
            return "n/a"
        uncertainty = "n/a" if value["stddev"] is None else f"{value['stddev']:.1f}"
        return f"{value['mean']:.1f} +/- {uncertainty}"
    for row in summary:
        lines.append(f"| {row['platform']} | {row['operation']} | " + " | ".join(fmt(row[key]) for key in (
            "gasUsed", "confirmationMs", "transactionToValidatedPlaintextMs", "postReceiptToValidatedPlaintextMs", "alreadyReadyDecryptMs",
        )) + f" | {row['alreadyReadyDecryptMs']['n']} / {row['readyDecryptFailures']} |")
    lines.extend(["", "## Client-observed SDK stages", "", "Notarization only; mean +/- sample SD. Stage definitions differ across SDKs and do not isolate individual server compute times.",
                  "Zama key preparation occurs in excluded setup; CoFHE exposes per-request key-fetch/preparation. Ready decrypt is a separate repeat after successful first completion.", "",
                  "| Stage | Zama (ms) | Fhenix (ms) |", "|---|---:|---:|"])
    for row in sdk_summary:
        lines.append(f"| {row['stage']} | {fmt(row['zama'])} | {fmt(row['fhenix'])} |")
    lines.extend(["", "## Direct round-matched comparisons", "", "Negative mean difference means the left configuration completed sooner. Pointwise confidence intervals are not multiplicity-adjusted.",
        "Paired-t p-values are Holm-adjusted jointly over 30 comparisons. Non-rejection does not establish equivalence.",
        "Bootstrap intervals and lag-one correlations in analysis.json assess sensitivity to local serial dependence; they do not remove confounding.", "",
        "| Metric | Operation | Left - right | Mean difference (ms) | Pointwise 95% CI | Holm p |",
        "|---|---|---|---:|---:|---:|"])
    for row in comparisons:
        low, high = row["pointwise95PctMeanDifferenceCI"]
        metric = "receipt" if row["metric"] == "confirmationMs" else "validated completion"
        lines.append(f"| {metric} | {row['operation']} | {row['left']} - {row['right']} | {row['differenceMs']['mean']:.1f} | [{low:.1f}, {high:.1f}] | {row['pHolmAll30Comparisons']:.6g} |")
    lines.extend([
        "", "## Full client lifecycle relative to baseline", "",
        "Client lifecycle is input preparation plus transaction-to-validated-plaintext. Ready-repeat decryption is excluded.",
        "Ratios are geometric means of round-matched FHE/baseline ratios; confidence intervals use the circular block bootstrap.", "",
        "| Operation | Configuration | Baseline (ms) | Configuration (ms) | Lifecycle ratio | Overhead | 95% ratio CI | Baseline gas | Configuration gas | Gas ratio | Holm p |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ])
    for row in lifecycle_comparisons:
        low, high = row["circularBlockBootstrap95PctRatioCI"]
        lines.append(
            f"| {row['operation']} | {row['configuration']} | {row['baselineClientLifecycleMs']['mean']:.1f} | "
            f"{row['configurationClientLifecycleMs']['mean']:.1f} | {row['geometricMeanLifecycleRatio']:.3f}x | "
            f"{row['lifecycleOverheadPct']:+.1f}% | [{low:.3f}, {high:.3f}] | "
            f"{row['baselineGasUsed']['mean']:.1f} | {row['configurationGasUsed']['mean']:.1f} | "
            f"{row['arithmeticMeanGasRatio']:.3f}x | {row['pHolmAll10LifecycleComparisons']:.6g} |"
        )
    lines.extend(["", "## Provenance", "", "| Configuration | Contract | Measured block range | Mean block gas/target | Retrieval transport retries |", "|---|---|---|---:|---:|"])
    for row in provenance:
        lines.append(f"| {row['platform']} | {row['address']} | {row['firstMeasuredBlock']}-{row['lastMeasuredBlock']} | {row['blockGasTargetUtilization']['mean']:.3f} | {row['observedRetrievalTransportRetries']} |")
    (folder / "operational-performance.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    latex = ["% Mean +/- sample standard deviation; times in milliseconds.", "% SDK stage timings do not isolate backend compute. n=50 only if the input report has 50 rounds."]
    for metric, label in (("gasUsed", "Gas consumption"), ("confirmationMs", "Host-chain receipt latency (ms)"),
                          ("transactionToValidatedPlaintextMs", "Validated-result completion latency (ms)"),
                          ("postReceiptToValidatedPlaintextMs", "Post-receipt completion interval (ms)")):
        latex.extend([r"\begin{table*}[!t]", r"\centering\small", f"\\caption{{{label}: {runs} interleaved rounds.}}", f"\\label{{tab:lifecycle-{metric}}}", r"\begin{tabular}{lrrr}", r"\hline", r"Operation & Baseline & Zama & Fhenix \\", r"\hline"])
        for operation in OPERATIONS:
            cells = []
            for name in PLATFORMS:
                value = next(row[metric] for row in summary if row["platform"] == name and row["operation"] == operation)
                cells.append(f"\\({value['mean']:.1f} \\pm {value['stddev']:.1f}\\)")
            latex.append(operation.replace("_", r"\_") + " & " + " & ".join(cells) + r" \\")
        latex.extend([r"\hline", r"\end{tabular}", r"\end{table*}", ""])
    latex.extend([r"\begin{table}[!t]", r"\centering\footnotesize", r"\caption{Client-observed SDK stages, not isolated server compute.}",
                  r"\label{tab:lifecycle-sdk-stages}", r"\begin{tabular}{lrr}", r"\hline", r"Stage & Zama (ms) & Fhenix (ms) \\", r"\hline"])
    def latex_cell(value):
        if value["mean"] is None:
            return "n/a"
        if value["stddev"] is None:
            return f"{value['mean']:.0f} (SD n/a)"
        return f"\\({value['mean']:.0f} \\pm {value['stddev']:.0f}\\)"
    for row in sdk_summary:
        latex.append(row["stage"] + " & " + " & ".join(latex_cell(row[name]) for name in ("zama", "fhenix")) + r" \\")
        if row["stage"] == "Ready decrypt + auth":
            latex.append("Ready successful $n$ & " + " & ".join(str(row[name]["n"]) for name in ("zama", "fhenix")) + r" \\")
            latex.append("Ready failed requests & " + " & ".join(str(next(entry["readyDecryptFailures"] for entry in summary if entry["platform"] == name and entry["operation"] == "notarize")) for name in ("zama", "fhenix")) + r" \\")
    latex.extend([r"\hline", r"\end{tabular}", r"\end{table}", ""])
    for metric, label in (("confirmationMs", "receipt latency"), ("transactionToValidatedPlaintextMs", "validated-result completion")):
        latex.extend([r"\begin{table*}[!t]", r"\centering\footnotesize", f"\\caption{{Direct round-matched comparisons of {label}. Negative differences favor the left configuration. Confidence intervals are pointwise; Holm correction covers all thirty tests.}}",
                      f"\\label{{tab:lifecycle-comparisons-{metric}}}", r"\begin{tabular}{lllrrr}", r"\hline",
                      r"Operation & Left & Right & Mean difference (ms) & Pointwise 95\% CI (ms) & Holm $p$ \\", r"\hline"])
        for row in comparisons:
            if row["metric"] != metric:
                continue
            low, high = row["pointwise95PctMeanDifferenceCI"]
            operation = row["operation"].replace("_", r"\_")
            latex.append(f"{operation} & {row['left']} & {row['right']} & {row['differenceMs']['mean']:.1f} & [{low:.1f}, {high:.1f}] & {row['pHolmAll30Comparisons']:.4g}" + r" \\")
        latex.extend([r"\hline", r"\end{tabular}", r"\end{table*}", ""])
    latex.extend([
        r"\begin{table*}[!t]", r"\centering\footnotesize",
        r"\caption{Full client-observed lifecycle and gas relative to the plaintext baseline. Lifecycle includes input preparation and validated-result completion; ready-repeat decryption is excluded.}",
        r"\label{tab:lifecycle-relative-baseline}",
        r"\begin{tabular}{llrrrrrrr}", r"\hline",
        r"Operation & Configuration & Baseline ms & FHE ms & Ratio & Overhead & 95\% ratio CI & Baseline gas & FHE gas \\",
        r"\hline",
    ])
    for row in lifecycle_comparisons:
        low, high = row["circularBlockBootstrap95PctRatioCI"]
        operation = row["operation"].replace("_", r"\_")
        latex.append(
            f"{operation} & {row['configuration']} & {row['baselineClientLifecycleMs']['mean']:.1f} & "
            f"{row['configurationClientLifecycleMs']['mean']:.1f} & {row['geometricMeanLifecycleRatio']:.3f} & "
            f"{row['lifecycleOverheadPct']:+.1f}\\% & [{low:.3f}, {high:.3f}] & "
            f"{row['baselineGasUsed']['mean']:.1f} & {row['configurationGasUsed']['mean']:.1f}" + r" \\"
        )
    latex.extend([r"\hline", r"\end{tabular}", r"\end{table*}", ""])
    latex.extend([r"\begin{table*}[!t]", r"\centering\footnotesize", r"\caption{Versioned revised campaign provenance; block utilization is relative to gas target.}",
                  r"\label{tab:lifecycle-provenance}", r"\begin{tabular}{llllr}", r"\hline", r"Configuration & Contract & Measured blocks & Mean gas/target & Retrieval retries \\", r"\hline"])
    for row in provenance:
        address = row["address"]
        latex.append(f"{row['platform']} & \\texttt{{{address[:8]}...{address[-4:]}}} & {row['firstMeasuredBlock']}--{row['lastMeasuredBlock']} & {row['blockGasTargetUtilization']['mean']:.3f} & {row['observedRetrievalTransportRetries']}" + r" \\")
    latex.extend([r"\hline", r"\end{tabular}", r"\end{table*}", "",
                  f"The revised campaign ran from \\texttt{{{report['startedAt']}}} to \\texttt{{{report['completedAt']}}} (UTC).",
                  "The raw report contains full addresses, transaction hashes, individual block metadata, SDK versions and machine metadata.",
                  "Already-ready decryption above uses notarization only, not a pool of operation types. Stages overlap and must not be summed as independent totals.",
                  "Zama key preparation occurs in excluded SDK setup; CoFHE key-fetch/preparation is observed per input request. Remote approval and decrypt API timings include communication and client processing, not just server computation."])
    (folder / "operational-performance.tex").write_text("\n".join(latex) + "\n", encoding="utf-8")
    print(f"Validated {len(measured)} observations; wrote analysis and Markdown/LaTeX tables to {folder}")


if __name__ == "__main__":
    main()
