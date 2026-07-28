# 状态机

> 说明 `current_phase` / `consent` / `verify-all` / `reset` / `advance` 的状态流转。

## current_phase

`pipeline.json` 的 `current_phase` 字段记录当前物理阶段(0–8),**只有 `advance.py` 能写**。

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" status [--json]
```

`status` 输出含:`logical_phase_id` / `logical_phase_name` / `physical_phase` / `substate` / `action_kind` / `control_refs`。

## consent

人工签名确认令牌,绑定当前 PASS 证据的 entry_id:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase N --token <人>
```

签名绑定规则:

- 凭空盖章 → 失效
- 重跑门控后旧 consent 复用 → 失效
- P1 consent 绑签名设计条目,重跑 `gate_design` 即作废

四处人工确认点:P1(设计)/ P6(真机)/ P7(质量)/ P8(上库)。没令牌时 `advance` 会 HOLD。

## verify-all

重校验已通过阶段——篡改或代码漂移则自动降级回退:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all
```

校验链:

1. 哈希链完整
2. 每条记录 HMAC 有效
3. 每个产物当前 sha256 仍匹配
4. 功能指纹未漂移

任一失配 → 降级回退到首个失配阶段。典型用途:断点恢复前先 verify-all 再 status 续跑。

## reset

打回 P1 重走——任何阶段发现要改功能代码:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" reset --reason "<改了什么>"
```

打回 P1,从设计/代码开发重走一遍 P1→P8。功能指纹漂移会被强制拒绝,不许只补跑当前阶段。

## advance

推进 N→N+1:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase N
```

校验充要条件:

1. 哈希链完整
2. 该阶段最后一条 manifest 记录 `verdict=PASS`
3. HMAC 有效
4. 每个产物当前 sha256 仍匹配
5. 阶段顺序不可跳

任一不符即拒绝。若该阶段需 consent(P1/P6/P7/P8)且未签字 → HOLD。

## 其他命令

| 命令 | 作用 |
|---|---|
| `init` | 建运行态,确定组件/build_target/testpart/base_commit |
| `migrate` | 在途旧 7 阶段 run 迁到 9 阶段(仅 current_phase<=1;只动 pipeline.json,不碰 manifest) |
| `next` | 导航层:输出当前逻辑阶段+下一步(retry/repair/regenerate/escalate),并写 next_action.json |

## 延伸阅读

- [Consent 与 Reset](/workflow/consent-and-reset) — 为什么四处要人工确认
- [Evidence 与 Gates](/workflow/evidence-and-gates) — 签名证据账本
- [门控契约](/reference/gate-contract) — 各 gate 的 verdict 判定
- [run 目录结构](/reference/pipeline-layout) — pipeline.json 字段说明
