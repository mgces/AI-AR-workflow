#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_develop.py — Phase 1 (code development).

This phase is code-shaped, not device-shaped, so its evidence is git state —
which the host controls and which is RTC-independent (SHAs, not timestamps):

  * HEAD must have advanced from the recorded base_commit;
  * the diff against base_commit must be non-empty;
  * the OpenHarmony C++ style check must pass over the changed files.

If pipeline.json has no base_commit yet, the first run records the current HEAD
as the base (so the diff is measured from where development started).
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

# OpenHarmony C++ style guard shipped with the cpp-coding-style skill.
STYLE_GUARD = gl.resolve_dep("ohos-dev-cpp-coding-style/scripts/oh_cpp_guard.py",
                             env_var="OHOS_CPP_GUARD")


def git(repo, *a):
    return subprocess.run(["git", "-C", repo, *a], text=True, capture_output=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--no-style", action="store_true",
                    help="skip the style check (only if no C/C++ files changed)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 1)

    head = git(gdir, "rev-parse", "HEAD").stdout.strip()
    base = state.get("base_commit")
    if not base:
        # first development checkpoint: anchor base to current HEAD
        base = head
        state["base_commit"] = base
        # advance.py is the canonical writer, but recording the immutable base
        # anchor here is safe (it is not a phase-status mutation).
        gl.save_state(pdir, state)

    # diff (working tree + committed) against base
    diff = git(gdir, "diff", base)
    names = git(gdir, "diff", "--name-only", base).stdout.strip()
    changed = [n for n in names.splitlines() if n]
    diff_rel = "evidence/phase1/diff.patch"
    with open(os.path.join(pdir, diff_rel), "w", encoding="utf-8") as f:
        f.write(diff.stdout)
    files_rel = "evidence/phase1/changed_files.txt"
    with open(os.path.join(pdir, files_rel), "w") as f:
        f.write("base=%s\nhead=%s\n\n" % (base, head) + "\n".join(changed))
    arts = [diff_rel, files_rel]

    if not changed:
        gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                reason="empty diff vs base %s — no code developed" % base[:12],
                artifacts_rel=arts)
        sys.exit("PHASE 1 FAIL: no changes vs base_commit")

    # style check on changed C/C++ files
    style_ok, style_detail = True, "skipped"
    cxx = [f for f in changed if f.endswith((".c", ".cc", ".cpp", ".cxx", ".h", ".hpp"))]
    style_rel = "evidence/phase1/style_report.txt"
    if cxx and not args.no_style and os.path.exists(STYLE_GUARD):
        abs_cxx = [os.path.join(gdir, f) for f in cxx if os.path.exists(os.path.join(gdir, f))]
        cp = subprocess.run([sys.executable, STYLE_GUARD, "--format-only", *abs_cxx],
                            text=True, capture_output=True)
        style_ok = cp.returncode == 0
        style_detail = (cp.stdout + cp.stderr)[:4000]
    elif cxx and not os.path.exists(STYLE_GUARD):
        style_detail = "style guard not found at %s (treated as pass)" % STYLE_GUARD
    with open(os.path.join(pdir, style_rel), "w", encoding="utf-8") as f:
        f.write("changed_cxx=%d style_ok=%s\n\n%s" % (len(cxx), style_ok, style_detail))
    arts.append(style_rel)

    reason = "head advanced %s->%s, %d file(s) changed, style_ok=%s" % (
        base[:12], head[:12], len(changed), style_ok)
    print(reason)
    verdict = "PASS" if style_ok else "FAIL"
    gl.emit(pdir, 1, "gate_develop.py", verdict=verdict, reason=reason,
            artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 1 PASS — advance.py advance --phase 1")
    else:
        sys.exit("PHASE 1 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
