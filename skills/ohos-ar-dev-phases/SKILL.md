---
name: ohos-ar-dev-phases
description: >
  OHOS 生命周期流水线各阶段的"做事"说明与门控用法(被 ohos-ar-dev-workflow 调度)。
  含 P1 开发 / P2 编译 / P3 测试 / P4 真机 / P5 质量验证 / P6 上库 的执行细节、调用的现有
  ohos-* 能力技能、对应 gate_*.py 命令与通过条件。一般不单独触发,由编排器加载。
---

# 生命周期阶段(做事 + 门控)

承重核心在 `scripts/`:`gate_*.py`(唯一 PASS 来源)、`advance.py`(唯一状态写入器)、
`lib/gatelib.py`(签名账本)、`lib/device.sh`(hdc-over-WSL helper)。

## 公共约定

- 统一变量:`PDIR=specs/pipeline/<run>`,`S=~/.claude/skills/ohos-ar-dev-phases/scripts`。
- 每阶段三步,**不可省第 2、3 步**:
  1. 用本阶段命名的 ohos-* 技能做事(写代码 / 生成测试 / 部署 / 建 PR)。
  2. `python3 $S/gate_<phase>.py --pipeline-dir "$PDIR" [参数]` —— 跑真实动作、产签名证据。
  3. 门控 PASS 后 `python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase N`。
- 门控 FAIL:读 `$PDIR/evidence/phaseN/` 真实日志定位,修复后重跑门控(≤3 次),仍失败停下报告。
- 任何阶段都不得用文字"宣布通过";`advance.py` 不认文字,只认签名证据。

各阶段详情见 `phase1-develop.md` … `phase6-upload-review.md`。

## 关键约定(四轮增强)

- **P1 双子门控(阶段号仍 1)**:先 `gate_design.py` 校验 `AR_design.md` 6 必含章节 **+ 内嵌
  ```ar-contract``` JSON 契约块**(`build_artifacts`/`test_cases`/`device_cases` 三非空数组)并签名,
  再由**人工 consent**(`advance.py consent --phase 1`,绑定签名设计、重跑即作废)放行,
  然后 `gate_develop.py`(强制依赖签名 AR_design + P1 consent)。后续阶段依据签名 AR_design 与其契约
  构建开发/测试/真机用例:**P2 校验 `build_artifacts` 全部编译进产物、P3 校验每个 `test_cases[].gtest`
  通过、P4 校验每个 `device_cases[].marker` 命中**,缺任一即 FAIL(全量覆盖硬门控)。
  写码可用 `ohos-code-skeletons` 取插件/测试骨架填充 AR_design「完整代码框架」并加速 P1b。
- **指纹分层**:P1 锁**功能指纹**(仅非测试路径内容)。P2–P6 功能内容漂移即拒绝;**P3/P4/P5 只允许
  新增独立测试文件**(test 路径),改功能代码/配置或新增功能文件会被 `advance` 拒绝,须 `reset` 回 P1。
- **证据/报告分离**:`evidence/`(机器,HMAC 链签名,gitignore)‖ `reports/`(人读 HTML,脱敏可归档)。
  P4/P5/P6 PASS 后编排器跑 `render_report.py --kind device|quality|summary` 渲染;P6 的 `pr_description.md`
  由 `gate_upload_ci` 注入 PR。渲染是编排器动作,不影响门控 verdict。
- **todo 刷新**:每轮循环开头 `refresh_todo.py` 依 AR_design 重写 `todo.md`,再与 `TodoWrite` 对齐。
