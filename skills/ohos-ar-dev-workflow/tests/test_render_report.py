#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for render_report — HTML reports + PR description, with redaction."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import render_report as rr  # noqa: E402


class TestRenderReport(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        os.makedirs(os.path.join(self.pdir, "evidence", "phase1"))
        os.makedirs(os.path.join(self.pdir, "evidence", "phase4"))
        os.makedirs(os.path.join(self.pdir, "evidence", "phase6"))
        with open(os.path.join(self.pdir, "pipeline.json"), "w") as f:
            json.dump({"run_id": "r1", "build_target": "t",
                       "phases": [{"id": i, "name": "p%d" % i} for i in range(7)]}, f)
        # a manifest with a P4 PASS whose reason carries a serial (must be redacted)
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl"), "w") as f:
            f.write(json.dumps({"phase": 4, "verdict": "PASS",
                                "reason": "serial=7001005458323933328a01fce1fe3800 marker ok"}) + "\n")
            f.write(json.dumps({"phase": 3, "verdict": "PASS", "reason": "tests=5"}) + "\n")
        with open(os.path.join(self.pdir, "ar.md"), "w") as f:
            f.write("AR 背景:修复 /home/mgces/x 下的问题")
        with open(os.path.join(self.pdir, "evidence/phase1/AR_design.md"), "w") as f:
            f.write("# d\n## 设计思路\n用屏障隔离\n## 需测试的功能点\n- 点一\n")
        with open(os.path.join(self.pdir, "evidence/phase4/run_meta.txt"), "w") as f:
            f.write("nonce=abc\nserial=7001005458323933328a01fce1fe3800\n")

    def tearDown(self):
        self.tmp.cleanup()

    def test_device_html_redacts_serial(self):
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        self.assertIn("真机功能测试报告", out)
        self.assertNotIn("7001005458323933328a01fce1fe3800", out)
        self.assertIn("&lt;REDACTED-SERIAL&gt;", out)  # escaped placeholder

    def test_summary_has_all_blocks(self):
        state, entries = rr.load(self.pdir)
        out = rr.render_summary(self.pdir, state, entries)
        for block in ("背景介绍", "设计思路", "修改概要", "用例概要", "用例结果总结"):
            self.assertIn(block, out)

    def test_pr_description_blocks_and_redaction(self):
        desc = rr.build_pr_description(self.pdir)
        for block in ("## 背景介绍", "## 设计思路", "## 修改概要", "## 用例概要", "## 用例结果总结"):
            self.assertIn(block, desc)
        self.assertNotIn("/home/mgces", desc)
        self.assertNotIn("7001005458323933328a01fce1fe3800", desc)

    def test_main_all_writes_files(self):
        sys.argv = ["render_report.py", "--pipeline-dir", self.pdir, "--kind", "all"]
        rr.main()
        for fn in ("device_functional.html", "quality.html",
                   "summary.html", "pr_description.md", "index.html"):
            self.assertTrue(os.path.isfile(os.path.join(self.pdir, "reports", fn)), fn)


if __name__ == "__main__":
    unittest.main()
