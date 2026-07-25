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
        with open(os.path.join(self.pdir, "evidence/phase4/hilog_capture.txt"), "w") as f:
            f.write("all log\n")
        with open(os.path.join(self.pdir, "evidence/phase4/hilog_baseline_window.txt"), "w") as f:
            f.write("baseline\n")
        with open(os.path.join(self.pdir, "evidence/phase4/hilog_trigger_window.txt"), "w") as f:
            f.write("trigger D1\n")
        with open(os.path.join(self.pdir, "evidence/phase4/device_case_results.json"), "w") as f:
            json.dump({
                "results": [{
                    "marker": "D1",
                    "marker_pid": 1234,
                    "process_expected": "foundation",
                    "ok": True,
                    "marker_seen": True,
                    "process_match": True,
                    "artifact_loaded_verified": True,
                    "side_effect_ok": True,
                    "negative_control_ok": True,
                    "problems": [],
                }]
            }, f)
        with open(os.path.join(self.pdir, "evidence/phase4/phase_summary.json"), "w") as f:
            json.dump({
                "process_provenance_verified": True,
                "artifact_loaded_verified": True,
                "side_effect_verified": True,
                "negative_control_verified": True,
                "baseline_window_found": True,
                "trigger_window_found": True,
            }, f)

    def tearDown(self):
        self.tmp.cleanup()

    def test_device_html_redacts_serial(self):
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        self.assertIn("真机功能测试报告", out)
        self.assertNotIn("7001005458323933328a01fce1fe3800", out)
        self.assertIn("&lt;REDACTED-SERIAL&gt;", out)

    def test_device_html_shows_new_p4_sections(self):
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        for block in ("P4 抗伪造摘要", "device_cases 逐项结果", "基线窗口", "触发窗口"):
            self.assertIn(block, out)
        self.assertIn("foundation", out)
        self.assertIn("1234", out)

    def test_device_html_shows_control_process_summary(self):
        # a FAIL run leaves a repair packet in the control layer; the report must
        # surface repair/retry rounds and the downstream re-validate scope so a
        # human (or weak model) sees how far a failure propagates — advisory only.
        rpdir = os.path.join(self.pdir, "controls", "repairs")
        os.makedirs(rpdir)
        with open(os.path.join(rpdir, "current.json"), "w") as f:
            json.dump({
                "phase": 4,
                "active": True,
                "failure_class": "device_side_effect_missing",
                "retry_rounds": 1,
                "max_retry_rounds": 2,
                "repair_rounds": 2,
                "max_repair_rounds": 3,
                "downstream_revalidate_scope": "P4_P5",
                "recommended_next_action": "repair_in_place",
                "human_escalation_needed": False,
                "regen_required": False,
                "regen_signals": [],
            }, f)
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        self.assertIn("控制层流程摘要", out)
        self.assertIn("device_side_effect_missing", out)
        self.assertIn("1 / 2", out)   # retry rounds
        self.assertIn("2 / 3", out)   # repair rounds
        self.assertIn("P4_P5", out)   # downstream scope

    def test_device_html_omits_process_summary_when_no_repair(self):
        # a clean run (no repair packet, no scope) must not render an empty
        # control-layer section.
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        self.assertNotIn("控制层流程摘要", out)

    def test_device_html_flags_circuit_breaker(self):
        rpdir = os.path.join(self.pdir, "controls", "repairs")
        os.makedirs(rpdir)
        with open(os.path.join(rpdir, "current.json"), "w") as f:
            json.dump({
                "phase": 4,
                "active": True,
                "failure_class": "device_provenance_mismatch",
                "retry_rounds": 2,
                "max_retry_rounds": 2,
                "repair_rounds": 3,
                "max_repair_rounds": 3,
                "downstream_revalidate_scope": "P4_P5",
                "recommended_next_action": "human_escalation",
                "human_escalation_needed": True,
                "escalation_note": "retry/repair 预算耗尽",
            }, f)
        state, entries = rr.load(self.pdir)
        out = rr.render_device(self.pdir, state, entries, phase=4)
        self.assertIn("熔断状态", out)
        self.assertIn("retry/repair 预算耗尽", out)

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
