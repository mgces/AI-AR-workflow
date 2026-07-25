#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the weak-model structured control layer: advance.py status --json
and next (next_action.json). These are NAVIGATION outputs — they must never be
treated as a pass/advance authority (that stays with signed evidence)."""
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


class TestAdvanceNext(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "next-test-run"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)
        state = {
            "run_id": self.run_id, "ar": self.run_id, "build_target": "t",
            "current_phase": 0, "consent_tokens": {},
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        }
        gl.save_state(self.pdir, state)

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _run(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    def _emit_pass(self, phase, reason="r"):
        rel = "evidence/phase%d/report.txt" % phase
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w") as f:
            f.write("ok\n")
        return gl.emit(self.pdir, phase, "gate_x.py", verdict="PASS",
                       reason=reason, artifacts_rel=[rel])

    def test_status_json_shape(self):
        cp = self._run("status", "--json")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        data = json.loads(cp.stdout)
        self.assertEqual(data["current_phase"], 0)
        self.assertEqual(len(data["phases"]), len(gl.PHASES))
        self.assertIn("current_substate", data)
        self.assertIn("next_gate", data)
        self.assertEqual(data["control_protocol_version"], 1)
        self.assertEqual(data["logical_phase_id"], "bootstrap")
        self.assertEqual(data["logical_phase_name"], "bootstrap")
        self.assertEqual(data["action_kind"], "run_gate")
        self.assertEqual(
            data["control_refs"]["next_action"],
            os.path.join("controls", "next_action.json"),
        )

    def test_next_writes_file(self):
        cp = self._run("next")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        path = os.path.join(self.pdir, "next_action.json")
        controls_path = os.path.join(self.pdir, "controls", "next_action.json")
        memory_card_path = os.path.join(
            self.pdir, "controls", "memory_cards", "current.json")
        receipt_path = os.path.join(
            self.pdir, "controls", "receipts", "phase0.json")
        handoff_path = os.path.join(
            self.pdir, "controls", "handoffs", "current.json")
        handoff_out_path = os.path.join(
            self.pdir, "controls", "handoffs", "phase0-next.json")
        self.assertTrue(os.path.exists(path))
        self.assertTrue(os.path.exists(controls_path))
        self.assertTrue(os.path.exists(memory_card_path))
        self.assertTrue(os.path.exists(receipt_path))
        self.assertTrue(os.path.exists(handoff_path))
        self.assertTrue(os.path.exists(handoff_out_path))
        with open(path) as f:
            data = json.load(f)
        with open(controls_path) as f:
            controls_data = json.load(f)
        with open(memory_card_path) as f:
            memory_card = json.load(f)
        with open(receipt_path) as f:
            receipt = json.load(f)
        with open(handoff_path) as f:
            handoff = json.load(f)
        self.assertEqual(data, controls_data)
        self.assertEqual(data["current_phase"], 0)
        self.assertEqual(data["next_gate"], "gate_env_init.py")
        self.assertIn("resume_hint", data)
        self.assertEqual(
            data["control_refs"]["memory_card"],
            os.path.join("controls", "memory_cards", "current.json"),
        )
        self.assertEqual(memory_card["phase"], 0)
        self.assertEqual(memory_card["next_expected_action_class"], "run_gate")
        self.assertFalse(receipt["truth_layer_pass_known"])
        self.assertEqual(handoff["recommended_next_action"]["next_gate"], "gate_env_init.py")

    def test_next_lands_a_stage_packet_for_the_active_logical_phase(self):
        cp = self._run("next", "--json")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        data = json.loads(cp.stdout)
        # P0 projects to the bootstrap logical phase.
        packet = gl.read_stage_packet(
            self.pdir, gl.stage_packet_parts("bootstrap"))
        self.assertIsNotNone(packet)
        self.assertEqual(packet["control_protocol_version"], 1)
        self.assertEqual(packet["phase_identity"]["phase_id"], "bootstrap")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 0)
        self.assertTrue(packet["authority_boundary"]["not_truth_source"])
        # It is a schema-valid, non-authoritative navigation artifact.
        self.assertTrue(
            gl.validate_control_payload("stage_packet", packet)["ok"])
        self.assertEqual(
            data["control_refs"]["stage_packet"],
            os.path.join("controls", "packets", "bootstrap.json"))

    def test_next_writes_the_forced_window_startup_order(self):
        # §15: the memory card is step 1, so it must itself carry the reading
        # order for everything after it; next_action mirrors it.
        cp = self._run("next", "--json")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        data = json.loads(cp.stdout)
        memory_card = gl.read_control_json(
            self.pdir, "memory_cards", "current.json")

        for order in (data["window_startup_order"],
                      memory_card["window_startup_order"]):
            self.assertEqual(
                [s["artifact"] for s in order["steps"]],
                ["phase_memory_card", "advance_status_json", "stage_packet",
                 "handoff_or_repair_packet", "completion_receipt",
                 "failure_report_or_phase_summary", "phase_evidence"])
        # step refs resolve to this run's concrete control paths
        steps = {s["artifact"]: s
                 for s in data["window_startup_order"]["steps"]}
        self.assertEqual(
            steps["phase_memory_card"]["ref"],
            os.path.join("controls", "memory_cards", "current.json"))
        self.assertEqual(
            steps["stage_packet"]["ref"],
            os.path.join("controls", "packets", "bootstrap.json"))

    def test_status_json_exposes_window_startup_order(self):
        cp = self._run("status", "--json")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        order = json.loads(cp.stdout)["window_startup_order"]
        self.assertEqual(order["steps"][0]["artifact"], "phase_memory_card")
        self.assertIn("read_global_readme_first", order["forbidden_starts"])

    def test_next_ready_to_advance_after_pass(self):
        self._emit_pass(0)
        cp = self._run("next", "--json")
        data = json.loads(cp.stdout)
        self.assertEqual(data["current_substate"], "ready_to_advance")
        self.assertIn("advance --phase 0", data["next_gate"])
        receipt = gl.read_control_json(self.pdir, "receipts", "phase0.json")
        self.assertTrue(receipt["truth_layer_pass_known"])
        self.assertTrue(receipt["next_phase_ready"])

    def test_next_awaiting_consent_for_p4(self):
        # walk to P4 without consent, then a PASS should show awaiting_consent
        state = gl.load_state(self.pdir)
        state["current_phase"] = 4
        gl.save_state(self.pdir, state)
        self._emit_pass(4)
        cp = self._run("next", "--json")
        data = json.loads(cp.stdout)
        self.assertEqual(data["current_substate"], "awaiting_consent")
        self.assertIn("consent", data["next_gate"])
        self.assertIn("reviewer_token", data["required_inputs"])
        memory_card = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        receipt = gl.read_control_json(self.pdir, "receipts", "phase4.json")
        self.assertEqual(memory_card["current_blocker"], "reviewer_token")
        self.assertTrue(receipt["truth_layer_pass_known"])
        self.assertTrue(receipt["human_gate_pending"])

    def test_next_reports_last_failure(self):
        rel = "evidence/phase0/report.txt"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w") as f:
            f.write("bad\n")
        gl.emit(self.pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="missing capabilities", artifacts_rel=[rel])
        cp = self._run("next", "--json")
        data = json.loads(cp.stdout)
        self.assertIsNotNone(data["last_failure"])
        self.assertEqual(data["last_failure"]["phase"], 0)
        self.assertIn("missing", data["last_failure"]["reason"])

    def test_status_json_does_not_grant_progress(self):
        # emitting status/next must not change the phase status
        self._run("next")
        self._run("status", "--json")
        state = gl.load_state(self.pdir)
        self.assertEqual(state["current_phase"], 0)
        self.assertEqual(gl.phase_state(state, 0)["status"], "pending")

    def test_next_phase1_test_develop_waits_for_prepare_step(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 1
        state["repo"] = self.pdir
        state["git_dir"] = self.pdir
        state["base_commit"] = "HEAD"
        gl.save_state(self.pdir, state)
        design_rel = os.path.join("evidence", "phase1", "AR_design.md")
        os.makedirs(os.path.dirname(os.path.join(self.pdir, design_rel)), exist_ok=True)
        with open(os.path.join(self.pdir, design_rel), "w", encoding="utf-8") as f:
            f.write("# 设计\n## 目标组件\ncomp\n## 详细功能需求\nreq\n## 完整代码框架\n### 文件清单\n- notes.txt\n### 每文件功能\nnotes.txt do\n### 代码框架\nsk\n## 完整测试框架\noh\n## 需测试的功能点\n点一\n## 真机测试用例构造\n真机\n\n```ar-contract\n{\"contract_version\":\"2.0\",\"requirements\":[{\"id\":\"REQ-001\",\"desc\":\"点一\"}],\"build_artifacts\":[{\"id\":\"BA-001\",\"path\":\"out/rk3568/liba.z.so\",\"for_requirements\":[\"REQ-001\"]}],\"test_cases\":[{\"id\":\"TC-001\",\"point\":\"点一\",\"gtest\":\"ATest.Case001\",\"for_requirements\":[\"REQ-001\"]}],\"device_cases\":[{\"id\":\"DC-001\",\"desc\":\"触发\",\"marker\":\"AR_DEV_A_OK\",\"for_requirements\":[\"REQ-001\"]}],\"changed_files\":[{\"id\":\"FILE-001\",\"path\":\"notes.txt\",\"for_requirements\":[\"REQ-001\"]}]}\n```\n")
        with open(os.path.join(self.pdir, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("ok\n")
        design_entry = gl.emit(
            self.pdir, 1, "gate_design.py", verdict="PASS",
            reason="design ok", artifacts_rel=[design_rel],
        )
        state = gl.load_state(self.pdir)
        state["consent_tokens"] = {
            "1": gl.make_consent_record(
                state["run_id"], 1, "reviewer", gl.entry_id(design_entry)
            )
        }
        gl.save_state(self.pdir, state)
        freeze = gd.write_development_freeze_snapshot(
            self.pdir, state, {"changed_files": ["notes.txt"]},
            ["notes.txt"], ["notes.txt"], [], ["notes.txt"], [])
        gl.write_control_json(
            self.pdir, "test_develop", "development_freeze_snapshot.json",
            payload=freeze, best_effort=False)
        rel = "evidence/phase1/report.txt"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            f.write("ok\n")
        gl.emit(self.pdir, 1, "gate_develop.py", verdict="PASS", reason="develop ok", artifacts_rel=[rel])
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "awaiting_test_develop_gate")
        self.assertEqual(data["next_gate"], "prepare_test_bundle.py")
        self.assertEqual(data["required_inputs"], ["development_freeze_snapshot", "signed_test_scope"])

    def test_next_awaiting_repair_when_active_packet_exists(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 2
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "repairs", "current.json",
            payload={
                "phase": 2,
                "active": True,
                "failure_class": "build_verdict_failed",
                "must_rerun": ["gate_build.py"],
                "recommended_next_action": "repair_window",
                "last_failure_reason": "build failed",
                "bundle_revision_from": "rev-123",
                "repair_rounds": 1,
                "human_escalation_needed": False,
            },
            best_effort=False)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "awaiting_repair")
        self.assertEqual(data["next_gate"], "gate_build.py")
        self.assertEqual(data["required_inputs"], ["scoped_fix"])
        self.assertEqual(data["repair_packet"]["bundle_revision_from"], "rev-123")
        memory_card = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        self.assertTrue(memory_card["repair_packet_present"])
        self.assertFalse(memory_card["human_escalation_needed"])

    def test_next_blocks_when_repair_packet_requires_escalation(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 2
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "repairs", "current.json",
            payload={
                "phase": 2,
                "active": True,
                "failure_class": "build_verdict_failed",
                "must_rerun": ["gate_build.py"],
                "recommended_next_action": "human_escalation",
                "last_failure_reason": "build failed repeatedly",
                "bundle_revision_from": "rev-esc",
                "repair_rounds": 3,
                "human_escalation_needed": True,
                "escalation_note": "same bundle revision exceeded max_repair_rounds=2",
            },
            best_effort=False)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "blocked")
        self.assertIsNone(data["next_gate"])
        self.assertEqual(data["required_inputs"], ["human_review"])
        self.assertIn("max_repair_rounds", data["resume_hint"])
        memory_card = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        self.assertTrue(memory_card["human_escalation_needed"])
        self.assertEqual(memory_card["last_failure_class"], "build_verdict_failed")

    def test_derive_next_action_helper(self):
        state = gl.load_state(self.pdir)
        payload = adv._derive_next_action(self.pdir, state)
        self.assertEqual(payload["current_phase"], 0)
        self.assertFalse(payload["legacy_mode"])
        self.assertEqual(payload["logical_phase_id"], "bootstrap")
        self.assertEqual(payload["action_kind"], "run_gate")
        self.assertEqual(
            payload["control_refs"]["receipt"],
            os.path.join("controls", "receipts", "phase0.json"),
        )

    def test_phase1_design_maps_to_design_orchestrate(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 1
        gl.save_state(self.pdir, state)
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["current_substate"], "awaiting_design_gate")
        self.assertEqual(payload["logical_phase_id"], "design_orchestrate")
        self.assertEqual(payload["logical_phase_name"], "design-orchestrate")
        self.assertEqual(payload["action_kind"], "run_gate")
        self.assertEqual(
            payload["control_refs"]["receipt"],
            os.path.join("controls", "receipts", "phase1-design-orchestrate.json"),
        )
        self._run("next")
        receipt = gl.read_control_json(
            self.pdir, "receipts", "phase1-design-orchestrate.json")
        handoff = gl.read_control_json(
            self.pdir, "handoffs", "phase1-design-orchestrate-next.json")
        memory_card = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        self.assertEqual(receipt["phase_scope"], "phase1-subflow")
        self.assertIn("phase1 design subflow is active", handoff["facts_for_next_phase"])
        self.assertIn("skip_ar_contract_generation", memory_card["forbidden_actions"])

    def test_phase1_develop_maps_to_feature_develop(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 1
        gl.save_state(self.pdir, state)
        design_rel = os.path.join("evidence", "phase1", "AR_design.md")
        os.makedirs(os.path.dirname(os.path.join(self.pdir, design_rel)), exist_ok=True)
        with open(os.path.join(self.pdir, design_rel), "w", encoding="utf-8") as f:
            f.write("# design\n\n```ar-contract\n{\"build_artifacts\":[\"out/a\"],\"test_cases\":[{\"point\":\"p\",\"gtest\":\"Suite.Case\"}],\"device_cases\":[{\"desc\":\"d\",\"marker\":\"m\"}]}\n```\n")
        design_entry = gl.emit(
            self.pdir, 1, "gate_design.py", verdict="PASS",
            reason="design ok", artifacts_rel=[design_rel],
        )
        state = gl.load_state(self.pdir)
        state["consent_tokens"] = {
            "1": gl.make_consent_record(
                state["run_id"], 1, "reviewer", gl.entry_id(design_entry)
            )
        }
        gl.save_state(self.pdir, state)
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["current_substate"], "ready_to_advance")
        self.assertEqual(payload["logical_phase_id"], "feature_develop")
        self.assertEqual(payload["logical_phase_name"], "feature-develop")
        self.assertEqual(payload["action_kind"], "advance")
        self.assertEqual(
            payload["control_refs"]["receipt"],
            os.path.join("controls", "receipts", "phase1-feature-develop.json"),
        )
        self._run("next")
        receipt = gl.read_control_json(
            self.pdir, "receipts", "phase1-feature-develop.json")
        handoff = gl.read_control_json(
            self.pdir, "handoffs", "phase1-feature-develop-next.json")
        memory_card = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        self.assertEqual(receipt["phase_scope"], "phase1-subflow")
        self.assertIn("phase1 develop subflow is active", handoff["facts_for_next_phase"])
        self.assertIn("skip_signed_design_consent_check", memory_card["forbidden_actions"])


    def test_phase5_projects_p7_substate_from_quality_snapshot(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 5
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "quality_verify", "substate.json",
            payload={
                "substate_id": "human_review_await",
                "substate_name": "human-review-await",
                "substate_goal": "wait for a human reviewer",
                "next_substate_id": None,
                "next_substate_name": None,
                "entry_conditions": ["all P7 substates passed"],
                "exit_conditions": ["human consent recorded"],
                "expected_artifacts": [],
                "human_gate_pending": True,
                "human_escalation_needed": False,
            },
            best_effort=False)
        self._emit_pass(5)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "awaiting_consent")
        self.assertEqual(data["logical_substate"]["id"], "human_review_await")
        self.assertEqual(data["logical_substate"]["name"], "human-review-await")
        self.assertTrue(data["logical_substate"]["human_gate_pending"])
        self.assertEqual(data["logical_substate"]["source"], "quality_substate")

    def test_phase5_repair_maps_failure_to_p7_substate(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 5
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "repairs", "current.json",
            payload={
                "phase": 5,
                "active": True,
                "failure_class": "quality_reports_missing_or_invalid",
                "must_rerun": ["gate_integration.py"],
                "recommended_next_action": "repair_window",
                "last_failure_reason": "quality reports missing",
                "bundle_revision_from": "rev-it",
                "repair_rounds": 1,
                "human_escalation_needed": False,
            },
            best_effort=False)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "awaiting_repair")
        self.assertEqual(data["logical_substate"]["id"], "quality_check")
        self.assertEqual(data["logical_substate"]["source"], "repair_packet")

    def test_phase6_projects_p8_substate_from_upload_snapshot(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 6
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "upload_review", "substate.json",
            payload={
                "substate_id": "consent_await",
                "substate_name": "consent-await",
                "substate_goal": "wait for human upload consent",
                "next_substate_id": "push_pr",
                "next_substate_name": "push-pr",
                "entry_conditions": ["dry run passed"],
                "exit_conditions": ["phase-6 consent recorded"],
                "expected_artifacts": [],
                "human_gate_pending": True,
                "human_escalation_needed": False,
            },
            best_effort=False)
        self._emit_pass(6)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "awaiting_consent")
        self.assertEqual(data["logical_substate"]["id"], "consent_await")
        self.assertEqual(data["logical_substate"]["name"], "consent-await")
        self.assertTrue(data["logical_substate"]["human_gate_pending"])
        self.assertEqual(data["logical_substate"]["source"], "upload_substate")

    def test_phase6_repair_maps_sha_conflict_to_ci_green_substate(self):
        state = gl.load_state(self.pdir)
        state["current_phase"] = 6
        gl.save_state(self.pdir, state)
        gl.write_control_json(
            self.pdir, "repairs", "current.json",
            payload={
                "phase": 6,
                "active": True,
                "failure_class": "pr_head_sha_mismatch",
                "must_rerun": ["gate_upload_ci.py"],
                "recommended_next_action": "human_escalation",
                "last_failure_reason": "sha mismatch",
                "bundle_revision_from": "rev-up",
                "repair_rounds": 2,
                "human_escalation_needed": True,
                "escalation_note": "review/CI/SHA binding conflict requires a human decision, not a local repair",
            },
            best_effort=False)
        data = json.loads(self._run("next", "--json").stdout)
        self.assertEqual(data["current_substate"], "blocked")
        self.assertEqual(data["logical_substate"]["id"], "ci_green")
        self.assertTrue(data["logical_substate"]["human_escalation_needed"])
        self.assertEqual(data["logical_substate"]["source"], "repair_packet")

    # Map a controls-tree filename to the schema kind it should satisfy, so a
    # subprocess-written packet (advance.py runs out of process) can still be
    # validated post-hoc against its schema.
    @staticmethod
    def _kind_for(rel):
        base = os.path.basename(rel)
        if rel.startswith(os.path.join("controls", "memory_cards")):
            return "phase_memory_card"
        if rel.startswith(os.path.join("controls", "receipts")):
            return "completion_receipt"
        if rel.startswith(os.path.join("controls", "handoffs")):
            return "handoff_packet"
        if rel.startswith(os.path.join("controls", "packets")):
            return "stage_packet"
        if base == "next_action.json":
            return None  # navigation snapshot, no dedicated schema
        return None

    def test_every_control_write_from_advance_next_is_schema_valid(self):
        # Walk P0 and the three phase1 subflows, then validate every packet the
        # navigation layer wrote against its schema. A required-field regression
        # (e.g. a handoff missing to_phase) fails here even though advance.py
        # writes best-effort.
        self._run("next")
        for phase in (0, 2, 3, 4, 5, 6):
            state = gl.load_state(self.pdir)
            state["current_phase"] = phase
            gl.save_state(self.pdir, state)
            self._emit_pass(phase)
            self._run("next")
        controls_root = os.path.join(self.pdir, "controls")
        checked = 0
        for dirpath, _dirs, files in os.walk(controls_root):
            for name in files:
                if not name.endswith(".json"):
                    continue
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, self.pdir)
                kind = self._kind_for(rel)
                if kind is None:
                    continue
                with open(full) as f:
                    payload = json.load(f)
                result = gl.validate_control_payload(kind, payload)
                self.assertTrue(
                    result["ok"],
                    "%s (%s): %s" % (rel, kind, result["problems"]))
                checked += 1
        self.assertGreater(checked, 0)


if __name__ == "__main__":
    unittest.main()
