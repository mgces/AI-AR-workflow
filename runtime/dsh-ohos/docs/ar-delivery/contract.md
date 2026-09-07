# AR 开发 workflow 调用契约

本模块负责 P0–P8。需求分析输出的 `AR.md` 是可选输入来源；两条 workflow 分别启动，拥有独立 run 和确认记录。

## 启动、校验与恢复

The parent starts a new pipeline with `ohos_delivery_start`:

```json
{
  "input_ref": "D:/requirements/AR.md",
  "ar_path": "D:/requirements/AR.md",
  "repo_root": "D:/work/openharmony",
  "environment": "openharmony",
  "git_dir": "base/example/component",
  "build_target": "component_package",
  "part": "component_part",
  "idempotency_key": "delivery-20260906-01"
}
```

To attach an existing pipeline, provide its absolute `pipeline_dir`; `ar_path` is
optional when that pipeline already has `ar.md`. Attachment reads the Python
state and starts at the current work or consent point.

For each returned `dispatch_needed`, the host launches its native
`ohos-delivery` subagent with the returned role and revision. The worker calls
claim → context → heartbeat as needed → submit. The parent then calls
`ohos_delivery_validate`. A `needs_repair` result re-dispatches the same phase at
a new revision; `needs_input` requires `ohos_delivery_consent` with the reviewed
phase and token; `dispatch_needed` names the next phase. Call
`ohos_delivery_sync` after a controller restart, an uncertain Python command, or
an external `advance.py reset`.

AR 租约过期会进入 `needs_reconcile`，不会自动重派。原 worker 必须停止并回收所有子进程，
再用原 attempt 凭证调用 `ohos_task_release`；不得省略部分产物。存在部分产物时，parent
随后调用 `ohos_delivery_sync` 重新检查 Python 状态。活动或尚未确认停止的过期 writer 会阻止 sync。
如果原 worker 已丢失且进程状态未知，本版保留隔离；不能把手工改数据库当作停止证明。

## 融合路由与修复诊断（observe）

parent 可在首次 claim 前调用：

```json
{
  "run_id": "dev-example",
  "mode": "observe",
  "task_tags": ["sa", "cpp"],
  "capabilities_by_phase": {"P2": ["cpp-contract"]},
  "idempotency_key": "routing-example"
}
```

工具名为 `ohos_policy_configure`；`capabilities_by_phase` 是 Skill 能力，不能替代宿主的
`build_execution` 等权限检查。`ohos_task_context.routing` 返回固定 policy、Skill 哈希、依赖顺序、
选择原因和预算裁剪结果。必需模块超过上下文预算时拒绝生成上下文，不静默删除约束。
`ohos_policy_status` 只读返回 policy 与预算账本；本版只支持 observe。

P4 构建结束并停止 writer 后，parent 可调用 `ohos_repair_plan`：

```json
{
  "run_id": "dev-example",
  "expected_revision": 2,
  "idempotency_key": "inspect-build-failure-1"
}
```

失败证据由 Python bridge 从绑定的 pipeline 读取，调用方不能上传一个 `verified=true`
来创建计划。bridge 检查完整签名链、当前阶段/rewind barrier、所有日志产物哈希，并要求
`gate_build.py` 的真实命令退出记录。P8 预检、缺少执行记录、篡改证据均不能作为 P4 失败。

返回的 `plan_digest` 固定本次观测到的源码基线与诊断；`execution_input_binding=unavailable`
表示旧 gate 尚未把构建前源码 hash 与 operation 写入签名证据。此计划仅供诊断，不能据此
自动导入补丁或宣称修复成功。`budget_reserved=false`；预算账本尚未接入执行入口。
改码应在 Python `repair` 回 P2 后进行；涉及公开行为、依赖或验收变化须 `reset` 回 P1。
所有原门禁与人工确认继续适用，P4 PASS 不能代替后续验证。

| DSH task | Worker role | Python authority | Hold |
|---|---|---|---|
| P0 | environment-analyst | `gate_env_init.py` | — |
| P1 | design-architect | `gate_design.py` | design consent |
| P2/P3 | implementer / test-author | development and test-development gates | — |
| P4/P5 | build-runner / unit-test-runner | build and unit-test gates | — |
| P6/P7 | device-test-runner / quality-reviewer | device and integration gates | result consent |
| P8-precheck | publisher | upload dry-run evidence | push consent |
| P8-publish | publisher | upload/PR/CI PASS plus `advance.py` | — |


## 实现归属

- `src/workflows/ar-delivery/workflow.js`：DeliveryWorkflow 的启动、同步、校验和确认。
- `stages.js`：P0–P8 角色、门控和所需能力。
- `python-adapter.js` 与 `python/delivery_bridge.py`：调用现有 Python AR 真相层。
- `tools.js`：`ohos_delivery_*` 的 MCP 业务定义。
- `agent.js`：AR subagent 指令及父 agent 使用说明。
- `test/ar-delivery/`：业务回归与真实 Python 边界测试。

原始门控脚本仍在仓库 `skills/ohos-ar-dev-phases/scripts/`，其状态与签名契约保持原样。
宿主配置和共同启动方法见 [runtime README](../../README.md)。
