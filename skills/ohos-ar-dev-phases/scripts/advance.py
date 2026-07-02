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
  status      print a compact phase table.
"""
import argparse
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
        "phases": [
            {"id": i, "name": n, "status": "pending",
             "manifest_ref": None, "closed_at_utc": None}
            for i, n in gl.PHASES
        ],
    }
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
    if phase in CONSENT_PHASES and not state.get("consent_tokens", {}).get(str(phase)):
        ev = os.path.join(pdir, "evidence", "phase%d" % phase)
        sys.exit(
            "HOLD: phase %d (%s) passed its evidence gate but needs human review.\n"
            "  1) inspect the real results + artifacts in: %s\n"
            "  2) if the device/test result is acceptable, record consent:\n"
            "     advance.py --pipeline-dir <PDIR> consent --phase %d --token <reviewer>\n"
            "  3) then re-run: advance.py --pipeline-dir <PDIR> advance --phase %d"
            % (phase, CONSENT_PHASES[phase], ev, phase, phase))

    # CODE-DRIFT CONTROL: once P1 locks the code fingerprint, every later phase is
    # validated against THAT code. If the code changed since (a fix was needed),
    # all downstream evidence is stale — refuse and force a rewalk from P1.
    locked = state.get("code_fingerprint")
    if phase >= 2 and locked:
        now_fp = gl.code_fingerprint(state)
        if now_fp != locked:
            sys.exit(
                "REFUSED: code changed since P1 (fingerprint %s.. != locked %s..).\n"
                "Any fix that touches code means the build/test/device evidence no "
                "longer matches the current code.\n"
                "Rewalk from development:\n"
                "  advance.py --pipeline-dir <PDIR> reset --reason \"<what you fixed>\"\n"
                "then redo P1→ in order." % (now_fp[:8], locked[:8]))

    ok, reason, entry = gl.validate_closing_entry(pdir, phase)
    if not ok:
        sys.exit("REFUSED: cannot close phase %d — %s" % (phase, reason))

    pe = state["phases"][phase]
    pe["status"] = "passed"
    pe["manifest_ref"] = gl.entry_id(entry)
    pe["closed_at_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # P1 locks the code fingerprint that P2..P6 must keep matching.
    if phase == 1:
        state["code_fingerprint"] = gl.code_fingerprint(state)
    if phase < gl.MAX_PHASE:
        state["current_phase"] = phase + 1
        state["phases"][phase + 1]["status"] = "pending"
    gl.save_state(pdir, state)
    print("ADVANCED: phase %d (%s) closed by signed evidence; reason: %s"
          % (phase, gl.PHASE_NAME[phase], entry.get("reason")))
    if phase < gl.MAX_PHASE:
        print("current_phase -> %d (%s)" % (phase + 1, gl.PHASE_NAME[phase + 1]))
    else:
        print("pipeline COMPLETE.")


def cmd_consent(args):
    """Record a one-time human consent token for a phase that requires sign-off
    (P4 device-test review, P5 quality/review report approval, P6 upload push).
    Only meaningful after the phase's
    evidence gate has produced its real results for a human to inspect."""
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    if not args.token:
        sys.exit("ERROR: --token required")
    if args.phase not in CONSENT_PHASES:
        sys.exit("ERROR: phase %d does not take consent (consent phases: %s)"
                 % (args.phase, ", ".join(str(p) for p in CONSENT_PHASES)))
    state.setdefault("consent_tokens", {})[str(args.phase)] = args.token
    gl.save_state(pdir, state)
    print("recorded consent for phase %d (%s): %s"
          % (args.phase, CONSENT_PHASES[args.phase], args.token))


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
    # code-drift check: if code changed since P1 locked, rewind to P1.
    locked = state.get("code_fingerprint")
    if locked and gl.code_fingerprint(state) != locked:
        for pe in state["phases"]:
            if pe["id"] >= 1:
                pe["status"] = "pending"
                pe["manifest_ref"] = None
                pe["closed_at_utc"] = None
        state["current_phase"] = 1
        state["consent_tokens"] = {}
        state["code_fingerprint"] = None
        gl.save_state(pdir, state)
        sys.exit("verify-all: code changed since P1 — pipeline rewound to P1, "
                 "rewalk from development.")
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
    if bad:
        gl.save_state(pdir, state)
        sys.exit("verify-all: %d phase(s) failed re-validation; pipeline rewound "
                 "to phase %d" % (bad, state["current_phase"]))
    print("verify-all: all passed phases re-validated clean.")


def cmd_status(args):
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    print("run_id=%s  current_phase=%d  target=%s"
          % (state["run_id"], state["current_phase"], state.get("build_target")))
    for pe in state["phases"]:
        mark = {"passed": "✓", "failed": "✗", "running": "…", "pending": " "}.get(pe["status"], "?")
        print("  [%s] P%d %-18s %s" % (mark, pe["id"], pe["name"], pe["status"]))


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
                   help="phase to sign off (4 device test, 5 quality/review, 6 upload)")
    p.add_argument("--token", required=True)
    p.set_defaults(func=cmd_consent)

    p = sub.add_parser("reset", help="rewind to P1 (development) — use whenever a "
                                     "fix touches code; invalidates downstream phases")
    p.add_argument("--reason", default="", help="what was fixed (audit trail)")
    p.set_defaults(func=cmd_reset)

    p = sub.add_parser("verify-all")
    p.set_defaults(func=cmd_verify_all)

    p = sub.add_parser("status")
    p.set_defaults(func=cmd_status)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
