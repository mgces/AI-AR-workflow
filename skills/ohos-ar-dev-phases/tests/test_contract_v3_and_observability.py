#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import unittest
import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402

_GD_SPEC = importlib.util.spec_from_file_location(
    "gate_develop", os.path.join(HERE, "..", "scripts", "gate_develop.py"))
gate_develop = importlib.util.module_from_spec(_GD_SPEC)
_GD_SPEC.loader.exec_module(gate_develop)


def v3_data():
    return {
        "contract_version": "3.0",
        "requirements": [{"id": "REQ-1", "desc": "observable behavior"}],
        "acceptance_cases": [{
            "id": "AC-1", "given": "SA is stopped", "when": "feature runs",
            "then": "SA is loaded or an explicit error is returned",
            "forbidden": "silent empty result", "for_requirements": ["REQ-1"],
        }],
        "dependencies": [{
            "id": "DEP-1", "provider_repo": "base/hiviewdfx/hidumper",
            "interface": "LoadSystemAbility", "header": "isystem_ability_manager.h",
            "build_target": "//base/hiviewdfx/hidumper:hidumper_service",
            "lifecycle": "on-demand SA", "failure_behavior": "return unavailable",
            "critical": True, "status": "verified",
            "evidence": {"type": "existing_call_site", "source": "src/caller.cpp:42"},
        }],
        "change_scope": {
            "allowed_paths": ["foundation/a"],
            "public_api_change": False, "behavior_change": True,
        },
        "changed_files": [
            {"path": "foundation/a/src/plan.cpp", "for_requirements": ["REQ-1"]}
        ],
        "build_artifacts": [
            {"path": "out/liba.so", "for_requirements": ["REQ-1"]}
        ],
        "test_cases": [{
            "point": "observable behavior", "gtest": "FeatureTest.Works",
            "for_requirements": ["REQ-1"],
        }],
        "device_cases": [{
            "desc": "run feature", "marker": "FEATURE_OK", "process": "foundation",
            "for_requirements": ["REQ-1"],
        }],
    }


class ContractV3Tests(unittest.TestCase):
    def parse(self, data):
        return gl.parse_ar_contract("```ar-contract\n%s\n```" % json.dumps(data))

    def test_v3_preserves_dependency_acceptance_and_scope(self):
        ok, contract, detail = self.parse(v3_data())
        self.assertTrue(ok, detail)
        self.assertEqual(contract["version"], 3)
        self.assertEqual(contract["dependencies"][0]["interface"], "LoadSystemAbility")
        self.assertEqual(contract["acceptance_cases"][0]["id"], "AC-1")
        self.assertEqual(contract["change_scope"]["allowed_paths"], ["foundation/a"])
        self.assertTrue(gl.check_contract_closure(contract)[0])

    def test_critical_unverified_dependency_blocks_design(self):
        data = v3_data()
        data["dependencies"][0]["status"] = "blocked"
        ok, _, detail = self.parse(data)
        self.assertFalse(ok)
        self.assertIn("critical but not verified", detail)

    def test_scope_allows_file_split_but_blocks_another_component(self):
        outside = gate_develop.changed_files_within_scope(
            ["foundation/a"],
            ["foundation/a/include/b.h", "foundation/a/include/c.h",
             "foundation/other/escape.cpp"])
        self.assertEqual(outside, ["foundation/other/escape.cpp"])


class WorkflowMetricsTests(unittest.TestCase):
    def test_context_phase_time_and_intervention_categories_share_one_file(self):
        with tempfile.TemporaryDirectory() as pdir:
            gl.init_workflow_metrics(
                pdir, "run-1", agent="codex", model="gpt-test",
                skills=["workflow", "cpp"])
            gl.observe_gate_attempt(pdir, 0, "FAIL", "gate_env_init.py")
            gl.observe_phase_closed(pdir, 0, "2026-08-29T00:00:01Z")
            gl.observe_phase_opened(pdir, 1)
            gl.record_human_intervention(
                pdir, 1, "blocked_unplanned", "missing source checkout", actor="alice")
            data = gl.read_workflow_metrics(pdir)
            self.assertEqual(list(data)[0], "execution_context")
            self.assertEqual(data["execution_context"]["agent"], "codex")
            self.assertEqual(data["phases"]["0"]["gate_attempts"], 1)
            self.assertEqual(data["summary"]["human_interventions_by_category"]
                             ["blocked_unplanned"], 1)

    def test_phase_skills_and_human_wait_are_reported_and_excluded(self):
        with tempfile.TemporaryDirectory() as pdir:
            gl.init_workflow_metrics(pdir, "run-2", agent="codex", model="m")
            gl.record_phase_skills(pdir, 4, ["ohos-build-flash", "rules"])
            data = gl.read_workflow_metrics(pdir)
            phase = data["phases"]["4"]
            phase["opened_at_utc"] = "2026-08-29T00:00:00Z"
            phase["closed_at_utc"] = "2026-08-29T00:10:00Z"
            phase["runs"] = [{
                "opened_at_utc": "2026-08-29T00:00:00Z",
                "closed_at_utc": "2026-08-29T00:10:00Z",
            }]
            data["human_wait_intervals"] = [{
                "id": "human-wait-0001", "phase": 4,
                "category": "blocked_unplanned", "reason": "ask reviewer",
                "started_at_utc": "2026-08-29T00:02:00Z",
                "ended_at_utc": "2026-08-29T00:07:00Z",
                "exclude_from_effective_time": True,
            }]
            gl.write_workflow_metrics(pdir, data)
            data = gl.read_workflow_metrics(pdir)
            self.assertEqual(data["phases"]["4"]["skills_used"],
                             ["ohos-build-flash", "rules"])
            self.assertEqual(data["phases"]["4"]["elapsed_seconds"], 600)
            self.assertEqual(data["phases"]["4"]["human_wait_excluded_seconds"], 300)
            self.assertEqual(data["phases"]["4"]["effective_elapsed_seconds"], 300)

    def test_consent_gate_opens_wait_without_counting_intervention_early(self):
        with tempfile.TemporaryDirectory() as pdir:
            gl.init_workflow_metrics(pdir, "run-3")
            gl.observe_gate_attempt(pdir, 1, "PASS", "gate_design.py")
            data = gl.read_workflow_metrics(pdir)
            self.assertEqual(len(data["human_wait_intervals"]), 1)
            self.assertEqual(data["human_interventions"], [])
            wait = gl.end_human_wait(pdir, 1, category="required_workflow")
            self.assertEqual(wait["status"], "completed")


if __name__ == "__main__":
    unittest.main()
