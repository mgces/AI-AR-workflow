---
name: ohos-ci-local-precheck
description: Run a fail-closed local OpenHarmony CodeArts precheck over changed C/C++ files with a user-supplied, checksum-pinned engine. Use when CI-parity checking is requested before upload; use code-ruleset-style-check for fast deterministic author-time checks.
---

# OpenHarmony local CI precheck

This skill is the optional CI-near backend between deterministic local checks and remote CI. It never downloads tools and never treats a missing or failed engine as PASS.

## Contract

- Use only an engine JAR supplied or approved by the user.
- Require its expected SHA-256; a mismatch is a dependency failure.
- Run only changed C/C++ files and keep `engine.log`, `source.json`, and `defects.json` as evidence.
- Exit `0` only when the engine completed successfully, emitted a readable defect file, and that file contains no defects for the requested files.
- Exit `1` for defects and `2` for unavailable/invalid engine execution.
- Remote CI remains authoritative. Label this result `ci-near`, never `ci-equivalent`, unless the engine version and repository configuration are proven identical to CI.

## Run

```bash
python3 scripts/codearts_precheck.py \
  --engine-jar /approved/codecheck-ide-engine.jar \
  --engine-sha256 <expected-sha256> \
  --output-dir /path/to/evidence/codearts \
  --project-root /path/to/repository \
  [--compile-db /path/to/compile_commands.json] \
  changed.cpp changed.h
```

Run `code-ruleset-style-check` first. Use this backend at P7/P8 when the approved engine is available; otherwise record `unavailable` and continue to remote CI rather than inventing a PASS.
