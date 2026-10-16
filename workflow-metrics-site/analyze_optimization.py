"""Observed comparisons; not a causal experiment and never edits raw metrics."""
import argparse
import json
from pathlib import Path
import importlib.util

_spec = importlib.util.spec_from_file_location('assessment_export', Path(__file__).with_name('export_metrics.py'))
_export = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_export)

def counts(data,phases=None):
    selected=[v for k,v in data.get('phases',{}).items() if phases is None or str(k).lstrip('P') in phases]
    return sum(v.get('gate_attempts',0) for v in selected),sum(v.get('fail_attempts',0) for v in selected)

def reduction(old,new): return (old-new)/old*100 if old and new is not None else None

def pre_upload_time(data):
    values=[v.get('effective_elapsed_seconds') for k,v in data.get('phases',{}).items() if str(k).lstrip('P')!='8']
    return sum(values) if values and all(isinstance(v,(int,float)) and not isinstance(v,bool) for v in values) else None

def assess(new,old,historical,checker_sha):
    quality = _export.recording_quality(new)
    baseline_quality = _export.recording_quality(old)
    incomplete = quality['status'] == 'incomplete' or baseline_quality['status'] == 'incomplete'
    measured_reduction = lambda a, b: None if incomplete else reduction(a, b)
    attempts,failures=counts(new);oa,of=counts(old)
    history=new.get('preflight_history') or []
    pf=sum(x.get('status')!='PASS' for x in history)
    gate_history=[a for p in new.get('phases',{}).values() for a in p.get('attempt_history',[])]
    failed=[a for a in gate_history if a.get('verdict')=='FAIL']
    review=sum(a.get('failure_kind')=='expected_review_hold' for a in failed)
    wait=sum(a.get('failure_category')=='ci_wait' for a in failed)
    npa,npf=counts(new,{str(i) for i in range(8)});opa,opf=counts(old,{str(i) for i in range(8)})
    historical_attempts=sum(counts(d)[0] for d in historical); historical_failures=sum(counts(d)[1] for d in historical)
    ns=new.get('summary') or {};os=old.get('summary') or {}
    return {'evaluated_at':'2026-10-10','run_id':new.get('run_id'),'baseline_run_id':old.get('run_id'),
        'optimization_policy_observed':bool(history) and all(x.get('policy_version')==1 for x in history),
        'checker_matches_repository':bool(history) and all(x.get('checker_sha256')==checker_sha for x in history),
        'causal_effect_proven':False, 'recording_quality':quality,
        'new_run':{'gate_attempts':attempts,'gate_failures':failures,'gate_failure_rate':failures/attempts if attempts else None,
                   'preflight_attempts':len(history),'preflight_failures':pf,'preflight_issues':sum(sum(c.get('status')!='PASS' for c in x.get('checks',[])) for x in history),
                   'all_recorded_failed_attempts':failures+pf,'review_holds':review,'ci_wait_failures':wait,
                   'other_gate_failures':failures-review-wait,'failure_fixes_recorded':sum(len(a.get('fixes',[])) for a in failed),
                   'preflight_fixes_recorded':sum(len(a.get('fixes',[])) for a in history)},
        'same_task':{'old_attempts':oa,'old_failures':of,'old_failure_rate':of/oa if oa else None,
                     'gate_failure_count_reduction_percent':measured_reduction(of,failures),
                     'combined_failure_count_reduction_percent':None,
                     'old_pre_upload_failures':opf,'new_pre_upload_failures':npf,'old_pre_upload_attempts':opa,'new_pre_upload_attempts':npa,
                     'pre_upload_failure_count_reduction_percent':measured_reduction(opf,npf),
                     'pre_upload_effective_seconds_old':pre_upload_time(old),'pre_upload_effective_seconds_new':pre_upload_time(new),
                     'pre_upload_effective_time_reduction_percent':measured_reduction(pre_upload_time(old),pre_upload_time(new)),
                     'phase_rows':[{'phase':label,'old_failures':counts(old,set(ids))[1],'new_failures':counts(new,set(ids))[1]} for label,ids in [('P1–P4',[str(i) for i in range(1,5)]),('P5–P7',['5','6','7']),('P8',['8'])]],
                     'effective_seconds_old':os.get('workflow_effective_elapsed_seconds'),'effective_seconds_new':ns.get('workflow_effective_elapsed_seconds'),
                     'effective_time_reduction_percent':measured_reduction(os.get('workflow_effective_elapsed_seconds',0),ns.get('workflow_effective_elapsed_seconds',0)),
                     'wall_seconds_old':os.get('workflow_wall_elapsed_seconds'),'wall_seconds_new':ns.get('workflow_wall_elapsed_seconds')},
        'historical':{'run_count':len(historical),'gate_attempts':historical_attempts,'gate_failures':historical_failures,
                      'failure_rate':historical_failures/historical_attempts if historical_attempts else None,
                      'failures_per_run':historical_failures/len(historical) if historical else None},
        'limitations':([quality['note']] if incomplete else []) + ['历史运行没有同等预检统计，不能计算总失败减少率。','同类任务、相同模型不代表需求范围、源码版本、设备和 CI 条件相同；单次样本不能证明因果。','没有登记修复动作；后续 PASS 只证明重跑通过，不能确定改了什么。','不删除确认停点、等待或重复失败；调整口径仅作为额外分析。']}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--new',type=Path,required=True);ap.add_argument('--baseline',type=Path,required=True)
    ap.add_argument('--historical',type=Path,nargs='+',required=True);ap.add_argument('--checker',type=Path,required=True)
    ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
    import hashlib
    read=lambda p:json.loads(p.read_text())
    report=assess(read(args.new),read(args.baseline),[read(p) for p in args.historical],hashlib.sha256(args.checker.read_bytes()).hexdigest())
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
