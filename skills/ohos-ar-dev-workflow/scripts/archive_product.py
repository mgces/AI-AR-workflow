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


README_TEXT = """# 本产物如何复核

本目录是一次流水线运行的**脱敏交付物**,只保留:

- `ar.md` —— 脱敏后的架构需求(AR)。
- `manifest_summary.md` —— 脱敏证据账本摘要(阶段/verdict/reason/产物 sha256)。

原始、可 HMAC 验签的完整证据留在**本地 run-state 目录**(`specs/pipeline/<run>/`,
已 gitignore,不进仓),复核步骤:

```bash
S=~/.claude/skills/ohos-ar-dev-phases/scripts
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

    print("\nDONE. Product is redacted; commit only %s." % outdir)
    print("Raw signed evidence stays in the local run-state dir (gitignored).")


if __name__ == "__main__":
    main()
