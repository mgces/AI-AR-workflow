#!/usr/bin/env python3
"""Export an allowlisted, read-only snapshot of repository workflow metrics."""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
from shutil import copy2

SKIP = {'.git', 'node_modules', '.venv', '__pycache__', '.sites-runtime', 'dist', 'build'}
FAILED = {'FAIL', 'FAILED', 'ERROR', 'BLOCKED', 'REJECTED', 'NOT_READY'}
PASSED = {'PASS', 'PASSED', 'COMPLETED', 'ACCEPTED', 'SUCCESS', 'READY'}


def clean(value):
    text = str(value or '')
    text = re.sub(r'(?:/home/|/Users/|/mnt/[a-z]/Users/)[^\s;\'\"]+', '[本机路径]', text)
    text = re.sub(r'[A-Za-z]:[\\/][^\s;\'\"]+', '[本机路径]', text)
    text = re.sub(r'(?i)\b(token|password|secret|api_key|authorization)\s*[:=]\s*\S+', r'\1=[已隐藏]', text)
    return text[:3000]


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0 else None


def total(values):
    known = [value for value in values if value is not None]
    return sum(known) if known else None


def phase_key(value):
    text = str(value)
    return ('R' if text.upper().startswith('R') else 'P') + re.sub(r'^[PRpr]', '', text)


def sort_phase(value):
    digits = re.search(r'\d+', str(value))
    return int(digits.group()) if digits else 999


def category(reason, gate):
    text = (reason + ' ' + gate).lower()
    if 'consent-precheck' in text:
        return '待人工确认'
    if any(s in text for s in ('source root', 'build.sh', '环境', 'toolchain', 'dependency', '依赖')):
        return '环境与依赖'
    if any(s in text for s in ('test', 'assert', '测试', 'coverage', '覆盖')):
        return '测试与验证'
    if any(s in text for s in ('build', 'compile', '编译', '构建')):
        return '编译构建'
    if any(s in text for s in ('device', 'hdc', '设备')):
        return '设备连接'
    if '未记录' in text:
        return '原因缺失'
    return '其他门禁问题'


def evidence_events(path, root, warnings):
    manifest = path.parent / 'evidence' / 'manifest.jsonl'
    if not manifest.is_file() or manifest.is_symlink():
        return []
    events, seen = [], set()
    for line_number, line in enumerate(manifest.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
            if not isinstance(event, dict):
                raise ValueError('invalid event')
        except (ValueError, TypeError):
            warnings.append(f'{manifest.relative_to(root)}:{line_number} 证据行无法解析，已跳过')
            continue
        identity = event.get('seq', json.dumps(event, sort_keys=True))
        identity = str(identity)
        if identity in seen:
            continue
        seen.add(identity)
        if str(event.get('verdict', '')).upper() == 'FAIL':
            events.append(dict(id=f"manifest:{event['seq']}" if isinstance(event.get('seq'), int) else f"line:{line_number}",
                               phase=phase_key(event.get('phase', '')), gate=clean(event.get('gate')),
                               reason=clean(event.get('reason')) or '未记录具体失败原因',
                               at=clean(event.get('ts_utc')), source=str(manifest.relative_to(root))))
    return events


def normalize(data, path, root, warnings):
    raw_phases = data.get('phases')
    if not isinstance(raw_phases, dict) or not raw_phases or any(not isinstance(p, dict) for p in raw_phases.values()):
        raise ValueError('phases 必须是非空阶段对象')
    if data.get('schema_version') != 2:
        raise ValueError('仅支持仓库 schema_version 2')
    requirement = any(str(p).upper().startswith('R') for p in raw_phases)
    workflow = clean(data.get('workflow')) or ('requirement' if requirement else 'ar-development')
    phases, details = [], []
    events = evidence_events(path, root, warnings)
    for key, item in sorted(raw_phases.items(), key=lambda pair: sort_phase(pair[0])):
        pid = phase_key(key)
        wall = number(item.get('elapsed_seconds'))
        wait = number(item.get('human_wait_excluded_seconds'))
        effective = number(item.get('effective_elapsed_seconds'))
        if effective is None and wall is not None and wait is not None:
            effective = max(0, wall - wait)
        verdict = str(item.get('last_verdict') or item.get('last_result') or '').upper().replace(' ', '_')
        active = bool(item.get('opened_at_utc') or item.get('runs') or wall is not None or verdict)
        status = 'failed' if verdict in FAILED else 'passed' if verdict in PASSED else 'running' if active else 'pending'
        failure_count = number(item.get('fail_attempts'))
        attempts = number(item.get('gate_attempts'))
        phase = dict(id=pid, name=clean(item.get('name')) or pid, status=status,
                     wall_seconds=wall, wait_seconds=wait, effective_seconds=effective,
                     gate_attempts=attempts, pass_attempts=number(item.get('pass_attempts')),
                     fail_attempts=failure_count, stage_attempts=number(item.get('attempts')),
                     rounds=len(item.get('runs') or []), skills=[clean(s) for s in item.get('skills_used', [])],
                     gate=clean(item.get('last_gate') or item.get('last_action')),
                     opened_at=clean(item.get('opened_at_utc')), closed_at=clean(item.get('closed_at_utc')))
        phases.append(phase)
        history_matches = []
        for attempt in item.get('attempt_history') or []:
            if not isinstance(attempt, dict) or attempt.get('verdict') != 'FAIL':
                continue
            history_matches.append(dict(
                id=clean(attempt.get('id')), phase=pid,
                gate=clean(attempt.get('gate')),
                reason=clean(attempt.get('reason')) or '未记录具体失败原因',
                at=clean(attempt.get('at_utc')), source=str(path.relative_to(root)),
                first_attempt=attempt.get('first_attempt') if isinstance(attempt.get('first_attempt'), bool) else None,
                round=number(attempt.get('round')),
                failure_kind=clean(attempt.get('failure_kind')),
                resolution_status=clean(attempt.get('resolution_status')),
                verified_by=clean(attempt.get('verified_by')),
                fixes=[dict(root_cause=clean(f.get('root_cause')), action=clean(f.get('action')),
                            change_ref=clean(f.get('change_ref')),
                            verification_verdict=f.get('verification_verdict') if f.get('verification_verdict') in ('PASS', 'FAIL') else None)
                       for f in attempt.get('fixes', []) if isinstance(f, dict)]))
        recorded_ids = {e['id'] for e in history_matches}
        matches = history_matches + [e for e in events if e['phase'] == pid and e['id'] not in recorded_ids]
        if failure_count is not None:
            if len(matches) > failure_count:
                warnings.append(f'{path.relative_to(root)} {pid} 证据失败数超过指标计数，仅关联最近记录')
            matches = matches[-int(failure_count):] if failure_count else []
            details.extend(dict(e, count=1, category=category(e['reason'], e['gate'])) for e in matches)
            missing = int(failure_count) - len(matches)
            if missing:
                reason = clean(item.get('last_note')) if verdict in FAILED and missing == 1 else ''
                reason = reason or '未记录具体失败原因'
                details.append(dict(phase=pid, gate=phase['gate'], reason=reason, count=missing,
                                    category=category(reason, phase['gate']), at=clean(item.get('last_attempt_at_utc')),
                                    source=str(path.relative_to(root))))
        elif verdict in FAILED:
            reason = clean(item.get('last_note')) or '仅记录最近结果，未记录具体失败原因'
            details.append(dict(phase=pid, gate=phase['gate'], reason=reason, count=None,
                                category=category(reason, phase['gate']), at=clean(item.get('last_result_at_utc')),
                                source=str(path.relative_to(root))))
    summary = data.get('summary') or {}
    context = data.get('execution_context') or {}
    active_phases = [p for p in phases if p['status'] != 'pending']
    latest = max(enumerate(active_phases), key=lambda entry: (entry[1]['opened_at'], entry[0]))[1] if active_phases else None
    result = str(data.get('result') or '').upper()
    waiting = number(summary.get('human_wait_open_count')) or 0
    status = 'completed' if result in PASSED else 'blocked' if result in FAILED else 'waiting' if waiting else 'blocked' if latest and latest['status'] == 'failed' else 'running' if latest else 'pending'
    if result not in FAILED and phases and all(p['closed_at'] and p['status'] == 'passed' for p in phases):
        status = 'completed'
    run = dict(id=clean(data.get('run_id')) or str(path.parent.relative_to(root)), workflow=workflow,
               kind='Requirement' if requirement else 'AR', status=status, current_phase=latest['id'] if latest else '—',
               agent=clean(context.get('agent')) or 'unknown', model=clean(context.get('model')) or 'unknown',
               updated_at=clean(data.get('updated_at_utc')), started_at=clean(data.get('started_at_utc')),
               source=str(path.relative_to(root)), phases=phases, failure_details=details,
               failures=total(p['fail_attempts'] for p in phases), gate_attempts=total(p['gate_attempts'] for p in phases),
               human_interventions=[dict(category=clean(i.get('category')), reason=clean(i.get('reason')),
                                          phase=phase_key(i.get('phase', ''))) for i in data.get('human_interventions', []) if isinstance(i, dict)],
               open_waits=waiting)
    for out, key in [('first_gate_attempts', 'first_gate_attempts_total'),
                     ('first_gate_failures', 'first_gate_failures_total'),
                     ('first_gate_passes', 'first_gate_passes_total'),
                     ('first_gate_review_holds', 'first_gate_review_holds_total'),
                     ('unrecorded_gate_attempts', 'unrecorded_gate_attempts_total')]:
        run[out] = number(summary.get(key))
    for out, field, phase_field in [('effective_seconds', 'workflow_effective_elapsed_seconds', 'effective_seconds'),
                                    ('wall_seconds', 'workflow_wall_elapsed_seconds', 'wall_seconds'),
                                    ('wait_seconds', 'workflow_human_wait_excluded_seconds', 'wait_seconds')]:
        recorded = number(summary.get(field))
        run[out] = recorded if recorded is not None else total(p[phase_field] for p in phases)
    return run


def collect(root):
    root = Path(root).resolve()
    candidates, warnings = [], []
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in SKIP and not d.startswith('.dsh') and not Path(directory, d).is_symlink())
        if 'workflow_metrics.json' in files:
            path = Path(directory, 'workflow_metrics.json')
            if not path.is_symlink():
                candidates.append(path)
    records = {}
    duplicate_count = 0
    for path in candidates:
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            if not isinstance(data, dict):
                raise ValueError('根节点必须是对象')
            run = normalize(data, path, root, warnings)
        except (OSError, ValueError, TypeError, AttributeError) as error:
            warnings.append(f'{path.relative_to(root)} 无法导入：{clean(error)}')
            continue
        key = (run['workflow'], run['id'])
        if key in records:
            duplicate_count += 1
            if records[key]['updated_at'] >= run['updated_at']:
                continue
        records[key] = run
    return dict(schema_version=1, generated_at=datetime.now(timezone.utc).isoformat(),
                source_label=root.name, source_count=len(candidates), duplicate_count=duplicate_count,
                warnings=warnings, runs=sorted(records.values(), key=lambda r: r['updated_at'], reverse=True))


def public_snapshot(data):
    """Keep useful counts while suppressing free-form internal diagnostics."""
    result = deepcopy(data)
    result['redacted'] = True
    result['warnings'] = ['有指标文件未能导入；详细信息仅在本地查看'] * len(result.get('warnings', []))
    for index, run in enumerate(result.get('runs', []), 1):
        run['source'] = f'公开快照 / 运行 {index}'
        for field in ('agent', 'model'):
            value = run.get(field, '')
            if not re.fullmatch(r'[A-Za-z0-9_.+-]{1,50}', value):
                run[field] = 'unknown'
        for phase in run.get('phases', []):
            phase['skills'] = []
            phase['name'] = phase.get('id', '阶段')
            gate = phase.get('gate', '')
            phase['gate'] = gate if re.fullmatch(r'gate_[a-z0-9_]+\.py', gate) else ''
        for event in run.get('human_interventions', []):
            event['reason'] = '详细说明仅在本地版提供'
            if event.get('category') not in {'required_workflow', 'blocked_unplanned', 'user_correction'}:
                event['category'] = 'unknown'
        for event in run.get('failure_details', []):
            reason = event.get('reason', '')
            event['reason'] = reason if reason in {'未记录具体失败原因', '仅记录最近结果，未记录具体失败原因'} else '内部诊断信息已隐藏'
            event['source'] = '公开指标快照'
            event['gate'] = ''
            for fix in event.get('fixes') or []:
                fix['root_cause'] = '详细诊断仅在本地版提供'
                fix['action'] = '详细修改仅在本地版提供'
                fix['change_ref'] = ''
            if event.get('category') not in {'待人工确认', '环境与依赖', '测试与验证', '编译构建', '设备连接', '原因缺失', '其他门禁问题'}:
                event['category'] = '其他门禁问题'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'dist' / 'data.json')
    parser.add_argument('--public-dir', type=Path, help='生成可提交到 GitHub Pages 的去敏静态目录')
    args = parser.parse_args()
    if not args.root.is_dir():
        parser.error('--root 必须是已存在的仓库目录')
    data = collect(args.root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(args.output)
    print(f"已导出 {len(data['runs'])} 条运行；{len(data['warnings'])} 条数据提示 → {args.output}")
    if args.public_dir:
        args.public_dir.mkdir(parents=True, exist_ok=True)
        for asset in ('index.html', 'style.css', 'app.mjs', 'analytics.mjs'):
            copy2(Path(__file__).parent / 'dist' / asset, args.public_dir / asset)
        (args.public_dir / 'data.json').write_text(
            json.dumps(public_snapshot(data), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (args.public_dir / '.nojekyll').touch()
        print(f'已生成去敏公开网站 → {args.public_dir}')


if __name__ == '__main__':
    main()
