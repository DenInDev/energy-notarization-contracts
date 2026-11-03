"""Descriptive availability for complete OR partial lifecycle/expanded reports.

Uses only the standard library. Never imputes failed observations into latency.
Older lifecycle schemas lack typed timeout/censoring fields: their errors remain
unclassified errors rather than guessing censoring from error-message text.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path


def analyze(report):
    groups = defaultdict(list)
    for sample in report.get("samples", []):
        key = (sample["platform"], sample.get("caseId", sample.get("operation", "unknown")),
               "warmup" if sample.get("warmup") else "measured")
        groups[key].append(sample)
    output = []
    for (platform, case_id, phase), samples in sorted(groups.items()):
        statuses = [s.get("status", "pending") for s in samples]
        output.append({
            "platform": platform, "case": case_id, "phase": phase,
            "attempted": len(samples), "validated": statuses.count("ok"),
            "typed_timeouts": statuses.count("timeout"), "errors": statuses.count("error"),
            "pending": statuses.count("pending"),
            "success_fraction": statuses.count("ok") / len(samples),
            "completion_censored": sum(bool(s.get("completionCensored")) for s in samples),
        })
    return {"campaign_complete": report.get("complete", False), "groups": output,
            "setup_records": len(report.get("setups", report.get("setup", []))),
            "note": "Attempted observations only. Warmup is separate. Unattempted work is not a successful or failed request; expanded summary.json also reports planned counts."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    result = analyze(json.loads(args.report.read_text(encoding="utf-8")))
    target = args.report.with_name("availability.json")
    target.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"Saved: {target}")
