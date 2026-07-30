#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
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

DEVICE_GATE_SPEC = importlib.util.spec_from_file_location("gate_device_func", SCRIPT_DIR / "gate_device_func.py")
gate_device_func = importlib.util.module_from_spec(DEVICE_GATE_SPEC)
DEVICE_GATE_SPEC.loader.exec_module(gate_device_func)


def run_git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, text=True, capture_output=True)


class GateDevelopStrongControlTest(unittest.TestCase):
    def test_shared_prewrite_contract_is_required_by_author_time_gates(self) -> None:
        phases = Path(__file__).resolve().parents[1]
        p2 = (phases / "scripts" / "gate_develop.py").read_text(encoding="utf-8")
        p3 = (phases / "scripts" / "gate_test_develop.py").read_text(encoding="utf-8")
        contract = phases.parent / "code-ruleset-style-check" / "references" / "pre-write-contract.md"
        self.assertTrue(contract.is_file())
        self.assertIn("code-ruleset-style-check/references/pre-write-contract.md", p2)
        self.assertIn("code-ruleset-style-check/references/pre-write-contract.md", p3)

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

    def test_static_rule_checks_does_not_duplicate_shared_guard(self) -> None:
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

        self.assertEqual(["bad.hpp"], checked)
        self.assertEqual([], issues)

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

    def test_phase4_requires_runtime_and_e2e_proof_args(self) -> None:
        args = SimpleNamespace(
            phase=4,
            host_artifact=None,
            device_artifact=None,
            runtime_marker=None,
            e2e_marker=None,
        )

        missing = gate_device_func.missing_phase4_proof_args(args)

        self.assertEqual(
            ["--host-artifact", "--device-artifact", "--runtime-marker", "--e2e-marker"],
            missing,
        )

    def test_parse_device_sha256sum_output(self) -> None:
        output = "7f83b1657ff1fc53b92dc18148a1d65dfa1351c2d4b1fa3d677284addd200126  /system/lib/libdemo.z.so\n"

        self.assertEqual(
            "7f83b1657ff1fc53b92dc18148a1d65dfa1351c2d4b1fa3d677284addd200126",
            gate_device_func.parse_device_sha256sum(output),
        )
        self.assertIsNone(gate_device_func.parse_device_sha256sum("sha256sum: missing\n"))

    def test_phase4_verdict_requires_runtime_e2e_and_matching_binary_hash(self) -> None:
        good_log = "NONCE=n1 FEATURE_OK RUNTIME_PROOF E2E_OK"

        ok, detail = gate_device_func.evaluate_phase4_verdict(
            cap_text=good_log,
            nonce="n1",
            marker="FEATURE_OK",
            runtime_marker="RUNTIME_PROOF",
            e2e_marker="E2E_OK",
            uptime_before="1.0",
            uptime_after="2.0",
            host_sha="abc",
            device_sha="abc",
        )
        self.assertTrue(ok, detail)

        missing_e2e, detail = gate_device_func.evaluate_phase4_verdict(
            cap_text="NONCE=n1 FEATURE_OK RUNTIME_PROOF",
            nonce="n1",
            marker="FEATURE_OK",
            runtime_marker="RUNTIME_PROOF",
            e2e_marker="E2E_OK",
            uptime_before="1.0",
            uptime_after="2.0",
            host_sha="abc",
            device_sha="abc",
        )
        self.assertFalse(missing_e2e, detail)
        self.assertIn("e2e=False", detail)

        hash_mismatch, detail = gate_device_func.evaluate_phase4_verdict(
            cap_text=good_log,
            nonce="n1",
            marker="FEATURE_OK",
            runtime_marker="RUNTIME_PROOF",
            e2e_marker="E2E_OK",
            uptime_before="1.0",
            uptime_after="2.0",
            host_sha="abc",
            device_sha="def",
        )
        self.assertFalse(hash_mismatch, detail)
        self.assertIn("artifact_hash=False", detail)

    def test_phase4_rejects_proof_markers_literal_in_driver_scripts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            script = Path(temp_dir) / "scenario.sh"
            script.write_text("dev_shell 'log -t FAKE E2E_OK'\n", encoding="utf-8")

            found = gate_device_func.find_marker_literals(
                [str(script)],
                ["RUNTIME_PROOF", "E2E_OK"],
            )

        self.assertEqual({"E2E_OK": str(script)}, found)

    def test_changed_files_coverage_exact_and_suffix(self) -> None:
        declared = ["foundation/a/src/mgr.cpp", "include/a.h", "missing.cpp"]
        touched = ["repo/foundation/a/src/mgr.cpp", "include/a.h", "other.cpp"]
        present, missing = gate_develop.changed_files_coverage(declared, touched)
        self.assertIn("foundation/a/src/mgr.cpp", present)  # suffix match
        self.assertIn("include/a.h", present)               # exact match
        self.assertEqual(["missing.cpp"], missing)

    def test_changed_files_coverage_all_present(self) -> None:
        present, missing = gate_develop.changed_files_coverage(
            ["a.cpp"], ["a.cpp", "b.cpp"])
        self.assertEqual([], missing)
        self.assertEqual(["a.cpp"], present)


if __name__ == "__main__":
    unittest.main()
