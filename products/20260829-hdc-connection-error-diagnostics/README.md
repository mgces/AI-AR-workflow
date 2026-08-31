# HDC 连接错误诊断 AR 产物复核说明

本目录归档 `20260829-requirement-add-hdc-connection-error-diagnostics` 的 AR Workflow 产物。内容已脱敏，不包含访问令牌、设备序列号、个人路径日志或原始 CI 凭据。

| 项目 | 内容 |
|---|---|
| 工作流 | standalone `AR-Workflow` |
| 阶段 | REQUIREMENT_CLARIFYING → ARCHITECTURE_DESIGNING → TESTCASE_DESIGNING → DEVELOPING |
| 状态 | Completed |
| 功能点 | F-001～F-016，共 16 项 |
| 追踪关系 | 42 组 F/TC pair |
| HDC 源分支 | `feat/connection-error-diagnostics` |
| HDC 提交 | `276162dd5159c2a7aae81c96f0c39e27d752428c`、`fe699bdfdced1cc08128737790a49b4fb76e3f96`、`2841ecd39bfe623466ce9b6019c241c106675d16` |
| 上游 PR | [openharmony/developtools_hdc !2514](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514) |
| 关联 Issue | [openharmony/developtools_hdc #1955](https://gitcode.com/openharmony/developtools_hdc/issues/1955) |

## 目录说明

- `AR_design.md`：架构设计归档，包含系统上下文、模块边界、数据模型、映射接口、数据流和回滚设计。
- `ar.md`：需求规格归档，包含 F-001～F-016、边界条件、非功能需求和依赖。
- `workflow/`：独立 AR Workflow 的 8 份必备原始产物及复核脚本。
- `manifest_summary.md`：脱敏文件清单、SHA-256 和阶段结论。
- `reports/summary.md`：实现、验证和上库结果汇总。
- `reports/quality.md`：测试覆盖、跨平台构建、门禁和残余风险。
- `reports/pr_description.md`：上游 PR 的人读摘要。

## 独立复核

在本目录执行：

```powershell
powershell -ExecutionPolicy Bypass `
  -File workflow/validate-change.ps1 `
  -ChangeDir workflow
```

预期结果：

```text
Validation passed.
Features covered: F-001 ... F-016
Feature-test pairs verified: 42
```

本归档采用 standalone AR Workflow 的 F/TC 对级校验，不声称具备目标仓库另一套 P0～P8 流水线的 HMAC 证据链。实现和 CI 结果通过提交 SHA、PR、门禁运行编号及本目录哈希进行复核。

本次补充专门覆盖“已有 server 在非默认端口、client 请求默认 8710”的实例冲突：只追加 `E002116/E002117`，不修改既有错误码规格。Windows 测试产物位于 `E:\temp\hdc.exe`，SHA-256 为 `bf7263ce51ce40efb901b99489b82284b10ac330e466ce32d1d3003df9446056`。
