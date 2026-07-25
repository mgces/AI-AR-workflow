#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
advance.py — the ONLY writer of phase status in pipeline.json.

The orchestrating model has no tool that edits pipeline.json. To move the
pipeline forward it must run this script, which refuses unless the just-finished
phase produced a valid, HMAC-signed, artifact-hash-matching PASS record (see
gatelib.validate_closing_entry). This is what makes "free text == done"
structurally impossible.

Subcommands:
  init        create pipeline.json + per-run secret + dirs from an AR.
  advance     close phase N (must be current_phase) and bump to N+1.
  verify-all  re-validate every already-passed phase (resume / tamper check).
  status      print a compact phase table (or json with --json).
  next        derive the next machine-readable action and write next_action.json.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

# Phases whose evidence gate must be followed by an explicit human sign-off
# before advancing (the pipeline stops and shows real results/artifacts first).
CONSENT_PHASES = {
    4: "device functional test",
    5: "quality reports and code review",
    6: "upload push",
}

# Phases where only NEW test files may appear beyond the P1-locked path set
# (development is done; from here on the tree may add independent tests only).
TEST_ONLY_PHASES = (3, 4, 5)

PHASE_GATE_CMD = {
    0: "gate_env_init.py",
    1: "gate_develop.py",
    2: "gate_build.py",
    3: "gate_test_ut.py",
    4: "gate_device_func.py",
    5: "gate_integration.py",
    6: "gate_upload_ci.py",
}

CONTROL_PROTOCOL_VERSION = 1
TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_FREEZE_PARTS = ("test_develop", "development_freeze_snapshot.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
QUALITY_SUBSTATE_PARTS = ("quality_verify", "substate.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
P7_FAILURE_TO_SUBSTATE = {
    "fresh_report_missing": "integration_run",
    "summary_report_missing": "integration_run",
    "integration_test_failed": "integration_run",
    "quality_reports_missing_or_invalid": "quality_check",
    "code_review_blocked": "review_check",
}
P7_SUBSTATE_NAMES = {
    "integration_run": "integration-run",
    "quality_check": "quality-check",
    "review_check": "review-check",
    "human_review_await": "human-review-await",
}
UPLOAD_SUBSTATE_PARTS = ("upload_review", "substate.json")
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
    "pr_review_blocked": "pr_review",
    "ci_not_green": "ci_green",
    "pr_head_sha_mismatch": "ci_green",
    "sha_mismatch": "ci_green",
    "review_ci_sha_conflict": "ci_green",
    "external_api_unstable": "ci_green",
    "upload_ci_failed": "ci_green",
}
P8_SUBSTATE_NAMES = {
    "precheck": "precheck",
    "local_review": "local-review",
    "consent_await": "consent-await",
    "push_pr": "push-pr",
    "pr_review": "pr-review",
    "ci_green": "ci-green",
    "finalize": "finalize",
}


def check_code_drift(state, phase):
    """Return (ok, message). Enforces, for phase>=2:

    New (layered) runs — a functional fingerprint was locked at P1:
      * the functional fingerprint (non-test paths' content) must still match →
        any edit/add/delete of functional code or config is drift;
      * in TEST_ONLY_PHASES, every path that appeared since P1 must be a test
        path → only independent test files may be added.

    Legacy runs — only the old full-tree `code_fingerprint` was locked:
      * fall back to the original whole-tree drift check (behavior unchanged).
    """
    if phase < 2:
        return True, "ok"
    flocked = state.get("functional_fingerprint")
    if flocked is not None:
        now_func = gl.functional_fingerprint(state)
        if now_func != flocked:
            return False, (
                "REFUSED: functional code/config changed since P1 "
                "(functional fingerprint %s.. != locked %s..).\n"
                "Build/test/device evidence no longer matches the current code.\n"
                "Rewalk from development:\n"
                "  advance.py --pipeline-dir <PDIR> reset --reason \"<what you fixed>\"\n"
                "then redo P1→ in order." % (now_func[:8], flocked[:8]))
        if phase in TEST_ONLY_PHASES:
            base_paths = set(state.get("locked_all_paths") or [])
            new_paths = [p for p in gl._changed_paths(state) if p not in base_paths]
            non_test = [p for p in new_paths if gl.classify_path(p) != "test"]
            if non_test:
                return False, (
                    "REFUSED: phase %d may add INDEPENDENT TEST files only, but new "
                    "non-test path(s) appeared since P1:\n  %s\n"
                    "Functional code must be written in P1. Rewalk:\n"
                    "  advance.py --pipeline-dir <PDIR> reset --reason \"<why>\""
                    % (phase, "\n  ".join(non_test)))
        return True, "ok"
    # legacy run: whole-tree fingerprint
    locked = state.get("code_fingerprint")
    if locked and gl.code_fingerprint(state) != locked:
        return False, (
            "REFUSED: code changed since P1 (fingerprint drift, legacy run).\n"
            "  advance.py --pipeline-dir <PDIR> reset --reason \"<what you fixed>\"")
    return True, "ok"


def _last_failure(entries):
    for entry in reversed(entries):
        if entry.get("verdict") == "FAIL":
            return {
                "phase": entry.get("phase"),
                "gate": entry.get("gate"),
                "reason": entry.get("reason"),
                "ts_utc": entry.get("ts_utc"),
                "entry_id": gl.entry_id(entry),
            }
    return None


def _legacy_mode(pdir, state, entries):
    if any("LEGACY-BYPASS" in str(e.get("reason", "")) for e in entries):
        return True
    if state.get("current_phase", 0) >= 2 and gl.latest_design_entry(pdir) is None:
        return True
    return False


def _phase_required_inputs(phase, substate):
    if substate in ("ready_to_advance", "ready_to_build_verify", "complete"):
        return []
    if substate in ("awaiting_consent", "awaiting_design_consent"):
        return ["reviewer_token"]
    if substate == "awaiting_design_gate":
        return ["AR_design.md"]
    if substate == "awaiting_develop_gate":
        return ["working_tree_changes"]
    if substate == "awaiting_test_develop_gate":
        return ["development_freeze_snapshot", "signed_test_scope"]
    return {
        0: ["build_target"],
        2: ["build_target"],
        3: ["unit_test_results"],
        4: ["device_serial", "device_run_artifacts"],
        5: ["quality_reports", "review_report"],
        6: ["review_reports", "pr_and_ci_metadata"],
    }.get(phase, [])


def _phase_resume_hint(phase, substate, reason=None):
    if substate == "complete":
        return "All phases are closed by signed evidence; the pipeline is complete."
    if substate == "ready_to_advance":
        return "The current phase already has valid signed PASS evidence; run advance.py advance to close it."
    if substate == "ready_to_build_verify":
        return "The phase1 test-develop bundle is ready; advance phase 1 so build verification can begin."
    if substate == "awaiting_consent":
        return "Inspect the real artifacts, record signed human consent, then rerun advance.py advance."
    if substate == "awaiting_design_consent":
        return "Review the signed AR_design evidence, record phase-1 consent, then run gate_develop.py."
    if substate == "awaiting_design_gate":
        return "Write AR_design.md with the required sections and ar-contract, then run gate_design.py."
    if substate == "awaiting_develop_gate":
        return "With signed design consent recorded, write code and run gate_develop.py."
    if substate == "awaiting_test_develop_gate":
        return "Generate the phase1 test-develop bundle from the signed contract and frozen development snapshot."
    if substate == "blocked" and reason:
        return reason
    return {
        0: "Run gate_env_init.py to record signed bootstrap evidence.",
        1: "Run the next phase-1 gate based on whether design is signed, code freeze exists, and the test-develop bundle is ready.",
        2: "Run gate_build.py and wait for a signed build PASS.",
        3: "Run gate_test_ut.py and wait for a signed unit-test PASS.",
        4: "Run gate_device_func.py, inspect the real device result, then consent and advance.",
        5: "Run gate_integration.py, inspect reports, then consent and advance.",
        6: "Run gate_upload_ci.py, inspect upload/CI evidence, then consent and advance.",
    }.get(phase, "See the workflow skill for the next action.")


def _design_entry_intact(pdir, state, design_entry):
    secret = gl.load_secret(state["run_id"])
    return gl.verify_sig(design_entry, secret) and all(
        os.path.exists(os.path.join(pdir, a["path"]))
        and gl.sha256_file(os.path.join(pdir, a["path"])) == a["sha256"]
        for a in design_entry.get("artifacts", []))


def _read_test_develop_status(pdir):
    return gl.read_control_json(pdir, *TEST_DEVELOP_STATUS_PARTS)


def _read_repair_packet(pdir):
    packet = gl.read_control_json(pdir, *REPAIR_PACKET_PARTS)
    if not packet or packet.get("active", True) is False:
        return None
    return packet



def _read_quality_substate(pdir):
    payload = gl.read_control_json(pdir, *QUALITY_SUBSTATE_PARTS) or {}
    return payload if payload else None



def _phase5_substate(pdir, substate, repair_packet):
    if substate in ("blocked", "awaiting_repair"):
        failure_class = (repair_packet or {}).get("failure_class")
        substate_id = P7_FAILURE_TO_SUBSTATE.get(failure_class, "integration_run")
        return {
            "id": substate_id,
            "name": P7_SUBSTATE_NAMES[substate_id],
            "source": "repair_packet",
        }
    payload = _read_quality_substate(pdir)
    if payload:
        substate_id = payload.get("substate_id") or "integration_run"
        return {
            "id": substate_id,
            "name": payload.get("substate_name") or P7_SUBSTATE_NAMES.get(substate_id, substate_id),
            "goal": payload.get("substate_goal"),
            "next_id": payload.get("next_substate_id"),
            "next_name": payload.get("next_substate_name"),
            "entry_conditions": payload.get("entry_conditions") or [],
            "exit_conditions": payload.get("exit_conditions") or [],
            "expected_artifacts": payload.get("expected_artifacts") or [],
            "human_gate_pending": bool(payload.get("human_gate_pending")),
            "human_escalation_needed": bool(payload.get("human_escalation_needed")),
            "escalation_reason": payload.get("escalation_reason") or "",
            "source": "quality_substate",
        }
    if substate == "awaiting_consent":
        return {
            "id": "human_review_await",
            "name": P7_SUBSTATE_NAMES["human_review_await"],
            "source": "phase_consent",
        }
    return None


def _read_upload_substate(pdir):
    payload = gl.read_control_json(pdir, *UPLOAD_SUBSTATE_PARTS) or {}
    return payload if payload else None


def _phase6_substate(pdir, substate, repair_packet):
    if substate in ("blocked", "awaiting_repair"):
        failure_class = (repair_packet or {}).get("failure_class")
        substate_id = P8_FAILURE_TO_SUBSTATE.get(failure_class, "precheck")
        return {
            "id": substate_id,
            "name": P8_SUBSTATE_NAMES[substate_id],
            "human_escalation_needed": bool(
                (repair_packet or {}).get("human_escalation_needed")),
            "escalation_reason": (repair_packet or {}).get("escalation_note") or "",
            "source": "repair_packet",
        }
    payload = _read_upload_substate(pdir)
    if payload:
        substate_id = payload.get("substate_id") or "precheck"
        return {
            "id": substate_id,
            "name": payload.get("substate_name") or P8_SUBSTATE_NAMES.get(substate_id, substate_id),
            "goal": payload.get("substate_goal"),
            "next_id": payload.get("next_substate_id"),
            "next_name": payload.get("next_substate_name"),
            "entry_conditions": payload.get("entry_conditions") or [],
            "exit_conditions": payload.get("exit_conditions") or [],
            "expected_artifacts": payload.get("expected_artifacts") or [],
            "human_gate_pending": bool(payload.get("human_gate_pending")),
            "human_escalation_needed": bool(payload.get("human_escalation_needed")),
            "escalation_reason": payload.get("escalation_reason") or "",
            "source": "upload_substate",
        }
    if substate == "awaiting_consent":
        return {
            "id": "consent_await",
            "name": P8_SUBSTATE_NAMES["consent_await"],
            "source": "phase_consent",
        }
    return None



def _repair_requires_escalation(packet):
    return bool(packet and packet.get("human_escalation_needed"))



def _repair_next_gate(packet):
    if not packet:
        return None
    if packet.get("recommended_next_action") == "regenerate":
        return "advance.py reset --reason \"repair packet requested regenerate\""
    reruns = packet.get("must_rerun") or []
    return reruns[0] if reruns else None



def _repair_resume_hint(packet):
    if not packet:
        return None
    if packet.get("human_escalation_needed"):
        return packet.get("escalation_note") or packet.get("last_failure_reason")
    if packet.get("recommended_next_action") == "regenerate":
        return packet.get("last_failure_reason") or "Repair scope exceeded the frozen design boundary; regenerate from an upstream phase."
    return packet.get("last_failure_reason") or "Apply a scoped repair, then rerun the required gate."



def _repair_required_inputs(packet):
    if not packet:
        return []
    if packet.get("human_escalation_needed"):
        return ["human_review"]
    return ["scoped_fix"]



def _phase1_develop_pass_ready(pdir):
    entry = gl.last_entry_for_phase(pdir, 1)
    return bool(entry and entry.get("verdict") == "PASS" and entry.get("gate") == "gate_develop.py")


def _test_develop_ready(pdir):
    status = _read_test_develop_status(pdir) or {}
    return bool(status.get("ready_for_build")) and bool(status.get("objective_completed"))



def _test_develop_scope_ready(pdir):
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    return bool(scope.get("bundle_revision")) and bool(scope.get("contract_status") == "signed")


def _require_test_develop_gate(pdir, state, entries):
    """P3 hard gate for closing phase 1.

    The develop PASS entry alone does NOT authorize advancing past phase 1: a
    weak model can run gate_design -> consent -> gate_develop and skip
    prepare_test_bundle entirely, shipping empty suspect_files/suspect_tests
    downstream and defeating the repair circuit breaker. Require the signed
    test-develop bundle to exist and be valid before phase 1 closes.

    Legacy runs (no signed design, or an explicit LEGACY-BYPASS) have no
    contract to derive the bundle from, so they fall through unchanged — the
    gate only bites v2 runs that actually declared a test matrix.

    This is enforcement only: it can REFUSE to advance, but it never writes
    state and never grants pass authority (that stays with advance.py + the
    signed manifest). A missing/degraded control file becomes a hard refusal
    here, not a silent []-fallback downstream."""
    if _legacy_mode(pdir, state, entries):
        return True, ""
    status = _read_test_develop_status(pdir) or {}
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    matrix = gl.read_control_json(pdir, *TEST_DEVELOP_MATRIX_PARTS) or {}
    problems = []
    if not status:
        problems.append("phase1_test_develop.json is missing "
                        "(run prepare_test_bundle.py after gate_develop.py)")
    elif not (status.get("ready_for_build") and status.get("objective_completed")):
        problems.append("test-develop not complete "
                        "(ready_for_build/objective_completed not both true)")
    if not scope:
        problems.append("signed_test_scope.json is missing")
    else:
        if not scope.get("bundle_revision"):
            problems.append("signed_test_scope has an empty bundle_revision")
        if scope.get("contract_status") != "signed":
            problems.append("signed_test_scope.contract_status is not 'signed'")
    if not (matrix.get("items") or []):
        problems.append("test_intent_matrix.json has no items "
                        "(nothing to build/test against)")
    if problems:
        return False, (
            "REFUSED: cannot close phase 1 — test-develop bundle is not ready.\n"
            "  " + "\n  ".join(problems) + "\n"
            "  fix: run prepare_test_bundle.py so P2/P3/P4 have a signed suspect "
            "scope to verify against.")
    return True, ""


def _logical_phase(cur, substate):
    if cur == 0:
        return "bootstrap", "bootstrap"
    if cur == 1:
        if substate in ("awaiting_design_gate", "awaiting_design_consent"):
            return "design_orchestrate", "design-orchestrate"
        if substate in ("awaiting_test_develop_gate", "ready_to_build_verify"):
            return "test_develop", "test-develop"
        return "feature_develop", "feature-develop"
    return {
        2: ("build_verify", "build-verify"),
        3: ("test_author", "test-author"),
        4: ("device_functional", "device-functional"),
        5: ("quality_verify", "quality-verify"),
        6: ("upload_review", "upload-review"),
    }.get(cur, ("unknown", "unknown"))


def _action_kind(substate, next_gate):
    if substate == "complete":
        return "complete"
    if substate in ("ready_to_advance", "ready_to_build_verify"):
        return "advance"
    if substate in ("awaiting_consent", "awaiting_design_consent"):
        return "consent"
    if substate in ("blocked",):
        return "blocked"
    if next_gate and next_gate.startswith("gate_"):
        return "run_gate"
    if next_gate and next_gate.startswith("prepare_test_bundle.py"):
        return "run_gate"
    if next_gate and next_gate.startswith("advance.py advance"):
        return "advance"
    if next_gate and next_gate.startswith("advance.py consent"):
        return "consent"
    return "inspect"


def _phase_token(cur):
    return "phase%d" % cur


def _logical_phase_token(cur, logical_phase_id):
    if cur == 1 and logical_phase_id == "design_orchestrate":
        return "phase1-design-orchestrate"
    if cur == 1 and logical_phase_id == "feature_develop":
        return "phase1-feature-develop"
    if cur == 1 and logical_phase_id == "test_develop":
        return "phase1-test-develop"
    return _phase_token(cur)


def _control_refs(cur, logical_phase_id):
    token = _logical_phase_token(cur, logical_phase_id)
    return {
        "next_action": gl.controls_relpath("next_action.json"),
        "memory_card": gl.controls_relpath("memory_cards", "current.json"),
        "stage_packet": gl.controls_relpath(
            *gl.stage_packet_parts(logical_phase_id)),
        "receipt": gl.controls_relpath("receipts", "%s.json" % token),
        "handoff_in": gl.controls_relpath("handoffs", "current.json"),
        "handoff_out": gl.controls_relpath("handoffs", "%s-next.json" % token),
    }


def _human_gate_pending(substate):
    return substate in ("awaiting_consent", "awaiting_design_consent")


def _truth_layer_pass_known(substate):
    return substate in (
        "ready_to_advance", "ready_to_build_verify", "awaiting_consent",
        "awaiting_design_consent", "complete",
    )


def _semantic_done(substate):
    return substate in ("ready_to_advance", "ready_to_build_verify", "complete")


def _memory_card_payload(next_action):
    failure = next_action.get("last_failure") or {}
    current_substate = next_action.get("current_substate")
    blockers = next_action.get("required_inputs") or []
    logical_phase_id = next_action.get("logical_phase_id")
    repair_packet = next_action.get("repair_packet") or {}
    forbidden_actions = [
        "treat_navigation_files_as_truth_source",
        "edit_pipeline_json_directly",
        "advance_without_signed_evidence",
    ]
    if logical_phase_id == "design_orchestrate":
        forbidden_actions += [
            "write_feature_code_before_design_consent",
            "skip_ar_contract_generation",
        ]
    elif logical_phase_id == "feature_develop":
        forbidden_actions += [
            "edit_design_as_if_it_were_unsigned_working_copy",
            "skip_signed_design_consent_check",
        ]
    elif logical_phase_id == "test_develop":
        forbidden_actions += [
            "modify_functional_code_outside_test_scope",
            "skip_development_freeze_snapshot",
            "treat_test_bundle_as_signed_truth",
        ]
    return {
        "phase": next_action.get("current_phase"),
        "phase_name": next_action.get("current_phase_name"),
        "logical_phase_id": logical_phase_id,
        "logical_phase_name": next_action.get("logical_phase_name"),
        "current_substate": current_substate,
        "current_blocker": blockers[0] if blockers else "none",
        "forbidden_actions": forbidden_actions,
        "next_expected_action_class": next_action.get("action_kind"),
        "last_failure_class": repair_packet.get("failure_class") or failure.get("gate") or failure.get("reason"),
        "human_escalation_needed": current_substate == "blocked" or _repair_requires_escalation(repair_packet),
        "repair_packet_present": bool(repair_packet),
        "primary_entry_doc": next_action.get("control_refs", {}).get("next_action"),
        "primary_failure_doc": gl.failure_report_relpath(
            next_action.get("current_phase")),
        "primary_handoff_doc": next_action.get("control_refs", {}).get("handoff_in"),
        "window_startup_order": gl.window_startup_order(
            next_action.get("control_refs")),
    }


def _receipt_payload(next_action):
    cur = next_action.get("current_phase")
    complete = next_action.get("current_substate") == "complete"
    logical_phase_id = next_action.get("logical_phase_id")
    return {
        "phase": cur,
        "phase_name": next_action.get("current_phase_name"),
        "logical_phase_id": logical_phase_id,
        "logical_phase_name": next_action.get("logical_phase_name"),
        "phase_scope": "phase1-subflow" if cur == 1 else "phase",
        "semantic_done": _semantic_done(next_action.get("current_substate")),
        "truth_layer_pass_known": _truth_layer_pass_known(
            next_action.get("current_substate")),
        "next_phase_ready": next_action.get("current_substate") in (
            "ready_to_advance", "ready_to_build_verify", "complete"),
        "human_gate_pending": _human_gate_pending(
            next_action.get("current_substate")),
        "repair_packet_present": bool(next_action.get("repair_packet")),
        "next_phase": None if complete or cur == gl.MAX_PHASE else cur + 1,
        "current_substate": next_action.get("current_substate"),
    }


def _handoff_payload(next_action):
    cur = next_action.get("current_phase")
    complete = next_action.get("current_substate") == "complete"
    last_failure = next_action.get("last_failure") or {}
    facts = []
    if next_action.get("resume_hint"):
        facts.append(next_action.get("resume_hint"))
    if next_action.get("phase_summary"):
        facts.append("phase summary available")
    logical_phase_id = next_action.get("logical_phase_id")
    if logical_phase_id == "design_orchestrate":
        facts.append("phase1 design subflow is active")
    elif logical_phase_id == "feature_develop":
        facts.append("phase1 develop subflow is active")
    elif logical_phase_id == "test_develop":
        facts.append("phase1 test-develop subflow is active")
    risks = []
    if last_failure.get("reason"):
        risks.append(last_failure.get("reason"))
    return {
        "from_phase": cur,
        "from_phase_name": next_action.get("current_phase_name"),
        "logical_phase_id": logical_phase_id,
        "logical_phase_name": next_action.get("logical_phase_name"),
        "phase_scope": "phase1-subflow" if cur == 1 else "phase",
        "objective_completed": _semantic_done(next_action.get("current_substate")),
        "truth_layer_pass_known": _truth_layer_pass_known(
            next_action.get("current_substate")),
        "current_substate": next_action.get("current_substate"),
        "repair_packet_present": bool(next_action.get("repair_packet")),
        "facts_for_next_phase": facts,
        "risks": risks,
        "recommended_next_action": {
            "action_kind": next_action.get("action_kind"),
            "next_gate": next_action.get("next_gate"),
            "required_inputs": next_action.get("required_inputs") or [],
        },
        "to_phase": None if complete or cur == gl.MAX_PHASE else cur + 1,
        "to_phase_name": None if complete or cur == gl.MAX_PHASE else gl.PHASE_NAME.get(cur + 1),
    }


def _stage_packet_payload(next_action):
    """Build the stage packet for the currently-active logical phase (§3).
    Navigation only — carries goal/scope/entry-exit/failure-classes for a weak
    model to read on window entry; pass authority stays with signed evidence.
    Sourced from gatelib.STAGE_PACKET_DEFS so advance and each gate emit the
    identical entry/exit contract."""
    cur = next_action.get("current_phase")
    logical_phase_id = next_action.get("logical_phase_id") or "bootstrap"
    logical_phase_name = next_action.get("logical_phase_name") or logical_phase_id
    required_inputs = next_action.get("required_inputs") or []
    return gl.build_stage_packet_from_def(
        logical_phase_id, logical_phase_name,
        physical_phase=cur,
        entry_blockers=list(required_inputs),
    )


def _write_control_snapshots(pdir, next_action):
    cur = next_action.get("current_phase")
    logical_phase_id = next_action.get("logical_phase_id")
    token = _logical_phase_token(cur, logical_phase_id)
    memory_card = _memory_card_payload(next_action)
    receipt = _receipt_payload(next_action)
    handoff = _handoff_payload(next_action)
    stage_packet = _stage_packet_payload(next_action)
    return {
        "memory_card": gl.write_phase_memory_card(
            pdir, memory_card, parts=("memory_cards", "current.json"))["rel"],
        "receipt": gl.write_completion_receipt(
            pdir, ("receipts", "%s.json" % token), receipt)["rel"],
        "stage_packet": gl.write_stage_packet(
            pdir, stage_packet,
            parts=gl.stage_packet_parts(logical_phase_id))["rel"],
        "handoff_in": gl.write_handoff_packet(
            pdir, ("handoffs", "current.json"), handoff)["rel"],
        "handoff_out": gl.write_handoff_packet(
            pdir, ("handoffs", "%s-next.json" % token), handoff)["rel"],
    }


def _derive_next_action(pdir, state):
    entries = gl.read_manifest(pdir)
    cur = state.get("current_phase", 0)
    phase_state = gl.phase_state(state, cur) or {}
    current_phase_passed = phase_state.get("status") == "passed"
    complete = cur == gl.MAX_PHASE and current_phase_passed
    last_failure = _last_failure(entries)
    repair_packet = _read_repair_packet(pdir)

    payload = {
        "run_id": state.get("run_id"),
        "pipeline_dir": pdir,
        "current_phase": cur,
        "current_phase_name": gl.PHASE_NAME.get(cur),
        "legacy_mode": _legacy_mode(pdir, state, entries),
        "last_failure": last_failure,
        "phase_summary": gl.read_phase_summary(pdir, cur),
        "failure_report": gl.read_failure_report(pdir, cur),
        "repair_packet": repair_packet,
    }

    if complete:
        substate = "complete"
        next_gate = None
        resume_hint = _phase_resume_hint(cur, substate)
        required_inputs = []
    elif cur == 1:
        design_entry = gl.latest_design_entry(pdir)
        if design_entry is None:
            substate = "awaiting_design_gate"
            next_gate = "gate_design.py"
            resume_hint = _phase_resume_hint(cur, substate)
        elif not _design_entry_intact(pdir, state, design_entry):
            substate = "blocked"
            next_gate = "gate_design.py"
            resume_hint = _phase_resume_hint(
                cur, substate,
                "Signed AR_design evidence was tampered or removed; re-run gate_design.py before continuing.")
        else:
            ok_c, c_reason = gl.verify_consent(state, 1, gl.entry_id(design_entry))
            if not ok_c:
                substate = "awaiting_design_consent"
                next_gate = "advance.py consent --phase 1 --token <reviewer>"
                resume_hint = _phase_resume_hint(cur, substate, c_reason)
            else:
                ok, reason, _ = gl.validate_closing_entry(pdir, 1)
                if ok:
                    if _test_develop_ready(pdir) and _test_develop_scope_ready(pdir):
                        substate = "ready_to_build_verify"
                        next_gate = "advance.py advance --phase 1"
                        resume_hint = _phase_resume_hint(cur, substate)
                    elif _phase1_develop_pass_ready(pdir):
                        substate = "awaiting_test_develop_gate"
                        next_gate = "prepare_test_bundle.py"
                        resume_hint = _phase_resume_hint(cur, substate)
                    else:
                        substate = "ready_to_advance"
                        next_gate = "advance.py advance --phase 1"
                        resume_hint = _phase_resume_hint(cur, substate)
                else:
                    substate = "awaiting_develop_gate"
                    next_gate = "gate_develop.py"
                    resume_hint = _phase_resume_hint(cur, substate, reason)
        required_inputs = _phase_required_inputs(cur, substate)
    else:
        if _repair_requires_escalation(repair_packet):
            substate = "blocked"
            next_gate = None
            resume_hint = _repair_resume_hint(repair_packet)
            required_inputs = _repair_required_inputs(repair_packet)
        elif repair_packet:
            substate = "awaiting_repair"
            next_gate = _repair_next_gate(repair_packet)
            resume_hint = _repair_resume_hint(repair_packet)
            required_inputs = _repair_required_inputs(repair_packet)
        else:
            ok, reason, entry = gl.validate_closing_entry(pdir, cur)
            if ok:
                if cur in CONSENT_PHASES:
                    ok_c, c_reason = gl.verify_consent(state, cur, gl.entry_id(entry))
                    if not ok_c:
                        substate = "awaiting_consent"
                        next_gate = "advance.py consent --phase %d --token <reviewer>" % cur
                        resume_hint = _phase_resume_hint(cur, substate, c_reason)
                    else:
                        substate = "ready_to_advance"
                        next_gate = "advance.py advance --phase %d" % cur
                        resume_hint = _phase_resume_hint(cur, substate)
                else:
                    substate = "ready_to_advance"
                    next_gate = "advance.py advance --phase %d" % cur
                    resume_hint = _phase_resume_hint(cur, substate)
            else:
                substate = "awaiting_gate"
                next_gate = PHASE_GATE_CMD.get(cur)
                resume_hint = _phase_resume_hint(cur, substate, reason)
            required_inputs = _phase_required_inputs(cur, substate)

    payload.update({
        "current_substate": substate,
        "next_gate": next_gate,
        "required_inputs": required_inputs,
        "resume_hint": resume_hint,
    })
    logical_phase_id, logical_phase_name = _logical_phase(cur, substate)
    payload.update({
        "control_protocol_version": CONTROL_PROTOCOL_VERSION,
        "logical_phase_id": logical_phase_id,
        "logical_phase_name": logical_phase_name,
        "action_kind": _action_kind(substate, next_gate),
        "control_refs": _control_refs(cur, logical_phase_id),
    })
    payload["window_startup_order"] = gl.window_startup_order(
        payload["control_refs"])
    if cur == 5:
        payload["logical_substate"] = _phase5_substate(pdir, substate, repair_packet)
    elif cur == 6:
        payload["logical_substate"] = _phase6_substate(pdir, substate, repair_packet)
    return payload


def _state_payload(pdir, state):
    next_action = _derive_next_action(pdir, state)
    phases = []
    for pid, name in gl.PHASES:
        pe = gl.phase_state(state, pid) or {"id": pid, "name": name, "status": "pending"}
        phases.append({
            "id": pid,
            "name": pe.get("name", name),
            "status": pe.get("status", "pending"),
            "manifest_ref": pe.get("manifest_ref"),
            "closed_at_utc": pe.get("closed_at_utc"),
            "consent_required": pid in CONSENT_PHASES or pid == 1,
            "has_phase_summary": gl.read_phase_summary(pdir, pid) is not None,
            "has_failure_report": gl.read_failure_report(pdir, pid) is not None,
        })
    return {
        "run_id": state.get("run_id"),
        "ar": state.get("ar"),
        "repo": state.get("repo"),
        "git_dir": state.get("git_dir"),
        "build_target": state.get("build_target"),
        "device_serial": state.get("device_serial"),
        "current_phase": state.get("current_phase"),
        "current_phase_name": gl.PHASE_NAME.get(state.get("current_phase")),
        "control_protocol_version": next_action.get("control_protocol_version"),
        "logical_phase_id": next_action.get("logical_phase_id"),
        "logical_phase_name": next_action.get("logical_phase_name"),
        "action_kind": next_action.get("action_kind"),
        "control_refs": next_action.get("control_refs"),
        "window_startup_order": next_action.get("window_startup_order"),
        "logical_substate": next_action.get("logical_substate"),
        "repair_packet": next_action.get("repair_packet"),
        "current_substate": next_action.get("current_substate"),
        "legacy_mode": next_action.get("legacy_mode"),
        "last_failure": next_action.get("last_failure"),
        "resume_hint": next_action.get("resume_hint"),
        "next_gate": next_action.get("next_gate"),
        "required_inputs": next_action.get("required_inputs"),
        "phases": phases,
    }


def _refresh_state_metadata(pdir, state):
    payload = _state_payload(pdir, state)
    state["current_substate"] = payload.get("current_substate")
    state["legacy_mode"] = payload.get("legacy_mode")
    state["last_failure"] = payload.get("last_failure")
    state["resume_hint"] = payload.get("resume_hint")
    state["next_gate"] = payload.get("next_gate")
    state["required_inputs"] = payload.get("required_inputs")
    state["control_protocol_version"] = payload.get("control_protocol_version")
    state["logical_phase_id"] = payload.get("logical_phase_id")
    state["logical_phase_name"] = payload.get("logical_phase_name")
    state["action_kind"] = payload.get("action_kind")
    state["control_refs"] = payload.get("control_refs")
    state["repair_packet"] = payload.get("repair_packet")
    return payload


def _write_next_action(pdir, state):
    payload = _derive_next_action(pdir, state)
    payload["generated_at_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    paths = gl.write_dual_snapshot_json(
        pdir, "next_action.json", ("next_action.json",), payload=payload,
        best_effort=False)
    control_snapshot_paths = _write_control_snapshots(pdir, payload)
    payload["control_refs"].update(control_snapshot_paths)
    paths = gl.write_dual_snapshot_json(
        pdir, "next_action.json", ("next_action.json",), payload=payload,
        best_effort=False)
    return paths, payload


def cmd_init(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    os.makedirs(os.path.join(pdir, "evidence"), exist_ok=True)
    if os.path.exists(gl.state_path(pdir)) and not args.force:
        sys.exit("ERROR: pipeline.json already exists (use --force to recreate)")
    run_id = args.run_id or os.path.basename(pdir.rstrip("/"))
    gl.create_secret(run_id)
    state = {
        "run_id": run_id,
        "ar": run_id,
        "repo": args.repo,
        "git_dir": args.git_dir or args.repo,
        "product": "rk3568",
        "device_serial": args.device_serial,
        "build_target": args.build_target,
        "test": {"part": args.part, "ut_suites": [], "mst_suites": []},
        "base_commit": args.base_commit,
        "current_phase": 0,
        "consent_tokens": {},
        "code_fingerprint": None,
        "functional_fingerprint": None,
        "locked_all_paths": None,
        "phases": [
            {"id": i, "name": n, "status": "pending",
             "manifest_ref": None, "closed_at_utc": None}
            for i, n in gl.PHASES
        ],
    }
    _refresh_state_metadata(pdir, state)
    gl.save_state(pdir, state)
    print("initialized pipeline at %s (run_id=%s)" % (pdir, run_id))
    print("secret: %s (mode 600)" % gl.secret_path(run_id))


def cmd_advance(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    phase = args.phase
    cur = state["current_phase"]
    if phase != cur:
        sys.exit("ERROR: refusing to close phase %d; current_phase is %d "
                 "(phases must close in order)" % (phase, cur))

    # Phases that require an explicit human sign-off AFTER their evidence gate
    # passes: the pipeline must stop, show the real results/artifacts, and only
    # advance once a person reviewed them and recorded consent.
    #   P4 = real-device functional test result review
    #   P5 = quality reports + code-review report review
    #   P6 = irreversible upload push
    if phase in CONSENT_PHASES:
        # Consent must be bound to the phase's CURRENT closing PASS evidence.
        # Re-derive that entry_id and require a signed, matching consent record.
        ok_ev, ev_reason, ev_entry = gl.validate_closing_entry(pdir, phase)
        if not ok_ev:
            sys.exit("REFUSED: cannot close phase %d — %s" % (phase, ev_reason))
        ok_c, c_reason = gl.verify_consent(state, phase, gl.entry_id(ev_entry))
        if not ok_c:
            ev = os.path.join(pdir, "evidence", "phase%d" % phase)
            sys.exit(
                "HOLD: phase %d (%s) passed its evidence gate but needs human review.\n"
                "  reason: %s\n"
                "  1) inspect the real results + artifacts in: %s\n"
                "  2) if the device/test result is acceptable, record consent:\n"
                "     advance.py --pipeline-dir <PDIR> consent --phase %d --token <reviewer>\n"
                "  3) then re-run: advance.py --pipeline-dir <PDIR> advance --phase %d"
                % (phase, CONSENT_PHASES[phase], c_reason, ev, phase, phase))

    # CODE-DRIFT CONTROL: once P1 locks the functional fingerprint, every later
    # phase is validated against THAT functional code. Test files added in P3+ do
    # not trip it, but functional edits do (and non-test additions are refused in
    # test-only phases). Legacy runs fall back to the whole-tree check.
    ok_drift, drift_msg = check_code_drift(state, phase)
    if not ok_drift:
        sys.exit(drift_msg)

    # P3 TEST-DEVELOP HARD GATE: closing phase 1 requires a signed test-develop
    # bundle (unless legacy). Without it, downstream P2/P3/P4 would degrade to
    # empty suspect scopes instead of refusing. See _require_test_develop_gate.
    if phase == 1:
        ok_td, td_msg = _require_test_develop_gate(pdir, state, gl.read_manifest(pdir))
        if not ok_td:
            sys.exit(td_msg)

    ok, reason, entry = gl.validate_closing_entry(pdir, phase)
    if not ok:
        sys.exit("REFUSED: cannot close phase %d — %s" % (phase, reason))

    pe = state["phases"][phase]
    pe["status"] = "passed"
    pe["manifest_ref"] = gl.entry_id(entry)
    pe["closed_at_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # P1 locks the fingerprints that later phases must keep matching:
    #   * functional_fingerprint — non-test code/config content (drift => rewalk)
    #   * locked_all_paths       — the path set at P1 (new paths after must be tests)
    #   * code_fingerprint       — legacy whole-tree value, kept for compatibility
    if phase == 1:
        state["functional_fingerprint"] = gl.functional_fingerprint(state)
        state["locked_all_paths"] = gl._changed_paths(state)
        state["code_fingerprint"] = gl.code_fingerprint(state)
    if phase < gl.MAX_PHASE:
        state["current_phase"] = phase + 1
        state["phases"][phase + 1]["status"] = "pending"
    _refresh_state_metadata(pdir, state)
    gl.save_state(pdir, state)
    print("ADVANCED: phase %d (%s) closed by signed evidence; reason: %s"
          % (phase, gl.PHASE_NAME[phase], entry.get("reason")))
    if phase < gl.MAX_PHASE:
        print("current_phase -> %d (%s)" % (phase + 1, gl.PHASE_NAME[phase + 1]))
    else:
        print("pipeline COMPLETE.")


def cmd_consent(args):
    """Record a one-time human consent for a phase that requires sign-off
    (P1 AR_design review, P4 device-test review, P5 quality/review report
    approval, P6 upload push).

    Consent is only meaningful AFTER the relevant gate has produced its real
    signed results for a human to inspect: we bind the consent to that exact
    signed PASS entry (evidence_ref = its entry_id) and HMAC-sign the record.
    Re-running the gate produces new evidence and invalidates this consent.
      * P1  -> bound to the gate_design PASS entry (enforced by gate_develop);
      * P4/5/6 -> bound to the phase's closing PASS entry (enforced by advance)."""
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    if not args.token:
        sys.exit("ERROR: --token required")

    # P1 design consent is special: it is recorded AFTER gate_design.py signs the
    # AR_design (P1a) but BEFORE gate_develop.py writes code (P1b). It therefore
    # binds to the gate_design PASS entry, not the phase's closing (develop) entry
    # — which is why phase 1 is NOT in CONSENT_PHASES (that path binds to the last
    # phase entry, the develop record). gate_develop.py enforces this consent at
    # develop time; advance --phase 1 still validates the develop PASS as usual.
    if args.phase == 1:
        design_entry = gl.latest_design_entry(pdir)
        if design_entry is None:
            sys.exit("ERROR: cannot record phase-1 design consent — no signed "
                     "AR_design yet. Run gate_design.py first.")
        secret = gl.load_secret(state["run_id"])
        intact = gl.verify_sig(design_entry, secret) and all(
            os.path.exists(os.path.join(pdir, a["path"]))
            and gl.sha256_file(os.path.join(pdir, a["path"])) == a["sha256"]
            for a in design_entry.get("artifacts", []))
        if not intact:
            sys.exit("ERROR: AR_design evidence tampered/removed — re-run "
                     "gate_design.py before consenting.")
        rec = gl.make_consent_record(state["run_id"], 1, args.token,
                                     gl.entry_id(design_entry))
        state.setdefault("consent_tokens", {})["1"] = rec
        _refresh_state_metadata(pdir, state)
        gl.save_state(pdir, state)
        print("recorded signed phase-1 design consent: token=%s bound to signed "
              "AR_design %s.." % (args.token, rec["evidence_ref"][:8]))
        return

    if args.phase not in CONSENT_PHASES:
        sys.exit("ERROR: phase %d does not take consent (consent phases: 1 design, %s)"
                 % (args.phase, ", ".join(str(p) for p in CONSENT_PHASES)))
    # There must be a valid, current PASS evidence to consent to.
    ok_ev, ev_reason, ev_entry = gl.validate_closing_entry(pdir, args.phase)
    if not ok_ev:
        sys.exit("ERROR: cannot record consent for phase %d — no valid PASS "
                 "evidence yet (%s). Run the gate first." % (args.phase, ev_reason))
    rec = gl.make_consent_record(state["run_id"], args.phase, args.token,
                                 gl.entry_id(ev_entry))
    state.setdefault("consent_tokens", {})[str(args.phase)] = rec
    _refresh_state_metadata(pdir, state)
    gl.save_state(pdir, state)
    print("recorded signed consent for phase %d (%s): token=%s bound to evidence %s.."
          % (args.phase, CONSENT_PHASES[args.phase], args.token,
             rec["evidence_ref"][:8]))


def cmd_reset(args):
    """Rewind the pipeline to P1 (development) — used whenever a fix touches code.
    Marks P1..P6 pending, clears consent + code fingerprint, keeps P0 (env) intact.
    Recorded in the manifest so the rewalk is auditable."""
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    for pe in state["phases"]:
        if pe["id"] >= 1:
            pe["status"] = "pending"
            pe["manifest_ref"] = None
            pe["closed_at_utc"] = None
    state["current_phase"] = 1
    state["consent_tokens"] = {}
    state["code_fingerprint"] = None
    state["functional_fingerprint"] = None
    state["locked_all_paths"] = None
    _refresh_state_metadata(pdir, state)
    gl.save_state(pdir, state)
    # leave an audit trail (unsigned info entry is fine; it grants no progress)
    try:
        gl.emit(pdir, 1, "advance.py:reset", verdict="INFO",
                reason="pipeline reset to P1: %s" % (args.reason or "code change"),
                artifacts_rel=[])
    except Exception:
        pass
    print("RESET → P1 (develop). Reason: %s" % (args.reason or "code change"))
    print("Redo P1→P6 in order; downstream evidence was invalidated.")


def cmd_verify_all(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    bad = 0
    # code-drift check: if functional code changed since P1 locked (or, for legacy
    # runs, the whole tree), rewind to P1. Uses the same layered logic as advance.
    cur = state.get("current_phase", 0)
    drift_ok, _ = check_code_drift(state, max(cur, 2))
    if not drift_ok:
        for pe in state["phases"]:
            if pe["id"] >= 1:
                pe["status"] = "pending"
                pe["manifest_ref"] = None
                pe["closed_at_utc"] = None
        state["current_phase"] = 1
        state["consent_tokens"] = {}
        state["code_fingerprint"] = None
        state["functional_fingerprint"] = None
        state["locked_all_paths"] = None
        _refresh_state_metadata(pdir, state)
        gl.save_state(pdir, state)
        sys.exit("verify-all: functional code changed since P1 — pipeline rewound "
                 "to P1, rewalk from development.")
    for pe in state["phases"]:
        if pe["status"] != "passed":
            continue
        ok, reason, _ = gl.validate_closing_entry(pdir, pe["id"])
        if not ok:
            bad += 1
            pe["status"] = "failed"
            print("DEMOTED phase %d (%s): %s" % (pe["id"], pe["name"], reason))
            if state["current_phase"] > pe["id"]:
                state["current_phase"] = pe["id"]
        else:
            print("ok phase %d (%s)" % (pe["id"], pe["name"]))
    _refresh_state_metadata(pdir, state)
    if bad:
        gl.save_state(pdir, state)
        sys.exit("verify-all: %d phase(s) failed re-validation; pipeline rewound "
                 "to phase %d" % (bad, state["current_phase"]))
    gl.save_state(pdir, state)
    print("verify-all: all passed phases re-validated clean.")


def cmd_status(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    payload = _state_payload(pdir, state)
    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return
    print("run_id=%s  current_phase=%d  target=%s"
          % (state["run_id"], state["current_phase"], state.get("build_target")))
    for pe in state["phases"]:
        mark = {"passed": "✓", "failed": "✗", "running": "…", "pending": " "}.get(pe["status"], "?")
        print("  [%s] P%d %-18s %s" % (mark, pe["id"], pe["name"], pe["status"]))
    if payload.get("next_gate"):
        print("next_gate=%s" % payload["next_gate"])
    print("substate=%s" % payload.get("current_substate"))
    if payload.get("resume_hint"):
        print("hint=%s" % payload["resume_hint"])


def cmd_next(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    rel, payload = _write_next_action(pdir, state)
    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return
    print("wrote %s/%s" % (pdir, rel["root"]))
    if rel.get("controls"):
        print("mirrored %s/%s" % (pdir, rel["controls"]))
    print("current_phase=P%d (%s)" % (payload["current_phase"], payload.get("current_phase_name")))
    print("substate=%s" % payload.get("current_substate"))
    if payload.get("next_gate"):
        print("next_gate=%s" % payload["next_gate"])
    if payload.get("required_inputs"):
        print("required_inputs=%s" % ", ".join(payload["required_inputs"]))
    if payload.get("resume_hint"):
        print("hint=%s" % payload["resume_hint"])


def main():
    ap = argparse.ArgumentParser(description="pipeline state writer (single source of truth)")
    ap.add_argument("--pipeline-dir")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("init")
    p.add_argument("--run-id")
    p.add_argument("--repo", default=os.environ.get("OHOS_ROOT", os.getcwd()),
                   help="OHOS repo root (build/developer_test base); "
                        "defaults to $OHOS_ROOT or the current directory")
    p.add_argument("--git-dir", help="component git repo (repo-managed tree); "
                                     "defaults to --repo. For OHOS use the changed "
                                     "component path, e.g. base/hiviewdfx/hiview")
    p.add_argument("--device-serial", default="",
                   help="pin a device serial; default empty = auto-detect the single "
                        "connected device at P0 (or set $DEVICE_SERIAL)")
    p.add_argument("--build-target", required=True)
    p.add_argument("--part", default="")
    p.add_argument("--base-commit", default="")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("advance")
    p.add_argument("--phase", type=int, required=True)
    p.set_defaults(func=cmd_advance)

    p = sub.add_parser("consent")
    p.add_argument("--phase", type=int, required=True,
                   help="phase to sign off (1 design, 4 device test, "
                        "5 quality/review, 6 upload)")
    p.add_argument("--token", required=True)
    p.set_defaults(func=cmd_consent)

    p = sub.add_parser("reset", help="rewind to P1 (development) — use whenever a "
                                     "fix touches code; invalidates downstream phases")
    p.add_argument("--reason", default="", help="what was fixed (audit trail)")
    p.set_defaults(func=cmd_reset)

    p = sub.add_parser("verify-all")
    p.set_defaults(func=cmd_verify_all)

    p = sub.add_parser("status")
    p.add_argument("--json", action="store_true",
                   help="print machine-readable pipeline status")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("next")
    p.add_argument("--json", action="store_true",
                   help="print the derived next_action payload as json")
    p.set_defaults(func=cmd_next)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
