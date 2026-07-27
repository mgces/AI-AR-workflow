#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_device_func.py — Phase 4 (real-device functional test). Strongest gate.

The device RTC is wrong, so timestamps are worthless for freshness. Instead the
evidence is bound to THIS run cryptographically and monotonically:

  * a fresh per-run nonce is generated host-side and injected into the device
    hilog timeline (log -t LIFECYCLE_GATE NONCE=<nonce> START/END);
  * /proc/uptime is sampled before deploy and after capture and must increase
    (proves same boot session, after deploy) — no wall clock involved;
  * the captured hilog window must contain BOTH the nonce AND the caller-supplied
    functional success marker, AND every device_cases[].marker declared in the
    signed ar-contract (full coverage of the AR_design device cases);
  * every hdc command + exit code is recorded; raw capture is sha256'd in the
    signed manifest so the orchestrator cannot swap in a hand-written log.

Deploy/scenario specifics differ per component, so this gate takes them as
shell snippets (provided by the phase-6 skill), runs them verbatim, and records
them. It owns the nonce + capture + verdict logic; it does not invent behavior.
"""
import argparse
import json
import os
import re
import secrets
import shlex
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import gatelib as gl  # noqa: E402

DEVICE_SH = os.path.join(HERE, "lib", "device.sh")
TEST_DEVELOP_STATUS_PARTS = ("test_develop", "phase1_test_develop.json")
TEST_DEVELOP_SCOPE_PARTS = ("test_develop", "signed_test_scope.json")
TEST_DEVELOP_MATRIX_PARTS = ("test_develop", "test_intent_matrix.json")
TEST_AUTHOR_RECEIPT_PARTS = ("test_author", "completion_receipt.json")
TEST_AUTHOR_HANDOFF_PARTS = ("test_author", "handoff_to_device_functional.json")
DEVICE_RECEIPT_PARTS = ("device_functional", "completion_receipt.json")
DEVICE_HANDOFF_PARTS = ("device_functional", "handoff_to_quality_verify.json")
QUALITY_RECEIPT_PARTS = ("quality_verify", "completion_receipt.json")
QUALITY_HANDOFF_PARTS = ("quality_verify", "handoff_to_upload_review.json")
REPAIR_PACKET_PARTS = ("repairs", "current.json")
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



def _phase_control_meta(phase):
    if phase == 6:
        return {
            "logical_phase_id": "device_functional",
            "logical_phase_name": "device-functional",
            "phase_name": "device-functional",
            "completion_receipt_parts": DEVICE_RECEIPT_PARTS,
            "handoff_parts": DEVICE_HANDOFF_PARTS,
            "next_phase": 7,
            "next_action": "quality-verify",
            "next_gate": "advance.py advance --phase 6",
            "upstream_receipt_parts": TEST_AUTHOR_RECEIPT_PARTS,
            "upstream_handoff_parts": TEST_AUTHOR_HANDOFF_PARTS,
        }
    return {
        "logical_phase_id": "quality_verify",
        "logical_phase_name": "quality-verify",
        "phase_name": "quality-verify",
        "completion_receipt_parts": QUALITY_RECEIPT_PARTS,
        "handoff_parts": QUALITY_HANDOFF_PARTS,
        "next_phase": 8,
        "next_action": "upload-review",
        "next_gate": "advance.py advance --phase 7",
        "upstream_receipt_parts": DEVICE_RECEIPT_PARTS,
        "upstream_handoff_parts": DEVICE_HANDOFF_PARTS,
    }



def _test_bundle_context(pdir, phase):
    scope = gl.read_control_json(pdir, *TEST_DEVELOP_SCOPE_PARTS) or {}
    matrix = gl.read_control_json(pdir, *TEST_DEVELOP_MATRIX_PARTS) or {}
    status = gl.read_control_json(pdir, *TEST_DEVELOP_STATUS_PARTS) or {}
    meta = _phase_control_meta(phase)
    receipt = gl.read_control_json(pdir, *meta["upstream_receipt_parts"]) or {}
    handoff = gl.read_control_json(pdir, *meta["upstream_handoff_parts"]) or {}
    if phase == 7 and not (receipt or handoff):
        receipt = gl.read_control_json(pdir, *TEST_AUTHOR_RECEIPT_PARTS) or {}
        handoff = gl.read_control_json(pdir, *TEST_AUTHOR_HANDOFF_PARTS) or {}
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
    # Delegates the retry-vs-repair split (§9.1/§9.2) to the shared helper so all
    # gates count and budget both circuit breakers identically.
    prev = gl.read_control_json(pdir, *REPAIR_PACKET_PARTS) or {}
    return gl.repair_round_metadata(
        prev, phase=phase, bundle_revision_from=bundle_revision_from,
        recommended_next_action=recommended_next_action, failure_class=failure_class,
        max_repair_rounds=MAX_REPAIR_ROUNDS, max_retry_rounds=MAX_RETRY_ROUNDS)



def _write_repair_packet(pdir, *, phase, failure_class, problems, last_failure_reason,
                         regen_signals=None):
    bundle = _test_bundle_context(pdir, phase)
    meta = _phase_control_meta(phase)
    repair_disallowed = gl.regen_signal_present(**(regen_signals or {}))
    base_action = gl.classify_repair_vs_regenerate(
        failure_class, repair_disallowed=repair_disallowed)
    rounds = _repair_round_metadata(
        pdir,
        phase=phase,
        bundle_revision_from=bundle.get("bundle_revision") or "",
        recommended_next_action=base_action,
        failure_class=failure_class,
    )
    packet = {
        "phase": phase,
        "phase_name": meta["phase_name"],
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision_from": bundle.get("bundle_revision") or "",
        "active": True,
        "failure_class": failure_class,
        "suspect_files": bundle.get("suspect_files") or [],
        "suspect_tests": bundle.get("suspect_tests") or [],
        "allowed_fix_scope": [
            "declared test files",
            "device deployment inputs",
            "device/integration verification hooks",
        ],
        "must_rerun": ["gate_device_func.py"],
        "downstream_revalidate_scope": gl.scope_for_failure(
            failure_class, bundle.get("downstream_revalidate_scope")),
        "repair_disallowed_if": [
            "functional requirement changes are needed",
            "signed contract is unrecoverable",
        ],
        "regen_trigger_if": [
            "fix requires new functional code outside the phase1 freeze",
            "device verification scope changes",
        ],
        "regen_required": repair_disallowed,
        "regen_signals": sorted(k for k, v in (regen_signals or {}).items() if v),
        "last_failure_reason": last_failure_reason,
        "problems": problems or [],
        "max_retry_rounds": MAX_RETRY_ROUNDS,
        "max_repair_rounds": MAX_REPAIR_ROUNDS,
        "retry_rounds": rounds["retry_rounds"],
        "repair_rounds": rounds["repair_rounds"],
        "human_escalation_needed": rounds["human_escalation_needed"],
        "escalation_note": rounds["escalation_note"],
        "recommended_next_action": "human_escalation" if rounds["human_escalation_needed"] else base_action,
    }
    gl.write_repair_packet(pdir, REPAIR_PACKET_PARTS, packet)
    return packet



def _write_completion_controls(pdir, *, phase, arts, device_case_count):
    bundle = _test_bundle_context(pdir, phase)
    meta = _phase_control_meta(phase)
    bundle_revision = bundle.get("bundle_revision") or ""
    receipt = {
        "phase": phase,
        "logical_phase_id": meta["logical_phase_id"],
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "semantic_done": True,
        "truth_layer_pass_known": True,
        "next_phase_ready": True,
        "human_gate_pending": True,
        "next_phase": meta["next_phase"],
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
        "device_case_count": device_case_count,
        "key_artifacts": arts,
    }
    handoff = {
        "bundle_id": bundle.get("bundle_id") or "phase1-bundle",
        "bundle_revision": bundle_revision,
        "from_phase": phase,
        "from_phase_name": meta["phase_name"],
        "to_phase": meta["next_phase"],
        "to_phase_name": meta["next_action"],
        "logical_phase_id": meta["logical_phase_id"],
        "logical_phase_name": meta["logical_phase_name"],
        "objective_completed": True,
        "produced_artifacts": [
            gl.control_artifact_ref(meta["completion_receipt_parts"], "completion_receipt"),
        ],
        "facts_for_next_phase": [
            "%s passed" % meta["phase_name"],
            "bundle revision continuity held",
            "device case count=%d" % device_case_count,
        ],
        "risks": [],
        "open_questions": [],
        "recommended_next_action": {
            "phase": meta["next_phase"],
            "action": meta["next_action"],
            "next_gate": meta["next_gate"],
        },
        "requires_repair": False,
        "repair_scope_hint": bundle.get("suspect_files") or [],
        "downstream_revalidate_scope": bundle.get("downstream_revalidate_scope") or "P4_P5",
    }
    gl.write_completion_receipt(
        pdir, tuple(meta["completion_receipt_parts"]), receipt)
    gl.write_handoff_packet(pdir, tuple(meta["handoff_parts"]), handoff)



def missing_phase4_proof_args(args):
    missing = []
    for attr, flag in (
        ("host_artifact", "--host-artifact"),
        ("device_artifact", "--device-artifact"),
        ("runtime_marker", "--runtime-marker"),
        ("e2e_marker", "--e2e-marker"),
    ):
        if not getattr(args, attr, None):
            missing.append(flag)
    return missing


def parse_device_sha256sum(output):
    match = re.search(r"\b([0-9a-fA-F]{64})\b", output or "")
    return match.group(1).lower() if match else None


def find_marker_literals(script_paths, markers):
    found = {}
    for path in script_paths:
        if not path:
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        for marker in markers:
            if marker and marker in text:
                found.setdefault(marker, path)
    return found


def parse_hilog_pid(line):
    """Best-effort PID extraction from a hilog line.

    Supports common `hilog -x` shapes such as:
      07-24 10:20:30.123  1234  1234 I Tag: msg
      ... pid=1234 ...
      ... PID:1234 ...
    Returns int(pid) or None.
    """
    if not line:
        return None
    for pat in (
        r"\bpid\s*[=:]\s*(\d+)\b",
        r"\bPID\s*[=:]\s*(\d+)\b",
        r"^\s*\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s+(\d+)\s+\d+\b",
    ):
        m = re.search(pat, line)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                return None
    return None


def find_marker_line(text, marker):
    for line in (text or "").splitlines():
        if marker and marker in line:
            return line
    return None


def split_capture_windows(cap_text, nonce):
    """Split a full hilog capture into the baseline and trigger windows.

    We inject three host-controlled fence lines:
      NONCE=<n> BASELINE_START
      NONCE=<n> START
      NONCE=<n> END

    The baseline window is between BASELINE_START and START; the trigger window is
    between START and END. If a window is unavailable, its *_found flag is False
    and its text is empty.
    """
    lines = (cap_text or "").splitlines()
    base_tok = "NONCE=%s BASELINE_START" % nonce
    start_tok = "NONCE=%s START" % nonce
    end_tok = "NONCE=%s END" % nonce
    base_i = start_i = end_i = None
    for i, line in enumerate(lines):
        if base_i is None and base_tok in line:
            base_i = i
        if start_i is None and start_tok in line:
            start_i = i
        if end_i is None and end_tok in line:
            end_i = i
    baseline_found = base_i is not None and start_i is not None and base_i < start_i
    trigger_found = start_i is not None and end_i is not None and start_i < end_i
    baseline_text = "\n".join(lines[base_i + 1:start_i]) if baseline_found else ""
    trigger_text = "\n".join(lines[start_i + 1:end_i]) if trigger_found else ""
    return {
        "baseline_start_found": base_i is not None,
        "start_found": start_i is not None,
        "end_found": end_i is not None,
        "baseline_found": baseline_found,
        "trigger_found": trigger_found,
        "baseline_text": baseline_text,
        "trigger_text": trigger_text,
    }


def normalize_cmdline(text):
    return (text or "").replace("\x00", " ").replace("\r", "").strip()


def process_matches(expected, cmdline, exe_path):
    """Best-effort process identity match for a contract-declared process name.

    The contract names are human-authored process identifiers (e.g. foundation),
    so accept either an exact basename match or the expected token appearing in
    the resolved cmdline / exe path.
    """
    if not expected:
        return True
    exp = expected.strip()
    cmd = normalize_cmdline(cmdline)
    exe = (exe_path or "").strip()
    bases = [os.path.basename(cmd.split()[0]) if cmd.split() else "",
             os.path.basename(exe)]
    if exp in bases:
        return True
    return exp in cmd or exp in exe


def inspect_device_case(case, *, baseline_text, trigger_text,
                        baseline_window_found=True, trigger_window_found=True,
                        probe_pid=None, run_side_effect=None):
    """Inspect one device case against the trigger/baseline windows.

    `probe_pid(pid)` returns a dict with optional cmdline/exe/maps fields.
    `run_side_effect(side_effect)` returns a dict with at least {ok: bool}.
    """
    probe_pid = probe_pid or (lambda pid: {})
    run_side_effect = run_side_effect or (lambda se: {"ok": True})

    marker = case.get("marker")
    marker_line = find_marker_line(trigger_text, marker)
    marker_seen = marker_line is not None
    marker_pid = parse_hilog_pid(marker_line) if marker_line else None
    present_before = marker in (baseline_text or "")
    negative_control_required = bool(case.get("absent_before_trigger"))
    negative_control_ok = True
    problems = []
    if negative_control_required:
        negative_control_ok = (baseline_window_found and trigger_window_found
                               and not present_before and marker_seen)
        if not baseline_window_found or not trigger_window_found:
            problems.append("baseline/trigger window missing")
        elif present_before:
            problems.append("marker present before trigger")

    probe = {}
    process_required = bool(case.get("process"))
    artifact_required = bool(case.get("artifact_loaded"))
    if marker_pid is not None and (process_required or artifact_required):
        probe = probe_pid(marker_pid) or {}

    process_match = True
    if process_required:
        if marker_pid is None:
            process_match = False
            problems.append("marker pid missing")
        else:
            process_match = process_matches(case.get("process"),
                                            probe.get("cmdline"),
                                            probe.get("exe"))
            if not process_match:
                problems.append("process mismatch")

    artifact_loaded_verified = True
    artifact_probe = "not_requested"
    if artifact_required:
        expected = case.get("artifact_loaded")
        if marker_pid is None:
            artifact_loaded_verified = False
            artifact_probe = "pid_missing"
            problems.append("artifact_loaded cannot be proven without pid")
        else:
            exe = probe.get("exe") or ""
            maps = probe.get("maps") or ""
            if expected and expected in exe:
                artifact_loaded_verified = True
                artifact_probe = "exe"
            elif expected and expected in maps:
                artifact_loaded_verified = True
                artifact_probe = "maps"
            else:
                artifact_loaded_verified = False
                artifact_probe = "missing"
                problems.append("artifact not loaded by target process")

    side = {"required": False, "ok": True}
    if case.get("side_effect"):
        side = run_side_effect(case["side_effect"]) or {"ok": False}
        side.setdefault("required", True)
        side.setdefault("type", case["side_effect"].get("type"))
        if not side.get("ok"):
            problems.append("side effect assertion failed")

    if not marker_seen:
        problems.append("marker missing in trigger window")

    ok = marker_seen and negative_control_ok and process_match \
        and artifact_loaded_verified and side.get("ok", True)
    return {
        "id": case.get("id"),
        "desc": case.get("desc"),
        "marker": marker,
        "marker_seen": marker_seen,
        "marker_line": marker_line,
        "marker_pid": marker_pid,
        "process_required": process_required,
        "process_expected": case.get("process"),
        "process_match": process_match,
        "artifact_required": artifact_required,
        "artifact_loaded_expected": case.get("artifact_loaded"),
        "artifact_loaded_verified": artifact_loaded_verified,
        "artifact_probe": artifact_probe,
        "side_effect_required": bool(case.get("side_effect")),
        "side_effect": side,
        "side_effect_ok": side.get("ok", True),
        "negative_control_required": negative_control_required,
        "present_before_trigger": present_before,
        "negative_control_ok": negative_control_ok,
        "baseline_window_found": baseline_window_found,
        "trigger_window_found": trigger_window_found,
        "process_probe": {
            "cmdline": normalize_cmdline(probe.get("cmdline")),
            "exe": (probe.get("exe") or "").strip(),
            "maps_has_artifact": bool(case.get("artifact_loaded")
                                       and case.get("artifact_loaded") in (probe.get("maps") or "")),
        },
        "ok": ok,
        "problems": problems,
    }


# Maps a §17 evidence kind to the summarize_device_cases() key that proves it.
# runtime_e2e_marker / plain_marker have no per-case boolean: they are the weak
# fallbacks the stronger dimensions above are meant to supersede.
_EVIDENCE_SUMMARY_KEYS = {
    "process_provenance": "process_provenance_verified",
    "artifact_loaded": "artifact_loaded_verified",
    "side_effect": "side_effect_verified",
    "differential": "negative_control_verified",
}


def summarize_device_cases(results):
    # NOTE: this is a REPORTING summary, not the verdict — the phase-6 verdict is
    # computed from per-case `ok` + marker/nonce/uptime checks, never from these
    # booleans. With zero cases, all()/every dimension would be vacuously True and
    # phase_summary.json would claim "*_verified: true" when nothing was actually
    # verified — actively misleading to a weak model. Report False + a count of 0
    # instead, so an empty run reads as "nothing proven", not "all proven".
    results = results or []
    evaluated = len(results)
    if not evaluated:
        return {
            "device_cases_evaluated": 0,
            "process_provenance_verified": False,
            "artifact_loaded_verified": False,
            "side_effect_verified": False,
            "negative_control_verified": False,
        }
    process_ok = all(r.get("process_match", True) for r in results)
    artifact_ok = all(r.get("artifact_loaded_verified", True) for r in results)
    side_ok = all(r.get("side_effect_ok", True) for r in results)
    negative_ok = all(r.get("negative_control_ok", True) for r in results)
    return {
        "device_cases_evaluated": evaluated,
        "process_provenance_verified": process_ok,
        "artifact_loaded_verified": artifact_ok,
        "side_effect_verified": side_ok,
        "negative_control_verified": negative_ok,
    }


def evaluate_phase4_verdict(*, cap_text, nonce, marker, runtime_marker, e2e_marker,
                            uptime_before, uptime_after, host_sha=None, device_sha=None,
                            device_markers=None, trigger_text=None,
                            trigger_window_found=True, device_case_results=None):
    nonce_ok = nonce in (cap_text or "")
    target_text = trigger_text if trigger_text is not None else (cap_text or "")
    marker_ok = marker in target_text
    runtime_ok = True if not runtime_marker else runtime_marker in target_text
    e2e_ok = True if not e2e_marker else e2e_marker in target_text
    missing_dm = [m for m in (device_markers or []) if m not in target_text]
    device_ok = not missing_dm
    artifact_ok = True
    if host_sha is not None or device_sha is not None:
        artifact_ok = bool(host_sha) and bool(device_sha) and host_sha == device_sha
    try:
        mono_ok = float(uptime_after) > float(uptime_before) > 0
    except ValueError:
        mono_ok = False

    case_summary = summarize_device_cases(device_case_results or [])
    case_ok = all(r.get("ok") for r in (device_case_results or []))
    reason = (
        "nonce=%s trigger_window=%s marker=%s runtime=%s e2e=%s device_cases=%d/%d "
        "artifact_hash=%s provenance=%s artifact_loaded=%s side_effect=%s "
        "negative_control=%s uptime %s->%s mono=%s"
        % (nonce_ok, trigger_window_found, marker_ok, runtime_ok, e2e_ok,
           len(device_markers or []) - len(missing_dm), len(device_markers or []),
           artifact_ok, case_summary["process_provenance_verified"],
           case_summary["artifact_loaded_verified"],
           case_summary["side_effect_verified"],
           case_summary["negative_control_verified"],
           uptime_before, uptime_after, mono_ok)
    )
    if missing_dm:
        reason += " MISSING_device_markers=%s" % ",".join(missing_dm)
    bad_cases = [r.get("id") or r.get("marker") or "case" for r in (device_case_results or []) if not r.get("ok")]
    if bad_cases:
        reason += " BAD_device_cases=%s" % ",".join(bad_cases)
    ok = (nonce_ok and trigger_window_found and marker_ok and runtime_ok and e2e_ok
          and device_ok and artifact_ok and mono_ok and case_ok)
    return ok, reason


def phase4_failure_class(*, marker_ok, runtime_ok, e2e_ok, artifact_ok,
                         missing_dm, trigger_window_found, device_case_results):
    for r in device_case_results or []:
        if not r.get("marker_seen"):
            return "contract_device_case_incomplete"
        if not r.get("negative_control_ok", True):
            return "marker_present_before_trigger"
        if r.get("process_required") and not r.get("process_match", True):
            return ("marker_emitted_by_non_target_process"
                    if r.get("marker_pid") is not None else "process_provenance_mismatch")
        if r.get("artifact_required") and not r.get("artifact_loaded_verified", True):
            return "artifact_not_loaded_by_target_process"
        if r.get("side_effect_required") and not r.get("side_effect_ok", True):
            return "side_effect_assertion_failed"
    if not trigger_window_found:
        return "marker_missing"
    if not artifact_ok:
        return "artifact_mismatch"
    if not marker_ok or not runtime_ok or not e2e_ok:
        return "marker_missing"
    if missing_dm:
        return "contract_device_case_incomplete"
    return "device_functional_verdict_failed"


def sh(snippet, **kw):
    """Run a snippet with device.sh sourced; return CompletedProcess.
    Device logs (hilog) can contain non-UTF-8 bytes, so decode tolerantly with
    errors='replace' to avoid crashing the capture (verdict logic is unchanged)."""
    full = '. "%s"\n%s' % (DEVICE_SH, snippet)
    return subprocess.run(["bash", "-c", full], text=True, errors="replace",
                          capture_output=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--deploy-script", help="path to a bash snippet that deploys the artifact "
                                            "(may use dev_send/dev_shell/dev_remount_rw)")
    ap.add_argument("--scenario-script", required=True,
                    help="path to a bash snippet that drives the feature; the env var "
                         "$GATE_NONCE is exported and SHOULD be emitted into device logs")
    ap.add_argument("--marker", required=True,
                    help="functional success string that must appear in the hilog window")
    ap.add_argument("--host-artifact",
                    help="host-side build artifact that must match the deployed device artifact "
                         "(required for phase 6)")
    ap.add_argument("--device-artifact",
                    help="absolute device path of the running/deployed artifact; sha256sum is "
                         "captured after deploy (required for phase 6)")
    ap.add_argument("--runtime-marker",
                    help="string emitted only by the changed runtime code path, preferably with "
                         "$GATE_NONCE in the same execution path (required for phase 6)")
    ap.add_argument("--e2e-marker",
                    help="string emitted only after the real end-to-end use/injection scenario "
                         "succeeds (required for phase 6)")
    ap.add_argument("--phase", type=int, default=6, help="6 (device) or 7 (integration reuse)")
    args = ap.parse_args()
    phase = args.phase
    if phase == 6:
        missing = missing_phase4_proof_args(args)
        if missing:
            ap.error("phase 6 requires real-runtime/e2e proof args: %s"
                     % ", ".join(missing))
    if bool(args.host_artifact) != bool(args.device_artifact):
        ap.error("--host-artifact and --device-artifact must be provided together")
    if phase == 6:
        found = find_marker_literals(
            [args.deploy_script, args.scenario_script],
            [args.marker, args.runtime_marker, args.e2e_marker],
        )
        if found:
            detail = ", ".join("%s in %s" % (marker, path)
                               for marker, path in sorted(found.items()))
            ap.error("phase 6 success markers must be emitted by the runtime/e2e result, "
                     "not embedded in driver scripts: %s" % detail)

    host_sha = None
    if args.host_artifact:
        if not os.path.isfile(args.host_artifact):
            sys.exit("ERROR: --host-artifact does not exist or is not a file: %s"
                     % args.host_artifact)
        host_sha = gl.sha256_file(args.host_artifact)

    pdir = gl.pipeline_dir(args.pipeline_dir)
    gl.evidence_dir(pdir, phase)

    # CONTRACT COVERAGE (P4 hard gate): the signed ar-contract's device_cases[]
    # markers must ALL appear in the captured hilog window. Recovered from the
    # HMAC-signed AR_design. Only enforced for phase 6 (phase-7 reuse of this gate
    # does not verify P4 device cases). absent/bypass -> no extra markers;
    # tampered -> FAIL.
    device_cases = []
    device_markers = []
    if phase == 6:
        c_ok, contract, c_detail = gl.load_signed_contract(pdir)
        if c_ok:
            device_cases = contract["device_cases"]
            device_markers = [c["marker"] for c in device_cases]
        elif "absent" not in c_detail:
            sys.exit("ERROR: ar-contract unrecoverable for phase 6: %s" % c_detail)
        # Contract device markers must also come from the real runtime/e2e result,
        # not be hard-coded into the driver scripts (else coverage is fakeable).
        found = find_marker_literals([args.deploy_script, args.scenario_script],
                                     device_markers)
        if found:
            detail = ", ".join("%s in %s" % (m, p) for m, p in sorted(found.items()))
            sys.exit("ERROR: phase 6 contract device markers must be emitted by the "
                     "runtime/e2e result, not embedded in driver scripts: %s" % detail)

    nonce = secrets.token_hex(16)

    cmds_log = []   # (label, cmd, rc, out)

    def record(label, cp, cmd=""):
        cmds_log.append((label, cmd, cp.returncode, (cp.stdout + cp.stderr).strip()))
        return cp

    def dev_shell_record(label, command):
        cp = sh("dev_shell %s" % shlex.quote(command))
        return record(label, cp, cmd=command)

    def probe_pid(pid):
        cmdline_cmd = "tr '\\0' ' ' </proc/%d/cmdline" % pid
        exe_cmd = "readlink /proc/%d/exe" % pid
        maps_cmd = "cat /proc/%d/maps" % pid
        cmdline = dev_shell_record("pid_%d_cmdline" % pid, cmdline_cmd)
        exe = dev_shell_record("pid_%d_exe" % pid, exe_cmd)
        maps = dev_shell_record("pid_%d_maps" % pid, maps_cmd)
        return {
            "cmdline": cmdline.stdout,
            "exe": exe.stdout,
            "maps": maps.stdout,
            "cmdline_rc": cmdline.returncode,
            "exe_rc": exe.returncode,
            "maps_rc": maps.returncode,
        }

    def run_side_effect(side_effect):
        cmd = side_effect["command"]
        cp = dev_shell_record("side_effect:%s" % side_effect.get("type", "shell_assert"), cmd)
        stdout = (cp.stdout or "").replace("\r", "").strip()
        stderr = (cp.stderr or "").replace("\r", "").strip()
        return {
            "required": True,
            "type": side_effect.get("type"),
            "command": cmd,
            "expect": side_effect.get("expect"),
            "stdout": stdout,
            "stderr": stderr,
            "returncode": cp.returncode,
            "ok": cp.returncode == 0 and stdout == side_effect.get("expect", ""),
        }

    # 0. device online + serial pinned
    if record("online", sh("dev_assert_online")).returncode != 0:
        _fail(pdir, phase, nonce, cmds_log, "device not reachable",
              failure_class="device_offline",
              problems=["device not reachable"],
              resume_hint="检查 hdc 连接 / DEVICE_SERIAL 后重跑 gate_device_func.py")

    up_before = record("uptime_before", sh("dev_uptime")).stdout.strip()

    # 1. deploy (optional)
    if args.deploy_script:
        with open(args.deploy_script) as f:
            dep = f.read()
        cp = sh(dep, env={**os.environ, "GATE_NONCE": nonce})
        record("deploy", cp, cmd=args.deploy_script)
        if cp.returncode != 0:
            _fail(pdir, phase, nonce, cmds_log, "deploy script exited %d" % cp.returncode,
                  failure_class="deploy_failed",
                  problems=["deploy script exited %d" % cp.returncode],
                  resume_hint="修复 deploy 脚本或设备环境后重跑 gate_device_func.py")

    device_sha = None
    proof_rel = None
    if args.device_artifact:
        device_sha_cmd = "sha256sum %s" % shlex.quote(args.device_artifact)
        cp = sh("dev_shell %s" % shlex.quote(device_sha_cmd))
        record("device_artifact_sha256", cp, cmd=device_sha_cmd)
        if cp.returncode != 0:
            _fail(pdir, phase, nonce, cmds_log,
                  "device artifact sha256 command exited %d" % cp.returncode,
                  failure_class="artifact_mismatch",
                  problems=["device artifact sha256 command exited %d" % cp.returncode],
                  resume_hint="确认设备侧产物路径后重跑 gate_device_func.py")
        device_sha = parse_device_sha256sum(cp.stdout + cp.stderr)
        if not device_sha:
            _fail(pdir, phase, nonce, cmds_log, "device artifact sha256 missing",
                  failure_class="artifact_mismatch",
                  problems=["device artifact sha256 missing"],
                  resume_hint="确认设备侧产物存在且可由 sha256sum 读取后重跑 gate_device_func.py")
        proof_rel = "evidence/phase%d/artifact_runtime_proof.txt" % phase
        with open(os.path.join(pdir, proof_rel), "w", encoding="utf-8") as f:
            f.write("host_artifact=%s\nhost_sha256=%s\n" % (args.host_artifact, host_sha))
            f.write("device_artifact=%s\ndevice_sha256=%s\n" % (args.device_artifact, device_sha))

    # 2. baseline marker + START marker. The baseline window is intentionally the
    # small pre-trigger region controlled by these host-emitted fences.
    record("mark_baseline_start",
           sh('dev_shell "log -t LIFECYCLE_GATE NONCE=%s BASELINE_START"' % nonce))
    record("mark_start", sh('dev_shell "log -t LIFECYCLE_GATE NONCE=%s START"' % nonce))

    # 3. drive the functional scenario (nonce exported for the component to echo)
    with open(args.scenario_script) as f:
        scen = f.read()
    cp = sh(scen, env={**os.environ, "GATE_NONCE": nonce})
    record("scenario", cp, cmd=args.scenario_script)
    if cp.returncode != 0:
        _fail(pdir, phase, nonce, cmds_log, "scenario script exited %d" % cp.returncode,
              failure_class="marker_missing",
              problems=["scenario script exited %d" % cp.returncode],
              resume_hint="修复 scenario 脚本或触发条件后重跑 gate_device_func.py")

    # 4. mark END + capture hilog
    record("mark_end", sh('dev_shell "log -t LIFECYCLE_GATE NONCE=%s END"' % nonce))
    cap = record("hilog", sh('dev_shell "hilog -x"'))
    cap_text = cap.stdout
    cap_rel = "evidence/phase%d/hilog_capture.txt" % phase
    with open(os.path.join(pdir, cap_rel), "w", encoding="utf-8") as f:
        f.write(cap_text)

    windows = split_capture_windows(cap_text, nonce)
    baseline_text = windows["baseline_text"]
    trigger_text = windows["trigger_text"]
    base_rel = "evidence/phase%d/hilog_baseline_window.txt" % phase
    trig_rel = "evidence/phase%d/hilog_trigger_window.txt" % phase
    with open(os.path.join(pdir, base_rel), "w", encoding="utf-8") as f:
        f.write(baseline_text)
    with open(os.path.join(pdir, trig_rel), "w", encoding="utf-8") as f:
        f.write(trigger_text)

    up_after = record("uptime_after", sh("dev_uptime")).stdout.strip()

    # write command provenance + nonce + uptime evidence
    cmds_rel = "evidence/phase%d/device_cmds.txt" % phase
    with open(os.path.join(pdir, cmds_rel), "w", encoding="utf-8") as f:
        for (label, cmd, rc, out) in cmds_log:
            f.write("### %s  (cmd=%s)  rc=%d\n%s\n\n" % (label, cmd, rc, out[:4000]))
    meta_rel = "evidence/phase%d/run_meta.txt" % phase
    with open(os.path.join(pdir, meta_rel), "w", encoding="utf-8") as f:
        f.write("nonce=%s\nuptime_before=%s\nuptime_after=%s\nmarker=%s\n"
                % (nonce, up_before, up_after, args.marker))
        f.write("runtime_marker=%s\ne2e_marker=%s\n" % (
            args.runtime_marker or "", args.e2e_marker or ""))
        f.write("baseline_window_found=%s\ntrigger_window_found=%s\n"
                % (windows["baseline_found"], windows["trigger_found"]))

    arts = [cap_rel, base_rel, trig_rel, cmds_rel, meta_rel]
    if proof_rel:
        arts.append(proof_rel)

    if device_markers:
        dm_rel = "evidence/phase%d/device_marker_coverage.txt" % phase
        with open(os.path.join(pdir, dm_rel), "w", encoding="utf-8") as f:
            f.write("contract device_cases markers: %d\n"
                    "baseline_window_found=%s\ntrigger_window_found=%s\n\n"
                    % (len(device_markers), windows["baseline_found"], windows["trigger_found"]))
            for m in device_markers:
                f.write("[baseline=%s trigger=%s] %s\n"
                        % ("HIT" if m in baseline_text else "MISS",
                           "OK" if m in trigger_text else "MISS", m))
        arts.append(dm_rel)

    case_results = []
    for case in device_cases:
        case_results.append(inspect_device_case(
            case,
            baseline_text=baseline_text,
            trigger_text=trigger_text,
            baseline_window_found=windows["baseline_found"],
            trigger_window_found=windows["trigger_found"],
            probe_pid=probe_pid,
            run_side_effect=run_side_effect,
        ))

    dc_rel = "evidence/phase%d/device_case_results.json" % phase
    with open(os.path.join(pdir, dc_rel), "w", encoding="utf-8") as f:
        json.dump({
            "phase": phase,
            "nonce": nonce,
            "baseline_window_found": windows["baseline_found"],
            "trigger_window_found": windows["trigger_found"],
            "results": case_results,
        }, f, ensure_ascii=False, indent=2)
    arts.append(dc_rel)

    # 5. verdict: nonce + functional marker + runtime proof + e2e proof +
    # deployed artifact hash + monotonic uptime + full ar-contract device-case
    # marker coverage + process provenance + artifact-loaded proof + side effects
    # + before/after differential.
    ok, reason = evaluate_phase4_verdict(
        cap_text=cap_text,
        nonce=nonce,
        marker=args.marker,
        runtime_marker=args.runtime_marker,
        e2e_marker=args.e2e_marker,
        uptime_before=up_before,
        uptime_after=up_after,
        host_sha=host_sha,
        device_sha=device_sha,
        device_markers=device_markers,
        trigger_text=trigger_text,
        trigger_window_found=windows["trigger_found"],
        device_case_results=case_results,
    )
    print(reason)

    verdict = "PASS" if ok else "FAIL"
    case_summary = summarize_device_cases(case_results)
    assertions = [
        "nonce_seen" if nonce in cap_text else None,
        "trigger_window_captured" if windows["trigger_found"] else None,
        "marker_seen" if args.marker in trigger_text else None,
        "runtime_marker_seen" if (not args.runtime_marker or args.runtime_marker in trigger_text) else None,
        "e2e_marker_seen" if (not args.e2e_marker or args.e2e_marker in trigger_text) else None,
        "device_case_markers_covered" if not [m for m in device_markers if m not in trigger_text] else None,
        "artifact_sha256_match" if (host_sha is None or host_sha == device_sha) else None,
        "process_provenance_verified" if case_summary["process_provenance_verified"] else None,
        "artifact_loaded_verified" if case_summary["artifact_loaded_verified"] else None,
        "side_effect_verified" if case_summary["side_effect_verified"] else None,
        "negative_control_verified" if case_summary["negative_control_verified"] else None,
    ]
    assertions = [a for a in assertions if a]

    problems = []
    if not windows["trigger_found"]:
        problems.append("trigger window missing (nonce START/END not both found)")
    if any(c.get("absent_before_trigger") for c in device_cases) and not windows["baseline_found"]:
        problems.append("baseline window missing for absent_before_trigger cases")
    if args.marker not in trigger_text:
        problems.append("functional marker missing in trigger window: %s" % args.marker)
    if args.runtime_marker and args.runtime_marker not in trigger_text:
        problems.append("runtime marker missing in trigger window: %s" % args.runtime_marker)
    if args.e2e_marker and args.e2e_marker not in trigger_text:
        problems.append("e2e marker missing in trigger window: %s" % args.e2e_marker)
    missing_dm = [m for m in device_markers if m not in trigger_text]
    if missing_dm:
        problems.append("missing contract device markers: %s" % ", ".join(missing_dm))
    if host_sha is not None and device_sha is not None and host_sha != device_sha:
        problems.append("host/device artifact sha256 mismatch")
    for r in case_results:
        for p in r.get("problems", []):
            problems.append("%s: %s" % (r.get("id") or r.get("marker") or "device_case", p))

    failure_class = phase4_failure_class(
        marker_ok=args.marker in trigger_text,
        runtime_ok=(not args.runtime_marker or args.runtime_marker in trigger_text),
        e2e_ok=(not args.e2e_marker or args.e2e_marker in trigger_text),
        artifact_ok=(host_sha is None or (host_sha and device_sha and host_sha == device_sha)),
        missing_dm=missing_dm,
        trigger_window_found=windows["trigger_found"],
        device_case_results=case_results,
    )

    gl.write_phase_summary(
        pdir, phase, "gate_device_func.py", verdict, reason,
        checks=assertions if verdict == "PASS" else problems,
        extra={
            "phase_name": gl.PHASE_NAME.get(phase),
            "requires_human_review": verdict == "PASS",
            "key_artifacts": arts,
            "assertions_verified": assertions,
            "device_case_count": len(case_results),
            "baseline_window_found": windows["baseline_found"],
            "trigger_window_found": windows["trigger_found"],
            "evidence_priority": gl.device_evidence_priority(),
            **case_summary,
        })
    if verdict == "PASS":
        gl.clear_failure_report(pdir, phase)
        gl.write_repair_packet(
            pdir, REPAIR_PACKET_PARTS,
            gl.build_cleared_repair_packet(
                phase, _phase_control_meta(phase)["phase_name"],
                cleared_by="gate_device_func.py",
                bundle_revision_from=_test_bundle_context(pdir, phase).get(
                    "bundle_revision") or ""))
        _write_completion_controls(
            pdir,
            phase=phase,
            arts=arts,
            device_case_count=len(case_results),
        )
    else:
        gl.write_failure_report(
            pdir, phase, "gate_device_func.py", reason,
            problems=problems,
            resume_hint="修复真机部署/触发/证据问题后重跑 gate_device_func.py",
            extra={
                "failure_class": failure_class,
                "phase_name": gl.PHASE_NAME.get(phase),
                "key_artifacts": arts,
                "baseline_window_found": windows["baseline_found"],
                "trigger_window_found": windows["trigger_found"],
            })
        _write_repair_packet(
            pdir,
            phase=phase,
            failure_class=failure_class,
            problems=problems,
            last_failure_reason=reason,
        )

    _dev_meta = _phase_control_meta(phase)
    gl.write_evidence_index(
        pdir, (_dev_meta["logical_phase_name"].replace("-", "_"),
               "evidence_index.json"),
        [
            {"kind": k, "rank": i + 1,
             "verified": bool(case_summary.get(_EVIDENCE_SUMMARY_KEYS.get(k)))
             if k in _EVIDENCE_SUMMARY_KEYS else None}
            for i, k in enumerate(gl.device_evidence_priority())
        ],
        extra={
            "phase": phase,
            "phase_name": _dev_meta["phase_name"],
            "evidence_priority": gl.device_evidence_priority(),
            "trust_rule": "resolve conflicts in listed order; plain_marker is the weakest claim",
        })
    gl.write_gate_phase_memory_card(
        pdir, phase, _dev_meta["phase_name"], verdict=verdict,
        bundle_revision=_test_bundle_context(pdir, phase).get("bundle_revision"),
        current_blocker=None if verdict == "PASS" else reason,
        next_expected_action_class=(
            "advance_phase" if verdict == "PASS" else "repair_or_regenerate"),
        last_failure_class=None if verdict == "PASS" else failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"),
        primary_handoff_doc=gl.controls_relpath(*_dev_meta["handoff_parts"]))
    gl.write_gate_stage_packet_from_def(
        pdir, _dev_meta["logical_phase_id"], _dev_meta["logical_phase_name"],
        physical_phase=phase)
    gl.emit(pdir, phase, "gate_device_func.py", verdict=verdict, reason=reason,
            cmd=args.scenario_script, nonce=nonce, artifacts_rel=arts)
    if verdict == "PASS":
        # P4/P5 device-test result needs human sign-off: stop here, surface the
        # real results + artifacts, do NOT auto-advance.
        print("\n" + "=" * 64)
        print("PHASE %d 真机测试证据已产出 —— 等待人工确认" % phase)
        print("=" * 64)
        print("verdict : PASS (%s)" % reason)
        print("nonce   : %s" % nonce)
        print("产物(请人工核对真机真实结果):")
        for a in arts:
            print("  - %s" % os.path.join(pdir, a))
        tail = "\n".join((trigger_text or cap_text).strip().splitlines()[-15:])
        print("\nhilog 触发窗口末尾片段:\n%s" % (tail or "(空)"))
        print("\n下一步(人工确认真机结果可接受后):")
        print("  advance.py --pipeline-dir %s consent --phase %d --token <审核人>" % (pdir, phase))
        print("  advance.py --pipeline-dir %s advance --phase %d" % (pdir, phase))
        print("=" * 64)
    else:
        sys.exit("PHASE %d FAIL: %s" % (phase, reason))


def _fail(pdir, phase, nonce, cmds_log, reason, failure_class="device_functional_verdict_failed",
          problems=None, resume_hint=None, artifacts_rel=None):
    cmds_rel = "evidence/phase%d/device_cmds.txt" % phase
    with open(os.path.join(pdir, cmds_rel), "w", encoding="utf-8") as f:
        for (label, cmd, rc, out) in cmds_log:
            f.write("### %s  (cmd=%s)  rc=%d\n%s\n\n" % (label, cmd, rc, out[:4000]))
    arts = [cmds_rel] + list(artifacts_rel or [])
    gl.write_phase_summary(pdir, phase, "gate_device_func.py", "FAIL", reason,
                           checks=problems or [reason],
                           extra={"phase_name": gl.PHASE_NAME.get(phase),
                                  "failure_class": failure_class,
                                  "key_artifacts": arts})
    gl.write_failure_report(pdir, phase, "gate_device_func.py", reason,
                            problems=problems or [reason],
                            resume_hint=resume_hint,
                            extra={"failure_class": failure_class,
                                   "phase_name": gl.PHASE_NAME.get(phase),
                                   "key_artifacts": arts})
    _write_repair_packet(
        pdir,
        phase=phase,
        failure_class=failure_class,
        problems=problems or [reason],
        last_failure_reason=reason,
    )
    gl.write_gate_phase_memory_card(
        pdir, phase, _phase_control_meta(phase)["phase_name"], verdict="FAIL",
        bundle_revision=_test_bundle_context(pdir, phase).get("bundle_revision"),
        current_blocker=reason,
        next_expected_action_class="repair_or_regenerate",
        last_failure_class=failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"))
    _fail_meta = _phase_control_meta(phase)
    gl.write_gate_stage_packet_from_def(
        pdir, _fail_meta["logical_phase_id"], _fail_meta["logical_phase_name"],
        physical_phase=phase)
    gl.emit(pdir, phase, "gate_device_func.py", verdict="FAIL", reason=reason,
            nonce=nonce, artifacts_rel=arts)
    sys.exit("PHASE %d FAIL: %s" % (phase, reason))


if __name__ == "__main__":
    main()
