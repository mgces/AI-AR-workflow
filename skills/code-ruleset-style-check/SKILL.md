---
name: code-ruleset-style-check
description: Check and review OpenHarmony C/C++ code against the repository's code_ruleset C++ gate rules. Use for implementation, review, formatting, CI readiness, or lifecycle gate checks involving C/C++ style and security rules.
metadata:
  source: code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx
  rule_count: 545
  language: C++
---

# code_ruleset C++ style gate

The workbook in `code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx` is the source of truth (545 C++ rules: 421 general, 112 severe, 9 fatal, 3 advisory). Apply rules by severity: fatal/severe block a gate; general and advisory are reported unless the workflow explicitly promotes them.

## Required workflow

1. Identify changed `.c/.cpp/.h` files and preserve existing project conventions.
2. Run `scripts/code_ruleset_guard.py` on those files. It runs the bundled formatter guard and deterministic blockers derived from the workbook (header guards, forbidden `#pragma once`, `NULL`, unsafe process/memory APIs, lambda default captures, and sensitive-string patterns).
3. Report each finding with rule ID/category, file and line, severity, and a concrete remediation. Do not claim a pass when the guard or rule source is missing.
4. Keep semantic review for ownership, API contracts, concurrency, and validation; the script cannot prove those properties.

The lifecycle workflow must use this skill as its sole code-style dependency. Do not substitute the legacy `ohos-dev-cpp-coding-style` or `openharmony-cpp` skills for gate decisions.
