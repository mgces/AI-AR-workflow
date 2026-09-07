# OHOS DSH runtime

This package implements the shared runtime described by the cross-host design in
[`docs/reference/dsh-implementation-plan.md`](../../docs/reference/dsh-implementation-plan.md).
It contains a host-neutral controller, a dependency-free MCP stdio server, and a
DeepSeek Harness tool plugin boundary.

中文安装与使用步骤见 [跨宿主 DSH subagent 使用指南](../../docs/getting-started/dsh-subagents.md)，
覆盖 Codex、Claude Code、Cursor、Trae、两条 workflow 的启动提示词、恢复与接入验收。

融合改造进度见 [实施状态与未完成项](../../docs/reference/dsh-fusion-implementation-status.md)。
当前新增能力是 **observe 路由与签名失败诊断**。长作业托管、自动补丁和策略自动发布尚未实现；
`managed` 模式明确拒绝启用。

## Completion status

Both workflows have controller paths: requirement R1-R9 and AR delivery P0-P8.
These are local protocol implementations; live host and DSH profile acceptance remain separate.

| Area | Status | What is working | What is still missing |
|---|---|---|---|
| Shared runtime | Delivery-ready | SQLite state, MCP, leases, credentials, idempotency, claim/context/heartbeat/submit/release, validation, synchronization, expired-lease recovery and scoped build/device/publish exclusion | cancellation request API and detached long-job executor |
| Requirement workflow | Implemented | R1-R9 graph, preflight, human decisions bound to artifact hashes, independent R5 context checks, traceability, GA-before-SR, review rollback/closure, persisted resume and AR handoff | real host review isolation, model-generated document quality and human-source attestation |
| AR delivery workflow | Implemented | P0-P8 graph, signed Python gate validation, P1/P6/P7/P8 consent, P8 precheck/publish split, attach/resume/reset reconciliation | validation in a real OHOS build/device/publish environment |
| Host adapters | Static export complete | Codex, Claude Code, Cursor, and Trae files render and pass local contract tests | live host discovery/invocation, cancellation behavior, model/accounting evidence, cross-host resume |
| DSH integration | Boundary only | package metadata and Cordis tool definitions | real DSH profile installation, boot, shutdown, and compatibility test |

“AR delivery implemented” means the repository code can initialize or attach a
Python pipeline, issue every domain task, validate signed evidence, stop for the
four human decisions, advance the authoritative state, and recover after a
controller interruption or Python-side reset. It does not mean that a real
OpenHarmony build, device test, push, or four-host acceptance run has occurred.

## Implemented now

- SQLite state for host bindings, runs, tasks, attempts, idempotent operations, and events.
- Requirement R1-R9 and the full delivery P0-P8 task graph. P8 is split
  into reviewable precheck and authorized publish tasks.
- Atomic task claim, heartbeat, submit, and release operations.
- Delivery expired leases quarantine the task and retain resource exclusion.
  The credentialed owner must stop its process tree before releasing; partial
  artifacts then require sync. Local workspace aliases and parent/child paths
  participate in build/write exclusion. This is cooperative lifecycle recovery,
  not an OS process supervisor or a lock shared with standalone Python CLI jobs.
- Requirement expired leases quarantine work for reconciliation; reset requests active writers to stop before replacement.
- Revision, lease epoch, host capability, and scoped task credential checks.
- MCP `initialize`, `ping`, `tools/list`, and `tools/call` over stdio.
- A subprocess adapter for the existing `advance.py` truth layer plus a read-only
  JSON inspection bridge. DSH never computes a business PASS itself.
- Parent operations `ohos_delivery_validate`, `ohos_delivery_consent`, and
  `ohos_delivery_sync` for validation, evidence-bound human decisions, crash
  recovery, existing-run attachment, and reset reconciliation.
- Separate `parent`, `worker`, and development-only `all` tool surfaces.
- DSH bundle metadata and a Cordis tool-registration plugin.
- Codex, Claude Code, Cursor, and Trae project-agent bundle generation without
  pinning a model.
- Immutable per-run policy hashes and dependency-aware Skill routing, with
  phase requirements, context bounds, cycle/missing-module checks and drift rejection.
- Parent-only `ohos_policy_configure`, `ohos_policy_status`, and `ohos_repair_plan`.
  Plans verify current P4 signed FAIL evidence and bind the observed source state.
  They do not execute a repair, reserve build budget, or establish which source
  version the historical build actually compiled.
- An internal persistent budget reservation ledger with idempotency and terminal
  settlement. It is not yet wired into a build launcher or legacy CLI commands.

A worker submission enters `validating`. Delivery acceptance requires the Python
authority. Requirement acceptance checks structural contracts, immutable
prerequisites and the required human decisions; semantic document quality remains
the responsibility of the original skills, independent reviewer and users.

## Requirements and tests

Node.js 24 or newer is required because the store uses the built-in `node:sqlite`
module. No package download is required for core tests.

```powershell
Set-Location runtime/dsh-ohos
node --test
```

Start a local MCP server:

```powershell
$env:OHOS_DSH_DATA_ROOT = 'D:\secure-runtime-data\ohos-dsh'
$env:OHOS_DSH_PRINCIPAL = 'parent'
$env:OHOS_DSH_PYTHON = 'python3' # use an absolute interpreter path when needed
$env:OHOS_AR_SCRIPTS_ROOT = 'D:\repo\AI-AR-workflow\skills\ohos-ar-dev-phases\scripts'
node src/mcp/stdio.js
```

`stdout` is reserved for JSON-RPC. Diagnostics are written to `stderr`.

## 两条 workflow 的业务边界

| 模块 | Requirement workflow | AR delivery workflow |
|---|---|---|
| 目录 | `src/workflows/requirement/` | `src/workflows/ar-delivery/` |
| 控制器 | `RequirementWorkflow` | `DeliveryWorkflow` |
| 阶段 | R1–R9 | P0–P8 |
| 业务工具 | `ohos_requirement_*` | `ohos_delivery_*` |
| 子 agent | `ohos-requirement` | `ohos-delivery` |
| 状态依据 | 文档哈希、结构校验、人工决策 | Python pipeline 与签名证据 |
| 测试 | `test/requirement/` | `test/ar-delivery/` |
| 调用文档 | [需求调用契约](docs/requirement/contract.md) | [AR 调用契约](docs/ar-delivery/contract.md) |

两条 workflow 通过 AR.md 显式交接。核心层共享 SQLite、任务、租约和凭证，公共 MCP/DSH 和宿主适配仅组装业务模块。
`parent/worker` 表示工具权限，`requirement/delivery` 表示业务类型，二者是不同维度。

## 目录与依赖

```text
src/
  core/                      # 任务生命周期、凭证、通用工具、公共存储
  workflows/
    requirement/             # R1–R9: workflow/stages/artifacts/preflight/schema/tools/agent
    ar-delivery/             # P0–P8: workflow/stages/python-adapter/python/tools/agent
  hosts/                     # 四种宿主导出；业务指令从 workflow 注册表获取
  tools/catalog.js           # 合并 core 和两条 workflow 的工具定义
  policy/                    # 固定版本、模块路由、失败诊断、只读修复计划、预算账本
  mcp/                       # MCP stdio 协议
  dsh/                       # DSH 插件接入
  controller.js              # OhosController 兼容入口与 workflow 注册
  runtime.js                 # 组装存储、适配器、控制器和工具目录
  index.js                   # 保留公共导出
test/
  core/  requirement/  ar-delivery/  policy/  hosts/  dsh/
docs/
  requirement/contract.md
  ar-delivery/contract.md
```

`core` 不导入任何 workflow；两条 workflow 不互相导入。公共任务控制器通过注册接口调用业务模块的
bootstrap、领取检查、上下文、状态和过期租约策略。需求专用表由需求模块的 schema.js 管理。

现有 MCP 工具名、workflow ID、SQLite 表和数据路径保持兼容。`OhosController` 原有
startDelivery/validateDeliveryTask/consentDelivery/syncDelivery 方法转发到独立 DeliveryWorkflow；
新代码可直接使用 controller.requirement 与 controller.delivery。内部深层源码路径按新目录更新。

## Host wiring

Configure two logical MCP connections that share `OHOS_DSH_DATA_ROOT`:

| Connection | `OHOS_DSH_PRINCIPAL` | Visible operations |
|---|---|---|
| Parent agent | `parent` | register host, start/validate/consent/sync run, inspect status |
| Domain subagent | `worker` | inspect binding/run, claim, heartbeat, submit, release |

Use an absolute path to `src/mcp/stdio.js` in Codex, Claude Code, Cursor, or Trae.
The host keeps its own model login and invokes these tools from a native subagent.
Setting the principal only controls tool exposure; strong separation also requires
separate OS credentials and filesystem permissions for evidence and publishing.

The default principal is `all` for local development. Do not use it as evidence of
production role isolation.

Generate reviewable Codex files into a staging directory:

```powershell
node src/hosts/export-cli.js `
  --host codex `
  --workspace-root 'D:\work\openharmony' `
  --data-root 'D:\secure-runtime-data\ohos-dsh' `
  --python-command 'C:\Python312\python.exe' `
  --delivery-scripts-root 'D:\repo\AI-AR-workflow\skills\ohos-ar-dev-phases\scripts' `
  --requirement-skills-root 'D:\repo\AI-AR-workflow\skills' `
  --output-root 'D:\staging\ohos-codex'
```

Set `--host` to `codex`, `claude-code`, `cursor`, or `trae`. The exporter refuses
to overwrite files unless `--force` is explicitly supplied. Every export contains
two domain-agent definitions and `ohos-host-bundle.json`, which records warnings
and adapter limits. Review staged output before copying it into a project.

| Host | Generated native entry | MCP configuration | Model behavior |
|---|---|---|---|
| Codex | `.codex/agents/*.toml` | reviewed parent snippet; worker MCP inline | omits model fields |
| Claude Code | `.claude/agents/*.md` | reviewed parent fragment; worker MCP inline | `model: inherit` |
| Cursor | `.cursor/agents/*.md` | `.cursor/mcp.json` | `model: inherit` |
| Trae IDE | `.trae/agents/*.md` | `.trae/mcp.json` | omits `model` |
| Trae CLI | `.traecli/agents/*.md` | reviewed `traecli.toml` snippet | omits `model` |

Cursor local subagents inherit all MCP tools from the parent, so the generated
Cursor bundle labels host-layer role separation as advisory. The controller still
checks capability, revision, lease epoch, and task credentials. Cursor cloud
subagents need a separately configured team MCP service and cannot use the local
stdio path.

Trae agent files whitelist the worker MCP server and individual worker operations.
Enable Trae's Subagents directory and project-level MCP settings before use. The
Trae CLI snippet must be merged into `~/.trae/traecli.toml`; the exporter never
changes that user file.

The generated Codex and Trae files omit model selection; Claude Code and Cursor
use their documented inherit setting. This keeps model selection in the host, but
does not prove that a plan or organization policy will allow the requested model.

## DSH integration

The package declares a DSH bundle in `package.json`; `cordis.patch.yml` mounts
`src/dsh/plugin.js` through the package entry point. In an environment with DSH and
pnpm installed, install this checkout into a dedicated profile and inspect the
composed configuration before booting it:

```text
dsh plugin --profile ohos add <absolute-path-to-runtime/dsh-ohos>
dsh --profile ohos --dump-config
```

The repository test suite validates the generated DSH tool definitions with a fake
registry boundary. A real DSH profile boot remains a separate integration check.

## Current boundary

The code path for AR delivery is implemented and covered by controller tests and a
real Python init/inspect boundary test. DSH itself is not installed in this
workspace, so a real DSH profile boot remains unverified. Generated Codex, Claude
Code, Cursor, and Trae configurations have not yet been exercised inside those four
products, and subscription accounting cannot be inferred from inherited model
configuration. Requirement R1-R9 is covered with synthetic artifact contracts and
a real Python dependency preflight; model-generated quality, honest context identity,
human-source attribution and real multi-host execution remain live acceptance work.
