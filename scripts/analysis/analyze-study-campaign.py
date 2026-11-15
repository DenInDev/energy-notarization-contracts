"""Descriptive study results and paper-format canonical network-condition tables.

--prepare-metadata creates a read-only collector plan. No mode sends transactions.
Raw reports, outcomes and original timing observations are never edited.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import statistics

NAMES = {"baseline": "Plaintext baseline", "zama": "Zama fhEVM", "fhenix": "Fhenix CoFHE"}


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def save(file, value):
    file.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def describe(values):
    values = [float(v) for v in values if v is not None]
    if not values:
        return {"n": 0}
    mean = statistics.mean(values)
    sd = statistics.stdev(values) if len(values) > 1 else 0
    ordered = sorted(values)
    return {"n": len(values), "mean": mean, "median": statistics.median(values),
            "sd": sd, "cvPct": sd / mean * 100 if mean else None,
            "p95NearestRank": ordered[(95 * len(values) + 99) // 100 - 1],
            "min": ordered[0], "max": ordered[-1]}


def latest_trials(report):
    # Preserve raw attempts and reject duplicate successful primary slots.
    latest = {}
    for trial in report["trials"]:
        key = (trial["caseId"], trial["platform"], trial["repetition"], trial["warmup"], trial.get("controlDirection", "main"))
        if key in latest:
            assert latest[key]["status"] in ("pending", "incomplete"), "A completed slot must never be repeated"
        latest[key] = trial
    result = []
    for trial in latest.values():
        key = "/".join((trial["caseId"], trial["platform"], str(trial["repetition"]), str(trial["warmup"]).lower(), trial.get("controlDirection") or "main"))
        late = next((a for a in report.get("recoveredAudits", []) if a["key"] == key and a["status"] == "ok"), None)
        result.append({**trial, "status": "ok", "originalStatus": trial["status"], "lateAuditUsed": True} if late else trial)
    return result


def load(root):
    manifest = json.loads((root / "campaign.json").read_text(encoding="utf-8"))
    datasets = []
    for stage in manifest["stages"]:
        file = Path(stage["report"])
        assert stage["status"] == "finished" and sha(file) == stage["rawSha256"]
        report = json.loads(file.read_text(encoding="utf-8"))
        assert report["executionComplete"] and report["chainId"] == 11155111 and not report["mock"]
        repetitions = report["config"]["repetitions"]
        assert report["config"]["widths"] == "16" and 1 <= repetitions <= 1000
        assert repetitions == stage.get("args", {}).get("repetitions", repetitions)
        assert all(c["width"] == 16 for c in report["cases"])
        revision = report.get("scopeRevision")
        if revision:
            original_file = Path(revision["originalReport"])
            assert sha(original_file) == revision["originalSha256"]
            original = json.loads(original_file.read_text(encoding="utf-8"))
            assert len(revision["selectedIndices"]) + len(revision["supplementaryIndices"]) == len(original["trials"])
            assert sorted(revision["selectedIndices"] + revision["supplementaryIndices"]) == list(range(len(original["trials"])))
            for n, index in enumerate(revision["selectedIndices"]):
                assert report["trials"][n] == original["trials"][index]
            prior = original.get("supplementaryTrials", [])
            extra = report.get("supplementaryTrials", [])
            assert extra[:len(prior)] == prior
            for n, index in enumerate(revision["supplementaryIndices"]):
                assert extra[len(prior) + n] == original["trials"][index]
        measured = [t for t in latest_trials(report) if not t["warmup"]]
        expected = {(c["id"], p, n) for c in report["cases"] for p in NAMES for n in range(1, repetitions + 1)}
        keys = [(t["caseId"], t["platform"], t["repetition"]) for t in measured]
        assert len(keys) == len(set(keys)) and set(keys) == expected
        assert all(t["status"] in ("ok", "capacity_rejected") for t in measured)
        contracts = {s["platform"]: s["address"] for s in report["setups"] if s["kind"] == "deployment"}
        records = []

        def add(transaction, platform, category, case=None, status=None):
            keys = ("transactionHash", "preparedTransactionHash", "transactionNonce", "user", "broadcastState",
                    "blockHash", "blockNumber", "transactionIndex", "receiptStatus", "gasUsed",
                    "effectiveGasPriceWei", "gasCostWei", "receiptMs")
            late = next((r for r in report.get("settledSetupReceipts", []) + report.get("lateComputeReceipts", []) if r["transactionHash"] == transaction.get("transactionHash")), None)
            if late:
                transaction = {**transaction, **late["canonical"]}
                transaction.pop("receiptMs", None)
            records.append({"platform": platform, "category": category, "caseId": case,
                            "status": status, "target": None if category == "deployment" else contracts[platform],
                            "transaction": {k: transaction[k] for k in keys if k in transaction}})

        for setup in report["setups"]:
            add(setup["transaction"], setup["platform"], setup["kind"])
        for trial in report["trials"]:
            for tx in trial["setup"]:
                add(tx, trial["platform"], "trial_setup", trial["caseId"], trial["status"])
            for request in trial["requests"]:
                add(request["transaction"], trial["platform"], "warmup" if trial["warmup"] else "primary",
                    trial["caseId"], request["status"])
        for trial in report.get("supplementaryTrials", []):
            for tx in trial["setup"]:
                add(tx, trial["platform"], "supplementary_setup", trial["caseId"], trial["status"])
            for request in trial["requests"]:
                add(request["transaction"], trial["platform"], "supplementary_warmup" if trial["warmup"] else "supplementary_primary",
                    trial["caseId"], request["status"])
        confirmed = [r["transaction"] for r in records if r["transaction"].get("receiptStatus") == 1]
        assert len({r["transactionHash"] for r in confirmed}) == len(confirmed)
        assert all(int(r["gasCostWei"]) == int(r["gasUsed"]) * int(r["effectiveGasPriceWei"]) for r in confirmed)
        datasets.append({"id": stage["suite"] + "-euint16", "sourceReport": str(file.resolve()),
                         "sourceSha256": sha(file), "contracts": contracts, "records": records, "report": report})
    return datasets


def table(caption, label, rows):
    lines = [r"\begin{table*}[!t]", "\\caption{" + caption + "}", "\\label{" + label + "}",
             r"\centering", r"\footnotesize", r"\setlength{\tabcolsep}{4pt}",
             r"\begin{tabular}{|l|l|l|l|r|}", r"\hline",
             r"\textbf{Configuration} & \textbf{Observed interval (UTC)} & \textbf{Contract} & \textbf{Containing block range} & \textbf{Mean gas/target} \\", r"\hline"]
    for row in rows:
        interval = (r"\shortstack[l]{" + row["startUtc"] + r" \\ -- " + row["endUtc"] + "}") if row["n"] else "--"
        address = row["contract"]
        blocks = f"{row['firstBlock']}--{row['lastBlock']}" if row["n"] else "--"
        percent = f"{row['meanGasTargetPct']:.1f}" + r"\%" if row["n"] else "--"
        lines += [NAMES[row["platform"]] + " & " + interval + " & " + r"\texttt{" + address[:6] + "..." + address[-4:] + "} & " + blocks + " & " + percent + r" \\", r"\hline"]
    return "\n".join(lines + [r"\end{tabular}", r"\end{table*}", ""])


def main(root, prepare=False):
    root = root.resolve()
    folder = root / "network"
    folder.mkdir(exist_ok=True)
    datasets = load(root)
    if prepare:
        file = folder / "input-plan.json"
        if file.exists():
            raise ValueError("Metadata input already exists; preserve prior evidence")
        save(file, {"datasets": [{k: v for k, v in d.items() if k != "report"} for d in datasets]})
        print(json.dumps({"plan": str(file)}))
        return
    metadata_file = folder / "block-metadata.json"
    metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
    assert metadata["status"] == "finished" and metadata["inputPlanSha256"] == sha(folder / "input-plan.json")
    refs = {(r["dataset"], r["index"]): r for r in metadata["references"]}
    recovered = {r["transactionHash"]: r["canonical"] for r in metadata["reconciliations"]}
    blocks = metadata["blocks"]
    table_rows, summaries, overview, per_case = [], [], [], []
    lines = ["# 16-bit concurrency and circuit-depth experiments", "",
             "Measured repetitions per case/platform: " + "; ".join(f"{d['report']['config']['suite']}: {d['report']['config']['repetitions']}" for d in datasets) + ". Capacity rejections and missing observations remain explicit; a missing receipt has no gas or latency value.", "",
             "## Network-condition table definitions", "",
             "Observed intervals are UTC timestamps of the first and last canonical containing blocks for measured primary transactions. They exclude setup, preparation and decryption. The network rows include confirmed transactions even if later plaintext retrieval failed.", "",
             "Mean gas/target is the transaction-weighted mean of 100 × containing-block gasUsed / (containing-block gasLimit / 2). It measures sampled block utilization, not operation gas. A block containing several measured requests contributes once per request. Values can exceed 100%. Unique-block summaries are also recorded in JSON.", "",
             "Platform windows are sequential with rotated order. Concurrent writers operate within a platform; these tables do not establish matched network conditions or causal latency differences across platforms.", "",
             f"Canonical metadata audit: {len(metadata['blocks'])} blocks, {len(metadata['references'])} transaction references; {len(metadata['reconciliations'])} reconciliations. All containing blocks finalized at the audit checkpoint: {metadata['allContainingBlocksFinalized']}.", ""]
    stamp = lambda t: datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    for dataset in datasets:
        report = dataset["report"]
        suite = report["config"]["suite"]
        numbered = list(enumerate(dataset["records"]))

        def network_rows(case=None):
            rows = []
            for platform in NAMES:
                selected = [(i, r) for i, r in numbered if r["platform"] == platform and r["category"] == "primary" and (case is None or r["caseId"] == case)]
                bs = [blocks[refs[(dataset["id"], i)]["canonicalBlockHash"]] for i, r in selected if (dataset["id"], i) in refs]
                unique = {b["hash"]: b for b in bs}
                ratios = [200 * int(b["gasUsed"]) / int(b["gasLimit"]) for b in bs]
                row = {"suite": suite, "caseId": case, "platform": platform, "n": len(bs),
                       "contract": dataset["contracts"][platform],
                       "firstBlock": min(b["number"] for b in bs) if bs else None,
                       "lastBlock": max(b["number"] for b in bs) if bs else None,
                       "startUtc": stamp(min(b["timestamp"] for b in bs)) if bs else None,
                       "endUtc": stamp(max(b["timestamp"] for b in bs)) if bs else None,
                       "meanGasTargetPct": statistics.mean(ratios) if bs else None,
                       "transactionWeightedTargetPct": describe(ratios),
                       "uniqueContainingBlocks": len(unique),
                       "uniqueBlockTargetPct": describe(200 * int(b["gasUsed"]) / int(b["gasLimit"]) for b in unique.values()),
                       "gasLimit": describe(int(b["gasLimit"]) for b in unique.values())}
                rows.append(row)
            table_rows.extend(rows)
            return rows

        rows = network_rows()
        overview.append(table(f"Sepolia deployments and measurement intervals ({suite}, 16-bit arithmetic)", f"tab:sepolia-{suite}-deployments", rows))
        lines += [f"## {suite.capitalize()}", "", "| Configuration | Observed interval (UTC) | Contract | Containing block range | Mean gas/target | Measured tx n |", "|---|---|---|---|---:|---:|"]
        for row in rows:
            percent = f"{row['meanGasTargetPct']:.1f}%" if row["n"] else "--"
            lines.append(f"| {NAMES[row['platform']]} | {row['startUtc']} — {row['endUtc']} | `{row['contract']}` | {row['firstBlock']}–{row['lastBlock']} | {percent} | {row['n']} |")
        lines += ["", "| Case | Platform | Successful / attempted windows | Capacity rejected | Validated requests | Receipt mean ms (n) | Immediate completion ms (n) | Deferred audit ms (n) |", "|---|---|---:|---:|---:|---:|---:|---:|"]
        for case in report["cases"]:
            rows = network_rows(case["id"])
            label = "tab:sepolia-" + case["id"].replace("_", "-")
            caption = "Sepolia deployments and measurement intervals: " + case["id"].replace("_", r"\_")
            per_case.append(table(caption, label, rows))
            for platform in NAMES:
                trials = [t for t in latest_trials(report) if t["caseId"] == case["id"] and t["platform"] == platform and not t["warmup"]]
                requests = [r for t in trials for r in t["requests"]]
                valid = [r for r in requests if r["status"] == "ok" and r["transaction"].get("transactionHash") not in recovered]
                row = {"suite": suite, "case": case, "platform": platform, "attemptedWindows": len(trials),
                       "retainedPriorAttempts": sum(t["caseId"] == case["id"] and t["platform"] == platform and not t["warmup"] for t in report["trials"]) - len(trials),
                       "successfulWindows": sum(t["status"] == "ok" for t in trials),
                       "primarySuccessfulWindows": sum(t.get("originalStatus", t["status"]) == "ok" for t in trials),
                       "separatelyLateValidatedWindows": sum(bool(t.get("lateAuditUsed")) for t in trials),
                       "capacityRejectedWindows": sum(t["status"] == "capacity_rejected" for t in trials),
                       "inconsistentWindows": sum(t["status"] == "inconsistent" for t in trials),
                       "validatedRequests": len(valid),
                       "receiptMs": describe(r["transaction"].get("receiptMs") for r in requests if r["transaction"].get("transactionHash") not in recovered),
                       "completionMs": describe(r.get("transactionToValidatedMs") for r in valid),
                       "postReceiptMs": describe(r.get("postReceiptMs") for r in valid),
                       "deferredAuditMs": describe(r.get("auditCallMs") for r in valid),
                       "preparationMs": describe(t.get("preparationMs") for t in trials if not t.get("resumedPreparation")),
                       "broadcastSpreadMs": describe(v for t in trials for v in t["broadcastSpreadsMs"]),
                       "receiptThroughput": describe(t.get("receiptTransactionsPerSecond") for t in trials if not any(r["transaction"].get("transactionHash") in recovered for r in t["requests"])),
                       "orderChangedWindows": sum(bool(t.get("orderChanged")) for t in trials),
                       "finalDiffersFromPlannedOrderWindows": sum(t.get("finalMatchesPlannedOrder") is False for t in trials)}
                summaries.append(row)
                fmt = lambda s: f"{s['mean']:.1f} ({s['n']})" if s["n"] else "-- (0)"
                lines.append(f"| {case['id']} | {platform} | {row['successfulWindows']}/{len(trials)} | {row['capacityRejectedWindows']} | {len(valid)} | {fmt(row['receiptMs'])} | {fmt(row['completionMs'])} | {fmt(row['deferredAuditMs'])} |")
        transactions = [r["transaction"] for _, r in numbered if r["transaction"].get("receiptStatus") == 1]
        total = sum(int(recovered.get(t["transactionHash"], t)["gasCostWei"]) for t in transactions)
        lines += ["", f"Actual canonical gas cost, including deployment, authorization, input/window setup and warmups: {total} wei ({total / 10**18:.15f} ETH), from {len(transactions)} confirmed receipts.", ""]
        supplementary_transactions = [r["transaction"] for _, r in numbered if r["category"].startswith("supplementary_") and r["transaction"].get("receiptStatus") == 1]
        supplementary_cost = sum(int(recovered.get(t["transactionHash"], t)["gasCostWei"]) for t in supplementary_transactions)
        lines += [f"Supplementary observations retained outside the approved reduced matrix: {len(report.get('supplementaryTrials', []))} trials, {len(supplementary_transactions)} confirmed transactions, {supplementary_cost} wei. These are excluded from primary performance and network-condition table rows; their cost is included in the total above.", ""]
        if report.get("scopeRevision"):
            save(folder / "supplementary-scope-audit.json", {"scopeRevision": report["scopeRevision"],
                 "unchangedOriginalObservationsVerified": True, "supplementaryTrials": len(report.get("supplementaryTrials", [])),
                 "confirmedSupplementaryTransactions": len(supplementary_transactions), "supplementaryGasCostWei": str(supplementary_cost)})
        events = Counter()
        hints = Counter()
        for trial in report["trials"]:
            for request in trial["requests"]:
                for stage in request.get("stages", []) + request["transaction"].get("stages", []):
                    if stage["status"] == "error":
                        events[stage["stage"]] += 1
                    detail = stage.get("detail", {})
                    for k in ("intervalMs", "retryAfterMs", "httpStatus", "backoffMs"):
                        if k in detail:
                            hints[f"{stage['stage']}:{k}={detail[k]}"] += 1
        save(folder / f"{suite}-events.json", {"scope": "recorded measured and warmup request/transaction traces; setup and uninstrumented SDK requests excluded",
                                              "failedStages": dict(events), "observedHintsAndHttp": dict(hints)})
    rpc_files = [("campaign", root / "rpc-read-retries.jsonl"), ("metadata", folder / "metadata-rpc-read-retries.jsonl")]
    rpc_audits = []
    manifest = json.loads((root / "campaign.json").read_text(encoding="utf-8"))
    for prior in manifest.get("historicalRpcJournals", []):
        file = Path(prior["file"])
        assert sha(file) == prior["sha256"]
        rpc_files.append((prior["scope"], file))
    for scope, file in rpc_files:
        records = [json.loads(line) for line in file.read_text(encoding="utf-8").splitlines() if line.strip()] if file.exists() else []
        waits = [span["durationMs"] for record in records for span in record.get("backoffs", [])]
        methods = Counter(record["method"] for record in records)
        rpc_audits.append({"scope": scope, "file": str(file), "sha256": sha(file) if file.exists() else None,
                           "readCallsWithRetries": len(records), "retryEvents": sum(len(r["retries"]) for r in records),
                           "methods": dict(methods), "observedBackoffMs": describe(waits)})
    save(folder / "rpc-read-events.json", {"scopes": rpc_audits,
         "interpretation": "Campaign-wide read-only RPC retries across setup/warmup/measured work; metadata audit retries separate. No mutation retries. Waits remain included in calling observation wall times; no pure-compute attribution."})
    lines += ["## Read-only RPC resilience", ""]
    for audit in rpc_audits:
        lines.append(f"{audit['scope']}: {audit['readCallsWithRetries']} read calls with retries; {audit['retryEvents']} recorded retry events. Details and observed backoff durations: rpc-read-events.json.")
    lines.append("")
    lines += ["## Interpretation", "",
              "Concurrency receipt throughput is for receipt-synchronized waves, not continuous saturation or maximum network capacity. Audits decrypt snapshots after all receipts and measure already-ready retrieval. A changed canonical order with a matching modular replay is valid behavior, not an inconsistency.", "",
              "Circuit completion runs from prepared compute broadcast to validated plaintext. Preparation/readiness, input loading and signing are separate. Post-receipt latency includes network/RPC/service waiting and decryption, not isolated FHE computation. Linear/tree pairs have equal addition counts; affine chains increase both operation count and depth.", "",
              "All arithmetic uses unsigned 16-bit wrapping, including the baseline and replay oracle. Repeated requests in a window are not independent robustness trials. Capacity-rejected circuits have no compute transaction, receipt latency or compute gas; their setup still costs gas. No p-values or causal platform ranking are inferred here.", "",
              "Recovered window correctness is labeled separately from primary successful windows. Late audits never restore missing original validation/full-window latency. Raw outcomes/timings are unchanged. Reconciled receipt timings and affected-window throughput are excluded; later canonical metadata is supplementary evidence. Hint histograms describe recorded hints, not independently measured sleep durations.", ""]
    (folder / "network-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (folder / "deployment-intervals.tex").write_text("\n".join(overview), encoding="utf-8")
    (folder / "case-deployment-intervals.tex").write_text("\n".join(per_case), encoding="utf-8")
    save(folder / "analysis-and-network-values.json", {"tableRows": table_rows, "caseMetrics": summaries,
          "metadataSha256": sha(metadata_file), "rawSources": [{"file": d["sourceReport"], "sha256": d["sourceSha256"]} for d in datasets]})
    for dataset in datasets:
        assert sha(Path(dataset["sourceReport"])) == dataset["sourceSha256"]
    print(json.dumps({"networkReport": str(folder / "network-report.md"), "tables": len(overview) + len(per_case), "caseMetricRows": len(summaries)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--prepare-metadata", action="store_true")
    args = parser.parse_args()
    main(args.root, args.prepare_metadata)
