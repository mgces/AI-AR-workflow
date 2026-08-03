#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Unit tests for lib/environments.py — the single source of truth for
environment-specific behavior.

Two invariants matter most:
  * openharmony resolves to EXACTLY the strings that used to be hardcoded in the
    gates (zero-behavior-change for existing runs), and a missing `environment`
    field defaults to openharmony (backward compat for pre-refactor pipelines).
  * harmonyos build/product/out_dir are placeholders that HARD-FAIL
    (EnvironmentNotConfigured) until filled — never silently return a wrong value.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import environments as envs  # noqa: E402


class TestOpenHarmonyProfile(unittest.TestCase):
    """openharmony must match the historical hardcoded values verbatim."""

    def setUp(self):
        self.state = {"environment": "openharmony"}

    def test_env_id(self):
        self.assertEqual(envs.env_id(self.state), "openharmony")

    def test_component_type_is_none(self):
        self.assertIsNone(envs.component_type(self.state))

    def test_product(self):
        self.assertEqual(envs.product_form(self.state), "rk3568")

    def test_build_command_verbatim(self):
        self.assertEqual(
            envs.build_command(self.state, "hiview_package"),
            "./build.sh --product-name rk3568 --ccache --build-target hiview_package")

    def test_out_dir(self):
        self.assertEqual(envs.out_dir(self.state), "out/rk3568")

    def test_banners(self):
        self.assertTrue(envs.success_re(self.state).search(
            "=====build rk3568 successful====="))
        self.assertTrue(envs.error_re(self.state).search(
            "=====build rk3568 error====="))

    def test_upload_backend(self):
        self.assertEqual(envs.upload_backend(self.state), "gitcode")

    def test_root_markers(self):
        # verbatim from the old hardcoded P0 source-root check
        self.assertEqual(envs.root_markers(self.state),
                         ["build.sh", "test/testfwk/developer_test"])


class TestBackwardCompat(unittest.TestCase):
    """A pre-refactor pipeline.json has no `environment` field: it must behave
    exactly like openharmony."""

    def test_missing_environment_defaults_openharmony(self):
        for state in ({}, None, {"environment": None}):
            self.assertEqual(envs.env_id(state), "openharmony")
            self.assertEqual(envs.product_form(state), "rk3568")
            self.assertEqual(envs.upload_backend(state), "gitcode")

    def test_unknown_environment_raises(self):
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.env_id({"environment": "bogus"})


class TestHarmonyOSPlaceholders(unittest.TestCase):
    """harmonyos build command + banners are now filled (system/chip differ);
    product/out_dir/root_markers are still placeholders that HARD-FAIL until
    filled; upload backend is gerrit; component_type is required."""

    def _state(self, ctype, device_type="dt-x"):
        return {"environment": "harmonyos", "component_type": ctype,
                "device_type": device_type, "build_target": "make_all"}

    def test_component_type_passthrough(self):
        self.assertEqual(envs.component_type(self._state("system")), "system")
        self.assertEqual(envs.component_type(self._state("chip")), "chip")

    def test_system_build_command(self):
        cmd = envs.build_command(self._state("system"), "make_all")
        self.assertEqual(
            cmd,
            "./build_system.sh --abi-type generic_generic_arm_64only "
            "--device-type dt-x --ccache --build-target make_all "
            "--build-variant root -ninja-args=-j30")

    def test_chip_build_command(self):
        cmd = envs.build_command(self._state("chip"), "make_all")
        self.assertEqual(
            cmd,
            "./build_vendor.sh --abi-type generic_generic_arm_64only "
            "--device-type dt-x --ccache --build-variant user "
            "--gn-args uefi_enable=true --gn-args USE_HM_KERNEL=true "
            "--gn-args singleap=true --build-target make_all "
            "--root-perf-main root")

    def test_build_command_needs_device_type(self):
        # a HarmonyOS build template references {device_type}; missing it in
        # state hard-fails rather than emitting an empty --device-type.
        for ctype in ("system", "chip"):
            with self.assertRaises(envs.EnvironmentNotConfigured):
                envs.build_command(
                    {"environment": "harmonyos", "component_type": ctype}, "t")

    def test_banners(self):
        # success matches "build ... successful"; failure is "do make ... error"
        # (NOT "build ... error").
        for ctype in ("system", "chip"):
            st = self._state(ctype)
            self.assertTrue(envs.success_re(st).search(
                "=====build general successful====="))
            self.assertTrue(envs.error_re(st).search(
                "=====do make general error====="))
            self.assertFalse(envs.error_re(st).search(
                "=====build general error====="))

    def test_product_hard_fails(self):
        for ctype in ("system", "chip"):
            with self.assertRaises(envs.EnvironmentNotConfigured):
                envs.product_form(self._state(ctype))

    def test_out_dir_hard_fails(self):
        for ctype in ("system", "chip"):
            with self.assertRaises(envs.EnvironmentNotConfigured):
                envs.out_dir(self._state(ctype))

    def test_root_markers_hard_fails(self):
        # harmonyos must NOT fall back to the OHOS layout — its source-root
        # markers are a placeholder that hard-fails until filled.
        for ctype in ("system", "chip"):
            with self.assertRaises(envs.EnvironmentNotConfigured):
                envs.root_markers(self._state(ctype))

    def test_upload_backend_is_gerrit(self):
        self.assertEqual(envs.upload_backend(self._state("system")), "gerrit")
        self.assertEqual(envs.upload_backend(self._state("chip")), "gerrit")

    def test_missing_component_type_raises(self):
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.upload_backend({"environment": "harmonyos"})
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.build_command({"environment": "harmonyos"}, "t")

    def test_derive_product_returns_none_for_placeholder(self):
        # derive_product runs at init before a full state exists; a placeholder
        # product form is persisted as None (later gates resolve/hard-fail).
        self.assertIsNone(envs.derive_product("harmonyos", "system"))
        self.assertEqual(envs.derive_product("openharmony", None), "rk3568")


if __name__ == "__main__":
    unittest.main()
