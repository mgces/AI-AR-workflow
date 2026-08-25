#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_build.resolve_artifacts (P2 contract build-artifact coverage)."""
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gate_build = _load("gate_build")


class TestResolveArtifacts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        os.makedirs(os.path.join(self.repo, "out/rk3568"), exist_ok=True)

    def tearDown(self):
        self.tmp.cleanup()

    def _touch(self, rel):
        p = os.path.join(self.repo, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write("x")

    def test_all_present_out_relative(self):
        self._touch("out/rk3568/liba.z.so")
        present, missing, _ = gate_build.resolve_artifacts(
            self.repo, ["liba.z.so"], "out/rk3568")
        self.assertEqual(missing, [])
        self.assertEqual(present, ["liba.z.so"])

    def test_all_present_repo_relative(self):
        self._touch("out/rk3568/sub/libb.z.so")
        present, missing, _ = gate_build.resolve_artifacts(
            self.repo, ["out/rk3568/sub/libb.z.so"], "out/rk3568")
        self.assertEqual(missing, [])

    def test_one_missing(self):
        self._touch("out/rk3568/liba.z.so")
        present, missing, _ = gate_build.resolve_artifacts(
            self.repo, ["liba.z.so", "libmissing.z.so"], "out/rk3568")
        self.assertEqual(present, ["liba.z.so"])
        self.assertEqual(missing, ["libmissing.z.so"])

    def test_absolute_and_traversal_paths_never_count(self):
        outside = os.path.join(os.path.dirname(self.repo), "outside.bin")
        with open(outside, "w") as f:
            f.write("x")
        self.addCleanup(lambda: os.path.exists(outside) and os.remove(outside))
        present, missing, resolved = gate_build.resolve_artifacts(
            self.repo, [outside, "../outside.bin"], "out/rk3568")
        self.assertEqual(present, [])
        self.assertEqual(missing, [outside, "../outside.bin"])
        self.assertTrue(all(value is None for value in resolved.values()))

    def test_symlink_escape_never_counts(self):
        outside = os.path.join(os.path.dirname(self.repo), "outside-link.bin")
        with open(outside, "w") as f:
            f.write("x")
        self.addCleanup(lambda: os.path.exists(outside) and os.remove(outside))
        os.symlink(outside, os.path.join(self.repo, "artifact.bin"))
        present, missing, _ = gate_build.resolve_artifacts(
            self.repo, ["artifact.bin"], "out/rk3568")
        self.assertEqual(present, [])
        self.assertEqual(missing, ["artifact.bin"])


if __name__ == "__main__":
    unittest.main()
