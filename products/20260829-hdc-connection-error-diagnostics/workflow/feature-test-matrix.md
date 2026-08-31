# Feature Test Matrix

## Coverage Matrix

| Feature ID | Test Case ID | Level | Automation | Test File/Command | Required Before Development |
|------------|--------------|-------|------------|-------------------|-----------------------------|
| F-001 | TC-001 | unit | automated | `connection_error_test.cpp` catalog table | yes |
| F-002 | TC-002 | unit | automated | `connection_error_test.cpp` formatter | yes |
| F-003 | TC-003 | unit | automated | `connection_error_test.cpp` priority | yes |
| F-003 | TC-004 | component | automated | session fault regression | yes |
| F-004 | TC-005 | unit | automated | local libuv mapper table | yes |
| F-004 | TC-006 | component | automated | client retry/callback test | yes |
| F-005 | TC-007 | unit | automated | target snapshot table | yes |
| F-005 | TC-008 | component | automated | daemon/session mismatch test | yes |
| F-006 | TC-009 | unit | automated | translate parameter regression | yes |
| F-006 | TC-010 | unit | automated | TCP mapper table | yes |
| F-006 | TC-011 | component | automated | host TCP call-site test | yes |
| F-007 | TC-012 | unit | automated | libusb API mapper table | yes |
| F-007 | TC-013 | unit | automated | USB transfer mapper table | yes |
| F-007 | TC-014 | component | automated | USB submit/callback test | yes |
| F-008 | TC-015 | unit | automated | UART POSIX mapper table | yes |
| F-008 | TC-016 | unit/component | automated | UART Win32/protocol table | yes |
| F-008 | TC-022 | build | automated | HDC host/UART build | yes |
| F-009 | TC-004 | component | automated | first-fault cleanup test | yes |
| F-009 | TC-008 | component | automated | state mismatch/priority test | yes |
| F-009 | TC-017 | component | automated | session release/lastFault test | yes |
| F-010 | TC-006 | component | automated | client local callback test | yes |
| F-011 | TC-011 | component | automated | TCP production call site | yes |
| F-011 | TC-014 | component | automated | USB production call site | yes |
| F-011 | TC-016 | component | automated | UART mapper/call site | yes |
| F-012 | TC-002 | unit | automated | formatter privacy test | yes |
| F-012 | TC-018 | component | automated | CLI/list golden test | yes |
| F-013 | TC-019 | unit/component | automated | compatibility/fallback test | yes |
| F-014 | TC-020 | static | automated | catalog/source/doc consistency | yes |
| F-014 | TC-021 | unit mutation | automated | focused mapper reverse validation | yes |
| F-014 | TC-022 | build | automated | production and UT build | yes |
| F-001 | TC-023 | unit/static | automated | existing descriptor snapshot and catalog append check | yes |
| F-013 | TC-023 | unit/static | automated | existing descriptor/mapper compatibility check | yes |
| F-013 | TC-028 | component/e2e | automated | missing metadata old-server compatibility | yes |
| F-014 | TC-027 | e2e | automated | isolated alternate-port executable scenario | yes |
| F-015 | TC-023 | unit/static | automated | append-only specification check | yes |
| F-015 | TC-025 | unit | automated | endpoint relation parameter table | yes |
| F-015 | TC-026 | component | automated | preflight stop/candidate lifecycle | yes |
| F-015 | TC-027 | e2e | automated | server 8711/client 8710 executable scenario | yes |
| F-016 | TC-023 | unit/static | automated | append-only specification check | yes |
| F-016 | TC-024 | unit | automated | metadata parser/PID classifier | yes |
| F-016 | TC-026 | component | automated | invalid candidate and success clearing | yes |
| F-016 | TC-028 | component/e2e | automated | missing metadata compatibility | yes |

## Coverage Summary

| Feature ID | Required Test Count | Designed Test Count | Status |
|------------|---------------------|---------------------|--------|
| F-001 | 1 | 1 | covered |
| F-002 | 1 | 1 | covered |
| F-003 | 2 | 2 | covered |
| F-004 | 2 | 2 | covered |
| F-005 | 2 | 2 | covered |
| F-006 | 3 | 3 | covered |
| F-007 | 3 | 3 | covered |
| F-008 | 3 | 3 | covered |
| F-009 | 3 | 3 | covered |
| F-010 | 1 | 1 | covered |
| F-011 | 3 | 3 | covered |
| F-012 | 2 | 2 | covered |
| F-013 | 1 | 1 | covered |
| F-014 | 3 | 3 | covered |
| F-015 | 4 | 4 | covered |
| F-016 | 4 | 4 | covered |

## Development Gate

- All F-001 through F-016 appear in the matrix.
- Every matrix TC is defined with Given/When/Then in `test-cases.md`.
- Mapper and call-site tests are distinct; formatter-only tests cannot satisfy transport mapping features.
- Status: `PASS — development may start after tasks.md declares every pair`.
