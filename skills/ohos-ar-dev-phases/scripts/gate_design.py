#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_design.py — Phase 1a (design fix). Runs BEFORE any code is written.

P1 is split into two sub-gates that both emit to phase 1:
  1. gate_design.py  — fix and sign AR_design.md (this file)
  2. gate_develop.py — write code; refuses unless a signed AR_design exists

AR_design.md must, before implementation, pin the full plan a deterministic gate
can verify by SECTION PRESENCE + non-empty body:
  * 目标组件
  * 详细功能需求
  * 完整代码框架 (with file-list / per-file-role / per-file-skeleton anchors)
  * 完整测试框架
  * 需测试的功能点
  * 真机测试用例构造

The doc is copied into evidence/phase1/AR_design.md and HMAC-signed via emit, so
later phases (and gate_develop's dependency check) are bound to its exact bytes.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    ap.add_argument("--design", help="path to AR_design.md (default: <PDIR>/AR_design.md)")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    gl.evidence_dir(pdir, 1)

    src = args.design or os.path.join(pdir, "AR_design.md")
    if not os.path.isfile(src):
        gl.emit(pdir, 1, "gate_design.py", verdict="FAIL",
                reason="AR_design.md not found at %s — write the design first" % src,
                artifacts_rel=[])
        sys.exit("PHASE 1a FAIL: AR_design.md not found (%s)" % src)

    with open(src, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    # copy into evidence so the signed artifact IS the reviewed design bytes
    design_rel = "evidence/phase1/AR_design.md"
    with open(os.path.join(pdir, design_rel), "w", encoding="utf-8") as f:
        f.write(text)

    ok, per_section, missing = gl.check_design_sections(text)

    check_rel = "evidence/phase1/design_check.txt"
    with open(os.path.join(pdir, check_rel), "w", encoding="utf-8") as f:
        f.write("source=%s\nsections_ok=%s\n\n" % (src, ok))
        for name, present, detail in per_section:
            f.write("[%s] %-18s %s\n" % ("OK " if present else "BAD", name, detail))
        if missing:
            f.write("\nmissing/incomplete: %s\n" % ", ".join(missing))

    reason = "design sections %d/%d ok%s" % (
        len(per_section) - len(missing), len(per_section),
        "" if ok else " (missing: %s)" % ", ".join(missing))
    print(reason)
    verdict = "PASS" if ok else "FAIL"
    gl.emit(pdir, 1, "gate_design.py", verdict=verdict, reason=reason,
            artifacts_rel=[design_rel, check_rel])
    if ok:
        print("PHASE 1a PASS — AR_design signed. Now write code, then gate_develop.py.")
    else:
        sys.exit("PHASE 1a FAIL: %s" % reason)


if __name__ == "__main__":
    main()
