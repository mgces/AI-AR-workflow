"""Use the repository launcher; keep graphics, HDC, and guest readiness separate."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import struct
import subprocess
import time
import urllib.request

from common import listening, process_token, run, save_json, spawn_detached, timestamp


def ensure_hdc(ctx):
    port = ctx.config["hdc_server_port"]
    if not listening(port):
        ctx.evidence.mkdir(parents=True, exist_ok=True)
        pid = spawn_detached(ctx.hdc("-m"), ctx.evidence / "hdc-server.log", env=ctx.hdc_server_env())
        save_json(ctx.evidence / "hdc-process.json", {"pid": pid, "port": port})
        for _ in range(50):
            if listening(port):
                break
            if not process_token(pid):
                raise RuntimeError("HDC server exited; inspect out/qemu-workflow/hdc-server.log")
            time.sleep(0.1)
    versions = run(ctx.hdc("checkserver"), timeout=5).stdout
    if "Client version:" not in versions or "server version:" not in versions:
        raise RuntimeError(f"Port {port} did not return a valid HDC server version: {versions}")
    key = f"127.0.0.1:{ctx.status()['hdc_port']}"
    run(ctx.hdc("tconn", key), timeout=15)
    targets = run(ctx.hdc("list", "targets", "-v"), timeout=5).stdout
    if not any(line.split()[:3] == [key, "TCP", "Connected"] for line in targets.splitlines()):
        raise RuntimeError(f"Guest HDC not ready: {targets.strip()}")
    probe = run(ctx.hdc("shell", "echo", "OHOS_QEMU_HDC_OK", target=True), timeout=15).stdout
    if "OHOS_QEMU_HDC_OK" not in probe:
        raise RuntimeError(f"Guest HDC shell failed: {probe}")
    return {"server_versions": versions.strip(), "targets": targets.strip()}


def websocket_banner(port):
    """Prove HTTP 101 plus RFB bytes from the actual noVNC target (no GUI claim)."""
    key = base64.b64encode(os.urandom(16)).decode()
    with socket.create_connection(("127.0.0.1", port), timeout=5) as sock:
        sock.settimeout(5)
        sock.sendall((f"GET /websockify HTTP/1.1\r\nHost: localhost:{port}\r\n"
                      "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                      f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
                      "Sec-WebSocket-Protocol: binary\r\n\r\n").encode())
        data = b""
        while b"\r\n\r\n" not in data:
            block = sock.recv(4096)
            if not block:
                raise RuntimeError("Closed WebSocket handshake")
            data += block
            if len(data) > 65536:
                raise RuntimeError("Oversized WebSocket handshake")
        header, pending = data.split(b"\r\n\r\n", 1)
        accept = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest())
        if b" 101 " not in header.split(b"\r\n", 1)[0] or accept.lower() not in header.lower():
            raise RuntimeError("Port is not the expected noVNC WebSocket service")

        def read_exact(count):
            nonlocal pending
            while len(pending) < count:
                block = sock.recv(count - len(pending))
                if not block:
                    raise RuntimeError("WebSocket closed before VNC banner")
                pending += block
            result, pending = pending[:count], pending[count:]
            return result

        received = b""
        for _ in range(8):
            first, second = read_exact(2)
            length = second & 127
            if length == 126:
                length = struct.unpack("!H", read_exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", read_exact(8))[0]
            if length > 65536 or second & 128:
                raise RuntimeError("Unexpected WebSocket frame")
            payload = read_exact(length)
            if first & 15 in (0, 1, 2):
                received += payload
                if len(received) >= 12:
                    break
        if not received.startswith(b"RFB "):
            raise RuntimeError(f"noVNC did not forward VNC: {received[:32]!r}")
        return received[:12].decode().strip()


def gui(ctx):
    state = ctx.status()
    if state["state"] != "RUNNING":
        raise RuntimeError(f"QEMU is {state['state']}; run 'up' first")
    port = ctx.config["web_port"]
    if not listening(port):
        root = ctx.path("novnc_root")
        env = os.environ.copy()
        env["PYTHONPATH"] = str(root / "usr/lib/python3/dist-packages") + os.pathsep + env.get("PYTHONPATH", "")
        ctx.evidence.mkdir(parents=True, exist_ok=True)
        command = ["python3", "-m", "websockify", "--web", str(root / "usr/share/novnc"),
                   f"127.0.0.1:{port}", f"127.0.0.1:{state['vnc_port']}"]
        pid = spawn_detached(command, ctx.evidence / "novnc.log", env=env)
        save_json(ctx.evidence / "novnc-process.json", {"pid": pid, "argv": command})
        for _ in range(50):
            if listening(port):
                break
            if not process_token(pid):
                raise RuntimeError("noVNC exited; inspect out/qemu-workflow/novnc.log")
            time.sleep(0.1)
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/vnc.html", timeout=5) as reply:
        if reply.status != 200:
            raise RuntimeError("noVNC HTTP page is unavailable")
    forwarded = websocket_banner(port)
    # A matching RFB version alone cannot prove a pre-existing proxy's target.
    expected = f"127.0.0.1:{state['vnc_port']}".encode()
    owned = False
    for proc in Path("/proc").glob("[0-9]*/cmdline"):
        try:
            argv = proc.read_bytes().split(b"\0")
            if b"websockify" in argv and expected in argv and f"127.0.0.1:{port}".encode() in argv:
                owned = True
                break
        except OSError:
            continue
    if not owned:
        raise RuntimeError("A WebSocket service exists, but its process/target could not be confirmed. Do not replace it automatically.")
    return {"http": 200, "websocket": 101, "forwarded_banner": forwarded,
            "url": f"http://localhost:{port}/vnc.html?host=localhost&port={port}&path=websockify&autoconnect=true&resize=scale"}


def qmp(ctx, name, arguments=None):
    state = ctx.status()
    if state["state"] != "RUNNING":
        raise RuntimeError(f"QEMU is {state['state']}")
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(10)
        sock.connect(str(Path(state["runtime_dir"]) / "qmp.sock"))
        with sock.makefile("rwb", buffering=0) as stream:
            if "QMP" not in json.loads(stream.readline()):
                raise RuntimeError("Missing QMP greeting")

            def execute(command, params=None):
                stream.write((json.dumps({"execute": command, "arguments": params or {}}) + "\n").encode())
                while True:
                    data = json.loads(stream.readline())
                    if "error" in data:
                        raise RuntimeError(str(data["error"]))
                    if "return" in data:
                        return data["return"]
            execute("qmp_capabilities")
            return execute(name, arguments)


def stop(ctx, force=False):
    """Try to flush guest writes, but still request shutdown if HDC stalls."""
    state = ctx.status()
    sync_warning = None
    if state["state"] == "RUNNING":
        try:
            synced = run(ctx.hdc("shell", "sync", target=True), timeout=15, check=False)
            if synced.returncode:
                sync_warning = f"HDC sync exited with status {synced.returncode}; shutdown was still requested"
        except (OSError, subprocess.TimeoutExpired) as error:
            sync_warning = f"HDC sync did not complete ({error}); shutdown was still requested"
    stopped = run(ctx.launcher("stop", *( ["--force"] if force else [] )),
                  root=ctx.root, timeout=45, check=False)
    result = {"launcher_output": stopped.stdout + stopped.stderr, "status": ctx.status()}
    if sync_warning:
        result["sync_warning"] = sync_warning
    if result["status"]["state"] == "RUNNING":
        result["shutdown_pending"] = True
    return result


def verify_once(ctx):
    hdc = ensure_hdc(ctx)
    def shell(*args):
        return run(ctx.hdc("shell", *args, target=True), timeout=20).stdout.strip()
    arch, processes, mounts = shell("uname", "-m"), shell("ps", "-A"), shell("mount")
    flags = {key: shell("param", "get", key) for key in (
        "bootevent.bootanimation.finished", "bootevent.renderservice.ready",
        "bootevent.composer_host.ready", "bootevent.wms.ready", "bootevent.wms.fullscreen.ready")}
    mounted = set(re.findall(r"\S+ on (\S+) type \S+", mounts))
    services = {name: bool(re.search(r"\b" + re.escape(name) + r"\b", processes))
                for name in ("hdcd", "foundation", "render_service", "composer_host", "appspawn")}
    screen = gui(ctx)
    cpu_count = len(qmp(ctx, "query-cpus-fast"))
    memory = qmp(ctx, "query-memory-size-summary")["base-memory"]
    ready = (arch == "aarch64" and all(services.values()) and
             {"/", "/vendor", "/sys_prod", "/chip_prod", "/data"}.issubset(mounted) and
             all(value == "true" for value in flags.values()) and cpu_count == 4 and memory == 4096 * 1024**2)
    return {"basic_boot_pass": ready, "architecture": arch, "services": services,
            "boot_flags": flags, "mounts": mounts, "cpus": cpu_count, "memory_bytes": memory,
            "hdc": hdc, "graphics_transport": screen, "visual_desktop_verified": False,
            "application_tests": "NOT_RUN", "ut_xts": "NOT_RUN", "time": timestamp()}


def verify(ctx, timeout=0):
    deadline = time.monotonic() + timeout
    while True:
        try:
            report = verify_once(ctx)
        except (RuntimeError, OSError, subprocess.TimeoutExpired, ValueError) as error:
            report = {"basic_boot_pass": False, "error": str(error), "time": timestamp()}
        save_json(ctx.evidence / "verify-latest.json", report)
        if report["basic_boot_pass"] or time.monotonic() >= deadline:
            return report
        time.sleep(min(10, max(0, deadline - time.monotonic())))


def screenshot(ctx, output):
    output = Path(output).resolve()
    if output.exists():
        raise RuntimeError(f"Preserve existing screenshot: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    qmp(ctx, "screendump", {"filename": str(output), "format": "png"})
    header = output.read_bytes()[:24]
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("QMP did not produce a PNG")
    return {"file": str(output), "width": struct.unpack("!I", header[16:20])[0],
            "height": struct.unpack("!I", header[20:24])[0],
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "visually_reviewed": False}
