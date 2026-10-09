"""P4 must use current checker evidence and distinguish unavailable tools from errors."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import gate_build  # noqa: E402


class P4StaticEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.pdir = self.root / "pipeline"
        (self.repo / "src").mkdir(parents=True)
        (self.repo / "out").mkdir()
        (self.pdir / "evidence" / "phase4").mkdir(parents=True)
        (self.repo / "src" / "component.cpp").write_text("int f() { return 1; }\n")
        self.guard = self.root / "guard.py"
        self.guard.write_text("# test checker\n")
        self.report = self.pdir / "evidence" / "phase4" / "clang_tidy_findings.json"

    def run_checker(self, report=None, returncode=0, timeout=False, raw=None):
        def run(cmd, **kwargs):
            if "--clang-tidy" not in cmd:
                kwargs["stdout"].write('[{"file": "src/component.cpp"}]')
                return subprocess.CompletedProcess(cmd, 0, "", "")
            if timeout:
                raise subprocess.TimeoutExpired(cmd, 600)
            if raw is not None:
                self.report.write_text(raw)
            elif report is not None:
                self.report.write_text(json.dumps(report))
            return subprocess.CompletedProcess(cmd, returncode, "", "checker diagnostic")

        with patch.object(gate_build, "STYLE_GUARD", str(self.guard)), \
                patch.object(gate_build, "_resolve_ninja", return_value="test-ninja"), \
                patch.object(gate_build.subprocess, "run", side_effect=run):
            return gate_build.clang_tidy_substep(
                str(self.pdir), str(self.repo), ["src/component.cpp"], "out")

    def assert_artifacts_exist(self, rels):
        for rel in rels:
            self.assertTrue((self.pdir / rel).is_file(), rel)

    def test_current_empty_report_can_pass(self):
        findings, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""})
        self.assertEqual(findings, [])
        self.assertIn("PASS", note)
        self.assert_artifacts_exist(rels)

    def test_content_finding_keeps_actual_rule_instead_of_backend_error(self):
        findings, rels, _ = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": "",
             "findings": [{"file": "src/component.cpp", "line": 1,
                           "rule_id": "G.NAM.03-CPP"}]}, returncode=1)
        self.assertEqual(findings[0]["rule_id"], "G.NAM.03-CPP")

    def test_real_findings_still_block(self):
        findings, rels, _ = self.run_checker(
            {"clang_tidy_findings": [{"file": "src/component.cpp",
                                     "line": 1, "rule_id": "G.CLS.04-CPP"}],
             "clang_tidy_note": ""}, returncode=1)
        self.assertTrue(findings)
        self.assert_artifacts_exist(rels)

    def test_explicit_tool_unavailable_keeps_advisory(self):
        findings, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": "clang-tidy not found"})
        self.assertEqual(findings, [])
        self.assertIn("clang-tidy not found", note)
        self.assertIn("degraded=True", (self.pdir / "evidence" / "phase4" /
                                      "clang_tidy_note.txt").read_text())
        self.assert_artifacts_exist(rels)

    def test_nonzero_checker_without_findings_cannot_pass(self):
        findings, rels, _ = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""}, returncode=3)
        self.assertTrue(findings, "backend crash must not become clean static analysis")
        self.assert_artifacts_exist(rels)

    def test_stale_report_cannot_substitute_for_current_output(self):
        self.report.write_text(json.dumps(
            {"clang_tidy_findings": [], "clang_tidy_note": ""}))
        findings, rels, _ = self.run_checker(report=None, returncode=3)
        self.assertTrue(findings, "old zero-findings report must not authorize PASS")
        self.assert_artifacts_exist(rels)

    def test_timeout_returns_a_recordable_failure(self):
        findings, rels, note = self.run_checker(timeout=True)
        self.assertTrue(findings)
        self.assertIn("timeout", note.lower())
        self.assert_artifacts_exist(rels)

    def test_missing_or_invalid_report_is_a_backend_failure(self):
        for raw in (None, "not JSON", '{"unexpected": []}'):
            with self.subTest(raw=raw):
                self.report.unlink(missing_ok=True)
                findings, rels, _ = self.run_checker(raw=raw)
                self.assertTrue(findings, "missing structured evidence cannot pass")
                self.assert_artifacts_exist(rels)

    def test_note_cannot_hide_real_findings(self):
        findings, rels, _ = self.run_checker(
            {"clang_tidy_findings": [{"file": "src/component.cpp",
                                     "line": 1, "rule_id": "G.CLS.04-CPP"}],
             "clang_tidy_note": "some translation units unavailable"}, returncode=1)
        self.assertTrue(findings)
        self.assert_artifacts_exist(rels)


if __name__ == "__main__":
    unittest.main()
