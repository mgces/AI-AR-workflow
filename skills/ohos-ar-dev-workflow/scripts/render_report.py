#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
render_report.py — human-readable HTML reports from a pipeline run.

Machine evidence (evidence/, HMAC-signed, gitignored) and human audit reports
(reports/, HTML) are kept in SEPARATE trees under the run dir. This renders the
latter from the former. It never affects any gate verdict — it is a read/render
step the orchestrator runs after a phase passes.

Kinds:
  device   — P4/P5-B real-device functional report (nonce/markers/e2e, hilog
             tail, host==device artifact sha256).
  quality  — P5 coverage / performance / power / stability + functional summary.
  summary  — P6 rollup: background + design rationale + change summary + test
             summary + result summary; also writes reports/pr_description.md
             (a plain-markdown block gate_upload_ci.py injects into the PR body).
  all      — the three above + index.html.

Every evidence string is passed through redact() (shared with archive_product)
then HTML-escaped, so serials / personal paths never reach the rendered report.
"""
import argparse
import html
import json
import os
import sys

# reuse the single redaction choke point
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from archive_product import redact  # noqa: E402

BASE_CSS = """
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
  margin:0;padding:0;background:#f6f7f9;color:#1c2128}
.wrap{max-width:960px;margin:0 auto;padding:32px 24px}
h1{font-size:26px;margin:0 0 4px}
h2{font-size:19px;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid #d6dae0}
.sub{color:#59636e;margin:0 0 20px}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}
.pass{background:#dafbe1;color:#1a7f37}.fail{background:#ffebe9;color:#cf222e}
.warn{background:#fff8c5;color:#9a6700}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}
th,td{border:1px solid #d6dae0;padding:6px 10px;text-align:left;vertical-align:top}
th{background:#eaeef2;width:220px;white-space:nowrap}
pre{background:#0d1117;color:#c9d1d9;padding:12px;border-radius:8px;overflow:auto;
  font:12px/1.5 SFMono-Regular,Consolas,monospace;max-height:340px}
.card{background:#fff;border:1px solid #d6dae0;border-radius:10px;padding:18px 22px;margin:16px 0}
a{color:#0969da}
"""


def html_escape(s):
    return html.escape(str(s) if s is not None else "")


def clean(s):
    """redact then HTML-escape — the safe path for any evidence-derived text."""
    return html_escape(redact(str(s) if s is not None else ""))


def _page(title, body):
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<title>%s</title><style>%s</style></head><body><div class='wrap'>%s"
            "</div></body></html>") % (html_escape(title), BASE_CSS, body)


def _section(title, body_html):
    return "<h2>%s</h2>%s" % (html_escape(title), body_html)


def _kv_table(pairs):
    rows = "".join("<tr><th>%s</th><td>%s</td></tr>" % (html_escape(k), v)
                   for k, v in pairs)
    return "<table>%s</table>" % rows


def _pre(text):
    return "<pre>%s</pre>" % clean(text)


def _badge(verdict):
    cls = {"PASS": "pass", "FAIL": "fail"}.get(verdict, "warn")
    return "<span class='badge %s'>%s</span>" % (cls, html_escape(verdict or "?"))


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
            pairs.append(("熔断状态", "<span class='badge fail'>%s</span>" % clean(note)))
        if repair.get("regen_required"):
            sigs = "; ".join(repair.get("regen_signals") or []) or "regen"
            pairs.append(("需重生成(regen)", clean(sigs)))
    return pairs


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

    def _cases_html(raw_json):
        if not raw_json:
            return "<p class='sub'>未产出</p>"
        try:
            data = json.loads(raw_json)
        except Exception:
            return _pre(raw_json)
        rows = []
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
            rows.append("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
                verdict, marker, pid, proc, "<br>".join(details)))
        if not rows:
            return "<p class='sub'>未声明 device_cases</p>"
        return ("<table><tr><th>Verdict</th><th>Marker</th><th>PID</th>"
                "<th>Expected process</th><th>Checks</th></tr>%s</table>" % "".join(rows))

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
    body = "<h1>真机功能测试报告</h1><p class='sub'>run=%s target=%s</p>" % (
        clean(state.get("run_id")), clean(state.get("build_target")))
    body += "<div class='card'>%s %s</div>" % (
        _badge(ev.get("verdict") if ev else None),
        clean(ev.get("reason") if ev else "(no verdict)"))
    if failure and failure.get("failure_class"):
        body += "<div class='card'><strong>failure_class:</strong> %s</div>" % clean(failure.get("failure_class"))
    if summary_pairs:
        body += _section("P4 抗伪造摘要", _kv_table(summary_pairs))
    process_pairs = _process_summary_pairs(summary, failure, repair)
    if process_pairs:
        body += _section("控制层流程摘要(repair / retry / 重验范围;仅导航,不授放行)",
                         _kv_table(process_pairs))
    body += _section("运行元数据(nonce / marker / uptime)", _pre(meta))
    body += _section("产物一致性(主机 sha256 == 设备 sha256)", _pre(proof))
    body += _section("device_cases 逐项结果", _cases_html(case_results))
    body += _section("基线窗口(触发前必须为空的 marker 看这里)", _pre(baseline))
    body += _section("触发窗口(真正用于判定的日志窗口)", _pre(trigger))
    body += _section("设备 hilog 抓取(末尾片段)", _pre(tail))
    return _page("真机功能测试报告 — %s" % state.get("run_id"), body)


def render_quality(pdir, state, entries):
    ev = phase_verdict(entries, 5)
    body = "<h1>质量验证报告</h1><p class='sub'>run=%s</p>" % clean(state.get("run_id"))
    body += "<div class='card'>%s %s</div>" % (
        _badge(ev.get("verdict") if ev else None),
        clean(ev.get("reason") if ev else "(no verdict)"))
    for label, rel in (("覆盖率", "coverage_report"), ("性能", "performance_report"),
                       ("功耗", "power_report"), ("稳定性", "stability_report")):
        found = None
        for ext in (".md", ".txt", ".html", ".json"):
            t = read_ev(pdir, "evidence/phase7/%s%s" % (rel, ext))
            if t:
                found = t
                break
        body += _section("%s报告" % label, _pre(found) if found else "<p class='sub'>未产出</p>")
    return _page("质量验证报告 — %s" % state.get("run_id"), body)


def _test_result_rows(entries):
    rows = []
    for ph, name in ((3, "P3 单元测试"), (4, "P4 真机功能"), (5, "P5 质量验证")):
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
    for ph, name in ((3, "P3 单元测试"), (4, "P4 真机功能"), (5, "P5 质量验证")):
        ev = phase_verdict(entries, ph)
        lines.append("- %s: %s — %s" % (name, ev.get("verdict") if ev else "N/A",
                                        redact(ev.get("reason") if ev else "—")))
    return "\n".join(lines) + "\n"


def render_summary(pdir, state, entries):
    body = "<h1>上库汇总报告</h1><p class='sub'>run=%s target=%s</p>" % (
        clean(state.get("run_id")), clean(state.get("build_target")))
    body += _section("背景介绍", _pre(read_ev(pdir, "ar.md", 4000) or "(无)"))
    body += _section("设计思路", _pre(design_section(pdir, ["设计", "功能需求"]) or "(见 AR_design.md)"))
    body += _section("修改概要", _pre(read_ev(pdir, "evidence/phase8/full_diff.stat.txt", 4000) or "(无)"))
    body += _section("用例概要", _pre(design_section(pdir, ["需测试", "功能点"]) or "(见 AR_design.md)"))
    body += _section("用例结果总结", _kv_table(_test_result_rows(entries)))
    return _page("上库汇总报告 — %s" % state.get("run_id"), body)


def render_index(state):
    links = "".join("<li><a href='%s'>%s</a></li>" % (f, t) for f, t in (
        ("device_functional.html", "真机功能测试报告"),
        ("quality.html", "质量验证报告"),
        ("summary.html", "上库汇总报告")))
    body = "<h1>报告目录</h1><p class='sub'>run=%s</p><ul>%s</ul>" % (
        clean(state.get("run_id")), links)
    return _page("报告目录 — %s" % state.get("run_id"), body)


def main():
    ap = argparse.ArgumentParser(description="render human-readable HTML reports")
    ap.add_argument("--pipeline-dir", required=True)
    ap.add_argument("--kind", choices=["device", "quality", "summary", "all"], default="all")
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

    if args.kind in ("device", "all"):
        write("device_functional.html", render_device(pdir, state, entries))
    if args.kind in ("quality", "all"):
        write("quality.html", render_quality(pdir, state, entries))
    if args.kind in ("summary", "all"):
        write("summary.html", render_summary(pdir, state, entries))
        write("pr_description.md", build_pr_description(pdir))
    if args.kind == "all":
        write("index.html", render_index(state))


if __name__ == "__main__":
    main()
