import importlib.util
import contextlib
import io
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("lifecycle_analysis", Path(__file__).with_name("analyze-lifecycle.py"))
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


class LifecycleAnalysisTests(unittest.TestCase):
    def test_complete_analysis_and_rejection_of_incomplete_campaign(self):
        report = {"complete": True, "selectedPlatforms": list(analysis.PLATFORMS), "runs": 50,
                  "startedAt": "unit-test-start", "completedAt": "unit-test-end", "scheduleSeed": "unit-test-only",
                  "setup": [{"platform": name, "address": "unit-test-only-address"} for name in analysis.PLATFORMS],
                  "schedule": [], "samples": []}
        for run in range(1, 51):
            for op_index, operation in enumerate(analysis.OPERATIONS):
                names = list(analysis.PLATFORMS)
                offset = (run + op_index) % 3
                order = names[offset:] + names[:offset]
                report["schedule"].append({"run": run, "operation": operation, "order": order})
                for index, name in enumerate(names):
                    receipt = 5000 + run * 20 + (index + 1) * (run % (index + 4)) * 100
                    tail = 10 + index * 1000 + (run % (index + 3)) * 20
                    report["samples"].append({"platform": name, "operation": operation, "run": run,
                        "warmup": False, "status": "ok", "orderPosition": order.index(name) + 1,
                        "plaintext": "42", "expectedPlaintext": "42", "transactionHash": "unit-test-only-hash",
                        "blockNumber": 1000 + run * 15 + op_index * 3 + index, "blockTimestamp": 123456,
                        "blockTargetUtilization": 1.0, "gasCostWei": "1234", "gasUsed": 100000,
                        "confirmationMs": receipt, "transactionToValidatedPlaintextMs": receipt + tail,
                        "postReceiptToValidatedPlaintextMs": tail, "stages": [],
                        **({"alreadyReadyDecryptMs": tail / 2} if name != "baseline" else {})})
        failed_repeat = next(row for row in report["samples"] if row["platform"] == "zama" and row["operation"] == "notarize" and row["run"] == 1)
        del failed_repeat["alreadyReadyDecryptMs"]
        failed_repeat["readyDecryptError"] = "unit-test-only TLS failure"
        with tempfile.TemporaryDirectory(prefix="lifecycle-analysis-unit-test-") as folder:
            source = Path(folder) / "report.json"
            source.write_text(json.dumps(report), encoding="utf-8")
            with patch.object(sys, "argv", ["analyze-lifecycle.py", str(source)]), contextlib.redirect_stdout(io.StringIO()):
                analysis.main()
            result = json.loads(source.with_name("analysis.json").read_text(encoding="utf-8"))
            self.assertEqual(len(result["comparisons"]), 30)
            self.assertEqual(len(result["lifecycleComparisons"]), 10)
            self.assertEqual(len(result["summary"]), 15)
            self.assertEqual(len(result["sdkNotarizationStages"]), 6)
            self.assertEqual(result["summary"][0]["alreadyReadyDecryptMs"]["n"], 0)
            zama_notarize = next(row for row in result["summary"] if row["platform"] == "zama" and row["operation"] == "notarize")
            self.assertEqual(zama_notarize["alreadyReadyDecryptMs"]["n"], 49)
            self.assertEqual(zama_notarize["readyDecryptFailures"], 1)
            self.assertTrue(source.with_name("operational-performance.tex").exists())
            latex = source.with_name("operational-performance.tex").read_text(encoding="utf-8")
            self.assertEqual(latex.count(r"\begin{tabular}"), latex.count(r"\end{tabular}"))
            self.assertEqual(latex.count(r"\begin{table*}"), latex.count(r"\end{table*}"))
            self.assertIn("Holm $p$", latex)
            self.assertIn("Client-observed SDK stages", source.with_name("operational-performance.md").read_text(encoding="utf-8"))
            self.assertIn("Full client lifecycle relative to baseline", source.with_name("operational-performance.md").read_text(encoding="utf-8"))
            report["complete"] = False
            source.write_text(json.dumps(report), encoding="utf-8")
            with patch.object(sys, "argv", ["analyze-lifecycle.py", str(source)]), self.assertRaisesRegex(ValueError, "complete"):
                analysis.main()

    def test_holm_adjustment_preserves_original_comparison_order(self):
        actual = analysis.holm_adjust([0.04, 0.01, 0.03])
        for observed, expected in zip(actual, [0.06, 0.03, 0.06]):
            self.assertAlmostEqual(observed, expected)
        self.assertEqual(analysis.holm_adjust([0.9, 0.8]), [1.0, 1.0])

    def test_sample_uncertainty_and_not_applicable_metrics(self):
        result = analysis.descriptive([10, 20, 30])
        self.assertEqual(result["mean"], 20)
        self.assertEqual(result["stddev"], 10)
        self.assertEqual(result["relativeStdPct"], 50)
        self.assertIsNone(analysis.descriptive([])["mean"])
        self.assertIsNone(analysis.descriptive([10])["stddev"])

    def test_block_bootstrap_is_seeded_and_preserves_constant_effect(self):
        self.assertEqual(analysis.block_bootstrap_interval([5] * 50, 42), [5.0, 5.0])
        values = list(range(50))
        self.assertEqual(analysis.block_bootstrap_interval(values, 42), analysis.block_bootstrap_interval(values, 42))
        self.assertIsNone(analysis.lag_one([5] * 50))
        self.assertEqual(analysis.block_bootstrap_geometric_ratio([math.log(2)] * 50, 42), [2.0, 2.0])


if __name__ == "__main__":
    unittest.main()
