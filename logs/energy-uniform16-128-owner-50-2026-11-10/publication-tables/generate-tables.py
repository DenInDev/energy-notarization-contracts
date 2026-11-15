"""Publication tables from immutable completed energy reports; no network calls."""
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import statistics

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent
NAMES = {"baseline": "Plaintext baseline", "zama": "Zama fhEVM", "fhenix": "Fhenix CoFHE"}
LABELS = {"baseline": "tab:baseline-sepolia-benchmark", "zama": "tab:zama-fhevm-sepolia-benchmark", "fhenix": "tab:fhenix-cofhe-sepolia-benchmark"}
EXPECTED = {16: "0603562486a911cc8b5bac0491f80ce2429f2467334a73480936e882acad43ff",
            128: "ac0682bdeae5034a0349003fc028ec3e3c30b143b580327128558746724df25e"}


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def describe(values):
    mean = statistics.mean(values)
    sd = statistics.stdev(values) if len(values) > 1 else 0
    return {"n": len(values), "mean": mean, "sd": sd, "cvPct": 100 * sd / mean if mean else None}


def cell(values, decimals=0):
    result = describe(values)
    return f"{result['mean']:.{decimals}f} ({result['cvPct']:.2f}\\%)"


def operation(value):
    return value.replace("_", r"\_")


def performance(report, platform):
    width = report["uniformWidth"]
    caption = f"{NAMES[platform]} performance on Sepolia ({width}-bit arithmetic)"
    label = LABELS[platform] + ("-128" if width == 128 else "")
    lines = [r"\begin{table*}[!t]", "\\caption{" + caption + "}", "\\label{" + label + "}",
             r"\centering", r"\scriptsize", r"\setlength{\tabcolsep}{4pt}",
             r"\begin{tabular}{|l|r|rrr|r|}", r"\hline", r"\textbf{Operation} &",
             r"\textbf{Mean Gas} &", r"\multicolumn{3}{c|}{\textbf{Latency Components: Mean ms (CV\%)}} &",
             r"\textbf{Derived total} \\", r"\cline{3-5}", "& &",
             r"\textbf{Preparation} &", r"\textbf{Tx to receipt} &", r"\textbf{Receipt to validation} &",
             r"\textbf{Lifecycle ms (CV\%)} \\", r"\hline"]
    values = []
    for name in report["measuredOperations"]:
        attempts = [s for s in report["samples"] if not s["warmup"] and s["platform"] == platform and s["operation"] == name]
        ok = [s for s in attempts if s["status"] == "ok"]
        assert len(attempts) == 50
        assert len(ok) == (49 if width == 128 and platform == "zama" and name == "mean" else 50)
        assert all(s["receiptStatus"] == 1 for s in attempts)
        components = [[s[k] for s in ok] for k in ("preparationMs", "confirmationMs", "postReceiptToValidatedPlaintextMs")]
        totals = [s["preparationMs"] + s["transactionToValidatedPlaintextMs"] for s in ok]
        for s in ok:
            assert math.isclose(s["confirmationMs"] + s["postReceiptToValidatedPlaintextMs"], s["transactionToValidatedPlaintextMs"], abs_tol=1e-6)
        title = operation(name) + (r"\(^{\dagger}\)" if len(ok) == 49 else "")
        gas = statistics.mean(s["gasUsed"] for s in attempts)
        lines.append(title + f" & {gas:.0f} & " + " & ".join([*(cell(v) for v in components), cell(totals)]) + r" \\")
        values.append({"width": width, "platform": platform, "operation": name, "latencyN": len(ok), "receiptGasN": 50,
                       "meanGas": gas, "preparationMs": describe(components[0]), "receiptMs": describe(components[1]),
                       "postReceiptMs": describe(components[2]), "lifecycleMs": describe(totals)})
    lines += [r"\hline", r"\end{tabular}", r"\vspace{2pt}",
              r"\parbox{\textwidth}{\scriptsize Preparation includes input encryption/proof generation, transaction preparation and signing. Lifecycle is preparation plus transaction-to-validated-plaintext time; intentional barrier waiting is excluded. Means and CVs are calculated per observation.}"]
    if width == 128 and platform == "zama":
        lines.append(r"\parbox{\textwidth}{\scriptsize \(^{\dagger}\)For \texttt{mean}, all latency columns use the same 49 successful observations; mean gas uses all 50 confirmed transactions. The historical failed decryption is retained. Late recovery is excluded from timing statistics.}")
    lines += [r"\end{table*}", ""]
    return "\n".join(lines), values


def view_table(report):
    width = report["uniformWidth"]
    lines = [r"\begin{table*}[!t]", f"\\caption{{Already-ready view and decryption performance on Sepolia ({width}-bit arithmetic)}}",
             f"\\label{{tab:ready-view-decrypt-sepolia-{width}}}", r"\centering", r"\scriptsize", r"\setlength{\tabcolsep}{4pt}",
             r"\begin{tabular}{|l|r|rrr|}", r"\hline", r"\textbf{Platform} & \textbf{Samples} & \multicolumn{3}{c|}{\textbf{Latency: Mean ms (CV\%)}} \\",
             r"\cline{3-5}", r"& & \textbf{View read} & \textbf{Decrypt and validation} & \textbf{Total retrieval} \\", r"\hline"]
    values = []
    for platform in NAMES:
        rows = [s for s in report["viewDecryptSamples"] if not s["warmup"] and s["platform"] == platform]
        assert len(rows) == 50 and all(s["status"] == "ok" for s in rows)
        columns = [[s[k] for s in rows] for k in ("viewMs", "decryptAndValidationMs", "viewToValidatedPlaintextMs")]
        lines.append(NAMES[platform] + " & 50 & " + " & ".join(cell(v, 3 if platform == "baseline" and i == 1 else 1) for i, v in enumerate(columns)) + r" \\")
        values.append({"width": width, "platform": platform, "n": 50, **dict(zip(("viewMs", "decryptAndValidationMs", "totalMs"), map(describe, columns)))})
    lines += [r"\hline", r"\end{tabular}", r"\vspace{2pt}",
              r"\parbox{\textwidth}{\scriptsize Each read retrieves the persisted \texttt{max} result after primary validation. This is already-ready retrieval, without a new transaction or fresh homomorphic computation. The baseline reads and validates plaintext without FHE decryption.}", r"\end{table*}", ""]
    return "\n".join(lines), values


def network_table(report, dataset_id, metadata, inclusion=False):
    width = report["uniformWidth"]
    refs = {(r["dataset"], r["index"]): r for r in metadata["references"]}
    numbered = list(enumerate(report["setup"] + report["samples"]))
    label = "tab:sepolia-experiment-deployments" + ("-128" if width == 128 else "") + ("-blockintervals" if inclusion else "")
    lines = [r"\begin{table*}[!t]", f"\\caption{{Sepolia deployments and measurement intervals (interleaved runs, {width}-bit arithmetic)}}",
             "\\label{" + label + "}", r"\centering", r"\footnotesize", r"\setlength{\tabcolsep}{4pt}",
             r"\begin{tabular}{|l|l|l|l|r|}", r"\hline", r"\textbf{Configuration} &", r"\textbf{Observed interval (UTC)} &",
             r"\textbf{Contract} &", r"\textbf{Containing block range} &", r"\textbf{Mean gas/target} \\", r"\hline"]
    values = []
    stamp = lambda t: datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    for platform in NAMES:
        rows = [(i, s) for i, s in numbered if s.get("warmup") is False and s["platform"] == platform]
        assert len(rows) == 300
        blocks = []
        for i, sample in rows:
            reference = refs[(dataset_id, i)]
            assert reference["transactionHash"] == sample["transactionHash"]
            blocks.append(metadata["blocks"][reference["canonicalBlockHash"]])
        start = stamp(min(b["timestamp"] for b in blocks)) if inclusion else min(s["startedAt"] for _, s in rows)[:19].replace("T", " ")
        end = stamp(max(b["timestamp"] for b in blocks)) if inclusion else max(s["completedAt"] for _, s in rows)[:19].replace("T", " ")
        percent = statistics.mean(200 * int(b["gasUsed"]) / int(b["gasLimit"]) for b in blocks)
        address = next(s["address"] for s in report["setup"] if s["platform"] == platform)
        first, last = min(b["number"] for b in blocks), max(b["number"] for b in blocks)
        lines += [NAMES[platform] + " &", r"\shortstack[l]{" + start + r" \\ -- " + end + "} &",
                  r"\texttt{" + address[:6] + "..." + address[-4:] + "} &", f"{first}--{last} &", f"{percent:.1f}" + r"\% \\", r"\hline"]
        values.append({"width": width, "platform": platform, "n": 300, "contract": address,
                       "startUtc": start, "endUtc": end, "firstBlock": first, "lastBlock": last,
                       "meanGasTargetPct": percent, "intervalDefinition": "canonical inclusion blocks" if inclusion else "client observation including preparation and validation"})
    lines += [r"\end{tabular}", r"\vspace{2pt}"]
    interval_note = ("Intervals span canonical containing-block timestamps." if inclusion else "Intervals span recorded client preparation starts through completion and include the interruption between segments.")
    lines += [r"\parbox{\textwidth}{\scriptsize " + interval_note + r" Block ranges and utilization use all 300 confirmed measured primary transactions per platform, including owner registration. Mean gas/target is the transaction-weighted mean of $100g_b/(G_b/2)$ for containing blocks; it is not operation gas.}", r"\end{table*}", ""]
    return "\n".join(lines), values


def main():
    meta_file = ROOT / "canonical-audit/block-metadata.json"
    metadata = json.loads(meta_file.read_text(encoding="utf-8"))
    assert metadata["status"] == "finished" and not metadata["reconciliations"]
    performance_tex, network_tex, inclusion_tex, views_tex, rows, networks, views = [], [], [], [], [], [], []
    sources = []
    for width in (16, 128):
        dataset = f"measured-euint{width}-continuation1"
        file = ROOT / dataset / "report.json"
        assert sha(file) == EXPECTED[width]
        report = json.loads(file.read_text(encoding="utf-8"))
        sources.append({"file": str(file), "sha256": sha(file)})
        for platform in NAMES:
            tex, values = performance(report, platform)
            performance_tex.append(tex)
            rows.extend(values)
            (OUT / f"{platform}-{width}.tex").write_text(tex, encoding="utf-8")
        tex, values = view_table(report)
        views_tex.append(tex)
        views.extend(values)
        tex, values = network_table(report, dataset, metadata)
        network_tex.append(tex)
        networks.extend(values)
        tex, _ = network_table(report, dataset, metadata, True)
        inclusion_tex.append(tex)
    files = {"performance-tables.tex": performance_tex, "network-tables.tex": network_tex,
             "network-inclusion-intervals.tex": inclusion_tex, "view-decrypt-tables.tex": views_tex}
    for name, values in files.items():
        (OUT / name).write_text("\n".join(values), encoding="utf-8")
    notes = (r"% Completed energy workloads, 10 November 2026. These are segmented observations." + "\n" +
             r"% Primary arithmetic uses 16 or 128 bits; set_meter_owner uses a 160-bit eaddress at both widths." + "\n" +
             r"% Warmups/deployments excluded from performance means and main network rows." + "\n")
    (OUT / "tables.tex").write_text(notes + "\n".join(performance_tex + network_tex + views_tex), encoding="utf-8")
    (OUT / "main.tex").write_text(r"\documentclass[twocolumn]{article}" + "\n" + r"\usepackage[a4paper,margin=1.5cm]{geometry}" + "\n" +
                                  r"\usepackage{amsmath}" + "\n" + r"\begin{document}" + "\n" + r"\input{tables.tex}" + "\n" + r"\end{document}" + "\n", encoding="utf-8")
    provenance = {"sourceReports": sources, "canonicalMetadata": {"file": str(meta_file), "sha256": sha(meta_file), "observedAt": metadata["completedAt"],
                   "allBlocksFinalizedAtAudit": metadata["allContainingBlocksFinalized"]}, "performance": rows, "network": networks, "views": views,
                  "cvDefinition": "100 * sample standard deviation / arithmetic mean; sample standard deviation uses n-1",
                  "latencyDefinition": "Same successful primary subset for all components and per-observation lifecycle. Zama128 mean n=49; other rows n=50. Gas n=50 throughout.",
                  "lifecycleDefinition": "preparationMs + transactionToValidatedPlaintextMs; intentional barrier wait excluded"}
    (OUT / "table-values-and-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    readme = ["# Completed 16/128-bit energy tables", "", "Copy tables.tex into the paper, or use the individual fragments. main.tex is only a compilation check, not a replacement paper.", "",
              "Six performance tables preserve the earlier six-column layout. The first latency header is Preparation because it includes encryption/proofs plus transaction preparation/signing. All latency columns use the same success subset, so the lifecycle mean is consistent with their sum. Lifecycle CV is computed from per-observation totals, not by adding component CVs.", "",
              "Zama128 mean: 49 successful latency observations, marked with a dagger; gas uses all 50 confirmed transactions. No missing latency is filled. Other performance rows use n=50. Mean gas excludes deployment and warmups. Full ETH costs remain in the campaign results.", "",
              "Owner registration uses eaddress (160 bits) at both arithmetic widths. The six operations include set_meter_owner. Separate view/decrypt tables describe already-ready persisted max retrieval, not fresh FHE execution.", "",
              "network-tables.tex preserves the paper-style client observed intervals. Block ranges and mean gas/target come from the read-only canonical audit and all 300 measured primary receipts per platform. Intervals include the interruption in each segmented campaign. network-inclusion-intervals.tex is an optional alternative using canonical block timestamps with distinct labels; do not mix the interval definitions silently.", "",
              "The canonical audit was recorded at " + metadata["completedAt"] + "; not every containing block was finalized at that checkpoint. These tables reuse that evidence and issue no new network requests during the currently running study.", "",
              "The original baseline/Zama/Fhenix labels and deployment label are retained for the 16-bit tables. 128-bit labels have -128 suffixes. Replace the old tables instead of including duplicate labels. Captions identify the arithmetic width.", "",
              "Files: tables.tex (all 10 tables), performance-tables.tex (6), network-tables.tex (2), view-decrypt-tables.tex (2), network-inclusion-intervals.tex (optional), individual platform-width files, and table-values-and-provenance.json (full precision and denominators).", ""]
    (OUT / "README.md").write_text("\n".join(readme), encoding="utf-8")
    for source in sources:
        assert sha(Path(source["file"])) == source["sha256"]
    import re
    all_tex = (OUT / "tables.tex").read_text(encoding="utf-8")
    labels = re.findall(r"\\label\{([^}]+)\}", all_tex)
    assert len(labels) == 10 and len(set(labels)) == 10
    print(json.dumps({"folder": str(OUT), "tables": len(labels), "performanceRows": len(rows), "networkRows": len(networks)}))


if __name__ == "__main__":
    main()
