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
  --- upload prereqs (SOFT; probed per environment upload backend) ---
  gitcode env: oh_gc (CLI) + gitcode_auth (token)              -> P8
  gerrit  env: git_remote (push target) + gerrit_hook          -> P8

Upload prereqs are P8-only; they warn with actionable guidance but never block P0.
The compile probe's build command + banners come from the environment profile
(environments.py); a HarmonyOS environment whose build command is still a
placeholder hard-fails the probe with a "configure environments.py" message.
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import environments as envs  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEVICE_SH = os.path.join(HERE, "lib", "device.sh")

# Compile banners and the probe target are resolved per-environment via
# environments.py (openharmony keeps the historical rk3568 banners/target;
# harmonyos supplies its own). DEFAULT_PROBE_TARGET is the CLI fallback only.
DEFAULT_PROBE_TARGET = "hiview_package"


def run(cmd, env=None):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True, env=env)


def dev(snippet, env=None):
    """Run a snippet with device.sh sourced."""
    return run('. "%s"\n%s' % (DEVICE_SH, snippet), env=env)


def _write_bootstrap_controls(pdir, verdict, *, blocker=None,
                              failure_class=None):
    """Emit P0's control-layer footprint: a bootstrap memory card + stage
    packet so a weak model entering the first window has the same navigation
    surface every later phase gets. Best-effort, non-authoritative — a write
    failure never changes the P0 verdict (truth stays in the signed manifest)."""
    gl.write_gate_phase_memory_card(
        pdir, 0, "bootstrap", verdict=verdict,
        current_blocker=None if verdict == "PASS" else (blocker or "unknown"),
        next_expected_action_class=(
            "advance" if verdict == "PASS"
            else gl.action_class_for("repair_environment",
                                     failure_class=failure_class)),
        last_failure_class=None if verdict == "PASS" else failure_class,
        primary_entry_doc=gl.controls_relpath("next_action.json"))
    gl.write_gate_stage_packet_from_def(
        pdir, "bootstrap", "bootstrap", physical_phase=0)



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

    # --- source-root sanity: repo defaults to the directory Claude was opened in
    # ($OHOS_ROOT or cwd, set at `advance.py init`). The markers that make a
    # directory "look like a source root" are environment-specific and come from
    # the profile (openharmony -> build.sh + test/testfwk/developer_test;
    # harmonyos -> whatever that environment's profile declares). A HarmonyOS
    # environment whose root_markers are still a placeholder hard-fails here with
    # a "configure environments.py" message rather than falling back to the OHOS
    # layout — the same fail-closed stance as the build command. If the directory
    # doesn't match, fail fast with an actionable message instead of a vague
    # capability error further down.
    try:
        markers = envs.root_markers(state)
    except envs.EnvironmentNotConfigured as e:
        rel = "evidence/phase0/env.json"
        with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
            json.dump({"repo": repo, "environment": envs.env_id(state),
                       "error": "root_markers_unconfigured",
                       "detail": str(e)}, f, indent=2, ensure_ascii=False)
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="source-root markers not configured for environment %s"
                % envs.env_id(state), artifacts_rel=[rel])
        _write_bootstrap_controls(
            pdir, "FAIL", blocker="root_markers_unconfigured",
            failure_class="bootstrap_input_missing")
        sys.exit("PHASE 0 FAIL — %s" % e)
    missing_markers = [m for m in markers
                       if not os.path.exists(os.path.join(repo, m))]
    looks_ok = not missing_markers
    if not looks_ok:
        msg = ("'%s' does not look like a %s source root (missing: %s).\n"
               "Fix it one of these ways:\n"
               "  * reopen your Agent in the source repo root, or\n"
               "  * re-run `advance.py init` with --repo <source_root>, or\n"
               "  * export OHOS_ROOT=<source_root> before init."
               % (repo, envs.env_id(state), ", ".join(missing_markers)))
        rel = "evidence/phase0/env.json"
        with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
            json.dump({"repo": repo, "environment": envs.env_id(state),
                       "error": "not_a_source_root",
                       "missing_markers": missing_markers}, f, indent=2,
                      ensure_ascii=False)
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="repo is not a %s source root: %s"
                % (envs.env_id(state), repo), artifacts_rel=[rel])
        _write_bootstrap_controls(pdir, "FAIL", blocker="not_a_source_root",
                                  failure_class="bootstrap_input_missing")
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
        # Build command + success/error banners come from the environment profile.
        # If this environment's build template is still a placeholder (e.g. a
        # HarmonyOS 系统/芯片 command the user hasn't filled), hard-fail with an
        # actionable "configure environments.py" message instead of running the
        # wrong command — the same fail-closed stance as the rest of the pipeline.
        try:
            cmd = envs.build_command(state, args.probe_target)
        except envs.EnvironmentNotConfigured as e:
            rel = "evidence/phase0/env.json"
            with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
                json.dump({"repo": repo, "environment": envs.env_id(state),
                           "error": "build_command_unconfigured",
                           "detail": str(e)}, f, indent=2, ensure_ascii=False)
            gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                    reason="build command not configured for environment %s"
                    % envs.env_id(state), artifacts_rel=[rel])
            _write_bootstrap_controls(
                pdir, "FAIL", blocker="build_command_unconfigured",
                failure_class="bootstrap_input_missing")
            sys.exit("PHASE 0 FAIL — %s" % e)
        success_re = envs.success_re(state)
        error_re = envs.error_re(state)
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
        compile_ok = rc == 0 and bool(success_re.search(out)) and not error_re.search(out)
        add("compile", "HARD", compile_ok,
            "target=%s rc=%d banner=%s" % (args.probe_target, rc, bool(success_re.search(out))),
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

    # Upload prerequisites — needed only at P8 (upload). SOFT: warn with
    # actionable guidance, never block P0. Which prereqs to probe depends on the
    # environment's upload backend:
    #   gitcode -> oh-gc CLI present + gitcode token configured (OpenHarmony)
    #   gerrit  -> git remote + commit-msg Change-Id hook (HarmonyOS internal)
    backend = envs.upload_backend(state)
    upload_soft = []  # names of SOFT upload checks that failed (for the P8 hint)
    if backend == "gitcode":
        ohv = run("oh-gc --version")
        oh_gc_ok = ohv.returncode == 0
        add("oh_gc", "SOFT", oh_gc_ok,
            (ohv.stdout or ohv.stderr).strip()[:80] if oh_gc_ok
            else "not installed — `npm i -g @oh-gc/cli@latest` (needed at P8)", "P8")

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
                     "(token stored at ~/.config/gitcode-cli/config.json)", "P8")
        else:
            add("gitcode_auth", "SOFT", False,
                "skipped (oh-gc not installed); after install run `oh-gc auth login`", "P8")
        upload_soft = ["oh_gc", "gitcode_auth"]
    else:  # gerrit (HarmonyOS)
        # A push target: git_dir must have a remote to push refs/for/<base> to.
        rem = run("git -C %s remote" % gdir)
        has_remote = rem.returncode == 0 and bool(rem.stdout.strip())
        add("git_remote", "SOFT", has_remote,
            ("remotes: %s" % ",".join(rem.stdout.split())) if has_remote
            else "no git remote in %s — Gerrit push target must be configured "
                 "(needed at P8)" % gdir, "P8")
        # Gerrit's commit-msg hook injects the Change-Id trailer refs/for review
        # needs. Its absence is a warn, not a block (installed at push time).
        hook = os.path.join(gdir, ".git", "hooks", "commit-msg")
        hook_ok = os.path.exists(hook)
        add("gerrit_hook", "SOFT", hook_ok,
            hook if hook_ok
            else "commit-msg Change-Id hook not installed at %s — Gerrit review "
                 "needs it (installed at P8 push time)" % hook, "P8")
        upload_soft = ["git_remote", "gerrit_hook"]

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
    # When the device is the (or a) blocker, surface plain jargon-free guidance:
    # no env macros — just the one command to run on the machine holding the
    # device, and what IP:port to hand back. device.sh already printed this to
    # stderr; echo it here too so it's front-and-center in the P0 summary.
    if "device" in hard_fail:
        print("\n--- 真机没连上,按这一步操作 ---")
        print("请在【插着设备的那台电脑】上执行(端口用 10086):")
        print("    hdc -m -s 0.0.0.0:10086 start")
        print("执行后把那台电脑的 IP 和端口(例如 192.168.1.23:10086)告诉我,我来接管连接。")
        print("-" * 34)
    if hard_fail:
        gl.emit(pdir, 0, "gate_env_init.py", verdict="FAIL",
                reason="missing capabilities: %s" % ",".join(hard_fail),
                artifacts_rel=arts)
        _write_bootstrap_controls(
            pdir, "FAIL", blocker="missing capabilities: %s" % ",".join(hard_fail),
            failure_class="bootstrap_input_missing")
        sys.exit("PHASE 0 FAIL — missing: %s" % ",".join(hard_fail))

    soft_warn = [n for (n, k, ok, d, ph) in checks if k == "SOFT" and not ok]
    # surface actionable guidance for any failed SOFT upload check (P8 prereqs)
    if any(n in soft_warn for n in upload_soft):
        print("\n--- P8 上库前需手动配置(现在不阻塞) ---")
        if backend == "gitcode":
            if "oh_gc" in soft_warn:
                print("  * 安装 gitcode CLI: npm i -g @oh-gc/cli@latest")
            if "gitcode_auth" in soft_warn:
                print("  * 配置 gitcode token(手动登录): oh-gc auth login")
                print("    token 存于 ~/.config/gitcode-cli/config.json;`oh-gc auth status` 验证")
        else:  # gerrit
            if "git_remote" in soft_warn:
                print("  * 配置 Gerrit push 远端: git -C <git_dir> remote add ...")
            if "gerrit_hook" in soft_warn:
                print("  * 安装 commit-msg Change-Id 钩子(Gerrit review 需要)")
        print("-" * 42)
    reason = "all capabilities present; serial=%s%s" % (
        serial, (" (warn: %s)" % ",".join(soft_warn)) if soft_warn else "")
    gl.emit(pdir, 0, "gate_env_init.py", verdict="PASS", reason=reason, artifacts_rel=arts)
    _write_bootstrap_controls(pdir, "PASS")
    print("PHASE 0 PASS — run: advance.py --pipeline-dir %s advance --phase 0" % pdir)


if __name__ == "__main__":
    main()
