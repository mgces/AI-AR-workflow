#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""C3 regression: the compiled component is user-determined per AR, so a fully
bare `advance.py init` (no component flags) must HARD-FAIL and tell the caller to
confirm with the user — either pin the AR's real --git-dir/--build-target/--part,
or explicitly accept the hiview default with --confirm-defaults. Confirming the
default lands the hiview values plus a human-confirmed NOTE; pinning a different
component skips the NOTE. This stops a weak model from silently compiling hiview
for a non-hiview AR.
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


class TestInitHiviewDefault(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "pdir")
        self.run_id = "c3-init-default"

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _init(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "init",
             "--run-id", self.run_id, "--repo", self.repo, *extra],
            text=True, capture_output=True)

    def _state(self):
        with open(gl.state_path(self.pdir), encoding="utf-8") as f:
            return json.load(f)

    def test_bare_init_hard_fails_without_confirmation(self):
        cp = self._init()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("compiled component not confirmed", cp.stdout + cp.stderr)
        # nothing persisted when the gate blocks
        self.assertFalse(os.path.exists(gl.state_path(self.pdir)))

    def test_confirm_defaults_lands_hiview_and_prints_note(self):
        cp = self._init("--confirm-defaults")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("NOTE: compiled component defaulted to hiview", cp.stdout)
        st = self._state()
        self.assertEqual(st["git_dir"], adv.DEFAULT_GIT_DIR)
        self.assertEqual(st["build_target"], adv.DEFAULT_BUILD_TARGET)
        self.assertEqual(st["test"]["part"], adv.DEFAULT_TEST_PART)

    def test_explicit_component_suppresses_the_note(self):
        cp = self._init("--git-dir", "foundation/other/comp",
                        "--build-target", "other_package", "--part", "other")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("defaulted to hiview", cp.stdout)
        st = self._state()
        self.assertEqual(st["git_dir"], "foundation/other/comp")
        self.assertEqual(st["build_target"], "other_package")


if __name__ == "__main__":
    unittest.main()
