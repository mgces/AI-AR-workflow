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
3. A standalone PASS applies only to executed deterministic/tool backends; missing format tooling makes that run fail. The lifecycle gates classify the same `--json` report under the explicit critical subset below — format and non-critical findings there are signed observation, not phase blockers. Missing clang-tidy or metrics is `unavailable`, never clean; P4 fails closed for the clang-tidy subset. Remote CI remains the final verdict.
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

## Lifecycle policy: full scan, explicit critical subset blocks

The guard still scans at author time in both development phases, but the lifecycle
gates consume its existing `--json` report under an explicit, single-sourced policy
(`gatelib.P2_P3_CRITICAL_RULESET_IDS`). Everything outside that subset stays in the
signed report/JSON as observation and is owned by P8 review / remote CI.

- **P2 feature-develop** (`gate_develop.py`): default mode — clang-format + rules
  over changed C/C++ feature files. clang-format, non-critical regex, sensitive-word
  and filename findings do **not** close P2.
- **P3 test-develop** (`gate_test_develop.py`): `--rules-only` over newly authored
  C/C++ test files, scoped to changed lines. Other rules and file hygiene do **not**
  close P3.

The blocking P2/P3 subset is exactly:

`G.FUU.21`, `G.FUU.21-CPP`, `G.STR.01`, `G.ARR.03`, `G.MEM.05`, `G.FUU.10`,
`G.EXP.03`, `G.EXP.33-CPP`, `G.INT.04`, `G.EXP.26-CPP`.

Both invocations resolve the guard via `gatelib.resolve_dep(...)`, remove any
previous report before scanning, and fail closed if the guard is missing or the
current report is missing/unreadable. A critical finding that first surfaces at CI
after a successful P2/P3 scan is an integration defect. A format or non-critical
finding there is expected to be handled by P8 review / CI, not guaranteed by P2/P3.

The **clang-tidy AST rules** (`_CLANG_TIDY_RULE_MAP`) need a `compile_commands.json`,
which does not exist until code compiles, so they cannot run at P2/P3. They are pulled
in at **P4 build** (`gate_build.py`), immediately after the successful build, once
the compile database is available — see "clang-tidy at P4" below.

Metric rows (`G.FUD.*`, `G.FUN.*`, `G.INC.11-CPP`) still run after a successful P4
build through `scripts/code_ruleset_metric.py`, but under the lifecycle policy their
output is signed observation evidence only. Function metrics require `lizard`; when
it is missing the metric observation records a `metric-backend` marker rather than
claiming a pass. P8 review / remote CI own metric acceptance; P7 quality verification
keeps its existing contracts.

### Guard modes

| Mode | Runs | Use |
|------|------|-----|
| (default) | clang-format + rules | P2 feature-develop, P7 quality re-check |
| `--rules-only` | rules only | P3 test-develop (layout must not block) |
| `--format-only` | clang-format only | ad-hoc formatting checks |
| `--clang-tidy BUILD_DIR` | + clang-tidy AST checks | P4 build (after compile), when `compile_commands.json` exists |

`--json PATH` writes the machine-readable finding list a gate attaches as evidence.
In the lifecycle P2/P3 gates, the mode selects what is **scanned**, not the verdict:
the explicit critical subset above decides pass/fail, and the remaining results are
observation evidence.

### clang-tidy at P4 (critical AST subset, fail-closed)

`_CLANG_TIDY_RULE_MAP` maps selected AST-level `G.*` rules (override, member init,
lifetime, type-safety, ...). A mapping records intended ownership, not proof of
semantic equivalence with CodeArts. They need
`compile_commands.json`, so they are wired into **P4** (`gate_build.py`), not P2:

- After the successful build, `gate_build.py` generates a compile database
  (`ninja -C out/<product> -t compdb cc cxx > out/<product>/compile_commands.json`,
  host prebuilt ninja preferred) and runs the guard with
  `--clang-tidy out/<product> --json evidence/phase4/clang_tidy_findings.json`
  over the actual changed C/C++ files.
- Only `gatelib.P4_CRITICAL_AST_RULESET_IDS` blocks: `G.RES.07-CPP`, `G.FUU.11`,
  `G.VAR.01`, `G.EXP.08-CPP`, `G.STD.04-CPP`, `G.EXP.12-CPP`, `G.INT.03`.
  Other clang-tidy/content findings remain in the signed JSON as observation.
- **Tool, compile database, report or diagnostic failure is fail-closed**: missing
  ninja/clang-tidy, compdb generation failure, timeout, abnormal exit, unreadable
  report, or a checker-tagged diagnostic the parser cannot read all produce a
  blocking `clang-tidy-backend` status. It is never "unavailable = clean" and
  rule-id filtering never drops a backend finding.
- Each scan clears the previous report first; only this invocation's report may
  authorize a clean static result. The signed note states whether the scan ran and
  how many non-blocking observations were recorded.

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
