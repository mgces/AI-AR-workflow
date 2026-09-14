# 交给 Qwen3.8 等模型的实施提示词

返回 [总方案](index.md)。将下面提示词和本目录一起交给实施模型。
这里的模型名称是用户指定的目标实施模型，本方案不依赖该模型独有 API。

版本1.1：还必须阅读 [RAG、工程初始化与调试扩展](rag-environment-debug.md)。共26任务、64验收。

## 1. 可直接粘贴的主提示词

```text
你是本项目实施工程师。请按 docs/reference/dsh-cloud-platform-v1/index.md
及同目录 contracts.md、implementation-tasks.md、acceptance.md、rag-environment-debug.md 实施DSH云端编排平台。

用户目标：
云端部署 DSH；用户用网页访问，通过自己电脑的 Connector 调用本地
OpenCode 或 Claude Code；本地通过 SSH 的 Workspace Gateway 读写远端源码、
运行构建/测试/门控。一期执行本仓 AR P0–P8，展示完整审核产物、
阶段耗时、人工介入、真实token、当前失败/等待原因、成功次数和人工输入。
新增一期要求：工程初始化先明确OpenHarmony/HarmonyOS-system/HarmonyOS-chip，
按统一profile走不同编译、测试、产物/设备和发布验证；增加云RAG模型/知识库入口，
以及本地产物和设备识别调试入口。

不得把未知环境默认归OpenHarmony；HarmonyOS占位profile/Gerrit未实现要补齐并实测。
不得用RAG决定环境或PASS，引用必须回SSH当前源码核验；embedding独立计量。
不得靠文件扩展名/设备名字判兼容，多设备必须明确选择，识别动作不能自动刷写。

先执行：
1. 读取适用 AGENTS.md，git status，确认真实仓库路径，保留用户修改。
2. 阅读总方案 §3、contracts §1/2 和 task-plan.json，确认现有 runtime 边界。
3. 创建或读取实施状态记录；不要把已有的 `verified_substeps` 重置为 not_started，按 task-plan.json 拓扑顺序继续执行。
   T21–T25是新增ID，不能简单按数字放到T20交接之后。
4. T00 必须用真实 DSH 和两个本地 codeagent 验证远端工具限制与 SSH 访问；
   没有真实结果就不能宣称此架构已接通。
5. 只读取当前任务及依赖需要的源码，不把全部 skills 一次塞入上下文。

禁止：
- 不以模型自由文本/工具返回成功/网页按钮替代 Python gate + advance 的 PASS。
- 不重写 runtime/dsh-ohos 成第二套 AR 状态机，不使用 dsh-workflow 的旧数据库。
- 不把 codeagent 悄悄移到 SSH 主机；第一期验收要求本地进程+远端工具。
- 不从云直连用户电脑入站端口，不上传用户 SSH 私钥或本地 codeagent 登录凭据。
- 不让 DSH/codeagent 自行调用有效 consent；必须真实用户审核绑定的不可变产物。
- 不用任意字符串 token 充当云审批，不让 worker 访问 HMAC/pipeline写权限或发布凭据。
- 不从 DSH tokenMeter、终端字符数、模型自述推算成“真实消耗”。
- 不把断网/进程未知当已停止，不清锁后重复构建/发布。
- 不跳过 P6/P7 真机/质量或 P8 CI，不写假日志，不人工重签证据。
- 不发明上游 API；查固定版本 types/OpenAPI 并先写小探测。
- 不把本方案 JSON 草案直接当可安装 DSH 配置。

每个任务：
先报当前任务/依赖/验收项；对协议和状态变更先写必要测试；
按 implementation-tasks.md 指定位置实现；
运行相关测试和既有回归；修复失败；完成后写 task report。
一个批次保持小范围，超过 8 个源码文件或500行非生成变更就拆子步，
但不能为了粒度限制遗漏完整功能。

上下文不足时：
把当前 task/substep、运行命令/进程身份、未提交文件、schema版本、
已完成验证、阻塞原因和下一步存入实施状态文件。
新会话先读该文件和 Git diff，再接着做，不重复已启动的外部作业。

任务 verified 的依据：
完成条件+实际测试命令+结果+AC证据。配置成功不是调用成功，
协议夹具不是真实宿主，真实宿主成功不是 AR P0–P8 完成。
缺环境时将相关项 blocked，继续无依赖的工作；不得把未知改成PASS。

完成整个项目时：
提供可部署服务、用户端/SSH端安装器、两个适配器、workflow包、
完整网页、接口/数据迁移/运维手册，以及AC01–AC64验收证据。
真实云部署、密钥配置、SSH安装、源码变更和PR发布在执行前核对用户的实际授权范围。
```

## 2. 单任务提示词模板

```text
本轮只完成任务 <T-ID> 的子步 <A/B/C>，依赖状态见 implementation-status.json。
读取：
- 当前任务定义；
- contracts.md 对应章节；
- 指定源码与相关测试；
- 上一个子步报告。

输出：
1. 当前事实和需要修改的行为。
2. 最小代码变更。
3. 实际验证命令和结果。
4. task/substep 状态与证据引用。
5. 下一步或明确 blocker。

不能用后续假实现、mock业务成功、放宽gate或虚构上游接口通过测试。
如果发现方案接口与固定版本不兼容，产出可复现 probe 和 ADR，
在不破坏用户目标与安全/证据边界的前提下修正适配实现。
```

## 3. 建议执行上下文包

每次派发包含 task_packet.json：
task_id、substep、goal、dependencies、read_files、allowed_write_roots、
forbidden_actions、contract_refs、expected_outputs、acceptance_ids、
test_commands、current_blockers、max_retries、resume_notes。

对 AR 业务 worker，额外包含 authority_run/task/attempt/revision/lease、
签名设计/允许变更范围、阶段所需技能片段、远端工具及产物路径。
不要把云平台实现任务的 T00–T25 与业务 AR 的 P0–P8 混成一套阶段。

上下文包必须留有输出/工具往返余量，建议初始输入不超过模型上下文窗口的50%；
实际模型容量由provider配置确认。硬性契约/安全边界不可因预算被裁掉。
若必需内容超预算，拆任务，不删护栏。

## 4. 实施状态文件模板

建议文件：`products/dsh-cloud-implementation/implementation-status.json`。
其中命令/引用只保存脱敏内容，不存凭据：

```json
{
  "schema_version": 1,
  "design_version": "1.1",
  "active_task": "T00",
  "active_substep": "A",
  "status": "not_started",
  "baseline_commit": "e65dd9a5afd9d736d261bceb95b60d4eda123cf1",
  "version_lock_ref": null,
  "verified_tasks": [],
  "running_operations": [],
  "changed_files": [],
  "checks": [],
  "blockers": [],
  "next_action": "读取当前仓库状态和T00，建立真实版本能力探测"
}
```

running_operations 必须在实际启动时更新，包含 operation_id、主机别名、Supervisor身份和状态。
恢复前查询这些作业，禁止同命令再执行一次来“确认”。

## 5. 缺失部署参数

实施开始时逐步收集，避免一次向用户问全部技术细节：

| 参数 | 获取时机 | 无参数时可继续的工作 |
|---|---|---|
| DSH/SDK精确版本与本地安装 | T00 | 读代码/契约；探测未完成不得进入适配实现验收 |
| 云域名、主机、OIDC、TLS | T10/T16 | localhost集成、容器镜像、手册 |
| 用户SSH profile和专用测试目录 | T00/T05 | 路径/RPC单测；真实SSH验收等待 |
| OHOS组件/目标/设备 | T11/T19 | 控制器夹具；真机/完整AR验收等待 |
| 云模型profile和本地可用模型 | T00/T09 | 协议测试；真实调用必须补齐 |
| Git平台/Issue/分支/发布授权 | T19 | P8预检；没有授权不得执行发布 |
| 数据留存/正文上云范围 | 首次workspace绑定 | 采用总方案默认私有与明确内容类别，用户确认后开始传输 |

## 6. 完成判定

只有 T20 verified 且真实业务验收完成才报告“一期可用”。
中间阶段准确报告“接入可用”“审核可用”“真实AR验收待完成”等实际范围。
不能用模型自主评分替代 acceptance.md。
