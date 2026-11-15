"""Read-only audit of completed reports; writes only supplementary audit artifacts."""
from collections import Counter, defaultdict
from datetime import datetime
from hashlib import sha256
import json
from pathlib import Path
import statistics
import sys


def digest(path):
    return sha256(Path(path).read_bytes()).hexdigest()


def stats(values):
    values = [float(v) for v in values if v is not None]
    if not values:
        return {"n": 0}
    mean = statistics.mean(values)
    sd = statistics.stdev(values) if len(values) > 1 else 0
    ordered = sorted(values)
    return {"n": len(values), "meanMs": mean, "medianMs": statistics.median(values),
            "sdMs": sd, "cvPct": sd / mean * 100 if mean else None,
            "minMs": min(values), "maxMs": max(values),
            "p95NearestRankMs": ordered[max(0, (95 * len(values) + 99) // 100 - 1)]}


def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000


def audit(file):
    report = json.loads(file.read_bytes())
    assert (report["complete"] or report.get("executionComplete")) and int(report["chainId"]) == 11155111
    primary = [s for s in report["samples"] if not s["warmup"]]
    failures = [s for s in primary if s["status"] != "ok"]
    assert len(primary) == 900
    if failures:
        assert not report["complete"] and len(failures) == 1
        assert failures[0]["platform"] == "zama" and failures[0]["operation"] == "mean" and failures[0]["run"] == 21
        assert "USER_DECRYPT" in failures[0]["error"]
    else:
        assert report["complete"]
    assert len(report["samples"]) == 918 and len(report["setup"]) == 3
    views = report["viewDecryptSamples"]
    assert len(views) == 153 and all(s["status"] == "ok" for s in views)
    assert not report["retrySamples"]
    assert all(s["preparedTransactionHash"] == s["transactionHash"] and
               s["broadcastState"] == "acknowledged" and s["receiptStatus"] == 1
               for s in report["samples"])
    transactions = report["setup"] + report["samples"]
    assert len({s["transactionHash"] for s in transactions}) == 921
    for s in transactions:
        assert int(s["gasCostWei"]) == int(s["gasUsed"]) * int(s["effectiveGasPriceWei"])

    prefix_checks = []
    segments = []
    begin = 0
    for continuation in report.get("continuations", []):
        source_path = Path(continuation["sourceReport"])
        source = json.loads(source_path.read_bytes())
        assert digest(source_path) == continuation["sourceReportSha256"]
        for key in ("samples", "setup", "viewDecryptSamples", "barriers"):
            assert source[key] == report[key][:len(source[key])]
        prefix_checks.append({"source": str(source_path), "sha256": digest(source_path),
                              "samples": len(source["samples"]), "allPrefixesUnchanged": True})
        end = continuation["sourceSampleCount"]
        segments.append(("original", report["samples"][begin:end]))
        begin = end
    segments.append(("continuation" if begin else "single", report["samples"][begin:]))
    latest_sources = report.get("continuations", [{}])[-1].get("sourceSha256", report["sourceSha256"])
    source_changes = [p for p, h in latest_sources.items() if digest(p) != h]
    assert not source_changes, source_changes
    for bundle in report["decryptionPolling"]["bundles"].values():
        assert digest(bundle["file"]) == bundle["sha256"]

    rows = []
    worker_ids = {}
    for name, samples in segments:
        worker_ids[name] = {p: sorted({s["workerPid"] for s in samples if s["platform"] == p})
                            for p in report["selectedPlatforms"]}
        assert len({pid for ids in worker_ids[name].values() for pid in ids}) == 3
        for platform in report["selectedPlatforms"]:
            for operation in report["measuredOperations"]:
                selected = [s for s in samples if not s["warmup"] and s["platform"] == platform
                            and s["operation"] == operation]
                if not selected:
                    continue
                valid = [s for s in selected if s["status"] == "ok"]
                row = {"segment": name, "platform": platform, "operation": operation, "attempted": len(selected),
                       "successful": len(valid), "failed": len(selected) - len(valid)}
                for field in ("inputPreparationMs", "transactionPreparationMs", "preparationMs",
                              "barrierWaitMs", "broadcastAckMs", "confirmationMs",
                              "postReceiptToValidatedPlaintextMs", "transactionToValidatedPlaintextMs"):
                    source_rows = selected if field == "confirmationMs" else valid
                    row[field] = stats(s.get(field) for s in source_rows)
                row["clientLifecycleMs"] = stats(s["preparationMs"] + s["transactionToValidatedPlaintextMs"] for s in valid)
                row["workerStartToPlaintextWallMs"] = stats(timestamp(s["plaintextValidatedAt"]) - timestamp(s["startedAt"]) for s in valid)
                rows.append(row)

    spreads = []
    for run in range(1, 51):
        for operation in report["measuredOperations"]:
            group = [s for s in primary if s["run"] == run and s["operation"] == operation]
            assert len(group) == 3
            starts = [timestamp(s["broadcastStartedAt"]) for s in group]
            spreads.append({"run": run, "operation": operation, "spreadMs": max(starts) - min(starts)})
            assert len({(s["preparedMaxFeePerGasWei"], s["preparedMaxPriorityFeePerGasWei"]) for s in group}) == 1
            barrier = next(b for b in report["barriers"] if not b["warmup"] and b["run"] == run and b["operation"] == operation)
            assert all(barrier["prepared"][s["platform"]]["hash"] == s["preparedTransactionHash"] for s in group)
            assert all(timestamp(s["preparationCompletedAt"]) <= timestamp(barrier["releaseAt"]) for s in group)
    assert len(report["barriers"]) == 306

    counters = defaultdict(Counter)
    failed_reads = Counter()
    events = Counter()
    scope = {"primaryMeasured": 900, "primaryWarmup": 18, "viewMeasured": 150, "viewWarmup": 3, "deployments": 3}
    for sample in transactions + views:
        platform = sample["platform"]
        for stage in sample.get("stages", []):
            label = stage["stage"]
            detail = stage.get("detail", {})
            events[f"{platform}:{label}"] += 1
            if stage["status"] == "error":
                failed_reads[f"{platform}:{label}"] += 1
            for field in ("intervalMs", "retryAfterMs", "backoffMs", "originalServerHintMs", "appliedHintMs", "httpStatus"):
                if field in detail:
                    counters[f"{platform}:{label}:{field}"][str(detail[field])] += 1

    gas = {}
    nonces = {}
    for platform in report["selectedPlatforms"]:
        selected = [s for s in transactions if s["platform"] == platform]
        gas[platform] = {"transactions": len(selected), "gasUsed": sum(int(s["gasUsed"]) for s in selected),
                         "costWei": str(sum(int(s["gasCostWei"]) for s in selected))}
        ns = sorted(s["transactionNonce"] for s in report["samples"] if s["platform"] == platform)
        assert len(ns) == len(set(ns)) and ns == list(range(ns[0], ns[-1] + 1))
        nonces[platform] = {"primaryFirst": ns[0], "primaryLast": ns[-1], "primaryCountIncludingWarmup": len(ns)}
    result = {"report": str(file.resolve()), "sha256": digest(file), "width": report["uniformWidth"],
              "verifiedAt": datetime.now().astimezone().isoformat(),
              "successfulPrimary": len(primary) - len(failures), "failedPrimary": len(failures),
              "scope": scope, "segmentCount": len(segments), "prefixChecks": prefix_checks,
              "sourceAndSdkHashesUnchanged": True, "workerIdsBySegment": worker_ids,
              "transactionNonces": nonces, "gasIncludingDeploymentsAndWarmups": gas,
              "broadcastStartSpreadMs": stats(s["spreadMs"] for s in spreads), "broadcastSpreads": spreads,
              "segmentMetrics": rows, "eventObservationScope": scope,
              "recordedEventCounts": dict(events), "failedStageCounts": dict(failed_reads),
              "recordedHintAndHttpHistograms": {k: dict(v) for k, v in counters.items()},
              "notes": ["Histograms describe recorded hints/events, not independently measured sleep durations.",
                        "Client lifecycle = preparation + transaction-to-validated plaintext; intentional barrier is separate.",
                        "Worker wall includes barrier waiting; post-receipt time is not isolated FHE computation.",
                        "Views are separate already-ready retrievals after primary max validation.",
                        "The 16-bit restart creates separate observation segments and SDK sessions; no uninterrupted-run claim."]}
    file.with_name("rerun-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"width": report["uniformWidth"], "audit": str(file.with_name("rerun-audit.json")),
                      "sha256": result["sha256"], "segments": len(segments),
                      "broadcastSpread": result["broadcastStartSpreadMs"], "failedStages": dict(failed_reads)}))


for argument in sys.argv[1:]:
    audit(Path(argument))
