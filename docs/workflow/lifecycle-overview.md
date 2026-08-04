# 生命周期总览

> 把根 README 的流程图重构成更适合官网展示的页面:一张总图 + 每个阶段一句话定义 + 输入/产物/是否停下人工确认。

## 一张总图

```
AR → [P0 环境] → [P1 设计] →consent→ [P2 开发] → [P3 测试开发] → [P4 编译] → [P5 单元测试] → [P6 端到端] →consent→ [P7 质量] →consent→ [P8 上库] →consent→ ✅
                                                                                                         │
                       └ 任一阶段发现要改功能代码 ── reset ── 打回 P1 重走(功能指纹漂移会被拒) ──────────────────────┘
```

## 每个阶段一句话定义

| 阶段 | 物理 phase | 一句话定义 | 主门控 |
|---|---:|---|---|
| P0 环境预检 | 0 | 校验 build/compile/git/testfwk/hdc/真机全部就绪 | `gate_env_init.py` |
| P1 设计固化 | 1 | 校验 AR_design.md 6 章节 + ar-contract 契约并签名 | `gate_design.py` |
| P2 代码开发 | 2 | 强制依赖签名设计 + consent + diff 非空 + C++ 门控;闭合锁功能指纹 | `gate_develop.py` |
| P3 测试开发 | 3 | 编译前测试代码已写(契约每个 gtest suite 出现在新测试文件) | `gate_test_develop.py` |
| P4 编译 | 4 | build.sh exit0 + 成功横幅 + build_artifacts 覆盖 | `gate_build.py` |
| P5 单元测试 | 5 | developer_test 报告 tests>0 且 fail==0 err==0 + 每个 gtest 通过 | `gate_test_ut.py` |
| P6 端到端功能测试 | 6 | 部署 sha256 一致 + hilog 含 nonce/marker + 抗伪造三层证明 | `gate_device_func.py` |
| P7 质量验证 | 7 | 功能 summary + 覆盖率/性能/功耗/稳定性 + review==0 | `gate_integration.py` |
| P8 上库 | 8 | 本地自检零问题 + commit + push + PR + PR review 零问题 + CI 绿 | `gate_upload_ci.py` |

## 每个阶段的输入、产物、是否停下人工确认

### P0 环境预检
- **输入**:OHOS 仓根、组件子仓路径、build_target、testpart、真机
- **产物**:`evidence/phase0/env.json`(含探测到的设备序列号)
- **停下**:否,自动推进

### P1 设计固化
- **输入**:已澄清的 AR 原文、kb_search 检索的 design_refs.md(advisory)
- **产物**:`AR_design.md`(6 章节 + ar-contract 契约块)、`design_check.txt`
- **停下**:**是**,等人工 consent 设计契约

### P2 代码开发
- **输入**:签名 AR_design、P1 consent
- **产物**:`diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt`
- **停下**:否,自动推进;闭合时锁定功能指纹

### P3 测试开发
- **输入**:签名 AR_design 契约的 test_cases[].gtest
- **产物**:`new_test_files.txt`、`authorship_coverage.txt`、`authored/*` 签名快照
- **停下**:否,自动推进

### P4 编译
- **输入**:build_target、build_artifacts 契约
- **产物**:`build_tail.log`、`build_banner.txt`、`artifact_check.txt`
- **停下**:否,自动推进

### P5 单元测试
- **输入**:test_target、suite、part
- **产物**:`summary_report.xml`、`result_*.xml`、`gtest_coverage.txt`
- **停下**:否,自动推进

### P6 端到端功能测试
- **输入**:deploy-script、scenario-script、host/device-artifact、marker
- **产物**:`hilog_capture.txt`、`device_cmds.txt`、`artifact_runtime_proof.txt`、`reports/device_functional.md`
- **停下**:**是**,等人工核对真机真实结果并 consent

### P7 质量验证
- **输入**:coverage/performance/power/stability report、code-review report
- **产物**:`reports/quality.md`(六段聚合含 review)
- **停下**:**是**,等人工核对质量/review 并 consent

### P8 上库
- **输入**:repo-slug、branch、issue、local-review-report、pr-review-report
- **产物**:`full_diff.patch`、`pr.json`、`ci_status.json`、`reports/summary.md`、`pr_description.md`
- **停下**:**是**,等人工确认上库(唯一不可逆)并 consent

## 延伸阅读

- [Consent 与 Reset](/workflow/consent-and-reset) — 为什么 P1/P4/P5/P6 要人工确认
- [Evidence 与 Gates](/workflow/evidence-and-gates) — 门控契约与防伪协议
- [新增功能端到端示例](/examples/new-feature-end-to-end) — 完整路线演示
