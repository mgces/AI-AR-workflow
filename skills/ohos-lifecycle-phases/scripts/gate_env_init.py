#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_env_init.py — Phase 0 (bootstrap) deterministic preflight.

Probes that every capability the later phases depend on is actually present,
then emits a signed PASS so advance.py can close phase 0. Nothing is hardcoded:
the device serial is auto-detected from the single connected target (or taken
from $DEVICE_SERIAL / --device-serial) and recorded into pipeline.json + evidence.

Capabilities checked (HARD = blocks; SOFT = warns only):
  build       HARD  ./build.sh present                         -> P2
  git         HARD  git_dir is a git repo (records HEAD)        -> P1/P6
  testfwk     HARD  test/testfwk/developer_test/start.sh        -> P3/P5
  hdc_bin     HARD  an hdc binary is resolvable                 -> P0/P4/P5
  device      HARD  a unique device is online (records serial)  -> P4/P5
  oh_gc       SOFT  oh-gc CLI available                         -> P6
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEVICE_SH = os.path.join(HERE, "lib", "device.sh")


def run(cmd, env=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, env=env)


def dev(snippet, env=None):
    """Run a snippet with device.sh sourced."""
    return run('. "%s"\n%s' % (DEVICE_SH, snippet), env=env)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 0)

    # Pass an explicitly-pinned serial (if any) through to device.sh.
    env = dict(os.environ)
    if state.get("device_serial"):
        env["DEVICE_SERIAL"] = state["device_serial"]

    checks = []  # (name, kind, ok, detail, phases)

    def add(name, kind, ok, detail, phases):
        checks.append((name, kind, ok, detail, phases))

    # build
    bs = os.path.join(repo, "build.sh")
    add("build", "HARD", os.path.exists(bs), bs, "P2")

    # git component repo
    g = run("git -C %s rev-parse HEAD" % gdir)
    head = g.stdout.strip()
    add("git", "HARD", g.returncode == 0 and len(head) == 40,
        "%s @ %s" % (gdir, head or g.stderr.strip()), "P1/P6")

    # test framework
    dt = os.path.join(repo, "test/testfwk/developer_test/start.sh")
    add("testfwk", "HARD", os.path.exists(dt), dt, "P3/P5")

    # hdc binary resolvable
    hb = dev("echo \"$HDC_BIN\"; [ -x \"$HDC_BIN\" ] || command -v \"$HDC_BIN\" >/dev/null", env=env)
    hdc_bin = hb.stdout.strip().splitlines()[0] if hb.stdout.strip() else ""
    add("hdc_bin", "HARD", hb.returncode == 0 and bool(hdc_bin),
        "hdc=%s" % (hdc_bin or "NOT FOUND"), "P0/P4/P5")

    # device online + serial detection (records the resolved serial)
    don = dev("dev_assert_online", env=env)
    serial = don.stdout.strip().splitlines()[-1] if (don.returncode == 0 and don.stdout.strip()) else ""
    add("device", "HARD", don.returncode == 0 and bool(serial),
        "serial=%s" % (serial or (don.stderr.strip() or "no unique device")), "P4/P5")

    # oh-gc (soft, P6 only)
    oh = run("oh-gc --version")
    add("oh_gc", "SOFT", oh.returncode == 0,
        (oh.stdout or oh.stderr).strip()[:120] or "not installed", "P6")

    # persist detected serial into state if not already pinned (config, not status)
    if serial and not state.get("device_serial"):
        state["device_serial"] = serial
        gl.save_state(pdir, state)

    report = {
        "repo": repo, "git_dir": gdir, "head": head,
        "hdc_bin": hdc_bin, "device_serial": serial or None,
        "connection": ("override=%s" % os.environ["HDC_HOST_OVERRIDE"]) if os.environ.get("HDC_HOST_OVERRIDE")
                      else ("wsl_bridge_port=%s" % os.environ["HDC_WIN_PORT"]) if os.environ.get("HDC_WIN_PORT")
                      else "native_hdc",
        "checks": [{"name": n, "kind": k, "ok": ok, "detail": d, "phases": ph}
                   for (n, k, ok, d, ph) in checks],
    }
    rel = "evidence/phase0/env.json"
    with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    for (n, k, ok, d, ph) in checks:
        print("[%s] %-8s %-5s (%s)  %s" % ("OK " if ok else "BAD", n, k, ph, d))

    hard_fail = [n for (n, k, ok, d, ph) in checks if k == "HARD" and not ok]
    if hard_fail:
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="missing capabilities: %s" % ",".join(hard_fail),
                artifacts_rel=[rel])
        sys.exit("PHASE 0 FAIL — missing: %s" % ",".join(hard_fail))

    soft_warn = [n for (n, k, ok, d, ph) in checks if k == "SOFT" and not ok]
    reason = "all capabilities present; serial=%s%s" % (
        serial, (" (warn: %s)" % ",".join(soft_warn)) if soft_warn else "")
    gl.emit(pdir, 0, "gate_env_init.py", verdict="PASS", reason=reason, artifacts_rel=[rel])
    print("PHASE 0 PASS — run: advance.py --pipeline-dir %s advance --phase 0" % pdir)


if __name__ == "__main__":
    main()
