# 接口与数据契约 v1.1

返回 [总方案](index.md)。本文件定义平台新增接口，不是 DSH/Claude/OpenCode 的原生协议。
规范用词：必须=发布门槛；建议=可经 ADR 调整。时间 UTC RFC3339，时长以毫秒存储；展示时转换为秒。

v1.1增加工程环境profile、代码RAG与调试识别。新增完整接口、字段及事件见 [扩展契约](rag-environment-debug.md)；本文件原协议保持兼容，正式schema必须一并更新。

## 1. 目录与依赖方向

```text
platform/
  apps/web/                    React UI
  apps/api/                    REST、SSE、身份、审批、产物
  apps/scheduler/              durable intents、DSH run 生命周期
  apps/connector-gateway/      WSS 路由
  apps/projector/              事件投影与用量汇总
  apps/rag-worker/             云端增量索引与模型调用
  packages/rag/                检索、重排、引用核验
  packages/contracts/         JSON Schema、TS types、OpenAPI
  packages/dsh-bridge/         固定 DSH 版本的插件适配
  packages/workflow-registry/  包校验与版本锁
  packages/telemetry/          事件/usage/时间/阻塞归一化
  packages/testkit/            夹具和故障注入（明确非真实证据）
  migrations/
  deploy/compose/
  tests/integration/
  tests/e2e/
connector/
  src/adapters/opencode/
  src/adapters/claude-code/
  src/mcp/
  src/ssh/
  src/supervisor/
  src/outbox/
workspace-gateway/
  src/rpc/
  src/authority/
  src/supervisor/
  src/workspace/
  src/artifacts/
  src/security/
workflow-packs/ar-delivery/1.0.0/
runtime/dsh-ohos/               复用/兼容修改
skills/ohos-ar-dev-phases/       Python 唯一 gate/advance 权威
```

云端包不导入 runtime 的本地 SQLite/Python 实例；通过 Bridge API 调用 SSH 端 authority。
Gateway 才加载 runtime；core 不导入具体 workflow，delivery 与 requirement 不互相导入。
新增 TS 可以包装现有 JS，禁止为统一语言重写全部 gate。现有 MCP 工具名保持兼容。

## 2. 身份、命名与并发版本

所有外部 ID 为不透明 UUID/ULID，数据库键按 tenant 复合约束；SSH 真实路径不做 URL 标识。

| 字段 | 含义与权威 |
|---|---|
| tenant_id/user_id | 登录/设备注册上下文给出，忽略请求体自报值 |
| device_id | 用户绑定的 Connector |
| gateway_id/workspace_id | 受信 SSH Gateway 与注册工作区；远端真实绑定不可由模型覆盖 |
| cloud_run_id | 云端工作流实例 |
| authority_run_id | 原 runtime/Python run，通过 mapping 关联 |
| project_id/environment_profile_digest | 已确认工程/三环境profile，run固定，全部gate与发布共同使用 |
| workflow_digest/policy_digest | run 固定版本；升级不可原地替换 |
| revision | 原 runtime 返回的任务/流程修订值，云校验 expected_revision |
| phase_epoch | 平台按权威重开事件生成的稳定 ID，用于区分同一阶段重走 |
| attempt_id/lease_epoch | runtime 领取凭据上下文，云不自增 |
| operation_id | 一次实际副作用的幂等身份；重传必须复用 |
| connection_epoch | Connector 每次成功重连得到的信道 fence，不替代 task lease |
| resource_fence | SSH Supervisor 发放的工作区/输出/设备锁世代 |
| event_id/stream_id/producer_seq | 生产端 outbox 去重身份与单流顺序 |
| cloud_seq | 云端提交的递增序号；SSE 恢复游标，不能当成远端发生顺序 |

消息上的 signature 来自已登记设备/Gateway 公钥。网关认证后按绑定映射 tenant，不允许自行替换 signed envelope 的内容；云可信 metadata 与 original_envelope 分开存储。

## 3. Workflow manifest

使用 JSON Schema 2020-12；所有对象默认 additionalProperties=false。正式 manifest 必须包含：

- schema_version、workflow_id、version、digest、entry_adapter、display_name。
- source_lock：本仓 commit、skills hash、runtime hash、DSH兼容范围、gate 协议版本。
- input_schema、parameters_schema：schema 自身严格校验，拒绝任意代码字符串。
- stages[]：id、physical_phase、task_key、depends_on、required_capabilities、consent_kind、artifact_roles、timeout_policy、retry_policy。
- authority：adapter ID、状态/审核/完成映射，禁用自定义文本 PASS。
- observability：阶段/attempt/usage/人工输入 schema 版本与正常 HOLD 分类。
- execution_profiles：agent_location、workspace_access、publish mode。
- signature：管理员发布签名与 key_id。

安装时校验循环/丢失依赖/非法阶段/脚本路径逃逸/缺 hash/重复 ID。manifest 不允许覆盖 AR P0–P8 的 gate、consent 或 P8 拆分；更改这些属于新版 authority 及独立审查。

示例中的 digest=null、source_lock_status=pending_probe 明确表示草案，正式 loader 必须拒绝它。T02 替换为实测锁定值后产可安装包。

## 4. 平台 REST API v1

统一错误结构：
`{error:{code,message,retryable,correlation_id,details}}`。
所有变更请求要求 Idempotency-Key；保存 body digest，同 key 不同内容返回 409。
涉及现有 run/review 的写操作要求 expected_revision。所有列表分页、租户过滤及权限校验在后端完成。

| 方法/路径 | 作用 | 关键输入/结果 |
|---|---|---|
| GET /v1/me | 当前用户/角色 | 不返回访问凭据 |
| POST /v1/pairing-codes | 创建配对码 | 短有效期、一次性、请求速率限制 |
| POST /v1/devices/enroll | 兑换并登记设备公钥 | code、公钥、本地确认；返回设备证书/绑定 |
| GET /v1/devices | 我的 Connector | online、versions、last_seen、capabilities |
| POST /v1/devices/{id}/revoke | 吊销 | 拒绝新任务，触发受管停止 |
| GET /v1/workspaces | 可使用工作区 | device/gateway、能力、可见元数据 |
| POST /v1/workspaces/{id}/probe | 触发受限预检 | 不接受任意 SSH 地址/cwd |
| GET /v1/workflows | 可运行包 | version、digest、inputs、required capabilities |
| POST /v1/workflow-versions | 管理员装包 | 签名包、lock；非管理员 403 |
| POST /v1/runs | 新建意图 | workflow/version、workspace、agent、输入产物、环境/组件 |
| GET /v1/runs/{id} | 状态与最新权威投影 | current_stage、revision、staleness、blockers、next_actions |
| GET /v1/runs/{id}/events | SSE | Last-Event-ID=cloud_seq，断点补发 |
| POST /v1/runs/{id}/actions | pause/cancel/resume/retry/repair/reset | action、expected_revision、reason；后台验证当前状态 |
| POST /v1/runs/{id}/inputs | 人工输入 | kind、question_id、content、attachments、client_input_id |
| GET /v1/runs/{id}/inputs | 输入历史 | actor/time/revision，正文需权限 |
| GET /v1/runs/{id}/artifacts | 完整产物索引 | bundle_version、total_files、upload completeness |
| GET /v1/artifacts/{id}/content | 授权全文/范围读取 | ETag=sha256、Content-Range，禁止路径输入 |
| GET /v1/artifacts/{id}/download | 授权下载 | 短期 URL；不得将其他 tenant key 作为参数 |
| GET /v1/reviews/{id} | 审核内容 | bundle_digest、evidence_ref、expected_revision、required_files |
| POST /v1/reviews/{id}/decisions | 审批 | approve/reject/request_changes、bundle_digest、revision、comment |
| GET /v1/runs/{id}/metrics | run/阶段指标 | metrics_version、as_of_cursor、completeness |
| GET /v1/metrics | 按 workflow/model/用户/时间聚合 | 时间范围、去重口径、有效样本量 |
| POST /v1/runs/{id}/exports | 导出 | scope、include_inputs、redaction，异步生成私有 artifact |

run 创建请求示例字段：
`workflow_id, workflow_version, workflow_digest, workspace_id, device_id, agent_kind,
input_artifact_id, project_id, environment_profile_digest, environment, component_type?, device_type?, git_dir, build_target, part`。
服务端从已确认project取得environment/profile；请求体冗余字段冲突返回409，缺确认拒绝启动。可选rag_profile_id只选已授权检索范围，不改变工程身份。
DSH模型通过model_profile_id配置；embedding/reranker由独立rag_model_profile配置，不直接提交API key。

POST 返回 202 + operation_id 表示意图已接受，不表示完成或 gate PASS。
正常审核等待 200/202 + awaiting_review；409 表示版本/幂等冲突；422 表示能力/输入不满足；
423 表示资源隔离/锁占用；503 表示执行端暂不可达。

## 5. 云与 Connector 消息协议

连接为 WSS /v1/connect，设备证书 + 短期访问凭据。握手交换 protocol_version、
device_id、last_ack_by_stream、capability_digest、nonce。服务端返回 connection_epoch、
心跳/批大小/最大包限制及授权 workspace 列表。

一期建议：心跳 10 s，连接 30 s 无心跳标离线；事件批上限 128 条或 256 KiB；
单事件 256 KiB，正文/大日志使用 chunk/artifact；本地 spool 默认 2 GiB。
达到 80% 告警、100% 停止新任务。允许抑制重复调试日志，但必须写 gap 事件；禁止丢失审批、usage、结果和状态事件。

统一 Envelope：
```typescript
type Envelope = {
  protocol_version: 1;
  message_id: string;
  kind: "command" | "event" | "ack" | "heartbeat";
  correlation_id: string;
  device_id: string;
  workspace_id?: string;
  cloud_run_id?: string;
  authority_run_id?: string;
  operation_id?: string;
  attempt_id?: string;
  revision?: number;
  lease_epoch?: number;
  resource_fence?: number;
  connection_epoch: number;
  stream_id: string;
  producer_seq: number;
  occurred_at: string;
  payload: unknown; // 根据 type/kind 选择固定 schema，不接受任意调用
  payload_sha256: string;
  key_id: string;
  signature: string;
};
```

序号按 durable stream 而非临时 TCP 连接增长。ACK 为每 stream 的最高连续落盘序号；
发现洞则请求缺失范围。事件重复接收不重复投影，乱序结果不能超越尚未落盘的 operation.start。
epoch 过期的写命令拒绝；历史事件仍可按原 operation 接纳为 late observation，不能推进新 revision。

命令种类限定为：probe、authority.call（白名单）、agent.start/status/cancel、
workspace.operation、artifact.upload_request、human.response、reconcile。
云端不下发任意 shell 命令来启动本地进程。agent.start 只带 agent_profile_id 与任务上下文引用。

## 6. Operation 与状态迁移

### 6.1 OperationStart

```typescript
type OperationStart = {
  operation_id: string;
  task_id: string;
  attempt_id: string;
  revision: number;
  lease_epoch: number;
  workspace_id: string;
  source_snapshot_digest: string;
  environment_profile_digest: string;
  policy_digest: string;
  operation_kind: "workspace_patch" | "workspace_exec" | "gate" | "publish";
  action_ref: string; // 固定包定义的动作或已授权 remote-tools 类型
  args: Record<string, unknown>;
  timeout_ms: number;
  budget_reservation_id: string;
  approval_receipt_id?: string;
};
```

资源锁不能仅靠调用方声明：网关从注册工作区推导源树/组件仓/输出/设备/发布目标资源。
跨资源领取排序一致；获取失败不能只保留部分锁造成死锁。所有启动请求核验当前源码摘要；
构建执行期间需锁住输入，至少在收尾重新校验；检测非受管修改则 evidence_input_drift，不接受旧 PASS。

### 6.2 状态表

| 对象 | 状态 | 关键迁移 |
|---|---|---|
| project initialization | detecting/awaiting_environment_confirmation/profile_incomplete/ready_to_probe/probing/ready/blocked | init只写状态；真实P0签名通过才ready |
| cloud run | created/queued/running/awaiting_review/awaiting_input/paused/needs_reconcile/failed/completed/cancelled | completed仅来自对应环境的phase8权威完成 |
| stage projection | pending/running/validating/awaiting_review/passed/failed/invalidated | gate PASS 未 consent 时保持 awaiting_review |
| operation | accepted/starting/running/cancelling/completed/failed/cancelled/unknown | unknown 只能 reconcile；禁止直接 retry |
| review | preparing/open/decided/applying/applied/rejected/superseded/expired | decided 不等于 applied；只有 applied 可继续 |
| connection | online/degraded/offline/revoked | offline 不自动令 operation failed |
| usage record | provisional/final/partial/unavailable | final 修订替换 provisional，同 scope 不双加 |

云 run status 为派生状态，不替代 authority 的 current_phase。对账暂不可得时保留最后已验证阶段及 stale 标记。

### 6.3 核心事件

- run.created / run.authority_bound / run.reconciled / run.completed
- stage.opened / stage.invalidated / stage.completed
- attempt.claimed / attempt.expired / attempt.released
- operation.accepted / operation.started / operation.output / operation.ended / operation.unknown
- gate.result（含 verdict、entry_id、verification_receipt、源码绑定）
- artifact.declared / artifact.uploaded / artifact.bundle_sealed
- human.requested / human.responded / human.input_revised
- review.opened / review.decided / review.applied / review.superseded
- usage.observed / usage.reconciled / usage.unavailable
- connector.disconnected / connector.reconnected
- blocker.opened / blocker.resolved

gate.result 与 stage.completed 必须来自已授权 Gateway 签名回执；不能由 codeagent 事件生成。
run.completed 还要求 Python complete=true、phase8 最终证据验证通过。

## 7. 持久化模型

### 7.1 云 PostgreSQL

每个租户表都有 tenant_id、created_at；所有 FK 包含 tenant_id，所有后台 job 持有 tenant context。
表名为实施规范，字段可加索引但不能更改去重语义。

| 表 | 主要字段与唯一约束 |
|---|---|
| tenants/users/memberships | tenant/user/role，身份系统 subject 唯一 |
| devices/device_keys | owner_id、key_id、revoked_at、last_seen、capability_digest |
| workspaces | device_id、gateway_id、opaque workspace_ref、binding_digest、capabilities |
| workflow_versions | workflow_id/version/digest/manifest/lock，版本内容不可变 |
| runs | workflow digest、workspace、authority_run_id、revision、status projection、input_ref |
| run_authority_bindings | run_id、gateway_id、authority_run_id、authority_cursor，唯一绑定 |
| dispatch_intents | operation_id、run/task/revision、payload_hash、status、result_ref；同 key 不同参数拒绝 |
| execution_attempts | 原 attempt_id/lease_epoch、agent/provider/model、开始结束、checkpoint |
| phase_epochs | run、physical_phase、authority epoch key、revision、开始结束、invalidated_by |
| event_log | event_id、stream_id/producer_seq 唯一、cloud_seq、original_envelope、认证 metadata |
| outbox/projection_offsets | 事务 outbox、consumer cursor，投影可重建 |
| artifacts/artifact_bundles | source hash、view hash、size/mime、private object key、sealed digest、complete |
| reviews/review_decisions | expected revision、bundle digest、evidence entry、actor、decision、apply status |
| human_requests/human_inputs | kind/category、question/input id、正文引用、版本链、真实 actor |
| wait_intervals | request_id、phase_epoch、起止、category，重叠按并集 |
| usage_observations | provider session/turn/request ID、coverage、raw usage、normalized、version、completeness |
| blockers | code、source/ref、opened/resolved、is_expected、next_action |
| audit_log | actor/action/resource/content digest、request id、policy snapshot |

event_log 原文如包含敏感内容，应存加密对象引用；普通运维日志不带正文。SQLite 不做共享挂载。
云持久事件与 projection update 用事务/幂等消费；若 projector 崩溃，可用相同 cursor 重算。

### 7.2 远端与本地

远端沿用 runtime 数据库，新增 supervisor_operations、resource_locks、
authority_receipts、cloud_command_inbox、authority_event_outbox、approval_receipt_consumptions。
新增表使用版本迁移，不直接重建旧库；每 workspace 一个状态目录，主机共享锁库由可信服务管理。

本地 Connector SQLite：device metadata、command inbox、operation journal、event outbox、
stream ACK、agent session checkpoints。SSH 私钥不进数据库正文；只存 OS key store/ssh-agent 引用。

已有 operations 表是调用结果缓存，新 supervisor_operations 管执行生命周期，命名和用途必须分开。

## 8. 两种 Agent 的统一适配器

```typescript
interface CodeAgentAdapter {
  probe(profile: AgentProfile): Promise<CapabilityReport>;
  start(input: AgentStart): Promise<AgentHandle>;
  restore(checkpoint: AgentCheckpoint): Promise<AgentHandle | RestoreUnsupported>;
}
interface AgentHandle {
  execution_id: string;
  events: AsyncIterable<AgentEvent>;
  respond(requestId: string, response: HumanResponse): Promise<void>;
  cancel(reason: string): Promise<StopReceipt>;
  checkpoint(): Promise<AgentCheckpoint>;
}
```

AgentStart：cloud/authority run、task/attempt/revision/lease、context bundle、remote MCP endpoint 引用、
本地 sandbox id、agent profile、budget、可用工具白名单。不传其他用户凭据。

CapabilityReport：agent/version、adapter/version、agent_location、isolated_execution_context、
remote_file_tools、remote_exec、permission_roundtrip、question_roundtrip、cancellation、
resume_level、usage_level、observed_model_id、probe_evidence_refs。
值为 verified/unsupported/unknown + reason，不能用配置期望值冒充探测。

现有 native_subagent 需求改造：增加 isolated_execution_context，明确由 Connector 专用本地会话提供；
保留 legacy host_native 路径检查，不全局删除原保护。平台模式只能选择已验证 capabilities，不能用 MCP 参数自报越权。

OpenCode 默认 adapter 用受认证 loopback server，按 run 独立配置和会话；不暴露公网。
会话/message/permission/events 以启动服务实际 OpenAPI 为准保存兼容夹具。
Claude adapter 用本地 SDK、受限工具/权限 callback、明确挂载项目 skills/MCP 配置，不依赖“默认会加载”。
两者禁用未经托管的嵌套子代理；若启用，必须注册后代 session、usage scope、资源和 cancellation tree。

## 9. 审批回执

```typescript
type ApprovalReceipt = {
  receipt_id: string;
  tenant_id: string;
  user_id: string;
  cloud_run_id: string;
  authority_run_id: string;
  task_id: string;
  physical_phase: 1 | 6 | 7 | 8;
  revision: number;
  phase_epoch: string;
  evidence_entry_id: string;
  bundle_digest: string;
  source_snapshot_digest: string;
  environment_profile_digest: string;
  action: "consent";
  publish_target_digest?: string;
  decision: "approve";
  issued_at: string;
  expires_at: string;
  nonce: string;
  key_id: string;
  signature: string;
};
```

签名覆盖 canonical JSON，签名字段之外所有字段参与；正文意见另存且关联 decision_id。
远端校验签名/绑定/权限/当前证据，在锁域内将 receipt 验证、消费与执行意图持久化。
跨 SQLite 与 Python 文件修改不假设原子事务：intent → consume-reserved → consent/advance →
inspect → consumed/applied；崩溃靠 inspect 判断已应用还是需重试，同 receipt 不能授权新内容。
需在平台模式强化 Python CLI 身份验证/凭据边界，不能让持有任意字符串 token 的 worker 调用成功。

退回：不调用 consent，创建结构化修订请求。设计/行为/依赖变化 reset→P1；签名 v3 范围内实现修复 repair→P2。
旧 receipt 标 superseded；已经发生的发布不可通过“退回”撤销。

工具权限 HumanResponse 与此回执不同：绑定 permission request id、agent session、tool-call digest；
只批准该一次操作，不成为 P8 发布 consent。

## 10. Artifact 契约

Artifact：artifact_id、tenant/run/phase_epoch、relative_path、role、media_type、byte_length、
source_sha256、view_sha256、redaction_policy、producer_operation_id、evidence_entry_id、
source_revision、object_version、upload_status。
ArtifactBundle：bundle_id/version、sorted entries、digest、required_files、missing_files、
upload_complete、sealed_at、source_snapshot_digest。

上传分块必须逐块 hash，最终服务端计算 whole-file hash。
审核包密封后不可修改；修订新建版本。路径禁止 ../、绝对路径、Windows drive/UNC、
符号链接逃逸及同名规范化冲突。read/patch/collect 使用打开后边界校验或安全目录句柄；
不能只在操作前做字符串 startsWith。

Markdown、diff、JSON/XML、纯文本、PNG/JPEG/PDF提供预览；
二进制提供元数据和原始下载。XML 禁止外部实体，HTML 禁止活动脚本。
超限/拒绝上传必须明确标 missing/restricted，不能让摘要代替 required_files 完成审核。

原始 gate secret、账号 token、SSH key 不上传。敏感原文脱敏后 source_sha256 与 view_sha256 分别保存；
必要原文只能本地审核的情况按总方案记录本地查看回执。

## 11. 指标精确计算与例子

### 11.1 时间

每 phase_epoch 的 stage intervals 为 P，人工等待区间为 H。
wall_ms = duration(union(P))；
human_wait_ms = duration(union(H) ∩ union(P))；
effective_ms = wall_ms − human_wait_ms。
跨同阶段重走累计各 epoch，严禁重复导入同一份旧 workflow_metrics 快照。

例：P4 打开 10:00、结束 10:10，两次人工等待 10:02–10:05 与 10:04–10:06。
墙钟 600 s、等待并集 240 s、有效 360 s，不能扣 300 s。
旧 schema v2 时间作为 legacy view 保留；新增 ledger 以权威阶段事件划分 epoch，
同一 run 有旧采集和新采集时通过 source ownership 选择唯一来源，不相加。

跨主机时间只用于展示；执行区间使用同一 Supervisor 的 monotonic elapsed。
主机重启以 boot_id 切片；缺失区间标 estimated/unknown，不伪造精确时间。
指标卡带 as_of_cursor/data_quality，断线时仅墙钟继续，执行时长保持待对账。

### 11.2 人工次数

唯一介入 key = tenant/run/human_action_id。
review 决策成功写入一次，重复 HTTP/WSS/CLI 回报映射同 action。
blocked_unplanned 可在请求创建时记 pending intervention，回复更新该事件；
不得请求一次、回复再加一次。
初始需求是 input，但不自动算一次“异常人工介入”。自动探测/模型自答不计人工。

legacy consent 自记 required_workflow；云端审批回执映射此记录，不再相加。
若旧记录没有稳定 ID，导入时保存原文件版本与数组事件索引的映射，
对重写文件以不可变事件字段和关联 wait_id 对账；模糊项进入 reconciliation，不能猜重复数。

### 11.3 成功次数与成功率

- raw gate PASS/FAIL：按签名 entry_id 去重，保留 P8 consent-precheck 原始 FAIL。
- normalized gate failure：原始 FAIL 减已验证的正常 consent-precheck；非签名文本 HOLD 不参与扣减。
- stage_completion_count：权威 advance completion identity 去重。repair/reset 后以前完成保留历史，但当前有效阶段失效。
- run_success_count：每 authority run 首次 verified complete=true 计一次。
- run_success_rate：success / (success + terminal_failed)，同时单独展示 cancelled/active/waiting 数量；
  denominator=0 显示无样本，不显示 0%。
- 比较不同 workflow/model 时按固定版本、环境、组件、样本窗口分组；不把不同任务难度的总数当模型排名。

### 11.4 Token

UsageObservation 必需字段：
source=cloud_dsh/local_codeagent；
provider/model、executor/adapter version、session_id、turn_id、request_id、
scope=main_loop/child_session/inclusive_result、coverage_ids、accounting_mode=delta/snapshot、
raw_usage、normalized_usage、completeness、observed_at、event_id。

normalized_usage：
input_tokens_total、output_tokens_total、cache_read_tokens、cache_write_tokens、
reasoning_tokens、billed_total_tokens（可 null）、cost_estimate（可 null）。
cache/reasoning 是否包含在 input/output 由 versioned mapping 声明；不能无条件加到 total。

若同一 turn 有 3 个事件携带同 message_id，只算一个最终值。
若 final result 汇总覆盖 request A+B，不再把 A/B 与 final 相加：
选择 request ledger 或 result coverage ledger之一；后到修订以 replace 更新而非负数退款。
同层级总量没有可分阶段证据时记 stage=null/unattributed，不按比例编造。

例：DSH 实测 1000 input + 200 output；本地实测 4000 input + 800 output，
cache_read=3000 且已包含在 input 中。已知总消耗为 6000 token，不是 9000。
另一次中断本地调用无最终 output，则输出“已知至少 X、完整性 partial”，
不能补零宣称全部 token=6000。DSH 调用本地 agent 的外部结果不另算一遍本地 usage。

OpenCode usage 按固定版本响应 schema 采集；若所用协议未提供，则 unavailable + reason，
接口探测可切至经过验证的本地 server adapter，不从终端字符数估算为实测 token。

### 11.5 当前不成功原因

Blocker：
code、category、severity、is_expected、run/phase/attempt、origin、
evidence_ref/operation_id/question_id、first_seen/last_seen、resolved_at、resolution_event_id、next_action。
推荐 code：
AWAITING_REVIEW、AWAITING_INPUT、CONNECTOR_OFFLINE、SSH_UNREACHABLE、AGENT_AUTH_REQUIRED、
MODEL_RATE_LIMIT、RESOURCE_BUSY、PROCESS_STATE_UNKNOWN、GATE_FAILED、EVIDENCE_TAMPERED、
SOURCE_DRIFT、APPROVAL_STALE、ARTIFACT_INCOMPLETE、DEVICE_UNAVAILABLE、CI_PENDING、CI_FAILED、
USAGE_PARTIAL、BUDGET_EXHAUSTED、CAPABILITY_UNSUPPORTED。

显示多个 blocker，优先顺序：安全/证据问题 → 状态未知 → 能力/环境 → gate 失败 → 人工/外部等待。
模型可以解释原因，但不能覆盖机器 code 或把猜测写成根因事实。

## 12. v1.1环境、RAG与调试扩展的绑定规则

- 新项目必须记录环境探测证据和真实用户确认；environment只有openharmony/harmonyos，
  harmonyos还须system/chip。profile不完整或证据冲突时，run创建拒绝。
- OperationStart与ApprovalReceipt新增environment_profile_digest，必须匹配run、当前源码、
  构建产物和设备匹配记录。不能用重新确认旧review来改变环境。
- 错误新增ENVIRONMENT_UNCONFIRMED、ENVIRONMENT_AMBIGUOUS、PROFILE_INCOMPLETE、
  ENVIRONMENT_PROFILE_CHANGED、RAG_UNAVAILABLE、RAG_SOURCE_STALE、DEVICE_AMBIGUOUS、
  ARTIFACT_DEVICE_MISMATCH。UI解释需附来源和下一动作。
- PublicationRef采用backend=gitcode/gerrit、project/branch/commit_sha、
  change_or_pr_id、patchset_or_head、verification_status、policy_digest和evidence_refs。
  Gerrit不能被强制填写PR编号；CI/标签政策按实际项目配置而非固定通用分值。
- RAG结果包含source_snapshot/index/model版本/环境/文件/行/hash并由Gateway核验；
  查询来源与向量均按租户和workspace授权。检索工具无gate/consent写权限。
- 调试绑定artifact/profile/source digest + device identity/系统/ABI + deployment strategy；
  对应run发生reset/环境变化/设备重启时重新核验，不复用旧“已匹配”状态。
- 本地导入产物与独立调试属于advisory，只有正式gate验证后才能影响AR阶段。
- 编译probe缓存必须按profile/工具链/源码根/产品/ABI/target等失效；
  P4 gate与P0 probe各按真实判定规则呈现，不统一硬编码成功横幅。

完整API、实体、事件、profile字段和UI流见 [扩展章节](rag-environment-debug.md)。
