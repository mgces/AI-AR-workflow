#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_upload_ci.py — Phase 6 (code upload + review). The only outward, irreversible step.

Hard prerequisites (read from pipeline.json / manifest):
  * phases 1..7 all status==passed;
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
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

CI_SCRIPT = gl.resolve_dep("ohos-ci-openharmony-ci-analysis/scripts/openharmony_ci.py",
                           env_var="OHOS_CI_SCRIPT")
OK_OVERALL = {"success", "passed", "SUCCESS", "PASS", "pass"}
TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
QUALITY_RECEIPT_PARTS = ("quality_verify", "completion_receipt.json")
QUALITY_HANDOFF_PARTS = ("quality_verify", "handoff_to_upload_review.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
COMPLETION_RECEIPT_PARTS = ("upload_review", "completion_receipt.json")
SUBSTATE_PARTS = ("upload_review", "substate.json")
MAX_RETRY_ROUNDS = 2
MAX_REPAIR_ROUNDS = 2

# Fixed P8 upload-ci substate machine (design 9.9 / spec 18.2). Each new window
# only has to reason about one of these small states, not the whole upload flow.
P8_SUBSTATE_META = {
    "precheck": {
        "name": "precheck",
        "goal": "confirm phases 1..7 passed and phase-8 consent is recorded before any push",
        "next_id": "local_review",
        "next_name": "local-review",
    },
    "local_review": {
        "name": "local-review",
        "goal": "verify the local self-review report is a zero-issue report before commit",
        "next_id": "consent_await",
        "next_name": "consent-await",
    },
    "consent_await": {
        "name": "consent-await",
        "goal": "wait for the human to inspect the diff and record phase-8 consent",
        "next_id": "push_pr",
        "next_name": "push-pr",
    },
    "push_pr": {
        "name": "push-pr",
        "goal": "push the branch and create the PR bound to its issue",
        "next_id": "pr_review",
        "next_name": "pr-review",
    },
    "pr_review": {
        "name": "pr-review",
        "goal": "verify the PR review report is a zero-issue report before CI is trusted",
        "next_id": "ci_green",
        "next_name": "ci-green",
    },
    "ci_green": {
        "name": "ci-green",
        "goal": "confirm CI is green for the exact pushed SHA (defeat stale greens)",
        "next_id": "finalize",
        "next_name": "finalize",
    },
    "finalize": {
        "name": "finalize",
        "goal": "record the signed upload PASS and close the pipeline",
        "next_id": None,
        "next_name": None,
    },
}

# Which substate a given failure_class stalls in.
P8_FAILURE_TO_SUBSTATE = {
    "prerequisite_phase_missing": "precheck",
    "phases_not_passed": "precheck",
    "consent_missing": "precheck",
    "consent_stale": "precheck",
    "issue_binding_missing": "precheck",
    "review_gate_failed": "local_review",
    "local_review_blocked": "local_review",
    "dry_run_no_pass": "consent_await",
    "push_failed": "push_pr",
    "pr_create_failed": "push_pr",
    "pr_metadata_incomplete": "push_pr",
    "commit_message_invalid": "push_pr",
    "pr_review_blocked": "pr_review",
    "ci_not_green": "ci_green",
    "pr_head_sha_mismatch": "ci_green",
    "sha_mismatch": "ci_green",
    "review_ci_sha_conflict": "ci_green",
    "external_api_unstable": "ci_green",
    "upload_ci_failed": "ci_green",
}

# failure classes that are external-system conclusions rather than local code
# problems; repeated exposure to them triggers human escalation instead of an
# endless local repair loop. A remote PR head SHA that will not match the pushed
# SHA (review/CI bound to a different commit than we shipped) is such a conflict.
EXTERNAL_CONFLICT_CLASSES = {
    "review_ci_sha_conflict", "sha_mismatch", "pr_head_sha_mismatch"}
EXTERNAL_INSTABILITY_CLASSES = {"external_api_unstable"}



def run(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, cwd=cwd)


def _unique_ordered(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


# Transport-layer markers: substrings that, in a failed CI/PR query, indicate the
# remote system was momentarily unreachable rather than the code being bad. A red
# CI produces a clean JSON verdict; a shaky gitcode/CI endpoint produces a
# non-zero exit with one of these in stderr (or no JSON at all). We keep this list
# conservative — only unambiguous transport failures — so a genuine red CI is
# never misread as "just flaky" and waved through.
_TRANSPORT_ERROR_MARKERS = (
    "timed out", "timeout", "connection reset", "connection refused",
    "could not resolve host", "temporary failure in name resolution",
    "network is unreachable", "no route to host", "econnreset", "etimedout",
    "rate limit", "429", "too many requests", "500 internal", "502 bad gateway",
    "503 service unavailable", "504 gateway", "server error", "tls handshake",
    "ssl", "eof occurred", "remote end closed", "connection aborted",
)


def _is_transport_failure(proc):
    """Return True when a CI/PR-query subprocess failed at the transport layer
    (endpoint down / throttled / network error) rather than returning a genuine
    verdict. Such failures are external-system instability, not a local code
    defect, so they must route to human escalation instead of a repair loop.

    A subprocess that exited 0 is never a transport failure — even if we could
    not parse its stdout, that is a parsing / contract problem, not the network
    being down, and we must not excuse a real red CI as "flaky"."""
    if proc is None:
        return False
    if proc.returncode == 0:
        return False
    blob = ((proc.stderr or "") + "\n" + (proc.stdout or "")).lower()
    if any(marker in blob for marker in _TRANSPORT_ERROR_MARKERS):
        return True
    # Non-zero exit with no output at all: the query never reached a verdict.
    # Treat an utterly silent failure as transport instability rather than a
    # red CI (a red CI still emits its JSON conclusion on stdout).
    return not (proc.stdout or "").strip() and not (proc.stderr or "").strip()


def _query_ci_with_backoff(cmd, env, *, max_attempts, base_delay):
    """E1: query the CI/PR status endpoint with bounded exponential backoff on
    TRANSPORT failures only. A transport outage (endpoint down/throttled) is
    transient, so a short retry often clears it and avoids a needless human
    escalation. Retry is strictly gated on `_is_transport_failure`: the moment
    the remote returns ANY verdict (exit 0, or non-zero WITH output — including a
    red CI), we stop and return that result unchanged. This preserves the
    fail-closed invariant — a real red CI is never retried into a green — while
    only smoothing genuine flakiness. Returns (last_proc, attempts_made)."""
    attempts = max(1, max_attempts)
    proc = None
    for attempt in range(1, attempts + 1):
        proc = subprocess.run(cmd, text=True, capture_output=True, env=env)
        if not _is_transport_failure(proc) or attempt == attempts:
            return proc, attempt
        delay = base_delay * (2 ** (attempt - 1))
        print("CI status query transport failure (attempt %d/%d); retrying in "
              "%.1fs" % (attempt, attempts, delay), file=sys.stderr)
        time.sleep(delay)
    return proc, attempts


def _test_bundle_context(pdir):
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    matrix = gl.read_control_json(pdir, *TEST_DEVELOP_MATRIX_PARTS) or {}
    status = gl.read_control_json(pdir, *TEST_DEVELOP_STATUS_PARTS) or {}
    receipt = gl.read_control_json(pdir, *QUALITY_RECEIPT_PARTS) or {}
    handoff = gl.read_control_json(pdir, *QUALITY_HANDOFF_PARTS) or {}
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
    # Base retry-vs-repair split (§9.1/§9.2) comes from the shared helper; this
    # gate then LAYERS its external-system escalation on top of the base verdict.
    prev = gl.read_control_json(pdir, *REPAIR_PACKET_PARTS) or {}
    base = gl.repair_round_metadata(
        prev, phase=phase, bundle_revision_from=bundle_revision_from,
        recommended_next_action=recommended_next_action, failure_class=failure_class,
        max_repair_rounds=MAX_REPAIR_ROUNDS, max_retry_rounds=MAX_RETRY_ROUNDS)
    # External-system conclusions are not local code repairs: a review/CI/SHA
    # binding conflict, or repeated external API instability, escalates to a
    # human decision rather than looping the model on a local fix.
    external_conflict = failure_class in EXTERNAL_CONFLICT_CLASSES
    external_instability = (
        failure_class in EXTERNAL_INSTABILITY_CLASSES and base["same_revision"])
    reasons = list(base["escalation_reasons"])
    if external_conflict:
        reasons.append(
            "review/CI/SHA binding conflict requires a human decision, not a local repair")
    if external_instability:
        reasons.append(
            "external API instability recurred on the same bundle revision")
    return {
        "repair_rounds": base["repair_rounds"],
        "retry_rounds": base["retry_rounds"],
        "fallback_key": base["fallback_key"],
        "human_escalation_needed": (
            base["human_escalation_needed"] or external_conflict or external_instability),
        "escalation_note": "; ".join(reasons) if reasons else "",
    }



def _p8_substate_for(verdict, *, mode=None, failure_class=None, ci_ok=None,
                     sha_ok=None):
    if verdict == "PASS":
        return "finalize"
    if failure_class in P8_FAILURE_TO_SUBSTATE:
        return P8_FAILURE_TO_SUBSTATE[failure_class]
    if mode in ("precheck",):
        return "precheck"
    if mode in ("dry_run",):
        return "consent_await"
    if ci_ok is False:
        return "ci_green"
    if sha_ok is False:
        return "ci_green"
    return "push_pr"



def _p8_substate_payload(substate_id, *, mode=None, ci_ok=None, sha_ok=None,
                         pr_number=None, human_escalation_needed=False,
                         escalation_reason=None):
    meta = P8_SUBSTATE_META[substate_id]
    entry_conditions = {
        "precheck": ["phases 1..7 all passed", "phase-8 consent about to be verified"],
        "local_review": ["precheck passed", "a local self-review report is provided"],
        "consent_await": ["local review is a zero-issue report", "diff is ready for human inspection"],
        "push_pr": ["phase-8 consent recorded", "--allow-push supplied"],
        "pr_review": ["branch pushed and PR created", "a PR review report is provided"],
        "ci_green": ["PR review is a zero-issue report", "CI has been queried for the PR head SHA"],
        "finalize": ["CI is green for the pushed SHA", "PR head SHA equals the pushed SHA"],
    }[substate_id]
    exit_conditions = {
        "precheck": ["all prerequisites satisfied"],
        "local_review": ["local review issue count is zero"],
        "consent_await": ["phase-8 consent recorded for the current evidence"],
        "push_pr": ["PR number, head SHA, and URL recorded"],
        "pr_review": ["PR review issue count is zero"],
        "ci_green": ["CI overall is success AND pr_head_sha == pushed_sha"],
        "finalize": ["signed upload PASS recorded; pipeline complete"],
    }[substate_id]
    notes = []
    if mode:
        notes.append("mode=%s" % mode)
    if ci_ok is not None:
        notes.append("ci_ok=%s" % ci_ok)
    if sha_ok is not None:
        notes.append("sha_ok=%s" % sha_ok)
    if pr_number is not None:
        notes.append("pr=%s" % pr_number)
    if human_escalation_needed:
        notes.append("human escalation required")
    return {
        "phase": 8,
        "phase_name": "upload-review",
        "substate": substate_id,
        "substate_id": substate_id,
        "substate_name": meta["name"],
        "substate_goal": meta["goal"],
        "entry_conditions": entry_conditions,
        "exit_conditions": exit_conditions,
        "next_substate_id": meta["next_id"],
        "next_substate_name": meta["next_name"],
        "objective_completed": substate_id == "finalize",
        "human_gate_pending": substate_id == "consent_await",
        "human_escalation_needed": human_escalation_needed,
        "escalation_reason": escalation_reason or "",
        "notes": notes,
    }



def _write_substate_snapshot(pdir, *, substate_id, mode=None, ci_ok=None,
                             sha_ok=None, pr_number=None,
                             human_escalation_needed=False, escalation_reason=None):
    payload = _p8_substate_payload(
        substate_id, mode=mode, ci_ok=ci_ok, sha_ok=sha_ok, pr_number=pr_number,
        human_escalation_needed=human_escalation_needed,
        escalation_reason=escalation_reason)
    gl.write_substate_snapshot(pdir, SUBSTATE_PARTS, payload)
    return payload




def _write_repair_packet(pdir, *, failure_class, problems, last_failure_reason,
                         regen_signals=None, suspect_locations=None):
    bundle = _test_bundle_context(pdir)
    repair_disallowed = gl.regen_signal_present(**(regen_signals or {}))
    base_action = gl.classify_repair_vs_regenerate(
        failure_class, repair_disallowed=repair_disallowed)
    rounds = _repair_round_metadata(
        pdir,
        phase=8,
        bundle_revision_from=bundle.get("bundle_revision") or "",
        recommended_next_action=base_action,
        failure_class=failure_class,
    )
    packet = {
        "phase": 8,
        "phase_name": "upload-review",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision_from": bundle.get("bundle_revision") or "",
        "active": True,
        "failure_class": failure_class,
        "suspect_files": bundle.get("suspect_files") or [],
        "suspect_locations": gl.normalize_suspect_locations(suspect_locations),
        "suspect_tests": bundle.get("suspect_tests") or [],
        "allowed_fix_scope": [
            "declared test files",
            "upload metadata",
            "review/ci evidence inputs for the current bundle",
        ],
        "must_rerun": ["gate_upload_ci.py"],
        "downstream_revalidate_scope": gl.scope_for_failure(
            failure_class, bundle.get("downstream_revalidate_scope")),
        "repair_disallowed_if": [
            "functional requirement changes are needed",
            "signed contract is unrecoverable",
        ],
        "regen_trigger_if": [
            "fix requires new functional code outside the phase1 freeze",
            "upload target or approval scope changes",
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



def _write_completion_controls(pdir, *, arts, pr_number, overall, ci_ok, pushed_sha,
                               pr_head, sha_ok, local_review_detail, pr_review_detail,
                               mode):
    bundle = _test_bundle_context(pdir)
    bundle_revision = bundle.get("bundle_revision") or ""
    receipt = {
        "phase": 8,
        "logical_phase_id": "upload_review",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": False,
        "next_phase": None,
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
        "pr": pr_number,
        "ci_overall": overall,
        "ci_ok": ci_ok,
        "pushed_sha": pushed_sha,
        "pr_head_sha": pr_head,
        "sha_ok": sha_ok,
        "local_review_detail": local_review_detail,
        "pr_review_detail": pr_review_detail,
        "mode": mode,
        "key_artifacts": arts,
        "logical_substate_id": "finalize",
        "logical_substate_name": P8_SUBSTATE_META["finalize"]["name"],
        "logical_substate_goal": P8_SUBSTATE_META["finalize"]["goal"],
    }
    gl.write_completion_receipt(pdir, COMPLETION_RECEIPT_PARTS, receipt)



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
    # B6: fail closed on a placeholder/empty subject BEFORE the irreversible
    # push. The old `title or "P6 upload"` fallback would have silently shipped
    # the literal placeholder — exactly the message a weak model leaves behind.
    ok, detail = validate_commit_message(msg)
    if not ok:
        _fail(pdir, "commit message rejected (%s). Provide a descriptive "
                    "--title, then re-run P8." % detail,
              failure_class="commit_message_invalid")
    commit = run('git -C %s commit -s -m %s' % (gdir, json.dumps(msg)))
    if commit.returncode != 0:
        _fail(pdir, "git commit -s failed: %s" % commit.stderr.strip()[:500])
    return run("git -C %s rev-parse HEAD" % gdir).stdout.strip()


def normalize_issue(raw):
    """Accept '12345' or '#12345', always return '#12345'."""
    s = str(raw).strip().lstrip("#").strip()
    return "#%s" % s if s else ""


# B6: subjects a weak model tends to leave when it never wrote a real message.
# Rejecting only this closed set keeps the check false-positive-free — any real
# descriptive subject passes untouched. Semantic quality (does the message
# describe the change?) still rests with PR/human review; this only stops the
# degenerate placeholder from reaching the irreversible push.
_PLACEHOLDER_SUBJECTS = {
    "p6 upload", "upload", "update", "updates", "fix", "fixes", "wip", "test",
    "tests", "tmp", "temp", "commit", "changes", "change", "misc", "todo", ".",
}


def validate_commit_message(msg):
    """B6: return (ok, detail) for a commit SUBJECT (first line). Fail-closed,
    conservative contract mirrored locally so a weak model learns its message is
    unacceptable BEFORE the irreversible push, not after. Rejects an empty,
    too-short, over-long, or placeholder subject — nothing else. This is NOT a
    truth-layer gate: the signed PASS still rests on review + CI + SHA binding;
    a bad subject fails the phase the same way a missing review report does."""
    text = (msg or "").strip()
    if not text:
        return False, "empty commit message"
    subject = text.splitlines()[0].strip()
    if not subject:
        return False, "empty commit subject line"
    if len(subject) < 8:
        return False, "commit subject too short (<8 chars): %r" % subject
    if len(subject) > 100:
        return False, "commit subject too long (>100 chars): %r" % subject[:60]
    if subject.lower() in _PLACEHOLDER_SUBJECTS:
        return False, "commit subject is a placeholder, not a description: %r" % subject
    return True, "ok"


def build_pr_body(gdir, issue_ref, pdir=None):
    """Build the PR body from the repo's PR template with the issue number
    filled into the IssueNo field. Falls back to a minimal body when no
    template exists. Binding the PR to an issue is what lets OpenHarmony CI
    fire on the PR.

    If render_report.py produced `reports/pr_description.md` for this run (the
    background / design / change / cases / results rollup), it is appended to the
    body via a plain FILE contract — this gate has no hard dependency on the
    workflow-skill renderer; missing file just means the classic body."""
    rollup = ""
    if pdir:
        desc = os.path.join(pdir, "reports", "pr_description.md")
        if os.path.isfile(desc):
            with open(desc, "r", encoding="utf-8", errors="replace") as f:
                rollup = "\n\n" + f.read().strip() + "\n"
    for candidate in (".gitcode/PULL_REQUEST_TEMPLATE.md",
                      ".github/PULL_REQUEST_TEMPLATE.md",
                      "docs/PULL_REQUEST_TEMPLATE.md"):
        path = os.path.join(gdir, candidate)
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                tmpl = f.read()
            if "**IssueNo**:" in tmpl:
                return tmpl.replace("**IssueNo**:", "**IssueNo**: %s" % issue_ref, 1) + rollup
            return "**IssueNo**: %s\n\n%s%s" % (issue_ref, tmpl, rollup)
    return "**IssueNo**: %s%s" % (issue_ref, rollup)


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
              extra_arts=arts, failure_class="review_gate_failed",
              problems=["%s not zero-issue: %s" % (label, detail)],
              resume_hint="修复 review 报告中的问题后重跑 gate_upload_ci.py")
    return rel, detail


def _record_result(pdir, verdict, reason, arts, *, cmd=None, repo_slug=None,
                   branch=None, pr_number=None, overall=None, ci_ok=None,
                   pushed_sha=None, pr_head=None, sha_ok=None,
                   local_review_detail=None, pr_review_detail=None,
                   mode=None, failure_class=None, problems=None,
                   resume_hint=None, emit_manifest=True, suspect_locations=None):
    checks = []
    if mode:
        checks.append("mode=%s" % mode)
    if repo_slug:
        checks.append("repo=%s" % repo_slug)
    if branch:
        checks.append("branch=%s" % branch)
    if pr_number is not None:
        checks.append("pr=%s" % pr_number)
    if overall is not None:
        checks.append("ci_overall=%s" % overall)
    if ci_ok is not None:
        checks.append("ci_ok=%s" % ci_ok)
    if sha_ok is not None:
        checks.append("sha_ok=%s" % sha_ok)
    summary_substate = _p8_substate_for(
        verdict, mode=mode, failure_class=failure_class,
        ci_ok=ci_ok, sha_ok=sha_ok)
    gl.write_phase_summary(
        pdir, 8, "gate_upload_ci.py", verdict, reason, checks=checks,
        extra={
            "repo_slug": repo_slug,
            "branch": branch,
            "pr": pr_number,
            "ci_overall": overall,
            "ci_ok": ci_ok,
            "pushed_sha": pushed_sha,
            "pr_head_sha": pr_head,
            "sha_ok": sha_ok,
            "local_review_detail": local_review_detail,
            "pr_review_detail": pr_review_detail,
            "mode": mode,
            "failure_class": failure_class,
            "logical_substate_id": summary_substate,
            "logical_substate_name": P8_SUBSTATE_META[summary_substate]["name"],
            "logical_substate_goal": P8_SUBSTATE_META[summary_substate]["goal"],
        })
    if verdict == "PASS":
        gl.clear_failure_report(pdir, 8)
        gl.write_repair_packet(
            pdir, REPAIR_PACKET_PARTS,
            gl.build_cleared_repair_packet(
                8, "upload-review", cleared_by="gate_upload_ci.py",
                bundle_revision_from=_test_bundle_context(pdir).get(
                    "bundle_revision") or ""))
        _write_substate_snapshot(
            pdir, substate_id="finalize", mode=mode, ci_ok=ci_ok,
            sha_ok=sha_ok, pr_number=pr_number)
        _write_completion_controls(
            pdir,
            arts=arts,
            pr_number=pr_number,
            overall=overall,
            ci_ok=ci_ok,
            pushed_sha=pushed_sha,
            pr_head=pr_head,
            sha_ok=sha_ok,
            local_review_detail=local_review_detail,
            pr_review_detail=pr_review_detail,
            mode=mode,
        )
    else:
        packet = _write_repair_packet(
            pdir,
            failure_class=failure_class or "upload_ci_failed",
            problems=problems or [],
            last_failure_reason=reason,
            suspect_locations=suspect_locations,
        )
        substate_id = _p8_substate_for(
            verdict, mode=mode, failure_class=failure_class,
            ci_ok=ci_ok, sha_ok=sha_ok)
        _write_substate_snapshot(
            pdir, substate_id=substate_id, mode=mode, ci_ok=ci_ok,
            sha_ok=sha_ok, pr_number=pr_number,
            human_escalation_needed=packet["human_escalation_needed"],
            escalation_reason=packet["escalation_note"])
        gl.write_failure_report(
            pdir, 8, "gate_upload_ci.py", reason,
            problems=problems or [], resume_hint=resume_hint,
            extra={
                "repo_slug": repo_slug,
                "branch": branch,
                "pr": pr_number,
                "ci_overall": overall,
                "ci_ok": ci_ok,
                "pushed_sha": pushed_sha,
                "pr_head_sha": pr_head,
                "sha_ok": sha_ok,
                "local_review_detail": local_review_detail,
                "pr_review_detail": pr_review_detail,
                "mode": mode,
                "failure_class": failure_class,
                "logical_substate_id": substate_id,
                "logical_substate_name": P8_SUBSTATE_META[substate_id]["name"],
                "logical_substate_goal": P8_SUBSTATE_META[substate_id]["goal"],
                "human_escalation_needed": packet["human_escalation_needed"],
                "escalation_note": packet["escalation_note"],
            })

    gl.write_gate_phase_memory_card(
        pdir, 8, "upload-review", verdict=verdict,
        bundle_revision=_test_bundle_context(pdir).get("bundle_revision"),
        current_blocker=None if verdict == "PASS" else reason,
        next_expected_action_class=(
            "complete" if verdict == "PASS"
            else gl.action_class_for("repair_or_regenerate",
                                     failure_class=failure_class)),
        last_failure_class=None if verdict == "PASS" else failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*COMPLETION_RECEIPT_PARTS))

    # Self-emit this gate's own stage packet from the shared def (§3+§13), so a
    # weak model resuming mid-P8 reads the same goal/entry/exit/failure_classes
    # whether it landed here via `advance.py next` or by running the gate.
    gl.write_gate_stage_packet_from_def(
        pdir, "upload_review", "upload-review", physical_phase=8)

    if emit_manifest:
        gl.emit(pdir, 8, "gate_upload_ci.py", verdict=verdict, reason=reason,
                cmd=cmd, artifacts_rel=arts)


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
    ap.add_argument("--ci-query-attempts", type=int, default=3,
                    help="E1: max attempts for the CI/PR status query. Retry fires "
                         "ONLY on transport failure (endpoint down/throttled); any "
                         "parsed verdict — including a red CI — stops retrying. "
                         "Default 3.")
    ap.add_argument("--ci-query-backoff", type=float, default=2.0,
                    help="E1: base seconds for exponential backoff between CI-query "
                         "transport retries (attempt N waits base*2^(N-1)). Default 2.0.")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 8)

    # prereq: phases 1..7 passed
    not_done = [p["id"] for p in state["phases"] if p["id"] in (1, 2, 3, 4, 5, 6, 7)
                and p["status"] != "passed"]
    if not_done:
        reason = "phases not passed: %s" % not_done
        _record_result(
            pdir, "FAIL", reason, [],
            repo_slug=args.repo_slug, branch=args.branch, mode="precheck",
            failure_class="prerequisite_phase_missing",
            problems=["prerequisite phases not passed: %s" % not_done],
            resume_hint="先完成并 advance P1-P7，再重跑 gate_upload_ci.py",
            emit_manifest=False)
        sys.exit("PHASE 8 BLOCKED: phases not passed: %s" % not_done)

    # Binding the PR to an issue is what makes OpenHarmony CI gates trigger.
    # Require --issue whenever we would create a PR (not when re-verifying an
    # existing --pr). Fail closed early so a missing issue never produces a PR
    # whose gates silently never fire.
    creating_pr = args.pr is None
    if creating_pr and not args.issue:
        reason = "--issue is required to create a PR"
        _record_result(
            pdir, "FAIL", reason, [],
            repo_slug=args.repo_slug, branch=args.branch, mode="precheck",
            failure_class="issue_binding_missing",
            problems=["PR creation path requires --issue for CI binding"],
            resume_hint="先创建 issue 并带 --issue 重跑 gate_upload_ci.py",
            emit_manifest=False)
        sys.exit("PHASE 8 BLOCKED: --issue is required to create a PR (OpenHarmony CI "
                 "gates only trigger on issue-bound PRs). Create one first:\n"
                 "  oh-gc issue create --repo %s --title <title> --body <desc>\n"
                 "then re-run with --issue <number>." % args.repo_slug)
    issue_ref = normalize_issue(args.issue) if args.issue else ""

    # Save the full diff of ALL modified code for human confirmation BEFORE upload.
    diff_rel, stat_rel, stat = write_full_diff(state, gdir, pdir)

    head_sha = run("git -C %s rev-parse %s" % (gdir, args.branch)).stdout.strip()

    if not args.allow_push and not args.pr:
        planned_head = fork_qualified_head(gdir, args.repo_slug, args.branch, args.head_owner)
        reason = "dry run prepared upload plan (no --allow-push)"
        _record_result(
            pdir, "FAIL", reason, [diff_rel, stat_rel],
            repo_slug=args.repo_slug, branch=args.branch,
            pushed_sha=head_sha, mode="dry_run",
            local_review_detail="not-run (dry run)",
            pr_review_detail="not-run (dry run)",
            failure_class="dry_run_no_pass",
            problems=["dry run only: no irreversible upload was performed"],
            resume_hint="人工确认 diff 后记录 phase 6 consent，并带 --allow-push 重跑",
            emit_manifest=False)
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
        print("  advance.py --pipeline-dir %s consent --phase 8 --token <审核人>" % pdir)
        print("  再带 --allow-push 重跑本门控。")
        print("=" * 64)
        return  # no PASS emitted

    if not state.get("consent_tokens", {}).get("8"):
        reason = "no consent for phase 8"
        _record_result(
            pdir, "FAIL", reason, [diff_rel, stat_rel],
            repo_slug=args.repo_slug, branch=args.branch,
            pushed_sha=head_sha, mode="precheck",
            failure_class="consent_missing",
            problems=["phase 8 consent token missing"],
            resume_hint="人工审核后执行 advance.py consent --phase 8 --token <reviewer>，再重跑",
            emit_manifest=False)
        sys.exit("PHASE 8 BLOCKED: no consent for phase 8. Record it with "
                 "`advance.py consent --phase 8 --token <token>` after human approval.")

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
            _fail(pdir, "git push failed: %s" % (push.stderr.strip()[:500]),
                  failure_class="push_failed")
        pr_body = build_pr_body(gdir, issue_ref, pdir)
        # Qualify the head as <fork-owner>:<branch> for the fork -> upstream flow;
        # a bare name would be resolved on the base repo and 403 on an upstream PR.
        head_ref = fork_qualified_head(gdir, args.repo_slug, args.branch, args.head_owner)
        create = run('oh-gc pr create --repo %s --head %s --base %s --title %s --body %s --json'
                     % (args.repo_slug, head_ref, args.base,
                        json.dumps(args.title or args.branch), json.dumps(pr_body)))
        with open(os.path.join(pdir, "evidence/phase6/pr_create.txt"), "w") as f:
            f.write(create.stdout + "\n----\n" + create.stderr)
        if create.returncode != 0:
            _fail(pdir, "oh-gc pr create failed: %s" % create.stderr.strip()[:500],
                  failure_class="pr_create_failed")
        try:
            pr_number = json.loads(create.stdout).get("number")
        except Exception:
            _fail(pdir, "could not parse PR number from oh-gc output",
                  failure_class="pr_create_failed")

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
    ci, ci_attempts = _query_ci_with_backoff(
        [sys.executable, CI_SCRIPT, "--pr", str(pr_number),
         "--repo", args.repo_slug, "--json"],
        env, max_attempts=args.ci_query_attempts,
        base_delay=args.ci_query_backoff)
    ci_rel = "evidence/phase6/ci_status.json"
    with open(os.path.join(pdir, ci_rel), "w") as f:
        f.write(ci.stdout or ci.stderr)
    overall = ""
    ci_defect_locations = []
    try:
        ci_json = json.loads(ci.stdout)
        overall = ci_json.get("overall_result", "")
        # H6: backfill WHICH codecheck defect class the remote flagged into the
        # repair packet. Advisory only — the PASS/FAIL verdict below stays bound
        # to overall_result + head-SHA; this just makes a red CI legible instead
        # of an opaque overall_result the weak model first sees post-push.
        ci_defect_locations = gl.suspect_locations_from_ci_codecheck(ci_json)
    except Exception:
        pass

    # Distinguish a genuine RED CI from a transient outage of the CI/PR endpoint.
    # A parsed verdict (`overall` set) is always authoritative — the remote
    # answered. Only when the query yielded no verdict AND the subprocess shows
    # transport-layer failure do we treat it as external instability, which
    # routes to human escalation (§7.5) instead of an endless local repair loop.
    ci_transport_failure = (not overall) and _is_transport_failure(ci)
    if ci_transport_failure and ci_attempts > 1:
        print("CI status query still failing at transport layer after %d "
              "attempts; classifying as external_api_unstable" % ci_attempts,
              file=sys.stderr)

    arts.append(ci_rel)

    # SHA binding is fail-CLOSED: if we cannot read the PR head SHA from the
    # remote, we cannot prove the green CI belongs to the commit we just pushed
    # (an old green from an earlier commit could masquerade). Treat an
    # unreadable/empty head as FAIL rather than silently passing.
    sha_ok = bool(pr_head) and (pr_head == head_sha)
    ci_ok = overall in OK_OVERALL
    # Both review gates already passed here (otherwise _fail exited earlier).
    reason = ("pr=%s overall=%s ci_ok=%s pushed=%s pr_head=%s sha_ok=%s "
              "local_review=%s pr_review=%s") % (
        pr_number, overall, ci_ok, head_sha[:12], pr_head[:12], sha_ok,
        local_detail, pr_review_detail)
    print(reason)
    verdict = "PASS" if (ci_ok and sha_ok and pr_number) else "FAIL"
    problems = []
    if not ci_ok:
        if ci_transport_failure:
            problems.append(
                "CI/PR status query failed at the transport layer (endpoint "
                "unreachable/throttled), not a red CI: %s"
                % ((ci.stderr or ci.stdout or "").strip()[:200]))
        else:
            problems.append("CI overall result is not success: %s" % overall)
    if not pr_number:
        problems.append("PR number missing after create/view flow")
    if not pr_head:
        problems.append("remote PR head SHA unreadable")
    elif not sha_ok:
        problems.append("remote PR head SHA does not match pushed SHA")
    failure_class = None
    if verdict == "FAIL":
        if not ci_ok:
            # A transient CI/PR endpoint outage is external instability, not a
            # code defect — escalate rather than loop the model on local repairs.
            failure_class = (
                "external_api_unstable" if ci_transport_failure else "ci_not_green")
        elif not pr_head or not sha_ok:
            failure_class = "pr_head_sha_mismatch"
        else:
            failure_class = "pr_metadata_incomplete"
    _record_result(
        pdir, verdict, reason, arts,
        cmd="oh-gc pr / openharmony_ci.py",
        repo_slug=args.repo_slug, branch=args.branch,
        pr_number=pr_number, overall=overall, ci_ok=ci_ok,
        pushed_sha=head_sha, pr_head=pr_head, sha_ok=sha_ok,
        local_review_detail=local_detail, pr_review_detail=pr_review_detail,
        mode="push" if args.allow_push else "verify_pr",
        failure_class=failure_class, problems=problems,
        suspect_locations=ci_defect_locations,
        resume_hint="修复 PR review / CI / SHA 绑定问题后重跑 gate_upload_ci.py")
    if verdict == "PASS":
        print("PHASE 8 PASS — advance.py advance --phase 8")
    else:
        sys.exit("PHASE 8 FAIL: %s" % reason)


def _fail(pdir, reason, extra_arts=None, failure_class="upload_ci_failed",
          problems=None, resume_hint=None):
    gl.write_phase_summary(
        pdir, 8, "gate_upload_ci.py", "FAIL", reason,
        checks=problems or [],
        extra={"failure_class": failure_class})
    gl.write_failure_report(
        pdir, 8, "gate_upload_ci.py", reason,
        problems=problems or [], resume_hint=resume_hint,
        extra={"failure_class": failure_class})
    _write_repair_packet(
        pdir,
        failure_class=failure_class,
        problems=problems or [reason],
        last_failure_reason=reason,
    )
    gl.write_gate_phase_memory_card(
        pdir, 8, "upload-review", verdict="FAIL",
        bundle_revision=_test_bundle_context(pdir).get("bundle_revision"),
        current_blocker=reason,
        next_expected_action_class=gl.action_class_for(
            "repair_or_regenerate", failure_class=failure_class),
        last_failure_class=failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"))
    gl.emit(pdir, 8, "gate_upload_ci.py", verdict="FAIL", reason=reason,
            artifacts_rel=extra_arts or [])
    sys.exit("PHASE 8 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
