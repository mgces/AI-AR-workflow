#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for archive_product.redact and manifest summary generation."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "scripts"))
import archive_product as ap  # noqa: E402


class TestRedact(unittest.TestCase):
    def test_serial_redacted(self):
        s = "Device online: serial deadbeefcafef00d0123456789abcdef via bridge"
        out = ap.redact(s)
        self.assertNotIn("deadbeefcafef00d0123456789abcdef", out)
        self.assertIn("<REDACTED-SERIAL>", out)

    def test_sha256_not_eaten(self):
        # a 64-hex sha256 must survive (only 32-hex serials are redacted)
        sha = "97c2c1a6b10a6d175a026271060138f40d61c92b389f37a4dac9715104e86d5b"
        out = ap.redact("artifact sha256=%s" % sha)
        self.assertIn(sha, out)

    def test_home_path_redacted(self):
        out = ap.redact("S=/home/mgces/.claude/skills/ohos-ar-dev-phases/scripts")
        self.assertNotIn("/home/mgces", out)
        self.assertTrue(out.startswith("S=~/"))

    def test_host_port_and_bridge(self):
        out = ap.redact("server args: -s 192.168.64.1:10086 wsl_bridge_port=10086")
        self.assertNotIn("192.168.64.1:10086", out)
        self.assertNotIn("wsl_bridge_port=10086", out)
        self.assertIn("<REDACTED-HOST:PORT>", out)

    def test_idempotent(self):
        s = "serial deadbeefcafef00d0123456789abcdef at /home/mgces/x"
        once = ap.redact(s)
        self.assertEqual(once, ap.redact(once))

    def test_manifest_summary_has_no_serial(self):
        state = {"run_id": "20260707-x", "build_target": "t",
                 "base_commit": "abc", "phases": [{"id": 4, "name": "device-functional"}]}
        entries = [{"phase": 4, "gate": "gate_device_func.py", "verdict": "PASS",
                    "reason": "serial=deadbeefcafef00d0123456789abcdef nonce=deadbeef",
                    "artifacts": [{"path": "evidence/phase4/hilog.txt", "sha256": "ab"}]}]
        out = ap.build_manifest_summary(state, entries)
        self.assertNotIn("deadbeefcafef00d0123456789abcdef", out)
        self.assertIn("<REDACTED-SERIAL>", out)


class TestIncludeReports(unittest.TestCase):
    def test_include_reports_redacts_html(self):
        import json
        import tempfile
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        pdir = os.path.join(tmp.name, "run")
        os.makedirs(os.path.join(pdir, "reports"))
        os.makedirs(os.path.join(pdir, "evidence"))
        with open(os.path.join(pdir, "pipeline.json"), "w") as f:
            json.dump({"run_id": "r", "build_target": "t", "phases": []}, f)
        with open(os.path.join(pdir, "ar.md"), "w") as f:
            f.write("ar")
        with open(os.path.join(pdir, "reports", "summary.html"), "w") as f:
            f.write("<p>serial deadbeefcafef00d0123456789abcdef at /home/mgces/x</p>")
        outdir = os.path.join(tmp.name, "product")
        sys.argv = ["archive_product.py", "--pipeline-dir", pdir,
                    "--product-dir", outdir, "--include-reports"]
        ap.main()
        with open(os.path.join(outdir, "reports", "summary.html")) as f:
            html = f.read()
        self.assertNotIn("deadbeefcafef00d0123456789abcdef", html)
        self.assertNotIn("/home/mgces", html)


class TestSinkFeature(unittest.TestCase):
    def _run(self, with_design=True, pre_existing=False):
        import json
        import tempfile
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        pdir = os.path.join(tmp.name, "run")
        os.makedirs(os.path.join(pdir, "evidence", "phase1"))
        os.makedirs(os.path.join(pdir, "evidence", "phase4"))
        with open(os.path.join(pdir, "pipeline.json"), "w") as f:
            json.dump({"run_id": "r", "build_target": "hiview_package",
                       "test": {"part": "hiview"}, "phases": []}, f)
        with open(os.path.join(pdir, "ar.md"), "w") as f:
            f.write("ar")
        if with_design:
            with open(os.path.join(pdir, "evidence/phase1/AR_design.md"), "w") as f:
                f.write("# d\n## 目标组件\nhiview 新增 demo\n## 完整代码框架\n"
                        "### 文件清单\n- demo.cpp\n## 需测试的功能点\n- 边界\n")
        with open(os.path.join(pdir, "evidence/phase1/changed_files.txt"), "w") as f:
            f.write("demo.cpp\n")
        with open(os.path.join(pdir, "evidence/phase4/run_meta.txt"), "w") as f:
            f.write("nonce=x\nserial=deadbeefcafef00d0123456789abcdef\n")
        with open(os.path.join(pdir, "evidence", "manifest.jsonl"), "w") as f:
            f.write(json.dumps({"phase": 3, "verdict": "PASS", "reason": "tests=5"}) + "\n")
        kb = os.path.join(tmp.name, "kb")
        feat_dir = os.path.join(kb, "subsystems", "hiviewdfx", "features", "demo")
        if pre_existing:
            os.makedirs(feat_dir)
            with open(os.path.join(feat_dir, "README.md"), "w") as f:
                f.write("HUMAN AUTHORED — do not clobber")
        outdir = os.path.join(tmp.name, "product")
        sys.argv = ["archive_product.py", "--pipeline-dir", pdir,
                    "--product-dir", outdir, "--kb-root", kb,
                    "--sink-feature", "hiviewdfx/hiview/demo"]
        ap.main()
        return feat_dir

    def test_fact_skeleton_and_todo(self):
        feat_dir = self._run()
        with open(os.path.join(feat_dir, "README.md")) as f:
            spec = f.read()
        for sec in ("## 目标与当前实现", "## 文件职责", "## 构建与测试", "## 装载 / 运行链"):
            self.assertIn(sec, spec)
        self.assertIn("P3 单元测试:PASS", spec)
        self.assertIn("TODO(人工补充)", spec)  # deep analysis placeholder
        self.assertIn("build_target: `hiview_package`", spec)

    def test_redacts_serial(self):
        feat_dir = self._run()
        with open(os.path.join(feat_dir, "README.md")) as f:
            spec = f.read()
        self.assertNotIn("deadbeefcafef00d0123456789abcdef", spec)
        self.assertIn("<REDACTED-SERIAL>", spec)

    def test_no_clobber_existing(self):
        feat_dir = self._run(pre_existing=True)
        with open(os.path.join(feat_dir, "README.md")) as f:
            self.assertIn("HUMAN AUTHORED", f.read())  # untouched
        self.assertTrue(os.path.isfile(os.path.join(feat_dir, "README.generated.md")))

    def test_legacy_no_design_degrades(self):
        feat_dir = self._run(with_design=False)
        with open(os.path.join(feat_dir, "README.md")) as f:
            spec = f.read()
        # still produces evidence-based sections + falls back to changed_files
        self.assertIn("demo.cpp", spec)
        self.assertIn("P3 单元测试:PASS", spec)


if __name__ == "__main__":
    unittest.main()
