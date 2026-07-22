#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_device_func device-marker coverage (P4 contract device cases)."""
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gdf = _load("gate_device_func")

BASE = dict(nonce="NONCE1", marker="FUNC_OK", runtime_marker="RT_OK",
            e2e_marker="E2E_OK", uptime_before="10.0", uptime_after="20.0",
            host_sha="abc", device_sha="abc")


def cap_with(*markers):
    return "log line NONCE1 FUNC_OK RT_OK E2E_OK " + " ".join(markers)


class TestDeviceMarkerCoverage(unittest.TestCase):
    def test_all_device_markers_present(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with("D1", "D2"), device_markers=["D1", "D2"], **BASE)
        self.assertTrue(ok, reason)
        self.assertIn("device_cases=2/2", reason)

    def test_one_device_marker_missing(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with("D1"), device_markers=["D1", "D2"], **BASE)
        self.assertFalse(ok)
        self.assertIn("MISSING_device_markers=D2", reason)

    def test_empty_device_markers_behaves_as_before(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with(), device_markers=[], **BASE)
        self.assertTrue(ok, reason)

    def test_core_marker_still_required(self):
        # missing the functional marker fails even if device markers present
        base = dict(BASE)
        cap = "NONCE1 RT_OK E2E_OK D1"  # no FUNC_OK
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap, device_markers=["D1"], **base)
        self.assertFalse(ok)


class TestDriverLiteralGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.scen = os.path.join(self.tmp.name, "scenario.sh")

    def tearDown(self):
        self.tmp.cleanup()

    def test_contract_marker_hardcoded_in_driver_flagged(self):
        with open(self.scen, "w") as f:
            f.write('log -t X "D1"\n')  # hard-codes a contract device marker
        found = gdf.find_marker_literals([None, self.scen], ["D1", "D2"])
        self.assertIn("D1", found)
        self.assertNotIn("D2", found)


if __name__ == "__main__":
    unittest.main()
