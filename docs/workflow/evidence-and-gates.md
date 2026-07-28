# Evidence 与 Gates

> 靶向理解系统设计的人:gate 不是建议而是唯一 PASS 来源、advance.py 的唯一状态写入器角色、manifest / HMAC / artifact sha256、evidence 与 reports 的分离。

## gate 不是建议,而是唯一 PASS 来源

每个阶段的门控脚本 `gate_*.py` 是该阶段是否通过的**唯一判定者**:

- 编排器没有权力宣布某阶段通过
- 模型的自由文本不能当作阶段结束
- `advance.py` 不认文字,只认签名证据

门控脚本自己解析真实证据(exit code / 日志横幅 / XML 属性 / nonce grep)给出 verdict(FAIL/PASS),并向 `evidence/manifest.jsonl` 追加一条 HMAC 签名记录。

## advance.py 的唯一状态写入器角色

`pipeline.json` 的阶段状态**只有 `advance.py` 能写**——模型没有任何工具能直接改它。

`advance.py advance --phase N` 推进时校验:

1. 哈希链完整
2. 该阶段最后一条 manifest 记录 `verdict=PASS`
3. HMAC 有效
4. 每个产物当前 sha256 仍匹配
5. 阶段顺序不可跳

任一不符即拒绝。

## manifest / HMAC / artifact sha256

### 签名证据账本(哈希链)

`evidence/manifest.jsonl` 是追加式 HMAC 链式签名证据账本:

- 每条记录含 `seq` + `prev`(上一条 hmac)形成**哈希链**
- 含每个产物的 sha256
- per-run 密钥(32B,mode 600)存于 `.lifecycle-secret/<run>`,**不在**证据目录内,模型无法据此伪造签名

### 防伪机制

| 机制 | 作用 |
|---|---|
| 单一写入器 | 只有 advance.py 能写 pipeline.json 阶段状态 |
| 签名证据账本 | HMAC 链 + 产物 sha256 |
| 推进充要条件 | 哈希链完整 + PASS + HMAC + sha256 + 顺序 |
| 密钥隔离 | per-run 密钥不在证据目录,模型无法伪造 |
| 真机 RTC 无关 | 新鲜度靠 nonce + uptime + 内容切窗,不靠时间戳 |
| 抗事后篡改 | 改证据字节 → verify-all sha256/HMAC 失配 → 降级回退 |
| 抗重放 | 重放历史合法 PASS → seq/prev 对不上链尾被拒 |

## evidence 与 reports 的分离

两轨职责严格分离:

| 目录 | 角色 | 荏属 | gitignore |
|---|---|---|---|
| `evidence/` | 机器证据账本:HMAC 链 + 产物 sha256。**放行唯一真相源** | 机器 | 是 |
| `reports/` | 人读 Markdown 审计报告:脱敏可归档。**给人看,不是放行依据** | 人读 | 否 |

P6/P7/P8 PASS 后编排器跑 `render_report.py --kind test|device|quality|summary` 渲染各产**单个**聚合 `.md`:

- `test_report.md` — P6 通过后渲染,P5 单测 + P6 真机关键证据聚合
- `device_functional.md` — 真机功能完整报告
- `quality.md` — 覆盖率/性能/功耗/稳定性 + 代码 review(六段聚合)
- `summary.md` — 上库汇总(背景/设计/修改/用例/结果)
- `pr_description.md` — P6 由 `gate_upload_ci` 注入 PR 描述

渲染是编排器动作,不影响门控 verdict。

## 延伸阅读

- [门控契约](/reference/gate-contract) — 各 gate_*.py 的契约细节
- [run 目录结构](/reference/pipeline-layout) — evidence/controls/reports 的完整结构
- [Consent 与 Reset](/workflow/consent-and-reset) — consent 的签名绑定
