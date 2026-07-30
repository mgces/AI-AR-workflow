# Workflow 编排器

> 本页说明 `ohos-ar-dev-workflow` 作为"大脑"是什么角色、它不宣布 PASS 只调度做事与 gate、它与 phase skill 的关系。

## ohos-ar-dev-workflow 是什么角色

`ohos-ar-dev-workflow` 是整条流水线的**编排器**(唯一大脑),负责:

- 路由 / init / 调度 / 断点恢复
- 每轮循环:`refresh_todo → 做事 → 跑门控 → advance`
- 把同批细项灌进 `TodoWrite`(会话内可视,`todo.md` 为磁盘权威镜像)

它是 **thin 入口**——自己不做事也不判定,只调度别人做事与跑门控。

## 它不宣布 PASS,只调度做事与 gate

这是不可逾越的护栏:

> **禁止用任何自由文本、总结、"看起来通过了"来推进阶段。**

阶段是否通过,只由 `scripts/` 下的确定性门控脚本 + `advance.py` 判定:

1. **门控脚本是唯一 PASS 来源**:每个阶段先用对应 ohos-* 技能"做事",然后**必须运行该阶段的 `gate_*.py`**;脚本自己解析真实证据给出 verdict
2. **推进只能靠 `advance.py advance --phase N`**:校验该阶段最后一条 manifest 记录的 HMAC 签名与所有产物的 sha256;不匹配就拒绝
3. **门控失败 → 留在本阶段**:读 `evidence/phaseN/` 真实失败日志,修复后重跑门控(≤3 次),仍失败则停下报告

编排器**没有权力宣布某阶段通过**,也不能手改 `pipeline.json` 的阶段状态。

## 它与 phase skill 的关系

| skill | 角色 |
|---|---|
| `ohos-ar-dev-workflow` | thin 入口:编排器,调度做事与门控 |
| `ohos-ar-dev-phases` | thick 阶段说明 + 承重门控脚本(`gate_*.py` / `advance.py` / `gatelib.py` / `device.sh`) |
| 各 ohos-* 能力技能 | 被编排器调用的做事技能:构建诊断 / 单测生成 / 真机 hdc / 刷机 / PR review 等 |

三层架构:thin 入口 + thick 阶段 skill + 确定性门控脚本。借鉴 AID/MigBot 工作流,但**阶段边界是脚本门控,不是用户点头**。

## 典型用户命令

### 开始一个新 AR

在 Agent 里说:

```
/ohos-ar-dev-workflow <已澄清的 AR 文本>
```

编排器会为这个 AR 在 `specs/pipeline/{date}-{slug}/` 建独立流水线,开始按阶段推进。

### 续跑("继续流水线")

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all   # 重校验已通过阶段
python3 $S/advance.py --pipeline-dir "$PDIR" status       # 从 current_phase 续跑
```

### 完成后归档

```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/archive_product.py" \
    --pipeline-dir "$PDIR" --product-dir products/<run> --include-reports
```

只产脱敏摘要(`ar.md` + `manifest_summary.md` + `README.md`),`--include-reports` 额外把 `reports/*.md` 脱敏后归档。原始可验签证据留在本地 run-state 目录(已 gitignore)。

## 常见误区

- **以为编排器说"完成"就是完成**:不是。只有门控脚本 PASS + `advance.py` 推进才算阶段通过
- **想跳阶段**:阶段顺序不可跳,只能关闭 `current_phase` 指向的阶段
- **改了代码想继续当前阶段**:不行。必须 `advance.py reset` 回 P1 重走

## 延伸阅读

- [开发 Workflow](/workflow/) — 完整生命周期与各阶段
- [Evidence 与 Gates](/workflow/evidence-and-gates) — 门控契约与防伪协议
- [Skill 组合拳](/skill-playbooks/common-combinations) — 典型场景的 skill 组合
