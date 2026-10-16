"""Historical failure mechanisms; successful fixtures never authorize real gates."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / 'skills/ohos-ar-dev-phases/scripts'
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / 'lib'))
import gate_device_func as device
import gate_test_develop as develop
import gate_test_ut as ut
import gatelib as gl

def load(name):
    path = ROOT / 'skills/code-ruleset-style-check/scripts' / (name + '.py')
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

hygiene = load('file_hygiene_guard')
rules = load('code_ruleset_guard')

class HistoricalRegressions(unittest.TestCase):
    def test_dfx_does_not_select_an_unrelated_observability_title(self):
        text = '## 可观测指标\n统计概览\n## DFX设计\n可观测性 hilog，可测试性与可维护性。\n'
        per = gl.check_design_sections(text)[1]
        self.assertTrue(next(row[1] for row in per if row[0]=='DFX设计'))

    def test_hilog_header_pid_wins_over_message_pid(self):
        self.assertEqual(device.parse_hilog_pid('09-22 12:00:00.123  321  322 I Tag: inspected pid=999'), 321)

    def test_hwtest_f_is_real_registration(self):
        with tempfile.TemporaryDirectory() as td:
            Path(td, 'case.cpp').write_text('HWTEST_F(FooTest, Case, TestSize.Level1) { ASSERT_EQ(repeatRequest(), 0); }')
            contract = {'test_cases': [{'gtest': 'FooTest.Case', 'point': 'repeatRequest'}]}
            self.assertEqual(develop._coverage(contract, td, ['case.cpp'])[2], [])

    def test_plugin_config_cannot_take_a_license_comment(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td, 'bdfr_plugin_config')
            path.write_text('plugins:1\nlibbdfr.z.so\n')
            self.assertEqual(hygiene._license_finding(path), [])

    def test_original_hiview_plugin_pipeline_group_format(self):
        text='''plugins:3
Faultlogger[]:0 static
BBoxDetectorPlugin[thread:bbox_detector]:0 static
FdLeakDetectorPlugin[thread:fd_leak_detector]:0 static
pipelines:3
faultloggerPipeline:EventValidator PrivacyController Faultlogger FaultloggerFilter SysEventDispatcher SysEventStore
BBoxDetectorPipeline:EventValidator PrivacyController BBoxDetectorPlugin SysEventDispatcher SysEventStore
FdLeakDetectorPipeline:EventValidator PrivacyController FdLeakDetectorPlugin SysEventDispatcher SysEventStore
pipelinegroups:1
SysEventSource:faultloggerPipeline BBoxDetectorPipeline FdLeakDetectorPipeline
'''
        with tempfile.TemporaryDirectory() as td:
            path=Path(td,'bdfr_plugin_config'); path.write_text(text)
            self.assertEqual(hygiene._license_finding(path),[])

    def test_bad_pipeline_count_still_fails(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td,'bdfr_plugin_config'); path.write_text('plugins:1\nPlugin[]:0 static\npipelines:2\nOnlyOne:Plugin\n')
            self.assertTrue(hygiene._license_finding(path))

    def test_component_descriptor_semantics_survive_filename_change(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td,'descriptor.json')
            path.write_text('{"name":"@ohos/example","component":{"name":"example","subsystem":"hiviewdfx"}}')
            self.assertIsNotNone(hygiene._json_finding(path))

    def test_plugin_bundle_data_is_not_component_metadata(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td,'plugin_bundle.json'); path.write_text('{"plugins":["resmon"]}')
            self.assertIsNone(hygiene._json_finding(path))

    def test_unrelated_extensionless_file_still_needs_license(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td, 'other_config'); path.write_text('plugins:1\nlibbdfr.z.so\n')
            self.assertTrue(hygiene._license_finding(path))

    def test_xdevice_environment_contains_device(self):
        xml = ut._xdevice_user_config({'device_serial': 'SN&1', 'connection_env': {'HDC_HOST_OVERRIDE': 'localhost:8710'}})
        root = ET.fromstring(xml)
        self.assertEqual(root.findtext('environment/device/sn'), 'SN&1')

    def test_clang_execution_failure_is_blocker_not_unavailable(self):
        with tempfile.TemporaryDirectory() as td:
            Path(td, 'compile_commands.json').write_text('[]')
            with patch.object(rules.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, '', 'fatal error: include missing')):
                findings, note = rules._clang_tidy_findings([Path(td, 'x.cpp')], td, '/fake/tidy')
            self.assertTrue(findings)
            self.assertEqual(note, '')

    def test_relative_guard_does_not_inherit_absolute_workspace_path(self):
        with tempfile.TemporaryDirectory() as td:
            repo = Path(td, 'hiperf'); (repo/'include').mkdir(parents=True)
            path=repo/'include/foo.h'; path.write_text('#ifndef HIPERF_INCLUDE_FOO_H\n#define HIPERF_INCLUDE_FOO_H\n#endif\n')
            Path(repo,'compile_commands.json').write_text('[]')
            message=f'{path}:1:9: warning: header guard should be TMP_HOME_INCLUDE_FOO_H [llvm-header-guard]'
            with patch.object(rules.subprocess,'run',return_value=subprocess.CompletedProcess([],0,message,'')):
                findings,note=rules._clang_tidy_findings([path],repo,'/fake/tidy',repository_root=repo)
            self.assertEqual(findings,[])

    def test_foreign_scope_with_same_suffix_is_rejected(self):
        import gate_develop as gd
        with tempfile.TemporaryDirectory() as td:
            component=Path(td,'foundation/hiview'); component.mkdir(parents=True)
            self.assertEqual(gd.changed_files_within_scope(['foundation/other/src'],['src/a.cpp'],source_root=td,git_root=str(component)), ['src/a.cpp'])

    def test_clang_timeout_is_recorded_as_blocker(self):
        with tempfile.TemporaryDirectory() as td:
            Path(td, 'compile_commands.json').write_text('[]')
            with patch.object(rules.subprocess, 'run', side_effect=subprocess.TimeoutExpired('tidy', 120)):
                findings, note = rules._clang_tidy_findings([Path(td, 'x.cpp')], td, '/fake/tidy')
            self.assertTrue(findings)
            self.assertEqual(note, '')

if __name__ == '__main__':
    unittest.main()
