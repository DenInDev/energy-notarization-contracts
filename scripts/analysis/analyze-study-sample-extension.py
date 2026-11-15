"""Descriptive, session-aware aggregation of the authorized 10+10+10 study.

Reads immutable reports and existing canonical metadata; never sends RPC calls
or repairs a failed latency. No independent-request or causal inference claims.
"""
import argparse
from collections import defaultdict
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("study_analysis", Path(__file__).with_name("analyze-study-campaign.py"))
study = importlib.util.module_from_spec(spec)
spec.loader.exec_module(study)


def analyze(root):
    manifest = json.loads((root / "campaign.json").read_text(encoding="utf-8"))
    assert manifest["targetRepetitions"] == 30 and len(manifest["sessions"]) == 2
    groups, sources, networks, costs, seen_hashes = defaultdict(list), [], [], [], set()
    datasets = []
    # Both original reports were audited together by the completed compact campaign.
    original_root = Path(manifest["originalNetworkRoot"])
    originals = study.load(original_root)
    for dataset, expected in zip(originals, manifest["originalReports"]):
        assert Path(dataset["sourceReport"]).resolve() == Path(expected["file"]).resolve()
        assert dataset["sourceSha256"] == expected["sha256"]
        datasets.append(("session-1", original_root, dataset))
    for session in manifest["sessions"]:
        assert session["status"] == "finished"
        file = Path(session["manifest"])
        assert study.sha(file) == session["finishedManifestSha256"]
        datasets.extend((session["id"], file.parent, dataset) for dataset in study.load(file.parent))

    for session_id, network_root, dataset in datasets:
        report, suite = dataset["report"], dataset["report"]["config"]["suite"]
        assert report["config"]["repetitions"] == 10
        sources.append({"session": session_id, "suite": suite, "file": dataset["sourceReport"],
                        "sha256": dataset["sourceSha256"], "seed": report["config"]["seed"],
                        "continuations": report.get("continuations", [])})
        metadata_file = network_root / "network/block-metadata.json"
        metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
        assert metadata["status"] == "finished"
        assert metadata["inputPlanSha256"] == study.sha(network_root / "network/input-plan.json")
        reconciliation = {r["transactionHash"]: r["canonical"] for r in metadata["reconciliations"]}
        excluded_timing = set(reconciliation)
        excluded_timing.update(r["transactionHash"] for r in report.get("canonicalReceipts", []))
        excluded_timing.update(r["transactionHash"] for r in report.get("lateComputeReceipts", []))
        values = json.loads((network_root / "network/analysis-and-network-values.json").read_text(encoding="utf-8"))
        assert any(Path(s["file"]).resolve() == Path(dataset["sourceReport"]).resolve() and
                   s["sha256"] == dataset["sourceSha256"] for s in values["rawSources"])
        networks.extend({"session": session_id, **row} for row in values["tableRows"] if row["suite"] == suite)
        category_costs = defaultdict(int)
        for record in dataset["records"]:
            tx = record["transaction"]
            if tx.get("receiptStatus") != 1:
                continue
            assert tx["transactionHash"] not in seen_hashes, "Transaction duplicated between sessions"
            seen_hashes.add(tx["transactionHash"])
            receipt = reconciliation.get(tx["transactionHash"], tx)
            cost = int(receipt["gasUsed"]) * int(receipt["effectiveGasPriceWei"])
            assert cost == int(receipt["gasCostWei"])
            category_costs[record["category"]] += cost
        costs.append({"session": session_id, "suite": suite,
                      "gasCostWei": str(sum(category_costs.values())),
                      "categoriesWei": {k: str(v) for k, v in category_costs.items()}})
        for case in report["cases"]:
            for platform in study.NAMES:
                trials = [t for t in study.latest_trials(report) if not t["warmup"] and
                          t["caseId"] == case["id"] and t["platform"] == platform]
                assert len(trials) == 10
                requests = [r for t in trials for r in t["requests"]]
                valid = [r for r in requests if r["status"] == "ok" and
                         r["transaction"].get("transactionHash") not in excluded_timing]
                # Include the historical failed compute's late canonical receipt for gas, never timing.
                gas_by_hash = {r["transaction"]["transactionHash"]: r["transaction"].get("gasUsed")
                               for r in dataset["records"] if r["category"] == "primary" and
                               r["platform"] == platform and r["caseId"] == case["id"] and
                               r["transaction"].get("receiptStatus") == 1}
                sample = {"session": session_id, "attempted": len(trials),
                          "primarySuccessful": sum(t.get("originalStatus", t["status"]) == "ok" for t in trials),
                          "lateValidated": sum(bool(t.get("lateAuditUsed")) for t in trials),
                          "capacityRejected": sum(t["status"] == "capacity_rejected" for t in trials),
                          "inconsistent": sum(t["status"] == "inconsistent" for t in trials),
                          "orderChanged": sum(bool(t.get("orderChanged")) for t in trials),
                          "finalDiffersFromPlanned": sum(t.get("finalMatchesPlannedOrder") is False for t in trials),
                          "values": {
                              "gasUsed": [reconciliation.get(h, {"gasUsed": gas})["gasUsed"] for h, gas in gas_by_hash.items()],
                              "receiptMs": [r["transaction"].get("receiptMs") for r in requests if
                                            r["transaction"].get("transactionHash") not in excluded_timing],
                              "completionMs": [r.get("transactionToValidatedMs") for r in valid],
                              "postReceiptMs": [r.get("postReceiptMs") for r in valid],
                              "deferredAuditMs": [r.get("auditCallMs") for r in valid],
                              "preparationMs": [t.get("preparationMs") for t in trials if not t.get("resumedPreparation")],
                              "receiptThroughput": [t.get("receiptTransactionsPerSecond") for t in trials if not
                                                    any(r["transaction"].get("transactionHash") in excluded_timing for r in t["requests"])],
                              "computeClientWorkMs": [t["preparationMs"] + t["requests"][0]["transactionToValidatedMs"]
                                                      for t in trials if suite == "circuits" and
                                                      t.get("originalStatus", t["status"]) == "ok" and
                                                      not t.get("resumedPreparation") and "preparationMs" in t and
                                                      "transactionToValidatedMs" in t["requests"][0] and
                                                      t["requests"][0]["transaction"].get("transactionHash") not in excluded_timing],
                          }}
                groups[(suite, case["id"], platform)].append(sample)

    rows = []
    for (suite, case, platform), segments in groups.items():
        assert len(segments) == 3 and len({s["session"] for s in segments}) == 3
        row = {"suite": suite, "caseId": case, "platform": platform}
        for key in ("attempted", "primarySuccessful", "lateValidated", "capacityRejected", "inconsistent", "orderChanged", "finalDiffersFromPlanned"):
            row[key] = sum(s[key] for s in segments)
        assert row["attempted"] == 30
        row["metrics"] = {key: study.describe(v for s in segments for v in s["values"][key])
                          for key in segments[0]["values"]}
        row["sessions"] = [{**{k: v for k, v in s.items() if k != "values"},
                            "metrics": {k: study.describe(v) for k, v in s["values"].items()}} for s in segments]
        rows.append(row)
    assert len(rows) == 42
    output = root / "analysis"
    output.mkdir(exist_ok=True)
    if (output / "combined-results.json").exists():
        raise ValueError("Combined analysis already exists; preserve it")
    study.save(output / "combined-results.json", {"kind": "descriptive-session-stratified-study-extension",
               "targetRepetitions": 30, "rawSources": sources, "caseMetrics": rows,
               "networkRowsBySession": networks, "actualCostsBySession": costs,
               "methodology": "Pooled values are descriptive; retain per-session results. No independence, p-value or causal platform ranking claims. Late recovery never repairs primary timing."})
    lines = ["# 30-repetition 16-bit study results", "",
             "The original ten repetitions plus two new ten-repetition sessions. Existing failures, late correctness audits and capacity rejections remain explicit. No mutation is replayed.", "",
             "Pooled means are descriptive and must be read alongside the per-session JSON results. Fresh contracts, distinct declared seeds, separate warmups and temporal segments are retained. More samples do not remove public-network confounding or guarantee detection of rare faults.", "",
             "| Case | Platform | Attempts | Primary success | Late correctness | Capacity rejected | Gas mean (n) | Receipt ms (n) | Validated ms (n) | Post-receipt ms (n) |",
             "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    fmt = lambda d: f"{d['mean']:.1f} ({d['n']})" if d["n"] else "-- (0)"
    for r in rows:
        lines.append(f"| {r['caseId']} | {r['platform']} | {r['attempted']} | {r['primarySuccessful']} | {r['lateValidated']} | {r['capacityRejected']} | " +
                     " | ".join(fmt(r["metrics"][k]) for k in ("gasUsed", "receiptMs", "completionMs", "postReceiptMs")) + " |")
    lines += ["", "Concurrency plaintext audits are deferred already-ready retrieval, not immediate completion. Circuit preparation includes input loading/readiness and is separate from compute broadcast-to-validation; computeClientWorkMs adds the two for eligible observations. Capacity rejection has no compute gas or latency; its setup still costs gas.", "",
              "Canonical network-condition tables and polling/retry observations are retained separately for each session:", "",
              f"- Session 1: {original_root / 'network/network-report.md'}"]
    lines += [f"- {s['id']}: {Path(s['manifest']).parent / 'network/network-report.md'}" for s in manifest["sessions"]]
    lines += ["", "Actual gas costs include deployments, authorization, warmups, input/window setup and confirmed failed observations. Historical supplementary conditions remain separately identified in the category costs."]
    (output / "combined-results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(output / "combined-results.md"), "cells": len(rows), "repetitionsPerCell": 30}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    analyze(parser.parse_args().root.resolve())
