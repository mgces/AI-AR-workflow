"""Shared configuration and bounded local process helpers (Python standard library)."""
import json
import os
from pathlib import Path
import socket
import subprocess
import time


def run(argv, *, root=None, timeout=30, check=True, env=None):
    result = subprocess.run([str(x) for x in argv], cwd=root, env=env,
                            capture_output=True, text=True, errors="replace", timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(f"command exited {result.returncode}: {argv}\n{result.stdout}{result.stderr}")
    return result


def save_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f".{os.getpid()}.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def timestamp():
    return time.strftime("%Y%m%d-%H%M%S")


def listening(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def process_token(pid):
    try:
        # starttime distinguishes a stale PID from a subsequently reused PID.
        fields = Path(f"/proc/{int(pid)}/stat").read_text().rsplit(")", 1)[1].split()
        return None if fields[0] == "Z" else fields[19]
    except (OSError, ValueError, TypeError):
        return None


def spawn_detached(argv, log_path, *, cwd=None, env=None):
    """Double-fork a local service, returning its PID without a lingering Popen child."""
    read_fd, write_fd = os.pipe()
    child = os.fork()
    if child == 0:
        try:
            os.close(read_fd)
            os.setsid()
            grandchild = os.fork()
            if grandchild:
                os.write(write_fd, str(grandchild).encode())
                os._exit(0)
            os.close(write_fd)
            if cwd:
                os.chdir(cwd)
            with open(os.devnull, "rb") as stdin, open(log_path, "ab", buffering=0) as log:
                os.dup2(stdin.fileno(), 0)
                os.dup2(log.fileno(), 1)
                os.dup2(log.fileno(), 2)
            command = [str(value) for value in argv]
            os.execvpe(command[0], command, env if env is not None else os.environ)
        except BaseException as error:
            try:
                os.write(2, f"Detached service failed: {error}\n".encode())
            finally:
                os._exit(1)
    os.close(write_fd)
    try:
        pid = os.read(read_fd, 64)
    finally:
        os.close(read_fd)
        os.waitpid(child, 0)
    if not pid:
        raise RuntimeError("Could not detach local service")
    return int(pid)


class Context:
    def __init__(self, root, config=None):
        self.root = Path(root).resolve()
        if not (self.root / ".gn").exists() or not (self.root / "build.sh").is_file():
            raise RuntimeError("Run in an OpenHarmony root with .gn and build.sh, or pass --root.")
        self.config_path = Path(config).resolve() if config else self.root / "qemu-workflow/config.json"
        self.config = json.loads(self.config_path.read_text())
        if self.config["product"] != "arm64_virt":
            raise RuntimeError("This workflow implements arm64_virt only; choose another product explicitly outside it.")
        for key in ("hdc_server_port", "web_port"):
            if not 1 <= int(self.config[key]) <= 65535:
                raise RuntimeError(f"Invalid port: {key}")
        self.evidence = self.root / "out/qemu-workflow"

    def path(self, key):
        value = Path(self.config[key]).expanduser()
        return value.resolve() if value.is_absolute() else (self.root / value).resolve()

    def launcher(self, *args):
        return ["bash", str(self.root / "vendor/ohemu/qemu_arm64_linux_full/qemu_run.sh"),
                "--qemu-dir", str(self.path("qemu_dir")), "--images", str(self.path("images")),
                "--instance-root", str(self.path("instance_root")), "--instance", str(self.config["instance"]),
                *args]

    def status(self):
        return json.loads(run(self.launcher("status", "--json"), root=self.root).stdout)

    def hdc(self, *args, target=False):
        command = [str(self.path("hdc")), "-s", f"127.0.0.1:{self.config['hdc_server_port']}"]
        if "-m" not in args:
            # Local HDC source documents -p as 'do not auto-pull a server'.
            # Server lifecycle belongs to ensure_hdc, never an implicit client restart.
            command.append("-p")
        if target:
            command += ["-t", f"127.0.0.1:{self.status()['hdc_port']}"]
        return command + list(args)

    def hdc_server_env(self):
        # HDC ProgramMutex uses uv_os_tmpdir/.HDCServer.pid across ports.
        # Isolate only our new server's actual temporary directory, not the shell environment.
        temporary = Path("/tmp") / f"ohos-qemu-hdc-{os.getuid()}-{self.config['hdc_server_port']}"
        temporary.mkdir(mode=0o700, exist_ok=True)
        if temporary.is_symlink() or temporary.stat().st_uid != os.getuid():
            raise RuntimeError(f"Unexpected HDC temporary directory owner: {temporary}")
        return dict(os.environ, TMPDIR=str(temporary))
