# P2 代码开发

> 本页拆解 P2(物理 phase 2)的代码开发目标、依赖签名设计 + consent、改动非空、C++ 强门控、闭合锁功能指纹。

## 代码开发目标

P2 是代码开发阶段——按 P1 固化的签名 `AR_design.md` 写真实代码,跑 `gate_develop.py`(emit 2)校验改动与门控,闭合时**锁定功能指纹**。

与 P1 的衔接:

- P1 设计固化(物理 phase 1)产签名 `AR_design.md` + ar-contract 契约
- P1 consent 绑签名设计条目
- P2 开发门 **强制依赖**签名 AR_design + P1 consent 才允许写码通过

## gate_develop.py 通过条件

- 已有签名 AR_design **且** 已有绑定的 P1 设计 consent
- 相对 `base_commit` 有 tracked/untracked 改动(diff 非空)
- C/C++ 格式 guard + 强规则检查通过
- **闭合时锁功能指纹**(仅非测试路径内容,相对 base、commit 无关)

产物落 `$PDIR/evidence/phase2/`:`diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt`。

## 功能指纹分层

**P2 闭合时锁定功能指纹**——后续阶段防改码回退的核心机制:

- 仅**非测试路径**内容计算(相对 base_commit + untracked,与是否已 commit 无关)
- `check_code_drift` 从 **phase3 起生效**:P3–P8 任一功能内容漂移即被 `advance` 拒绝
- `TEST_ONLY_PHASES=(3,5,6,7)`:P3/P5/P6/P7 只允许新增独立测试文件
- 改功能代码/配置内容 → 必须 `advance.py reset` 回 P1 重走
- 新增独立测试文件(test 路径) → **不触发**漂移
- P8 的 `git commit -s` 不算漂移(commit 无关)

## 哪些 skill 常参与 P2

| skill | 作用 |
|---|---|
| `ohos-dev-sa-codegen` | SA 代码生成 |
| `ohos-dev-napi-module` | NAPI 模块生成 |
| `code-ruleset-style-check` | C/C++ 格式与强规则门控 |
| `tdd-enforcer` | TDD 约束 |
| `ohos-code-skeletons` | 写码脚手架(插件/单测/模块测试/模糊测试占位符骨架) |

## 顺序边界

P2 在 P1 设计固化之后、P3 测试开发之前——阶段顺序固定,不可跳:

```
P1 设计固化 → consent → P2 代码开发 → P3 测试开发
```

## 常见误区

- **想跳过设计直接开发**:不行。P2 强制依赖签名 AR_design + P1 consent
- **改了功能代码想继续当前阶段**:不行。闭合后功能指纹已锁,漂移即被拒,必须 reset 回 P1
- **以为 diff 非空就 advance**:不够。还要 C++ 格式 guard + 强规则检查 + 闭合锁指纹
- **`--no-style` 随便用**:仅无 C/C++ 改动时兼容;`--allow-missing-design` 仅 legacy run 留痕放行

## 延伸阅读

- [P1 设计与开发](/workflow/phase-1-design-and-develop) — P1 consent 的签名绑定
- [Consent 与 Reset](/workflow/consent-and-reset) — 功能指纹分层与 reset 回 P1
- [门控契约](/reference/gate-contract) — gate_develop 契约细节
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 A 新增功能的 P2 skill 组合
- [关键命令](/reference/key-commands) — gate_develop 命令速查
