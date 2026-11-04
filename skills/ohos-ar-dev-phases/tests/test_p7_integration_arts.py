#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""P7 gate integration: bind the artifact list before the harness runs.

gate_integration.main() used to pass ``arts`` to
``_temporary_xdevice_user_config`` before assigning it, raising
UnboundLocalError on every real P7 run. It then replaced the list with
``[stdout_rel]``, dropping the user_config.xml artifact appended by the
context manager. This regression keeps both behaviors pinned.
"""
import contextlib
import importlib.util
import os
import sys
import tempfile
import types
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
LIB = os.path.join(SCRIPTS, "lib")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, LIB)

import gate_test_ut as gtu  # noqa: E402
import qemu_support  # noqa: E402
import workflow_checks  # noqa: E402


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gate_integration = _load("gate_integration")


class P7IntegrationArtsTest(unittest.TestCase):
    def test_arts_is_bound_before_harness_and_keeps_config_artifact(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "evidence", "phase7"))
            state = {"repo": root, "run_id": "p7-arts",
                     "test": {"part": "hiview"}}
            recorded = {}
            proc = types.SimpleNamespace(returncode=0, stdout="ok", stderr="")

            @contextlib.contextmanager
            def fake_config(_state, _dt, _pdir, arts, phase=5):
                arts.append("evidence/phase7/user_config.xml")
                yield

            def fake_record(*args, **kwargs):
                recorded["args"] = args
                recorded["kwargs"] = kwargs

            argv = ["gate_integration.py", "--pipeline-dir", root,
                    "--part", "hiview", "--suites", "SuiteA"]
            with mock.patch.object(gate_integration.gl, "load_state", return_value=state), \
                    mock.patch.object(gate_integration.gl, "require_current_phase"), \
                    mock.patch.object(gate_integration.gl, "evidence_dir"), \
                    mock.patch.object(gate_integration.gl, "load_signed_contract",
                                      return_value=(True, {}, "")), \
                    mock.patch.object(gate_integration.gl, "contract_required_suites",
                                      return_value=set()), \
                    mock.patch.object(gate_integration.envs, "product_form",
                                      return_value="rk3568"), \
                    mock.patch.object(gate_integration, "_record_result",
                                      side_effect=fake_record), \
                    mock.patch.object(gate_integration.subprocess, "run",
                                      return_value=proc), \
                    mock.patch.object(gate_integration.glob, "glob", return_value=[]), \
                    mock.patch.object(workflow_checks, "enforce"), \
                    mock.patch.object(gtu, "_temporary_xdevice_user_config", fake_config), \
                    mock.patch.object(qemu_support, "test_environment", return_value={}), \
                    mock.patch.object(sys, "argv", argv):
                with self.assertRaises(SystemExit):
                    gate_integration.main()

            self.assertEqual(
                list(recorded["args"][3]),
                ["evidence/phase7/user_config.xml",
                 "evidence/phase7/start_sh_stdout.txt"])


if __name__ == "__main__":
    unittest.main()
