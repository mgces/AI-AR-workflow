#!/usr/bin/env python3
"""Per-attempt failure diagnostics remain advisory to signed gate evidence."""
import os
import importlib.util
from contextlib import redirect_stdout
from io import StringIO
from types import SimpleNamespace
import sys
import tempfile
import unittest
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402
_ADVANCE_SPEC = importlib.util.spec_from_file_location(
    "advance", os.path.join(HERE, "..", "scripts", "advance.py"))
advance = importlib.util.module_from_spec(_ADVANCE_SPEC)
_ADVANCE_SPEC.loader.exec_module(advance)


class FailureHistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.old_secret_root = gl.SECRET_ROOT
        gl.SECRET_ROOT = os.path.join(self.pdir, "secrets")
        self.run_id = "metrics-history-" + uuid.uuid4().hex
        self.secret_file = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id, "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        })
        gl.init_workflow_metrics(self.pdir, self.run_id)
        self.assertTrue(callable(getattr(gl, "record_gate_fix", None)),
                        "metrics must support a recorded fix linked to a failure")

    def tearDown(self):
        try:
            os.remove(self.secret_file)
        except OSError:
            pass
        gl.SECRET_ROOT = self.old_secret_root
        self.tmp.cleanup()

    def attempts(self, phase=4):
        return gl.read_workflow_metrics(self.pdir)["phases"][str(phase)]["attempt_history"]

    def test_every_failure_keeps_signed_reason_and_first_attempt_explanation(self):
        first = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                        reason="missing target out/libfoo.so")
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                reason="linker undefined symbol")
        history = self.attempts()
        self.assertEqual([a["reason"] for a in history],
                         ["missing target out/libfoo.so", "linker undefined symbol"])
        self.assertEqual(history[0]["manifest_seq"], first["seq"])
        self.assertTrue(history[0]["first_attempt"])
        self.assertFalse(history[1]["first_attempt"])
        summary = gl.read_workflow_metrics(self.pdir)["summary"]
        self.assertEqual(summary["first_gate_attempts_total"], 1)
        self.assertEqual(summary["first_gate_failures_total"], 1)
        self.assertEqual(summary["unrecorded_gate_attempts_total"], 0)

    def test_recorded_change_only_resolves_after_same_gate_passes(self):
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                         reason="missing target")
        failure_id = "manifest:%d" % failed["seq"]
        gl.record_gate_fix(self.pdir, failure_id,
                           "add missing GN target", change_ref="BUILD.gn",
                           root_cause="GN target omitted library")
        gl.emit(self.pdir, 5, "gate_test_ut.py", verdict="PASS", reason="tests pass")
        self.assertEqual(self.attempts()[0]["resolution_status"], "pending_verification")
        passed = gl.emit(self.pdir, 4, "gate_build.py", verdict="PASS", reason="target built")
        failure = self.attempts()[0]
        self.assertEqual(failure["resolution_status"], "resolved")
        self.assertEqual(failure["fixes"][0]["action"], "add missing GN target")
        self.assertEqual(failure["fixes"][0]["change_ref"], "BUILD.gn")
        self.assertEqual(failure["fixes"][0]["verification_verdict"], "PASS")
        self.assertEqual(failure["verified_by"], "manifest:%d" % passed["seq"])

    def test_root_cause_diagnosis_is_saved_separately_from_gate_symptom(self):
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                         reason="link failed: symbol X")
        gl.record_gate_fix(self.pdir, "manifest:%d" % failed["seq"],
                           "add dependency", change_ref="BUILD.gn",
                           root_cause="GN target omitted library X")
        failure = self.attempts()[0]
        self.assertEqual(failure["reason"], "link failed: symbol X")
        self.assertEqual(failure["fixes"][0]["root_cause"],
                         "GN target omitted library X")

    def test_failed_retest_with_new_reason_does_not_claim_original_cause_persists(self):
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="compile error A")
        gl.record_gate_fix(self.pdir, "manifest:%d" % failed["seq"],
                           "change include", change_ref="src/a.cpp",
                           root_cause="include order was wrong")
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="compile error B")
        history = self.attempts()
        self.assertEqual(history[0]["resolution_status"], "gate_still_failed_different_reason")
        self.assertEqual(history[0]["fixes"][0]["verification_verdict"], "FAIL")
        self.assertEqual(history[1]["reason"], "compile error B")
        self.assertEqual(history[1]["resolution_status"], "unresolved")

    def test_same_reason_after_fix_is_recorded_as_not_resolved(self):
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                         reason="missing symbol X")
        gl.record_gate_fix(self.pdir, "manifest:%d" % failed["seq"],
                           "edit linkage", root_cause="library X omitted")
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                reason="missing symbol X")
        self.assertEqual(self.attempts()[0]["resolution_status"], "not_resolved")

    def test_pass_without_recorded_change_is_not_claimed_as_fixed(self):
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="transient error")
        gl.emit(self.pdir, 4, "gate_build.py", verdict="PASS", reason="retry succeeded")
        self.assertEqual(self.attempts()[0]["resolution_status"], "passed_without_recorded_fix")

    def test_rewind_round_does_not_erase_failure_or_infer_new_first_attempt(self):
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="wrong config")
        gl.record_gate_fix(self.pdir, "manifest:%d" % failed["seq"],
                           "change config", change_ref="build_config.gni",
                           root_cause="config did not enable target")
        gl.observe_phase_closed(self.pdir, 4)
        gl.observe_phase_opened(self.pdir, 4)
        gl.emit(self.pdir, 4, "gate_build.py", verdict="PASS", reason="ok")
        history = self.attempts()
        self.assertEqual(history[0]["resolution_status"], "resolved")
        self.assertEqual(history[1]["round"], 2)
        self.assertTrue(history[1]["first_attempt"])

    def test_legacy_counters_are_not_mistaken_for_complete_history(self):
        data = gl.read_workflow_metrics(self.pdir)
        data["phases"]["4"]["gate_attempts"] = 3
        data["phases"]["4"]["fail_attempts"] = 3
        gl.write_workflow_metrics(self.pdir, data)
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="new failure")
        self.assertIsNone(self.attempts()[0]["first_attempt"])
        summary = gl.read_workflow_metrics(self.pdir)["summary"]
        self.assertEqual(summary["unrecorded_gate_attempts_total"], 3)

    def test_fix_reference_requires_real_failed_signed_attempt(self):
        gl.emit(self.pdir, 4, "gate_build.py", verdict="PASS", reason="ok")
        with self.assertRaises(ValueError):
            gl.record_gate_fix(self.pdir, "manifest:0", "pretend fix",
                               root_cause="invented")
        with self.assertRaises(ValueError):
            gl.record_gate_fix(self.pdir, "manifest:99", "pretend fix",
                               root_cause="invented")
        failed = gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL",
                         reason="real failure")
        with self.assertRaises(ValueError):
            gl.record_gate_fix(self.pdir, "manifest:%d" % failed["seq"],
                               "claimed edit", root_cause="")

    def test_expected_p8_consent_hold_is_distinct_from_code_failure(self):
        gl.emit(self.pdir, 8, "gate_upload_ci.py:consent-precheck",
                verdict="FAIL", reason="awaiting reviewer consent")
        data = gl.read_workflow_metrics(self.pdir)
        attempt = data["phases"]["8"]["attempt_history"][0]
        self.assertEqual(attempt["failure_kind"], "expected_review_hold")
        self.assertEqual(data["summary"]["first_gate_review_holds_total"], 1)
        gl.emit(self.pdir, 8, "gate_upload_ci.py", verdict="PASS",
                reason="review complete")
        self.assertEqual(self.attempts(8)[0]["resolution_status"],
                         "review_hold_released")

    def test_fix_cannot_relabel_a_signed_failure_in_metrics(self):
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="compile failed")
        data = gl.read_workflow_metrics(self.pdir)
        data["phases"]["4"]["attempt_history"][0]["gate"] = "gate_test_ut.py"
        gl.write_workflow_metrics(self.pdir, data)
        with self.assertRaises(ValueError):
            gl.record_gate_fix(self.pdir, "manifest:0", "pretend fix",
                               root_cause="invented")

    def test_advance_fix_and_failures_commands_surface_first_failure(self):
        self.assertTrue(callable(getattr(advance, "cmd_fix", None)))
        self.assertTrue(callable(getattr(advance, "cmd_failures", None)))
        gl.emit(self.pdir, 4, "gate_build.py", verdict="FAIL", reason="first linker error")
        with redirect_stdout(StringIO()):
            advance.cmd_fix(SimpleNamespace(pipeline_dir=self.pdir, attempt_id="manifest:0",
                                            action="update target", change_ref="BUILD.gn",
                                            root_cause="target omitted dependency"))
        output = StringIO()
        with redirect_stdout(output):
            advance.cmd_failures(SimpleNamespace(pipeline_dir=self.pdir, json=False))
        self.assertIn("first linker error", output.getvalue())
        self.assertIn("update target", output.getvalue())
        self.assertIn("target omitted dependency", output.getvalue())
        self.assertIn("pending_verification", output.getvalue())


if __name__ == "__main__":
    unittest.main()
