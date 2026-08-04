#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Regression tests for the rewind hardening (audit findings A/B/C):

A — evidence-epoch barrier: after `reset` (or verify-all drift-rewind) the
    append-only manifest still holds the pre-reset PASS records (chain/HMAC/
    artifacts intact). validate_closing_entry must refuse a PASS whose seq is
    below the reset epoch, so a rewalked phase cannot re-close on stale pre-fix
    evidence without its gate re-running.
B — verify-all demotion cascade: demoting a phase must drop every downstream
    phase to pending (no "at P3 yet P4-P8 passed" contradiction).
C — reset clears any active repair packet.
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

GOOD_DESIGN = """# 设计
## 目标组件
comp
## 详细功能需求
需求
## 完整代码框架
### 文件清单
- notes.txt
### 每文件功能
notes.txt 做事
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


class TestRewindBarrier(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "specs", "pipeline", "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        subprocess.run(["git", "-C", self.repo, "init", "-q"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.name", "t"], check=True)
        # run-state dir is gitignored in real runs so the gates' own writes never
        # enter the functional fingerprint — mirror that or pdir-internal writes
        # look like code drift and REFUSE the phase close.
        with open(os.path.join(self.repo, ".gitignore"), "w", encoding="utf-8") as f:
            f.write("specs/\n")
        with open(os.path.join(self.repo, "seed.txt"), "w") as f:
            f.write("seed\n")
        subprocess.run(["git", "-C", self.repo, "add", "-A"], check=True)
        subprocess.run(["git", "-C", self.repo, "commit", "-q", "-m", "seed"], check=True)
        base = subprocess.run(["git", "-C", self.repo, "rev-parse", "HEAD"],
                              text=True, capture_output=True).stdout.strip()
        self.run_id = "rewind-barrier"
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id, "repo": self.repo, "git_dir": self.repo,
            "base_commit": base, "current_phase": 1, "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        })

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _adv(self, *a):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, *a], text=True, capture_output=True)

    def _run(self, script, *a):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, script),
             "--pipeline-dir", self.pdir, *a], text=True, capture_output=True)

    def _close_design(self):
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(
            self._adv("consent", "--phase", "1", "--token", "reviewer").returncode, 0)
        cp = self._adv("advance", "--phase", "1")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    # ---- A: evidence-epoch barrier -------------------------------------------
    def test_pre_reset_pass_rejected_by_epoch_barrier(self):
        # close phase 1 (real signed PASS), then hand-emit a signed phase-4 PASS
        # to simulate a fully-walked run, then reset. The phase-4 PASS is still in
        # the manifest with a valid chain, but its seq is below the reset epoch ->
        # validate_closing_entry must refuse it as pre-reset evidence. (Phase 4 is
        # used, not 1, because reset appends its own INFO entry AT phase 1, which
        # would mask the barrier there; downstream phases have no such marker so
        # the epoch check is the operative refusal.)
        self._close_design()
        art = "evidence/phase4/build.log"
        os.makedirs(os.path.join(self.pdir, "evidence", "phase4"), exist_ok=True)
        with open(os.path.join(self.pdir, art), "w") as f:
            f.write("=====build successful=====\n")
        gl.emit(self.pdir, 4, "gate_build.py", verdict="PASS",
                reason="test build", artifacts_rel=[art])
        ok, _, _ = gl.validate_closing_entry(self.pdir, 4)
        self.assertTrue(ok)  # valid before any reset

        cp = self._adv("reset", "--reason", "fix")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = gl.load_state(self.pdir)
        self.assertIsInstance(st.get("evidence_epoch"), int)
        self.assertGreater(st["evidence_epoch"], 0)

        ok, reason, _ = gl.validate_closing_entry(self.pdir, 4)
        self.assertFalse(ok, "stale pre-reset PASS must be refused")
        self.assertIn("pre-reset", reason)

    def test_advance_refuses_stale_phase_after_reset(self):
        # end-to-end: after reset, advancing phase 1 on the stale PASS is refused
        # (the gate must re-run to append a fresh PASS above the epoch).
        self._close_design()
        self.assertEqual(self._adv("reset", "--reason", "fix").returncode, 0)
        cp = self._adv("advance", "--phase", "1")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(gl.load_state(self.pdir)["phases"][1]["status"], "pending")

    def test_fresh_pass_after_reset_clears_barrier(self):
        # re-running the gate after reset appends a PASS above the epoch, which
        # validate_closing_entry accepts again.
        self._close_design()
        self.assertEqual(self._adv("reset", "--reason", "fix").returncode, 0)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(
            self._adv("consent", "--phase", "1", "--token", "reviewer").returncode, 0)
        ok, reason, _ = gl.validate_closing_entry(self.pdir, 1)
        self.assertTrue(ok, reason)

    # ---- C: reset clears an active repair packet ------------------------------
    def test_reset_clears_active_repair_packet(self):
        self._close_design()
        gl.write_repair_packet(
            self.pdir, ("repairs", "current.json"),
            {"phase": 7, "phase_name": "quality-verify", "active": True,
             "failure_class": "integration_run",
             "recommended_next_action": "rerun_gate"})
        # sanity: packet reads back as active
        pkt = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertTrue(pkt.get("active"))
        self.assertEqual(self._adv("reset", "--reason", "fix").returncode, 0)
        pkt = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertFalse(pkt.get("active", True), "reset must deactivate the packet")

    # ---- B: verify-all demotion cascades to downstream phases -----------------
    def test_verify_all_demotion_cascades_downstream(self):
        # hand-build a state that claims phases 1-4 passed, then tamper phase 2's
        # evidence so verify-all demotes it; phases 3 and 4 must drop to pending
        # and current_phase rewind to 2 (no contradictory "passed" downstream).
        self._close_design()  # real signed PASS at phase 1 (survives re-validation)
        st = gl.load_state(self.pdir)
        # mark 2,3,4 passed with no backing evidence -> they fail re-validation
        for pid in (2, 3, 4):
            st["phases"][pid]["status"] = "passed"
        st["current_phase"] = 5
        gl.save_state(self.pdir, st)

        cp = self._adv("verify-all")
        # verify-all exits non-zero when it demotes anything
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = gl.load_state(self.pdir)
        self.assertEqual(st["phases"][1]["status"], "passed")   # real PASS kept
        self.assertEqual(st["phases"][2]["status"], "failed")   # earliest demoted
        # downstream must NOT remain "passed"
        self.assertNotEqual(st["phases"][3]["status"], "passed")
        self.assertNotEqual(st["phases"][4]["status"], "passed")
        self.assertEqual(st["current_phase"], 2)


if __name__ == "__main__":
    unittest.main()
