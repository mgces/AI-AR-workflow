#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Shared test mixin: validate every control-layer packet a gate writes.

Wrapping gatelib.write_control_packet turns any test that drives a real gate
into a schema-conformance check — a required-field regression (a handoff missing
to_phase, a cleared repair packet missing phase_name) fails the owning test
loudly instead of being silently absorbed by advisory best-effort validation.
The wrapper never changes a write's result, so gate behavior is unaffected.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402


class ControlWriteValidationMixin:
    """Mix in BEFORE unittest.TestCase. Call _install_control_validation() at
    the end of setUp and _assert_control_writes_valid() at the end of tearDown.
    """

    def _install_control_validation(self):
        self._bad_control_writes = []
        self._real_write_control_packet = gl.write_control_packet

        def _checked(pdir, kind, parts, payload, best_effort=True):
            out = self._real_write_control_packet(
                pdir, kind, parts, payload, best_effort=best_effort)
            v = out.get("validation") or {}
            if not v.get("ok", True):
                self._bad_control_writes.append(
                    (kind, parts, v.get("problems")))
            return out

        gl.write_control_packet = _checked

    def _assert_control_writes_valid(self):
        gl.write_control_packet = self._real_write_control_packet
        self.assertEqual(
            self._bad_control_writes, [],
            "schema-invalid control writes: %r" % (self._bad_control_writes,))
