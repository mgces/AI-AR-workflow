#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for parse_ar_contract + load_signed_contract (the ar-contract block)."""
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402

VALID_BLOCK = """随便前言

```ar-contract
{
  "build_artifacts": ["out/rk3568/liba.z.so", "libb.z.so"],
  "test_cases": [
    {"point": "超时", "gtest": "ATest.HandleTimeout_001"},
    {"point": "参数化", "gtest": "SuiteP/0.Case"}
  ],
  "device_cases": [{"desc": "注入", "marker": "AR_DEV_C1_OK"}]
}
```

随便后语
"""


class TestParseContract(unittest.TestCase):
    def test_valid(self):
        ok, c, detail = gl.parse_ar_contract(VALID_BLOCK)
        self.assertTrue(ok, detail)
        self.assertEqual(len(c["build_artifacts"]), 2)
        self.assertEqual(c["test_cases"][1]["gtest"], "SuiteP/0.Case")

    def test_missing(self):
        ok, c, detail = gl.parse_ar_contract("no block here")
        self.assertFalse(ok)
        self.assertIn("missing", detail)

    def test_multiple_blocks_rejected(self):
        ok, c, detail = gl.parse_ar_contract(VALID_BLOCK + "\n" + VALID_BLOCK)
        self.assertFalse(ok)
        self.assertIn("multiple", detail)

    def test_invalid_json(self):
        ok, c, detail = gl.parse_ar_contract("```ar-contract\n{not json}\n```")
        self.assertFalse(ok)
        self.assertIn("invalid json", detail)

    def test_empty_array(self):
        text = '```ar-contract\n{"build_artifacts": [], "test_cases": [{"point":"p","gtest":"A.B"}], "device_cases": [{"desc":"d","marker":"m"}]}\n```'
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("build_artifacts", detail)

    def test_bad_gtest_id(self):
        text = '```ar-contract\n{"build_artifacts": ["a"], "test_cases": [{"point":"p","gtest":"nodot"}], "device_cases": [{"desc":"d","marker":"m"}]}\n```'
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("gtest", detail)

    def test_malformed_device_case(self):
        text = '```ar-contract\n{"build_artifacts": ["a"], "test_cases": [{"point":"p","gtest":"A.B"}], "device_cases": [{"desc":"d"}]}\n```'
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("marker", detail)


class TestLoadSignedContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "contract-run"
        os.makedirs(os.path.join(self.pdir, "evidence", "phase1"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id,
            "phases": [{"id": i, "name": n, "status": "pending"} for i, n in gl.PHASES],
        })

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _sign_design(self, text):
        rel = "evidence/phase1/AR_design.md"
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            f.write(text)
        return gl.emit(self.pdir, 1, "gate_design.py", verdict="PASS",
                       reason="signed", artifacts_rel=[rel])

    def test_recover_ok(self):
        self._sign_design(VALID_BLOCK)
        ok, c, detail = gl.load_signed_contract(self.pdir)
        self.assertTrue(ok, detail)
        self.assertEqual(c["device_cases"][0]["marker"], "AR_DEV_C1_OK")

    def test_absent_when_no_design(self):
        ok, c, detail = gl.load_signed_contract(self.pdir)
        self.assertFalse(ok)
        self.assertIn("absent", detail)

    def test_tampered_artifact(self):
        self._sign_design(VALID_BLOCK)
        # alter the signed AR_design after emit -> sha256 mismatch -> tampered
        with open(os.path.join(self.pdir, "evidence/phase1/AR_design.md"), "a") as f:
            f.write("\nTAMPERED\n")
        ok, c, detail = gl.load_signed_contract(self.pdir)
        self.assertFalse(ok)
        self.assertIn("tampered", detail)

    def test_signed_design_without_contract_is_absent(self):
        self._sign_design("# 设计\n没有契约块\n")
        ok, c, detail = gl.load_signed_contract(self.pdir)
        self.assertFalse(ok)
        self.assertIn("absent", detail)


if __name__ == "__main__":
    unittest.main()
