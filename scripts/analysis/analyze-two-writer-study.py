"""Combine new C=2 correctness observations with immutable published C=1/C=4.

Descriptive only. Late correctness checks never replace primary failures.
"""
from collections import defaultdict
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location("studies", Path(__file__).with_name("analyze-study-campaign.py"))
study = importlib.util.module_from_spec(spec)
spec.loader.exec_module(study)


def correctness(report):
    result = []
    for trial in study.latest_trials(report):
        if trial["warmup"]:
            continue
        assert trial["status"] == "ok"
        case = next(c for c in report["cases"] if c["id"] == trial["caseId"])
        ordered = sorted(trial["requests"], key=lambda r: (r["transaction"]["blockNumber"], r["transaction"]["transactionIndex"]))
        assert len(ordered) == 8 and all(r["transaction"]["receiptStatus"] == 1 for r in ordered)
        key = "/".join((trial["caseId"], trial["platform"], str(trial["repetition"]), "false", "main"))
        late = next((a for a in report.get("recoveredAudits", []) if a["key"] == key and a["status"] == "ok"), None)
        state = 0
        for request in ordered:
            state = (state + int(request["input"]) if case["mode"] == "shared_sum" else 3 * state + int(request["input"])) % 65536
            if request["status"] == "ok":
                assert request["plaintext"] == str(state)
            else:
                assert late and any(s["requestId"] == request["requestId"] and s["plaintext"] == str(state) for s in late["snapshots"])
        final = late["finalPlaintexts"] if late else trial["finalPlaintexts"]
        assert final["shared"] == str(state)
        planned = 0
        for identifier in trial["plannedOrder"]:
            value = int(next(r for r in ordered if r["requestId"] == identifier)["input"])
            planned = (planned + value if case["mode"] == "shared_sum" else 3 * planned + value) % 65536
        result.append({"mode": case["mode"], "writers": case["users"], "platform": trial["platform"],
                       "primaryValid": trial.get("originalStatus", trial["status"]) == "ok", "late": bool(late),
                       "reordered": [r["requestId"] for r in ordered] != trial["plannedOrder"], "finalDiffers": state != planned})
    return result


def main(root):
    manifest = json.loads((root / "campaign.json").read_text())
    records, sources = [], []
    for original in manifest["originalReports"]:
        file = Path(original["file"])
        assert study.sha(file) == original["sha256"]
        report = json.loads(file.read_text())
        assert report["executionComplete"]
        records.extend(correctness(report))
        sources.append(original)
    for session in manifest["sessions"]:
        assert session["status"] == "finished" and study.sha(Path(session["manifest"])) == session["finishedManifestSha256"]
        datasets = study.load(Path(session["manifest"]).parent)
        assert len(datasets) == 1
        report = datasets[0]["report"]
        assert report["config"]["users"] == "2"
        records.extend(correctness(report))
        sources.append({"file": datasets[0]["sourceReport"], "sha256": datasets[0]["sourceSha256"]})
    groups = defaultdict(list)
    for record in records:
        groups[(record["mode"], record["writers"], record["platform"])].append(record)
    rows = []
    for mode in ("shared_sum", "shared_ordered"):
        for writers in (1, 2, 4):
            for platform in study.NAMES:
                data = groups[(mode, writers, platform)]
                assert len(data) == 20
                rows.append({"mode": mode, "writers": writers, "platform": platform, "windows": 20,
                             **{key: sum(r[key] for r in data) for key in ("primaryValid", "late", "reordered", "finalDiffers")}, "inconsistent": 0})
    assert len(records) == 360
    output = root / "analysis"
    output.mkdir(exist_ok=True)
    study.save(output / "correctness-1-2-4.json", {"rows": rows, "sources": sources,
               "methodology": "20 windows/cell;8 requests/window. C2 collected later in two sessions with matching per-session seeds/inputs. No independent-request, causal or statistical significance claims."})
    lines = ["# Concurrency correctness with 1, 2 and 4 writers", "",
             "Twenty windows per configuration/platform; eight requests per window. The new two-writer sessions use matching reference seeds and plaintext inputs, but run at different times and on separate contracts. No causal performance ranking is implied.", "",
             "| Mode | Writers | Platform | Primary valid | Late validated | Reordered | Final differs from planned | Inconsistent |",
             "|---|---:|---|---:|---:|---:|---:|---:|"]
    tex = [r"\begin{table*}[!t]", r"\caption{Concurrency correctness and ordering on Sepolia (16-bit arithmetic)}",
           r"\label{tab:concurrency-correctness}", r"\centering\scriptsize", r"\setlength{\tabcolsep}{3pt}",
           r"\begin{tabular}{|l|r|l|r|r|r|r|r|}\hline",
           r"\textbf{Mode} & \textbf{Writers} & \textbf{Platform} & \shortstack{\textbf{Primary valid}\\\textbf{windows}} & \shortstack{\textbf{Late}\\\textbf{validated}} & \shortstack{\textbf{Reordered}\\\textbf{windows}} & \shortstack{\textbf{Final differs}\\\textbf{from planned}} & \textbf{Inconsistent}" + " " + chr(92)*2,
           r"\hline"]
    for index, row in enumerate(rows):
        numbers = [f"{row[k]}/20" if k in ("primaryValid", "reordered", "finalDiffers") else str(row[k]) for k in ("primaryValid", "late", "reordered", "finalDiffers", "inconsistent")]
        lines.append(f"| {row['mode']} | {row['writers']} | {row['platform']} | " + " | ".join(numbers) + " |")
        group = (r"\texttt{" + row["mode"].replace("_", r"\_") + "} & " + str(row["writers"])) if index % 3 == 0 else " & "
        tex.append(group + " & " + study.NAMES[row["platform"]] + " & " + " & ".join(numbers) + " " + chr(92)*2)
        if index % 3 == 2:
            tex.append(r"\hline")
    tex += [r"\end{tabular}\par\smallskip", r"\begin{minipage}{\textwidth}\scriptsize Twenty windows per configuration and platform, with eight transactions per window. Historical primary failures and late audits remain distinct. A final-state difference from planned submission order is legitimate when it matches canonical replay. Two-writer sessions were collected separately; samples are descriptive, not a causal comparison.\end{minipage}", r"\end{table*}"]
    (output / "correctness-1-2-4.tex").write_text("\n".join(tex) + "\n")
    (output / "combined-results.md").write_text("\n".join(lines) + "\n")
    for source in sources:
        assert study.sha(Path(source["file"])) == source["sha256"]
    print(json.dumps({"windows": 360, "transactions": 2880, "table": str(output / "correctness-1-2-4.tex")}))


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
