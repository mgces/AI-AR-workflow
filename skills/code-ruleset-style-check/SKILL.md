---
name: code-ruleset-style-check
description: Run the deterministic local subset of OpenHarmony C/C++ code_ruleset checks, record tool-dependent/advisory ownership, and honor repository codecheck ignores. Use during implementation and local quality gates; use ohos-ci-local-precheck or remote CI for CI-near/authoritative verdicts.
metadata:
  source: code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx
  rule_count: 545
  language: C++
---

# code_ruleset C/C++ local precheck

The workbook in `code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx` is the rule catalog (545 rows). `data/ruleset_coverage.json` is an ownership map, not a claim that all rows were executed. Its backend capabilities distinguish `deterministic-local`, `tool-dependent-local`, `advisory`, and `ci-only`. Never call this skill CI-equivalent.

Before writing code in P2 or P3, load [references/pre-write-contract.md](references/pre-write-contract.md). It is a concise authoring contract derived from the same manifest; it prepares the model to avoid violations before they are typed. It does not replace the guard, does not create a second rule source, and cannot be used as PASS evidence.

## Required workflow

1. Identify **changed** `.c/.cpp/.h` files (only the workflow's changed code — never the whole tree, never non-code files) and preserve existing project conventions.
2. Run `scripts/code_ruleset_guard.py` on those files. It resolves OpenHarmony prebuilt clang tools before PATH, scans sensitive terms in code/comments/strings, and executes the local regex/multiline subset. Pass `--repository-root` so an unambiguous `codecheck_ignore.json` is honored and recorded.
3. A PASS applies only to executed deterministic/tool backends. Missing format tooling is a dependency failure; missing clang-tidy or metrics is `unavailable`, not clean. Remote CI remains the final verdict.
4. Keep semantic review for ownership, API contracts, concurrency, validation, and rows owned by P4/P7/CI. The coverage map must name that owner; never delete a row merely because a line regex cannot prove it.

## Pre-write versus gate-time responsibilities

- **Before editing**: apply the pre-write contract, load the OpenHarmony-specific
  guidance from `ohos-dev-cpp-coding-style`, and inspect nearby files.
- **After editing**: run this skill's shared guard on changed files. It is the
  hard PASS source only for its executed local subset; a model self-check,
  ownership row, or unavailable backend is never a gate result.
- **Later owners**: honor the coverage manifest for clang-tidy, metrics,
  repository OAT, and semantic review. Full workbook coverage means every row is
  owned and accounted for, not that every backend can run before the first edit.

The rule data is regenerated from the workbook by `scripts/build_ruleset_data.py` (requires openpyxl; the guard itself does **not**). Re-run it only when the workbook changes.

The lifecycle workflow uses this skill for deterministic local code-style checks. `ohos-dev-cpp-coding-style` supplies authoring guidance, `ohos-ci-local-precheck` optionally supplies a checksum-pinned CI-near run, and remote CI is authoritative.

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

Metric rows (`G.FUD.*`, `G.FUN.*`, `G.INC.11-CPP`) run after a successful P4
build through `scripts/code_ruleset_metric.py`. Function metrics require
`lizard`; without it the backend exits `unavailable` and the phase must not
record a metric PASS. File-size checks still run but do not substitute for the
missing function analysis.

### Guard modes

| Mode | Runs | Use |
|------|------|-----|
| (default) | clang-format + rules | P2 feature-develop, P7 quality re-check |
| `--rules-only` | rules only | P3 test-develop (layout must not block) |
| `--format-only` | clang-format only | ad-hoc formatting checks |
| `--clang-tidy BUILD_DIR` | + clang-tidy AST checks | P4 build (after compile), when `compile_commands.json` exists |

`--json PATH` writes the machine-readable finding list a gate attaches as evidence.

### clang-tidy at P4 (compile-database-gated, hard-block-or-degrade)

`_CLANG_TIDY_RULE_MAP` maps selected AST-level `G.*` rules (override, member init,
lifetime, type-safety, ...). A mapping records intended ownership, not proof of
semantic equivalence with CodeArts. They need
`compile_commands.json`, so they are wired into **P4** (`gate_build.py`), not P2:

- After the build success banner, `gate_build.py` generates a compile database
  (`ninja -C out/<product> -t compdb cc cxx > out/<product>/compile_commands.json`,
  host prebuilt ninja preferred) and runs the guard with
  `--clang-tidy out/<product> --json evidence/phase4/clang_tidy_findings.json`
  over the P2-locked changed C/C++ files.
- **Compile database generated + clang-tidy on PATH → findings non-empty ⇒ P4 FAIL**
  (hard block, same tier as a build failure — fix the code and re-run from P2).
- **compdb generation fails / clang-tidy unavailable ⇒ degrade to advisory**: an
  `evidence/phase4/clang_tidy_note.txt` note is written, P4 still PASSes (fail-open),
  and the note states plainly that clang-tidy did not run so CI may still flag these.

This is best-effort by design. When clang-tidy exits abnormally or its output is
unreadable, the guard records the execution error instead of returning a clean result.

## CI-near precheck

At P7/P8, use `ohos-ci-local-precheck` when an approved CodeArts engine JAR and
its expected SHA-256 are available. That skill preserves logs and fails closed;
it never downloads an engine automatically. If unavailable, record that state
and rely on remote CI rather than claiming local parity.

### Repository-level OAT rules (external tooling required)

The following workbook rows cannot be checked at the individual-file level and require
a full-repository OAT (Open Source Audit Tool) scan.  They are acknowledged here so the
manifest maps every rule to a backend:

| Rule ID | Severity | Rule Name | Required Tool |
|---------|----------|-----------|---------------|
| OAT.1   | 严重     | 二进制文件 | Repository scan |
| OAT.2   | 致命     | 许可证兼容性 | FossScan / scancode |
| OAT.3   | 严重     | 许可证头 | Repository scan |
| OAT.4   | 严重     | 版权头 | Repository scan |
| OAT.5   | 致命     | 无LICENSE文件 | Repo-level file existence check |
| OAT.6   | 严重     | 冗余或未定义的LICENSE文件 | Repository scan |
| OAT.7   | 严重     | 无README.OpenSource | Repo-level file existence check |
| OAT.8   | 一般     | 无README | Repo-level file existence check |
| OAT.9   | 一般     | 三方软件版本 | OAT / SW360 |
| OAT.10  | 一般     | 特殊词汇 | Repository scan |
| FossScan.1 | 致命  | OpenSource Software | FossScan |

These repository-level rules are **not** enforced by `code_ruleset_guard.py` or
`file_hygiene_guard.py`; they must be checked by the CI OAT pipeline before upload.
`OAT.1` is the one local exception in the coverage map: changed binary artifacts
are rejected by `file_hygiene_guard.py` at author time, while the repository scan
still remains responsible for the complete tree.
