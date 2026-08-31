#!/usr/bin/env python3
"""Executable checks for Requirement workflow observability."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from importlib.util import module_from_spec, spec_from_file_location


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "requirement_metrics.py"
)
SPEC = spec_from_file_location("requirement_metrics", SCRIPT)
assert SPEC and SPEC.loader
metrics = module_from_spec(SPEC)
SPEC.loader.exec_module(metrics)


class RequirementMetricsTests(unittest.TestCase):
    def test_init_and_stage_skills_are_deduplicated(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "feature" / "workflow_metrics.json"
            metrics.init_metrics(
                path,
                "change-1",
                agent="codex",
                model="gpt-test",
                skills=["ohos-req-intake-orchestration"],
            )
            metrics.stage_open(path, "R1")
            metrics.record_phase_skills(path, "R1", ["skill-a", "skill-a", "skill-b"])
            data = metrics.read_metrics(path)
            self.assertEqual(list(data)[0], "execution_context")
            self.assertEqual(data["workflow"], "Requirement workflow")
            self.assertEqual(data["phases"]["R1"]["skills_used"], ["skill-a", "skill-b"])
            self.assertEqual(
                data["execution_context"]["skills"],
                ["ohos-req-intake-orchestration", "skill-a", "skill-b"],
            )

    def test_required_wait_counts_on_resolution_and_excludes_time(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "workflow_metrics.json"
            metrics.init_metrics(path, "change-2")
            metrics.stage_open(path, "R3")
            wait_id = metrics.start_human_wait(
                path,
                "R3",
                "required_workflow",
                "wait for decision",
            )
            self.assertEqual(wait_id, "human-wait-0001")
            data = metrics.read_metrics(path)
            self.assertEqual(data["human_interventions"], [])
            wait = metrics.end_human_wait(
                path,
                "R3",
                category="required_workflow",
                actor="reviewer",
                reason="accepted",
            )
            self.assertEqual(wait["status"], "completed")
            data = metrics.read_metrics(path)
            self.assertEqual(
                data["summary"]["human_interventions_by_category"]["required_workflow"],
                1,
            )
            self.assertEqual(data["summary"]["human_wait_intervals_total"], 1)

    def test_overlapping_waits_are_not_double_counted(self):
        data = {
            "phases": {"R2": metrics._empty_stage("R2")},
            "human_wait_intervals": [
                {
                    "phase": "R2",
                    "started_at_utc": "2026-08-31T00:00:00Z",
                    "ended_at_utc": "2026-08-31T00:05:00Z",
                    "exclude_from_effective_time": True,
                },
                {
                    "phase": "R2",
                    "started_at_utc": "2026-08-31T00:03:00Z",
                    "ended_at_utc": "2026-08-31T00:08:00Z",
                    "exclude_from_effective_time": True,
                },
            ],
        }
        self.assertEqual(
            metrics._excluded_wait_seconds(
                data["human_wait_intervals"], "R2", "2026-08-31T00:10:00Z"
            ),
            480,
        )

    def test_cli_json_is_valid_and_existing_run_is_not_overwritten(self):
        # The recorder is deliberately a library + CLI.  Verify its on-disk
        # contract directly, including the no-implicit-overwrite rule.
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "workflow_metrics.json"
            metrics.init_metrics(path, "change-3", agent="a", model="m")
            metrics.record_human_intervention(
                path,
                "R4",
                "user_correction",
                "boundary changed",
            )
            json.loads(path.read_text(encoding="utf-8"))
            with self.assertRaises(ValueError):
                metrics.init_metrics(path, "different-run")


if __name__ == "__main__":
    unittest.main()
