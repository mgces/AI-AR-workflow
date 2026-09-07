# DSH 实现对比验证记录

对应报告：[GitCode 与本地 DSH 实现对比及融合建议](../../docs/reference/dsh-implementation-comparison.md)。

本目录记录 2026-09-07 对 GitCode `415c57b` 与本地未提交 `dsh-workflow/` 的检查。未运行真实 OHOS 构建、真机测试或发布。

| 文件 | 内容 |
|---|---|
| `snapshots.json` | 远端提交、本地基线、本地实现文件 SHA256、运行时版本 |
| `local-tests-node24.log` | 本地原有 9 项测试，全部通过 |
| `remote-tests-node24.log` | 远端原有 56 项测试，全部通过；已启用 Python 集成测试 |
| `probes.mjs` | 对比用的合成复现脚本，只写临时目录 |
| `probe-results.json` | 额外验证的观察结果 |

复测原有测试时，进入各自 package 目录，在 Node.js 24 下执行：

```bash
# 本地 dsh-workflow/
node scripts/check.js
node --test --test-reporter=spec

# 远端 checkout 的 runtime/dsh-ohos/
OHOS_DSH_TEST_PYTHON=python3 node --test --test-reporter=spec
```

复现本报告的额外检查，在仓库根目录执行，第二个路径指向固定提交的独立远端 checkout：

```bash
node products/20260907-dsh-comparison/probes.mjs \
  /absolute/path/to/local-repo \
  /absolute/path/to/gitcode-checkout
```

此脚本会断言当前版本存在的行为，例如 `Not Ready` 证据仍能使本地 R5 前进。**退出成功表示复现成立，不表示实现符合正式业务要求。** 将来修复后，对应断言应失败；它不是业务验收测试。

P8 使用模拟预检输出的 Python 子进程，避免真实上库。远端过期租约检查仅模拟控制器时钟和两次领取，没有启动 worker。记录中的随机临时路径仅用于定位当次合成数据，不是业务输入。

初次沙箱内 stdio 测试失败，同代码在沙箱外通过；保存的两份正式测试日志来自 Node.js 24.20.0 的沙箱外统一复测。
