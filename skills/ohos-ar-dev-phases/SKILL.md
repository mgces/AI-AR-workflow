---
name: ohos-ar-dev-phases
description: >
  OHOS 生命周期流水线各阶段的"做事"说明与门控用法(被 ohos-ar-dev-workflow 调度)。
  含 P1 开发 / P2 编译 / P3 测试 / P4 真机 / P5 集成 / P6 上库 的执行细节、调用的现有
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
