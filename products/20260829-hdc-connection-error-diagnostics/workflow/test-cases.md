# Test Cases

## 1. Test Strategy

- Change: `20260829-requirement-add-hdc-connection-error-diagnostics`
- Scope: HDC host 连接错误目录、mapper、primary fault、target/session 分类、transport 接入和 CLI 格式。
- Test levels: unit、component integration、build、manual hardware sampling。
- Automation rule: 所有 stable code 分支必须自动化；真实 USB/UART/网络只作为第二重证据。
- Entry rule: mapper 测试必须注入 native status/state，不得直接注入最终 stable code。

## 2. Catalog Coverage Set

TC-001 的参数集合必须包含以下59个不同 code：

| Group | Codes |
|------|-------|
| auth/transient | `E000001 E000002 E000003 E000004 E000010` |
| existing USB/legacy | `E001000 E001003 E001005` |
| target/session | `E001006 E001007 E001008 E001009 E001010 E001011 E001012 E001013` |
| TCP | `E001100 E001101 E001102 E001103 E001104 E001107 E001108 E001109 E001110 E001111` |
| USB | `E001201 E001202 E001203 E001204 E001205 E001206 E001207 E001208 E001209 E001210 E001211 E001212 E001213` |
| UART | `E001400 E001401 E001402 E001403 E001404 E001405 E001406 E001407 E001408` |
| local server/channel | `E002103 E002106 E002107 E002108 E002109 E002110 E002111 E002112 E002113 E002114 E002115` |

## 3. Test Cases

### TC-001: Catalog contains every stable code exactly once

- Feature ID: F-001
- Level: unit
- Type: positive/boundary
- Preconditions: connection error catalog compiled into host test target.
- Given: the 59-code coverage set above.
- When: descriptors are enumerated and queried by code.
- Then: each code has one unique symbol, non-empty message, valid priority/retryable metadata and six-digit formatted value; no duplicate code/symbol exists.
- Data: all codes in section 2.
- Automation: automated.

### TC-002: Fault formatting is deterministic and privacy-safe

- Feature IDs: F-002, F-012
- Level: unit
- Type: positive/security/boundary
- Preconditions: default and verbose formatter available.
- Given: a fault with stage, transport, native domain/code and an unknown code value.
- When: short and verbose strings are formatted.
- Then: short format starts with `[Exxxxxx]`; verbose adds only whitelisted numeric metadata; unknown code returns safe fallback; no connectKey/path/payload/token is emitted.
- Data: `E001202`, unknown `0x00FFFE`, native `-3`.
- Automation: automated.

### TC-003: Primary fault priority is stable

- Feature ID: F-003
- Level: unit
- Type: boundary/regression
- Preconditions: `PublishPrimaryFault` available.
- Given: current/candidate pairs spanning parameter, auth, access denied, transport terminal, protocol, timeout, generic I/O and fallback priorities.
- When: candidate is published.
- Then: the higher-quality primary fault is retained; equal-priority later cleanup does not silently replace the first root cause.
- Data: `E001202→E001210`, `E001101→E001107`, `E001109→E001102`, NONE→each category.
- Automation: automated.

### TC-004: Cleanup EOF and cancel do not overwrite root cause

- Feature IDs: F-003, F-009
- Level: component
- Type: asynchronous regression
- Preconditions: session fault storage enabled.
- Given: session primary fault is USB access denied or TCP refused.
- When: close/cancel/EOF callback runs afterward.
- Then: original code/native stage remains; only an empty current fault may accept generic cleanup error.
- Data: `E001202 + TRANSFER_CANCELLED`, `E001101 + UV_EOF`.
- Automation: automated.

### TC-005: Local server and channel libuv mapping

- Feature ID: F-004
- Level: unit
- Type: parameterized negative
- Preconditions: `MapUvError` available.
- Given: native status with explicit local stage.
- When: mapper runs.
- Then: mappings are `EADDRINUSE→E002107`, `EACCES/EPERM→E002108`, refused→`E002110`, timeout→`E002111`, ENOENT→`E002114`, post-connect EOF/reset/pipe→`E002115`; explicit process/readiness/version/protocol states select `E002103/E002109/E002112/E002113`; unknown local condition selects `E002106`.
- Data: libuv constants and explicit state factories.
- Automation: automated.

### TC-006: Client retry preserves final local connection fault

- Feature IDs: F-004, F-010
- Level: component
- Type: asynchronous negative/positive
- Preconditions: HdcClient test can invoke callback/retry state.
- Given: consecutive refused or UDS missing callbacks followed by retry exhaustion; separate success callback case.
- When: client final error is obtained.
- Then: refused prints `E002110`, missing endpoint prints `E002114`, success clears stale fault, and generic `Connect server failed` is not used when native status is known.
- Data: `UV_ECONNREFUSED`, `UV_ENOENT`, `status=0`.
- Automation: automated.

### TC-007: Target and session state classifier

- Feature ID: F-005
- Level: unit
- Type: parameterized boundary
- Preconditions: `ClassifyTargetState` available.
- Given: snapshots for specified-not-found, multiple connected, offline, session unavailable, handshake transient/expired, version mismatch, protocol invalid and no target.
- When: target classifier runs.
- Then: codes are respectively `E001006/E001007/E001008/E001009/E000004/E001010/E001011/E001012/E001013`.
- Data: one minimal snapshot per state plus successful connected snapshot returning NONE.
- Automation: automated.

### TC-008: Target/session state mismatch and auth priority

- Feature IDs: F-005, F-009
- Level: component
- Type: state-desynchronization regression
- Preconditions: daemon map state can be constructed in memory.
- Given: daemon map says connected while session is null/dead; a second case has handshake timeout plus confirmed auth denial; a third has offline target plus a more specific last fault.
- When: command binding selects a fault.
- Then: first case returns `E001009`; auth fault wins over timeout; specific last fault wins over generic offline.
- Data: connected/null, connected/dead, `E000002 + deadline`, offline + `E001206`.
- Automation: automated.

### TC-009: TCP parameter error compatibility

- Feature ID: F-006
- Level: unit
- Type: compatibility/boundary
- Preconditions: existing translate parsing available.
- Given: invalid port and invalid IP.
- When: `tconn` parameters are translated.
- Then: stable codes remain `E001100` and `E001104` with unchanged numeric values.
- Data: port 0/out-of-range, malformed IPv4/IPv6.
- Automation: automated.

### TC-010: TCP libuv and protocol mapping

- Feature ID: F-006
- Level: unit
- Type: parameterized negative
- Preconditions: TCP mapper available.
- Given: connect/read/protocol/TLS native states.
- When: mapper runs with stage.
- Then: refused/timeout/unreachable/reset/protocol/TLS/I/O/local-address-invalid map to `E001101/E001102/E001103/E001107/E001108/E001109/E001110/E001111`; same EOF before and after connect follows stage rules.
- Data: `UV_ECONNREFUSED`, `UV_ETIMEDOUT`, `UV_ENETUNREACH`, `UV_EHOSTUNREACH`, `UV_EOF`, `UV_ECONNRESET`, `UV_EPIPE`, `UV_EADDRNOTAVAIL`, explicit protocol/TLS state.
- Automation: automated.

### TC-011: TCP call sites publish mapper result

- Feature IDs: F-006, F-011
- Level: component
- Type: negative/regression
- Preconditions: host TCP callback and session object available.
- Given: connect callback receives refused and read callback receives reset/parse failure.
- When: production call site executes.
- Then: session `connectionFault` and compatibility `faultInfo` contain `E001101`, `E001107` or `E001108`; native status is preserved; session is marked unhealthy.
- Data: synthetic `uv_connect_t/HdcSession`, negative `nread`, invalid packet result.
- Automation: automated.

### TC-012: libusb API return mapping

- Feature ID: F-007
- Level: unit
- Type: parameterized negative
- Preconditions: libusb mapper available.
- Given: init/enumeration/open/claim/descriptor/serial API results.
- When: mapper runs with USB stage.
- Then: backend init/enumeration/access/busy/interface-invalid/serial/no-device/timeout/pipe/overflow/I/O map to `E001201/E001213/E001202/E001203/E001204/E001205/E001206/E001207/E001208/E001209/E001210`.
- Data: all relevant `LIBUSB_ERROR_*` plus explicit descriptor states.
- Automation: automated.

### TC-013: USB transfer status and cancellation mapping

- Feature ID: F-007
- Level: unit
- Type: parameterized boundary/regression
- Preconditions: transfer mapper available.
- Given: COMPLETED, ERROR, TIMED_OUT, CANCELLED, STALL, NO_DEVICE and OVERFLOW statuses with host-cancel true/false.
- When: transfer mapper runs.
- Then: completed and host-cancel return NONE; other statuses select `E001210/E001207/E001208/E001206/E001209`; non-host cancel falls back to `E001210`.
- Data: all `libusb_transfer_status` values.
- Automation: automated.

### TC-014: USB call sites use API return and callback status correctly

- Feature IDs: F-007, F-011
- Level: component
- Type: negative/regression
- Preconditions: USB transfer/session test seam available.
- Given: `libusb_submit_transfer` returns ACCESS while stale transfer status is COMPLETED; a second case submit succeeds then callback reports NO_DEVICE.
- When: production USB submit path publishes the fault.
- Then: first case is `E001202` from submit return, second is `E001206` from callback; cleanup cancel does not overwrite either.
- Data: submit `-3`, transfer COMPLETED/NO_DEVICE.
- Automation: automated.

### TC-015: UART POSIX native mapping

- Feature ID: F-008
- Level: unit
- Type: parameterized negative
- Preconditions: UART mapper compiled independent of optional transport.
- Given: invalid key, ENOENT, EACCES/EPERM, EBUSY and config/I/O stages.
- When: mapper runs with POSIX domain.
- Then: codes are `E001400/E001401/E001402/E001403/E001404/E001408`.
- Data: errno constants and explicit stages.
- Automation: automated.

### TC-016: UART Win32, timeout, integrity and disconnect mapping

- Feature IDs: F-008, F-011
- Level: unit/component
- Type: cross-platform negative
- Preconditions: mapper accepts explicit WIN32 domain.
- Given: Win32 2/5/32/1167 plus handshake deadline, ACK/checksum exhausted and generic I/O.
- When: mapper or UART call-site helper runs.
- Then: codes are `E001401/E001402/E001403/E001407/E001405/E001406/E001408`; stable result matches POSIX semantics.
- Data: Win32 numeric constants and protocol state.
- Automation: automated.

### TC-017: Session fault survives release and clears on success

- Feature ID: F-009
- Level: component
- Type: lifecycle/asynchronous
- Preconditions: HdcServer daemon map and session lifecycle available.
- Given: failed session with fault and daemon entry; another session subsequently completes handshake successfully.
- When: failed session is released, queried through daemon map, then replaced by successful session.
- Then: immutable lastFault is visible after release; no dangling session pointer is needed; successful handshake clears historical fault.
- Data: TCP refused and USB disconnected.
- Automation: automated.

### TC-018: CLI and verbose target output golden test

- Feature ID: F-012
- Level: component
- Type: compatibility/security
- Preconditions: formatter and target list output available.
- Given: offline target with last fault and a successful target list.
- When: default failure, verbose failure, default list and verbose list are generated.
- Then: failure includes stable code; verbose includes stage/transport/native numbers; success/default list format remains compatible; complete device serial/token/payload are absent.
- Data: `E001206`, masked target id.
- Automation: automated.

### TC-019: Existing numbers and legacy fallback remain compatible

- Feature ID: F-013
- Level: unit/component
- Type: compatibility/negative
- Preconditions: complete catalog and mapper available.
- Given: all pre-existing codes plus known and unknown native conditions.
- When: values and mapper output are inspected.
- Then: existing numeric values are unchanged; known conditions never select `E001003/E001005/E002106`; unknown USB/target/local conditions may select the appropriate legacy fallback; no wire data structure changes.
- Data: existing code set and one unknown native per domain.
- Automation: automated.

### TC-020: Source detection points and catalog documentation agree

- Feature ID: F-014
- Level: build/static
- Type: consistency
- Preconditions: source, tests and docs present.
- Given: catalog declaration, parameter tables and error reference.
- When: consistency script/check runs.
- Then: every catalog code appears in tests and reference; no duplicate; every mapper branch has a test datum.
- Data: repository files.
- Automation: automated.

### TC-021: Mutation check proves mapper tests detect regression

- Feature ID: F-014
- Level: unit
- Type: reverse validation
- Preconditions: mapper tests pass.
- Given: temporary equivalent mutation mapping `LIBUSB_ERROR_ACCESS` to generic USB I/O or `UV_ECONNREFUSED` to TCP I/O.
- When: corresponding focused test is run against the mutation, then source is restored.
- Then: test fails on exact-code assertion under mutation and passes after restoration.
- Data: one USB and/or TCP mapper mutation.
- Automation: controlled development validation.

### TC-022: Host and UART build targets compile

- Feature IDs: F-008, F-014
- Level: build
- Type: regression
- Preconditions: OpenHarmony build environment available.
- Given: production host sources and updated unit target.
- When: HDC host/UT targets build with normal configuration and UART-enabled test target where supported.
- Then: compilation and link succeed with no new warning-as-error/static-check failures.
- Data: GN targets resolved from repository build definition.
- Automation: automated.

## 4. Regression Tests

| Test Case ID | Related Feature | Regression Area | Notes |
|--------------|-----------------|-----------------|-------|
| TC-003/TC-004 | F-003/F-009 | async cleanup | 防止 EOF/cancel 覆盖根因 |
| TC-006 | F-004/F-010 | client retry | 防止 callback status 再次丢失 |
| TC-008 | F-005/F-009 | state mismatch | connected target 与 null/dead session 故意错位 |
| TC-011 | F-006/F-011 | TCP propagation | 不只验证 mapper，验证生产 call site |
| TC-014 | F-007/F-011 | USB submit/callback | 防止读取错误的 status 来源 |
| TC-017 | F-009 | lifecycle | 防止释放后 fault 悬空或丢失 |
| TC-019 | F-013 | compatibility | 既有码不改值，known 不落 generic |
| TC-021 | F-014 | test quality | 测试必须能杀死旧/突变行为 |
