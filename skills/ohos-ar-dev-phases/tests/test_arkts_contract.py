#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the multi-language test_cases[].kind contract schema (2026-08):

* kind defaults to "gtest" (missing/empty) — zero behavior change for existing
  v1/v2 contracts;
* kind=="arkts" parses with the looser _ARKTS_ID_RE, optional suite/file fields;
* unknown kind is a parse error (fail-closed);
* contract_required_suites skips arkts entries (P7 binds gtest suites only);
* collect_test_intent_matrix carries kind through to the control layer.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


def _block(test_cases):
    return "```ar-contract\n%s\n```" % (
        '{"build_artifacts": ["out/a"], "test_cases": %s, '
        '"device_cases": [{"desc": "d", "marker": "m"}]}' % test_cases)


class TestArktsKindParse(unittest.TestCase):
    def test_kind_defaults_to_gtest(self):
        ok, c, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "gtest": "FooTest.C1"}]'))
        self.assertTrue(ok, det)
        self.assertEqual(c["test_cases"][0]["kind"], "gtest")

    def test_kind_empty_defaults_to_gtest(self):
        ok, c, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "gtest": "FooTest.C1", "kind": ""}]'))
        self.assertTrue(ok, det)
        self.assertEqual(c["test_cases"][0]["kind"], "gtest")

    def test_arkts_entry_parses(self):
        ok, c, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "kind": "arkts", "gtest": "EntryAbilityTest.abilityPageTest",'
            ' "suite": "EntryAbilityTest",'
            ' "file": "entry/src/ohosTest/ets/test/Ability.test.ets"}]'))
        self.assertTrue(ok, det)
        tc = c["test_cases"][0]
        self.assertEqual(tc["kind"], "arkts")
        self.assertEqual(tc["suite"], "EntryAbilityTest")
        self.assertEqual(tc["file"], "entry/src/ohosTest/ets/test/Ability.test.ets")

    def test_arkts_cjk_identity(self):
        ok, c, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "kind": "arkts", "gtest": "套件.用例"}]'))
        self.assertTrue(ok, det)
        self.assertEqual(gl.test_target_from_gtest(c["test_cases"][0]["gtest"]), "套件")

    def test_unknown_kind_fails(self):
        ok, _, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "gtest": "FooTest.C1", "kind": "bogus"}]'))
        self.assertFalse(ok)
        self.assertIn("kind", det)

    def test_arkts_gtest_still_required(self):
        ok, _, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "kind": "arkts"}]'))
        self.assertFalse(ok)
        self.assertIn("gtest", det)

    def test_arkts_gtest_no_whitespace_half(self):
        ok, _, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "kind": "arkts", "gtest": "has space.case"}]'))
        self.assertFalse(ok)

    def test_gtest_kind_still_strict(self):
        # kind=="gtest" keeps _GTEST_ID_RE — a space or CJK id still fails
        ok, _, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "gtest": "套件.用例"}]'))
        self.assertFalse(ok)
        self.assertIn("gtest", det)


class TestArktsDownstream(unittest.TestCase):
    def _mixed(self):
        ok, c, det = gl.parse_ar_contract(_block(
            '[{"point": "p1", "gtest": "FooTest.C1"},'
            ' {"point": "p2", "kind": "arkts", "gtest": "EntryAbilityTest.abilityPageTest"}]'))
        self.assertTrue(ok, det)
        return c

    def test_contract_required_suites_skips_arkts(self):
        c = self._mixed()
        self.assertEqual(gl.contract_required_suites(c), {"FooTest"})

    def test_contract_required_suites_all_arkts_empty(self):
        ok, c, _ = gl.parse_ar_contract(_block(
            '[{"point": "p2", "kind": "arkts", "gtest": "EntryAbilityTest.abilityPageTest"}]'))
        self.assertEqual(gl.contract_required_suites(c), set())

    def test_matrix_carries_kind(self):
        c = self._mixed()
        m = gl.collect_test_intent_matrix(c, ["src/a.c"])
        self.assertEqual([x["kind"] for x in m], ["gtest", "arkts"])
        self.assertEqual(m[1]["expected_gtest"], "EntryAbilityTest.abilityPageTest")
        self.assertEqual(m[1]["expected_suite"], "EntryAbilityTest")


if __name__ == "__main__":
    unittest.main()
