import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


MODULE = Path(__file__).resolve().parents[1] / 'export_metrics.py'
spec = importlib.util.spec_from_file_location('export_metrics', MODULE)
module = importlib.util.module_from_spec(spec) if MODULE.exists() else None
if module:
    spec.loader.exec_module(module)


class ExportTests(unittest.TestCase):
    def export(self, files):
        self.assertIsNotNone(module, '需要实现指标导出器')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, value in files.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(value if isinstance(value, str) else json.dumps(value))
            return module.collect(root)

    def metrics(self, **overrides):
        return dict(schema_version=2, run_id='run-a', updated_at_utc='2026-09-14T18:32:16Z',
                    phases={'0': dict(name='bootstrap', elapsed_seconds=120,
                                     human_wait_excluded_seconds=30, effective_elapsed_seconds=90,
                                     gate_attempts=3, pass_attempts=1, fail_attempts=2,
                                     last_verdict='PASS', closed_at_utc='2026-09-14T18:32:16Z')},
                    **overrides)

    def test_prefers_recorder_totals_and_keeps_failure_after_recovery(self):
        data = self.export({'specs/a/workflow_metrics.json': self.metrics(summary={
            'workflow_effective_elapsed_seconds': 80, 'workflow_wall_elapsed_seconds': 110,
            'workflow_human_wait_excluded_seconds': 30})})
        run = data['runs'][0]
        self.assertEqual(run['effective_seconds'], 80)
        self.assertEqual(run['failures'], 2)
        self.assertEqual(run['phases'][0]['status'], 'passed')
        self.assertEqual(sum(r['count'] for r in run['failure_details']), 2)

    def test_manifest_reasons_are_not_double_counted_or_exposed_raw(self):
        event = dict(phase=0, seq=1, verdict='FAIL', reason='build.sh missing',
                     gate='gate_env_init.py', hmac='DO-NOT-EXPORT', argv=['secret'])
        data = self.export({'a/workflow_metrics.json': self.metrics(),
                            'a/evidence/manifest.jsonl': json.dumps(event) + '\n' + json.dumps(event)})
        details = data['runs'][0]['failure_details']
        self.assertEqual(sum(d['count'] for d in details), 2)
        self.assertEqual(details[0]['reason'], 'build.sh missing')
        self.assertNotIn('DO-NOT-EXPORT', json.dumps(data))

    def test_requirement_attempts_do_not_invent_historical_failure_counts(self):
        metrics = dict(schema_version=2, run_id='req', workflow='requirement', result='running',
                       phases={'R2': dict(attempts=6, last_result='failed', last_note='缺少依赖证据')})
        run = self.export({'r/workflow_metrics.json': metrics})['runs'][0]
        self.assertIsNone(run['failures'])
        self.assertEqual(run['status'], 'blocked')
        self.assertEqual(run['failure_details'][0]['reason'], '缺少依赖证据')
        self.assertIsNone(run['failure_details'][0]['count'])

    def test_null_times_stay_unknown_and_zero_remains_zero(self):
        metrics = dict(schema_version=2, run_id='zero', phases={
            '0': dict(elapsed_seconds=0, effective_elapsed_seconds=0),
            '1': dict(elapsed_seconds=None, effective_elapsed_seconds=None)})
        phases = self.export({'a/workflow_metrics.json': metrics})['runs'][0]['phases']
        self.assertEqual(phases[0]['effective_seconds'], 0)
        self.assertIsNone(phases[1]['effective_seconds'])

    def test_ignores_broken_file_but_reports_it(self):
        data = self.export({'good/workflow_metrics.json': self.metrics(),
                            'bad/workflow_metrics.json': '{broken',
                            'invalid/workflow_metrics.json': {'phases': {'0': []}}})
        self.assertEqual(len(data['runs']), 1)
        self.assertEqual(len(data['warnings']), 2)

    def test_deduplicates_run_snapshots_by_latest_timestamp(self):
        old = self.metrics()
        new = self.metrics()
        new['updated_at_utc'] = '2026-09-15T18:32:16Z'
        new['phases']['0']['effective_elapsed_seconds'] = 200
        data = self.export({'archive/workflow_metrics.json': old, 'live/workflow_metrics.json': new})
        self.assertEqual(len(data['runs']), 1)
        self.assertEqual(data['runs'][0]['effective_seconds'], 200)
        self.assertEqual(data['duplicate_count'], 1)

    def test_scan_excludes_dependencies_and_exports(self):
        data = self.export({'a/workflow_metrics.json': self.metrics(),
                            'node_modules/x/workflow_metrics.json': self.metrics(),
                            '.git/workflow_metrics.json': self.metrics()})
        self.assertEqual(data['source_count'], 1)

    def test_failed_phase_is_not_failed_workflow_after_later_phase_opened(self):
        metrics = self.metrics()
        metrics['phases']['0']['last_verdict'] = 'FAIL'
        metrics['phases']['1'] = dict(opened_at_utc='2026-09-15T00:00:00Z', runs=[{}])
        run = self.export({'a/workflow_metrics.json': metrics})['runs'][0]
        self.assertEqual(run['status'], 'running')

    def test_export_redacts_paths_and_credential_assignments(self):
        event = dict(phase=0, seq=0, verdict='FAIL', reason='repo /home/alice/private; token=abc123', gate='env')
        data = self.export({'a/workflow_metrics.json': self.metrics(),
                            'a/evidence/manifest.jsonl': json.dumps(event)})
        text = json.dumps(data)
        self.assertNotIn('/home/alice', text)
        self.assertNotIn('abc123', text)

    def test_no_data_is_valid(self):
        self.assertEqual(self.export({})['runs'], [])

    def test_repair_uses_most_recently_opened_phase_not_highest_phase(self):
        metrics = self.metrics()
        metrics['phases'] = {
            '4': dict(opened_at_utc='2026-09-24T08:00:00Z', last_verdict='FAIL'),
            '8': dict(opened_at_utc='2026-09-24T07:00:00Z', last_verdict='PASS')}
        run = self.export({'a/workflow_metrics.json': metrics})['runs'][0]
        self.assertEqual(run['current_phase'], 'P4')
        self.assertEqual(run['status'], 'blocked')

    def test_public_snapshot_removes_internal_diagnostics_but_keeps_counts(self):
        self.assertTrue(hasattr(module, 'public_snapshot'), '需要实现公开快照去敏')
        snapshot = {'source_label': 'repo', 'runs': [{
            'id': 'run-a', 'source': 'products/.run/run-a/workflow_metrics.json',
            'failures': 3, 'effective_seconds': 120,
            'phases': [{'id': 'P4', 'skills': ['internal-tool']}],
            'human_interventions': [{'phase': 'P4', 'category': 'blocked_unplanned',
                                     'reason': 'hdc 172.23.160.1:10086 /data/service/private.pem token=abc'}],
            'failure_details': [{'phase': 'P4', 'gate': 'gate_build.py', 'count': 3,
                                 'reason': 'failed at core/private.cpp 172.23.160.1'}]}],
            'warnings': ['products/.run/run-a/internal.log failed']}
        public = module.public_snapshot(snapshot)
        text = json.dumps(public)
        self.assertEqual(public['runs'][0]['failures'], 3)
        self.assertEqual(public['runs'][0]['effective_seconds'], 120)
        for secret in ('172.23.160.1', '/data/service', 'private.pem', 'token=abc'):
            self.assertNotIn(secret, text)
        self.assertIn('hdc', text)
        self.assertIn('internal-tool', text)
        self.assertIn('products/.run/run-a/workflow_metrics.json', text)
        self.assertIn('core/private.cpp', text)
        self.assertIn('build.sh missing' if 'build.sh missing' in text else 'failed at', text)
        self.assertTrue(public['redacted'])

    def test_attempt_history_reports_each_fix_and_first_failure_without_duplication(self):
        metrics = self.metrics()
        metrics['phases']['0']['attempt_history'] = [
            dict(id='manifest:0', manifest_seq=0, gate='gate_env_init.py',
                 verdict='FAIL', reason='missing build.sh', at_utc='2026-09-14T18:00:00Z',
                 round=1, first_attempt=True, failure_kind='gate_failure',
                 resolution_status='not_resolved', fixes=[dict(root_cause='wrong OHOS_ROOT', action='set source root',
                 change_ref='env:OHOS_ROOT', verification_verdict='FAIL')]),
            dict(id='manifest:1', manifest_seq=1, gate='gate_env_init.py',
                 verdict='FAIL', reason='developer_test absent', round=1,
                 first_attempt=False, failure_kind='gate_failure',
                 resolution_status='resolved', verified_by='manifest:2',
                 fixes=[dict(action='sync developer_test', change_ref='repo sync',
                 verification_verdict='PASS')]),
        ]
        metrics['summary'] = dict(first_gate_attempts_total=1,
                                  first_gate_failures_total=1,
                                  first_gate_passes_total=0,
                                  first_gate_review_holds_total=0)
        event = dict(seq=0, phase=0, verdict='FAIL', gate='gate_env_init.py',
                     reason='missing build.sh')
        data = self.export({'a/workflow_metrics.json': metrics,
                            'a/evidence/manifest.jsonl': json.dumps(event)})
        run = data['runs'][0]
        self.assertEqual(len(run['failure_details']), 2)
        self.assertEqual([d['reason'] for d in run['failure_details']],
                         ['missing build.sh', 'developer_test absent'])
        self.assertTrue(run['failure_details'][0]['first_attempt'])
        self.assertIn('root_cause', run['failure_details'][0]['fixes'][0])
        self.assertEqual(run['failure_details'][0]['fixes'][0]['root_cause'], 'wrong OHOS_ROOT')
        self.assertEqual(run['failure_details'][1]['fixes'][0]['verification_verdict'], 'PASS')
        self.assertEqual(run['first_gate_failures'], 1)

    def test_public_snapshot_hides_fix_action_and_change_reference(self):
        snapshot = {'runs': [{'source': 'private', 'human_interventions': [], 'phases': [],
                              'failure_details': [{'reason': 'missing build.sh',
                              'source': 'internal', 'gate': 'gate_build.py',
                              'fixes': [{'action': 'edit /home/alice/secret.cpp',
                                         'root_cause': 'uses 172.23.160.1 /private/key.pem',
                                         'change_ref': 'private config',
                                         'verification_verdict': 'PASS'}]}]}]}
        public = module.public_snapshot(snapshot)
        serialized = json.dumps(public)
        self.assertNotIn('/home/alice', serialized)
        self.assertNotIn('172.23.160.1', serialized)
        self.assertNotIn('private.pem', serialized)
        self.assertIn('private config', serialized)
        self.assertIn('edit', serialized)
        self.assertEqual(public['runs'][0]['failure_details'][0]['fixes'][0]
                         ['verification_verdict'], 'PASS')

    def test_public_snapshot_preserves_useful_intervention_text(self):
        snapshot={'runs':[{'id':'run-a','source':'products/.run/run-a/workflow_metrics.json',
                           'human_interventions':[{'category':'blocked_unplanned',
                           'reason':'P5 needs physical device: hdc 172.23.160.1:10086 reports [Empty] targets; built out/rk3568/tests/ut'}],
                           'phases':[],'failure_details':[]}]}
        public=module.public_snapshot(snapshot)
        reason=public['runs'][0]['human_interventions'][0]['reason']
        self.assertIn('P5 needs physical device',reason)
        self.assertIn('reports [Empty] targets',reason)
        self.assertNotIn('172.23.160.1',reason)
        self.assertNotEqual(reason,'详细说明仅在本地版提供')

    def test_public_snapshot_masks_bearer_credentials_and_email_within_text(self):
        snapshot={'runs':[{'id':'r','human_interventions':[{'reason':
            'P4 failed; Authorization: Bearer abc123; ask alice@example.com; serial=DEVICE-42'}],
            'phases':[],'failure_details':[]}]}
        public=module.public_snapshot(snapshot)
        reason=public['runs'][0]['human_interventions'][0]['reason']
        self.assertIn('P4 failed',reason)
        for secret in ('abc123','alice@example.com','DEVICE-42'):
            self.assertNotIn(secret,reason)

    def test_exports_only_open_wait_reasons_with_public_redaction(self):
        metrics = self.metrics(summary={'human_wait_open_count': 1},
            human_wait_intervals=[
                {'phase': '5', 'category': 'blocked_unplanned',
                 'reason': 'hdc 172.23.160.1:10086 掉线，等待重连',
                 'started_at_utc': '2026-09-28T09:00:00Z'},
                {'phase': '4', 'reason': '旧等待', 'started_at_utc': '2026-09-27T09:00:00Z',
                 'ended_at_utc': '2026-09-27T10:00:00Z'}])
        metrics['phases']['0']['closed_at_utc'] = None
        run = self.export({'a/workflow_metrics.json': metrics})['runs'][0]
        self.assertEqual(run['status'], 'waiting')
        self.assertEqual(len(run['open_wait_details']), 1)
        self.assertEqual(run['open_wait_details'][0]['phase'], 'P5')
        public = module.public_snapshot({'runs': [run]})['runs'][0]
        self.assertIn('等待重连', public['open_wait_details'][0]['reason'])
        self.assertNotIn('172.23.160.1', public['open_wait_details'][0]['reason'])

    def test_session_analysis_preserves_phase_context_without_inventing_attempts(self):
        metrics = self.metrics(session_failure_analysis={
            'source': 'session.zip',
            'scope': '阶段级整理，无法逐次归因',
            'later_outcome': '后来通过',
            'findings': [{'phase': '4', 'reason': 'hdc 172.23.160.1:10086 设备离线',
                          'action': '重连设备', 'outcome': '重跑通过',
                          'basis': '会话明确说明', 'evidence_refs': ['main#449']}],
        })
        run = self.export({'a/workflow_metrics.json': metrics})['runs'][0]
        self.assertEqual(run['failures'], 2)
        self.assertEqual(sum(item['count'] for item in run['failure_details']), 2)
        analysis = run['session_failure_analysis']
        self.assertEqual(analysis['findings'][0]['phase'], 'P4')
        self.assertEqual(analysis['findings'][0]['evidence_refs'], ['main#449'])
        public = module.public_snapshot({'runs': [run]})['runs'][0]
        self.assertIn('设备离线', public['session_failure_analysis']['findings'][0]['reason'])
        self.assertNotIn('172.23.160.1', json.dumps(public))


if __name__ == '__main__':
    unittest.main()
