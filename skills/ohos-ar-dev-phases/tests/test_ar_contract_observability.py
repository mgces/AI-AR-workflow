#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for device_cases[].observability — the P1 declaration of WHERE a
device marker originates on the real runtime (hilog left-shift).

The field is a pure-additive design-intent declaration: absent = legacy契约零
变化. Its only hard check is a self-consistency one: declaring the side_effect
source but giving no side_effect block is a contradictory contract → FAIL.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


def _contract(device_case_extra):
    dc = {"desc": "触发", "marker": "AR_DEV_OK"}
    dc.update(device_case_extra)
    import json
    body = {
        "build_artifacts": ["out/rk3568/liba.z.so"],
        "test_cases": [{"point": "点一", "gtest": "ATest.C1"}],
        "device_cases": [dc],
    }
    return "```ar-contract\n" + json.dumps(body, ensure_ascii=False) + "\n```"


class TestObservabilityField(unittest.TestCase):
    def test_component_log_parses_and_roundtrips(self):
        ok, contract, det = gl.parse_ar_contract(
            _contract({"observability": "component_log"}))
        self.assertTrue(ok, det)
        self.assertEqual(contract["device_cases"][0]["observability"],
                         "component_log")

    def test_scenario_log_valid(self):
        ok, contract, det = gl.parse_ar_contract(
            _contract({"observability": "scenario_log"}))
        self.assertTrue(ok, det)

    def test_unknown_value_fails(self):
        ok, contract, det = gl.parse_ar_contract(
            _contract({"observability": "bad_value"}))
        self.assertFalse(ok)
        self.assertIn("observability", det)

    def test_side_effect_source_requires_side_effect_block(self):
        ok, contract, det = gl.parse_ar_contract(
            _contract({"observability": "side_effect"}))
        self.assertFalse(ok)
        self.assertIn("side_effect", det)

    def test_side_effect_source_with_block_ok(self):
        ok, contract, det = gl.parse_ar_contract(_contract({
            "observability": "side_effect",
            "side_effect": {"type": "shell_assert",
                            "command": "cat /data/flag", "expect": "OK"},
        }))
        self.assertTrue(ok, det)
        self.assertEqual(contract["device_cases"][0]["observability"],
                         "side_effect")

    def test_absent_is_backward_compatible(self):
        ok, contract, det = gl.parse_ar_contract(_contract({}))
        self.assertTrue(ok, det)
        self.assertIsNone(contract["device_cases"][0]["observability"])


if __name__ == "__main__":
    unittest.main()
