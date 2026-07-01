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
    functional success marker;
  * every hdc command + exit code is recorded; raw capture is sha256'd in the
    signed manifest so the orchestrator cannot swap in a hand-written log.

Deploy/scenario specifics differ per component, so this gate takes them as
shell snippets (provided by the phase-4 skill), runs them verbatim, and records
them. It owns the nonce + capture + verdict logic; it does not invent behavior.
"""
import argparse
import os
import secrets
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import gatelib as gl  # noqa: E402

DEVICE_SH = os.path.join(HERE, "lib", "device.sh")


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
    ap.add_argument("--phase", type=int, default=4, help="4 (device) or 5 (integration reuse)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    phase = args.phase
    gl.evidence_dir(pdir, phase)
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

    arts = [cap_rel, cmds_rel, meta_rel]

    # 5. verdict: nonce present, marker present, uptime monotonic
    nonce_ok = nonce in cap_text
    marker_ok = args.marker in cap_text
    try:
        mono_ok = float(up_after) > float(up_before) > 0
    except ValueError:
        mono_ok = False
    reason = "nonce=%s marker=%s uptime %s->%s mono=%s" % (
        nonce_ok, marker_ok, up_before, up_after, mono_ok)
    print(reason)

    verdict = "PASS" if (nonce_ok and marker_ok and mono_ok) else "FAIL"
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
