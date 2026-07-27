# Workflow Hardening — Design Spec (2026-07-27)

Status: **implemented** (fixes 1–3). Companion backlog in `todo.md`.

This batch follows the weak-model optimization work
(`../20260723-weak-model-optimization/`). That effort brought the design-constraint
implementation to ~92% and weak-model autonomy confidence to ~82%. During the audit
three concrete defects surfaced that let avoidable failures reach late/irreversible
phases. This spec records the fixes.

---

## Fix 1 — Enforce code_ruleset at author time (P2 feature-develop + P3 test-develop)

### Problem
`code-ruleset-style-check/scripts/code_ruleset_guard.py` encoded only 9 of the 545
workbook rules, and **test files were never rule-checked before build**. Banned
APIs / sensitive strings in either feature code or test code therefore slipped past
the development gates and only surfaced at the CI / OAT (黄区) gate — the most
expensive place to discover them, and a place a weak model cannot self-repair from
without re-running the whole tail of the pipeline.

### Change
1. **Guard strengthened — now checks ALL gate-level rules, not just severe/fatal.**
   The workbook has 545 门禁级 (gate-level) rows; every one blocks CI, so the guard
   must not filter by severity.
   - **Sensitive words (敏感词): all 304 exported.** `scripts/build_ruleset_data.py`
     parses the workbook's 307 `WordsTool.*` rows into `data/ruleset_c.json`
     (rule_id, word, severity). The guard loads that JSON at runtime (no openpyxl
     dependency at gate time) and matches each word — ASCII alphanumeric tokens on
     word boundaries (case-insensitive, so `aar` doesn't fire inside `aardvark`),
     space/punct tokens as case-insensitive substrings, CJK tokens as plain
     substrings.
   - **Regex coding rules: 15 high-precision `G.*` blockers** kept in-code (added
     `G.SEC.03` `system(`, `G.SEC.04` `popen(`, `G.SEC.05` `gets(`, `G.SEC.06`
     unbounded `strcpy|strcat|sprintf|vsprintf|stpcpy`, `G.CTL.01` `goto`,
     `G.NAM.02` header-scope `using namespace`, ...). The remaining semantic /
     metric `G.*` + tool rows (圈复杂度, 大函数, switch 分支数, FossScan, ...) are
     deliberately NOT encoded — as line regex they would false-positive — and stay
     in human/skill review.
   - **No severity filter.** ANY finding (一般/严重/致命/提示) returns nonzero, matching
     the CI gate. Severity is still reported per finding for triage.
   - `main()` gains mutually-exclusive `--rules-only` / `--format-only`, a
     `--json PATH` finding dump, and positional `files`.

2. **Scope: changed code files only.** The guard keeps only C/C++ source (EXTS)
   among the files it is passed, and every caller passes only the *changed* files
   (`gate_develop`/`gate_integration` via `collect_changed_files`→`source_files`;
   `gate_test_develop` via `new_tests`). Unchanged files and non-code files are
   never scanned — this keeps the full-ruleset (incl. 敏感词) sweep precise instead
   of noisy.

3. **P2 wiring (`gate_develop.py`, `gate_integration.py`).** These already ran the
   guard but passed `--format-only` (which was a silent no-op — files are filtered
   by suffix regardless). The flag was removed so they now run **format + rules**
   over the changed C/C++ files. Report label `code_ruleset_guard (format+rules)`.

4. **P3 wiring (`gate_test_develop.py`, the core gap).** New
   `_rule_check_new_tests(pdir, gdir, new_tests)`:
   - filters newly authored files to C/C++ extensions;
   - runs the guard `--rules-only --json evidence/phase3/test_style_findings.json`
     (rules only — gtest macro bodies legitimately vary in layout, so clang-format
     must not block authorship, but banned APIs / sensitive words in test code must);
   - writes `evidence/phase3/test_style_report.txt`;
   - **fails closed** if the guard binary is missing (a silent bypass can never
     masquerade as clean);
   - wired into `main()`: findings feed `problems`, evidence path appended to
     `arts`.

### Why rules-only in P3 and not clang-format
Enforcing clang-format in P3 would falsely reject legitimate gtest layouts (e.g. a
one-line `TEST(ATest, Case001){...}` fixture). `--rules-only` blocks banned
APIs/strings without touching layout.

### Verification
- Guard smoke-tested: clean file → pass (`15 regex rule(s) + 304 sensitive word(s)
  checked`); bad file flags `G.EXP.35-CPP` / `G.SEC.06` plus sensitive words
  `WordsTool.8 (aidl)` / `WordsTool.10 (Android)`; a non-code `.txt` is ignored.
- P2/P3 gate unit tests green (full suite 264 + 24 + 4 OK).
- Resolution shared: both P2 and P3 resolve the guard via
  `gatelib.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
  env_var="CODE_RULESET_GUARD")`.

### Docs
- `code-ruleset-style-check/SKILL.md`: added "Mandatory phases" + guard-mode table.
- `ohos-ar-dev-workflow/SKILL.md`: P3 phase-table row now lists
  `code-ruleset-style-check` and the rule-check evidence artifact.

---

## Fix 2 — init compile component defaults to hiview

### Problem
`init` required `--git-dir` / `--build-target` / `--part`. A weak model driving a
bare `init` had no runnable default and could stall on choosing a component.

### Change (`advance.py`)
- New module constants:
  `DEFAULT_GIT_DIR = "base/hiviewdfx/hiview"`,
  `DEFAULT_BUILD_TARGET = "hiview_package"`,
  `DEFAULT_TEST_PART = "hiviewdfx"`.
- argparse: `--git-dir` / `--build-target` / `--part` now carry these defaults
  (`--build-target` no longer `required=True`); help text states the component is
  user-determined per AR but defaults to hiview.
- `cmd_init` prints a `NOTE:` when the hiview defaults are in effect, telling the
  operator to re-init with the three flags if the AR touches another component.

### Docs
- `ohos-ar-dev-init/SKILL.md`: the three flags shown as optional with documented
  defaults + the NOTE behavior.

---

## Fix 3 — gitcode reads newest comments first

### Problem
`oh-gc pr:comments` defaults to **30 comments, oldest-first**. On a busy PR the most
recent review feedback is silently dropped, so the review loop acts on stale
comments.

### Change (`ohos-dev-gitcode-pr-review/scripts/collect_pr_context.py`)
- Both `pr:comments` invocations (pr_comment + diff_comment) now pass `--latest`
  (CLI flag: "Show newest comments first"), keeping `--limit` at the script default
  of 100 (raised well above the CLI's 30).
- `--comments-limit` help updated to explain the newest-first / 30-default rationale.

### Docs
- `ohos-dev-gitcode-pr-review/SKILL.md`: documented commands now show
  `--latest --limit 100` with rationale.

---

## Truth-layer invariant (unchanged)
None of these fixes touch the signed evidence/truth layer. Fix 1 adds a **blocking**
control check at author time (fail-closed on a missing guard), but the pass authority
still rests on the signed manifest records emitted by each gate. The gitcode and init
changes are control/navigation only.
