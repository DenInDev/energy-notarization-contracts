"""Round-paired exploratory inference for the two completed uniform-width runs.

Reuse the verified prior circular-block bootstrap, with the new full-client
lifecycle definition. Raw reports and their failed observations remain immutable.
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
import numpy as np

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent
LEGACY = ROOT.parent / "energy-isolated-50-2026-10-24-continuation1/publication-tables/compute_paired_inference.py"
SPEC = importlib.util.spec_from_file_location("previous_verified_paired_inference", LEGACY)
BOOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BOOT)
B = 199999
LENGTHS = (1, 2, 3, 5)
PRIMARY = 3
PAIRS = (("zama", "baseline"), ("fhenix", "baseline"), ("zama", "fhenix"))
EXPECTED = {16: "0603562486a911cc8b5bac0491f80ce2429f2467334a73480936e882acad43ff",
            128: "ac0682bdeae5034a0349003fc028ec3e3c30b143b580327128558746724df25e"}


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def seed_for(row, length):
    text = f"uniform-paired-client-lifecycle-v1:{row['width']}:{row['metric']}:{row['operation']}:{row['candidate']}:{row['reference']}:{length}"
    return int.from_bytes(hashlib.sha256(text.encode()).digest()[:8], "big")


def lifecycle(row):
    return float(row["preparationMs"]) + float(row["transactionToValidatedPlaintextMs"])


def op(name):
    return name.replace("_", r"\_")


def add_definition(rows, width, metric, operation, index):
    for candidate, reference in PAIRS:
        pairs = []
        for run in range(1, 51):
            a, sa = index[(reference, operation, run)]
            b, sb = index[(candidate, operation, run)]
            assert sa == sb
            if a["status"] != "ok" or b["status"] != "ok":
                continue
            av = lifecycle(a) if metric == "client_lifecycle" else float(a["viewToValidatedPlaintextMs"])
            bv = lifecycle(b) if metric == "client_lifecycle" else float(b["viewToValidatedPlaintextMs"])
            assert av > 0 and bv > 0 and math.isfinite(av) and math.isfinite(bv)
            pairs.append({"run": run, "segment": sa, "referenceMs": av, "candidateMs": bv, "logRatio": math.log(bv / av)})
        expected = 49 if width == 128 and operation == "mean" and candidate == "zama" else 50
        assert len(pairs) == expected
        groups = []
        for segment in (0, 1):
            part = [p for p in pairs if p["segment"] == segment]
            assert part and all(y["run"] == x["run"] + 1 for x, y in zip(part, part[1:])), "Bootstrap must not bridge a missing round"
            groups.append(np.asarray([p["logRatio"] for p in part], dtype=float))
        rows.append({"width": width, "metric": metric, "operation": operation, "candidate": candidate,
                     "reference": reference, "n": len(pairs), "segmentSizes": [len(g) for g in groups],
                     "referenceMeanMs": float(np.mean([p["referenceMs"] for p in pairs])),
                     "candidateMeanMs": float(np.mean([p["candidateMs"] for p in pairs])),
                     "pairs": pairs, "groups": groups})


def make_tables(rows, width, metric, operations):
    view = metric == "already_ready_retrieval"
    width_suffix = "" if width == 16 else "-128"
    suffix = f"-view-{width}" if view else width_suffix
    caption = ("Paired already-ready view/decrypt latency comparison against the plaintext baseline" if view else
               "Paired latency comparison against the plaintext baseline") + f" ({width}-bit arithmetic)"
    notes = (r"Already-ready retrieval of the persisted result after primary validation; no new transaction or FHE operation." if view else
             r"Full client lifecycle includes preparation and signing, excluding intentional barrier waiting.")
    common = r" Ratios are geometric means of round-matched ratios; means are arithmetic milliseconds. Pointwise 95\% block-bootstrap CIs; Holm correction jointly covers all 42 reported tests."
    lines = [r"\begin{table*}[!t]", "\\caption{" + caption + "}", "\\label{tab:paired-lifecycle-comparison" + suffix + "}",
             r"\centering", r"\footnotesize", r"\setlength{\tabcolsep}{5pt}",
             r"\begin{tabular}{|l|l|r|r|r|c|r|r|}", r"\hline", r"\textbf{Operation} & \textbf{Platform} & \textbf{Baseline Mean} & \textbf{FHE Mean} & \textbf{Paired Ratio} & \textbf{95\% CI} & \textbf{Overhead} & \textbf{Holm \(p\)} \\", r"\hline"]
    direct = [r"\begin{table*}[!t]", "\\caption{" + ("Paired already-ready view/decrypt latency comparison: Zama fhEVM and Fhenix CoFHE" if view else
               "Paired latency comparison: Zama fhEVM and Fhenix CoFHE") + f" ({width}-bit arithmetic)}}",
              "\\label{tab:zama-fhenix-lifecycle-comparison" + suffix + "}", r"\centering", r"\footnotesize", r"\setlength{\tabcolsep}{5pt}",
              r"\begin{tabular}{|l|r|r|r|c|r|r|}", r"\hline", r"\textbf{Operation} & \textbf{Fhenix Mean} & \textbf{Zama Mean} & \textbf{Paired Ratio} & \textbf{95\% CI} & \textbf{Overhead} & \textbf{Holm \(p\)} \\", r"\hline"]
    for operation in operations:
        pair_rows = [r for r in rows if r["width"] == width and r["metric"] == metric and r["operation"] == operation and r["reference"] == "baseline"]
        shared = [p["run"] for p in pair_rows[0]["pairs"]] == [p["run"] for p in pair_rows[1]["pairs"]]
        lines.append(r"\multirow{2}{*}{" + op(operation) + "}")
        for position, row in enumerate(pair_rows):
            baseline = ((r"\multirow{2}{*}{" + BOOT.integer(row["referenceMeanMs"]) + "}") if position == 0 else "") if shared else BOOT.integer(row["referenceMeanMs"])
            label = "Zama" if row["candidate"] == "zama" else "Fhenix"
            if row["n"] == 49:
                label += r"\(^{\dagger}\)"
            low, high = row["ci95"]
            lines.append("& " + label + " & " + baseline + " & " + BOOT.integer(row["candidateMeanMs"]) +
                         f" & {row['ratio']:.3f} & [{low:.3f}, {high:.3f}] & {row['overheadPct']:+.1f}\\% & " + BOOT.p_latex(row["holmPAll42"]) + r" \\")
        lines.append(r"\hline")
        row = next(r for r in rows if r["width"] == width and r["metric"] == metric and r["operation"] == operation and r["reference"] == "fhenix")
        low, high = row["ci95"]
        label = op(operation) + (r"\(^{\dagger}\)" if row["n"] == 49 else "")
        direct.append(label + " & " + BOOT.integer(row["referenceMeanMs"]) + " & " + BOOT.integer(row["candidateMeanMs"]) +
                      f" & {row['ratio']:.3f} & [{low:.3f}, {high:.3f}] & {row['overheadPct']:+.1f}\\% & " + BOOT.p_latex(row["holmPAll42"]) + r" \\")
    for table, direct_table in ((lines, False), (direct, True)):
        table += [r"\hline", r"\end{tabular}", r"\vspace{2pt}", r"\parbox{\textwidth}{\scriptsize " + notes + common + (r" Direct ratios are Zama/Fhenix." if direct_table else "") + "}"]
        if width == 128 and not view:
            table.append(r"\parbox{\textwidth}{\scriptsize \(^{\dagger}\)Comparisons involving Zama \texttt{mean} use 49 successful pairs; all others use 50. The historical failed decryption remains excluded from both sides of its pair. Baseline means differ for the two \texttt{mean} rows because their matched round sets differ.}" if not direct_table else
                         r"\parbox{\textwidth}{\scriptsize \(^{\dagger}\)The \texttt{mean} comparison uses 49 successful pairs, excluding the historical failed Zama observation from both sides; other comparisons use 50.}")
        table += [r"\end{table*}", ""]
    return "\n".join(lines), "\n".join(direct)


def main():
    BOOT.tests()
    # Validate segment weighting and p/CI symmetry independently of the data.
    assert np.allclose(BOOT.holm([.01, .04, .03]), [.03, .06, .06])
    definitions, sources, operations = [], [], None
    for width in (16, 128):
        file = ROOT / f"measured-euint{width}-continuation1/report.json"
        assert sha(file) == EXPECTED[width]
        report = json.loads(file.read_text(encoding="utf-8"))
        assert report["complete"] or report["executionComplete"]
        assert len([s for s in report["samples"] if not s["warmup"]]) == 900
        segment = report["continuations"][-1]
        source = Path(segment["sourceReport"])
        assert sha(source) == segment["sourceReportSha256"]
        original = json.loads(source.read_text(encoding="utf-8"))
        cutoff, view_cutoff = segment["sourceSampleCount"], segment["sourceViewCount"]
        assert report["samples"][:cutoff] == original["samples"]
        assert report["viewDecryptSamples"][:view_cutoff] == original["viewDecryptSamples"]
        operations = report["measuredOperations"]
        index = {(s["platform"], s["operation"], s["run"]): (s, int(i >= cutoff)) for i, s in enumerate(report["samples"]) if not s["warmup"]}
        assert len(index) == 900
        for operation in operations:
            add_definition(definitions, width, "client_lifecycle", operation, index)
        index = {(s["platform"], "view_decrypt", s["run"]): (s, int(i >= view_cutoff)) for i, s in enumerate(report["viewDecryptSamples"]) if not s["warmup"]}
        assert len(index) == 150
        add_definition(definitions, width, "already_ready_retrieval", "view_decrypt", index)
        sources.append({"file": str(file), "sha256": sha(file), "sourceCheckpoint": str(source), "sourceCheckpointSha256": sha(source)})
    assert len(definitions) == 42
    sensitivity = {}
    for length in LENGTHS:
        results = [BOOT.bootstrap_test(d["groups"], length, seed_for(d, length), B) for d in definitions]
        adjusted = BOOT.holm([r["rawP"] for r in results])
        for definition, result, p in zip(definitions, results, adjusted):
            result.update({k: definition[k] for k in ("width", "metric", "operation", "candidate", "reference", "n", "segmentSizes")})
            result["holmPAll42"] = p
            result["rejectAt05AfterHolm"] = p < .05
        sensitivity[str(length)] = results
        print(f"Finished block length {length} for all 42 tests.", flush=True)
    rows = []
    for i, (definition, result) in enumerate(zip(definitions, sensitivity[str(PRIMARY)])):
        row = {k: v for k, v in definition.items() if k != "groups"}
        row.update(result)
        row["overheadPct"] = 100 * (row["ratio"] - 1)
        row["conclusionStableAcrossLengths"] = len({s[i]["rejectAt05AfterHolm"] for s in sensitivity.values()}) == 1
        rows.append(row)
    methods = {"lifecycleDefinition": "preparationMs + transactionToValidatedPlaintextMs; includes input work, estimation and signing, excludes intentional barrier wait",
               "viewDefinition": "viewToValidatedPlaintextMs after successful primary max, an already-ready retrieval without a new transaction",
               "estimand": "exp(mean round-matched log(candidate/reference latency)), conditional on both observations succeeding",
               "null": "E[paired log latency ratio] = 0; two-sided",
               "bootstrap": "Circular moving blocks separately within the original and continuation segments, preserving fixed observed segment sample counts and pairing",
               "replicates": B, "primaryBlockLength": PRIMARY, "sensitivityBlockLengths": LENGTHS,
               "ci": "Pointwise 95% basic bootstrap CI on the log mean, exponentiated; not multiplicity-adjusted",
               "p": "min(1, 2*(min(count(centeredReplicate >= observed), count(centeredReplicate <= observed))+1)/(B+1)); centeredReplicate = bootstrapMean - observedMean",
               "multiplicity": "Holm step-down jointly over all 42 tests: 6 operations * 3 platform pairs * 2 widths, plus 3 already-ready view pairs * 2 widths",
               "minimumRawMonteCarloP": 2 / (B + 1),
               "scope": "Exploratory conditional public-network comparisons. Approximate within-segment stationarity and sufficiently weak short-range dependence are assumed. Success selection and network confounding remain. No equivalence, causal slowdown or isolated compute claim follows.",
               "python": sys.version, "numpy": np.__version__, "reusedBootstrapSource": str(LEGACY), "reusedBootstrapSourceSha256": sha(LEGACY),
               "references": ["https://stat.ethz.ch/R-manual/R-patched/library/boot/html/tsboot.html", "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html"]}
    (OUT / "paired-inference.json").write_text(json.dumps({"methods": methods, "sourceReports": sources, "rows": rows, "sensitivity": sensitivity}, indent=2) + "\n", encoding="utf-8")
    lifecycle_tables, view_tables = [], []
    for width in (16, 128):
        base, direct = make_tables(rows, width, "client_lifecycle", operations)
        lifecycle_tables.extend((base, direct))
        (OUT / f"paired-baseline-{width}.tex").write_text(base, encoding="utf-8")
        (OUT / f"paired-zama-fhenix-{width}.tex").write_text(direct, encoding="utf-8")
        view_tables.extend(make_tables(rows, width, "already_ready_retrieval", ("view_decrypt",)))
    (OUT / "paired-comparison-tables.tex").write_text("\n".join(lifecycle_tables), encoding="utf-8")
    (OUT / "view-decrypt-comparison-tables.tex").write_text("\n".join(view_tables), encoding="utf-8")
    (OUT / "statistical-comparison-tables.tex").write_text("\n".join(lifecycle_tables + view_tables), encoding="utf-8")
    (OUT / "statistics-main.tex").write_text(r"\documentclass[twocolumn]{article}" + "\n" + r"\usepackage[a4paper,margin=1.5cm]{geometry}" + "\n" +
        r"\usepackage{amsmath,multirow}" + "\n" + r"\begin{document}" + "\n" + r"\input{statistical-comparison-tables.tex}" + "\n" + r"\end{document}" + "\n", encoding="utf-8")
    lines = ["# Paired statistical comparisons: completed uniform energy workloads", "",
             "The four main lifecycle tables preserve the earlier baseline and direct-comparison columns. Four separate tables cover the already-ready view/decrypt endpoint. Original 16-bit labels are reused; 128-bit and view labels have unique suffixes. Add \\usepackage{multirow} to the paper preamble.", "",
             "Lifecycle includes complete preparation/signing and transaction-to-validated plaintext, exactly matching the new performance tables. This differs from the older October input-encryption-only lifecycle definition.", "",
             "Arithmetic means are computed on the same successful round-matched pairs. The paired ratio is geometric and need not equal the ratio of displayed arithmetic means. Overhead = 100*(ratio-1). Baseline means are merged when pair sets match; the two 128-bit mean baseline values remain distinct because their pair sets differ.", "",
             "Primary inference: two-sided null-centered circular moving-block bootstrap, 199999 replicates, block length 3, resampled separately within each observation segment with fixed segment sizes. Basic pointwise 95% log-scale CIs are exponentiated. Holm adjustment is joint over all 42 comparisons across both widths and both endpoints. CIs are pointwise, not simultaneous. Sensitivity uses block lengths 1,2,3,5.", "",
             "Zama128 mean comparisons use n=49, excluding the failed observation from both sides. All other comparisons use n=50. The raw failed observation remains intact. Late correctness recovery does not enter timing. All pairs and segment assignments are in paired-inference.json.", "",
             "These exploratory results are conditional on successful retrievals and assumptions about stationarity/dependence within segments. Pairing and segmentation do not remove public-network confounding or outcome-dependent missingness. A non-significant result does not prove equivalence. Low p-values at finite resampling resolution are not zeros.", "",
             "| Width | Endpoint | Operation | Candidate/reference | n | Ratio | Pointwise 95% CI | Holm p (42) | Reject .05 | Stable for lengths 1,2,3,5 |",
             "|---:|---|---|---|---:|---:|---|---:|---|---|"]
    for row in rows:
        lines.append(f"| {row['width']} | {row['metric']} | {row['operation']} | {row['candidate']}/{row['reference']} | {row['n']} | {row['ratio']:.6f} | [{row['ci95'][0]:.6f}, {row['ci95'][1]:.6f}] | {row['holmPAll42']:.6g} | {row['rejectAt05AfterHolm']} | {row['conclusionStableAcrossLengths']} |")
    lines += ["", "Method references:", "", *[f"- {url}" for url in methods["references"]], ""]
    (OUT / "paired-inference-methods.md").write_text("\n".join(lines), encoding="utf-8")
    paragraph = r"""\paragraph{Paired statistical analysis.}
Each comparison uses round-matched successful observations. Full client lifecycle is preparation plus transaction-to-validated-plaintext time, excluding intentional barrier waiting. Already-ready view/decrypt retrieval is analyzed separately.
For each pair we analyze $d_i=\log(L_{A,i}/L_{B,i})$ and test $H_0:\mathbb{E}[d_i]=0$ with a two-sided, segment-stratified circular moving-block bootstrap (199{,}999 replicates; primary block length three rounds).
Blocks are resampled within each original/continuation segment while preserving pairing and observed segment sample counts. Sensitivity uses block lengths one, two and five.
Pointwise 95\% basic bootstrap intervals on the mean log ratio are exponentiated. P-values are Holm-adjusted jointly over 42 comparisons across both arithmetic widths: 36 lifecycle comparisons and six already-ready retrieval comparisons, at family-wise $\alpha=0.05$.
Comparisons involving Zama's 128-bit \texttt{mean} use 49 successful pairs; all other comparisons use 50. These conditional, exploratory public-network comparisons do not identify isolated FHE computation or causal platform effects.
"""
    (OUT / "statistical-methods.tex").write_text(paragraph, encoding="utf-8")
    import re
    combined = (OUT / "statistical-comparison-tables.tex").read_text(encoding="utf-8")
    labels = re.findall(r"\\label\{([^}]+)\}", combined)
    assert len(labels) == len(set(labels)) == 8
    for source in sources:
        assert sha(Path(source["file"])) == source["sha256"]
    print(json.dumps({"comparisons": len(rows), "holmFamily": 42, "resamples": B, "sourceReportsUnchanged": True,
                      "unstableSensitivity": [{k: r[k] for k in ("width", "metric", "operation", "candidate", "reference")} for r in rows if not r["conclusionStableAcrossLengths"]]}), flush=True)


if __name__ == "__main__":
    main()
