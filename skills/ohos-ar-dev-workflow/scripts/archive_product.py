#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
archive_product.py — turn a finished pipeline run into a REDACTED, committable
product summary.

Raw run-state evidence (env.json, hilog captures, pipeline.json) carries
machine-specific secrets: real device serials, personal $HOME paths, WSL bridge
ports. Those must NEVER enter the shared repo. The original one-off archive
script copied evidence verbatim and leaked a real device serial + personal
paths into git history.

This tool replaces that flow. It reads pipeline.json + manifest.jsonl from the
LOCAL run-state directory and emits a stable, redacted product tree:

    products/<run>/
      ar.md                 # redacted copy of the AR text
      manifest_summary.md   # redacted evidence ledger summary (NO raw artifacts)
      README.md             # how to re-verify the real signed evidence locally

The real, HMAC-verifiable evidence stays in the local pipeline dir (which is
gitignored). The product deliberately trades "signed-evidence-in-repo" for
"no-secrets-in-repo" — a redacted summary cannot be HMAC-verified, and that is
the intended contract (see the workflow SKILL.md "完成" section).
"""
import argparse
import json
import os
import re
import sys

# ----------------------------------------------------------------------------
# redaction — the single choke point every archived byte passes through.
# Patterns are ordered; each maps a secret shape to a stable placeholder.
# ----------------------------------------------------------------------------
_REDACTIONS = (
    # 32-hex device serial (e.g. deadbeefcafef00d0123456789abcdef). Anchored on
    # word boundaries so it does not eat sha256 (64 hex) — those are 64 chars and
    # will not match this 32-char rule.
    (re.compile(r"\b[0-9a-fA-F]{32}\b"), "<REDACTED-SERIAL>"),
    # personal home directories: /home/<user>[/...] -> ~[/...]
    (re.compile(r"/home/[^/\s\"']+"), "~"),
    # WSL->Windows hdc bridge host:port and bare bridge port
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}:\d+\b"), "<REDACTED-HOST:PORT>"),
    (re.compile(r"\bwsl_bridge_port=\d+"), "wsl_bridge_port=<REDACTED>"),
    (re.compile(r"\bHDC_WIN_PORT=\d+"), "HDC_WIN_PORT=<REDACTED>"),
)


def redact(text):
    """Replace every known secret shape with a stable placeholder. Idempotent:
    running it twice yields the same output (placeholders match nothing)."""
    if not text:
        return text
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


# ----------------------------------------------------------------------------
# manifest summary — a redacted, artifact-free view of the signed ledger.
# We intentionally do NOT copy artifact bytes (they carry the secrets); we keep
# only the per-phase verdict/gate/reason and each artifact's path + sha256 so a
# reader can cross-check against the local run-state ledger if they have it.
# ----------------------------------------------------------------------------
def read_manifest(pdir):
    path = os.path.join(pdir, "evidence", "manifest.jsonl")
    if not os.path.exists(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def build_manifest_summary(state, entries):
    lines = ["# 证据账本摘要(脱敏)", ""]
    lines.append("> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,"
                 "不含原始产物字节,无法 HMAC 验签。")
    lines.append("> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。")
    lines.append("")
    lines.append("- run_id: `%s`" % redact(str(state.get("run_id", ""))))
    lines.append("- build_target: `%s`" % redact(str(state.get("build_target", ""))))
    lines.append("- base_commit: `%s`" % str(state.get("base_commit", ""))[:40])
    lines.append("")
    phase_name = {p["id"]: p.get("name", "") for p in state.get("phases", [])}
    for e in entries:
        ph = e.get("phase")
        lines.append("## P%s %s — %s" % (ph, phase_name.get(ph, ""), e.get("verdict", "")))
        lines.append("- gate: `%s`" % e.get("gate", ""))
        lines.append("- reason: %s" % redact(str(e.get("reason", ""))))
        arts = e.get("artifacts", [])
        if arts:
            lines.append("- artifacts (path : sha256):")
            for a in arts:
                lines.append("  - `%s` : `%s`" % (redact(a.get("path", "")), a.get("sha256", "")))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


# ----------------------------------------------------------------------------
# feature spec sink — turn a finished pipeline run into a knowledge-base feature
# doc (fact skeleton). We produce ONLY facts the evidence reliably yields (target
# component, changed files, build/test targets, per-phase verdicts, device
# markers); deep analysis (data model / state machine) is left as an explicit
# TODO placeholder — never fabricated. All text passes through redact().
# ----------------------------------------------------------------------------
def _split_md_sections(text):
    """(heading_line, body_text) per markdown heading; body spans until the next
    heading of equal-or-higher level (so a parent includes its subsections)."""
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


def _section_body(text, keywords):
    for head, body in _split_md_sections(text or ""):
        if any(k in head for k in keywords):
            return body.strip()
    return ""


def read_ev(pdir, rel, limit=4000):
    p = os.path.join(pdir, rel)
    if not os.path.isfile(p):
        return ""
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read()[:limit]


def phase_verdict(entries, phase):
    hits = [e for e in entries if e.get("phase") == phase
            and e.get("verdict") in ("PASS", "FAIL")]
    return hits[-1] if hits else None


def build_feature_spec(pdir, state, entries, subsys, comp, feat):
    """Return a redacted feature-spec markdown (fact skeleton + TODO placeholders)."""
    design = read_ev(pdir, "evidence/phase1/AR_design.md", 100000) \
        or read_ev(pdir, "AR_design.md", 100000)
    changed = read_ev(pdir, "evidence/phase1/changed_files.txt", 8000)
    run_meta = read_ev(pdir, "evidence/phase6/run_meta.txt", 2000)

    def sec(kw, fallback="> TODO(人工补充):证据不足,读源码补充。"):
        b = _section_body(design, kw)
        return redact(b) if b else fallback

    def verdict_line(ph, name):
        e = phase_verdict(entries, ph)
        return "- %s:%s — %s" % (name, e.get("verdict") if e else "N/A",
                                 redact(e.get("reason", "")) if e else "—")

    L = []
    L.append("# %s" % redact(feat))
    L.append("")
    L.append("> **本文件由流水线 `archive_product.py --sink-feature` 自动沉淀的事实骨架。**")
    L.append("> 深度分析(数据模型/状态机等)标 `TODO(人工补充)`,需读源码补全后再并入知识库。")
    L.append("")
    L.append("## 归属")
    L.append("")
    L.append("```text")
    L.append("subsystem -> component -> feature")
    L.append("%s -> %s -> %s" % (redact(subsys), redact(comp), redact(feat)))
    L.append("```")
    L.append("")
    L.append("## 目标与当前实现")
    L.append("")
    L.append(sec(["目标组件", "详细功能需求", "功能需求"]))
    L.append("")
    L.append("## 文件职责")
    L.append("")
    file_list = _section_body(design, ["文件清单", "文件列表", "file list"])
    if file_list:
        L.append(redact(file_list))
    elif changed:
        L.append("变更文件(来自 P1 changed_files.txt):")
        L.append("")
        L.append("```")
        L.append(redact(changed.strip()))
        L.append("```")
    else:
        L.append("> TODO(人工补充):文件清单缺失。")
    L.append("")
    L.append("## 构建与测试")
    L.append("")
    L.append("- build_target: `%s`" % redact(str(state.get("build_target", ""))))
    L.append("- testpart: `%s`" % redact(str((state.get("test") or {}).get("part", ""))))
    L.append("")
    L.append("测试结果(来自签名证据):")
    L.append(verdict_line(3, "P3 单元测试"))
    L.append(verdict_line(4, "P4 真机功能"))
    L.append(verdict_line(5, "P5 质量验证"))
    L.append("")
    L.append("## 装载 / 运行链")
    L.append("")
    L.append(sec(["代码框架", "code framework", "装载", "运行链"]))
    if run_meta:
        L.append("")
        L.append("真机运行标记(P4 run_meta,已脱敏):")
        L.append("")
        L.append("```")
        L.append(redact(run_meta.strip()))
        L.append("```")
    L.append("")
    L.append("## 数据模型")
    L.append("")
    L.append("> TODO(人工补充):证据不含数据结构定义,读源码补充关键类型。")
    L.append("")
    L.append("## 状态机 / 核心流程")
    L.append("")
    L.append("> TODO(人工补充):读源码补充状态转移与主流程。")
    L.append("")
    L.append("## 需测试的功能点")
    L.append("")
    L.append(sec(["需测试", "功能点", "test point"]))
    L.append("")
    L.append("## 风险 / 安全")
    L.append("")
    L.append(sec(["风险", "安全"], "> TODO(人工补充):结合 P5 review 结果补风险清单。"))
    L.append("")
    return "\n".join(L).rstrip() + "\n"


README_TEXT = """# 本产物如何复核

本目录是一次流水线运行的**脱敏交付物**,只保留:

- `ar.md` —— 脱敏后的架构需求(AR)。
- `manifest_summary.md` —— 脱敏证据账本摘要(阶段/verdict/reason/产物 sha256)。

原始、可 HMAC 验签的完整证据留在**本地 run-state 目录**(`specs/pipeline/<run>/`,
已 gitignore,不进仓),复核步骤:

```bash
AGENT_SKILLS_DIR="${AGENT_SKILLS_DIR:-$HOME/.claude/skills}"
S="$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts"
python3 $S/advance.py --pipeline-dir <本地 PDIR> verify-all   # 重校验全部签名证据
python3 $S/advance.py --pipeline-dir <本地 PDIR> status
```

脱敏摘要里的产物 sha256 可与本地 `evidence/manifest.jsonl` 对应记录逐条比对。
"""


def main():
    ap = argparse.ArgumentParser(description="produce a redacted, committable product summary")
    ap.add_argument("--pipeline-dir", required=True,
                    help="local run-state dir (specs/pipeline/<run>) — read only")
    ap.add_argument("--product-dir", required=True,
                    help="output dir, e.g. products/<run> (created if absent)")
    ap.add_argument("--ar", help="path to the AR source md (default: <pipeline-dir>/ar.md)")
    ap.add_argument("--include-reports", action="store_true",
                    help="also copy <pipeline-dir>/reports/*.html into the product, "
                         "redacted (human-readable audit reports)")
    ap.add_argument("--sink-feature", metavar="SUBSYS/COMPONENT/FEATURE",
                    help="also sink a knowledge-base feature spec (fact skeleton) for "
                         "this run into <kb-root>/subsystems/.../features/<feature>/. "
                         "Give the path explicitly (orchestrator knows git_dir/target); "
                         "not guessed from AR_design.")
    ap.add_argument("--kb-root", default="openharmony-knowledge-base",
                    help="knowledge-base root for --sink-feature (default: "
                         "openharmony-knowledge-base)")
    args = ap.parse_args()

    pdir = os.path.abspath(args.pipeline_dir)
    outdir = os.path.abspath(args.product_dir)
    state_path = os.path.join(pdir, "pipeline.json")
    if not os.path.isfile(state_path):
        sys.exit("ERROR: pipeline.json not found in %s" % pdir)
    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)

    os.makedirs(outdir, exist_ok=True)

    # 1. redacted AR
    ar_src = args.ar or os.path.join(pdir, "ar.md")
    if os.path.isfile(ar_src):
        with open(ar_src, "r", encoding="utf-8", errors="replace") as f:
            ar_text = f.read()
        with open(os.path.join(outdir, "ar.md"), "w", encoding="utf-8") as f:
            f.write(redact(ar_text))
        print("wrote %s/ar.md (redacted)" % outdir)
    else:
        print("WARNING: no AR source at %s — skipping ar.md" % ar_src)

    # 2. redacted manifest summary (no raw artifacts)
    entries = read_manifest(pdir)
    with open(os.path.join(outdir, "manifest_summary.md"), "w", encoding="utf-8") as f:
        f.write(build_manifest_summary(state, entries))
    print("wrote %s/manifest_summary.md (%d ledger entries, redacted)" % (outdir, len(entries)))

    # 3. re-verify instructions
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write(README_TEXT)
    print("wrote %s/README.md" % outdir)

    # 4. optional: redacted human-readable HTML reports
    if args.include_reports:
        src_reports = os.path.join(pdir, "reports")
        n = 0
        if os.path.isdir(src_reports):
            dst_reports = os.path.join(outdir, "reports")
            os.makedirs(dst_reports, exist_ok=True)
            for fn in sorted(os.listdir(src_reports)):
                if not fn.endswith((".html", ".md")):
                    continue
                with open(os.path.join(src_reports, fn), "r", encoding="utf-8",
                          errors="replace") as f:
                    body = f.read()
                with open(os.path.join(dst_reports, fn), "w", encoding="utf-8") as f:
                    f.write(redact(body))
                n += 1
        print("wrote %d redacted report file(s) to %s/reports" % (n, outdir))

    # 5. optional: sink a knowledge-base feature spec (fact skeleton)
    if args.sink_feature:
        parts = [p for p in args.sink_feature.split("/") if p]
        if len(parts) != 3:
            sys.exit("ERROR: --sink-feature expects SUBSYS/COMPONENT/FEATURE, got %r"
                     % args.sink_feature)
        subsys, comp, feat = parts
        entries = read_manifest(pdir)
        spec = build_feature_spec(pdir, state, entries, subsys, comp, feat)
        feat_dir = os.path.join(os.path.abspath(args.kb_root),
                                "subsystems", subsys, "features", feat)
        os.makedirs(feat_dir, exist_ok=True)
        target = os.path.join(feat_dir, "README.md")
        # never clobber a human-authored/deepened spec
        if os.path.exists(target):
            target = os.path.join(feat_dir, "README.generated.md")
            note = " (README.md exists — wrote README.generated.md for manual merge)"
        else:
            note = ""
        with open(target, "w", encoding="utf-8") as f:
            f.write(spec)
        print("sank feature spec -> %s%s" % (target, note))

    print("\nDONE. Product is redacted; commit only %s." % outdir)
    print("Raw signed evidence stays in the local run-state dir (gitignored).")


if __name__ == "__main__":
    main()
