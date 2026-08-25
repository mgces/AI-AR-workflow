#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for signed, evidence-bound consent (gatelib + advance.py cmd_consent)."""
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


class TestSignedConsent(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "test-consent-run"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        # per-run secret in the real SECRET_ROOT; clean up in tearDown.
        self.secret_file = gl.create_secret(self.run_id)
        state = {
            "run_id": self.run_id,
            "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "current_phase": 8,
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        }
        gl.save_state(self.pdir, state)

    def tearDown(self):
        try:
            os.remove(self.secret_file)
        except OSError:
            pass
        self.tmp.cleanup()

    def _emit_pass(self, phase, reason="r"):
        """Emit a signed PASS entry for `phase` with one real artifact."""
        art_rel = "evidence/phase%d/report.txt" % phase
        os.makedirs(os.path.dirname(os.path.join(self.pdir, art_rel)), exist_ok=True)
        with open(os.path.join(self.pdir, art_rel), "w") as f:
            f.write("ok\n")
        return gl.emit(self.pdir, phase, "gate_x.py", verdict="PASS",
                       reason=reason, artifacts_rel=[art_rel])

    def test_consent_valid_after_pass(self):
        entry = self._emit_pass(4)
        eid = gl.entry_id(entry)
        rec = gl.make_consent_record(self.run_id, 4, "alice", eid)
        state = gl.load_state(self.pdir)
        state["consent_tokens"]["4"] = rec
        ok, reason = gl.verify_consent(state, 4, eid)
        self.assertTrue(ok, reason)

    def test_no_consent_recorded(self):
        entry = self._emit_pass(4)
        state = gl.load_state(self.pdir)
        ok, reason = gl.verify_consent(state, 4, gl.entry_id(entry))
        self.assertFalse(ok)
        self.assertIn("no consent", reason)

    def test_stale_consent_after_new_evidence(self):
        e1 = self._emit_pass(4, reason="first run")
        rec = gl.make_consent_record(self.run_id, 4, "alice", gl.entry_id(e1))
        state = gl.load_state(self.pdir)
        state["consent_tokens"]["4"] = rec
        # re-run the gate -> new PASS entry (different reason) -> new entry_id
        e2 = self._emit_pass(4, reason="second run after a re-run")
        self.assertNotEqual(gl.entry_id(e1), gl.entry_id(e2))
        ok, reason = gl.verify_consent(state, 4, gl.entry_id(e2))
        self.assertFalse(ok)
        self.assertIn("stale", reason)

    def test_tampered_consent_hmac(self):
        entry = self._emit_pass(4)
        eid = gl.entry_id(entry)
        rec = gl.make_consent_record(self.run_id, 4, "alice", eid)
        rec["token"] = "mallory"  # change a signed field, keep old hmac
        state = gl.load_state(self.pdir)
        state["consent_tokens"]["4"] = rec
        ok, reason = gl.verify_consent(state, 4, eid)
        self.assertFalse(ok)
        self.assertIn("HMAC", reason)

    def test_legacy_plaintext_consent_rejected(self):
        entry = self._emit_pass(4)
        state = gl.load_state(self.pdir)
        state["consent_tokens"]["4"] = "alice"  # old plaintext form
        ok, reason = gl.verify_consent(state, 4, gl.entry_id(entry))
        self.assertFalse(ok)
        self.assertIn("legacy", reason)

    def _emit_upload_precheck(self):
        rel = "evidence/phase8/upload_consent_request.json"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            f.write('{"branch":"feature/x","diff":"abc"}\n')
        return gl.emit(
            self.pdir, 8, gl.UPLOAD_CONSENT_GATE, verdict="FAIL",
            reason="dry run prepared upload plan (no --allow-push)",
            artifacts_rel=[rel])

    def test_phase8_consent_binds_preupload_evidence_before_final_pass(self):
        entry = self._emit_upload_precheck()
        cp = subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "consent", "--phase", "8",
             "--token", "alice"], text=True, capture_output=True)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        state = gl.load_state(self.pdir)
        ok, reason = gl.verify_consent(state, 8, gl.entry_id(entry))
        self.assertTrue(ok, reason)

    def test_phase8_precheck_becomes_stale_when_review_artifact_changes(self):
        self._emit_upload_precheck()
        request = os.path.join(self.pdir, "evidence/phase8/upload_consent_request.json")
        with open(request, "w", encoding="utf-8") as f:
            f.write('{"branch":"different"}\n')
        ok, reason, _ = gl.validate_upload_consent_entry(self.pdir)
        self.assertFalse(ok)
        self.assertIn("changed", reason)

    def test_direct_phase1_advance_cannot_bypass_design_consent(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 1
        gl.save_state(self.pdir, state)
        rel = "evidence/phase1/AR_design.md"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            f.write("design\n")
        gl.emit(self.pdir, 1, "gate_design.py", verdict="PASS",
                reason="design ok", artifacts_rel=[rel])
        cp = subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "advance", "--phase", "1"],
            text=True, capture_output=True)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("needs human review", cp.stdout + cp.stderr)


if __name__ == "__main__":
    unittest.main()
