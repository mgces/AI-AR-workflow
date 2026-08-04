#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""gate_test_ut._xdevice_user_config — point xdevice at the P0-recorded remote
hdc server.

P5 is the only phase that hands device execution to xdevice (start.sh run -t
UT). xdevice's HdcMonitor polls the LOCAL hdcd (127.0.0.1:8710) by default, so
it cannot see devices behind our `hdc -s <host>:<port>` remote server — this is
the "hdcMonitor: device not found" the weak model hits at P5. The helper emits
a user_config.xml <device> node pointing at the remote server, resolved from
the same connection_env gate_device_func uses. No remote connection -> "" (keep
native xdevice behavior, unchanged from pre-change runs).
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gate_test_ut as gtu  # noqa: E402


def _state(conn_env, device_serial=None):
    return {"connection_env": conn_env, "device_serial": device_serial}


class TestXdeviceUserConfig(unittest.TestCase):
    def test_override_host_port_emits_remote(self):
        cfg = gtu._xdevice_user_config(
            _state({"HDC_HOST_OVERRIDE": "192.168.1.23:10086", "DEVICE_SERIAL": "SN-1"}))
        self.assertIn("<hdc>true</hdc>", cfg)
        self.assertIn("<ip>192.168.1.23</ip>", cfg)
        self.assertIn("<port>10086</port>", cfg)
        self.assertIn("<sn>SN-1</sn>", cfg)

    def test_override_without_sn_omits_sn_node(self):
        cfg = gtu._xdevice_user_config(_state({"HDC_HOST_OVERRIDE": "10.0.0.5:8710"}))
        self.assertIn("<ip>10.0.0.5</ip>", cfg)
        self.assertNotIn("<sn>", cfg)
        self.assertNotIn("<sn>", cfg)

    def test_override_missing_port_fails_closed(self):
        # no port -> cannot reach a remote server -> keep xdevice local default
        self.assertEqual(gtu._xdevice_user_config(
            _state({"HDC_HOST_OVERRIDE": "192.168.1.23"})), "")

    def test_override_bad_port_fails_closed(self):
        self.assertEqual(gtu._xdevice_user_config(
            _state({"HDC_HOST_OVERRIDE": "192.168.1.23:abc"})), "")

    def test_win_port_resolves_gateway(self):
        cfg = gtu._xdevice_user_config(_state({"HDC_WIN_PORT": "10086"}))
        self.assertIn("<port>10086</port>", cfg)
        # the WSL default-gateway IP appears as <ip> (windows host reachable)
        self.assertIn("<ip>", cfg)

    def test_no_remote_connection_returns_empty(self):
        self.assertEqual(gtu._xdevice_user_config(_state({})), "")
        self.assertEqual(gtu._xdevice_user_config(
            _state({"HDC_BIN": "/x", "DEVICE_SERIAL": "S"})), "")

    def test_serial_falls_back_to_state(self):
        cfg = gtu._xdevice_user_config(
            _state({"HDC_HOST_OVERRIDE": "1.2.3.4:10086"}, device_serial="STATE-SN"))
        self.assertIn("<sn>STATE-SN</sn>", cfg)


if __name__ == "__main__":
    unittest.main()
