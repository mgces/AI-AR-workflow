# 案例：弱模型优化

> 面向弱模型的控制层与失败三分回路——来自 `products/20260723-weak-model-optimization/`。

## 背景

OHOS 生命周期流水线原本设计为强模型（如 Claude Opus）能稳定跑完整条链。但中等能力模型（如 `minimax2.7`/`glm5.1`）在长链条中容易：

- 跑着跑着忘上下文
- 失败后盲目重试或放弃
- 不知道当前阶段该做什么、不该做什么
- 不会主动调用控制层各包

需要在不改动真相层（门控脚本 + 签名证据）的前提下，叠加一层 machine-readable 的执行控制/窗口隔离/失败恢复协议。

## 目标

为弱模型设计并实现控制层，使其也能稳定跑完整条 P0~P8 链条。

## 方案

### 设计与置信度评估

详见 `products/20260723-weak-model-optimization/`：

- `weak_model_optimization_design_spec.md` — 设计规格
- `confidence_assessment.md` — 置信度评估
- `implementation_mapping_plan.md` — 实现映射计划
- `stage_packet_templates.md` — Stage Packet 模板

### 流程使用情况

这是一个方法论沉淀 + 控制层实现任务：

| 产物 | 作用 |
|---|---|
| `weak_model_optimization_design_spec.md` | 设计规格：控制层各包定义 |
| `confidence_assessment.md` | 置信度评估：弱模型在各阶段的可靠性 |
| `implementation_mapping_plan.md` | 实现映射：设计到代码的对应 |
| `stage_packet_templates.md` | Stage Packet 模板：每逻辑阶段的执行入口 |

### 核心设计

**逻辑阶段 P0–P8 与物理 phase 一一对应**（共 9 个，phase0–8）：

| 逻辑阶段 | 物理 phase | 主门控 |
|---|---:|---|
| P0 bootstrap | 0 | gate_env_init.py |
| P1 design-orchestrate | 1 | gate_design.py |
| P2 feature-develop | 2 | gate_develop.py |
| P3 test-develop | 3 | gate_test_develop.py |
| P4 build-verify | 4 | gate_build.py |
| P5 test-author | 5 | gate_test_ut.py |
| P6 device-functional | 6 | gate_device_func.py |
| P7 quality-verify | 7 | gate_integration.py |
| P8 upload-review | 8 | gate_upload_ci.py |

### 控制包家族

全部落 `controls/`，best-effort，非放行依据：

- **Stage Packet** — 每逻辑阶段唯一执行入口（目标/准入/退出/allowed/forbidden/failure classes）
- **Handoff Packet** — 阶段→下一阶段的事实摘要
- **Repair Packet** — 修复窗口最小连续上下文
- **Phase Memory Card** — 5~10 条最重要事实，新窗口先读
- **Completion Receipt** — 极短退出凭据
- **Development Bundle** — P1 派生、P2 冻结的开发交付单元
- **artifact/evidence/report 三类索引** — 避免在目录里迷路

### 失败三分回路

`Retry`（同阶段重试，不动 bundle）/ `Repair`（新窗口修复，bundle revision 升级，声明 `downstream_revalidate_scope`）/ `Regenerate`（越设计边界 → 回 P1/P2/P3 重派生）。

双熔断 `MAX_RETRY_ROUNDS`/`MAX_REPAIR_ROUNDS`（默认各 2）超预算即人工升级；`external_api_unstable`（外部 API/网络瞬时不可用）与真红 CI 区分后直接升级人工。

## 经验

- **控制层是 best-effort 不是放行依据**：控制 JSON 永远不是第二真相源，`pipeline.json` 唯一写入者仍是 `advance.py`
- **窗口隔离减少上下文丢失**：新窗口按 `window_startup_order()` 先读 Phase Memory Card，恢复关键事实
- **失败三分回路避免盲目重试**：Retry/Repair/Regenerate 有明确边界，双熔断保护不空转
- **外部瞬时不可用与真红区分**：`external_api_unstable` 直接升级人工，不浪费 repair 轮次

## 产物

- `products/20260723-weak-model-optimization/README.md`
- `products/20260723-weak-model-optimization/weak_model_optimization_design_spec.md`
- `products/20260723-weak-model-optimization/confidence_assessment.md`
- `products/20260723-weak-model-optimization/implementation_mapping_plan.md`
- `products/20260723-weak-model-optimization/stage_packet_templates.md`

## 延伸阅读

- [状态机](/reference/workflow-state-machine) — `next` 输出的 retry/repair/regenerate/escalate
- [run 目录结构](/reference/pipeline-layout) — controls/ 各包字段结构
- [门控契约](/reference/gate-contract) — 真相层不变式
