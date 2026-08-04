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

    def _load_state(self):
        import json
        with open(os.path.join(self.pdir, "pipeline.json"), encoding="utf-8") as f:
            return json.load(f)

    def _save_state(self, state):
        import json
        with open(os.path.join(self.pdir, "pipeline.json"), "w", encoding="utf-8") as f:
            json.dump(state, f)

    def test_resume_replays_bridge_connection_env(self):
        # A fresh window inherits none of the hdc bridge env. When P0 recorded a
        # WSL-bridge / remote connection, resume must tell the operator exactly
        # what to re-export (values, not just names).
        self._init()
        st = self._load_state()
        st["connection_env"] = {"HDC_WIN_PORT": "10086",
                                "DEVICE_SERIAL": "SN-42"}
        self._save_state(st)
        cp = self._resume("--repo", self.repo)  # _resume strips OHOS_ROOT/env
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("设备连接", cp.stdout)
        self.assertIn("export HDC_WIN_PORT=10086", cp.stdout)
        self.assertIn("export DEVICE_SERIAL=SN-42", cp.stdout)
        # bridge runs need the far-side hdc server still up
        self.assertIn("hdc -m -s", cp.stdout)

    def test_resume_marks_already_set_conn_var(self):
        self._init()
        st = self._load_state()
        st["connection_env"] = {"HDC_HOST_OVERRIDE": "1.2.3.4:10086"}
        self._save_state(st)
        cp = self._resume("--repo", self.repo,
                          env={"HDC_HOST_OVERRIDE": "1.2.3.4:10086"})
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("✓ 已设置", cp.stdout)

    def test_resume_native_usb_no_export_nag(self):
        # No connection_env, but a probed serial -> say so plainly, no export list.
        self._init()
        st = self._load_state()
        st["connection_env"] = {}
        st["device_serial"] = "USB-SN"
        self._save_state(st)
        cp = self._resume("--repo", self.repo)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("USB-SN", cp.stdout)
        self.assertNotIn("请执行", cp.stdout)


if __name__ == "__main__":
    unittest.main()
