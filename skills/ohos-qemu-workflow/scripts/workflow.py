#!/usr/bin/env python3
"""OpenHarmony ARM64 QEMU workflow entry point. All evidence is local."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys

from common import Context, run, save_json
import build_ops
import environment
import runtime


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", default=os.environ.get("OHOS_QEMU_ROOT", os.getcwd()))
    p.add_argument("--config", help="JSON config; relative tool/image paths resolve against --root")
    commands = p.add_subparsers(dest="command", required=True)
    commands.add_parser("init", help="Initialize a new source root's config and shortcut; preserve existing files")
    env = commands.add_parser("env", help="Check or prepare portable QEMU/noVNC runtime")
    env.add_argument("action", choices=("check", "prepare"))
    env.add_argument("--download", action="store_true", help="Explicitly allow downloading missing pinned .deb packages")
    build = commands.add_parser("build", help="Compile without starting or deploying to the guest")
    build.add_argument("mode", choices=("full", "target", "component", "status"))
    build.add_argument("targets", nargs="*")
    build.add_argument("--jobs", type=int)
    build.add_argument("--tests", action="store_true", help="hb component tests (-t); run -i separately first")
    build.add_argument("--fast", action="store_true")
    build.add_argument("--config-unchanged", action="store_true")
    build.add_argument("--background", action="store_true")
    build.add_argument("--dry-run", action="store_true")
    image = commands.add_parser("snapshot", help="Copy current base images into a separate immutable image set")
    image.add_argument("name")
    up = commands.add_parser("up", help="Start/reuse QEMU, noVNC, and HDC; perform bounded readiness checks")
    up.add_argument("--timeout", type=int, default=600)
    commands.add_parser("status", help="Read current QEMU state")
    commands.add_parser("connection", help="Read instance-specific HDC environment; requires RUNNING")
    stop = commands.add_parser("stop", help="Request guest shutdown; preserves disk overlays")
    stop.add_argument("--force", action="store_true", help="Explicit QMP quit when ordinary shutdown cannot finish")
    commands.add_parser("gui", help="Start/reuse loopback noVNC and verify its target")
    hdc = commands.add_parser("hdc", help="connect, targets, or a target-selected HDC command")
    hdc.add_argument("args", nargs=argparse.REMAINDER)
    verify = commands.add_parser("verify", help="Verify actual guest, HDC, services, mounts and graphics transport")
    verify.add_argument("--timeout", type=int, default=0)
    shot = commands.add_parser("screenshot", help="Save a raw QMP PNG without editing")
    shot.add_argument("output")
    worker = commands.add_parser("_build-worker", help=argparse.SUPPRESS)
    worker.add_argument("directory")
    return p


def main():
    args = parser().parse_args()
    if args.command == "init":
        root = Path(args.root).resolve()
        if not (root / ".gn").exists() or not (root / "build.sh").is_file():
            raise RuntimeError("init requires an existing OpenHarmony root with .gn and build.sh")
        config = Path(args.config).resolve() if args.config else root / "qemu-workflow/config.json"
        if not config.exists():
            template = Path(__file__).resolve().parents[1] / "references/config.example.json"
            save_json(config, json.loads(template.read_text()))
        shortcut = root / "qemu-workflow/qemu"
        if not shortcut.exists():
            shortcut.parent.mkdir(parents=True, exist_ok=True)
            shortcut.write_text('#!/usr/bin/env bash\nset -euo pipefail\n'
                                'qemu_workflow_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"\n'
                                'exec python3 -B ' + shlex.quote(str(Path(__file__).resolve())) +
                                ' --root "$(dirname -- "$qemu_workflow_dir")" "$@"\n')
            shortcut.chmod(0o755)
        print(json.dumps({"config": str(config), "shortcut": str(shortcut),
                          "note": "Existing files preserved. Review paths/SDK version before preparing runtime."}, indent=2))
        return 0
    ctx = Context(args.root, args.config)
    if getattr(args, "timeout", 0) < 0 or (getattr(args, "jobs", None) is not None and args.jobs < 1):
        raise RuntimeError("timeout must be nonnegative; jobs must be positive")
    if args.command == "env":
        if args.action == "check" and args.download:
            raise RuntimeError("--download applies only to env prepare")
        result = environment.check(ctx) if args.action == "check" else environment.restore(ctx, args.download)
    elif args.command == "build":
        result = build_ops.status(ctx) if args.mode == "status" else build_ops.launch(ctx, args)
    elif args.command == "_build-worker":
        return build_ops.worker(ctx, args.directory)
    elif args.command == "snapshot":
        result = build_ops.snapshot(ctx, args.name)
    elif args.command == "status":
        result = ctx.status()
    elif args.command == "connection":
        state = ctx.status()
        if state["state"] != "RUNNING":
            raise RuntimeError("QEMU is not RUNNING; use up before AR device validation")
        port = int(state["hdc_port"])
        if not 1 <= port <= 65535:
            raise RuntimeError("Invalid instance HDC port")
        instance_dir = Path(state.get("instance_dir", "")).resolve()
        if not instance_dir.is_dir():
            raise RuntimeError("Launcher did not report a valid running instance directory")
        manifest = instance_dir / "manifest.json"
        if not manifest.is_file():
            raise RuntimeError("Running QEMU instance has no manifest.json")
        overlays = []
        for overlay in sorted(instance_dir.glob("*.qcow2")):
            resolved = overlay.resolve()
            try:
                resolved.relative_to(instance_dir)
            except ValueError as error:
                raise RuntimeError("QEMU overlay resolves outside its instance directory") from error
            stat = resolved.stat()
            overlays.append({"name": overlay.name, "device": stat.st_dev,
                             "inode": stat.st_ino})
        if not overlays:
            raise RuntimeError("Running QEMU instance has no qcow2 overlays to bind")
        instance_identity = {
            "instance": ctx.config["instance"],
            "instance_dir": str(instance_dir),
            "manifest_sha256": hashlib.sha256(manifest.read_bytes()).hexdigest(),
            # Inode/device stay stable while QEMU writes its overlays, unlike
            # size/mtime. They change if an overlay is reset or replaced.
            "overlays": overlays,
        }
        result = {"connection_env": {
            "HDC_BIN": str(ctx.path("hdc")),
            "HDC_HOST_OVERRIDE": f"127.0.0.1:{ctx.config['hdc_server_port']}",
            "DEVICE_SERIAL": f"127.0.0.1:{port}",
            "HDC_NO_AUTOSTART": "1",
        }, "config": str(ctx.config_path), "instance": ctx.config["instance"],
                  "instance_identity": instance_identity}
    elif args.command == "stop":
        result = runtime.stop(ctx, force=args.force)
    elif args.command == "gui":
        result = runtime.gui(ctx)
    elif args.command == "up":
        state = ctx.status()
        if state["state"] != "RUNNING":
            report = environment.check(ctx)
            if not report["runtime_ready"]:
                raise RuntimeError("Run env prepare first; see out/qemu-workflow/environment.json")
            with build_ops.locked(ctx):
                started = run(ctx.launcher("run", "--accel", "tcg", "--display", "vnc", "--network", "user", "--background"),
                              root=ctx.root, timeout=60)
            print(started.stdout, file=sys.stderr, flush=True)
        print("启动验证：等待 HDC、系统服务和图形就绪（有超时，不做后台监听）。", file=sys.stderr, flush=True)
        result = runtime.verify(ctx, args.timeout)
    elif args.command == "verify":
        result = runtime.verify(ctx, args.timeout)
    elif args.command == "screenshot":
        result = runtime.screenshot(ctx, args.output)
    elif args.command == "hdc":
        rest = args.args
        if rest[:1] == ["--"]:
            rest = rest[1:]
        if rest == ["connect"]:
            result = runtime.ensure_hdc(ctx)
        elif rest == ["targets"]:
            result = {"targets": run(ctx.hdc("list", "targets", "-v"), timeout=5).stdout.strip()}
        else:
            if not rest:
                raise RuntimeError("Use hdc connect, hdc targets, hdc shell, hdc hilog, hdc file ..., or hdc install ...")
            if rest[0] not in ("shell", "hilog", "file", "install", "uninstall", "fport", "rport", "bugreport", "jpid"):
                raise RuntimeError("Host-server operations are intentionally not forwarded. Use the explicit HDC binary for those.")
            # Always select the configured QEMU; never kill/restart other HDC services.
            return subprocess.call(ctx.hdc(*rest, target=True), cwd=ctx.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result.get("basic_boot_pass") is False or result.get("runtime_ready") is False or result.get("state") in ("FAILED", "INTERRUPTED") or result.get("shutdown_pending"):
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
