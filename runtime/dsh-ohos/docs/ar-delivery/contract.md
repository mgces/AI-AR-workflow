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
