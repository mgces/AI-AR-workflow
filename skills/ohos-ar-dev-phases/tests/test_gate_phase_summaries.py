#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for remaining gate structured summaries/failure reports (P2/P3/P5/P6)."""
import importlib.util
import json
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


gate_build = _load("gate_build")
gate_test_ut = _load("gate_test_ut")
gate_integration = _load("gate_integration")
gate_upload_ci = _load("gate_upload_ci")


class SummaryFixture(unittest.TestCase):
    phase = None

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.run_id = "sum-fixture"
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        self.secret = gl.create_secret(self.run_id)
        gl.save_state(self.pdir, {
            "run_id": self.run_id,
            "consent_tokens": {},
            "phase_scheme": gl.PHASE_SCHEME,
            "phases": [{"id": i, "name": n, "status": "pending"}
                       for i, n in gl.PHASES],
        })
        # Wrap the control writer so every real packet a gate emits during these
        # tests is validated against its schema. A schema-invalid production
        # write (e.g. a handoff missing to_phase) fails the owning test loudly,
        # instead of being silently absorbed by advisory best-effort semantics.
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

    def _summary(self):
        return gl.read_phase_summary(self.pdir, self.phase)

    def _failure(self):
        return gl.read_failure_report(self.pdir, self.phase)

    def _touch_artifact(self, rel, content="ok\n"):
        path = os.path.join(self.pdir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)


class TestBuildSummaryHelpers(SummaryFixture):
    phase = 4

    def test_fail_writes_summary_failure_report_and_repair_packet(self):
        self._touch_artifact("evidence/phase4/log.txt")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-123",
                "changed_files_under_test": ["notes.txt"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["notes.txt"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_P5", "bundle_revision": "rev-123"},
            best_effort=False)
        gate_build._record_result(
            self.pdir, "FAIL", "build failed", ["evidence/phase4/log.txt"],
            cmd="./build.sh", exit_code=1, target="foo",
            banner_ok=False, banner_err=True,
            artifacts_missing=["out/rk3568/liba.z.so"],
            contract_status="ok", failure_class="build_artifact_missing",
            problems=["missing build_artifact: out/rk3568/liba.z.so"],
            resume_hint="重跑")
        s = self._summary()
        f = self._failure()
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertEqual(s["verdict"], "FAIL")
        self.assertEqual(s["failure_class"], "build_artifact_missing")
        self.assertEqual(s["build_artifacts_missing"], ["out/rk3568/liba.z.so"])
        self.assertEqual(f["failure_class"], "build_artifact_missing")
        self.assertIn("missing build_artifact", " ".join(f["problems"]))
        self.assertTrue(repair["active"])
        self.assertEqual(repair["failure_class"], "build_artifact_missing")
        self.assertEqual(repair["must_rerun"], ["gate_build.py"])
        self.assertEqual(repair["artifacts_missing"], ["out/rk3568/liba.z.so"])
        self.assertEqual(repair["bundle_revision_from"], "rev-123")
        self.assertEqual(repair["suspect_files"], ["notes.txt"])
        self.assertEqual(repair["suspect_tests"], ["ATest.Case001"])
        self.assertEqual(repair["repair_rounds"], 1)
        self.assertFalse(repair["human_escalation_needed"])

    def test_repeated_build_failures_trigger_human_escalation(self):
        self._touch_artifact("evidence/phase4/log.txt")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-esc",
                "changed_files_under_test": ["notes.txt"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["notes.txt"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_P5", "bundle_revision": "rev-esc"},
            best_effort=False)
        for _ in range(3):
            gate_build._record_result(
                self.pdir, "FAIL", "build failed", ["evidence/phase4/log.txt"],
                cmd="./build.sh", exit_code=1, target="foo",
                banner_ok=False, banner_err=True,
                artifacts_missing=[],
                contract_status="ok", failure_class="build_verdict_failed",
                problems=["build exited with rc=1"],
                resume_hint="重跑")
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        # the SAME failure_class re-run on the SAME bundle revision is a §9.1
        # retry, not a §9.2 repair window: the retry counter climbs and the
        # retry breaker (max_retry_rounds=2) escalates, while repair_rounds
        # stays at the single open repair window.
        self.assertTrue(repair["human_escalation_needed"])
        self.assertEqual(repair["recommended_next_action"], "human_escalation")
        self.assertEqual(repair["repair_rounds"], 1)
        self.assertEqual(repair["retry_rounds"], 2)

    def test_changed_failure_class_opens_a_new_repair_window(self):
        # a DIFFERENT failure_class on the same bundle revision is a §9.2 repair
        # window, not a §9.1 retry: repair_rounds increments and the retry
        # counter resets for the new failure.
        self._touch_artifact("evidence/phase4/log.txt")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={"bundle_revision": "rev-win",
                     "changed_files_under_test": ["notes.txt"]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{"expected_gtest": "ATest.Case001",
                                "depends_on_files": ["notes.txt"]}]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_P5", "bundle_revision": "rev-win"},
            best_effort=False)
        for fclass in ("build_artifact_missing", "build_verdict_failed"):
            gate_build._record_result(
                self.pdir, "FAIL", "build failed", ["evidence/phase4/log.txt"],
                cmd="./build.sh", exit_code=1, target="foo",
                banner_ok=False, banner_err=True, artifacts_missing=[],
                contract_status="ok", failure_class=fclass,
                problems=["boom"], resume_hint="重跑")
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertEqual(repair["repair_rounds"], 2)
        self.assertEqual(repair["retry_rounds"], 0)
        self.assertFalse(repair["human_escalation_needed"])

    def test_regen_signal_forces_regenerate_in_repair_packet(self):
        # §10 matrix: a build-phase boundary signal (e.g. the fix would expand
        # changed_files) turns an otherwise-repairable failure into a regenerate
        # recommendation, and the active signal is recorded in the packet.
        packet = gate_build._write_repair_packet(
            self.pdir, target="foo", failure_class="build_verdict_failed",
            problems=["boom"], last_failure_reason="boom",
            regen_signals={"changed_files_boundary_expand": True})
        self.assertTrue(packet["regen_required"])
        self.assertIn("changed_files_boundary_expand", packet["regen_signals"])
        self.assertEqual(packet["recommended_next_action"], "regenerate")

    def test_no_regen_signal_keeps_repair_window(self):
        packet = gate_build._write_repair_packet(
            self.pdir, target="foo", failure_class="build_verdict_failed",
            problems=["boom"], last_failure_reason="boom")
        self.assertFalse(packet["regen_required"])
        self.assertEqual(packet["regen_signals"], [])
        self.assertEqual(packet["recommended_next_action"], "repair_window")


class TestUnitTestSummaryHelpers(SummaryFixture):
    phase = 5

    def test_pass_clears_stale_failure_report(self):
        self._touch_artifact("evidence/phase5/x.xml")
        gl.write_failure_report(self.pdir, 5, "gate_test_ut.py", "old fail")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-ut",
                "changed_files_under_test": ["tests/a_test.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["tests/a_test.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_P5", "bundle_revision": "rev-ut"},
            best_effort=False)
        gate_test_ut._record_result(
            self.pdir, "PASS", "tests=3 failures=0 errors=0", ["evidence/phase5/x.xml"],
            cmd="run ut", exit_code=0, test_target="ut_target", suite="Suite", part="part",
            tests=3, failures=0, errors=0, fresh_dir="20260723-100000",
            contract_status="ok", coverage_missing=[])
        s = self._summary()
        self.assertEqual(s["verdict"], "PASS")
        self.assertEqual(s["tests"], 3)
        self.assertIsNone(self._failure())
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        receipt = gl.read_control_json(self.pdir, "test_author", "completion_receipt.json")
        handoff = gl.read_control_json(self.pdir, "test_author", "handoff_to_device_functional.json")
        self.assertFalse(repair["active"])
        self.assertEqual(repair["bundle_revision_from"], "rev-ut")
        self.assertEqual(receipt["bundle_revision"], "rev-ut")
        self.assertTrue(receipt["next_phase_ready"])
        self.assertEqual(handoff["bundle_revision"], "rev-ut")
        self.assertEqual(handoff["recommended_next_action"]["next_gate"], "advance.py advance --phase 5")

    def test_fail_records_missing_gtests(self):
        self._touch_artifact("evidence/phase5/x.xml")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-ut",
                "changed_files_under_test": ["tests/a_test.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["tests/a_test.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_P5", "bundle_revision": "rev-ut"},
            best_effort=False)
        gate_test_ut._record_result(
            self.pdir, "FAIL", "coverage missing", ["evidence/phase5/x.xml"],
            cmd="run ut", exit_code=1, test_target="ut_target", suite="Suite", part="part",
            tests=3, failures=0, errors=0, fresh_dir="20260723-100000",
            contract_status="ok", coverage_missing=["ATest.Case001"],
            failure_class="gtest_coverage_missing",
            problems=["required gtest not passed: ATest.Case001"],
            resume_hint="重跑")
        s = self._summary()
        f = self._failure()
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertEqual(s["missing_gtests"], ["ATest.Case001"])
        self.assertEqual(f["failure_class"], "gtest_coverage_missing")
        self.assertTrue(repair["active"])
        self.assertEqual(repair["must_rerun"], ["gate_test_ut.py"])
        self.assertEqual(repair["bundle_revision_from"], "rev-ut")
        self.assertEqual(repair["suspect_tests"], ["ATest.Case001"])
        self.assertEqual(repair["suspect_files"], ["tests/a_test.cpp"])


class TestIntegrationSummaryHelpers(SummaryFixture):
    phase = 7

    def test_pass_writes_completion_receipt_and_handoff(self):
        self._touch_artifact("evidence/phase7/x.xml")
        gl.write_failure_report(self.pdir, 7, "gate_integration.py", "old fail")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-it",
                "changed_files_under_test": ["tests/integration/a.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["tests/integration/a.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-it"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "completion_receipt.json",
            payload={
                "bundle_revision": "rev-it",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "handoff_to_device_functional.json",
            payload={
                "bundle_revision": "rev-it",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gate_integration._record_result(
            self.pdir, "PASS", "integration ok", ["evidence/phase7/x.xml"],
            cmd="run mst", exit_code=0, testtype="MST", part="part", suites=["SuiteA"],
            tests=2, failures=0, errors=0, fresh_dir="20260723-100000",
            quality_ok=True, quality_detail="all quality reports present",
            review_ok=True, review_detail="auto_review_issues=0", downgraded=False)
        s = self._summary()
        self.assertEqual(s["verdict"], "PASS")
        self.assertIsNone(self._failure())
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        receipt = gl.read_control_json(self.pdir, "quality_verify", "completion_receipt.json")
        handoff = gl.read_control_json(self.pdir, "quality_verify", "handoff_to_upload_review.json")
        self.assertFalse(repair["active"])
        self.assertEqual(repair["bundle_revision_from"], "rev-it")
        self.assertEqual(receipt["bundle_revision"], "rev-it")
        self.assertEqual(receipt["downstream_revalidate_scope"], "P4_to_P6")
        self.assertTrue(receipt["human_gate_pending"])
        self.assertEqual(handoff["bundle_revision"], "rev-it")
        self.assertEqual(handoff["downstream_revalidate_scope"], "P4_to_P6")
        self.assertEqual(handoff["recommended_next_action"]["next_gate"], "advance.py advance --phase 7")
        substate = gl.read_control_json(self.pdir, "quality_verify", "substate.json")
        self.assertEqual(substate["substate_id"], "human_review_await")
        self.assertEqual(substate["substate_name"], "human-review-await")
        self.assertTrue(substate["human_gate_pending"])
        self.assertIsNone(substate["next_substate_id"])
        self.assertEqual(receipt["logical_substate_id"], "human_review_await")
        self.assertEqual(handoff["logical_substate_id"], "human_review_await")
        # §3+§13: the gate self-emits its own stage packet, identical in shape to
        # what advance.py projects, so a resuming weak model reads one source.
        packet = gl.read_stage_packet(
            self.pdir, gl.stage_packet_parts("quality_verify"))
        self.assertEqual(packet["phase_identity"]["phase_id"], "quality_verify")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 7)

    def test_fail_records_quality_and_review_state(self):
        self._touch_artifact("evidence/phase7/x.xml")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-it",
                "changed_files_under_test": ["tests/integration/a.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.Case001",
                "depends_on_files": ["tests/integration/a.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-it"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_author", "completion_receipt.json",
            payload={
                "bundle_revision": "rev-it",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gate_integration._record_result(
            self.pdir, "FAIL", "quality missing", ["evidence/phase7/x.xml"],
            cmd="run mst", exit_code=1, testtype="MST", part="part", suites=["SuiteA"],
            tests=1, failures=0, errors=0, fresh_dir="20260723-100000",
            quality_ok=False, quality_detail="missing quality reports: --coverage-report",
            review_ok=True, review_detail="auto_review_issues=0", downgraded=False,
            failure_class="quality_reports_missing_or_invalid",
            problems=["quality reports check failed: missing quality reports"],
            resume_hint="补报告")
        s = self._summary()
        f = self._failure()
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertFalse(s["quality_ok"])
        self.assertTrue(s["review_ok"])
        self.assertEqual(f["failure_class"], "quality_reports_missing_or_invalid")
        self.assertTrue(repair["active"])
        self.assertEqual(repair["must_rerun"], ["gate_integration.py"])
        self.assertEqual(repair["bundle_revision_from"], "rev-it")
        self.assertEqual(repair["suspect_tests"], ["ATest.Case001"])
        self.assertEqual(repair["suspect_files"], ["tests/integration/a.cpp"])
        substate = gl.read_control_json(self.pdir, "quality_verify", "substate.json")
        self.assertEqual(substate["substate_id"], "quality_check")
        self.assertEqual(substate["substate_name"], "quality-check")
        self.assertFalse(substate["human_gate_pending"])
        self.assertEqual(f["logical_substate_id"], "quality_check")


class TestUploadSummaryHelpers(SummaryFixture):

    phase = 8

    def test_pass_writes_completion_receipt_and_clears_repair(self):
        self._touch_artifact("evidence/phase8/full_diff.patch")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-up",
                "changed_files_under_test": ["src/upload.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.UploadCase",
                "depends_on_files": ["src/upload.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-up"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "quality_verify", "completion_receipt.json",
            payload={
                "bundle_revision": "rev-up",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "quality_verify", "handoff_to_upload_review.json",
            payload={
                "bundle_revision": "rev-up",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gate_upload_ci._record_result(
            self.pdir, "PASS", "upload ok", ["evidence/phase8/full_diff.patch"],
            repo_slug="openharmony/repo", branch="feat/x", pr_number=123,
            overall="success", ci_ok=True, pushed_sha="abc123", pr_head="abc123",
            sha_ok=True, local_review_detail="review_issue_count=0",
            pr_review_detail="review_issue_count=0", mode="push",
            emit_manifest=False)
        s = self._summary()
        self.assertEqual(s["verdict"], "PASS")
        self.assertIsNone(self._failure())
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        receipt = gl.read_control_json(self.pdir, "upload_review", "completion_receipt.json")
        substate = gl.read_control_json(self.pdir, "upload_review", "substate.json")
        self.assertFalse(repair["active"])
        self.assertEqual(repair["bundle_revision_from"], "rev-up")
        self.assertEqual(receipt["bundle_revision"], "rev-up")
        self.assertEqual(receipt["downstream_revalidate_scope"], "P4_to_P6")
        self.assertEqual(receipt["pr"], 123)
        self.assertEqual(receipt["ci_overall"], "success")
        self.assertTrue(receipt["sha_ok"])
        self.assertFalse(receipt["human_gate_pending"])
        self.assertEqual(receipt["logical_substate_id"], "finalize")
        self.assertEqual(receipt["logical_substate_name"], "finalize")
        self.assertEqual(substate["substate_id"], "finalize")
        self.assertTrue(substate["objective_completed"])
        self.assertFalse(substate["human_gate_pending"])
        # §3+§13: the gate self-emits its own stage packet from the shared def.
        packet = gl.read_stage_packet(
            self.pdir, gl.stage_packet_parts("upload_review"))
        self.assertEqual(packet["phase_identity"]["phase_id"], "upload_review")
        self.assertEqual(packet["phase_identity"]["physical_phase"], 8)

    def test_fail_writes_repair_packet_with_bundle_context(self):
        self._touch_artifact("evidence/phase8/full_diff.patch")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-up",
                "changed_files_under_test": ["src/upload.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.UploadCase",
                "depends_on_files": ["src/upload.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-up"},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "quality_verify", "completion_receipt.json",
            payload={
                "bundle_revision": "rev-up",
                "downstream_revalidate_scope": "P4_to_P6",
            },
            best_effort=False)
        gate_upload_ci._record_result(
            self.pdir, "FAIL", "ci red", ["evidence/phase8/full_diff.patch"],
            repo_slug="openharmony/repo", branch="feat/x", pr_number=123,
            overall="failed", ci_ok=False, pushed_sha="abc123", pr_head="abc123",
            sha_ok=True, local_review_detail="review_issue_count=0",
            pr_review_detail="review_issue_count=0", mode="push",
            failure_class="ci_not_green",
            problems=["CI overall result is not success: failed"],
            resume_hint="修复 CI 后重跑", emit_manifest=False)
        s = self._summary()
        f = self._failure()
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        substate = gl.read_control_json(self.pdir, "upload_review", "substate.json")
        self.assertEqual(s["failure_class"], "ci_not_green")
        self.assertEqual(s["logical_substate_id"], "ci_green")
        self.assertEqual(f["failure_class"], "ci_not_green")
        self.assertEqual(f["logical_substate_id"], "ci_green")
        self.assertTrue(repair["active"])
        self.assertEqual(repair["must_rerun"], ["gate_upload_ci.py"])
        self.assertEqual(repair["bundle_revision_from"], "rev-up")
        # a P6 ci_not_green failure touches review/CI/output semantics, so a fix
        # for it invalidates the whole downstream chain (§11), widening the
        # inherited P4_to_P6 bundle scope up to all_downstream.
        self.assertEqual(repair["downstream_revalidate_scope"], "all_downstream")
        self.assertEqual(repair["suspect_tests"], ["ATest.UploadCase"])
        self.assertEqual(repair["suspect_files"], ["src/upload.cpp"])
        self.assertEqual(substate["substate_id"], "ci_green")
        self.assertFalse(substate["human_escalation_needed"])

    def test_precheck_fail_writes_navigation_only_files(self):
        gate_upload_ci._record_result(
            self.pdir, "FAIL", "no consent for phase 6", ["evidence/phase8/full_diff.patch"],
            repo_slug="openharmony/repo", branch="feat/x", pushed_sha="abc123",
            mode="precheck", failure_class="consent_missing",
            problems=["phase 6 consent token missing"],
            resume_hint="先 consent", emit_manifest=False)
        s = self._summary()
        f = self._failure()
        manifest = gl.read_manifest(self.pdir)
        substate = gl.read_control_json(self.pdir, "upload_review", "substate.json")
        self.assertEqual(s["mode"], "precheck")
        self.assertEqual(f["failure_class"], "consent_missing")
        self.assertEqual(substate["substate_id"], "precheck")
        self.assertEqual(manifest, [])

    def test_repeated_sha_conflict_triggers_human_escalation(self):
        self._touch_artifact("evidence/phase8/full_diff.patch")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={
                "bundle_revision": "rev-up-esc",
                "changed_files_under_test": ["src/upload.cpp"],
            },
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "test_intent_matrix.json",
            payload={"items": [{
                "expected_gtest": "ATest.UploadCase",
                "depends_on_files": ["src/upload.cpp"],
            }]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6", "bundle_revision": "rev-up-esc"},
            best_effort=False)
        for _ in range(2):
            gate_upload_ci._record_result(
                self.pdir, "FAIL", "sha mismatch", ["evidence/phase8/full_diff.patch"],
                repo_slug="openharmony/repo", branch="feat/x", pr_number=123,
                overall="success", ci_ok=True, pushed_sha="abc123", pr_head="def456",
                sha_ok=False, local_review_detail="review_issue_count=0",
                pr_review_detail="review_issue_count=0", mode="verify_pr",
                failure_class="pr_head_sha_mismatch",
                problems=["remote PR head SHA does not match pushed SHA"],
                resume_hint="核对 PR head / CI 绑定", emit_manifest=False)
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        substate = gl.read_control_json(self.pdir, "upload_review", "substate.json")
        failure = self._failure()
        self.assertTrue(repair["human_escalation_needed"])
        self.assertEqual(repair["recommended_next_action"], "human_escalation")
        self.assertEqual(substate["substate_id"], "ci_green")
        self.assertTrue(substate["human_escalation_needed"])
        self.assertIn("requires a human decision", substate["escalation_reason"])
        self.assertTrue(failure["human_escalation_needed"])

    def test_is_transport_failure_discriminates_outage_from_red_ci(self):
        # A parsed verdict (exit 0) is authoritative even if the CI is red — an
        # exit-0 process is NEVER a transport failure, so a genuine red CI is
        # never excused as "just flaky".
        class P:
            def __init__(self, rc, out="", err=""):
                self.returncode, self.stdout, self.stderr = rc, out, err
        red_ci = P(0, out='{"overall_result": "failed"}')
        self.assertFalse(gate_upload_ci._is_transport_failure(red_ci))
        # transport markers in stderr on a non-zero exit => instability
        for marker in ("connection reset by peer", "HTTP 503 Service Unavailable",
                       "rate limit exceeded", "could not resolve host: gitcode.com"):
            self.assertTrue(
                gate_upload_ci._is_transport_failure(P(1, err=marker)), marker)
        # non-zero exit with utterly silent output => never reached a verdict
        self.assertTrue(gate_upload_ci._is_transport_failure(P(1)))
        # non-zero exit but a real red-CI JSON on stdout => NOT transport
        self.assertFalse(
            gate_upload_ci._is_transport_failure(
                P(1, out='{"overall_result": "failed"}')))
        self.assertFalse(gate_upload_ci._is_transport_failure(None))

    def test_external_api_instability_escalates_on_same_revision(self):
        # A transient CI/PR endpoint outage recurring on the SAME bundle
        # revision is external instability, not a code defect: it must route to
        # human escalation (§7.5) rather than looping the local repair budget.
        self._touch_artifact("evidence/phase8/full_diff.patch")
        gl.write_control_json(
            self.pdir, "test_develop", "signed_test_scope.json",
            payload={"bundle_revision": "rev-flaky",
                     "changed_files_under_test": ["src/upload.cpp"]},
            best_effort=False)
        gl.write_control_json(
            self.pdir, "test_develop", "phase1_test_develop.json",
            payload={"downstream_revalidate_scope": "P4_to_P6",
                     "bundle_revision": "rev-flaky"},
            best_effort=False)
        for _ in range(2):
            gate_upload_ci._record_result(
                self.pdir, "FAIL", "ci endpoint unreachable",
                ["evidence/phase8/full_diff.patch"],
                repo_slug="openharmony/repo", branch="feat/x", pr_number=123,
                overall="", ci_ok=False, pushed_sha="abc123", pr_head="abc123",
                sha_ok=True, local_review_detail="review_issue_count=0",
                pr_review_detail="review_issue_count=0", mode="verify_pr",
                failure_class="external_api_unstable",
                problems=["CI/PR status query failed at the transport layer"],
                resume_hint="外部 CI 恢复后重跑", emit_manifest=False)
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        substate = gl.read_control_json(self.pdir, "upload_review", "substate.json")
        failure = self._failure()
        self.assertEqual(failure["failure_class"], "external_api_unstable")
        # external_api_unstable stalls in the ci_green substate, same as ci_not_green
        self.assertEqual(substate["substate_id"], "ci_green")
        self.assertTrue(repair["human_escalation_needed"])
        self.assertTrue(substate["human_escalation_needed"])
        self.assertIn("external API instability", substate["escalation_reason"])


if __name__ == "__main__":
    unittest.main()
