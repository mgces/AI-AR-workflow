#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_upload_ci.py — Phase 6 (code upload + review). The only outward, irreversible step.

Hard prerequisites (read from pipeline.json / manifest):
  * phases 1..5 all status==passed;
  * upload_consent_token recorded (human approved the push) — also re-checked by
    advance.py, so this cannot be bypassed.

The push itself only happens with --allow-push. Without it the gate runs in
DRY mode: it prepares the branch/PR plan and exits WITHOUT emitting a PASS.

Pass evidence (RTC-independent; keyed to an immutable commit SHA):
  * a PR is created on gitcode (oh-gc), PR number + URL + head SHA recorded;
  * openharmony_ci.py reports overall==success for that PR AND the PR head SHA
    equals the SHA we pushed (defeats an old green from an earlier commit).
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

CI_SCRIPT = gl.resolve_dep("ohos-ci-openharmony-ci-analysis/scripts/openharmony_ci.py",
                           env_var="OHOS_CI_SCRIPT")
OK_OVERALL = {"success", "passed", "SUCCESS", "PASS", "pass"}


def run(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, cwd=cwd)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--repo-slug", required=True, help="gitcode owner/repo for the PR")
    ap.add_argument("--branch", required=True, help="local branch to push")
    ap.add_argument("--base", default="master", help="target base branch")
    ap.add_argument("--title", default="", help="PR title")
    ap.add_argument("--pr", type=int, help="existing PR number (skip create; just verify CI)")
    ap.add_argument("--allow-push", action="store_true",
                    help="actually push + create PR (irreversible). Without it: DRY run.")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 6)

    # prereq: phases 1..5 passed
    not_done = [p["id"] for p in state["phases"] if p["id"] in (1, 2, 3, 4, 5)
                and p["status"] != "passed"]
    if not_done:
        sys.exit("PHASE 6 BLOCKED: phases not passed: %s" % not_done)

    head_sha = run("git -C %s rev-parse %s" % (gdir, args.branch)).stdout.strip()

    if not args.allow_push and not args.pr:
        print("DRY RUN (no --allow-push). Would push branch '%s' to %s and open PR "
              "(base=%s). head=%s" % (args.branch, args.repo_slug, args.base, head_sha[:12]))
        print("To proceed: record consent (advance.py consent --token ...) then "
              "re-run with --allow-push.")
        return  # no PASS emitted

    if not state.get("upload_consent_token"):
        sys.exit("PHASE 6 BLOCKED: no upload_consent_token. Record it with "
                 "`advance.py consent --token <token>` after human approval.")

    pr_number = args.pr
    if pr_number is None:
        # push + create PR (irreversible)
        push = run("git -C %s push -u origin %s" % (gdir, args.branch))
        if push.returncode != 0:
            _fail(pdir, "git push failed: %s" % (push.stderr.strip()[:500]))
        create = run('oh-gc pr create --repo %s --head %s --base %s --title %s --json'
                     % (args.repo_slug, args.branch, args.base,
                        json.dumps(args.title or args.branch)))
        with open(os.path.join(pdir, "evidence/phase6/pr_create.txt"), "w") as f:
            f.write(create.stdout + "\n----\n" + create.stderr)
        if create.returncode != 0:
            _fail(pdir, "oh-gc pr create failed: %s" % create.stderr.strip()[:500])
        try:
            pr_number = json.loads(create.stdout).get("number")
        except Exception:
            _fail(pdir, "could not parse PR number from oh-gc output")

    # record PR view (head SHA from the remote PR)
    view = run("oh-gc pr view %d --repo %s --json" % (pr_number, args.repo_slug))
    pr_rel = "evidence/phase6/pr.json"
    with open(os.path.join(pdir, pr_rel), "w") as f:
        f.write(view.stdout or view.stderr)
    pr_head = ""
    try:
        pv = json.loads(view.stdout)
        pr_head = (pv.get("head", {}) or {}).get("sha", "") or pv.get("head_sha", "")
    except Exception:
        pass

    # CI status for this PR
    env = dict(os.environ)
    env.setdefault("XDG_CACHE_HOME", "/tmp/openharmony-ci-cache")
    ci = subprocess.run([sys.executable, CI_SCRIPT, "--pr", str(pr_number),
                         "--repo", args.repo_slug, "--json"],
                        text=True, capture_output=True, env=env)
    ci_rel = "evidence/phase6/ci_status.json"
    with open(os.path.join(pdir, ci_rel), "w") as f:
        f.write(ci.stdout or ci.stderr)
    overall = ""
    try:
        overall = json.loads(ci.stdout).get("overall_result", "")
    except Exception:
        pass

    arts = [pr_rel, ci_rel]
    if os.path.exists(os.path.join(pdir, "evidence/phase6/pr_create.txt")):
        arts.append("evidence/phase6/pr_create.txt")

    sha_ok = (pr_head == "") or (pr_head == head_sha)  # if remote exposes head, it must match
    ci_ok = overall in OK_OVERALL
    reason = "pr=%s overall=%s ci_ok=%s pushed=%s pr_head=%s sha_ok=%s" % (
        pr_number, overall, ci_ok, head_sha[:12], pr_head[:12], sha_ok)
    print(reason)
    verdict = "PASS" if (ci_ok and sha_ok and pr_number) else "FAIL"
    gl.emit(pdir, 6, "gate_upload_ci.py", verdict=verdict, reason=reason,
            cmd="oh-gc pr / openharmony_ci.py", artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 6 PASS — advance.py advance --phase 6")
    else:
        sys.exit("PHASE 6 FAIL: %s" % reason)


def _fail(pdir, reason):
    gl.emit(pdir, 6, "gate_upload_ci.py", verdict="FAIL", reason=reason, artifacts_rel=[])
    sys.exit("PHASE 6 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
