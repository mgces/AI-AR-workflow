#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_design.py — Phase 1a (design fix). Runs BEFORE any code is written.

P1 is split into two sub-gates that both emit to phase 1:
  1. gate_design.py  — fix and sign AR_design.md (this file)
  2. gate_develop.py — write code; refuses unless a signed AR_design exists

AR_design.md must, before implementation, pin the full plan a deterministic gate
can verify by SECTION PRESENCE + non-empty body:
  * 目标组件
  * 详细功能需求
  * 完整代码框架 (with file-list / per-file-role / per-file-skeleton anchors)
  * 完整测试框架
  * 需测试的功能点
  * 真机测试用例构造

It must ALSO carry a machine-readable ```ar-contract``` JSON block (build_artifacts
/ test_cases[].gtest / device_cases[].marker) — the single source of truth the P2
build / P3 test / P4 device gates verify full coverage against. New runs require a
v2 contract (requirements + changed_files + reference closure); --allow-contract-v1
is a legacy escape. A missing/invalid contract FAILs P1a unless
--allow-missing-contract (legacy bypass). The design is also rejected if it still
contains placeholder tokens (TODO/TBD/占位/…) outside the contract block.

The doc is copied into evidence/phase1/AR_design.md and HMAC-signed via emit, so
later phases (and gate_develop's dependency check) are bound to its exact bytes.
The parsed contract is also written to evidence/phase1/ar_contract.json inside the
same signed PASS record for downstream convenience.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

DESIGN_INDEX_PARTS = ("design_orchestrate", "global_design_doc_index.json")
STAGE_PACKET_INDEX_PARTS = ("design_orchestrate", "stage_packet_index.json")
INITIAL_BUNDLE_PARTS = ("design_orchestrate", "initial_bundle_definition.json")
DESIGN_RECEIPT_PARTS = ("design_orchestrate", "completion_receipt_p1.json")
DESIGN_HANDOFF_PARTS = ("design_orchestrate", "handoff_to_feature_develop.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")


def _derive_design_controls(pdir, contract, *, contract_rel, design_rel):
    """Emit P1 design-orchestrate machine-readable control artifacts derived from
    the signed design + parsed contract. These are navigation only; they never
    grant pass authority and are safe to skip on write failure."""
    contract = contract or {}
    requirements = contract.get("requirements") or []
    changed_files = contract.get("changed_files") or []
    build_artifacts = contract.get("build_artifacts") or []
    test_cases = contract.get("test_cases") or []
    device_cases = contract.get("device_cases") or []
    bundle = {
        "phase": 1,
        "logical_phase_id": "design_orchestrate",
        "bundle_id": "phase1-bundle",
        "bundle_revision": "",
        "source_design": design_rel,
        "source_contract": contract_rel,
        "requirements": requirements,
        "changed_files": changed_files,
        "build_artifacts": build_artifacts,
        "test_cases": test_cases,
        "device_cases": device_cases,
        "suspect_files": changed_files,
        "suspect_tests": [
            tc.get("gtest") if isinstance(tc, dict) else tc
            for tc in test_cases if tc
        ],
        "downstream_revalidate_scope": "P4_P5",
    }
    design_index = {
        "phase": 1,
        "phase_name": "design-orchestrate",
        "kind": "report_index",
        "primary_entry_doc": design_rel,
        "primary_handoff_doc": gl.controls_relpath(*DESIGN_HANDOFF_PARTS),
        "primary_completion_receipt": gl.controls_relpath(*DESIGN_RECEIPT_PARTS),
        "entries": [
            {"path": design_rel, "role": "signed_design_doc"},
            {"path": contract_rel, "role": "signed_ar_contract"},
        ],
    }
    stage_packet_index = {
        "phase": 1,
        "phase_name": "design-orchestrate",
        "kind": "stage_packet_index",
        "entries": [
            {
                "logical_phase_id": "feature_develop",
                "logical_phase_name": "feature-develop",
                "entry_doc": gl.controls_relpath(*DESIGN_HANDOFF_PARTS),
            },
            {
                "logical_phase_id": "test_develop",
                "logical_phase_name": "test-develop",
                "entry_doc": gl.controls_relpath("feature_develop", "handoff_p2_to_p3.json"),
            },
            {
                "logical_phase_id": "build_verify",
                "logical_phase_name": "build-verify",
                "entry_doc": gl.controls_relpath("test_develop", "handoff_p3_test_develop.json"),
            },
            {
                "logical_phase_id": "test_author",
                "logical_phase_name": "test-author",
                "entry_doc": gl.controls_relpath("build_verify", "handoff_to_test_author.json"),
            },
            {
                "logical_phase_id": "device_functional",
                "logical_phase_name": "device-functional",
                "entry_doc": gl.controls_relpath("test_author", "handoff_to_device_functional.json"),
            },
            {
                "logical_phase_id": "quality_verify",
                "logical_phase_name": "quality-verify",
                "entry_doc": gl.controls_relpath("quality_verify", "handoff_to_upload_review.json"),
            },
            {
                "logical_phase_id": "upload_review",
                "logical_phase_name": "upload-review",
                "entry_doc": gl.controls_relpath("upload_review", "completion_receipt.json"),
            },
        ],
    }
    receipt = {
        "phase": 1,
        "logical_phase_id": "design_orchestrate",
        "logical_phase_name": "design-orchestrate",
        "phase_scope": "phase1-subflow",
        "bundle_id": "phase1-bundle",
        "bundle_revision": "",
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": True,
        "next_phase": 1,
        "next_logical_phase_id": "feature_develop",
        "requirements_count": len(requirements),
        "changed_files_count": len(changed_files),
        "build_artifacts_count": len(build_artifacts),
        "test_cases_count": len(test_cases),
        "device_cases_count": len(device_cases),
    }
    handoff = {
        "from_phase": 1,
        "from_phase_name": "design-orchestrate",
        "logical_phase_id": "design_orchestrate",
        "logical_phase_name": "design-orchestrate",
        "to_phase": 1,
        "to_phase_name": "feature-develop",
        "to_logical_phase_id": "feature_develop",
        "phase_scope": "phase1-subflow",
        "bundle_id": "phase1-bundle",
        "bundle_revision": "",
        "objective_completed": True,
        "truth_layer_pass_known": True,
        "produced_artifacts": [
            gl.control_artifact_ref(INITIAL_BUNDLE_PARTS, "initial_bundle_definition"),
            gl.control_artifact_ref(DESIGN_RECEIPT_PARTS, "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "signed design + signed ar-contract are available",
            "feature implementation must stay within declared changed_files",
            "downstream build/test/device coverage obligations are predeclared",
        ],
        "risks": [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": 1,
            "action": "feature-develop",
            "next_gate": "advance.py consent --phase 1",
        },
        "requires_repair": False,
        "requirements": requirements,
        "changed_files": changed_files,
    }
    gl.write_report_index(pdir, DESIGN_INDEX_PARTS, design_index)
    gl.write_control_index(pdir, STAGE_PACKET_INDEX_PARTS, stage_packet_index)
    gl.write_bundle_definition(pdir, INITIAL_BUNDLE_PARTS, bundle)
    gl.write_completion_receipt(pdir, DESIGN_RECEIPT_PARTS, receipt)
    gl.write_handoff_packet(pdir, DESIGN_HANDOFF_PARTS, handoff)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--design", help="path to AR_design.md (default: <PDIR>/AR_design.md)")
    ap.add_argument("--allow-missing-contract", action="store_true",
                    help="legacy escape: allow a design with no ```ar-contract``` block "
                         "(recorded as AR-CONTRACT-LEGACY-BYPASS in the signed reason; "
                         "downstream P2/P3/P4 coverage checks then have nothing to enforce)")
    ap.add_argument("--allow-contract-v1", action="store_true",
                    help="legacy escape: accept a v1 contract (no requirements/"
                         "changed_files closure). New runs should ship a v2 contract; "
                         "recorded as AR-CONTRACT-V1-LEGACY in the signed reason")
    ap.add_argument("--allow-weak-device-anchors", action="store_true",
                    help="explicit downgrade: accept v2 device_cases that declare no "
                         "strong P4 anchor (process/artifact_loaded/side_effect/"
                         "absent_before_trigger). Without this, such a design FAILs "
                         "because P4 would fall back to plain_marker (§17 weakest). "
                         "Recorded as P4-WEAK-ANCHORS-BYPASS in the signed reason")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    gl.evidence_dir(pdir, 1)

    def _fail(reason, problems=None, hint=None):
        gl.write_failure_report(pdir, 1, "gate_design.py", reason,
                                problems=problems or [], resume_hint=hint)
        gl.write_phase_summary(pdir, 1, "gate_design.py", "FAIL", reason,
                               checks=problems or [])

    src = args.design or os.path.join(pdir, "AR_design.md")
    if not os.path.isfile(src):
        reason = "AR_design.md not found at %s — write the design first" % src
        _fail(reason, hint="创建 AR_design.md(含 6 章节 + ar-contract v2 块)")
        gl.emit(pdir, 1, "gate_design.py", verdict="FAIL", reason=reason,
                artifacts_rel=[])
        sys.exit("PHASE 1a FAIL: AR_design.md not found (%s)" % src)

    with open(src, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    # copy into evidence so the signed artifact IS the reviewed design bytes
    design_rel = "evidence/phase1/AR_design.md"
    with open(os.path.join(pdir, design_rel), "w", encoding="utf-8") as f:
        f.write(text)

    ok, per_section, missing = gl.check_design_sections(text)

    # weak-model guard: reject a design left half-filled with TODO/TBD/占位/…
    placeholders = gl.find_placeholders(text)

    # machine-readable contract (drives P2/P3/P4 full-coverage hard gates). A
    # missing/invalid contract fails P1a unless --allow-missing-contract (legacy).
    c_ok, contract, c_detail = gl.parse_ar_contract(text)
    contract_bypass = ""
    contract_rel = None
    closure_problems = []
    version_note = ""
    weak_anchor_note = ""
    weak_cases = []
    if c_ok:
        # v2 reference-closure (skipped for v1). New runs default to requiring v2.
        closure_ok, closure_problems = gl.check_contract_closure(contract)
        if contract.get("version") == 1 and not args.allow_contract_v1:
            c_ok = False
            c_detail = "v1 contract requires --allow-contract-v1 (new runs need v2)"
        elif contract.get("version") == 1:
            version_note = " AR-CONTRACT-V1-LEGACY"
        if c_ok:
            # P4 anchor strength (v2 only): a v2 device_case that declares none of
            # process/artifact_loaded/side_effect/absent_before_trigger leaves P4
            # at plain_marker (§17 weakest). Refuse by default so a weak model is
            # not silently handed the weakest possible device proof; the flag is
            # an explicit, signed downgrade (like the contract legacy bypass). v1
            # is already an explicit legacy downgrade and predates the anchors, so
            # the anchor gate does not apply to it.
            if contract.get("version") != 1:
                weak_cases = gl.weak_device_cases(contract.get("device_cases"))
            if weak_cases and args.allow_weak_device_anchors:
                weak_anchor_note = " P4-WEAK-ANCHORS-BYPASS(%d)" % len(weak_cases)
            contract_rel = "evidence/phase1/ar_contract.json"
            with open(os.path.join(pdir, contract_rel), "w", encoding="utf-8") as f:
                json.dump(contract, f, ensure_ascii=False, indent=2)
    elif args.allow_missing_contract:
        contract_bypass = " AR-CONTRACT-LEGACY-BYPASS"

    check_rel = "evidence/phase1/design_check.txt"
    with open(os.path.join(pdir, check_rel), "w", encoding="utf-8") as f:
        f.write("source=%s\nsections_ok=%s\ncontract_ok=%s (%s)\n"
                % (src, ok, c_ok, c_detail))
        f.write("placeholders=%d closure_problems=%d\n\n"
                % (len(placeholders), len(closure_problems)))
        for name, present, detail in per_section:
            f.write("[%s] %-18s %s\n" % ("OK " if present else "BAD", name, detail))
        if missing:
            f.write("\nmissing/incomplete: %s\n" % ", ".join(missing))
        if placeholders:
            f.write("\nplaceholders:\n")
            for ln, snip in placeholders:
                f.write("  L%d: %s\n" % (ln, snip))
        if closure_problems:
            f.write("\ncontract closure problems:\n")
            for p in closure_problems:
                f.write("  - %s\n" % p)
        if weak_cases:
            f.write("\nP4 weak device_cases (no strong anchor -> plain_marker):\n")
            for _i, ident in weak_cases:
                f.write("  - %s\n" % ident)
            f.write("  downgrade accepted: %s\n" % bool(args.allow_weak_device_anchors))

    # PASS requires: sections AND a valid contract (unless legacy contract bypass)
    # AND no placeholders AND (for a real v2 contract) reference closure AND every
    # v2 device_case declaring at least one strong P4 anchor (unless explicitly
    # downgraded with --allow-weak-device-anchors).
    contract_gate_ok = c_ok or args.allow_missing_contract
    closure_gate_ok = (not c_ok) or (not closure_problems)
    anchor_gate_ok = (not c_ok) or (not weak_cases) or args.allow_weak_device_anchors
    verdict = "PASS" if (ok and contract_gate_ok and not placeholders
                         and closure_gate_ok and anchor_gate_ok) else "FAIL"
    reason = "design sections %d/%d ok%s; contract %s%s%s%s%s%s%s" % (
        len(per_section) - len(missing), len(per_section),
        "" if ok else " (missing: %s)" % ", ".join(missing),
        c_detail, contract_bypass, version_note,
        "" if not placeholders else "; PLACEHOLDERS=%d" % len(placeholders),
        "" if closure_gate_ok else "; CLOSURE_FAIL=%d" % len(closure_problems),
        "" if anchor_gate_ok else "; P4_WEAK_ANCHORS=%d" % len(weak_cases),
        weak_anchor_note)
    print(reason)
    arts = [design_rel, check_rel]
    if contract_rel:
        arts.append(contract_rel)

    # navigation summary / failure report (never authoritative)
    problems = []
    if missing:
        problems += ["missing section: %s" % m for m in missing]
    if placeholders:
        problems += ["placeholder @L%d: %s" % (ln, s) for ln, s in placeholders]
    if not contract_gate_ok:
        problems.append("contract: %s" % c_detail)
    problems += closure_problems
    if not anchor_gate_ok:
        problems += [
            "device_case %s declares no strong P4 anchor "
            "(process/artifact_loaded/side_effect/absent_before_trigger) — P4 "
            "would fall back to plain_marker (§17 weakest); add an anchor or "
            "re-run with --allow-weak-device-anchors to accept the downgrade"
            % ident for _i, ident in weak_cases]
    if verdict == "PASS":
        gl.write_phase_summary(pdir, 1, "gate_design.py", "PASS", reason,
                               checks=["sections", "contract", "closure",
                                       "device_anchors"],
                               extra={"contract_version": contract.get("version") if c_ok else None,
                                      "p4_weak_device_cases": len(weak_cases),
                                      "p4_weak_anchors_bypassed": bool(weak_cases and args.allow_weak_device_anchors)})
        _derive_design_controls(
            pdir, contract if c_ok else {},
            contract_rel=contract_rel or "",
            design_rel=design_rel)
        gl.clear_failure_report(pdir, 1)
    else:
        _fail(reason, problems=problems,
              hint="补齐缺失章节/占位/契约闭环后重跑 gate_design.py")

    if verdict == "PASS":
        gl.write_gate_phase_memory_card(
            pdir, 1, "design-orchestrate", verdict="PASS",
            current_blocker=None,
            forbidden_actions=[
                "write_feature_code_before_design_consent",
                "skip_ar_contract_generation",
            ],
            next_expected_action_class="consent",
            last_failure_class=None,
            human_escalation_needed=False,
            primary_entry_doc=gl.controls_relpath(*DESIGN_INDEX_PARTS),
            primary_handoff_doc=gl.controls_relpath(*DESIGN_HANDOFF_PARTS))
    else:
        # S2: P1 now emits a repair packet (+ FAIL card) via finalize_control so
        # a weak model gets a concrete repair route for a malformed design/
        # contract, and the circuit breaker (S1) can escalate a design that
        # keeps failing. Suspect = the design doc itself. Navigation only.
        gl.finalize_control(
            pdir, phase=1, phase_name="design-orchestrate", verdict="FAIL",
            repair_packet_parts=REPAIR_PACKET_PARTS,
            failure_class="design_gate_failed",
            suspect_files=["evidence/phase1/AR_design.md"],
            problems=problems, last_failure_reason=reason,
            must_rerun=["gate_design.py"],
            next_action_class="repair",
            forbidden_actions=[
                "write_feature_code_before_design_consent",
                "skip_ar_contract_generation",
            ])
    gl.write_gate_stage_packet_from_def(
        pdir, "design_orchestrate", "design-orchestrate", physical_phase=1)
    gl.emit(pdir, 1, "gate_design.py", verdict=verdict, reason=reason,
            artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 1a PASS — AR_design signed. Next: human review + "
              "advance.py consent --phase 1, then write code and gate_develop.py.")
    else:
        sys.exit("PHASE 1a FAIL: %s" % reason)


if __name__ == "__main__":
    main()
