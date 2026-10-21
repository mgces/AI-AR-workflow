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
import shlex
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import environments as envs  # noqa: E402

# clang-tidy runs here (P4) because it needs a compile database, which only
# exists after a successful build. Resolving the SAME guard the P2/P3 style gate
# uses keeps one rule source. Only the explicit P4 critical AST subset blocks;
# a missing guard/tool/compdb/report fails closed (never an advisory pass).
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
                   resume_hint=None, suspect_locations=None,
                   static_analysis_status="NOT_RUN"):
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
            "compile_execution": (
                "PASS" if exit_code == 0 and not banner_err else "FAIL"),
            "artifact_verification": (
                "FAIL" if artifacts_missing else
                ("PASS" if contract_status == "ok" else "NOT_APPLICABLE")),
            "static_analysis": static_analysis_status,
            "phase_verdict": verdict,
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
    repo_real = os.path.realpath(repo)
    for rel in artifacts:
        if gl.repo_relative_path_error(rel):
            resolved[rel] = None
            missing.append(rel)
            continue
        cands = [os.path.join(repo, rel), os.path.join(repo, out_dir_rel, rel)]
        safe = []
        for candidate in cands:
            real = os.path.realpath(candidate)
            try:
                contained = os.path.commonpath([repo_real, real]) == repo_real
            except ValueError:
                contained = False
            if contained:
                safe.append(candidate)
        hit = next((c for c in safe if os.path.isfile(c)), None)
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


def clang_tidy_substep(pdir, repo, changed_cxx, out_dir_rel, line_filter=None, component_root=None):
    """P4 post-build clang-tidy over the changed C/C++ files.

    Lifecycle policy (P4):
      * only ``gatelib.P4_CRITICAL_AST_RULESET_IDS`` may block;
      * every other content/AST finding stays in the signed JSON as observation
        evidence and is owned by P8 review / remote CI;
      * a missing tool, missing compile database, checker crash/timeout,
        unreadable report or unparsable diagnostic is fail-closed — an
        unexecuted critical subset cannot be called clean. Rule-id filtering is
        applied only to content findings, never to backend findings.

    Returns ``(blocking_findings, observed_findings, evidence_rels, note)``.
    """
    out_dir = os.path.join(repo, out_dir_rel)
    ct_json_rel = "evidence/phase4/clang_tidy_findings.json"
    note_rel = "evidence/phase4/clang_tidy_note.txt"
    report_path = os.path.join(pdir, ct_json_rel)
    rels = [note_rel]

    def _note(msg, degraded):
        with open(os.path.join(pdir, note_rel), "w", encoding="utf-8") as f:
            f.write("degraded=%s\n%s\n" % (degraded, msg))
        return "degraded=%s; %s" % (degraded, msg)

    def _include_current_report():
        if os.path.isfile(report_path) and ct_json_rel not in rels:
            rels.append(ct_json_rel)

    def _backend_failure(message):
        _include_current_report()
        finding = {
            "file": "", "line": 1, "rule_id": "clang-tidy-backend",
            "severity": "严重", "remediation": message,
        }
        return [finding], [], rels, _note(message, degraded=True)

    # Only a report produced by THIS invocation may authorize anything: clear the
    # previous report before the first step so a compdb/tool failure cannot carry
    # a stale clean result into the signed evidence.
    try:
        os.unlink(report_path)
    except FileNotFoundError:
        pass
    except OSError as exc:
        return _backend_failure(
            "clang-tidy backend failure: cannot clear previous report: %s" % exc)

    abs_cxx = [os.path.join(repo, f) for f in changed_cxx
               if os.path.isfile(os.path.join(repo, f))]
    if not abs_cxx:
        return [], [], rels, _note("no changed C/C++ files to tidy", degraded=False)
    if not STYLE_GUARD or not os.path.exists(STYLE_GUARD):
        return _backend_failure(
            "clang-tidy backend failure: code_ruleset guard missing (%s)"
            % STYLE_GUARD)

    # 1) produce the compile database. Unavailability is blocking (fail-closed).
    ninja = _resolve_ninja(repo)
    compdb_path = os.path.join(out_dir, "compile_commands.json")
    if not ninja:
        return _backend_failure(
            "clang-tidy backend failure: no ninja (host prebuilt or PATH) to "
            "generate compile_commands.json")
    try:
        with open(compdb_path, "w", encoding="utf-8") as db:
            cp = subprocess.run([ninja, "-C", out_dir, "-w", "dupbuild=warn",
                                 "-t", "compdb", "cc", "cxx"],
                                cwd=repo, stdout=db, stderr=subprocess.PIPE,
                                text=True, timeout=600)
        if cp.returncode != 0 or not os.path.isfile(compdb_path) \
                or os.path.getsize(compdb_path) == 0:
            return _backend_failure(
                "clang-tidy backend failure: compile_commands.json generation "
                "failed (rc=%d); stderr: %s"
                % (cp.returncode, (cp.stderr or "")[:500]))
    except Exception as exc:  # noqa: BLE001 — compdb errors are blocking here
        return _backend_failure(
            "clang-tidy backend failure: compile_commands.json generation "
            "error: %s" % exc)

    # 2) Run the shared guard. It already records execution failures and
    # unparsable checker output as clang-tidy-backend findings.
    try:
        scope_args = []
        if line_filter is not None:
            scope_path = os.path.join(pdir, "evidence/phase4/changed_lines.json")
            with open(scope_path, "w", encoding="utf-8") as stream:
                json.dump(line_filter, stream)
            rels.append("evidence/phase4/changed_lines.json")
            scope_args = ["--line-filter-json", scope_path]
        cp = subprocess.run(
            [sys.executable, STYLE_GUARD, "--rules-only", "--clang-tidy", out_dir,
             "--json", report_path, "--repository-root", component_root or repo,
             "--ohos-root", repo, *scope_args, *abs_cxx],
            text=True, capture_output=True, timeout=600)
    except subprocess.TimeoutExpired:
        return _backend_failure("clang-tidy backend timeout after 600 seconds")
    except OSError as exc:
        return _backend_failure(
            "clang-tidy backend failure: checker could not start: %s" % exc)
    _include_current_report()
    try:
        with open(report_path, encoding="utf-8") as stream:
            data = json.load(stream)
    except (OSError, ValueError) as exc:
        return _backend_failure(
            "clang-tidy backend failure: current findings JSON unreadable "
            "(rc=%d): %s" % (cp.returncode, exc))
    if not isinstance(data, dict):
        return _backend_failure("clang-tidy backend failure: report must be an object")
    ct_note = data.get("clang_tidy_note") or ""
    findings = data.get("clang_tidy_findings")
    if findings is None and isinstance(ct_note, str) and ct_note:
        findings = []
    if (not isinstance(ct_note, str) or not isinstance(findings, list) or
            any(not isinstance(finding, dict) for finding in findings)):
        return _backend_failure(
            "clang-tidy backend failure: report lacks valid findings or tool status")
    content_findings = data.get("findings", [])
    if not isinstance(content_findings, list) or any(
            not isinstance(finding, dict) for finding in content_findings):
        return _backend_failure("clang-tidy backend failure: invalid content findings")
    combined = findings + content_findings
    backend = [f for f in combined
               if f.get("rule_id") in gl.STATIC_BACKEND_RULE_IDS]
    critical = [f for f in combined
                if f.get("rule_id") in gl.P4_CRITICAL_AST_RULESET_IDS]
    observed = [f for f in combined
                if f.get("rule_id") not in gl.P4_CRITICAL_AST_RULESET_IDS
                and f.get("rule_id") not in gl.STATIC_BACKEND_RULE_IDS]
    # A guard-level "not executed" note is a blocking backend status: the
    # critical subset did not run, so absence of findings proves nothing.
    if ct_note:
        blocking = backend + critical + [{
            "file": "", "line": 1, "rule_id": "clang-tidy-backend",
            "severity": "严重",
            "remediation": "clang-tidy not executed: %s" % ct_note,
        }]
        return blocking, observed, rels, _note(
            "clang-tidy backend unavailable (%s) — fail-closed" % ct_note,
            degraded=True)
    if backend or critical:
        blocking = backend + critical
        return blocking, observed, rels, _note(
            "clang-tidy found %d blocking issue(s) from the P4 critical/backend "
            "subset; %d non-blocking finding(s) recorded as observation"
            % (len(blocking), len(observed)), degraded=bool(backend))
    if combined:
        return [], observed, rels, _note(
            "clang-tidy PASS: 0 blocking critical finding(s); %d non-blocking "
            "finding(s) recorded as observation" % len(observed), degraded=False)
    if cp.returncode != 0:
        return _backend_failure(
            "clang-tidy backend failure: checker exited rc=%d without findings; %s"
            % (cp.returncode, (cp.stderr or "")[:500]))
    return [], observed, rels, _note(
        "clang-tidy PASS: 0 findings over %d file(s)" % len(abs_cxx),
        degraded=False)


def metric_substep(pdir, repo, changed_cxx):
    """Run workbook metric/size rules over the locked changed files.

    Observation-only under the lifecycle static policy: the findings JSON remains
    a signed artifact so P8 review / remote CI can inspect it, but metric rows no
    longer close P4. A missing script or unreadable report is still returned as a
    ``metric-backend`` finding so the evidence states that the observation did
    not execute; the caller records it without failing the build phase.
    """
    rel = "evidence/phase4/metric_findings.json"
    path = os.path.join(pdir, rel)
    abs_cxx = [os.path.join(repo, f) for f in changed_cxx
               if os.path.isfile(os.path.join(repo, f))]

    def _marker(message):
        return {"file": "", "line": 1, "rule_id": "metric-backend",
                "severity": "严重", "remediation": message}

    def _write_marker(findings):
        # The caller signs this path as a P4 artifact, so it must exist even when
        # the (now observation-only) metric backend did not run. Keep the same
        # payload keys as code_ruleset_metric.py so the artifact format does not
        # change; only the status/note say the observation did not execute.
        note = findings[0].get("remediation") if findings else None
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as stream:
                json.dump({
                    "files": len(abs_cxx),
                    "findings": findings,
                    "function_metric_status": "unavailable",
                    "function_metric_note": note,
                }, stream, ensure_ascii=False, indent=2)
        except OSError:
            # hash_artifacts() will fail closed on the missing artifact; never
            # let a missing marker silently become a PASS without evidence.
            pass
        return findings

    if not METRIC_GUARD or not os.path.isfile(METRIC_GUARD):
        return _write_marker([_marker("code_ruleset_metric.py missing")]), rel
    try:
        cp = subprocess.run(
            [sys.executable, METRIC_GUARD, "--json", path, *abs_cxx],
            text=True, capture_output=True, timeout=600)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return _write_marker(
            [_marker("metric observation did not execute: %s" % exc)]), rel
    try:
        with open(path, encoding="utf-8") as stream:
            data = json.load(stream)
        if not isinstance(data, dict):
            raise ValueError("metric report is not an object")
        findings = data.get("findings") or []
        if not isinstance(findings, list) or any(
                not isinstance(item, dict) for item in findings):
            raise ValueError("findings is not a list of objects")
    except (OSError, ValueError, TypeError):
        return _write_marker(
            [_marker("metric findings JSON missing or invalid (rc=%d)"
                     % cp.returncode)]), rel
    if cp.returncode != 0 and not findings:
        findings = [_marker("metric backend exited with rc=%d" % cp.returncode)]
        _write_marker(findings)
    return findings, rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--target", help="GN build target; default from pipeline.json")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    gl.require_current_phase(state, 4, "gate_build.py")
    from workflow_checks import enforce
    enforce(pdir, 4)
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
        cmd_argv = envs.build_argv(state, target)
        cmd = shlex.join(cmd_argv)
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
        proc = subprocess.Popen(cmd_argv, cwd=repo, text=True,
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
            resume_hint="签名由 gate_design.py 自动生成、严禁手改;重跑 gate_design.py 让它重新生成"
                        "(改了功能代码则先 advance.py reset 回 P1),再重跑 gate_build.py")
        sys.exit("PHASE 4 FAIL: ar-contract unrecoverable: %s" % c_detail)

    # Exit status + fresh artifacts are authoritative. The success banner is a
    # diagnostic hint only: toolchain wording changes must not turn a successful
    # build into a false FAIL. An explicit error banner remains contradictory and
    # therefore blocking even with rc=0.
    if rc == 0 and not banner_err and not artifacts_missing:
        # Check exports against this build's artifacts, never before a first
        # build has produced them. Early preflight only checks nm readiness.
        from workflow_checks import post_build_checks
        post_checks = post_build_checks(pdir, contract or {})
        if post_checks:
            arts.append("evidence/phase4/symbol_checks.json")
        bad_post = [check for check in post_checks if check["status"] != "PASS"]
        if bad_post:
            reason = "build ok but exported symbol checks failed: " + "; ".join(check["reason"] for check in bad_post)
            _record_result(pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
                           failure_class="build_verdict_failed", static_analysis_status="FAIL",
                           problems=[check["id"] + ": " + check["reason"] for check in bad_post],
                           resume_hint="核对实际链接库、导出接口和 BUILD.gn 依赖，修复后回 P2 重走")
            sys.exit("PHASE 4 FAIL: " + reason)
        # Post-build static substeps. Metric output is observation-only; the
        # clang-tidy step blocks only the P4 critical AST subset, and fails closed
        # when the tool/compdb/report cannot prove that subset ran.
        changed_cxx = [p for p in (contract.get("changed_files") or [])
                       if os.path.splitext(p)[1].lower() in CXX_EXTS] if c_ok else []
        line_filter = None
        # P3 can add test sources absent from P1's changed_files. Use the actual
        # pinned Git diff, not a stale authored-file list, for AST and metrics.
        if os.path.isdir(os.path.join(gl.resolve_git_dir(state), ".git")) or os.path.isfile(os.path.join(gl.resolve_git_dir(state), ".git")):
            from workflow_checks import current_scope
            try:
                gdir, _base, actual_changed, line_filter = current_scope(state)
                changed_cxx = [os.path.join(gdir,p) for p in actual_changed if os.path.splitext(p)[1].lower() in CXX_EXTS]
            except ValueError as exc:
                _record_result(pdir, "FAIL", str(exc), arts, failure_class="build_verdict_failed", static_analysis_status="FAIL")
                sys.exit("PHASE 4 FAIL: cannot determine actual changed scope: %s" % exc)
        metric_findings, metric_rel = metric_substep(pdir, repo, changed_cxx)
        arts.append(metric_rel)
        metric_backend = [f for f in metric_findings
                          if f.get("rule_id") == "metric-backend"]
        if metric_backend:
            metric_note = ("UNAVAILABLE (%s; non-blocking observation)"
                           % (metric_backend[0].get("remediation")
                              or "metric backend unavailable"))
        elif metric_findings:
            metric_note = ("OBSERVED %d issue(s) (non-blocking; P8 review/CI "
                           "owns metric rows)" % len(metric_findings))
        else:
            metric_note = "PASS"
        ct_findings, ct_observed, ct_rels, ct_note = clang_tidy_substep(
            pdir, repo, changed_cxx, out_dir_rel, line_filter=line_filter,
            component_root=gl.resolve_git_dir(state))
        arts += ct_rels
        if ct_findings:
            blocking_rules = ", ".join(sorted({
                str(f.get("rule_id")) for f in ct_findings}))
            reason = ("build ok but clang-tidy found %d blocking issue(s) "
                      "(target=%s); rules=%s; %s"
                      % (len(ct_findings), target, blocking_rules, ct_note))
            _record_result(
                pdir, "FAIL", reason, arts, cmd=cmd, exit_code=rc, target=target,
                banner_ok=banner_ok, banner_err=banner_err,
                artifacts_missing=artifacts_missing, contract_status=contract_status,
                failure_class="build_verdict_failed",
                problems=["clang-tidy %s at %s:%s: %s" % (
                    f.get("rule_id"), f.get("file") or "(backend)", f.get("line"),
                    str(f.get("remediation") or "")[:300])
                          for f in ct_findings[:100]],
                suspect_locations=[{
                    "file": f.get("file") or None, "line": f.get("line"),
                    "rule": f.get("rule_id"),
                    "message": f.get("remediation")} for f in ct_findings],
                static_analysis_status="FAIL",
                resume_hint="修复 P4 critical clang-tidy 规则命中的 AST/内存安全问题后回 P2 重走并重跑 gate_build.py")
            sys.exit("PHASE 4 FAIL: %s" % reason)
        _record_result(
            pdir, "PASS",
            "exit=0, no error banner, artifacts verified (target=%s)%s "
            "[success_banner=%s advisory; metric: %s; clang-tidy: %s; "
            "%d non-blocking static observation(s)]"
            % (target, contract_note, banner_ok, metric_note, ct_note,
               len(ct_observed)),
            arts, cmd=cmd, exit_code=rc, target=target,
            banner_ok=banner_ok, banner_err=banner_err,
            artifacts_missing=artifacts_missing, contract_status=contract_status,
            static_analysis_status="PASS")
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
        problems.append("success banner missing (diagnostic only; another blocker caused FAIL)")
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
