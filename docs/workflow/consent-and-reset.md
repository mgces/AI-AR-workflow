# Consent 与 Reset

> 这页单独存在,因为它是 workflow 思维最容易误解的部分——为什么 P1/P4/P5/P6 要人工确认、什么情况下必须 reset 回 P1、功能指纹意味着什么。

## 为什么 P1/P4/P5/P6 要人工确认

四处人工确认点的设计原则:**不可逆或高代价动作必须人工签名**。

| 阶段 | 停下原因 | consent 命令 |
|---|---|---|
| P1 设计 | 设计固化是后续所有阶段的契约真源,错了后面全错 | `consent --phase 1` |
| P6 端到端功能测试 | 真机真实结果必须人工核对,不是脚本"看起来通过" | `consent --phase 6` |
| P7 质量 | 质量/review 报告必须人工核对 | `consent --phase 7` |
| P8 上库 | push 是唯一对外不可逆动作 | `consent --phase 8` |

其余阶段(P0/P2/P3/P4/P5)由门控脚本自动放行,不停。

### consent 的签名绑定

consent 令牌**签名**并绑定当前 PASS 证据的 entry_id:

- 凭空盖章 → 失效
- 重跑门控后旧 consent 复用 → 失效
- P1 consent 绑签名设计条目,重跑 `gate_design` 即作废

P1 consent 不在 `advance --phase 1` 处校验,而在 **P2 `gate_develop.py` 内**强校验——没签字 P2 开发门直接 FAIL。

## 什么情况下必须 reset 回 P1

**任何阶段发现要改功能代码 → 必须回 P1 重走**。

不管走到 P2..P8,只要发现 bug 需要改代码:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" reset --reason "<改了什么>"
```

打回 P1,从设计/代码开发踏踏实实重走一遍 P1→P8。

## 什么情况下 verify-all

`verify-all` 重校验已通过阶段——篡改或代码漂移则自动降级回退:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all
```

典型用途:

- 怀疑证据被篡改 → sha256/HMAC 失配 → 降级回退
- 代码漂移 → 功能指纹失配 → 回退到 P1
- 断点恢复("继续流水线")前先 verify-all 再 status 续跑

## 功能指纹意味着什么

**P2(feature-develop)闭合时锁定功能指纹**:

- 仅**非测试路径**内容计算
- 相对 `base_commit` + `untracked`,与是否已 commit 无关
- `check_code_drift` 从 **phase3 起**生效

分层规则:

| 改动 | 后果 |
|---|---|
| 改功能代码/配置内容 | `advance P3..P8` 因功能指纹漂移被拒 |
| P3/P5/P6/P7 新增非测试路径 | 拒绝(`TEST_ONLY_PHASES=(3,5,6,7)`) |
| 新增独立测试文件(test 路径) | **不触发**漂移 |
| P6 的 `git commit -s` | 不算漂移(commit 无关) |
| 旧 run 无功能指纹 | 回退到全量指纹旧行为 |

## 常见误区

- **改了代码想继续当前阶段**:不行。必须 reset 回 P1 重走
- **想跳过 consent**:不行。没令牌时 `advance` 会 HOLD
- **重跑 gate 后想复用旧 consent**:不行。consent 绑当前 PASS 条目,重跑即作废
- **以为只改测试就能继续**:P3/P5/P6/P7 只允许新增独立测试文件;改功能代码仍要 reset

## 延伸阅读

- [Evidence 与 Gates](/workflow/evidence-and-gates) — 签名证据账本与防伪协议
- [状态机](/reference/workflow-state-machine) — consent / reset / verify-all 的状态流转
- [改码回退重走示例](/examples/code-fix-and-rewalk) — reset 回 P1 的完整演示
