"""Describe each uniform-width campaign using its recorded primary and read samples."""
import hashlib
import json
from pathlib import Path
import statistics
import sys


def stats(values):
    values = [float(value) for value in values if value is not None]
    if not values:
        return {"n": 0}
    mean = statistics.mean(values)
    sd = statistics.stdev(values) if len(values) > 1 else None
    return {"n": len(values), "meanMs": mean, "medianMs": statistics.median(values),
            "sdMs": sd, "cvPct": 100 * sd / mean if sd is not None and mean else None}


def analyze(file):
    raw = file.read_bytes()
    report = json.loads(raw)
    if report["schemaVersion"] not in (13, 14) or report["uniformWidth"] not in (16, 128):
        raise ValueError("Expected a uniform-width schema-13/14 report")
    operations = report.get("measuredOperations", ["notarize", "add", "mul_scalar", "mean", "max"])
    if report["schemaVersion"] == 14 and operations != ["set_meter_owner", "notarize", "add", "mul_scalar", "mean", "max"]:
        raise ValueError("Schema-14 requires the owner import before the five energy operations")
    width = report["uniformWidth"]
    measured = [row for row in report["samples"] if not row["warmup"]]
    keys = [(row["platform"], row["run"], row["operation"]) for row in measured]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate primary observations")
    expected_keys = {(platform, run, operation) for platform in report["selectedPlatforms"]
                     for run in range(1, report["runs"] + 1) for operation in operations}
    if report["complete"] and set(keys) != expected_keys:
        raise ValueError("Missing or unexpected primary observations")
    if report["complete"]:
        warmups = [row for row in report["samples"] if row["warmup"]]
        expected_warmups = {(platform, 0, operation) for platform in report["selectedPlatforms"] for operation in operations}
        if (len(warmups) != len(expected_warmups) or
                {(row["platform"], row["run"], row["operation"]) for row in warmups} != expected_warmups or
                any(row["status"] != "ok" for row in warmups) or len(report["setup"]) != 3):
            raise ValueError("Invalid warmup or deployment count")
        views = report.get("viewDecryptSamples", [])
        expected_views = {(platform, run, run == 0) for platform in report["selectedPlatforms"] for run in range(report["runs"] + 1)}
        if (len(views) != len(expected_views) or
                {(row["platform"], row["run"], row["warmup"]) for row in views} != expected_views or
                any(row["status"] != "ok" for row in views)):
            raise ValueError("Missing or failed separate view_decrypt observations")
        if report["schemaVersion"] == 14:
            owner = report["smartMeter"]["syntheticOwnerAddress"].lower()
            if any(row.get("plaintextAddress", "").lower() != owner or row.get("smartMeterId") != report["smartMeter"]["id"]
                   for row in report["samples"] if row["operation"] == "set_meter_owner"):
                raise ValueError("Meter owner association did not validate")
    for field in ("readingBits", "accumulatorBits", "resultBits"):
        if report["energyRepresentation"][field] != width:
            raise ValueError("Mixed widths in the workload")
    records = []
    for platform in report["selectedPlatforms"]:
        for operation in operations:
            rows = [row for row in measured if row["platform"] == platform and row["operation"] == operation]
            ok = [row for row in rows if row["status"] == "ok"]
            record = {"platform": platform, "operation": operation, "attempted": len(rows),
                      "ok": len(ok), "failed": sum(row["status"] == "error" for row in rows)}
            for metric in ("inputPreparationMs", "preparationMs", "barrierWaitMs", "broadcastAckMs",
                           "confirmationMs", "postReceiptToValidatedPlaintextMs", "transactionToValidatedPlaintextMs"):
                source = rows if metric == "confirmationMs" else ok
                record[metric] = stats([row.get(metric) for row in source])
            record["clientLifecycleMs"] = stats([
                row.get("preparationMs", 0) + row["transactionToValidatedPlaintextMs"] for row in ok])
            record["meanGas"] = statistics.mean([row["gasUsed"] for row in rows if "gasUsed" in row]) if any("gasUsed" in row for row in rows) else None
            records.append(record)
        views = [row for row in report.get("viewDecryptSamples", []) if row["platform"] == platform and not row["warmup"]]
        ok_views = [row for row in views if row["status"] == "ok"]
        records.append({"platform": platform, "operation": "view_decrypt", "attempted": len(views),
                        "ok": len(ok_views), "failed": sum(row["status"] == "error" for row in views),
                        **{metric: stats([row.get(metric) for row in ok_views]) for metric in
                           ("viewMs", "decryptAndValidationMs", "viewToValidatedPlaintextMs")}})
    triples = []
    for run in range(1, report["runs"] + 1):
        for operation in operations:
            rows = [row for row in measured if row["run"] == run and row["operation"] == operation]
            if len(rows) == 3 and all(row.get("blockHash") for row in rows):
                triples.append(len({row["blockHash"] for row in rows}) == 1)
    receipt_rows = report["setup"] + report["samples"]
    for row in receipt_rows:
        if row.get("gasUsed") is not None and row.get("effectiveGasPriceWei") is not None:
            actual = int(row["gasUsed"]) * int(row["effectiveGasPriceWei"])
            if int(row["gasCostWei"]) != actual:
                raise ValueError("Receipt gas cost does not match gasUsed * effectiveGasPrice")
    gas_wei = sum(int(row.get("gasCostWei", 0)) for row in receipt_rows)
    result = {"reportSha256": hashlib.sha256(raw).hexdigest(), "width": width,
              "complete": report["complete"], "measuredPrimary": len(measured),
              "plannedMeasuredPrimary": 3 * len(operations) * report["runs"],
              "scope": "completed campaign" if report["complete"] else "partial campaign; scheduled operations remain unattempted",
              "validatedPrimary": sum(row["status"] == "ok" for row in measured),
              "warmupPrimary": sum(row["warmup"] for row in report["samples"]),
              "sameBlockComparisons": sum(triples), "blockEligibleComparisons": len(triples),
              "gasCostWeiIncludingDeploymentAndWarmup": str(gas_wei),
              "gasCostWeiByPlatform": {platform: str(sum(int(row.get("gasCostWei", 0)) for row in receipt_rows
                  if row["platform"] == platform)) for platform in report["selectedPlatforms"]},
              "operationOrder": operations, "smartMeter": report.get("smartMeter"),
              "polling": report["decryptionPolling"], "rows": records}
    if report["complete"] and (len(measured) != 3 * len(operations) * report["runs"] or
                               result["validatedPrimary"] != len(measured) or
                               any(row["ok"] != report["runs"] for row in records)):
        raise ValueError("Complete report has missing or failed observations")
    file.with_name("uniform-analysis.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    lines = [f"# Uniform {width}-bit lifecycle campaign", "", f"Status: {result['scope']}.",
             f"Primary success count: {result['validatedPrimary']}/{len(measured)} attempted; {result['plannedMeasuredPrimary']} planned.",
             f"Same-block comparisons: {sum(triples)}/{len(triples)} eligible.",
             f"Actual gas cost including deployment and warmup: {gas_wei / 10**18:.12f} ETH.", "",
             "Means below are client-observed milliseconds. Each metric records its denominator in the JSON.",
             "Primary completion includes retries and waiting. Full client lifecycle adds preparation and excludes the intentional barrier wait.",
             "The separate view_decrypt reads the persisted max result after primary validation. Its samples are already-ready retrievals.", "",
             *( ["The set_meter_owner operation imports and stores an encrypted address for the same public meter ID used by energy state. It measures address input registration and retrieval, not an arithmetic FHE operator. The deployment operator remains the caller/decryptor.", ""]
                if "set_meter_owner" in operations else [] ),
             "| Platform | Operation | Successful/attempted | Receipt mean | Post-receipt mean | Validated completion mean | View-plus-decrypt mean |",
             "|---|---|---:|---:|---:|---:|---:|"]
    for row in records:
        means = [row.get(metric, {}).get("meanMs") for metric in
                 ("confirmationMs", "postReceiptToValidatedPlaintextMs", "transactionToValidatedPlaintextMs", "viewToValidatedPlaintextMs")]
        formatted = ["--" if value is None else f"{value:.1f}" for value in means]
        lines.append(f"| {row['platform']} | {row['operation']} | {row['ok']}/{row['attempted']} | " + " | ".join(formatted) + " |")
    file.with_name("uniform-analysis.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("width", "complete", "measuredPrimary", "validatedPrimary", "sameBlockComparisons")}))


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        analyze(Path(argument))
