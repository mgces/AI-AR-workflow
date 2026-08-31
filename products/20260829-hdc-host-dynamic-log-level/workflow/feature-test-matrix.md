# Feature Test Matrix

## Coverage Matrix

| Feature ID | Test Case ID | Level | Automation | Test File/Command | Required Before Development |
|------------|--------------|-------|------------|-------------------|-----------------------------|
| F-001 | TC-001 | unit | automated | `test/unittest/host/host_translate_test.cpp` | yes |
| F-001 | TC-009 | e2e | scripted | isolated-port `hdc server loglevel` flow | yes |
| F-002 | TC-002 | unit | automated | `test/unittest/ext/ext_test.cpp`, `host_translate_test.cpp` | yes |
| F-002 | TC-003 | unit | automated | `test/unittest/ext/ext_test.cpp` | yes |
| F-002 | TC-009 | e2e | scripted | isolated-port query/set/invalid flow | yes |
| F-003 | TC-004 | unit | automated | `test/unittest/ext/ext_test.cpp` | yes |
| F-003 | TC-011 | static | automated | `rg -n "g_logLevel" src test` | yes |
| F-004 | TC-005 | unit | automated | `test/unittest/ext/ext_test.cpp` | yes |
| F-004 | TC-006 | unit | automated | `test/unittest/ext/ext_test.cpp` | yes |
| F-005 | TC-007 | unit | automated | `test/unittest/host/host_translate_test.cpp` | yes |
| F-005 | TC-012 | static | automated | `UsbLogHandler` prefilter inspection + host build | yes |
| F-006 | TC-008 | unit | automated | `test/unittest/host/host_translate_test.cpp` | yes |
| F-006 | TC-010 | integration | automated | host build + relevant existing unit targets | yes |
| F-006 | TC-013 | e2e | scripted | LAN listener + loopback/non-loopback client flow | yes |

## Coverage Summary

| Feature ID | Required Test Count | Designed Test Count | Status |
|------------|---------------------|---------------------|--------|
| F-001 | 1 | 2 | covered |
| F-002 | 1 | 3 | covered |
| F-003 | 1 | 2 | covered |
| F-004 | 1 | 2 | covered |
| F-005 | 1 | 2 | covered |
| F-006 | 1 | 3 | covered |

Coverage gate: every requirement feature `F-001..F-006` has at least one defined `TC-xxx`, and every matrix test case is defined in `test-cases.md`.
