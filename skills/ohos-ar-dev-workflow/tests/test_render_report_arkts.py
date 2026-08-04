#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for render_report's ArkTS(Hypium)覆盖 block in the P5 test report.

The block is degrade-friendly by design: a pure-gtest contract never emits
evidence/phase5/arkts_coverage.txt, so the section is simply absent (no
traceback, no "未产出" noise). An arkts-kind P5 run drops that file, and the
report must surface it as a rendered coverage block — parallel to the gtest
coverage section, using the same read_ev + _pre path.
"""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import render_report as rr  # noqa: E402


class TestRenderReportArkts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        os.makedirs(os.path.join(self.pdir, "evidence", "phase5"))
        with open(os.path.join(self.pdir, "pipeline.json"), "w") as f:
            json.dump({"run_id": "r1", "build_target": "t",
                       "phases": [{"id": i, "name": "p%d" % i}
                                  for i in range(9)]}, f)
        with open(os.path.join(self.pdir, "evidence", "manifest.jsonl"), "w") as f:
            f.write(json.dumps({"phase": 5, "verdict": "PASS",
                                "reason": "arkts_cov=1/1"}) + "\n")

    def tearDown(self):
        self.tmp.cleanup()

    def test_arkts_coverage_block_rendered(self):
        # An arkts-only P5 run: only arkts_coverage.txt exists (no gtest cov).
        # The report renders the ArkTS block verbatim and never tracebacks.
        cov = ("required (from ar-contract): 1\n"
               "passed in report: 1\n\n"
               "[OK ] EntryAbilityTest.abilityPageTest\n")
        with open(os.path.join(self.pdir, "evidence", "phase5",
                               "arkts_coverage.txt"), "w") as f:
            f.write(cov)
        state, entries = rr.load(self.pdir)
        out = rr.render_test(self.pdir, state, entries)
        self.assertIn("ArkTS", out)
        self.assertIn("EntryAbilityTest.abilityPageTest", out)

    def test_no_arkts_block_when_absent(self):
        # A pure-gtest contract leaves no arkts_coverage.txt: the ArkTS section
        # must be absent entirely (degrade to nothing, not a "未产出" line),
        # and rendering must still succeed.
        state, entries = rr.load(self.pdir)
        out = rr.render_test(self.pdir, state, entries)
        self.assertNotIn("ArkTS", out)
        self.assertIn("测试用例报告", out)


if __name__ == "__main__":
    unittest.main()
