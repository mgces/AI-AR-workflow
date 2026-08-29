# 证据与产物摘要（脱敏）

> 本文件是 standalone AR Workflow 的人读摘要，不是目标仓库 P0～P8 流水线生成的 HMAC 账本。原始访问令牌、设备标识和 CI 会话数据未归档。所有列出的本地文档均可用 SHA-256 复核。

- run_id: `20260829-requirement-add-hdc-connection-error-diagnostics`
- workflow: `REQUIREMENT_CLARIFYING -> ARCHITECTURE_DESIGNING -> TESTCASE_DESIGNING -> DEVELOPING`
- source_repo: `openharmony/developtools_hdc`
- source_base: `7a47ffb4b74b8b44ebf801c98e352e020427ce06`
- source_head: `276162dd5159c2a7aae81c96f0c39e27d752428c`
- source_pr: `https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514`
- linked_issue: `https://gitcode.com/openharmony/developtools_hdc/issues/1955`

## REQUIREMENT_CLARIFYING — PASS

- reason: 需求范围、兼容边界、隐私约束和物理故障构造边界已收敛。
- artifacts:
  - `workflow/clarification.md` : `79c535bcdb02846bf2f0e5d58d452f92258430be034940e58bd2529e17234ed9`
  - `workflow/requirement-spec.md` : `628a0f224fe086cafc76241764f45ad9a8e7159f0266d7061cfee8ab0f4bcb2b`

## ARCHITECTURE_DESIGNING — PASS

- reason: F-001～F-014 已映射到模块、接口、数据流、风险和回滚策略。
- artifacts:
  - `workflow/architecture.md` : `072f15d355f1d5a02bc63a8c990992a07c43b7640e57fe9f1bfaeca510fb67d8`

## TESTCASE_DESIGNING — PASS

- reason: 14 个功能点均有测试，30 组 F/TC pair 完整，TC-001～TC-022 均有 Given/When/Then。
- artifacts:
  - `workflow/test-cases.md` : `5cf1dcd5f9d45e7a1feb71621c157f29335e6988b70d12c045841234cc696a90`
  - `workflow/feature-test-matrix.md` : `08e8561090b3f9207a1018c569b9c455691208b2fe052e49f019f5ca14a5b28b`

## DEVELOPING — PASS

- reason: 每个开发任务声明关联 F/TC；实现、测试、跨平台构建和上游 PR 已完成。
- artifacts:
  - `workflow/tasks.md` : `781a95c505bbb6f8b73da21ba792dc3bfcb60b2caa2c3ddf85966749c5a66b5c`
  - `workflow/apply-report.md` : `b6d12401be574f8cfc8bad813c20cd3b0aa3adb9c62dc9623555334873c61f60`
  - `workflow/todo.md` : `e40810edc296dbf90dedd3297445685982ef590bdf446b18235a2920faa4795e`

## PAIR VALIDATION — PASS

- command: `powershell -ExecutionPolicy Bypass -File workflow/validate-change.ps1 -ChangeDir workflow`
- result: 14/14 features covered；30/30 F/TC pairs verified。
- validator:
  - `workflow/validate-change.ps1` : `18a3be0ee47f6a5b535762b79df628052673cc5e8965f807e0954f40a9960b5e`

## 人读归档

- `README.md` : `0dc68a5346656108d062d4978c6af983ea5bb4783a892a3c80217326fbea485f`
- `AR_design.md` : `072f15d355f1d5a02bc63a8c990992a07c43b7640e57fe9f1bfaeca510fb67d8`
- `ar.md` : `628a0f224fe086cafc76241764f45ad9a8e7159f0266d7061cfee8ab0f4bcb2b`
- `todo.md` : `e40810edc296dbf90dedd3297445685982ef590bdf446b18235a2920faa4795e`
- `reports/summary.md` : `8523e02a09c8ff1c08cfb2818685232ebe2caadb90f1e3650e79fbd538b680fb`
- `reports/quality.md` : `9e510a8b7c1db207609ba349afbfe6e88ae1b21f01ac28e1e4a4cd93b329faa3`
- `reports/pr_description.md` : `0eba764f52873f16c1faf62c661ae8c56581d254db92b64c3e96f627068fd2d5`

## 外部验证锚点

- HDC source commit: `276162dd5159c2a7aae81c96f0c39e27d752428c`
- DCP runlist: `6a9270b764650f998b565dc9`
- PR labels at archive time: `dco检查成功`, `编译成功`
- mapper/catalog tests: `18/18 Pass`
- session lifecycle tests: `2/2 Pass`
- mapper executable lines: `274/274 (100%)`
- Windows `hdc.exe`: `150474d14f39c32cbce481ca3c490fe3cb5efe08f46bf55af240dc46627ee975`
- Windows `libusb_shared.dll`: `6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26`

## 脱敏说明

未归档 GitCode token、DCP token、设备序列号、用户凭据、原始流水线响应或运行时私有路径。代码提交、PR、Issue 和公开门禁运行编号保留用于交叉复核。
