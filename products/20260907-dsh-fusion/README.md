# DSH 融合增量验证 — 2026-09-07

基线：GitCode `415c57bfa3a9313a712253a665c82a1738c5e66c`。
开发分支：`codex/dsh-fusion-self-repair`；改动保留在工作区，未创建新的提交或推送。

- Node v24.20.0、Python 3.12.3：70/70 测试通过、无跳过，包含原 56 项回归和新增 14 项。
- VitePress 文档构建通过；有 bundle 大小提示，不影响构建结果。
- `git diff --check` 通过。
- 本地参考 `dsh-workflow/` 的 33 个文件与上一轮 SHA-256 快照一致。
- OHOS 源码只做读取；未执行真实构建或自动补丁。

本地完整日志：`node-tests.log`、`docs-build.log`（遵循仓库规则，日志不纳入 Git）。
可复现测试命令：在 `runtime/dsh-ohos` 使用 Node 24 执行 `OHOS_DSH_TEST_PYTHON=python3 node --test`。

这次交付仅覆盖 observe 路由、凭证释放式租约恢复、签名失败诊断及内部预算账本。
签名失败测试使用临时 Git 仓的合成记录，不能作为真实编译或自修复成功证据。
详细未完成项见 [实施状态](../../docs/reference/dsh-fusion-implementation-status.md)。
