#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Active-run pointer + `advance.py resume` self-bootstrap.

The multi-phase loop is model-driven, so a fresh window / a different agent with
no memory of the run must be able to pick up from disk alone. init writes
<repo>/specs/pipeline/ACTIVE = PDIR; `resume` reads it (from cwd/$OHOS_ROOT/--repo)
and prints where we are + the exact next command, so the loop survives across
windows without any Claude-Code-specific hook.
"""
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

ADV = os.path.join(SCRIPTS, "advance.py")


class TestActivePointerAndResume(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.run_id = "resume-run"
        self.anchor = os.path.join(self.repo, "specs", "pipeline")
        self.pdir = os.path.join(self.anchor, self.run_id)

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _init(self):
        return subprocess.run(
            [sys.executable, ADV, "init", "--repo", self.repo,
             "--run-id", self.run_id, "--environment", "openharmony",
             "--confirm-defaults"],
            text=True, capture_output=True)

    def _resume(self, *extra, cwd=None, env=None):
        e = dict(os.environ)
        e.pop("OHOS_ROOT", None)
        if env:
            e.update(env)
        return subprocess.run([sys.executable, ADV, "resume", *extra],
                              text=True, capture_output=True, cwd=cwd, env=e)

    def _resume_pdir(self, pdir, env=None):
        # --pipeline-dir is a global arg -> must precede the subcommand.
        e = dict(os.environ)
        e.pop("OHOS_ROOT", None)
        if env:
            e.update(env)
        return subprocess.run(
            [sys.executable, ADV, "--pipeline-dir", pdir, "resume"],
            text=True, capture_output=True, env=e)

    def test_init_writes_active_pointer(self):
        cp = self._init()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        ptr = os.path.join(self.anchor, "ACTIVE")
        self.assertTrue(os.path.isfile(ptr))
        with open(ptr, encoding="utf-8") as f:
            self.assertEqual(f.read().strip(), self.pdir)
        self.assertIn("ACTIVE pointer", cp.stdout)

    def test_resume_via_repo_flag_locates_run(self):
        self._init()
        cp = self._resume("--repo", self.repo)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("RESUME run_id=%s" % self.run_id, cp.stdout)
        self.assertIn("PDIR=%s" % self.pdir, cp.stdout)
        # loud continue banner + next command are present
        self.assertIn("PIPELINE NOT DONE", cp.stdout)
        self.assertIn("gate_env_init.py", cp.stdout)
        self.assertIn("advance --phase 0", cp.stdout)

    def test_resume_via_ohos_root_env(self):
        self._init()
        cp = self._resume(env={"OHOS_ROOT": self.repo})
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("PDIR=%s" % self.pdir, cp.stdout)

    def test_resume_refreshes_todo(self):
        self._init()
        todo = os.path.join(self.pdir, "todo.md")
        if os.path.exists(todo):
            os.remove(todo)
        cp = self._resume("--repo", self.repo)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # resume regenerates the on-disk per-phase how-to mirror
        self.assertTrue(os.path.isfile(todo))
        with open(todo, encoding="utf-8") as f:
            body = f.read()
        self.assertIn("各阶段做什么 / 怎么做", body)

    def test_resume_no_pointer_errors_with_guidance(self):
        # no init ran -> no ACTIVE anywhere reachable
        cp = self._resume("--repo", self.repo)
        self.assertNotEqual(cp.returncode, 0)
        out = cp.stdout + cp.stderr
        self.assertIn("no active run found", out)
        self.assertIn("advance.py init", out)

    def test_resume_explicit_pipeline_dir_wins(self):
        self._init()
        cp = self._resume_pdir(self.pdir)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("PDIR=%s" % self.pdir, cp.stdout)


if __name__ == "__main__":
    unittest.main()
