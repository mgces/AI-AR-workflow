#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the manifest hash chain — the anti-REPLAY defense.

Reproduces the replay attack (append a historically-valid PASS record + restore
its artifact) and asserts it is now rejected, plus tamper/reorder cases.
"""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


class TestManifestChain(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "chain-test"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret_file = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id, "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        })

    def tearDown(self):
        try:
            os.remove(self.secret_file)
        except OSError:
            pass
        self.tmp.cleanup()

    def _art(self, phase, content):
        rel = "evidence/phase%d/summary.xml" % phase
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w") as f:
            f.write(content)
        return rel

    def _manifest_lines(self):
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl")) as f:
            return [l for l in f if l.strip()]

    def _append_raw(self, obj):
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl"), "a") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    def test_happy_chain_valid(self):
        rel = self._art(5, "<t tests='5' failures='0'/>")
        gl.emit(self.pdir, 5, "g", verdict="PASS", reason="ok", artifacts_rel=[rel])
        ok, reason, _ = gl.validate_closing_entry(self.pdir, 5)
        self.assertTrue(ok, reason)
        cok, creason, _ = gl.verify_chain(self.pdir)
        self.assertTrue(cok, creason)

    def test_replay_old_pass_rejected(self):
        # 1. legit PASS (good artifact)
        rel = self._art(5, "<t tests='5' failures='0'/>")
        gl.emit(self.pdir, 5, "g", verdict="PASS", reason="tests=5 failures=0",
                artifacts_rel=[rel])
        old_pass = json.loads(self._manifest_lines()[0])
        # 2. re-run -> FAIL appended (artifact now has failures)
        self._art(5, "<t tests='5' failures='3'/>")
        gl.emit(self.pdir, 5, "g", verdict="FAIL", reason="tests=5 failures=3",
                artifacts_rel=[rel])
        # last entry is FAIL -> correctly rejected
        ok, _, _ = gl.validate_closing_entry(self.pdir, 5)
        self.assertFalse(ok)
        # 3. ATTACK: replay the old valid PASS record at the tail...
        self._append_raw(old_pass)
        # 4. ...and restore the artifact to the PASS-era content
        self._art(5, "<t tests='5' failures='0'/>")
        ok2, reason2, _ = gl.validate_closing_entry(self.pdir, 5)
        self.assertFalse(ok2, "replay must be rejected but got: %s" % reason2)
        self.assertIn("chain", reason2)

    def test_removed_record_breaks_chain(self):
        rel = self._art(2, "<t/>")
        gl.emit(self.pdir, 2, "g", verdict="PASS", reason="a", artifacts_rel=[rel])
        gl.emit(self.pdir, 3, "g", verdict="PASS", reason="b", artifacts_rel=[rel])
        lines = self._manifest_lines()
        # delete the first record -> seq/prev of the survivor no longer match
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl"), "w") as f:
            f.write(lines[1])
        ok, reason, _ = gl.verify_chain(self.pdir)
        self.assertFalse(ok)
        self.assertIn("chain", reason)

    def test_tampered_field_rejected(self):
        rel = self._art(2, "<t/>")
        gl.emit(self.pdir, 2, "g", verdict="FAIL", reason="bad", artifacts_rel=[rel])
        line = json.loads(self._manifest_lines()[0])
        line["verdict"] = "PASS"  # flip verdict, keep old hmac
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl"), "w") as f:
            f.write(json.dumps(line) + "\n")
        ok, reason, _ = gl.verify_chain(self.pdir)
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
