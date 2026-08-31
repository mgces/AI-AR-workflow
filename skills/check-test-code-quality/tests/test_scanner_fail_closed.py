import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
MAIN = SKILL_DIR / "scripts" / "main.py"


class ScannerFailClosedTest(unittest.TestCase):
    def run_scanner(self, root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(MAIN), str(root), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )

    def test_skill_config_is_valid_json(self) -> None:
        config = json.loads((SKILL_DIR / "skill_config.json").read_text(encoding="utf-8"))
        self.assertEqual(config["version"], "1.1.0")

    def test_unimplemented_rules_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = self.run_scanner(Path(tmp), "--rules", "R001")
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn("不能作为已执行结果", result.stdout)
        self.assertNotIn("R001 |", result.stdout)

    def test_r004_is_the_deterministic_cli_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "sample.test.ets").write_text(
                "describe('Demo', () => { it('hasAssertion', 0, () => { expect(true).assertTrue(); }); });\n",
                encoding="utf-8",
            )
            result = self.run_scanner(root, "--rules", "R004", "--output", str(root))
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("全部 1 条规则已执行完毕", result.stdout)


if __name__ == "__main__":
    unittest.main()
