#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for parse_review_report_zero_issues multi-key fail-closed behavior."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


class TestReviewReportParse(unittest.TestCase):
    def _json(self, obj):
        fd, path = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f)
        self.addCleanup(os.remove, path)
        return path

    def _text(self, body):
        fd, path = tempfile.mkstemp(suffix=".txt")
        with os.fdopen(fd, "w") as f:
            f.write(body)
        self.addCleanup(os.remove, path)
        return path

    def test_all_zero_passes(self):
        ok, detail = gl.parse_review_report_zero_issues(
            self._json({"issue_count": 0, "blockers": []}))
        self.assertTrue(ok, detail)

    def test_zero_count_but_nonempty_blockers_fails(self):
        # The old code returned on issue_count=0 and never saw blockers.
        ok, detail = gl.parse_review_report_zero_issues(
            self._json({"issue_count": 0, "blockers": ["x", "y", "z"]}))
        self.assertFalse(ok)
        self.assertIn("blockers=3", detail)

    def test_findings_list_nonzero_fails(self):
        ok, _ = gl.parse_review_report_zero_issues(
            self._json({"findings": [{"id": 1}]}))
        self.assertFalse(ok)

    def test_no_marker_fails(self):
        ok, _ = gl.parse_review_report_zero_issues(self._json({"summary": "looks fine"}))
        self.assertFalse(ok)

    def test_text_marker_zero(self):
        ok, _ = gl.parse_review_report_zero_issues(self._text("review_issue_count=0\n"))
        self.assertTrue(ok)

    def test_text_marker_nonzero(self):
        ok, _ = gl.parse_review_report_zero_issues(self._text("review_issue_count=2\n"))
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
