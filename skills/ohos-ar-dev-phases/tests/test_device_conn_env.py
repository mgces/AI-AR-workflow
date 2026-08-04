#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""gate_device_func._merged_env — fresh-window connection replay.

A new window inherits none of the process-level hdc connection env. P0 records
what the run used (connection_env / probed device_serial); the device gate must
fill those gaps so it reaches the SAME device, while never overriding an env the
operator deliberately set in the current shell.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gate_device_func as gdf  # noqa: E402


class TestMergedConnEnv(unittest.TestCase):
    def setUp(self):
        self._saved = dict(gdf._CONN_ENV)
        self._env_keys = ("HDC_WIN_PORT", "HDC_HOST_OVERRIDE",
                          "HDC_BIN", "DEVICE_SERIAL")
        self._saved_os = {k: os.environ.get(k) for k in self._env_keys}
        for k in self._env_keys:
            os.environ.pop(k, None)

    def tearDown(self):
        gdf._CONN_ENV = self._saved
        for k, v in self._saved_os.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_recorded_conn_fills_absent_env(self):
        gdf._CONN_ENV = {"HDC_WIN_PORT": "10086", "DEVICE_SERIAL": "SN-1"}
        env = gdf._merged_env()
        self.assertEqual(env["HDC_WIN_PORT"], "10086")
        self.assertEqual(env["DEVICE_SERIAL"], "SN-1")

    def test_explicit_env_wins_over_recorded(self):
        os.environ["DEVICE_SERIAL"] = "LIVE-SN"
        gdf._CONN_ENV = {"DEVICE_SERIAL": "OLD-SN"}
        env = gdf._merged_env()
        self.assertEqual(env["DEVICE_SERIAL"], "LIVE-SN")

    def test_extra_overrides_all(self):
        gdf._CONN_ENV = {"DEVICE_SERIAL": "SN-1"}
        env = gdf._merged_env({"GATE_NONCE": "abc", "DEVICE_SERIAL": "x"})
        self.assertEqual(env["GATE_NONCE"], "abc")
        self.assertEqual(env["DEVICE_SERIAL"], "x")

    def test_empty_recorded_is_noop(self):
        gdf._CONN_ENV = {}
        env = gdf._merged_env()
        for k in ("HDC_WIN_PORT", "DEVICE_SERIAL"):
            self.assertNotIn(k, env)


if __name__ == "__main__":
    unittest.main()
