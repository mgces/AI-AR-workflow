---
name: ohos-dev-cpp-coding-style
description: Guide OpenHarmony-flavored C++ work. Use whenever the task involves writing, modifying, scaffolding, documenting, or reviewing OpenHarmony C++ code, especially when file naming, include guards, ownership style, inheritance semantics, API comments, lambda capture rules, or project-specific convention checks matter. Prefer this skill over generic C++ guidance for OpenHarmony repositories even if the user only asks for a "review", "cleanup", "comment fix", or "coding style" pass.
metadata:
  author: openharmony
  scope: common
  stage: development
  domain: cpp
  capability: coding-style
  version: 0.1.0
  status: draft
---

# OpenHarmony C++

You are an expert in OpenHarmony C++ conventions. Apply the project's OpenHarmony-specific rules to the user's code or question without turning the response into a generic C++ tutorial.

## Shared gate contract

For lifecycle P2/P3 work, load
[`../code-ruleset-style-check/references/pre-write-contract.md`](../code-ruleset-style-check/references/pre-write-contract.md)
before the first edit. This skill supplies the OpenHarmony design guidance
(ownership, API shape, inheritance, naming, comments, and local conventions);
`code-ruleset-style-check` supplies the workbook-derived gate rules and the only
hard style verdict. Use both together while writing code, but do not copy the
545-row workbook or implement a second regex guard here.

The contract is deliberately advisory before the edit: a self-check or a
statement that the contract was loaded is not gate evidence. After editing,
P2/P3 must still invoke the shared guard through their phase gate. If this skill's
bundled `oh_cpp_guard.py` or clang configuration disagrees with the workbook
guard, report the discrepancy and defer the lifecycle PASS decision to the
shared `code-ruleset-style-check` backend.

## Core Conventions

Treat [references/rules.md](references/rules.md) as the source of truth for concrete OpenHarmony C++ convention details. Keep those details there instead of duplicating them in this file, so future rule changes have one place to land.

## Compatibility

- Bundles `scripts/oh_cpp_guard.py`, `scripts/.clang-format`, and `scripts/.clang-tidy` for repeatable validation.
- Safe to use without those tools; fall back to manual review and explicit reasoning.
- In the lifecycle workflow, these bundled tools are supplemental. P2/P3/P4/P7
  gate decisions come from the shared `code-ruleset-style-check` backend, not
  from this skill's private configuration.
- Evaluation assets for this skill live in [`evals/evals.json`](evals/evals.json) and [`references/evaluation-framework.md`](references/evaluation-framework.md).

## Workflow

1. Detect the task mode first: `implement`, `scaffold`, `document`, or `review`.
2. Load [references/rules.md](references/rules.md) once before making OpenHarmony-specific decisions.
3. For lifecycle P2/P3 work, load the shared [pre-write contract](../code-ruleset-style-check/references/pre-write-contract.md) before making the first edit.
4. For `review`, also load [references/review-checklist.md](references/review-checklist.md).
5. Do NOT load [references/tooling.md](references/tooling.md) for ordinary implementation, scaffolding, documentation, or review. The rules, contract, and checklist are enough for human judgment.
6. Load [references/tooling.md](references/tooling.md) only when the user explicitly asks for validation, cleanup, formatting, strict checks, clang-tidy, full checks, or CI readiness.
7. Follow existing project style when editing third-party or imported code; this skill does not override upstream style there.
8. After code generation or edits, do a lightweight rules-based self-check against [references/rules.md](references/rules.md) and the shared pre-write contract.

## When Writing Code

Use for writing or modifying production code.

- Apply the concrete conventions while shaping file layout, names, API boundaries, ownership, and inheritance semantics.
- Prefer direct, concrete interfaces over generic abstractions.
- Keep comments, macros, lambdas, templates, and ownership choices aligned with the rule file and the surrounding subsystem.
- Before typing each new interface or implementation, choose the contract-safe
  form (approved API, explicit capture, checked bounds, explicit lifetime) so the
  later guard is confirmation rather than the first time the issue is discovered.

## When Scaffolding Files

Use for creating new `.h/.cpp` skeletons without full implementation.

- Use the file layout, header structure, naming, namespace, and class-semantics rules from the reference.
- Add comment placeholders only where meaningful public API documentation is expected.
- Do not fill the file with fake business logic just to make the scaffold look complete.

## When Documenting APIs

Use for repairing or adding comments.

- Comment public functions and externally consumed interfaces.
- Document behavior, preconditions, ownership or lifetime constraints, thread expectations, and error semantics.
- Do not add comments that merely restate the function name or parameter list.
- Skip comments for internal code when the signature and local context already make intent obvious.

## When Reviewing Code

Use for OpenHarmony convention review.

- Check the user's code against OpenHarmony-specific conventions.
- For each violation, cite the relevant rule area and suggest the fix.
- Put findings first, ordered by severity, with file paths and line numbers when possible.
- Recommend tooling only for checks it can actually cover; keep human review focused on the remaining OpenHarmony-specific gaps.

## Recommended Validation

Use validation as a tiered flow so normal generation stays fast:

- Default after code generation: do a lightweight self-check against [references/rules.md](references/rules.md); do not run bundled tools unless the user asks for validation or cleanup.
- When the user asks for validation, cleanup, formatting, or tool checks: load [references/tooling.md](references/tooling.md) and prefer `--format-only` on changed files.
- When the user explicitly asks for strict validation, clang-tidy, full checks, or CI readiness: run the clang-tidy or full guard flow described in [references/tooling.md](references/tooling.md), again scoped to changed files where possible.
- Keep human review focused on OpenHarmony conventions that tooling cannot reliably enforce.

## Rule Boundaries

Do not bloat responses with general C++ advice. Concentrate on the OpenHarmony-specific constraints in [references/rules.md](references/rules.md), and use the shared pre-write contract for workbook gate families. The two sources have different jobs: this skill explains why an OpenHarmony choice is appropriate; the ruleset skill defines deterministic gate ownership and phase timing.

## Response Shapes

Use the smallest shape that fits the task:

- `implement` / `scaffold`: provide code or patch-ready structure with OpenHarmony-specific choices already baked in.
- `document`: provide the revised comments and call out any places where the signature still hides important constraints.
- `review`: list findings first, ordered by severity, with path and line references.

## Evaluation Assets

When improving or validating this skill itself:

1. Start from [`evals/evals.json`](evals/evals.json).
2. Use [`references/evaluation-framework.md`](references/evaluation-framework.md) to create iteration workspaces, assertions, grading outputs, and benchmark artifacts.
3. Keep qualitative review focused on whether the skill changes OpenHarmony-specific decisions, not whether generic C++ output merely looks reasonable.
