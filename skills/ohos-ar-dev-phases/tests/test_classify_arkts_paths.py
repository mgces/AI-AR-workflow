#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for ArkTS path classification + is_allowed_test_path (freeze relaxation
anchor). The relaxation is tied to CONTRACT-DECLARED paths, never to a naming
heuristic — functional app .ets stays "code" and still trips the freeze."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


class TestClassifyArktsPaths(unittest.TestCase):
    def test_ohostest_dir_is_test(self):
        self.assertEqual(
            gl.classify_path("entry/src/ohosTest/ets/test/Ability.test.ets"), "test")

    def test_test_named_ets_is_test(self):
        self.assertEqual(gl.classify_path("src/test_helper.ets"), "test")

    def test_functional_ets_is_code(self):
        self.assertEqual(gl.classify_path("entry/src/main/ets/pages/Index.ets"), "code")
        self.assertEqual(gl.classify_path("src/logger.ets"), "code")

    def test_existing_cpp_paths_unchanged(self):
        self.assertEqual(gl.classify_path("base/test/foo_test.cpp"), "test")
        self.assertEqual(gl.classify_path("base/src/foo.cpp"), "code")
        self.assertEqual(gl.classify_path("test/foo/BUILD.gn"), "test")
        self.assertEqual(gl.classify_path("src/main/BUILD.gn"), "code")


class TestIsAllowedTestPath(unittest.TestCase):
    def test_test_classified_always_allowed(self):
        self.assertTrue(gl.is_allowed_test_path(
            "base/test/foo_test.cpp", {}))
        self.assertTrue(gl.is_allowed_test_path("src/test_helper.ets", {}))

    def test_declared_dir_covers_whole_project(self):
        contract = {"test_cases": [
            {"kind": "arkts", "file": "entry/src/ohosTest"}]}
        self.assertTrue(gl.is_allowed_test_path(
            "entry/src/ohosTest/ets/test/Ability.test.ets", contract))
        self.assertTrue(gl.is_allowed_test_path(
            "entry/src/ohosTest/ets/test/Ability.test.json", contract))

    def test_declared_file_allows_exactly_it(self):
        contract = {"test_cases": [
            {"kind": "arkts", "file": "entry/src/ohosTest/ets/test/Ability.test.ets"}]}
        self.assertTrue(gl.is_allowed_test_path(
            "entry/src/ohosTest/ets/test/Ability.test.ets", contract))
        # A single-file declaration relaxes ONLY that file. A sibling that does
        # NOT classify as test on its own (no /test/ dir segment, no test-ish
        # name) — e.g. a backup at tools/ — is neither test-classed nor declared,
        # so the relaxation stays anchored to the contract and rejects it.
        self.assertFalse(gl.is_allowed_test_path(
            "tools/ohosTest_backup.ets", contract))

    def test_functional_app_code_rejected(self):
        contract = {"test_cases": [
            {"kind": "arkts", "file": "entry/src/ohosTest"}]}
        # app functional code under main/ is NOT declared and NOT test-classed
        self.assertFalse(gl.is_allowed_test_path(
            "entry/src/main/ets/pages/Index.ets", contract))
        self.assertFalse(gl.is_allowed_test_path(
            "AppScope/app.json5", contract))

    def test_gtest_only_contract_unchanged(self):
        contract = {"test_cases": [{"kind": "gtest", "gtest": "FooTest.C1"}]}
        self.assertFalse(gl.is_allowed_test_path("src/logger.ets", contract))
        self.assertTrue(gl.is_allowed_test_path("base/test/foo_test.cpp", contract))

    def test_no_contract_unchanged(self):
        self.assertTrue(gl.is_allowed_test_path("base/test/foo_test.cpp", None))
        self.assertFalse(gl.is_allowed_test_path("src/logger.ets", None))


if __name__ == "__main__":
    unittest.main()
