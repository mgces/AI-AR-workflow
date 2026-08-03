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

# Path B1: physical phases 0-8. Old P1 (设计固化+代码开发) is now three real
# phases — design-orchestrate (1), feature-develop (2), test-develop (3); build
# and everything after it shift +2. Logical labels are unchanged, only the
# physical numbers.
PHASE_LABELS = [
    (0, "P0 环境初始化"),
    (1, "P1 设计固化"),
    (2, "P2 代码开发"),
    (3, "P3 测试用例编写"),
    (4, "P4 编译验证"),
    (5, "P5 单元测试验证"),
    (6, "P6 真机功能测试"),
    (7, "P7 质量验证"),
    (8, "P8 上库 review"),
]

NEXT_STEP_TEXT = {
    0: "跑 gate_env_init 后 advance --phase 0",
    1: "gate_design.py(AR_design+ar-contract)→ 人工 consent --phase 1 → advance --phase 1",
    2: "写功能代码 → gate_develop.py → advance --phase 2",
    3: "为每个 test_cases.gtest 写引用其 suite 的新测试文件 → gate_test_develop.py → advance --phase 3",
    4: "gate_build.py → advance --phase 4",
    5: "gate_test_ut.py(只增独立测试)→ advance --phase 5",
    6: "gate_device_func.py → 人工 consent → advance --phase 6",
    7: "gate_integration.py + 质量报告 → 人工 consent → advance --phase 7",
    8: "gate_upload_ci.py(两份 review + PR + CI)→ 人工 consent → advance --phase 8",
}

# Per-phase how-to. This is the on-disk guide a FRESH window reads to know not
# just WHAT the phase is but HOW to do it — which skills to load, which gate to
# run, what closes it, and the concrete steps. Kept terse; the authoritative
# detail is phaseN-*.md, referenced by `doc`. `consent` flags human sign-off.
PHASE_GUIDE = {
    0: {"skill": "ohos-ar-dev-init",
        "gate": "gate_env_init.py", "consent": False,
        "doc": "ohos-ar-dev-init/SKILL.md",
        "pass": "build/compile/git/testfwk/hdc/device 能力全通,产签名证据",
        "how": ["确认 --environment(openharmony / harmonyos+component-type)",
                "确认编译部件(git_dir/build_target/part)或 --confirm-defaults",
                "跑 gate_env_init.py 真实探测能力(不是纸面校验)",
                "真机连不上时:让用户在有设备的电脑跑 hdc -m -s 0.0.0.0:10086 start,报 IP:端口"]},
    1: {"skill": "kb_search → 写 AR_design.md",
        "gate": "gate_design.py", "consent": True,
        "doc": "ohos-ar-dev-phases/phase1-design.md",
        "pass": "签名 AR_design(6 章节 + ```ar-contract``` 契约块)+ 人工 consent",
        "how": ["先 kb_search.py 检索知识库生成 design_refs.md(advisory)",
                "写 AR_design.md:6 章节 + ar-contract 契约(changed_files/build_artifacts/"
                "test_cases[].gtest/device_cases[].marker)",
                "跑 gate_design.py 签名",
                "停下把签名设计呈现给用户 → consent --phase 1 --token <人>(P2 门内强校验)"]},
    2: {"skill": "code-ruleset-style-check + cpp-coding-style + sa-codegen/napi/tdd",
        "gate": "gate_develop.py", "consent": False,
        "doc": "ohos-ar-dev-phases/phase2-develop.md",
        "pass": "git/untracked diff 非空 + C++ 强门控报告;闭合锁定功能指纹",
        "how": ["先加载写码前契约 code-ruleset-style-check + cpp-coding-style",
                "按 AR_design 契约的 changed_files 写功能代码(见下方派生清单)",
                "跑 gate_develop.py(强制依赖签名 AR_design + P1 consent)",
                "⚠ 闭合即冻结功能代码——这不是收工,是进入写测试阶段"]},
    3: {"skill": "test-ut-generation + tdd-enforcer(只增独立测试)",
        "gate": "gate_test_develop.py", "consent": False,
        "doc": "ohos-ar-dev-phases/phase3-test-develop.md",
        "pass": "契约每个 test_cases.gtest 的 suite 出现在新测试文件中 + 规则门控",
        "how": ["为契约里每个 test_cases[].gtest 写引用其 suite 的新测试文件",
                "只允许新增独立测试文件,不得改功能路径(否则功能指纹漂移)",
                "跑 gate_test_develop.py(对新增测试源 --rules-only 规则门控)"]},
    4: {"skill": "build-execution-diagnosis / build-flash / code-ruleset(clang-tidy)",
        "gate": "gate_build.py", "consent": False,
        "doc": "ohos-ar-dev-phases/phase4-build.md",
        "pass": "build.log 成功横幅 + 契约 build_artifacts 全部编出 + clang-tidy 子步",
        "how": ["跑 gate_build.py(取环境 profile 的完整编译命令)",
                "失败读 evidence/phase4/error_distill.txt 定位 FAILED:/ninja 错误",
                "迭代快速试编可用 --fast-rebuild(HarmonyOS 已验证;门控本身不加此标)"]},
    5: {"skill": "test-ut-generation / tdd-enforcer(只增独立测试)",
        "gate": "gate_test_ut.py", "consent": False,
        "doc": "ohos-ar-dev-phases/phase5-test-author.md",
        "pass": "developer_test summary_report.xml + 契约每个 test_cases.gtest 通过",
        "how": ["用 developer_test 在真机跑单测",
                "契约每个 test_cases[].gtest 必须执行通过(执行覆盖,非编写覆盖)",
                "跑 gate_test_ut.py 校验 summary_report.xml"]},
    6: {"skill": "build-flash / hdc-command-usage",
        "gate": "gate_device_func.py", "consent": True,
        "doc": "ohos-ar-dev-phases/phase6-device-functional.md",
        "pass": "主机/设备产物 sha256 一致 + 含 nonce/marker 的真机 hilog + 人工 consent",
        "how": ["刷机/部署到真机(build-flash)",
                "跑 gate_device_func.py:抓含 nonce + 功能 marker 的真机 hilog",
                "契约每个 device_cases[].marker 必须命中",
                "停下把真机结果呈现给用户 → consent --phase 6 --token <人>"]},
    7: {"skill": "developer_test MST / coverage / performance / power / stability / review",
        "gate": "gate_integration.py", "consent": True,
        "doc": "ohos-ar-dev-phases/phase7-quality.md",
        "pass": "功能+覆盖率+性能+功耗+稳定性+代码 review 零问题 + 人工 consent",
        "how": ["跑六段质量验证,渲染 reports/quality.md",
                "跑 gate_integration.py",
                "停下把质量报告呈现给用户 → consent --phase 7 --token <人>"]},
    8: {"skill": "gitcode-cli / pr-review / committer-review / security / ci-analysis",
        "gate": "gate_upload_ci.py", "consent": True,
        "doc": "ohos-ar-dev-phases/phase8-upload-review.md",
        "pass": "本地自检零问题 + PR review 零问题 + PR + CI 绿(SHA 绑定)+ 人工 consent",
        "how": ["A 本地自检 + B PR review 两份都零问题",
                "推 PR,等 CI 绿(SHA 绑定)",
                "停下确认 → consent --phase 8 --token <人>(push 是唯一对外不可逆动作)"]},
}

# AR_design derived items → the phase each item actually serves. A fresh window
# then sees "this file is P2 work, this test point is P3/P5" instead of a flat
# undifferentiated pile.
DESIGN_ITEM_PHASE = {"files": 2, "test_points": 3, "device_cases": 6}
DESIGN_ITEM_LABEL = {
    "files": "实现文件(P2 开发)",
    "test_points": "测试功能点(P3 写测试 / P5 执行)",
    "device_cases": "真机用例(P6 真机验证)",
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
    di = data["design_items"]
    # AR_design items grouped by the phase they serve (files→P2, points→P3/5,
    # cases→P6), so each phase section can show its own derived checklist.
    items_for_phase = {}
    for key, pid in DESIGN_ITEM_PHASE.items():
        for it in di.get(key, []):
            items_for_phase.setdefault(pid, []).append((key, it))

    lines = ["<!-- generated by refresh_todo.py; do not hand-edit -->",
             "# TODO — %s" % data["run_id"], "",
             "当前阶段: **P%d %s**" % (cur, dict(PHASE_LABELS).get(cur, "").split(" ", 1)[-1]
                                       if dict(PHASE_LABELS).get(cur) else ""),
             "",
             "> 新窗口/换 agent 接手:先跑 `advance.py resume` 自举(读 specs/pipeline/ACTIVE 定位本 run)。",
             "> 这是一个循环,一路跑到 P8 才算完;每个 advance 只关一个阶段,关掉≠收工。",
             "", "## 阶段进度"]
    for phase in data["phases"]:
        mark = "x" if phase["status"] == "passed" else " "
        arrow = "  ⬅ 现在做这个" if phase["current"] else ""
        lines.append("- [%s] %s%s" % (mark, phase["label"], arrow))

    if not data["design_present"]:
        lines += ["", "> 无 AR_design.md(legacy run)——仅显示阶段进度与下一步。"]

    # Per-phase how-to sections. The CURRENT phase is expanded first-class; each
    # section carries what to do, which skill, which gate, the pass bar, the
    # concrete steps, and any AR_design-derived checklist items for that phase.
    lines += ["", "## 各阶段做什么 / 怎么做"]
    for pid, label in PHASE_LABELS:
        g = PHASE_GUIDE.get(pid, {})
        here = pid == cur
        status = dict((p["id"], p["status"]) for p in data["phases"]).get(pid, "pending")
        head_mark = "▶ " if here else ("✓ " if status == "passed" else "")
        lines += ["", "### %s%s%s" % (head_mark, label,
                                      "  ⬅ 现在做这个" if here else "")]
        if g.get("skill"):
            lines.append("- 做事(技能): %s" % g["skill"])
        if g.get("gate"):
            lines.append("- 门控: `%s`%s"
                         % (g["gate"], "  + 人工 consent" if g.get("consent") else ""))
        if g.get("pass"):
            lines.append("- 通过条件: %s" % g["pass"])
        if g.get("how"):
            lines.append("- 怎么做:")
            lines += ["  %d. %s" % (i + 1, s) for i, s in enumerate(g["how"])]
        # AR_design-derived checklist for this phase.
        for key, it in items_for_phase.get(pid, []):
            lines.append("  - [ ] (%s) %s" % (DESIGN_ITEM_LABEL[key].split("(")[0].strip(), it))
        if g.get("doc"):
            lines.append("- 详见: `%s`" % g["doc"])

    lines += ["", "## 下一步(当前 P%d)" % cur, "- %s" % data["next_action"]["text"]]
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
