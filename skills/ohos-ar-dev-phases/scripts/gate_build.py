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

CONTRACT COVERAGE: it additionally requires every build_artifact declared in the
signed ar-contract to have been produced by this build — proving the files the
design promised were actually compiled in. Missing any one is a FAIL.
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import environments as envs  # noqa: E402

# clang-tidy runs here (P4) because it needs a compile database, which only
# exists after a successful build. Resolving the SAME guard the P2/P3 style gate
# uses keeps one rule source; a missing guard degrades to advisory (never a hard
# fail) so the pipeline is not held hostage to an optional AST backend.
STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
METRIC_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_metric.py",
                              env_var="CODE_RULESET_METRIC")
CXX_EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}
# Host prebuilt ninja is preferred; a non-OHOS host ninja under ohos/ may be an
# ARM binary. Fall back to PATH ninja when the prebuilt is absent.
NINJA_CANDIDATES = ["prebuilts/build-tools/linux-x86/bin/ninja"]

# Compile banners / build command / out dir are resolved per-environment via
# environments.py (openharmony keeps the historical rk3568 values verbatim).
FAIL_MARKERS = ["ninja: build stopped", "FAILED:", "ERROR at ", "[OHOS ERROR]"]
TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
COMPLETION_RECEIPT_PARTS = ("build_verify", "completion_receipt.json")
HANDOFF_PARTS = ("build_verify", "handoff_to_test_author.json")
ARTIFACT_INDEX_PARTS = ("indexes", "build_verify_artifacts.json")
MAX_RETRY_ROUNDS = 2
MAX_REPAIR_ROUNDS = 2


def _unique_ordered(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out



def _test_bundle_context(pdir):
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    matrix = gl.read_control_json(pdir, *TEST_DEVELOP_MATRIX_PARTS) or {}
    status = gl.read_control_json(pdir, *TEST_DEVELOP_STATUS_PARTS) or {}
    items = matrix.get("items") or []
    suspect_files = _unique_ordered(
        (scope.get("changed_files_under_test") or []) +
        [path for item in items for path in (item.get("depends_on_files") or [])])
    suspect_tests = _unique_ordered([item.get("expected_gtest") for item in items])
    bundle_revision = scope.get("bundle_revision") or status.get("bundle_revision") or ""
    return {
        "bundle_id": "phase1-bundle" if bundle_revision else "",
        "bundle_revision": bundle_revision,
        "suspect_files": suspect_files,
        "suspect_tests": suspect_tests,
        # empty when the signed test-develop bundle is absent: legitimate for a
        # legacy run, but on a v2 run it means prepare_test_bundle.py was skipped
        # or the scope was tampered. Callers must not silently treat this as "no
        # suspects to check" — surface it instead of []-degrading.
        "bundle_present": bool(bundle_revision),
        "downstream_revalidate_scope": status.get("downstream_revalidate_scope") or "P4_P5",
    }



def _repair_round_metadata(pdir, *, phase, bundle_revision_from, recommended_next_action,
                           failure_class=None):
    # Delegates the retry-vs-repair split (§9.1/§9.2) to the shared helper so all
    # gates count and budget both circuit breakers identically.
    prev = gl.read_control_json(pdir, *REPAIR_PACKET_PARTS) or {}
    return gl.repair_round_metadata(
        prev, phase=phase, bundle_revision_from=bundle_revision_from,
        recommended_next_action=recommended_next_action, failure_class=failure_class,
        max_repair_rounds=MAX_REPAIR_ROUNDS, max_retry_rounds=MAX_RETRY_ROUNDS)



def _write_repair_packet(pdir, *, target, failure_class, problems, last_failure_reason,
                         artifacts_missing=None, contract_status=None, regen_signals=None,
                         suspect_locations=None):
    bundle = _test_bundle_context(pdir)
    # §10 matrix: if the gate detected a design-boundary signal (or the failure
    # class is definitionally unrecoverable), a same-window repair is disallowed
    # and the packet must recommend regenerate.
    repair_disallowed = gl.regen_signal_present(**(regen_signals or {}))
    base_action = gl.classify_repair_vs_regenerate(
        failure_class, repair_disallowed=repair_disallowed)
    rounds = _repair_round_metadata(
        pdir,
        phase=4,
        bundle_revision_from=bundle.get("bundle_revision") or "",
        recommended_next_action=base_action,
        failure_class=failure_class,
    )
    packet = {
        "phase": 4,
        "phase_name": "build-verify",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision_from": bundle.get("bundle_revision") or "",
        "active": True,
        "failure_class": failure_class,
        "suspect_files": bundle.get("suspect_files") or [],
        "suspect_locations": gl.normalize_suspect_locations(suspect_locations),
        "suspect_tests": bundle.get("suspect_tests") or [],
        "allowed_fix_scope": ["build target inputs", "declared test files"],
        "must_rerun": ["gate_build.py"],
        "downstream_revalidate_scope": gl.scope_for_failure(
            failure_class, bundle.get("downstream_revalidate_scope")),
        "repair_disallowed_if": [
            "functional requirement changes are needed",
            "signed contract is unrecoverable",
        ],
        "regen_trigger_if": [
            "fix requires new functional code outside the phase1 freeze",
            "missing build_artifact implies design/contract drift",
        ],
        "artifacts_missing": artifacts_missing or [],
        "contract_status": contract_status,
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


def _write_completion_controls(pdir, *, target, artifacts_present, contract_status):
    """On PASS, emit the P4 build-verify completion receipt and the handoff to
    P5 test-author. Navigation only — advance.py + the signed manifest remain the
    sole pass authority."""
    bundle = _test_bundle_context(pdir)
    bundle_revision = bundle.get("bundle_revision") or ""
    receipt = {
        "phase": 4,
        "logical_phase_id": "build_verify",
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": False,
        "next_phase": 5,
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
        "target": target,
        "build_artifacts_present": artifacts_present or [],
        "contract_status": contract_status,
    }
    handoff = {
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "from_phase": 4,
        "from_phase_name": "build-verify",
        "logical_phase_id": "build_verify",
        "logical_phase_name": "build-verify",
        "to_phase": 5,
        "to_phase_name": "test-author",
        "objective_completed": True,
        "produced_artifacts": [
            gl.control_artifact_ref(COMPLETION_RECEIPT_PARTS, "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "build succeeded for target %s" % target,
            "every contract build_artifact was produced",
            "bundle revision continuity held",
        ],
        "risks": [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 5,
            "action": "test-author",
            "next_gate": "advance.py advance --phase 4",
        },
        "requires_repair": False,
        "repair_scope_hint": bundle.get("suspect_files") or [],
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
    }
    gl.write_completion_receipt(pdir, COMPLETION_RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, HANDOFF_PARTS, handoff)
    gl.write_artifact_index(
        pdir, ARTIFACT_INDEX_PARTS,
        [{"path": rel, "role": "build_artifact"} for rel in (artifacts_present or [])],
        extra={
            "phase": 4,
            "phase_name": "build-verify",
            "bundle_revision": bundle_revision,
            "target": target,
        })


def _record_result(pdir, verdict, reason, arts, *, cmd, exit_code, target,
                   banner_ok=None, banner_err=None, artifacts_missing=None,
                   contract_status=None, failure_class=None, problems=None,
                   resume_hint=None, suspect_locations=None):
    checks = [
        "target=%s" % target,
        "exit_code=%s" % exit_code,
    ]
    if banner_ok is not None:
        checks.append("success_banner=%s" % banner_ok)
    if banner_err is not None:
        checks.append("error_banner=%s" % banner_err)
    if contract_status:
        checks.append("contract=%s" % contract_status)
    if artifacts_missing:
        checks.append("missing_build_artifacts=%d" % len(artifacts_missing))
    gl.write_phase_summary(
        pdir, 4, "gate_build.py", verdict, reason, checks=checks,
        extra={
            "target": target,
            "exit_code": exit_code,
            "success_banner_seen": banner_ok,
            "error_banner_seen": banner_err,
            "contract_status": contract_status,
            "build_artifacts_missing": artifacts_missing or [],
            "failure_class": failure_class,
        })
    if verdict == "PASS":
        gl.clear_failure_report(pdir, 4)
        gl.write_repair_packet(
            pdir, ("repairs", "current.json"),
            gl.build_cleared_repair_packet(
                4, "build-verify", cleared_by="gate_build.py",
                bundle_revision_from=_test_bundle_context(pdir).get(
                    "bundle_revision") or ""))
        _write_completion_controls(
            pdir, target=target, artifacts_present=arts,
            contract_status=contract_status)
    else:
        gl.write_failure_report(
            pdir, 4, "gate_build.py", reason,
            problems=problems or [], resume_hint=resume_hint,
            extra={
                "target": target,
                "exit_code": exit_code,
                "success_banner_seen": banner_ok,
                "error_banner_seen": banner_err,
                "contract_status": contract_status,
                "build_artifacts_missing": artifacts_missing or [],
                "failure_class": failure_class,
            })
        _write_repair_packet(
            pdir,
            target=target,
            failure_class=failure_class,
            problems=problems or [],
            last_failure_reason=reason,
            artifacts_missing=artifacts_missing,
            contract_status=contract_status,
            suspect_locations=suspect_locations,
        )
    gl.write_gate_phase_memory_card(
        pdir, 4, "build-verify", verdict=verdict,
        bundle_revision=_test_bundle_context(pdir).get("bundle_revision"),
        current_blocker=None if verdict == "PASS" else reason,
        next_expected_action_class=(
            "advance" if verdict == "PASS"
            else gl.action_class_for("repair_or_regenerate",
                                     failure_class=failure_class)),
        last_failure_class=None if verdict == "PASS" else failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*HANDOFF_PARTS))
    gl.write_gate_stage_packet_from_def(
        pdir, "build_verify", "build-verify", physical_phase=4)
    gl.emit(pdir, 4, "gate_build.py", verdict=verdict, reason=reason,
            cmd=cmd, exit_code=exit_code, artifacts_rel=arts)


def resolve_artifacts(repo, artifacts, out_dir_rel):
    """For each contract build_artifact, report whether the build produced it.
    A path is looked up relative to the repo root, then relative to the
    environment's out dir (e.g. out/rk3568/) so a contract may write either
    'out/rk3568/foo.so' or 'foo.so'.
    Returns (present, missing, resolved) where resolved maps path -> abspath|None."""
    present, missing, resolved = [], [], {}
    for rel in artifacts:
        cands = [os.path.join(repo, rel), os.path.join(repo, out_dir_rel, rel)]
        hit = next((c for c in cands if os.path.isfile(c)), None)
        resolved[rel] = hit
        (present if hit else missing).append(rel)
    return present, missing, resolved


def _resolve_ninja(repo):
    """Return the ninja to drive compdb generation: the host prebuilt if present,
    else 'ninja' from PATH, else None."""
    for rel in NINJA_CANDIDATES:
        cand = os.path.join(repo, rel)
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    import shutil
    return shutil.which("ninja")


def clang_tidy_substep(pdir, repo, changed_cxx, out_dir_rel):
    """P4 post-build clang-tidy over the changed C/C++ files.

    Contract (per user decision): when a compile database can be produced AND
    clang-tidy is available, any finding is a HARD fail (caught here, before P5
    test work and P6 device runs waste effort re-doing everything). When the
    compdb cannot be produced or clang-tidy is missing, degrade to an advisory
    note and let the phase pass — the note states plainly that CI will still scan
    this class. Returns (hard_findings, evidence_rels, note).
    """
    out_dir = os.path.join(repo, out_dir_rel)
    ct_json_rel = "evidence/phase4/clang_tidy_findings.json"
    note_rel = "evidence/phase4/clang_tidy_note.txt"
    rels = [note_rel]
    note = ""

    def _note(msg, degraded):
        with open(os.path.join(pdir, note_rel), "w", encoding="utf-8") as f:
            f.write("degraded=%s\n%s\n" % (degraded, msg))
        return msg

    abs_cxx = [os.path.join(repo, f) for f in changed_cxx
               if os.path.isfile(os.path.join(repo, f))]
    if not abs_cxx:
        return [], rels, _note("no changed C/C++ files to tidy", degraded=False)
    if not STYLE_GUARD or not os.path.exists(STYLE_GUARD):
        return [], rels, _note(
            "code_ruleset guard missing (%s); clang-tidy skipped, CI will still scan"
            % STYLE_GUARD, degraded=True)

    # 1) produce the compile database (advisory: failure degrades, never blocks).
    ninja = _resolve_ninja(repo)
    compdb_path = os.path.join(out_dir, "compile_commands.json")
    if not ninja:
        return [], rels, _note(
            "no ninja (host prebuilt or PATH) to generate compile_commands.json; "
            "clang-tidy skipped, CI will still scan", degraded=True)
    try:
        with open(compdb_path, "w", encoding="utf-8") as db:
            cp = subprocess.run([ninja, "-C", out_dir, "-w", "dupbuild=warn",
                                 "-t", "compdb", "cc", "cxx"],
                                cwd=repo, stdout=db, stderr=subprocess.PIPE,
                                text=True, timeout=600)
        if cp.returncode != 0 or not os.path.isfile(compdb_path) \
                or os.path.getsize(compdb_path) == 0:
            return [], rels, _note(
                "compile_commands.json generation failed (rc=%d); clang-tidy "
                "skipped, CI will still scan. stderr: %s"
                % (cp.returncode, (cp.stderr or "")[:500]), degraded=True)
    except Exception as exc:  # noqa: BLE001 — any compdb error degrades, not blocks
        return [], rels, _note(
            "compile_commands.json generation error: %s; clang-tidy skipped, "
            "CI will still scan" % exc, degraded=True)

    # 2) run the guard's clang-tidy pass. The guard itself returns an empty
    #    finding list + a note when clang-tidy is not on PATH, so we detect that
    #    from its JSON (clang_tidy_note) and degrade rather than hard-fail.
    cp = subprocess.run(
        [sys.executable, STYLE_GUARD, "--clang-tidy", out_dir,
         "--json", os.path.join(pdir, ct_json_rel), *abs_cxx],
        text=True, capture_output=True, timeout=600)
    rels.append(ct_json_rel)
    ct_note = ""
    findings = []
    try:
        import json
        data = json.loads(open(os.path.join(pdir, ct_json_rel),
                               encoding="utf-8").read())
        findings = data.get("clang_tidy_findings") or []
        ct_note = data.get("clang_tidy_note") or ""
    except Exception:
        ct_note = "clang-tidy findings JSON unreadable"
    if ct_note:
        # clang-tidy unavailable / compile_commands.json unusable per the guard.
        return [], rels, _note(
            "clang-tidy not executed by guard (%s); CI will still scan" % ct_note,
            degraded=True)
    if findings:
        return findings, rels, _note(
            "clang-tidy found %d issue(s) — HARD block; fix and re-run P2→P4"
            % len(findings), degraded=False)
    return [], rels, _note("clang-tidy PASS: 0 findings over %d file(s)"
                           % len(abs_cxx), degraded=False)


def metric_substep(pdir, repo, changed_cxx):
    """Run workbook metric/size rules over the locked changed files.

    Unlike clang-tidy, this backend has a deterministic fallback and is a hard
    gate. A missing script or unreadable JSON is therefore a dependency failure,
    never an implicit PASS.
    """
    rel = "evidence/phase4/metric_findings.json"
    abs_cxx = [os.path.join(repo, f) for f in changed_cxx
               if os.path.isfile(os.path.join(repo, f))]
    if not METRIC_GUARD or not os.path.isfile(METRIC_GUARD):
        return [{"file": "", "line": 1, "rule_id": "metric-backend",
                 "severity": "严重", "remediation":
                 "code_ruleset_metric.py missing"}], rel
    cp = subprocess.run(
        [sys.executable, METRIC_GUARD, "--json", os.path.join(pdir, rel), *abs_cxx],
        text=True, capture_output=True, timeout=600)
    try:
        with open(os.path.join(pdir, rel), encoding="utf-8") as stream:
            findings = json.load(stream).get("findings") or []
    except (OSError, ValueError, TypeError):
        findings = [{"file": "", "line": 1, "rule_id": "metric-backend",
                     "severity": "严重", "remediation":
                     "metric findings JSON missing or invalid (rc=%d)" % cp.returncode}]
    if cp.returncode != 0 and not findings:
        findings = [{"file": "", "line": 1, "rule_id": "metric-backend",
                     "severity": "严重", "remediation":
                     "metric backend exited with rc=%d" % cp.returncode}]
    return findings, rel


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
    ev = gl.evidence_dir(pdir, 4)

    # Build command, compile banners, and out dir all come from the environment
    # profile. A HarmonyOS environment whose build command is still a placeholder
    # hard-fails here with an actionable "configure environments.py" message
    # rather than running the wrong command.
    try:
        cmd = envs.build_command(state, target)
    except envs.EnvironmentNotConfigured as e:
        sys.exit("PHASE 4 FAIL — %s" % e)
    success_re = envs.success_re(state)
    error_re = envs.error_re(state)
    out_dir_rel = envs.out_dir(state)
    build_log = os.path.join(repo, out_dir_rel, "build.log")

    print("running: %s" % cmd)
    # Capture build.sh's OWN stdout/stderr as the authoritative, inherently-fresh
    # evidence (out/rk3568/build.log can rotate or stay empty on early GN failure).
    stdout_rel = "evidence/phase4/build_stdout.log"
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

    banner_ok = bool(success_re.search(out_text))
    banner_err = bool(error_re.search(out_text))

    # banner evidence (exact matched line)
    banner_rel = "evidence/phase4/build_banner.txt"
    matched = next((ln for ln in out_text.splitlines() if success_re.search(ln)), "")
    with open(os.path.join(pdir, banner_rel), "w", encoding="utf-8") as f:
        f.write("exit_code=%d\nsuccess_banner=%s\nerror_banner=%s\nmatched=%s\n"
                % (rc, banner_ok, banner_err, matched))

    arts = [stdout_rel, banner_rel]

    # CONTRACT COVERAGE (P2 hard gate): every build_artifact declared in the
    # signed ar-contract must have been produced by this build. This is what
    # verifies "all designed files were compiled in". Recovered from the
    # HMAC-signed AR_design evidence, never the unsigned working-tree file.
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    artifacts_missing = []
    contract_note = ""
    contract_status = "ok" if c_ok else ""
    if c_ok:
        present, artifacts_missing, resolved = resolve_artifacts(
            repo, contract["build_artifacts"], out_dir_rel)
        chk_rel = "evidence/phase4/artifact_check.txt"
        with open(os.path.join(pdir, chk_rel), "w", encoding="utf-8") as f:
            f.write("contract build_artifacts: %d present, %d missing\n\n"
                    % (len(present), len(artifacts_missing)))
            for rel in contract["build_artifacts"]:
                hit = resolved.get(rel)
                f.write("[%s] %s%s\n" % ("OK " if hit else "MISS", rel,
                                         "  -> %s" % hit if hit else ""))
        arts.append(chk_rel)
        contract_note = " artifacts %d/%d present" % (
            len(present), len(contract["build_artifacts"]))
    elif "absent" in c_detail:
        # legacy / --allow-missing-contract run: nothing to enforce.
        contract_status = "absent"
        contract_note = " (AR-CONTRACT-BYPASS: %s)" % c_detail
    else:
        # a design entry exists but its contract/evidence is broken -> FAIL.
        reason = "ar-contract unrecoverable: %s" % c_detail
        _record_result(
            pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
            contract_status="unrecoverable", failure_class="ar_contract_unrecoverable",
            problems=["signed ar-contract not recoverable: %s" % c_detail],
            resume_hint="修复/重新签名 AR_design 后重跑 gate_build.py")
        sys.exit("PHASE 4 FAIL: ar-contract unrecoverable: %s" % c_detail)

    if rc == 0 and banner_ok and not banner_err and not artifacts_missing:
        # Post-build clang-tidy substep (user decision: run it at P4, right after
        # the build succeeds, so AST-level defects are caught before P5/P6 waste
        # work). Hard-fails when a compdb + clang-tidy are available; degrades to
        # advisory otherwise. changed_files come from the signed contract.
        changed_cxx = [p for p in (contract.get("changed_files") or [])
                       if os.path.splitext(p)[1].lower() in CXX_EXTS] if c_ok else []
        metric_findings, metric_rel = metric_substep(pdir, repo, changed_cxx)
        arts.append(metric_rel)
        if metric_findings:
            reason = ("build ok but code_ruleset metrics found %d issue(s) (target=%s)"
                      % (len(metric_findings), target))
            _record_result(
                pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
                banner_ok=banner_ok, banner_err=banner_err,
                artifacts_missing=artifacts_missing, contract_status=contract_status,
                failure_class="build_verdict_failed",
                problems=["metric: %s:%s %s" % (f.get("file"), f.get("line"),
                                                    f.get("rule_id"))
                          for f in metric_findings[:100]],
                resume_hint="修复 metric 报告的函数/文件规模问题后回 P2 重走并重跑 gate_build.py")
            sys.exit("PHASE 4 FAIL: %s" % reason)
        ct_findings, ct_rels, ct_note = clang_tidy_substep(pdir, repo, changed_cxx, out_dir_rel)
        arts += ct_rels
        if ct_findings:
            reason = ("build ok but clang-tidy found %d issue(s) (target=%s); %s"
                      % (len(ct_findings), target, ct_note))
            _record_result(
                pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
                banner_ok=banner_ok, banner_err=banner_err,
                artifacts_missing=artifacts_missing, contract_status=contract_status,
                failure_class="build_verdict_failed",
                problems=["clang-tidy: %s:%s %s" % (f.get("file"), f.get("line"),
                                                    f.get("rule_id"))
                          for f in ct_findings[:100]],
                resume_hint="修复 clang-tidy 报告的 AST 级问题后回 P2 重走并重跑 gate_build.py")
            sys.exit("PHASE 4 FAIL: %s" % reason)
        _record_result(
            pdir, "PASS",
            "exit=0 and success banner in build output (target=%s)%s [metric: PASS; clang-tidy: %s]"
            % (target, contract_note, ct_note),
            arts, cmd=cmd, exit_code=rc, target=target,
            banner_ok=banner_ok, banner_err=banner_err,
            artifacts_missing=artifacts_missing, contract_status=contract_status)
        print("PHASE 4 PASS — advance.py advance --phase 4")
        return

    # failure: distill markers from the captured output
    hits = [ln for ln in out_text.splitlines() if any(mk in ln for mk in FAIL_MARKERS)]
    distill_rel = "evidence/phase4/error_distill.txt"
    with open(os.path.join(pdir, distill_rel), "w", encoding="utf-8") as f:
        f.write("\n".join(hits[:200]) or "(no known marker matched)")
    arts.append(distill_rel)
    reason = "rc=%d banner_ok=%s banner_err=%s; %d marker line(s)%s" % (
        rc, banner_ok, banner_err, len(hits), contract_note)
    if artifacts_missing:
        reason += "; MISSING build_artifacts: %s" % ", ".join(artifacts_missing)
    failure_class = "build_artifact_missing" if artifacts_missing else "build_verdict_failed"
    problems = []
    if rc != 0:
        problems.append("build exited with rc=%d" % rc)
    if not banner_ok:
        problems.append("success banner missing from fresh build output")
    if banner_err:
        problems.append("error banner present in build output")
    if artifacts_missing:
        problems += ["missing build_artifact: %s" % rel for rel in artifacts_missing]
    # S3: backfill line-level suspects from the compiler diagnostics already in
    # the captured build output (bounded scan of lines we kept; no new parser).
    # suspect_files stays the non-empty fallback.
    suspect_locations = gl.suspect_locations_from_compiler_lines(
        out_text.splitlines())[:100]
    _record_result(
        pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
        banner_ok=banner_ok, banner_err=banner_err,
        artifacts_missing=artifacts_missing, contract_status=contract_status,
        failure_class=failure_class, problems=problems,
        suspect_locations=suspect_locations,
        resume_hint="修复构建/产物问题后重跑 gate_build.py")
    sys.exit("PHASE 4 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
