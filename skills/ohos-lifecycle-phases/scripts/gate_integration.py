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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--testtype", default="MST", help="developer_test -t value (MST/ST/...)")
    ap.add_argument("--part", help="testpart; default from pipeline.json test.part")
    ap.add_argument("--suites", nargs="+", required=True, help="one or more -ts suite names")
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
    run_cmd = "./start.sh run -t %s -tp %s %s" % (args.testtype, part, ts_args)
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
    reason = "type=%s tests=%d failures=%d errors=%d fresh=%s" % (
        args.testtype, tests, failures, errors, os.path.basename(fresh_dir))
    print(reason)
    verdict = "PASS" if (tests > 0 and failures == 0 and errors == 0) else "FAIL"
    gl.emit(pdir, 5, "gate_integration.py", verdict=verdict, reason=reason,
            cmd=run_cmd, exit_code=proc.returncode, artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 5 PASS — advance.py advance --phase 5")
    else:
        sys.exit("PHASE 5 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
