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
        self.pdir = os.path.join(self.repo, "specs", "pipeline", "pdir")
        self.run_id = "c3-init-default"

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _init(self, *extra, environment="openharmony"):
        env_flags = ["--environment", environment] if environment else []
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "init",
             "--run-id", self.run_id, "--repo", self.repo,
             *env_flags, *extra],
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


class TestInitEnvironment(unittest.TestCase):
    """The environment (openharmony | harmonyos) is a per-AR human decision that
    changes build + upload behavior, so a bare init (no --environment) hard-fails,
    and --environment harmonyos requires --component-type system|chip."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "specs", "pipeline", "pdir")
        self.run_id = "env-init"

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _init(self, *extra):
        # confirm the component so we get past the (earlier) component gate and
        # exercise the environment gate specifically.
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "init",
             "--run-id", self.run_id, "--repo", self.repo,
             "--confirm-defaults", *extra],
            text=True, capture_output=True)

    def _state(self):
        with open(gl.state_path(self.pdir), encoding="utf-8") as f:
            return json.load(f)

    def test_missing_environment_hard_fails(self):
        cp = self._init()  # no --environment
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("environment not confirmed", cp.stdout + cp.stderr)
        self.assertFalse(os.path.exists(gl.state_path(self.pdir)))

    def test_openharmony_lands_rk3568_and_gitcode(self):
        cp = self._init("--environment", "openharmony")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = self._state()
        self.assertEqual(st["environment"], "openharmony")
        self.assertIsNone(st["component_type"])
        self.assertEqual(st["product"], "rk3568")

    def test_harmonyos_requires_component_type(self):
        cp = self._init("--environment", "harmonyos")  # no --component-type
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("--component-type is required", cp.stdout + cp.stderr)
        self.assertFalse(os.path.exists(gl.state_path(self.pdir)))

    def test_harmonyos_requires_device_type(self):
        # component_type given but no --device-type -> hard-fail (the build
        # command needs it; it is bound to the source root).
        cp = self._init("--environment", "harmonyos", "--component-type", "system")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("--device-type is required", cp.stdout + cp.stderr)
        self.assertFalse(os.path.exists(gl.state_path(self.pdir)))

    def test_harmonyos_system_persists_component_type(self):
        cp = self._init("--environment", "harmonyos", "--component-type", "system",
                        "--device-type", "general_all_phone_standard")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = self._state()
        self.assertEqual(st["environment"], "harmonyos")
        self.assertEqual(st["component_type"], "system")
        self.assertEqual(st["device_type"], "general_all_phone_standard")
        # product form is still a placeholder for harmonyos -> persisted as None
        self.assertIsNone(st["product"])


class TestInitPdirAnchoring(unittest.TestCase):
    """PDIR (docs/evidence/reports landing dir) must stay under the source root's
    specs/pipeline/, so a weak model can never drift artifacts outside the repo.
    init DERIVES the path from --repo + --run-id; an explicit --pipeline-dir is
    accepted only when it resolves under <repo>/specs/pipeline/, else hard-fails."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.run_id = "anchor-run"

    def tearDown(self):
        for rid in (self.run_id, "legacy-run"):
            try:
                os.remove(gl.secret_path(rid))
            except OSError:
                pass
        self.tmp.cleanup()

    def _init(self, *extra, pdir=None):
        cmd = [sys.executable, os.path.join(SCRIPTS, "advance.py")]
        if pdir is not None:
            cmd += ["--pipeline-dir", pdir]
        cmd += ["init", "--repo", self.repo, "--environment", "openharmony",
                "--confirm-defaults", *extra]
        return subprocess.run(cmd, text=True, capture_output=True)

    def test_derives_pdir_under_specs_pipeline(self):
        cp = self._init("--run-id", self.run_id)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        want = os.path.join(self.repo, "specs", "pipeline", self.run_id)
        self.assertIn("PDIR=%s" % want, cp.stdout)
        self.assertTrue(os.path.exists(os.path.join(want, "pipeline.json")))

    def test_rejects_pipeline_dir_outside_repo(self):
        outside = os.path.join(self.tmp.name, "..", "elsewhere", "run")
        cp = self._init("--run-id", self.run_id, pdir=outside)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("must live under the source root", cp.stdout + cp.stderr)

    def test_accepts_pipeline_dir_inside_specs_pipeline(self):
        inside = os.path.join(self.repo, "specs", "pipeline", "legacy-run")
        cp = self._init(pdir=inside)  # run_id derived from the dir basename
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("PDIR=%s" % inside, cp.stdout)

    def test_requires_run_id_when_no_pipeline_dir(self):
        cp = self._init()  # neither --run-id nor --pipeline-dir
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("--run-id", cp.stdout + cp.stderr)


if __name__ == "__main__":
    unittest.main()
