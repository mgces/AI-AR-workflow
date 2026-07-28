# 门控契约

> 提炼 `skills/ohos-ar-dev-workflow/references/gate-contract.md` 核心内容,不照搬原文。

## gate 不是建议,而是唯一 PASS 来源

每个阶段的门控脚本 `gate_*.py` 是该阶段是否通过的**唯一判定者**:

- 编排器没有权力宣布某阶段通过
- 模型的自由文本不能当作阶段结束
- `advance.py` 不认文字,只认签名证据

门控脚本自己解析真实证据(exit code / 日志横幅 / XML 属性 / nonce grep)给出 verdict(FAIL/PASS),并向 `evidence/manifest.jsonl` 追加一条 HMAC 签名记录。

## 各阶段门控

| 阶段 | 门控脚本 | emit | 通过条件摘要 |
|---|---|---:|---|
| P0 | `gate_env_init.py` | — | build/compile/git/testfwk/hdc/真机全就绪 |
| P1 | `gate_design.py` | 1 | AR_design.md 6 章节 + ar-contract 契约并签名 |
| P2 | `gate_develop.py` | 2 | 强制依赖签名 AR_design + P1 consent + diff 非空 + C++ 门控;闭合锁功能指纹 |
| P3 | `gate_test_develop.py` | 3 | 契约每个 test_cases[].gtest 的 suite 出现在新测试文件;测试源签名快照 |
| P4 | `gate_build.py` | 4 | build.sh exit0 + 成功横幅 + build_artifacts 覆盖 |
| P5 | `gate_test_ut.py` | 5 | developer_test 报告 tests>0 且 fail==0 err==0 + 每个 gtest 通过 |
| P6 | `gate_device_func.py` | 6 | 部署 sha256 一致 + hilog 含 nonce/marker + 抗伪造三层 + 每个 device_cases[].marker 命中 |
| P7 | `gate_integration.py` | 7 | 功能 summary + 覆盖率/性能/功耗/稳定性 + review==0 |
| P8 | `gate_upload_ci.py` | 8 | A 本地自检零问题 + B PR review 零问题 + PR + CI 绿(SHA 绑定) |

## 全量覆盖硬门控(依签名 AR_design 契约)

契约三数组驱动后续全量覆盖:

- **P3 编写覆盖**每个 `test_cases[].gtest`
- **P4 编译覆盖**每个 `build_artifacts`
- **P5 执行通过**每个 `test_cases[].gtest`
- **P6/P7 命中**每个 `device_cases[].marker`

缺任一即 FAIL。契约 absent(legacy)→ bypass 降级留痕;契约 tampered → FAIL-closed。

## 指纹分层

**P2(feature-develop)闭合时锁定功能指纹**:

- 仅非测试路径内容,相对 base,commit 无关
- `check_code_drift` 从 phase3 起生效:P3–P8 任一功能内容漂移即被 `advance` 拒绝
- `TEST_ONLY_PHASES=(3,5,6,7)`:P3/P5/P6/P7 只允许新增独立测试文件
- P8 的 `git commit -s` 不算漂移

## 两道 review 报告契约(P5/P8)

报告必须携带机器可读问题计数:

- JSON:`issue_count/finding_count/...==0` 或 `issues/findings/...` 空数组
- 文本:`review_issue_count=0`

gate 只在计数为 0 时放行;任一非零/缺失 → FAIL,改代码后 `reset` 回 P1 重走。

## 延伸阅读

- [Evidence 与 Gates](/workflow/evidence-and-gates) — 签名证据账本与防伪协议
- [状态机](/reference/workflow-state-machine) — advance/consent/reset 的状态流转
- [各阶段页](/workflow/) — 每阶段门控的详细说明
