# Workflow Hardening — Todo / Backlog (2026-07-27)

Legend: `[x]` done this batch · `[ ]` open · `(P)` priority.

## This batch — DONE
- [x] **(P1)** Check ALL gate-level rules, not just severe/fatal: export all 304
      workbook sensitive words to `data/ruleset_c.json`
      (`scripts/build_ruleset_data.py`) + keep 15 high-precision regex `G.*` rules;
      guard no longer filters by severity (any finding blocks, matching CI).
- [x] **(P1)** Scope the check to CHANGED code files only — never the whole tree,
      never non-code files (guard EXTS filter; callers already pass changed files).
- [x] **(P1)** Enforce guard in P2 (`gate_develop.py`, `gate_integration.py`,
      full mode) — remove no-op `--format-only`.
- [x] **(P1)** Enforce guard in P3 (`gate_test_develop.py`, `--rules-only`) over
      newly authored test files; fail-closed on missing guard; evidence under
      `evidence/phase3/`.
- [x] **(P2)** init compile component defaults to hiview
      (`DEFAULT_GIT_DIR/BUILD_TARGET/TEST_PART` in `advance.py`) + `NOTE:` on
      default use.
- [x] **(P2)** gitcode `collect_pr_context.py` reads newest-first (`--latest`,
      limit 100).
- [x] Docs updated: `code-ruleset-style-check/SKILL.md`,
      `ohos-ar-dev-workflow/SKILL.md` (P3 row), `ohos-ar-dev-init/SKILL.md`,
      `ohos-dev-gitcode-pr-review/SKILL.md`.
- [x] Full unittest suite green across affected skills.

## Open — rule coverage
- [x] All 304 workbook sensitive words (敏感词) checked (see this batch).
- [ ] **(P)** Encode more of the 213 `G.*` coding rules that are *safely*
      line-detectable (currently 15). Do NOT encode semantic/metric rows
      (圈复杂度, 大函数, switch 分支数, FossScan, ...) as regex — they false-positive;
      leave them to human/skill review. Track encoded vs. review-only IDs in a
      coverage table.
- [ ] Add a regression fixture per encoded rule (one positive + one clean) under
      `code-ruleset-style-check/tests/` so future edits can't silently weaken a
      blocker — and to guard `data/ruleset_c.json` loading.
- [ ] Re-run `scripts/build_ruleset_data.py` whenever the workbook is updated
      (data file is committed; guard has no openpyxl dependency at gate time).

## Open — weak-model autonomy (from the ~82% confidence audit)
- [ ] Author-time coverage for the remaining leak classes CI still catches that
      P2/P3 don't (e.g. BUILD.gn hygiene, license headers) — move each detectable
      one earlier.
- [ ] Tighten repair/regenerate circuit-breaker messaging so a weak model gets an
      unambiguous next-action when a gate fails repeatedly (avoid loops).
- [ ] Expand phase memory cards' `next_expected_action_class` vocabulary where a
      weak model has been observed to pick the wrong recovery path.

## Open — gitcode / PR review
- [ ] Paginate/aggregate when a PR genuinely exceeds the 100-comment fetch
      (currently newest 100 only — log when truncated so it doesn't read as
      "all comments").
- [ ] Surface unresolved vs. resolved comment state if the CLI exposes it, so the
      review loop doesn't re-address closed threads.

## Open — verification / CI
- [ ] Add an integration test asserting a banned API in a P3 test file FAILS the
      gate (locks in Fix 1's P3 wiring against regression).
- [ ] Add a test asserting a bare `init` (no component flags) initializes with the
      hiview defaults and prints the NOTE.
