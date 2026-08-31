# 证据与产物摘要（脱敏）

> 本文件是 standalone AR Workflow 的人读摘要，不是目标仓库 P0～P8 流水线生成的 HMAC 账本。原始访问令牌、设备标识和 CI 会话数据未归档。所有列出的本地文档均可用 SHA-256 复核。

- run_id: `20260829-requirement-add-hdc-connection-error-diagnostics`
- workflow: `REQUIREMENT_CLARIFYING -> ARCHITECTURE_DESIGNING -> TESTCASE_DESIGNING -> DEVELOPING`
- source_repo: `openharmony/developtools_hdc`
- source_base: `7a47ffb4b74b8b44ebf801c98e352e020427ce06`
- source_head: `fe699bdfdced1cc08128737790a49b4fb76e3f96`
- source_commits: `276162dd5159c2a7aae81c96f0c39e27d752428c`, `fe699bdfdced1cc08128737790a49b4fb76e3f96`
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
  - `workflow/apply-report.md` : `50c3fbc1cfab1f6b80abb9a80f3a739c5695acf25179896b083b76f808843907`
  - `workflow/todo.md` : `936333a21e59ebc9ca091d235e8b85c7d1932ed1c960ff041779235bf4bf37e1`

## PAIR VALIDATION — PASS

- command: `powershell -ExecutionPolicy Bypass -File workflow/validate-change.ps1 -ChangeDir workflow`
- result: 16/16 features covered；42/42 F/TC pairs verified。
- validator:
  - `workflow/validate-change.ps1` : `18a3be0ee47f6a5b535762b79df628052673cc5e8965f807e0954f40a9960b5e`

## 人读归档

- `README.md` : `f2d25054f6696888a5a1485db81773d65a6e445e1035fb7debae4ae13281aed2`
- `AR_design.md` : `067074d5981667ca11aaf1ba2db2f306e37935aa12a32c37acd8e9f686b1f965`
- `ar.md` : `8d75aa8fa9c063fc48b83dbf3f7ec60a111e21e658a2df097101e519288e85d6`
- `todo.md` : `936333a21e59ebc9ca091d235e8b85c7d1932ed1c960ff041779235bf4bf37e1`
- `reports/summary.md` : `046899d96d90d1b1bdc17e5226b3f89c3e00e712d99bec8a89bd2f31524282bb`
- `reports/quality.md` : `aa0d0c2773d6031cdc8c6af23460df072569bf4dba2b8434d604a4a112b3ce71`
- `reports/pr_description.md` : `f414daacc9873904ebbe4aafaf44c7ac48a80a8536fa54e1af1869d599cb3e30`

## 外部验证锚点

- HDC source head: `fe699bdfdced1cc08128737790a49b4fb76e3f96`
- first-stage DCP runlist: `6a9270b764650f998b565dc9`
- first-stage PR labels: `dco检查成功`, `编译成功`; addendum CI retriggered for new head
- mapper/catalog/instance tests: `23/23 Pass`
- session lifecycle tests: `2/2 Pass`
- mapper executable lines: `274/274 (100%)`
- Windows `hdc.exe`: `e9c04fe0159403e8a2915ddb4bc4c181252be9b6c22d7fb2aeb7207b602963b5`
- Windows `libusb_shared.dll`: `6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26`

## 脱敏说明

未归档 GitCode token、DCP token、设备序列号、用户凭据、原始流水线响应或运行时私有路径。代码提交、PR、Issue 和公开门禁运行编号保留用于交叉复核。
