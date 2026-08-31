# Apply Report

## 1. Change Summary

- Change: `20260829-requirement-add-host-dynamic-log-level`
- Branch: `feat/host-dynamic-log-level`
- Base: `gitcode/master` at `7a47ffb4`
- Scope: host-only runtime query/set command, atomic log threshold, call-site fast filter, libusb synchronization/prefilter, local-client security boundary, unit/e2e/build evidence.
- Isolation: implemented in a dedicated hdc worktree; the existing manifest-managed worktree was not modified.

## 2. Implementation Result

1. Added `hdc server loglevel [0-6]` as host command ID 19; query and set do not require a connected device.
2. Replaced the process threshold with `std::atomic<uint8_t>` and relaxed loads/stores.
3. Moved the common rejection check into `WRITE_LOG`, so suppressed arguments are not evaluated; retained a defensive check in `PrintLogEx`.
4. Corrected the libusb mapping, updated an active context after a set, and rejected callback messages before copy/regex/masking work.
5. Removed hdc's self-assignment of `LIBUSB_DEBUG`, which otherwise prevents later libusb context changes.
6. Restricted the administration command to UDS and IPv4/IPv6 loopback clients; peer lookup failure is rejected.
7. Added parser, boundary, concurrency, macro side-effect, help, libusb mapping, build, runtime, and remote-rejection coverage.

## 3. Test-First Evidence

Before production implementation, compilation of the modified `ext_test.cpp` and `host_translate_test.cpp` objects failed on the intentionally missing behavior: `CMD_SERVER_LOG_LEVEL`, `Base::ParseLogLevel`, `Base::GetLogLevelName`, `Base::IsLoggable`, and the explicit libusb mapping overload. After implementation, both affected test objects compiled successfully with the OpenHarmony toolchain.

## 4. Feature Test Results

| Feature ID | Test Case ID | Result | Evidence |
|------------|--------------|--------|----------|
| F-001 | TC-001 | Pass | `host_translate_test.cpp` object compiled with query parser assertions. |
| F-001 | TC-009 | Pass | Isolated server returned current level and reflected each valid change without a device. |
| F-002 | TC-002 | Pass | Boundary tests for every value `0..6` compiled; runtime verified `0` and `6`. |
| F-002 | TC-003 | Pass | Invalid `7` returned usage and the next query remained at level 6. |
| F-002 | TC-009 | Pass | Runtime flow `4 -> 0 -> 6`, invalid 7, then restore 4 completed successfully. |
| F-003 | TC-004 | Pass | Host-native four-reader/one-writer 10,000-iteration atomic smoke passed. |
| F-003 | TC-011 | Pass | Repository scan found only atomic declaration/load/store access to `g_logLevel`. |
| F-004 | TC-005 | Pass | Host-native smoke proved suppressed DEBUG argument evaluation count remained zero. |
| F-004 | TC-006 | Pass | Host-native smoke proved enabled DEBUG argument evaluation count was exactly one. |
| F-005 | TC-007 | Pass | Full 0..6 libusb mapping assertions compiled in the affected host test object. |
| F-005 | TC-012 | Pass | Source review confirmed `IsLoggable` precedes `strdup`, regex, and masking; Linux/Windows builds passed. |
| F-006 | TC-008 | Pass | Usage/Verbose and command-ID/no-target parser assertions compiled successfully. |
| F-006 | TC-010 | Pass | Linux ELF, Windows PE32+, and ARM64 `hdc_host_base_unittest` linked; affected test objects and host-native checks passed. |
| F-006 | TC-013 | Pass | LAN listener: loopback query returned 4; non-loopback set 6 was rejected; final loopback query remained 4. |

## 5. Runtime Evidence

### Local query/set/boundary/invalid flow

```text
query_initial: Current server log level: 4 (debug)
set_off: Server log level changed: 4 (debug) -> 0 (off)
query_off: Current server log level: 0 (off)
set_verbose: Server log level changed: 0 (off) -> 6 (verbose)
query_verbose: Current server log level: 6 (verbose)
invalid_7: [Fail]Usage: server loglevel [0-6]
query_after_invalid: Current server log level: 6 (verbose)
restore_debug: Server log level changed: 6 (verbose) -> 4 (debug)
```

### Non-loopback rejection

```text
local_query: Current server log level: 4 (debug)
remote_set: [Fail]server loglevel is only available to local clients
local_query_after_remote: Current server log level: 4 (debug)
```

## 6. Build and Static Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Linux x86_64 host hdc | Pass | OpenHarmony SDK Linux host target; linked ELF x86-64. |
| Windows x86_64 host hdc | Pass | OpenHarmony SDK Windows host target; linked PE32+ x86-64. |
| Host base unit target | Pass | `ninja -C out/sdk tests/unittest/developtools/hdc/hdc_host_base_unittest`; linked ARM64 OpenHarmony test binary. |
| Affected test sources | Pass | Modified ext and host translate test objects compiled with the OpenHarmony toolchain. |
| Host-native atomic/macro smoke | Pass | `g++ -std=c++17 -O2 -pthread -Wall -Wextra -Werror`; output `log filter smoke passed`. |
| Formatting/whitespace | Pass | `git diff --check`. |
| Local changed-line rule pre-scan | Pass | No width, naming, or format finding remains on touched lines; existing findings outside the diff were not changed. |
| Atomic access scan | Pass | `rg -n "g_logLevel" src test`; no ordinary read/write remains. |
| Qualified macro scan | Pass | No `Hdc::WRITE_LOG` or other namespace-qualified use remains after macro hardening. |

The full `hdc_ext_unittest` aggregate link was also attempted. It is currently blocked by pre-existing unresolved references from unchanged tests (`CredentialMessage`, `IsNumeric`, `StripLeadingZeros`, and related symbols); this change adds none of those references. The affected ext test object compiles, and the new atomic/macro behavior was executed by the host-native smoke test, so no feature/test pair relies on the blocked aggregate link.

Existing compiler warnings in unchanged switch fall-through and host files remain warnings; this change introduces no warning-as-error failure.

## 7. L4 Code Review Result

- D1 validity/lifetime: command executes on the server main loop; channel and USB object lifetimes are valid for the operation; null USB context is handled as best-effort failure.
- D2 bounds/resource limits: parser accepts exactly one byte `0..6`; no unbounded allocation, queue, retry, or new thread is introduced.
- D3 performance/concurrency: suppressed path is one relaxed atomic load, comparison, and branch; enabled sink cost remains documented; no lock or cache is added.
- D4 idempotency/retry: setting is absolute and repeatable; invalid or unauthorized requests do not mutate state.
- D5 security: review found remote administration exposure when listening on LAN; fixed by UDS/loopback peer validation and verified with a non-loopback e2e.

Review disposition: no unresolved critical, security, correctness, or compatibility findings.

## 8. Known Scope Boundary

This PR optimizes the suppressed-log path. When verbose logging is enabled, dominant cost remains formatting plus synchronous sink operations. The architecture document proposes a separate bounded MPSC queue, one consumer, batch writes, and persistent file descriptor design; it is intentionally excluded because queue-full, crash-flush, rotation, shutdown, and sensitive-data semantics require a separate change.
