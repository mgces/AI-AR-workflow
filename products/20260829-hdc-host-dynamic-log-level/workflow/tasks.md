# Development Tasks

## 1. Task Summary

- Change: `20260829-requirement-add-host-dynamic-log-level`
- Development strategy: test-first
- Isolation: implementation is performed in a dedicated hdc worktree on branch `feat/host-dynamic-log-level`; the existing manifest-managed worktree is not modified.

## 2. Tasks

### TASK-001: add host-local query/set command

- Feature IDs: F-001, F-002, F-006
- Test Case IDs: TC-001, TC-002, TC-003, TC-008, TC-009, TC-010, TC-013
- Depends on: none
- Files:
  - `src/common/define.h`
  - `src/common/define_enum.h`
  - `src/common/base.h`
  - `src/common/base.cpp`
  - `src/host/main.cpp`
  - `src/host/client.cpp`
  - `src/host/translate.cpp`
  - `src/host/server_for_client.cpp`
  - `src/common/command_event_report.cpp`
  - `test/unittest/ext/ext_test.cpp`
  - `test/unittest/host/host_translate_test.cpp`
- Implementation:
  - 先增加 parser、level 边界与 help 测试并运行，确认新行为缺失。
  - 新增 `server loglevel [0-6]` CLI 解析和 no-target、本地路由。
  - 查询返回 current；设置严格验证后返回 old/new；失败保持旧值。
  - 对 UDS/回环 peer 放行，对非回环 peer 和 peer 查询失败 fail closed。
- Acceptance:
  - TC-001、TC-002、TC-003、TC-008、TC-009、TC-010、TC-013 通过。

### TASK-002: make log threshold atomic and optimize suppressed path

- Feature IDs: F-003, F-004
- Test Case IDs: TC-004, TC-005, TC-006, TC-011
- Depends on: TASK-001 level parsing API
- Files:
  - `src/common/log.h`
  - `src/common/base.h`
  - `src/common/base.cpp`
  - `test/unittest/ext/ext_test.cpp`
- Implementation:
  - 先增加并发读写和宏副作用测试并运行，确认当前 suppressed 参数仍会求值。
  - 用 `std::atomic<uint8_t>` 与 relaxed load/store 替换普通全局变量。
  - 在 `WRITE_LOG` 调用点快速过滤，函数内保留复检。
- Acceptance:
  - TC-004、TC-005、TC-006、TC-011 通过；全仓无非原子直接读写。

### TASK-003: synchronize and prefilter libusb logging

- Feature IDs: F-005
- Test Case IDs: TC-007, TC-012
- Depends on: TASK-002 IsLoggable API
- Files:
  - `src/host/host_usb.h`
  - `src/host/host_usb.cpp`
  - `src/host/main.cpp`
  - `src/host/server_for_client.cpp`
  - `test/unittest/host/host_translate_test.cpp`
- Implementation:
  - 先增加完整映射测试并运行，确认现有映射不符合规格。
  - 修正 0..6 到 libusb 的映射；新增活动 context 更新。
  - hdc 不再主动固定 `LIBUSB_DEBUG`；callback 在复制/regex 前预过滤。
- Acceptance:
  - TC-007、TC-012 通过；host 构建通过。

### TASK-004: full validation and traceability report

- Feature IDs: F-001, F-002, F-003, F-004, F-005, F-006
- Test Case IDs: TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013
- Depends on: TASK-001, TASK-002, TASK-003
- Files:
  - `scripts/validate-change.ps1`
  - `specs/changes/20260829-requirement-add-host-dynamic-log-level/apply-report.md`
- Implementation:
  - 执行格式/静态检查、目标构建、相关单测和隔离端口 e2e。
  - 记录每个 F/TC 配对的真实命令、结果和证据。
  - 执行 AR validator，准备提交与 PR。
- Acceptance:
  - 所有矩阵配对为 Pass 且 `validate-change.ps1` 通过。

## 3. Development Order

```text
TASK-001 tests -> TASK-002 tests -> TASK-003 tests
    -> TASK-001 implementation -> TASK-002 implementation -> TASK-003 implementation
    -> TASK-004 full validation -> commit -> PR
```
