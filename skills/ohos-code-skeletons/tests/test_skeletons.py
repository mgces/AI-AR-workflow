#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Test that the skeleton library passes its own self-consistency verifier and
that a placeholder-substituted skeleton yields plausible source."""
import os
import re
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")


class TestSkeletons(unittest.TestCase):
    def test_verifier_passes(self):
        cp = subprocess.run(
            [sys.executable, os.path.join(ASSETS, "verify_skeletons.py")],
            text=True, capture_output=True)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_plugin_substitution_is_valid_shape(self):
        # substitute placeholders and check the result still has the mandatory
        # plugin structure (REGISTER + lifecycle) and no leftover placeholders.
        with open(os.path.join(ASSETS, "hiview-plugin", "plugin_name.cpp")) as f:
            text = f.read()
        subs = {
            "<plugin_file>": "demo_plugin", "<PLUGIN_NAME>": "DemoPlugin",
            "<PLUGIN_LOG_TAG>": "Demo", "<PLUGIN_WORK_METHOD>": "PollOnce",
            "<RUNTIME_MARKER>": "DEMO_RT", "<E2E_MARKER>": "DEMO_E2E",
        }
        for k, v in subs.items():
            text = text.replace(k, v)
        self.assertIn("REGISTER(DemoPlugin);", text)
        self.assertIn("void DemoPlugin::OnLoad()", text)
        self.assertNotRegex(text, r"<[A-Z][A-Z0-9_]+>")  # no UPPER placeholders left

    def test_test_skeleton_has_test_gni(self):
        for kind in ("test-unittest", "test-moduletest", "test-fuzztest"):
            with open(os.path.join(ASSETS, kind, "BUILD.gn")) as f:
                self.assertIn('import("//build/test.gni")', f.read(), kind)

    def test_external_skills_points_to_existing(self):
        with open(os.path.join(ASSETS, "external-skills.md")) as f:
            text = f.read()
        self.assertIn("ohos-dev-sa-codegen", text)
        self.assertIn("ohos-dev-napi-module", text)


if __name__ == "__main__":
    unittest.main()
