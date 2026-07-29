#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_test_ut.py — Phase 3 (test authoring + verification).

Builds the ohos_unittest target, then runs it on the rk3568 via the official
developer_test harness and closes the phase ONLY on a real, freshly-produced
test report:

  1. build the test target (success banner in post-launch build.log tail);
  2. snapshot test/testfwk/developer_test/reports/ BEFORE the run;
  3. run:  ./start.sh run -t UT -tp <part> -ts <suite>
  4. identify the NEW reports/<host-timestamp>/ dir (set difference — the HOST
     clock is correct, so a fresh dir is an RTC-independent freshness proof);
  5. parse reports/latest/summary_report.xml <testsuites name="summary_report">
     for tests/failures/errors.

Pass iff: a fresh report dir was created AND tests>0 AND failures==0 AND errors==0
AND every test_cases[].gtest declared in the signed ar-contract appears as a
PASSED case in the fresh result xmls (full coverage of the AR_design test points).
"""
import argparse
import glob
import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import environments as envs  # noqa: E402

TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
COMPLETION_RECEIPT_PARTS = ("test_author", "completion_receipt.json")
HANDOFF_PARTS = ("test_author", "handoff_to_device_functional.json")
MAX_RETRY_ROUNDS = 2
MAX_REPAIR_ROUNDS = 2


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
    items = matrix.get("items") or []
    suspect_files = _unique_ordered(
        (scope.get("changed_files_under_test") or []) +
        [path for item in items for path in (item.get("depends_on_files") or [])])
    suspect_tests = _unique_ordered([item.get("expected_gtest") for item in items])
    bundle_revision = scope.get("bundle_revision") or status.get("bundle_revision") or ""
    return {
        "bundle_id": "phase1-bundle" if bundle_revision else "",
        "bundle_revision": bundle_revision,
        "suspect_files": suspect_files,
        "suspect_tests": suspect_tests,
        "downstream_revalidate_scope": status.get("downstream_revalidate_scope") or "P4_P5",
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
        phase=5,
        bundle_revision_from=bundle.get("bundle_revision") or "",
        recommended_next_action=base_action,
        failure_class=failure_class,
    )
    packet = {
        "phase": 5,
        "phase_name": "test-author",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision_from": bundle.get("bundle_revision") or "",
        "active": True,
        "failure_class": failure_class,
        "suspect_files": bundle.get("suspect_files") or [],
        "suspect_locations": gl.normalize_suspect_locations(suspect_locations),
        "suspect_tests": bundle.get("suspect_tests") or [],
        "allowed_fix_scope": ["declared test files", "unit-test target inputs"],
        "must_rerun": ["gate_test_ut.py"],
        "downstream_revalidate_scope": gl.scope_for_failure(
            failure_class, bundle.get("downstream_revalidate_scope")),
        "repair_disallowed_if": [
            "functional requirement changes are needed",
            "signed contract is unrecoverable",
        ],
        "regen_trigger_if": [
            "fix requires new functional code outside the phase1 freeze",
            "required gtest set changes",
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



def _write_completion_controls(pdir, *, tests, failures, errors, fresh_dir, coverage_missing):
    bundle = _test_bundle_context(pdir)
    bundle_revision = bundle.get("bundle_revision") or ""
    receipt = {
        "phase": 5,
        "logical_phase_id": "test_author",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": False,
        "next_phase": 6,
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
        "tests": tests,
        "failures": failures,
        "errors": errors,
        "fresh_report_dir": fresh_dir,
        "missing_gtests": coverage_missing or [],
    }
    handoff = {
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "from_phase": 5,
        "from_phase_name": "test-author",
        "to_phase": 6,
        "to_phase_name": "device-functional",
        "logical_phase_id": "test_author",
        "logical_phase_name": "test-author",
        "objective_completed": True,
        "produced_artifacts": [
            gl.control_artifact_ref(COMPLETION_RECEIPT_PARTS, "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "unit-test verification passed",
            "fresh developer_test report was produced",
            "bundle revision continuity held",
        ],
        "risks": [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 6,
            "action": "device-functional",
            "next_gate": "advance.py advance --phase 5",
        },
        "requires_repair": False,
        "repair_scope_hint": bundle.get("suspect_files") or [],
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
    }
    gl.write_completion_receipt(pdir, COMPLETION_RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, HANDOFF_PARTS, handoff)



def _record_result(pdir, verdict, reason, arts, *, cmd, exit_code, test_target,
                   suite, part, tests=None, failures=None, errors=None,
                   fresh_dir=None, contract_status=None, coverage_missing=None,
                   failure_class=None, problems=None, resume_hint=None,
                   suspect_locations=None):

    checks = [
        "target=%s" % test_target,
        "suite=%s" % suite,
        "part=%s" % part,
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
    if contract_status:
        checks.append("contract=%s" % contract_status)
    if coverage_missing:
        checks.append("missing_gtests=%d" % len(coverage_missing))
    gl.write_phase_summary(
        pdir, 5, "gate_test_ut.py", verdict, reason, checks=checks,
        extra={
            "test_target": test_target,
            "suite": suite,
            "part": part,
            "exit_code": exit_code,
            "tests": tests,
            "failures": failures,
            "errors": errors,
            "fresh_report_dir": fresh_dir,
            "contract_status": contract_status,
            "missing_gtests": coverage_missing or [],
            "failure_class": failure_class,
        })
    if verdict == "PASS":
        gl.clear_failure_report(pdir, 5)
        gl.write_repair_packet(
            pdir, REPAIR_PACKET_PARTS,
            gl.build_cleared_repair_packet(
                5, "test-author", cleared_by="gate_test_ut.py",
                bundle_revision_from=_test_bundle_context(pdir).get(
                    "bundle_revision") or ""))
        _write_completion_controls(
            pdir,
            tests=tests,
            failures=failures,
            errors=errors,
            fresh_dir=fresh_dir,
            coverage_missing=coverage_missing,
        )
    else:
        gl.write_failure_report(
            pdir, 5, "gate_test_ut.py", reason,
            problems=problems or [], resume_hint=resume_hint,
            extra={
                "test_target": test_target,
                "suite": suite,
                "part": part,
                "exit_code": exit_code,
                "tests": tests,
                "failures": failures,
                "errors": errors,
                "fresh_report_dir": fresh_dir,
                "contract_status": contract_status,
                "missing_gtests": coverage_missing or [],
                "failure_class": failure_class,
            })
        _write_repair_packet(
            pdir,
            failure_class=failure_class,
            problems=problems or [],
            last_failure_reason=reason,
            suspect_locations=suspect_locations,
        )
    gl.write_gate_phase_memory_card(
        pdir, 5, "test-author", verdict=verdict,
        bundle_revision=_test_bundle_context(pdir).get("bundle_revision"),
        current_blocker=None if verdict == "PASS" else reason,
        forbidden_actions=["modify_functional_code_outside_test_scope"],
        next_expected_action_class=(
            "advance" if verdict == "PASS"
            else gl.action_class_for("repair_or_regenerate",
                                     failure_class=failure_class)),
        last_failure_class=None if verdict == "PASS" else failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*HANDOFF_PARTS))
    gl.write_gate_stage_packet_from_def(
        pdir, "test_author", "test-author", physical_phase=5)
    gl.emit(pdir, 5, "gate_test_ut.py", verdict=verdict, reason=reason,
            cmd=cmd, exit_code=exit_code, artifacts_rel=arts)


def passed_gtests(result_xml_paths):
    """Return the set of PASSED gtest ids ("classname.name") across the given
    JUnit-style result xmls. A <testcase> is passed iff it has no <failure> and
    no <error> child. classname carries the GTest suite; name carries the case."""
    passed = set()
    for path in result_xml_paths:
        try:
            root = ET.parse(path).getroot()
        except Exception:
            continue
        for tc in root.iter("testcase"):
            name = tc.get("name")
            if not name:
                continue
            suite = tc.get("classname") or ""
            failed = any(child.tag in ("failure", "error") for child in tc)
            if not failed:
                passed.add("%s.%s" % (suite, name) if suite else name)
    return passed


def failed_gtest_locations(result_xml_paths):
    """S3 backfill for P5. Thin wrapper over the shared gatelib parser (also used
    by P7 integration) so both gtest phases extract failing-case locations the
    same way. See gl.suspect_locations_from_gtest_xml."""
    return gl.suspect_locations_from_gtest_xml(result_xml_paths)


def check_gtest_coverage(required, passed):
    """Return (ok, missing). Every required "Suite.Case" must be in the passed
    set. Exact classname.name match; parameterized names emit as Suite/0.Case."""
    missing = [g for g in required if g not in passed]
    return (not missing), missing


def build_target(repo, target, pdir, state):
    """Build the test target; return (ok, tail_rel). Captures build.sh's own
    stdout as authoritative evidence (out/<product>/build.log can rotate/stay
    empty). Build command + success banner come from the environment profile."""
    cmd = envs.build_command(state, target)
    success_re = envs.success_re(state)
    print("running: %s" % cmd)
    tail_rel = "evidence/phase5/test_build_stdout.log"
    path = os.path.join(pdir, tail_rel)
    with open(path, "w", encoding="utf-8") as logf:
        proc = subprocess.Popen(cmd, shell=True, cwd=repo, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=1)
        for line in proc.stdout:
            sys.stdout.write(line)
            logf.write(line)
        rc = proc.wait()
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    ok = rc == 0 and bool(success_re.search(text))
    return ok, tail_rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--test-target", required=True, help="GN unittest target to build")
    ap.add_argument("--part", help="testpart; default from pipeline.json test.part")
    ap.add_argument("--suite", required=True, help="testsuit name (binary name)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    part = args.part or state.get("test", {}).get("part")
    if not part:
        sys.exit("ERROR: no testpart (pass --part or set test.part)")
    gl.evidence_dir(pdir, 5)
    dt = os.path.join(repo, "test/testfwk/developer_test")
    reports = os.path.join(dt, "reports")

    arts = []

    # 1. build the test target
    bok, tail_rel = build_target(repo, args.test_target, pdir, state)
    arts.append(tail_rel)
    if not bok:
        reason = "test target build failed: %s" % args.test_target
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd="build %s" % args.test_target, exit_code=None,
            test_target=args.test_target, suite=args.suite, part=part,
            failure_class="test_target_build_failed",
            problems=["build failed for unit-test target %s" % args.test_target],
            resume_hint="修复单测构建问题后重跑 gate_test_ut.py")
        sys.exit("PHASE 5 FAIL: test target build failed")

    # 2. snapshot report dirs before the run
    before = set(glob.glob(os.path.join(reports, "20*")))

    # Pin the product form explicitly and consistently with gate_integration
    # (e.g. rk3568, NOT the harness default "phone"). developer_test defaults
    # productform to "phone", which collapses the testcase path to a
    # non-existent ./tests (harness then finds 0 cases). The product is resolved
    # from the environment profile; forward it as -p so out/<product>/tests
    # resolves. This only selects where the harness looks — verdict still comes
    # solely from the freshly-produced summary_report.xml below.
    product = envs.product_form(state)
    run_cmd = "./start.sh run -t UT -tp %s -ts %s -p %s" % (part, args.suite, product)
    print("running: (cd %s && %s)" % (dt, run_cmd))
    proc = subprocess.run(run_cmd, shell=True, cwd=dt, text=True, capture_output=True)
    stdout_rel = "evidence/phase5/start_sh_stdout.txt"
    with open(os.path.join(pdir, stdout_rel), "w", encoding="utf-8") as f:
        f.write(proc.stdout + "\n----stderr----\n" + proc.stderr)
    arts.append(stdout_rel)

    # 4. find the NEW report dir (RTC-independent freshness via host clock)
    after = set(glob.glob(os.path.join(reports, "20*")))
    fresh = sorted(after - before)
    if not fresh:
        reason = "no new reports/<timestamp>/ dir produced this run"
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            test_target=args.test_target, suite=args.suite, part=part,
            failure_class="fresh_report_missing",
            problems=["developer_test produced no fresh reports/<timestamp> directory"],
            resume_hint="确认 developer_test 真正执行并产出新报告后重跑 gate_test_ut.py")
        sys.exit("PHASE 5 FAIL: harness produced no fresh report dir")
    fresh_dir = fresh[-1]
    with open(os.path.join(pdir, "evidence/phase5/report_dir.txt"), "w") as f:
        f.write(os.path.basename(fresh_dir) + "\n")
    arts.append("evidence/phase5/report_dir.txt")

    # 5. parse summary_report.xml (prefer the fresh dir; fall back to latest)
    summary = os.path.join(fresh_dir, "summary_report.xml")
    if not os.path.exists(summary):
        summary = os.path.join(reports, "latest", "summary_report.xml")
    if not os.path.exists(summary):
        reason = "summary_report.xml not found in fresh report dir"
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            test_target=args.test_target, suite=args.suite, part=part,
            fresh_dir=os.path.basename(fresh_dir),
            failure_class="summary_report_missing",
            problems=["summary_report.xml missing from fresh developer_test report"],
            resume_hint="确认 developer_test 产出 summary_report.xml 后重跑 gate_test_ut.py")
        sys.exit("PHASE 5 FAIL: no summary_report.xml")
    sum_rel = "evidence/phase5/summary_report.xml"
    shutil.copy(summary, os.path.join(pdir, sum_rel))
    arts.append(sum_rel)
    # also snapshot per-suite result xmls
    result_rels = []
    for rx in glob.glob(os.path.join(fresh_dir, "result", "**", "*.xml"), recursive=True):
        rrel = "evidence/phase5/result_%s" % os.path.basename(rx)
        shutil.copy(rx, os.path.join(pdir, rrel))
        arts.append(rrel)
        result_rels.append(rrel)

    root = ET.parse(summary).getroot()
    tests = int(root.get("tests", "0"))
    failures = int(root.get("failures", "0"))
    errors = int(root.get("errors", "0"))
    numeric_ok = tests > 0 and failures == 0 and errors == 0
    reason = "tests=%d failures=%d errors=%d fresh=%s" % (
        tests, failures, errors, os.path.basename(fresh_dir))

    # CONTRACT COVERAGE (P3 hard gate): every test_cases[].gtest declared in the
    # signed ar-contract must appear as a PASSED case in the freshly-produced
    # result xmls. This verifies the tests were written and verified exactly per
    # the AR_design test points. Recovered from the HMAC-signed AR_design.
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    coverage_ok = True
    missing = []
    contract_status = "ok" if c_ok else ""
    if c_ok:
        required = [c["gtest"] for c in contract["test_cases"]]
        result_paths = [os.path.join(pdir, r) for r in result_rels]
        passed = passed_gtests(result_paths)
        coverage_ok, missing = check_gtest_coverage(required, passed)
        cov_rel = "evidence/phase5/gtest_coverage.txt"
        with open(os.path.join(pdir, cov_rel), "w", encoding="utf-8") as f:
            f.write("required (from ar-contract): %d\npassed in report: %d\n\n"
                    % (len(required), len(passed)))
            for g in required:
                f.write("[%s] %s\n" % ("OK " if g in passed else "MISS", g))
            if missing:
                f.write("\nMISSING passed cases: %s\n" % ", ".join(missing))
        arts.append(cov_rel)
        reason += " gtest_cov=%d/%d" % (len(required) - len(missing), len(required))
        if missing:
            reason += " MISSING: %s" % ", ".join(missing)
    elif "absent" in c_detail:
        contract_status = "absent"
        reason += " (AR-CONTRACT-BYPASS: %s)" % c_detail
    else:
        reason = "ar-contract unrecoverable: %s" % c_detail
        _record_result(
            pdir, "FAIL", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            test_target=args.test_target, suite=args.suite, part=part,
            tests=tests, failures=failures, errors=errors,
            fresh_dir=os.path.basename(fresh_dir),
            contract_status="unrecoverable",
            failure_class="ar_contract_unrecoverable",
            problems=["signed ar-contract not recoverable: %s" % c_detail],
            resume_hint="修复/重新签名 AR_design 后重跑 gate_test_ut.py")
        sys.exit("PHASE 5 FAIL: ar-contract unrecoverable: %s" % c_detail)

    print(reason)
    if numeric_ok and coverage_ok:
        _record_result(
            pdir, "PASS", reason, arts,
            cmd=run_cmd, exit_code=proc.returncode,
            test_target=args.test_target, suite=args.suite, part=part,
            tests=tests, failures=failures, errors=errors,
            fresh_dir=os.path.basename(fresh_dir),
            contract_status=contract_status, coverage_missing=missing)
        print("PHASE 5 PASS — advance.py advance --phase 5")
        return
    problems = []
    if tests <= 0:
        problems.append("summary_report.xml reported tests=0")
    if failures != 0:
        problems.append("summary_report.xml reported failures=%d" % failures)
    if errors != 0:
        problems.append("summary_report.xml reported errors=%d" % errors)
    if missing:
        problems += ["required gtest not passed: %s" % g for g in missing]
    failure_class = "gtest_coverage_missing" if missing else "unit_test_verdict_failed"
    # S3: backfill line-level suspects from the failing gtest cases in the result
    # xmls we already parsed. suspect_tests stays the base signal.
    suspect_locations = failed_gtest_locations(
        [os.path.join(pdir, r) for r in result_rels])[:100]
    _record_result(
        pdir, "FAIL", reason, arts,
        cmd=run_cmd, exit_code=proc.returncode,
        test_target=args.test_target, suite=args.suite, part=part,
        tests=tests, failures=failures, errors=errors,
        fresh_dir=os.path.basename(fresh_dir),
        contract_status=contract_status, coverage_missing=missing,
        failure_class=failure_class, problems=problems,
        suspect_locations=suspect_locations,
        resume_hint="修复单测失败/覆盖缺口后重跑 gate_test_ut.py")
    sys.exit("PHASE 5 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
