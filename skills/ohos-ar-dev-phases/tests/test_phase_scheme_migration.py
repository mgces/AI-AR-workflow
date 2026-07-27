#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Path B1 in-flight-run compatibility (plan verification item #8).

A pre-9-phase pipeline.json (old 7-row scheme) must be REFUSED by load_state
rather than silently reinterpreted under the new phase numbers. `advance.py
migrate` rewrites it in place when current_phase <= 1, and refuses (pointing at
reset) when the run is already past the fused old phase 1. Migration touches
ONLY pipeline.json's phase_scheme/current_phase/phases — never manifest entries.
"""
import json
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


# The old 7-physical-phase layout that predates Path B1.
OLD_PHASES = [
    (0, "bootstrap"),
    (1, "design-orchestrate"),
    (2, "build-verify"),
    (3, "test-author"),
    (4, "device-functional"),
    (5, "quality-verify"),
    (6, "upload-review"),
]


class TestPhaseSchemeMigration(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "migrate-test-run"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _write_old_state(self, current_phase):
        """Write a legacy 7-row pipeline.json with no phase_scheme stamp."""
        state = {
            "run_id": self.run_id, "ar": self.run_id, "build_target": "t",
            "current_phase": current_phase, "consent_tokens": {},
            # deliberately NO phase_scheme key — pre-B1 runs never had one
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in OLD_PHASES],
        }
        gl.save_state(self.pdir, state)
        return state

    def _run(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    # ---- load_state guard --------------------------------------------------
    def test_load_state_refuses_old_scheme(self):
        self._write_old_state(current_phase=0)
        with self.assertRaises(SystemExit) as ctx:
            gl.load_state(self.pdir)
        msg = str(ctx.exception)
        self.assertIn("incompatible phase scheme", msg)
        self.assertIn("migrate", msg)

    def test_load_state_allow_legacy_bypasses_guard(self):
        self._write_old_state(current_phase=0)
        state = gl.load_state(self.pdir, allow_legacy=True)
        self.assertEqual(len(state["phases"]), len(OLD_PHASES))
        self.assertNotIn("phase_scheme", state)

    # ---- migrate: happy path (current_phase <= 1) --------------------------
    def test_migrate_at_bootstrap_succeeds(self):
        self._write_old_state(current_phase=0)
        cp = self._run("migrate")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        self.assertIn("MIGRATED", cp.stdout)
        # Now load_state accepts it and the layout is the 9-row B1 scheme.
        state = gl.load_state(self.pdir)
        self.assertEqual(state["phase_scheme"], gl.PHASE_SCHEME)
        self.assertEqual(len(state["phases"]), len(gl.PHASES))
        self.assertEqual(state["current_phase"], 0)
        self.assertEqual([p["id"] for p in state["phases"]],
                         [i for i, _ in gl.PHASES])

    def test_migrate_at_design_preserves_phase1_status(self):
        state = self._write_old_state(current_phase=1)
        # mark phases 0 and 1 as passed to prove their status survives migration
        for pe in state["phases"]:
            if pe["id"] <= 1:
                pe["status"] = "passed"
                pe["manifest_ref"] = "ref-%d" % pe["id"]
        gl.save_state(self.pdir, state)
        cp = self._run("migrate")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        migrated = gl.load_state(self.pdir)
        by_id = {p["id"]: p for p in migrated["phases"]}
        # kept-number phases 0,1 retain passed status + manifest_ref
        self.assertEqual(by_id[0]["status"], "passed")
        self.assertEqual(by_id[1]["status"], "passed")
        self.assertEqual(by_id[1]["manifest_ref"], "ref-1")
        # phase 1 is still design-orchestrate under B1 (unchanged number)
        self.assertEqual(by_id[1]["name"], "design-orchestrate")
        # everything past 1 is pending in the fresh layout
        self.assertEqual(by_id[2]["status"], "pending")
        self.assertEqual(migrated["current_phase"], 1)

    # ---- migrate: refused past the fused old phase 1 -----------------------
    def test_migrate_refused_past_phase1(self):
        self._write_old_state(current_phase=2)
        cp = self._run("migrate")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("cannot migrate", cp.stderr)
        self.assertIn("reset", cp.stderr)
        # state left untouched (still old scheme, no phase_scheme stamp)
        with open(gl.state_path(self.pdir)) as f:
            raw = json.load(f)
        self.assertNotIn("phase_scheme", raw)
        self.assertEqual(len(raw["phases"]), len(OLD_PHASES))

    # ---- migrate: idempotent on an already-B1 run --------------------------
    def test_migrate_idempotent_on_current_scheme(self):
        state = {
            "run_id": self.run_id, "ar": self.run_id, "build_target": "t",
            "current_phase": 0, "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        }
        gl.save_state(self.pdir, state)
        cp = self._run("migrate")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        self.assertIn("nothing to migrate", cp.stdout)

    # ---- migrate never touches the manifest --------------------------------
    def test_migrate_does_not_touch_manifest(self):
        # Migrate a legacy phase-1 run onto scheme 9 first (emit() itself goes
        # through the strict load_state guard, so a signed entry can only be
        # written once the run is on the current scheme).
        self._write_old_state(current_phase=1)
        cp = self._run("migrate")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        # a signed design entry at physical phase 1 (unchanged number under B1)
        rel = "evidence/phase1/AR_design.md"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w") as f:
            f.write("design\n")
        gl.emit(self.pdir, 1, "gate_design.py", verdict="PASS",
                reason="r", artifacts_rel=[rel])
        manifest_path = os.path.join(self.pdir, "evidence", "manifest.jsonl")
        with open(manifest_path) as f:
            before = f.read()
        # a second migrate is an idempotent no-op and must not rewrite entries
        cp = self._run("migrate")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        self.assertIn("nothing to migrate", cp.stdout)
        with open(manifest_path) as f:
            after = f.read()
        self.assertEqual(before, after, "migrate must not rewrite manifest")
        # chain still verifies
        ok, reason, _ = gl.verify_chain(self.pdir)
        self.assertTrue(ok, reason)


if __name__ == "__main__":
    unittest.main()
