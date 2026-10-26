"""Early, reproducible checks. Preflight evidence never closes a workflow phase."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tempfile
import time
import uuid
from xml.etree import ElementTree as ET

# Static author-time scans are still executed and recorded in preflight history,
# but they are no longer the P2/P3/P4 authority: the phase gate re-runs the
# critical subset with the same changed scope and owns the verdict. Keeping
# these ids out of enforce()'s abort set prevents an observation-only finding
# from stopping the gate before it can classify it. Dependency/tool probes that
# are not static findings (rule-fingerprint, clang-tidy, ninja, ...) keep their
# existing blocking behavior.
OBSERVATION_ONLY_PREFLIGHT_IDS = frozenset({
    'author-rules', 'early-metrics', 'file-hygiene',
})

def canonical_path(value, source_root, git_root):
    """Normalize only known source/component prefixes; never arbitrary suffixes."""
    source = Path(source_root).resolve(); git = Path(git_root).resolve()
    path = Path(value)
    if '..' in path.parts or not value:
        raise ValueError('path traversal/empty path: %s' % value)
    if path.is_absolute():
        candidate = path.resolve()
    else:
        prefix = git.relative_to(source).as_posix() if git.is_relative_to(source) else ''
        if prefix and (value == prefix or value.startswith(prefix + '/')):
            candidate = (source / path).resolve()
        elif value.startswith(('foundation/', 'base/', 'developtools/', 'applications/', 'vendor/', 'device/')) and prefix:
            raise ValueError('foreign source component: %s' % value)
        else:
            candidate = (git / path).resolve()
    if not candidate.is_relative_to(git):
        raise ValueError('path outside component Git root: %s' % value)
    return candidate.relative_to(git).as_posix()

def fresh_summary(directory):
    """Search only THIS invocation's report root. Ambiguity must not pick a winner."""
    root = Path(directory).resolve()
    matches = list(root.rglob('summary_report.xml'))
    if any(p.is_symlink() or not p.resolve().is_relative_to(root) for p in matches):
        raise ValueError('summary report symlink/escape')
    if len(matches) > 1:
        raise ValueError('ambiguous fresh summary reports: %d' % len(matches))
    return str(matches[0]) if matches else str(root / 'summary_report.xml')

def elf_abi(data):
    if len(data) < 20 or data[:4] != b'\x7fELF' or data[4] not in (1,2) or data[5] not in (1,2):
        raise ValueError('real user-space ELF header required; uname is not ABI evidence')
    return (32 if data[4] == 1 else 64, int.from_bytes(data[18:20], 'little' if data[5] == 1 else 'big'))

def scene_problems(scenario, deploy=''):
    problems = []
    if re.search(r'\\\$(?:\{)?(?:GATE_NONCE|AR_NONCE)', scenario):
        problems.append('nonce is escaped; pass the expanded GATE_NONCE through argv/environment')
    restart = r'(?m)^\s*(?:stop|start|restart|killall|pkill)\s+|\b(?:ctl\.(?:start|stop)|dev_restart_once)\b'
    if re.search(restart, scenario) and re.search(restart, deploy):
        problems.append('deployment and scenario both own restart; select one lifecycle owner')
    return problems

def header_guard_problems(path, text, component):
    expected = re.sub(r'[^A-Za-z0-9]', '_', component + '/' + path).upper()
    heads = re.findall(r'^\s*#\s*ifndef\s+(\w+)', text, re.M)
    defines = re.findall(r'^\s*#\s*define\s+(\w+)', text, re.M)
    # A trailing underscore is conventional in some components; absolute host
    # directories never enter the expected name. No blanket suppression.
    if not heads or heads[0].rstrip('_') != expected.rstrip('_') or heads[0] not in defines:
        return ['header guard should use component-relative name %s' % expected]
    return []

def exported_symbol_problems(output, required):
    symbols=set()
    for line in output.splitlines():
        match=re.match(r'^\s*[0-9A-Fa-f]+\s+([A-Z])\s+(.+?)\s*$',line)
        if match and match[1]!='U': symbols.add(match[2].split('@@',1)[0])
    return ['symbol not exported/defined: '+name for name in required if name not in symbols]

def symbol_check(item, repo, protected):
    path=(Path(repo)/item['artifact']).resolve()
    if not path.is_relative_to(Path(repo).resolve()) or not path.is_file():
        return {'id':item['id'],'status':'FAIL','reason':'symbol artifact missing/outside repository'}
    nm=shutil.which('llvm-nm') or shutil.which('nm')
    if not nm: return {'id':item['id'],'status':'UNAVAILABLE','reason':'nm tool unavailable'}
    argv=[nm,'--dynamic','--defined-only','--demangle',str(path)]
    result={'id':item['id'],'argv':argv,'status':'FAIL','reason':''}
    try:
        rc,output=_command(argv,repo,120)
        # Parse the whole symbol table; truncate only the human-readable log.
        problems=exported_symbol_problems(output,item['required_symbols'])
        result.update(exit_code=rc,output=output[-4000:],missing_symbols=problems)
        if rc: result['reason']='nm failed rc=%d' % rc
        elif problems: result['reason']='; '.join(problems)
        else: result.update(status='PASS',reason='required dynamic symbols are exported/defined')
    except (OSError,subprocess.TimeoutExpired) as exc:
        result.update(status='TIMEOUT' if isinstance(exc,subprocess.TimeoutExpired) else 'UNAVAILABLE',reason=str(exc))
    result['artifact_sha256']=_hash(path)
    result['required_symbols']=item['required_symbols']
    return result

def post_build_checks(pdir,contract):
    import gatelib as gl
    state=gl.load_state(pdir)
    if state.get('optimization_policy_version')!=1: return []
    plan=contract.get('verification_plan') or {}
    items=plan.get('symbol_checks')
    if not isinstance(items,list): return []
    results=[symbol_check(item,state['repo'],plan.get('protected_paths',[])) for item in items]
    directory=Path(gl.evidence_dir(pdir,4))
    (directory/'symbol_checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    record_preflight(pdir,4,results)
    return results

def classify_failure(reason, gate=''):
    if gate.endswith(':consent-precheck'):
        return 'expected_review_hold'
    text = str(reason or '').lower()
    explicit=re.search(r'failure_category=(code_defect|external_platform|external_transport|ci_wait|environment|unknown)\b',text)
    if explicit: return explicit[1]
    if re.search(r'defect_count=[1-9]|codecheck.*(?:defect|violation)|undefined reference|compile error|assertion failed', text):
        return 'code_defect'
    if re.search(r'\be01\b.*(?:container|platform|exception)|(?:container|platform).*\be01\b|ecotest.*(?:infrastructure|platform|容器|平台)', text):
        return 'external_platform'
    if re.search(r'network|connection (?:reset|timed out)|http 50[234]|external_api_unstable', text):
        return 'external_transport'
    if re.search(r'pending|queued|not (?:started|triggered)|未触发|排队|等待.*ci', text):
        return 'ci_wait'
    if re.search(r'device.*(?:offline|empty|not found)|empty targets|abi mismatch|tool.*unavailable', text):
        return 'environment'
    return 'unknown'

def ci_failure_category(data):
    def defect_count(node, in_codecheck=False):
        if isinstance(node,dict):
            for key,value in node.items():
                is_code=in_codecheck or 'codecheck' in key.lower()
                if is_code and key.lower() in ('defect_count','defects_count','violation_count'):
                    try:
                        if int(value)>0: return True
                    except (TypeError,ValueError): pass
                if defect_count(value,is_code): return True
        elif isinstance(node,list):
            return any(defect_count(v,in_codecheck) for v in node)
        return False
    if defect_count(data): return 'code_defect'
    return classify_failure(json.dumps(data,ensure_ascii=False))

def _hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest() if Path(path).is_file() else None

def _command(argv, cwd, timeout):
    """Terminate the whole probe group on timeout, including its child compiler."""
    proc = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors='replace', start_new_session=True)
    try:
        out, _ = proc.communicate(timeout=timeout)
        return proc.returncode, out
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.communicate()
        raise

def _git_snapshot(root):
    root=Path(root)
    if not root.is_dir(): root=root.parent
    cp=subprocess.run(['git','-C',str(root),'rev-parse','--show-toplevel'],capture_output=True,text=True)
    if cp.returncode: return None
    git=Path(cp.stdout.strip())
    status=subprocess.run(['git','-C',str(git),'status','--porcelain','-z'],capture_output=True,check=True).stdout
    diff=subprocess.run(['git','-C',str(git),'diff','--binary','HEAD'],capture_output=True,check=True).stdout
    untracked=subprocess.run(['git','-C',str(git),'ls-files','--others','--exclude-standard','-z'],capture_output=True,text=True,check=True).stdout
    hashes=[(p,_hash(git/p)) for p in untracked.split('\0') if p]
    return str(git),hashlib.sha256(status+diff+json.dumps(hashes).encode()).hexdigest()

def run_job(job, repo, protected, git_roots=()):
    repo = Path(repo).resolve(); begin = time.monotonic()
    before = {}
    for rel in protected:
        path = (repo / rel).resolve()
        if not path.is_relative_to(repo):
            raise ValueError('protected path outside repo: %s' % rel)
        before[rel] = _hash(path)
    result = {'id':job.get('id','probe'), 'status':'FAIL', 'reason':'', 'argv':job.get('argv')}
    git_before=dict(snapshot for path in git_roots if (snapshot:=_git_snapshot(path)))
    report=None; old_report_stat=None
    try:
        if job.get('report_xml'):
            report=(repo/job['report_xml']).resolve()
            if not report.is_relative_to(repo): raise ValueError('test report outside repository')
            if report.is_file(): old_report_stat=(report.stat().st_mtime_ns,report.stat().st_size,_hash(report))
        argv = job.get('argv')
        if not isinstance(argv,list) or not argv or any(not isinstance(v,str) or not v for v in argv):
            raise ValueError('probe argv must be a non-empty string array')
        timeout = float(job.get('timeout',120))
        if not 0 < timeout <= 3600: raise ValueError('probe timeout must be >0 and <=3600')
        with tempfile.TemporaryDirectory(prefix='workflow-probe-') as isolated:
            cwd = repo if job.get('cwd') == 'repo' else isolated
            rc, out = _command(argv, cwd, timeout)
        result.update(exit_code=rc, output=out[-20000:])
        expected = job.get('expect')
        if rc != job.get('expected_exit',0): result['reason'] = 'probe exit=%s (expected %s)' % (rc,job.get('expected_exit',0))
        elif expected and not re.search(expected,out): result['reason'] = 'probe expected observation missing: %s' % expected
        else: result.update(status='PASS',reason='executed successfully')
        if report and result['status']=='PASS':
            from xml.etree import ElementTree as ET
            new_stat=(report.stat().st_mtime_ns,report.stat().st_size,_hash(report)) if report.is_file() else None
            if not new_stat or new_stat==old_report_stat:
                result.update(status='FAIL',reason='fresh test report required; old/missing report rejected')
            else:
                root=ET.parse(report).getroot()
                tests=int(root.get('tests','0')); failures=int(root.get('failures','0')); errors=int(root.get('errors','0'))
                result.update(report_sha256=_hash(report),tests=tests,failures=failures,errors=errors)
                if tests<=0 or failures or errors: result.update(status='FAIL',reason='test report is not non-empty and zero-failure')
    except subprocess.TimeoutExpired:
        result.update(status='TIMEOUT',reason='probe timeout')
    except (OSError,ValueError,re.error,ET.ParseError) as exc:
        result.update(status='UNAVAILABLE' if isinstance(exc,FileNotFoundError) else 'FAIL',reason=str(exc))
    touched = [rel for rel,digest in before.items() if _hash(repo/rel) != digest]
    if touched:
        result.update(status='FAIL',reason='protected dependency changed; preserved for inspection, no automatic restore: ' + ', '.join(touched))
    git_after=dict(snapshot for path in git_roots if (snapshot:=_git_snapshot(path)))
    if git_before != git_after:
        result.update(status='FAIL',reason='component/dependency Git diff changed during probe; existing dirty work preserved, inspect before manual recovery')
    if git_before:
        result.update(source_scope_sha256_before=git_before,source_scope_sha256_after=git_after)
    result['duration_seconds'] = round(time.monotonic()-begin,3)
    return result

def validate_plan(plan, contract):
    problems = []
    if not isinstance(plan,dict) or plan.get('version') != 1: return ['verification_plan.version must be 1']
    for key in ('protected_paths','build_matrix','symbol_checks','test_isolation','device_triggers'):
        if key not in plan: problems.append('verification_plan.%s missing (declare scope or explicit not_applicable reason)' % key)
    for key in ('build_matrix','symbol_checks'):
        value = plan.get(key)
        if isinstance(value,dict) and value.get('not_applicable'): continue
        if not isinstance(value,list) or not value: problems.append('%s requires executable jobs or not_applicable reason' % key); continue
        for job in value:
            if key=='symbol_checks':
                if not isinstance(job,dict) or not job.get('id') or not job.get('artifact') or not isinstance(job.get('required_symbols'),list) or not job['required_symbols']:
                    problems.append('symbol_checks requires id, artifact and required_symbols')
            elif not isinstance(job,dict) or not job.get('id') or not isinstance(job.get('argv'),list) or not job['argv']:
                problems.append('%s job requires id and argv' % key)
            elif not job.get('platform'):
                problems.append('build_matrix.%s requires declared platform (device/host/mingw as applicable)' % job['id'])
    isolation = plan.get('test_isolation',{})
    if not isinstance(isolation,dict): problems.append('test_isolation must be an object')
    elif not isolation.get('not_applicable'):
        if not isolation.get('modified_state'): problems.append('test_isolation.modified_state must document affected state')
        for name in ('before_argv','cleanup_argv'):
            if not isinstance(isolation.get(name),list) or not isolation.get(name): problems.append('test_isolation.%s missing' % name)
        modes = {r.get('id') for r in isolation.get('runs',[]) if isinstance(r,dict)}
        if not {'repeat','shuffle','independent'} <= modes: problems.append('test_isolation.runs requires repeat, shuffle and independent execution')
        for run in isolation.get('runs',[]):
            if not isinstance(run,dict) or not run.get('report_xml'):
                problems.append('test_isolation.runs requires each runner to produce a fresh report_xml')
    triggers = plan.get('device_triggers',{})
    for case in contract.get('device_cases',[]):
        cid = case.get('id'); trigger = triggers.get(cid) if isinstance(triggers,dict) else None
        if not isinstance(trigger,dict) or not trigger.get('argv') or not trigger.get('expect'):
            problems.append('device_triggers.%s needs executable trigger argv and observed expect' % cid)
        elif not isinstance(trigger.get('dependencies'),list) or not trigger.get('failure_injection'):
            problems.append('device_triggers.%s needs dependencies and failure_injection route' % cid)
        else:
            injection=trigger['failure_injection']
            if not isinstance(injection,dict) or not injection.get('argv') or not injection.get('expect'):
                problems.append('device_triggers.%s.failure_injection requires executable argv and expected observation' % cid)
    protected = plan.get('protected_paths')
    if not isinstance(protected,list) or any(not isinstance(p,str) or '..' in Path(p).parts or Path(p).is_absolute() for p in protected):
        problems.append('protected_paths must be contained repository-relative paths')
    supported=plan.get('supported_platforms',[])
    if not isinstance(supported,list) or any(p not in ('device','host','mingw') for p in supported):
        problems.append('supported_platforms must list device/host/mingw as applicable')
    elif supported:
        present={j.get('platform') for j in plan.get('build_matrix',[]) if isinstance(j,dict)} if isinstance(plan.get('build_matrix'),list) else set()
        for platform in sorted(set(supported)-present): problems.append('build_matrix missing declared supported platform '+platform)
    return problems

def run_isolation(plan, repo, protected, git_roots=()):
    results=[]
    before = run_job({'id':'state-before','argv':plan['before_argv'],'cwd':'repo'},repo,protected,git_roots=git_roots)
    results.append(before)
    if before['status']!='PASS': return results
    try:
        for job in plan.get('runs',[]): results.append(run_job(job,repo,protected,git_roots=git_roots))
    finally:
        results.append(run_job({'id':'state-cleanup','argv':plan['cleanup_argv'],'cwd':'repo'},repo,protected,git_roots=git_roots))
        after = run_job({'id':'state-after','argv':plan['before_argv'],'cwd':'repo'},repo,protected,git_roots=git_roots)
        if after.get('output') != before.get('output'):
            after.update(status='FAIL',reason='shared state not restored after tests (including failed exits)')
        results.append(after)
    return results

def tool_check(name, resolved=None):
    path = resolved or shutil.which(name)
    if not path: return {'id':'tool:'+name,'status':'UNAVAILABLE','reason':name+' tool unavailable'}
    result = run_job({'id':'tool:'+name,'argv':[path,'--version'],'timeout':10},Path.cwd(),[])
    result['resolved_path']=path
    return result

def current_scope(state):
    """Actual base-to-worktree diff, including new tests; fail on a broken Git base."""
    import gatelib as gl
    import gate_develop as develop
    git = gl.resolve_git_dir(state)
    base = state.get('base_commit') or 'HEAD'
    cp = subprocess.run(['git','-C',git,'rev-parse','--verify',base+'^{commit}'],capture_output=True,text=True)
    if cp.returncode: raise ValueError('invalid Git base_commit: %s' % base)
    changed,_tracked,untracked = develop.collect_changed_files(git,base)
    ranges = develop.changed_line_ranges(git,base,changed,untracked)
    return git,base,changed,ranges

def record_preflight(pdir,phase,results,source_hash=''):
    import gatelib as gl
    data = gl.read_workflow_metrics(pdir)
    if data:
        history = data.setdefault('preflight_history',[])
        attempt_id='preflight-%d' % (len(history)+1)
        current={r['id']:r for r in results}
        for previous in reversed(history):
            if previous['phase']==phase and previous['status']!='PASS' and not previous.get('verified_by'):
                failed_ids={r['id'] for r in previous['checks'] if r['status']!='PASS'}
                if failed_ids <= current.keys():
                    outcome='resolved' if all(current[c]['status']=='PASS' for c in failed_ids) else 'not_resolved'
                    previous.update(verified_by=attempt_id,resolution_status=outcome)
                    for fix in previous.get('fixes',[]): fix.update(verification_status=outcome,verified_by=attempt_id)
                break
        history.append({'id':attempt_id,'phase':phase,'at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
                        'status':'PASS' if all(r['status']=='PASS' for r in results) else 'FAIL',
                        'policy_version':1,'checker_sha256':_hash(__file__),
                        'source_sha256':source_hash,'checks':results})
        data['preflight_summary']={'attempts':len(history),'failed_attempts':sum(r['status']!='PASS' for r in history),
                                   'issues':sum(sum(c['status']!='PASS' for c in r['checks']) for r in history)}
        gl.write_workflow_metrics(pdir,data)

def record_preflight_fix(pdir,attempt_id,cause,action):
    import gatelib as gl
    if not cause.strip() or not action.strip(): raise ValueError('explicit cause and action required')
    data=gl.read_workflow_metrics(pdir) or {}
    attempt=next((r for r in data.get('preflight_history',[]) if r['id']==attempt_id),None)
    if not attempt or attempt['status']=='PASS': raise ValueError('failed preflight attempt not found')
    if attempt.get('verified_by'): raise ValueError('already retested; record the fix before its next verification')
    attempt.setdefault('fixes',[]).append({'cause':cause,'action':action,'at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'verification_status':'pending'})
    if not gl.write_workflow_metrics(pdir,data): raise OSError('preflight fix could not be persisted')

def stage_checks(pdir,phase,*,design=None,suites=None,scenario=None,deploy=None):
    """Run policy before expensive stage execution; standalone CLI uses same code."""
    import gatelib as gl
    state=gl.load_state(pdir); repo=Path(state['repo']).resolve(); results=[]
    def check(cid,problems): results.append({'id':cid,'status':'FAIL' if problems else 'PASS','reason':'; '.join(problems) or 'validated'})
    if phase==1:
        path=Path(design or Path(pdir)/'AR_design.md')
        text=path.read_text(encoding='utf-8')
        ok,sections,missing=gl.check_design_sections(text)
        check('design-sections',missing)
        ok,contract,detail=gl.parse_ar_contract(text)
        check('design-contract',[] if ok else [detail])
        check('design-placeholders',['line %s: %s' % hit for hit in gl.find_placeholders(text)])
        if contract:
            closure_ok,closure_problems=gl.check_contract_closure(contract)
            check('design-closure',[] if closure_ok else closure_problems)
        source_hash=_hash(path)
    else:
        ok,contract,detail=gl.load_signed_contract(pdir)
        check('signed-contract',[] if ok else [detail]); source_hash=''
    if not contract:
        record_preflight(pdir,phase,results,source_hash); return results
    plan=contract.get('verification_plan') or {}
    check('verification-plan',validate_plan(plan,contract))
    git=Path(gl.resolve_git_dir(state)).resolve()
    path_problems=[]
    for p in (contract.get('changed_files',[]) + (contract.get('change_scope') or {}).get('allowed_paths',[])):
        try: canonical_path(p,repo,git)
        except ValueError as exc: path_problems.append(str(exc))
    check('component-path-base',path_problems)
    if any(r['status']!='PASS' for r in results):
        record_preflight(pdir,phase,results,source_hash); return results
    protected=plan['protected_paths']
    source_roots=[git]
    for rel in protected:
        source_roots.append(repo/rel)
    for dependency in contract.get('dependencies',[]):
        header=repo/dependency.get('header','')
        if header.is_file():
            relative=header.relative_to(repo).as_posix()
            if relative not in protected: protected=[*protected,relative]
            source_roots.append(header.parent)
    def execute(job): return run_job(job,repo,protected,git_roots=source_roots)
    if phase==1:
        for case_id,job in (plan.get('device_triggers') or {}).items():
            if isinstance(job,dict) and job.get('argv'):
                results.append(execute({'id':case_id+':trigger',**job}))
                results.append(execute({'id':case_id+':failure-injection',**job['failure_injection']}))
    if phase in (2,3,4):
        git_dir,base,changed,ranges=current_scope(state)
        lines_path=Path(pdir)/'preflight-line-filter.json'; lines_path.write_text(json.dumps(ranges))
        style=Path(__file__).resolve().parents[3]/'code-ruleset-style-check/scripts'
        manifest=json.loads((style.parent/'data/ruleset_coverage.json').read_text())
        check('rule-fingerprint',[] if manifest.get('guard_sha256')==_hash(style/'code_ruleset_guard.py') else ['ruleset guard_sha256 differs; run build_ruleset_coverage.py from the same skill version'])
        results[-1]['guard_sha256']=_hash(style/'code_ruleset_guard.py')
        cxx=[str(Path(git_dir)/p) for p in changed if Path(p).suffix in ('.cpp','.cc','.c','.h','.hpp') and (Path(git_dir)/p).is_file()]
        if cxx:
            results.append(execute({'id':'author-rules','argv':[os.sys.executable,str(style/'code_ruleset_guard.py'),'--rules-only','--repository-root',git_dir,'--line-filter-json',str(lines_path),*cxx]}))
            results.append(tool_check('lizard'))
            results.append(execute({'id':'early-metrics','argv':[os.sys.executable,str(style/'code_ruleset_metric.py'),*cxx]}))
        text_files=[str(Path(git_dir)/p) for p in changed if (Path(git_dir)/p).is_file()]
        if text_files:
            results.append(execute({'id':'file-hygiene','argv':[os.sys.executable,str(style/'file_hygiene_guard.py'),'--cross-file-root',git_dir,'--line-filter-json',str(lines_path),*text_files]}))
    if phase==4:
        import gate_build
        import importlib.util
        guard_path=Path(__file__).resolve().parents[3]/'code-ruleset-style-check/scripts/code_ruleset_guard.py'
        spec=importlib.util.spec_from_file_location('preflight_style_guard',guard_path)
        guard=importlib.util.module_from_spec(spec); spec.loader.exec_module(guard)
        tidy=guard._resolve_clang_tool('clang-tidy',[],None,str(repo))
        if cxx:
            results.append(tool_check('clang-tidy',tidy))
            results.append(tool_check('ninja',gate_build._resolve_ninja(str(repo))))
        if isinstance(plan['build_matrix'],list):
            for job in plan['build_matrix']: results.append(execute(job))
        if isinstance(plan['symbol_checks'],list):
            results.append(tool_check('nm',shutil.which('llvm-nm') or shutil.which('nm')))
    if phase in (5,6,7):
        results.extend(device_checks(state,contract,repo))
        if any(r['status']!='PASS' for r in results):
            record_preflight(pdir,phase,results,source_hash); return results
    if phase in (5,7) and not plan['test_isolation'].get('not_applicable'):
        results.extend(run_isolation(plan['test_isolation'],repo,protected,git_roots=source_roots))
    if phase==7 and suites is not None:
        needed={str(tc.get('gtest','')).split('.')[0] for tc in contract.get('test_cases',[]) if tc.get('gtest')}
        check('required-suites',['missing suites: '+', '.join(sorted(needed-set(suites)))] if needed-set(suites) else [])
    if phase==6 and scenario:
        check('scene-lifecycle',scene_problems(Path(scenario).read_text(),Path(deploy).read_text() if deploy else ''))
    record_preflight(pdir,phase,results,source_hash)
    return results

def probe_report_collection(argv,repo):
    token=uuid.uuid4().hex
    remote='/data/local/tmp/workflow-report-probe-'+token
    result={'id':'report-collection-probe','status':'FAIL','reason':'not executed'}
    commands=[]
    try:
        with tempfile.TemporaryDirectory(prefix='workflow-report-probe-') as td:
            source=Path(td)/'summary_report.xml'
            source.write_text('<workflow-collection-probe token="'+token+'"/>')
            target=Path(td)/'recv'; target.mkdir()
            for command in [argv+['shell','mkdir -p '+remote],argv+['file','send',str(source),remote+'/summary_report.xml'],argv+['file','recv',remote,str(target)]]:
                rc,out=_command(command,repo,30); commands.append({'argv':command,'exit_code':rc,'output':out[-4000:]})
                if rc: raise ValueError('hdc collection capability probe failed rc=%d' % rc)
            summary=Path(fresh_summary(target))
            root=ET.parse(summary).getroot()
            if root.tag!='workflow-collection-probe' or root.get('token')!=token:
                raise ValueError('collected report has stale/mismatched probe token')
            result.update(status='PASS',reason='send/recv round-trip verified; probe XML is never test evidence',report_relative_path=summary.relative_to(target).as_posix())
    except (OSError,ValueError,ET.ParseError,subprocess.TimeoutExpired) as exc:
        result.update(status='FAIL',reason=str(exc))
    finally:
        try:
            rc,out=_command(argv+['shell','rm -rf '+remote],repo,15)
            commands.append({'cleanup_remote':remote,'exit_code':rc})
            if rc: result.update(status='FAIL',reason='report probe cleanup failed')
        except (OSError,subprocess.TimeoutExpired) as exc: result.update(status='FAIL',reason='report probe cleanup: '+str(exc))
    result['commands']=commands
    return result

def device_checks(state,contract,repo):
    from xml.etree import ElementTree as ET
    import gate_test_ut as ut
    conn=state.get('connection_env') or {}; serial=conn.get('DEVICE_SERIAL') or state.get('device_serial')
    override=conn.get('HDC_HOST_OVERRIDE')
    if override:
        host,sep,port=str(override).rpartition(':')
        if not sep or not host or not port.isdigit() or not 1<=int(port)<=65535:
            return [{'id':'xdevice-config','status':'FAIL','reason':'invalid explicit remote HDC endpoint; cannot fall back to local device'}]
    argv=[conn.get('HDC_BIN') or shutil.which('hdc') or 'hdc']
    if conn.get('HDC_HOST_OVERRIDE'): argv+=['-s',conn['HDC_HOST_OVERRIDE']]
    elif conn.get('HDC_WIN_PORT'):
        gateway=ut._wsl_gateway()
        if not gateway: return [{'id':'device-online','status':'UNAVAILABLE','reason':'WSL HDC gateway unavailable'}]
        argv+=['-s',gateway+':'+str(conn['HDC_WIN_PORT'])]
    result=run_job({'id':'device-list','argv':argv+['list','targets'],'expect':re.escape(serial) if serial else r'^(?!.*\[Empty\]).+','timeout':15},repo,[])
    results=[result]
    if result['status']!='PASS': return results
    targets=[s.strip() for s in result.get('output','').splitlines() if s.strip() and '[Empty]' not in s]
    if serial and serial not in [s.split()[0] for s in targets]:
        return results+[{'id':'device-target','status':'FAIL','reason':'pinned serial is absent (substring matches are insufficient)'}]
    if not serial:
        if len(targets)!=1: return results+[{'id':'device-target','status':'FAIL','reason':'exactly one online target or pinned serial required'}]
        serial=targets[0]
    argv+=['-t',serial]
    results.append(run_job({'id':'device-shell','argv':argv+['shell','echo WORKFLOW_DEVICE_READY'],'expect':'WORKFLOW_DEVICE_READY','timeout':15},repo,[]))
    if results[-1]['status']!='PASS': return results
    results.append(probe_report_collection(argv,repo))
    try:
        xml=ut._xdevice_user_config(state)
        if xml and ET.fromstring(xml).find('environment/device') is None: raise ValueError('xdevice environment/device missing')
        results.append({'id':'xdevice-config','status':'PASS','reason':'remote configuration validated' if xml else 'native local HDC connection'})
    except (ValueError,ET.ParseError) as exc: results.append({'id':'xdevice-config','status':'FAIL','reason':str(exc)})
    with tempfile.TemporaryDirectory(prefix='workflow-abi-') as td:
        remote=Path(td)/'device-sh'
        pull=run_job({'id':'device-user-elf','argv':argv+['file','recv','/system/bin/sh',str(remote)],'timeout':30},repo,[])
        results.append(pull)
        if pull['status']=='PASS':
            try:
                abi=elf_abi(remote.read_bytes())
                for rel in contract.get('build_artifacts',[]):
                    path=repo/rel
                    if path.is_file() and path.read_bytes()[:4]==b'\x7fELF':
                        actual=elf_abi(path.read_bytes()[:64])
                        results.append({'id':'abi:'+rel,'status':'PASS' if abi==actual else 'FAIL','reason':'user ELF ABI %s; artifact ABI %s' % (abi,actual)})
            except (OSError,ValueError) as exc: results.append({'id':'device-abi','status':'FAIL','reason':str(exc)})
    return results

def enforce(pdir,phase,**kwargs):
    import gatelib as gl
    state=gl.load_state(pdir)
    if state.get('optimization_policy_version') != 1: return
    try: results=stage_checks(pdir,phase,**kwargs)
    except (OSError,ValueError,KeyError,TypeError) as exc:
        results=[{'id':'preflight-backend','status':'FAIL','reason':str(exc)}]; record_preflight(pdir,phase,results)
    bad=[r for r in results if r['status']!='PASS' and
         r['id'] not in OBSERVATION_ONLY_PREFLIGHT_IDS]
    # Preserve all raw failures; a preflight FAIL isn't a signed phase verdict.
    # Static observation ids are recorded above but do not abort: the owning gate
    # applies the explicit critical-rule whitelist and signs the real verdict.
    if bad:
        if any(r['id'].startswith('device-') for r in bad):
            gl.start_human_wait(pdir,phase,'blocked_unplanned','device preflight: '+ '; '.join(r['reason'] for r in bad),source='workflow-preflight',record_intervention=False)
        raise SystemExit('P%d PRECHECK FAIL: %s' % (phase,'; '.join(r['id']+': '+r['reason'] for r in bad)))
    metrics=gl.read_workflow_metrics(pdir) or {}
    if any(w.get('phase')==phase and w.get('source')=='workflow-preflight' and not w.get('ended_at_utc') for w in metrics.get('human_wait_intervals',[])):
        gl.end_human_wait(pdir,phase,category='blocked_unplanned',reason='device preflight recovered')
