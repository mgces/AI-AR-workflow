#!/usr/bin/env python3
"""Small JSON boundary around the existing AR workflow truth layer.

This module never writes pipeline phase state. Mutations remain in advance.py;
the bridge only exposes signed gate inspection in a stable machine-readable form.
"""

import argparse
import hashlib
import json
import os
import sys


def _load_gatelib(scripts_root):
    root = os.path.abspath(scripts_root)
    if not os.path.isfile(os.path.join(root, "advance.py")):
        raise SystemExit("scripts root does not contain advance.py: %s" % root)
    sys.path.insert(0, root)
    from lib import gatelib  # pylint: disable=import-outside-toplevel
    return gatelib


def _entry_summary(gl, entry):
    if not entry:
        return None
    return {
        "entry_id": gl.entry_id(entry),
        "seq": entry.get("seq"),
        "phase": entry.get("phase"),
        "gate": entry.get("gate"),
        "verdict": entry.get("verdict"),
        "reason": entry.get("reason"),
        "artifacts": [
            {"path": item.get("path"), "sha256": item.get("sha256")}
            for item in entry.get("artifacts", [])
        ],
    }


def _validation_summary(gl, result):
    ok, reason, entry = result
    return {
        "ok": bool(ok),
        "reason": reason,
        "entry": _entry_summary(gl, entry),
    }


def _consent_summary(gl, state, phase, entry):
    if not entry:
        return {"ok": False, "reason": "no reviewable evidence"}
    ok, reason = gl.verify_consent(state, phase, gl.entry_id(entry))
    # verify_consent's successful diagnostic contains the reviewer token.  The
    # MCP boundary only needs the verdict, never that credential-like value.
    return {"ok": bool(ok), "reason": "ok" if ok else reason}


def inspect(gl, pipeline_dir):
    pdir = gl.pipeline_dir(pipeline_dir)
    state = gl.load_state(pdir)
    phases = [
        {
            "id": item.get("id"),
            "name": item.get("name"),
            "status": item.get("status"),
            "manifest_ref": item.get("manifest_ref"),
        }
        for item in state.get("phases", [])
    ]
    complete = bool(phases and phases[-1]["status"] == "passed")
    current = state.get("current_phase")
    payload = {
        "ok": True,
        "pipeline_dir": os.path.abspath(pdir),
        "pipeline_run_id": state.get("run_id"),
        "repo_root": state.get("repo"),
        "current_phase": current,
        "complete": complete,
        "environment": state.get("environment"),
        "component_type": state.get("component_type"),
        "device_type": state.get("device_type"),
        "device_serial": state.get("device_serial"),
        "build_target": state.get("build_target"),
        "test": state.get("test"),
        "phases": phases,
    }
    if complete or not isinstance(current, int) or current < 0 or current > 8:
        return payload

    gate_result = gl.validate_closing_entry(pdir, current)
    gate = _validation_summary(gl, gate_result)
    payload["gate"] = gate
    payload["consent_required"] = current in (1, 6, 7, 8)
    if current == 8:
        precheck_result = gl.validate_upload_consent_entry(pdir)
        precheck = _validation_summary(gl, precheck_result)
        payload["upload_precheck"] = precheck
        payload["consent"] = _consent_summary(gl, state, 8, precheck_result[2])
    elif current == 1:
        design_entry = gl.latest_design_entry(pdir)
        payload["consent"] = _consent_summary(gl, state, 1, design_entry)
    elif current in (6, 7):
        payload["consent"] = _consent_summary(gl, state, current, gate_result[2])
    else:
        payload["consent"] = {"ok": False, "reason": "not required"}
    return payload


def validate(gl, pipeline_dir, phase, upload_precheck):
    pdir = gl.pipeline_dir(pipeline_dir)
    state = gl.load_state(pdir)
    if state.get("current_phase") != phase:
        return {
            "ok": False,
            "reason": "current_phase=%s, expected=%s" %
                      (state.get("current_phase"), phase),
            "entry": None,
        }
    if upload_precheck:
        ok, reason, entry = gl.validate_upload_consent_entry(pdir)
    else:
        ok, reason, entry = gl.validate_closing_entry(pdir, phase)
    return {
        "ok": bool(ok),
        "reason": reason,
        "entry": _entry_summary(gl, entry),
    }


def failure_snapshot(gl, pipeline_dir):
    """Verify a current P4 FAIL for diagnostic planning, without advancing state.

    Unlike validate_closing_entry this accepts FAIL, but still checks the entire
    chain, phase/rewind floor, and all artifacts. It never grants workflow PASS.
    """
    pdir = os.path.realpath(gl.pipeline_dir(pipeline_dir))
    state = gl.load_state(pdir)
    blocked = lambda reason: {"ok": False, "reason": reason, "executed": False}
    if state.get("current_phase") != 4:
        return blocked("repair planning requires the current Python phase to be P4")
    ok, reason, entries = gl.verify_chain(pdir)
    if not ok:
        return blocked(reason)
    entry = next((item for item in reversed(entries) if item.get("phase") == 4), None)
    if not entry or entry.get("gate") != "gate_build.py" or entry.get("verdict") != "FAIL":
        return blocked("no current signed gate_build.py FAIL")
    floor = gl.evidence_floor(state, 4)
    if floor is not None and (not isinstance(entry.get("seq"), int) or entry["seq"] < floor):
        return blocked("build evidence predates the current phase/rewind barrier")
    stdout_path = None
    checked_artifacts = []
    for artifact in entry.get("artifacts", []):
        name = artifact.get("path")
        if not isinstance(name, str):
            return blocked("invalid artifact path")
        path = os.path.realpath(os.path.join(pdir, name))
        if os.path.commonpath([pdir, path]) != pdir or not os.path.isfile(path):
            return blocked("artifact vanished or escapes pipeline: %s" % name)
        if gl.sha256_file(path) != artifact.get("sha256"):
            return blocked("artifact altered (sha256 mismatch): %s" % name)
        checked_artifacts.append((path, artifact["sha256"]))
        if name == "evidence/phase4/build_stdout.log":
            stdout_path = path
    executed = (type(entry.get("exit_code")) is int and bool(entry.get("cmd"))
                and stdout_path is not None)
    if not executed:
        return blocked("signed failure does not establish that the build command executed")
    # The source fingerprint includes changed and untracked files in the bound
    # component; baseline drift changes plan identity, including after restart.
    source = gl.code_fingerprint(state)
    baseline = {"state": state, "source_fingerprint": source, "entry_id": gl.entry_id(entry)}
    input_digest = "sha256:" + hashlib.sha256(json.dumps(
        baseline, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    with open(stdout_path, "rb") as stream:
        stream.seek(max(0, os.path.getsize(stdout_path) - 8192))
        log_tail = stream.read(8192).decode("utf-8", errors="replace")
    # Check for concurrent changes while reading. A later launcher must still
    # revalidate under a resource lock immediately before doing any mutation.
    if gl.load_state(pdir) != state or gl.code_fingerprint(state) != source or gl.read_manifest(pdir) != entries:
        return blocked("input changed during evidence inspection")
    for path, expected in checked_artifacts:
        if not os.path.isfile(path) or gl.sha256_file(path) != expected:
            return blocked("artifact changed during evidence inspection")
    return {"ok": True, "executed": True, "purpose": "diagnostic_only",
            "pipeline_run_id": state.get("run_id"), "input_digest": input_digest,
            "source_fingerprint": source, "execution_input_binding": "unavailable",
            "entry": _entry_summary(gl, entry),
            "stdout_tail": log_tail}


def main():
    parser = argparse.ArgumentParser(description="JSON inspection bridge for OHOS AR delivery")
    parser.add_argument("--scripts-root", required=True)
    sub = parser.add_subparsers(dest="command", required=True)

    command = sub.add_parser("inspect")
    command.add_argument("--pipeline-dir", required=True)

    command = sub.add_parser("validate")
    command.add_argument("--pipeline-dir", required=True)
    command.add_argument("--phase", required=True, type=int, choices=range(0, 9))
    command.add_argument("--upload-precheck", action="store_true")

    command = sub.add_parser("failure-snapshot")
    command.add_argument("--pipeline-dir", required=True)

    args = parser.parse_args()
    gl = _load_gatelib(args.scripts_root)
    if args.command == "inspect":
        payload = inspect(gl, args.pipeline_dir)
    elif args.command == "failure-snapshot":
        payload = failure_snapshot(gl, args.pipeline_dir)
    else:
        payload = validate(gl, args.pipeline_dir, args.phase, args.upload_precheck)
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
