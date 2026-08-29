#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import unittest


SEARCH_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SEARCH_DIR)

import bm25_lib as B  # noqa: E402
import build_index  # noqa: E402
import kb_search  # noqa: E402


def write(root, rel, text):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


class StableNavigationCorpusTest(unittest.TestCase):
    def test_only_navigation_documents_are_indexed(self):
        with tempfile.TemporaryDirectory() as root:
            write(root, "README.md", "# root")
            write(root, "USAGE.md", "# usage")
            write(root, "INFORMATION_ARCHITECTURE.md", "# architecture")
            write(root, "architecture/system.md", "# stable system navigation")
            write(root, "subsystems/hiviewdfx/README.md", "# hiviewdfx navigation")
            write(root, "subsystems/hiviewdfx/functional-overview.md", "stale fact")
            write(root, "workspace/state.md", "stale checkout")
            write(root, "products/rk3568/README.md", "stale product")
            write(root, "generated/verification.md", "generated fact")
            self.assertEqual(
                B.iter_md_files(root),
                ["INFORMATION_ARCHITECTURE.md", "README.md", "USAGE.md",
                 "architecture/system.md", "subsystems/hiviewdfx/README.md"],
            )

    def test_index_manifest_records_navigation_policy(self):
        with tempfile.TemporaryDirectory() as root:
            write(root, "README.md", "# source navigation")
            build_index.build(root, rebuild=True, quiet=True)
            manifest_path = os.path.join(root, "generated", "search-index",
                                         "manifest.json")
            with open(manifest_path, encoding="utf-8") as f:
                manifest = json.load(f)
            self.assertEqual(B.INDEX_POLICY, manifest["index_policy"])
            self.assertEqual(["README.md"], sorted(manifest["files"]))


class CurrentSourceNavigationTest(unittest.TestCase):
    def test_render_resolves_current_repo_candidate_and_warns(self):
        with tempfile.TemporaryDirectory() as tmp:
            kb = os.path.join(tmp, "kb")
            source = os.path.join(tmp, "ohos")
            write(kb, "subsystems/hiviewdfx/components/hichecker/README.md",
                  "# hichecker navigation\n\nstable navigation only\n")
            repo_rel = "base/hiviewdfx/hichecker"
            os.makedirs(os.path.join(source, repo_rel), exist_ok=True)
            write(source, ".repo/project.list", repo_rel + "\n")
            build_index.build(kb, rebuild=True, quiet=True)
            loaded, _ = B.load_index(kb)
            hits = loaded.score(B.tokenize("hiviewdfx hichecker"), k=5)
            rendered = kb_search._render(hits, loaded, kb, 6000, 3,
                                         source_root=source)
            self.assertIn("仅作导航，不是代码事实", rendered)
            self.assertIn(repo_rel, rendered)
            self.assertIn("stable-navigation", rendered)
            self.assertIn("必须复核", rendered)
            self.assertNotIn("stale fact", rendered)


if __name__ == "__main__":
    unittest.main()
