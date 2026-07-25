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

    def test_v1_reports_version_1(self):
        ok, c, detail = gl.parse_ar_contract(VALID_BLOCK)
        self.assertTrue(ok, detail)
        self.assertEqual(c["version"], 1)
        self.assertEqual(c["requirements"], [])
        self.assertEqual(c["changed_files"], [])


V2_BLOCK = """```ar-contract
{
  "contract_version": "2.0",
  "requirements": [
    {"id": "REQ-001", "desc": "fd 泄漏修复"},
    {"id": "REQ-002", "desc": "超时可配置"}
  ],
  "build_artifacts": [
    {"id": "BA-001", "path": "out/rk3568/liba.z.so", "for_requirements": ["REQ-001"]}
  ],
  "test_cases": [
    {"id": "TC-001", "point": "泄漏", "gtest": "ATest.NoLeak_001", "for_requirements": ["REQ-001"]},
    {"id": "TC-002", "point": "超时", "gtest": "ATest.Timeout_001", "for_requirements": ["REQ-002"]}
  ],
  "device_cases": [
    {
      "id": "DC-001", "desc": "注入", "marker": "AR_DEV_C1_OK",
      "for_requirements": ["REQ-001", "REQ-002"],
      "process": "foundation",
      "artifact_loaded": "/system/lib64/liba.z.so",
      "side_effect": {"type": "shell_assert",
                      "command": "param get persist.a.enabled", "expect": "1"},
      "absent_before_trigger": true
    }
  ],
  "changed_files": [
    {"id": "FILE-001", "path": "foundation/a/src/mgr.cpp", "for_requirements": ["REQ-001", "REQ-002"]}
  ]
}
```"""


class TestParseContractV2(unittest.TestCase):
    def test_v2_valid(self):
        ok, c, detail = gl.parse_ar_contract(V2_BLOCK)
        self.assertTrue(ok, detail)
        self.assertEqual(c["version"], 2)
        # normalized downstream shapes: paths stay plain strings
        self.assertEqual(c["build_artifacts"], ["out/rk3568/liba.z.so"])
        self.assertEqual(c["changed_files"], ["foundation/a/src/mgr.cpp"])
        self.assertEqual(len(c["requirements"]), 2)
        dc = c["device_cases"][0]
        self.assertEqual(dc["process"], "foundation")
        self.assertEqual(dc["artifact_loaded"], "/system/lib64/liba.z.so")
        self.assertEqual(dc["side_effect"]["type"], "shell_assert")
        self.assertTrue(dc["absent_before_trigger"])

    def test_v2_duplicate_requirement_id(self):
        text = V2_BLOCK.replace('"id": "REQ-002"', '"id": "REQ-001"')
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("duplicate", detail)

    def test_v2_relative_artifact_loaded_rejected(self):
        text = V2_BLOCK.replace('"/system/lib64/liba.z.so"', '"system/liba.z.so"')
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("absolute", detail)

    def test_v2_bad_side_effect_type(self):
        text = V2_BLOCK.replace('"type": "shell_assert"', '"type": "magic"')
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("shell_assert", detail)

    def test_v2_side_effect_missing_expect(self):
        text = V2_BLOCK.replace(', "expect": "1"', '')
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("expect", detail)

    def test_v2_empty_changed_files_rejected(self):
        import json as _json
        import re as _re
        body = _re.search(r"```ar-contract\n(.*)\n```", V2_BLOCK, _re.DOTALL).group(1)
        data = _json.loads(body)
        data["changed_files"] = []
        text = "```ar-contract\n%s\n```" % _json.dumps(data)
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("changed_files", detail)

    def test_v2_string_form_changed_files_ok(self):
        import json as _json
        import re as _re
        body = _re.search(r"```ar-contract\n(.*)\n```", V2_BLOCK, _re.DOTALL).group(1)
        data = _json.loads(body)
        data["changed_files"] = ["foundation/a/src/mgr.cpp"]
        text = "```ar-contract\n%s\n```" % _json.dumps(data)
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertTrue(ok, detail)
        self.assertEqual(c["changed_files"], ["foundation/a/src/mgr.cpp"])

    def test_v2_absent_before_trigger_must_be_bool(self):
        text = V2_BLOCK.replace('"absent_before_trigger": true',
                                '"absent_before_trigger": "yes"')
        ok, c, detail = gl.parse_ar_contract(text)
        self.assertFalse(ok)
        self.assertIn("absent_before_trigger", detail)

    def test_downstream_shapes_stable_across_versions(self):
        """gate_build reads contract['build_artifacts'] as [str]; gate_test_ut
        reads c['gtest']; gate_device_func reads c['marker']. These MUST have the
        same shape whether the contract was authored v1 or v2, so the readers stay
        version-agnostic."""
        _, v1, _ = gl.parse_ar_contract(VALID_BLOCK)
        _, v2, _ = gl.parse_ar_contract(V2_BLOCK)
        for c in (v1, v2):
            self.assertTrue(all(isinstance(p, str) for p in c["build_artifacts"]))
            self.assertTrue(all("gtest" in t for t in c["test_cases"]))
            self.assertTrue(all("marker" in d for d in c["device_cases"]))


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
