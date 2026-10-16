import { randomUUID } from 'node:crypto';

export const name = 'dsh-local-codeagent-provider';
export const inject = ['llm', 'tools'];

const PROVIDER_PREFIX = 'dsh-local-codeagent-';
const DEFAULT_AGENT_IDS = Object.freeze(['claude-code', 'opencode', 'codex', 'custom']);
const TOOL_NAME = 'dsh_local_codeagent_execute';
const TOOL_SCHEMA = Object.freeze({
  type: 'object',
  properties: {},
  additionalProperties: false,
});
const TOOL_OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    output: { type: 'string' },
    stderr: { type: 'string' },
    usage: { type: 'object', additionalProperties: true },
    duration_ms: { type: 'number' },
    artifact_refs: { type: 'array', items: { type: 'string' } },
    invocation: {
      type: 'object',
      properties: {
        execution: { type: 'string' },
        provider: { type: 'string' },
        model: { type: 'string' },
      },
      required: ['execution', 'provider', 'model'],
      additionalProperties: false,
    },
  },
  required: ['output'],
  additionalProperties: false,
});
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function failure(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function safeAgentId(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/u.test(value);
}

function providerFor(agentId) {
  return `${PROVIDER_PREFIX}${agentId}`;
}

function agentFor(provider) {
  if (typeof provider !== 'string' || !provider.startsWith(PROVIDER_PREFIX)) return null;
  const id = provider.slice(PROVIDER_PREFIX.length);
  return safeAgentId(id) ? id : null;
}

function normalizeEndpoint(value) {
  let url;
  try { url = new URL(String(value ?? '').trim()); } catch {
    throw failure('dsh_codeagent_endpoint_invalid', 'Local CodeAgent runtime endpoint is invalid');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw failure('dsh_codeagent_endpoint_invalid', 'Local CodeAgent runtime endpoint must be an HTTP loopback origin');
  }
  return url.origin;
}

function normalizeConfiguration(config) {
  const endpoint = normalizeEndpoint(config.endpoint ?? process.env.DSH_CLIENT_CODEAGENT_ENDPOINT);
  const token = config.token ?? process.env.DSH_CLIENT_CODEAGENT_TOKEN;
  if (typeof token !== 'string' || token.length < 24 || /[\0\r\n]/u.test(token)) {
    throw failure('dsh_codeagent_runtime_auth_missing', 'Local CodeAgent runtime authentication is not configured');
  }
  const configuredIds = config.agentIds ?? process.env.DSH_CLIENT_CODEAGENT_IDS;
  const agentIds = Array.isArray(configuredIds)
    ? configuredIds
    : typeof configuredIds === 'string' && configuredIds.trim() !== ''
      ? configuredIds.split(',').map((value) => value.trim())
      : DEFAULT_AGENT_IDS;
  if (!Array.isArray(agentIds) || agentIds.length === 0
      || agentIds.some((id) => !safeAgentId(id))
      || new Set(agentIds).size !== agentIds.length) {
    throw failure('dsh_codeagent_agent_ids_invalid', 'Local CodeAgent provider ids are invalid');
  }
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > DEFAULT_TIMEOUT_MS) {
    throw failure('dsh_codeagent_timeout_invalid', 'Local CodeAgent provider timeout is invalid');
  }
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw failure('dsh_codeagent_fetch_unavailable', 'Fetch API is unavailable');
  return { endpoint, token, agentIds: [...agentIds], timeoutMs, fetchImpl };
}

function contentToText(message) {
  const content = Array.isArray(message?.content) ? message.content : [];
  const parts = [];
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block?.type === 'tool-result') {
      const nested = Array.isArray(block.content) ? block.content : [];
      const text = nested.filter((item) => item?.type === 'text').map((item) => item.text).join('');
      parts.push(`[Tool result${block.isError ? ' (failed)' : ''}]:\n${text}`);
    } else if (block?.type === 'reasoning') {
      // Private model reasoning is not forwarded to a separate CodeAgent.
      continue;
    } else {
      throw failure('codeagent_content_unsupported', `DSH message content type ${block?.type ?? 'unknown'} cannot be sent to the selected CodeAgent`);
    }
  }
  return parts.join('\n');
}

function bridgeCallIds(messages) {
  const ids = new Set();
  for (const message of messages) {
    if (message?.role !== 'assistant' || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block?.type === 'tool-call' && block.name === TOOL_NAME && typeof block.id === 'string') ids.add(block.id);
    }
  }
  return ids;
}

function transcript(messages) {
  const internalCalls = bridgeCallIds(messages);
  const result = [];
  for (const message of messages) {
    if (!['system', 'user', 'assistant'].includes(message?.role)) continue;
    if (message.role === 'assistant' && Array.isArray(message.content)
        && message.content.some((block) => block?.type === 'tool-call' && block.name === TOOL_NAME)) continue;
    const filtered = message.role === 'user' && Array.isArray(message.content)
      ? message.content.filter((block) => block?.type !== 'tool-result' || !internalCalls.has(block.toolCallId))
      : message.content;
    const text = contentToText({ ...message, content: filtered });
    if (text.trim()) result.push({ role: message.role, content: text });
  }
  return result;
}

function lastBridgeResult(messages, callId) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const message = messages[messageIndex];
    if (!Array.isArray(message?.content)) continue;
    for (let blockIndex = message.content.length - 1; blockIndex >= 0; blockIndex--) {
      const block = message.content[blockIndex];
      if (block?.type === 'tool-result' && block.toolCallId === callId) return block;
    }
  }
  return null;
}

async function readJsonBounded(response) {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    throw failure('dsh_codeagent_response_too_large', 'Local CodeAgent runtime response exceeded the supported size');
  }
  if (!response.body) return {};
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw failure('dsh_codeagent_response_too_large', 'Local CodeAgent runtime response exceeded the supported size');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
    throw failure('dsh_codeagent_response_invalid', 'Local CodeAgent runtime returned invalid JSON');
  }
}

function normalizeUsage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const inputTokens = value.input_tokens ?? value.inputTokens ?? value.prompt_tokens;
  const outputTokens = value.output_tokens ?? value.outputTokens ?? value.completion_tokens;
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0) return null;
  const cacheReadTokens = value.cache_read_tokens ?? value.cacheReadTokens;
  const cacheWriteTokens = value.cache_write_tokens ?? value.cacheWriteTokens;
  const reasoningTokens = value.reasoning_tokens ?? value.reasoningTokens;
  return {
    inputTokens,
    outputTokens,
    ...(Number.isSafeInteger(cacheReadTokens) && cacheReadTokens >= 0 ? { cacheReadTokens } : {}),
    ...(Number.isSafeInteger(cacheWriteTokens) && cacheWriteTokens >= 0 ? { cacheWriteTokens } : {}),
    ...(Number.isSafeInteger(reasoningTokens) && reasoningTokens >= 0 ? { reasoningTokens } : {}),
  };
}

function messageFromChunks(text) {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
  ];
}

function toolCallChunks(callId) {
  const block = { type: 'tool-call', id: callId, name: TOOL_NAME, arguments: '{}' };
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id: callId, name: TOOL_NAME, argumentsDelta: '{}' },
    { type: 'block-end', index: 0, block },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ];
}

function ensureBoundedRequest(value) {
  const bytes = Buffer.byteLength(JSON.stringify(value));
  if (bytes > MAX_REQUEST_BYTES) {
    throw failure('dsh_codeagent_request_too_large', 'DSH session context exceeded the supported CodeAgent request size');
  }
}

function combineSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

function makeProviderAdapter({ endpoint, token, agentIds, fetchImpl, timeoutMs }) {
  const pendingBySession = new Map();
  const routes = agentIds.map(providerFor);

  async function post(path, body, signal) {
    const payload = JSON.stringify(body);
    if (Buffer.byteLength(payload) > MAX_REQUEST_BYTES) {
      throw failure('dsh_codeagent_request_too_large', 'DSH session context exceeded the supported CodeAgent request size');
    }
    const response = await fetchImpl(new URL(path, endpoint), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: payload,
      signal: combineSignal(signal, timeoutMs),
    });
    const value = await readJsonBounded(response);
    if (!response.ok) {
      const code = typeof value?.error?.code === 'string' && /^[a-z][a-z0-9_]{0,63}$/u.test(value.error.code)
        ? value.error.code : 'codeagent_runtime_request_failed';
      throw failure(code, typeof value?.error?.message === 'string' ? value.error.message : 'Local CodeAgent runtime request failed');
    }
    return value;
  }

  const adapter = {
    providerInfo(provider) {
      const agentId = agentFor(provider);
      if (!agentIds.includes(agentId)) throw failure('dsh_codeagent_provider_unknown', 'Unknown local CodeAgent provider route');
      return { id: provider, name: `Local ${agentId}` };
    },
    providerRetryPolicy() {
      // Retrying an opaque CodeAgent run can duplicate code changes. Let the
      // Agent loop surface the failure and require an explicit user retry.
      return undefined;
    },
    async listModels(provider) {
      const agentId = agentFor(provider);
      if (!agentIds.includes(agentId)) throw failure('dsh_codeagent_provider_unknown', 'Unknown local CodeAgent provider route');
      return [];
    },
    async resolveModel(provider, model, signal) {
      const agentId = agentFor(provider);
      if (!agentIds.includes(agentId) || typeof model !== 'string' || model.trim() === '' || model.length > 256 || /[\0\r\n]/u.test(model)) {
        throw failure('dsh_codeagent_route_invalid', 'Selected local CodeAgent route or model is invalid');
      }
      const status = await post('/internal/dsh/codeagent/probe', {
        provider_id: agentId,
        model: model === 'native-default' ? null : model,
      }, signal);
      if (status.available !== true) {
        throw failure('codeagent_unavailable', `Selected local CodeAgent ${agentId} is not ready`);
      }
      return { provider, id: model, name: model };
    },
    async prepareCall(provider, model, signal) {
      const resolved = await adapter.resolveModel(provider, model, signal);
      return {
        model: { ...resolved, inputModalities: ['text'] },
        stream: (options) => adapter.stream(options),
      };
    },
    async *stream(options) {
      const agentId = agentFor(options.provider);
      if (!agentIds.includes(agentId)) throw failure('dsh_codeagent_provider_unknown', 'Unknown local CodeAgent provider route');
      if (typeof options.sessionId !== 'string' || options.sessionId.trim() === '') {
        throw failure('dsh_codeagent_session_missing', 'DSH did not provide a session identity for the selected CodeAgent');
      }
      const pending = pendingBySession.get(options.sessionId);
      if (!pending) {
        const messages = transcript(options.messages ?? []);
        const payload = {
          provider_id: agentId,
          model: options.model === 'native-default' ? null : options.model,
          session_id: options.sessionId,
          system: typeof options.system === 'string' ? options.system : '',
          messages,
        };
        ensureBoundedRequest(payload);
        const callId = randomUUID();
        pendingBySession.set(options.sessionId, { callId, payload, provider: options.provider });
        yield* toolCallChunks(callId);
        return;
      }
      if (pending.provider !== options.provider) {
        pendingBySession.delete(options.sessionId);
        throw failure('dsh_codeagent_session_route_changed', 'A DSH session cannot switch local CodeAgent providers during an active turn');
      }
      const resultBlock = lastBridgeResult(options.messages ?? [], pending.callId);
      if (!resultBlock) throw failure('dsh_codeagent_tool_result_missing', 'DSH did not return the local CodeAgent tool result');
      pendingBySession.delete(options.sessionId);
      if (resultBlock.isError) throw failure('codeagent_execution_failed', 'Selected local CodeAgent execution failed');
      let result = pending.result;
      if (!result && Array.isArray(resultBlock.content)) {
        const text = resultBlock.content.filter((block) => block?.type === 'text').map((block) => block.text).join('');
        try { result = JSON.parse(text); } catch { /* the canonical result remains in the pending state */ }
      }
      if (!result || typeof result.output !== 'string') throw failure('dsh_codeagent_tool_result_invalid', 'Local CodeAgent returned no final text');
      for (const chunk of messageFromChunks(result.output)) yield chunk;
      const usage = normalizeUsage(result.usage);
      if (usage) yield { type: 'usage', usage };
      yield { type: 'finish', reason: { kind: 'stop' } };
    },
  };

  return {
    adapter,
    async execute(args, execution) {
      if (!execution?.agent || typeof execution.agent.id !== 'string') {
        throw failure('dsh_codeagent_agent_missing', 'The DSH tool call is not bound to a live Agent');
      }
      const state = pendingBySession.get(execution.agent.id);
      if (!state || state.provider !== execution.agent.options?.provider) {
        throw failure('dsh_codeagent_context_missing', 'The local CodeAgent tool call has no matching DSH session request');
      }
      if (execution.signal?.aborted) throw failure('codeagent_cancelled', 'Selected local CodeAgent execution was cancelled');
      const result = await post('/internal/dsh/codeagent/execute', {
        ...state.payload,
        workspace_root: execution.agent.session?.header?.cwd ?? null,
      }, execution.signal);
      if (typeof result.output !== 'string') throw failure('dsh_codeagent_result_invalid', 'Local CodeAgent runtime returned no final text');
      const normalized = {
        output: result.output,
        ...(typeof result.stderr === 'string' ? { stderr: result.stderr } : {}),
        ...(normalizeUsage(result.usage) ? { usage: normalizeUsage(result.usage) } : {}),
        ...(Number.isSafeInteger(result.duration_ms) && result.duration_ms >= 0 ? { duration_ms: result.duration_ms } : {}),
        ...(Array.isArray(result.artifact_refs) && result.artifact_refs.every((value) => typeof value === 'string')
          ? { artifact_refs: [...new Set(result.artifact_refs)] } : {}),
        invocation: {
          ...(result.invocation && typeof result.invocation === 'object' && !Array.isArray(result.invocation)
            ? result.invocation : {}),
          execution: result.invocation?.execution ?? 'dsh-local-codeagent',
          provider: state.payload.provider_id,
          model: state.payload.model ?? 'native-default',
        },
      };
      state.result = normalized;
      return normalized;
    },
    dispose() { pendingBySession.clear(); },
    routes,
  };
}

export function apply(ctx, config = {}) {
  const runtime = normalizeConfiguration(config);
  const provider = makeProviderAdapter(runtime);
  const unregisterAdapter = ctx.llm.registerAdapter(provider.routes, provider.adapter);
  const unregisterTool = ctx.tools.register({
    name: TOOL_NAME,
    description: 'Execute the current DSH session through the selected local CodeAgent. This is an internal bridge tool; the runtime constructs its argument payload from the recorded DSH session.',
    parameters: TOOL_SCHEMA,
    output: {
      schema: TOOL_OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: provider.execute,
  });
  return () => {
    provider.dispose();
    unregisterTool();
    unregisterAdapter();
  };
}

export { PROVIDER_PREFIX, TOOL_NAME, providerFor as localCodeAgentProvider };
