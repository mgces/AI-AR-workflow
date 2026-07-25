#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
refresh_todo.py — regenerate <pipeline-dir>/todo.md from AR_design.md + state.

The orchestrator runs this at the START of every scheduling loop so todo.md
always reflects the current phase and derives concrete per-phase items from the
signed design doc. todo.md is the on-disk mirror (for resume); the orchestrator
also mirrors the same items into TodoWrite for in-session visibility.

No third-party deps. Degrades gracefully: if AR_design.md is absent (legacy run)
it still emits the global phase progress.
"""
import argparse
import json
import os
import re
import sys

PHASE_LABELS = [
    (0, "P0 环境初始化"),
    (1, "P1 设计固化 + 代码开发"),
    (2, "P2 编译验证"),
    (3, "P3 测试用例编写与验证"),
    (4, "P4 真机功能测试"),
    (5, "P5 质量验证"),
    (6, "P6 上库 review"),
]

NEXT_STEP_TEXT = {
    0: "跑 gate_env_init 后 advance --phase 0",
    1: "gate_design.py(AR_design+ar-contract)→ consent --phase 1 → 写代码 → gate_develop.py → advance --phase 1",
    2: "gate_build.py → advance --phase 2",
    3: "gate_test_ut.py(只增独立测试)→ advance --phase 3",
    4: "gate_device_func.py → 人工 consent → advance --phase 4",
    5: "gate_integration.py + 质量报告 → 人工 consent → advance --phase 5",
    6: "gate_upload_ci.py(两份 review + PR + CI)→ 人工 consent → advance --phase 6",
}

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "..", "ohos-ar-dev-phases", "scripts", "lib"))
import gatelib as gl  # noqa: E402


def _split_md_sections(text):
    lines = text.splitlines()
    heads = [(i, len(m.group(1)), ln) for i, ln in enumerate(lines)
             for m in [re.match(r"^\s*(#{1,6})\s+\S", ln)] if m]
    out = []
    for hi, (idx, level, line) in enumerate(heads):
        end = len(lines)
        for j in range(hi + 1, len(heads)):
            if heads[j][1] <= level:
                end = heads[j][0]
                break
        out.append((line, "\n".join(lines[idx + 1:end])))
    return out


def _section_items(text, keywords, limit=12):
    """Bullet/numbered lines under the first section whose heading matches."""
    for head, body in _split_md_sections(text or ""):
        if any(k in head for k in keywords):
            items = []
            for ln in body.splitlines():
                s = ln.strip()
                m = re.match(r"^(?:[-*]|\d+[.)])\s+(.*)$", s)
                if m and m.group(1).strip():
                    items.append(m.group(1).strip())
            return items[:limit]
    return []


def collect_design_items(design_text):
    return {
        "files": _section_items(design_text, ["文件清单", "文件列表", "file list"]),
        "test_points": _section_items(design_text, ["需测试", "功能点", "test point"]),
        "device_cases": _section_items(design_text, ["真机", "用例构造", "test case"]),
    }


def build_todo_data(state, design_text, entries):
    run_id = state.get("run_id", "")
    cur = state.get("current_phase", 0)
    status = {p["id"]: p.get("status", "pending") for p in state.get("phases", [])}
    design_items = collect_design_items(design_text) if design_text else {
        "files": [], "test_points": [], "device_cases": []}
    next_action = {
        "text": NEXT_STEP_TEXT.get(cur, "见编排器 SKILL.md"),
        "next_gate": state.get("next_gate"),
        "resume_hint": state.get("resume_hint"),
        "required_inputs": state.get("required_inputs") or [],
        "current_substate": state.get("current_substate"),
    }
    phases = []
    for pid, label in PHASE_LABELS:
        phases.append({
            "id": pid,
            "label": label,
            "status": status.get(pid, "pending"),
            "current": pid == cur,
            "manifest_ref": (gl.phase_state(state, pid) or {}).get("manifest_ref"),
        })
    return {
        "run_id": run_id,
        "current_phase": cur,
        "current_phase_label": dict(PHASE_LABELS).get(cur),
        "logical_phase_id": state.get("logical_phase_id"),
        "logical_phase_name": state.get("logical_phase_name"),
        "action_kind": state.get("action_kind"),
        "control_protocol_version": state.get("control_protocol_version"),
        "control_refs": state.get("control_refs") or {},
        "design_present": bool(design_text),
        "legacy_mode": bool(state.get("legacy_mode")),
        "last_failure": state.get("last_failure"),
        "phases": phases,
        "design_items": design_items,
        "next_action": next_action,
        "manifest_entries": len(entries or []),
        "phase_summary": gl.read_phase_summary(os.path.abspath(state.get("pipeline_dir", "") or "."), cur)
        if state.get("pipeline_dir") else None,
        "failure_report": gl.read_failure_report(os.path.abspath(state.get("pipeline_dir", "") or "."), cur)
        if state.get("pipeline_dir") else None,
    }


def build_todo(state, design_text, entries):
    data = build_todo_data(state, design_text, entries)
    cur = data["current_phase"]
    lines = ["<!-- generated by refresh_todo.py; do not hand-edit -->",
             "# TODO — %s" % data["run_id"], "",
             "当前阶段: **P%d**" % cur, "", "## 阶段进度"]
    for phase in data["phases"]:
        mark = "x" if phase["status"] == "passed" else " "
        arrow = "  ⬅ 当前" if phase["current"] else ""
        lines.append("- [%s] %s%s" % (mark, phase["label"], arrow))

    if data["design_present"]:
        lines += ["", "## 本次设计派生细项(来自 AR_design.md)"]
        files = data["design_items"]["files"]
        points = data["design_items"]["test_points"]
        cases = data["design_items"]["device_cases"]
        if files:
            lines.append("### 计划实现文件 (P1)")
            lines += ["- [ ] 实现 `%s`" % f for f in files]
        if points:
            lines.append("### 需测试的功能点 (P3/P5)")
            lines += ["- [ ] 覆盖: %s" % p for p in points]
        if cases:
            lines.append("### 真机用例构造 (P4)")
            lines += ["- [ ] 真机验证: %s" % c for c in cases]
    else:
        lines += ["", "> 无 AR_design.md(legacy run)——仅显示阶段进度。"]

    lines += ["", "## 下一步", "- %s" % data["next_action"]["text"]]
    if data["next_action"].get("next_gate"):
        lines.append("- gate: `%s`" % data["next_action"]["next_gate"])
    if data["next_action"].get("required_inputs"):
        lines.append("- 需要输入: %s" % ", ".join(data["next_action"]["required_inputs"]))
    if data["next_action"].get("resume_hint"):
        lines.append("- 提示: %s" % data["next_action"]["resume_hint"])
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description="regenerate todo.md from AR_design + state")
    ap.add_argument("--pipeline-dir", required=True)
    args = ap.parse_args()
    pdir = os.path.abspath(args.pipeline_dir)
    with open(os.path.join(pdir, "pipeline.json"), encoding="utf-8") as f:
        state = json.load(f)
    state["pipeline_dir"] = pdir
    design_text = None
    for cand in ("evidence/phase1/AR_design.md", "AR_design.md"):
        p = os.path.join(pdir, cand)
        if os.path.isfile(p):
            with open(p, encoding="utf-8", errors="replace") as f:
                design_text = f.read()
            break
    entries = []
    mp = os.path.join(pdir, "evidence", "manifest.jsonl")
    if os.path.exists(mp):
        with open(mp, encoding="utf-8") as f:
            entries = [json.loads(l) for l in f if l.strip()]
    todo = build_todo(state, design_text, entries)
    with open(os.path.join(pdir, "todo.md"), "w", encoding="utf-8") as f:
        f.write(todo)
    todo_json = build_todo_data(state, design_text, entries)
    with open(os.path.join(pdir, "todo.json"), "w", encoding="utf-8") as f:
        json.dump(todo_json, f, indent=2, ensure_ascii=False)
    print("refreshed %s/todo.md + todo.json (current_phase=%d, design=%s)"
          % (pdir, state.get("current_phase", 0), "yes" if design_text else "no"))


if __name__ == "__main__":
    main()
