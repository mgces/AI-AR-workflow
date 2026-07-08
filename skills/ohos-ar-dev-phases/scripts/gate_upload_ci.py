#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_upload_ci.py — Phase 6 (code upload + review). The only outward, irreversible step.

Hard prerequisites (read from pipeline.json / manifest):
  * phases 1..5 all status==passed;
  * consent for phase 6 recorded (human approved the push) — also re-checked by
    advance.py, so this cannot be bypassed.

The push itself only happens with --allow-push. Without it the gate runs in
DRY mode: it prepares the branch/PR plan and exits WITHOUT emitting a PASS.

Two code-review checkpoints bracket the upload, both fail-closed on a
machine-readable non-zero issue count (same review-report contract as P5):
  * A. local self-review BEFORE commit (--local-review-report): a review of the
    working-tree diff. Non-zero / missing / no-count → FAIL, nothing is committed
    or pushed. Fix the code and `advance.py reset` back to P1.
  * B. PR review AFTER the PR is created, BEFORE CI is checked
    (--pr-review-report): a review of the actual PR. Non-zero → FAIL (the PR
    exists but the phase does not pass; fix the code and reset back to P1).

Pass evidence (RTC-independent; keyed to an immutable commit SHA):
  * both review reports carry a machine-readable zero-issue count;
  * a PR is created on gitcode (oh-gc), PR number + URL + head SHA recorded;
  * openharmony_ci.py reports overall==success for that PR AND the PR head SHA
    equals the SHA we pushed (defeats an old green from an earlier commit).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

CI_SCRIPT = gl.resolve_dep("ohos-ci-openharmony-ci-analysis/scripts/openharmony_ci.py",
                           env_var="OHOS_CI_SCRIPT")
OK_OVERALL = {"success", "passed", "SUCCESS", "PASS", "pass"}


def run(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, cwd=cwd)


def remote_owner(gdir, remote="origin"):
    """Return the owner/namespace of a git remote (e.g. 'mgce1' from
    https://gitcode.com/mgce1/hiviewdfx_hiview.git), or '' if it can't be parsed."""
    url = run("git -C %s remote get-url %s" % (gdir, remote)).stdout.strip()
    if not url:
        return ""
    # strip protocol + host, drop a trailing .git, then take the owner segment.
    path = url.split("://", 1)[-1]
    if "@" in path and ":" in path.split("/", 1)[0]:  # scp-style git@host:owner/repo
        path = path.split(":", 1)[1]
    else:
        path = path.split("/", 1)[1] if "/" in path else path
    if path.endswith(".git"):
        path = path[:-4]
    parts = [p for p in path.split("/") if p]
    return parts[0] if len(parts) >= 2 else ""


def fork_qualified_head(gdir, repo_slug, branch, head_owner=""):
    """Build the `--head` value for `oh-gc pr create`.

    A bare branch name is resolved by oh-gc *inside* --repo (the PR base repo).
    For the standard fork -> upstream flow the branch lives on the contributor's
    fork, NOT on the base repo, so it must be qualified as `<fork-owner>:<branch>`
    (a cross-fork head). Passing a bare name there makes oh-gc look for the branch
    on the upstream repo and return 403 (the contributor cannot create refs there).

    We qualify the head when the fork owner (explicit --head-owner, else the owner
    of the `origin` remote we pushed to) differs from the base repo owner. Same-repo
    pushes (owner matches) keep the bare branch name."""
    base_owner = repo_slug.split("/", 1)[0] if "/" in repo_slug else ""
    owner = head_owner or remote_owner(gdir)
    if owner and owner != base_owner:
        return "%s:%s" % (owner, branch)
    return branch


def write_full_diff(state, gdir, pdir):
    """Dump the full diff of ALL modified code (component repo vs base_commit)
    into evidence/phase6 so a human can review the exact changes before upload.

    `git diff base` only covers tracked changes, so untracked NEW files (a brand
    new plugin directory is entirely untracked) would be invisible in the review.
    We append them explicitly via `git diff --no-index /dev/null <file>` so the
    human confirms the exact set that `git add -A` will commit and push.
    Returns (rel_path, stat_rel, stat_summary)."""
    base = state.get("base_commit") or "HEAD"
    diff = run("git -C %s diff %s" % (gdir, base)).stdout
    stat = run("git -C %s diff --stat %s" % (gdir, base)).stdout.strip()

    untracked = [f for f in run(
        "git -C %s ls-files --others --exclude-standard" % gdir).stdout.splitlines() if f.strip()]
    if untracked:
        diff += "\n" + "=" * 64 + "\nNEW (UNTRACKED) FILES — will be added by `git add -A`\n" + \
            "=" * 64 + "\n"
        for f in untracked:
            # --no-index exits 1 when files differ (they always do vs /dev/null); that's expected.
            diff += run("git -C %s diff --no-index -- /dev/null %s" % (gdir, json.dumps(f))).stdout
        stat += ("\n" if stat else "") + \
            "\n".join(" %s | new file" % f for f in untracked) + \
            "\n %d new file(s)" % len(untracked)

    rel = "evidence/phase6/full_diff.patch"
    with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
        f.write(diff)
    stat_rel = "evidence/phase6/full_diff.stat.txt"
    with open(os.path.join(pdir, stat_rel), "w", encoding="utf-8") as f:
        f.write("base=%s\n\n%s\n" % (base, stat or "(no changes)"))
    return rel, stat_rel, (stat or "(no changes)")


def commit_pending_changes(gdir, title, pdir):
    """Stage and commit any pending working-tree changes with a DCO sign-off
    (`git commit -s`) so the branch can be pushed. `-s` appends
    `Signed-off-by:` from the local git identity, which OpenHarmony requires.
    No-op (returns None) when the tree is already clean — the changes were
    committed earlier. The fingerprint is base_commit-relative, so committing
    here does NOT count as code drift."""
    dirty = run("git -C %s status --porcelain" % gdir).stdout.strip()
    if not dirty:
        return None
    add = run("git -C %s add -A" % gdir)
    if add.returncode != 0:
        _fail(pdir, "git add failed: %s" % add.stderr.strip()[:500])
    msg = title or "P6 upload"
    commit = run('git -C %s commit -s -m %s' % (gdir, json.dumps(msg)))
    if commit.returncode != 0:
        _fail(pdir, "git commit -s failed: %s" % commit.stderr.strip()[:500])
    return run("git -C %s rev-parse HEAD" % gdir).stdout.strip()


def normalize_issue(raw):
    """Accept '12345' or '#12345', always return '#12345'."""
    s = str(raw).strip().lstrip("#").strip()
    return "#%s" % s if s else ""


def build_pr_body(gdir, issue_ref):
    """Build the PR body from the repo's PR template with the issue number
    filled into the IssueNo field. Falls back to a minimal body when no
    template exists. Binding the PR to an issue is what lets OpenHarmony CI
    fire on the PR."""
    for candidate in (".gitcode/PULL_REQUEST_TEMPLATE.md",
                      ".github/PULL_REQUEST_TEMPLATE.md",
                      "docs/PULL_REQUEST_TEMPLATE.md"):
        path = os.path.join(gdir, candidate)
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                tmpl = f.read()
            if "**IssueNo**:" in tmpl:
                return tmpl.replace("**IssueNo**:", "**IssueNo**: %s" % issue_ref, 1)
            return "**IssueNo**: %s\n\n%s" % (issue_ref, tmpl)
    return "**IssueNo**: %s" % issue_ref


def require_zero_issue_report(path, label, dst_rel, pdir, arts):
    """Copy a code-review report into evidence/phase6 and require a
    machine-readable zero-issue count. Fails closed: a missing report, a report
    without a parseable count, or any non-zero count aborts the phase — the
    report itself may be model-authored, but the gate only PASSes on count 0.
    On failure this calls _fail() (which emits FAIL and exits)."""
    if not path:
        _fail(pdir, "%s missing: pass --%s <path> (machine-readable zero-issue "
                    "report). Run the review, drive issues to zero, then re-run." % (label, label))
    src = os.path.abspath(path)
    if not os.path.isfile(src):
        _fail(pdir, "%s not found: %s" % (label, src))
    _, ext = os.path.splitext(src)
    rel = "%s%s" % (dst_rel, ext or ".txt")
    shutil.copy(src, os.path.join(pdir, rel))
    arts.append(rel)
    ok, detail = gl.parse_review_report_zero_issues(src)
    if not ok:
        _fail(pdir, "%s has issues (%s). Fix the code, then `advance.py reset "
                    "--reason \"%s fix\"` to rewalk from P1." % (label, detail, label),
              extra_arts=arts)
    return rel, detail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--repo-slug", required=True, help="gitcode owner/repo the PR is opened AGAINST "
                    "(the base repo, e.g. openharmony/hiviewdfx_hiview)")
    ap.add_argument("--branch", required=True, help="local branch to push")
    ap.add_argument("--head-owner", default="", help="owner/namespace of the fork the branch is "
                    "pushed to (the PR head repo). Defaults to the owner of the `origin` remote. "
                    "When it differs from --repo-slug's owner the PR head is qualified as "
                    "`<owner>:<branch>` (cross-fork PR); omit for same-repo pushes.")
    ap.add_argument("--base", default="master", help="target base branch")
    ap.add_argument("--title", default="", help="PR title")
    ap.add_argument("--issue", help="associated issue number (e.g. 12345 or #12345). "
                    "REQUIRED to create a PR: OpenHarmony CI gates only trigger when the "
                    "PR is bound to an issue. Create it first with `oh-gc issue create`.")
    ap.add_argument("--pr", type=int, help="existing PR number (skip create; just verify CI)")
    ap.add_argument("--local-review-report",
                    help="A. local self-review report (checked BEFORE commit). Must be a "
                         "machine-readable zero-issue report (JSON issue/finding count==0 or "
                         "text `review_issue_count=0`). Non-zero/missing blocks the commit.")
    ap.add_argument("--pr-review-report",
                    help="B. PR review report (checked AFTER the PR is created, BEFORE CI). "
                         "Same zero-issue contract. Non-zero blocks the CI check and the PASS.")
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

    # Binding the PR to an issue is what makes OpenHarmony CI gates trigger.
    # Require --issue whenever we would create a PR (not when re-verifying an
    # existing --pr). Fail closed early so a missing issue never produces a PR
    # whose gates silently never fire.
    creating_pr = args.pr is None
    if creating_pr and not args.issue:
        sys.exit("PHASE 6 BLOCKED: --issue is required to create a PR (OpenHarmony CI "
                 "gates only trigger on issue-bound PRs). Create one first:\n"
                 "  oh-gc issue create --repo %s --title <title> --body <desc>\n"
                 "then re-run with --issue <number>." % args.repo_slug)
    issue_ref = normalize_issue(args.issue) if args.issue else ""

    # Save the full diff of ALL modified code for human confirmation BEFORE upload.
    diff_rel, stat_rel, stat = write_full_diff(state, gdir, pdir)

    head_sha = run("git -C %s rev-parse %s" % (gdir, args.branch)).stdout.strip()

    if not args.allow_push and not args.pr:
        planned_head = fork_qualified_head(gdir, args.repo_slug, args.branch, args.head_owner)
        print("\n" + "=" * 64)
        print("P6 上库前 —— 全部代码改动已保存,待人工确认")
        print("=" * 64)
        print("完整 diff : %s" % os.path.join(pdir, diff_rel))
        print("改动统计 :\n%s" % stat)
        print("\nDRY RUN (no --allow-push). Would: A) verify --local-review-report "
              "(zero issues) → commit pending changes with `git commit -s` (DCO) → "
              "push branch '%s' to origin → open PR (repo=%s, base=%s, head=%s, issue=%s) → "
              "B) verify --pr-review-report (zero issues) → check CI. head_sha=%s"
              % (args.branch, args.repo_slug, args.base, planned_head,
                 issue_ref or "(none)", head_sha[:12]))
        print("上库需两份机器可读零问题 review 报告:")
        print("  A 本地自检(commit 前):--local-review-report <path>")
        print("  B PR review(建 PR 后、CI 前):--pr-review-report <path>")
        print("  任一 review 有问题 → 改代码 → advance.py reset 回 P1 重走。")
        print("人工核对以上改动可上库后:")
        print("  advance.py --pipeline-dir %s consent --phase 6 --token <审核人>" % pdir)
        print("  再带 --allow-push 重跑本门控。")
        print("=" * 64)
        return  # no PASS emitted

    if not state.get("consent_tokens", {}).get("6"):
        sys.exit("PHASE 6 BLOCKED: no consent for phase 6. Record it with "
                 "`advance.py consent --phase 6 --token <token>` after human approval.")

    arts = [diff_rel, stat_rel]

    # A gate runs only on the PR-creation path (before commit). On the --pr
    # re-verify path no commit/push happens, so the local review is not re-run.
    local_detail = "skipped (--pr re-verify)"

    pr_number = args.pr
    if pr_number is None:
        # A. LOCAL SELF-REVIEW HARD GATE (before any irreversible action).
        # Fails closed on a non-zero / missing / count-less report — nothing is
        # committed or pushed until the local review is clean.
        local_rel, local_detail = require_zero_issue_report(
            args.local_review_report, "local-review-report",
            "evidence/phase6/local_code_review_report", pdir, arts)
        # Commit any pending work-tree changes with DCO sign-off, then push.
        # Committing here is safe: the code fingerprint is base_commit-relative,
        # so it stays equal to the value P1 locked (no false "code drift").
        new_head = commit_pending_changes(gdir, args.title or args.branch, pdir)
        if new_head:
            head_sha = new_head
        # push + create PR (irreversible)
        push = run("git -C %s push -u origin %s" % (gdir, args.branch))
        if push.returncode != 0:
            _fail(pdir, "git push failed: %s" % (push.stderr.strip()[:500]))
        pr_body = build_pr_body(gdir, issue_ref)
        # Qualify the head as <fork-owner>:<branch> for the fork -> upstream flow;
        # a bare name would be resolved on the base repo and 403 on an upstream PR.
        head_ref = fork_qualified_head(gdir, args.repo_slug, args.branch, args.head_owner)
        create = run('oh-gc pr create --repo %s --head %s --base %s --title %s --body %s --json'
                     % (args.repo_slug, head_ref, args.base,
                        json.dumps(args.title or args.branch), json.dumps(pr_body)))
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
    arts.append(pr_rel)
    if os.path.exists(os.path.join(pdir, "evidence/phase6/pr_create.txt")):
        arts.append("evidence/phase6/pr_create.txt")

    # B. PR REVIEW HARD GATE — the PR now exists, so review it, and require a
    # machine-readable zero-issue report BEFORE spending a CI check / PASS. A
    # non-zero report fails closed: fix the code and `advance.py reset` to P1.
    pr_review_rel, pr_review_detail = require_zero_issue_report(
        args.pr_review_report, "pr-review-report",
        "evidence/phase6/pr_review_report", pdir, arts)

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

    arts.append(ci_rel)

    sha_ok = (pr_head == "") or (pr_head == head_sha)  # if remote exposes head, it must match
    ci_ok = overall in OK_OVERALL
    # Both review gates already passed here (otherwise _fail exited earlier).
    reason = ("pr=%s overall=%s ci_ok=%s pushed=%s pr_head=%s sha_ok=%s "
              "local_review=%s pr_review=%s") % (
        pr_number, overall, ci_ok, head_sha[:12], pr_head[:12], sha_ok,
        local_detail, pr_review_detail)
    print(reason)
    verdict = "PASS" if (ci_ok and sha_ok and pr_number) else "FAIL"
    gl.emit(pdir, 6, "gate_upload_ci.py", verdict=verdict, reason=reason,
            cmd="oh-gc pr / openharmony_ci.py", artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 6 PASS — advance.py advance --phase 6")
    else:
        sys.exit("PHASE 6 FAIL: %s" % reason)


def _fail(pdir, reason, extra_arts=None):
    gl.emit(pdir, 6, "gate_upload_ci.py", verdict="FAIL", reason=reason,
            artifacts_rel=extra_arts or [])
    sys.exit("PHASE 6 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
