# 开发 Workflow

> 这是整个站点的中心栏目——把抽象文档变成"能模仿"的端到端流程。

## 完整生命周期图

```
已澄清的 AR ───────▶ ohos-ar-dev-workflow(编排器 / 唯一大脑)
                      每轮循环:refresh_todo → 做事 → 跑门控 → advance
                              │
   ┌──────────────────────────┼──────────────────────────────────────────┐
   │  P0 环境预检  gate_env_init.py                                                        │
   │      build/compile/git/testfwk/hdc/真机 全就绪 ── PASS ──▶ advance --phase 0       │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P1 设计固化 gate_design.py ── AR_design.md 6 必含章节 + ar-contract 契约块,签名 ──┐
   │      PASS 后停下等人工 consent(P2 门内校验)                                       │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P2 代码开发 gate_develop.py ── 强制依赖签名 AR_design + P1 consent + diff 非空 ──┐
   │      + C++ 强门控 ── PASS ──▶ advance --phase 2 ── 闭合时锁定功能指纹              │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P3 测试开发 gate_test_develop.py ── 编译前测试代码已写 ──────────────────────────┐
   │      契约每个 test_cases[].gtest 的 suite 出现在新测试文件;测试源签名快照         │
   │      PASS ──▶ advance --phase 3 ─▶ 才到 build                                       │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P4 编译 gate_build.py ── build.sh exit0 + 成功横幅 + build_artifacts 覆盖 ────────┐
   │      PASS ──▶ advance --phase 4                                                     │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P5 单测执行 gate_test_ut.py ── 编测试目标 + 本次新建报告 + tests>0,fail==0,err==0 ─┐
   │      + 契约每个 test_cases[].gtest 通过(执行覆盖)                                  │
   │      PASS ──▶ advance --phase 5                                                     │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P6 真机 gate_device_func.py ── 部署 sha256 一致 + hilog 含 nonce/marker/e2e + ────┐
   │      uptime 单调 ── 证据 PASS ──▶【停:人工核对真机结果】── consent ──▶ advance       │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P7 质量 gate_integration.py ── 功能 summary + 覆盖率/性能/功耗/稳定性 + review==0 ┐
   │      ── 证据 PASS ──▶【停:人工核对质量/review】── consent ──▶ advance               │
   └──────────────────────────┼───────────────────────────────────────────┘
                              ▼
   ┌── P8 上库 gate_upload_ci.py ──────────────────────────────────────────────────────────┐
   │   A 本地自检==0 → git commit -s(DCO) → push → 建 issue 绑定 PR                       │
   │   → B PR review==0 → CI overall∈{success,passed} + PR head SHA==push SHA             │
   │   证据 PASS ──▶【停:人工确认上库(唯一不可逆)】── consent ──▶ advance ── 完成 ✅      │
   └──────────────────────────┼───────────────────────────────────────────┘
   ▲ 任一阶段发现要改功能代码 → advance.py reset --reason "…" ── 打回 P1 重走(功能指纹漂移会强制拒绝)
``

## 9 个阶段(P0~P8)

本 workflow 采用 **9 个物理 phase(0–8)与逻辑阶段 1:1 对应**。本栏目按逻辑阶段 P0~P8 组织:

| 阶段 | 物理 phase | 主门控 | 做什么 |
|---|---:|---|---|
| [P0 环境预检](/workflow/phase-0-init) | 0 | `gate_env_init.py` | 校验工具链与真机就绪 |
| [P1 设计与开发](/workflow/phase-1-design-and-develop) | 1, 2 | `gate_design.py` + `gate_develop.py` | 设计固化 + 代码开发 |
| [P2 代码开发](/workflow/phase-2-build) | 2 | `gate_develop.py` | 按签名设计写代码;闭合锁功能指纹 |
| [P3 测试开发](/workflow/phase-3-test) | 3 | `gate_test_develop.py` | 测试开发(编写覆盖) |
| [P4 编译](/workflow/phase-4-build) | 4 | `gate_build.py` | 真实编译验证 |
| [P5 单测执行](/workflow/phase-5-test-ut) | 5 | `gate_test_ut.py` | 单测执行验证(执行覆盖) |
| [P6 真机功能](/workflow/phase-6-device) | 6 | `gate_device_func.py` | 真机功能验证(抗伪造三层) |
| [P7 质量验证](/workflow/phase-7-quality) | 7 | `gate_integration.py` | 覆盖率/性能/功耗/稳定性/review |
| [P8 上库](/workflow/phase-8-upload) | 8 | `gate_upload_ci.py` | commit → PR → CI |

## "做事"和"过 gate"是两层概念

每个阶段都明确区分:

- **做事**:由编排器调用对应 ohos-* 能力技能执行真实工作(写代码 / 生成测试 / 部署 / 建 PR)
- **过 gate**:跑该阶段的确定性门控脚本 `gate_*.py`,它自己解析真实证据给出 verdict
- **推进**:门控 PASS 后 `advance.py advance --phase N`,校验签名证据与产物 sha256

**门控脚本是唯一 PASS 来源**——编排器没有权力宣布某阶段通过,也不能手改 `pipeline.json`。

## consent / reset / verify-all

| 操作 | 作用 | 何时用 |
|---|---|---|
| `consent --phase N` | 人工签名确认,绑定当前 PASS 证据 | P1/P4/P5/P6 证据 PASS 后停下等你确认 |
| `reset --reason "…"` | 打回 P1 重走 | 任何阶段发现要改功能代码 |
| `verify-all` | 重校验已通过阶段 | 怀疑证据被篡改或代码漂移 |

详见 [Consent 与 Reset](/workflow/consent-and-reset) 与 [Evidence 与 Gates](/workflow/evidence-and-gates)。
