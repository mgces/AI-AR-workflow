# 20260727 Workflow Hardening

Follow-up hardening batch after the weak-model optimization
(`../20260723-weak-model-optimization/`). Closes three concrete gaps found while
auditing the workflow for weak-model (minimax2.7 / glm5.1 class) autonomy, plus a
remaining-work checklist.

| File | Purpose |
|---|---|
| `design_spec.md` | Design of the three fixes + rationale + verification |
| `solution_design.md` | Control-layer S1–S5 / file-hygiene H1–H6 solution design |
| `remaining_tasks.md` | 弱模型自治剩余任务盘点(A–E,自评 ~89%) |
| `status_review.md` | 落地情况复核(对照计划,带 file:line) |
| `weak_model_residual_audit.md` | 第三轮独立复核:被低估/漏记的协议缺口(G1–G5 / H1–H2) |
| `todo.md` | Remaining / future task backlog with status |

## The three fixes (this batch — DONE)

1. **code_ruleset enforced at author time (P2 + P3).** The rule guard was thin
   (9 of 545 rules) and test files were never rule-checked, so blockers leaked to
   the CI/OAT gate. Guard expanded to 15 high-precision blockers; wired as a hard
   blocker into P2 (`gate_develop.py`, full) and P3 (`gate_test_develop.py`,
   `--rules-only`).
2. **init compile component defaults to hiview.** The compiled component is
   user-determined per AR but now defaults to the hiview part so a bare `init`
   runs; `--git-dir/--build-target/--part` override.
3. **gitcode reads newest comments first.** `collect_pr_context.py` now passes
   `--latest` (CLI default was 30 comments, oldest-first → latest dropped on busy
   PRs).

See `design_spec.md` for detail and `todo.md` for what remains.
