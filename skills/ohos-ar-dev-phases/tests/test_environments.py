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
import json
import sys
import tempfile
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

    def test_build_argv_keeps_shell_metacharacters_literal(self):
        target = "name; touch /tmp/must-not-run"
        argv = envs.build_argv(self.state, target)
        self.assertEqual(argv[-1], target)
        self.assertNotIn(";", argv)

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


class TestArktsRunnerAccessors(unittest.TestCase):
    """The P5 ArkTS branch runner is profile-carried and fail-closed: every
    environment ships the three arkts keys as UNSET placeholders, so the
    accessors HARD-FAIL (EnvironmentNotConfigured) until a real hap-test build +
    hypium runner is filled in. This mirrors build_template's discipline — an
    arkts-kind design must never pass P5 without real execution evidence."""

    def test_openharmony_arkts_keys_unconfigured(self):
        st = {"environment": "openharmony"}
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_test_command(st, "EntryAbilityTest")
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_report_root(st)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_report_glob(st)

    def test_harmonyos_arkts_keys_unconfigured(self):
        st = {"environment": "harmonyos", "component_type": "system"}
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_test_command(st, "EntryAbilityTest")
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_report_root(st)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.arkts_report_glob(st)


class TestExternalProfiles(unittest.TestCase):
    """A deployment may provide the verified HarmonyOS values without editing
    the shared skill checkout. Overrides are still schema-checked and are read
    by every accessor, so a configured profile can drive a real gate run."""

    def setUp(self):
        self.previous = os.environ.get("OHOS_ENV_PROFILE_FILE")
        self.file = tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False)
        json.dump({"profiles": {
            "harmonyos/system": {
                "product": "hm-system",
                "out_dir": "out/hm-system",
                "root_markers": ["build_system.sh", "system/BUILD.gn"],
                "test_framework_path": "tests/developer_test/start.sh",
                "arkts_test_template": "./hypium-runner --suite {suite}",
                "arkts_report_root": "out/test-reports",
                "arkts_report_glob": "**/*.xml",
            },
        }}, self.file)
        self.file.close()
        os.environ["OHOS_ENV_PROFILE_FILE"] = self.file.name

    def tearDown(self):
        os.unlink(self.file.name)
        if self.previous is None:
            os.environ.pop("OHOS_ENV_PROFILE_FILE", None)
        else:
            os.environ["OHOS_ENV_PROFILE_FILE"] = self.previous

    def test_harmonyos_override_drives_all_profile_accessors(self):
        state = {"environment": "harmonyos", "component_type": "system", "device_type": "phone"}
        self.assertEqual(envs.product_form(state), "hm-system")
        self.assertEqual(envs.out_dir(state), "out/hm-system")
        self.assertEqual(envs.root_markers(state), ["build_system.sh", "system/BUILD.gn"])
        self.assertEqual(envs.test_framework_path(state), "tests/developer_test/start.sh")
        self.assertEqual(envs.arkts_test_command(state, "Smoke"), "./hypium-runner --suite Smoke")
        self.assertEqual(envs.arkts_report_root(state), "out/test-reports")
        self.assertEqual(envs.arkts_report_glob(state), "**/*.xml")

    def test_override_rejects_unsafe_root_marker(self):
        with open(self.file.name, "w", encoding="utf-8") as stream:
            json.dump({"profiles": {"harmonyos/system": {"root_markers": ["../outside"]}}}, stream)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.root_markers({"environment": "harmonyos", "component_type": "system"})

    def test_bound_digest_detects_profile_change(self):
        state = {"environment": "harmonyos", "component_type": "system"}
        state["environment_profile_digest"] = envs.profile_digest(state)
        self.assertEqual(envs.product_form({**state}), "hm-system")
        with open(self.file.name, "w", encoding="utf-8") as stream:
            json.dump({"profiles": {"harmonyos/system": {"product": "hm-system-v2"}}}, stream)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.product_form(state)


class TestGerritProfile(unittest.TestCase):
    """A HarmonyOS publisher must be driven by an explicit, validated Gerrit
    profile.  The profile is intentionally test-local here so the repository
    never embeds an internal Gerrit hostname or credential."""

    def setUp(self):
        self.previous = os.environ.get("OHOS_ENV_PROFILE_FILE")
        self.file = tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False)
        json.dump({"profiles": {
            "harmonyos/system": {
                "gerrit_remote": "review",
                "gerrit_project": "platform/frameworks",
                "gerrit_push_ref": "HEAD:refs/for/{base}",
                "gerrit_query_command": [
                    "gerrit-query", "--project", "{project}",
                    "--change", "{change_id}", "--revision", "{sha}"
                ],
                "gerrit_change_url": "https://review.example/{project}/+/change/{change_id}",
                "gerrit_green_labels": {"Code-Review": 2, "Verified": 1},
            },
        }}, self.file)
        self.file.close()
        os.environ["OHOS_ENV_PROFILE_FILE"] = self.file.name

    def tearDown(self):
        os.unlink(self.file.name)
        if self.previous is None:
            os.environ.pop("OHOS_ENV_PROFILE_FILE", None)
        else:
            os.environ["OHOS_ENV_PROFILE_FILE"] = self.previous

    def test_gerrit_config_and_commands_are_rendered(self):
        state = {"environment": "harmonyos", "component_type": "system"}
        config = envs.gerrit_config(state)
        self.assertEqual(config["remote"], "review")
        self.assertEqual(config["project"], "platform/frameworks")
        self.assertEqual(config["push_ref"], "HEAD:refs/for/master")
        self.assertEqual(config["push_ref_for"]("main"), "HEAD:refs/for/main")
        self.assertEqual(
            config["query_command"]("I" + "a" * 40, "deadbeef" * 5),
            ["gerrit-query", "--project", "platform/frameworks",
             "--change", "I" + "a" * 40, "--revision", "deadbeef" * 5])
        self.assertEqual(
            config["change_url"]("I" + "a" * 40),
            "https://review.example/platform/frameworks/+/change/" + "I" + "a" * 40)
        self.assertEqual(config["green_labels"], {"Code-Review": 2, "Verified": 1})

    def test_unconfigured_gerrit_is_actionable(self):
        with open(self.file.name, "w", encoding="utf-8") as stream:
            json.dump({"profiles": {"harmonyos/system": {"gerrit_remote": "review"}}}, stream)
        with self.assertRaises(envs.EnvironmentNotConfigured) as raised:
            envs.gerrit_config({"environment": "harmonyos", "component_type": "system"})
        self.assertIn("gerrit", str(raised.exception).lower())

    def test_gerrit_profile_rejects_shell_and_unknown_template_fields(self):
        with open(self.file.name, "w", encoding="utf-8") as stream:
            json.dump({"profiles": {"harmonyos/system": {
                "gerrit_remote": "review;touch /tmp/x",
            }}}, stream)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.gerrit_config({"environment": "harmonyos", "component_type": "system"})
        with open(self.file.name, "w", encoding="utf-8") as stream:
            json.dump({"profiles": {"harmonyos/system": {
                "gerrit_query_command": ["gerrit-query", "{secret}"],
            }}}, stream)
        with self.assertRaises(envs.EnvironmentNotConfigured):
            envs.gerrit_config({"environment": "harmonyos", "component_type": "system"})


if __name__ == "__main__":
    unittest.main()
