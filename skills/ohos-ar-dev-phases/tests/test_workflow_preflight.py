"""Preflight correctness, containment, real execution and classification."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS)); sys.path.insert(0, str(SCRIPTS / 'lib'))
import gatelib as gl

class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory(); self.addCleanup(self.td.cleanup)
        self.root = Path(self.td.name)
        self.module_path = SCRIPTS / 'lib/workflow_checks.py'

    def checks(self):
        self.assertTrue(self.module_path.exists(), 'preflight implementation missing')
        spec = importlib.util.spec_from_file_location('workflow_checks', self.module_path)
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        return mod

    def test_scope_accepts_source_root_prefix(self):
        component = self.root / 'foundation/hiview'; component.mkdir(parents=True)
        self.assertEqual(self.checks().canonical_path('foundation/hiview/src/a.cpp', self.root, component), 'src/a.cpp')

    def test_scope_rejects_parent_traversal(self):
        with self.assertRaises(ValueError): self.checks().canonical_path('../other/a.cpp', self.root, self.root)

    def test_scope_does_not_suffix_match_foreign_component(self):
        component = self.root / 'foundation/hiview'; component.mkdir(parents=True)
        with self.assertRaises(ValueError): self.checks().canonical_path('foundation/other/src/a.cpp', self.root, component)

    def test_nested_fresh_report(self):
        path = self.root / 'extra/report/summary_report.xml'; path.parent.mkdir(parents=True); path.write_text('<testsuite tests="1"/>')
        self.assertEqual(Path(self.checks().fresh_summary(self.root)), path)

    def test_ambiguous_report_rejected(self):
        for sub in ['a','b']:
            path = self.root / sub / 'summary_report.xml'; path.parent.mkdir(); path.write_text('<x/>')
        with self.assertRaises(ValueError): self.checks().fresh_summary(self.root)

    def test_report_symlink_escape_rejected(self):
        (self.root/'report').mkdir(); (self.root/'summary_report.xml').write_text('<x/>')
        (self.root/'report/summary_report.xml').symlink_to(self.root/'summary_report.xml')
        with self.assertRaises(ValueError): self.checks().fresh_summary(self.root/'report')

    def test_elf_class_and_machine(self):
        self.assertEqual(self.checks().elf_abi(b'\x7fELF\x01\x01' + b'\0'*12 + b'\x28\0' + b'\0'*4), (32,40))

    def test_kernel_bitness_is_not_abi_evidence(self):
        with self.assertRaises(ValueError): self.checks().elf_abi(b'aarch64\n')

    def test_escaped_nonce_rejected(self):
        self.assertTrue(self.checks().scene_problems('echo "\\$GATE_NONCE"'))

    def test_single_restart_owner(self):
        self.assertTrue(self.checks().scene_problems('stop hiview\nstart hiview', 'stop hiview\nstart hiview'))

    def test_valid_nonce_scene(self):
        self.assertEqual(self.checks().scene_problems('echo "$GATE_NONCE"'), [])

    def test_probe_runs_in_isolation(self):
        c = self.checks(); job = {'id':'probe','argv':[sys.executable,'-c','from pathlib import Path; Path("probe.h").write_text("stub"); print("ready")'],'expect':'ready'}
        result = c.run_job(job, self.root, [])
        self.assertEqual(result['status'], 'PASS'); self.assertFalse((self.root/'probe.h').exists())

    def test_probe_detects_dependency_overwrite_without_restoring(self):
        c = self.checks(); protected = self.root/'hisysevent.h'; protected.write_text('real\n')
        job = {'id':'bad','cwd':'repo','argv':[sys.executable,'-c','from pathlib import Path; Path("hisysevent.h").write_text("stub")']}
        result = c.run_job(job, self.root, ['hisysevent.h'])
        self.assertEqual(result['status'], 'FAIL'); self.assertIn('protected', result['reason']); self.assertEqual(protected.read_text(),'stub')

    def test_timeout_is_not_clean(self):
        result = self.checks().run_job({'id':'slow','argv':[sys.executable,'-c','import time; time.sleep(5)'],'timeout':0.05}, self.root, [])
        self.assertEqual(result['status'], 'TIMEOUT')

    def test_probe_return_code_is_required(self):
        result = self.checks().run_job({'id':'bad','argv':[sys.executable,'-c','print("ok"); raise SystemExit(2)'],'expect':'ok'}, self.root, [])
        self.assertEqual(result['status'], 'FAIL')

    def test_platform_failure_is_not_code_failure(self):
        self.assertEqual(self.checks().classify_failure('CodeArts E01 container platform exception'), 'external_platform')

    def test_pending_is_wait_not_success(self):
        self.assertEqual(self.checks().classify_failure('CI pending: queued'), 'ci_wait')

    def test_code_defect_wins_over_pending_text(self):
        self.assertEqual(self.checks().classify_failure('codeCheck defect_count=2, other jobs pending'), 'code_defect')

    def test_consent_has_separate_kind(self):
        self.assertEqual(self.checks().classify_failure('hold','gate_upload_ci.py:consent-precheck'), 'expected_review_hold')

    def test_unknown_reason_remains_unknown(self):
        self.assertEqual(self.checks().classify_failure('FAIL'), 'unknown')

    def test_ci_json_code_defects_win_over_container_exception(self):
        data={'overall_result':'FAIL','codeCheck':{'defect_count':2},'build_log':'CodeArts E01 container platform exception'}
        self.assertEqual(self.checks().ci_failure_category(data),'code_defect')

    def test_ci_json_ecotest_without_platform_evidence_is_unknown(self):
        self.assertEqual(self.checks().ci_failure_category({'overall_result':'FAIL','ecotest':'failed'}),'unknown')

    def test_ci_json_pending_has_wait_category(self):
        self.assertEqual(self.checks().ci_failure_category({'overall_result':'PENDING'}),'ci_wait')

    def test_plan_requires_trigger_for_each_case(self):
        problems = self.checks().validate_plan({'version':1}, {'device_cases':[{'id':'DC-7'}]})
        self.assertTrue(any('DC-7' in p for p in problems))

    def test_plan_requires_isolation_cleanup(self):
        problems = self.checks().validate_plan({'version':1,'test_isolation':{'modified_state':['mini_debug'],'runs':[]}}, {})
        self.assertTrue(any('cleanup' in p for p in problems))

    def test_plan_cannot_claim_na_for_declared_device_cases(self):
        problems = self.checks().validate_plan({'version':1,'device_triggers':{'not_applicable':'no device'}}, {'device_cases':[{'id':'DC-8'}]})
        self.assertTrue(any('DC-8' in p for p in problems))

    def test_header_guard_uses_component_relative_name(self):
        c = self.checks()
        text = '#ifndef HIPERF_INCLUDE_FOO_H\n#define HIPERF_INCLUDE_FOO_H\n#endif\n'
        self.assertEqual(c.header_guard_problems('include/foo.h', text, 'hiperf'), [])

    def test_header_guard_wrong_name_rejected(self):
        self.assertTrue(self.checks().header_guard_problems('include/foo.h', '#ifndef TMP_FOO_H\n#define TMP_FOO_H\n#endif\n','hiperf'))

    def test_state_cleanup_runs_even_when_test_fails(self):
        c = self.checks(); flag = self.root/'flag'; flag.write_text('off')
        isolation = {'modified_state':['flag'], 'before_argv':[sys.executable,'-c','from pathlib import Path; print(Path("flag").read_text())'],
            'cleanup_argv':[sys.executable,'-c','from pathlib import Path; Path("flag").write_text("off")'],
            'runs':[{'id':'repeat','cwd':'repo','argv':[sys.executable,'-c','from pathlib import Path; Path("flag").write_text("on"); raise SystemExit(1)']} ]}
        result = c.run_isolation(isolation, self.root, [])
        self.assertEqual(flag.read_text(),'off'); self.assertTrue(any(x['status']=='FAIL' for x in result))

    def test_exported_symbol_check_ignores_undefined_symbols(self):
        problems=self.checks().exported_symbol_problems('                 U Internal::Lookup()\n000001 T Exported::Run()\n',['Internal::Lookup()'])
        self.assertTrue(problems)

    def test_exported_symbol_exact_function_match(self):
        c=self.checks()
        self.assertEqual(c.exported_symbol_problems('000001 T Exported::Run()\n',['Exported::Run()']),[])
        self.assertTrue(c.exported_symbol_problems('000001 T Exported::RunOther()\n',['Exported::Run()']))

    def test_preflight_failures_survive_metrics_write(self):
        c=self.checks(); gl.init_workflow_metrics(str(self.root),'test-optimization')
        c.record_preflight(str(self.root),4,[{'id':'lizard','status':'UNAVAILABLE','reason':'missing'}])
        c.record_preflight(str(self.root),4,[{'id':'lizard','status':'PASS','reason':'executed'}])
        metrics=gl.read_workflow_metrics(str(self.root))
        self.assertEqual(metrics['preflight_summary']['failed_attempts'],1)
        self.assertEqual(len(metrics['preflight_history']),2)

    def good_design(self):
        plan={'version':1,'protected_paths':[], 'build_matrix':{'not_applicable':'fixture has one platform'},
            'symbol_checks':{'not_applicable':'fixture no public symbols'}, 'test_isolation':{'not_applicable':'fixture no state'},
            'device_triggers':{'DC-1':{'id':'trigger-1','argv':[sys.executable,'-c','print("TRIGGER_READY")'],'expect':'TRIGGER_READY',
                'dependencies':[],'failure_injection':{'id':'inject-1','argv':[sys.executable,'-c','print("INJECTION_ROUTE_READY")'],'expect':'INJECTION_ROUTE_READY'}}}}
        contract={'contract_version':'2.0','requirements':[{'id':'R1','desc':'observable'}],
            'changed_files':[{'path':'a.cpp','for_requirements':['R1']}],
            'build_artifacts':[{'path':'out/liba.so','for_requirements':['R1']}],
            'test_cases':[{'id':'T1','point':'observable','gtest':'ATest.Case','for_requirements':['R1']}],
            'device_cases':[{'id':'DC-1','desc':'trigger','marker':'MARKER_READY','process':'service','for_requirements':['R1']}],
            'verification_plan':plan}
        text='''# Design
## 目标组件
comp
## 详细功能需求
observable
## 完整代码框架
### 文件清单
a.cpp
### 每文件功能
observable
### 代码框架
class A {};
## 完整测试框架
ohos_unittest
## 需测试的功能点
observable
## 真机测试用例构造
hdc trigger
## DFX设计
可观测性 hilog；可测试性与可维护性。
'''
        return text+'\n```ar-contract\n'+json.dumps(contract)+'\n```\n'

    def test_signed_contract_retains_verification_plan(self):
        ok,contract,detail=gl.parse_ar_contract(self.good_design())
        self.assertTrue(ok,detail); self.assertEqual(contract['verification_plan']['version'],1)

    def test_invalid_plan_is_rejected_by_real_contract_parser(self):
        text=self.good_design().replace('"version": 1','"version": 99')
        ok,contract,detail=gl.parse_ar_contract(text)
        self.assertFalse(ok); self.assertIn('verification_plan.version',detail)

    def init_state(self,phase=1):
        repo=self.root/'repo'; repo.mkdir(exist_ok=True)
        gl.save_state(str(self.root),{'run_id':'opt-fixture','repo':str(repo),'git_dir':str(repo),
            'phase_scheme':gl.PHASE_SCHEME,'current_phase':phase,'phases':[{'id':i,'name':n,'status':'pending'} for i,n in gl.PHASES],
            'optimization_policy_version':1})
        gl.init_workflow_metrics(str(self.root),'opt-fixture')
        return repo

    def test_p1_preflight_runs_actual_probe_and_records_attempt(self):
        self.init_state(); (self.root/'AR_design.md').write_text(self.good_design())
        results=self.checks().stage_checks(str(self.root),1)
        self.assertTrue(all(r['status']=='PASS' for r in results),results)
        self.assertTrue(any(r['id']=='trigger-1' and 'TRIGGER_READY' in r.get('output','') for r in results))
        metrics=gl.read_workflow_metrics(str(self.root)); self.assertEqual(metrics['preflight_summary']['attempts'],1)

    def test_invalid_design_does_not_execute_triggers(self):
        self.init_state(); (self.root/'AR_design.md').write_text(self.good_design().replace('## DFX设计','## Other'))
        results=self.checks().stage_checks(str(self.root),1)
        self.assertTrue(any(r['status']=='FAIL' for r in results))
        self.assertFalse(any(r['id']=='trigger-1' for r in results))

    def test_static_preflight_failures_do_not_abort_but_nonstatic_do(self):
        self.init_state()
        c = self.checks()
        static_only = [
            {'id': 'author-rules', 'status': 'FAIL', 'reason': 'non-critical finding'},
            {'id': 'early-metrics', 'status': 'FAIL', 'reason': 'metric observation'},
            {'id': 'file-hygiene', 'status': 'FAIL', 'reason': 'missing header'},
        ]
        with patch.object(c, 'stage_checks', return_value=static_only):
            c.enforce(str(self.root), 3)  # must not raise
        with patch.object(c, 'stage_checks', return_value=static_only + [
                {'id': 'device-online', 'status': 'FAIL', 'reason': 'offline'}]):
            with self.assertRaises(SystemExit):
                c.enforce(str(self.root), 3)
        with patch.object(c, 'stage_checks', return_value=static_only + [
                {'id': 'rule-fingerprint', 'status': 'FAIL', 'reason': 'stale'}]):
            with self.assertRaises(SystemExit):
                c.enforce(str(self.root), 3)

    def test_enforce_stops_before_signed_gate_on_failed_preflight(self):
        self.init_state(); (self.root/'AR_design.md').write_text('no contract')
        with self.assertRaises(SystemExit): self.checks().enforce(str(self.root),1)
        self.assertFalse((self.root/'evidence/manifest.jsonl').exists())
        self.assertEqual(gl.read_workflow_metrics(str(self.root))['preflight_summary']['failed_attempts'],1)

    def test_real_p1_gate_runs_optimized_checks_and_signs_plan(self):
        self.init_state(); (self.root/'AR_design.md').write_text(self.good_design())
        key_root=self.root/'keys'
        with patch.object(gl,'SECRET_ROOT',str(key_root)):
            gl.create_secret('opt-fixture')
            env={**os.environ,'LIFECYCLE_SECRET_ROOT':str(key_root)}
            cp=subprocess.run([sys.executable,str(SCRIPTS/'gate_design.py'),'--pipeline-dir',str(self.root)],env=env,text=True,capture_output=True)
            self.assertEqual(cp.returncode,0,cp.stdout+cp.stderr)
            ok,contract,detail=gl.load_signed_contract(str(self.root))
            self.assertTrue(ok,detail); self.assertEqual(contract['verification_plan']['version'],1)
            metrics=gl.read_workflow_metrics(str(self.root)); self.assertEqual(metrics['preflight_summary']['attempts'],1)
            evidence=self.root/'evidence/phase1/AR_design.md'; evidence.write_text(evidence.read_text()+'tampered')
            self.assertFalse(gl.load_signed_contract(str(self.root))[0])

    def test_timeout_reaps_spawned_children(self):
        child=self.root/'late-write'
        code='import subprocess,sys,time; subprocess.Popen([sys.executable,"-c",'+repr('import time; from pathlib import Path; time.sleep(.3); Path('+repr(str(child))+').write_text("alive")')+']); time.sleep(5)'
        result=self.checks().run_job({'id':'tree','argv':[sys.executable,'-c',code],'timeout':.08},self.root,[])
        import time; time.sleep(.4)
        self.assertEqual(result['status'],'TIMEOUT'); self.assertFalse(child.exists())

    def test_state_test_requires_fresh_zero_failure_report(self):
        report=self.root/'test.xml'; report.write_text('<testsuites tests="1" failures="0" errors="0"/>')
        result=self.checks().run_job({'id':'reuse-old','cwd':'repo','argv':[sys.executable,'-c','print("ok")'],'report_xml':'test.xml'},self.root,[])
        self.assertEqual(result['status'],'FAIL'); self.assertIn('fresh',result['reason'])

    def test_state_test_failing_report_cannot_pass_with_exit_zero(self):
        code='from pathlib import Path; Path("test.xml").write_text(\'<testsuites tests="1" failures="1" errors="0"/>\')'
        result=self.checks().run_job({'id':'red-test','cwd':'repo','argv':[sys.executable,'-c',code],'report_xml':'test.xml'},self.root,[])
        self.assertEqual(result['status'],'FAIL')

    def test_malformed_test_report_is_recorded_not_crash(self):
        code='from pathlib import Path; Path("test.xml").write_text("<bad")'
        result=self.checks().run_job({'id':'invalid-xml','cwd':'repo','argv':[sys.executable,'-c',code],'report_xml':'test.xml'},self.root,[])
        self.assertEqual(result['status'],'FAIL')

    def test_preflight_fix_and_retest_are_linked(self):
        c=self.checks(); gl.init_workflow_metrics(str(self.root),'fix-test')
        c.record_preflight(str(self.root),4,[{'id':'tools','status':'UNAVAILABLE','reason':'lizard missing'}])
        c.record_preflight_fix(str(self.root),'preflight-1','environment dependency missing','install pinned lizard')
        c.record_preflight(str(self.root),4,[{'id':'tools','status':'PASS','reason':'executed'}])
        old=gl.read_workflow_metrics(str(self.root))['preflight_history'][0]
        self.assertEqual(old['fixes'][0]['verification_status'],'resolved')
        self.assertEqual(old['verified_by'],'preflight-2')

    def test_actual_git_scope_includes_p3_new_tests_and_only_changed_lines(self):
        repo=self.root/'component'; repo.mkdir()
        subprocess.run(['git','init','-q',str(repo)],check=True)
        source=repo/'a.cpp'; source.write_text('int a = 1;\nint b = 2;\n')
        subprocess.run(['git','-C',str(repo),'add','.'],check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline'],check=True)
        source.write_text('int a = 3;\nint b = 2;\n'); (repo/'new_test.cpp').write_text('int TestCase() { return 1; }\n')
        git,base,changed,ranges=self.checks().current_scope({'repo':str(repo),'git_dir':str(repo),'base_commit':'HEAD'})
        self.assertEqual(set(changed),{'a.cpp','new_test.cpp'})
        self.assertEqual(ranges[str(source)],[[1,1]])
        self.assertEqual(ranges[str(repo/'new_test.cpp')],[[1,1]])

    def test_restart_helper_keeps_one_owner_and_one_restart(self):
        script=SCRIPTS/'lib/device.sh'
        body='source "$1"; export WORKFLOW_LIFECYCLE_DIR="$2" GATE_NONCE=nonce123; dev_shell() { echo restarted >> "$WORKFLOW_LIFECYCLE_DIR/count"; }; dev_restart_once deploy "start service"; dev_restart_once deploy "start service"; dev_restart_once scenario "start service"'
        cp=subprocess.run(['/bin/bash','-c',body,'probe',str(script),str(self.root)],text=True,capture_output=True)
        self.assertNotEqual(cp.returncode,0)
        self.assertTrue((self.root/'count').exists(),cp.stderr)
        self.assertEqual((self.root/'count').read_text().count('restarted'),1)

    def test_test_wrapper_pins_directory_and_program(self):
        body='source "$1"; dev_shell() { printf "%s" "$1"; }; dev_test_run /data/local/tmp/hiperf hiperf_test --gtest_filter=Foo.Case'
        cp=subprocess.run(['/bin/bash','-c',body,'probe',str(SCRIPTS/'lib/device.sh')],text=True,capture_output=True)
        self.assertEqual(cp.returncode,0,cp.stderr)
        self.assertIn('cd ',cp.stdout); self.assertIn('/data/local/tmp/hiperf',cp.stdout); self.assertIn('./hiperf_test',cp.stdout)

    def test_report_collection_probe_requires_same_token_and_records_nested_path(self):
        c=self.checks()
        payload={}
        def fake(argv,cwd,timeout):
            if 'send' in argv: payload['bytes']=Path(argv[-2]).read_bytes()
            if 'recv' in argv:
                p=Path(argv[-1])/'extra/summary_report.xml'; p.parent.mkdir(); p.write_bytes(payload['bytes'])
            return 0,''
        with patch.object(c,'_command',side_effect=fake):
            result=c.probe_report_collection(['hdc','-t','SN1'],self.root)
        self.assertEqual(result['status'],'PASS'); self.assertIn('extra/',result['report_relative_path'])

    def test_report_collection_probe_rejects_stale_payload(self):
        c=self.checks()
        def fake(argv,cwd,timeout):
            if 'recv' in argv:
                p=Path(argv[-1])/'summary_report.xml'; p.write_text('<workflow-collection-probe token="old"/>')
            return 0,''
        with patch.object(c,'_command',side_effect=fake):
            result=c.probe_report_collection(['hdc','-t','SN1'],self.root)
        self.assertEqual(result['status'],'FAIL')

    def test_declared_mingw_cannot_be_omitted_from_build_matrix(self):
        text=self.good_design(); contract=json.loads(text.split('```ar-contract\n')[1].split('\n```')[0])
        plan=contract['verification_plan']; plan['supported_platforms']=['device','host','mingw']
        plan['build_matrix']=[{'id':'device','platform':'device','argv':['build-device']},{'id':'host','platform':'host','argv':['build-host']}]
        self.assertTrue(any('mingw' in p for p in self.checks().validate_plan(plan,contract)))

    def test_probe_detects_unlisted_git_change_and_preserves_prior_dirty_work(self):
        repo=self.root/'dependency'; repo.mkdir(); subprocess.run(['git','init','-q',str(repo)],check=True)
        (repo/'owned.h').write_text('original'); subprocess.run(['git','-C',str(repo),'add','.'],check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','initial'],check=True)
        (repo/'owned.h').write_text('user dirty work')
        c=self.checks()
        result=c.run_job({'id':'unsafe','cwd':'repo','argv':[sys.executable,'-c','from pathlib import Path; Path("unexpected.h").write_text("stub")']},repo,[],git_roots=[repo])
        self.assertEqual(result['status'],'FAIL'); self.assertEqual((repo/'owned.h').read_text(),'user dirty work')

    def test_descriptive_failure_injection_is_not_executable_evidence(self):
        text=self.good_design(); raw=json.loads(text.split('```ar-contract\n')[1].split('\n```')[0])
        raw['verification_plan']['device_triggers']['DC-1']['failure_injection']='a description, no executable route'
        self.assertTrue(any('failure_injection' in p for p in self.checks().validate_plan(raw['verification_plan'],raw)))

    def test_exported_symbol_in_large_nm_output_is_not_lost_by_log_truncation(self):
        c=self.checks(); artifact=self.root/'lib.so'; artifact.write_bytes(b'fixture')
        output='00001 T Needed::Run()\n'+('00002 T Other::Run()\n'*3000)
        with patch.object(c,'_command',return_value=(0,output)),patch.object(c.shutil,'which',return_value='/fixture/nm'):
            result=c.symbol_check({'id':'symbol','artifact':'lib.so','required_symbols':['Needed::Run()']},self.root,[])
        self.assertEqual(result['status'],'PASS')

    def test_p4_preflight_does_not_require_not_yet_built_library(self):
        repo=self.init_state(phase=4); ok,contract,detail=gl.parse_ar_contract(self.good_design()); self.assertTrue(ok,detail)
        contract['verification_plan']['symbol_checks']=[{'id':'symbol','artifact':'out/not-yet-built.so','required_symbols':['Needed::Run()']}]
        c=self.checks()
        with (patch.object(gl,'load_signed_contract',return_value=(True,contract,'signed')),
             patch.object(c,'current_scope',return_value=(str(repo),'HEAD',[],{})),
             patch.object(c,'_command',return_value=(0,'nm version fixture')),
             patch.object(c.shutil,'which',return_value='/fixture/nm')):
            results=c.stage_checks(str(self.root),4)
        self.assertTrue(all(r['status']=='PASS' for r in results),results)

    def test_postbuild_checks_require_actual_symbols(self):
        self.init_state(phase=4); ok,contract,detail=gl.parse_ar_contract(self.good_design()); self.assertTrue(ok,detail)
        contract['verification_plan']['symbol_checks']=[{'id':'symbol','artifact':'out/missing.so','required_symbols':['Needed::Run()']}]
        results=self.checks().post_build_checks(str(self.root),contract)
        self.assertTrue(any(r['status']=='FAIL' for r in results))

if __name__ == '__main__': unittest.main()
