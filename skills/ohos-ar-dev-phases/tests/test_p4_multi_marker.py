#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for gate_device_func device-marker coverage (P4 contract device cases)."""
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gdf = _load("gate_device_func")

BASE = dict(nonce="NONCE1", marker="FUNC_OK", runtime_marker="RT_OK",
            e2e_marker="E2E_OK", uptime_before="10.0", uptime_after="20.0",
            host_sha="abc", device_sha="abc")


FULL_CAPTURE = """noise line with no timestamp
07-24 09:59:59.000  999  999 I StaleTag: NONCE1 FUNC_OK stale pre-window line
07-24 10:00:00.500  111  111 I BaseTag: baseline region line
07-24 10:00:02.000  1234  1234 I DemoTag: NONCE1 FUNC_OK RT_OK E2E_OK D1 D2
07-24 10:00:09.000  999  999 I LateTag: NONCE1 FUNC_OK forged post-window line
"""


def cap_with(*markers):
    return "log line NONCE1 FUNC_OK RT_OK E2E_OK " + " ".join(markers)


class TestSummarizeDeviceCases(unittest.TestCase):
    def test_empty_results_report_nothing_verified(self):
        # the bug: all() over [] is vacuously True, so an empty run used to claim
        # every anchor verified. It must report False + a zero count instead.
        s = gdf.summarize_device_cases([])
        self.assertEqual(s["device_cases_evaluated"], 0)
        self.assertFalse(s["process_provenance_verified"])
        self.assertFalse(s["artifact_loaded_verified"])
        self.assertFalse(s["side_effect_verified"])
        self.assertFalse(s["negative_control_verified"])

    def test_none_is_treated_as_empty(self):
        self.assertEqual(gdf.summarize_device_cases(None)["device_cases_evaluated"], 0)

    def test_all_good_cases_verify(self):
        s = gdf.summarize_device_cases([
            {"process_match": True, "artifact_loaded_verified": True,
             "side_effect_ok": True, "negative_control_ok": True},
            {"process_match": True, "artifact_loaded_verified": True,
             "side_effect_ok": True, "negative_control_ok": True},
        ])
        self.assertEqual(s["device_cases_evaluated"], 2)
        self.assertTrue(s["process_provenance_verified"])
        self.assertTrue(s["negative_control_verified"])

    def test_one_bad_case_flips_its_dimension(self):
        s = gdf.summarize_device_cases([
            {"process_match": True, "artifact_loaded_verified": False,
             "side_effect_ok": True, "negative_control_ok": True},
        ])
        self.assertEqual(s["device_cases_evaluated"], 1)
        self.assertTrue(s["process_provenance_verified"])
        self.assertFalse(s["artifact_loaded_verified"])

    def test_empty_summary_does_not_fail_a_marker_only_verdict(self):
        # flipping the summary to False must NOT change the verdict: a run with
        # no contract device_cases still passes on marker/nonce/uptime alone.
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with(), device_markers=[], device_case_results=[], **BASE)
        self.assertTrue(ok, reason)


class TestDeviceMarkerCoverage(unittest.TestCase):
    def test_all_device_markers_present(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with("D1", "D2"), device_markers=["D1", "D2"], **BASE)
        self.assertTrue(ok, reason)
        self.assertIn("device_cases=2/2", reason)

    def test_one_device_marker_missing(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with("D1"), device_markers=["D1", "D2"], **BASE)
        self.assertFalse(ok)
        self.assertIn("MISSING_device_markers=D2", reason)

    def test_empty_device_markers_behaves_as_before(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap_with(), device_markers=[], **BASE)
        self.assertTrue(ok, reason)

    def test_core_marker_still_required(self):
        base = dict(BASE)
        cap = "NONCE1 RT_OK E2E_OK D1"
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text=cap, device_markers=["D1"], **base)
        self.assertFalse(ok)

    def test_trigger_window_used_for_markers(self):
        ok, reason = gdf.evaluate_phase4_verdict(
            cap_text="NONCE1 FUNC_OK RT_OK E2E_OK D1",
            trigger_text="FUNC_OK RT_OK E2E_OK D1",
            trigger_window_found=True,
            device_markers=["D1"],
            **BASE)
        self.assertTrue(ok, reason)
        self.assertIn("trigger_window=True", reason)


class TestHilogWindowing(unittest.TestCase):
    def test_split_capture_windows_by_time(self):
        # timestamp bracketing: only lines whose own hilog timestamp falls inside
        # the host-observed window count. Stale pre-window and forged post-window
        # lines are excluded even though they carry the nonce + markers — this is
        # the anti-forgery guarantee that replaces the old injected fence lines.
        t_bs = gdf._parse_ts("07-24 10:00:00.000")
        t_s = gdf._parse_ts("07-24 10:00:01.000")
        t_e = gdf._parse_ts("07-24 10:00:03.000")
        windows = gdf.split_capture_windows(FULL_CAPTURE, t_bs, t_s, t_e)
        self.assertTrue(windows["baseline_found"])
        self.assertTrue(windows["trigger_found"])
        self.assertIn("baseline region", windows["baseline_text"])
        self.assertNotIn("FUNC_OK", windows["baseline_text"])
        self.assertIn("FUNC_OK", windows["trigger_text"])
        self.assertIn("D1", windows["trigger_text"])
        self.assertNotIn("stale pre-window", windows["trigger_text"])
        self.assertNotIn("post-window", windows["trigger_text"])

    def test_split_capture_windows_unreadable_clock(self):
        # a None boundary (unreadable device clock) leaves that window not-found
        # rather than silently spanning the whole capture.
        t_s = gdf._parse_ts("07-24 10:00:01.000")
        t_e = gdf._parse_ts("07-24 10:00:03.000")
        windows = gdf.split_capture_windows(FULL_CAPTURE, None, t_s, t_e)
        self.assertFalse(windows["baseline_found"])
        self.assertTrue(windows["trigger_found"])

    def test_parse_ts_shape(self):
        # the silent-swallow fix keys off output SHAPE (hdc returns rc=0 even when
        # the remote `date` is missing), so parsing must be exact and fail closed.
        self.assertEqual((7, 24, 10, 0, 1, 500), gdf._parse_ts("07-24 10:00:01.500"))
        # no sub-second support (%N left literal) -> second granularity, not misparse
        self.assertEqual((7, 24, 10, 0, 1, 0), gdf._parse_ts("07-24 10:00:01.%N"))
        # garbage / missing date -> None (the hard clock-read failure signal)
        self.assertIsNone(gdf._parse_ts("date: command not found"))
        self.assertIsNone(gdf._parse_ts(""))

    def test_parse_hilog_pid(self):
        line = "07-24 10:00:02.000  1234  4321 I DemoTag: NONCE1 FUNC_OK"
        self.assertEqual(1234, gdf.parse_hilog_pid(line))
        self.assertIsNone(gdf.parse_hilog_pid("no pid here"))


class TestDeviceCaseInspection(unittest.TestCase):
    def setUp(self):
        self.case = {
            "id": "DC-001",
            "desc": "触发",
            "marker": "D1",
            "process": "foundation",
            "artifact_loaded": "/system/lib64/liba.z.so",
            "side_effect": {"type": "shell_assert", "command": "param get x", "expect": "1"},
            "absent_before_trigger": True,
        }
        self.trigger = "07-24 10:00:02.000  1234  1234 I DemoTag: NONCE1 FUNC_OK RT_OK E2E_OK D1\n"

    def test_full_case_passes(self):
        def probe(pid):
            self.assertEqual(1234, pid)
            return {
                "cmdline": "/system/bin/foundation --service",
                "exe": "/system/bin/foundation",
                "maps": "00400000-... /system/lib64/liba.z.so\n",
            }

        def side(se):
            self.assertEqual("shell_assert", se["type"])
            return {
                "required": True,
                "type": se["type"],
                "command": se["command"],
                "expect": se["expect"],
                "stdout": "1",
                "stderr": "",
                "returncode": 0,
                "ok": True,
            }

        result = gdf.inspect_device_case(
            self.case,
            baseline_text="",
            trigger_text=self.trigger,
            probe_pid=probe,
            run_side_effect=side,
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(1234, result["marker_pid"])
        self.assertTrue(result["process_match"])
        self.assertTrue(result["artifact_loaded_verified"])
        self.assertTrue(result["side_effect_ok"])
        self.assertTrue(result["negative_control_ok"])

    def test_negative_control_fails_when_marker_seen_before_trigger(self):
        result = gdf.inspect_device_case(
            self.case,
            baseline_text="... D1 ...",
            trigger_text=self.trigger,
            probe_pid=lambda pid: {},
            run_side_effect=lambda se: {"ok": True},
        )
        self.assertFalse(result["ok"])
        self.assertTrue(result["present_before_trigger"])
        self.assertIn("marker present before trigger", " ".join(result["problems"]))

    def test_process_mismatch_detected(self):
        result = gdf.inspect_device_case(
            self.case,
            baseline_text="",
            trigger_text=self.trigger,
            probe_pid=lambda pid: {"cmdline": "/system/bin/other", "exe": "/system/bin/other", "maps": ""},
            run_side_effect=lambda se: {"ok": True},
        )
        self.assertFalse(result["ok"])
        self.assertFalse(result["process_match"])
        self.assertIn("process mismatch", " ".join(result["problems"]))

    def test_artifact_not_loaded_detected(self):
        result = gdf.inspect_device_case(
            self.case,
            baseline_text="",
            trigger_text=self.trigger,
            probe_pid=lambda pid: {"cmdline": "/system/bin/foundation", "exe": "/system/bin/foundation", "maps": ""},
            run_side_effect=lambda se: {"ok": True},
        )
        self.assertFalse(result["ok"])
        self.assertFalse(result["artifact_loaded_verified"])
        self.assertEqual("missing", result["artifact_probe"])

    def test_side_effect_failure_detected(self):
        result = gdf.inspect_device_case(
            self.case,
            baseline_text="",
            trigger_text=self.trigger,
            probe_pid=lambda pid: {"cmdline": "/system/bin/foundation", "exe": "/system/bin/foundation", "maps": "/system/lib64/liba.z.so"},
            run_side_effect=lambda se: {"required": True, "ok": False, "stdout": "0", "stderr": "", "returncode": 0},
        )
        self.assertFalse(result["ok"])
        self.assertFalse(result["side_effect_ok"])
        self.assertIn("side effect assertion failed", " ".join(result["problems"]))


class TestFailureClassification(unittest.TestCase):
    def test_non_target_process_classification(self):
        cls = gdf.phase4_failure_class(
            marker_ok=True,
            runtime_ok=True,
            e2e_ok=True,
            artifact_ok=True,
            missing_dm=[],
            trigger_window_found=True,
            device_case_results=[{
                "ok": False,
                "marker_seen": True,
                "negative_control_ok": True,
                "process_required": True,
                "process_match": False,
                "marker_pid": 1234,
                "artifact_required": False,
                "artifact_loaded_verified": True,
                "side_effect_required": False,
                "side_effect_ok": True,
            }],
        )
        self.assertEqual("marker_emitted_by_non_target_process", cls)

    def test_side_effect_failure_classification(self):
        cls = gdf.phase4_failure_class(
            marker_ok=True,
            runtime_ok=True,
            e2e_ok=True,
            artifact_ok=True,
            missing_dm=[],
            trigger_window_found=True,
            device_case_results=[{
                "ok": False,
                "marker_seen": True,
                "negative_control_ok": True,
                "process_required": False,
                "process_match": True,
                "marker_pid": None,
                "artifact_required": False,
                "artifact_loaded_verified": True,
                "side_effect_required": True,
                "side_effect_ok": False,
            }],
        )
        self.assertEqual("side_effect_assertion_failed", cls)


class TestDriverLiteralGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.scen = os.path.join(self.tmp.name, "scenario.sh")

    def tearDown(self):
        self.tmp.cleanup()

    def test_contract_marker_hardcoded_in_driver_flagged(self):
        with open(self.scen, "w") as f:
            f.write('log -t X "D1"\n')
        found = gdf.find_marker_literals([None, self.scen], ["D1", "D2"])
        self.assertIn("D1", found)
        self.assertNotIn("D2", found)


class TestDeviceContinuityHelpers(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "device-sum-fixture"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id,
            "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending"}
                       for i, n in gl.PHASES],
        })
        # Validate every control write these device-phase gate helpers emit.
        self._bad_writes = []
        self._real_write_control_packet = gl.write_control_packet

        def _checked(pdir, kind, parts, payload, best_effort=True):
            out = self._real_write_control_packet(
                pdir, kind, parts, payload, best_effort=best_effort)
            v = out.get("validation") or {}
            if not v.get("ok", True):
                self._bad_writes.append((kind, parts, v.get("problems")))
            return out

        gl.write_control_packet = _checked

    def tearDown(self):
        gl.write_control_packet = self._real_write_control_packet
        try:
            os.remove(self.secret)
        except OSError:
            pass
        self.tmp.cleanup()
        self.assertEqual(
            self._bad_writes, [],
            "schema-invalid control writes: %r" % (self._bad_writes,))

    def test_phase4_completion_controls_bind_bundle_revision(self):
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-dev",
                "changed_files_under_test": ["src/a.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["src/a.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-dev"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "completion_receipt.json",
            payload={"bundle_revision": "rev-dev", "downstream_revalidate_scope": "P4_to_P6"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "handoff_to_device_functional.json",
            payload={"bundle_revision": "rev-dev", "downstream_revalidate_scope": "P4_to_P6"},
            best_effort=False)
        gdf._write_completion_controls(
            self.pdir,
            phase=6,
            arts=["evidence/phase6/hilog_capture.txt"],
            device_case_count=2,
        )
        receipt = gl.read_control_json(self.pdir, "device_functional", "completion_receipt.json")
        handoff = gl.read_control_json(self.pdir, "device_functional", "handoff_to_quality_verify.json")
        self.assertEqual(receipt["bundle_revision"], "rev-dev")
        self.assertEqual(receipt["downstream_revalidate_scope"], "P4_to_P6")
        self.assertTrue(receipt["human_gate_pending"])
        self.assertEqual(handoff["bundle_revision"], "rev-dev")
        self.assertEqual(handoff["downstream_revalidate_scope"], "P4_to_P6")
        self.assertEqual(handoff["recommended_next_action"]["next_gate"], "advance.py advance --phase 6")

    def test_phase4_repair_packet_tracks_revision_and_scope(self):
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-dev",
                "changed_files_under_test": ["src/a.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["src/a.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-dev"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "completion_receipt.json",
            payload={"bundle_revision": "rev-dev", "downstream_revalidate_scope": "P4_to_P6"},
            best_effort=False)
        packet = gdf._write_repair_packet(
            self.pdir,
            phase=6,
            failure_class="marker_missing",
            problems=["functional marker missing"],
            last_failure_reason="marker missing",
        )
        self.assertTrue(packet["active"])
        self.assertEqual(packet["bundle_revision_from"], "rev-dev")
        # a P4 marker_missing failure touches device logic / observation points,
        # so a fix invalidates quality too (§11): the inherited P4_to_P6 bundle
        # scope widens up to P4_to_P7.
        self.assertEqual(packet["downstream_revalidate_scope"], "P4_to_P7")
        self.assertEqual(packet["must_rerun"], ["gate_device_func.py"])
        self.assertEqual(packet["suspect_tests"], ["ATest.Case001"])
        self.assertEqual(packet["suspect_files"], ["src/a.cpp"])


if __name__ == "__main__":
    unittest.main()
