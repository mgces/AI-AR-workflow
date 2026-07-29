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

1. Identify **changed** `.c/.cpp/.h` files (only the workflow's changed code — never the whole tree, never non-code files) and preserve existing project conventions.
2. Run `scripts/code_ruleset_guard.py` on those files. It runs the bundled formatter guard and two rule sources: **(a)** every sensitive word (敏感词 / banned brand & marketing terms) exported from the workbook into `data/ruleset_c.json` — 300+ gate-level rows, all checked; **(b)** a hand-curated set of regex-detectable `G.*` coding rules (header guards, `#pragma once`, `NULL`, unsafe process/memory/string APIs, lambda default captures, `goto`, header-scope `using namespace`, ...).
3. Every workbook row is 门禁级 (gate-level), so the guard does **not** filter by severity — ANY finding blocks. Severity (一般/严重/致命) is still reported per finding for triage. Do not claim a pass when the guard or rule source is missing.
4. Keep semantic review for ownership, API contracts, concurrency, validation, and metric rules (圈复杂度, 大函数, switch 分支数); the script cannot prove those and they are deliberately NOT encoded (would false-positive as line regex).

The rule data is regenerated from the workbook by `scripts/build_ruleset_data.py` (requires openpyxl; the guard itself does **not**). Re-run it only when the workbook changes.

The lifecycle workflow must use this skill as its sole code-style dependency. Do not substitute the legacy `ohos-dev-cpp-coding-style` or `openharmony-cpp` skills for gate decisions.

## Mandatory phases: run at author time, not at CI

The guard is a **hard blocker in BOTH development phases**, so blockers are caught
before code reaches the CI gate rather than leaking into it:

- **P2 feature-develop** (`gate_develop.py`): full mode — clang-format + rule blockers
  over changed C/C++ feature files.
- **P3 test-develop** (`gate_test_develop.py`): `--rules-only` over newly authored
  C/C++ test files. Format is skipped because gtest macro bodies legitimately vary in
  layout, but banned APIs / sensitive words in test code are blocked here too.

Both invocations resolve the guard via `gatelib.resolve_dep(...)` so they share one
source, and both fail closed if the guard is missing. Both are scoped to the
**changed** code files only. A regex/format finding surfacing only at the CI/OAT gate
— not at P2 or P3 — is a defect in this integration, not expected behavior.

The **clang-tidy AST rules** (`_CLANG_TIDY_RULE_MAP`) need a `compile_commands.json`,
which does not exist until code compiles, so they cannot run at P2/P3. They are pulled
in at **P4 build** (`gate_build.py`), immediately after the build success banner, once
the compile database is available — see "clang-tidy at P4" below. Any AST-class finding
that first surfaces at CI when a compile database *was* available at P4 is likewise an
integration defect.

### Guard modes

| Mode | Runs | Use |
|------|------|-----|
| (default) | clang-format + rules | P2 feature-develop, P7 quality re-check |
| `--rules-only` | rules only | P3 test-develop (layout must not block) |
| `--format-only` | clang-format only | ad-hoc formatting checks |
| `--clang-tidy BUILD_DIR` | + clang-tidy AST checks | P4 build (after compile), when `compile_commands.json` exists |

`--json PATH` writes the machine-readable finding list a gate attaches as evidence.

### clang-tidy at P4 (compile-database-gated, hard-block-or-degrade)

`_CLANG_TIDY_RULE_MAP` covers ~50 AST-level `G.*` rules (override, member init,
lifetime, type-safety, ...) that a single-line regex cannot judge. They need
`compile_commands.json`, so they are wired into **P4** (`gate_build.py`), not P2:

- After the build success banner, `gate_build.py` generates a compile database
  (`ninja -C out/<product> -t compdb cc cxx > out/<product>/compile_commands.json`,
  host prebuilt ninja preferred) and runs the guard with
  `--clang-tidy out/<product> --json evidence/phase4/clang_tidy_findings.json`
  over the P2-locked changed C/C++ files.
- **Compile database generated + clang-tidy on PATH → findings non-empty ⇒ P4 FAIL**
  (hard block, same tier as a build failure — fix the code and re-run from P2).
- **compdb generation fails / clang-tidy not on PATH ⇒ degrade to advisory**: an
  `evidence/phase4/clang_tidy_note.txt` note is written, P4 still PASSes (fail-open),
  and the note states plainly that clang-tidy did not run so CI may still flag these.

This is best-effort by design: compdb generation can be expensive, so a missing tool
must not stall the pipeline. When it *does* run, it is a real gate.

### Repository-level OAT rules (external tooling required)

The following workbook rows cannot be checked at the individual-file level and require
a full-repository OAT (Open Source Audit Tool) scan.  They are acknowledged here so the
manifest maps every rule to a backend:

| Rule ID | Severity | Rule Name | Required Tool |
|---------|----------|-----------|---------------|
| OAT.2   | 致命     | 许可证兼容性 | FossScan / scancode |
| OAT.5   | 致命     | 无LICENSE文件 | Repo-level file existence check |
| OAT.7   | 严重     | 无README.OpenSource | Repo-level file existence check |
| OAT.8   | 一般     | 无README | Repo-level file existence check |
| OAT.9   | 一般     | 三方软件版本 | OAT / SW360 |
| FossScan.1 | 致命  | OpenSource Software | FossScan |

These rules are **not** enforced by `code_ruleset_guard.py` or `file_hygiene_guard.py`;
they must be checked by the CI OAT pipeline before upload.
