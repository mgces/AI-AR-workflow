#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_integration.py — Phase 5 (functional + quality impact tests).

Runs a cross-component / module-test suite set through the developer_test
harness (default test type MST) and closes the phase only on a real, freshly
produced aggregate report. Same RTC-independent freshness proof as phase 3
(a new host-clock reports/<timestamp>/ dir).

For integration scenarios that are device-behavioral rather than suite-based,
use gate_device_func.py --phase 7 instead (it is the alternative phase-7 closer).

P5 also signs the quality evidence produced by the AR verification work:
coverage, performance, power, and stability impact reports. P5 passes only when
the functional suite passes, all required quality reports are present, and the
code-review report shows zero blocking issues.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import environments as envs  # noqa: E402

STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
METRIC_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_metric.py",
                              env_var="CODE_RULESET_METRIC")
QUALITY_REPORTS = (
    ("coverage", "coverage_report"),
    ("performance", "performance_report"),
    ("power", "power_report"),
    ("stability", "stability_report"),
)
TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
TEST_AUTHOR_RECEIPT_PARTS = ("test_author", "completion_receipt.json")
TEST_AUTHOR_HANDOFF_PARTS = ("test_author", "handoff_to_device_functional.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
COMPLETION_RECEIPT_PARTS = ("quality_verify", "completion_receipt.json")
HANDOFF_PARTS = ("quality_verify", "handoff_to_upload_review.json")
MAX_RETRY_ROUNDS = 2
MAX_REPAIR_ROUNDS = 2
P7_SUBSTATE_META = {
    "integration_run": {
        "name": "integration-run",
        "goal": "run the integration suites and produce a fresh aggregate report",
        "next_id": "quality_check",
        "next_name": "quality-check",
    },
    "quality_check": {
        "name": "quality-check",
        "goal": "verify the required quality reports for the current bundle",
        "next_id": "review_check",
        "next_name": "review-check",
    },
    "review_check": {
        "name": "review-check",
        "goal": "confirm the review gates report zero blocking issues",
        "next_id": "human_review_await",
        "next_name": "human-review-await",
    },
    "human_review_await": {
        "name": "human-review-await",
        "goal": "wait for a human reviewer to inspect the quality and review artifacts",
        "next_id": None,
        "next_name": None,
    },
}
P7_FAILURE_TO_SUBSTATE = {
    "fresh_report_missing": "integration_run",
    "summary_report_missing": "integration_run",
    "integration_test_failed": "integration_run",
    "quality_reports_missing_or_invalid": "quality_check",
    "code_review_blocked": "review_check",
}


def _unique_ordered(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out



def _test_bundle_context(pdir):
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    matrix = gl.read_control_json(pdir, *TEST_DEVELOP_MATRIX_PARTS) or {}
    status = gl.read_control_json(pdir, *TEST_DEVELOP_STATUS_PARTS) or {}
    receipt = gl.read_control_json(pdir, *TEST_AUTHOR_RECEIPT_PARTS) or {}
    handoff = gl.read_control_json(pdir, *TEST_AUTHOR_HANDOFF_PARTS) or {}
    items = matrix.get("items") or []
    suspect_files = _unique_ordered(
        (scope.get("changed_files_under_test") or []) +
        [path for item in items for path in (item.get("depends_on_files") or [])])
    suspect_tests = _unique_ordered([item.get("expected_gtest") for item in items])
    bundle_revision = (receipt.get("bundle_revision") or handoff.get("bundle_revision")
                       or scope.get("bundle_revision") or status.get("bundle_revision") or "")
    downstream_scope = (receipt.get("downstream_revalidate_scope")
                        or handoff.get("downstream_revalidate_scope")
                        or status.get("downstream_revalidate_scope")
                        or "P4_P5")
    return {
        "bundle_id": "phase1-bundle" if bundle_revision else "",
        "bundle_revision": bundle_revision,
        "suspect_files": suspect_files,
        "suspect_tests": suspect_tests,
        "downstream_revalidate_scope": downstream_scope,
    }



def _repair_round_metadata(pdir, *, phase, bundle_revision_from, recommended_next_action,
                           failure_class=None):
    # Delegates the retry-vs-repair split (§9.1/§9.2) to the shared helper so all
    # gates count and budget both circuit breakers identically.
    prev = gl.read_control_json(pdir, *REPAIR_PACKET_PARTS) or {}
    return gl.repair_round_metadata(
        prev, phase=phase, bundle_revision_from=bundle_revision_from,
        recommended_next_action=recommended_next_action, failure_class=failure_class,
        max_repair_rounds=MAX_REPAIR_ROUNDS, max_retry_rounds=MAX_RETRY_ROUNDS)



def _write_repair_packet(pdir, *, failure_class, problems, last_failure_reason,
                         regen_signals=None, suspect_locations=None):
    bundle = _test_bundle_context(pdir)
    repair_disallowed = gl.regen_signal_present(**(regen_signals or {}))
    base_action = gl.classify_repair_vs_regenerate(
        failure_class, repair_disallowed=repair_disallowed)
    rounds = _repair_round_metadata(
        pdir,
        phase=7,
        bundle_revision_from=bundle.get("bundle_revision") or "",
        recommended_next_action=base_action,
        failure_class=failure_class,
    )
    packet = {
        "phase": 7,
        "phase_name": "quality-verify",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision_from": bundle.get("bundle_revision") or "",
        "active": True,
        "failure_class": failure_class,
        "suspect_files": bundle.get("suspect_files") or [],
        "suspect_locations": gl.normalize_suspect_locations(suspect_locations),
        "suspect_tests": bundle.get("suspect_tests") or [],
        "allowed_fix_scope": [
            "declared test files",
            "quality report inputs",
            "review findings within the current bundle",
        ],
        "must_rerun": ["gate_integration.py"],
        "downstream_revalidate_scope": gl.scope_for_failure(
            failure_class, bundle.get("downstream_revalidate_scope")),
        "repair_disallowed_if": [
            "functional requirement changes are needed",
            "signed contract is unrecoverable",
        ],
        "regen_trigger_if": [
            "fix requires new functional code outside the phase1 freeze",
            "quality verification scope changes",
        ],
        "regen_required": repair_disallowed,
        "regen_signals": sorted(k for k, v in (regen_signals or {}).items() if v),
        "last_failure_reason": last_failure_reason,
        "problems": problems or [],
        "max_retry_rounds": MAX_RETRY_ROUNDS,
        "max_repair_rounds": MAX_REPAIR_ROUNDS,
        "fallback_key": rounds["fallback_key"],
        "retry_rounds": rounds["retry_rounds"],
        "repair_rounds": rounds["repair_rounds"],
        "human_escalation_needed": rounds["human_escalation_needed"],
        "escalation_note": rounds["escalation_note"],
        "recommended_next_action": "human_escalation" if rounds["human_escalation_needed"] else base_action,
    }
    gl.write_repair_packet(pdir, REPAIR_PACKET_PARTS, packet)
    return packet



def _p7_substate_for_result(*, verdict, fresh_dir, quality_ok, review_ok, human_gate_pending=False,
                            failure_class=None, downgraded=False):
    if verdict == "PASS":
        return "human_review_await" if human_gate_pending else "review_check"
    if failure_class in P7_FAILURE_TO_SUBSTATE:
        return P7_FAILURE_TO_SUBSTATE[failure_class]
    if not fresh_dir:
        return "integration_run"
    if not quality_ok:
        return "quality_check"
    if not review_ok:
        return "review_check"
    if downgraded:
        return "quality_check"
    return "integration_run"



def _p7_substate_payload(substate_id, *, tests=None, failures=None, errors=None, fresh_dir=None,
                         quality_ok=None, review_ok=None, downgraded=False,
                         human_escalation_needed=False, escalation_reason=None):
    meta = P7_SUBSTATE_META[substate_id]
    produced = []
    if substate_id in ("quality_check", "review_check", "human_review_await") and fresh_dir:
        produced.append(gl.phase_relpath(5, "summary_report.xml"))
    if substate_id in ("review_check", "human_review_await"):
        produced.append(gl.controls_relpath(*COMPLETION_RECEIPT_PARTS))
    if substate_id == "human_review_await":
        produced.append(gl.controls_relpath(*HANDOFF_PARTS))
    entry_conditions = []
    if substate_id == "integration_run":
        entry_conditions = [
            "phase 4 completion receipt or test-author continuity is present",
            "declared suites and test part are known",
        ]
    elif substate_id == "quality_check":
        entry_conditions = [
            "integration-run produced a fresh summary_report.xml",
            "tests executed for the current bundle revision",
        ]
    elif substate_id == "review_check":
        entry_conditions = [
            "quality-check confirmed the quality reports are acceptable",
            "integration summary remains tied to the current bundle revision",
        ]
    else:
        entry_conditions = [
            "integration-run, quality-check, and review-check all passed",
            "a completion receipt and upload handoff are ready for human inspection",
        ]
    exit_conditions = []
    if substate_id == "integration_run":
        exit_conditions = [
            "fresh integration report directory exists",
            "summary_report.xml reports tests > 0 with zero failures/errors",
        ]
    elif substate_id == "quality_check":
        exit_conditions = [
            "required quality reports are present for the current bundle",
            "no quality contract downgrade is required",
        ]
    elif substate_id == "review_check":
        exit_conditions = [
            "automatic and external review gates both report zero blocking issues",
        ]
    else:
        exit_conditions = [
            "human consent is the only remaining step before advance.py advance --phase 7",
        ]
    notes = []
    if tests is not None:
        notes.append("tests=%s" % tests)
    if failures is not None:
        notes.append("failures=%s" % failures)
    if errors is not None:
        notes.append("errors=%s" % errors)
    if fresh_dir:
        notes.append("fresh_report_dir=%s" % fresh_dir)
    if quality_ok is not None:
        notes.append("quality_ok=%s" % quality_ok)
    if review_ok is not None:
        notes.append("review_ok=%s" % review_ok)
    if downgraded:
        notes.append("quality gate downgraded")
    if human_escalation_needed:
        notes.append("human escalation required")
    return {
        "phase": 7,
        "phase_name": "quality-verify",
        "substate": substate_id,
        "substate_id": substate_id,
        "substate_name": meta["name"],
        "substate_goal": meta["goal"],
        "entry_conditions": entry_conditions,
        "exit_conditions": exit_conditions,
        "expected_artifacts": produced,
        "next_substate_id": meta["next_id"],
        "next_substate_name": meta["next_name"],
        "objective_completed": substate_id == "human_review_await",
        "human_gate_pending": substate_id == "human_review_await",
        "human_escalation_needed": human_escalation_needed,
        "escalation_reason": escalation_reason or "",
        "notes": notes,
    }



def _write_substate_snapshot(pdir, *, substate_id, tests=None, failures=None, errors=None,
                             fresh_dir=None, quality_ok=None, review_ok=None,
                             downgraded=False, human_gate_pending=False,
                             human_escalation_needed=False, escalation_reason=None):
    payload = _p7_substate_payload(
        substate_id,
        tests=tests,
        failures=failures,
        errors=errors,
        fresh_dir=fresh_dir,
        quality_ok=quality_ok,
        review_ok=review_ok,
        downgraded=downgraded,
        human_escalation_needed=human_escalation_needed,
        escalation_reason=escalation_reason,
    )
    gl.write_substate_snapshot(pdir, ("quality_verify", "substate.json"), payload)
    return payload



def _write_completion_controls(pdir, *, tests, failures, errors, fresh_dir,
                               quality_ok, review_ok, downgraded):
    bundle = _test_bundle_context(pdir)
    bundle_revision = bundle.get("bundle_revision") or ""
    substate = _write_substate_snapshot(
        pdir,
        substate_id="human_review_await",
        tests=tests,
        failures=failures,
        errors=errors,
        fresh_dir=fresh_dir,
        quality_ok=quality_ok,
        review_ok=review_ok,
        downgraded=downgraded,
    )
    receipt = {
        "phase": 7,
        "logical_phase_id": "quality_verify",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": True,
        "next_phase": 8,
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
        "tests": tests,
        "failures": failures,
        "errors": errors,
        "fresh_report_dir": fresh_dir,
        "quality_ok": quality_ok,
        "review_ok": review_ok,
        "quality_gate_downgraded": downgraded,
        "logical_substate_id": substate["substate_id"],
        "logical_substate_name": substate["substate_name"],
        "logical_substate_goal": substate["substate_goal"],
        "logical_substate_next_id": substate["next_substate_id"],
        "logical_substate_next_name": substate["next_substate_name"],
    }
    handoff = {
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "from_phase": 7,
        "from_phase_name": "quality-verify",
        "to_phase": 8,
        "to_phase_name": "upload-review",
        "logical_phase_id": "quality_verify",
        "logical_phase_name": "quality-verify",
        "logical_substate_id": substate["substate_id"],
        "logical_substate_name": substate["substate_name"],
        "logical_substate_goal": substate["substate_goal"],
        "objective_completed": True,
        "produced_artifacts": [
            gl.control_artifact_ref(COMPLETION_RECEIPT_PARTS, "completion_receipt"),
            gl.control_artifact_ref(("quality_verify", "substate.json"), "substate_snapshot"),
        ],
        "facts_for_next_phase": [
            "integration/quality verification passed",
            "fresh integration report was produced",
            "bundle revision continuity held",
            "human review await is active before upload-review can advance",
        ],
        "risks": ["quality gate downgraded"] if downgraded else [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 8,
            "action": "upload-review",
            "next_gate": "advance.py advance --phase 7",
        },
        "requires_repair": False,
        "repair_scope_hint": bundle.get("suspect_files") or [],
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
    }
    gl.write_completion_receipt(pdir, COMPLETION_RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, HANDOFF_PARTS, handoff)
    return substate



def _record_result(pdir, verdict, reason, arts, *, cmd, exit_code, testtype,
                   part, suites, tests=None, failures=None, errors=None,
                   fresh_dir=None, quality_ok=None, quality_detail=None,
                   review_ok=None, review_detail=None, downgraded=False,
                   failure_class=None, problems=None, resume_hint=None,
                   suspect_locations=None):
    human_escalation_needed = False
    escalation_reason = ""
    checks = [
        "testtype=%s" % testtype,
        "part=%s" % part,
        "suites=%d" % len(suites),
        "exit_code=%s" % exit_code,
    ]
    if tests is not None:
        checks.append("tests=%s" % tests)
    if failures is not None:
        checks.append("failures=%s" % failures)
    if errors is not None:
        checks.append("errors=%s" % errors)
    if fresh_dir:
        checks.append("fresh_report=%s" % fresh_dir)
    if quality_ok is not None:
        checks.append("quality_ok=%s" % quality_ok)
    if review_ok is not None:
        checks.append("review_ok=%s" % review_ok)
    if downgraded:
        checks.append("quality_gate_downgraded=true")
    substate_id = _p7_substate_for_result(
        verdict=verdict,
        fresh_dir=fresh_dir,
        quality_ok=quality_ok,
        review_ok=review_ok,
        human_gate_pending=(verdict == "PASS"),
        failure_class=failure_class,
        downgraded=downgraded,
    )
    gl.write_phase_summary(
        pdir, 7, "gate_integration.py", verdict, reason, checks=checks,
        extra={
            "testtype": testtype,
            "part": part,
            "suites": suites,
            "exit_code": exit_code,
            "tests": tests,
            "failures": failures,
            "errors": errors,
            "fresh_report_dir": fresh_dir,
            "quality_ok": quality_ok,
            "quality_detail": quality_detail,
            "review_ok": review_ok,
            "review_detail": review_detail,
            "quality_gate_downgraded": downgraded,
            "failure_class": failure_class,
            "logical_substate_id": substate_id,
            "logical_substate_name": P7_SUBSTATE_META[substate_id]["name"],
            "logical_substate_goal": P7_SUBSTATE_META[substate_id]["goal"],
        })
    if verdict == "PASS":
        gl.clear_failure_report(pdir, 7)
        gl.write_repair_packet(
            pdir, REPAIR_PACKET_PARTS,
            gl.build_cleared_repair_packet(
                7, "quality-verify", cleared_by="gate_integration.py",
                bundle_revision_from=_test_bundle_context(pdir).get(
                    "bundle_revision") or ""))
        _write_completion_controls(
            pdir,
            tests=tests,
            failures=failures,
            errors=errors,
            fresh_dir=fresh_dir,
            quality_ok=quality_ok,
            review_ok=review_ok,
            downgraded=downgraded,
        )
    else:
        repair = _write_repair_packet(
            pdir,
            failure_class=failure_class,
            problems=problems or [],
            last_failure_reason=reason,
            suspect_locations=suspect_locations,
        )
        human_escalation_needed = bool(repair.get("human_escalation_needed"))
        escalation_reason = repair.get("escalation_note") or ""
        _write_substate_snapshot(
            pdir,
            substate_id=substate_id,
            tests=tests,
            failures=failures,
            errors=errors,
            fresh_dir=fresh_dir,
            quality_ok=quality_ok,
            review_ok=review_ok,
            downgraded=downgraded,
            human_escalation_needed=human_escalation_needed,
            escalation_reason=escalation_reason,
        )
        gl.write_failure_report(
            pdir, 7, "gate_integration.py", reason,
            problems=problems or [], resume_hint=resume_hint,
            extra={
                "testtype": testtype,
                "part": part,
                "suites": suites,
                "exit_code": exit_code,
                "tests": tests,
                "failures": failures,
                "errors": errors,
                "fresh_report_dir": fresh_dir,
                "quality_ok": quality_ok,
                "quality_detail": quality_detail,
                "review_ok": review_ok,
                "review_detail": review_detail,
                "quality_gate_downgraded": downgraded,
                "failure_class": failure_class,
                "logical_substate_id": substate_id,
                "logical_substate_name": P7_SUBSTATE_META[substate_id]["name"],
                "logical_substate_goal": P7_SUBSTATE_META[substate_id]["goal"],
                "human_escalation_needed": human_escalation_needed,
                "escalation_reason": escalation_reason,
            })
    gl.write_gate_phase_memory_card(
        pdir, 7, "quality-verify", verdict=verdict,
        bundle_revision=_test_bundle_context(pdir).get("bundle_revision"),
        current_blocker=None if verdict == "PASS" else reason,
        next_expected_action_class=(
            "advance" if verdict == "PASS"
            else gl.action_class_for("repair_or_regenerate",
                                     failure_class=failure_class)),
        last_failure_class=None if verdict == "PASS" else failure_class,
        human_escalation_needed=human_escalation_needed,
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*HANDOFF_PARTS))
    # Self-emit this gate's own stage packet from the shared def (§3+§13), so a
    # weak model resuming mid-P7 reads the same goal/entry/exit/failure_classes
    # whether it landed here via `advance.py next` or by running the gate.
    gl.write_gate_stage_packet_from_def(
        pdir, "quality_verify", "quality-verify", physical_phase=7)
    gl.emit(pdir, 7, "gate_integration.py", verdict=verdict, reason=reason,
            cmd=cmd, exit_code=exit_code, artifacts_rel=arts)


def code_review(state, pdir, arts):
    """Run the code_ruleset style guard on the changed C/C++ files.
    Returns (ok, detail). Writes evidence/phase7/code_review_report.txt."""
    gdir = gl.resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    # Reuse the lifecycle's commit-independent changed-path set so newly
    # authored/untracked files are reviewed just like tracked diffs.
    names = gl._changed_paths(state)
    cxx_exts = (".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx")
    cxx = [f for f in names if f.lower().endswith(cxx_exts)]
    rel = "evidence/phase7/code_review_report.txt"
    out_path = os.path.join(pdir, rel)
    if not cxx:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("review_issue_count=0\n")
            f.write("no C/C++ files changed vs %s - code review has no changed C/C++ scope\n" %
                    base[:12])
        arts.append(rel)
        return True, "auto_review_issues=0 no C/C++ changes"
    if not os.path.exists(STYLE_GUARD):
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("review_issue_count=1\n")
            f.write("BLOCKER: style guard not found at %s\n" % STYLE_GUARD)
        arts.append(rel)
        return False, "auto_review_issues=1 guard missing"
    abs_cxx = [os.path.join(gdir, f) for f in cxx if os.path.exists(os.path.join(gdir, f))]
    cp = subprocess.run([sys.executable, STYLE_GUARD, *abs_cxx],
                        text=True, capture_output=True)
    metric_rel = "evidence/phase7/metric_findings.json"
    metric_cp = subprocess.run(
        [sys.executable, METRIC_GUARD, "--json", os.path.join(pdir, metric_rel), *abs_cxx],
        text=True, capture_output=True) if os.path.isfile(METRIC_GUARD) else None
    try:
        with open(os.path.join(pdir, metric_rel), encoding="utf-8") as stream:
            metric_findings = json.load(stream).get("findings") or []
    except (OSError, ValueError, TypeError):
        metric_findings = [{"rule_id": "metric-backend"}]
    if metric_cp is None:
        metric_findings = [{"rule_id": "metric-backend"}]
    elif metric_cp.returncode != 0 and not metric_findings:
        metric_findings = [{"rule_id": "metric-backend"}]
    arts.append(metric_rel)
    issue_count = (0 if cp.returncode == 0 else 1) + (1 if metric_findings else 0)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("review_issue_count=%d\n" % issue_count)
        f.write("changed C/C++ (%d):\n%s\n\n--- code_ruleset_guard (format+rules) ---\nrc=%d\n%s\n%s"
                % (len(cxx), "\n".join(cxx), cp.returncode, cp.stdout, cp.stderr))
    arts.append(rel)
    return cp.returncode == 0 and not metric_findings, (
        "auto_review_issues=%d guard rc=%d metric_findings=%d on %d file(s)" %
        (issue_count, cp.returncode, len(metric_findings), len(cxx)))


def copy_external_review_report(args, pdir, arts):
    """Copy an optional manually produced code review report and require that
    its machine-readable issue count is zero."""
    if not args.code_review_report:
        return True, "external_review=not-provided"
    src = os.path.abspath(args.code_review_report)
    if not os.path.isfile(src):
        return False, "external_review missing: %s" % src
    _, ext = os.path.splitext(src)
    rel = "evidence/phase7/external_code_review_report%s" % (ext or ".txt")
    shutil.copy(src, os.path.join(pdir, rel))
    arts.append(rel)
    ok, detail = gl.parse_review_report_zero_issues(src)
    return ok, "external_review %s %s" % (rel, detail)


def copy_quality_reports(args, pdir, arts):
    """Copy required P5 quality reports into evidence/phase5 and return
    (ok, detail). Each report must already be produced by real test work."""
    details = []
    missing = []
    for attr, label in QUALITY_REPORTS:
        src = getattr(args, label)
        if not src:
            missing.append("--%s" % label.replace("_", "-"))
            continue
        src = os.path.abspath(src)
        if not os.path.isfile(src):
            missing.append("%s=%s" % (label, src))
            continue
        _, ext = os.path.splitext(src)
        if not ext:
            ext = ".txt"
        rel = "evidence/phase7/%s%s" % (label, ext)
        shutil.copy(src, os.path.join(pdir, rel))
        arts.append(rel)
        details.append("%s=%s" % (attr, rel))
    if missing:
        return False, "missing quality reports: %s" % ", ".join(missing)
    return True, "; ".join(details)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--testtype", default="MST", help="developer_test -t value (MST/ST/...)")
    ap.add_argument("--part", help="testpart; default from pipeline.json test.part")
    ap.add_argument("--suites", nargs="+", required=True, help="one or more -ts suite names")
    ap.add_argument("--coverage-report", help="coverage report generated by P5 coverage tests")
    ap.add_argument("--performance-report", help="performance impact report generated by P5 tests")
    ap.add_argument("--power-report", help="power impact report generated by P5 tests")
    ap.add_argument("--stability-report", help="stability impact report generated by P5 tests")
    ap.add_argument("--allow-missing-quality-reports", action="store_true",
                    help="compatibility mode: do not fail when P5 quality reports are absent")
    ap.add_argument("--code-review-report",
                    help="optional external code review report; must declare zero issues")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    part = args.part or state.get("test", {}).get("part")
    if not part:
        sys.exit("ERROR: no testpart (pass --part or set test.part)")
    gl.evidence_dir(pdir, 7)
    dt = os.path.join(repo, "test/testfwk/developer_test")
    reports = os.path.join(dt, "reports")

    before = set(glob.glob(os.path.join(reports, "20*")))
    ts_args = " ".join("-ts %s" % s for s in args.suites)
    # Pass the product form explicitly; developer_test otherwise defaults it to
    # "phone" and fails to locate the testcase output ("tests is not exist").
    # Resolved from the environment profile (openharmony -> rk3568).
    product = envs.product_form(state)
    run_cmd = "./start.sh run -t %s -tp %s %s -p %s" % (args.testtype, part, ts_args, product)
    print("running: (cd %s && %s)" % (dt, run_cmd))
    proc = subprocess.run(run_cmd, shell=True, cwd=dt, text=True, capture_output=True)
    stdout_rel = "evidence/phase7/start_sh_stdout.txt"
    with open(os.path.join(pdir, stdout_rel), "w", encoding="utf-8") as f:
        f.write(proc.stdout + "\n----stderr----\n" + proc.stderr)
    arts = [stdout_rel]

    after = set(glob.glob(os.path.join(reports, "20*")))
    fresh = sorted(after - before)
    if not fresh:
        reason = "no new reports/<timestamp>/ dir produced this run"
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            testtype=args.testtype, part=part, suites=args.suites,
            failure_class="fresh_report_missing",
            problems=["developer_test produced no fresh reports/<timestamp> directory"],
            resume_hint="确认集成测试真正执行并产出新报告后重跑 gate_integration.py")
        sys.exit("PHASE 7 FAIL: harness produced no fresh report dir")
    fresh_dir = fresh[-1]
    summary = os.path.join(fresh_dir, "summary_report.xml")
    if not os.path.exists(summary):
        summary = os.path.join(reports, "latest", "summary_report.xml")
    if not os.path.exists(summary):
        reason = "summary_report.xml missing"
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            testtype=args.testtype, part=part, suites=args.suites,
            fresh_dir=os.path.basename(fresh_dir),
            failure_class="summary_report_missing",
            problems=["summary_report.xml missing from fresh integration report"],
            resume_hint="确认集成测试报告完整产出后重跑 gate_integration.py")
        sys.exit("PHASE 7 FAIL: no summary_report.xml")
    sum_rel = "evidence/phase7/summary_report.xml"
    shutil.copy(summary, os.path.join(pdir, sum_rel))
    arts.append(sum_rel)
    with open(os.path.join(pdir, "evidence/phase7/report_dir.txt"), "w") as f:
        f.write(os.path.basename(fresh_dir) + "\n")
    arts.append("evidence/phase7/report_dir.txt")

    root = ET.parse(summary).getroot()
    tests = int(root.get("tests", "0"))
    failures = int(root.get("failures", "0"))
    errors = int(root.get("errors", "0"))
    test_ok = tests > 0 and failures == 0 and errors == 0

    quality_ok, quality_detail = copy_quality_reports(args, pdir, arts)
    downgraded = False
    if not quality_ok and args.allow_missing_quality_reports:
        # The quality gate (coverage/perf/power/stability) was bypassed. Record
        # that prominently in the SIGNED reason so the downgrade is auditable and
        # a human reviewer (P5 consent) sees it — never a silent pass.
        quality_detail += " (QUALITY-GATE-DOWNGRADED: reports missing, bypass allowed)"
        quality_ok = True
        downgraded = True

    auto_review_ok, auto_review_detail = code_review(state, pdir, arts)
    external_review_ok, external_review_detail = copy_external_review_report(args, pdir, arts)
    review_ok = auto_review_ok and external_review_ok
    review_detail = "%s | %s" % (auto_review_detail, external_review_detail)

    reason = "type=%s tests=%d failures=%d errors=%d fresh=%s | quality:%s | review:%s%s" % (
        args.testtype, tests, failures, errors, os.path.basename(fresh_dir),
        quality_detail, review_detail,
        " | ⚠ QUALITY-GATE-DOWNGRADED" if downgraded else "")
    print(reason)
    verdict = "PASS" if (test_ok and quality_ok and review_ok) else "FAIL"
    problems = []
    if tests <= 0:
        problems.append("summary_report.xml reported tests=0")
    if failures != 0:
        problems.append("summary_report.xml reported failures=%d" % failures)
    if errors != 0:
        problems.append("summary_report.xml reported errors=%d" % errors)
    if not quality_ok:
        problems.append("quality reports check failed: %s" % quality_detail)
    if not review_ok:
        problems.append("review gate failed: %s" % review_detail)
    failure_class = None
    if verdict == "FAIL":
        if not test_ok:
            failure_class = "integration_test_failed"
        elif not quality_ok:
            failure_class = "quality_reports_missing_or_invalid"
        else:
            failure_class = "code_review_blocked"
    # S3: when the integration functional suite itself failed, backfill the
    # failing gtest cases as structured suspect_locations (same parser P5 uses).
    # Quality/review failures carry no per-line locus, so leave it empty there —
    # suspect_files stays the fallback. Advisory only; verdict is unchanged.
    suspect_locations = (
        gl.suspect_locations_from_gtest_xml([summary]) if not test_ok else [])
    _record_result(
        pdir, verdict, reason, arts,
        cmd=run_cmd, exit_code=proc.returncode,
        testtype=args.testtype, part=part, suites=args.suites,
        tests=tests, failures=failures, errors=errors,
        fresh_dir=os.path.basename(fresh_dir),
        quality_ok=quality_ok, quality_detail=quality_detail,
        review_ok=review_ok, review_detail=review_detail,
        downgraded=downgraded, failure_class=failure_class,
        problems=problems,
        suspect_locations=suspect_locations,
        resume_hint="修复集成/质量/review 问题后重跑 gate_integration.py")
    if verdict == "PASS":
        print("PHASE 7 PASS — inspect quality/review artifacts, then record consent:")
        print("  advance.py --pipeline-dir %s consent --phase 7 --token <审核人>" % pdir)
        print("  advance.py --pipeline-dir %s advance --phase 7" % pdir)
    else:
        sys.exit("PHASE 7 FAIL: %s (test_ok=%s quality_ok=%s review_ok=%s)" %
                 (reason, test_ok, quality_ok, review_ok))


if __name__ == "__main__":
    main()
