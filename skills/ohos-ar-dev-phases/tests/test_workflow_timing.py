"""Regression coverage for cumulative P1/P2/P3 work and re-initialization."""
import json
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts' / 'lib'))
import gatelib as gl


class TimingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pdir = self.tmp.name
        self.clock = patch.object(gl, '_utc_now', return_value='2026-10-10T00:00:00Z')
        self.now = self.clock.start()
        gl.init_workflow_metrics(self.pdir, 'timing-run')

    def tearDown(self):
        self.clock.stop()
        self.tmp.cleanup()

    def at(self, minute):
        self.now.return_value = '2026-10-10T00:%02d:00Z' % minute

    def test_reinit_preserves_all_three_phases_and_failures(self):
        for phase in (1, 2, 3):
            self.at(phase * 5)
            gl.observe_phase_opened(self.pdir, phase)
            gl.observe_gate_attempt(self.pdir, phase, 'FAIL', 'gate_%s.py' % phase)
            self.at(phase * 5 + 4)
            gl.observe_phase_closed(self.pdir, phase)
        before = gl.read_workflow_metrics(self.pdir)
        self.at(20)
        gl.init_workflow_metrics(self.pdir, 'timing-run')
        after = gl.read_workflow_metrics(self.pdir)
        self.assertEqual(after['started_at_utc'], before['started_at_utc'])
        for phase in ('1', '2', '3'):
            self.assertEqual(after['phases'][phase]['elapsed_seconds'], 240)
            self.assertEqual(after['phases'][phase]['fail_attempts'], 1)
            self.assertEqual(after['phases'][phase]['attempt_history'], before['phases'][phase]['attempt_history'])
        self.assertEqual(after.get('timing', {}).get('initialization_count'), 2)
        archives = list(Path(self.pdir).glob('metrics-history/*.json'))
        self.assertEqual(len(archives), 1)
        self.assertEqual(json.loads(archives[0].read_text()), before)

    def test_reinit_closes_old_active_work_at_the_boundary(self):
        self.at(1); gl.observe_phase_opened(self.pdir, 2)
        self.at(10); gl.init_workflow_metrics(self.pdir, 'timing-run')
        self.at(15); gl.observe_phase_opened(self.pdir, 1)
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['2']['elapsed_seconds'], 540)

    def test_switching_work_stops_previous_phase_and_keeps_multiple_rounds(self):
        self.at(1); gl.observe_phase_opened(self.pdir, 1)
        self.at(4); gl.observe_phase_opened(self.pdir, 2)
        self.at(8); gl.observe_phase_opened(self.pdir, 3)
        self.at(12); gl.observe_phase_opened(self.pdir, 1)
        self.at(15); gl.observe_phase_closed(self.pdir, 1)
        phases = gl.read_workflow_metrics(self.pdir)['phases']
        self.assertEqual([phases[str(i)]['elapsed_seconds'] for i in (1, 2, 3)], [360, 240, 240])
        self.assertEqual(len(phases['1']['runs']), 2)

    def test_wait_is_only_deducted_inside_recorded_rounds(self):
        d = gl.read_workflow_metrics(self.pdir)
        d['phases']['1']['runs'] = [
            {'opened_at_utc': '2026-10-10T00:00:00Z', 'closed_at_utc': '2026-10-10T00:10:00Z'},
            {'opened_at_utc': '2026-10-10T00:20:00Z', 'closed_at_utc': '2026-10-10T00:30:00Z'}]
        d['human_wait_intervals'] = [{'phase': 1, 'started_at_utc': '2026-10-10T00:05:00Z',
                                     'ended_at_utc': '2026-10-10T00:25:00Z'}]
        gl.write_workflow_metrics(self.pdir, d)
        phase = gl.read_workflow_metrics(self.pdir)['phases']['1']
        self.assertEqual(phase['human_wait_excluded_seconds'], 600)
        self.assertEqual(phase['effective_elapsed_seconds'], 600)

    def test_old_metrics_are_preserved_but_completeness_is_unknown(self):
        d = gl.read_workflow_metrics(self.pdir); d.pop('timing', None)
        Path(self.pdir, 'workflow_metrics.json').write_text(json.dumps(d))
        gl.init_workflow_metrics(self.pdir, 'timing-run')
        self.assertIsNone(gl.read_workflow_metrics(self.pdir).get('timing', {}).get('history_complete', True))

    def test_legacy_phase_without_runs_retains_its_time_on_reinit(self):
        d = gl.read_workflow_metrics(self.pdir)
        p = d['phases']['1']; p.pop('runs')
        p['opened_at_utc'] = '2026-10-10T00:01:00Z'
        p['closed_at_utc'] = '2026-10-10T00:05:00Z'
        gl.write_workflow_metrics(self.pdir, d)
        self.at(10); gl.init_workflow_metrics(self.pdir, 'timing-run')
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['1']['elapsed_seconds'], 240)

    def test_another_run_id_cannot_destroy_existing_history(self):
        before = Path(self.pdir, 'workflow_metrics.json').read_bytes()
        with self.assertRaises(ValueError):
            gl.init_workflow_metrics(self.pdir, 'another-run')
        self.assertEqual(Path(self.pdir, 'workflow_metrics.json').read_bytes(), before)

    def test_corrupt_history_is_not_silently_replaced(self):
        p = Path(self.pdir, 'workflow_metrics.json'); p.write_text('{broken')
        with self.assertRaises(ValueError):
            gl.init_workflow_metrics(self.pdir, 'timing-run')
        self.assertEqual(p.read_text(), '{broken')

    def test_explicit_work_start_keeps_gate_state_and_captures_pre_reset_work(self):
        spec = importlib.util.spec_from_file_location('timing_advance', Path(__file__).resolve().parents[1] / 'scripts' / 'advance.py')
        advance = importlib.util.module_from_spec(spec); spec.loader.exec_module(advance)
        self.assertTrue(callable(getattr(advance, 'cmd_work_start', None)), 'need a work-start entry before editing')
        from types import SimpleNamespace
        state = {'current_phase': 5, 'phases': [{'id': i, 'status': 'passed'} for i in range(6)]}
        for phase in (1, 2, 3):
            self.at(phase * 5)
            with patch.object(gl, 'pipeline_dir', return_value=self.pdir), patch.object(gl, 'load_state', return_value=state):
                advance.cmd_work_start(SimpleNamespace(pipeline_dir=self.pdir, phase=phase, reason='start amendment'))
            self.assertEqual(state['current_phase'], 5)
        self.at(20); gl.observe_phase_closed(self.pdir, 3)
        d = gl.read_workflow_metrics(self.pdir)
        self.assertEqual([d['phases'][str(i)]['elapsed_seconds'] for i in (1, 2, 3)], [300, 300, 300])
        self.assertEqual(len(d['timing']['work_starts']), 3)
        with patch.object(gl, 'pipeline_dir', return_value=self.pdir), patch.object(gl, 'load_state', return_value={'current_phase': 1}):
            with self.assertRaises(SystemExit):
                advance.cmd_work_start(SimpleNamespace(pipeline_dir=self.pdir, phase=3, reason='too early'))

    def test_force_init_keeps_metrics_but_requires_new_signed_evidence(self):
        spec = importlib.util.spec_from_file_location('timing_init', Path(__file__).resolve().parents[1] / 'scripts' / 'advance.py')
        advance = importlib.util.module_from_spec(spec); spec.loader.exec_module(advance)
        from contextlib import redirect_stdout
        from io import StringIO
        argv = ['advance.py', 'init', '--repo', self.pdir, '--run-id', 'cli-run',
                '--environment', 'openharmony', '--git-dir', 'component', '--build-target', 'example', '--part', 'example']
        with patch.object(gl, 'SECRET_ROOT', str(Path(self.pdir, 'secrets'))), redirect_stdout(StringIO()):
            with patch.object(sys, 'argv', argv): advance.main()
            pdir = str(Path(self.pdir, 'specs/pipeline/cli-run'))
            gl.emit(pdir, 0, 'gate_env_init.py', verdict='PASS', reason='old environment pass')
            gl.emit(pdir, 1, 'gate_design.py', verdict='FAIL', reason='old design problem')
            seq = len(gl.read_manifest(pdir))
            with patch.object(sys, 'argv', argv + ['--force']): advance.main()
            state = gl.load_state(pdir)
            self.assertEqual(state.get('evidence_epoch'), seq, 'force init must invalidate old signed evidence')
            self.assertEqual(state['current_phase'], 0)
            self.assertFalse(state['consent_tokens'])
            self.assertEqual(gl.read_workflow_metrics(pdir)['phases']['1']['fail_attempts'], 1)
            self.assertFalse(gl.validate_closing_entry(pdir, 0)[0])


if __name__ == '__main__':
    unittest.main()
