#!/usr/bin/env python3
"""Small JSON boundary around the existing AR workflow truth layer.

This module never writes pipeline phase state. Mutations remain in advance.py;
the bridge only exposes signed gate inspection in a stable machine-readable form.
"""

import argparse
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

    args = parser.parse_args()
    gl = _load_gatelib(args.scripts_root)
    if args.command == "inspect":
        payload = inspect(gl, args.pipeline_dir)
    else:
        payload = validate(gl, args.pipeline_dir, args.phase, args.upload_precheck)
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
