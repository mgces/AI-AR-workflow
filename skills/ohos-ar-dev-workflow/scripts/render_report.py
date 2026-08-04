#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
render_report.py — human-readable Markdown reports from a pipeline run.

Machine evidence (evidence/, HMAC-signed, gitignored) and human audit reports
(reports/, Markdown) are kept in SEPARATE trees under the run dir. This renders
the latter from the former. It never affects any gate verdict — it is a
read/render step the orchestrator runs after a phase passes.

Each report is ONE self-contained .md file (no external CSS/assets, nothing
split across files), so it reads cleanly in any Markdown viewer or on gitcode.

Kinds:
  test     — P5 单元测试执行结果 + P6 端到端关键证据点聚合(测试是否通过 + 关键点),
             与 device_functional.md 共存(后者为端到端完整报告)。P6 通过后渲染。
  device   — P4/P5-B real-device functional report (nonce/markers/e2e, hilog
             tail, host==device artifact sha256).
  quality  — P7 coverage / performance / power / stability + functional summary
             + code review, all aggregated into one quality.md.
  summary  — P8 rollup: background + design rationale + change summary + test
             summary + result summary; also writes reports/pr_description.md
             (a plain-markdown block gate_upload_ci.py injects into the PR body).
  all      — the four above + index.md.

Every evidence string is passed through redact() (shared with archive_product),
so serials / personal paths never reach the rendered report.
"""
import argparse
import glob
import json
import os
import sys
import xml.etree.ElementTree as ET

# reuse the single redaction choke point
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from archive_product import redact  # noqa: E402


def _gatelib():
    """Import the phase-side gatelib (read_phase_summary / read_failure_report /
    read_repair_packet). Returns the module or None if unavailable. render_device
    and design_section keep their own inline imports; this is the shared path for
    new callers (render_test)."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "..", "ohos-ar-dev-phases", "scripts", "lib"))
    try:
        import gatelib as gl
        return gl
    except Exception:
        return None


def clean(s):
    """redact — the safe path for any evidence-derived text (Markdown output,
    so no HTML escaping; the single choke point is still redact())."""
    return redact(str(s) if s is not None else "")


def _page(title, body):
    """A report is one self-contained Markdown document; the h1 already lives in
    body, so this is just a passthrough (kept so callers read intently)."""
    return body.rstrip() + "\n"


def _section(title, body_md):
    return "\n## %s\n\n%s\n" % (title, body_md)


def _kv_table(pairs):
    """Two-column Markdown table (项/值). Values are already redacted strings."""
    out = ["| 项 | 值 |", "| --- | --- |"]
    for k, v in pairs:
        # collapse newlines so a value never breaks the table row
        val = str(v).replace("\n", " ").strip()
        out.append("| %s | %s |" % (str(k).strip(), val))
    return "\n".join(out)


def _pre(text):
    """Fenced code block for verbatim evidence (logs, metadata)."""
    return "```\n%s\n```" % clean(text)


def _badge(verdict):
    """Markdown verdict marker: **✅ PASS** / **❌ FAIL** / **⚠️ ?**."""
    mark = {"PASS": "✅ PASS", "FAIL": "❌ FAIL"}.get(verdict, "⚠️ %s" % (verdict or "?"))
    return "**%s**" % mark


# ----------------------------------------------------------------------------
# loading
# ----------------------------------------------------------------------------
def load(pdir):
    with open(os.path.join(pdir, "pipeline.json"), encoding="utf-8") as f:
        state = json.load(f)
    entries = []
    mp = os.path.join(pdir, "evidence", "manifest.jsonl")
    if os.path.exists(mp):
        with open(mp, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    return state, entries


def read_ev(pdir, rel, limit=6000):
    p = os.path.join(pdir, rel)
    if not os.path.isfile(p):
        return None
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()[:limit]


def phase_verdict(entries, phase):
    hits = [e for e in entries if e.get("phase") == phase and e.get("verdict") in ("PASS", "FAIL")]
    return hits[-1] if hits else None


def design_section(pdir, name_keywords):
    """Pull a named section body out of the signed AR_design.md (if present)."""
    text = read_ev(pdir, "evidence/phase1/AR_design.md", limit=100000)
    if not text:
        return None
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "..", "ohos-ar-dev-phases", "scripts", "lib"))
    try:
        import gatelib as gl
        for head, body in gl._split_md_sections(text):
            if any(k in head for k in name_keywords):
                return body.strip()
    except Exception:
        pass
    return None


# ----------------------------------------------------------------------------
# renderers
# ----------------------------------------------------------------------------
def _process_summary_pairs(summary, failure, repair):
    """Repair / retry / downstream-scope pairs for the human report.

    Sourced from the control layer (repair packet) and phase_summary/failure_report.
    These are advisory navigation aids — they never granted a verdict, so the
    renderer shows them purely to help a human (or weak model) see how many
    repair/retry rounds a phase burned and how far a failure must re-validate."""
    pairs = []
    scope = None
    for src in (repair, failure, summary):
        if src and src.get("downstream_revalidate_scope"):
            scope = src.get("downstream_revalidate_scope")
            break
    if scope:
        pairs.append(("downstream 重验范围", clean(scope)))
    if repair:
        if repair.get("failure_class"):
            pairs.append(("失败分类", clean(repair.get("failure_class"))))
        rr = repair.get("retry_rounds")
        mrr = repair.get("max_retry_rounds")
        if rr is not None or mrr is not None:
            pairs.append(("retry 轮次", "%s / %s" % (clean(rr), clean(mrr))))
        pr = repair.get("repair_rounds")
        mpr = repair.get("max_repair_rounds")
        if pr is not None or mpr is not None:
            pairs.append(("repair 轮次", "%s / %s" % (clean(pr), clean(mpr))))
        if repair.get("recommended_next_action"):
            pairs.append(("建议下一步", clean(repair.get("recommended_next_action"))))
        if repair.get("human_escalation_needed"):
            note = repair.get("escalation_note") or "熔断:需人工介入"
            pairs.append(("熔断状态", "**❌ %s**" % clean(note)))
        if repair.get("regen_required"):
            sigs = "; ".join(repair.get("regen_signals") or []) or "regen"
            pairs.append(("需重生成(regen)", clean(sigs)))
    return pairs


def _cases_md(raw_json):
    """Render device_case_results.json as a per-case verdict table. Module-level
    so both render_device (P6 full report) and render_test (P5+P6 aggregate) share
    one implementation. Depends only on json/clean/_badge/_pre."""
    if not raw_json:
        return "_未产出_"
    try:
        data = json.loads(raw_json)
    except Exception:
        return _pre(raw_json)
    rows = ["| Verdict | Marker | PID | Expected process | Checks |",
            "| --- | --- | --- | --- | --- |"]
    n = 0
    for r in data.get("results", []):
        marker = clean(r.get("marker"))
        pid = clean(r.get("marker_pid") if r.get("marker_pid") is not None else "-")
        proc = clean(r.get("process_expected") or "-")
        verdict = _badge("PASS" if r.get("ok") else "FAIL")
        details = []
        details.append("marker_seen=%s" % clean(r.get("marker_seen")))
        details.append("process_match=%s" % clean(r.get("process_match")))
        details.append("artifact_loaded=%s" % clean(r.get("artifact_loaded_verified")))
        details.append("side_effect=%s" % clean(r.get("side_effect_ok")))
        details.append("negative_control=%s" % clean(r.get("negative_control_ok")))
        if r.get("problems"):
            details.append("problems=" + clean("; ".join(r.get("problems", []))))
        rows.append("| %s | %s | %s | %s | %s |" % (
            verdict, marker, pid, proc, "; ".join(details)))
        n += 1
    if n == 0:
        return "_未声明 device_cases_"
    return "\n".join(rows)


def render_device(pdir, state, entries, phase=6):
    ev = phase_verdict(entries, phase)
    meta = read_ev(pdir, "evidence/phase%d/run_meta.txt" % phase) or "(no run_meta)"
    proof = read_ev(pdir, "evidence/phase%d/artifact_runtime_proof.txt" % phase) or "(no artifact proof)"
    hilog = read_ev(pdir, "evidence/phase%d/hilog_capture.txt" % phase) or "(no hilog)"
    baseline = read_ev(pdir, "evidence/phase%d/hilog_baseline_window.txt" % phase) or "(no baseline window)"
    trigger = read_ev(pdir, "evidence/phase%d/hilog_trigger_window.txt" % phase) or "(no trigger window)"
    case_results = read_ev(pdir, "evidence/phase%d/device_case_results.json" % phase) or ""
    summary = None
    failure = None
    repair = None
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "..", "ohos-ar-dev-phases", "scripts", "lib"))
        import gatelib as gl
        summary = gl.read_phase_summary(pdir, phase)
        failure = gl.read_failure_report(pdir, phase)
        # control-layer process footprint (repair/retry/scope) — advisory only
        repair = gl.read_repair_packet(pdir, ("repairs", "current.json"))
    except Exception:
        pass
    tail = "\n".join((trigger if trigger and not trigger.startswith("(no ") else hilog).strip().splitlines()[-40:])

    summary_pairs = []
    if summary:
        summary_pairs.extend([
            ("process provenance", clean(summary.get("process_provenance_verified"))),
            ("artifact loaded", clean(summary.get("artifact_loaded_verified"))),
            ("side effect", clean(summary.get("side_effect_verified"))),
            ("negative control", clean(summary.get("negative_control_verified"))),
            ("baseline window", clean(summary.get("baseline_window_found"))),
            ("trigger window", clean(summary.get("trigger_window_found"))),
        ])
    body = "# 端到端功能测试报告\n\nrun=%s  target=%s\n" % (
        clean(state.get("run_id")), clean(state.get("build_target")))
    body += "\n%s %s\n" % (
        _badge(ev.get("verdict") if ev else None),
        clean(ev.get("reason") if ev else "(no verdict)"))
    if failure and failure.get("failure_class"):
        body += "\n**failure_class:** %s\n" % clean(failure.get("failure_class"))
    if summary_pairs:
        body += _section("P4 抗伪造摘要", _kv_table(summary_pairs))
    process_pairs = _process_summary_pairs(summary, failure, repair)
    if process_pairs:
        body += _section("控制层流程摘要(repair / retry / 重验范围;仅导航,不授放行)",
                         _kv_table(process_pairs))
    body += _section("运行元数据(nonce / marker / uptime)", _pre(meta))
    body += _section("产物一致性(主机 sha256 == 设备 sha256)", _pre(proof))
    body += _section("device_cases 逐项结果", _cases_md(case_results))
    body += _section("基线窗口(触发前必须为空的 marker 看这里)", _pre(baseline))
    body += _section("触发窗口(真正用于判定的日志窗口)", _pre(trigger))
    body += _section("设备 hilog 抓取(末尾片段)", _pre(tail))
    return _page("端到端功能测试报告 — %s" % state.get("run_id"), body)


def _junit_totals(pdir, rel="evidence/phase5/summary_report.xml"):
    """(tests, failures, errors) from a JUnit <testsuites> root, or None if the
    file is missing/unparseable. Same attribute reads gate_test_ut.py uses."""
    p = os.path.join(pdir, rel)
    if not os.path.isfile(p):
        return None
    try:
        root = ET.parse(p).getroot()
        return (int(root.get("tests", "0")), int(root.get("failures", "0")),
                int(root.get("errors", "0")))
    except Exception:
        return None


def _ut_case_rows(pdir, cap=200):
    """Per-case table from evidence/phase5/result_*.xml. Lists every FAILED case
    (with a truncated message) plus a passed-count line — keeps the table bounded
    on large suites. Returns (markdown, had_any). failed detection matches
    gate_test_ut.passed_gtests (a <failure>/<error> child means failed)."""
    paths = sorted(glob.glob(os.path.join(pdir, "evidence/phase5/result_*.xml")))
    if not paths:
        return ("_未产出逐用例结果(result_*.xml 缺失)_", False)
    failed_rows = []
    passed = 0
    truncated = 0
    for path in paths:
        try:
            root = ET.parse(path).getroot()
        except Exception:
            continue
        for tc in root.iter("testcase"):
            name = tc.get("name")
            if not name:
                continue
            suite = tc.get("classname") or ""
            case = "%s.%s" % (suite, name) if suite else name
            fail_node = next((c for c in tc if c.tag in ("failure", "error")), None)
            if fail_node is None:
                passed += 1
                continue
            if len(failed_rows) >= cap:
                truncated += 1
                continue
            msg = (fail_node.get("message") or fail_node.text or "").strip()
            msg = clean(msg).replace("\n", " ")[:200]
            failed_rows.append("| %s | %s | %s |" % (_badge("FAIL"), clean(case), msg))
    lines = ["| Verdict | Suite.Case | 失败摘要 |", "| --- | --- | --- |"]
    lines.extend(failed_rows)
    if truncated:
        lines.append("| … | _还有 %d 个失败用例未列出_ | |" % truncated)
    lines.append("| %s | _通过用例合计_ | %d |" % (_badge("PASS"), passed))
    return ("\n".join(lines), True)


def _key_lines(text, keywords):
    """Filter evidence text down to the lines mentioning any keyword — used to pull
    the key points (nonce/marker/sha256) out of a longer evidence file rather than
    dumping the whole thing. Returns None if text is empty."""
    if not text:
        return None
    hits = [ln for ln in text.splitlines()
            if any(k.lower() in ln.lower() for k in keywords)]
    return "\n".join(hits) if hits else None


def render_test(pdir, state, entries):
    """P5 单元测试执行结果 + P6 端到端关键证据点,聚合进**一个** test_report.md(测试是否
    通过 + 关键点)。与 device_functional.md 共存(后者为端到端完整报告)。在 P6 门控
    通过后由编排器渲染。所有段落在证据缺失时降级显示,绝不 traceback。"""
    gl = _gatelib()
    body = "# 测试用例报告\n\nrun=%s  target=%s\n" % (
        clean(state.get("run_id")), clean(state.get("build_target")))

    # ---- P5 单元测试 ----
    ev5 = phase_verdict(entries, 5)
    body += "\n## P5 单元测试\n"
    body += "\n%s %s\n" % (
        _badge(ev5.get("verdict") if ev5 else None),
        clean(ev5.get("reason") if ev5 else "(no verdict)"))
    # 计数:优先 phase_summary(gate 写入),回退解析 summary_report.xml
    totals = None
    summary5 = gl.read_phase_summary(pdir, 5) if gl else None
    if summary5 and summary5.get("tests") is not None:
        totals = (summary5.get("tests"), summary5.get("failures"),
                  summary5.get("errors"))
    if totals is None:
        totals = _junit_totals(pdir)
    if totals is not None:
        body += _section("单测计数", _kv_table([
            ("tests", clean(totals[0])), ("failures", clean(totals[1])),
            ("errors", clean(totals[2]))]))
    else:
        body += _section("单测计数", "_summary_report.xml 未产出_")
    # 逐用例
    case_md, _ = _ut_case_rows(pdir)
    body += _section("逐用例结果(列出全部失败 + 通过计数)", case_md)
    # 合约覆盖
    cov = read_ev(pdir, "evidence/phase5/gtest_coverage.txt")
    body += _section("合约 gtest 覆盖",
                     _pre(cov) if cov else "_未产出(合约缺失或 legacy bypass)_")

    # ---- P6 端到端功能测试(关键点)----
    ev6 = phase_verdict(entries, 6)
    summary6 = gl.read_phase_summary(pdir, 6) if gl else None
    meta6 = read_ev(pdir, "evidence/phase6/run_meta.txt")
    proof6 = read_ev(pdir, "evidence/phase6/artifact_runtime_proof.txt")
    cases6 = read_ev(pdir, "evidence/phase6/device_case_results.json")
    p6_present = ev6 or summary6 or meta6 or proof6 or cases6
    body += "\n## P6 端到端功能测试(关键证据点)\n"
    if not p6_present:
        body += "\n%s _P6 端到端证据未产出(可能尚未运行或未通过)_\n" % _badge(None)
        return _page("测试用例报告 — %s" % state.get("run_id"), body)
    body += "\n%s %s\n" % (
        _badge(ev6.get("verdict") if ev6 else None),
        clean(ev6.get("reason") if ev6 else "(no verdict)"))
    # 抗伪造 + 窗口命中(权威布尔来自 phase_summary)
    if summary6:
        body += _section("抗伪造 / 窗口命中摘要", _kv_table([
            ("process provenance", clean(summary6.get("process_provenance_verified"))),
            ("artifact loaded", clean(summary6.get("artifact_loaded_verified"))),
            ("side effect", clean(summary6.get("side_effect_verified"))),
            ("negative control", clean(summary6.get("negative_control_verified"))),
            ("baseline window", clean(summary6.get("baseline_window_found"))),
            ("trigger window", clean(summary6.get("trigger_window_found"))),
        ]))
    # nonce/marker 关键行
    nonce_lines = _key_lines(meta6, ["nonce", "marker", "uptime"])
    body += _section("运行元数据关键行(nonce / marker / uptime)",
                     _pre(nonce_lines) if nonce_lines else "_未产出_")
    # 产物 sha256 一致关键行
    sha_lines = _key_lines(proof6, ["sha256", "==", "match"])
    body += _section("产物一致性(主机 sha256 == 设备 sha256)",
                     _pre(sha_lines) if sha_lines else "_未产出_")
    # device_cases 逐项 verdict(复用模块级 _cases_md)
    body += _section("device_cases 逐项结果", _cases_md(cases6))
    return _page("测试用例报告 — %s" % state.get("run_id"), body)


def render_quality(pdir, state, entries):
    """P7 质量验证报告 —— 覆盖率/性能/功耗/稳定性 + 功能 summary + 代码 review,
    全部聚合进**一个** quality.md,不再分散多文件。"""
    ev = phase_verdict(entries, 7) or phase_verdict(entries, 5)
    body = "# 质量验证报告\n\nrun=%s  target=%s\n" % (
        clean(state.get("run_id")), clean(state.get("build_target")))
    body += "\n%s %s\n" % (
        _badge(ev.get("verdict") if ev else None),
        clean(ev.get("reason") if ev else "(no verdict)"))
    # 覆盖率 / 性能 / 功耗 / 稳定性 —— 四类质量报告聚合
    for label, rel in (("覆盖率", "coverage_report"), ("性能", "performance_report"),
                       ("功耗", "power_report"), ("稳定性", "stability_report")):
        found = None
        for ext in (".md", ".txt", ".html", ".json"):
            t = read_ev(pdir, "evidence/phase7/%s%s" % (rel, ext))
            if t:
                found = t
                break
        body += _section("%s报告" % label, _pre(found) if found else "_未产出_")
    # 代码 review —— P7 硬门控项,一并聚合进本 md
    review = None
    for rel in ("code_review_report.txt", "code_review_report.json",
                "code_review_report.md"):
        t = read_ev(pdir, "evidence/phase7/%s" % rel)
        if t:
            review = t
            break
    body += _section("代码 review 报告", _pre(review) if review else "_未产出_")
    return _page("质量验证报告 — %s" % state.get("run_id"), body)


def _test_result_rows(entries):
    rows = []
    for ph, name in ((5, "P5 单元测试"), (6, "P6 端到端功能测试"), (7, "P7 质量验证")):
        ev = phase_verdict(entries, ph)
        rows.append((name, "%s %s" % (_badge(ev.get("verdict") if ev else None),
                                      clean(ev.get("reason") if ev else "—"))))
    return rows


def build_pr_description(pdir):
    """Plain-markdown PR body block (background / design / change / cases / results)."""
    state, entries = load(pdir)
    bg = redact((read_ev(pdir, "ar.md", 4000) or "").strip()) or "(无背景描述)"
    design = redact(design_section(pdir, ["设计", "功能需求"]) or "(见 AR_design.md)")
    stat = redact((read_ev(pdir, "evidence/phase8/full_diff.stat.txt", 4000) or "").strip()) or "(无统计)"
    cases = redact(design_section(pdir, ["需测试", "功能点", "测试框架"]) or "(见 AR_design.md)")
    lines = ["## 背景介绍", bg, "", "## 设计思路", design, "", "## 修改概要", "```", stat, "```",
             "", "## 用例概要", cases, "", "## 用例结果总结"]
    for ph, name in ((5, "P5 单元测试"), (6, "P6 端到端功能测试"), (7, "P7 质量验证")):
        ev = phase_verdict(entries, ph)
        lines.append("- %s: %s — %s" % (name, ev.get("verdict") if ev else "N/A",
                                        redact(ev.get("reason") if ev else "—")))
    return "\n".join(lines) + "\n"


def render_summary(pdir, state, entries):
    body = "# 上库汇总报告\n\nrun=%s  target=%s\n" % (
        clean(state.get("run_id")), clean(state.get("build_target")))
    body += _section("背景介绍", _pre(read_ev(pdir, "ar.md", 4000) or "(无)"))
    body += _section("设计思路", _pre(design_section(pdir, ["设计", "功能需求"]) or "(见 AR_design.md)"))
    body += _section("修改概要", _pre(read_ev(pdir, "evidence/phase8/full_diff.stat.txt", 4000) or "(无)"))
    body += _section("用例概要", _pre(design_section(pdir, ["需测试", "功能点"]) or "(见 AR_design.md)"))
    body += _section("用例结果总结", _kv_table(_test_result_rows(entries)))
    return _page("上库汇总报告 — %s" % state.get("run_id"), body)


def render_index(state):
    links = "\n".join("- [%s](%s)" % (t, f) for f, t in (
        ("test_report.md", "测试用例报告"),
        ("device_functional.md", "端到端功能测试报告"),
        ("quality.md", "质量验证报告"),
        ("summary.md", "上库汇总报告")))
    body = "# 报告目录\n\nrun=%s\n\n%s\n" % (clean(state.get("run_id")), links)
    return _page("报告目录 — %s" % state.get("run_id"), body)


def main():
    ap = argparse.ArgumentParser(description="render human-readable Markdown reports")
    ap.add_argument("--pipeline-dir", required=True)
    ap.add_argument("--kind", choices=["test", "device", "quality", "summary", "all"], default="all")
    ap.add_argument("--out", help="output dir (default: <pipeline-dir>/reports)")
    args = ap.parse_args()
    pdir = os.path.abspath(args.pipeline_dir)
    outdir = os.path.abspath(args.out or os.path.join(pdir, "reports"))
    os.makedirs(outdir, exist_ok=True)
    state, entries = load(pdir)

    def write(name, content):
        with open(os.path.join(outdir, name), "w", encoding="utf-8") as f:
            f.write(content)
        print("wrote %s" % os.path.join(outdir, name))

    if args.kind in ("test", "all"):
        write("test_report.md", render_test(pdir, state, entries))
    if args.kind in ("device", "all"):
        write("device_functional.md", render_device(pdir, state, entries))
    if args.kind in ("quality", "all"):
        write("quality.md", render_quality(pdir, state, entries))
    if args.kind in ("summary", "all"):
        write("summary.md", render_summary(pdir, state, entries))
        write("pr_description.md", build_pr_description(pdir))
    if args.kind == "all":
        write("index.md", render_index(state))


if __name__ == "__main__":
    main()
