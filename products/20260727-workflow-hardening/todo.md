# Workflow Hardening — Todo / Backlog (2026-07-27)

Legend: `[x]` done · `[~]` partial · `[ ]` open · `(P)` priority.
Confidence: **~88%** (up from 82% baseline). Full status in `status_review.md`; task-level
breakdown in `remaining_tasks.md`.

## Batch 2 (control-layer + file-hygiene hardening) — DONE
- [x] **(A1/S1)** Circuit breaker uses revision-agnostic `fallback_key` — empty
      `bundle_revision` runs now accumulate counts and escalate (no-op bug fixed).
- [x] **(A2/A4/A7/S2)** Unified `finalize_control()`; P1/P2/P3 FAIL now emit repair
      packet + breaker; `advance.py` has cur==1/2/3 escalation/awaiting_repair branches.
- [x] **(A3/S3)** Structured `suspect_locations[]` (file/line/rule) backfilled from
      build lines / gtest xml / ci-codecheck / ruleset findings-json.
- [x] **(A5/S4)** `next_expected_action_class` collapsed to single enum + schema +
      fail-closed validator; compound tokens removed.
- [x] **(S5)** `ControlContractError` — control layer fails closed on its own bug.
- [x] **(B1/H1)** License-header guard; **(B2/H5)** GN reference; **(B3/H2)** byte
      hygiene; **(B5/H4)** all-text banned-term scan — new `file_hygiene_guard.py`,
      blocking + fail-closed in P2 (`gate_develop`) and P3 (`gate_test_develop`).
- [x] **(B4/H3)** JSON validity check (`json.load`) on changed `.json`.
- [x] **(H6)** P8 backfills CI codecheck defect class into `suspect_locations`.
- [x] Batch-2 regression tests: `test_s3_s4_control_hardening.py`,
      `test_init_hiview_default.py`, `test_file_hygiene_guard.py`, +
      `test_control_protocol.py` breaker/fallback-key cases.
- [x] Full unittest suite green: 298 + 19 + 10 = 327.

## Batch 1 (ruleset + init + PR fetch) — DONE
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

## Weak-model autonomy (from the confidence audit) — mostly DONE in batch 2
- [x] Author-time coverage for leak classes CI catches but P2/P3 didn't (license
      headers, BUILD.gn hygiene, byte hygiene, all-text banned terms) — see H1-H5.
- [x] Tighten repair/regenerate circuit-breaker so a weak model gets an unambiguous
      next-action on repeated failure (fallback_key breaker + finalize_control).
- [x] Collapse `next_expected_action_class` to a single enforced enum (S4).
- [x] **(A6/A8)** `inspect` fallback now forced to a concrete `next_command`
      like `blocked` (`advance.py:865-895`); `gate_design.py:79,91` relabelled
      `phase_name="design-orchestrate"`. Verified in tree.
- [x] **(E1)** Built-in backoff/retry for `external_api_unstable` — bounded
      exponential backoff on TRANSPORT failures only (`_query_ci_with_backoff`,
      `gate_upload_ci.py:186`; flags `--ci-query-attempts`/`--ci-query-backoff`).
      Retry loop now has a direct test (`test_query_ci_with_backoff_*`).
- [ ] **(E2, hard ceiling)** On-device (P6) observation stability + CI semantic
      checks + model patch quality — not fully coverable in-repo.

## gitcode / PR review — DONE
- [x] Flag truncation when a PR exceeds the 100-comment fetch (`comment_truncation`
      + "re-run with higher limit" hint) so it doesn't read as "all comments".
- [x] Surface resolved vs. unresolved comment state (`comment_resolved()` +
      resolved/unresolved/unknown tally) so review skips closed threads.

## Verification / CI — DONE
- [x] Integration test: a banned API in a P3 test file FAILS the gate
      (`test_p3_disabled_api_in_test_fails_rules_only`).
- [x] Test: bare `init` initializes hiview defaults + prints the NOTE
      (`test_init_hiview_default.py`).
- [x] **(B4)** `bundle.json` required-key check (`_bundle_required_keys_finding`,
      `file_hygiene_guard.py:204`) — validates component keys, not just JSON validity.

## Remaining backlog (by ROI)
- [x] **(B6)** commit-message format check — `validate_commit_message()`
  (`gate_upload_ci.py`) rejects empty/too-short/over-long/placeholder subjects
  fail-closed BEFORE the push (`failure_class="commit_message_invalid"`),
  wired into `commit_pending_changes`; tested.
- [x] **(E1)** Built-in backoff/retry for `external_api_unstable` — done
  (see Batch 2 above); retry loop now directly tested.
1. `[ ]` **(E2, hard ceiling)** On-device (P6) observation stability + CI semantic
   checks + model patch quality — not fully coverable in-repo.
