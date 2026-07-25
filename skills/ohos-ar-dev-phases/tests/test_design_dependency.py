#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_develop's dependency on a signed AR_design (P1a -> P1)."""
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402

GOOD_DESIGN = """# 设计
## 目标组件
comp
## 详细功能需求
需求
## 完整代码框架
### 文件清单
- src/a.cpp
### 每文件功能
a.cpp 做事
### 代码框架
skeleton here
## 完整测试框架
ohos_unittest
## 需测试的功能点
点一
## 真机测试用例构造
真机 hdc 触发

```ar-contract
{
  "contract_version": "2.0",
  "requirements": [{"id": "REQ-001", "desc": "点一"}],
  "build_artifacts": [{"id": "BA-001", "path": "out/rk3568/liba.z.so", "for_requirements": ["REQ-001"]}],
  "test_cases": [{"id": "TC-001", "point": "点一", "gtest": "ATest.Case001", "for_requirements": ["REQ-001"]}],
  "device_cases": [{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}],
  "changed_files": [{"id": "FILE-001", "path": "notes.txt", "for_requirements": ["REQ-001"]}]
}
```
"""


def git(repo, *a):
    return subprocess.run(["git", "-C", repo, *a], text=True, capture_output=True)


class TestDesignDependency(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.email", "t@t")
        git(self.repo, "config", "user.name", "t")
        with open(os.path.join(self.repo, "seed.txt"), "w") as f:
            f.write("x")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-qm", "base")
        self.base = git(self.repo, "rev-parse", "HEAD").stdout.strip()

        self.pdir = os.path.join(self.repo, "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"))
        self.run_id = "design-dep"
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id, "repo": self.repo, "git_dir": self.repo,
            "base_commit": self.base, "consent_tokens": {},
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        })
        # make a non-C/C++ change so develop has something to see without
        # invoking the C++ style guard (we test the design dependency, not style)
        with open(os.path.join(self.repo, "notes.txt"), "w") as f:
            f.write("some change\n")

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _run(self, script, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, script),
             "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    def _write_design(self, text):
        with open(os.path.join(self.pdir, "AR_design.md"), "w") as f:
            f.write(text)

    def _consent(self, phase=1, token="reviewer"):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "consent",
             "--phase", str(phase), "--token", token],
            text=True, capture_output=True)

    def test_develop_refused_without_design(self):
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("AR_design", cp.stdout + cp.stderr)

    def test_develop_refused_without_consent(self):
        self._write_design(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        # design signed but no phase-1 consent yet -> develop refuses
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("consent", (cp.stdout + cp.stderr).lower())

    def test_develop_allowed_after_signed_design(self):
        self._write_design(GOOD_DESIGN)
        d = self._run("gate_design.py")
        self.assertEqual(d.returncode, 0, d.stdout + d.stderr)
        c = self._consent()
        self.assertEqual(c.returncode, 0, c.stdout + c.stderr)
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_consent_stale_after_design_rerun(self):
        self._write_design(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        # re-run gate_design -> new signed design entry -> old consent goes stale
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("stale", (cp.stdout + cp.stderr).lower())

    def test_develop_refused_when_design_tampered(self):
        self._write_design(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        # tamper the signed evidence artifact
        with open(os.path.join(self.pdir, "evidence/phase1/AR_design.md"), "a") as f:
            f.write("\nTAMPERED\n")
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("tamper", (cp.stdout + cp.stderr).lower())

    def test_legacy_bypass(self):
        cp = self._run("gate_develop.py", "--allow-missing-design")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # bypass is recorded in the signed reason
        entry = gl.last_entry_for_phase(self.pdir, 1)
        self.assertIn("DESIGN-GATE-LEGACY-BYPASS", entry.get("reason", ""))


if __name__ == "__main__":
    unittest.main()
