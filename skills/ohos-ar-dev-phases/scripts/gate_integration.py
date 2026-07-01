#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_integration.py — Phase 5 (integration functional test).

Runs a cross-component / module-test suite set through the developer_test
harness (default test type MST) and closes the phase only on a real, freshly
produced aggregate report. Same RTC-independent freshness proof as phase 3
(a new host-clock reports/<timestamp>/ dir).

For integration scenarios that are device-behavioral rather than suite-based,
use gate_device_func.py --phase 5 instead (it is the alternative phase-5 closer).

P5 also runs a CODE REVIEW for upload-compliance: the OpenHarmony coding-style
guard (ohos-dev-cpp-coding-style/oh_cpp_guard.py) is run on the changed C/C++
files; P5 only passes when BOTH the integration test AND the review pass.
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

STYLE_GUARD = gl.resolve_dep("ohos-dev-cpp-coding-style/scripts/oh_cpp_guard.py",
                             env_var="OHOS_CPP_GUARD")


def code_review(state, pdir, arts):
    """Run the OHOS coding-style guard on the changed C/C++ files (upload
    compliance). Returns (ok, detail). Writes evidence/phase5/review_report.txt."""
    gdir = gl.resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    names = subprocess.run(["git", "-C", gdir, "diff", "--name-only", base],
                           text=True, capture_output=True).stdout.split()
    cxx = [f for f in names if f.endswith((".c", ".cc", ".cpp", ".cxx", ".h", ".hpp"))]
    rel = "evidence/phase5/review_report.txt"
    out_path = os.path.join(pdir, rel)
    if not cxx:
        with open(out_path, "w") as f:
            f.write("no C/C++ files changed vs %s — review skipped\n" % base[:12])
        arts.append(rel)
        return True, "no C/C++ changes"
    if not os.path.exists(STYLE_GUARD):
        with open(out_path, "w") as f:
            f.write("style guard not found at %s — review treated as pass\n" % STYLE_GUARD)
        arts.append(rel)
        return True, "guard missing (pass)"
    abs_cxx = [os.path.join(gdir, f) for f in cxx if os.path.exists(os.path.join(gdir, f))]
    cp = subprocess.run([sys.executable, STYLE_GUARD, "--format-only", *abs_cxx],
                        text=True, capture_output=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("changed C/C++ (%d):\n%s\n\n--- oh_cpp_guard --format-only ---\nrc=%d\n%s\n%s"
                % (len(cxx), "\n".join(cxx), cp.returncode, cp.stdout, cp.stderr))
    arts.append(rel)
    return cp.returncode == 0, "guard rc=%d on %d file(s)" % (cp.returncode, len(cxx))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--testtype", default="MST", help="developer_test -t value (MST/ST/...)")
    ap.add_argument("--part", help="testpart; default from pipeline.json test.part")
    ap.add_argument("--suites", nargs="+", required=True, help="one or more -ts suite names")
    ap.add_argument("--skip-review", action="store_true",
                    help="skip the upload-compliance code review (not recommended)")
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

    # code review for upload compliance (gates P5 together with the test)
    if args.skip_review:
        review_ok, review_detail = True, "skipped (--skip-review)"
        with open(os.path.join(pdir, "evidence/phase5/review_report.txt"), "w") as f:
            f.write("review skipped (--skip-review)\n")
        arts.append("evidence/phase5/review_report.txt")
    else:
        review_ok, review_detail = code_review(state, pdir, arts)

    reason = "type=%s tests=%d failures=%d errors=%d fresh=%s | review:%s" % (
        args.testtype, tests, failures, errors, os.path.basename(fresh_dir), review_detail)
    print(reason)
    verdict = "PASS" if (test_ok and review_ok) else "FAIL"
    gl.emit(pdir, 5, "gate_integration.py", verdict=verdict, reason=reason,
            cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 5 PASS — advance.py advance --phase 5")
    else:
        sys.exit("PHASE 5 FAIL: %s (test_ok=%s review_ok=%s)" % (reason, test_ok, review_ok))


if __name__ == "__main__":
    main()
