// 进度只随仓库中的实现和验收证据更新，不在浏览器中临时改写。
export const planUpdatedAt = '2026-10-10';
export const plans = [
  {
    "id": "WF-01",
    "title": "签名前检查设计契约与用例结构",
    "priority": "high",
    "phases": [
      "P1"
    ],
    "attributions": [
      "execution",
      "gate"
    ],
    "problem": "设计结构问题在签名门禁才暴露，修改后需要重新签名和人工确认。",
    "actions": [
      "在设计签名前复用章节与契约 schema 校验，输出缺失章节及字段路径。",
      "为 side_effect 提供与门禁一致的可执行模板，验证 type/command/expect 的组合。"
    ],
    "acceptance": [
      "历史标题和 side_effect 错误在签名前被准确指出；有效设计不被误判。",
      "预检通过的同一份设计不再因相同结构问题被 P1 拒绝。"
    ],
    "benefit": "减少设计结构返工和重复确认。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P1",
        "reason": "DFX 章节被标题识别影响，side_effect 结构不符合要求。",
        "result": "修正标题与结构并重新签名后 P1 通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_design.py / lib/gatelib.py / workflow_preflight.py",
    "regressionEvidence": "2026-10-09：DFX 标题回归、真实 P1 CLI 签名与篡改拒绝通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-02",
    "title": "统一组件路径基准与规则摘要",
    "priority": "high",
    "phases": [
      "P1",
      "P2"
    ],
    "attributions": [
      "execution",
      "gate"
    ],
    "problem": "契约按源码根写路径，门禁按组件 Git 根比较；规则变更后的摘要也可能未同步。",
    "actions": [
      "由实际 Git 根生成路径基准，在 P1 验证 allowed_paths 与改动文件可对齐。",
      "规则更新后自动生成或校验覆盖清单摘要，并明确报告版本不一致。"
    ],
    "acceptance": [
      "20 个合法改动被误判越界的历史案例正确通过，真实越界仍被拒绝。",
      "规则摘要不一致在执行前给出具体差异，不靠人工猜测。"
    ],
    "benefit": "减少路径误判和工具版本不同步导致的重走。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P2",
        "reason": "allowed_paths 与组件 Git 根基准不同。",
        "result": "改为组件仓相对路径后 20/20 文件通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P2",
        "reason": "路径及 guard_sha256 同步问题。",
        "result": "修订后 P2 通过；三次 FAIL 不能逐次分配。",
        "scope": "snapshot",
        "confidence": "inferred"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_develop.py / lib/workflow_checks.py / build_ruleset_coverage.py",
    "regressionEvidence": "2026-10-09：20 个路径 A/B；遍历与跨组件范围拒绝；545 条规则摘要一致",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-03",
    "title": "适配 OpenHarmony 文件与测试宏",
    "priority": "high",
    "phases": [
      "P2",
      "P3"
    ],
    "attributions": [
      "gate",
      "rule"
    ],
    "problem": "合法配置格式和 HWTEST 宏被通用扫描器误判。",
    "actions": [
      "按配置解析语义识别 *_plugin_config，定向处理许可证头规则，保留字节卫生检查。",
      "测试注册扫描覆盖 HWTEST/HWTEST_F/HWTEST_P 及对应声明形式。",
      "将真实上游样例和错误样例纳入扫描器回归。"
    ],
    "acceptance": [
      "合法 plugins:N 首行不被要求插入破坏格式的内容。",
      "9 个已编写契约用例能准确识别；缺失用例仍报错。"
    ],
    "benefit": "减少门禁识别错误，保留有效约束。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P2",
        "reason": "配置文件被错误要求添加许可证头。",
        "result": "定向适配后卫生检查通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P3",
        "reason": "HWTEST_F 未识别，authored 被算成 0。",
        "result": "扩充识别后 required=9、authored=9。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_test_develop.py / file_hygiene_guard.py",
    "regressionEvidence": "2026-10-09：HWTEST 注册、插件计数格式及普通文件许可证对照通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-04",
    "title": "隔离探针并保护依赖仓文件",
    "priority": "high",
    "phases": [
      "P0",
      "P2",
      "P4"
    ],
    "attributions": [
      "execution",
      "gate"
    ],
    "problem": "临时链接探针写入真实源码路径，造成跨组件头文件损坏。",
    "actions": [
      "探针和桩头只允许写入独立临时目录，显式限制输出根。",
      "运行前后检查组件仓及依赖仓的差异，发现新增的范围外改动立即停止并留证。",
      "恢复文件时先识别已有改动归属，不自动覆盖用户工作。"
    ],
    "acceptance": [
      "模拟探针不能覆盖源码仓头文件。",
      "越界写入被检测并保留文件差异；正常探针不改变依赖仓。"
    ],
    "benefit": "避免环境被测试过程破坏，减少无关组件编译失败。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P4",
        "reason": "真实 hisysevent.h 被探针替换成桩头。",
        "result": "经授权恢复真实头文件后构建成功。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/workflow_checks.py: run_job / _git_snapshot",
    "regressionEvidence": "2026-10-09：隔离目录、依赖覆写、脏改动保留、范围外新增与超时子进程回归通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-05",
    "title": "验证链接接口并覆盖构建目标矩阵",
    "priority": "high",
    "phases": [
      "P1",
      "P4",
      "P8"
    ],
    "attributions": [
      "execution",
      "code",
      "gate"
    ],
    "problem": "头文件可见未证明库符号可链接，本地设备目标成功也未覆盖远端 host 目标。",
    "actions": [
      "对新增跨组件接口核对实际链接库的导出符号和目标依赖，保存检查证据。",
      "从 BUILD.gn 与 CI 目标关系确定受影响矩阵，公共源文件覆盖设备及相关 host/MinGW 构建。",
      "将本地目标通过、其他目标未验证分别呈现，避免扩大结论。"
    ],
    "acceptance": [
      "未导出符号案例能在正式链接前定位到目标库。",
      "unique_fd.h 的跨目标包含链案例在对应 host 目标被提前发现。"
    ],
    "benefit": "减少链接返工和本地通过后才暴露的远端编译缺陷。",
    "sourceCases": [
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P4",
        "reason": "手动链接引用 unwinder 未导出的符号。",
        "result": "改用可用 ELF 数据及本地 demangle 后继续。",
        "scope": "context",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P8",
        "reason": "后续 MinGW 目标经包含链找不到 unique_fd.h。",
        "result": "调整实现所在编译单元后后续 CI 通过。",
        "scope": "later",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/workflow_checks.py: validate_plan / symbol_check",
    "regressionEvidence": "2026-10-09：导出/未定义符号与声明 MinGW 漏项对照通过；实际跨平台目标待本次 AR 配置和实测",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-06",
    "title": "前移真实代码质量检查",
    "priority": "medium",
    "phases": [
      "P2",
      "P3",
      "P4",
      "P8"
    ],
    "attributions": [
      "code",
      "gate"
    ],
    "problem": "函数规模、特殊成员等真实缺陷在昂贵构建或远端 CI 后才发现。",
    "actions": [
      "在开发和测试开发阶段运行无需完整构建的度量与规则检查。",
      "依赖编译数据库的 AST 检查保留在构建后，结果明确列出规则、位置及处理范围。",
      "为已出现的远端 codeCheck 缺陷建立本地样例，并注明本地覆盖范围。"
    ],
    "acceptance": [
      "过长函数、空读取循环和特殊成员缺项的历史样例被正确拦截。",
      "本地检查未覆盖的规则明确显示，不宣称 CI 等价。"
    ],
    "benefit": "使真实缺陷更早暴露，减少重走成本。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P4",
        "reason": "特殊成员及 override 存在真实告警。",
        "result": "修代码并重走后通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P8",
        "reason": "Parse 过长、空读取循环被远端 codeCheck 拒绝。",
        "result": "拆分函数并修改循环后静态检查通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P4",
        "reason": "源文件过长、测试辅助类特殊成员不完整。",
        "result": "分别调整实现和辅助类；末次修复发生在旧快照后。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/workflow_checks.py: stage_checks",
    "regressionEvidence": "2026-10-09：P2/P3/P4 早期规则、规模检查及工具就绪接入；原有质量回归通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-07",
    "title": "修正规则语义与静态检查范围",
    "priority": "high",
    "phases": [
      "P2",
      "P3",
      "P4",
      "P8"
    ],
    "attributions": [
      "rule",
      "gate"
    ],
    "problem": "路径、旧代码和文件名分类导致静态检查误报，真实告警与误报混杂。",
    "actions": [
      "对 header-guard 使用仓库相对路径，定向修复可复现误报。",
      "P4 接入改动行范围，并明确哪些规则需要按整个文件判断。",
      "按文件实际语义检查部件描述，保留安装路径的验证。",
      "敏感词触发项先核实规则要求与测试语义，不能统一当作误报。"
    ],
    "acceptance": [
      "路径不同的同一合法头文件不产生环境相关误报。",
      "未改旧代码告警单列，本次真实问题仍阻断。",
      "信任名单不被误作部件描述；真正描述错误仍报错。"
    ],
    "benefit": "降低规则误判，维持质量检查的可信度。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P4",
        "reason": "header-guard 将机器绝对路径带入规则判断。",
        "result": "与真实告警分开处理后通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P4",
        "reason": "clang-tidy 超时或将旧代码告警混入。",
        "result": "调整范围与执行配置后继续。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260923-resmon",
        "phase": "P8",
        "reason": "后续 No.bundle.002 把信任名单源文件误作部件描述。",
        "result": "改源文件名后静态检查通过；旧 P8 两次 FAIL 的原因仍未知。",
        "scope": "later",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P3",
        "reason": "WordsTool 检查触发测试文本。",
        "result": "调整文本后通过；是否误报需具体核实。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_build.py / code_ruleset_guard.py / file_hygiene_guard.py",
    "regressionEvidence": "2026-10-09：组件相对保护宏、实际 Git 改动行、新测试与 JSON 语义回归通过；敏感词阻断保留",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-08",
    "title": "在阶段前验证工具可执行性",
    "priority": "high",
    "phases": [
      "P0",
      "P4"
    ],
    "attributions": [
      "environment",
      "gate"
    ],
    "problem": "工具缺失或执行能力不足在构建结束后才暴露，浪费前置工作。",
    "actions": [
      "按阶段实际需求探测 lizard、clang-tidy、ninja 和编译数据库生成能力。",
      "保存工具路径、版本、执行结果及规则覆盖范围。",
      "对未执行、超时和发现真实问题使用不同结果类别。"
    ],
    "acceptance": [
      "缺少度量依赖在正式 P4 前被明确指出。",
      "工具未执行不能显示为静态检查通过。",
      "探针不会自动下载或改变工具链。"
    ],
    "benefit": "减少新环境中的依赖失败及误导性通过结果。",
    "sourceCases": [
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P4",
        "reason": "lizard 当时缺失，度量步骤不能完成。",
        "result": "安装工具后继续；是否占用独立 FAIL 无逐次证据。",
        "scope": "context",
        "confidence": "inferred"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_build.py / lib/workflow_checks.py: tool_check",
    "regressionEvidence": "2026-10-09：缺工具、报错、超时、旧/损坏 JSON 与真实发现对照通过；未执行 AST 不放行优化模式",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-09",
    "title": "验证设备、xdevice 配置和目标 ABI",
    "priority": "high",
    "phases": [
      "P0",
      "P5",
      "P6",
      "P7"
    ],
    "attributions": [
      "environment",
      "gate"
    ],
    "problem": "服务端可达不代表设备可用；配置能写出不代表框架识别；产品名也不能确定设备 ABI。",
    "actions": [
      "进入设备阶段前探测指定目标可列出、可执行命令。",
      "校验生成的 xdevice 配置及实际设备识别结果。",
      "对待推送 ELF 和实际用户态进行 ABI 核验，记录设备变化。",
      "设备不可用进入等待状态，恢复后关闭对应等待记录。"
    ],
    "acceptance": [
      "Empty targets、零设备配置及 ABI 不匹配在执行前被准确区分。",
      "设备恢复不会留下过期等待状态。",
      "不固定宣称 rk3568 必为某个位数。"
    ],
    "benefit": "减少新人环境配置失败和无效上机尝试。",
    "sourceCases": [
      {
        "runId": "20260923-resmon",
        "phase": "P5",
        "reason": "hdc 服务端可达但设备列表为空。",
        "result": "恢复设备后 P5 通过；快照另有未关闭等待。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P5",
        "reason": "xdevice 配置缺节点；测试程序与当时设备 ABI 不匹配。",
        "result": "修配置和构建后继续；会话前后位数描述不一致，需实际核验。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_test_ut.py / lib/workflow_checks.py: device_checks",
    "regressionEvidence": "2026-10-09：environment/device XML、真实 ELF 头与远端配置验证回归通过；真机识别待实测",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-10",
    "title": "检查测试隔离与状态恢复",
    "priority": "medium",
    "phases": [
      "P3",
      "P5",
      "P7"
    ],
    "attributions": [
      "code",
      "execution"
    ],
    "problem": "用例共享全局状态，使结果受执行顺序或重复运行影响。",
    "actions": [
      "在测试开发检查中列出每个用例修改的全局开关和清理策略。",
      "对相关用例做重复、乱序或独立执行验证。",
      "将状态污染样例加入测试框架回归。"
    ],
    "acceptance": [
      "mini-debug 开关污染案例不再随执行顺序改变结果。",
      "失败用例退出路径同样恢复状态。"
    ],
    "benefit": "减少偶发单测失败，提高复验一致性。",
    "sourceCases": [
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P5",
        "reason": "用例受同进程先前 mini-debug 状态影响。",
        "result": "保存恢复开关后快照内单测最终 0 失败。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/workflow_checks.py: run_isolation / run_job",
    "regressionEvidence": "2026-10-09：失败退出仍清理、状态复验及旧/损坏/失败测试报告拒绝通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-11",
    "title": "在设计时证明设备用例可触发",
    "priority": "high",
    "phases": [
      "P1",
      "P6"
    ],
    "attributions": [
      "design",
      "gate"
    ],
    "problem": "契约声明了设备验收事件，但目标板缺少可用的运行时触发链。",
    "actions": [
      "P1 为每个设备用例填写触发入口、观察信号、依赖材料和失败注入路径。",
      "针对依赖板端机制的用例先做小型可触发性探针。",
      "依赖不存在时在签名前明确设计缺口，并重新选择可实现路径。"
    ],
    "acceptance": [
      "缺热重载入口的 DC-7/DC-8 在设计阶段被识别。",
      "正常功能与预期失败注入各有可复现证据。"
    ],
    "benefit": "避免到 P6 才发现验收路径无法执行。",
    "sourceCases": [
      {
        "runId": "20260923-resmon",
        "phase": "P6",
        "reason": "配置重载及失败事件用例缺运行时触发路径。",
        "result": "实现自轮询热重载、回 P2 重走后 P6 通过；两次 FAIL 无法逐次分配。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/workflow_checks.py: validate_plan / stage_checks",
    "regressionEvidence": "2026-10-09：每个 DC 触发计划与可执行失败注入校验；真实 P1 执行探针夹具通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-12",
    "title": "统一真机证据的生命周期",
    "priority": "high",
    "phases": [
      "P6"
    ],
    "attributions": [
      "execution",
      "gate"
    ],
    "problem": "变量转义、监控状态、PID 来源和重复重启让证据与存活实例脱节。",
    "actions": [
      "提供 nonce 参数传递和场景初始化模板，执行前验证展开结果。",
      "部署与场景只保留一次受控重启，记录启动实例和捕获窗口。",
      "优先使用 hilog 行头 PID，并在实例存活时采集进程及产物证据。"
    ],
    "acceptance": [
      "日志正文含其他 pid 时仍定位到正确实例。",
      "旧实例标记与退出进程被准确识别。",
      "4 个真机用例及 provenance/artifact_loaded 证据可重复通过。"
    ],
    "benefit": "减少功能正确但取证失败的重试。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P6",
        "reason": "nonce 误转义、监控表已满、取错 PID 及双重重启。",
        "result": "修场景、PID 解析和重启时序后 P6 通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_device_func.py / lib/device.sh",
    "regressionEvidence": "2026-10-09：nonce 转义、双 owner、单次重启与正文 PID 对照通过；存活实例证明保留",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-13",
    "title": "校验套件、启动路径和结果回收",
    "priority": "medium",
    "phases": [
      "P5",
      "P7"
    ],
    "attributions": [
      "execution",
      "gate"
    ],
    "problem": "漏传契约套件、启动路径变化和回收目录假设造成拒绝或报告缺失。",
    "actions": [
      "从契约推导必需套件集合并比较本次传参。",
      "启动包装器固定程序名与工作目录并留证。",
      "对 hdc 回收目录做真实小型探针，使用本次报告索引定位结果。"
    ],
    "acceptance": [
      "缺一个必需套件在执行前报告，完整集合通过。",
      "额外目录层级能正确定位本次结果，旧报告不能混入。"
    ],
    "benefit": "减少参数遗漏和测试已跑却无法验证的失败。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P7",
        "reason": "漏传一个必需测试套件。",
        "result": "补齐套件后 9 个用例通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P7",
        "reason": "程序路径不对、hdc 回收多一层目录。",
        "result": "修启动和回收路径后 P7 通过。",
        "scope": "snapshot",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_integration.py / gate_test_ut.py / lib/device.sh / lib/workflow_checks.py",
    "regressionEvidence": "2026-10-09：固定程序/目录、本次嵌套报告、回收唯一 token 与旧报告拒绝回归通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-14",
    "title": "区分上库停点、CI 等待与平台故障",
    "priority": "low",
    "phases": [
      "P8"
    ],
    "attributions": [
      "execution",
      "gate",
      "external"
    ],
    "problem": "人工确认、尚未触发 CI、代码缺陷和外部故障被混记，导致盲目修代码或重复跑门禁。",
    "actions": [
      "分别记录预期确认停点、CI 未开始/排队、真实代码失败和平台异常。",
      "预检命令校验分支及参数组合，明确下一步所需条件。",
      "远端结果绑定提交 SHA；仅对已确认临时平台或传输故障限次重试。"
    ],
    "acceptance": [
      "正常确认停点不计入可避免缺陷率。",
      "旧提交的绿色 CI 不能放行新提交。",
      "E01/ecotest 平台故障不会被自动归因到功能代码。"
    ],
    "benefit": "作为次要上库流程改进，减少无效重试与错误修复；保留真实 CI 约束。",
    "sourceCases": [
      {
        "runId": "20260922-fd-leak-detection",
        "phase": "P8",
        "reason": "预检前置条件、CI 触发、真实 codeCheck 和容器异常交替出现。",
        "result": "分别处理后最终 P8 通过；四次 FAIL 不能一一对应。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260924-hiperf-symbol-mem",
        "phase": "P8",
        "reason": "预期预检停点及尚无覆盖当前提交的绿色 CI。",
        "result": "旧快照仍 FAIL，后续会话才完成。",
        "scope": "snapshot",
        "confidence": "confirmed"
      },
      {
        "runId": "20260923-resmon",
        "phase": "P8",
        "reason": "后续仍有 ecotest 平台异常。",
        "result": "附件结束未见最终 P8 PASS。",
        "scope": "later",
        "confidence": "confirmed"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：gate_upload_ci.py / lib/workflow_checks.py: ci_failure_category",
    "regressionEvidence": "2026-10-09：代码缺陷优先、等待、E01 与未知 ecotest 分类回归通过；原有 SHA/时效门禁保留",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  },
  {
    "id": "WF-15",
    "title": "补齐逐次归因与优化效果记录",
    "priority": "high",
    "phases": [
      "P0",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8"
    ],
    "attributions": [
      "unknown",
      "gate"
    ],
    "problem": "仅有阶段累计次数，无法把根因、修改和复验逐次关联；优化效果也无法可靠量化。",
    "actions": [
      "每次门禁保留原始理由、证据序号、根因类别、修改和同门禁复验。",
      "预检发现的问题同样留记录，避免仅移动失败统计位置。",
      "改进项更新提交、回归结果和后续运行对比后才标为效果已验证。",
      "历史缺失继续标未知，不用后续事件反推旧失败。"
    ],
    "acceptance": [
      "新 FAIL 都可追踪到原始证据和复验。",
      "首次通过率、已知原因复发及返工耗时有可比较口径。",
      "无真实复验记录的改进项不能标为效果已验证。"
    ],
    "benefit": "支持定期优化并判断实际收益。",
    "sourceCases": [
      {
        "runId": "20260923-resmon",
        "phase": "P2",
        "reason": "缺逐次原因。",
        "result": "保持未知。",
        "scope": "unknown",
        "confidence": "unknown"
      },
      {
        "runId": "20260923-resmon",
        "phase": "P3",
        "reason": "缺逐次原因。",
        "result": "保持未知。",
        "scope": "unknown",
        "confidence": "unknown"
      },
      {
        "runId": "20260923-resmon",
        "phase": "P7",
        "reason": "缺逐次原因。",
        "result": "保持未知。",
        "scope": "unknown",
        "confidence": "unknown"
      },
      {
        "runId": "20260923-resmon",
        "phase": "P8",
        "reason": "旧快照两次 FAIL 原因不能由后续事件确认。",
        "result": "保持未知。",
        "scope": "unknown",
        "confidence": "unknown"
      }
    ],
    "status": "implemented",
    "owner": "workflow 维护",
    "changeRef": "仓库实现：lib/gatelib.py / lib/workflow_checks.py / workflow_preflight.py",
    "regressionEvidence": "2026-10-09：逐次失败、预检次数保存、修复与复验关联通过；真实效果未标为已验证",
    "effectEvidence": "",
    "updatedAt": "2026-10-09"
  }
];

export const priorityLabels = {high:'高',medium:'中',low:'低'};
export const statusLabels = {planned:'待优化',in_progress:'优化中',implemented:'已实现 · 待验收',verified:'效果已验证',deferred:'暂缓'};
export const attributionLabels = {execution:'执行核对',gate:'门禁机制',rule:'检查规则',code:'真实代码缺陷',environment:'环境依赖',design:'设计可执行性',external:'外部 CI',unknown:'证据不足'};
export const scopeLabels = {snapshot:'快照阶段证据',context:'阶段上下文，未证实计入 FAIL',later:'后续会话，不能倒推旧 FAIL',unknown:'逐次原因未知'};
export function filterPlans(items, filters = {}) {
  const q = (filters.query || '').trim().toLocaleLowerCase();
  return items.filter(p =>
    (!filters.priority || p.priority === filters.priority) &&
    (!filters.status || p.status === filters.status) &&
    (!filters.phase || p.phases.includes(filters.phase)) &&
    (!filters.attribution || p.attributions.includes(filters.attribution)) &&
    (!q || [p.id,p.title,p.problem,p.benefit,...p.actions,...p.acceptance,...p.sourceCases.flatMap(c=>[c.runId,c.phase,c.reason,c.result])].join(' ').toLocaleLowerCase().includes(q))
  );
}
export function validatePlans(items) {
  const ids = new Set();
  for (const p of items) {
    if (!p.id || ids.has(p.id)) throw new Error('改进项编号缺失或重复');
    ids.add(p.id);
    if (!priorityLabels[p.priority] || !statusLabels[p.status]) throw new Error(p.id + ': 优先级或进度无效');
    if (!p.phases.length || p.phases.some(s=>!/^P[0-8]$/.test(s))) throw new Error(p.id + ': 阶段无效');
    if (!p.title || !p.problem || !p.actions.length || !p.acceptance.length || !p.sourceCases.length) throw new Error(p.id + ': 缺少行动或证据');
    if (p.sourceCases.some(c=>!scopeLabels[c.scope])) throw new Error(p.id + ': 证据口径无效');
    if (['implemented','verified'].includes(p.status) && (!p.changeRef || !p.regressionEvidence)) throw new Error(p.id + ': 缺少实现或回归证据');
    if (p.status === 'verified' && !p.effectEvidence) throw new Error(p.id + ': 缺少效果验证证据');
  }
  return true;
}

// 离线样例评估不等同于真实运行的失败率下降。
export const offlineAssessment = {
  "evaluated_at": "2026-10-09",
  "method": "隔离进程 A/B，模拟历史失败机制；clang 输出使用确定性夹具，不是 OHOS 构建或完整会话重跑",
  "historical_gate_attempts": 90,
  "historical_gate_failures": 37,
  "misleading_rejection_scenarios": 8,
  "before_misleading_rejections": 8,
  "after_misleading_rejections": 0,
  "scenario_reduction_percent": 100.0,
  "unsafe_status_scenarios": 2,
  "negative_controls": 6,
  "cases": [
    {
      "id": "dfx-heading",
      "category": "misleading_rejection",
      "description": "DFX 章节标题冲突",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "component-paths",
      "category": "misleading_rejection",
      "description": "20 个组件路径被源码根前缀误判",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "plugin-config",
      "category": "misleading_rejection",
      "description": "插件计数配置被要求添加注释",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "hwtest",
      "category": "misleading_rejection",
      "description": "HWTEST_F 注册被漏识别",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "relative-header",
      "category": "misleading_rejection",
      "description": "保护宏被绝对工作区路径影响",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "xdevice-environment",
      "category": "misleading_rejection",
      "description": "远端 xdevice 配置缺 environment",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "hilog-pid",
      "category": "misleading_rejection",
      "description": "正文 PID 覆盖 hilog 行头",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "nested-report",
      "category": "misleading_rejection",
      "description": "本次测试报告多一层目录",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "clang-error",
      "category": "unsafe_status",
      "description": "执行报错被当作工具未安装",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "clang-timeout",
      "category": "unsafe_status",
      "description": "检查器超时没有结构化阻断",
      "before_expected_behavior": false,
      "after_expected_behavior": true
    },
    {
      "id": "ordinary-license",
      "category": "negative_control",
      "description": "普通无扩展文件仍需许可证",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    },
    {
      "id": "malformed-plugin",
      "category": "negative_control",
      "description": "损坏插件计数仍拒绝",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    },
    {
      "id": "bare-suite",
      "category": "negative_control",
      "description": "只写套件名而未注册仍拒绝",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    },
    {
      "id": "invalid-dfx",
      "category": "negative_control",
      "description": "DFX 缺可测试性仍拒绝",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    },
    {
      "id": "real-special-member",
      "category": "negative_control",
      "description": "真实特殊成员函数问题仍阻断",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    },
    {
      "id": "stale-report",
      "category": "negative_control",
      "description": "旧运行报告仍不能代替本次报告",
      "before_expected_behavior": true,
      "after_expected_behavior": true
    }
  ],
  "actual_run_failure_reduction_percent": null,
  "limitations": [
    "样例按失败机制计数，不能分配到历史 37 次 FAIL；同一次 FAIL 可包含多个原因。",
    "提前发现真实缺陷不算消除缺陷；预检 FAIL 与原始门禁 FAIL 均保留。",
    "设备、完整构建、MinGW、远端 CI、真实状态隔离需要后续真实运行。",
    "不承诺 100% 真实门禁通过率；外部平台和未知原因不能由这次本地改动消除。"
  ]
};

export const realRunAssessment = {
  "evaluated_at": "2026-10-10",
  "run_id": "20261009-fd-leak-detect",
  "baseline_run_id": "20260922-fd-leak-detection",
  "optimization_policy_observed": true,
  "checker_matches_repository": true,
  "causal_effect_proven": false,
  "new_run": {
    "gate_attempts": 45,
    "gate_failures": 13,
    "gate_failure_rate": 0.28888888888888886,
    "preflight_attempts": 50,
    "preflight_failures": 4,
    "preflight_issues": 6,
    "all_recorded_failed_attempts": 17,
    "review_holds": 5,
    "ci_wait_failures": 1,
    "other_gate_failures": 7,
    "failure_fixes_recorded": 0,
    "preflight_fixes_recorded": 0
  },
  "same_task": {
    "old_attempts": 32,
    "old_failures": 13,
    "old_failure_rate": 0.40625,
    "gate_failure_count_reduction_percent": 0.0,
    "combined_failure_count_reduction_percent": null,
    "old_pre_upload_failures": 9,
    "new_pre_upload_failures": 2,
    "old_pre_upload_attempts": 27,
    "new_pre_upload_attempts": 33,
    "pre_upload_failure_count_reduction_percent": 77.77777777777779,
    "pre_upload_effective_seconds_old": 20006,
    "pre_upload_effective_seconds_new": 14531,
    "pre_upload_effective_time_reduction_percent": 27.366789963011094,
    "phase_rows": [
      {
        "phase": "P1–P4",
        "old_failures": 5,
        "new_failures": 0
      },
      {
        "phase": "P5–P7",
        "old_failures": 4,
        "new_failures": 2
      },
      {
        "phase": "P8",
        "old_failures": 4,
        "new_failures": 11
      }
    ],
    "effective_seconds_old": 38575,
    "effective_seconds_new": 23696,
    "effective_time_reduction_percent": 38.57161373946857,
    "wall_seconds_old": 40657,
    "wall_seconds_new": 55433
  },
  "historical": {
    "run_count": 3,
    "gate_attempts": 90,
    "gate_failures": 37,
    "failure_rate": 0.4111111111111111,
    "failures_per_run": 12.333333333333334
  },
  "limitations": [
    "历史运行没有同等预检统计，不能计算总失败减少率。",
    "同类任务、相同模型不代表需求范围、源码版本、设备和 CI 条件相同；单次样本不能证明因果。",
    "没有登记修复动作；后续 PASS 只证明重跑通过，不能确定改了什么。",
    "不删除确认停点、等待或重复失败；调整口径仅作为额外分析。"
  ]
};
