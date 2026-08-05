#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for P3 (test-develop) authorship of kind==arkts test_cases.

An arkts-kind contract entry is authored when a NEW ArkTS test source
(declared by the contract's `file` when present, else any new test file)
carries a real Hypium `describe('<suite>', ...)` call for the suite AND
the design point `point` appears in the file's executable code — the same
fail-closed semantic-coverage rule as gtest, with the comment-stripping
that makes `// describe(...)` never count.

The P5 execution branch is not exercised here (see test_p5_arkts_branch.py);
this walks the real gate_test_develop.py gate through the signed phase
sequence exactly like test_phase1_test_develop.py.
"""
import importlib.util
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


def _load_sibling(name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(HERE, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


TestB1DevelopSequence = _load_sibling(
    "test_phase1_test_develop").TestB1DevelopSequence

# Same six-section design as the gtest fixture, but the contract declares an
# arkts-kind test case: Hypium identity (Suite.Case via describe/it) with an
# explicit `file` under entry/src/ohosTest (the freeze-relaxed anchor).
GOOD_DESIGN_ARKTS = """# 设计
## 目标组件
comp
## 详细功能需求
需求
## 完整代码框架
### 文件清单
- notes.txt
### 每文件功能
notes.txt 做事
### 代码框架
skeleton here
## 完整测试框架
hypium
## 需测试的功能点
重复请求
## 真机测试用例构造
真机 hdc 触发

## DFX设计
可观测性:组件成功路径打 hilog marker;可测试/可维护:接口分层、日志分级。

```ar-contract
{
  "contract_version": "2.0",
  "requirements": [{"id": "REQ-001", "desc": "重复请求"}],
  "build_artifacts": [{"id": "BA-001", "path": "out/rk3568/liba.z.so", "for_requirements": ["REQ-001"]}],
  "test_cases": [{"id": "TC-001", "point": "重复请求", "kind": "arkts", "gtest": "EntryAbilityTest.abilityPageTest", "suite": "EntryAbilityTest", "file": "entry/src/ohosTest/ets/test/Ability.test.ets", "for_requirements": ["REQ-001"]}],
  "device_cases": [{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}],
  "changed_files": [{"id": "FILE-001", "path": "notes.txt", "for_requirements": ["REQ-001"]}]
}
```
"""


class TestArktsAuthorship(TestB1DevelopSequence):
    """Subclasses the gtest sequence harness so the phase walk is identical;
    only the design + the authored test source differ."""

    def _close_design_arkts(self):
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN_ARKTS)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        cp = self._advance(1)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def _close_feature_develop(self):
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        cp = self._advance(2)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def _author_arkts(self, body):
        """Write the contract-declared ArkTS test file with the given body.
        A real ohosTest source carries the Apache license header (H1 hygiene)."""
        p = os.path.join(self.repo, "entry/src/ohosTest/ets/test/Ability.test.ets")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write("/*\n * Copyright (c) 2026.\n"
                    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n */\n")
            f.write(body)
        return "entry/src/ohosTest/ets/test/Ability.test.ets"

    # ---- P3 arkts authorship: real describe()/it() + executable point --------
    def test_arkts_declared_file_describe_authors_suite(self):
        # Positive: the declared file registers the suite with a real Hypium
        # describe() and asserts the design point as a string literal (kept by
        # executable_code_text). P3 must PASS and phase 3 must close signed.
        self._close_design_arkts()
        self._close_feature_develop()
        rel = self._author_arkts(
            "import { describe, it, expect } from '@ohos/hypium';\n"
            "export default function abilityPageTest() {\n"
            "  describe('EntryAbilityTest', () => {\n"
            "    it('abilityPageTest', 0, () => {\n"
            "      expect(true).assertTrue();\n"
            "      expect(doRepeat()).assertEqual(\"重复请求\");\n"
            "    });\n"
            "  });\n"
            "}\n")
        cp = self._run("gate_test_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        ok, reason, entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertTrue(ok, reason)
        self.assertEqual(entry["gate"], "gate_test_develop.py")
        cov = os.path.join(self.pdir, "evidence", "phase3", "authorship_coverage.txt")
        with open(cov, encoding="utf-8") as f:
            text = f.read()
        self.assertIn("[OK ] arkts EntryAbilityTest.abilityPageTest", text)

    def test_arkts_suite_in_comment_never_authors(self):
        # Fail-open guard: a declared file whose ONLY mention of the suite is a
        # `// describe(...)` comment must NOT count as authored — comments are
        # stripped before the Hypium regex runs. It also fails the point check.
        self._close_design_arkts()
        self._close_feature_develop()
        self._author_arkts(
            "// describe('EntryAbilityTest', ...) coming soon; TODO author it\n"
            "export default function abilityPageTest() {}\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("EntryAbilityTest.abilityPageTest", cp.stdout + cp.stderr)
        ok, _reason, _entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertFalse(ok)

    def test_arkts_empty_body_describe_fails_point_coverage(self):
        # The suite IS registered by a real describe(), but the design point
        # never appears in executable code (the body is empty). The design-point
        # semantic-coverage gate must still FAIL — right suite, ghost test.
        self._close_design_arkts()
        self._close_feature_develop()
        self._author_arkts(
            "import { describe } from '@ohos/hypium';\n"
            "export default function abilityPageTest() {\n"
            "  describe('EntryAbilityTest', () => {\n"
            "  });\n"
            "}\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("EntryAbilityTest.abilityPageTest", cp.stdout + cp.stderr)
        ok, _reason, _entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertFalse(ok)

    def test_arkts_never_satisfied_by_cpp_test_macro(self):
        # A C++ TEST() macro in a .cpp file must NOT satisfy an arkts-kind
        # entry — dispatch is by kind, so the Hypium describe() is required.
        # (The declared ohosTest .ets file is absent, so nothing authors it.)
        self._close_design_arkts()
        self._close_feature_develop()
        os.makedirs(os.path.join(self.repo, "test"), exist_ok=True)
        with open(os.path.join(self.repo, "test", "a_test.cpp"), "w", encoding="utf-8") as f:
            f.write("/*\n * Copyright (c) 2026.\n"
                    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n */\n")
            f.write("TEST(EntryAbilityTest, abilityPageTest) { EXPECT_STREQ(\"重复请求\", \"\"); }\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("EntryAbilityTest.abilityPageTest", cp.stdout + cp.stderr)
        ok, _reason, _entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertFalse(ok)

    def test_arkts_declared_file_absent_fails(self):
        # The contract `file` is declared but never created — the arkts entry
        # is unauthored and P3 FAILs even though the suite is correct.
        self._close_design_arkts()
        self._close_feature_develop()
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("EntryAbilityTest.abilityPageTest", cp.stdout + cp.stderr)

    def test_arkts_advance_phase3_after_authorship(self):
        # Full sequence: design -> develop -> author arkts test -> P3 gate
        # PASS -> advance --phase 3 lands on phase 4 with a signed closing entry.
        self._close_design_arkts()
        self._close_feature_develop()
        self._author_arkts(
            "import { describe, it, expect } from '@ohos/hypium';\n"
            "export default function abilityPageTest() {\n"
            "  describe('EntryAbilityTest', () => {\n"
            "    it('abilityPageTest', 0, () => {\n"
            "      expect(true).assertTrue();\n"
            "      expect(doRepeat()).assertEqual(\"重复请求\");\n"
            "    });\n"
            "  });\n"
            "}\n")
        self.assertEqual(self._run("gate_test_develop.py").returncode, 0)
        cp = self._advance(3)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = gl.load_state(self.pdir)
        self.assertEqual(st["current_phase"], 4)
        self.assertEqual(st["phases"][3]["status"], "passed")


if __name__ == "__main__":
    unittest.main()
