#!/usr/bin/env python3
import json
import hashlib
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "codearts_precheck.py"


class CodeArtsPrecheckTest(unittest.TestCase):
    def test_missing_engine_is_unavailable_and_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "sample.cpp"
            source.write_text("int Value() { return 1; }\n", encoding="utf-8")
            output = root / "out"
            completed = subprocess.run([
                sys.executable, str(SCRIPT), "--engine-jar", str(root / "missing.jar"),
                "--engine-sha256", "0" * 64, "--output-dir", str(output),
                "--project-root", str(root), str(source),
            ], text=True, capture_output=True)
            payload = json.loads((output / "result.json").read_text(encoding="utf-8"))
            self.assertEqual(completed.returncode, 2)
            self.assertEqual(payload["status"], "unavailable")
            self.assertEqual(payload["finding_count"], 0)

    def test_success_requires_engine_output_and_records_clean_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "sample.cpp"
            source.write_text("int Value() { return 1; }\n", encoding="utf-8")
            engine = root / "engine.jar"
            engine.write_bytes(b"approved-engine")
            digest = hashlib.sha256(engine.read_bytes()).hexdigest()
            fake_java = root / "java"
            fake_java.write_text(
                "#!/usr/bin/env python3\n"
                "import json, pathlib, sys\n"
                "out = pathlib.Path(sys.argv[sys.argv.index('--report-output-dir') + 1])\n"
                "(out / 'defects.json').write_text(json.dumps({'defects': []}))\n",
                encoding="utf-8")
            fake_java.chmod(fake_java.stat().st_mode | stat.S_IXUSR)
            output = root / "out"
            completed = subprocess.run([
                sys.executable, str(SCRIPT), "--engine-jar", str(engine),
                "--engine-sha256", digest, "--java-bin", str(fake_java),
                "--output-dir", str(output), "--project-root", str(root), str(source),
            ], text=True, capture_output=True)
            payload = json.loads((output / "result.json").read_text(encoding="utf-8"))
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
            self.assertEqual(payload["status"], "clean")
            self.assertEqual(payload["finding_count"], 0)
            self.assertTrue((output / "engine.log").is_file())


if __name__ == "__main__":
    unittest.main()
