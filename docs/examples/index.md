# 示例

> 这一栏把抽象文档变成"能模仿"的内容——示例不是协议全文,而是典型工作流路径,用户可按场景选择阅读。

## 示例导航

| 示例 | 场景 | 适合谁 |
|---|---|---|
| [新增功能端到端](/examples/new-feature-end-to-end) | 从一个新 AR 到上库的完整路线 | 第一次看完整流程的人 |
| [改码回退重走](/examples/code-fix-and-rewalk) | 在 P3/P4/P5 发现功能问题,reset 回 P1 | 想理解为什么改码必须回 P1 |
| [只补测试](/examples/test-only-follow-up) | 只补测试不改功能代码 | 想理解何时允许不改功能继续 P3 |
| [真机验证示例](/examples/device-verification-example) | deploy/scenario/marker 思路 | 想理解真机阶段怎么跑 |
| [上库 CI 示例](/examples/upload-ci-example) | issue → dry run → local review → push → PR → CI | 想理解 P8 上库完整路径 |

## 这些示例不是协议全文

每个示例聚焦:

- 每一步用户做什么
- 每一步 workflow 做什么
- 每一步 gate 检查什么
- 何时停下人工确认

不照搬门控契约原文,而是按时间线串起来。

## 延伸阅读

- [开发 Workflow](/workflow/) — 各阶段的完整说明
- [Skill 组合拳](/skill-playbooks/common-combinations) — 典型场景的 skill 组合
- [FAQ](/reference/faq) — 高频误解速查
