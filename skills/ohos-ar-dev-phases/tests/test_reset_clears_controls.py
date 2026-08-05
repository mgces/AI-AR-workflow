#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for reset/verify-all clearing stale P1..P8 control packets.

Regression guard for the "re-walk the workflow and the weak model gets stuck"
bug: a rewind (advance.py reset) rewinds pipeline.json state + sets the
evidence-epoch barrier, but the barrier only guards the SIGNED manifest. The
unsigned controls/ navigation packets from the prior walk (signed_test_scope,
phase1_test_develop, handoffs, receipts, the "current" pointers) survived and
were read directly by _test_develop_ready / _require_test_develop_gate and the
downstream gates' _test_bundle_context — so the navigation layer said "ready"
while the real gate said "no", looping a weak model on a stale contract.

reset now deletes every P1..P8 packet (the rewalk re-signs fresh ones), while
preserving P0's footprint (memory_cards/phase0.json, packets/bootstrap.json) and
the repair packet (cleared via an inactive record, not deletion).
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
import advance as adv  # noqa: E402


class TestResetClearsControls(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "reset-controls-run"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)
        # A run rewound past P3: phases marked passed so reset has something to
        # rewind, current_phase at P5.
        state = {
            "run_id": self.run_id, "ar": self.run_id, "build_target": "t",
            "current_phase": 5, "consent_tokens": {},
            "code_fingerprint": "fp", "functional_fingerprint": "ffp",
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n,
                        "status": "passed" if i <= 4 else "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        }
        gl.save_state(self.pdir, state)

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _put(self, *parts, payload=None):
        p = gl.controls_path(self.pdir, *parts)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(payload if payload is not None else {"x": 1}, f)
        return p

    def _exists(self, *parts):
        return os.path.exists(gl.controls_path(self.pdir, *parts))

    def _reset_cli(self):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "reset", "--reason", "code change"],
            text=True, capture_output=True)

    # ---- 1. stale P1..P8 phase packets are deleted --------------------------
    def test_reset_deletes_stale_phase_packets(self):
        self._put("test_develop", "signed_test_scope.json")
        self._put("test_develop", "phase1_test_develop.json")
        self._put("test_develop", "test_intent_matrix.json")
        self._put("build_verify", "handoff_to_test_author.json")
        self._put("test_author", "handoff_to_device_functional.json")
        self._put("quality_verify", "substate.json")
        self._put("upload_review", "completion_receipt.json")
        self._put("next_action.json")
        self._put("handoffs", "current.json")
        self._put("memory_cards", "current.json")
        self._put("indexes", "build_verify_artifacts.json")
        cp = self._reset_cli()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        for parts in [("test_develop", "signed_test_scope.json"),
                      ("test_develop", "phase1_test_develop.json"),
                      ("test_develop", "test_intent_matrix.json"),
                      ("build_verify", "handoff_to_test_author.json"),
                      ("test_author", "handoff_to_device_functional.json"),
                      ("quality_verify", "substate.json"),
                      ("upload_review", "completion_receipt.json"),
                      ("next_action.json",),
                      ("handoffs", "current.json"),
                      ("memory_cards", "current.json"),
                      ("indexes", "build_verify_artifacts.json")]:
            self.assertFalse(self._exists(*parts),
                             "stale packet survived reset: %s" % "/".join(parts))
        # state actually rewound to P1
        st = gl.load_state(self.pdir)
        self.assertEqual(st["current_phase"], 1)

    # ---- 2. P3 readiness probes no longer fooled by stale packets -----------
    def test_reset_makes_p3_probes_report_not_ready(self):
        # Pre-reset the prior walk's packets claim P3 is done + signed.
        self._put("test_develop", "phase1_test_develop.json",
                  payload={"ready_for_build": True, "objective_completed": True})
        self._put("test_develop", "signed_test_scope.json",
                  payload={"bundle_revision": "r1", "contract_status": "signed"})
        # Sanity: before reset the probes ARE fooled (they read the stale packet).
        self.assertTrue(adv._test_develop_ready(self.pdir))
        self.assertTrue(adv._test_develop_scope_ready(self.pdir))
        cp = self._reset_cli()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # After reset the packets are gone → probes fall through to "not ready".
        self.assertFalse(adv._test_develop_ready(self.pdir))
        self.assertFalse(adv._test_develop_scope_ready(self.pdir))

    # ---- 3. repair packet preserved (cleared via inactive record) -----------
    def test_reset_preserves_inactive_repair_packet(self):
        self._put("repairs", "current.json",
                  payload={"active": True, "failure_class": "x"})
        cp = self._reset_cli()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # File must still exist and be a well-formed INACTIVE record (not deleted),
        # so the advisory validator still sees it and no reader trips on absence.
        self.assertTrue(self._exists("repairs", "current.json"))
        packet = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertIsNotNone(packet)
        self.assertIs(packet.get("active"), False)

    # ---- 4. P0 footprint preserved ------------------------------------------
    def test_reset_preserves_p0_footprint(self):
        self._put("memory_cards", "phase0.json", payload={"phase": 0})
        self._put("packets", "bootstrap.json", payload={"id": "bootstrap"})
        # also a P1..P8 shared-dir sibling that MUST go
        self._put("memory_cards", "phase3.json")
        self._put("packets", "test_develop.json")
        cp = self._reset_cli()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertTrue(self._exists("memory_cards", "phase0.json"))
        self.assertTrue(self._exists("packets", "bootstrap.json"))
        self.assertFalse(self._exists("memory_cards", "phase3.json"))
        self.assertFalse(self._exists("packets", "test_develop.json"))

    # ---- 5. best-effort: a cleanup failure never blocks the rewind ----------
    def test_clear_is_best_effort(self):
        self._put("test_develop", "signed_test_scope.json")
        orig = adv.os.remove
        adv.os.remove = lambda *a, **k: (_ for _ in ()).throw(OSError("boom"))
        try:
            # must not raise even though every os.remove throws
            adv._clear_stale_controls(self.pdir)
        finally:
            adv.os.remove = orig

    # ---- 6. the clear-set is derived from P1..P8 only (no P0 id) -------------
    def test_reset_logical_ids_exclude_bootstrap(self):
        self.assertNotIn("bootstrap", adv._RESET_LOGICAL_IDS)
        self.assertEqual(
            set(adv._RESET_LOGICAL_IDS),
            {row[1] for row in gl.LOGICAL_PHASES if row[3] >= 1})


if __name__ == "__main__":
    unittest.main()
