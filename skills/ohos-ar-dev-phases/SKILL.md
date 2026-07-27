---
name: ohos-ar-dev-phases
description: >
  OHOS 生命周期流水线各阶段的"做事"说明与门控用法(被 ohos-ar-dev-workflow 调度)。
  含 P1 设计 / P2 开发 / P3 测试开发 / P4 编译 / P5 单测执行 / P6 真机 / P7 质量验证 / P8 上库
  的执行细节、调用的现有 ohos-* 能力技能、对应 gate_*.py 命令与通过条件。一般不单独触发,由编排器加载。
---

# 生命周期阶段(做事 + 门控)

承重核心在 `scripts/`:`gate_*.py`(唯一 PASS 来源)、`advance.py`(唯一状态写入器)、
`lib/gatelib.py`(签名账本)、`lib/device.sh`(hdc-over-WSL helper)。

## 公共约定

- 统一变量:`PDIR=specs/pipeline/<run>`,`AGENT_SKILLS_DIR=<Agent 技能根目录>`,`S=$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts`。
- 每阶段三步,**不可省第 2、3 步**:
  1. 用本阶段命名的 ohos-* 技能做事(写代码 / 生成测试 / 部署 / 建 PR)。
  2. `python3 $S/gate_<phase>.py --pipeline-dir "$PDIR" [参数]` —— 跑真实动作、产签名证据。
  3. 门控 PASS 后 `python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase N`。
- 门控 FAIL:读 `$PDIR/evidence/phaseN/` 真实日志定位,修复后重跑门控(≤3 次),仍失败停下报告。
- 任何阶段都不得用文字"宣布通过";`advance.py` 不认文字,只认签名证据。

各阶段详情见 `phase1-design.md` … `phase8-upload-review.md`(物理 phase 1–8;phase0 是 bootstrap 预检,无独立文档)。

## 关键约定(九物理阶段)

- **物理阶段 1:1 逻辑阶段**:phase0 bootstrap 预检、phase1 设计固化(design)、phase2 代码开发
  (develop)、phase3 测试开发(test-develop)、phase4 编译(build)、phase5 单测执行(test-author)、
  phase6 真机(device)、phase7 质量验证(quality)、phase8 上库(upload)。每个物理阶段一个签名闭合门,
  `advance --phase N` 只认该阶段最后一条 manifest PASS。
- **P1 设计 + consent(phase1)**:`gate_design.py`(`emit(phase 1)`)校验 `AR_design.md` 6 必含章节
  **+ 内嵌 ```ar-contract``` JSON 契约块**(`build_artifacts`/`test_cases`/`device_cases` 三非空数组)
  并签名;放行 P1 后需**人工 consent**(`advance.py consent --phase 1`,绑定签名设计条目、重跑即作废)。
  该 consent 不在 `advance --phase 1` 处校验,而是在 **P2 `gate_develop.py` 内**强校验(绑 phase1 设计条目):
  没有签名 AR_design 或缺 P1 consent,P2 开发门直接 FAIL。写码可用 `ohos-code-skeletons` 取插件/测试骨架
  填充 AR_design「完整代码框架」。
- **Finding 1:编译前测试代码已写(phase3)**:`gate_test_develop.py`(`emit(phase 3)`)是"先写完功能+测试
  代码再编译"的**真签名门**——不闭合 phase3 就到不了 phase4(build)。它证明测试**编写**(契约每个
  `test_cases[].gtest` 的 suite 出现在**新测试文件**里),测试**执行**留到 phase5(`gate_test_ut.py`)。
- **全量覆盖硬门控**(依签名 AR_design 契约):**P3 编写覆盖每个 `test_cases[].gtest`、P4 编译覆盖每个
  `build_artifacts`、P5 执行通过每个 `test_cases[].gtest`、P6/P7 命中每个 `device_cases[].marker`**,
  缺任一即 FAIL。契约 absent(legacy)→ bypass 降级留痕;契约 tampered → FAIL-closed。
- **指纹分层**:**P2(feature-develop)闭合时锁定功能指纹**(仅非测试路径内容,相对 base、commit 无关)。
  `check_code_drift` 从 **phase3 起**生效:P3–P8 任一功能内容漂移即被 `advance` 拒绝。**P3/P5/P6/P7 只允许
  新增独立测试文件**(`TEST_ONLY_PHASES=(3,5,6,7)`;build_verify(4) 不在此列);出现非测试新增路径或改功能
  代码/配置会被拒绝,须 `reset` 回 P1 重走。
- **证据/报告分离**:`evidence/`(机器,HMAC 链签名,gitignore)‖ `reports/`(人读 Markdown,脱敏可归档)。
  P6/P7/P8 PASS 后编排器跑 `render_report.py --kind device|quality|summary` 渲染,各产**单个**
  聚合 `.md`(`device_functional.md`/`quality.md`/`summary.md`);P8 的 `pr_description.md`
  由 `gate_upload_ci` 注入 PR。渲染是编排器动作,不影响门控 verdict。
- **todo 刷新**:每轮循环开头 `refresh_todo.py` 依 AR_design 重写 `todo.md`,再与 `TodoWrite` 对齐。
