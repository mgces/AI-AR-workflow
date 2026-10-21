# Workflow 优化实现与离线评估

2026-10-09：15 项优化已在仓库中实现，待真实运行验收。实现的是 workflow 的检查、预检、取证和记录机制；不会自动修正任何产品仓的功能缺陷。

## 失败减少度

隔离进程分别运行本轮修改前的源码副本和当前源码，模拟历史失败机制。clang 输出使用确定性夹具，没有执行 OHOS 构建、真机测试或远端 CI。结果在 `optimization-assessment.json`。

| 评估口径 | 修复前 | 修复后 | 结论 |
| --- | --- | --- | --- |
| 历史误判、配置及取证问题：8 类样例 | 8 类未达到预期 | 0 类未达到预期 | 覆盖样例的问题减少 100%，不能换算成真实 FAIL 降幅 |
| 检查器报错、超时：2 类样例 | 0 类提供预期结构化阻断 | 2 类提供明确阻断 | 修正不可靠检查状态，可能增加应有的 FAIL |
| 真实缺陷和旧证据：6 个对照 | 6 个正确拒绝 | 6 个正确拒绝 | 保留阻断，未用放宽门禁提高通过率 |
| 三个历史 session 的门禁计数 | 37 FAIL / 90 次尝试 | 尚无新真实运行 | 实际失败减少度待测 |

八类样例：DFX 标题冲突、组件路径基准、插件计数配置、HWTEST 注册、保护宏路径、xdevice 环境节点、hilog PID 来源、本次报告嵌套目录。

一次历史 FAIL 可能包含多个原因，缺失逐次输出的原因仍未知。不能把上述八类问题对应成八次历史 FAIL，也不能承诺下一次运行零失败。提前发现真实缺陷只减少后段返工，不算消除了缺陷；环境和平台问题仍需要处理。

## 15 项实现对照

| 编号 | Workflow 已落地的机制 | 验证与实际边界 |
| --- | --- | --- |
| WF-01 | P1 签名前复用章节、契约、占位符及引用闭环校验；DFX 选择完整匹配章节 | 真实 P1 CLI 签名和篡改拒绝测试；设计语义仍需评审 |
| WF-02 | 按实际源码根和组件 Git 根规范化路径，禁止遍历和任意后缀匹配；规则摘要预检与正式覆盖清单生成器 | 20 个路径 A/B；规则摘要更新保留全部 545 条规则归属 |
| WF-03 | 识别 HWTEST/HWTEST_F/HWTEST_P；插件计数格式不要求添加不支持的注释，格式和字节检查仍保留 | 有效宏与裸字符串对照；有效/损坏配置对照 |
| WF-04 | 探针默认独立临时目录；保护声明的依赖头；检查组件与依赖仓前后差异；禁止自动恢复覆盖已有改动；超时清理进程组 | 桩头覆写、已有脏改动、新增范围外文件及超时子进程测试 |
| WF-05 | 签名计划声明受影响的设备/host/MinGW 构建矩阵；声明的平台不可漏项；对实际库运行 nm 动态导出检查并保存产物摘要 | 导出/未定义符号对照；MinGW 漏项拒绝。具体目标需根据该 AR 的 BUILD.gn、依赖和 CI 目标填写，不自动猜测 |
| WF-06 | P2/P3/P4 继续执行早期质量和规模观察；metric/lizard 结果写入签名证据，但不再阻断 P2/P3/P4（P7 保持既有质量契约） | 观察记录不能宣称 PASS；不能靠缩小度量范围隐藏真实问题 |
| WF-07 | P4 基于真实 Git diff 的改动行，覆盖 P3 新增测试；保护宏使用组件相对约定；JSON 区分组件描述与插件数据 | 真实 Git 范围、头宏及 JSON 语义回归。生命周期 P2/P3/P4 只把 critical 规则子集作为硬门；敏感词等其他 finding 留证，由 P8 review / CI 结合测试语义和 CodeCheck ignore 核实。远端按文件名误判时需调整源文件名并在设计中验证安装路径 |
| WF-08 | 同一工具解析器探测预置 clang-tidy、ninja 与 lizard，记录路径、版本和结果；P4 只要工具/compdb/报告不可用或执行异常就 fail-closed，不能以未运行 AST 结束 P4 | 检查器异常、超时、报告无效测试；本机回归不代表 OHOS 工具已就绪 |
| WF-09 | 设备阶段先验证指定 serial 和 shell；生成带 environment/device 的 xdevice XML；实际接收设备用户态 ELF 并比较产物 ABI；恢复后关闭预检等待 | XML、真实 ELF 头、错误端点及 serial 处理。用户态 ABI 不由产品名或 uname 推断；xdevice 实际识别仍由真机执行验收 |
| WF-10 | 签名计划记录共享状态、清理命令、重复/乱序/独立执行；每次须产生新、非空、零失败报告；失败退出也运行清理并复验状态 | 状态污染、损坏/旧/失败报告回归；每个产品的状态恢复代码仍需开发者实现 |
| WF-11 | P1 每个 DC 声明可执行触发探针、依赖、观察结果和可执行失败注入，执行后留证 | 描述性注入被拒绝；P1 证明已有机制可触发，新功能最终正确性仍由 P6 判定 |
| WF-12 | 预检 nonce 转义与双重重启；dev_restart_once 使用本次 nonce 的单一重启账本；hilog 行头 PID 优先 | 单 owner/单重启回归；原有时间窗口、存活进程及产物 provenance 检查继续生效，旧实例不能放行 |
| WF-13 | 比较契约套件集合；dev_test_run 固定目录和程序；设备 send/recv 小型探针定位真实目录层级；仅在本次新报告根递归定位，歧义和旧报告拒绝；P7 复用 P5 的 xdevice 连接配置 | 回收 token、嵌套目录、旧报告及启动包装器测试；探针 XML 明确不是测试通过证据 |
| WF-14 | 区分确认停点、CI 等待、明确代码缺陷、明确平台/传输异常及未知；仅传输异常沿用限次查询重试；结果仍绑定当前 SHA 和时效 | 分类对照及既有 P8 测试。普通 ecotest FAIL 不自动归因平台；平台故障不会因为分类而变成 PASS |
| WF-15 | 原始签名 FAIL 保留原因、修改和复验；预检独立记录次数、原因、修复与同检查复验；网页区分实现和真实效果 | 预检失败保存与修复关联测试；未实测的 15 项均不能标为效果已验证 |

## 下一次真实运行如何使用

标准 workflow 初始化命令现在要求 `--optimized-checks`。该标志把 `optimization_policy_version=1` 固定到新运行状态，P1–P8 门禁自动调用对应预检。旧运行不被静默升级；继续旧运行需要先确认其设计是否包含新验证计划。预检不签发阶段 PASS、不代替人工确认、不推进阶段。

在本仓调试可直接使用仓库 `skills/` 下的技能和脚本。若 Agent 使用已安装的技能，先通过仓库 `sync-skills.sh` 同步到实际的 `AGENT_SKILLS_DIR`，避免继续使用旧副本；本轮不覆盖其他位置的技能或用户配置。

P1 的 `ar-contract` 增加 `verification_plan`，完整字段说明见 `skills/ohos-ar-dev-phases/optimization-preflight.md`。选择与该 AR 相关的真实构建目标、符号、状态清理及触发路线；不适用项须说明原因。不能填 `echo success` 充当真实验证。矩阵验证在独立探针或明确的仓根运行，不能覆盖真实依赖头。

也可在正式门禁之前单独执行同一套预检：

```bash
python3 skills/ohos-ar-dev-phases/scripts/workflow_preflight.py --pipeline-dir "$PDIR" --phase 1
python3 skills/ohos-ar-dev-phases/scripts/workflow_preflight.py --pipeline-dir "$PDIR" --phase 4
```

如果先手动预检、随后再执行正式门禁，两次预检都会记录，不能删除第一次失败。用以下方式记录修复，再运行复验：

```bash
python3 skills/ohos-ar-dev-phases/scripts/workflow_preflight.py --pipeline-dir "$PDIR" --phase 4 \
  --fix-attempt preflight-1 --cause '缺少已声明的度量依赖' --action '安装匹配版本并确认可执行路径'
```

真实门禁的修复仍使用现有 `advance.py fix`；预检修复不绕过签名证据核验。未明确的根因继续写未知。

## 实测对比口径

每个运行保留：优化策略版本、工具版本、规则摘要、原始门禁尝试/FAIL、预检尝试/FAIL、根因、修复、复验、有效耗时与等待耗时。分别报告：

1. 真实缺陷、误判、环境阻塞、CI 等待、外部故障及未知原因的次数。
2. 同类已知原因复发次数；预检提前发现与后段 FAIL 分开，不将前移计作消除。
3. 真实门禁首次通过率、修复轮次和返工耗时；预期确认停点单列，不抹掉原始 FAIL。
4. 设备、组件、需求复杂度、环境及优化模式差异。一个新运行只提供该运行证据，不足以保证所有新人都达到同一降幅。

## 复现离线评估

```bash
python3 -m unittest discover -s skills/ohos-ar-dev-phases/tests -p 'test_*.py' -q
python3 -m unittest discover -s skills/code-ruleset-style-check/tests -p 'test_*.py' -q
python3 skills/ohos-ar-dev-phases/tests/evaluate_workflow_optimization.py \
  --baseline-dir /tmp/workflow-optimization-baseline-20261009 \
  --output docs/workflow/optimization-assessment.json
```

`--baseline-dir` 需包含修改前的两个技能目录；本次副本保存在上述临时路径。另一个环境需先取得对应旧版本。报告不能脱离其夹具、基线和限制使用。

## 2026-10-10：P1/P2/P3 计时历史修复

首次真实运行的补充 session 确认：同一 run-id 的 `init --force` 覆盖了早期指标。此前 77.8%
失败减少和 27.4% P0–P7 有效耗时下降不能代表完整任务，见 [修订复盘](./optimization-real-run-20261010.md)。

共用计时机制已修复：强制初始化归档并保留累计历史；开始工作前登记 `work-start`；阶段回退/切换
结束旧区间；等待只扣工作区间内的并集。10 个计时回归覆盖 P1/P2/P3、旧格式、真实 force-init CLI、
历史失败保留及旧签名证据失效。网页显示计时覆盖及各轮起止，历史不完整时暂停改善幅度计算。

这些是机制回归证据，下一次真实任务仍需验证实际工作是否按约定登记，不能据此宣称真实效率已经提高。

## 2026-10-10：P8 GitCode 上库恢复修复

已落实 WF-14 的进一步修复：重复上传计划复用确认预检，匹配已有 PR 并处理 409 并发冲突，
推送前检查分支关系，签名保存 PR/SHA/推送时刻，评审缺失及 CI pending 单独等待，
next/resume 给出恢复命令。16 项隔离回归含真实本地 Git 远端以及错误 PR、篡改与 SHA 负向测试。

等待不是 PASS；CI 红灯、评审问题、旧绿色及 SHA 不一致仍阻断。历史 11 次 FAIL 保留原值，
没有将统计分类调整当作真实缺陷减少。新效果等待后续真实运行验证；本次仅覆盖 GitCode 上传分支。
