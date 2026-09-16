#!/usr/bin/env python3
"""The status/inspect payload must preserve the per-run environment branch.

The selected HarmonyOS component and device type decide which build and device
gates are legal.  Losing those fields at the Python bridge boundary makes the
web console appear to be running a different branch than the signed pipeline.
"""
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import advance as adv  # noqa: E402
import gatelib as gl  # noqa: E402


class TestStatePayloadMetadata(unittest.TestCase):
    def test_state_payload_keeps_environment_branch_and_profile(self):
        with tempfile.TemporaryDirectory() as repo:
            run_id = "run-branch"
            old_secret_root = gl.SECRET_ROOT
            gl.SECRET_ROOT = os.path.join(repo, ".lifecycle-secret")
            secret_path = gl.create_secret(run_id)
            pdir = os.path.join(repo, "specs", "pipeline", "run-branch")
            os.makedirs(pdir, exist_ok=True)
            state = {
                "run_id": run_id,
                "ar": "ar.md",
                "repo": repo,
                "git_dir": "foundation/systemabilitymgr",
                "build_target": "make_all",
                "device_serial": "127.0.0.1:5555",
                "environment": "harmonyos",
                "component_type": "chip",
                "device_type": "rk3568",
                "environment_profile_digest": "sha256:" + "a" * 64,
                "product": "harmonyos-chip",
                "current_phase": 0,
                "phase_scheme": gl.PHASE_SCHEME,
                "phases": [
                    {"id": phase, "name": name, "status": "pending",
                     "manifest_ref": None, "closed_at_utc": None}
                    for phase, name in gl.PHASES
                ],
            }
            gl.save_state(pdir, state)
            try:
                payload = adv._state_payload(pdir, state)
            finally:
                try:
                    os.remove(secret_path)
                except OSError:
                    pass
                gl.SECRET_ROOT = old_secret_root
            self.assertEqual(payload["environment"], "harmonyos")
            self.assertEqual(payload["component_type"], "chip")
            self.assertEqual(payload["device_type"], "rk3568")
            self.assertEqual(payload["environment_profile_digest"], "sha256:" + "a" * 64)
            self.assertEqual(payload["product"], "harmonyos-chip")


if __name__ == "__main__":
    unittest.main()
