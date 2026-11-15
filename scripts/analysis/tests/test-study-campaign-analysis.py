"""Synthetic fixtures verify network weighting and unsent-capacity denominators."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "analyze-study-campaign.py"
SPEC = importlib.util.spec_from_file_location("study_campaign_analysis", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class NetworkTables(unittest.TestCase):
    def test_retained_preparation_is_not_a_second_planned_observation(self):
        prior = {"caseId": "case", "platform": "zama", "repetition": 12, "warmup": False, "status": "pending"}
        resumed = {**prior, "status": "ok"}
        self.assertEqual(MODULE.latest_trials({"trials": [prior, resumed]}), [resumed])
        with self.assertRaises(AssertionError):
            MODULE.latest_trials({"trials": [resumed, resumed]})

    def test_weighting_and_missing_receipts_are_explicit(self):
        with tempfile.TemporaryDirectory(prefix="study-network-fixture-") as temporary:
            root = Path(temporary)
            stages = []
            for suite in ("circuits", "concurrency"):
                folder = root / suite
                folder.mkdir()
                case = {"id": suite + "-w16-test", "suite": suite, "width": 16}
                setups, trials = [], []

                def transaction(name, block="a"):
                    return {"transactionHash": suite + name, "preparedTransactionHash": suite + name,
                            "transactionNonce": 1, "user": "owner", "broadcastState": "acknowledged",
                            "blockHash": block, "blockNumber": 1 if block == "a" else 2,
                            "receiptStatus": 1, "gasUsed": 2, "effectiveGasPriceWei": "3", "gasCostWei": "6",
                            "receiptMs": 10, "stages": []}

                for platform in MODULE.NAMES:
                    setups.append({"kind": "deployment", "platform": platform,
                                   "address": "0x" + "12" * 20, "transaction": transaction(platform + "deploy")})
                    requests = [] if platform == "zama" else [
                        {"status": "ok", "transaction": transaction(platform + str(i), block), "stages": []}
                        for i, block in enumerate(("a", "b", "b"))]
                    trials.append({"caseId": case["id"], "platform": platform, "warmup": False, "repetition": 1,
                                   "status": "capacity_rejected" if platform == "zama" else "ok",
                                   "setup": [], "requests": requests, "broadcastSpreadsMs": []})
                report = {"executionComplete": True, "chainId": 11155111, "mock": False,
                          "config": {"suite": suite, "widths": "16", "repetitions": 1},
                          "setups": setups, "trials": trials, "cases": [case]}
                if suite == "concurrency":
                    late = transaction("late-supplementary-setup")
                    canonical = {k: late[k] for k in ("blockHash", "blockNumber", "receiptStatus", "gasUsed", "effectiveGasPriceWei", "gasCostWei")}
                    canonical["transactionIndex"] = 0
                    for key in ("blockHash", "blockNumber", "receiptStatus", "gasUsed", "effectiveGasPriceWei", "gasCostWei", "receiptMs"):
                        late.pop(key, None)
                    extra = {"caseId": "excluded-case", "platform": "baseline", "warmup": False, "repetition": 1,
                             "status": "pending", "setup": [late],
                             "requests": [{"status": "ok", "transaction": transaction("supplementary"), "stages": []}], "broadcastSpreadsMs": []}
                    original = {**report, "trials": trials + [extra]}
                    original_file = folder / "original-raw.json"
                    MODULE.save(original_file, original)
                    report["supplementaryTrials"] = [extra]
                    report["settledSetupReceipts"] = [{"transactionHash": late["transactionHash"], "canonical": canonical}]
                    report["scopeRevision"] = {"originalReport": str(original_file), "originalSha256": MODULE.sha(original_file),
                                               "selectedIndices": [0, 1, 2], "supplementaryIndices": [3]}
                file = folder / "report.json"
                MODULE.save(file, report)
                stages.append({"suite": suite, "status": "finished", "report": str(file), "rawSha256": MODULE.sha(file)})
            MODULE.save(root / "campaign.json", {"stages": stages})
            MODULE.main(root, True)
            plan = root / "network/input-plan.json"
            datasets = json.loads(plan.read_text())["datasets"]
            references = [{"dataset": dataset["id"], "index": i, "canonicalBlockHash": r["transaction"]["blockHash"]}
                          for dataset in datasets for i, r in enumerate(dataset["records"])]
            metadata = {"status": "finished", "inputPlanSha256": MODULE.sha(plan), "references": references,
                        "reconciliations": [], "allContainingBlocksFinalized": True,
                        "blocks": {"a": {"number": 1, "timestamp": 1, "hash": "a", "gasUsed": "100", "gasLimit": "100"},
                                   "b": {"number": 2, "timestamp": 13, "hash": "b", "gasUsed": "25", "gasLimit": "100"}}}
            MODULE.save(root / "network/block-metadata.json", metadata)
            MODULE.main(root)
            result = json.loads((root / "network/analysis-and-network-values.json").read_text())
            rows = [r for r in result["tableRows"] if r["caseId"] is None]
            for row in rows:
                if row["platform"] == "zama":
                    self.assertEqual(row["n"], 0)
                    self.assertIsNone(row["meanGasTargetPct"])
                else:
                    self.assertEqual(row["n"], 3)
                    self.assertEqual(row["meanGasTargetPct"], 100)
                    self.assertEqual(row["uniqueBlockTargetPct"]["mean"], 125)
            scope_audit = json.loads((root / "network/supplementary-scope-audit.json").read_text())
            self.assertTrue(scope_audit["unchangedOriginalObservationsVerified"])
            self.assertEqual(scope_audit["confirmedSupplementaryTransactions"], 2)
            self.assertEqual(scope_audit["supplementaryGasCostWei"], "12")
            self.assertTrue(all(r["completionMs"]["n"] == 0 for r in result["caseMetrics"]))
            self.assertIn("--", (root / "network/deployment-intervals.tex").read_text())
            for stage in stages:
                self.assertEqual(MODULE.sha(Path(stage["report"])), stage["rawSha256"])


if __name__ == "__main__":
    unittest.main()
