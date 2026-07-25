#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the phase1 test-develop control subflow."""
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
import gate_develop as gd  # noqa: E402

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


class TestPhase1TestDevelop(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        subprocess.run(["git", "-C", self.repo, "init", "-q"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.name", "t"], check=True)
        with open(os.path.join(self.repo, "seed.txt"), "w", encoding="utf-8") as f:
            f.write("seed\n")
        subprocess.run(["git", "-C", self.repo, "add", "-A"], check=True)
        subprocess.run(["git", "-C", self.repo, "commit", "-qm", "base"], check=True)
        base = subprocess.run(
            ["git", "-C", self.repo, "rev-parse", "HEAD"],
            check=True, text=True, capture_output=True).stdout.strip()
        self.run_id = "phase1-test-develop"
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id,
            "repo": self.repo,
            "git_dir": self.repo,
            "base_commit": base,
            "current_phase": 1,
            "consent_tokens": {},
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

    def _run(self, script, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, script), "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    def _consent(self):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"), "--pipeline-dir", self.pdir,
             "consent", "--phase", "1", "--token", "reviewer"],
            text=True, capture_output=True)

    def _prepare_phase1_pass(self):
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_gate_develop_writes_feature_freeze_snapshot_only(self):
        self._prepare_phase1_pass()
        freeze = gl.read_control_json(self.pdir, "test_develop", "development_freeze_snapshot.json")
        matrix = gl.read_control_json(self.pdir, "test_develop", "test_intent_matrix.json")
        status = gl.read_control_json(self.pdir, "test_develop", "phase1_test_develop.json")
        self.assertEqual(freeze["logical_phase_id"], "feature_develop")
        self.assertIn("notes.txt", freeze["changed_files"])
        self.assertIsNone(matrix)
        self.assertIsNone(status)

    def test_prepare_test_bundle_writes_test_develop_bundle(self):
        self._prepare_phase1_pass()
        cp = self._run("prepare_test_bundle.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        freeze = gl.read_control_json(self.pdir, "test_develop", "development_freeze_snapshot.json")
        scope = gl.read_control_json(self.pdir, "test_develop", "signed_test_scope.json")
        matrix = gl.read_control_json(self.pdir, "test_develop", "test_intent_matrix.json")
        status = gl.read_control_json(self.pdir, "test_develop", "phase1_test_develop.json")
        receipt = gl.read_control_json(self.pdir, "test_develop", "completion_receipt_p3.json")
        handoff = gl.read_control_json(self.pdir, "test_develop", "handoff_p3_test_develop.json")
        failure = gl.read_control_json(self.pdir, "test_develop", "failure_packet.json")
        self.assertEqual(freeze["logical_phase_id"], "feature_develop")
        self.assertEqual(scope["logical_phase_id"], "test_develop")
        self.assertEqual(scope["contract_status"], "signed")
        self.assertEqual(scope["declared_changed_files_present"], ["notes.txt"])
        self.assertEqual(scope["expected_gtests"], ["ATest.Case001"])
        self.assertEqual(status["logical_phase_id"], "test_develop")
        self.assertTrue(status["ready_for_build"])
        self.assertEqual(status["handoff_to"], "build_verify")
        self.assertEqual(status["scope_expansion_decision"], "allow_test_only")
        self.assertIn("artifact_index", status)
        self.assertIn("evidence_index", status)
        self.assertEqual(receipt["semantic_done"], True)
        self.assertEqual(receipt["next_phase_ready"], True)
        self.assertEqual(handoff["bundle_revision"], status["bundle_revision"])
        self.assertEqual(handoff["recommended_next_action"]["action"], "build-verify")
        self.assertTrue(any(a["role"] == "signed_test_scope" for a in handoff["produced_artifacts"]))
        self.assertFalse(failure["active"])
        self.assertEqual(matrix["items"][0]["test_case_id"], "TC-001")
        self.assertEqual(matrix["items"][0]["expected_gtest"], "ATest.Case001")
        # The receipt + handoff prepare_test_bundle emits must satisfy their
        # schemas (handoff carries to_phase, receipt carries its required set).
        self.assertTrue(
            gl.validate_control_payload("completion_receipt", receipt)["ok"],
            gl.validate_control_payload("completion_receipt", receipt)["problems"])
        self.assertTrue(
            gl.validate_control_payload("handoff_packet", handoff)["ok"],
            gl.validate_control_payload("handoff_packet", handoff)["problems"])
        self.assertEqual(handoff["to_phase"], 2)
        self.assertTrue(matrix["items"][0]["device_followup_needed"])

    def test_prepare_test_bundle_blocks_on_feature_freeze_violation(self):
        self._prepare_phase1_pass()
        with open(os.path.join(self.repo, "extra.cpp"), "w", encoding="utf-8") as f:
            f.write("int x = 1;\n")
        cp = self._run("prepare_test_bundle.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("feature freeze violated", cp.stderr or cp.stdout)
        failure = gl.read_control_json(self.pdir, "test_develop", "failure_packet.json")
        status = gl.read_control_json(self.pdir, "test_develop", "phase1_test_develop.json")
        self.assertEqual(failure["failure_class"], "feature_freeze_violated")
        self.assertEqual(failure["recommended_next_action"], "regenerate")
        self.assertFalse(status["ready_for_build"])

    def test_prepare_test_bundle_requires_freeze_snapshot(self):
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        cp = self._run("prepare_test_bundle.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("development_freeze_snapshot", cp.stderr or cp.stdout)
        failure = gl.read_control_json(self.pdir, "test_develop", "failure_packet.json")
        self.assertEqual(failure["failure_class"], "development_freeze_snapshot_missing")
        self.assertEqual(failure["required_inputs"], ["development_freeze_snapshot"])

    def test_advance_maps_phase1_to_test_develop_after_develop_pass(self):
        self._prepare_phase1_pass()
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["current_substate"], "awaiting_test_develop_gate")
        self.assertEqual(payload["logical_phase_id"], "test_develop")
        self.assertEqual(payload["logical_phase_name"], "test-develop")
        self.assertEqual(payload["next_gate"], "prepare_test_bundle.py")
        self.assertEqual(payload["required_inputs"], ["development_freeze_snapshot", "signed_test_scope"])
        self.assertEqual(
            payload["control_refs"]["receipt"],
            os.path.join("controls", "receipts", "phase1-test-develop.json"),
        )

    def test_advance_moves_to_ready_to_build_verify_after_prepare_test_bundle(self):
        self._prepare_phase1_pass()
        self.assertEqual(self._run("prepare_test_bundle.py").returncode, 0)
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["current_substate"], "ready_to_build_verify")
        self.assertEqual(payload["logical_phase_id"], "test_develop")
        self.assertEqual(payload["next_gate"], "advance.py advance --phase 1")

    def test_ready_to_build_verify_requires_scope_artifact(self):
        self._prepare_phase1_pass()
        self.assertEqual(self._run("prepare_test_bundle.py").returncode, 0)
        os.remove(os.path.join(self.pdir, "controls", "test_develop", "signed_test_scope.json"))
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["current_substate"], "awaiting_test_develop_gate")
        self.assertEqual(payload["next_gate"], "prepare_test_bundle.py")


    def _advance_phase1(self):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "advance", "--phase", "1"],
            text=True, capture_output=True)

    def test_advance_phase1_refused_when_test_develop_skipped(self):
        # the historical bypass: gate_design -> consent -> gate_develop, then
        # advance --phase 1 WITHOUT running prepare_test_bundle.py. This must be
        # refused now, or downstream P2/P3/P4 ship empty suspect scopes.
        self._prepare_phase1_pass()
        self.assertIsNone(gl.read_control_json(
            self.pdir, "test_develop", "signed_test_scope.json"))
        cp = self._advance_phase1()
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("test-develop bundle is not ready", cp.stdout + cp.stderr)
        # state must NOT have advanced
        st = gl.load_state(self.pdir)
        self.assertEqual(st["current_phase"], 1)
        self.assertEqual(st["phases"][1]["status"], "pending")

    def test_advance_phase1_allowed_after_prepare_test_bundle(self):
        self._prepare_phase1_pass()
        self.assertEqual(self._run("prepare_test_bundle.py").returncode, 0)
        cp = self._advance_phase1()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = gl.load_state(self.pdir)
        self.assertEqual(st["current_phase"], 2)
        self.assertEqual(st["phases"][1]["status"], "passed")

    def test_advance_phase1_refused_when_scope_tampered_away(self):
        # bundle prepared, then the signed scope is deleted mid-run: the gate
        # must refuse rather than fall through on a stale status file.
        self._prepare_phase1_pass()
        self.assertEqual(self._run("prepare_test_bundle.py").returncode, 0)
        os.remove(os.path.join(
            self.pdir, "controls", "test_develop", "signed_test_scope.json"))
        cp = self._advance_phase1()
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("signed_test_scope", cp.stdout + cp.stderr)

    def test_legacy_run_closes_phase1_without_test_develop_bundle(self):
        # a legacy run (sections present but no ar-contract block ->
        # --allow-missing-contract) has no contract to derive a test-develop
        # bundle from. The P3 hard gate must NOT bite it: legacy runs still
        # close phase 1 the old way, with no prepare_test_bundle.py.
        design_no_contract = GOOD_DESIGN.split("```ar-contract")[0]
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(design_no_contract)
        self.assertEqual(
            self._run("gate_design.py", "--allow-missing-contract").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("legacy change\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # no prepare_test_bundle.py — legacy has nothing to prepare
        cp = self._advance_phase1()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(gl.load_state(self.pdir)["current_phase"], 2)


if __name__ == "__main__":
    unittest.main()
