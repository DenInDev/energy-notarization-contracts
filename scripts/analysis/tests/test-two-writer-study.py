import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("two_writer", Path(__file__).resolve().parents[1] / "analyze-two-writer-study.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TwoWriterCorrectness(unittest.TestCase):
    def test_canonical_reordering_is_not_a_mismatch_but_wrong_snapshots_are(self):
        # Alternating senders retain their own nonce order while swapping order within waves.
        order = [1, 0, 3, 2, 5, 4, 7, 6]
        report = {"cases": [], "trials": []}
        for mode, snapshots in (("shared_sum", [2, 3, 7, 10, 16, 21, 29, 36]),
                                ("shared_ordered", [2, 7, 25, 78, 240, 725, 2183, 6556])):
            case = {"id": mode, "mode": mode, "users": 2}
            report["cases"].append(case)
            requests = [{"requestId": f"{mode}/{ordinal}", "input": str(ordinal + 1), "status": "ok",
                         "plaintext": str(snapshots[i]), "transaction": {"receiptStatus": 1, "blockNumber": i // 2, "transactionIndex": i % 2}}
                        for i, ordinal in enumerate(order)]
            report["trials"].append({"caseId": mode, "platform": "zama", "status": "ok", "warmup": False,
                                     "repetition": 1, "requests": requests, "plannedOrder": [f"{mode}/{i}" for i in range(8)],
                                     "finalPlaintexts": {"shared": str(snapshots[-1])}})
        rows = module.correctness(report)
        self.assertTrue(all(r["reordered"] for r in rows))
        self.assertFalse(rows[0]["finalDiffers"])
        self.assertTrue(rows[1]["finalDiffers"])
        wrong = copy.deepcopy(report)
        wrong["trials"][0]["requests"][0]["plaintext"] = "999"
        with self.assertRaises(AssertionError):
            module.correctness(wrong)


if __name__ == "__main__":
    unittest.main()
