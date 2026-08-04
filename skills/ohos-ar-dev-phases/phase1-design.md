# P1 设计固化(design-orchestrate,物理 phase 1)

设计固化是独立物理阶段。不先固化设计,不允许写代码。
本阶段闭合门为 `gate_design.py`(签名 `emit(phase 1)`),另需**人工 consent**放行到 P2。

## 设计前:检索知识库(可选输入,不进门控)

写 `AR_design.md` 前,先对 `openharmony-knowledge-base` 做一次 BM25 词法检索,把与本次 AR
最相关的子系统/feature 事实文档摘要拉出来,作为设计参考(如已有同类 feature 专题、目标组件
所在子系统的能力域/进程/构建目标):
```bash
python3 openharmony-knowledge-base/tools/search/kb_search.py \
    --query-file "$PDIR/ar.md" --k 8 --out "$PDIR/design_refs.md" || true
```
产出 `$PDIR/design_refs.md`(命中文档路径 + 章节 + 预览 + BM25 分数),写 6 章节时可据此复用
既有事实、对齐命名与目录。**这是 advisory 输入,不是门控输入**:`gate_design.py` 不校验
`design_refs.md`,检索失败(索引缺失会自动增量重建;仍失败则写占位)也不阻挡 P1。首次运行会
自动建索引,无需手动预建;知识库更新后重跑 `kb_search.py` 会自动增量刷新索引。

## 设计固化(gate_design.py)

先写 `$PDIR/AR_design.md`,**必须包含 6 个章节**(标题存在 + body 非空,门控确定性校验):
目标组件 / 详细功能需求 / 完整代码框架(其下含"文件清单""每文件功能""每文件代码框架"三小节)/
完整测试框架 / 需测试的功能点 / 真机测试用例构造。

**并且必须内嵌一个机器可读的 ```ar-contract``` 围栏 JSON 块**(恰好一个;下游 P3/P4/P5/P6
据此做全量覆盖硬门控,让"编译路径"清晰、测试点/真机用例可逐项校验):
````markdown
```ar-contract
{
  "build_artifacts": ["out/rk3568/.../libfoo.z.so"],
  "test_cases":   [{"point": "处理超时", "gtest": "FooTest.HandleTimeout_001"}],
  "device_cases": [{"desc": "注入事件", "marker": "AR_DEV_CASE1_OK"}]
}
```
````
三个键均为**非空数组**:`build_artifacts` 为编译产物路径(相对仓根,或相对 `out/rk3568`);
`test_cases[].gtest` 形如 `Suite.Case`(允许 `/` 支持参数化名 `Suite/0.Case`);
`device_cases[].marker` 为真机日志里只会在该用例真实成功时出现的标记字符串。

**测试用例语言形态(`test_cases[].kind`,2026-08 新增):** 缺省 `"gtest"` = C++ gtest
(与上述完全一致,存量契约零变化);`"arkts"` = ArkTS/Hypium 应用测试。kind 为纯增量字段,
缺省向后兼容,一个契约可**混合**两种 kind:

```json
"test_cases": [
  {"point": "处理超时", "gtest": "FooTest.HandleTimeout_001"},
  {"point": "页面跳转", "kind": "arkts",
   "gtest": "EntryAbilityTest.abilityPageTest",
   "suite": "EntryAbilityTest",
   "file": "entry/src/ohosTest/ets/test/Ability.test.ets"}
]
```

arkts 条目的 `gtest` 仍是必填的 `Suite.Case` 身份(Hypium `describe('套件')` → Suite、
`it('用例')` → Case,1:1 映射),但校验更宽松:允许 CJK/下划线/数字,两个半段内无空白即可
(如 `"套件.用例"`)。两个**可选**辅助字段:`suite` = 确切的 describe 名(可含 CJK/空格,
P3 authorship 匹配用)、`file` = ArkTS 测试源文件/目录路径(相对仓根,P3 特征冻结放行的
锚点)。未知 `kind` 值 → 契约 FAIL(关死)。下游分派:P3 按 kind 检查 authorship(gtest 走
`TEST/TEST_F` 宏,arkts 走 `describe()/it()`),P5 按 kind 执行(gtest 走 developer_test,
arkts 走环境 profile 的 Hypium runner),P7 的套件绑定只管 gtest 套件。
```bash
python3 $S/gate_design.py --pipeline-dir "$PDIR"   # 默认读 $PDIR/AR_design.md
```
门控校验 6 章节 + ```ar-contract``` 块,把 AR_design.md 拷进 `evidence/phase1/AR_design.md`
并 HMAC 签名,合法契约另写签名副本 `evidence/phase1/ar_contract.json`。缺章节/空 body/缺契约块/
契约畸形(块数≠1、非法 JSON、空数组、gtest 不像 `Suite.Case`、device 项缺 desc/marker)→ FAIL。
legacy run 可 `--allow-missing-contract`(PASS 但 reason 标 `AR-CONTRACT-LEGACY-BYPASS`,不写 json)。
后续 P2–P8 的开发、测试、真机用例都**依据这份签名 AR_design 及其契约**构建。

## 人工确认(设计→开发之间的硬门控)
`gate_design.py` PASS 后**不自动进入写码**。必须由人工复核签名 AR_design 与其编译路径
(`build_artifacts`),同意后记录 P1 设计 consent:
```bash
# 人工复核 evidence/phase1/AR_design.md 与 ar_contract.json 后:
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 1 --token <审核人>
```
该 consent 绑定到 gate_design 的签名记录(entry_id);**重跑 gate_design(设计变化)会作废旧
consent,需重新签字**。这道 consent 不在 `advance --phase 1` 时校验,而是由 **P2 的
`gate_develop.py` 独立校验**(绑 phase-1 设计签名条目):未签 consent 就跑 `gate_develop.py`
会 FAIL 并提示 `consent --phase 1`。

## 通过条件
`AR_design.md` 6 章节齐全 + ```ar-contract``` 块合法,已 HMAC 签名。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 1
```
推进到物理 phase 2(feature-develop)。设计 consent 的缺失不阻挡 `advance --phase 1`,
但会在 P2 `gate_develop.py` 处 fail-closed。
