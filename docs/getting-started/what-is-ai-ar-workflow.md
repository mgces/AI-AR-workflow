# 什么是 AI-AR Workflow

## 一句话定义

AI-AR Workflow 是一套**面向 OpenHarmony 研发的证据门控开发流水线**:从已澄清的 AR 出发,自动推进设计、开发、编译、测试、真机验证、质量验证与上库,每阶段由确定性门控脚本基于真实证据判定是否通过。

## 为什么不是普通 prompt

普通 prompt 让模型"自由回答"完成情况,没有可验证的边界。本 workflow 明确:

> 模型的自由文本**不能当作阶段通过**。放行权只在物理 phase 的签名证据 + `advance.py`。

## 为什么不是纯脚本系统

纯脚本系统只能跑单步检查,无法端到端编排"做事 → 跑门控 → 推进"的闭环。本 workflow 采用三层设计:

1. **thin 入口**(`ohos-ar-dev-workflow`):路由 / init / 调度 / 断点恢复
2. **thick 阶段 skill**(`ohos-ar-dev-phases`):每阶段做事说明 + 承重门控脚本
3. **被调用的能力技能**:构建诊断、单测生成、真机 hdc、刷机、PR review 等

## 为什么强调 evidence gate

证据门控是整套系统的防伪核心:

- **单一写入器**:只有 `advance.py` 能写 `pipeline.json` 的阶段状态,模型没有任何工具能直接改它
- **签名证据账本**:每个门控脚本把真实证据落盘,并向 `evidence/manifest.jsonl` 追加 HMAC 签名记录(含每个产物的 sha256),形成哈希链
- **推进充要条件**:推进 N→N+1 时校验哈希链完整 + 该阶段最后一条记录 `verdict=PASS` + HMAC 有效 + 产物当前 sha256 仍匹配

详见 [Evidence 与 Gates](/workflow/evidence-and-gates)。

## 为什么适合 OHOS 研发

OHOS 仓是 repo 多仓树,组件子目录才是 git 仓,构建依赖 `build.sh` + GN + ninja + ccache,真机依赖 hdc + hilog,测试依赖 developer_test + gtest/xdevice。本 workflow 的门控脚本原生对接这套工具链,并自动探测设备序列号、WSL 桥接、gitcode CLI,不写死任何机器特定值。

## 延伸阅读

- [5 分钟快速开始](/getting-started/quick-start)
- [生命周期总览](/workflow/lifecycle-overview)
- [设计范式:thin 入口 + thick 阶段 + 门控](/skill-playbooks/workflow-orchestration)
