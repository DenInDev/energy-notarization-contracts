"""Session aggregation must preserve failed timing, capacity counts and raw hashes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("extension", Path(__file__).resolve().parents[1] / "analyze-study-sample-extension.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
study = module.study


class ExtensionAnalysis(unittest.TestCase):
    def test_three_sessions_keep_capacity_and_late_recovery_separate(self):
        with tempfile.TemporaryDirectory(prefix="study-extension-fixture-") as temporary:
            root = Path(temporary)
            manifests = []
            originals = []
            raw_hashes = {}
            for session in range(1, 4):
                folder = root / f"session-{session}"
                folder.mkdir()
                stages = []
                for suite, case_count in (("concurrency", 4), ("circuits", 10)):
                    cases = [{"id": f"{suite}-{i}", "suite": suite, "width": 16} for i in range(case_count)]
                    report = {"executionComplete": True, "chainId": 11155111, "mock": False,
                              "config": {"suite": suite, "widths": "16", "repetitions": 10, "seed": f"session-{session}"},
                              "setups": [], "cases": cases, "platforms": list(study.NAMES), "trials": []}
                    for platform in study.NAMES:
                        deployment = {"transactionHash": f"{session}/{suite}/{platform}/deploy", "receiptStatus": 1,
                                      "blockHash": "block", "gasUsed": 2, "effectiveGasPriceWei": "3", "gasCostWei": "6"}
                        report["setups"].append({"kind": "deployment", "platform": platform, "address": "0x" + "12" * 20,
                                                 "transaction": deployment})
                        for i, case in enumerate(cases):
                            for repetition in range(1, 11):
                                rejected = suite == "circuits" and platform == "zama" and i >= 8
                                late = session == 1 and suite == "circuits" and platform == "zama" and i == 3 and repetition == 1
                                tx = {"transactionHash": f"{session}/{suite}/{platform}/{i}/{repetition}",
                                      "receiptStatus": 1, "blockHash": "block", "gasUsed": 2,
                                      "effectiveGasPriceWei": "3", "gasCostWei": "6", "receiptMs": 10}
                                request = {"status": "ok", "transaction": tx, "transactionToValidatedMs": 15,
                                           "postReceiptMs": 5, "stages": []}
                                trial = {"caseId": case["id"], "platform": platform, "warmup": False,
                                         "repetition": repetition, "status": "ok", "requests": [request],
                                         "setup": [], "preparationMs": 20, "broadcastSpreadsMs": []}
                                if rejected:
                                    trial["status"] = "capacity_rejected"
                                    request.clear()
                                    request.update({"status": "error", "transaction": {}, "stages": []})
                                if late:
                                    trial["status"] = "incomplete"
                                    request["status"] = "error"
                                    request.pop("transactionToValidatedMs")
                                    request.pop("postReceiptMs")
                                    report["lateComputeReceipts"] = [{"transactionHash": tx["transactionHash"],
                                                                      "canonical": {k: v for k, v in tx.items() if k != "receiptMs"}}]
                                    request["transaction"] = {"transactionHash": tx["transactionHash"]}
                                    key = f"{case['id']}/{platform}/{repetition}/false/main"
                                    report["recoveredAudits"] = [{"key": key, "status": "ok"}]
                                report["trials"].append(trial)
                    file = folder / f"{suite}.json"
                    study.save(file, report)
                    raw_hashes[file] = study.sha(file)
                    stages.append({"suite": suite, "status": "finished", "report": str(file), "rawSha256": study.sha(file)})
                    if session == 1:
                        originals.append({"file": str(file), "sha256": study.sha(file)})
                manifest_file = folder / "campaign.json"
                study.save(manifest_file, {"stages": stages})
                study.main(folder, True)
                plan = folder / "network/input-plan.json"
                datasets = json.loads(plan.read_text())["datasets"]
                references = [{"dataset": d["id"], "index": i, "canonicalBlockHash": "block"}
                              for d in datasets for i, r in enumerate(d["records"]) if r["transaction"].get("receiptStatus") == 1]
                study.save(folder / "network/block-metadata.json", {"status": "finished", "inputPlanSha256": study.sha(plan),
                           "references": references, "reconciliations": [], "allContainingBlocksFinalized": True,
                           "blocks": {"block": {"number": 1, "timestamp": 1, "hash": "block", "gasUsed": "25", "gasLimit": "100"}}})
                study.main(folder)
                if session > 1:
                    manifests.append({"id": f"session-{session}", "status": "finished", "manifest": str(manifest_file),
                                      "finishedManifestSha256": study.sha(manifest_file)})
            study.save(root / "campaign.json", {"targetRepetitions": 30, "originalReports": originals,
                       "originalNetworkRoot": str(root / "session-1"), "sessions": manifests})
            module.analyze(root)
            result = json.loads((root / "analysis/combined-results.json").read_text())
            row = next(r for r in result["caseMetrics"] if r["caseId"] == "circuits-3" and r["platform"] == "zama")
            self.assertEqual((row["attempted"], row["primarySuccessful"], row["lateValidated"]), (30, 29, 1))
            self.assertEqual(row["metrics"]["receiptMs"]["n"], 29)
            self.assertEqual(row["metrics"]["completionMs"]["n"], 29)
            self.assertEqual(row["metrics"]["gasUsed"]["n"], 30)
            rejected = next(r for r in result["caseMetrics"] if r["caseId"] == "circuits-8" and r["platform"] == "zama")
            self.assertEqual(rejected["capacityRejected"], 30)
            self.assertEqual(rejected["metrics"]["gasUsed"]["n"], 0)
            self.assertEqual(len(result["caseMetrics"]), 42)
            for file, checksum in raw_hashes.items():
                self.assertEqual(study.sha(file), checksum)


if __name__ == "__main__":
    unittest.main()
