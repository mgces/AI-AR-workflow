"""ARM64 QEMU routing, image protection and instance-specific connections."""
import json
import contextlib
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS / "lib"))
import environments as envs

WORKFLOW = SCRIPTS.parents[1] / "ohos-qemu-workflow/scripts/workflow.py"


class QemuEnvironmentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / ".gn").touch()
        build = self.root / "build.sh"
        build.write_text('#!/bin/bash\necho "=====build arm64_virt successful====="\n')
        build.chmod(0o755)
        self.call("init")
        self.config_path = self.root / "qemu-workflow/config.json"
        self.config = json.loads(self.config_path.read_text())
        self.config.update(hdc="sdk/hdc", hdc_server_port=18711)
        self.config_path.write_text(json.dumps(self.config))
        self.launcher = self.root / "vendor/ohemu/qemu_arm64_linux_full/qemu_run.sh"
        self.launcher.parent.mkdir(parents=True)
        self.set_status("ABSENT")
        self.state = {"environment": "openharmony-qemu", "repo": str(self.root)}

    def set_status(self, state):
        status = {"state": state, "hdc_port": 5658}
        if state == "RUNNING":
            instance_dir = self.root / "out/qemu-workflow/instances/00"
            instance_dir.mkdir(parents=True, exist_ok=True)
            (instance_dir / "manifest.json").write_text('{"profile_id":"arm64_virt"}\n')
            (instance_dir / "userdata.qcow2").write_bytes(b"overlay")
            status["instance_dir"] = str(instance_dir)
        self.launcher.write_text("#!/bin/bash\nprintf '%s\\n' '" + json.dumps(status) + "'\n")

    def call(self, *args):
        return subprocess.run([sys.executable, "-B", str(WORKFLOW),
                               "--root", str(self.root), *args],
                              text=True, capture_output=True)

    def test_profile_routes_all_builds_through_guarded_qemu_entry(self):
        self.assertIn("openharmony-qemu", envs.ENVIRONMENTS)
        self.assertEqual(envs.product_form(self.state), "arm64_virt")
        self.assertEqual(envs.out_dir(self.state), "out/arm64_virt")
        self.assertEqual(envs.upload_backend(self.state), "gitcode")
        argv = envs.build_argv(self.state, "//base/demo:demo")
        self.assertIn(str(WORKFLOW), argv)
        self.assertEqual(argv[-3:], ["build", "target", "//base/demo:demo"])

    def test_init_persists_qemu_product_and_config(self):
        config = self.root / "snapshot config.json"
        config.write_text(json.dumps(self.config))
        cp = subprocess.run([sys.executable, str(SCRIPTS / "advance.py"), "init",
                             "--repo", str(self.root), "--run-id", "qemu-test",
                             "--environment", "openharmony-qemu", "--confirm-defaults",
                             "--qemu-config", str(config)], text=True, capture_output=True,
                            env=dict(os.environ, LIFECYCLE_SECRET_ROOT=str(self.root / "secrets")))
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        saved = json.loads((self.root / "specs/pipeline/qemu-test/pipeline.json").read_text())
        self.assertEqual(saved["product"], "arm64_virt")
        self.assertEqual(saved["qemu_config"], str(config))

    def test_connection_requires_running_instance_and_uses_dynamic_ports(self):
        cp = self.call("connection")
        self.assertNotEqual(cp.returncode, 0)
        self.set_status("RUNNING")
        cp = self.call("connection")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        conn = json.loads(cp.stdout)["connection_env"]
        self.assertEqual(conn["DEVICE_SERIAL"], "127.0.0.1:5658")
        self.assertEqual(conn["HDC_HOST_OVERRIDE"], "127.0.0.1:18711")
        self.assertEqual(conn["HDC_BIN"], str(self.root / "sdk/hdc"))
        self.assertEqual(conn["HDC_NO_AUTOSTART"], "1")
        report = json.loads(cp.stdout)
        self.assertEqual(report["instance_identity"]["instance"], "00")
        self.assertEqual(report["instance_identity"]["overlays"][0]["name"], "userdata.qcow2")

    def test_stop_still_requests_shutdown_when_hdc_sync_times_out(self):
        sys.path.insert(0, str(SCRIPTS.parents[1] / "ohos-qemu-workflow/scripts"))
        import runtime

        class FakeContext:
            root = self.root

            def __init__(self):
                self.states = iter(({"state": "RUNNING"}, {"state": "STOPPED"}))

            def status(self):
                return next(self.states)

            def hdc(self, *args, **kwargs):
                return ["hdc", *args]

            def launcher(self, *args):
                return ["launcher", *args]

        with patch.object(runtime, "run", side_effect=[
                subprocess.TimeoutExpired(["hdc", "sync"], 15),
                subprocess.CompletedProcess(["launcher", "stop"], 0, "stopped", "")]) as mocked_run:
            result = runtime.stop(FakeContext())

        self.assertEqual(result["status"]["state"], "STOPPED")
        self.assertIn("HDC sync did not complete", result["sync_warning"])
        self.assertIn("shutdown was still requested", result["sync_warning"])
        self.assertEqual(mocked_run.call_count, 2)
        self.assertEqual(mocked_run.call_args_list[1].args[0], ["launcher", "stop"])

    def test_foreground_build_exposes_fresh_banner_and_nonzero_exit(self):
        cp = self.call("build", "target", "demo")
        self.assertEqual(cp.returncode, 0, cp.stderr)
        self.assertIn("=====build arm64_virt successful=====", cp.stdout)
        (self.root / "build.sh").write_text('#!/bin/bash\necho failed\nexit 7\n')
        cp = self.call("build", "target", "demo")
        self.assertNotEqual(cp.returncode, 0)

    def test_ar_build_refuses_live_output_images(self):
        self.set_status("RUNNING")
        cp = subprocess.run(envs.build_argv(self.state, "demo"), cwd=self.root,
                            text=True, capture_output=True)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("Stop it before building", cp.stdout + cp.stderr)

    def test_full_build_accepts_product_banner_and_requires_nonempty_images(self):
        profile = self.root / "vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json"
        profile.parent.mkdir(parents=True)
        images = ["Image", "ramdisk.img", "updater.img", "system.img", "vendor.img",
                  "sys_prod.img", "chip_prod.img", "userdata.img"]
        profile.write_text(json.dumps({"kernel": images[0], "initrd": images[1],
                                       "drives": [{"file": name} for name in images[2:]]}))
        output = self.root / "out/arm64_virt/packages/phone/images"
        output.mkdir(parents=True)
        for name in images:
            (output / name).write_bytes(b"test image")
        cp = self.call("build", "full")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        (output / "system.img").write_bytes(b"")
        cp = self.call("build", "full")
        self.assertNotEqual(cp.returncode, 0)

    def test_device_helper_disables_implicit_server_start(self):
        hdc = self.root / "hdc"
        hdc.write_text('#!/bin/bash\nprintf "%s\\n" "$@"\n')
        hdc.chmod(0o755)
        cp = subprocess.run(["bash", "-c", 'source "$1"; hdcw list targets',
                             "test", str(SCRIPTS / "lib/device.sh")],
                            env=dict(os.environ, HDC_BIN=str(hdc), HDC_NO_AUTOSTART="1",
                                     HDC_HOST_OVERRIDE="127.0.0.1:18711"),
                            text=True, capture_output=True)
        self.assertEqual(cp.returncode, 0, cp.stderr)
        self.assertEqual(cp.stdout.splitlines(), ["-p", "-s", "127.0.0.1:18711", "list", "targets"])

    def test_preflight_rejects_unready_runtime(self):
        import qemu_support
        with patch.object(qemu_support, "query", return_value={"runtime_ready": False}):
            with self.assertRaises(envs.EnvironmentNotConfigured):
                qemu_support.preflight(self.state)

    def test_preflight_binds_config_and_ignores_foreign_device_environment(self):
        import qemu_support
        self.set_status("RUNNING")
        real_query = qemu_support.query

        def query(state, *args):
            if args == ("env", "check"):
                return {"runtime_ready": True}
            return real_query(state, *args)

        with patch.object(qemu_support, "query", side_effect=query):
            report = qemu_support.preflight(self.state)
        conn = report["connection_env"]
        self.state.update(connection_env=conn, device_serial=conn["DEVICE_SERIAL"],
                          qemu_config_digest=report["config_digest"],
                          qemu_instance_identity=report["instance_identity"])
        with patch.dict(os.environ, {"DEVICE_SERIAL": "usb-device", "HDC_WIN_PORT": "10086"}):
            env = qemu_support.test_environment(self.state)
        self.assertEqual(env["DEVICE_SERIAL"], "127.0.0.1:5658")
        self.assertNotIn("HDC_WIN_PORT", env)
        self.config_path.write_text(self.config_path.read_text() + "\n")
        with self.assertRaisesRegex(envs.EnvironmentNotConfigured, "changed since P0"):
            envs.build_argv(self.state, "demo")

    def test_connection_rejects_replaced_overlay_even_when_serial_is_unchanged(self):
        import qemu_support
        self.set_status("RUNNING")
        current = qemu_support.connection_report(self.state)
        self.state.update(connection_env=current["connection_env"],
                          device_serial=current["connection_env"]["DEVICE_SERIAL"],
                          qemu_instance_identity=current["instance_identity"])
        overlay = self.root / "out/qemu-workflow/instances/00/userdata.qcow2"
        replacement = overlay.with_suffix(".replacement")
        replacement.write_bytes(b"different overlay")
        replacement.replace(overlay)
        with self.assertRaisesRegex(envs.EnvironmentNotConfigured, "disk overlays changed"):
            qemu_support.connection(self.state)

    def test_device_gate_replay_keeps_qemu_target_pinned(self):
        sys.path.insert(0, str(SCRIPTS))
        import gate_device_func as gate
        conn = {"HDC_NO_AUTOSTART": "1", "DEVICE_SERIAL": "127.0.0.1:5658",
                "HDC_HOST_OVERRIDE": "127.0.0.1:18711"}
        with patch.object(gate, "_CONN_ENV", conn), patch.dict(os.environ, {
                "DEVICE_SERIAL": "usb-device", "HDC_HOST_OVERRIDE": "wrong-host:8710"}):
            env = gate._merged_env()
        self.assertEqual(env["DEVICE_SERIAL"], conn["DEVICE_SERIAL"])
        self.assertEqual(env["HDC_HOST_OVERRIDE"], conn["HDC_HOST_OVERRIDE"])

    def test_device_gate_stops_before_hdc_when_pipeline_state_is_invalid(self):
        sys.path.insert(0, str(SCRIPTS))
        import gate_device_func as gate
        import workflow_checks
        pdir = self.root / "specs/pipeline/bad-state"
        pdir.mkdir(parents=True)
        with patch.object(sys, "argv", ["gate_device_func.py", "--pipeline-dir", str(pdir),
                                         "--scenario-script", "scenario.sh", "--marker", "MARK",
                                         "--phase", "7"]), \
                patch.object(gate.gl, "pipeline_dir", return_value=str(pdir)), \
                patch.object(gate.gl, "evidence_dir", return_value=str(pdir / "evidence")), \
                patch.object(gate.gl, "load_state", side_effect=ValueError("invalid pipeline.json")), \
                patch.object(workflow_checks, "enforce"), patch.object(gate, "sh") as device_shell:
            with self.assertRaisesRegex(SystemExit, "cannot load/validate pipeline state"):
                gate.main()
        device_shell.assert_not_called()

    def test_build_guard_discovers_external_runtime_root_and_rejects_reused_pid(self):
        sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ohos-qemu-workflow/scripts"))
        import build_ops

        proc_root = self.root / "fake-proc"
        pid = 4321
        process = proc_root / str(pid)
        process.mkdir(parents=True)
        runtime_dir = self.root / "custom-runtime" / "arm64_virt" / "00"
        runtime_dir.mkdir(parents=True)
        pidfile = runtime_dir / "qemu.pid"
        argv = ["/portable/qemu-system-aarch64", "-drive", "file=/overlay/system.qcow2",
                "-pidfile", str(pidfile)]
        (process / "cmdline").write_bytes(b"\0".join(part.encode() for part in argv) + b"\0")
        record = {"qemu_pid": pid, "instance_dir": str(self.root / "instance"), "command": argv}
        (runtime_dir / "runtime.json").write_text(json.dumps(record))
        self.assertEqual(build_ops.live_launcher_records(proc_root), [record])

        # A recycled PID running an unrelated process must not inherit the old
        # instance's protection record.
        (process / "cmdline").write_bytes(b"/usr/bin/python3\0worker.py\0")
        self.assertEqual(build_ops.live_launcher_records(proc_root), [])

    def run_p0(self, *, ready=True, arch="aarch64"):
        sys.path.insert(0, str(SCRIPTS))
        import gate_env_init as gate
        import gatelib as gl
        import qemu_support
        self.set_status("RUNNING")
        profile = self.root / "vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json"
        profile.parent.mkdir(parents=True)
        profile.write_text("{}")
        runner = self.root / "test/testfwk/developer_test/start.sh"
        runner.parent.mkdir(parents=True)
        runner.write_text("#!/bin/bash\nexit 0\n")
        runner.chmod(0o755)
        cp = subprocess.run([sys.executable, str(SCRIPTS / "advance.py"), "init",
                             "--repo", str(self.root), "--run-id", "qemu-p0",
                             "--environment", "openharmony-qemu", "--confirm-defaults"],
                            text=True, capture_output=True,
                            env=dict(os.environ, LIFECYCLE_SECRET_ROOT=str(self.root / "secrets")))
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        pdir = self.root / "specs/pipeline/qemu-p0"
        real_query = qemu_support.query

        def query(state, *args):
            return {"runtime_ready": ready} if args == ("env", "check") else real_query(state, *args)

        def dev(snippet, env=None):
            self.assertEqual(env["DEVICE_SERIAL"], "127.0.0.1:5658")
            output = arch if "uname" in snippet else (
                "127.0.0.1:5658" if snippet == "dev_assert_online" else str(self.root / "sdk/hdc"))
            return subprocess.CompletedProcess([], 0, output + "\n", "")

        def run(argv, **kwargs):
            return subprocess.CompletedProcess(argv, 0 if argv[0] == "git" else 127,
                                                "a" * 40 if argv[0] == "git" else "", "")

        argv = ["gate_env_init", "--pipeline-dir", str(pdir), "--skip-build-probe"]
        with patch.object(gl, "SECRET_ROOT", str(self.root / "secrets")), \
                patch.object(sys, "argv", argv), patch.object(qemu_support, "query", side_effect=query), \
                patch.object(gate, "dev", side_effect=dev), patch.object(gate, "run", side_effect=run), \
                contextlib.redirect_stdout(io.StringIO()):
            try:
                gate.main()
            except SystemExit:
                pass
            entry = gl.last_entry_for_phase(pdir, 0)
            self.assertTrue(gl.verify_sig(entry, gl.load_secret("qemu-p0")))
        return pdir, entry

    def test_p0_signs_qemu_connection_and_architecture_evidence(self):
        pdir, entry = self.run_p0()
        self.assertEqual(entry["verdict"], "PASS")
        self.assertTrue((pdir / "evidence/phase0/qemu.json").is_file())
        state = json.loads((pdir / "pipeline.json").read_text())
        self.assertEqual(state["connection_env"]["HDC_HOST_OVERRIDE"], "127.0.0.1:18711")
        self.assertIn("qemu_config_digest", state)

    def test_p0_signs_failure_for_wrong_guest_architecture(self):
        _, entry = self.run_p0(arch="x86_64")
        self.assertEqual(entry["verdict"], "FAIL")
        self.assertIn("qemu_arch", entry["reason"])

    def test_p0_signs_failure_for_missing_qemu_runtime(self):
        _, entry = self.run_p0(ready=False)
        self.assertEqual(entry["verdict"], "FAIL")

    def test_p0_missing_optional_cli_is_a_probe_failure_instead_of_crash(self):
        sys.path.insert(0, str(SCRIPTS))
        import gate_env_init as gate
        result = gate.run([str(self.root / "missing-oh-gc"), "--version"])
        self.assertEqual(result.returncode, 127)


if __name__ == "__main__":
    unittest.main()
