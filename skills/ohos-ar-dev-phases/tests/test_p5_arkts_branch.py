#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the P5 ArkTS/Hypium execution branch (gate_test_ut._run_arkts).

The branch is exercised at the unit level: _record_result is stubbed to
capture the single result the branch records (its real body emits a signed
manifest entry + control artifacts, out of scope here), and the environment
profile accessors are monkeypatched. This isolates the branch's control flow:

  * profile UNSET -> FAIL arkts_runner_unconfigured, exactly one recorded
    result, and SystemExit (no double-record with the caller);
  * configured profile with a FRESH passing JUnit xml -> coverage over the
    arkts Suite.Case ids via the SAME passed_gtests/check_gtest_coverage the
    gtest branch uses;
  * a stale (pre-existing) report is not fresh -> FAIL arkts_fresh_report_missing;
  * a fresh report missing a required case -> coverage miss returned to caller.
"""
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import environments as envs  # noqa: E402


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gtu = _load("gate_test_ut")

PASS_XML = """<?xml version="1.0"?>
<testsuites>
  <testsuite name="EntryAbilityTest">
    <testcase classname="EntryAbilityTest" name="abilityPageTest"/>
  </testsuite>
</testsuites>
"""

FAIL_XML = """<?xml version="1.0"?>
<testsuites>
  <testsuite name="EntryAbilityTest">
    <testcase classname="EntryAbilityTest" name="abilityPageTest">
      <failure message="boom"/>
    </testcase>
  </testsuite>
</testsuites>
"""

CONTRACT = {"test_cases": [
    {"kind": "arkts", "gtest": "EntryAbilityTest.abilityPageTest"},
]}


class _RecordCapture:
    """Stub for gtu._record_result: records (verdict, kwargs) and raises
    SystemExit on FAIL, mirroring the real gate's fail-closed exit so the branch
    can never fall through to a second record."""
    def __init__(self):
        self.calls = []

    def __call__(self, pdir, verdict, reason, arts, **kw):
        self.calls.append((verdict, reason, kw))


class TestP5ArktsBranch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence", "phase5"), exist_ok=True)
        self.report_root = os.path.join(self.repo, "arkts_reports")
        os.makedirs(self.report_root, exist_ok=True)
        self.state = {"repo": self.repo}
        # Capture records instead of signing a manifest / exiting.
        self._orig_record = gtu._record_result
        self.cap = _RecordCapture()
        gtu._record_result = self.cap
        # Neutralize the real subprocess run: the "runner" just drops the xml we
        # want into the report root (simulating hap-test build + hypium run).
        self._orig_run = gtu.subprocess.run

    def tearDown(self):
        gtu._record_result = self._orig_record
        gtu.subprocess.run = self._orig_run
        self.tmp.cleanup()

    def _configure_env(self, xml_body=PASS_XML, produce=True, subdir=""):
        """Monkeypatch the env accessors to a working profile; the runner drops
        `xml_body` into the report root when `produce` is True."""
        envs_mod = gtu.envs
        self._env_orig = (
            envs_mod.arkts_test_command,
            envs_mod.arkts_report_root,
            envs_mod.arkts_report_glob,
        )
        out_dir = os.path.join(self.report_root, subdir) if subdir else self.report_root

        def fake_cmd(state, suite):
            return "run-arkts %s" % suite

        def fake_run(cmd, **kw):
            if produce:
                os.makedirs(out_dir, exist_ok=True)
                with open(os.path.join(out_dir, "result.xml"), "w", encoding="utf-8") as f:
                    f.write(xml_body)

            class _P:
                returncode = 0
                stdout = "ran\n"
                stderr = ""
            return _P()

        envs_mod.arkts_test_command = fake_cmd
        envs_mod.arkts_report_root = lambda state: self.report_root
        envs_mod.arkts_report_glob = lambda state: "**/*.xml"
        gtu.subprocess.run = fake_run

    def _restore_env(self):
        (gtu.envs.arkts_test_command,
         gtu.envs.arkts_report_root,
         gtu.envs.arkts_report_glob) = self._env_orig

    # ---- unconfigured profile -> fail-closed ---------------------------------
    def test_unset_profile_fails_runner_unconfigured(self):
        # The stock openharmony profile leaves the three arkts keys UNSET, so the
        # accessor raises EnvironmentNotConfigured -> the branch records exactly
        # one FAIL with failure_class arkts_runner_unconfigured and does NOT
        # return a second result to the caller (raises to stop the pipeline).
        def raise_unconf(state, *a, **k):
            raise envs.EnvironmentNotConfigured("arkts_test_template is UNSET")

        orig = gtu.envs.arkts_test_command
        gtu.envs.arkts_test_command = raise_unconf
        try:
            with self.assertRaises(SystemExit):
                gtu._run_arkts(self.pdir, {"env": "openharmony"}, CONTRACT, [])
        finally:
            gtu.envs.arkts_test_command = orig
        self.assertEqual(len(self.cap.calls), 1)
        verdict, _reason, kw = self.cap.calls[0]
        self.assertEqual(verdict, "FAIL")
        self.assertEqual(kw.get("failure_class"), "arkts_runner_unconfigured")
        self.assertEqual(kw.get("coverage_missing"), ["EntryAbilityTest.abilityPageTest"])

    # ---- configured + fresh passing report -> coverage OK --------------------
    def test_fresh_pass_report_covers_contract(self):
        self._configure_env(xml_body=PASS_XML, produce=True)
        try:
            arts = []
            ok, required, missing, reason = gtu._run_arkts(
                self.pdir, self.state, CONTRACT, arts)
        finally:
            self._restore_env()
        self.assertTrue(ok, reason)
        self.assertEqual(required, ["EntryAbilityTest.abilityPageTest"])
        self.assertEqual(missing, [])
        self.assertIn("arkts_cov=1/1", reason)
        # evidence: fresh xml copied + coverage note written
        self.assertTrue(any("arkts_result_" in a for a in arts))
        self.assertTrue(any(a.endswith("arkts_coverage.txt") for a in arts))
        cov = os.path.join(self.pdir, "evidence/phase5/arkts_coverage.txt")
        with open(cov, encoding="utf-8") as f:
            self.assertIn("[OK ] EntryAbilityTest.abilityPageTest", f.read())
        # no _record_result: the branch returns to the caller for aggregation
        self.assertEqual(self.cap.calls, [])

    # ---- configured but no fresh report -> fail-closed -----------------------
    def test_stale_report_not_fresh_fails(self):
        # Pre-seed a report BEFORE the run; the runner produces nothing new, so
        # after==before and the branch fails arkts_fresh_report_missing.
        with open(os.path.join(self.report_root, "old.xml"), "w", encoding="utf-8") as f:
            f.write(PASS_XML)
        self._configure_env(produce=False)
        try:
            with self.assertRaises(SystemExit):
                gtu._run_arkts(self.pdir, self.state, CONTRACT, [])
        finally:
            self._restore_env()
        self.assertEqual(len(self.cap.calls), 1)
        verdict, _reason, kw = self.cap.calls[0]
        self.assertEqual(verdict, "FAIL")
        self.assertEqual(kw.get("failure_class"), "arkts_fresh_report_missing")

    # ---- fresh report but a required case failed -> coverage miss ------------
    def test_fresh_report_failing_case_is_miss(self):
        self._configure_env(xml_body=FAIL_XML, produce=True)
        try:
            ok, required, missing, reason = gtu._run_arkts(
                self.pdir, self.state, CONTRACT, [])
        finally:
            self._restore_env()
        self.assertFalse(ok)
        self.assertEqual(missing, ["EntryAbilityTest.abilityPageTest"])
        self.assertIn("MISSING", reason)
        # coverage miss is returned to the caller (which records the single FAIL),
        # not recorded here.
        self.assertEqual(self.cap.calls, [])

    # ---- no arkts entries -> no-op pass --------------------------------------
    def test_no_arkts_entries_is_noop(self):
        gtest_only = {"test_cases": [{"kind": "gtest", "gtest": "FooTest.C1"}]}
        ok, required, missing, reason = gtu._run_arkts(
            self.pdir, self.state, gtest_only, [])
        self.assertTrue(ok)
        self.assertEqual(required, [])
        self.assertEqual(missing, [])
        self.assertEqual(reason, "")
        self.assertEqual(self.cap.calls, [])


if __name__ == "__main__":
    unittest.main()
