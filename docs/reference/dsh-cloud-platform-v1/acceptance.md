# 验收矩阵与上线判定 v1.1

返回 [总方案](index.md)。每项状态初始为 not_run。本文不是测试结果，设计交付不代表系统已实现。

## 1. 证据等级

- L0 静态：schema/类型/源代码和文档一致性，只证明结构。
- L1 本地集成：真实 DB、OS 进程、临时 SSH/文件系统，输入可使用标明合成的夹具。
- L2 真实宿主：真实 DSH、OpenCode、Claude Code、用户登录与 SSH 主机。
- L3 真实业务：实际 OHOS 编译、测试、真机、质量、PR/CI 与人工审核。

L0/L1 不可替代 L2/L3。业务验收必须用可追溯原始日志，不能由模型生成 PASS 文件。
历史文档中的测试数量不复制到新报告；记录本次命令与本次实际结果。

## 2. 验收环境

至少：一台 Linux 云服务器、两个独立测试用户、两套本地 Connector（允许隔离虚拟机）、
两种本地 codeagent、一个 Linux SSH 源码主机上的独立工作区、可用 OHOS 编译/测试环境、
真实设备、经授权的测试仓/Issue/分支/PR/CI。

发布验收前明确测试目标和人工授权，P8 预检包必须完整；不能把真实生产发布作为无审批的测试。
缺设备/账号/CI 时对应项标 blocked，仍可完成其他独立测试。

## 3. 测试项

| ID | 主题 | 操作/注入 | 必须观察到的结果与证据 |
|---|---|---|---|
| AC01 | 上游 DSH 真接入 | 固定版本 DSH 启动、加载插件、调用一个结构化工具，卸载后重启 | ready/版本/调用结果/生命周期日志；不能只用 fake registry |
| AC02 | 两种本地 codeagent | 分别启动 OpenCode 与 Claude Code，记录本地 OS 进程与实际模型 ID | 两种真实输出、PID 所在主机、版本/凭据模式；不可用标 unsupported |
| AC03 | 本地 Agent 操作 SSH 代码 | 本地 agent 读取远端 sentinel、CAS 修改、远端命令输出 hash | 本地没有代码副本，远端变化对应 operation；本地越界工具被拒 |
| AC04 | 交互/取消/恢复/usage 探测 | 制造权限请求和追问、拒绝一次、取消运行、按 checkpoint 恢复 | 实际回调与事件、停止证明、resume 级别和 usage coverage 矩阵 |
| AC05 | 既有 runtime 回归 | 运行原 runtime 测试及变更影响的 Python/MCP 测试 | 原能力未被破坏；记录实际数量，不沿用旧文档 70/70 |
| AC06 | workflow 校验 | 加载合法独立 workflow，再试循环/缺 hash/改 AR 审核点 | 合法包可装，非法包拒绝；不是硬编码一个网页流程 |
| AC07 | workflow 版本固定 | 启动 v1 后发布 v2，重启旧 run | 旧 run 使用 v1 digest、skills、gate；新 run 可用 v2 |
| AC08 | AR 权威边界 | codeagent 返回 success、伪造 PASS JSON、直接修改云 phase | 都不能推进；仅 gateway 核验的 gate/advance 生效 |
| AC09 | 能力与任务隔离 | 假报 native_subagent/remote tools，交叉提交其他 attempt | 能力探测不足或凭据/revision/epoch 不符均拒绝 |
| AC10 | 启动崩溃窗口 | 分别在 intent 提交前后、OS 启动后结果写前 kill supervisor | 同 operation 不重复启动；已存在作业被恢复或标 unknown |
| AC11 | 租约与孤儿进程 | 构建派生孙进程，断开 worker，过期后请求新任务 | 保持锁与隔离；停止所有后代并验证后才允许重领 |
| AC12 | 全入口共享锁 | API、旧 CLI、相邻包含路径和别名同时发构建/repair/reset | 同源树/输出/设备只有一个可变操作；其余明确等待 |
| AC13 | 构建输入绑定 | 在构建启动前后改 dirty/untracked 文件或组件仓 HEAD | start digest 不符拒绝；执行中漂移使门控结果不可接受 |
| AC14 | 取消完成证明 | DSH cancel/网页 cancel 后检查本地 agent 与远端作业树 | 未证明退出时 cancelling/unknown；不能仅凭 kill 返回码释放 |
| AC15 | 文件系统边界 | ../、绝对路径、UNC、符号链接切换、陈旧 patch | 越界不可读写，CAS 冲突保留用户变更 |
| AC16 | 适配器事件契约 | 两适配器用真实响应录制夹具回放文本/工具/问题/usage/result | 统一字段且保留来源；未知版本 fail closed，不解析终端 UI |
| AC17 | NAT/浏览器关闭 | 只允许本地出站 443 与 SSH，关闭浏览器 | Connector 保持工作，重新登录能续看；无本地公网端口 |
| AC18 | 事件重放与乱序 | 断网后重复/乱序发送事件、ACK 丢失、重连 100 次 | 关键事件不丢、状态不回跳、次数/token 不翻倍 |
| AC19 | 凭据吊销 | 复制旧配对码、旧连接 epoch，吊销设备后发任务 | 不能新派发/重连；已运行任务进入受管停止/对账 |
| AC20 | DSH 恢复 | 构建运行中重启 DSH worker/scheduler | 读取原 intent/session/authority，不重复创建构建 |
| AC21 | 阶段次序与 P8 HOLD | 跳过 P1 consent 请求 P2；P8 预检 raw FAIL | P2 不派发；预检显示等审核，publish 无审核不可达 |
| AC22 | 多用户正常路径 | 两个登录用户各绑定本地设备/workspace 并运行任务 | 各自看到自己的阶段、输入与模型，不串 session/配置 |
| AC23 | 跨租户攻击 | 替换 run/device/artifact/review IDs，通过 API/SSE/WSS/后台 job 读取 | 统一拒绝且审计；对象签名 URL 不可跨租户创建 |
| AC24 | 云/执行权限边界 | worker 尝试读 HMAC/SSH key、写 manifest、调用 parent/consent、直连发布 | 权限隔离阻止；DSH 容器无法读取宿主密钥/Docker socket；SSRF拒绝 |
| AC25 | repair/reset/attach | P4 失败按允许范围 repair→P2，行为变化 reset→P1；接续旧 run | 旧证据/审批失效范围准确、成本保留、权威状态一致 |
| AC26 | 完整产物审核 | 上传所有 required files、长报告、diff、图、测试 XML | 全部可全文查看/下载，hash一致，支持历史版本比较 |
| AC27 | 缺失/半截产物 | 中断上传一个审核必需文件，改变长度或 hash | bundle 未 sealed/审核禁用；不以摘要冒充完整 |
| AC28 | 预览安全 | 报告包含脚本、事件属性、外部实体和内网图片链接 | 无脚本/XXE/自动内网请求；原始文件下载受授权 |
| AC29 | 真实审批 | 登录审核人打开固定 bundle 并同意 | 保存 user/action/正文/版本；Gateway 验 receipt 后 applied 才推进 |
| AC30 | 审批过期/伪造/重放 | 打开后变更 diff/gate；伪造 receipt；同 nonce 用另一 run | 返回 stale/拒绝，无副作用；同请求重传只应用一次 |
| AC31 | 审批应用崩溃 | 在 receipt 保留后/consent 后/advance 后断进程 | inspect 对账确定是否已应用；不盲目 consent/advance 两次 |
| AC32 | 问答/权限/退回 | 请求澄清、工具授权拒绝、用户修订输入、退回设计 | 类别分离、原文版本保存、拒绝确实生效、不冒充 P8 consent |
| AC33 | 阶段时间 | 输入 P4 10分钟、重叠人工等待 2–5/4–6分钟，加未关闭区间 | 600/240/360 s；重走与 open wait 正确；legacy 不双加 |
| AC34 | 人工介入次数 | 同审批/回复通过 HTTP、WSS、CLI 重复回报 | 一个 human_action 计一次，待处理数和已介入数分开 |
| AC35 | token 对账 | 重复 message ID、累计 final、parent/child、cache 包含关系、reset | 无重复计量，例子总量 6000；历史成本保留 |
| AC36 | usage 缺失 | 断掉最终结果、只有主会话 usage、一个适配器无数据 | null/partial/missing_sources 可见；不以0或估算替代实测 |
| AC37 | 成功数/当前原因 | P8正常等待、阶段重走、run完成事件重放、多个blocker | 区分gate/阶段/run；仅真正complete算成功；当前原因有来源 |
| AC38 | 产品端到端 UI | 登录→绑定→选workflow/workspace/agent→运行→审核→结果 | 真实 API/SSE，不用预录日志；下一动作由后端准入决定 |
| AC39 | 弱网与正文完整性 | 大报告分页、刷新、断线、补输入后重连 | 全文可达、原文版本不丢、stale时间可见，无假完成 |
| AC40 | 从零安装 | 新云节点、Linux/WSL2用户电脑、SSH主机按手册安装 | 仅443公网开放、健康检查通过、版本锁可追溯 |
| AC41 | 升级与回滚 | 有等待审核/执行中任务时 drain，升级相邻协议版本再回滚 | 版本不兼容不新派发；旧run保持固定包；无数据覆盖 |
| AC42 | 备份恢复 | 从备份恢复空白云与网关副本，重建投影 | 记录实际 RPO/RTO，hash/cursor对齐，不覆盖更新远端状态 |
| AC43 | 资源/存储/外部故障 | 磁盘满、DB/S3不可用、SSH断连、CI已发布但回包丢失 | 关键数据不静默丢弃；未知状态隔离；发布先查SHA/PR再决定 |
| AC44 | 真实 AR P0–P8 | OpenHarmony、HarmonyOS-system、HarmonyOS-chip各完成独立真实run；两种本地codeagent均至少一条完整run | 真实源码/build/UT/设备/质量/GitCode或Gerrit验证/manifest/审批关联；缺环境不得代验 |
| AC45 | 跨阶段换 Agent | OpenCode 完成已验证阶段后停止并切换 Claude Code 继续 | 同 authority run、旧进程已停、新 attempt、上下文/成本独立 |
| AC46 | 交接可复现 | 另一实施者按版本、配置和手册复现核心流程 | AC到真实证据映射完整；未完成项显式列出并阻止不适用上线 |
| AC47 | 环境识别与人工确认 | 无标志/混合标志/三个真实工程分别进入初始化 | 只读探测证据可见；用户明确选三类；歧义或缺类型不启动编译 |
| AC48 | 编译验证三分支 | 三profile分别生成并执行其真实入口/产物/测试/发布计划 | OHOS build.sh、HMOS system/vendor按profile；不跨用产品/目录/后端 |
| AC49 | 预检缓存隔离 | 同源码切profile/产品/ABI/工具链/target，保留旧.build-probe-ok | 旧marker不能绕过新P0；init与真实预检状态区分 |
| AC50 | 测试runner分支 | native/ArkTS/混合contract分别验证，某环境缺runner | 用对应profile全部用例/新报告；缺配置明确阻塞不跳过 |
| AC51 | Gerrit完整发布 | system/chip预检同意后发布并模拟回包丢失、patchset改变 | 不调GitCode；按Change/commit查询及项目政策验证；旧审批/CI失效 |
| AC52 | 环境profile变更 | 运行中改变系统/产品/ABI/out_dir/关键runner | 停旧作业，重新环境确认与P0；旧证据/审批/产物匹配/RAG绑定失效 |
| AC53 | RAG服务与入口 | 配置真实embedding/reranker、探测端点、知识库检索 | 模型版本/维度真实；管理员权限和出站规则有效；实际页面入口 |
| AC54 | 源码索引增量 | 修改/重命名/删除/未跟踪文件、取消重建、更换embedding | 增量与新全量一致，active索引稳定；跨维度不混库 |
| AC55 | RAG数据隔离撤销 | 跨tenant查询、local_only/disabled源、撤回数据源后查缓存 | 召回前ACL过滤；不上传未授权源码/向量；撤销立即阻断读取 |
| AC56 | 检索引用核验 | 索引完成后改代码，再从DSH和两codeagent使用结果 | 路径/行/hash/版本齐全；stale回SSH重查；RAG不能生成PASS |
| AC57 | 识别效果验证 | ≥60源码核对问题，冻结20%验证集，与文本/符号基线比 | 报告Recall@10/MRR/引用/延迟；目标0.85且跨用户泄漏0；不删失败题 |
| AC58 | RAG与调试计量 | 重放索引/检索/embed/rerank/设备/匹配事件 | 生成token/embedding分账，rerank未知不填0；设备选择不双计人工 |
| AC59 | 设备发现选择 | 本地Windows/WSL/Linux与SSH端0/1/多设备/Offline/未授权 | 显示来源、真实属性与错误；多设备必须选择，重连复验 |
| AC60 | 产物识别来源 | ELF/so/ko/image/HAP及本地导入、文件后缀伪装 | 内容/ABI/profile/来源/hash核验；导入文件不冒充本run构建 |
| AC61 | 产物设备错配 | 产品/ABI/OS/profile/内核签名不符或unknown | 不自动部署；具体原因/证据可见；发现操作无刷写副作用 |
| AC62 | SSH产物本地真机 | 远端构建→本地传输→设备部署→gate运行时证据 | 各跳hash一致，nonce/uptime/实际加载满足原gate；公网无通用hdc端口 |
| AC63 | 三个产品入口 | 工程初始化→代码知识库/模型配置→调试中心→run | 全部真实API/状态；用户能识别当前环境、索引和产物设备关系 |
| AC64 | 三环境业务覆盖 | 三类真实独立AR完成，覆盖两种本地Agent，记录矩阵 | P0–P8与四审核/真实设备/各自发布验证齐全；缺HMOS不得宣称全支持 |

## 4. 六条完整验收剧本

### S01 首次用户接入

1. 管理员部署固定版本，验证 HTTPS/OIDC 和私有服务端口。
2. 用户 A 在网页生成配对码，在自己电脑确认 Connector 的调用范围。
3. 本地注册 OpenCode/Claude Code、SSH profile、远端代码根；看到能力实测及 unknown 项。
4. 用户在网页选择已登记 workspace，探测结果不含明文私钥/令牌。
5. 用户 B 登录，不能看到 A 的设备/任务/产物；B 独立绑定自己的 workspace。
6. 关闭 A 浏览器，已有任务仍由 Connector/SSH Supervisor 管理；重新登录恢复视图。

### S02 P1 设计到真实审核

1. AR 输入和环境/组件参数保存，创建唯一 run intent。
2. P0 真实探测，DSH 派发 P1 给本地 codeagent，远端生成设计。
3. Gate Runner 写签名证据；云显示 awaiting_review，不先开 P2。
4. 全文展示 AR_design、contract、构建产物列表和 gate 验证回执。
5. 用户打开 bundle v1 后，执行端重生成 v2；用户提交 v1 审批必须失败。
6. 用户审 v2 同意，receipt 绑定新 hash；远端 consent/advance 后 P2 才可启动。

### S03 P4 断线恢复与修复

1. Supervisor 落 intent、锁、输入指纹，真实启动构建。
2. 断开 WSS，再断 SSH；构建仍由远端作业持有资源锁。
3. 重启 DSH/Connector，请求相同 operation；不能重复构建。
4. 恢复连接，按 cursor 补日志和结果，核验启动源码和 gate entry。
5. 构建失败显示真实 error ref。修复在允许 v3 范围内先 repair 回 P2，
   重新开发/测试/编译；验收变化必须 reset 回 P1并重新审核。
6. 页面保留原失败、耗时、token及人工输入，成功后当前 blocker 关闭但历史不删除。

### S04 P8 不确定发布

1. 完成真实 P0–P7及各审核；P8只生成预检，展示完整 diff/目标/Issue。
2. 用户同意后 Gate Runner 才可获得指定发布操作能力。
3. 在远端 push 成功、返回云结果之前切断连接。
4. 云显示 needs_reconcile，不把网络失败当未发布。
5. 网关先查询 branch head/PR/CI；结果绑定预检内容和提交 SHA。
6. 不重复创建 PR/Issue或重复发布；CI绿且原gate/advance通过才算run完成。

### S05 指标与人工输入对账

1. 同一阶段输入明确的打开/关闭、重叠等待、retry、repair和reset事件。
2. 模拟ACK丢失重复回传，导入同一schema v2快照两次。
3. 准备两执行器的真实usage录制：重复ID、final覆盖、cache已计入input、缺最终output。
4. 从原始事件手算预期，用相同窗口对比UI、JSON、CSV；数据修订替换旧值。
5. 问答保存原文/修订/actor，审批重复只算一次；正文访问有角色约束。
6. 删除一个usage来源只影响完整性，不影响业务gate的PASS。

### S06 三环境与双适配器真实业务交付

1. 三个独立真实run分别覆盖OpenHarmony、HarmonyOS-system、HarmonyOS-chip，且OpenCode与Claude Code各至少完成一条。报告矩阵，不默认泛化全部2×3组合。
2. 每个run都记录codeagent在本地、代码和门控在SSH端的证据。
3. 实际通过P0–P8；每个P1/P6/P7/P8审核来自网页真实用户。
4. native/ArkTS按本环境contract全量验证，device nonce/加载/质量及GitCode CI或Gerrit patchset验证均绑定源码；不套用rk3568或GitCode规则到HarmonyOS。
5. 展示完整审核包与所有人工输入；usage实测缺失字段如实展示。
6. 由归档器生成脱敏产物，原始可验签证据留安全存储；不能人工重签。

### S07 RAG与工程初始化及本地调试

1. 工程识别出现歧义时用户必须确认代码类型；三类profile分别核验真实构建入口、产物目录、runner和发布后端。
2. 保留旧build-probe marker切环境，新P0必须重新验证；HarmonyOS缺配置/Gerrit不可用时明确阻塞。
3. 对授权组件创建真实RAG索引，检索代码；修改源码后旧结果标stale，DSH和codeagent使用前回SSH核验。
4. 两用户查询隔离，撤销数据源立即阻断向量/缓存读取；local_only不得上传片段和向量。
5. 从SSH端识别本run产物，本地发现多设备要求选择，兼容性未知/不符不部署。
6. 受控传输前后hash一致，实际部署与加载证据归正式P6/P7；手动导入只能advisory。
7. 查看知识库、模型服务、调试中心入口和独立RAG/设备维测，全部有实际数据。

## 5. 发布门槛

- T00–T25 的任务完成证据齐全，AC01–AC64 均有实际结果与来源；无需业务上下文的测试不能跳过。
- 核心安全、审批、执行幂等、原流程门控、完整审核与真实双适配器链路不得降级。
- token 部分未知允许如实展示，但两个适配器的正常成功调用都须有经过验证的可用usage路径；
  异常中断无法计全的限制须明确，不能宣称全量精确。
- 若真实 AR 最终质量阈值、设备访问或发布条件不具备，标“平台接入验收通过，AR业务验收未完成”，
  不标“一期完成”。
- 三类环境的完整profile与真实run都需覆盖；缺HarmonyOS源码/设备/Gerrit不得以OpenHarmony代验。RAG冻结验证集和本地产物/设备识别负向用例也是一期门槛。
- 关键故障不允许自动清锁或重派；手工处置必须记录实际进程停止证明与操作者。
- 上线容量目标做一次20连接/5并行run测试；AI/编译时长与平台自身延迟分开测。
- 未实测的平台（如原生Windows/macOS）不列为支持。

## 6. 证据报告格式

每项记录 id、status、level、版本锁、前置条件、实际步骤、实际命令、
observed、expected、artifact_refs、operator、UTC、缺失说明。
status=pass/fail/blocked/not_run，禁止仅写“已测试”。

证据文件建议：
`products/dsh-cloud-acceptance/<date>/<AC-ID>/result.json` 与脱敏摘要。
完整原始运行态存部署环境安全目录，不把密钥、用户输入全文、SSH地址、设备序列号或原始manifest拷进公开仓。
真实 AR 归档沿用本仓 archive_product.py；额外云审计导出另做权限控制和脱敏，不替代原签名证据。
