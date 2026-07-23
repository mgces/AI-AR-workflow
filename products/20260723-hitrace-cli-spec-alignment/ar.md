# HiTrace CLI Specification Alignment

## Requirement

Refactor the OpenHarmony HiTrace CLI implementation so that its internal command specification is explicit,
single-sourced, and testable while remaining aligned with the currently checked-out CLI behavior.

## Confirmed Scope

- Preserve all externally observable `hitrace` and `bytrace` behavior at the clean component baseline
  `7141a84986afce2fba78af51584025afcbc19884`.
- Preserve accepted and rejected arguments, option ordering rules, help and diagnostics, exit behavior,
  command routing, privilege/product gates, boot-trace behavior, telemetry ordering, and build packaging.
- Consolidate command metadata and separate parsing/validation, execution, boot-trace control, and entry orchestration.
- Add deterministic tests before or with implementation and validate on rk3568 hardware.

## Exclusions

- No new CLI commands or removal of existing commands.
- No intentional trace format, storage, IPC, SELinux/DAC, output-path, record-sizing, or snapshot-policy change.
- No public native, JS, ETS, Cangjie, or Rust API change.

## Pipeline Inputs

- Component Git directory: `base/hiviewdfx/hitrace`
- GN build target: `hitrace`
- Developer-test part: `hitrace`
- Unit suite: `HitraceCMDTest`
- Device server: `<REDACTED-HOST:PORT>`
- Device serial: `<REDACTED-SERIAL>`
- Device deployment policy: use an isolated `/data/local/tmp` path; do not replace `/system/bin/hitrace`.
