"""Bridge AR gates to the co-installed QEMU workflow without changing USB runs."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from environments import EnvironmentNotConfigured

ENTRY = Path(__file__).resolve().parents[3] / "ohos-qemu-workflow/scripts/workflow.py"


def config_path(state):
    return Path(state.get("qemu_config") or
                Path(state["repo"]) / "qemu-workflow/config.json").resolve()


def config_digest(state):
    return "sha256:" + hashlib.sha256(config_path(state).read_bytes()).hexdigest()


def command(state, *args):
    try:
        if not ENTRY.is_file():
            raise OSError("install all four ohos-qemu-* skills together")
        if state.get("qemu_config_digest") and config_digest(state) != state["qemu_config_digest"]:
            raise OSError("QEMU config changed since P0; re-init and rerun P0")
    except OSError as error:
        raise EnvironmentNotConfigured(str(error)) from error
    return [sys.executable, "-B", str(ENTRY), "--root", state["repo"],
            "--config", str(config_path(state)), *args]


def query(state, *args):
    cp = subprocess.run(command(state, *args), text=True, capture_output=True, timeout=90)
    if cp.returncode:
        raise EnvironmentNotConfigured((cp.stderr or cp.stdout).strip())
    try:
        return json.loads(cp.stdout)
    except ValueError as error:
        raise EnvironmentNotConfigured("Invalid QEMU workflow JSON") from error


def connection_report(state):
    report = query(state, "connection")
    conn = report["connection_env"]
    saved = state.get("connection_env")
    if saved and any(saved.get(key) != value for key, value in conn.items()):
        raise EnvironmentNotConfigured("QEMU connection changed since P0; re-init and rerun P0")
    pinned = state.get("device_serial")
    if pinned and pinned != conn["DEVICE_SERIAL"]:
        raise EnvironmentNotConfigured("device_serial does not match the configured QEMU instance")
    identity = report.get("instance_identity")
    if not isinstance(identity, dict):
        raise EnvironmentNotConfigured("QEMU launcher did not report a disk-bound instance identity")
    saved_identity = state.get("qemu_instance_identity")
    if saved_identity and saved_identity != identity:
        raise EnvironmentNotConfigured(
            "QEMU instance or disk overlays changed since P0; re-init and rerun P0")
    return {"connection_env": conn, "instance_identity": identity}


def connection(state):
    return connection_report(state)["connection_env"]


def preflight(state):
    """Read current runtime readiness and connection; never start or rebuild."""
    try:
        digest = config_digest(state)
        runtime = query(state, "env", "check")
        if runtime.get("runtime_ready") is not True:
            raise EnvironmentNotConfigured("QEMU runtime is not ready; run ohos-qemu-env")
        connection_info = connection_report(state)
        conn = connection_info["connection_env"]
        if config_digest(state) != digest:
            raise EnvironmentNotConfigured("QEMU config changed during P0")
        return {"runtime": runtime, "connection_env": conn,
                "instance_identity": connection_info["instance_identity"],
                "config_digest": digest}
    except (OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        raise EnvironmentNotConfigured("QEMU preflight failed: %s" % error) from error


def test_environment(state):
    """Select the SDK HDC and pinned instance for developer_test/xdevice."""
    if state.get("environment") != "openharmony-qemu":
        return None
    conn = connection(state)
    env = dict(os.environ, **conn)
    env.pop("HDC_WIN_PORT", None)
    env["PATH"] = str(Path(conn["HDC_BIN"]).parent) + os.pathsep + env.get("PATH", "")
    return env
