# 本产物如何使用

本目录保存的是 **AI-AR-workflow 弱模型适配与实施设计文档集**，用于后续实施，不是一次流水线 run-state 的证据归档。

## 文件说明

- `weak_model_optimization_design_spec.md`
  - 主设计文档
  - 定义逻辑阶段 `P0 ~ P8`、窗口隔离、bundle、repair/regenerate、P7/P8 子阶段等总体方案

- `stage_packet_templates.md`
  - 阶段执行协议模板文档
  - 定义 stage packet、handoff packet、repair packet、phase memory card、completion receipt 及各阶段增强字段

- `implementation_mapping_plan.md`
  - 实施映射文档
  - 说明如何把新逻辑阶段映射到当前仓库已有 `phase0 ~ phase6` 和现有 gate 脚本，而不是推翻重来

- `confidence_assessment.md`
  - 弱模型执行置信度评估文档
  - 评估 `minimax2.7`、`glm5.1` 这类模型在当前设计完成、以及关键协议实施完成后的现实独立完成率区间

## 建议阅读顺序

建议开始实施前按以下顺序阅读：

1. `weak_model_optimization_design_spec.md`
   - 先理解总体目标、逻辑阶段重排和 80%+ 置信度所需硬约束
2. `stage_packet_templates.md`
   - 再看每阶段到底要落哪些 packet / card / receipt / repair 字段
3. `implementation_mapping_plan.md`
   - 最后看如何映射到当前仓库已有 phase / gate / advance.py / gatelib.py
4. `confidence_assessment.md`
   - 用于判断实施优先级和预期收益，明确 80%+ 与逼近 90% 的成立前提

## 当前状态

- 本目录内容已从“纯设计蓝图”进入“设计 + 落地对齐”阶段：
  - 主设计
  - 协议模板
  - 实施映射
  - 置信度评估
- 当前仓库已落地的关键能力包括：
  - `advance.py` 的 logical phase / action kind / control refs 导航层投影
  - `prepare_test_bundle.py` 与 phase1 `test-develop` bundle / handoff / receipt 协议
  - 现有物理 phase2~phase6（`gate_build.py`、`gate_test_ut.py`、`gate_device_func.py`、`gate_integration.py`、`gate_upload_ci.py`）统一的 `phase_summary.json` / `failure_report.json`
  - repair continuity 已贯通到当前后段 gate，包含 `bundle_revision_from`、`suspect_files`、`suspect_tests`、`downstream_revalidate_scope`、repair/retry 计数与人工升级
  - P6/P7/P8 对应脚本（当前物理 `phase4/5/6`）已经具备 completion receipt / handoff 或 final receipt 产物
  - P7 / P8 的细粒度 substate 状态机（`controls/quality_verify/substate.json`、`controls/upload_review/substate.json`）
  - packet / memory card / index 的 machine-readable 化：`scripts/schemas/` 下 6 份 draft-07 JSON Schema，配合 `gatelib.validate_control_payload()`（有 `jsonschema` 用之，无则退化为内置结构校验，**依赖可选**）
  - §9.1 typed packet helper 与 §9.2 repair/regenerate 决策 helper 已在 `gatelib.py` 收敛，所有 gate 与 `advance.py` 统一走这层写入
  - 每个 gate 在 PASS/FAIL 两侧都会落 `controls/memory_cards/phase<N>.json`
  - P1 `gate_design.py` 由 signed contract 派生 design index / stage packet index / initial bundle / handoff / receipt
  - P2 `gate_develop.py` 落 P2→P3 handoff，P4 `gate_build.py` 落 completion receipt + P5 handoff
  - P6 device 证据信任顺序（§17）以 `controls/device_functional/evidence_index.json` 显式落盘
- 放行真相层仍以 signed evidence / consent / `advance.py` 为准，这些文档不构成第二真相源
- 控制层（`controls/**`、`phase_summary.json`、`failure_report.json`、所有 packet）全部是 best-effort 写入：
  写失败或 schema 校验不通过都**不会**改变任何 gate 的判定结果
