#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""gatelib design-point semantic-coverage primitives (P3 gate).

The signed ar-contract's test_cases[].point is the design intent a test must
actually exercise. P3's suite-authorship check only proves a suite of the right
NAME exists; these helpers add "the design point is really referenced in
EXECUTABLE test code (comments/strings stripped)". Token extraction is
dependency-free (ASCII identifiers/words/numbers + CJK bigrams, minus a small
stop set) — no CJK segmenter, so the gate runs anywhere.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


class TestPointCoreTokens(unittest.TestCase):
    def test_ascii_identifier_survives(self):
        t = gl.point_core_tokens("when duplicate request with taskId is sent")
        self.assertIn("taskid", t)

    def test_ascii_stopwords_dropped(self):
        t = gl.point_core_tokens("the request should return when then that")
        # every listed word except "request" is a stopword; "request" survives
        self.assertNotIn("the", t)
        self.assertNotIn("should", t)
        self.assertNotIn("when", t)
        self.assertIn("request", t)

    def test_number_token(self):
        self.assertIn("404", gl.point_core_tokens("returns error 404"))

    def test_cjk_bigrams_extracted(self):
        t = gl.point_core_tokens("重复请求时返回已有任务")
        # "请求" is a 2-char bigram from the run 重复请求时返回已有任务
        self.assertIn("请求", t)

    def test_cjk_bigram_crosses_punctuation(self):
        # "重 复" is split by space, so it must NOT produce the bigram "重复"
        t = gl.point_core_tokens("重 复")
        self.assertNotIn("重复", t)

    def test_cjk_stop_chars_dropped(self):
        t = gl.point_core_tokens("的")  # pure stop char
        self.assertEqual(t, set())

    def test_empty_point_yields_empty(self):
        self.assertEqual(gl.point_core_tokens(""), set())
        self.assertEqual(gl.point_core_tokens(None), set())


class TestExecutableCodeText(unittest.TestCase):
    def test_line_comment_stripped(self):
        self.assertNotIn("点一", gl.executable_code_text("// 点一\nEXPECT_TRUE(x);"))

    def test_block_comment_stripped(self):
        self.assertNotIn("点一", gl.executable_code_text("/* 点一 */ EXPECT_TRUE(x);"))

    def test_string_literal_kept(self):
        # Chinese design points are asserted AS string literals; keeping them is
        # what lets ASSERT_STREQ(actual, "点一") count as implementation.
        self.assertIn("点一", gl.executable_code_text('const char* s = "点一";'))

    def test_char_literal_kept(self):
        self.assertIn("点", gl.executable_code_text("char c = '点';"))

    def test_unterminated_comment_fails_closed(self):
        # no closing */ -> everything after is treated as comment (stricter)
        self.assertNotIn("点一", gl.executable_code_text("/* no close 点一"))


class TestPointCovered(unittest.TestCase):
    def test_covered_when_token_in_exec_code(self):
        exec_text = gl.executable_code_text(
            "TEST(Foo, C) { EXPECT_EQ(重复请求, run()); }")
        self.assertTrue(gl.point_covered("重复请求时返回已有任务", exec_text))

    def test_not_covered_when_only_in_comment(self):
        exec_text = gl.executable_code_text("// 重复请求\nTEST(Foo, C) {}")
        self.assertFalse(gl.point_covered("重复请求时返回已有任务", exec_text))

    def test_covered_via_string_assertion(self):
        # the design point asserted as a string literal counts as implementation
        exec_text = gl.executable_code_text(
            'TEST(Foo, C) { EXPECT_STREQ(actual, "重复请求"); }')
        self.assertTrue(gl.point_covered("重复请求时返回已有任务", exec_text))

    def test_covered_ascii_case_insensitive(self):
        exec_text = gl.executable_code_text("EXPECT_EQ(getTaskId(), id);")
        self.assertTrue(gl.point_covered("taskId", exec_text))

    def test_trivially_covered_when_no_tokens(self):
        self.assertTrue(gl.point_covered("", "ANY CODE"))


class TestContractRequiredSuites(unittest.TestCase):
    def test_suites_from_gtest_ids(self):
        contract = {"test_cases": [
            {"gtest": "DuplicateRequestTest.returnsExisting"},
            {"gtest": "AuthTest.login/0"},
            {"gtest": "DuplicateRequestTest.dedup"},
        ]}
        self.assertEqual(
            gl.contract_required_suites(contract),
            {"DuplicateRequestTest", "AuthTest"})

    def test_missing_gtest_ignored(self):
        contract = {"test_cases": [
            {"gtest": ""},
            {"gtest": None},
            {"gtest": "OnlySuiteNoCase"},
        ]}
        # a dotless gtest id IS the suite name (test_target_from_gtest keeps it)
        self.assertEqual(
            gl.contract_required_suites(contract), {"OnlySuiteNoCase"})

    def test_no_test_cases_yields_empty(self):
        self.assertEqual(gl.contract_required_suites({}), set())
        self.assertEqual(
            gl.contract_required_suites({"test_cases": []}), set())
        self.assertEqual(gl.contract_required_suites(None), set())


if __name__ == "__main__":
    unittest.main()
