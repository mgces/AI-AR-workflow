#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Batch-2 regression tests for the weak-model control layer:

S4 — a single next-action-class vocabulary (ACTION_CLASSES) enforced at emit
     time, with legacy/composite tokens normalized and blocked/inspect states
     never left as navigation dead-ends.
S3 — structured, line-level suspect_locations[] backfilled into repair packets
     from artifacts the gates ALREADY parse, with suspect_files staying the
     non-empty fallback.

All navigation-only: nothing here is a truth source; the signed manifest +
advance.py remain the sole pass authority.
"""
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


class TestActionClassNormalization(unittest.TestCase):
    """S4: every legacy/composite token resolves to a single ACTION_CLASSES
    member; nothing out-of-enum can leak into a card."""

    def test_enum_members_pass_through(self):
        for token in gl.ACTION_CLASSES:
            self.assertEqual(gl.action_class_for(token), token)

    def test_legacy_aliases_normalize(self):
        cases = {
            "advance_phase": "advance",
            "repair_window": "repair",
            "repair_design": "repair",
            "repair_environment": "repair",
            "escalate": "human_escalation",
            "blocked": "human_escalation",
            "finalize": "complete",
            "await": "await_ci",
        }
        for token, expected in cases.items():
            self.assertEqual(gl.action_class_for(token), expected)
            self.assertIn(gl.action_class_for(token), gl.ACTION_CLASSES)

    def test_escalate_flag_always_wins(self):
        self.assertEqual(
            gl.action_class_for("advance", escalate=True), "human_escalation")
        self.assertEqual(
            gl.action_class_for("repair_or_regenerate", escalate=True),
            "human_escalation")

    def test_repair_or_regenerate_resolved_by_failure_class(self):
        # an unrecoverable failure class regenerates; a recoverable one repairs
        regen_fc = next(iter(gl.REGENERATE_FAILURE_CLASSES))
        self.assertEqual(
            gl.action_class_for("repair_or_regenerate", failure_class=regen_fc),
            "regenerate")
        self.assertEqual(
            gl.action_class_for("repair_or_regenerate",
                                failure_class="develop_gate_failed"),
            "repair")

    def test_unknown_token_degrades_to_repair_not_garbage(self):
        got = gl.action_class_for("totally_unknown_token")
        self.assertEqual(got, "repair")
        self.assertIn(got, gl.ACTION_CLASSES)


class TestSuspectLocationNormalization(unittest.TestCase):
    """S3: normalize_suspect_locations sanitizes to the schema shape and is
    fail-soft on garbage."""

    def test_wellformed_entries_kept(self):
        out = gl.normalize_suspect_locations([
            {"file": "a.cpp", "line": 12, "rule": "G.1", "message": "bad"},
        ])
        self.assertEqual(out, [
            {"file": "a.cpp", "line": 12, "rule": "G.1", "message": "bad"}])

    def test_missing_file_dropped(self):
        self.assertEqual(
            gl.normalize_suspect_locations([{"line": 3, "rule": "x"}]), [])

    def test_non_dict_and_bad_line_coerced(self):
        out = gl.normalize_suspect_locations([
            "not-a-dict",
            {"file": "b.cpp", "line": "NaN", "rule": 5, "message": None},
        ])
        self.assertEqual(out, [
            {"file": "b.cpp", "line": None, "rule": None, "message": None}])

    def test_bool_is_not_a_line(self):
        # True is an int subclass in Python; it must not be accepted as a line
        out = gl.normalize_suspect_locations([{"file": "c.cpp", "line": True}])
        self.assertIsNone(out[0]["line"])

    def test_dedup_order_preserving(self):
        out = gl.normalize_suspect_locations([
            {"file": "a.cpp", "line": 1, "rule": "r", "message": "m"},
            {"file": "a.cpp", "line": 1, "rule": "r", "message": "m"},
            {"file": "z.cpp", "line": 2, "rule": "r", "message": "m"},
        ])
        self.assertEqual([o["file"] for o in out], ["a.cpp", "z.cpp"])


class TestSuspectLocationsFromArtifacts(unittest.TestCase):
    """S3 backfill from the JSON/log artifacts each gate already produces —
    no new parser is introduced."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_findings_json_mapped_to_locations(self):
        rel = "findings.json"
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            json.dump({"findings": [
                {"file": "src/a.cpp", "line": 9, "rule_id": "G.SYS",
                 "message": "system() forbidden"},
                {"file": "src/b.cpp", "line": 3, "rule_id": "H1.LICENSE",
                 "remediation": "add license header"},
            ]}, f)
        out = gl.suspect_locations_from_findings_json(self.pdir, rel)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["rule"], "G.SYS")
        # remediation is used when message is absent
        self.assertEqual(out[1]["message"], "add license header")

    def test_missing_findings_json_is_failsoft(self):
        self.assertEqual(
            gl.suspect_locations_from_findings_json(self.pdir, "nope.json"), [])

    def test_garbled_findings_json_is_failsoft(self):
        rel = "bad.json"
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            f.write("{not json")
        self.assertEqual(
            gl.suspect_locations_from_findings_json(self.pdir, rel), [])

    def test_compiler_lines_extracted(self):
        lines = [
            "make: entering directory",
            "foundation/x/src/mgr.cpp:42:5: error: 'foo' was not declared",
            "  some context line",
            "foundation/x/src/mgr.cpp:88:1: fatal error: bar.h: No such file",
            "ninja: build stopped.",
        ]
        out = gl.suspect_locations_from_compiler_lines(lines)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["file"], "foundation/x/src/mgr.cpp")
        self.assertEqual(out[0]["line"], 42)
        self.assertEqual(out[0]["rule"], "compile_error")
        self.assertEqual(out[1]["line"], 88)

    def test_compiler_lines_ignore_non_diagnostics(self):
        self.assertEqual(
            gl.suspect_locations_from_compiler_lines(
                ["warning: this is only a warning", "plain text"]),
            [])


class TestFinalizeControlSuspectLocations(unittest.TestCase):
    """S3: finalize_control carries suspect_locations into the packet and, when
    suspect_files is empty, backfills the file list from them (better than the
    failure_class placeholder). S4: the card class stays in ACTION_CLASSES."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.parts = ("repairs", "current.json")

    def tearDown(self):
        self.tmp.cleanup()

    def test_locations_persist_and_validate(self):
        res = gl.finalize_control(
            self.pdir, phase=2, phase_name="feature-develop", verdict="FAIL",
            repair_packet_parts=self.parts,
            failure_class="code_ruleset_finding",
            suspect_files=["src/a.cpp"],
            suspect_locations=[
                {"file": "src/a.cpp", "line": 5, "rule": "G.1", "message": "x"}],
            last_failure_reason="ruleset finding", must_rerun=["gate_develop.py"])
        packet = res["repair_packet"]
        self.assertEqual(len(packet["suspect_locations"]), 1)
        self.assertEqual(packet["suspect_locations"][0]["line"], 5)
        # emit-time schema validation passed (finalize would have raised
        # otherwise). Validate the persisted packet, which carries the stamped
        # control_protocol_version the schema requires.
        written = gl.read_control_json(self.pdir, *self.parts)
        self.assertEqual(len(written["suspect_locations"]), 1)
        self.assertTrue(
            gl.validate_control_payload("repair_packet", written)["ok"])

    def test_suspect_files_backfilled_from_locations_when_empty(self):
        res = gl.finalize_control(
            self.pdir, phase=4, phase_name="build-verify", verdict="FAIL",
            repair_packet_parts=self.parts,
            failure_class="build_verdict_failed",
            suspect_files=[],  # nothing explicit
            suspect_locations=[
                {"file": "src/x.cpp", "line": 1, "rule": "compile_error"},
                {"file": "src/y.cpp", "line": 2, "rule": "compile_error"},
            ],
            last_failure_reason="build failed", must_rerun=["gate_build.py"])
        packet = res["repair_packet"]
        self.assertEqual(packet["suspect_files"], ["src/x.cpp", "src/y.cpp"])
        # NOT the failure_class placeholder
        self.assertNotIn("build_verdict_failed", packet["suspect_files"])

    def test_suspect_files_placeholder_when_no_locations(self):
        res = gl.finalize_control(
            self.pdir, phase=1, phase_name="design-orchestrate", verdict="FAIL",
            repair_packet_parts=self.parts,
            failure_class="design_gate_failed",
            suspect_files=[], suspect_locations=[],
            last_failure_reason="bad design")
        packet = res["repair_packet"]
        self.assertEqual(packet["suspect_files"], ["design_gate_failed"])
        self.assertEqual(packet["suspect_locations"], [])

    def test_out_of_enum_action_class_raises(self):
        with self.assertRaises(gl.ControlContractError):
            gl.finalize_control(
                self.pdir, phase=2, phase_name="feature-develop", verdict="FAIL",
                repair_packet_parts=self.parts,
                failure_class="develop_gate_failed",
                suspect_files=["a.cpp"],
                next_action_class="advance_phase",  # not an ACTION_CLASSES member
                last_failure_reason="x")


class TestRepairPacketSchemaEnum(unittest.TestCase):
    """S4: the repair-packet schema rejects an out-of-vocab recommended_next_action
    and the memory-card schema rejects an out-of-enum action class."""

    def test_packet_rejects_bad_recommended_action(self):
        payload = {
            "control_protocol_version": gl.CONTROL_PROTOCOL_VERSION,
            "phase": 2, "phase_name": "feature-develop", "active": True,
            "failure_class": "develop_gate_failed",
            "recommended_next_action": "do_a_barrel_roll",
        }
        self.assertFalse(
            gl.validate_control_payload("repair_packet", payload)["ok"])

    def test_card_rejects_out_of_enum_action_class(self):
        payload = {
            "control_protocol_version": gl.CONTROL_PROTOCOL_VERSION,
            "phase": 2, "phase_name": "feature-develop",
            "next_expected_action_class": "advance_phase",
        }
        self.assertFalse(
            gl.validate_control_payload("phase_memory_card", payload)["ok"])

    def test_card_accepts_enum_action_class(self):
        payload = {
            "control_protocol_version": gl.CONTROL_PROTOCOL_VERSION,
            "phase": 2, "phase_name": "feature-develop",
            "next_expected_action_class": "repair",
        }
        self.assertTrue(
            gl.validate_control_payload("phase_memory_card", payload)["ok"])


if __name__ == "__main__":
    unittest.main()
