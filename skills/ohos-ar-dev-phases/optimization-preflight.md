# 分阶段优化预检

新运行标准入口：`advance.py init --optimized-checks`。旧 CLI 不带该标志时保持旧行为；新 workflow 编排必须带标志。状态字段 `optimization_policy_version=1` 启用所有阶段的自动预检。预检结果进入 `workflow_metrics.json.preflight_history`，永远不能代替签名 PASS。

## 签名验证计划

把下面的字段加入 P1 `ar-contract`。具体路径、目标和命令须从该 AR 的实际源码、BUILD.gn 和 CI 支持范围确定，模板不能直接运行。计划作为设计及契约的一部分签名，P2 之后只读取完整性校验通过的证据。

| 字段 | 类型与约束 | 执行阶段 |
| --- | --- | --- |
| version | 固定 1 | P1 校验 |
| protected_paths | 源码根相对路径数组，列出不能改写的依赖头；组件与这些依赖仓也进行前后差异检查 | 所有探针 |
| supported_platforms | 可选数组，device/host/mingw；声明的平台必须有对应矩阵项 | P1 校验 |
| build_matrix | 数组；每项 id、platform、argv 字符串数组；默认 cwd 为隔离临时目录，必要时明确 cwd=repo；timeout 默认 120 秒，上限 3600 秒 | P4 |
| symbol_checks | 数组；每项 id、artifact（实际库相对源码根）、required_symbols（完整 demangle 符号名称数组） | P4 构建前仅探测 nm；当前构建成功后核对实际库并签名结果 |
| test_isolation | 对象：modified_state 数组、before_argv 状态读回命令、cleanup_argv 清理命令、runs 数组 | P5/P7 |
| test_isolation.runs | 必须包含 id 为 repeat、shuffle、independent 的项；每项 argv、cwd、report_xml（源码根相对路径），指向本次产生的聚合测试 XML | P5/P7 |
| device_triggers | 以 DC id 为键；每项 argv、expect 正则、dependencies 数组、failure_injection 对象 | P1 可触发性探针 |
| failure_injection | argv、expect，必要时 expected_exit；必须为可执行注入路线，不能仅填描述 | P1 |

矩阵、符号、状态隔离不适用时，可用 `{ "not_applicable": "具体原因" }` 替代。声明 supported_platforms 时不能借此跳过矩阵；有设备用例不能借此跳过触发链。依赖和不适用理由仍需设计评审，不把作者自述当成最终功能通过证据。

完整 job 通用字段：id、argv、cwd（省略表示隔离目录，repo 表示源码根）、expect、expected_exit（默认 0）、timeout、report_xml。argv 不经过宿主 shell；需要 shell 时明确调用实际脚本。探针不能执行上库、发布、消息发送或未经授权的外部写入。构建/取证是本阶段的真实命令，不能用假成功输出替代。

状态读回命令必须读实际共享状态，输出可比较的稳定内容，不能仅返回固定文本。runs 使用实际测试框架的重复、乱序、独立运行参数；各测试必须恢复状态，cleanup 是最后保护措施，失败分支也执行。报告须 tests>0、failures=0、errors=0，并证明不是运行前已有报告。报告和生成物写到 out 或本次证据目录，不能作为新的源码改动。

## 实际预检边界

- P1 校验完整设计，并运行触发/注入可行性探针；探针证明已有运行时机制可用，不假装尚未实现的功能已经正确。
- P2/P3 先做质量/规模检查及依赖保护；静态规则预检继续执行并记录，但 `author-rules` / `file-hygiene` 不再阻断阶段：阶段门只把 `gatelib.P2_P3_CRITICAL_RULESET_IDS` 作为硬门，guard 缺失或本轮报告不可读必须 fail-closed。P4 复用实际 Git diff，包含新增测试；AST 内容检查按改动行，检查器执行失败不能被改动行过滤掉。
- P4 按同一工具解析器使用预置或 PATH 工具；ninja/clang-tidy/compdb/报告任一不可用都明确阻断（不再是 advisory）。构建数据库由真实构建输出生成，不能把未生成当成已通过。`early-metrics` 与非白名单 clang-tidy finding 仅记录，P4 只阻断 `gatelib.P4_CRITICAL_AST_RULESET_IDS` 与 backend 失败。
- P5/P6/P7 核验在线设备、端点、用户态 ELF ABI、xdevice XML 和实际文件回收能力。小型回收探针 XML 使用唯一 token，类型不是测试报告，不能作为门禁证据。
- P6 使用未转义的 `GATE_NONCE`；部署和场景选择一个重启 owner。`dev_restart_once deploy '实际重启命令'` 由门禁注入的本次生命周期目录记录重启，第二 owner 被拒绝。现有存活 PID、时间窗口、加载产物和运行标记检查不变。
- 板端测试使用 `dev_test_run /data/local/tmp/实际目录 实际程序 参数`，固定工作目录和程序；真实 marker 由产品代码产生，不能放入场景脚本。
- P7 的 `--suites` 须覆盖签名契约必需集合；xdevice 配置与 P5 共用并在退出时恢复。报告只在本次新根定位，多份候选、逃逸和旧报告均拒绝。
- P8 保存确认停点、CI 等待、代码缺陷、平台/传输异常和未知的分类；仍需当前 SHA 的绿结果。已有参数与阶段前置条件检查保留，仅传输故障限次重试；没有证明平台异常的普通失败不能自动归因外部。

## 推荐 side_effect 结构

需要检查配置安装路径等副作用时，在对应 `device_cases` 中写实际 shell 断言：

```json
{"side_effect":{"type":"shell_assert","command":"test -f /system/etc/实际安装路径 && printf 'present'","expect":"present"}}
```

这只是结构模板，先替换为该 AR 的实际路径及真实断言。插件配置源文件改名后，仍须保留 BUILD.gn 的实际安装目标名，并通过真机断言验证。普通插件 JSON 不要求组件描述字段；真正组件描述即使改文件名仍校验必要字段。敏感词触发保留 rule_id 和行号，不回显敏感原文；先核实规则与测试语义，不能全局禁用规则。

首次使用前同步这份仓库的技能到 Agent 实际技能目录，或直接使用仓库 `skills`。本机回归和离线评估不是新的 OHOS 实测报告。
