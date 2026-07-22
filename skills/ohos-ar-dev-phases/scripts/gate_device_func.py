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
shell snippets (provided by the phase-4 skill), runs them verbatim, and records
them. It owns the nonce + capture + verdict logic; it does not invent behavior.
"""
import argparse
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


def evaluate_phase4_verdict(*, cap_text, nonce, marker, runtime_marker, e2e_marker,
                            uptime_before, uptime_after, host_sha=None, device_sha=None,
                            device_markers=None):
    nonce_ok = nonce in cap_text
    marker_ok = marker in cap_text
    runtime_ok = True if not runtime_marker else runtime_marker in cap_text
    e2e_ok = True if not e2e_marker else e2e_marker in cap_text
    # CONTRACT COVERAGE: every device_cases[].marker from the signed ar-contract
    # must appear in the captured hilog window (full coverage of AR_design device
    # cases). None/empty => nothing extra to enforce (legacy / phase-5 reuse).
    missing_dm = [m for m in (device_markers or []) if m not in cap_text]
    device_ok = not missing_dm
    artifact_ok = True
    if host_sha is not None or device_sha is not None:
        artifact_ok = bool(host_sha) and bool(device_sha) and host_sha == device_sha
    try:
        mono_ok = float(uptime_after) > float(uptime_before) > 0
    except ValueError:
        mono_ok = False
    reason = (
        "nonce=%s marker=%s runtime=%s e2e=%s device_cases=%d/%d artifact_hash=%s "
        "uptime %s->%s mono=%s"
        % (nonce_ok, marker_ok, runtime_ok, e2e_ok,
           len(device_markers or []) - len(missing_dm), len(device_markers or []),
           artifact_ok, uptime_before, uptime_after, mono_ok)
    )
    if missing_dm:
        reason += " MISSING_device_markers=%s" % ",".join(missing_dm)
    ok = (nonce_ok and marker_ok and runtime_ok and e2e_ok and device_ok
          and artifact_ok and mono_ok)
    return ok, reason


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
                         "(required for phase 4)")
    ap.add_argument("--device-artifact",
                    help="absolute device path of the running/deployed artifact; sha256sum is "
                         "captured after deploy (required for phase 4)")
    ap.add_argument("--runtime-marker",
                    help="string emitted only by the changed runtime code path, preferably with "
                         "$GATE_NONCE in the same execution path (required for phase 4)")
    ap.add_argument("--e2e-marker",
                    help="string emitted only after the real end-to-end use/injection scenario "
                         "succeeds (required for phase 4)")
    ap.add_argument("--phase", type=int, default=4, help="4 (device) or 5 (integration reuse)")
    args = ap.parse_args()
    phase = args.phase
    if phase == 4:
        missing = missing_phase4_proof_args(args)
        if missing:
            ap.error("phase 4 requires real-runtime/e2e proof args: %s"
                     % ", ".join(missing))
    if bool(args.host_artifact) != bool(args.device_artifact):
        ap.error("--host-artifact and --device-artifact must be provided together")
    if phase == 4:
        found = find_marker_literals(
            [args.deploy_script, args.scenario_script],
            [args.marker, args.runtime_marker, args.e2e_marker],
        )
        if found:
            detail = ", ".join("%s in %s" % (marker, path)
                               for marker, path in sorted(found.items()))
            ap.error("phase 4 success markers must be emitted by the runtime/e2e result, "
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
    # HMAC-signed AR_design. Only enforced for phase 4 (phase-5 reuse of this gate
    # does not verify P4 device cases). absent/bypass -> no extra markers;
    # tampered -> FAIL.
    device_markers = []
    if phase == 4:
        c_ok, contract, c_detail = gl.load_signed_contract(pdir)
        if c_ok:
            device_markers = [c["marker"] for c in contract["device_cases"]]
        elif "absent" not in c_detail:
            sys.exit("ERROR: ar-contract unrecoverable for phase 4: %s" % c_detail)
        # Contract device markers must also come from the real runtime/e2e result,
        # not be hard-coded into the driver scripts (else coverage is fakeable).
        found = find_marker_literals([args.deploy_script, args.scenario_script],
                                     device_markers)
        if found:
            detail = ", ".join("%s in %s" % (m, p) for m, p in sorted(found.items()))
            sys.exit("ERROR: phase 4 contract device markers must be emitted by the "
                     "runtime/e2e result, not embedded in driver scripts: %s" % detail)

    nonce = secrets.token_hex(16)

    cmds_log = []   # (label, cmd, rc, out)

    def record(label, cp, cmd=""):
        cmds_log.append((label, cmd, cp.returncode, (cp.stdout + cp.stderr).strip()))
        return cp

    # 0. device online + serial pinned
    if record("online", sh("dev_assert_online")).returncode != 0:
        _fail(pdir, phase, nonce, cmds_log, "device not reachable")

    up_before = record("uptime_before", sh("dev_uptime")).stdout.strip()

    # 1. deploy (optional)
    if args.deploy_script:
        with open(args.deploy_script) as f:
            dep = f.read()
        cp = sh(dep, env={**os.environ, "GATE_NONCE": nonce})
        record("deploy", cp, cmd=args.deploy_script)
        if cp.returncode != 0:
            _fail(pdir, phase, nonce, cmds_log, "deploy script exited %d" % cp.returncode)

    device_sha = None
    proof_rel = None
    if args.device_artifact:
        device_sha_cmd = "sha256sum %s" % shlex.quote(args.device_artifact)
        cp = sh("dev_shell %s" % shlex.quote(device_sha_cmd))
        record("device_artifact_sha256", cp, cmd=device_sha_cmd)
        if cp.returncode != 0:
            _fail(pdir, phase, nonce, cmds_log,
                  "device artifact sha256 command exited %d" % cp.returncode)
        device_sha = parse_device_sha256sum(cp.stdout + cp.stderr)
        if not device_sha:
            _fail(pdir, phase, nonce, cmds_log, "device artifact sha256 missing")
        proof_rel = "evidence/phase%d/artifact_runtime_proof.txt" % phase
        with open(os.path.join(pdir, proof_rel), "w", encoding="utf-8") as f:
            f.write("host_artifact=%s\nhost_sha256=%s\n" % (args.host_artifact, host_sha))
            f.write("device_artifact=%s\ndevice_sha256=%s\n" % (args.device_artifact, device_sha))

    # 2. mark hilog START with the nonce
    record("mark_start", sh('dev_shell "log -t LIFECYCLE_GATE NONCE=%s START"' % nonce))

    # 3. drive the functional scenario (nonce exported for the component to echo)
    with open(args.scenario_script) as f:
        scen = f.read()
    cp = sh(scen, env={**os.environ, "GATE_NONCE": nonce})
    record("scenario", cp, cmd=args.scenario_script)
    if cp.returncode != 0:
        _fail(pdir, phase, nonce, cmds_log, "scenario script exited %d" % cp.returncode)

    # 4. mark END + capture hilog and pull device log dirs
    record("mark_end", sh('dev_shell "log -t LIFECYCLE_GATE NONCE=%s END"' % nonce))
    cap = record("hilog", sh('dev_shell "hilog -x"'))
    cap_text = cap.stdout
    cap_rel = "evidence/phase%d/hilog_capture.txt" % phase
    with open(os.path.join(pdir, cap_rel), "w", encoding="utf-8") as f:
        f.write(cap_text)

    up_after = record("uptime_after", sh("dev_uptime")).stdout.strip()

    # write command provenance + nonce + uptime evidence
    cmds_rel = "evidence/phase%d/device_cmds.txt" % phase
    with open(os.path.join(pdir, cmds_rel), "w", encoding="utf-8") as f:
        for (label, cmd, rc, out) in cmds_log:
            f.write("### %s  (cmd=%s)  rc=%d\n%s\n\n" % (label, cmd, rc, out[:4000]))
    meta_rel = "evidence/phase%d/run_meta.txt" % phase
    with open(os.path.join(pdir, meta_rel), "w") as f:
        f.write("nonce=%s\nuptime_before=%s\nuptime_after=%s\nmarker=%s\n"
                % (nonce, up_before, up_after, args.marker))
        f.write("runtime_marker=%s\ne2e_marker=%s\n" % (
            args.runtime_marker or "", args.e2e_marker or ""))

    arts = [cap_rel, cmds_rel, meta_rel]
    if proof_rel:
        arts.append(proof_rel)

    if device_markers:
        dm_rel = "evidence/phase%d/device_marker_coverage.txt" % phase
        with open(os.path.join(pdir, dm_rel), "w", encoding="utf-8") as f:
            f.write("contract device_cases markers: %d\n\n" % len(device_markers))
            for m in device_markers:
                f.write("[%s] %s\n" % ("OK " if m in cap_text else "MISS", m))
        arts.append(dm_rel)

    # 5. verdict: nonce + functional marker + runtime proof + e2e proof +
    # deployed artifact hash + monotonic uptime + full ar-contract device-case
    # marker coverage.
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
    )
    print(reason)

    verdict = "PASS" if ok else "FAIL"
    gl.emit(pdir, phase, "gate_device_func.py", verdict=verdict, reason=reason,
            cmd=args.scenario_script, nonce=nonce, artifacts_rel=arts)
    if verdict == "PASS":
        # P4 device-test result needs human sign-off: stop here, surface the real
        # results + artifacts, do NOT auto-advance.
        print("\n" + "=" * 64)
        print("PHASE %d 真机测试证据已产出 —— 等待人工确认" % phase)
        print("=" * 64)
        print("verdict : PASS (%s)" % reason)
        print("nonce   : %s" % nonce)
        print("产物(请人工核对真机真实结果):")
        for a in arts:
            print("  - %s" % os.path.join(pdir, a))
        # show a short tail of the captured device log so the reviewer sees real output
        tail = "\n".join(cap_text.strip().splitlines()[-15:])
        print("\nhilog 抓取末尾片段:\n%s" % (tail or "(空)"))
        print("\n下一步(人工确认真机结果可接受后):")
        print("  advance.py --pipeline-dir %s consent --phase %d --token <审核人>" % (pdir, phase))
        print("  advance.py --pipeline-dir %s advance --phase %d" % (pdir, phase))
        print("=" * 64)
    else:
        sys.exit("PHASE %d FAIL: %s" % (phase, reason))


def _fail(pdir, phase, nonce, cmds_log, reason):
    cmds_rel = "evidence/phase%d/device_cmds.txt" % phase
    with open(os.path.join(pdir, cmds_rel), "w", encoding="utf-8") as f:
        for (label, cmd, rc, out) in cmds_log:
            f.write("### %s rc=%d\n%s\n\n" % (label, rc, out[:4000]))
    gl.emit(pdir, phase, "gate_device_func.py", verdict="FAIL", reason=reason,
            nonce=nonce, artifacts_rel=[cmds_rel])
    sys.exit("PHASE %d FAIL: %s" % (phase, reason))


if __name__ == "__main__":
    main()
