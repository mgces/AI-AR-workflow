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
        s = "Device online: serial 7001005458323933328a01fce1fe3800 via bridge"
        out = ap.redact(s)
        self.assertNotIn("7001005458323933328a01fce1fe3800", out)
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
        s = "serial 7001005458323933328a01fce1fe3800 at /home/mgces/x"
        once = ap.redact(s)
        self.assertEqual(once, ap.redact(once))

    def test_manifest_summary_has_no_serial(self):
        state = {"run_id": "20260707-x", "build_target": "t",
                 "base_commit": "abc", "phases": [{"id": 4, "name": "device-functional"}]}
        entries = [{"phase": 4, "gate": "gate_device_func.py", "verdict": "PASS",
                    "reason": "serial=7001005458323933328a01fce1fe3800 nonce=deadbeef",
                    "artifacts": [{"path": "evidence/phase4/hilog.txt", "sha256": "ab"}]}]
        out = ap.build_manifest_summary(state, entries)
        self.assertNotIn("7001005458323933328a01fce1fe3800", out)
        self.assertIn("<REDACTED-SERIAL>", out)


if __name__ == "__main__":
    unittest.main()
