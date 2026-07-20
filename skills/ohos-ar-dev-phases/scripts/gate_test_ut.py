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

Pass iff: a fresh report dir was created AND tests>0 AND failures==0 AND errors==0.
"""
import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

SUCCESS_RE = re.compile(r"=====build.*successful=====")


def build_target(repo, target, pdir):
    """Build the test target; return (ok, tail_rel). Captures build.sh's own
    stdout as authoritative evidence (out/rk3568/build.log can rotate/stay empty)."""
    cmd = "./build.sh --product-name rk3568 --ccache --build-target %s" % target
    print("running: %s" % cmd)
    tail_rel = "evidence/phase3/test_build_stdout.log"
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
    ok = rc == 0 and bool(SUCCESS_RE.search(text))
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
    gl.evidence_dir(pdir, 3)
    dt = os.path.join(repo, "test/testfwk/developer_test")
    reports = os.path.join(dt, "reports")

    arts = []

    # 1. build the test target
    bok, tail_rel = build_target(repo, args.test_target, pdir)
    arts.append(tail_rel)
    if not bok:
        gl.emit(pdir, 3, "gate_test_ut.py", verdict="FAIL",
                reason="test target build failed: %s" % args.test_target,
                cmd="build %s" % args.test_target, artifacts_rel=arts)
        sys.exit("PHASE 3 FAIL: test target build failed")

    # 2. snapshot report dirs before the run
    before = set(glob.glob(os.path.join(reports, "20*")))

    # Pin the product form explicitly and consistently with gate_integration
    # (rk3568, NOT the harness default "phone"). developer_test defaults
    # productform to "phone", which collapses the testcase path to a
    # non-existent ./tests on rk3568 (harness then finds 0 cases). The product is
    # already pinned in pipeline.json; forward it as -p so out/<product>/tests
    # resolves. This only selects where the harness looks — verdict still comes
    # solely from the freshly-produced summary_report.xml below.
    product = state.get("product") or "rk3568"
    run_cmd = "./start.sh run -t UT -tp %s -ts %s -p %s" % (part, args.suite, product)
    print("running: (cd %s && %s)" % (dt, run_cmd))
    proc = subprocess.run(run_cmd, shell=True, cwd=dt, text=True, capture_output=True)
    stdout_rel = "evidence/phase3/start_sh_stdout.txt"
    with open(os.path.join(pdir, stdout_rel), "w", encoding="utf-8") as f:
        f.write(proc.stdout + "\n----stderr----\n" + proc.stderr)
    arts.append(stdout_rel)

    # 4. find the NEW report dir (RTC-independent freshness via host clock)
    after = set(glob.glob(os.path.join(reports, "20*")))
    fresh = sorted(after - before)
    if not fresh:
        gl.emit(pdir, 3, "gate_test_ut.py", verdict="FAIL",
                reason="no new reports/<timestamp>/ dir produced this run",
                cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
        sys.exit("PHASE 3 FAIL: harness produced no fresh report dir")
    fresh_dir = fresh[-1]
    with open(os.path.join(pdir, "evidence/phase3/report_dir.txt"), "w") as f:
        f.write(os.path.basename(fresh_dir) + "\n")
    arts.append("evidence/phase3/report_dir.txt")

    # 5. parse summary_report.xml (prefer the fresh dir; fall back to latest)
    summary = os.path.join(fresh_dir, "summary_report.xml")
    if not os.path.exists(summary):
        summary = os.path.join(reports, "latest", "summary_report.xml")
    if not os.path.exists(summary):
        gl.emit(pdir, 3, "gate_test_ut.py", verdict="FAIL",
                reason="summary_report.xml not found in fresh report dir",
                cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
        sys.exit("PHASE 3 FAIL: no summary_report.xml")
    sum_rel = "evidence/phase3/summary_report.xml"
    shutil.copy(summary, os.path.join(pdir, sum_rel))
    arts.append(sum_rel)
    # also snapshot per-suite result xmls
    for rx in glob.glob(os.path.join(fresh_dir, "result", "*.xml")):
        rrel = "evidence/phase3/result_%s" % os.path.basename(rx)
        shutil.copy(rx, os.path.join(pdir, rrel))
        arts.append(rrel)

    root = ET.parse(summary).getroot()
    tests = int(root.get("tests", "0"))
    failures = int(root.get("failures", "0"))
    errors = int(root.get("errors", "0"))
    reason = "tests=%d failures=%d errors=%d fresh=%s" % (
        tests, failures, errors, os.path.basename(fresh_dir))
    print(reason)

    if tests > 0 and failures == 0 and errors == 0:
        gl.emit(pdir, 3, "gate_test_ut.py", verdict="PASS", reason=reason,
                cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
        print("PHASE 3 PASS — advance.py advance --phase 3")
        return
    gl.emit(pdir, 3, "gate_test_ut.py", verdict="FAIL", reason=reason,
            cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
    sys.exit("PHASE 3 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
