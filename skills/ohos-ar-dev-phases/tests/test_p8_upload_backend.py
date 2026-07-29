#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""P8 upload-backend branching: the gate resolves the upload backend from the
environment profile.
  * gitcode (openharmony / default): --repo-slug is required.
  * gerrit (harmonyos): hard-fails as an unconfigured placeholder BEFORE any
    irreversible action, with an actionable "configure the gerrit commands"
    message — the same fail-closed stance as an unconfigured build command.

Both cases stop at the precheck substate (no push, no manifest emitted), so the
test only has to stand up a state with phases 1..7 passed.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gate_upload_ci = _load("gate_upload_ci")


class TestUploadBackendBranch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        # a git repo so `git rev-parse` in the flow doesn't explode before the
        # branch we exercise (the gerrit branch fires before any git call).
        self.run_id = "p8-backend"
        gl.create_secret(self.run_id)

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _write_state(self, *, environment, component_type=None):
        phases = [{"id": i, "name": "p%d" % i, "status": "pending",
                   "manifest_ref": None, "closed_at_utc": None} for i in range(9)]
        for p in phases:
            if p["id"] in (1, 2, 3, 4, 5, 6, 7):
                p["status"] = "passed"
        state = {
            "run_id": self.run_id, "ar": self.run_id, "repo": self.repo,
            "git_dir": self.repo, "environment": environment,
            "component_type": component_type, "product": None,
            "device_serial": "", "build_target": "t",
            "test": {"part": "p", "ut_suites": [], "mst_suites": []},
            "base_commit": "", "phase_scheme": gl.PHASE_SCHEME, "current_phase": 8,
            "consent_tokens": {"8": "reviewer"},
            "code_fingerprint": None, "functional_fingerprint": None,
            "locked_all_paths": None, "phases": phases,
        }
        gl.save_state(self.pdir, state)

    def _run(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "gate_upload_ci.py"),
             "--pipeline-dir", self.pdir, "--branch", "feat/x", *extra],
            text=True, capture_output=True)

    def test_gerrit_backend_hard_fails_as_placeholder(self):
        self._write_state(environment="harmonyos", component_type="system")
        cp = self._run()  # no --repo-slug needed for gerrit
        self.assertNotEqual(cp.returncode, 0)
        out = cp.stdout + cp.stderr
        self.assertIn("gerrit", out.lower())
        # must NOT have pushed / created a PR
        self.assertNotIn("oh-gc pr create", out)

    def test_gitcode_backend_requires_repo_slug(self):
        self._write_state(environment="openharmony")
        cp = self._run()  # missing --repo-slug
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("--repo-slug is required", cp.stdout + cp.stderr)


if __name__ == "__main__":
    unittest.main()
