# Development Tasks

## 1. Task Summary

- Change: `20260829-requirement-add-hdc-connection-error-diagnostics`
- Development strategy: test-first; pure mapper before production call-site integration.

## 2. Tasks

### TASK-001: Add stable connection error catalog

- Feature IDs: F-001
- Test Case IDs: TC-001
- Depends on: none
- Files: `src/host/connection_error.h/.cpp`, `test/unittest/host/connection_error_test.cpp`, build files.
- Implementation: declare explicit values and descriptor table for all59 codes; enforce uniqueness and safe unknown lookup.
- Acceptance: TC-001 passes and catalog count is exactly59.

### TASK-002: Add ConnectionFault and formatter

- Feature IDs: F-002
- Test Case IDs: TC-002
- Depends on: TASK-001
- Files: `src/host/connection_error.h/.cpp`.
- Implementation: value object, stage/transport/domain enums, short/verbose formatter with numeric whitelist.
- Acceptance: TC-002 passes; no caller-provided sensitive string enters the fault model.

### TASK-003: Implement primary fault selection

- Feature IDs: F-003
- Test Case IDs: TC-003, TC-004
- Depends on: TASK-002
- Files: `src/host/connection_error.cpp`, `define_plus.h`, component tests.
- Implementation: descriptor priority and first-fault publishing; cleanup events do not overwrite specific root cause.
- Acceptance: TC-003 and TC-004 pass.

### TASK-004: Implement local server/channel mapper and client propagation

- Feature IDs: F-004
- Test Case IDs: TC-005, TC-006
- Depends on: TASK-002, TASK-003
- Files: `connection_error.*`, `client.h/.cpp`, server/channel call sites and tests.
- Implementation: stage-aware libuv mapper; retain callback status across retries and clear on success.
- Acceptance: TC-005 and TC-006 pass.

### TASK-005: Implement target/session classification

- Feature IDs: F-005
- Test Case IDs: TC-007, TC-008
- Depends on: TASK-002, TASK-003
- Files: `connection_error.*`, `server_for_client.cpp`, target tests.
- Implementation: snapshot classifier and state-mismatch handling; auth/specific last fault priority.
- Acceptance: TC-007 and TC-008 pass.

### TASK-006: Implement TCP classification and call-site propagation

- Feature IDs: F-006
- Test Case IDs: TC-009, TC-010, TC-011
- Depends on: TASK-002, TASK-003
- Files: `connection_error.*`, `host_tcp.cpp`, `common/tcp.cpp`, translate/TCP tests.
- Implementation: parameter compatibility, connect/I/O/protocol/TLS mapper and session publishing.
- Acceptance: TC-009, TC-010 and TC-011 pass.

### TASK-007: Implement USB classification and call-site propagation

- Feature IDs: F-007
- Test Case IDs: TC-012, TC-013, TC-014
- Depends on: TASK-002, TASK-003
- Files: `connection_error.*`, `host_usb.cpp`, USB tests.
- Implementation: API-return and transfer-status mapping, explicit cancellation context, correct submit return source.
- Acceptance: TC-012, TC-013 and TC-014 pass.

### TASK-008: Implement UART cross-platform classification

- Feature IDs: F-008
- Test Case IDs: TC-015, TC-016, TC-022
- Depends on: TASK-002, TASK-003
- Files: `connection_error.*`, `host_uart.cpp`, UART tests/build.
- Implementation: explicit POSIX/Win32 domain mapping plus key/config/timeout/integrity stages.
- Acceptance: TC-015, TC-016 and TC-022 pass.

### TASK-009: Preserve faults across session lifecycle

- Feature IDs: F-009
- Test Case IDs: TC-004, TC-008, TC-017
- Depends on: TASK-003
- Files: `define_plus.h`, `server.cpp`, session/daemon-map tests.
- Implementation: copy fault before session release; clear on successful replacement; lock-safe update.
- Acceptance: TC-004, TC-008 and TC-017 pass.

### TASK-010: Expose client local failures

- Feature IDs: F-010
- Test Case IDs: TC-006
- Depends on: TASK-004
- Files: `client.h/.cpp`, client test.
- Implementation: retain last native-derived local fault and print it on final retry exhaustion.
- Acceptance: TC-006 passes; known failure no longer uses generic-only string.

### TASK-011: Verify all production transport entry points

- Feature IDs: F-011
- Test Case IDs: TC-011, TC-014, TC-016
- Depends on: TASK-006, TASK-007, TASK-008
- Files: TCP/USB/UART production call sites and component tests.
- Implementation: feed mapper from native condition and publish to session/server without direct final-code injection.
- Acceptance: TC-011, TC-014 and TC-016 pass.

### TASK-012: Add CLI/target diagnostic formatting

- Feature IDs: F-012
- Test Case IDs: TC-002, TC-018
- Depends on: TASK-002, TASK-009
- Files: formatter, `server.cpp`, `server_for_client.cpp`, output tests.
- Implementation: stable failure prefix and verbose last fault while preserving successful/default list output.
- Acceptance: TC-002 and TC-018 pass.

### TASK-013: Preserve legacy compatibility

- Feature IDs: F-013
- Test Case IDs: TC-019
- Depends on: TASK-001, TASK-004 through TASK-008
- Files: catalog, fallback decisions, compatibility tests.
- Implementation: keep existing numeric codes and wire protocol; generic aliases only on unknown input.
- Acceptance: TC-019 passes.

### TASK-014: Complete traceable verification and documentation

- Feature IDs: F-014
- Test Case IDs: TC-020, TC-021, TC-022
- Depends on: TASK-001 through TASK-013
- Files: error reference, specs, tests, build files, `apply-report.md`.
- Implementation: source/test/doc consistency, mutation check, real build/test commands and AR validator evidence.
- Acceptance: TC-020, TC-021 and TC-022 pass; apply report records commands and results.

### TASK-015: Freeze existing specifications and append instance codes

- Feature IDs: F-001, F-013, F-015, F-016
- Test Case IDs: TC-023, TC-028
- Depends on: TASK-001, TASK-013
- Files: `connection_error.h/.cpp`, catalog compatibility tests and error reference.
- Implementation: append `E002116/E002117` and their descriptors; retain every existing value, descriptor field and mapper result; model metadata missing as no fault.
- Acceptance: TC-023 and TC-028 pass; catalog has exactly 61 entries without changing an existing row.

### TASK-016: Implement versioned instance metadata and conservative preflight

- Feature IDs: F-015, F-016
- Test Case IDs: TC-024, TC-025, TC-026
- Depends on: TASK-015
- Files: `connection_error.*`, `server.cpp`, `main.cpp`, `client.h/.cpp`, unit/component tests.
- Implementation: write metadata after server readiness, validate format/PID, classify endpoint relation, stop only definite conflict and clear candidate diagnostics after successful connect.
- Acceptance: TC-024, TC-025 and TC-026 pass; old server without metadata retains current behavior.

### TASK-017: Build and reproduce alternate-port conflict

- Feature IDs: F-014, F-015
- Test Case IDs: TC-027
- Depends on: TASK-016
- Files: production HDC executable, test runner, AR report and Windows artifact.
- Implementation: compile/link Linux and Windows host binaries; run isolated server-8711/client-8710 scenario; deploy matching `hdc.exe` and `libusb_shared.dll` to `E:\\temp`.
- Acceptance: TC-027 passes and Windows artifact version/hash are recorded.

## 3. Development Order

```text
TASK-001 -> TASK-002 -> TASK-003
TASK-004 + TASK-005 + TASK-006 + TASK-007 + TASK-008
-> TASK-009 -> TASK-010 -> TASK-011 -> TASK-012 -> TASK-013 -> TASK-014
-> TASK-015 -> TASK-016 -> TASK-017
```

## 4. Execution Status

| Tasks | Status | Evidence |
|-------|--------|----------|
| TASK-001～TASK-003 | completed | 59-entry catalog, formatter, priority tests |
| TASK-004～TASK-008 | completed | local/target/TCP/USB/UART mapper and production integration |
| TASK-009～TASK-013 | completed | lifecycle propagation, CLI output and compatibility tests |
| TASK-014 | completed | build, coverage, mutation, CLI evidence and AR validator passed |
| TASK-015 | completed | 11-row existing local descriptor snapshot unchanged; 61-entry append-only catalog passes |
| TASK-016 | completed | metadata parser/PID/endpoint preflight and connect-success clearing pass |
| TASK-017 | completed | Linux and MinGW 50-TU builds plus isolated E002116/E002117/legacy scenarios pass |
