#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for control-layer helper paths and snapshots in gatelib.py."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


class TestGateLibControls(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_controls_path_helpers(self):
        self.assertEqual(
            gl.controls_relpath("memory_cards", "current.json"),
            os.path.join("controls", "memory_cards", "current.json"),
        )
        self.assertEqual(
            gl.controls_path(self.pdir, "memory_cards", "current.json"),
            os.path.join(self.pdir, "controls", "memory_cards", "current.json"),
        )

    def test_write_and_read_control_json(self):
        payload = {"logical_phase_id": "bootstrap", "action_kind": "run_gate"}
        rel = gl.write_control_json(
            self.pdir, "memory_cards", "current.json", payload=payload,
            best_effort=False,
        )
        self.assertEqual(
            rel,
            os.path.join("controls", "memory_cards", "current.json"),
        )
        loaded = gl.read_control_json(self.pdir, "memory_cards", "current.json")
        self.assertEqual(loaded, payload)

    def test_write_dual_snapshot_json(self):
        payload = {"current_phase": 0, "next_gate": "gate_env_init.py"}
        paths = gl.write_dual_snapshot_json(
            self.pdir,
            "next_action.json",
            ("next_action.json",),
            payload=payload,
            best_effort=False,
        )
        self.assertEqual(paths["root"], "next_action.json")
        self.assertEqual(paths["controls"], os.path.join("controls", "next_action.json"))

        with open(os.path.join(self.pdir, "next_action.json"), "r", encoding="utf-8") as f:
            root_payload = json.load(f)
        with open(os.path.join(self.pdir, "controls", "next_action.json"), "r", encoding="utf-8") as f:
            controls_payload = json.load(f)
        self.assertEqual(root_payload, payload)
        self.assertEqual(controls_payload, payload)

    def test_write_control_json_nested_snapshot(self):
        payload = {"phase": 0, "semantic_done": False}
        rel = gl.write_control_json(
            self.pdir, "receipts", "phase0.json", payload=payload,
            best_effort=False,
        )
        self.assertEqual(rel, os.path.join("controls", "receipts", "phase0.json"))
        with open(os.path.join(self.pdir, rel), "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), payload)

    def test_control_artifact_ref_helper(self):
        self.assertEqual(
            gl.control_artifact_ref(("quality_verify", "substate.json"), "substate_snapshot"),
            {
                "path": os.path.join("controls", "quality_verify", "substate.json"),
                "role": "substate_snapshot",
            },
        )

    def test_control_report_index_helper(self):
        self.assertEqual(
            gl.control_report_index(
                entry_parts=("test_develop", "signed_test_scope.json"),
                handoff_parts=("test_develop", "handoff_p3_test_develop.json"),
                failure_parts=("test_develop", "failure_packet.json"),
                receipt_parts=("test_develop", "completion_receipt_p3.json"),
            ),
            {
                "primary_entry_doc": os.path.join("controls", "test_develop", "signed_test_scope.json"),
                "primary_handoff_doc": os.path.join("controls", "test_develop", "handoff_p3_test_develop.json"),
                "primary_failure_doc": os.path.join("controls", "test_develop", "failure_packet.json"),
                "primary_completion_receipt": os.path.join("controls", "test_develop", "completion_receipt_p3.json"),
            },
        )

    def test_phase_report_relpath_helpers(self):
        self.assertEqual(
            gl.phase_summary_relpath(1),
            os.path.join("evidence", "phase1", "phase_summary.json"),
        )
        self.assertEqual(
            gl.failure_report_relpath(1),
            os.path.join("evidence", "phase1", "failure_report.json"),
        )


class TestWindowStartupOrder(unittest.TestCase):
    def test_order_matches_the_forced_sequence(self):
        order = gl.window_startup_order()
        self.assertEqual(
            [s["order"] for s in order["steps"]], [1, 2, 3, 4, 5, 6, 7])
        self.assertEqual(
            [s["artifact"] for s in order["steps"]],
            ["phase_memory_card", "advance_status_json", "stage_packet",
             "handoff_or_repair_packet", "completion_receipt",
             "failure_report_or_phase_summary", "phase_evidence"])
        self.assertEqual(order["control_protocol_version"],
                         gl.CONTROL_PROTOCOL_VERSION)

    def test_memory_card_is_first_and_evidence_is_last(self):
        steps = gl.window_startup_order()["steps"]
        self.assertEqual(steps[0]["artifact"], "phase_memory_card")
        self.assertEqual(steps[-1]["artifact"], "phase_evidence")

    def test_receipt_and_failure_report_are_optional(self):
        by_artifact = {s["artifact"]: s
                       for s in gl.window_startup_order()["steps"]}
        self.assertTrue(by_artifact["completion_receipt"]["optional"])
        self.assertTrue(
            by_artifact["failure_report_or_phase_summary"]["optional"])
        self.assertFalse(by_artifact["phase_memory_card"]["optional"])
        self.assertFalse(by_artifact["stage_packet"]["optional"])

    def test_control_refs_resolve_step_paths(self):
        refs = {
            "memory_card": os.path.join("controls", "memory_cards", "current.json"),
            "stage_packet": os.path.join("controls", "packets", "bootstrap.json"),
            "handoff_in": os.path.join("controls", "handoffs", "current.json"),
            "receipt": os.path.join("controls", "receipts", "phase0.json"),
        }
        by_artifact = {s["artifact"]: s
                       for s in gl.window_startup_order(refs)["steps"]}
        self.assertEqual(by_artifact["phase_memory_card"]["ref"],
                         refs["memory_card"])
        self.assertEqual(by_artifact["stage_packet"]["ref"],
                         refs["stage_packet"])
        # steps with no single addressable control file resolve to None
        self.assertIsNone(by_artifact["advance_status_json"]["ref"])
        self.assertIsNone(by_artifact["phase_evidence"]["ref"])

    def test_forbidden_starts_are_carried(self):
        forbidden = gl.window_startup_order()["forbidden_starts"]
        self.assertIn("read_global_readme_first", forbidden)
        self.assertIn("replay_full_chat_history_first", forbidden)

    def test_reading_order_is_marked_non_authoritative(self):
        note = gl.window_startup_order()["authority_note"]
        self.assertIn("pass authority", note)


class TestStagePacketDefs(unittest.TestCase):
    def test_every_logical_phase_has_entry_and_exit_conditions(self):
        # §13/§85: no logical phase may ship without a defined entry/exit
        # contract for a weak model to consume.
        expected = {
            "bootstrap", "design_orchestrate", "feature_develop",
            "test_develop", "build_verify", "test_author",
            "device_functional", "quality_verify", "upload_review"}
        self.assertEqual(set(gl.STAGE_PACKET_DEFS), expected)
        for pid, spec in gl.STAGE_PACKET_DEFS.items():
            self.assertTrue(spec.get("entry_preconditions"),
                            "%s missing entry_preconditions" % pid)
            self.assertTrue(spec.get("exit_conditions"),
                            "%s missing exit_conditions" % pid)
            self.assertIn("failure_classes", spec)

    def test_build_from_def_carries_conditions_and_is_schema_valid(self):
        packet = gl.build_stage_packet_from_def(
            "build_verify", "build-verify", physical_phase=2,
            entry_blockers=["signed_test_scope"])
        spec = gl.stage_packet_def("build_verify")
        self.assertEqual(packet["entry_protocol"]["entry_preconditions"],
                         spec["entry_preconditions"])
        self.assertEqual(packet["exit_protocol"]["exit_conditions"],
                         spec["exit_conditions"])
        self.assertEqual(packet["entry_protocol"]["entry_blockers"],
                         ["signed_test_scope"])
        self.assertTrue(packet["authority_boundary"]["not_truth_source"])
        self.assertTrue(gl.validate_control_payload("stage_packet", packet)["ok"])

    def test_unknown_phase_degrades_to_empty_def(self):
        self.assertEqual(gl.stage_packet_def("no_such_phase"), {})
        # still builds a schema-valid (contentless) packet
        packet = gl.build_stage_packet_from_def("no_such_phase", "x")
        self.assertTrue(gl.validate_control_payload("stage_packet", packet)["ok"])


class TestLogicalVocabulary(unittest.TestCase):
    def test_canonical_p_labels_match_the_spec_table(self):
        self.assertEqual(gl.logical_label("bootstrap"), "P0")
        self.assertEqual(gl.logical_label("design_orchestrate"), "P1")
        self.assertEqual(gl.logical_label("feature_develop"), "P2")
        self.assertEqual(gl.logical_label("test_develop"), "P3")
        self.assertEqual(gl.logical_label("build_verify"), "P4")
        self.assertEqual(gl.logical_label("test_author"), "P5")
        self.assertEqual(gl.logical_label("device_functional"), "P6")
        self.assertEqual(gl.logical_label("quality_verify"), "P7")
        self.assertEqual(gl.logical_label("upload_review"), "P8")

    def test_labels_are_unique_and_ordered(self):
        labels = [row[0] for row in gl.LOGICAL_PHASES]
        self.assertEqual(labels, ["P%d" % i for i in range(9)])

    def test_physical_projection_collapses_phase1_triple(self):
        self.assertEqual(gl.physical_for_logical("design_orchestrate"), 1)
        self.assertEqual(gl.physical_for_logical("feature_develop"), 1)
        self.assertEqual(gl.physical_for_logical("test_develop"), 1)
        self.assertEqual(
            gl.logicals_for_physical(1),
            ["design_orchestrate", "feature_develop", "test_develop"])

    def test_unknown_logical_id_falls_back_to_itself(self):
        self.assertEqual(gl.logical_label("no_such"), "no_such")
        self.assertIsNone(gl.physical_for_logical("no_such"))

    def test_stage_packet_carries_the_canonical_label(self):
        packet = gl.build_stage_packet_from_def(
            "device_functional", "device-functional", physical_phase=4)
        self.assertEqual(packet["phase_identity"]["logical_label"], "P6")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 4)


if __name__ == "__main__":
    unittest.main()

