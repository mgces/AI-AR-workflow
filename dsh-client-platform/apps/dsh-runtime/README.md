# DSH Local CodeAgent Runtime Bridge

This package is a Cordis bundle for an official DeepSeek Harness runtime. It registers one DSH `LlmAdapter` route per selected local CodeAgent and a private DSH tool that dispatches the session to Local Core. The selected Claude Code, OpenCode, Codex, or configured custom CodeAgent performs the AI work; this bridge never calls or falls back to a DeepSeek model.

The adapter uses DSH's public `ctx.llm.registerAdapter()` and `ctx.tools.register()` extension points. A turn creates a durable DSH tool-call / tool-result pair around the local execution, then writes the CodeAgent's final text and reported token usage back through the DSH stream. Missing token, unrecognized provider, invalid workspace, unavailable CodeAgent, cancellation, and execution failure stay fail-closed. Unknown usage remains unknown; token counts are never estimated.

## Runtime configuration

The desktop process sets these variables only on the DSH sidecar process:

| Variable | Purpose |
| --- | --- |
| `DSH_CLIENT_CODEAGENT_ENDPOINT` | Local Core loopback origin, such as `http://127.0.0.1:43129` |
| `DSH_CLIENT_CODEAGENT_TOKEN` | Ephemeral bearer token shared with Local Core; never persisted or displayed |
| `DSH_CLIENT_CODEAGENT_IDS` | Optional comma-separated route IDs; defaults to `claude-code,opencode,codex,custom` |

The DSH SDK client initializes the selected route as `dsh-local-codeagent-<id>`. Use model `native-default` when the local CodeAgent should keep its own model selection. Any other non-empty model value is forwarded as that CodeAgent's model choice.

## Local Core callback contract

Every request is `POST`, JSON, loopback-only, and authenticated using the ephemeral bearer token.

`/internal/dsh/codeagent/probe` request:

```json
{"provider_id":"claude-code","model":"claude-sonnet-4"}
```

Success response:

```json
{"available":true}
```

`/internal/dsh/codeagent/execute` request:

```json
{
  "provider_id":"claude-code",
  "model":"claude-sonnet-4",
  "session_id":"dsh-session-id",
  "workspace_root":"/authorized/workspace",
  "system":"DSH assembled instructions",
  "messages":[{"role":"user","content":"the current request"}]
}
```

Success response:

```json
{"output":"CodeAgent final response","stderr":"optional diagnostics","usage":{"input_tokens":12,"output_tokens":34},"duration_ms":1200,"artifact_refs":["evidence/P4/build.log"],"invocation":{"execution":"local_connector","provider":"claude-code","model":"claude-sonnet-4"}}
```

Local Core must bind `workspace_root` to its current authorized workspace, resolve the CodeAgent ID through the local agent settings, honor request cancellation, and return only the run output and usage facts. The callback must not accept arbitrary commands or API keys. It should return an error object with a stable lowercase `error.code` on failure.

## Current boundary

The bridge records Agent/Session lifecycle, the delegated CodeAgent tool call, final text, and available token usage through DSH's normal event stream. It deliberately does not present unrelated DSH tool schemas as executable CodeAgent tools: only the selected local CodeAgent's native tools are available during its run. The AR scheduler and deterministic P0–P8 gates remain authoritative in Local Core. Connecting DSH workflow actions into CodeAgent MCP and syncing full workflow evidence are separate integration work; this package does not claim those paths are complete.
