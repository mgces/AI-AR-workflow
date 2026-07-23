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
  compile     HARD  a real build of a probe target succeeds    -> P2
              (default target: hiview_package; runs the FIRST init per repo,
               then a stability marker specs/.build-probe-ok lets later inits
               skip it. --force-build-probe recompiles; --skip-build-probe skips)
  git         HARD  git_dir is a git repo (records HEAD)        -> P1/P6
  testfwk     HARD  test/testfwk/developer_test/start.sh        -> P3/P5
  hdc_bin     HARD  an hdc binary is resolvable                 -> P0/P4/P5
  device      HARD  a unique device is online (records serial)  -> P4/P5
  oh_gc       SOFT  oh-gc CLI installed                         -> P6
  gitcode_auth SOFT gitcode token configured (oh-gc auth status)-> P6

oh-gc / gitcode auth are P6-only (upload); they warn but never block P0.
"""
import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEVICE_SH = os.path.join(HERE, "lib", "device.sh")

# build.sh prints these banners to stdout (product name may be absent on early
# failure), so match loosely — same convention as gate_build.py.
SUCCESS_RE = re.compile(r"=====build.*successful=====")
ERROR_RE = re.compile(r"=====build.*error=====")
DEFAULT_PROBE_TARGET = "hiview_package"


def run(cmd, env=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, env=env)


def dev(snippet, env=None):
    """Run a snippet with device.sh sourced."""
    return run('. "%s"\n%s' % (DEVICE_SH, snippet), env=env)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--probe-target", default=DEFAULT_PROBE_TARGET,
                    help="GN target compiled to verify the build toolchain works "
                         "(default: %s). No user confirmation — runs automatically." % DEFAULT_PROBE_TARGET)
    ap.add_argument("--skip-build-probe", action="store_true",
                    help="skip the real compile probe (only check build.sh exists)")
    ap.add_argument("--force-build-probe", action="store_true",
                    help="re-run the compile probe even if this repo was already "
                         "verified (ignores the stability marker)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    repo = state["repo"]
    gdir = state.get("git_dir", repo)
    if not os.path.isabs(gdir):
        gdir = os.path.join(repo, gdir)
    gl.evidence_dir(pdir, 0)

    # --- OHOS root sanity: repo defaults to the directory Claude was opened in
    # ($OHOS_ROOT or cwd, set at `advance.py init`). If it doesn't look like an
    # OHOS source root, fail fast with an actionable message instead of a vague
    # capability error further down.
    looks_ohos = (os.path.exists(os.path.join(repo, "build.sh"))
                  and os.path.isdir(os.path.join(repo, "test/testfwk/developer_test")))
    if not looks_ohos:
        msg = ("'%s' does not look like an OHOS source root (missing build.sh / "
               "test/testfwk/developer_test).\n"
               "Fix it one of these ways:\n"
               "  * reopen your Agent in the OHOS repo root, or\n"
               "  * re-run `advance.py init` with --repo <ohos_root>, or\n"
               "  * export OHOS_ROOT=<ohos_root> before init." % repo)
        rel = "evidence/phase0/env.json"
        with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
            json.dump({"repo": repo, "error": "not_an_ohos_root"}, f, indent=2)
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="repo is not an OHOS root: %s" % repo, artifacts_rel=[rel])
        sys.exit("PHASE 0 FAIL — %s" % msg)

    # repo-level stability marker: once a real compile probe has passed here, we
    # don't recompile on every init (a full GN+ninja pass is heavy).
    probe_marker = os.path.join(repo, "specs", ".build-probe-ok")

    # Pass an explicitly-pinned serial (if any) through to device.sh.
    env = dict(os.environ)
    if state.get("device_serial"):
        env["DEVICE_SERIAL"] = state["device_serial"]

    checks = []  # (name, kind, ok, detail, phases)

    def add(name, kind, ok, detail, phases):
        checks.append((name, kind, ok, detail, phases))

    # build.sh exists
    bs = os.path.join(repo, "build.sh")
    bs_ok = os.path.exists(bs)
    add("build", "HARD", bs_ok, bs, "P2")

    # real compile probe: build a known target to prove the toolchain works.
    # Runs automatically (no user confirmation), but only the FIRST time per repo:
    # once it passes, a stability marker lets later inits skip the heavy rebuild.
    probe_rel = "evidence/phase0/build_probe.log"
    already_ok = os.path.exists(probe_marker)
    do_probe = bs_ok and not args.skip_build_probe and (args.force_build_probe or not already_ok)
    if do_probe:
        cmd = "./build.sh --product-name rk3568 --ccache --build-target %s" % args.probe_target
        print("compile probe: %s" % cmd)
        path = os.path.join(pdir, probe_rel)
        with open(path, "w", encoding="utf-8") as logf:
            proc = subprocess.Popen(cmd, shell=True, cwd=repo, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=1)
            for line in proc.stdout:
                sys.stdout.write(line)
                logf.write(line)
            rc = proc.wait()
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            out = f.read()
        compile_ok = rc == 0 and bool(SUCCESS_RE.search(out)) and not ERROR_RE.search(out)
        add("compile", "HARD", compile_ok,
            "target=%s rc=%d banner=%s" % (args.probe_target, rc, bool(SUCCESS_RE.search(out))),
            "P2")
        if compile_ok:  # record stability so subsequent inits skip the rebuild
            os.makedirs(os.path.dirname(probe_marker), exist_ok=True)
            with open(probe_marker, "w", encoding="utf-8") as f:
                f.write("verified target=%s\n" % args.probe_target)
    elif args.skip_build_probe:
        add("compile", "SOFT", True, "skipped (--skip-build-probe)", "P2")
    else:  # already_ok and not forced
        add("compile", "SOFT", True,
            "skipped (already verified; marker %s — use --force-build-probe to recompile)"
            % probe_marker, "P2")

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

    # oh-gc (gitcode CLI) + gitcode token — needed only at P6 (upload). SOFT:
    # warn with actionable guidance, never block P0. Two levels: CLI present,
    # and token configured (oh-gc auth status exit 0 == logged in).
    ohv = run("oh-gc --version")
    oh_gc_ok = ohv.returncode == 0
    add("oh_gc", "SOFT", oh_gc_ok,
        (ohv.stdout or ohv.stderr).strip()[:80] if oh_gc_ok
        else "not installed — `npm i -g @oh-gc/cli@latest` (needed at P6)", "P6")

    gitcode_user = ""
    if oh_gc_ok:
        aenv = dict(env)
        aenv.setdefault("XDG_CACHE_HOME", "/tmp/oh-gc-cache")
        auth = subprocess.run("oh-gc auth status", shell=True, text=True,
                              capture_output=True, env=aenv)
        auth_ok = auth.returncode == 0
        first = (auth.stdout or auth.stderr).strip().splitlines()
        gitcode_user = first[0][:80] if first else ""
        add("gitcode_auth", "SOFT", auth_ok,
            gitcode_user if auth_ok
            else "gitcode token NOT configured — run `oh-gc auth login` "
                 "(token stored at ~/.config/gitcode-cli/config.json)", "P6")
    else:
        add("gitcode_auth", "SOFT", False,
            "skipped (oh-gc not installed); after install run `oh-gc auth login`", "P6")

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
    arts = [rel]
    if os.path.exists(os.path.join(pdir, probe_rel)):
        arts.append(probe_rel)

    for (n, k, ok, d, ph) in checks:
        print("[%s] %-12s %-5s (%s)  %s" % ("OK " if ok else "BAD", n, k, ph, d))

    hard_fail = [n for (n, k, ok, d, ph) in checks if k == "HARD" and not ok]
    if hard_fail:
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="missing capabilities: %s" % ",".join(hard_fail),
                artifacts_rel=arts)
        sys.exit("PHASE 0 FAIL — missing: %s" % ",".join(hard_fail))

    soft_warn = [n for (n, k, ok, d, ph) in checks if k == "SOFT" and not ok]
    # surface actionable guidance for any failed SOFT check (P6 upload prereqs)
    if any(n in soft_warn for n in ("oh_gc", "gitcode_auth")):
        print("\n--- P6 上库前需手动配置(现在不阻塞) ---")
        if "oh_gc" in soft_warn:
            print("  * 安装 gitcode CLI: npm i -g @oh-gc/cli@latest")
        if "gitcode_auth" in soft_warn:
            print("  * 配置 gitcode token(手动登录): oh-gc auth login")
            print("    token 存于 ~/.config/gitcode-cli/config.json;`oh-gc auth status` 验证")
        print("-" * 42)
    reason = "all capabilities present; serial=%s%s" % (
        serial, (" (warn: %s)" % ",".join(soft_warn)) if soft_warn else "")
    gl.emit(pdir, 0, "gate_env_init.py", verdict="PASS", reason=reason, artifacts_rel=arts)
    print("PHASE 0 PASS — run: advance.py --pipeline-dir %s advance --phase 0" % pdir)


if __name__ == "__main__":
    main()
