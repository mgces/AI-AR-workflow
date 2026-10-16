import { createHash } from 'node:crypto';
import { localCodeAgentProvider } from './codeagent-provider.js';

function fail(code, message) {
  return Object.assign(new Error(message), { code });
}

function validSessionId(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 160 && /^[A-Za-z0-9._:-]+$/u.test(value);
}

function sameOptionalModel(left, right) {
  return (left ?? null) === (right ?? null);
}

/** Active, in-memory binding from a DSH session to one scheduler attempt. */
export class DshExecutionBindings {
  #active = new Map();

  bind(sessionId, execution) {
    if (!validSessionId(sessionId)) throw fail('dsh_execution_binding_invalid', 'DSH session id is invalid');
    if (!execution || typeof execution !== 'object' || !execution.context || !execution.definition) {
      throw fail('dsh_execution_binding_invalid', 'AR execution context is incomplete');
    }
    if (this.#active.has(sessionId)) throw fail('dsh_execution_binding_conflict', 'A DSH session already has an active AR execution');
    const binding = Object.freeze({ ...execution, sessionId });
    this.#active.set(sessionId, binding);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (this.#active.get(sessionId) === binding) this.#active.delete(sessionId);
    };
  }

  get(sessionId) {
    return this.#active.get(sessionId) ?? null;
  }

  find(providerId, model) {
    for (const binding of this.#active.values()) {
      if (binding.definition?.id === providerId && sameOptionalModel(binding.definition?.model, model)) return binding;
    }
    return null;
  }

  resolve(sessionId, { provider_id: providerId, model, workspace_root: workspaceRoot } = {}) {
    const binding = this.get(sessionId);
    if (!binding) throw fail('dsh_execution_binding_missing', 'No active AR execution is bound to this DSH session');
    if (providerId !== binding.definition.id
        || !sameOptionalModel(model, binding.definition.model)
        || workspaceRoot !== binding.context.workspace_root) {
      throw fail('dsh_execution_binding_mismatch', 'DSH CodeAgent request does not match the active AR workspace and provider');
    }
    return binding;
  }

  clear() {
    this.#active.clear();
  }
}

/** Convert only a transcript, never caller-supplied run facts, into local CodeAgent prompt text. */
export function promptFromDshRequest({ system = '', messages = [] } = {}, binding) {
  const config = binding?.context?.config && typeof binding.context.config === 'object' ? binding.context.config : {};
  const phase = binding?.context?.phase ?? 'unknown';
  const constraints = Array.isArray(binding?.context?.constraints) ? binding.context.constraints : [];
  const lines = [
    `You are executing one task from the ${binding?.context?.workflow ?? 'OpenHarmony AR'} workflow.`,
    `Run: ${binding?.runId ?? 'unknown'}; phase: ${phase}; task: ${binding?.taskId ?? 'unknown'}.`,
    `Environment: ${binding?.context?.environment_profile ?? config.environment ?? 'unresolved'}.`,
    `Workspace root: ${binding?.context?.workspace_root ?? 'unknown'}.`,
    `Pipeline directory: ${binding?.context?.pipeline_dir ?? 'unknown'}.`,
    `Read the AR request first at ${binding?.context?.pipeline_dir ? `${binding.context.pipeline_dir}/ar.md` : 'the pipeline ar.md file'}.`,
    'Use repository skills and trusted gate scripts. Do not edit pipeline state or claim a gate passed.',
    ...constraints.map((item) => `Constraint: ${item}`),
    '',
    'DSH session instructions:',
    typeof system === 'string' ? system : '',
    '',
    'DSH session messages:',
    ...messages.map((message) => {
      const role = typeof message?.role === 'string' ? message.role : 'user';
      const content = typeof message?.content === 'string' ? message.content : '';
      return `[${role}]\n${content}`;
    }),
  ];
  return lines.join('\n').trim();
}

function invocationFor(result, definition) {
  const source = result?.invocation && typeof result.invocation === 'object' ? result.invocation : {};
  const execution = typeof source.execution === 'string' && /^[a-z][a-z0-9_-]{0,63}$/u.test(source.execution)
    ? source.execution : 'dsh-local-codeagent';
  const workspaceMode = ['local', 'wsl', 'ssh', 'remote_tools', 'sshfs_mount'].includes(source.workspace_mode)
    ? source.workspace_mode : undefined;
  return {
    execution,
    provider: definition?.id ?? 'unknown',
    model: definition?.model ?? 'native-default',
    ...(workspaceMode ? { workspace_mode: workspaceMode } : {}),
  };
}

function bridgeResultFromEvents(events = []) {
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex--) {
    const event = events[eventIndex];
    if (event?.type !== 'tool/result') continue;
    const content = event?.data?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'tool-result' || block.toolCallId === undefined) continue;
      const text = Array.isArray(block.content)
        ? block.content.filter((item) => item?.type === 'text').map((item) => item.text).join('') : '';
      try {
        const value = JSON.parse(text);
        if (value && typeof value === 'object' && typeof value.output === 'string') return value;
      } catch { /* Ignore unrelated tool results. */ }
    }
  }
  return null;
}

function terminalFailure(events = []) {
  for (let index = events.length - 1; index >= 0; index--) {
    if (events[index]?.type !== 'turn/end') continue;
    const reason = events[index]?.data?.reason;
    if (reason?.kind === 'completed' || reason?.kind === 'max-tokens') return null;
    return fail('dsh_agent_turn_failed', `DSH local CodeAgent turn ended with ${reason?.kind ?? 'an unknown status'}`);
  }
  return fail('dsh_agent_turn_missing', 'DSH session returned no completed turn');
}

function stableSessionId(runId, workspaceRoot, providerId) {
  return `dsh-ar-${createHash('sha256').update(`${runId}\0${workspaceRoot}\0${providerId}`).digest('hex').slice(0, 32)}`;
}

export function createDshCodeAgentBridge({ bindings, runCodeAgent, probeCodeAgent = undefined } = {}) {
  if (!(bindings instanceof DshExecutionBindings)) throw new TypeError('bindings must be a DshExecutionBindings instance');
  if (typeof runCodeAgent !== 'function') throw new TypeError('runCodeAgent callback is required');

  return {
    async probe(payload = {}) {
      if (typeof payload.provider_id !== 'string' || payload.provider_id.trim() === '') {
        throw fail('dsh_codeagent_provider_invalid', 'CodeAgent provider id is missing');
      }
      const binding = bindings.find(payload.provider_id, payload.model ?? null);
      if (typeof probeCodeAgent === 'function') {
        return await probeCodeAgent(payload, binding);
      }
      return { available: binding?.definition?.available !== false && binding?.definition?.dispatchable !== false };
    },
    async execute(payload = {}, { signal } = {}) {
      if (!validSessionId(payload.session_id)) throw fail('dsh_codeagent_session_invalid', 'DSH session id is invalid');
      const binding = bindings.resolve(payload.session_id, payload);
      if (signal?.aborted) throw fail('codeagent_cancelled', 'Selected local CodeAgent execution was cancelled');
      const context = {
        ...binding.context,
        analysis_mode: true,
        prompt_override: promptFromDshRequest(payload, binding),
      };
      const result = await runCodeAgent({
        definition: binding.definition,
        context,
        claim: binding.claim,
        runId: binding.runId,
        signal,
        sessionId: binding.sessionId,
      }, { signal, execution: binding });
      const output = typeof result?.stdout === 'string' ? result.stdout
        : typeof result?.output === 'string' ? result.output
          : typeof result?.summary === 'string' ? result.summary : '';
      if (result?.exitCode !== undefined && result.exitCode !== 0) {
        throw fail('codeagent_execution_failed', 'Selected local CodeAgent exited unsuccessfully');
      }
      if (!output.trim()) throw fail('codeagent_output_missing', 'Selected local CodeAgent returned no output');
      const artifactRefs = result?.artifact_refs ?? result?.artifactRefs;
      const durationMs = result?.duration_ms ?? result?.durationMs;
      return {
        output,
        ...(typeof result?.stderr === 'string' ? { stderr: result.stderr } : {}),
        ...(result?.usage && typeof result.usage === 'object' ? { usage: result.usage } : {}),
        ...(Number.isSafeInteger(durationMs) && durationMs >= 0 ? { duration_ms: durationMs } : {}),
        ...(Array.isArray(artifactRefs) ? { artifact_refs: artifactRefs } : {}),
        invocation: invocationFor(result, binding.definition),
      };
    },
  };
}

export function createDshCodeAgentExecutor({ dshRuntime, runCodeAgent, probeCodeAgent = undefined } = {}) {
  if (!dshRuntime || typeof dshRuntime.run !== 'function') throw new TypeError('dshRuntime.run is required');
  const bindings = new DshExecutionBindings();
  const bridge = createDshCodeAgentBridge({ bindings, runCodeAgent, probeCodeAgent });
  if (typeof dshRuntime.setCodeAgentBridge !== 'function') {
    throw new TypeError('dshRuntime.setCodeAgentBridge is required for the Local Core callback routes');
  }
  dshRuntime.setCodeAgentBridge(bridge);

  return {
    bindings,
    bridge,
    async run({ definition, context, claim, runId, signal } = {}) {
      if (!definition || definition.available === false || definition.dispatchable === false) {
        throw fail('codeagent_adapter_unavailable', 'Selected local CodeAgent is not available');
      }
      if (typeof context?.workspace_root !== 'string' || typeof context?.pipeline_dir !== 'string') {
        throw fail('dsh_execution_context_invalid', 'AR workspace and pipeline directories are required');
      }
      const providerId = definition.id;
      const workspaceRoot = context.workspace_root;
      const sessionId = await stableSessionId(runId ?? claim?.run_id ?? 'unknown', workspaceRoot, providerId);
      const release = bindings.bind(sessionId, {
        runId, phase: context.phase, attemptId: claim?.attempt_id ?? null,
        taskId: claim?.task_id ?? null, claim, definition, context,
      });
      const prompt = promptFromDshRequest({
        system: 'Execute the requested AR workflow task using the selected local CodeAgent.',
        messages: [{ role: 'user', content: `Continue the ${context.phase ?? 'unknown'} phase for run ${runId ?? 'unknown'}.` }],
      }, { runId, phase: context.phase, taskId: claim?.task_id, context });
      try {
        const result = await dshRuntime.run({
          sessionId,
          provider: localCodeAgentProvider(providerId),
          model: typeof definition.model === 'string' && definition.model.trim() ? definition.model : 'native-default',
          cwd: workspaceRoot,
          prompt,
          signal,
        });
        const failure = terminalFailure(result?.events);
        if (failure) throw failure;
        const execution = bridgeResultFromEvents(result?.events ?? []);
        const output = typeof result?.finalResponse === 'string' ? result.finalResponse : execution?.output ?? '';
        if (!output.trim()) throw fail('dsh_agent_output_missing', 'DSH returned no local CodeAgent response');
        return {
          artifactRefs: execution?.artifact_refs ?? [],
          summary: output.trim().replace(/\s+/gu, ' ').slice(0, 4096),
          stdout: output,
          stderr: execution?.stderr ?? '',
          exitCode: 0,
          durationMs: execution?.duration_ms ?? 0,
          usage: execution?.usage ?? null,
          invocation: execution?.invocation ?? invocationFor({}, definition),
          dshSessionId: sessionId,
          dshEvents: Array.isArray(result?.events) ? result.events : [],
        };
      } finally {
        release();
      }
    },
    async close() {
      bindings.clear();
      await dshRuntime.close?.();
    },
  };
}
