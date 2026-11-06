import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("availability", Path(__file__).resolve().parent.parent / "analyze-availability.py")
availability = importlib.util.module_from_spec(spec)
spec.loader.exec_module(availability)


class AvailabilityTests(unittest.TestCase):
    def test_incomplete_legacy_errors_remain_unclassified_and_warmup_is_separate(self):
        result = availability.analyze({"complete": False, "setup": [{"status": "error"}], "samples": [
            {"platform": "zama", "operation": "notarize", "warmup": True, "status": "error", "error": "deadline exceeded"},
            {"platform": "zama", "operation": "notarize", "warmup": False, "status": "ok"},
        ]})
        self.assertFalse(result["campaign_complete"])
        self.assertEqual(result["setup_records"], 1)
        measured, warmup = result["groups"]
        self.assertEqual(measured["success_fraction"], 1)
        self.assertEqual(warmup["errors"], 1)
        self.assertEqual(warmup["typed_timeouts"], 0)
        self.assertEqual(warmup["completion_censored"], 0)

    def test_expanded_censoring_requires_explicit_field(self):
        result = availability.analyze({"samples": [
            {"platform": "zama", "caseId": "case", "status": "timeout", "completionCensored": True},
            {"platform": "zama", "caseId": "case", "status": "timeout", "phase": "input"},
            {"platform": "zama", "caseId": "case", "status": "pending"},
        ]})["groups"][0]
        self.assertEqual(result["attempted"], 3)
        self.assertEqual(result["typed_timeouts"], 2)
        self.assertEqual(result["completion_censored"], 1)
        self.assertEqual(result["pending"], 1)


if __name__ == "__main__":
    unittest.main()
