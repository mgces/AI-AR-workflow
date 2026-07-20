#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_integration.py — Phase 5 (functional + quality impact tests).

Runs a cross-component / module-test suite set through the developer_test
harness (default test type MST) and closes the phase only on a real, freshly
produced aggregate report. Same RTC-independent freshness proof as phase 3
(a new host-clock reports/<timestamp>/ dir).

For integration scenarios that are device-behavioral rather than suite-based,
use gate_device_func.py --phase 5 instead (it is the alternative phase-5 closer).

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

STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
QUALITY_REPORTS = (
    ("coverage", "coverage_report"),
    ("performance", "performance_report"),
    ("power", "power_report"),
    ("stability", "stability_report"),
)


def code_review(state, pdir, arts):
    """Run the code_ruleset style guard on the changed C/C++ files.
    Returns (ok, detail). Writes evidence/phase5/code_review_report.txt."""
    gdir = gl.resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    names = subprocess.run(["git", "-C", gdir, "diff", "--name-only", base],
                           text=True, capture_output=True).stdout.split()
    cxx = [f for f in names if f.endswith((".c", ".cc", ".cpp", ".cxx", ".h", ".hpp"))]
    rel = "evidence/phase5/code_review_report.txt"
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
    cp = subprocess.run([sys.executable, STYLE_GUARD, "--format-only", *abs_cxx],
                        text=True, capture_output=True)
    issue_count = 0 if cp.returncode == 0 else 1
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("review_issue_count=%d\n" % issue_count)
        f.write("changed C/C++ (%d):\n%s\n\n--- oh_cpp_guard --format-only ---\nrc=%d\n%s\n%s"
                % (len(cxx), "\n".join(cxx), cp.returncode, cp.stdout, cp.stderr))
    arts.append(rel)
    return cp.returncode == 0, "auto_review_issues=%d guard rc=%d on %d file(s)" % (
        issue_count, cp.returncode, len(cxx))


def copy_external_review_report(args, pdir, arts):
    """Copy an optional manually produced code review report and require that
    its machine-readable issue count is zero."""
    if not args.code_review_report:
        return True, "external_review=not-provided"
    src = os.path.abspath(args.code_review_report)
    if not os.path.isfile(src):
        return False, "external_review missing: %s" % src
    _, ext = os.path.splitext(src)
    rel = "evidence/phase5/external_code_review_report%s" % (ext or ".txt")
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
        rel = "evidence/phase5/%s%s" % (label, ext)
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
    gl.evidence_dir(pdir, 5)
    dt = os.path.join(repo, "test/testfwk/developer_test")
    reports = os.path.join(dt, "reports")

    before = set(glob.glob(os.path.join(reports, "20*")))
    ts_args = " ".join("-ts %s" % s for s in args.suites)
    # Pass the product form explicitly; developer_test otherwise defaults it to
    # "phone" and fails to locate the rk3568 testcase output ("tests is not exist").
    product = state.get("product") or "rk3568"
    run_cmd = "./start.sh run -t %s -tp %s %s -p %s" % (args.testtype, part, ts_args, product)
    print("running: (cd %s && %s)" % (dt, run_cmd))
    proc = subprocess.run(run_cmd, shell=True, cwd=dt, text=True, capture_output=True)
    stdout_rel = "evidence/phase5/start_sh_stdout.txt"
    with open(os.path.join(pdir, stdout_rel), "w", encoding="utf-8") as f:
        f.write(proc.stdout + "\n----stderr----\n" + proc.stderr)
    arts = [stdout_rel]

    after = set(glob.glob(os.path.join(reports, "20*")))
    fresh = sorted(after - before)
    if not fresh:
        gl.emit(pdir, 5, "gate_integration.py", verdict="FAIL",
                reason="no new reports/<timestamp>/ dir produced this run",
                cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
        sys.exit("PHASE 5 FAIL: harness produced no fresh report dir")
    fresh_dir = fresh[-1]
    summary = os.path.join(fresh_dir, "summary_report.xml")
    if not os.path.exists(summary):
        summary = os.path.join(reports, "latest", "summary_report.xml")
    if not os.path.exists(summary):
        gl.emit(pdir, 5, "gate_integration.py", verdict="FAIL",
                reason="summary_report.xml missing", cmd=run_cmd,
                exit_code=proc.returncode, artifacts_rel=arts)
        sys.exit("PHASE 5 FAIL: no summary_report.xml")
    sum_rel = "evidence/phase5/summary_report.xml"
    shutil.copy(summary, os.path.join(pdir, sum_rel))
    arts.append(sum_rel)
    with open(os.path.join(pdir, "evidence/phase5/report_dir.txt"), "w") as f:
        f.write(os.path.basename(fresh_dir) + "\n")
    arts.append("evidence/phase5/report_dir.txt")

    root = ET.parse(summary).getroot()
    tests = int(root.get("tests", "0"))
    failures = int(root.get("failures", "0"))
    errors = int(root.get("errors", "0"))
    test_ok = tests > 0 and failures == 0 and errors == 0

    quality_ok, quality_detail = copy_quality_reports(args, pdir, arts)
    if not quality_ok and args.allow_missing_quality_reports:
        quality_detail += " (allowed)"
        quality_ok = True

    auto_review_ok, auto_review_detail = code_review(state, pdir, arts)
    external_review_ok, external_review_detail = copy_external_review_report(args, pdir, arts)
    review_ok = auto_review_ok and external_review_ok
    review_detail = "%s | %s" % (auto_review_detail, external_review_detail)

    reason = "type=%s tests=%d failures=%d errors=%d fresh=%s | quality:%s | review:%s" % (
        args.testtype, tests, failures, errors, os.path.basename(fresh_dir),
        quality_detail, review_detail)
    print(reason)
    verdict = "PASS" if (test_ok and quality_ok and review_ok) else "FAIL"
    gl.emit(pdir, 5, "gate_integration.py", verdict=verdict, reason=reason,
            cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 5 PASS — inspect quality/review artifacts, then record consent:")
        print("  advance.py --pipeline-dir %s consent --phase 5 --token <审核人>" % pdir)
        print("  advance.py --pipeline-dir %s advance --phase 5" % pdir)
    else:
        sys.exit("PHASE 5 FAIL: %s (test_ok=%s quality_ok=%s review_ok=%s)" %
                 (reason, test_ok, quality_ok, review_ok))


if __name__ == "__main__":
    main()
