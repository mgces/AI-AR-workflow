#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the machine-readable control protocol layer in gatelib.py.

Covers the packet JSON schemas, the dependency-optional validator, the §9.1
typed packet writers/readers, the §9.2 repair/regenerate decision helpers, the
phase memory-card builder and the §17 device evidence trust ordering.

Everything here is navigation/control layer: these assertions must never imply
pass authority, which stays with the signed manifest + advance.py.
"""
import builtins
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

ALL_KINDS = (
    "stage_packet", "repair_packet", "completion_receipt", "handoff_packet",
    "phase_memory_card", "substate", "index",
)


class TestControlSchemas(unittest.TestCase):
    def test_every_kind_has_a_loadable_draft07_schema(self):
        for kind in ALL_KINDS:
            schema = gl.load_control_schema(kind)
            self.assertIsNotNone(schema, kind)
            self.assertIn("properties", schema, kind)
            self.assertEqual(
                schema["$schema"], "http://json-schema.org/draft-07/schema#")

    def test_unknown_kind_disables_validation_instead_of_raising(self):
        self.assertIsNone(gl.load_control_schema("not_a_packet_kind"))
        result = gl.validate_control_payload("not_a_packet_kind", {"x": 1})
        self.assertTrue(result["ok"])
        self.assertEqual(result["validated_by"], "none")


class TestValidator(unittest.TestCase):
    def setUp(self):
        gl._SCHEMA_CACHE.clear()

    def tearDown(self):
        gl._SCHEMA_CACHE.clear()

    VALID_REPAIR = {
        "control_protocol_version": 1,
        "phase": 2,
        "phase_name": "build-verify",
        "active": True,
        "failure_class": "build_artifact_missing",
        "recommended_next_action": "repair_window",
    }

    def test_valid_payload_passes(self):
        result = gl.validate_control_payload("repair_packet", self.VALID_REPAIR)
        self.assertTrue(result["ok"])
        self.assertEqual(result["problems"], [])

    def test_missing_required_field_is_reported(self):
        result = gl.validate_control_payload("repair_packet", {"phase": 2})
        self.assertFalse(result["ok"])
        self.assertTrue(result["problems"])

    def test_extra_fields_are_allowed(self):
        payload = dict(self.VALID_REPAIR, artifacts_missing=["a.so"],
                       contract_status="ok")
        self.assertTrue(
            gl.validate_control_payload("repair_packet", payload)["ok"])

    def _without_jsonschema(self, fn):
        """Run fn with `import jsonschema` forced to fail."""
        real_import = builtins.__import__

        def fake_import(name, *a, **k):
            if name == "jsonschema":
                raise ImportError("forced for test")
            return real_import(name, *a, **k)

        builtins.__import__ = fake_import
        try:
            return fn()
        finally:
            builtins.__import__ = real_import

    def test_structural_fallback_when_jsonschema_is_absent(self):
        result = self._without_jsonschema(
            lambda: gl.validate_control_payload("repair_packet", self.VALID_REPAIR))
        self.assertEqual(result["validated_by"], "structural")
        self.assertTrue(result["ok"])

    def test_structural_fallback_reports_missing_required_fields(self):
        result = self._without_jsonschema(
            lambda: gl.validate_control_payload("repair_packet", {"phase": 2}))
        self.assertEqual(result["validated_by"], "structural")
        self.assertFalse(result["ok"])
        self.assertIn("missing required field: control_protocol_version",
                      result["problems"])

    def test_structural_fallback_catches_wrong_type(self):
        payload = dict(self.VALID_REPAIR, phase="two")
        result = self._without_jsonschema(
            lambda: gl.validate_control_payload("repair_packet", payload))
        self.assertFalse(result["ok"])
        self.assertIn("field phase has wrong type", result["problems"])

    def test_structural_fallback_keeps_bool_distinct_from_integer(self):
        payload = dict(self.VALID_REPAIR, phase=True)
        result = self._without_jsonschema(
            lambda: gl.validate_control_payload("repair_packet", payload))
        self.assertFalse(result["ok"])


class TestTypedPacketHelpers(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_each_writer_stamps_protocol_version_and_round_trips(self):
        cases = [
            (gl.write_repair_packet, gl.read_repair_packet,
             ("repairs", "current.json")),
            (gl.write_completion_receipt, gl.read_completion_receipt,
             ("build_verify", "completion_receipt.json")),
            (gl.write_handoff_packet, gl.read_handoff_packet,
             ("build_verify", "handoff_to_test_author.json")),
            (gl.write_substate_snapshot, gl.read_substate_snapshot,
             ("quality_verify", "substate.json")),
            (gl.write_control_index, gl.read_control_index,
             ("design_orchestrate", "stage_packet_index.json")),
        ]
        for writer, reader, parts in cases:
            out = writer(self.pdir, parts, {"phase": 1})
            self.assertEqual(out["rel"], os.path.join("controls", *parts))
            loaded = reader(self.pdir, parts)
            self.assertEqual(loaded["control_protocol_version"],
                             gl.CONTROL_PROTOCOL_VERSION)
            self.assertEqual(loaded["phase"], 1)

    def test_writer_does_not_overwrite_an_explicit_protocol_version(self):
        gl.write_repair_packet(self.pdir, ("repairs", "current.json"),
                               {"phase": 1, "control_protocol_version": 99})
        loaded = gl.read_repair_packet(self.pdir, ("repairs", "current.json"))
        self.assertEqual(loaded["control_protocol_version"], 99)

    def test_writer_does_not_mutate_the_caller_payload(self):
        payload = {"phase": 1}
        gl.write_repair_packet(self.pdir, ("repairs", "current.json"), payload)
        self.assertNotIn("control_protocol_version", payload)

    def test_memory_card_default_parts_is_the_current_card(self):
        out = gl.write_phase_memory_card(self.pdir, {"phase": 0,
                                                    "phase_name": "bootstrap"})
        self.assertEqual(out["rel"],
                         os.path.join("controls", "memory_cards", "current.json"))
        self.assertIsNotNone(gl.read_phase_memory_card(self.pdir))

    def test_write_returns_validation_result_alongside_relpath(self):
        out = gl.write_repair_packet(self.pdir, ("repairs", "current.json"),
                                     {"phase": 1})
        self.assertIn("validation", out)
        self.assertFalse(out["validation"]["ok"])  # advisory only

    def test_invalid_payload_is_still_written(self):
        """A schema mismatch must never suppress the control write, because the
        gate's verdict path may depend on the file existing for navigation."""
        gl.write_repair_packet(self.pdir, ("repairs", "current.json"),
                               {"nothing": "valid"})
        self.assertIsNotNone(
            gl.read_repair_packet(self.pdir, ("repairs", "current.json")))

    def test_write_failure_is_swallowed_by_default(self):
        """Best-effort contract: an unwritable path returns None, never raises."""
        blocker = os.path.join(self.pdir, "controls")
        with open(blocker, "w", encoding="utf-8") as f:
            f.write("not a directory")
        out = gl.write_repair_packet(self.pdir, ("repairs", "current.json"),
                                     {"phase": 1})
        self.assertIsNone(out["rel"])

    def test_evidence_index_carries_its_kind(self):
        gl.write_evidence_index(self.pdir, ("device_functional", "evidence.json"),
                                [{"kind": "process_provenance", "rank": 1}],
                                extra={"phase": 4})
        ev = gl.read_control_index(self.pdir, ("device_functional", "evidence.json"))
        self.assertEqual(ev["kind"], "evidence_index")
        self.assertEqual(ev["evidence"][0]["kind"], "process_provenance")

    def test_artifact_index_carries_its_kind(self):
        gl.write_artifact_index(self.pdir, ("build_verify", "artifacts.json"),
                                [{"path": "out/foo.so", "role": "build_artifact"}],
                                extra={"phase": 2})
        idx = gl.read_control_index(self.pdir, ("build_verify", "artifacts.json"))
        self.assertEqual(idx["kind"], "artifact_index")
        self.assertEqual(idx["artifacts"][0]["path"], "out/foo.so")
        self.assertEqual(idx["phase"], 2)
        self.assertEqual(idx["control_protocol_version"],
                         gl.CONTROL_PROTOCOL_VERSION)

    def test_bundle_definition_round_trip_and_is_versioned(self):
        # A complete bundle validates against the bundle_definition schema and is
        # stamped like every other control-layer packet.
        res = gl.write_bundle_definition(
            self.pdir, ("design_orchestrate", "initial_bundle_definition.json"),
            {"phase": 1, "logical_phase_id": "design_orchestrate",
             "bundle_id": "phase1-bundle", "requirements": [{"id": "R1"}],
             "changed_files": ["src/a.cpp"]})
        self.assertIsNotNone(res["rel"])
        self.assertTrue(res["validation"]["ok"], res["validation"]["problems"])
        self.assertIn(res["validation"]["validated_by"],
                      ("jsonschema", "structural"))
        got = gl.read_bundle_definition(
            self.pdir, ("design_orchestrate", "initial_bundle_definition.json"))
        self.assertEqual(got["bundle_id"], "phase1-bundle")
        self.assertEqual(got["changed_files"], ["src/a.cpp"])
        self.assertEqual(got["control_protocol_version"],
                         gl.CONTROL_PROTOCOL_VERSION)

    def test_bundle_definition_validation_is_advisory_not_blocking(self):
        # An incomplete bundle (missing required logical_phase_id/requirements)
        # is flagged by the advisory validator but MUST still be written — control
        # validation never blocks a write or affects a verdict.
        res = gl.write_bundle_definition(
            self.pdir, ("design_orchestrate", "initial_bundle_definition.json"),
            {"phase": 1, "bundle_id": "phase1-bundle"})
        self.assertIsNotNone(res["rel"])
        self.assertFalse(res["validation"]["ok"])
        self.assertTrue(res["validation"]["problems"])
        got = gl.read_bundle_definition(
            self.pdir, ("design_orchestrate", "initial_bundle_definition.json"))
        self.assertEqual(got["bundle_id"], "phase1-bundle")

    def test_report_index_defaults_its_kind_but_respects_an_override(self):
        gl.write_report_index(self.pdir, ("a", "i.json"), {"phase": 1})
        gl.write_report_index(self.pdir, ("b", "i.json"),
                              {"phase": 1, "kind": "stage_packet_index"})
        self.assertEqual(
            gl.read_control_index(self.pdir, ("a", "i.json"))["kind"],
            "report_index")
        self.assertEqual(
            gl.read_control_index(self.pdir, ("b", "i.json"))["kind"],
            "stage_packet_index")


class TestStagePacket(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_builder_produces_a_schema_valid_packet(self):
        packet = gl.build_stage_packet(
            "build_verify", "build-verify", physical_phase=2,
            goal_summary="compile the bundle")
        result = gl.validate_control_payload("stage_packet", packet)
        self.assertTrue(result["ok"], result["problems"])
        self.assertEqual(packet["phase_identity"]["phase_id"], "build_verify")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 2)

    def test_authority_boundary_marks_packet_as_non_truth_source(self):
        packet = gl.build_stage_packet("bootstrap", "bootstrap")
        self.assertTrue(packet["authority_boundary"]["not_truth_source"])
        self.assertIn("evidence/manifest.jsonl",
                      packet["authority_boundary"]["truth_sources"])
        self.assertIn("advance.py",
                      packet["authority_boundary"]["truth_sources"])

    def test_base_forbidden_actions_floor_is_always_present(self):
        packet = gl.build_stage_packet(
            "feature_develop", "feature-develop",
            forbidden_actions=["expand_changed_files"])
        for floor in gl._BASE_FORBIDDEN_ACTIONS:
            self.assertIn(floor, packet["forbidden_actions"])
        self.assertIn("expand_changed_files", packet["forbidden_actions"])

    def test_writer_stamps_version_and_round_trips(self):
        packet = gl.build_stage_packet("build_verify", "build-verify")
        out = gl.write_stage_packet(
            self.pdir, packet, parts=gl.stage_packet_parts("build_verify"))
        self.assertEqual(out["rel"],
                         os.path.join("controls", "packets", "build_verify.json"))
        self.assertTrue(out["validation"]["ok"], out["validation"]["problems"])
        loaded = gl.read_stage_packet(
            self.pdir, gl.stage_packet_parts("build_verify"))
        self.assertEqual(loaded["control_protocol_version"],
                         gl.CONTROL_PROTOCOL_VERSION)
        self.assertEqual(loaded["phase_identity"]["phase_id"], "build_verify")

    def test_stage_packet_parts_default_and_per_phase(self):
        self.assertEqual(gl.stage_packet_parts(), gl.STAGE_PACKET_PARTS)
        self.assertEqual(gl.stage_packet_parts("device_functional"),
                         ("packets", "device_functional.json"))

    def test_missing_phase_identity_fails_validation(self):
        result = gl.validate_control_payload(
            "stage_packet", {"control_protocol_version": 1})
        self.assertFalse(result["ok"])
        self.assertTrue(result["problems"])

    def test_stage_packet_is_not_a_truth_source_file(self):
        # Writing a stage packet must never create or touch manifest/state, and a
        # verdict must not depend on it. We assert no truth-layer file appears.
        gl.write_gate_stage_packet_from_def(
            self.pdir, "build_verify", "build-verify", physical_phase=2)
        for name in ("manifest.jsonl", "pipeline.json"):
            self.assertFalse(
                os.path.exists(os.path.join(self.pdir, name)), name)
        self.assertTrue(os.path.exists(
            os.path.join(self.pdir, "controls", "packets", "build_verify.json")))


class TestPhaseMemoryCardBuilder(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_card_carries_the_template_fields(self):
        card = gl.build_phase_memory_card(2, "build-verify", verdict="FAIL")
        for key in ("phase", "phase_name", "bundle_revision", "current_blocker",
                    "forbidden_actions", "next_expected_action_class",
                    "last_failure_class", "human_escalation_needed",
                    "primary_entry_doc", "primary_failure_doc",
                    "primary_handoff_doc"):
            self.assertIn(key, card)
        self.assertTrue(
            gl.validate_control_payload("phase_memory_card", card)["ok"])

    def test_base_forbidden_actions_are_always_present(self):
        card = gl.build_phase_memory_card(1, "develop")
        self.assertIn("treat_navigation_files_as_truth_source",
                      card["forbidden_actions"])
        self.assertIn("edit_pipeline_json_directly", card["forbidden_actions"])
        self.assertIn("advance_without_signed_evidence",
                      card["forbidden_actions"])

    def test_extra_forbidden_actions_append_without_duplicating(self):
        card = gl.build_phase_memory_card(
            1, "develop",
            forbidden_actions=["edit_pipeline_json_directly", "custom_action"])
        self.assertEqual(
            card["forbidden_actions"].count("edit_pipeline_json_directly"), 1)
        self.assertIn("custom_action", card["forbidden_actions"])

    def test_blank_blocker_normalizes_to_none_string(self):
        self.assertEqual(
            gl.build_phase_memory_card(1, "develop")["current_blocker"], "none")
        self.assertEqual(
            gl.build_phase_memory_card(
                1, "develop", current_blocker="boom")["current_blocker"], "boom")

    def test_failure_doc_defaults_to_the_phase_failure_report(self):
        card = gl.build_phase_memory_card(4, "device-functional")
        self.assertEqual(card["primary_failure_doc"],
                         gl.failure_report_relpath(4))

    def test_gate_helper_writes_a_per_phase_card(self):
        out = gl.write_gate_phase_memory_card(self.pdir, 2, "build-verify",
                                              verdict="PASS")
        self.assertEqual(
            out["rel"],
            os.path.join("controls", "memory_cards", "phase2.json"))
        self.assertTrue(out["validation"]["ok"])
        card = gl.read_phase_memory_card(
            self.pdir, ("memory_cards", "phase2.json"))
        self.assertEqual(card["verdict"], "PASS")
        self.assertEqual(card["phase_name"], "build-verify")

    def test_per_phase_cards_do_not_collide(self):
        gl.write_gate_phase_memory_card(self.pdir, 2, "build-verify")
        gl.write_gate_phase_memory_card(self.pdir, 4, "device-functional")
        self.assertEqual(
            gl.read_phase_memory_card(
                self.pdir, ("memory_cards", "phase2.json"))["phase"], 2)
        self.assertEqual(
            gl.read_phase_memory_card(
                self.pdir, ("memory_cards", "phase4.json"))["phase"], 4)


class TestDecisionHelpers(unittest.TestCase):
    def test_unrecoverable_contract_forces_regeneration(self):
        self.assertEqual(
            gl.classify_repair_vs_regenerate("ar_contract_unrecoverable"),
            "regenerate")

    def test_ordinary_failure_recommends_a_repair_window(self):
        self.assertEqual(
            gl.classify_repair_vs_regenerate("build_artifact_missing"),
            "repair_window")

    def test_exhausted_repair_budget_escalates(self):
        self.assertEqual(
            gl.classify_repair_vs_regenerate("build_artifact_missing",
                                             repair_rounds=2,
                                             max_repair_rounds=2),
            "escalate")

    def test_repair_disallowed_forces_regeneration(self):
        self.assertEqual(
            gl.classify_repair_vs_regenerate("x", repair_disallowed=True),
            "regenerate")

    def test_every_regenerate_failure_class_regenerates(self):
        # §10 matrix: each design-boundary failure class must force regenerate,
        # not a same-window repair, regardless of the repair budget.
        for fclass in gl.REGENERATE_FAILURE_CLASSES:
            self.assertEqual(
                gl.classify_repair_vs_regenerate(fclass, repair_rounds=0),
                "regenerate", fclass)
            self.assertEqual(
                gl.classify_repair_vs_regenerate(fclass, repair_rounds=9),
                "regenerate", fclass)

    def test_regenerate_class_set_covers_the_boundary_rows(self):
        # the matrix's "必须 Regenerate" rows must each be represented
        for fclass in ("ar_contract_unrecoverable", "contract_target_changed",
                       "requirement_semantics_changed", "changed_files_boundary_expand",
                       "undeclared_business_file", "new_external_dependency"):
            self.assertIn(fclass, gl.REGENERATE_FAILURE_CLASSES)

    def test_each_regen_signal_forces_repair_disallowed(self):
        # every §10 matrix boundary signal, on its own, disallows a repair
        for key in gl._REGEN_SIGNAL_KEYS:
            self.assertTrue(gl.regen_signal_present(**{key: True}), key)
            self.assertEqual(
                gl.classify_repair_vs_regenerate(
                    "build_verdict_failed",
                    repair_disallowed=gl.regen_signal_present(**{key: True})),
                "regenerate", key)

    def test_no_regen_signal_allows_a_repair_window(self):
        self.assertFalse(gl.regen_signal_present())
        self.assertFalse(gl.regen_signal_present(build_artifacts_changed=False))
        # a plain repairable failure with no boundary signal stays a repair window
        self.assertEqual(
            gl.classify_repair_vs_regenerate(
                "build_verdict_failed",
                repair_disallowed=gl.regen_signal_present()),
            "repair_window")

    def test_regen_signal_ignores_unknown_keys(self):
        self.assertFalse(gl.regen_signal_present(some_unrelated_flag=True))

    def test_unrecoverable_beats_an_exhausted_budget(self):
        self.assertEqual(
            gl.classify_repair_vs_regenerate("ar_contract_unrecoverable",
                                             repair_rounds=9),
            "regenerate")

    def test_widest_downstream_scope_wins(self):
        self.assertEqual(
            gl.compute_downstream_revalidate_scope("P4_P5", "P4_to_P7", "P4_to_P6"),
            "P4_to_P7")
        self.assertEqual(
            gl.compute_downstream_revalidate_scope("P4_P5", "all_downstream"),
            "all_downstream")

    def test_scope_ignores_blank_candidates(self):
        self.assertEqual(
            gl.compute_downstream_revalidate_scope(None, "", "P4_P5"), "P4_P5")
        self.assertIsNone(gl.compute_downstream_revalidate_scope())
        self.assertIsNone(gl.compute_downstream_revalidate_scope(None, ""))

    def test_unknown_scope_is_preserved_rather_than_dropped(self):
        self.assertEqual(
            gl.compute_downstream_revalidate_scope("mystery_scope"),
            "mystery_scope")

    def test_scope_for_failure_maps_by_category(self):
        # each phase-family failure gets the minimal scope its fix invalidates
        self.assertEqual(gl.scope_for_failure("build_verdict_failed"), "P4_P5")
        self.assertEqual(gl.scope_for_failure("gtest_coverage_missing"), "P4_to_P6")
        self.assertEqual(gl.scope_for_failure("marker_missing"), "P4_to_P7")
        self.assertEqual(gl.scope_for_failure("ci_not_green"), "all_downstream")
        self.assertEqual(gl.scope_for_failure("consent_missing"), "P4_only")

    def test_scope_for_failure_is_widened_by_bundle_hint(self):
        # a narrow build fix inheriting a wider bundle scope keeps the wider one
        self.assertEqual(
            gl.scope_for_failure("build_verdict_failed", "all_downstream"),
            "all_downstream")
        # but never narrows below what the failure itself implies
        self.assertEqual(
            gl.scope_for_failure("marker_missing", "P4_P5"), "P4_to_P7")

    def test_scope_for_failure_unknown_class_uses_wide_default(self):
        self.assertEqual(gl.scope_for_failure("brand_new_failure"), "P4_to_P7")
        self.assertEqual(gl.scope_for_failure(None), "P4_to_P7")

    def test_p4_only_is_the_narrowest_known_scope(self):
        self.assertEqual(
            gl.compute_downstream_revalidate_scope("P4_only", "P4_P5"), "P4_P5")
        self.assertEqual(
            gl.compute_downstream_revalidate_scope("P4_only"), "P4_only")

    def test_budget_helpers_are_inclusive_at_the_limit(self):
        self.assertFalse(gl.repair_budget_exhausted(1, 2))
        self.assertTrue(gl.repair_budget_exhausted(2, 2))
        self.assertTrue(gl.repair_budget_exhausted(3, 2))
        self.assertFalse(gl.retry_budget_exhausted(0, 2))
        self.assertTrue(gl.retry_budget_exhausted(2, 2))

    def test_budget_helpers_tolerate_none(self):
        self.assertFalse(gl.repair_budget_exhausted(None, 2))
        self.assertTrue(gl.retry_budget_exhausted(None, None))


class TestRepairRoundMetadata(unittest.TestCase):
    """§9.1 retry vs §9.2 repair split in the shared helper."""

    def _next(self, prev, **kw):
        kw.setdefault("phase", 2)
        kw.setdefault("bundle_revision_from", "rev-1")
        kw.setdefault("recommended_next_action", "repair_window")
        return gl.repair_round_metadata(prev, **kw)

    def test_first_round_opens_one_repair_window(self):
        r = self._next(None, failure_class="build_artifact_missing")
        self.assertEqual(r["repair_rounds"], 1)
        self.assertEqual(r["retry_rounds"], 0)
        self.assertFalse(r["human_escalation_needed"])

    def test_same_failure_same_bundle_is_a_retry(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 1, "retry_rounds": 0}
        r = self._next(prev, failure_class="x")
        self.assertEqual(r["repair_rounds"], 1)   # window unchanged
        self.assertEqual(r["retry_rounds"], 1)    # retry counted

    def test_changed_failure_same_bundle_is_a_repair_window(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 1, "retry_rounds": 2}
        r = self._next(prev, failure_class="y")
        self.assertEqual(r["repair_rounds"], 2)
        self.assertEqual(r["retry_rounds"], 0)    # retry budget resets

    def test_new_bundle_revision_resets_both_counters(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 2, "retry_rounds": 2}
        r = self._next(prev, bundle_revision_from="rev-2", failure_class="x")
        self.assertEqual(r["repair_rounds"], 1)
        self.assertEqual(r["retry_rounds"], 0)

    def test_retry_budget_exhaustion_escalates(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 1, "retry_rounds": 1}
        r = self._next(prev, failure_class="x", max_retry_rounds=2)
        self.assertEqual(r["retry_rounds"], 2)
        self.assertTrue(r["human_escalation_needed"])
        self.assertIn("max_retry_rounds", r["escalation_note"])

    def test_repair_budget_exhaustion_escalates(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 2, "retry_rounds": 0}
        r = self._next(prev, failure_class="y", max_repair_rounds=2)
        self.assertEqual(r["repair_rounds"], 3)
        self.assertTrue(r["human_escalation_needed"])
        self.assertIn("max_repair_rounds", r["escalation_note"])

    def test_policy_conflict_on_same_bundle_escalates(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "regenerate",
                "failure_class": "x", "repair_rounds": 1, "retry_rounds": 0}
        r = self._next(prev, failure_class="x",
                       recommended_next_action="repair_window")
        self.assertTrue(r["policy_conflict"])
        self.assertTrue(r["human_escalation_needed"])

    def test_inactive_prev_starts_fresh(self):
        prev = {"active": False, "phase": 2, "bundle_revision_from": "rev-1",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 2, "retry_rounds": 2}
        r = self._next(prev, failure_class="x")
        self.assertEqual(r["repair_rounds"], 1)
        self.assertEqual(r["retry_rounds"], 0)

    def test_empty_bundle_revision_is_never_the_same_revision(self):
        prev = {"active": True, "phase": 2, "bundle_revision_from": "",
                "recommended_next_action": "repair_window",
                "failure_class": "x", "repair_rounds": 1, "retry_rounds": 1}
        r = self._next(prev, bundle_revision_from="", failure_class="x")
        self.assertFalse(r["same_revision"])
        self.assertEqual(r["repair_rounds"], 1)
        self.assertEqual(r["retry_rounds"], 0)


class TestRevisionAgnosticBreaker(unittest.TestCase):
    """S1: with an empty bundle_revision (legacy / bypass / no-bundle runs, e.g.
    P1-P3), the breaker keys on a stable fallback_key derived from
    (phase, failure_class, recommended_next_action) so consecutive identical
    failures still accumulate and escalate — previously they reset every round,
    making escalation a no-op for those runs (A1)."""

    def _next(self, prev, **kw):
        kw.setdefault("phase", 2)
        kw.setdefault("bundle_revision_from", "")
        kw.setdefault("recommended_next_action", "repair_window")
        r = gl.repair_round_metadata(prev, **kw)
        # a persisted repair packet carries the identity fields the next round
        # compares against (phase / bundle_revision_from / failure_class /
        # recommended_next_action); the raw helper returns only the counters +
        # fallback_key, so layer the identity in as the real gates do.
        return {**r, "active": True, "phase": kw["phase"],
                "bundle_revision_from": kw["bundle_revision_from"],
                "failure_class": kw.get("failure_class"),
                "recommended_next_action": kw["recommended_next_action"]}

    def test_fallback_key_present_and_stable(self):
        r = self._next(None, failure_class="x")
        self.assertTrue(r["fallback_key"])
        # deterministic function of (phase, failure_class, recommended_next_action)
        r2 = self._next(None, failure_class="x")
        self.assertEqual(r["fallback_key"], r2["fallback_key"])
        self.assertEqual(r["retry_rounds"], 0)

    def test_same_failure_counts_as_same_revision(self):
        prev = self._next(None, failure_class="x")
        r = self._next(prev, failure_class="x")
        self.assertTrue(r["same_revision"])
        self.assertEqual(r["retry_rounds"], 1)

    def test_different_failure_changes_key_and_resets_retry(self):
        prev = self._next(None, failure_class="x")
        r = self._next(prev, failure_class="y")
        self.assertNotEqual(r["fallback_key"], prev["fallback_key"])
        self.assertFalse(r["same_revision"])
        self.assertEqual(r["retry_rounds"], 0)

    def test_consecutive_empty_revision_failures_escalate(self):
        # the A1 lock: same failure, empty revision -> retry budget exhausts and
        # escalates to a human (was previously impossible for no-bundle runs).
        prev = None
        escalated = False
        for _ in range(4):
            prev = self._next(prev, failure_class="x", max_retry_rounds=2)
            if prev["human_escalation_needed"]:
                escalated = True
                break
        self.assertTrue(escalated)


class TestDeviceAnchorStrength(unittest.TestCase):
    def test_case_with_no_anchor_is_weak(self):
        self.assertEqual(gl.device_case_anchor_strength(
            {"desc": "d", "marker": "m"}), [])

    def test_process_anchor_counts(self):
        self.assertEqual(gl.device_case_anchor_strength(
            {"marker": "m", "process": "com.x"}), ["process"])

    def test_absent_before_trigger_only_counts_when_true(self):
        self.assertEqual(gl.device_case_anchor_strength(
            {"marker": "m", "absent_before_trigger": False}), [])
        self.assertEqual(gl.device_case_anchor_strength(
            {"marker": "m", "absent_before_trigger": True}), ["absent_before_trigger"])

    def test_weak_device_cases_indexes_the_weak_ones(self):
        weak = gl.weak_device_cases([
            {"id": "DC-001", "marker": "m", "process": "com.x"},   # strong
            {"id": "DC-002", "marker": "m"},                        # weak
            {"desc": "third", "marker": "m", "side_effect": {"x": 1}},  # strong
        ])
        self.assertEqual(weak, [(1, "DC-002")])

    def test_weak_device_cases_falls_back_to_desc_then_index(self):
        weak = gl.weak_device_cases([{"desc": "触发", "marker": "m"}, {"marker": "m"}])
        self.assertEqual(weak, [(0, "触发"), (1, "device_case[1]")])


class TestDeviceEvidencePriority(unittest.TestCase):
    def test_ordering_is_strongest_proof_first(self):
        self.assertEqual(gl.device_evidence_priority(), [
            "process_provenance",
            "artifact_loaded",
            "side_effect",
            "differential",
            "runtime_e2e_marker",
            "plain_marker",
        ])

    def test_plain_marker_is_ranked_weakest(self):
        order = gl.device_evidence_priority()
        self.assertEqual(order[-1], "plain_marker")
        self.assertLess(order.index("process_provenance"),
                        order.index("plain_marker"))

    def test_helper_returns_a_copy_callers_cannot_corrupt(self):
        order = gl.device_evidence_priority()
        order.append("forged_evidence")
        self.assertNotIn("forged_evidence", gl.device_evidence_priority())


class TestControlLayerIsNotATruthSource(unittest.TestCase):
    """Guardrails: the control layer must stay non-authoritative."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_control_writes_do_not_create_a_manifest(self):
        gl.write_repair_packet(self.pdir, ("repairs", "current.json"),
                               {"phase": 2, "active": True})
        gl.write_completion_receipt(
            self.pdir, ("build_verify", "completion_receipt.json"),
            {"phase": 2, "semantic_done": True, "next_phase_ready": True})
        self.assertFalse(
            os.path.exists(os.path.join(self.pdir, "evidence", "manifest.jsonl")))

    def test_control_writes_stay_inside_the_controls_tree(self):
        out = gl.write_handoff_packet(self.pdir, ("a", "b.json"), {"from_phase": 1})
        self.assertTrue(out["rel"].startswith("controls" + os.sep))

    def test_a_receipt_claiming_a_pass_does_not_change_pipeline_state(self):
        gl.write_completion_receipt(
            self.pdir, ("upload_review", "completion_receipt.json"),
            {"phase": 6, "semantic_done": True, "truth_layer_pass_known": True,
             "next_phase_ready": True})
        self.assertFalse(
            os.path.exists(os.path.join(self.pdir, "pipeline.json")))


if __name__ == "__main__":
    unittest.main()
