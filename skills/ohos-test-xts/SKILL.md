---
name: ohos-test-xts
description: Plan, build, run, and validate OpenHarmony XTS/ACTS/CTS/HATS tests using the target repository's real build and xdevice tooling. Use for XTS execution, result triage, suite registration, or evidence collection; use check-test-code-quality for static test-code scanning.
---

# OpenHarmony XTS execution

Treat generation, static quality scanning, build, device execution, and result interpretation as separate steps. Do not claim an XTS PASS from a successful build or from terminal text alone.

## Workflow

1. Identify the suite family, product, module, test type, target device, and repository root.
2. Inspect the target repository's own `BUILD.gn`, `Test.json`, suite registration and xdevice configuration. Do not reuse commands bound to another CLI or repository layout.
3. Build the narrowest registered suite target with the repository's supported build entrypoint.
4. Verify the expected package/binary and test metadata were produced.
5. Run through the repository-provided xdevice/XTS runner; preserve the exact command, device serial, start/end time, exit code and raw result directory.
6. Parse case totals and failures from structured XML/JSON results. A PASS requires zero failed/error cases and a nonzero executed count.
7. For retries, record whether the retry is infrastructure-only or changes the tested code/configuration. Never merge results from different code revisions.

## Related skills

- `check-test-code-quality`: XTS/compatibility test source quality rules.
- `ohos-test-fuzz-generation`: native fuzz generation and 26-rule review.
- `ohos-test-coverage`: full/incremental UT coverage evidence.
- `ohos-dev-build-execution-diagnosis`: OpenHarmony build and failure diagnosis.
- `ohos-dev-hdc-command-usage`: device selection and evidence capture.
