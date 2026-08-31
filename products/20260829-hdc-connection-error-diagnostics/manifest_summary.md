# 证据与产物摘要（脱敏）

> 本文件是 standalone AR Workflow 的人读摘要，不是目标仓库 P0～P8 流水线生成的 HMAC 账本。原始访问令牌、设备标识和 CI 会话数据未归档。所有列出的本地文档均可用 SHA-256 复核。

- run_id: `20260829-requirement-add-hdc-connection-error-diagnostics`
- workflow: `REQUIREMENT_CLARIFYING -> ARCHITECTURE_DESIGNING -> TESTCASE_DESIGNING -> DEVELOPING`
- source_repo: `openharmony/developtools_hdc`
- source_base: `7a47ffb4b74b8b44ebf801c98e352e020427ce06`
- source_head: `2841ecd39bfe623466ce9b6019c241c106675d16`
- source_commits: `276162dd5159c2a7aae81c96f0c39e27d752428c`, `fe699bdfdced1cc08128737790a49b4fb76e3f96`, `2841ecd39bfe623466ce9b6019c241c106675d16`
- source_pr: `https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514`
- linked_issue: `https://gitcode.com/openharmony/developtools_hdc/issues/1955`

## REQUIREMENT_CLARIFYING — PASS

- reason: 需求范围、兼容边界、隐私约束和物理故障构造边界已收敛。
- artifacts:
  - `workflow/clarification.md` : `1cfeaf7e938e4fc22073e0a3dc59740c2ae65f203da3f226aa12a03597a86dca`
  - `workflow/requirement-spec.md` : `8d75aa8fa9c063fc48b83dbf3f7ec60a111e21e658a2df097101e519288e85d6`

## ARCHITECTURE_DESIGNING — PASS

- reason: F-001～F-016 已映射到模块、接口、数据流、风险和回滚策略，包含追加码兼容约束。
- artifacts:
  - `workflow/architecture.md` : `067074d5981667ca11aaf1ba2db2f306e37935aa12a32c37acd8e9f686b1f965`

## TESTCASE_DESIGNING — PASS

- reason: 16 个功能点均有测试，42 组 F/TC pair 完整，TC-001～TC-028 均有 Given/When/Then。
- artifacts:
  - `workflow/test-cases.md` : `14b7a27680a29cd2af52743d70feda2b886f972ccb9a267da5435ceed4e42809`
  - `workflow/feature-test-matrix.md` : `f639edd617d874f70a360ef738a7c1e4c6f9645b20704a9510a770d92205fe91`

## DEVELOPING — PASS

- reason: 每个开发任务声明关联 F/TC；实现、测试、跨平台构建和上游 PR 已完成。
- artifacts:
  - `workflow/tasks.md` : `69f71443718f6cc0d3c90ee86f11efba5938e352e41631ee4de4692fa9fd3f8c`
  - `workflow/apply-report.md` : `974bd1134b4f992b306762039c74ae0a47e26e8259c1c4bac2d9762abed9b581`
  - `workflow/todo.md` : `936333a21e59ebc9ca091d235e8b85c7d1932ed1c960ff041779235bf4bf37e1`

## PAIR VALIDATION — PASS

- command: `powershell -ExecutionPolicy Bypass -File workflow/validate-change.ps1 -ChangeDir workflow`
- result: 16/16 features covered；42/42 F/TC pairs verified。
- validator:
  - `workflow/validate-change.ps1` : `18a3be0ee47f6a5b535762b79df628052673cc5e8965f807e0954f40a9960b5e`

## 人读归档

- `README.md` : `acbb170127d9580b50ac18e571b7c30d66a2c62a1160b032458a42f29db02146`
- `AR_design.md` : `067074d5981667ca11aaf1ba2db2f306e37935aa12a32c37acd8e9f686b1f965`
- `ar.md` : `8d75aa8fa9c063fc48b83dbf3f7ec60a111e21e658a2df097101e519288e85d6`
- `todo.md` : `936333a21e59ebc9ca091d235e8b85c7d1932ed1c960ff041779235bf4bf37e1`
- `reports/summary.md` : `0b4bd6e45142b009bf776e81d4aaa77024441f1977e954e2f2c71fd1f5173e4a`
- `reports/quality.md` : `18855f3eb21445260b54e52a78c4f15f3d7e6de7db451fccafc483d02a49d649`
- `reports/pr_description.md` : `e15fe66faa37e395668c090aa01207e071f75b72dd0e7524dae7bf7956728834`

## 外部验证锚点

- HDC source head: `2841ecd39bfe623466ce9b6019c241c106675d16`
- first-stage DCP runlist: `6a9270b764650f998b565dc9`
- current-head codeCheck: runlist `6a94f16b64650f998bf679aa`, 0 issues
- current-head HDC compile: direct targets passed; retry runlist `6a94ff1764650f998bfbe531` linked HDC again
- aggregate gate: blocked by repeated Contacts HAP SDK management-mode failure outside HDC
- mapper/catalog/instance tests: `23/23 Pass`
- session lifecycle tests: `2/2 Pass`
- mapper executable lines: `274/274 (100%)`
- Windows `hdc.exe`: `bf7263ce51ce40efb901b99489b82284b10ac330e466ce32d1d3003df9446056`
- Windows `libusb_shared.dll`: `6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26`

## 脱敏说明

未归档 GitCode token、DCP token、设备序列号、用户凭据、原始流水线响应或运行时私有路径。代码提交、PR、Issue 和公开门禁运行编号保留用于交叉复核。
