#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_test_ut gtest coverage (P3 contract test-point coverage)."""
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


gate_test_ut = _load("gate_test_ut")

RESULT_XML = """<?xml version="1.0"?>
<testsuites>
  <testsuite name="ATest">
    <testcase classname="ATest" name="Case001"/>
    <testcase classname="ATest" name="Case002">
      <failure message="boom"/>
    </testcase>
    <testcase classname="ATest" name="Case003">
      <error message="crash"/>
    </testcase>
  </testsuite>
</testsuites>
"""


class TestGtestCoverage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.xml = os.path.join(self.tmp.name, "result.xml")
        with open(self.xml, "w") as f:
            f.write(RESULT_XML)

    def tearDown(self):
        self.tmp.cleanup()

    def test_passed_set(self):
        passed = gate_test_ut.passed_gtests([self.xml])
        self.assertIn("ATest.Case001", passed)
        self.assertNotIn("ATest.Case002", passed)  # failure
        self.assertNotIn("ATest.Case003", passed)  # error

    def test_coverage_all_passed(self):
        passed = gate_test_ut.passed_gtests([self.xml])
        ok, missing = gate_test_ut.check_gtest_coverage(["ATest.Case001"], passed)
        self.assertTrue(ok)
        self.assertEqual(missing, [])

    def test_coverage_absent_case(self):
        passed = gate_test_ut.passed_gtests([self.xml])
        ok, missing = gate_test_ut.check_gtest_coverage(
            ["ATest.Case001", "ATest.CaseNope"], passed)
        self.assertFalse(ok)
        self.assertEqual(missing, ["ATest.CaseNope"])

    def test_coverage_failed_case_is_missing(self):
        passed = gate_test_ut.passed_gtests([self.xml])
        ok, missing = gate_test_ut.check_gtest_coverage(["ATest.Case002"], passed)
        self.assertFalse(ok)
        self.assertIn("ATest.Case002", missing)


if __name__ == "__main__":
    unittest.main()
