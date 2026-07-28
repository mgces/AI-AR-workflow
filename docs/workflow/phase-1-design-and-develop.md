# P1 设计与开发

> 这是整条流水线最重要页面之一。本页拆解 P1a 设计固化、P1 consent、P1b 代码开发,以及 AR_design.md 与 ar-contract 是什么。

## 阶段拆解

P1 在物理层面是两个独立签名阶段(phase1 设计 + phase2 开发),逻辑上合称"设计与开发":

### P1a 设计固化(物理 phase 1)

设计前编排器先用 `kb_search.py` 检索知识库生成 `design_refs.md`(advisory,失败不阻断),然后写 `AR_design.md`——必须含 **6 必含章节** + 内嵌 ```ar-contract``` JSON 契约块。

跑 `gate_design.py`(emit 1)校验:
- 6 必含章节齐全
- ar-contract 三非空数组(`build_artifacts` / `test_cases` / `device_cases`)
- v2 �契约拒 TODO/TBD 占位 + 需求/文件/测试/设备引用闭环
- 并签名

通过后**不自动写码**——停下等人工 consent。

### P1 consent(人工确认点)

用户复核签名 AR_design 与编译路径后:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 1 --token <你的确认令牌>
```

该 consent **绑定签名设计条目**,重跑 `gate_design` 会作废旧 consent。consent 不在 `advance --phase 1` 处校验,而是在 **P2 `gate_develop.py` 内**强校验——没签字 P2 开发门直接 FAIL。

### P1b 代码开发(物理 phase 2)

调用能力技能写代码:`ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `tdd-enforcer` / `ohos-code-skeletons`。

跑 `gate_develop.py`(emit 2)校验:
- 已有签名 AR_design **且** 已有绑定的 P1 consent
- 相对 `base_commit` 有 tracked/untracked 改动
- C/C++ 格式 guard + 强规则检查通过

闭合时**锁定功能指纹**(仅非测试路径内容,相对 base、commit 无关)。

## AR_design.md 与 ar-contract 是什么

`AR_design.md` 是 P1 固化的设计文档,**6 必含章节**:

1. 目标组件
2. 功能需求
3. 完整代码框架
4. 完整测试框架
5. 需测试功能点
6. 真机用例构造

内嵌的 ```ar-contract``` 是 JSON 契约块,三个非空数组:

```json
```ar-contract
{
  "build_artifacts": ["<GN 构建目标路径>"],
  "test_cases": [{"gtest": "<suite.name>", "aspect": "..."}],
  "device_cases": [{"marker": "<标记字符串>", "process": "...", "artifact_loaded": "..."}]
}
```
```

后续所有阶段全量覆盖硬门控都依这个契约:P3 编写覆盖每个 `test_cases[].gtest`、P4 编译覆盖每个 `build_artifacts`、P5 执行通过每个 `test_cases[].gtest`、P6/P7 命中每个 `device_cases[].marker`。

## 为什么后续都依赖签名设计

- P2 开发门强制校验"已有签名 AR_design + P1 consent"才允许写码通过
- P3~P7 的全量覆盖硬门控依契约三数组
- 契约 absent(legacy)→ bypass 降级留痕;契约 tampered → FAIL-closed
- 改功能代码必须 reset 回 P1 重走,重跑 `gate_design` 会重新签名并作废旧 consent

## 哪些 skill 常参与 P1

| skill | 作用 |
|---|---|
| `ohos-ar-dev-workflow` | 编排器,调度设计与开发 |
| `ohos-dev-sa-codegen` | SA 代码生成 |
| `ohos-dev-napi-module` | NAPI 模块生成 |
| `code-ruleset-style-check` | C/C++ 格式与强规则门控 |
| `tdd-enforcer` | TDD 约束 |
| `ohos-code-skeletons` | 写码脚手架(插件/单测/模块测试/模糊测试占位符骨架) |

## 常见误区

- **以为 gate_design PASS 就能开始写码**:不能。必须先人工 consent,P2 门内才放行
- **想跳过设计直接开发**:不行。P2 强制依赖签名 AR_design + P1 consent
- **改了 AR_design 不重跑 gate_design**:旧 consent 会绑定旧签名条目,重跑 gate_design 即作废

## 延伸阅读

- [门控契约](/reference/gate-contract) — gate_design / gate_develop 的契约细节
- [状态机](/reference/workflow-state-machine) — consent / reset 的状态流转
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 A 新增功能的 skill 组合
