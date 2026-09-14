# 示例文件说明

返回 [总方案](../index.md)。所有 demo ID 与 hash 都是合成示例，不能用于生产调用或当作证据。

- [task-plan.json](task-plan.json)：实施任务与依赖的基线；实时进度以 `products/dsh-cloud-implementation/implementation-status.json` 为准。
- [ar-delivery.workflow.json](ar-delivery.workflow.json)：平台 manifest 草案；installable=false，正式 loader 应拒绝。
- [operation-start.schema.json](operation-start.schema.json)：平台 OperationStart JSON Schema 草案；args 还须按 action_ref 的专用 schema 继续校验。
- [operation-start.json](operation-start.json)：符合上述结构的虚构 gate 请求；不包含真实 workspace/pipeline/凭据。

正式实现须校验命令引用属于固定 workflow，授权角色/任务/lease有效且pipeline_ref来自注册映射。
schema 合法不等于获准执行。总超时上限24小时是本版契约默认值，可通过新契约版本变更。

- [environment-profiles.draft.json](environment-profiles.draft.json)：三类工程profile草案，HarmonyOS真实参数保持未配置，不可运行。
- [rag-profile.draft.json](rag-profile.draft.json)：云RAG模型/召回/范围/评测起始配置，启用前需真实授权和版本固定。
