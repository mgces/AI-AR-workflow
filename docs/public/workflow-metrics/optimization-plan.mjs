// 进度只随仓库中的实现和验收证据更新，不在浏览器中临时改写。
export const planUpdatedAt = '2026-10-18';
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
    "title": "上库流程复用 PR、恢复检查点与区分等待",
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
      "远端结果绑定提交 SHA；仅对已确认临时平台或传输故障限次重试。",
      "相同上传计划重复 dry-run 复用原签名确认记录；代码或上传目标变化仍需重新确认。",
      "创建前查询同一源仓/分支及目标仓/分支的已有 PR，409 时重新查询核验后恢复，身份不明则阻断。",
      "推送前 fetch 并检查分支关系；非快进提前阻断，不自动强推或改代码。",
      "保存带签名和 SHA 绑定的上传检查点；缺评审报告时等待，重跑从已有 PR 继续。",
      "CI pending 单独记录 WAIT/INFO，默认 120 秒查询间隔；next/resume 给出恢复命令，真实红灯仍 FAIL。"
    ],
    "acceptance": [
      "正常确认停点不计入可避免缺陷率。",
      "旧提交的绿色 CI 不能放行新提交。",
      "E01/ecotest 平台故障不会被自动归因到功能代码。",
      "连续重跑不会重复创建 PR 或推送，也不会重复累计同一确认停点。",
      "查询失败、错误 PR/仓/分支、篡改检查点及旧 SHA 均不得被当作已成功上传。",
      "CI 等待变绿后才能 PASS；等待记录与真实失败分开保留。"
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
    "changeRef": "仓库实现：gate_upload_ci.py / advance.py / lib/workflow_checks.py",
    "regressionEvidence": "2026-10-10：16 项 P8 回归，含真实本地 Git 远端、已有 PR/409 恢复、签名检查点篡改、等待变绿与红灯、SHA/PR 身份拒绝；完整 workflow 回归通过",
    "effectEvidence": "",
    "updatedAt": "2026-10-10"
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

// 本批仅补充复盘与后续验收任务；单次修复记录不代表 workflow 机制已实现。
const caseFor = (runId, phase, reason, result, scope='snapshot') => ({runId,phase,reason,result,scope,confidence:scope==='unknown'?'unknown':'confirmed'});
const followUps = [
  {
    id:'WF-16', title:'固定格式化工具、配置与 P3 改动范围', phases:['P2','P3'], attributions:['gate','rule','environment'],
    problem:'新运行仍出现异架构 clang、缺少项目格式配置和 P3 全文件检查历史内容的问题；已有用例数量满足也不代表卫生检查通过。',
    actions:['工具解析先执行 --version，排除不能在当前主机运行的预编译工具；显式记录格式配置来源。','对已跟踪文件复用 Git 改动行范围，新文件检查全文；独立呈现 authored 与 hygiene 结果。','将真实命中规则、文件和行号写入门禁结果；不能通过改名或放宽真实规则掩盖缺陷。'],
    acceptance:['异架构工具、缺配置、未修改版权行和新增非法内容分别得到正确结果。','已满足 authored 的 P3 失败能准确指向其他失败检查，修复后同检查复验。'],
    sourceCases:[caseFor('20261014-hitrace-source-completeness','P2','修复记录先指出选中了异架构 clang，后指出缺少项目配置而采用 LLVM 默认风格。','前一修改后仍 FAIL；使用项目风格并格式化改动行后记录 resolved。'),caseFor('20261014-hitrace-source-completeness','P3','required=16 authored=16 仍失败；修复记录指出全文件 hygiene 把旧内容计入当前改动。','复用 P2 Git 行范围后记录 resolved；不能据此确认所有部署环境已更新。'),caseFor('20261016-hicollie','P3','required=3 authored=3；whole-file hygiene 命中既有 BUILD.gn 版权行。','当次改写版权行后 PASS，仍需验证门禁范围而非要求每次改历史内容。'),caseFor('20261013-fd-leak-detect','P2','8 次 P2 失败包含 style_ok=False、改动范围越界及规则命中；首条格式/规则修改复验仍 FAIL。','保留实际规则与格式问题，后续部分重跑通过但未登记修改。')]
  },
  {
    id:'WF-17', title:'核对构建产物、符号工具与静态检查输入', phases:['P4'], attributions:['gate','environment','code'],
    problem:'构建返回成功仍有测试产物缺失、符号未匹配和 clang-tidy 阻断；编译数据库规模与符号反解工具也影响结果。',
    actions:['构建前核对设备、UT、MST 目标及实际输出路径，构建后逐项验证产物。','记录 nm/反解器版本，先比较原始符号身份，再解释 GNU/LLVM 模板空格差异；真正缺符号仍阻断。','为真实目标依赖生成编译数据库，分开报告超时、工具失败和可定位代码告警。'],
    acceptance:['缺产物、真正缺符号与仅反解格式不同的夹具得到不同诊断。','大编译数据库场景能完成真实目标检查；真实告警保留规则、位置及复验。'],
    sourceCases:[caseFor('20261014-hitrace-source-completeness','P4','修复记录涉及 GNU/LLVM 反解模板空格、3.8GB 编译数据库超时和 22 条后续告警。','前两次修改后报错变化；后续别名、所有权和路径处理后记录 resolved。'),caseFor('20261013-fd-leak-detect','P4','14 次失败包含缺 UT/MST 产物、导出符号未匹配及多轮 clang-tidy。','最终阶段通过，但多数条目未登记修复；不能把全部诊断归为误报。'),caseFor('2026-10-15-hiview-resmon','P4','多次 rc=1 且 libresmon.z.so 缺失；另一次构建成功但 clang-tidy 有 11 项。','快照记录后续重跑通过，未登记对应修复，根因需补编译与告警明细。')]
  },
  {
    id:'WF-18', title:'证明测试真正执行并写出契约结果', phases:['P5','P7'], attributions:['gate','environment','execution'],
    problem:'新报告目录不等于测试已执行；多次 tests=0，或 13/16 用例覆盖，实际原因涉及设备配置、XML 初始化顺序和设备不兼容旧用例。',
    actions:['执行前验证 xdevice 设备节点和 ELF ABI，并运行最小启动探针。','在 InitGoogleTest 前配置 XML 输出；回收后校验 testcase 节点、契约用例身份和本轮报告索引。','设备能力不匹配的旧用例需要明确依据和跳过记录；不得跳过本次契约用例来获得通过。'],
    acceptance:['空目录、空 XML、进程提前退出和真实零失败报告可被区分。','契约用例全部出现在真实报告中，跳过项不被算作通过；保留 stdout、退出码与报告路径。'],
    sourceCases:[caseFor('20261016-hicollie','P5','tests=0 的修复记录先涉及 xdevice 配置，后涉及 gtest XML 未写出及设备不兼容旧用例提前退出。','配置修改后仍失败；显式 XML 与适用性处理后记录 resolved。'),caseFor('20261014-hitrace-source-completeness','P5','实际 13 个用例通过，但契约 16 个中缺三个 E2E testcase。','在 InitGoogleTest 前配置输出目录后记录 resolved。'),caseFor('2026-10-15-hiview-resmon','P5','先无本轮报告、测试目标构建失败，后 tests=0、契约覆盖 0/10。','最后重跑通过但未记录修复；不能从 tests=0 单独推断具体根因。'),caseFor('20261013-fd-leak-detect','P5','两次 tests=0 且契约 0/13；P7 另有无新报告和一条真实失败。','后续通过但未记录动作，应分别保留执行、回收与真实断言失败。'),caseFor('20261009-fd-leak-detect','P5','旧复盘运行曾有 tests=0、契约 0/10，且该运行历史被重新初始化覆盖。','当前快照后续通过；不能把不完整历史当成完整成本或已验证优化效果。')]
  },
  {
    id:'WF-19', title:'部署前探测能力并验证加载实例', phases:['P1','P6','P7'], attributions:['execution','environment','gate'],
    problem:'文件传输输出混入路径、设备缺命令、服务不自动重启或触发进程过早退出，导致新产物未被实际加载或取证错过窗口。',
    actions:['部署前探测设备命令、服务管理入口与权限；路径解析只接受预期字段。','替换前保存归属与回滚信息，验证大小和摘要、可执行位、重启结果及实际加载映射。','场景只指定一个生命周期负责人，记录启动 PID 并核对 /proc/exe；保持进程存活至取证完成。'],
    acceptance:['混杂传输输出、缺 tr、无自动重启、错误执行位和多个同名进程都能给出具体阻断。','摘要正确但未加载、旧 PID 与提前退出不得通过；失败可恢复测试前状态。'],
    sourceCases:[caseFor('20261016-hicollie','P6','修复记录依次指出 file recv 输出污染 readlink 路径、设备没有 tr、hiview 未重启及执行位缺失。','前三步修改后仍 FAIL 或报错变化；延长触发进程与调整 trace 写入后才记录 resolved。'),caseFor('20261014-hitrace-source-completeness','P6','pidof 同时匹配主进程及 fork 的异步工作进程。','保存启动 PID 并验证 /proc/exe 后记录 resolved。'),caseFor('20261013-fd-leak-detect','P6','两次证据分别缺运行标记、产物来源与加载证明；预检另报部署和场景同时负责重启。','后续通过但多数修改未登记；保留观察结果，不臆测全部根因。'),caseFor('2026-10-15-hiview-resmon','P6','场景退出 1；重跑后 marker/runtime 为真，但 provenance/artifact_loaded 为假。','后续通过未登记动作，应补齐加载实例证据。')]
  },
  {
    id:'WF-20', title:'为 trace 采集建立就绪与落盘条件', phases:['P1','P6','P7'], attributions:['design','environment','execution'],
    problem:'空闲设备、刚重启服务及 trace 会话窗口影响实际落盘；标记存在不代表 E2E 文件已生成。',
    actions:['将会话就绪、有效时间范围、写入量和落盘产物分开观测，记录受控触发步骤。','为设备支持的锁与失败注入建立真实最小探针，不假设多行远端 shell 保持文件描述符。','只有已识别的采集时序问题可限次重试，每次保留失败证据，其他原因继续阻断。'],
    acceptance:['空闲设备与服务重启后首次采集均验证文件、时间窗口及来源。','锁竞争与失败注入由真实设备探针证明；重试不会掩盖持续缺产物。'],
    sourceCases:[caseFor('20261016-hicollie','P7','首次只有一页且首尾时间相同，dump 删除文件；增加 400 条 trace 写入后仍 FAIL。','等待首个会话结束 12 秒并重试一次，记录 resolved；仅限该已证明时序。'),caseFor('20261014-hitrace-source-completeness','P1','DC-AGE 触发与失败注入先遇到设备 flock 只支持 fd，后遇到远端多行 shell 未保持锁 fd。','采用匹配部署摘要的原生 ARM 探针后预检记录 resolved。')]
  },
  {
    id:'WF-21', title:'隔离每批测试并按归属恢复共享状态', phases:['P5','P7'], attributions:['execution','gate'],
    problem:'新运行仍有重复/乱序/独立验证失败和 state-after 未恢复；trace 产物跨批污染，粗粒度清理可能删掉原有夹具。',
    actions:['为每批测试分配独立目录与归属日志，区分运行前已有文件和任务创建文件。','成功、失败和中断路径都执行恢复核验，清理只作用于本批明确拥有的产物。','保留重复、乱序与独立执行的真实非空报告，不能用清空共享目录代替隔离。'],
    acceptance:['连续批次、失败退出及中断后 state-before/state-after 一致，外部夹具保留。','用例单独与组合运行结果一致，清理范围可以审计。'],
    sourceCases:[caseFor('20261014-hitrace-source-completeness','P7','修复记录指出性能 trace 泄漏到下一批，旧按数量清理又破坏既有状态。','归档失败证据、批次目录轮换并约束当前归属日志后预检 resolved。'),caseFor('20261013-fd-leak-detect','P7','两次预检 state-after 报测试后共享状态未恢复；P5 也多次出现重复/乱序/独立报告问题。','后续同检查通过，但没有修复动作登记，不能确认与 hitrace 同根因。')]
  },
  {
    id:'WF-22', title:'复核上库恢复机制的实际部署与 PR 时序', phases:['P8'], attributions:['gate','external','execution'],
    problem:'既有恢复机制标为已实现，新记录仍出现已有 PR 的 409、缺评审报告和 PR head 暂时未更新，需要验证运行端版本与恢复路径。',
    actions:['运行结果登记门禁版本、检查器摘要和恢复检查点版本，先核对实际使用的是哪份实现。','409 后重新查询并严格核对源/目标仓与分支；PR 元数据暂旧只允许有证据的限次查询。','真实远端代码红灯、CI 等待、预期授权停点分别保留，修复后的新 SHA 必须重新验证。'],
    acceptance:['已有 PR 和短暂旧 head 不重复创建 PR、不强推，持续身份不符仍阻断。','远端真实规则失败保留问题、修改与新提交复验，不因本地通过而放行。'],
    sourceCases:[caseFor('2026-10-15-hiview-resmon','P8','快照末尾缺 pr-review-report，并两次尝试创建已有 !4607 的 PR 得到 409。','快照仍受阻且未登记修复；这是机制复发线索，不能确认该运行使用了新版恢复代码。'),caseFor('20261014-hitrace-source-completeness','P8','PR head 暂旧；另有真实远端规则失败，修复记录涉及函数长度、测试常量、路径和 Python assert。','head 后续一致记录 resolved；远端代码修复仍 pending_verification，不能标为已验收。'),caseFor('20261013-fd-leak-detect','P8','5 次预期停点、PR head 不匹配与真实远端代码红灯同时存在。','保持分项统计；后续 PASS 不足以替代每条修改与复验。')]
  },
  {
    id:'WF-23', title:'补齐新导入历史的缺失原因与复验记录', phases:['P0','P1','P2','P3','P4','P5','P6','P7','P8'], attributions:['unknown','gate'],
    problem:'unwinder、hdc、data-clean 三次运行共 54 次失败没有具体原因；加上旧 resmon 的 5 次，当前共 59 次缺原因。很多新失败仅重跑通过但无修改登记。',
    actions:['按运行与阶段补录可验证的原始证据、根因、修改及同检查复验；不能从门禁名称推测原因。','摘要自动读取当前快照和本浏览器导入；未复盘的新版本明确列为待人工复盘。','阶段级线索、次数未知、缺失历史与逐次 FAIL 分开展示，保留历史指标。'],
    acceptance:['每份新导入都出现在运行复盘中；同一 ID 的新版本不会沿用旧版本已复盘结论。','缺日志的 54 次保持未知，补证据后可追溯；重跑 PASS 不能自动标记为修复已验证。'],
    sourceCases:[caseFor('20260923-unwinder-memcpy','P4','该运行 30 次失败涉及 P0/P2–P8，当前只有阶段计数，均缺具体原因。','待补原始日志；不能根据阶段推测为编译或代码缺陷。','unknown'),caseFor('20260921-hdc-client-diagnostics-compatible','P5','P2 有 4 次、host CLI P5 有 2 次失败，均没有原始原因。','共 6 次保持未知，待补 host 执行与开发门禁证据。','unknown'),caseFor('20260921-data-clean-mode','P4','18 次失败中 P4 占 11 次，所有阶段均缺具体原因。','只能确认计数，不能把 11 次 P4 直接归因为编译错误。','unknown')]
  }
];
plans.push(...followUps.map(p => ({...p,priority:'high',status:'planned',owner:'workflow 维护',changeRef:'',regressionEvidence:'',effectEvidence:'',updatedAt:'2026-10-18',benefit:'把新运行中观察到的问题转为可复验的后续改进，减少无证据的重复尝试。'})));

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
  "recording_quality": {
    "status": "incomplete",
    "initialization_count": null,
    "note": "2026-10-10 提供的 session 第 7027–7052 行确认：环境摘要变化后，同一 run-id 强制重新初始化；此前设计和开发历史未保留在当前指标中。P1 的 56 秒、P2 的 46 秒、P3 的 13 秒为重新初始化后累计记录，不能代表完整任务耗时。暂停据此计算耗时及失败减少度。"
  },
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
    "gate_failure_count_reduction_percent": null,
    "combined_failure_count_reduction_percent": null,
    "old_pre_upload_failures": 9,
    "new_pre_upload_failures": 2,
    "old_pre_upload_attempts": 27,
    "new_pre_upload_attempts": 33,
    "pre_upload_failure_count_reduction_percent": null,
    "pre_upload_effective_seconds_old": 20006,
    "pre_upload_effective_seconds_new": 14531,
    "pre_upload_effective_time_reduction_percent": null,
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
    "effective_time_reduction_percent": null,
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
    "2026-10-10 提供的 session 第 7027–7052 行确认：环境摘要变化后，同一 run-id 强制重新初始化；此前设计和开发历史未保留在当前指标中。P1 的 56 秒、P2 的 46 秒、P3 的 13 秒为重新初始化后累计记录，不能代表完整任务耗时。暂停据此计算耗时及失败减少度。",
    "历史运行没有同等预检统计，不能计算总失败减少率。",
    "同类任务、相同模型不代表需求范围、源码版本、设备和 CI 条件相同；单次样本不能证明因果。",
    "没有登记修复动作；后续 PASS 只证明重跑通过，不能确定改了什么。",
    "不删除确认停点、等待或重复失败；调整口径仅作为额外分析。"
  ]
};
