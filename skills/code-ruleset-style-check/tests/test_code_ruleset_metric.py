#!/usr/bin/env python3
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / "scripts" / "code_ruleset_metric.py"


class CodeRulesetMetricTest(unittest.TestCase):
    def test_workbook_thresholds_are_not_relaxed(self):
        spec = importlib.util.spec_from_file_location("metric", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(module._THRESHOLDS["G.FUD.05"]["max_lines"], 50)
        self.assertEqual(module._THRESHOLDS["G.FUD.05"]["max_nesting"], 4)
        self.assertEqual(module._THRESHOLDS["G.FUD.05"]["max_params"], 5)
        self.assertNotIn("G.FUD.08-CPP", module._THRESHOLDS)

    def test_missing_function_backend_is_unavailable_not_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "sample.cpp"
            report = Path(tmp) / "metric.json"
            source.write_text("int Value() { return 1; }\n", encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "--skip-lizard", "--json", str(report),
                 str(source)], text=True, capture_output=True)
            payload = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(completed.returncode, 2)
            self.assertEqual(payload["function_metric_status"], "unavailable")
            self.assertEqual(payload["findings"], [])


if __name__ == "__main__":
    unittest.main()
