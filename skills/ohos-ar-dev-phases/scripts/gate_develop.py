#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_develop.py — Phase 1 (code development).

This phase is code-shaped, not device-shaped, so its evidence is git state —
which the host controls and which is RTC-independent (SHAs, not timestamps):

  * tracked diff or untracked files against base_commit must be non-empty;
  * every changed C/C++ file must pass the packaged formatting guard;
  * machine-checkable hard rules from both C++ skills must pass.

If pipeline.json has no base_commit yet, the first run records the current HEAD
as the base (so the diff is measured from where development started).

Development also refuses unless a human recorded phase-1 consent bound to the
signed AR_design (advance.py consent --phase 1): AR_design must be human-reviewed
between design fix (P1a) and code development (P1b).
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

# OpenHarmony C++ style guard shipped with the cpp-coding-style skill.
STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
CODE_RULESET_SKILL = gl.resolve_dep("code-ruleset-style-check/SKILL.md",
                                    env_var="CODE_RULESET_STYLE_SKILL")

FORMAT_EXTENSIONS = (".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx")
HEADER_EXTENSIONS = (".h", ".hh", ".hpp", ".hxx")
DISALLOWED_CPP_EXTENSIONS = (".cc", ".cxx", ".hh", ".hpp", ".hxx")

# P2 feature-develop -> P3 test-develop handoff (control layer, non-authoritative).
P2_HANDOFF_PARTS = ("feature_develop", "handoff_p2_to_p3.json")
P2_RECEIPT_PARTS = ("feature_develop", "completion_receipt_p2.json")
FREEZE_PARTS = ("test_develop", "development_freeze_snapshot.json")


def _write_handoff_to_test_develop(pdir, contract, *, changed, present_declared,
                                   freeze_snapshot):
    """On a develop PASS, emit the P2->P3 completion receipt and handoff packet so
    the P3 test-develop window can start from a machine-readable entry doc.
    Navigation only: prepare_test_bundle.py and the gates still re-read the
    signed contract + freeze snapshot, never this packet, to decide anything."""
    bundle_revision = (freeze_snapshot or {}).get("bundle_revision") or ""
    bundle_id = (freeze_snapshot or {}).get("bundle_id") or "phase1-bundle"
    receipt = {
        "phase": 1,
        "logical_phase_id": "feature_develop",
        "logical_phase_name": "feature-develop",
        "phase_scope": "phase1-subflow",
        "bundle_id": bundle_id,
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": False,
        "next_phase_ready": True,
        "human_gate_pending": False,
        "next_phase": 1,
        "next_logical_phase_id": "test_develop",
        "changed_files": list(changed or []),
        "declared_changed_files_present": list(present_declared or []),
    }
    handoff = {
        "from_phase": 1,
        "from_phase_name": "develop",
        "logical_phase_id": "feature_develop",
        "logical_phase_name": "feature-develop",
        "to_phase": 1,
        "to_phase_name": "develop",
        "to_logical_phase_id": "test_develop",
        "phase_scope": "phase1-subflow",
        "bundle_id": bundle_id,
        "bundle_revision": bundle_revision,
        "objective_completed": True,
        "truth_layer_pass_known": False,
        "produced_artifacts": [
            gl.control_artifact_ref(FREEZE_PARTS, "development_freeze_snapshot"),
            gl.control_artifact_ref(P2_RECEIPT_PARTS, "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "feature code passed style + strict + changed_files coverage",
            "development freeze snapshot was recorded",
            "test authoring must not modify functional code",
        ],
        "risks": [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 1,
            "action": "test-develop",
            "next_gate": "prepare_test_bundle.py",
        },
        "requires_repair": False,
        "test_cases": contract.get("test_cases") or [],
        "changed_files": list(changed or []),
    }
    gl.write_completion_receipt(pdir, P2_RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, P2_HANDOFF_PARTS, handoff)


def git(repo, *a):
    return subprocess.run(["git", "-C", repo, *a], text=True, capture_output=True)


def unique_ordered(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def collect_changed_files(gdir, base):
    tracked = git(gdir, "diff", "--name-only", base).stdout.splitlines()
    untracked = git(gdir, "ls-files", "--others", "--exclude-standard").stdout.splitlines()
    return unique_ordered(tracked + untracked), unique_ordered(tracked), unique_ordered(untracked)


def build_diff_evidence(gdir, base, untracked):
    diff = git(gdir, "diff", base).stdout
    if not untracked:
        return diff
    lines = [diff, "\n\n--- untracked files (not shown by git diff) ---\n"]
    lines.extend("%s\n" % path for path in untracked)
    return "".join(lines)


def source_files(gdir, changed):
    files = []
    for rel in changed:
        if rel.lower().endswith(FORMAT_EXTENSIONS) and os.path.isfile(os.path.join(gdir, rel)):
            files.append(rel)
    return files


def static_rule_checks(gdir, source_relpaths):
    """Machine-checkable P1 blockers derived from code_ruleset."""
    issues = []
    checked = []
    for rel in source_relpaths:
        path = os.path.join(gdir, rel)
        ext = os.path.splitext(rel)[1].lower()
        checked.append(rel)
        if ext in DISALLOWED_CPP_EXTENSIONS:
            issues.append("%s: code_ruleset file naming: use .cpp/.h, not %s" % (rel, ext))
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError as exc:
            issues.append("%s: cannot read source file: %s" % (rel, exc))
            continue

        if ext in HEADER_EXTENSIONS and re.search(r"^\s*#\s*pragma\s+once\b", text, re.MULTILINE):
            issues.append("%s: G.INC.06: #pragma once is forbidden" % rel)
        if ext in HEADER_EXTENSIONS and re.search(r"^\s*using\s+namespace\s+", text, re.MULTILINE):
            issues.append("%s: ohos/openharmony header rule: using namespace is forbidden in headers" % rel)
        if re.search(r"^\s*#\s*include\b", text, re.MULTILINE) and include_inside_extern_c(text):
            issues.append("%s: G.INC.05-CPP: do not place #include inside extern \"C\"" % rel)
        if re.search(r"\bNULL\b", text):
            issues.append("%s: G.EXP.35-CPP: use nullptr instead of NULL" % rel)
        if re.search(r"\b(system|popen)\s*\(", text):
            issues.append("%s: code_ruleset secure coding: system()/popen() are forbidden in changed code" % rel)
        if re.search(r"\[(=|&)(\]|\s*,)", text):
            issues.append("%s: G.RES.05-CPP: avoid default lambda captures" % rel)
    return checked, issues


def include_inside_extern_c(text):
    inside = False
    for line in text.splitlines():
        stripped = line.strip()
        if re.search(r'extern\s+"C"\s*\{', stripped):
            inside = True
            continue
        if inside and stripped.startswith("#include"):
            return True
        if inside and stripped.startswith("}"):
            inside = False
    return False


def _norm(p):
    return (p or "").replace("\\", "/").strip().lstrip("./")


def changed_files_coverage(declared, touched):
    """For each contract-declared changed_file, decide whether an actually-touched
    file matches it. Matching is exact on the normalized path, then falls back to
    a path-suffix match so a repo-root-relative declaration
    ('foundation/a/src/mgr.cpp') still matches a git path that is nested or
    prefixed differently. Returns (present:list, missing:list)."""
    tset = [_norm(t) for t in touched]
    present, missing = [], []
    for d in declared:
        nd = _norm(d)
        hit = any(t == nd or t.endswith("/" + nd) or nd.endswith("/" + t)
                  for t in tset)
        (present if hit else missing).append(d)
    return present, missing


def _test_target_from_gtest(gtest_id):
    if not gtest_id:
        return None
    suite = str(gtest_id).split(".", 1)[0].strip()
    suite = suite.split("/", 1)[0].strip()
    return suite or None


def _collect_test_intent_matrix(contract, changed_files):
    matrix = []
    for tc in contract.get("test_cases", []) or []:
        gtest_id = tc.get("gtest")
        matrix.append({
            "test_case_id": tc.get("id") or gtest_id,
            "covers_requirement_ids": tc.get("for_requirements") or [],
            "expected_target": _test_target_from_gtest(gtest_id),
            "expected_suite": _test_target_from_gtest(gtest_id),
            "expected_gtest": gtest_id,
            "depends_on_files": changed_files,
            "negative_cases": [],
            "device_followup_needed": bool(tc.get("for_requirements") and any(
                set(tc.get("for_requirements") or []) &
                set(dc.get("for_requirements") or [])
                for dc in (contract.get("device_cases") or [])
            )),
        })
    return matrix


def write_development_freeze_snapshot(pdir, state, contract, changed_files, tracked_changed,
                                      untracked, present_declared, cov_missing):
    return {
        "phase": 1,
        "logical_phase_id": "feature_develop",
        "base_commit": state.get("base_commit"),
        "functional_fingerprint": gl.functional_fingerprint(state),
        "locked_all_paths": gl._changed_paths(state),
        "changed_files": changed_files,
        "tracked_changed": tracked_changed,
        "untracked": untracked,
        "declared_changed_files": contract.get("changed_files") or [],
        "declared_changed_files_present": present_declared,
        "declared_changed_files_missing": cov_missing,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--no-style", action="store_true",
                    help="deprecated: only accepted when no C/C++ files changed")
    ap.add_argument("--allow-missing-design", action="store_true",
                    help="legacy escape: allow develop without a signed AR_design "
                         "(only when this run never produced a gate_design record; "
                         "recorded as DESIGN-GATE-LEGACY-BYPASS in the signed reason)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 1)

    # DESIGN DEPENDENCY (P1a): develop refuses unless AR_design was fixed and
    # signed by gate_design.py first, and that signed evidence is still intact.
    design_bypass = ""
    design_entry = gl.latest_design_entry(pdir)
    if design_entry is None:
        if not args.allow_missing_design:
            gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                    reason="no signed AR_design — run gate_design.py first "
                           "(or --allow-missing-design for a legacy run)",
                    artifacts_rel=[])
            sys.exit("PHASE 1 FAIL: AR_design not fixed. Run gate_design.py first.")
        design_bypass = " DESIGN-GATE-LEGACY-BYPASS"
    else:
        secret = gl.load_secret(state["run_id"])
        intact = gl.verify_sig(design_entry, secret) and all(
            os.path.exists(os.path.join(pdir, a["path"]))
            and gl.sha256_file(os.path.join(pdir, a["path"])) == a["sha256"]
            for a in design_entry.get("artifacts", []))
        if not intact:
            gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                    reason="AR_design evidence tampered/removed — re-run gate_design.py",
                    artifacts_rel=[])
            sys.exit("PHASE 1 FAIL: AR_design evidence tampered. Re-run gate_design.py.")

        # P1 DESIGN CONSENT (human sign-off between design and development):
        # code development refuses unless a human recorded consent bound to THIS
        # signed AR_design (advance.py consent --phase 1). Re-running gate_design
        # produces new design bytes -> new entry_id -> old consent goes stale, so
        # the design must be re-reviewed. Checked here (develop time), before
        # base_commit is anchored, so a missing consent leaves state untouched.
        ok_c, c_reason = gl.verify_consent(state, 1, gl.entry_id(design_entry))
        if not ok_c:
            gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                    reason="AR_design not human-consented: %s — run "
                           "advance.py consent --phase 1 --token <reviewer>" % c_reason,
                    artifacts_rel=[])
            sys.exit("PHASE 1 FAIL (design consent required): %s\n"
                     "  1) review the signed AR_design + compile path (build_artifacts) in:\n"
                     "     %s\n"
                     "  2) advance.py --pipeline-dir <PDIR> consent --phase 1 --token <reviewer>\n"
                     "  3) then re-run gate_develop.py"
                     % (c_reason, os.path.join(pdir, "evidence/phase1/AR_design.md")))

    head = git(gdir, "rev-parse", "HEAD").stdout.strip()
    base = state.get("base_commit")
    if not base:
        # first development checkpoint: anchor base to current HEAD
        base = head
        state["base_commit"] = base
        # advance.py is the canonical writer, but recording the immutable base
        # anchor here is safe (it is not a phase-status mutation).
        gl.save_state(pdir, state)

    # diff (working tree + committed) against base, plus untracked files. Untracked
    # source must be visible to the gate; otherwise newly-created C++ files can
    # bypass both evidence and style checks.
    changed, tracked_changed, untracked = collect_changed_files(gdir, base)
    diff_text = build_diff_evidence(gdir, base, untracked)
    diff_rel = "evidence/phase1/diff.patch"
    with open(os.path.join(pdir, diff_rel), "w", encoding="utf-8") as f:
        f.write(diff_text)
    files_rel = "evidence/phase1/changed_files.txt"
    with open(os.path.join(pdir, files_rel), "w") as f:
        f.write("base=%s\nhead=%s\n\n[tracked]\n%s\n\n[untracked]\n%s\n"
                % (base, head, "\n".join(tracked_changed), "\n".join(untracked)))
    arts = [diff_rel, files_rel]

    if not changed:
        gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                reason="empty diff vs base %s — no code developed" % base[:12],
                artifacts_rel=arts)
        sys.exit("PHASE 1 FAIL: no changes vs base_commit")

    # Strong C/C++ gate on changed files:
    #   * C/C++ changes cannot opt out with --no-style.
    #   * the packaged code_ruleset guard must exist and pass.
    #   * missing dependent skill sources fail closed instead of "treated as pass".
    style_ok, style_detail = True, "no C/C++ files changed"
    cxx = source_files(gdir, changed)
    style_rel = "evidence/phase1/style_report.txt"
    strict_rel = "evidence/phase1/strict_cpp_report.txt"
    strict_checked, strict_issues = static_rule_checks(gdir, cxx)
    dependency_issues = []
    if cxx and not os.path.exists(STYLE_GUARD):
        dependency_issues.append("code-ruleset-style-check guard missing: %s" % STYLE_GUARD)
    if cxx and not os.path.exists(CODE_RULESET_SKILL):
        dependency_issues.append("code-ruleset-style-check skill missing: %s" % CODE_RULESET_SKILL)
    if cxx and args.no_style:
        dependency_issues.append("--no-style is not allowed when C/C++ files changed")

    if cxx and not args.no_style and os.path.exists(STYLE_GUARD):
        abs_cxx = [os.path.join(gdir, f) for f in cxx if os.path.exists(os.path.join(gdir, f))]
        cp = subprocess.run([sys.executable, STYLE_GUARD, "--format-only", *abs_cxx],
                            text=True, capture_output=True)
        style_ok = cp.returncode == 0
        style_detail = (cp.stdout + cp.stderr)[:4000]
    elif cxx:
        style_ok = False
        style_detail = "\n".join(dependency_issues) or "style check skipped unexpectedly"

    strict_ok = not strict_issues and not dependency_issues
    with open(os.path.join(pdir, style_rel), "w", encoding="utf-8") as f:
        f.write("changed_cxx=%d style_ok=%s strict_ok=%s\n\n--- oh_cpp_guard --format-only ---\n%s"
                % (len(cxx), style_ok, strict_ok, style_detail))
    arts.append(style_rel)
    with open(os.path.join(pdir, strict_rel), "w", encoding="utf-8") as f:
        f.write("rule_sources:\n")
        f.write("  - code-ruleset-style-check/SKILL.md\n")
        f.write("  - code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx\n\n")
        f.write("checked_files:\n%s\n\n" % ("\n".join(strict_checked) or "(none)"))
        f.write("blocking_issues:\n%s\n\n" % ("\n".join(strict_issues + dependency_issues) or "(none)"))
        f.write("manual_judgment_not_auto_enforced:\n")
        f.write("  - API comment quality, class copy/move intent, inheritance intent, input validation completeness\n")
        f.write("  - pointer lifetime, integer overflow proof, function size and parameter-count judgment\n")
    arts.append(strict_rel)

    # CHANGED-FILES COVERAGE (P1 hard gate for v2 contracts): every changed_files[]
    # declared in the signed ar-contract must correspond to an actually-touched
    # file. Recovered from the SIGNED design only (never the working-tree design).
    # v1 / absent contract -> nothing to enforce; tampered -> FAIL.
    cov_ok, cov_missing, cov_note = True, [], ""
    present_declared = []
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    if c_ok and contract.get("changed_files"):
        declared = contract["changed_files"]
        present_declared, cov_missing = changed_files_coverage(declared, changed)
        cov_ok = not cov_missing
        cov_rel = "evidence/phase1/changed_files_coverage.txt"
        with open(os.path.join(pdir, cov_rel), "w", encoding="utf-8") as f:
            f.write("declared (from signed ar-contract): %d\ntouched: %d\n\n"
                    % (len(declared), len(changed)))
            for d in declared:
                f.write("[%s] %s\n" % ("OK " if d not in cov_missing else "MISS", d))
        arts.append(cov_rel)
        cov_note = " changed_files_cov=%d/%d" % (len(present_declared), len(declared))
    elif c_ok:
        cov_note = " (no changed_files in contract)"
    elif c_detail and "tampered" in c_detail:
        gl.write_failure_report(pdir, 1, "gate_develop.py",
                                "ar-contract unrecoverable: %s" % c_detail,
                                resume_hint="重跑 gate_design.py 重新签名设计")
        gl.emit(pdir, 1, "gate_develop.py", verdict="FAIL",
                reason="ar-contract unrecoverable: %s" % c_detail, artifacts_rel=arts)
        sys.exit("PHASE 1 FAIL: ar-contract unrecoverable: %s" % c_detail)

    reason = ("base/head %s->%s, %d file(s) changed (%d untracked), "
              "style_ok=%s strict_ok=%s%s%s") % (
        base[:12], head[:12], len(changed), len(untracked), style_ok, strict_ok,
        cov_note, design_bypass)
    if cov_missing:
        reason += "; MISSING changed_files: %s" % ", ".join(cov_missing)
    print(reason)
    verdict = "PASS" if (style_ok and strict_ok and cov_ok) else "FAIL"

    problems = []
    if not style_ok:
        problems.append("style check failed")
    if not strict_ok:
        problems += (strict_issues + dependency_issues)
    if cov_missing:
        problems += ["declared changed_file not touched: %s" % m for m in cov_missing]
    if verdict == "PASS":
        freeze_snapshot = write_development_freeze_snapshot(
            pdir, state, contract or {}, changed, tracked_changed, untracked,
            present_declared, cov_missing)
        gl.write_control_json(
            pdir, "test_develop", "development_freeze_snapshot.json",
            payload=freeze_snapshot, best_effort=True)
        _write_handoff_to_test_develop(
            pdir, contract or {}, changed=changed,
            present_declared=present_declared,
            freeze_snapshot=freeze_snapshot)
        gl.write_phase_summary(pdir, 1, "gate_develop.py", "PASS", reason,
                               checks=["diff", "style", "strict", "changed_files"])
        gl.clear_failure_report(pdir, 1)
    else:
        gl.write_phase_summary(pdir, 1, "gate_develop.py", "FAIL", reason,
                               checks=problems)
        gl.write_failure_report(pdir, 1, "gate_develop.py", reason,
                                problems=problems,
                                resume_hint="修复后重跑 gate_develop.py")

    gl.write_gate_phase_memory_card(
        pdir, 1, "develop", verdict=verdict,
        current_blocker=None if verdict == "PASS" else reason,
        forbidden_actions=[
            "edit_design_as_if_it_were_unsigned_working_copy",
            "skip_signed_design_consent_check",
        ],
        next_expected_action_class=(
            "prepare_test_bundle" if verdict == "PASS" else "repair_or_regenerate"),
        last_failure_class=None if verdict == "PASS" else "develop_gate_failed",
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*P2_HANDOFF_PARTS))
    gl.write_gate_stage_packet_from_def(
        pdir, "feature_develop", "feature-develop", physical_phase=1)
    gl.emit(pdir, 1, "gate_develop.py", verdict=verdict, reason=reason,
            artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 1 PASS — advance.py advance --phase 1")
    else:
        sys.exit("PHASE 1 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
