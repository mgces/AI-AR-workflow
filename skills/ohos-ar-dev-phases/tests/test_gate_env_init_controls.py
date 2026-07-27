#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""P0 (gate_env_init) control-layer footprint: the bootstrap gate must land the
same navigation surface (memory card + stage packet) every later phase gets, so
a weak model entering the very first window is not left blind. These artifacts
are best-effort and non-authoritative — pass authority stays with the signed
manifest + advance.py."""
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402

_SPEC = importlib.util.spec_from_file_location(
    "gate_env_init", os.path.join(SCRIPTS, "gate_env_init.py"))
gate_env_init = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(gate_env_init)


class TestBootstrapControls(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def _card(self):
        return gl.read_phase_memory_card(
            self.pdir, parts=("memory_cards", "phase0.json"))

    def _packet(self):
        return gl.read_stage_packet(self.pdir, gl.stage_packet_parts("bootstrap"))

    def test_pass_lands_card_and_stage_packet(self):
        gate_env_init._write_bootstrap_controls(self.pdir, "PASS")
        card = self._card()
        self.assertIsNotNone(card)
        self.assertEqual(card["phase"], 0)
        self.assertEqual(card["verdict"], "PASS")
        self.assertEqual(card["current_blocker"], "none")
        self.assertEqual(card["next_expected_action_class"], "advance")

        packet = self._packet()
        self.assertIsNotNone(packet)
        self.assertEqual(packet["phase_identity"]["phase_id"], "bootstrap")
        self.assertEqual(packet["phase_identity"]["logical_label"], "P0")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 0)
        self.assertTrue(packet["entry_protocol"]["entry_preconditions"])
        self.assertTrue(packet["exit_protocol"]["exit_conditions"])
        self.assertTrue(packet["authority_boundary"]["not_truth_source"])

    def test_fail_records_blocker_and_failure_class(self):
        gate_env_init._write_bootstrap_controls(
            self.pdir, "FAIL", blocker="missing capabilities: device",
            failure_class="bootstrap_input_missing")
        card = self._card()
        self.assertEqual(card["verdict"], "FAIL")
        self.assertEqual(card["current_blocker"], "missing capabilities: device")
        self.assertEqual(card["last_failure_class"], "bootstrap_input_missing")
        # S4: repair_environment is not a member of ACTION_CLASSES; it
        # normalizes to the single 'repair' class (the env fix is still a repair).
        self.assertEqual(card["next_expected_action_class"], "repair")
        self.assertIn(card["next_expected_action_class"], gl.ACTION_CLASSES)

    def test_control_writes_are_schema_valid(self):
        gate_env_init._write_bootstrap_controls(self.pdir, "PASS")
        self.assertTrue(
            gl.validate_control_payload("phase_memory_card", self._card())["ok"])
        self.assertTrue(
            gl.validate_control_payload("stage_packet", self._packet())["ok"])


if __name__ == "__main__":
    unittest.main()
