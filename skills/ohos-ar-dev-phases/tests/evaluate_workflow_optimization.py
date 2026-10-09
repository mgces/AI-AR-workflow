#!/usr/bin/env python3
"""Hermetic A/B replay of historical mechanisms, NOT real OHOS session replay."""
import argparse
import importlib.util
import inspect
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch
from xml.etree import ElementTree as ET

CASES = {
    'dfx-heading':('misleading_rejection','DFX 章节标题冲突'),
    'component-paths':('misleading_rejection','20 个组件路径被源码根前缀误判'),
    'plugin-config':('misleading_rejection','插件计数配置被要求添加注释'),
    'hwtest':('misleading_rejection','HWTEST_F 注册被漏识别'),
    'relative-header':('misleading_rejection','保护宏被绝对工作区路径影响'),
    'xdevice-environment':('misleading_rejection','远端 xdevice 配置缺 environment'),
    'hilog-pid':('misleading_rejection','正文 PID 覆盖 hilog 行头'),
    'nested-report':('misleading_rejection','本次测试报告多一层目录'),
    'clang-error':('unsafe_status','执行报错被当作工具未安装'),
    'clang-timeout':('unsafe_status','检查器超时没有结构化阻断'),
    'ordinary-license':('negative_control','普通无扩展文件仍需许可证'),
    'malformed-plugin':('negative_control','损坏插件计数仍拒绝'),
    'bare-suite':('negative_control','只写套件名而未注册仍拒绝'),
    'invalid-dfx':('negative_control','DFX 缺可测试性仍拒绝'),
    'real-special-member':('negative_control','真实特殊成员函数问题仍阻断'),
    'stale-report':('negative_control','旧运行报告仍不能代替本次报告'),
}

def worker(root):
    phases=Path(root)/'ohos-ar-dev-phases/scripts'; style=Path(root)/'code-ruleset-style-check/scripts'
    sys.path[:0]=[str(phases),str(phases/'lib'),str(style)]
    import gatelib as gl
    import gate_test_develop as td
    import gate_develop as gd
    import gate_device_func as df
    import gate_test_ut as ut
    import file_hygiene_guard as fh
    import code_ruleset_guard as guard
    checks_path=phases/'lib/workflow_checks.py'
    if checks_path.exists():
        spec=importlib.util.spec_from_file_location('workflow_checks',checks_path)
        checks=importlib.util.module_from_spec(spec); spec.loader.exec_module(checks)
    else: checks=None
    values={}
    with tempfile.TemporaryDirectory() as tmp:
        root=Path(tmp); component=root/'foundation/hiview'; component.mkdir(parents=True)
        text='## 可观测指标\n统计概览\n## DFX设计\n可观测性 hilog，可测试性与可维护性。\n'
        values['dfx-heading']=next(row[1] for row in gl.check_design_sections(text)[1] if row[0]=='DFX设计')
        paths=['src/file%d.cpp' % i for i in range(20)]
        kwargs={'source_root':str(root),'git_root':str(component)} if 'source_root' in inspect.signature(gd.changed_files_within_scope).parameters else {}
        values['component-paths']=not gd.changed_files_within_scope(['foundation/hiview/src'],paths,**kwargs)
        p=root/'bdfr_plugin_config'; p.write_text('plugins:1\nFdLeakDetectorPlugin[thread:fd_leak_detector]:0 static\npipelines:1\nFdLeakDetectorPipeline:EventValidator FdLeakDetectorPlugin SysEventStore\npipelinegroups:1\nSysEventSource:FdLeakDetectorPipeline\n')
        values['plugin-config']=not fh._license_finding(p)
        p.write_text('plugins:2\nlibbdfr.z.so\n'); values['malformed-plugin']=bool(fh._license_finding(p))
        p=root/'regular'; p.write_text('plugins:1\nlibbdfr.z.so\n'); values['ordinary-license']=bool(fh._license_finding(p))
        p=root/'test.cpp'; p.write_text('HWTEST_F(FooTest, Case, TestSize.Level1) { ASSERT_EQ(repeatRequest(), 0); }')
        contract={'test_cases':[{'gtest':'FooTest.Case','point':'repeatRequest'}]}
        values['hwtest']=not td._coverage(contract,str(root),['test.cpp'])[2]
        p.write_text('const char* s = "FooTest repeatRequest";'); values['bare-suite']=bool(td._coverage(contract,str(root),['test.cpp'])[2])
        values['xdevice-environment']=ET.fromstring(ut._xdevice_user_config({'device_serial':'SN1','connection_env':{'HDC_HOST_OVERRIDE':'localhost:8710'}})).find('environment/device') is not None
        values['hilog-pid']=df.parse_hilog_pid('09-22 12:00:00.123 321 322 I Tag: inspected pid=999')==321
        fresh=root/'fresh'; (fresh/'extra').mkdir(parents=True); (fresh/'extra/summary_report.xml').write_text('<testsuites tests="1" failures="0" errors="0"/>')
        summary=checks.fresh_summary(fresh) if checks else str(fresh/'summary_report.xml')
        values['nested-report']=Path(summary).is_file()
        (root/'old').mkdir(); (root/'old/summary_report.xml').write_text('<testsuites tests="1"/>'); (root/'new').mkdir()
        summary=checks.fresh_summary(root/'new') if checks else str(root/'new/summary_report.xml')
        values['stale-report']=not Path(summary).exists()
        bad='## DFX设计\n可观测性 hilog。\n'; values['invalid-dfx']=not next(r[1] for r in gl.check_design_sections(bad)[1] if r[0]=='DFX设计')
        (component/'include').mkdir(); header=component/'include/foo.h'; header.write_text('#ifndef HIVIEW_INCLUDE_FOO_H\n#define HIVIEW_INCLUDE_FOO_H\n#endif\n')
        (component/'compile_commands.json').write_text('[]')
        kwargs={'repository_root':component} if 'repository_root' in inspect.signature(guard._clang_tidy_findings).parameters else {}
        for name,cp in [
            ('relative-header',subprocess.CompletedProcess([],0,f'{header}:1:9: warning: wrong absolute guard [llvm-header-guard]','')),
            ('real-special-member',subprocess.CompletedProcess([],0,f'{header}:1:9: warning: missing members [cppcoreguidelines-special-member-functions]','')),
            ('clang-error',subprocess.CompletedProcess([],1,'','fatal error: header missing')),
            ('clang-timeout',subprocess.TimeoutExpired('tidy',120))]:
            try:
                with patch.object(guard.subprocess,'run',side_effect=cp if isinstance(cp,Exception) else None,return_value=cp):
                    findings,note=guard._clang_tidy_findings([header],component,'fixture-tidy',**kwargs)
                values[name]=not findings if name=='relative-header' else bool(findings) and not note
            except subprocess.TimeoutExpired: values[name]=False
    return values

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--worker'); ap.add_argument('--baseline-dir'); ap.add_argument('--output')
    args=ap.parse_args()
    if args.worker:
        print(json.dumps(worker(args.worker))); return
    if not args.baseline_dir or not args.output: ap.error('--baseline-dir and --output required')
    current=Path(__file__).resolve().parents[2]
    snapshots=[]
    for root in [Path(args.baseline_dir),current]:
        cp=subprocess.run([sys.executable,__file__,'--worker',str(root)],text=True,capture_output=True,check=True)
        snapshots.append(json.loads(cp.stdout))
    before,after=snapshots
    cases=[{'id':cid,'category':category,'description':label,'before_expected_behavior':before[cid],'after_expected_behavior':after[cid]} for cid,(category,label) in CASES.items()]
    blockers=[c for c in cases if c['category']=='misleading_rejection']
    before_bad=sum(not c['before_expected_behavior'] for c in blockers); after_bad=sum(not c['after_expected_behavior'] for c in blockers)
    report={'evaluated_at':'2026-10-09','method':'隔离进程 A/B，模拟历史失败机制；clang 输出使用确定性夹具，不是 OHOS 构建或完整会话重跑',
        'historical_gate_attempts':90,'historical_gate_failures':37,
        'misleading_rejection_scenarios':len(blockers),'before_misleading_rejections':before_bad,'after_misleading_rejections':after_bad,
        'scenario_reduction_percent':round((before_bad-after_bad)/before_bad*100,1) if before_bad else None,
        'unsafe_status_scenarios':2,'negative_controls':6,'cases':cases,
        'actual_run_failure_reduction_percent':None,
        'limitations':['样例按失败机制计数，不能分配到历史 37 次 FAIL；同一次 FAIL 可包含多个原因。','提前发现真实缺陷不算消除缺陷；预检 FAIL 与原始门禁 FAIL 均保留。','设备、完整构建、MinGW、远端 CI、真实状态隔离需要后续真实运行。','不承诺 100% 真实门禁通过率；外部平台和未知原因不能由这次本地改动消除。']}
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ('cases','limitations')},ensure_ascii=False,indent=2))
    if not all(after.values()): raise SystemExit('regression assessment has failing controls')

if __name__=='__main__': main()
