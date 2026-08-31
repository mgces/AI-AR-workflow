# Apply Report

## 1. Change Info

- Change: `20260829-requirement-add-hdc-connection-error-diagnostics`
- Date: `2026-08-29`
- Implementation branch: `feat/connection-error-diagnostics`
- Implementation commits: `276162dd5159c2a7aae81c96f0c39e27d752428c`, `fe699bdfdced1cc08128737790a49b4fb76e3f96`
- Production build: OpenHarmony `clang_x64` and `mingw_x86_64` target flags, all 50 HDC translation units including `connection_error.cpp` and `server_instance.cpp`
- Unit test: 23 mapper/catalog tests and 2 session lifecycle tests

## 2. Implemented Scope

- Added a 61-entry stable connection-error catalog, structured fault metadata, formatter and priority selector; the original 59 entries remain unchanged.
- Added local server/channel, target/session, TCP, USB and UART native/state mapping.
- Propagated the selected fault through client retry state, channel/session state and daemon-map lifecycle.
- Preserved host-hdcd wire structures and existing numeric codes; legacy generic codes remain fallbacks.
- Added USB submit-vs-callback separation, host-cancel suppression and evidence-gated link-flapping detection.
- Added four isolated-process CLI checks without touching the default user HDC server.
- Appended `E002116/E002117` without modifying any existing descriptor or mapper result.
- Added atomic, versioned `.HDCServer.info` metadata after server readiness while preserving `.HDCServer.pid` and mutex formats.
- Added conservative instance preflight: definite port/type conflict stops early; invalid/address candidates are cleared on successful connection and become visible only when connection fails.

## 3. Feature Test Results

| Feature ID | Test Case ID | Result | Evidence |
|------------|--------------|--------|----------|
| F-001 | TC-001 | Pass | `CatalogIsCompleteAndUnique`; 61 unique code/symbol entries |
| F-002 | TC-002 | Pass | stable short/verbose/unknown formatting and metadata whitelist |
| F-003 | TC-003 | Pass | priority table and equal-priority first-fault retention |
| F-003 | TC-004 | Pass | session component test plus host-cancel mapping |
| F-004 | TC-005 | Pass | 13-case local libuv table |
| F-004 | TC-006 | Pass | retry fallback resolver plus final client production build |
| F-005 | TC-007 | Pass | target snapshot table covers not-found/multiple/offline/session/handshake/version/protocol/no-target |
| F-005 | TC-008 | Pass | auth priority, specific last-fault priority and session mismatch states |
| F-006 | TC-009 | Pass | existing `E001100/E001104` values and explicit parameter states |
| F-006 | TC-010 | Pass | 9-case TCP libuv table plus protocol/TLS explicit states |
| F-006 | TC-011 | Pass | session propagation component test, production call-site compile and isolated refused-port CLI |
| F-007 | TC-012 | Pass | libusb API stage/status table |
| F-007 | TC-013 | Pass | all libusb transfer statuses and host-cancel true/false |
| F-007 | TC-014 | Pass | submit return/callback status seam plus final `host_usb.cpp` compile/link |
| F-008 | TC-015 | Pass | POSIX errno table |
| F-008 | TC-016 | Pass | Win32 numeric table, protocol states and UART-enabled host compile |
| F-008 | TC-022 | Pass | full HDC host target compile/link with `HDC_SUPPORT_UART` |
| F-009 | TC-004 | Pass | primary fault survives later lower-priority cleanup |
| F-009 | TC-008 | Pass | offline state retains the specific transport root cause |
| F-009 | TC-017 | Pass | 2/2 session/daemon lifecycle component tests |
| F-010 | TC-006 | Pass | known client fault is retained; empty state falls back to readiness timeout |
| F-011 | TC-011 | Pass | TCP callback/read integration compiled and representative CLI path passed |
| F-011 | TC-014 | Pass | USB API and callback sources are separately mapped at the production call site |
| F-011 | TC-016 | Pass | UART key/open/config/read/protocol paths use explicit-domain mapper |
| F-012 | TC-002 | Pass | default output excludes caller strings; verbose output uses enumerated/numeric metadata only |
| F-012 | TC-018 | Pass | isolated CLI golden outputs `E001101/E001006/E001400/E001201` |
| F-013 | TC-019 | Pass | legacy values unchanged and known failures avoid generic fallbacks |
| F-014 | TC-020 | Pass | catalog/source/test consistency and duplicate checks |
| F-014 | TC-021 | Pass | temporary ACCESS→USB_IO mutation made focused test fail; restoration passes |
| F-014 | TC-022 | Pass | exact OpenHarmony production compile/link and executable smoke test |
| F-001 | TC-023 | Pass | 11 existing local descriptor rows and all existing mapper expectations unchanged; catalog only appends 2 rows |
| F-013 | TC-023 | Pass | numeric values, symbols, messages, retryable, priority and fallback mapping compatibility assertions pass |
| F-013 | TC-028 | Pass | absent metadata produced no new fault and client completed the existing server handshake |
| F-014 | TC-027 | Pass | isolated executable server-8711/client-8710 scenario emitted actionable E002116 |
| F-015 | TC-023 | Pass | E002116/E002117 occupy only new explicit values 0x002116/0x002117 |
| F-015 | TC-025 | Pass | 7-case endpoint table covers equal, port/type/address mismatch, IPv4 mapping and wildcard listener |
| F-015 | TC-026 | Pass | definite conflict stopped before connect; address/invalid candidates are non-terminal and clear on success |
| F-015 | TC-027 | Pass | `[E002116] ... requested=...8710 active=...8711 reason=port_mismatch action=...` |
| F-016 | TC-023 | Pass | no existing local server/channel code specification changed |
| F-016 | TC-024 | Pass | round-trip, version/PID/endpoint/length/injection rejection and PID-state classification pass |
| F-016 | TC-026 | Pass | invalid metadata + refused connect emitted E002117; invalid metadata + successful handshake emitted no E002117 |
| F-016 | TC-028 | Pass | missing `.HDCServer.info` preserved old-server behavior and existing response path |

## 4. Executed Verification

| Verification | Result | Actual evidence |
|--------------|--------|-----------------|
| Catalog/mapper unit test | Pass | 23/23 tests |
| Session lifecycle component test | Pass | 2/2 tests |
| Mapper source coverage | Pass | 274/274 executable lines, 100% line coverage after DCP refactoring; all stable-code decision outcomes have test data |
| Mutation/reverse validation | Pass | focused libusb test exited 1 on intentional wrong mapping and passed after restore |
| Production compilation | Pass | all 50 Linux and all 50 MinGW HDC TUs compiled with generated upstream Clang flags |
| Production link/smoke | Pass | x86_64 PIE linked; `hdc -v` returned `Ver: 3.2.0f` |
| Isolated CLI: refused TCP | Pass | `[Fail][E001101] TCP connection was refused` |
| Isolated CLI: missing target | Pass | `[Fail][E001006] Specified target was not found` |
| Isolated CLI: invalid UART key | Pass | `[Fail][E001400] UART connect key is invalid` |
| Isolated CLI: USB backend | Pass | `[Fail][E001201] USB backend initialization failed` |
| Whitespace/static hygiene | Pass | `git -c core.whitespace=cr-at-eol diff --check` |
| AR pair validator | Pass | 16 features and 42 F/TC pairs verified through Windows PowerShell entry |
| Existing-spec compatibility | Pass | all 11 existing E002103/E002106～E002115 descriptor rows and original libuv mappings unchanged |
| Linux production build | Pass | 50/50 HDC host/common TUs rebuilt with generated `clang_x64` flags and linked; `Ver: 3.2.0f` |
| Windows production build | Pass | 50/50 HDC host/common TUs rebuilt with generated MinGW flags; PE32+ x86-64 linked and launched |
| Alternate-port instance E2E | Pass | isolated `0.0.0.0:8711` server plus default `8710` client emitted E002116 immediately |
| Invalid instance state E2E | Pass | invalid metadata plus refused connect emitted E002117 with `metadata_invalid` action |
| Candidate clear E2E | Pass | invalid metadata plus successful local handshake cleared E002117; stderr remained empty |
| Old-server metadata compatibility | Pass | removed `.HDCServer.info`; client reached existing server and emitted no E002116/E002117 |
| Existing local refused output | Pass | `-p -s 127.0.0.1:54321` emitted unchanged E002110 |
| Windows deploy | Pass | `E:\temp\hdc.exe`, SHA-256 `e9c04fe0159403e8a2915ddb4bc4c181252be9b6c22d7fb2aeb7207b602963b5`; DLL SHA-256 `6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26` |
| AR pair validator addendum | Pass | 16 features and 42 F/TC pairs verified through Windows PowerShell entry |

The raw gcov branch percentage includes C++ string construction/exception edges and short-circuit compiler edges. It is therefore not used as the claim that real hardware causes are all reproduced. The stronger scoped claim is: every catalog entry is constructible, every mapper/state outcome has injected test data, and the mapper implementation has 100% executable-line coverage.

## 5. Constructability Boundary

All 61 stable-code construction/format branches and every pure native/state classifier outcome can be automated. This does **not** mean every physical root cause can be deterministically produced on one software-only host.

| Layer | Can be fully constructed? | Verification |
|-------|---------------------------|--------------|
| catalog/formatter | yes | table-driven unit tests |
| native/status mapper | yes | libuv/libusb/POSIX/Win32/state injection |
| session/daemon propagation | yes | in-memory component tests plus representative CLI paths |
| real OS/driver behavior | partly | network namespaces/fake endpoints/PTY/driver test doubles |
| physical cable, power, hub, EMI, device reboot | no, not deterministically | HIL matrix and observed-fact assertions |

HIL assertions must check the host-observed fact (`NO_DEVICE`, timeout, repeated attach, access denied), not claim an unobservable physical diagnosis such as “bad cable”.

## 6. Exceptions and Follow-up

| Feature ID | Test Case ID | Blocker | User Confirmation |
|------------|--------------|---------|-------------------|
| N/A | N/A | none for the automated PR gate | task explicitly authorizes development, validation and PR submission |

- The repository's standalone CMake path currently includes OHOS-specific `command_event_report.cpp` without its platform `parameters.h`; that pre-existing configuration fails independently of this change. The authoritative generated OpenHarmony `clang_x64` flags were used instead and the complete HDC target linked successfully.
- Windows/macOS USB drivers, physical UART hardware and destructive cable/power tests remain HIL/manual evidence. They are documented as release sampling rather than falsely marked as software-only coverage.
- CLI process exit-code categories and a new public verbose switch are intentionally not changed in this PR; both require a separate compatibility review.
