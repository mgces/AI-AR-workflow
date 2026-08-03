#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the Path B1 three-phase development sequence: design_orchestrate
(physical phase 1) -> feature_develop (phase 2) -> test_develop (phase 3).

Under Path B1 the old phase-1 three-in-one substate machine is gone: each logical
phase is its own real, signed physical phase. test_develop is now closed by a
REAL signed gate (gate_test_develop.py) proving test code was AUTHORED over the
frozen feature bundle before build verification (phase 4) may begin.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402
import advance as adv  # noqa: E402
import gate_develop as gd  # noqa: E402

GOOD_DESIGN = """# 设计
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
ohos_unittest
## 需测试的功能点
点一
## 真机测试用例构造
真机 hdc 触发

```ar-contract
{
  "contract_version": "2.0",
  "requirements": [{"id": "REQ-001", "desc": "点一"}],
  "build_artifacts": [{"id": "BA-001", "path": "out/rk3568/liba.z.so", "for_requirements": ["REQ-001"]}],
  "test_cases": [{"id": "TC-001", "point": "点一", "gtest": "ATest.Case001", "for_requirements": ["REQ-001"]}],
  "device_cases": [{"id": "DC-001", "desc": "触发", "marker": "AR_DEV_A_OK", "process": "com.demo.ar", "artifact_loaded": "/data/app/liba.z.so", "for_requirements": ["REQ-001"]}],
  "changed_files": [{"id": "FILE-001", "path": "notes.txt", "for_requirements": ["REQ-001"]}]
}
```
"""


class TestB1DevelopSequence(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "specs", "pipeline", "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        subprocess.run(["git", "-C", self.repo, "init", "-q"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.name", "t"], check=True)
        # Real runs keep run-state (specs/pipeline/<run>/) gitignored, so the
        # control/evidence files the gates write never enter the functional
        # fingerprint. Mirror that here or pdir-internal writes would look like
        # code drift and REFUSE the phase-3 close.
        with open(os.path.join(self.repo, ".gitignore"), "w", encoding="utf-8") as f:
            f.write("pdir/\n")
        with open(os.path.join(self.repo, "seed.txt"), "w", encoding="utf-8") as f:
            f.write("seed\n")
        subprocess.run(["git", "-C", self.repo, "add", "-A"], check=True)
        subprocess.run(["git", "-C", self.repo, "commit", "-qm", "base"], check=True)
        base = subprocess.run(
            ["git", "-C", self.repo, "rev-parse", "HEAD"],
            check=True, text=True, capture_output=True).stdout.strip()
        self.run_id = "b1-develop-seq"
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id,
            "repo": self.repo,
            "git_dir": self.repo,
            "base_commit": base,
            "current_phase": 1,
            "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending",
                        "manifest_ref": None, "closed_at_utc": None}
                       for i, n in gl.PHASES],
        })

    def tearDown(self):
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()

    def _run(self, script, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, script), "--pipeline-dir", self.pdir, *extra],
            text=True, capture_output=True)

    def _advance(self, phase):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "advance", "--phase", str(phase)],
            text=True, capture_output=True)

    def _consent(self, phase=1):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"), "--pipeline-dir", self.pdir,
             "consent", "--phase", str(phase), "--token", "reviewer"],
            text=True, capture_output=True)

    # ---- helpers that walk the real phase sequence ----------------------------
    def _close_design(self):
        """phase 1: gate_design -> consent -> advance --phase 1 (now at phase 2)."""
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        cp = self._advance(1)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def _close_feature_develop(self):
        """phase 2: write feature code -> gate_develop -> advance --phase 2."""
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        cp = self._advance(2)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def _author_test(self, suite="ATest"):
        os.makedirs(os.path.join(self.repo, "test"), exist_ok=True)
        with open(os.path.join(self.repo, "test", "a_test.cpp"), "w", encoding="utf-8") as f:
            # carry the Apache-2.0 header so the P3 file-hygiene (H1) gate passes;
            # real authored OHOS sources always ship this block.
            f.write("/*\n * Copyright (c) 2026.\n"
                    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n */\n")
            f.write("TEST(%s, Case001) { EXPECT_TRUE(true); }\n" % suite)

    # ---- phase 1 (design_orchestrate) -----------------------------------------
    def test_phase1_maps_to_design_orchestrate(self):
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(payload["logical_phase_id"], "design_orchestrate")
        self.assertEqual(payload["current_substate"], "awaiting_design_gate")
        self.assertEqual(payload["next_gate"], "gate_design.py")

    def test_gate_develop_refused_without_design_consent(self):
        # hazard #3: design consent (advance.py consent --phase 1) is enforced by
        # gate_develop at phase 2, bound to the phase-1 design entry — not at the
        # phase-1 close. gate_design passes, consent is skipped, phase 1 advances,
        # then gate_develop (phase 2) must refuse for lack of design consent.
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(GOOD_DESIGN)
        self.assertEqual(self._run("gate_design.py").returncode, 0)
        self.assertEqual(self._advance(1).returncode, 0)
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("consent --phase 1", cp.stdout + cp.stderr)

    # ---- phase 2 (feature_develop) --------------------------------------------
    def test_phase2_maps_to_feature_develop(self):
        self._close_design()
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(gl.load_state(self.pdir)["current_phase"], 2)
        self.assertEqual(payload["logical_phase_id"], "feature_develop")
        self.assertEqual(payload["next_gate"], "gate_develop.py")

    def test_gate_develop_writes_feature_freeze_snapshot_at_phase2(self):
        self._close_design()
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        freeze = gl.read_control_json(self.pdir, "test_develop", "development_freeze_snapshot.json")
        self.assertEqual(freeze["logical_phase_id"], "feature_develop")
        self.assertIn("notes.txt", freeze["changed_files"])
        # gate_develop only freezes; it does not derive the test bundle.
        self.assertIsNone(gl.read_control_json(
            self.pdir, "test_develop", "signed_test_scope.json"))

    # ---- phase 3 (test_develop): the Finding-1 signed authorship gate ---------
    def test_phase3_maps_to_test_develop(self):
        self._close_design()
        self._close_feature_develop()
        payload = adv._derive_next_action(self.pdir, gl.load_state(self.pdir))
        self.assertEqual(gl.load_state(self.pdir)["current_phase"], 3)
        self.assertEqual(payload["logical_phase_id"], "test_develop")
        self.assertEqual(payload["current_substate"], "awaiting_test_develop_gate")
        self.assertEqual(payload["next_gate"], "gate_test_develop.py")

    def test_gate_test_develop_pass_when_suite_authored(self):
        self._close_design()
        self._close_feature_develop()
        self._author_test()
        cp = self._run("gate_test_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        # signed PASS was emitted at physical phase 3
        ok, reason, entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertTrue(ok, reason)
        self.assertEqual(entry["gate"], "gate_test_develop.py")
        # authored source is snapshotted + bound into the signed record
        art_paths = [a["path"] for a in entry.get("artifacts", [])]
        self.assertTrue(any("authored" in p for p in art_paths), art_paths)
        # best-effort downstream bundle is still produced
        scope = gl.read_control_json(self.pdir, "test_develop", "signed_test_scope.json")
        self.assertEqual(scope["expected_gtests"], ["ATest.Case001"])

    def test_gate_test_develop_fail_when_suite_not_authored(self):
        # Finding 1 negative case: contract declares a gtest but no new test file
        # names its suite -> authorship gate FAILs, phase 3 cannot close.
        self._close_design()
        self._close_feature_develop()
        # author a test file for the WRONG suite
        self._author_test(suite="WrongSuite")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("ATest.Case001", cp.stdout + cp.stderr)
        ok, _reason, _entry = gl.validate_closing_entry(self.pdir, 3)
        self.assertFalse(ok)

    def test_advance_phase3_allowed_after_authorship_gate(self):
        self._close_design()
        self._close_feature_develop()
        self._author_test()
        self.assertEqual(self._run("gate_test_develop.py").returncode, 0)
        cp = self._advance(3)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        st = gl.load_state(self.pdir)
        self.assertEqual(st["current_phase"], 4)
        self.assertEqual(st["phases"][3]["status"], "passed")

    def test_advance_phase3_refused_when_authorship_gate_skipped(self):
        # reach phase 3, then try to advance to build without running the gate.
        self._close_design()
        self._close_feature_develop()
        cp = self._advance(3)
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(gl.load_state(self.pdir)["current_phase"], 3)
        self.assertEqual(gl.load_state(self.pdir)["phases"][3]["status"], "pending")

    def test_advance_phase3_refused_when_authored_test_deleted(self):
        # gate passes, then the authored snapshot artifact is tampered away:
        # validate_closing_entry must catch the vanished artifact and refuse.
        self._close_design()
        self._close_feature_develop()
        self._author_test()
        self.assertEqual(self._run("gate_test_develop.py").returncode, 0)
        snap = os.path.join(self.pdir, "evidence", "phase3", "authored")
        for fn in os.listdir(snap):
            os.remove(os.path.join(snap, fn))
        cp = self._advance(3)
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    # ---- legacy bypass --------------------------------------------------------
    def test_legacy_run_authorship_gate_bypasses_without_contract(self):
        # a legacy design (sections present but NO ar-contract block) has no
        # contract to enforce authorship against; the gate must AR-CONTRACT-BYPASS
        # PASS rather than fail-closed.
        design_no_contract = GOOD_DESIGN.split("```ar-contract")[0]
        with open(os.path.join(self.pdir, "AR_design.md"), "w", encoding="utf-8") as f:
            f.write(design_no_contract)
        self.assertEqual(
            self._run("gate_design.py", "--allow-missing-contract").returncode, 0)
        self.assertEqual(self._consent().returncode, 0)
        self.assertEqual(self._advance(1).returncode, 0)
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("legacy change\n")
        self.assertEqual(self._run("gate_develop.py").returncode, 0)
        self.assertEqual(self._advance(2).returncode, 0)
        # no contract, no authored tests required -> bypass PASS closes phase 3
        cp = self._run("gate_test_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertIn("BYPASS", cp.stdout + cp.stderr)
        self.assertEqual(self._advance(3).returncode, 0)
        self.assertEqual(gl.load_state(self.pdir)["current_phase"], 4)

    # ---- H1 file-hygiene (license header) blocking at author time -------------
    def _repair_card(self, phase):
        card = gl.read_phase_memory_card(
            self.pdir, parts=("memory_cards", "phase%d.json" % phase))
        repair = gl.read_repair_packet(self.pdir, ("repairs", "current.json"))
        return card, repair

    def test_p2_missing_license_header_fails_and_emits_repair(self):
        # a changed C++ file with no Apache header must FAIL P2 (H1) and route
        # through finalize_control: repair packet + enum FAIL card.
        self._close_design()
        os.makedirs(os.path.join(self.repo, "src"), exist_ok=True)
        with open(os.path.join(self.repo, "src", "a.cpp"), "w", encoding="utf-8") as f:
            f.write("int f() { return 0; }\n")  # no license header
        cp = self._run("gate_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("hygiene", (cp.stdout + cp.stderr).lower())
        card, repair = self._repair_card(2)
        self.assertEqual(card["verdict"], "FAIL")
        self.assertEqual(card["last_failure_class"], "code_ruleset_finding")
        self.assertIn(card["next_expected_action_class"], gl.ACTION_CLASSES)
        self.assertIsNotNone(repair)
        self.assertTrue(repair.get("suspect_files"))

    def test_p2_licensed_header_passes_h1(self):
        # the same file WITH an Apache header clears H1 (no false positive).
        self._close_design()
        # satisfy the contract's declared changed_file (notes.txt); the headered
        # .cpp is the H1 subject and must not add a hygiene finding.
        with open(os.path.join(self.repo, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("some change\n")
        os.makedirs(os.path.join(self.repo, "src"), exist_ok=True)
        with open(os.path.join(self.repo, "src", "a.cpp"), "w", encoding="utf-8") as f:
            f.write("/*\n * Copyright (c) 2026.\n"
                    " * Licensed under the Apache License, Version 2.0.\n */\n"
                    "int f() { return 0; }\n")
        cp = self._run("gate_develop.py")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_p3_missing_license_header_on_authored_test_fails(self):
        # an authored test file with no header must FAIL P3 (H1) and emit a
        # repair packet routed to a repair action.
        self._close_design()
        self._close_feature_develop()
        os.makedirs(os.path.join(self.repo, "test"), exist_ok=True)
        with open(os.path.join(self.repo, "test", "a_test.cpp"), "w", encoding="utf-8") as f:
            f.write("TEST(ATest, Case001) { EXPECT_TRUE(true); }\n")  # no header
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0)
        card, repair = self._repair_card(3)
        self.assertEqual(card["verdict"], "FAIL")
        self.assertEqual(card["last_failure_class"], "test_style_finding")
        self.assertEqual(card["next_expected_action_class"], "repair")
        self.assertIsNotNone(repair)

    # ---- C2: banned-API (rules-only) blocking on authored test code -----------
    def test_p3_disabled_api_in_test_fails_rules_only(self):
        # C2 regression: a properly-headered test that COVERS the contract's
        # suite but calls a banned API (system(), G.FUU.21-CPP) must still FAIL P3 via
        # the --rules-only guard — locking the Fix-1 P3 rule wiring so a future
        # edit cannot silently drop it. Also asserts S3 backfills the finding as a
        # line-level suspect_location the weak model can act on.
        self._close_design()
        self._close_feature_develop()
        os.makedirs(os.path.join(self.repo, "test"), exist_ok=True)
        with open(os.path.join(self.repo, "test", "a_test.cpp"), "w", encoding="utf-8") as f:
            f.write("/*\n * Copyright (c) 2026.\n"
                    " * Licensed under the Apache License, Version 2.0.\n */\n")
            # references suite ATest (authorship coverage passes) but calls a
            # banned API, so ONLY the rules-only check may fail the phase.
            f.write("TEST(ATest, Case001) { system(\"ls\"); EXPECT_TRUE(true); }\n")
        cp = self._run("gate_test_develop.py")
        self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        card, repair = self._repair_card(3)
        self.assertEqual(card["verdict"], "FAIL")
        self.assertEqual(card["last_failure_class"], "test_style_finding")
        self.assertEqual(card["next_expected_action_class"], "repair")
        self.assertIsNotNone(repair)
        # S3: the workbook-backed unsafe-function finding is backfilled as a
        # structured suspect location.
        locs = repair.get("suspect_locations") or []
        self.assertTrue(any(l.get("rule") == "G.FUU.21-CPP" for l in locs), locs)
        self.assertTrue(any(l.get("file", "").endswith("a_test.cpp") for l in locs), locs)


if __name__ == "__main__":
    unittest.main()
