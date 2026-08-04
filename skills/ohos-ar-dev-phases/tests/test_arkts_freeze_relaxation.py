#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the P3/P5/P6/P7 feature-freeze relaxation anchored to
contract-declared ArkTS app-test project paths (kind==arkts `file`).

The relaxation is NOT a naming heuristic: an arkts contract declaring
`"file": "entry/src/ohosTest"` lets the whole multi-file ohosTest project
through the freeze, but any functional app code (entry/src/main/…,
AppScope/…) is still "code" and still trips the freeze exactly like C++
functional changes. This walks the real gate_test_develop.py + advance.py
drift checks (check_code_drift / prepare_test_bundle._verify_feature_freeze).
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

# test_arkts_authorship loads its sibling harness via importlib (tests/ is not a
# package); mirror that here so both new files stay import-agnostic.
_arkts_auth = importlib.util.spec_from_file_location(
    "test_arkts_authorship", os.path.join(HERE, "test_arkts_authorship.py"))
_mod = importlib.util.module_from_spec(_arkts_auth)
_arkts_auth.loader.exec_module(_mod)
GOOD_DESIGN_ARKTS = _mod.GOOD_DESIGN_ARKTS
TestArktsAuthorship = _mod.TestArktsAuthorship


class TestArktsFreezeRelaxation(TestArktsAuthorship):
    """Reuses the arkts phase-sequence harness; only the freeze-violation
    scenarios differ."""

    def _failure_report(self):
        """The P3 failure report carries the gate's full problems list — the
        one-line stdout reason only summarizes counts, so freeze-violating
        paths are asserted against this surface."""
        import json as _json
        fp = os.path.join(self.pdir, "evidence", "phase3", "failure_report.json")
        if not os.path.exists(fp):
            return {}
        return _json.load(open(fp, encoding="utf-8"))

    # ---- P3 freeze: declared ohosTest project may be added, main/ may not ----
    def test_arkts_declared_project_passes_freeze(self):
        # Declared `file` is the directory entry/src/ohosTest: adding ANY file
        # under it (the test .ets AND its .json sibling — a real multi-file
        # Hypium project) passes the feature freeze. The authored .ets also
        # registers the suite + point so the gate fully passes.
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
        # multi-file project: a sibling json next to the declared test source
        extra = os.path.join(self.repo, "entry/src/ohosTest/ets/test/Ability.test.json")
        with open(extra, "w", encoding="utf-8") as f:
            f.write('{"suites": ["Ability.test.ets"]}\n')
        cp = self._run("gate_test_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # and phase 3 closes cleanly (advance re-checks drift via check_code_drift)
        cp = self._advance(3)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_arkts_functional_ets_still_trips_freeze(self):
        # Anti-hole guarantee: an app functional .ets (entry/src/main/…) is NOT
        # declared by the contract and does NOT classify as a test path — the
        # freeze must reject it exactly like a C++ functional change.
        self._close_design_arkts()
        self._close_feature_develop()
        # author the declared test project correctly…
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
        # …then also add a functional app page (freeze violation)
        p = os.path.join(self.repo, "entry/src/main/ets/pages/Index.ets")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write("export struct Index { build() {} }\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        report = self._failure_report()
        self.assertIn("Index.ets", "\n".join(report.get("problems") or []))
        ok, _reason, _entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertFalse(ok)

    def test_arkts_appscope_still_trips_freeze(self):
        # AppScope/app.json5 (app-level functional config) is not a declared
        # test path and not test-classed — freeze violation.
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
        p = os.path.join(self.repo, "AppScope/app.json5")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write('{"app": {}}\n')
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        report = self._failure_report()
        self.assertIn("app.json5", "\n".join(report.get("problems") or []))

    def test_arkts_file_declared_not_dir_only_that_file(self):
        # When `file` names a single file (not a dir), ONLY that file is
        # relaxed. A sibling project backup at tools/ohosTest_backup.ets — which
        # does NOT classify as a test path (no test dir marker, no test-ish
        # name) and is NOT declared — must still trip the freeze (the
        # relaxation stays anchored to the contract, not to the ohosTest
        # naming). GOOD_DESIGN_ARKTS declares exactly the single
        # Ability.test.ets file.
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN_ARKTS)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        self.assertEqual(self._advance(1).returncode, 0)
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        self.assertEqual(self._run("gate_develop.py").returncode, 0)
        self.assertEqual(self._advance(2).returncode, 0)
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
        extra = os.path.join(self.repo, "tools/ohosTest_backup.ets")
        os.makedirs(os.path.dirname(extra), exist_ok=True)
        with open(extra, "w", encoding="utf-8") as f:
            f.write("export default function backup() {}\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        report = self._failure_report()
        self.assertIn("tools/ohosTest_backup.ets", "\n".join(report.get("problems") or []))

    def test_gtest_only_contract_freeze_unchanged(self):
        # A contract with NO arkts entries must behave exactly as before: adding
        # an ohosTest-style project (which classifies as test) is fine, but
        # adding a functional .ets (entry/src/main/…) is a freeze violation with
        # no declared relaxation. Drives the base-class gtest harness
        # (GOOD_DESIGN) directly.
        super()._close_design()
        super()._close_feature_develop()
        super()._author_test()
        p = os.path.join(self.repo, "entry/src/main/ets/pages/Index.ets")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write("export struct Index { build() {} }\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        report = self._failure_report()
        self.assertIn("Index.ets", "\n".join(report.get("problems") or []))


if __name__ == "__main__":
    unittest.main()
