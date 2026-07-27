#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for fingerprint layering — the "only add independent tests" control.

Covers path classification, functional vs test fingerprints, and the layered
drift decision (functional edit rejected; test-only addition allowed).
"""
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import gatelib as gl  # noqa: E402
import advance as adv  # noqa: E402


def git(repo, *a):
    return subprocess.run(["git", "-C", repo, *a], text=True, capture_output=True)


class TestClassifyPath(unittest.TestCase):
    def test_test_dirs(self):
        for p in ("base/hiviewdfx/hiview/test/BUILD.gn",
                  "test/unittest/foo_test.cpp",
                  "a/b/unittest/x.cpp",
                  "svc/moduletest/m.cpp",
                  "comp/fuzztest/xfuzz.cpp"):
            self.assertEqual(gl.classify_path(p), "test", p)

    def test_test_names(self):
        for p in ("src/foo_test.cpp", "src/BarTest.cpp", "src/test_baz.cc"):
            self.assertEqual(gl.classify_path(p), "test", p)

    def test_functional_code(self):
        for p in ("src/manager.cpp", "src/BUILD.gn", "include/api.h",
                  "profile/config.json"):
            self.assertEqual(gl.classify_path(p), "code", p)

    def test_split(self):
        code, test = gl.split_paths(
            ["src/a.cpp", "test/a_test.cpp", "src/BUILD.gn", "test/BUILD.gn"])
        self.assertEqual(code, ["src/BUILD.gn", "src/a.cpp"])
        self.assertEqual(test, ["test/BUILD.gn", "test/a_test.cpp"])


class TestLayeredFingerprint(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.email", "t@t")
        git(self.repo, "config", "user.name", "t")
        self._write("src/manager.cpp", "int f(){return 1;}\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-qm", "base")
        self.base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        self.state = {"repo": self.repo, "git_dir": self.repo, "base_commit": self.base}

    def tearDown(self):
        self.tmp.cleanup()

    def _write(self, rel, content):
        p = os.path.join(self.repo, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write(content)

    def test_add_test_file_does_not_change_functional_fp(self):
        # develop: edit functional code
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        fp1 = gl.functional_fingerprint(self.state)
        # add an independent test file
        self._write("test/manager_test.cpp", "TEST(){}\n")
        fp2 = gl.functional_fingerprint(self.state)
        self.assertEqual(fp1, fp2, "adding a test file must not change functional fp")
        self.assertIn("test/manager_test.cpp", gl.test_path_set(self.state))

    def test_edit_functional_changes_fp(self):
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        fp1 = gl.functional_fingerprint(self.state)
        self._write("src/manager.cpp", "int f(){return 3;}\n")
        self.assertNotEqual(fp1, gl.functional_fingerprint(self.state))

    def test_add_functional_file_changes_fp(self):
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        fp1 = gl.functional_fingerprint(self.state)
        self._write("src/extra.cpp", "int g(){return 9;}\n")
        self.assertNotEqual(fp1, gl.functional_fingerprint(self.state))

    def test_drift_decision_test_only_allowed(self):
        # simulate P2 (feature-develop) close: functional edit done, lock fingerprints
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        self.state["functional_fingerprint"] = gl.functional_fingerprint(self.state)
        self.state["locked_all_paths"] = gl._changed_paths(self.state)
        # P3: add only a test file -> allowed
        self._write("test/manager_test.cpp", "TEST(){}\n")
        ok, msg = adv.check_code_drift(self.state, 3)
        self.assertTrue(ok, msg)

    def test_drift_decision_functional_edit_rejected(self):
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        self.state["functional_fingerprint"] = gl.functional_fingerprint(self.state)
        self.state["locked_all_paths"] = gl._changed_paths(self.state)
        # P3: sneak a functional edit -> rejected
        self._write("src/manager.cpp", "int f(){return 999;}\n")
        ok, msg = adv.check_code_drift(self.state, 3)
        self.assertFalse(ok)
        self.assertIn("functional fingerprint", msg)

    def test_drift_decision_new_functional_file_rejected(self):
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        self.state["functional_fingerprint"] = gl.functional_fingerprint(self.state)
        self.state["locked_all_paths"] = gl._changed_paths(self.state)
        # P3: add a NEW functional file (fp of code set changes AND new non-test path)
        self._write("src/newfeature.cpp", "int h(){return 0;}\n")
        ok, msg = adv.check_code_drift(self.state, 3)
        self.assertFalse(ok)

    def test_legacy_run_uses_whole_tree(self):
        # no functional_fingerprint -> legacy path
        self._write("src/manager.cpp", "int f(){return 2;}\n")
        self.state["code_fingerprint"] = gl.code_fingerprint(self.state)
        ok, _ = adv.check_code_drift(self.state, 3)
        self.assertTrue(ok)
        self._write("src/manager.cpp", "int f(){return 5;}\n")
        ok2, _ = adv.check_code_drift(self.state, 3)
        self.assertFalse(ok2)


if __name__ == "__main__":
    unittest.main()
