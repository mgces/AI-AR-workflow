# 需求分析与设计工作流到 AR 交接

## 交接边界

需求分析与设计工作流（Requirement workflow）的最后一步产出 `AR.md`。该文件是需求基线，不是开发设计，也不是需求开发工作流的 PASS 证据。

```text
Requirement Gate / IR / SR
        │
        └── AR.md          # 需求输入
              │
              └── 需求开发工作流 P0
                    └── P1: AR_design.md + ar-contract  # 开发契约
```

## AR.md 应包含

- RR/Feature ID 和 01-05、IR、SR、handoff 溯源路径。
- 已评审的目标、非目标、FR/NFR 和 AC。
- 已选方案、proposal/SR 边界和 Owner。
- 尚未关闭的 condition、observation 和 risk。
- 候选仓库/模块及当前源码重新验证要求。

AR.md 不应包含或声称：

- P0-P8 已初始化或已通过。
- Requirement Gate 可以代替 `gate_design.py`。
- 尚未在当前源码验证的文件、API 和 GN target 是确定事实。
- 未经需求分析与设计工作流评审的新需求范围。

## 交接到需求开发工作流

```text
/ohos-ar-dev-workflow /absolute/path/to/AR.md
```

需求开发工作流将它复制为本次 run 的 `ar.md`，执行环境确认、P0 预检和 P1-P8。

P1 会使用知识库再次缩小定位范围，然后读取当前源码、`bundle.json`、`BUILD.gn`、接口、
测试和运行配置，最终生成可签名的 `AR_design.md` 和 `ar-contract`。
