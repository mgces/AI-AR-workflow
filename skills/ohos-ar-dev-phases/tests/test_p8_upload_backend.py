#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""P8 upload-backend branching: the gate resolves the upload backend from the
environment profile.
  * gitcode (openharmony / default): --repo-slug is required.
  * gerrit (harmonyos): resolves commands from the external environment profile
    and hard-fails BEFORE any irreversible action when that profile is absent or
    incomplete, with an actionable configuration message.

Both cases stop at the precheck substate (no push, no manifest emitted), so the
test only has to stand up a state with phases 1..7 passed.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, os.path.join(SCRIPTS, "lib"))
import gatelib as gl  # noqa: E402


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gate_upload_ci = _load("gate_upload_ci")


class TestUploadBackendBranch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.pdir = os.path.join(self.repo, "pdir")
        os.makedirs(os.path.join(self.pdir, "evidence"), exist_ok=True)
        # a git repo so `git rev-parse` in the flow doesn't explode before the
        # branch we exercise (the gerrit branch fires before any git call).
        self.run_id = "p8-backend"
        gl.create_secret(self.run_id)

    def tearDown(self):
        try:
            os.remove(gl.secret_path(self.run_id))
        except OSError:
            pass
        self.tmp.cleanup()

    def _write_state(self, *, environment, component_type=None):
        phases = [{"id": i, "name": "p%d" % i, "status": "pending",
                   "manifest_ref": None, "closed_at_utc": None} for i in range(9)]
        for p in phases:
            if p["id"] in (1, 2, 3, 4, 5, 6, 7):
                p["status"] = "passed"
        state = {
            "run_id": self.run_id, "ar": self.run_id, "repo": self.repo,
            "git_dir": self.repo, "environment": environment,
            "component_type": component_type, "product": None,
            "device_serial": "", "build_target": "t",
            "test": {"part": "p", "ut_suites": [], "mst_suites": []},
            "base_commit": "", "phase_scheme": gl.PHASE_SCHEME, "current_phase": 8,
            "consent_tokens": {"8": "reviewer"},
            "code_fingerprint": None, "functional_fingerprint": None,
            "locked_all_paths": None, "phases": phases,
        }
        gl.save_state(self.pdir, state)

    def _run(self, *extra):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "gate_upload_ci.py"),
             "--pipeline-dir", self.pdir, "--branch", "feat/x", *extra],
            text=True, capture_output=True)

    def test_gerrit_backend_hard_fails_without_profile(self):
        self._write_state(environment="harmonyos", component_type="system")
        cp = self._run()  # no --repo-slug needed for gerrit
        self.assertNotEqual(cp.returncode, 0)
        out = cp.stdout + cp.stderr
        self.assertIn("gerrit", out.lower())
        # must NOT have pushed / created a PR
        self.assertNotIn("oh-gc pr create", out)

    def test_gitcode_backend_requires_repo_slug(self):
        self._write_state(environment="openharmony")
        cp = self._run()  # missing --repo-slug
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("--repo-slug is required", cp.stdout + cp.stderr)

    def test_successful_dry_run_navigates_to_consent_not_repair(self):
        self._write_state(environment="openharmony")
        rel = "evidence/phase8/upload_consent_request.json"
        os.makedirs(os.path.dirname(os.path.join(self.pdir, rel)), exist_ok=True)
        with open(os.path.join(self.pdir, rel), "w", encoding="utf-8") as f:
            json.dump({"repo_slug": "owner/repo", "branch": "feat/x"}, f)
        gate_upload_ci._record_result(
            self.pdir, "FAIL", "dry run prepared upload plan (no --allow-push)",
            [rel], mode="dry_run", failure_class="dry_run_no_pass",
            manifest_gate=gl.UPLOAD_CONSENT_GATE)
        cp = subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "next", "--json"],
            text=True, capture_output=True)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        data = json.loads(cp.stdout)
        self.assertEqual(data["current_substate"], "awaiting_consent")
        self.assertEqual(data["required_inputs"], ["reviewer_token"])
        repair = gl.read_control_json(self.pdir, "repairs", "current.json")
        self.assertFalse(repair.get("active", True))
        card = gl.read_control_json(self.pdir, "memory_cards", "phase8.json")
        self.assertEqual(card["next_expected_action_class"], "consent")

        precheck = gl.validate_upload_consent_entry(self.pdir)[2]
        state = gl.load_state(self.pdir)
        state["consent_tokens"]["8"] = gl.make_consent_record(
            self.run_id, 8, "reviewer", gl.entry_id(precheck))
        gl.save_state(self.pdir, state)
        data = json.loads(subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, "advance.py"),
             "--pipeline-dir", self.pdir, "next", "--json"],
            text=True, capture_output=True, check=True).stdout)
        self.assertEqual(data["current_substate"], "awaiting_gate")
        self.assertNotIn("scoped_fix", data["required_inputs"])
        self.assertEqual(data["logical_substate"]["id"], "push_pr")


class TestCIFreshness(unittest.TestCase):
    """D: the CI-freshness check that closes the 'same-PR re-push, CI still shows
    the previous commit's green' window. Pure helpers — no network."""

    def test_parse_epoch_seconds_and_millis(self):
        self.assertEqual(gate_upload_ci.parse_ci_epoch("1000000000"), 1000000000.0)
        # 13-digit -> milliseconds
        self.assertEqual(gate_upload_ci.parse_ci_epoch("1700000000000"), 1700000000.0)

    def test_parse_iso8601(self):
        # 2021-01-01T00:00:00Z == epoch 1609459200
        self.assertEqual(
            gate_upload_ci.parse_ci_epoch("2021-01-01T00:00:00Z"), 1609459200.0)
        self.assertEqual(
            gate_upload_ci.parse_ci_epoch("2021-01-01T00:00:00.123+00:00"),
            1609459200.123)

    def test_parse_unrecognized_returns_none(self):
        self.assertIsNone(gate_upload_ci.parse_ci_epoch(""))
        self.assertIsNone(gate_upload_ci.parse_ci_epoch(None))
        self.assertIsNone(gate_upload_ci.parse_ci_epoch("last Tuesday"))

    def test_fresh_when_ci_after_push(self):
        ok, _ = gate_upload_ci.ci_freshness("2000", pushed_at=1000, skew_s=300)
        self.assertTrue(ok)

    def test_stale_when_ci_before_push(self):
        # CI completed at 1000, push at 2000, skew 300 -> 1000+300 < 2000 -> stale
        ok, detail = gate_upload_ci.ci_freshness("1000", pushed_at=2000, skew_s=300)
        self.assertFalse(ok)
        self.assertIn("stale green", detail)

    def test_skew_tolerance_allows_small_backdate(self):
        # CI at 1900, push at 2000, skew 300 -> 1900+300 >= 2000 -> within tolerance
        ok, _ = gate_upload_ci.ci_freshness("1900", pushed_at=2000, skew_s=300)
        self.assertTrue(ok)

    def test_unparseable_ci_time_fails_closed_when_pushed(self):
        ok, detail = gate_upload_ci.ci_freshness("garbage", pushed_at=2000, skew_s=300)
        self.assertFalse(ok)
        self.assertIn("unparseable", detail)

    def test_no_push_skips_freshness(self):
        # re-verify path (pushed_at None): freshness not enforced, bound by sha_ok
        ok, detail = gate_upload_ci.ci_freshness("garbage", pushed_at=None, skew_s=300)
        self.assertTrue(ok)
        self.assertIn("re-verify", detail)


class TestUploadConsentTarget(unittest.TestCase):
    def test_target_change_after_consent_is_rejected(self):
        with tempfile.TemporaryDirectory() as pdir:
            path = os.path.join(pdir, "evidence", "phase8",
                                "upload_consent_request.json")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "repo_slug": "owner/repo", "branch": "feature/x",
                    "base": "master", "issue": "#123", "head_owner": "fork"
                }, f)
            ok, detail = gate_upload_ci.upload_consent_target_matches(
                pdir, repo_slug="other/repo", branch="feature/x", base="master",
                issue="#123", head_owner="fork", creating_pr=True)
            self.assertFalse(ok)
            self.assertIn("repo_slug", detail)

    def test_command_runner_does_not_interpret_shell_syntax(self):
        with tempfile.TemporaryDirectory() as temp:
            marker = os.path.join(temp, "must-not-exist")
            literal = "$(touch %s)" % marker
            cp = gate_upload_ci.run([sys.executable, "-c",
                                     "import sys; print(sys.argv[1])", literal])
            self.assertEqual(cp.returncode, 0)
            self.assertEqual(cp.stdout.strip(), literal)
            self.assertFalse(os.path.exists(marker))


class TestGerritReviewParsing(unittest.TestCase):
    """The Gerrit adapter consumes a small JSON-lines contract so the same
    deterministic gate can validate labels, patchset SHA and freshness."""

    def test_extracts_change_revision_labels_and_timestamp(self):
        change_id = "I" + "a" * 40
        sha = "b" * 40
        output = "\n".join([
            json.dumps({"type": "stats", "rowCount": 1}),
            json.dumps({
                "change_id": change_id,
                "current_revision": sha,
                "labels": {
                    "Code-Review": {"value": 2},
                    "Verified": {"value": 1},
                },
                "end_timestamp": "2000",
                "url": "https://review.example/c/1",
            }),
        ])
        parsed = gate_upload_ci.parse_gerrit_review(output, change_id)
        self.assertEqual(parsed["change_id"], change_id)
        self.assertEqual(parsed["revision"], sha)
        self.assertEqual(parsed["url"], "https://review.example/c/1")
        self.assertTrue(gate_upload_ci.gerrit_labels_green(
            parsed["labels"], {"Code-Review": 2, "Verified": 1}))
        self.assertFalse(gate_upload_ci.gerrit_labels_green(
            {"Code-Review": {"value": 1}, "Verified": {"value": 1}},
            {"Code-Review": 2, "Verified": 1}))

    def test_missing_or_mismatched_change_is_rejected(self):
        with self.assertRaises(ValueError):
            gate_upload_ci.parse_gerrit_review(
                json.dumps({"current_revision": "b" * 40, "labels": {}}),
                "I" + "a" * 40)

    def test_change_id_parser_accepts_commit_trailer_only(self):
        change_id = "I" + "c" * 40
        self.assertEqual(gate_upload_ci.parse_change_id(
            "Subject\n\nBody\nChange-Id: %s\n" % change_id), change_id)
        self.assertIsNone(gate_upload_ci.parse_change_id("Subject\n\nno trailer\n"))

    def test_missing_gerrit_query_executable_is_classified(self):
        """A missing profile executable is a deterministic query failure.

        It must not escape as an untyped FileNotFoundError (or be mistaken for
        a transient network outage), because P8 needs an actionable repair
        class and a resumable CI substate.
        """
        original = gate_upload_ci._query_ci_with_backoff

        def missing(*_args, **_kwargs):
            raise FileNotFoundError("gerrit-query")

        gate_upload_ci._query_ci_with_backoff = missing
        try:
            with self.assertRaises(gate_upload_ci.GerritQueryUnavailable) as raised:
                gate_upload_ci._query_gerrit_with_backoff(
                    ["gerrit-query"], {}, max_attempts=1, base_delay=0)
            self.assertEqual(raised.exception.code, "gerrit_query_failed")
            self.assertIn("gerrit-query", str(raised.exception))
        finally:
            gate_upload_ci._query_ci_with_backoff = original


if __name__ == "__main__":
    unittest.main()
