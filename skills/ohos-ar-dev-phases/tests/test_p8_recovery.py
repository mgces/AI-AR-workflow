"""P8 retries reuse verified upload state; waits never authorize a PASS."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS / 'lib'))
import gatelib as gl
spec = importlib.util.spec_from_file_location('p8_recovery_gate', SCRIPTS / 'gate_upload_ci.py')
gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)


def pr(number=4593, owner='fork', branch='feature', base='main', sha='a'*40):
    return {'number':number, 'state':'open', 'head':{'ref':branch,'sha':sha,'repo':{'full_name':owner+'/repo'}},
            'base':{'ref':base,'repo':{'full_name':'upstream/repo'}}}


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.root = Path(self.tmp.name)
        self.pdir = str(self.root / 'pipeline'); Path(self.pdir).mkdir()
        self.secret = patch.object(gl, 'SECRET_ROOT', str(self.root / 'secrets')); self.secret.start()
        gl.create_secret('p8-recovery')
        gl.save_state(self.pdir, {'run_id':'p8-recovery','phase_scheme':gl.PHASE_SCHEME,'current_phase':8,
            'repo':str(self.root),'git_dir':str(self.root),'environment':'openharmony','base_commit':'',
            'consent_tokens':{},'phases':[{'id':i,'name':n,'status':'passed' if i<8 else 'pending'} for i,n in gl.PHASES]})
        gl.init_workflow_metrics(self.pdir, 'p8-recovery')

    def tearDown(self):
        self.secret.stop(); self.tmp.cleanup()

    def helper(self, name):
        self.assertTrue(callable(getattr(gate,name,None)), name+' must be implemented')
        return getattr(gate,name)

    def test_discovery_requires_exact_fork_branch_and_base(self):
        match=self.helper('matching_open_pr')
        self.assertEqual(match([pr(owner='other'),pr(base='release'),pr()], 'upstream/repo','fork:feature','main')['number'],4593)
        self.assertIsNone(match([pr(owner='other')], 'upstream/repo','fork:feature','main'))
        bad=pr();bad['base']['repo']['full_name']='other/repo'
        self.assertIsNone(match([bad], 'upstream/repo','fork:feature','main'))
        with self.assertRaises(ValueError):match([pr(),pr(4594)],'upstream/repo','fork:feature','main')

    def test_discovery_query_error_cannot_be_treated_as_no_pr(self):
        discover=self.helper('find_open_pr')
        with patch.object(gate,'run',return_value=subprocess.CompletedProcess([],1,'','unreachable')):
            with self.assertRaises(ValueError):discover('upstream/repo','fork:feature','main')

    def test_checkpoint_is_signed_and_bound_to_target_and_sha(self):
        save=self.helper('save_upload_checkpoint');load=self.helper('load_upload_checkpoint')
        payload={'repo_slug':'upstream/repo','branch':'feature','base':'main','head_owner':'fork','issue':'I1',
                 'pr':4593,'pushed_sha':'a'*40,'pushed_at':1000,'local_review_detail':'issues=0'}
        save(self.pdir,payload)
        self.assertEqual(load(self.pdir,'upstream/repo','feature','main','fork','a'*40)['pr'],4593)
        self.assertIsNone(load(self.pdir,'other/repo','feature','main','fork','a'*40))
        self.assertIsNone(load(self.pdir,'upstream/repo','feature','main','fork','b'*40))
        path=Path(self.pdir,'evidence/phase8/upload_checkpoint.json')
        d=json.loads(path.read_text());d['pr']=999;path.write_text(json.dumps(d))
        self.assertIsNone(load(self.pdir,'upstream/repo','feature','main','fork','a'*40))

    def test_wait_has_no_failure_or_pass_and_no_repair_loop(self):
        wait=self.helper('record_upload_wait')
        for _ in range(4):wait(self.pdir,'ci_wait','CI pending',pr_number=4593,pushed_sha='a'*40,poll_interval=120)
        p=gl.read_workflow_metrics(self.pdir)['phases']['8']
        self.assertEqual(p['fail_attempts'],0);self.assertEqual(p['pass_attempts'],0)
        self.assertEqual(len(p.get('wait_history',[])),1)
        self.assertFalse(gl.read_control_json(self.pdir,'repairs','current.json').get('active',True))
        self.assertFalse(gl.validate_closing_entry(self.pdir,8)[0])
        state=gl.read_control_json(self.pdir,'upload_review','substate.json')
        self.assertEqual(state['waiting_for'],'ci_wait')
        self.assertGreater(state['retry_after_epoch'],0)

    def test_dry_run_identical_plan_reuses_signed_consent_precheck(self):
        subprocess.run(['git','init','-q','-b','feature',str(self.root)],check=True)
        (self.root/'.gitignore').write_text('pipeline/\nsecrets/\n')
        subprocess.run(['git','-C',str(self.root),'add','.gitignore'],check=True)
        subprocess.run(['git','-C',str(self.root),'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture','--allow-empty'],check=True)
        subprocess.run(['git','-C',str(self.root),'remote','add','origin','https://gitcode.com/fork/repo.git'],check=True)
        state=gl.load_state(self.pdir)
        state['base_commit']=subprocess.check_output(['git','-C',str(self.root),'rev-parse','HEAD'],text=True).strip()
        gl.save_state(self.pdir,state)
        argv=['gate_upload_ci.py','--pipeline-dir',self.pdir,'--repo-slug','upstream/repo','--branch','feature','--base','main','--issue','I1','--head-owner','fork']
        with redirect_stdout(StringIO()):
            for _ in range(3):
                with patch.object(sys,'argv',argv):gate.main()
        entries=[e for e in gl.read_manifest(self.pdir) if e['gate']==gl.UPLOAD_CONSENT_GATE]
        self.assertEqual(len(entries),1,'identical dry run must not replace approval evidence')
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['8']['fail_attempts'],1)
        self.assertTrue(gl.validate_upload_consent_entry(self.pdir)[0])
        with redirect_stdout(StringIO()),patch.object(sys,'argv',argv+['--base','release']):gate.main()
        self.assertEqual(len([e for e in gl.read_manifest(self.pdir) if e['gate']==gl.UPLOAD_CONSENT_GATE]),2)

    def test_remote_branch_preflight_detects_non_fast_forward_without_push(self):
        check=self.helper('check_push_ancestry')
        remote=self.root/'remote.git';local=self.root/'local';peer=self.root/'peer'
        subprocess.run(['git','init','--bare','-q',str(remote)],check=True)
        subprocess.run(['git','clone','-q',str(remote),str(local)],check=True,stderr=subprocess.DEVNULL)
        subprocess.run(['git','-C',str(local),'checkout','-qb','feature'],check=True)
        def commit(path,text):
            (path/'a.txt').write_text(text);subprocess.run(['git','-C',str(path),'add','a.txt'],check=True)
            subprocess.run(['git','-C',str(path),'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm',text],check=True)
        commit(local,'initial');subprocess.run(['git','-C',str(local),'push','-qu','origin','feature'],check=True)
        self.assertTrue(check(str(local),'feature')[0])
        subprocess.run(['git','clone','-qb','feature',str(remote),str(peer)],check=True)
        commit(peer,'remote change');subprocess.run(['git','-C',str(peer),'push','-q'],check=True)
        ok,reason=check(str(local),'feature');self.assertFalse(ok);self.assertIn('non-fast-forward',reason)
        self.assertEqual((local/'a.txt').read_text(),'initial')

    def flow(self):
        component=self.root/'component';component.mkdir()
        remote=self.root/'origin.git'
        subprocess.run(['git','init','--bare','-q',str(remote)],check=True)
        subprocess.run(['git','init','-q','-b','feature',str(component)],check=True)
        subprocess.run(['git','-C',str(component),'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture','--allow-empty'],check=True)
        subprocess.run(['git','-C',str(component),'remote','add','origin',str(remote)],check=True)
        sha=subprocess.check_output(['git','-C',str(component),'rev-parse','HEAD'],text=True).strip()
        state=gl.load_state(self.pdir);state.update(git_dir=str(component),base_commit=sha)
        gl.save_state(self.pdir,state)
        argv=['gate_upload_ci.py','--pipeline-dir',self.pdir,'--repo-slug','upstream/repo','--branch','feature','--base','main','--issue','I1','--head-owner','fork']
        with redirect_stdout(StringIO()),patch.object(sys,'argv',argv):gate.main()
        signed=gl.validate_upload_consent_entry(self.pdir)[2]
        state=gl.load_state(self.pdir);state['consent_tokens']['8']=gl.make_consent_record('p8-recovery',8,'reviewer',gl.entry_id(signed));gl.save_state(self.pdir,state)
        local=self.root/'local-review.json';local.write_text('{"issue_count":0}')
        review=self.root/'pr-review.json';review.write_text('{"issue_count":0}')
        return argv+['--allow-push','--local-review-report',str(local),'--pr-review-report',str(review)],sha

    def execute(self, argv, sha, *, initial_pr=True, overall='pending', remote_sha=None):
        calls=[];real_run=gate.run
        def run(cmd,cwd=None):
            calls.append(cmd)
            if cmd[:3]==['oh-gc','pr','list']:
                # A concurrent PR appears after a create conflict.
                found=initial_pr or any(c[:3]==['oh-gc','pr','create'] for c in calls)
                return subprocess.CompletedProcess(cmd,0,json.dumps([pr(sha=remote_sha or sha)] if found else []),'')
            if cmd[:3]==['oh-gc','pr','create']:
                return subprocess.CompletedProcess(cmd,1,'','API error 409: Another open merge request already exists: !4593')
            if cmd[:3]==['oh-gc','pr','view']:
                return subprocess.CompletedProcess(cmd,0,json.dumps(pr(sha=remote_sha or sha)),'')
            return real_run(cmd,cwd=cwd)
        ci=subprocess.CompletedProcess([],0,json.dumps({'overall_result':overall,'end_timestamp':'2099-01-01T00:00:00Z'}),'')
        with redirect_stdout(StringIO()),patch.object(sys,'argv',argv),patch.object(gate,'run',side_effect=run),patch.object(gate,'_query_ci_with_backoff',return_value=(ci,1)) as query:
            try:gate.main()
            except SystemExit:pass
        return calls,query.call_count

    def test_existing_pr_and_retry_never_recreate_or_repush_while_ci_waits(self):
        argv,sha=self.flow();calls,queries=self.execute(argv,sha)
        self.assertFalse(any(c[:3]==['oh-gc','pr','create'] for c in calls),'reuse matching existing PR')
        self.assertIsNotNone(gate.load_upload_checkpoint(self.pdir,'upstream/repo','feature','main','fork',sha))
        self.assertEqual(queries,1)
        second,queries=self.execute(argv,sha)
        self.assertFalse(any(c[:3]==['oh-gc','pr','create'] or (c[0]=='git' and 'push' in c) for c in second))
        self.assertEqual(queries,0,'pending CI observes a polling interval')
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['8']['fail_attempts'],1,'only first consent hold remains')

    def test_create_conflict_requeries_and_resumes_matching_pr(self):
        argv,sha=self.flow();self.execute(argv,sha,initial_pr=False)
        self.assertIsNotNone(gate.load_upload_checkpoint(self.pdir,'upstream/repo','feature','main','fork',sha),'409 must recover a verified existing PR')
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['8']['fail_attempts'],1)

    def test_missing_pr_review_waits_with_pr_saved_and_no_ci_query(self):
        argv,sha=self.flow();pos=argv.index('--pr-review-report');argv=argv[:pos]
        _,queries=self.execute(argv,sha)
        self.assertEqual(queries,0)
        self.assertEqual(gl.read_control_json(self.pdir,'upload_review','substate.json').get('waiting_for'),'pr_review_missing')
        self.assertIsNotNone(gate.load_upload_checkpoint(self.pdir,'upstream/repo','feature','main','fork',sha))

    def test_pending_ci_does_not_hide_a_sha_mismatch(self):
        argv,sha=self.flow();self.execute(argv,sha,remote_sha='b'*40)
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['8']['fail_attempts'],2)
        self.assertFalse(gl.read_control_json(self.pdir,'upload_review','substate.json').get('waiting_for'))

    def test_resume_explains_wait_and_carries_existing_pr_command(self):
        argv,sha=self.flow();self.execute(argv,sha)
        spec=importlib.util.spec_from_file_location('p8_next',SCRIPTS/'advance.py')
        advance=importlib.util.module_from_spec(spec);spec.loader.exec_module(advance)
        action=advance._derive_next_action(self.pdir,gl.load_state(self.pdir))
        self.assertEqual(action['current_substate'],'awaiting_external')
        self.assertEqual(action['action_kind'],'wait')
        self.assertIn('--pr 4593',action['next_gate'])
        self.assertNotIn('scoped_fix',action['required_inputs'])

    def test_wait_then_green_passes_but_red_ci_still_fails(self):
        argv,sha=self.flow();self.execute(argv,sha)
        after=gate.time.time()+180
        with patch.object(gate.time,'time',return_value=after):
            calls,queries=self.execute(argv,sha,overall='success')
        self.assertEqual(queries,1)
        self.assertFalse(any(c[:3]==['oh-gc','pr','create'] for c in calls))
        self.assertTrue(gl.validate_closing_entry(self.pdir,8)[0])
        with patch.object(gate.time,'time',return_value=after+180):self.execute(argv,sha,overall='failed')
        self.assertFalse(gl.validate_closing_entry(self.pdir,8)[0])
        self.assertEqual(gl.read_workflow_metrics(self.pdir)['phases']['8']['fail_attempts'],2)

    def test_unknown_pr_identity_blocks_discovery_instead_of_creating(self):
        with patch.object(gate,'run',return_value=subprocess.CompletedProcess([],0,'[{"number":4593}]','')):
            with self.assertRaises(ValueError):gate.find_open_pr('upstream/repo','fork:feature','main')

    def test_official_cli_label_and_url_identity_is_supported(self):
        item=pr();item['head'].pop('repo');item['base'].pop('repo')
        item['head']['label']='fork:feature';item['base']['label']='upstream:main'
        item['html_url']='https://gitcode.com/upstream/repo/pull/4593'
        self.assertIsNotNone(gate.matching_open_pr([item],'upstream/repo','fork:feature','main'))
        with patch.object(gate,'run',return_value=subprocess.CompletedProcess([],0,json.dumps([item]),'')):
            self.assertEqual(gate.find_open_pr('upstream/repo','fork:feature','main')['number'],4593)
        item['html_url']='https://gitcode.com/other/repo/pull/4593'
        self.assertIsNone(gate.matching_open_pr([item],'upstream/repo','fork:feature','main'))

    def test_wrong_view_number_never_binds_ci_to_another_pr(self):
        argv,sha=self.flow();real_run=gate.run
        def run(cmd,cwd=None):
            if cmd[:3]==['oh-gc','pr','list']:return subprocess.CompletedProcess(cmd,0,json.dumps([pr(sha=sha)]),'')
            if cmd[:3]==['oh-gc','pr','view']:return subprocess.CompletedProcess(cmd,0,json.dumps(pr(999,sha=sha)),'')
            return real_run(cmd,cwd)
        with redirect_stdout(StringIO()),patch.object(sys,'argv',argv),patch.object(gate,'run',side_effect=run),patch.object(gate,'_query_ci_with_backoff',return_value=(subprocess.CompletedProcess([],0,'{"overall_result":"success","end_timestamp":"2099-01-01T00:00:00Z"}',''),1)) as ci:
            with self.assertRaises(SystemExit):gate.main()
        self.assertFalse(ci.called)

    def test_branch_block_is_saved_as_preflight_without_attempting_push(self):
        argv,sha=self.flow()
        with patch.object(gate,'check_push_ancestry',return_value=(False,'non-fast-forward: remote is ahead')):
            calls,queries=self.execute(argv,sha)
        self.assertFalse(any(c[0]=='git' and 'push' in c for c in calls))
        self.assertEqual(queries,0)
        history=gl.read_workflow_metrics(self.pdir).get('preflight_history',[])
        self.assertTrue(any(c['id']=='push-ancestry' and c['status']=='FAIL' for p in history for c in p['checks']))



if __name__=='__main__':unittest.main()
