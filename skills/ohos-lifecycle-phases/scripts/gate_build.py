#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_build.py — Phase 2 (compile verification).

Runs the real build and closes the phase ONLY when both agree:
  (1) build.sh exit code == 0  (trusted directly, never a nohup wrapper), and
  (2) the success banner '=====build rk3568 successful=====' appears in the
      bytes appended to out/rk3568/build.log AFTER this build was launched,
      and the error banner does not.

Recording build.log's size before launch defeats a stale/old success banner:
we only scan the new tail. On failure we distill error.log + known markers.
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

# build.sh prints these banners to STDOUT. The product name may be absent when
# the build fails very early (e.g. unknown target), so match loosely.
SUCCESS_RE = re.compile(r"=====build.*successful=====")
ERROR_RE = re.compile(r"=====build.*error=====")
FAIL_MARKERS = ["ninja: build stopped", "FAILED:", "ERROR at ", "[OHOS ERROR]"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--target", help="GN build target; default from pipeline.json")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    target = args.target or state.get("build_target")
    if not target:
        sys.exit("ERROR: no build target (pass --target or set build_target)")
    ev = gl.evidence_dir(pdir, 2)
    build_log = os.path.join(repo, "out/rk3568/build.log")

    cmd = "./build.sh --product-name rk3568 --ccache --build-target %s" % target
    print("running: %s" % cmd)
    # Capture build.sh's OWN stdout/stderr as the authoritative, inherently-fresh
    # evidence (out/rk3568/build.log can rotate or stay empty on early GN failure).
    stdout_rel = "evidence/phase2/build_stdout.log"
    stdout_path = os.path.join(pdir, stdout_rel)
    with open(stdout_path, "w", encoding="utf-8") as logf:
        proc = subprocess.Popen(cmd, shell=True, cwd=repo, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                bufsize=1)
        for line in proc.stdout:
            sys.stdout.write(line)      # still stream to console
            logf.write(line)
        rc = proc.wait()
    with open(stdout_path, "r", encoding="utf-8", errors="replace") as f:
        out_text = f.read()

    banner_ok = bool(SUCCESS_RE.search(out_text))
    banner_err = bool(ERROR_RE.search(out_text))

    # banner evidence (exact matched line)
    banner_rel = "evidence/phase2/build_banner.txt"
    m = SUCCESS_RE.search(out_text)
    matched = next((ln for ln in out_text.splitlines() if SUCCESS_RE.search(ln)), "")
    with open(os.path.join(pdir, banner_rel), "w", encoding="utf-8") as f:
        f.write("exit_code=%d\nsuccess_banner=%s\nerror_banner=%s\nmatched=%s\n"
                % (rc, banner_ok, banner_err, matched))

    arts = [stdout_rel, banner_rel]

    if rc == 0 and banner_ok and not banner_err:
        gl.emit(pdir, 2, "gate_build.py", verdict="PASS",
                reason="exit=0 and success banner in build output (target=%s)" % target,
                cmd=cmd, exit_code=rc, artifacts_rel=arts)
        print("PHASE 2 PASS — advance.py advance --phase 2")
        return

    # failure: distill markers from the captured output
    hits = [ln for ln in out_text.splitlines() if any(mk in ln for mk in FAIL_MARKERS)]
    distill_rel = "evidence/phase2/error_distill.txt"
    with open(os.path.join(pdir, distill_rel), "w", encoding="utf-8") as f:
        f.write("\n".join(hits[:200]) or "(no known marker matched)")
    arts.append(distill_rel)
    reason = "rc=%d banner_ok=%s banner_err=%s; %d marker line(s)" % (
        rc, banner_ok, banner_err, len(hits))
    gl.emit(pdir, 2, "gate_build.py", verdict="FAIL", reason=reason,
            cmd=cmd, exit_code=rc, artifacts_rel=arts)
    sys.exit("PHASE 2 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
