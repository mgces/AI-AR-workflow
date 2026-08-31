---
name: ohos-test-coverage
description: Generate and interpret OpenHarmony C/C++ unit-test coverage in full or incremental mode using the target checkout's developer_test and coverage tooling. Use when coverage evidence, changed-line coverage, or coverage-gap analysis is requested.
---

# OpenHarmony test coverage

Coverage is evidence, not a proxy for test correctness. Use tools from the target OpenHarmony checkout and preserve the revision, test result, instrumentation configuration and raw report together.

## Modes

- **Incremental**: preferred for PR readiness; scope to changed production lines and bind the report to the base/head revisions.
- **Full**: use for component/subsystem baselines or refactoring validation; record exclusions and generated-code policy.

## Required checks

1. Confirm the OpenHarmony root, product, part/module/test suite, device and available disk space.
2. Discover the checkout's supported `developer_test`, `xdevice`, `pr_local_coverage`, LLVM coverage or lcov entrypoints. Do not install dependencies or delete `out/` without explicit authorization.
3. Run the relevant tests first; zero executed tests, failed tests, missing `.gcno/.gcda` or profiler data invalidate coverage.
4. Generate the report into a dedicated output directory and preserve raw data.
5. Report line/function/branch coverage separately. For incremental mode, include uncovered changed lines rather than only a percentage.
6. Mark the backend `unavailable` when instrumentation or report generation did not complete; never turn missing data into 0% or PASS.

Use `ohos-test-ut-generation` to close meaningful gaps. Do not generate tests merely to execute lines without asserting observable behavior.
