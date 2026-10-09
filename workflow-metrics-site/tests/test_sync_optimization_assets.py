import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "sync_optimization_assets.py"
SPEC = importlib.util.spec_from_file_location("sync_optimization_assets", MODULE_PATH)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class OptimizationSyncTests(unittest.TestCase):
    def setup_tree(self, root):
        source, target = root / "source", root / "public"
        source.mkdir()
        target.mkdir()
        for name in sync.ASSETS:
            (source / name).write_text("asset: " + name, encoding="utf-8")
        (target / "index.html").write_text("<html><body><main>existing metrics</main></body></html>", encoding="utf-8")
        (target / "data.json").write_text('{"runs": []}', encoding="utf-8")
        return source, target

    def test_export_preserves_metrics_and_adds_navigation_once(self):
        with tempfile.TemporaryDirectory() as temp:
            source, target = self.setup_tree(Path(temp))
            sync.sync_assets(target, source)
            sync.sync_assets(target, source)
            html = (target / "index.html").read_text(encoding="utf-8")
            self.assertEqual(html.count(sync.NAV_TAG), 1)
            self.assertIn("<main>existing metrics</main>", html)
            self.assertEqual((target / "data.json").read_text(), '{"runs": []}')
            for name in sync.ASSETS:
                self.assertEqual((target / name).read_bytes(), (source / name).read_bytes())

    def test_missing_asset_does_not_partially_publish(self):
        with tempfile.TemporaryDirectory() as temp:
            source, target = self.setup_tree(Path(temp))
            (source / sync.ASSETS[-1]).unlink()
            before = (target / "index.html").read_bytes()
            with self.assertRaises(ValueError):
                sync.sync_assets(target, source)
            self.assertEqual((target / "index.html").read_bytes(), before)
            self.assertFalse((target / sync.ASSETS[0]).exists())

    def test_invalid_html_does_not_copy_assets(self):
        with tempfile.TemporaryDirectory() as temp:
            source, target = self.setup_tree(Path(temp))
            (target / "index.html").write_text("<html><body>", encoding="utf-8")
            with self.assertRaises(ValueError):
                sync.sync_assets(target, source)
            self.assertFalse((target / sync.ASSETS[0]).exists())


if __name__ == "__main__":
    unittest.main()
