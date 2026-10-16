import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('export_metrics',ROOT/'export_metrics.py')
export=importlib.util.module_from_spec(spec);spec.loader.exec_module(export)

class RealRunAssessmentTests(unittest.TestCase):
    def fixture(self):
        return {'schema_version':2,'run_id':'new-run','phases':{'5':{'gate_attempts':2,'fail_attempts':1,'pass_attempts':1,'last_verdict':'PASS','closed_at_utc':'2026-10-10T00:00:00Z'}},
            'preflight_summary':{'attempts':2,'failed_attempts':1,'issues':1},
            'preflight_history':[{'id':'preflight-1','phase':5,'status':'FAIL','policy_version':1,'checks':[{'id':'repeat','status':'FAIL','reason':'fresh test report required','argv':['never-publish-command'],'output':'never-publish-output'}],'fixes':[],'verified_by':'preflight-2','resolution_status':'resolved'},
                {'id':'preflight-2','phase':5,'status':'PASS','policy_version':1,'checks':[{'id':'repeat','status':'PASS'}]}]}
    def test_preflight_counts_are_independent_and_executable_details_are_not_exported(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);path=root/'workflow_metrics.json';d=self.fixture();path.write_text(json.dumps(d))
            run=export.normalize(d,path,root,[])
            self.assertEqual(run['failures'],1)
            self.assertEqual(run['preflight_summary']['failed_attempts'],1)
            self.assertEqual(run['preflight_failures'][0]['checks'][0]['id'],'repeat')
            self.assertNotIn('never-publish',json.dumps(run))
            self.assertFalse(run['preflight_failures'][0]['fixes'])
    def test_old_runs_do_not_fabricate_zero_preflight_failures(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);d=self.fixture();del d['preflight_summary'];del d['preflight_history']
            run=export.normalize(d,root/'workflow_metrics.json',root,[])
            self.assertIsNone(run['preflight_summary'])
    def test_credentials_in_git_error_are_removed_even_in_local_snapshot(self):
        self.assertNotIn('test-secret',export.clean('push failed https://oauth2:test-secret@gitcode.com/example/repo'))

class ComparisonTests(unittest.TestCase):
    def test_incomplete_history_disables_failure_and_time_reduction_claims(self):
        new = {'phases': {'1': {'gate_attempts': 1, 'fail_attempts': 0, 'effective_elapsed_seconds': 56}},
               'timing': {'history_complete': False}, 'summary': {'workflow_effective_elapsed_seconds': 56}}
        old = {'phases': {'1': {'gate_attempts': 2, 'fail_attempts': 1, 'effective_elapsed_seconds': 1800}},
               'summary': {'workflow_effective_elapsed_seconds': 1800}}
        r = self.analyzer().assess(new, old, [old], 'fixture')
        self.assertIsNone(r['same_task']['pre_upload_failure_count_reduction_percent'])
        self.assertIsNone(r['same_task']['pre_upload_effective_time_reduction_percent'])
        self.assertIsNone(r['same_task']['effective_time_reduction_percent'])
        self.assertIsNone(r['same_task']['gate_failure_count_reduction_percent'])
        self.assertEqual(r['new_run']['gate_failures'], 0)

    def analyzer(self):
        path=ROOT/'analyze_optimization.py';self.assertTrue(path.exists())
        spec=importlib.util.spec_from_file_location('assess',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
    def test_same_task_counts_can_be_unchanged_while_rates_improve(self):
        new={'run_id':'new','phases':{'0':{'gate_attempts':33,'fail_attempts':2},'8':{'gate_attempts':12,'fail_attempts':11}},'preflight_history':[{'status':'FAIL','policy_version':1}]*4,'summary':{}}
        old={'run_id':'old','phases':{'0':{'gate_attempts':27,'fail_attempts':9},'8':{'gate_attempts':5,'fail_attempts':4}},'summary':{}}
        report=self.analyzer().assess(new,old,[old],checker_sha='fixture')
        self.assertEqual(report['same_task']['gate_failure_count_reduction_percent'],0)
        self.assertAlmostEqual(report['same_task']['pre_upload_failure_count_reduction_percent'],77.7777777778)
        self.assertEqual(report['new_run']['preflight_failures'],4)
        self.assertEqual(report['new_run']['all_recorded_failed_attempts'],17)
        self.assertIsNone(report['same_task']['combined_failure_count_reduction_percent'])
    def test_history_average_is_not_compared_as_three_tasks_to_one(self):
        m=self.analyzer();new={'phases':{'8':{'gate_attempts':45,'fail_attempts':13}}};old={'phases':{'8':{'gate_attempts':30,'fail_attempts':12}}}
        result=m.assess(new,old,[old,old,old],checker_sha='fixture')
        self.assertEqual(result['historical']['failures_per_run'],12)
        self.assertAlmostEqual(result['historical']['failure_rate'],.4)
        self.assertFalse(result['causal_effect_proven'])

if __name__=='__main__':unittest.main()
