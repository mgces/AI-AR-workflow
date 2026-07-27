#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
prepare_test_bundle.py — logical phase1 test-develop control step.

This is a THIN control-layer script, not a truth gate: it does not emit signed
PASS/FAIL manifest records and does not mutate pipeline.json phase status.
It consumes the signed/frozen outputs of phase1 feature development, checks that
no functional code changed beyond the frozen snapshot, derives the test intent
matrix from the signed ar-contract, and writes control-layer bundle artifacts
that let weak models execute test development as a distinct stage before build
verification.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402


FREEZE_PARTS = ("test_develop", "development_freeze_snapshot.json")
SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
HANDOFF_PARTS = ("test_develop", "handoff_p3_test_develop.json")
RECEIPT_PARTS = ("test_develop", "completion_receipt_p3.json")
FAILURE_PARTS = ("test_develop", "failure_packet.json")


def _block(pdir, failure_class, message, **extra):
    payload = {
        "phase": 3,
        "logical_phase_id": "test_develop",
        "active": True,
        "failure_class": failure_class,
        "objective_completed": False,
        "ready_for_build": False,
        "recommended_next_action": extra.pop("recommended_next_action", "regenerate"),
        "human_escalation_needed": extra.pop("human_escalation_needed", False),
        "message": message,
    }
    payload.update(extra)
    gl.write_repair_packet(pdir, FAILURE_PARTS, payload)
    gl.write_control_json(pdir, *STATUS_PARTS, payload=payload, best_effort=True)
    gl.write_gate_phase_memory_card(
        pdir, 3, "test-develop", verdict="FAIL",
        current_blocker=message,
        forbidden_actions=[
            "modify_functional_code_outside_test_scope",
            "skip_development_freeze_snapshot",
            "treat_test_bundle_as_signed_truth",
        ],
        next_expected_action_class=payload["recommended_next_action"],
        last_failure_class=failure_class,
        human_escalation_needed=payload["human_escalation_needed"],
        primary_entry_doc=gl.controls_relpath(*SCOPE_PARTS),
        primary_failure_doc=gl.controls_relpath(*FAILURE_PARTS))
    sys.exit(message)



def _load_freeze_snapshot(pdir):
    freeze = gl.read_control_json(pdir, *FREEZE_PARTS)
    if not freeze:
        _block(
            pdir,
            "development_freeze_snapshot_missing",
            "PHASE 3 TEST-DEVELOP BLOCKED: missing development_freeze_snapshot.json; run gate_develop.py first",
            required_inputs=["development_freeze_snapshot"],
            recommended_next_action="rerun_feature_develop",
            artifact_index={"freeze_snapshot": gl.controls_relpath(*FREEZE_PARTS)},
        )
    return freeze



def _load_signed_contract_or_fail(pdir):
    ok, contract, detail = gl.load_signed_contract(pdir)
    if not ok:
        _block(
            pdir,
            "signed_test_scope_unavailable",
            "PHASE 3 TEST-DEVELOP BLOCKED: signed ar-contract unavailable: %s" % detail,
            required_inputs=["signed_test_scope"],
            recommended_next_action="regenerate",
            human_escalation_needed="tampered" in detail,
            contract_status=detail,
        )
    return contract


def _pipeline_internal_prefixes(pdir, state):
    prefixes = []
    gdir = gl.resolve_git_dir(state)
    rel = os.path.relpath(pdir, gdir).replace("\\", "/")
    if rel != "." and not rel.startswith("../"):
        prefixes.append(rel.rstrip("/") + "/")
    return prefixes


def _verify_feature_freeze(pdir, state, freeze):
    current_paths = gl._changed_paths(state)
    prefixes = _pipeline_internal_prefixes(pdir, state)
    if prefixes:
        current_paths = [p for p in current_paths
                         if not any(p == pref[:-1] or p.startswith(pref) for pref in prefixes)]
    frozen_paths = freeze.get("locked_all_paths") or freeze.get("changed_files") or []
    extra = [p for p in current_paths if p not in frozen_paths]
    non_test = [p for p in extra if gl.classify_path(p) != "test"]
    if non_test:
        _block(
            pdir,
            "feature_freeze_violated",
            "PHASE 3 TEST-DEVELOP FAIL: feature freeze violated by non-test path(s):\n  %s\n"
            "Reset/re-walk from phase1 develop if functional code changed."
            % "\n  ".join(non_test),
            current_paths=current_paths,
            expanded_paths=extra,
            non_test_expanded_paths=non_test,
            expansion_policy={
                "if_scope_expands": "regenerate",
                "allowed_path_class": "test",
            },
            recommended_next_action="regenerate",
            human_escalation_needed=True,
            repair_disallowed_if=["functional requirement changes are needed"],
            regen_trigger_if=["feature freeze violated by non-test path"],
        )
    return current_paths, extra



def _scope_path_set(items):
    out = []
    for item in items or []:
        if isinstance(item, dict):
            path = item.get("path")
        else:
            path = item
        if path and path not in out:
            out.append(path)
    return out



def _signed_test_scope_payload(pdir, freeze, contract, changed_files, matrix_items, bundle_revision):
    declared_changed = freeze.get("declared_changed_files") or contract.get("changed_files") or []
    declared_present = freeze.get("declared_changed_files_present") or declared_changed
    declared_missing = freeze.get("declared_changed_files_missing") or []
    requirement_ids = [r.get("id") for r in contract.get("requirements") or [] if r.get("id")]
    test_targets = []
    expected_gtests = []
    device_requirement_ids = set()
    for item in matrix_items:
        target = item.get("expected_target")
        if target and target not in test_targets:
            test_targets.append(target)
        gtest = item.get("expected_gtest")
        if gtest and gtest not in expected_gtests:
            expected_gtests.append(gtest)
        if item.get("device_followup_needed"):
            device_requirement_ids.update(item.get("covers_requirement_ids") or [])
    build_artifact_paths = _scope_path_set(
        contract.get("build_artifacts_meta") or contract.get("build_artifacts") or [])
    changed_scope = _scope_path_set(contract.get("changed_files_meta") or declared_changed)
    return {
        "phase": 3,
        "logical_phase_id": "test_develop",
        "bundle_revision": bundle_revision,
        "source_manifest_entry": gl.entry_id(gl.last_entry_for_phase(pdir, 2) or {"phase": 2})[:12],
        "freeze_snapshot": gl.controls_relpath(*FREEZE_PARTS),
        "requirements": requirement_ids,
        "declared_changed_files": changed_scope,
        "declared_changed_files_present": declared_present,
        "declared_changed_files_missing": declared_missing,
        "changed_files_under_test": changed_files,
        "test_targets": test_targets,
        "expected_gtests": expected_gtests,
        "build_artifacts": build_artifact_paths,
        "device_followup_requirement_ids": sorted(device_requirement_ids),
        "expansion_policy": {
            "if_scope_expands": "regenerate",
            "allowed_path_class": "test",
        },
        "contract_status": "signed",
    }



def _artifact_index(bundle_revision, matrix_items):
    return {
        "bundle_revision": bundle_revision,
        "freeze_snapshot": gl.controls_relpath(*FREEZE_PARTS),
        "signed_test_scope": gl.controls_relpath(*SCOPE_PARTS),
        "test_intent_matrix": gl.controls_relpath(*MATRIX_PARTS),
        "completion_receipt": gl.controls_relpath(*RECEIPT_PARTS),
        "handoff_packet": gl.controls_relpath(*HANDOFF_PARTS),
        "planned_test_cases": len(matrix_items),
    }



def _evidence_index(pdir, freeze, expanded_paths):
    return {
        "develop_summary": gl.phase_summary_relpath(2),
        "develop_failure_report": gl.failure_report_relpath(2),
        "development_manifest_entry": gl.entry_id(gl.last_entry_for_phase(pdir, 2) or {"phase": 2})[:12],
        "changed_files_consistency": {
            "declared_present": freeze.get("declared_changed_files_present") or [],
            "declared_missing": freeze.get("declared_changed_files_missing") or [],
            "new_test_paths": expanded_paths,
        },
    }



def _report_index():
    return gl.control_report_index(
        entry_parts=SCOPE_PARTS,
        handoff_parts=HANDOFF_PARTS,
        failure_parts=FAILURE_PARTS,
        receipt_parts=RECEIPT_PARTS,
    )



def _handoff_payload(pdir, freeze, bundle_revision, matrix_items, scope_payload, expanded_paths):
    return {
        "bundle_id": "phase1-bundle",
        "bundle_revision": bundle_revision,
        "from_phase": 3,
        "from_phase_name": "test-develop",
        "to_phase": 4,
        "to_phase_name": "build-verify",
        "logical_phase_id": "test_develop",
        "logical_phase_name": "test-develop",
        "objective_completed": True,
        "produced_artifacts": [
            gl.control_artifact_ref(SCOPE_PARTS, "signed_test_scope"),
            gl.control_artifact_ref(MATRIX_PARTS, "test_intent_matrix"),
            gl.control_artifact_ref(RECEIPT_PARTS, "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "phase1 test-develop bundle is active",
            "feature freeze held during test-develop preparation",
            "planned test cases=%d" % len(matrix_items),
        ],
        "risks": ["device follow-up needed"] if scope_payload.get("device_followup_requirement_ids") else [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 4,
            "action": "build-verify",
            "next_gate": "advance.py advance --phase 3",
        },
        "requires_repair": False,
        "repair_scope_hint": expanded_paths,
        "downstream_revalidate_scope": "P4_P5",
        "artifact_index": _artifact_index(bundle_revision, matrix_items),
        "evidence_index": _evidence_index(pdir, freeze, expanded_paths),
        "report_index": _report_index(),
    }



def _completion_receipt(bundle_revision):
    return {
        "phase": 3,
        "logical_phase_id": "test_develop",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": False,
        "next_phase": 4,
    }



def build_status_payload(pdir, freeze, matrix_items, changed_files, expanded_paths, scope_payload, bundle_revision):
    return {
        "phase": 3,
        "logical_phase_id": "test_develop",
        "objective_completed": True,
        "ready_for_build": True,
        "bundle_revision": bundle_revision,
        "freeze_snapshot": gl.controls_relpath(*FREEZE_PARTS),
        "signed_test_scope": gl.controls_relpath(*SCOPE_PARTS),
        "test_intent_matrix": gl.controls_relpath(*MATRIX_PARTS),
        "completion_receipt": gl.controls_relpath(*RECEIPT_PARTS),
        "handoff_packet": gl.controls_relpath(*HANDOFF_PARTS),
        "failure_packet": gl.controls_relpath(*FAILURE_PARTS),
        "changed_files": changed_files,
        "feature_freeze_ok": True,
        "new_test_paths": [p for p in changed_files if p not in (freeze.get("changed_files") or [])],
        "handoff_to": "build_verify",
        "scope_expansion_decision": "allow_test_only",
        "downstream_revalidate_scope": "P4_P5",
        "failure_classes": {
            "retry": [],
            "repair": ["test_scope_expanded"],
            "regenerate": ["feature_freeze_violated", "signed_test_scope_unavailable"],
        },
        "artifact_index": _artifact_index(bundle_revision, matrix_items),
        "evidence_index": _evidence_index(pdir, freeze, expanded_paths),
        "report_index": _report_index(),
        "signed_test_scope_requirements": scope_payload.get("requirements") or [],
    }


def run_prepare(pdir, state):
    """Derive + persist the control-layer test bundle. Returns a dict of the
    derived artifacts so a signed gate (gate_test_develop.py) can reuse them
    without re-deriving. Control writes are best-effort; this never emits a
    signed manifest record or mutates pipeline.json phase status."""
    freeze = _load_freeze_snapshot(pdir)
    contract = _load_signed_contract_or_fail(pdir)
    changed_files, expanded_paths = _verify_feature_freeze(pdir, state, freeze)
    matrix_items = gl.collect_test_intent_matrix(contract, changed_files)
    bundle_revision = gl.entry_id(gl.last_entry_for_phase(pdir, 2) or {"phase": 2})[:12]
    scope_payload = _signed_test_scope_payload(
        pdir, freeze, contract, changed_files, matrix_items, bundle_revision)
    status = build_status_payload(
        pdir, freeze, matrix_items, changed_files, expanded_paths,
        scope_payload, bundle_revision)
    handoff = _handoff_payload(pdir, freeze, bundle_revision, matrix_items, scope_payload, expanded_paths)
    receipt = _completion_receipt(bundle_revision)
    gl.write_control_json(pdir, *SCOPE_PARTS, payload=scope_payload, best_effort=True)
    gl.write_control_json(pdir, *MATRIX_PARTS,
                          payload={"items": matrix_items}, best_effort=True)
    gl.write_completion_receipt(pdir, RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, HANDOFF_PARTS, handoff)
    gl.write_repair_packet(
        pdir, FAILURE_PARTS,
        {
            "phase": 3,
            "logical_phase_id": "test_develop",
            "active": False,
            "cleared_by": "prepare_test_bundle.py",
            "bundle_revision": bundle_revision,
        })
    gl.write_control_json(pdir, *STATUS_PARTS,
                          payload=status, best_effort=True)
    gl.write_gate_phase_memory_card(
        pdir, 3, "test-develop", verdict="PASS",
        bundle_revision=bundle_revision,
        current_blocker=None,
        forbidden_actions=[
            "modify_functional_code_outside_test_scope",
            "skip_development_freeze_snapshot",
            "treat_test_bundle_as_signed_truth",
        ],
        next_expected_action_class="advance_phase",
        primary_entry_doc=gl.controls_relpath(*SCOPE_PARTS),
        primary_failure_doc=gl.controls_relpath(*FAILURE_PARTS),
        primary_handoff_doc=gl.controls_relpath(*HANDOFF_PARTS))
    return {
        "freeze": freeze,
        "contract": contract,
        "changed_files": changed_files,
        "expanded_paths": expanded_paths,
        "matrix_items": matrix_items,
        "bundle_revision": bundle_revision,
        "scope_payload": scope_payload,
        "status": status,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    run_prepare(pdir, state)
    print("PHASE 3 TEST-DEVELOP READY — advance.py advance --phase 3")


if __name__ == "__main__":
    main()
