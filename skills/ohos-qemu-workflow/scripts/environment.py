"""Reuse or restore the pinned Ubuntu 24.04 x86_64 portable runtime, without sudo."""
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import tempfile

from common import run, save_json, timestamp


LOCK = Path(__file__).resolve().parents[2] / "ohos-qemu-env/references/packages.lock.json"


def check(ctx):
    probes = {}
    for key, binary in (("qemu", ctx.path("qemu_dir") / "qemu-system-aarch64"),
                        ("qemu_img", ctx.path("qemu_dir") / "qemu-img"), ("hdc", ctx.path("hdc"))):
        try:
            result = run([binary, "-v" if key == "hdc" else "--version"], timeout=10)
            probes[key] = {"ok": bool(result.stdout.strip()), "path": str(binary),
                           "version": result.stdout.strip().splitlines()[0]}
        except (OSError, RuntimeError) as error:
            probes[key] = {"ok": False, "error": str(error)}
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ctx.path("novnc_root") / "usr/lib/python3/dist-packages") + os.pathsep + env.get("PYTHONPATH", "")
    imports = run(["python3", "-c", "import websockify, numpy, pkg_resources"], env=env, check=False)
    probes["novnc"] = {"ok": imports.returncode == 0 and (ctx.path("novnc_root") / "usr/share/novnc/vnc.html").is_file(),
                       "detail": imports.stderr.strip()}
    tools = {name: (ctx.root / f"prebuilts/build-tools/linux-x86/bin/{name}").is_file() for name in ("gn", "ninja")}
    tools["python_prebuilt"] = any((ctx.root / "prebuilts/python/linux-x86").glob("*/bin/python3"))
    node = ctx.root / "prebuilts/build-tools/common/nodejs/node-v14.21.1-linux-x64/bin/node"
    tools["node_prebuilt"] = node.is_file()
    report = {"host": platform.platform(), "architecture": platform.machine(),
              "runtime_ready": all(value["ok"] for value in probes.values()), "runtime": probes,
              "build_prerequisite_files": tools, "hb_on_path": shutil.which("hb"),
              "images_present": ctx.path("images").is_dir(), "time": timestamp(),
              "note": "Checks tool loading, not a full-system build or guest boot. Use verify for the guest."}
    save_json(ctx.evidence / "environment.json", report)
    return report


def restore(ctx, download=False):
    os_release = Path("/etc/os-release").read_text()
    if platform.machine() != "x86_64" or 'VERSION_ID="24.04"' not in os_release or 'ID=ubuntu' not in os_release:
        raise RuntimeError("Pinned portable packages target Ubuntu 24.04 x86_64 only. Adapt package/runtime paths for other hosts.")
    if ctx.path("qemu_dir") != ctx.root / ".local-tools/qemu-arm64/bin" or ctx.path("novnc_root") != ctx.root / ".local-tools/novnc/root":
        raise RuntimeError("Restore only manages default .local-tools destinations; custom runtime paths are check-only")
    if check(ctx)["runtime_ready"]:
        return {"state": "REUSED", "note": "Existing runtime loads successfully; nothing reinstalled"}
    if ctx.status()["state"] not in ("READY", "ABSENT", "INVALID"):
        raise RuntimeError("Stop QEMU before restoring libraries/tools used by its process")
    packages = json.loads(LOCK.read_text())
    for item in packages:
        folder = ctx.root / ".local-tools" / item["component"] / "packages"
        archive = folder / item["file"]
        folder.mkdir(parents=True, exist_ok=True)
        if not archive.is_file():
            if not download:
                raise RuntimeError(f"Missing {archive}. Supply the recorded .deb or use env prepare --download; no implicit network.")
            with tempfile.TemporaryDirectory(prefix="ohos-qemu-download-") as temporary:
                run(["apt-get", "download", f"{item['package']}:{item['architecture']}={item['version']}"], root=temporary, timeout=180)
                candidates = list(Path(temporary).glob("*.deb"))
                if len(candidates) != 1:
                    raise RuntimeError("apt download did not produce exactly one archive")
                with candidates[0].open("rb") as stream:
                    digest = hashlib.file_digest(stream, "sha256").hexdigest()
                if digest != item["sha256"]:
                    raise RuntimeError(f"Downloaded checksum mismatch: {item['package']}")
                shutil.copyfile(candidates[0], archive)
        with archive.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if digest != item["sha256"]:
            raise RuntimeError(f"Archive checksum mismatch: {archive}")
    # Verify all archives before modifying either extraction tree.
    for item in packages:
        component = ctx.root / ".local-tools" / item["component"]
        run(["dpkg-deb", "-x", component / "packages" / item["file"], component / "root"], timeout=60)
    directory = ctx.path("qemu_dir")
    directory.mkdir(parents=True, exist_ok=True)
    for binary in ("qemu-system-aarch64", "qemu-img"):
        wrapper = directory / binary
        content = ('#!/usr/bin/env bash\nset -euo pipefail\n'
                   'runtime_root="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"\n'
                   'export LD_LIBRARY_PATH="$runtime_root/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"\n'
                   'export QEMU_MODULE_DIR="$runtime_root/root/usr/lib/x86_64-linux-gnu/qemu"\n')
        content += ('exec "$runtime_root/root/usr/bin/' + binary + '" ' +
                    ('-L "$runtime_root/root/usr/share/qemu" ' if binary == "qemu-system-aarch64" else '') + '"$@"\n')
        wrapper.write_text(content)
        wrapper.chmod(0o755)
    result = check(ctx)
    if not result["runtime_ready"]:
        raise RuntimeError("Runtime still lacks host dependencies; inspect environment.json. No system package installation was performed.")
    return {"state": "RESTORED", "environment": result}
