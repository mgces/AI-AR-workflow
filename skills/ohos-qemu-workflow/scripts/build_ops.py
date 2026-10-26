"""Record build evidence and isolate builds from live writable disk backing images."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time

from common import process_token, run, save_json, spawn_detached, timestamp


def make_plan(ctx, args):
    mode = args.mode
    if mode == "component":
        hb = shutil.which("hb")
        if not hb:
            raise RuntimeError("hb is not on PATH. Activate your OHOS virtualenv/install local build/hb first; no automatic pip install.")
        if not args.targets:
            raise RuntimeError("Supply actual component names from bundle.json component.name")
        command = [hb, "build", *args.targets, "-t" if args.tests else "-i"]
        primary = ctx.root / "out/standard/build.log"
    else:
        command = ["bash", "./build.sh", "--product-name", "arm64_virt", "--ccache",
                   "--jobs", str(args.jobs or ctx.config["jobs"]), "--deps-guard=false"]
        if mode == "target":
            if not args.targets or any(target.startswith("-") for target in args.targets):
                raise RuntimeError("Supply actual GN labels or verified build target names")
            command += ["--build-target", *args.targets]
        elif args.targets:
            raise RuntimeError("Full build does not accept target names; use build target")
        if args.fast:
            if not args.config_unchanged or not (ctx.root / "out/arm64_virt/build.ninja").is_file():
                raise RuntimeError("--fast requires existing build.ninja and --config-unchanged after checking build/product/dependency metadata")
            command.append("--fast-rebuild")
        primary = ctx.root / "out/arm64_virt/build.log"
    if mode != "component" and args.tests:
        raise RuntimeError("--tests is for component mode; pass the actual test target with build target")
    if mode == "component" and (args.fast or args.config_unchanged or args.jobs):
        raise RuntimeError("Component mode uses hb's own build settings; product/fast/job options do not apply")
    return {"argv": command, "cwd": str(ctx.root), "mode": mode,
            "primary_log": str(primary), "config": str(ctx.config_path),
            "command": shlex.join(command)}


def guard_product_build(ctx):
    """Reject product image writes while any launcher-backed instance is live.

    Discover the runtime directory from the live QEMU command's -pidfile rather
    than assuming /tmp: the launcher supports TMPDIR and QEMU_RUNTIME_ROOT.
    Matching the live PID and its actual -pidfile path prevents a recycled PID
    from inheriting a stale instance record.
    """
    output = (ctx.root / "out/arm64_virt/packages/phone/images").resolve()
    state = ctx.status()
    if ctx.path("images") == output and state["state"] not in ("READY", "ABSENT", "INVALID"):
        raise RuntimeError(f"Product output images are used by instance {ctx.config['instance']} ({state['state']}). Stop it before building; preserve its overlays.")

    for record in live_launcher_records():
        manifest = Path(record["instance_dir"]) / "manifest.json"
        data = json.loads(manifest.read_text())
        if Path(data["image_root"]).resolve() == output:
            raise RuntimeError(f"Live QEMU PID {record['qemu_pid']} uses product output images via {manifest}. Stop it before building.")


def live_launcher_records(proc_root=Path("/proc")):
    """Return verified live records for instances launched by qemu_run.sh."""
    records = []
    for cmdline in proc_root.glob("[0-9]*/cmdline"):
        try:
            argv = [part.decode(errors="replace") for part in cmdline.read_bytes().split(b"\0") if part]
            pid = int(cmdline.parent.name)
            if not argv or not Path(argv[0]).name.startswith("qemu-system-"):
                continue
            pidfile_index = argv.index("-pidfile")
            pidfile = Path(argv[pidfile_index + 1]).resolve()
        except (OSError, ValueError, IndexError):
            continue
        if pidfile.name != "qemu.pid":
            continue
        runtime_file = pidfile.parent / "runtime.json"
        try:
            record = json.loads(runtime_file.read_text())
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Cannot verify live QEMU runtime record {runtime_file}: {error}") from error
        try:
            if int(record.get("qemu_pid", -1)) != pid:
                continue
            if record.get("exited_at") or record.get("exit_code") is not None:
                continue
            records.append(record)
        except (TypeError, ValueError, AttributeError):
            continue
    return records


def locked(ctx):
    ctx.evidence.mkdir(parents=True, exist_ok=True)
    lock = (ctx.evidence / "build.lock").open("a+")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close()
        raise RuntimeError("Another workflow build or image snapshot is active; inspect build status")
    return lock


def worker(ctx, directory, stream_output=False):
    directory = Path(directory).resolve()
    meta = json.loads((directory / "result.json").read_text())
    meta.update(state="RUNNING", worker_pid=os.getpid(), worker_token=process_token(os.getpid()),
                started_at=timestamp())
    save_json(directory / "result.json", meta)
    code = 1
    try:
        with locked(ctx):
            if meta["mode"] != "component":
                guard_product_build(ctx)
            with (directory / "console.log").open("ab") as log:
                child = subprocess.Popen(meta["argv"], cwd=ctx.root, stdin=subprocess.DEVNULL,
                                         stdout=subprocess.PIPE if stream_output else log,
                                         stderr=subprocess.STDOUT)
                meta["build_pid"] = child.pid
                save_json(directory / "result.json", meta)
                if stream_output:
                    for line in child.stdout:
                        log.write(line)
                        log.flush()
                        sys.stdout.write(line.decode(errors="replace"))
                        sys.stdout.flush()
                    child.stdout.close()
                code = child.wait()
            log_path = directory / "console.log"
            banner = False
            with log_path.open(errors="replace") as stream:
                banner = any(re.search(r"=====build.*successful=====|build\s+success(?:ful)?|ninja: no work to do", line, re.I)
                             for line in stream)
            # Snapshot the primary log while this build still owns the output lock.
            primary = Path(meta["primary_log"])
            if primary.is_file():
                shutil.copyfile(primary, directory / "primary-build.log")
            meta.update(exit_code=code, success_banner=banner,
                        state="SUCCEEDED" if code == 0 else "FAILED")
            if code == 0 and meta["mode"] == "full":
                images = ctx.root / "out/arm64_virt/packages/phone/images"
                profile = json.loads((ctx.root / "vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json").read_text())
                needed = [profile["kernel"], profile["initrd"], *[x["file"] for x in profile["drives"]]]
                meta["images"] = {name: (images / name).stat().st_size for name in needed}
                if not banner or any(size == 0 for size in meta["images"].values()):
                    raise RuntimeError("Build returned zero but full-system banner/images did not pass evidence checks")
    except (RuntimeError, OSError, ValueError) as error:
        meta.update(state="FAILED", error=str(error))
        code = 1
    except KeyboardInterrupt:
        meta.update(state="INTERRUPTED", error="Build interrupted; preserve out/ and resume the same command")
        code = 130
    finally:
        meta["finished_at"] = timestamp()
        save_json(directory / "result.json", meta)
    return code


def launch(ctx, args):
    plan = make_plan(ctx, args)
    if args.dry_run:
        return plan
    # Fail before detaching if the currently selected output is in use.
    if plan["mode"] != "component":
        guard_product_build(ctx)
    with locked(ctx):
        directory = ctx.evidence / "builds" / f"{timestamp()}-{time.time_ns()}"
        directory.mkdir(parents=True)
        plan.update(state="QUEUED", requested_at=timestamp())
        save_json(directory / "result.json", plan)
        save_json(ctx.evidence / "latest-build.json", {"directory": str(directory)})
    if args.background:
        command = [sys.executable, "-B", str(Path(__file__).with_name("workflow.py")),
                   "--root", str(ctx.root), "--config", str(ctx.config_path), "_build-worker", str(directory)]
        pid = spawn_detached(command, directory / "worker.log", cwd=ctx.root)
        save_json(directory / "dispatch.json", {"pid": pid, "token": process_token(pid)})
        return {"state": "DISPATCHED", "worker_pid": pid, "directory": str(directory),
                "console_log": str(directory / "console.log"), "command": plan["command"]}
    # Foreground AR gates receive the real build output as it is produced.
    worker(ctx, directory, stream_output=True)
    return json.loads((directory / "result.json").read_text())


def status(ctx):
    directory = Path(json.loads((ctx.evidence / "latest-build.json").read_text())["directory"])
    meta = json.loads((directory / "result.json").read_text())
    if meta["state"] == "RUNNING" and process_token(meta.get("worker_pid")) != meta.get("worker_token"):
        meta["state"] = "INTERRUPTED"
        meta["error"] = "Worker is gone; inspect process/log evidence before resuming. Do not clean out/."
    dispatch_file = directory / "dispatch.json"
    if meta["state"] == "QUEUED" and dispatch_file.is_file():
        dispatch = json.loads(dispatch_file.read_text())
        if not process_token(dispatch["pid"]) or process_token(dispatch["pid"]) != dispatch["token"]:
            meta["state"] = "FAILED"
            meta["error"] = "Worker exited before initialization; inspect worker.log. No build success was recorded."
    meta["directory"] = str(directory)
    return meta


def snapshot(ctx, name):
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}", name):
        raise RuntimeError("Snapshot name must be 1-64 letters, digits, underscore or hyphen")
    with locked(ctx):
        dest = ctx.evidence / "image-sets" / name
        dest.mkdir(parents=True, exist_ok=False)
        files = sorted(ctx.path("images").glob("*.img")) + [ctx.path("images") / "Image"]
        profile = json.loads((ctx.root / "vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json").read_text())
        required = [profile["kernel"], profile["initrd"], *[x["file"] for x in profile["drives"]]]
        if any(not (ctx.path("images") / item).is_file() for item in required):
            raise RuntimeError("Missing source images; snapshot is incomplete and must not be booted")
        checksums = {}
        for source in files:
            before = source.stat()
            run(["cp", "--reflink=auto", "--sparse=always", "--preserve=timestamps", "--", source, dest / source.name], timeout=180)
            if source.stat().st_mtime_ns != before.st_mtime_ns or source.stat().st_size != before.st_size:
                raise RuntimeError(f"Image changed during snapshot: {source}; do not use incomplete snapshot")
            with (dest / source.name).open("rb") as stream:
                checksums[source.name] = hashlib.file_digest(stream, "sha256").hexdigest()
            (dest / source.name).chmod(0o444)
        save_json(dest / "sha256.json", checksums)
        config = dict(ctx.config, images=str(dest), instance_root=str(ctx.evidence / "instances" / name))
        save_json(dest / "config.json", config)
        return {"images": str(dest), "config": str(dest / "config.json"),
                "note": "No running instance was switched. Stop the old instance before using the same instance/ports with this config."}
