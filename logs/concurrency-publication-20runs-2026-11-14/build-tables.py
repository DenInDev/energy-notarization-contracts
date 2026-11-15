"""Publication tables from two completed sessions; no experimental files edited."""
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parent
ROW_END = " " + chr(92) * 2
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan = json.loads((ROOT / "input-plan.json").read_text())
metadata = json.loads((ROOT / "block-metadata.json").read_text())
assert metadata["status"] == "finished" and metadata["inputPlanSha256"] == sha(ROOT / "input-plan.json")
refs = {(r["dataset"], r["index"]): r for r in metadata["references"]}
recovered = {(r["dataset"], r["transactionHash"]): r["canonical"] for r in metadata["reconciliations"]}
groups, networks, sessions = defaultdict(list), [], []
platforms = {"baseline": "Plaintext", "zama": "Zama", "fhenix": "Fhenix"}


def stats(values):
    values = [float(x) for x in values if x is not None]
    if not values:
        return {"n": 0}
    mean = statistics.mean(values)
    sd = statistics.stdev(values) if len(values) > 1 else 0
    return {"n": len(values), "mean": mean, "sd": sd, "cvPct": sd / mean * 100 if mean else None}


for dataset in plan["datasets"]:
    file = Path(dataset["sourceReport"])
    assert sha(file) == dataset["sourceSha256"]
    report = json.loads(file.read_text())
    assert report["executionComplete"] and report["config"]["repetitions"] == 10
    assert report["config"]["suite"] == "concurrency" and report["config"]["widths"] == "16"
    latest = {}
    for trial in report["trials"]:
        if trial["warmup"]:
            continue
        key = (trial["caseId"], trial["platform"], trial["repetition"])
        if key in latest:
            assert latest[key]["status"] in ("pending", "incomplete")
        latest[key] = trial
    assert len(latest) == 120
    sessions.append({"id": dataset["id"], "file": str(file), "sha256": dataset["sourceSha256"],
                     "rawComplete": report["complete"], "repetitions": 10,
                     "historicalExtraPreparationFailures": len([t for t in report["trials"] if not t["warmup"]]) - 120})
    for trial in latest.values():
        case = next(c for c in report["cases"] if c["id"] == trial["caseId"])
        key = "/".join((trial["caseId"], trial["platform"], str(trial["repetition"]), "false", trial.get("controlDirection") or "main"))
        late = next((a for a in report.get("recoveredAudits", []) if a["key"] == key and a["status"] == "ok"), None)
        assert trial["status"] == "ok" or late
        ordered = sorted(trial["requests"], key=lambda r: (r["transaction"]["blockNumber"], r["transaction"]["transactionIndex"]))
        assert len(ordered) == 8 and all(r["transaction"]["receiptStatus"] == 1 for r in ordered)
        state = 0
        snapshots = {}
        for request in ordered:
            state = (state + int(request["input"]) if case["mode"] == "shared_sum" else 3 * state + int(request["input"])) % 65536
            snapshots[request["requestId"]] = str(state)
        final = late["finalPlaintexts"] if late else trial["finalPlaintexts"]
        assert final["shared"] == str(state)
        for request in ordered:
            if request["status"] == "ok":
                assert request["plaintext"] == snapshots[request["requestId"]]
            else:
                assert late and any(s["requestId"] == request["requestId"] and s["plaintext"] == snapshots[request["requestId"]] for s in late["snapshots"])
        recorded_order = late["canonicalOrder"] if late else trial["canonicalOrder"]
        assert recorded_order == [r["requestId"] for r in ordered]
        planned_state = 0
        for request_id in trial["plannedOrder"]:
            value = int(next(r for r in ordered if r["requestId"] == request_id)["input"])
            planned_state = (planned_state + value if case["mode"] == "shared_sum" else 3 * planned_state + value) % 65536
        groups[(case["mode"], case["users"], trial["platform"])].append({
            "session": dataset["id"], "primaryOk": trial["status"] == "ok", "late": bool(late),
            "reordered": recorded_order != trial["plannedOrder"], "finalDiffers": state != planned_state,
            "preparationMs": None if trial.get("resumedPreparation") else trial.get("preparationMs"),
            "receiptWindowMs": trial.get("receiptWindowMs"),
            "fullWindowMs": trial.get("fullWindowMs") if trial["status"] == "ok" else None,
            "throughput": trial.get("receiptTransactionsPerSecond"),
            "gas": [recovered.get((dataset["id"], r["transaction"]["transactionHash"]), r["transaction"])["gasUsed"] for r in ordered],
            "receiptMs": [r["transaction"].get("receiptMs") for r in ordered if (dataset["id"], r["transaction"]["transactionHash"]) not in recovered],
            "auditMs": [r.get("auditCallMs") for r in ordered if r["status"] == "ok" and (dataset["id"], r["transaction"]["transactionHash"]) not in recovered]})
    for platform in platforms:
        rows = [(i, r) for i, r in enumerate(dataset["records"]) if r["platform"] == platform]
        blocks = [metadata["blocks"][refs[(dataset["id"], i)]["canonicalBlockHash"]] for i, _ in rows]
        assert len(blocks) == 320
        stamp = lambda x: datetime.fromtimestamp(x, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        networks.append({"session": dataset["id"], "platform": platform, "contract": rows[0][1]["target"],
                         "n": len(blocks), "startUtc": stamp(min(b["timestamp"] for b in blocks)),
                         "endUtc": stamp(max(b["timestamp"] for b in blocks)),
                         "firstBlock": min(b["number"] for b in blocks), "lastBlock": max(b["number"] for b in blocks),
                         "meanGasTargetPct": statistics.mean(200 * int(b["gasUsed"]) / int(b["gasLimit"]) for b in blocks)})

rows = []
for mode in ("shared_sum", "shared_ordered"):
    for writers in (1, 4):
        for platform in platforms:
            data = groups[(mode, writers, platform)]
            assert len(data) == 20 and {s: sum(d["session"] == s for d in data) for s in ("session-1", "session-2")} == {"session-1": 10, "session-2": 10}
            row = {"mode": mode, "writers": writers, "platform": platform,
                   "windows": 20, "primaryOk": sum(d["primaryOk"] for d in data), "late": sum(d["late"] for d in data),
                   "reordered": sum(d["reordered"] for d in data), "finalDiffers": sum(d["finalDiffers"] for d in data),
                   "inconsistent": 0}
            row["metrics"] = {k: stats(v for d in data for v in d[k]) for k in ("gas", "receiptMs", "auditMs")}
            row["metrics"].update({k: stats(d[k] for d in data) for k in ("preparationMs", "receiptWindowMs", "fullWindowMs", "throughput")})
            row["bySession"] = [{"session": s, "metrics": {k: stats(v for d in data if d["session"] == s for v in d[k]) for k in ("gas", "receiptMs", "auditMs")}}
                                for s in ("session-1", "session-2")]
            rows.append(row)
assert sum(r["windows"] for r in rows) == 240 and sum(r["primaryOk"] for r in rows) == 239
assert sum(r["late"] for r in rows) == 1 and sum(r["metrics"]["gas"]["n"] for r in rows) == 1920
assert sum(r["metrics"]["auditMs"]["n"] for r in rows) == 1919


def table(caption, label, columns, header, body, note):
    return "\n".join([r"\begin{table*}[!t]", r"\caption{" + caption + "}", r"\label{" + label + "}",
                      r"\centering", r"\scriptsize", r"\setlength{\tabcolsep}{3pt}",
                      r"\begin{tabular}{" + columns + "}", r"\hline", header + ROW_END, r"\hline", *body,
                      r"\end{tabular}", r"\par\smallskip", r"\begin{minipage}{\textwidth}\scriptsize " + note + r"\end{minipage}",
                      r"\end{table*}", ""])


def prefix(row, index):
    mode = r"\texttt{shared\_sum}" if row["mode"] == "shared_sum" else r"\texttt{shared\_ordered}"
    return ((mode + " & " + str(row["writers"])) if index % 3 == 0 else " & ") + " & " + platforms[row["platform"]]


def formatted(d, digits=0):
    return (f"{d['mean']:.{digits}f} ({d['cvPct']:.2f}\\%)") if d["n"] else "--"


correctness, requests, windows = [], [], []
for index, row in enumerate(rows):
    p, m = prefix(row, index), row["metrics"]
    correctness.append(p + f" & {row['primaryOk']}/20 & {row['late']} & {row['reordered']}/20 & {row['finalDiffers']}/20 & 0" + ROW_END)
    requests.append(p + f" & {m['gas']['mean']:.0f} & " + formatted(m["receiptMs"]) + " & " + formatted(m["auditMs"]) +
                    f" & {m['receiptMs']['n']}/{m['auditMs']['n']}" + ROW_END)
    windows.append(p + " & " + " & ".join(formatted(m[k], 3 if k == "throughput" else 0) for k in
                   ("preparationMs", "receiptWindowMs", "fullWindowMs", "throughput")) +
                   f" & {m['preparationMs']['n']}/{m['receiptWindowMs']['n']}/{m['fullWindowMs']['n']}" + ROW_END)
    if index % 3 == 2:
        for body in (correctness, requests, windows):
            body.append(r"\hline")

tables = []
tables.append(table("Concurrency correctness and ordering on Sepolia (16-bit arithmetic)", "tab:concurrency-correctness",
    "|l|r|l|r|r|r|r|r|", r"\textbf{Mode} & \textbf{Writers} & \textbf{Platform} & \shortstack{\textbf{Primary valid}\\\textbf{windows}} & \shortstack{\textbf{Late}\\\textbf{validated}} & \shortstack{\textbf{Reordered}\\\textbf{windows}} & \shortstack{\textbf{Final $\ne$}\\\textbf{planned order}} & \textbf{Inconsistent}",
    correctness, "Two sessions contribute 10 windows each per configuration (20 total), with eight transactions per window. All 1,920 measured transactions confirmed. One original Zama retrieval failure was validated later; its failed primary outcome and missing successful audit latency remain unchanged. A separate Fhenix preparation failure sent no request transactions and was resumed; it is retained as an extra attempt, not an additional window. Final-state differences from planned submission order are legitimate when they match canonical replay."))
tables.append(table("Per-request concurrency measurements on Sepolia", "tab:concurrency-request-performance",
    "|l|r|l|r|r|r|r|", r"\textbf{Mode} & \textbf{Writers} & \textbf{Platform} & \textbf{Mean Gas} & \shortstack{\textbf{Tx to receipt}\\\textbf{Mean ms (CV\%)}} & \shortstack{\textbf{Deferred audit}\\\textbf{Mean ms (CV\%)}} & \shortstack{\textbf{$n_{\rm receipt}$ /}\\\textbf{$n_{\rm audit}$}}",
    requests, "Gas covers measured submit transactions only; deployment, authorization, window setup and warmups are separate. Audits retrieve and validate per-request snapshots after all window receipts, so they are already-ready retrieval measurements, not receipt-to-immediate-validation latency. Missing successful audit timings and reconciled receipt timings are excluded. The dependent requests within each window are not independent robustness repetitions."))
tables.append(table("Window-level concurrency measurements on Sepolia", "tab:concurrency-window-performance",
    "|l|r|l|r|r|r|r|r|", r"\textbf{Mode} & \textbf{Writers} & \textbf{Platform} & \shortstack{\textbf{Preparation}\\\textbf{Mean ms (CV\%)}} & \shortstack{\textbf{Last receipt}\\\textbf{Mean ms (CV\%)}} & \shortstack{\textbf{Final audit}\\\textbf{Mean ms (CV\%)}} & \shortstack{\textbf{Throughput}\\\textbf{Mean tx/s (CV\%)}} & \shortstack{\textbf{$n_{\rm prep}$/$n_{\rm receipt}$}\\\textbf{/$n_{\rm final}$}}",
    windows, "Preparation measures the eight-request encryption/estimate/sign batch. Last receipt and final audit are elapsed window times from the beginning of submission; both exclude preparation and window setup. Final audit is not an isolated FHE execution time. Throughput is the mean of window throughput values under receipt-synchronized waves, not maximum network capacity. The late-validated Zama window is excluded from successful final-audit timing; the resumed Fhenix preparation is excluded from preparation summaries because its earlier partial work was discarded. Means and CVs pool two temporal sessions descriptively, without causal or inferential claims."))
network_body = []
for row in networks:
    session = "S1" if row["session"] == "session-1" else "S2"
    address = row["contract"]
    network_body.append(session + " " + platforms[row["platform"]] + " & " + r"\shortstack[l]{" + row["startUtc"] + r" \\ -- " + row["endUtc"] + "} & " +
        r"\texttt{" + address[:6] + "..." + address[-4:] + "} & " + f"{row['firstBlock']}--{row['lastBlock']} & {row['meanGasTargetPct']:.1f}\\%" + ROW_END)
    network_body.append(r"\hline")
tables.append(table("Sepolia deployments and measurement intervals (concurrency sessions)", "tab:sepolia-concurrency-deployments",
    "|l|l|l|l|r|", r"\textbf{Configuration} & \textbf{Observed interval (UTC)} & \textbf{Contract} & \textbf{Containing block range} & \textbf{Mean gas/target}",
    network_body, "Each session contributes 320 measured transactions per platform. Intervals are canonical containing-block timestamps, excluding setup, preparation and decryption. Mean gas/target is the transaction-weighted mean of containing-block gasUsed divided by half the gasLimit; it is block utilization, not operation gas. Platform windows are sequential with rotated order; inclusion conditions are not matched across platforms. The sessions and their contracts remain distinct."))

(ROOT / "concurrency-tables.tex").write_text("\n".join(tables), encoding="utf-8")
(ROOT / "concurrency-tables.json").write_text(json.dumps({"sessions": sessions, "caseMetrics": rows, "networkRows": networks,
    "metadataSha256": sha(ROOT / "block-metadata.json"), "counts": {"windows": 240, "primaryValidWindows": 239,
    "lateValidatedWindows": 1, "confirmedMeasuredTransactions": 1920, "successfulPrimaryAudits": 1919},
    "methodology": "Two completed10-round sessions;20/cell. Descriptive pooling with explicit per-session provenance, no p-values. Warmups and historical supplementary conditions excluded from primary rows."}, indent=2), encoding="utf-8")
for dataset in plan["datasets"]:
    assert sha(dataset["sourceReport"]) == dataset["sourceSha256"]
print(json.dumps({"tables": len(tables), "rows": len(rows), "windows": 240, "measuredTransactions": 1920,
                  "output": str(ROOT / "concurrency-tables.tex")}))
