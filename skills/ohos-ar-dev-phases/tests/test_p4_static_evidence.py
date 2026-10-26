"""P4 uses current checker evidence, blocks only the critical AST subset, and
fails closed when the checker could not prove that subset ran."""
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import gate_build  # noqa: E402
import gatelib as gl  # noqa: E402


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

    def run_checker(self, report=None, returncode=0, timeout=False, raw=None,
                    guard=None, ninja="test-ninja"):
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

        with patch.object(gate_build, "STYLE_GUARD",
                          str(guard or self.guard)), \
                patch.object(gate_build, "_resolve_ninja", return_value=ninja), \
                patch.object(gate_build.subprocess, "run", side_effect=run):
            return gate_build.clang_tidy_substep(
                str(self.pdir), str(self.repo), ["src/component.cpp"], "out")

    def assert_artifacts_exist(self, rels):
        for rel in rels:
            self.assertTrue((self.pdir / rel).is_file(), rel)

    def assert_blocks(self, result):
        blocking, observed, rels, note = result
        self.assertTrue(blocking, note)
        self.assert_artifacts_exist(rels)
        return blocking, observed

    def test_current_empty_report_can_pass(self):
        blocking, observed, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""})
        self.assertEqual(blocking, [])
        self.assertEqual(observed, [])
        self.assertIn("PASS", note)
        self.assert_artifacts_exist(rels)

    def test_noncritical_content_finding_is_observation_not_blocker(self):
        blocking, observed, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": "",
             "findings": [{"file": "src/component.cpp", "line": 1,
                           "rule_id": "G.NAM.03-CPP"}]}, returncode=1)
        self.assertEqual(blocking, [])
        self.assertEqual([f["rule_id"] for f in observed], ["G.NAM.03-CPP"])
        self.assertIn("non-blocking", note)
        self.assert_artifacts_exist(rels)
        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual(report["findings"][0]["rule_id"], "G.NAM.03-CPP")

    def test_noncritical_ast_finding_is_observation_not_blocker(self):
        blocking, observed, rels, _ = self.run_checker(
            {"clang_tidy_findings": [{"file": "src/component.cpp",
                                     "line": 1, "rule_id": "G.CLS.04-CPP"}],
             "clang_tidy_note": ""}, returncode=1)
        self.assertEqual(blocking, [])
        self.assertEqual([f["rule_id"] for f in observed], ["G.CLS.04-CPP"])
        self.assert_artifacts_exist(rels)

    def test_each_critical_ast_rule_blocks(self):
        for rule_id in sorted(gate_build.gl.P4_CRITICAL_AST_RULESET_IDS):
            with self.subTest(rule_id=rule_id):
                self.report.unlink(missing_ok=True)
                blocking, observed = self.assert_blocks(self.run_checker(
                    {"clang_tidy_findings": [{"file": "src/component.cpp",
                                             "line": 7, "rule_id": rule_id}],
                     "clang_tidy_note": ""}, returncode=1))
                self.assertEqual([f["rule_id"] for f in blocking], [rule_id])
                self.assertEqual(observed, [])

    def test_critical_and_noncritical_mix_only_blocks_critical(self):
        blocking, observed = self.assert_blocks(self.run_checker(
            {"clang_tidy_findings": [
                {"file": "src/component.cpp", "line": 1, "rule_id": "G.RES.07-CPP"},
                {"file": "src/component.cpp", "line": 2, "rule_id": "G.CLS.04-CPP"}],
             "clang_tidy_note": ""}, returncode=1))
        self.assertEqual([f["rule_id"] for f in blocking], ["G.RES.07-CPP"])
        self.assertEqual([f["rule_id"] for f in observed], ["G.CLS.04-CPP"])

    def test_backend_finding_blocks_even_without_critical_rule(self):
        self.assert_blocks(self.run_checker(
            {"clang_tidy_findings": [{"file": "", "line": 0,
                                     "rule_id": "clang-tidy-backend",
                                     "remediation": "checker crashed"}],
             "clang_tidy_note": ""}, returncode=1))

    def test_explicit_tool_unavailable_is_fail_closed(self):
        blocking, _, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": "clang-tidy not found"})
        self.assertTrue(blocking, note)
        self.assertIn("clang-tidy not found", note)
        self.assertIn("fail-closed", note)
        self.assert_artifacts_exist(rels)

    def test_missing_compile_database_note_is_fail_closed(self):
        blocking, _, rels, note = self.run_checker(
            {"clang_tidy_findings": [],
             "clang_tidy_note": "compile_commands.json not found"})
        self.assertTrue(blocking, note)
        self.assert_artifacts_exist(rels)

    def test_nonzero_checker_without_findings_cannot_pass(self):
        self.assert_blocks(self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""}, returncode=3))

    def test_stale_report_cannot_substitute_for_current_output(self):
        self.report.write_text(json.dumps(
            {"clang_tidy_findings": [], "clang_tidy_note": ""}))
        self.assert_blocks(self.run_checker(report=None, returncode=3))

    def test_timeout_returns_a_recordable_failure(self):
        blocking, _, rels, note = self.run_checker(timeout=True)
        self.assertTrue(blocking)
        self.assertIn("timeout", note.lower())
        self.assert_artifacts_exist(rels)

    def test_missing_or_invalid_report_is_a_backend_failure(self):
        for raw in (None, "not JSON", '{"unexpected": []}'):
            with self.subTest(raw=raw):
                self.report.unlink(missing_ok=True)
                blocking, _, rels, _ = self.run_checker(raw=raw)
                self.assertTrue(blocking,
                                "missing structured evidence cannot pass")
                self.assert_artifacts_exist(rels)

    def test_note_cannot_hide_real_findings(self):
        blocking, observed = self.assert_blocks(self.run_checker(
            {"clang_tidy_findings": [{"file": "src/component.cpp",
                                     "line": 1, "rule_id": "G.RES.07-CPP"}],
             "clang_tidy_note": "some translation units unavailable"}, returncode=1))
        rules = [f["rule_id"] for f in blocking]
        self.assertIn("G.RES.07-CPP", rules)
        # The partial-tool note is also a blocking backend status; it must not
        # replace or hide the critical finding.
        self.assertIn("clang-tidy-backend", rules)
        self.assertEqual(observed, [])

    def test_guard_missing_is_fail_closed(self):
        missing = self.root / "missing-guard.py"
        blocking, _, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""},
            guard=missing)
        self.assertTrue(blocking, note)
        self.assertIn("guard missing", note)
        self.assert_artifacts_exist(rels)

    def test_ninja_missing_is_fail_closed(self):
        blocking, _, rels, note = self.run_checker(
            {"clang_tidy_findings": [], "clang_tidy_note": ""}, ninja=None)
        self.assertTrue(blocking, note)
        self.assertIn("ninja", note)
        self.assert_artifacts_exist(rels)


class _FakeBuildProc:
    def __init__(self, lines, returncode):
        self.stdout = list(lines)
        self._returncode = returncode

    def wait(self):
        return self._returncode


class P4MainPolicyTests(unittest.TestCase):
    """P4 main path: metric/non-critical findings are observations, only the
    critical/backend subset can sign a FAIL."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.pdir = self.root / "pipeline"
        (self.repo / "out").mkdir(parents=True)
        (self.pdir / "evidence" / "phase4").mkdir(parents=True)
        self.run_id = "p4-main-%s" % self._testMethodName.lower()
        self.keys = self.root / "keys"
        patcher = patch.object(gate_build.gl, "SECRET_ROOT", str(self.keys))
        patcher.start()
        self.addCleanup(patcher.stop)
        gl.create_secret(self.run_id)
        gl.save_state(str(self.pdir), {
            "run_id": self.run_id,
            "repo": str(self.repo),
            "git_dir": str(self.repo),
            "base_commit": "",
            "build_target": "test_target",
            "current_phase": 4,
            "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "optimization_policy_version": 0,
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        })

    def _run_main(self, metric_findings, ct_findings, ct_observed, ct_note):
        def fake_metric(pdir, repo, changed_cxx):
            rel = "evidence/phase4/metric_findings.json"
            Path(pdir, rel).write_text(json.dumps(
                {"findings": metric_findings}), encoding="utf-8")
            return metric_findings, rel

        def fake_ct(pdir, repo, changed_cxx, out_dir_rel, **kwargs):
            rel = "evidence/phase4/clang_tidy_note.txt"
            Path(pdir, rel).write_text(ct_note, encoding="utf-8")
            return ct_findings, ct_observed, [rel], ct_note

        argv = ["gate_build.py", "--pipeline-dir", str(self.pdir)]
        with patch.object(gate_build.envs, "build_argv",
                          return_value=[sys.executable, "-c", "pass"]), \
                patch.object(gate_build.envs, "success_re",
                             return_value=re.compile("BUILD_OK")), \
                patch.object(gate_build.envs, "error_re",
                             return_value=re.compile("BUILD_ERR")), \
                patch.object(gate_build.envs, "out_dir",
                             return_value="out"), \
                patch.object(gate_build.subprocess, "Popen",
                             return_value=_FakeBuildProc(["BUILD_OK\n"], 0)), \
                patch.object(gate_build.gl, "load_signed_contract",
                             return_value=(False, None,
                                           "no signed AR_design (contract absent)")), \
                patch.object(gate_build, "metric_substep", side_effect=fake_metric), \
                patch.object(gate_build, "clang_tidy_substep", side_effect=fake_ct), \
                patch.object(sys, "argv", argv):
            gate_build.main()

    def _last_entry(self):
        manifest = gl.read_manifest(str(self.pdir))
        self.assertTrue(manifest)
        return manifest[-1]

    def test_metric_and_noncritical_findings_still_sign_pass(self):
        self._run_main(
            metric_findings=[{"file": "src/component.cpp", "line": 1,
                              "rule_id": "G.FUN.01"}],
            ct_findings=[],
            ct_observed=[{"file": "src/component.cpp", "line": 2,
                          "rule_id": "G.CLS.04-CPP"}],
            ct_note="degraded=False; 1 non-blocking finding")
        entry = self._last_entry()
        self.assertEqual(entry["verdict"], "PASS")
        self.assertIn("metric: OBSERVED 1", entry["reason"])
        self.assertIn("1 non-blocking static observation", entry["reason"])

    def test_metric_unavailable_is_reported_as_unavailable_not_observed(self):
        self._run_main(
            metric_findings=[{"file": "", "line": 1,
                              "rule_id": "metric-backend",
                              "remediation": "lizard missing"}],
            ct_findings=[], ct_observed=[], ct_note="degraded=False; clean")
        entry = self._last_entry()
        self.assertEqual(entry["verdict"], "PASS")
        self.assertIn("metric: UNAVAILABLE (lizard missing", entry["reason"])
        self.assertNotIn("metric: OBSERVED", entry["reason"])

    def test_critical_finding_signs_fail_in_main_path(self):
        with self.assertRaises(SystemExit):
            self._run_main(
                metric_findings=[],
                ct_findings=[{"file": "src/component.cpp", "line": 3,
                              "rule_id": "G.RES.07-CPP",
                              "remediation": "use-after-free"}],
                ct_observed=[],
                ct_note="degraded=False; blocking")
        entry = self._last_entry()
        self.assertEqual(entry["verdict"], "FAIL")
        self.assertIn("G.RES.07-CPP", entry["reason"])
        repair = gl.read_control_json(
            str(self.pdir), "repairs", "current.json")
        self.assertTrue(any(
            loc.get("rule") == "G.RES.07-CPP"
            for loc in (repair.get("suspect_locations") or [])), repair)

    def test_metric_missing_guard_still_writes_signed_artifact(self):
        missing = self.root / "missing-metric.py"
        with patch.object(gate_build, "METRIC_GUARD", str(missing)):
            findings, rel = gate_build.metric_substep(
                str(self.pdir), str(self.repo), [])
        self.assertTrue(findings)
        self.assertTrue((self.pdir / rel).is_file())
        payload = json.loads((self.pdir / rel).read_text(encoding="utf-8"))
        self.assertEqual(payload["findings"][0]["rule_id"], "metric-backend")

    def test_metric_non_object_report_becomes_observation_marker(self):
        script = self.root / "metric.py"
        script.write_text(
            "#!/usr/bin/env python3\n"
            "import sys\n"
            "open(sys.argv[sys.argv.index('--json') + 1], 'w').write('[]')\n",
            encoding="utf-8")
        with patch.object(gate_build, "METRIC_GUARD", str(script)):
            findings, rel = gate_build.metric_substep(
                str(self.pdir), str(self.repo), [])
        self.assertTrue(findings)
        self.assertEqual(findings[0]["rule_id"], "metric-backend")
        self.assertTrue((self.pdir / rel).is_file())

    def test_metric_non_object_finding_item_becomes_marker(self):
        script = self.root / "metric.py"
        script.write_text(
            "#!/usr/bin/env python3\n"
            "import sys\n"
            "open(sys.argv[sys.argv.index('--json') + 1], 'w').write("
            "'{\"findings\": [\"not-a-dict\"]}')\n",
            encoding="utf-8")
        with patch.object(gate_build, "METRIC_GUARD", str(script)):
            findings, rel = gate_build.metric_substep(
                str(self.pdir), str(self.repo), [])
        self.assertTrue(findings)
        self.assertEqual(findings[0]["rule_id"], "metric-backend")
        self.assertTrue((self.pdir / rel).is_file())

    def test_stale_metric_findings_not_reused_when_tool_writes_nothing(self):
        metric_report = self.pdir / "evidence" / "phase4" / "metric_findings.json"
        metric_report.write_text(json.dumps({
            "files": 1,
            "findings": [{"file": "old.cpp", "line": 1,
                          "rule_id": "G.FUN.01", "remediation": "stale"}],
        }), encoding="utf-8")
        script = self.root / "metric_no_write.py"
        script.write_text(
            "#!/usr/bin/env python3\nraise SystemExit(3)\n",
            encoding="utf-8")
        with patch.object(gate_build, "METRIC_GUARD", str(script)):
            findings, rel = gate_build.metric_substep(
                str(self.pdir), str(self.repo), [])
        self.assertTrue(findings)
        self.assertEqual(findings[0]["rule_id"], "metric-backend")
        self.assertTrue(rel)
        payload = json.loads(metric_report.read_text(encoding="utf-8"))
        self.assertEqual(payload["findings"][0]["rule_id"], "metric-backend")
        self.assertNotIn("old.cpp", metric_report.read_text(encoding="utf-8"))

    def test_stale_clean_metric_report_not_reused_when_tool_writes_nothing(self):
        metric_report = self.pdir / "evidence" / "phase4" / "metric_findings.json"
        metric_report.write_text(json.dumps({
            "files": 1, "findings": [],
        }), encoding="utf-8")
        script = self.root / "metric_no_write_clean.py"
        script.write_text(
            "#!/usr/bin/env python3\nraise SystemExit(0)\n",
            encoding="utf-8")
        with patch.object(gate_build, "METRIC_GUARD", str(script)):
            findings, rel = gate_build.metric_substep(
                str(self.pdir), str(self.repo), [])
        self.assertTrue(findings)
        self.assertEqual(findings[0]["rule_id"], "metric-backend")
        self.assertTrue(rel)
        payload = json.loads(metric_report.read_text(encoding="utf-8"))
        self.assertEqual(payload["findings"][0]["rule_id"], "metric-backend")


if __name__ == "__main__":
    unittest.main()
