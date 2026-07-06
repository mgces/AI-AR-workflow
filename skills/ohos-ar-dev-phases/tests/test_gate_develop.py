#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
LIB_DIR = SCRIPT_DIR / "lib"
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(LIB_DIR))

GATE_SPEC = importlib.util.spec_from_file_location("gate_develop", SCRIPT_DIR / "gate_develop.py")
gate_develop = importlib.util.module_from_spec(GATE_SPEC)
GATE_SPEC.loader.exec_module(gate_develop)

GATELIB_SPEC = importlib.util.spec_from_file_location("gatelib", LIB_DIR / "gatelib.py")
gatelib = importlib.util.module_from_spec(GATELIB_SPEC)
GATELIB_SPEC.loader.exec_module(gatelib)


def run_git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, text=True, capture_output=True)


class GateDevelopStrongControlTest(unittest.TestCase):
    def init_repo(self, repo: Path) -> None:
        subprocess.run(["git", "init", str(repo)], check=True, text=True, capture_output=True)
        run_git(repo, "config", "user.email", "codex@example.com")
        run_git(repo, "config", "user.name", "Codex")
        (repo / "tracked.cpp").write_text("int OldValue() { return 1; }\n", encoding="utf-8")
        run_git(repo, "add", "tracked.cpp")
        run_git(repo, "commit", "-m", "base")

    def test_collect_changed_files_includes_untracked_sources(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo = Path(temp_dir)
            self.init_repo(repo)
            base = subprocess.run(
                ["git", "-C", str(repo), "rev-parse", "HEAD"],
                check=True,
                text=True,
                capture_output=True,
            ).stdout.strip()

            (repo / "tracked.cpp").write_text("int NewValue() { return 2; }\n", encoding="utf-8")
            (repo / "new_header.h").write_text("#ifndef NEW_HEADER_H\n#define NEW_HEADER_H\n#endif\n", encoding="utf-8")

            changed, tracked, untracked = gate_develop.collect_changed_files(str(repo), base)

        self.assertIn("tracked.cpp", changed)
        self.assertIn("new_header.h", changed)
        self.assertEqual(["tracked.cpp"], tracked)
        self.assertEqual(["new_header.h"], untracked)

    def test_static_rule_checks_reject_both_skill_blockers(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo = Path(temp_dir)
            (repo / "bad.hpp").write_text(
                "#pragma once\n"
                "#include <cstdlib>\n"
                "using namespace std;\n"
                "void Bad()\n"
                "{\n"
                "    int *value = NULL;\n"
                "    auto callback = [&]() { system(\"echo bad\"); };\n"
                "}\n",
                encoding="utf-8",
            )

            checked, issues = gate_develop.static_rule_checks(str(repo), ["bad.hpp"])

        report = "\n".join(issues)
        self.assertEqual(["bad.hpp"], checked)
        self.assertIn("not .hpp", report)
        self.assertIn("#pragma once is forbidden", report)
        self.assertIn("using namespace is forbidden", report)
        self.assertIn("use nullptr instead of NULL", report)
        self.assertIn("system()/popen() are forbidden", report)
        self.assertIn("avoid default lambda captures", report)

    def test_code_fingerprint_changes_when_untracked_content_changes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo = Path(temp_dir)
            self.init_repo(repo)
            state = {"repo": str(repo), "git_dir": str(repo)}

            before = gatelib.code_fingerprint(state)
            (repo / "new.cpp").write_text("int NewValue() { return 1; }\n", encoding="utf-8")
            after_create = gatelib.code_fingerprint(state)
            (repo / "new.cpp").write_text("int NewValue() { return 2; }\n", encoding="utf-8")
            after_edit = gatelib.code_fingerprint(state)

        self.assertNotEqual(before, after_create)
        self.assertNotEqual(after_create, after_edit)

    def test_code_fingerprint_is_commit_independent(self) -> None:
        """P6 commits the pending work to push it. Because the fingerprint is
        base_commit-relative and hashes on-disk content (not diff text or HEAD),
        committing the SAME content must NOT change it — otherwise advance
        --phase 6 would falsely reject the upload as code drift. A real content
        change still must flip it."""
        with tempfile.TemporaryDirectory() as temp_dir:
            repo = Path(temp_dir)
            self.init_repo(repo)
            base = subprocess.run(
                ["git", "-C", str(repo), "rev-parse", "HEAD"],
                check=True, text=True, capture_output=True,
            ).stdout.strip()
            state = {"repo": str(repo), "git_dir": str(repo), "base_commit": base}

            # modify a tracked file + add a new file, all uncommitted
            (repo / "tracked.cpp").write_text("int NewValue() { return 2; }\n", encoding="utf-8")
            (repo / "new.cpp").write_text("int Added() { return 3; }\n", encoding="utf-8")
            uncommitted = gatelib.code_fingerprint(state)

            # stage the same content
            run_git(repo, "add", "-A")
            staged = gatelib.code_fingerprint(state)

            # commit the same content (what P6 `git commit -s` does)
            run_git(repo, "commit", "-m", "work")
            committed = gatelib.code_fingerprint(state)

            # now actually change content
            (repo / "tracked.cpp").write_text("int NewValue() { return 99; }\n", encoding="utf-8")
            drifted = gatelib.code_fingerprint(state)

        # same content, regardless of commit state -> identical fingerprint
        self.assertEqual(uncommitted, staged)
        self.assertEqual(staged, committed)
        # real content change -> drift detected
        self.assertNotEqual(committed, drifted)

    def test_parse_review_report_zero_issues(self) -> None:
        """Shared review-report contract (P5 + P6): a report clears a gate only
        with a machine-readable zero count. Text needs `review_issue_count=0`;
        JSON needs a zero count field or an empty findings list. Non-zero,
        missing-marker, and count-less reports all fail."""
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            def check(name: str, content: str):
                p = root / name
                p.write_text(content, encoding="utf-8")
                return gatelib.parse_review_report_zero_issues(str(p))

            # text marker
            self.assertTrue(check("ok.txt", "review_issue_count=0\n")[0])
            self.assertFalse(check("bad.txt", "review_issue_count=2\n")[0])
            self.assertFalse(check("none.txt", "looks fine to me\n")[0])
            # json count field
            self.assertTrue(check("c0.json", '{"issue_count": 0}')[0])
            self.assertFalse(check("c3.json", '{"finding_count": 3}')[0])
            # json list field
            self.assertTrue(check("l0.json", '{"findings": []}')[0])
            self.assertFalse(check("l1.json", '{"findings": [{"sev": "high"}]}')[0])
            # json without any recognized marker -> fail closed
            self.assertFalse(check("x.json", '{"note": "reviewed"}')[0])


if __name__ == "__main__":
    unittest.main()
