#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_design.py v2 behaviors: placeholder rejection, v2-required-by-
default, contract reference closure, and phase_summary/failure_report emission."""
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
from _control_validation import ControlWriteValidationMixin  # noqa: E402

SECTIONS = """# 设计
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
"""

V2_CONTRACT = """
```ar-contract
{
  "contract_version": "2.0",
  "requirements": [{"id": "REQ-001", "desc": "点一"}],
  "build_artifacts": [{"id": "BA-001", "path": "out/rk3568/liba.z.so", "for_requirements": ["REQ-001"]}],
  "test_cases": [{"id": "TC-001", "point": "点一", "gtest": "ATest.Case001", "for_requirements": ["REQ-001"]}],
  "device_cases": [{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}],
  "changed_files": [{"id": "FILE-001", "path": "src/a.cpp", "for_requirements": ["REQ-001"]}]
}
```
"""

V1_CONTRACT = """
```ar-contract
{
  "build_artifacts": ["out/rk3568/liba.z.so"],
  "test_cases": [{"point": "点一", "gtest": "ATest.Case001"}],
  "device_cases": [{"desc": "触发", "marker": "AR_DEV_A_OK"}]
}
```
"""


class TestGateDesignV2(ControlWriteValidationMixin, unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        os.makedirs(os.path.join(self.pdir, "evidence"))
        self.run_id = "gd-v2"
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id, "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        })
        self._install_control_validation()

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()
        self._assert_control_writes_valid()

    def _write(self, text):
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(text)

    def _run(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "gate_design.py"),
             "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    def _summary(self):
        return gl.read_phase_summary(self.pdir, 1)

    def _failure(self):
        return gl.read_failure_report(self.pdir, 1)

    def test_v2_passes_and_writes_summary(self):
        self._write(SECTIONS + V2_CONTRACT)
        cp = self._run()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        s = self._summary()
        self.assertIsNotNone(s)
        self.assertEqual(s["verdict"], "PASS")
        self.assertEqual(s["contract_version"], 2)
        self.assertIsNone(self._failure())  # cleared on PASS

    def test_v1_rejected_by_default(self):
        self._write(SECTIONS + V1_CONTRACT)
        cp = self._run()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("v1 contract", cp.stdout + cp.stderr)
        f = self._failure()
        self.assertIsNotNone(f)
        self.assertEqual(f["phase"], 1)

    def test_v1_allowed_with_flag(self):
        self._write(SECTIONS + V1_CONTRACT)
        cp = self._run("--allow-contract-v1")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("AR-CONTRACT-V1-LEGACY", cp.stdout)

    def test_weak_device_anchors_rejected_by_default(self):
        # a v2 device_case with only desc+marker leaves P4 at plain_marker and
        # must FAIL by default.
        weak = V2_CONTRACT.replace(
            '{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}',
            '{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "for_requirements": ["REQ-001"]}')
        self._write(SECTIONS + weak)
        cp = self._run()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("P4_WEAK_ANCHORS", cp.stdout + cp.stderr)
        f = self._failure()
        self.assertTrue(any("no strong P4 anchor" in p for p in f["problems"]))

    def test_weak_device_anchors_allowed_with_flag(self):
        weak = V2_CONTRACT.replace(
            '{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}',
            '{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "for_requirements": ["REQ-001"]}')
        self._write(SECTIONS + weak)
        cp = self._run("--allow-weak-device-anchors")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("P4-WEAK-ANCHORS-BYPASS", cp.stdout)
        s = self._summary()
        self.assertEqual(s["p4_weak_device_cases"], 1)
        self.assertTrue(s["p4_weak_anchors_bypassed"])

    def test_strong_anchor_passes_without_flag(self):
        # the default V2_CONTRACT declares process + artifact_loaded -> no waiver
        self._write(SECTIONS + V2_CONTRACT)
        cp = self._run()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        s = self._summary()
        self.assertEqual(s["p4_weak_device_cases"], 0)
        self.assertFalse(s["p4_weak_anchors_bypassed"])

    def test_placeholder_rejected(self):
        self._write(SECTIONS.replace("a.cpp 做事", "a.cpp TODO 待补充") + V2_CONTRACT)
        cp = self._run()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("PLACEHOLDER", cp.stdout + cp.stderr)
        f = self._failure()
        self.assertTrue(any("placeholder" in p for p in f["problems"]))

    def test_placeholder_inside_contract_ignored(self):
        # a marker literally named with TBD-like text inside the contract block
        # must NOT trip the placeholder guard (contract is validated structurally)
        contract = V2_CONTRACT.replace("AR_DEV_A_OK", "AR_TODO_MARKER")
        self._write(SECTIONS + contract)
        cp = self._run()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_closure_failure_uncovered_requirement(self):
        # add REQ-002 that nothing references -> closure fail
        contract = V2_CONTRACT.replace(
            '{"id": "REQ-001", "desc": "点一"}',
            '{"id": "REQ-001", "desc": "点一"}, {"id": "REQ-002", "desc": "孤儿"}')
        self._write(SECTIONS + contract)
        cp = self._run()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("CLOSURE_FAIL", cp.stdout + cp.stderr)
        f = self._failure()
        self.assertTrue(any("REQ-002" in p for p in f["problems"]))

    def test_closure_failure_dangling_reference(self):
        contract = V2_CONTRACT.replace('"for_requirements": ["REQ-001"]}]\n}',
                                       '"for_requirements": ["REQ-999"]}]\n}')
        self._write(SECTIONS + contract)
        cp = self._run()
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("CLOSURE_FAIL", cp.stdout + cp.stderr)

    def test_ar_contract_json_written_on_pass(self):
        self._write(SECTIONS + V2_CONTRACT)
        self.assertEqual(self._run().returncode, 0)
        p = os.path.join(self.pdir, "evidence/phase1/ar_contract.json")
        self.assertTrue(os.path.exists(p))
        with open(p) as f:
            c = json.load(f)
        self.assertEqual(c["version"], 2)

    # --- derived P1 control artifacts (navigation layer, best-effort) ---------

    def test_design_controls_derived_on_pass(self):
        self._write(SECTIONS + V2_CONTRACT)
        cp = self._run()
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

        bundle = gl.read_control_json(
            self.pdir, "design_orchestrate", "initial_bundle_definition.json")
        self.assertIsNotNone(bundle)
        # bundle is derived from the signed contract, not from free text.
        # parse_ar_contract normalizes changed_files/build_artifacts to plain
        # paths (object form is kept in *_meta), so the bundle carries paths.
        self.assertEqual([r["id"] for r in bundle["requirements"]], ["REQ-001"])
        self.assertEqual(bundle["changed_files"], ["src/a.cpp"])
        self.assertEqual(bundle["build_artifacts"], ["out/rk3568/liba.z.so"])
        self.assertEqual(bundle["suspect_files"], ["src/a.cpp"])
        self.assertEqual(bundle["suspect_tests"], ["ATest.Case001"])
        self.assertEqual(bundle["downstream_revalidate_scope"], "P4_P5")

        receipt = gl.read_completion_receipt(
            self.pdir, ("design_orchestrate", "completion_receipt_p1.json"))
        self.assertIsNotNone(receipt)
        self.assertTrue(receipt["semantic_done"])
        self.assertTrue(receipt["human_gate_pending"])
        self.assertEqual(receipt["next_logical_phase_id"], "feature_develop")
        self.assertEqual(receipt["requirements_count"], 1)

        handoff = gl.read_handoff_packet(
            self.pdir, ("design_orchestrate", "handoff_to_feature_develop.json"))
        self.assertIsNotNone(handoff)
        self.assertEqual(handoff["to_logical_phase_id"], "feature_develop")
        self.assertFalse(handoff["requires_repair"])
        self.assertIn("consent", handoff["recommended_next_action"]["next_gate"])

        doc_index = gl.read_control_index(
            self.pdir, ("design_orchestrate", "global_design_doc_index.json"))
        self.assertIsNotNone(doc_index)
        self.assertIn("signed_ar_contract", [e["role"] for e in doc_index["entries"]])

        stage_index = gl.read_control_index(
            self.pdir, ("design_orchestrate", "stage_packet_index.json"))
        self.assertIsNotNone(stage_index)
        self.assertEqual(
            [e["logical_phase_id"] for e in stage_index["entries"]],
            ["feature_develop", "test_develop", "build_verify", "test_author",
             "device_functional", "quality_verify", "upload_review"])

        # every derived packet carries the control protocol version
        for payload in (bundle, receipt, handoff, doc_index, stage_index):
            self.assertEqual(payload["control_protocol_version"],
                             gl.CONTROL_PROTOCOL_VERSION)

    def test_gate_emits_its_own_stage_packet_with_entry_exit_conditions(self):
        # §13/§85: the gate that runs a phase emits its own stage packet so a
        # weak model entering a fresh window has the entry/exit contract even
        # before running advance.py next. Sourced from the shared def, so it
        # matches advance's projection.
        self._write(SECTIONS + V2_CONTRACT)
        self.assertEqual(self._run().returncode, 0)
        packet = gl.read_stage_packet(
            self.pdir, gl.stage_packet_parts("design_orchestrate"))
        self.assertIsNotNone(packet)
        self.assertTrue(gl.validate_control_payload("stage_packet", packet)["ok"])
        self.assertEqual(packet["phase_identity"]["phase_id"], "design_orchestrate")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 1)
        self.assertTrue(packet["entry_protocol"]["entry_preconditions"])
        self.assertTrue(packet["exit_protocol"]["exit_conditions"])
        self.assertTrue(packet["authority_boundary"]["not_truth_source"])
        # the gate's packet carries the SAME entry/exit contract as the shared def
        spec = gl.stage_packet_def("design_orchestrate")
        self.assertEqual(
            packet["entry_protocol"]["entry_preconditions"],
            spec["entry_preconditions"])
        self.assertEqual(
            packet["exit_protocol"]["exit_conditions"], spec["exit_conditions"])

    def test_design_memory_card_on_pass(self):
        self._write(SECTIONS + V2_CONTRACT)
        self.assertEqual(self._run().returncode, 0)
        card = gl.read_phase_memory_card(self.pdir, parts=("memory_cards", "phase1.json"))
        self.assertIsNotNone(card)
        self.assertEqual(card["phase"], 1)
        self.assertEqual(card["verdict"], "PASS")
        self.assertEqual(card["current_blocker"], "none")
        self.assertEqual(card["next_expected_action_class"],
                         "consent")
        self.assertIn("treat_navigation_files_as_truth_source",
                      card["forbidden_actions"])
        self.assertIn("skip_ar_contract_generation", card["forbidden_actions"])

    def test_design_controls_absent_on_fail_but_card_written(self):
        # closure failure -> no derived handoff/receipt, but a memory card that
        # tells a weak model what to repair
        contract = V2_CONTRACT.replace(
            '{"id": "REQ-001", "desc": "点一"}',
            '{"id": "REQ-001", "desc": "点一"}, {"id": "REQ-002", "desc": "孤儿"}')
        self._write(SECTIONS + contract)
        self.assertNotEqual(self._run().returncode, 0)

        self.assertIsNone(gl.read_completion_receipt(
            self.pdir, ("design_orchestrate", "completion_receipt_p1.json")))
        self.assertIsNone(gl.read_handoff_packet(
            self.pdir, ("design_orchestrate", "handoff_to_feature_develop.json")))

        card = gl.read_phase_memory_card(self.pdir, parts=("memory_cards", "phase1.json"))
        self.assertIsNotNone(card)
        self.assertEqual(card["verdict"], "FAIL")
        self.assertEqual(card["last_failure_class"], "design_gate_failed")
        self.assertEqual(card["next_expected_action_class"], "repair")
        self.assertNotEqual(card["current_blocker"], "none")

        # S2/S4 lock: P1 FAIL now emits a repair packet through finalize_control,
        # and the card's failure/action classes are non-empty and in the enum.
        self.assertIn(card["last_failure_class"], (
            "design_gate_failed", "ar_contract_invalid"))
        self.assertIn(card["next_expected_action_class"], gl.ACTION_CLASSES)
        repair = gl.read_repair_packet(self.pdir, ("repairs", "current.json"))
        self.assertIsNotNone(repair)
        self.assertTrue(repair.get("failure_class"))
        self.assertTrue(repair.get("suspect_files"))  # never empty (A4 fallback)
        self.assertIn("fallback_key", repair)  # S1: breaker key present

    def test_derived_controls_grant_no_pass_authority(self):
        # a PASS run derives receipts/handoffs, but phase 1 must NOT be advanced
        # by their mere existence: pipeline.json stays at the pre-gate state
        self._write(SECTIONS + V2_CONTRACT)
        self.assertEqual(self._run().returncode, 0)
        st = gl.load_state(self.pdir)
        ph1 = [p for p in st["phases"] if p["id"] == 1][0]
        self.assertEqual(ph1["status"], "pending")
        self.assertEqual(st["consent_tokens"], {})


if __name__ == "__main__":
    unittest.main()
