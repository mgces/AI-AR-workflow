# 弱模型迁移 — 残余薄弱点审计 (2026-07-27)

对照 `remaining_tasks.md` / `status_review.md` 的两轮盘点(A–E,自评 ~89%),
本文做**第三轮独立复核**:通读真相层/控制层脚本 + 8 个阶段文档 + 三份弱模型设计文档,
并跑通 `ohos-ar-dev-phases` 298 用例(全绿)。目的不是重复已完成项,而是记录
**前两轮盘点低估或漏记、且属协议层(而非纯外部成熟度)可补的残余薄弱点**。

图例:`(P0)` 阻断级 · `(P1)` 高 · `(P2)` 中 · `(P3)` 低。状态:☐ 未做 · ⚠️ 部分 · ✅ 已完成。
所有条目带 `file:line` 证据,逐条已对当前工作区代码核实。

> 定位:真相层(HMAC 签名链 + `advance.py` 唯一写入 + 功能指纹 + consent 绑定 + 契约结构校验)
> **无洞**,弱模型无法用自由文本推进阶段——这一层不用再动。以下全部是**控制层/指令层**
> 面向弱模型自治的残余风险。

---

## 0. 与现有盘点的差异(为什么还需要本文)

`remaining_tasks.md` 把剩余项几乎全部收口到 **E2「真机/CI 外部成熟度硬上限」**。本次复核认为
这个收口**过于乐观**:E2 里混入了几类**协议层可以部分兜底**的问题,且有两条**完全未进盘点**的
真·协议漏洞(G1 共享密钥 consent、G3 escalation 只建议不强制)。本文把它们从"硬上限"里拆出来单列。

---

## G 组:被低估 / 漏记的协议缺口(优先补)

### G1 `(P0)` ☐ 共享密钥 consent —— 模型能给自己签字越过人工门 —— **完全未进现有盘点**
- 证据:`lib/gatelib.py:2544-2546` 自述:per-run secret **同时**签证据和 consent,
  "does not cryptographically prove a human (vs the model) produced it"。
- 后果:被要求"继续跑"的弱模型可以自己 `advance.py consent --phase 6|7|8 --token X` 越过
  **真机 / 质量 / 上库**三道人工确认门。对**全自动弱模型**场景,这是最大的自主作弊面。
- 现状:consent 机制已堵住"凭空盖章"和"陈旧 consent 复用"(`gatelib.py:2536-2546`),
  但没堵"模型自签"。
- 修:consent 令牌带外化——独立密钥 / 人工输入的一次性码 / 环境隔离;或至少在"自主模式"下
  对 P6/P7/P8 强制 HOLD,须带外令牌解锁。effort: **中**。

### G2 `(P0)` ⚠️ 语义 vs 结构:P1 契约 / P7 报告只查形状不查实质
现有盘点把这一整类折进 E2「模型 patch 质量硬上限」一笔带过;实际**其中一部分可脚本兜底**。

- **G2a — P1 契约反平凡性**:`build_artifacts` 路径与 `device_cases[].marker` 只要**格式合法**即过。
  - 证据:`phase1-design.md:25`(marker 需"只在真实成功时出现",但门控不校验);
    `gatelib.py:2292-2328`(`check_contract_closure` 只验"每个 requirement 被某项引用",
    不验引用是否有意义)。
  - 后果:弱模型可写"格式对、语义错"的 marker/产物,静默毒化下游 P4/P6 覆盖门。
  - 已有可复用先例:P6 已强制 device marker "非字面量 + 运行时路径"(`phase6-device-functional.md:20-21`)。
    同思路可前移到 P1 做**反平凡性预检**(marker 不得是恒真串 / 不得作为字面量出现在待写脚本约定里)。
- **G2b — P7 质量报告实质性**:`performance/power/stability` 三报告 + review 报告,门控只查
  存在性 + `issue_count==0` 形状。
  - 证据:`phase7-quality.md:36-38`(shape-only:JSON `issue_count/…==0` 或文本 `review_issue_count=0`);
    只有 MST `summary_report.xml`(`phase7-quality.md:30-31`)与自动 `code_ruleset_guard`(`:34`)是真证据。
  - 后果:弱模型可编造性能数字 + 报告 0 问题直接 PASS。
  - 修:加轻量实质性检查——报告须来自**真实 run 目录**、关键数值非空/非占位、
    与 P5/P6 已签证据交叉一致。effort: **中-高**(逐项解析)。

### G3 `(P1)` ☐ escalation 只是导航建议,弱模型可无视继续重跑 —— **未进现有盘点**
- 证据:熔断算出 `human_escalation_needed`(`gatelib.py:1177`、`finalize_control` 回传 `:1586`),
  但只在 `advance.py next` 的导航路径提示;**没有任何硬门阻止**模型无视它重跑同一 gate。
- 后果:真正卡死的失败会**永远 FAIL 而非升级人工**,除非模型主动按 packet 路由。
  A1 修的"死循环"是熔断**计数**不失效;本条是熔断**结论**不强制——两者不同。
- 修:escalation 触发后,`advance` 对该 phase 直接 HOLD,须带外令牌解锁(与 G1 同机制)。effort: **中**。

### G4 `(P2)` ☐ 控制层写入静默失败 → 弱模型丢脚手架且无告警 —— **未进现有盘点**
- 证据:`write_control_json`(`gatelib.py:290-303`)`except: return None`;
  `write_phase_summary`/`write_failure_report`(`gatelib.py:248-287`)同样吞异常。
- 后果:若 `controls/` 不可写,弱模型赖以恢复上下文的 memory card 直接消失且**无报错**,
  导航静默退化(真相层不受影响,是 by design,但模型丢了 scaffold)。
- 修:P0 预检加一条 `controls/` 可写性断言;或在 status 输出里显式标注"控制层写入失败"。effort: **低**。

### G5 `(P2)` ☐ 控制层整体"自愿遵守",无遵守性校验
- 证据:`gatelib.py:343-350` 明示控制层全 best-effort、绝不改 verdict;
  stage_packet 携 `authority_boundary.not_truth_source=True`(`gatelib.py:750-754`);
  `window_startup_order`(`gatelib.py:541-580`)、`forbidden_actions` 均纯导航。
- 后果:忽略 packet/card/启动顺序的弱模型**无任何惩罚**;这些机制只约束"合作型"弱模型
  (上下文丢失/漂移),对"根本不看"的模型无效。
- 说明:这是控制层的**设计本质**(不能反过来污染真相层),**大部分不可也不应强制**。
  仅记录为已知边界;真正需要强制的子集已在 G1/G3 单列(consent / escalation)。effort: **—**(边界,非缺口)。

---

## H 组:高风险阶段(指令层可改善,非门控漏洞)

阶段弱模型风险排序:**P6 > P8 > P7 > P1 > P5 > P2 > P3/P4**。门控防伪强弱不均:
P3/P4/P5/P6 有强确定性反伪证据(fresh-tail 横幅 / 落盘产物 / fresh report 目录 / nonce+sha256+非字面量 marker);
**P1 契约内容与 P7 质量报告是软肋**(见 G2)。

### H1 `(P1)` ☐ 高风险阶段缺"跑昂贵 gate 前的参数预检"
- 证据:P5 需模型自推 `--test-target/--suite/--part`(`phase5-test-author.md:18`);
  P6 需自写两个 bash + 选 marker + 填 ~8 参数(`phase6-device-functional.md:10,25-32`);
  P8 需 `--repo-slug/--branch/--base/--head-owner/--issue`(`phase8-upload-review.md`),
  含跨 fork `--head=<owner>:<branch>` 陷阱(`:65-68`,错则误导性 403)。
- 后果:弱模型最弱的是"从代码库**推出参数取值**";猜错→昂贵 gate 混乱 FAIL,模型难把失败
  映射回"参数写错"。
- 修:每阶段加轻量 `preflight`(GN 目标存在性 / 部署路径存在性 / repo·branch 可达性 / head 归属),
  把"猜错→混乱 FAIL"提前成"清晰预检报错"。effort: **中**。

### H2 `(P2)` ⚠️ 人工确认全依赖编排器不自动继续
- 证据:P1→P2、P6、P7、P8 的停下等确认,靠编排器**不自动继续**(`phase6-device-functional.md:53`
  "必须停住…不得自行继续")。唯一硬网是 consent 令牌(`advance` 无令牌 HOLD)——而该网被 G1 削弱。
- 后果:"忘记上下文"的弱模型在 P6 最危险(可能自行 `consent` / 伪造批准)。
- 修:随 G1 一并解决(consent 带外化后,自动继续也拿不到有效令牌)。effort: 见 G1。

---

## E 组:确属硬上限(记录即可,非协议缺口)

- **E1** ✅ 传输层退避已做(`gate_upload_ci.py:186`,不误伤真红 CI)。
- **E2** 真机观测稳定性 / CI 语义正确性 / 模型自身 patch 质量 —— 本仓不可完全兜底。
  注:原盘点把 G2/G1/G3 也归到这里,本文已拆出——E2 应只留"真·不可脚本兜底"的三项。

---

## 落地优先级建议

| 优先级 | 项 | 性质 | effort |
|---|---|---|---|
| **P0** | G1 consent 带外化(堵自签字) | 协议漏洞 | 中 |
| **P0** | G2a P1 契约反平凡性预检 + G2b P7 报告实质性检查 | 可脚本兜底的语义门 | 中-高 |
| **P1** | G3 escalation 从建议升为硬 HOLD | 防死循环兜底失效 | 中 |
| **P1** | H1 高风险阶段参数 preflight(P5/P6/P8) | 减少弱模型 thrash | 中 |
| **P2** | G4 `controls/` 可写性预检 | 防脚手架静默丢失 | 低 |
| **P3** | 回填 `remaining_tasks.md`:补 G1/G3/G4,把语义门从 E2 拆出 | 文档对账 | 低 |

---

## 一句话结论

真相层与控制层的**骨架已完成,弱模型无法伪造阶段通过**。迁移弱模型仍差的是:
(a) 把 consent 做成真正**带外**(G1)、(b) 把 P1/P7 的**结构门推一段到语义门**(G2)、
(c) 把 escalation 从**建议变硬门**(G3)、(d) 给高风险阶段加**参数预检**(H1)。
这几条**除 E2 外都是协议可补的**,而前两轮盘点把它们过早归入了"外部成熟度硬上限"。
