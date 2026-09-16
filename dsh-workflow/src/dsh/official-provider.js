import { randomUUID } from 'node:crypto';

function providerError(message, code, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function selectionFor(agentDefaultModel) {
  try {
    const selection = agentDefaultModel?.currentSelection?.();
    if (!selection?.provider || !selection?.model) return undefined;
    return {
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    };
  } catch {
    return undefined;
  }
}

function token(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function usageFromValue(value) {
  if (!value || typeof value !== 'object') return null;
  const input = token(value.input_tokens ?? value.inputTokens ?? value.prompt_tokens);
  const output = token(value.output_tokens ?? value.outputTokens ?? value.completion_tokens);
  const explicitTotal = token(value.total_tokens ?? value.totalTokens);
  const total = explicitTotal ?? (input !== null && output !== null ? input + output : null);
  const cacheRead = token(value.cache_read_tokens ?? value.cacheReadTokens);
  const cacheWrite = token(value.cache_write_tokens ?? value.cacheWriteTokens);
  const reasoning = token(value.reasoning_tokens ?? value.reasoningTokens);
  if (input === null && output === null && total === null
      && cacheRead === null && cacheWrite === null && reasoning === null) return null;
  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    reasoning_tokens: reasoning,
  };
}

function addToken(target, key, value) {
  if (value?.[key] !== null && value?.[key] !== undefined) target[key] += value[key];
}

function usageFromSession(session) {
  if (!session) return null;
  let events;
  try {
    events = typeof session.ownEvents === 'function'
      ? session.ownEvents()
      : typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : [];
  } catch {
    return null;
  }
  const total = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    reasoning_tokens: 0,
  };
  const seenKeys = new Set();
  let seen = false;
  for (const event of events ?? []) {
    if (event?.type !== 'assistant/message') continue;
    const usage = usageFromValue(event.data?.usage ?? event.usage);
    if (!usage) continue;
    seen = true;
    for (const key of Object.keys(total)) {
      if (usage[key] !== null && usage[key] !== undefined) seenKeys.add(key);
      addToken(total, key, usage);
    }
  }
  if (!seen) return null;
  for (const key of Object.keys(total)) if (!seenKeys.has(key)) total[key] = null;
  return total;
}

function usageFor(childRun, result) {
  const sessionUsage = usageFromSession(childRun?.localAgent?.session);
  return sessionUsage ?? usageFromValue(result?.usage);
}

function childAgentOptions(definition, fallback) {
  const provider = definition?.provider ?? fallback?.provider;
  // A provider-specific child must use that adapter's own default model. The
  // parent DSH model is only a fallback when the child stays on the same
  // provider; forwarding a DeepSeek model id to Claude Code is invalid.
  const model = definition?.model
    ?? (definition?.provider && definition.provider !== fallback?.provider ? undefined : fallback?.model);
  if (!provider && !model && !fallback?.reasoningEffort) return undefined;
  return {
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(fallback?.reasoningEffort ? { reasoningEffort: fallback.reasoningEffort } : {}),
  };
}

/**
 * Build the bridge used by the AR scheduler for DSH-native providers.
 *
 * DSH's provider contract intentionally requires a live parent Agent. A
 * background HTTP request has no initiator, so every task gets a short-lived
 * root parent whose cwd is the task workspace. The child result is awaited and
 * both the child run and parent handle are disposed before the task is
 * submitted to the authoritative runtime.
 */
export function createOfficialProviderRunner({ subagents, agents, agentDefaultModel } = {}) {
  if (typeof subagents?.start !== 'function' || typeof agents?.create !== 'function') return null;
  return async function runOfficialProvider({ definition, context, prompt, signal } = {}) {
    const provider = definition?.provider ?? definition?.id;
    if (!provider) throw providerError('official provider name is required', 'codeagent_provider_invalid');
    const workspace = context?.workspace_root;
    if (typeof workspace !== 'string' || workspace.length === 0) {
      throw providerError('official provider requires an absolute task workspace', 'agent_context_invalid');
    }
    let parentHandle;
    let childRun;
    let failure = null;
    try {
      const parentAgentOptions = selectionFor(agentDefaultModel);
      const childOptions = childAgentOptions(definition, parentAgentOptions);
      parentHandle = await agents.create({
        sessionId: `dsh-ar-parent-${randomUUID()}`,
        meta: { cwd: workspace },
        ...(parentAgentOptions ? { agentOptions: parentAgentOptions } : {}),
      });
      if (!parentHandle?.agent) {
        throw providerError('DSH agent registry returned no parent Agent', 'codeagent_parent_unavailable');
      }
      childRun = await subagents.start(provider, {
        label: `AR ${context.phase ?? 'task'} ${context.role ?? ''}`.trim(),
        parent: parentHandle.agent,
        prompt: [{ type: 'text', text: String(prompt ?? '') }],
        signal: signal ?? new AbortController().signal,
        ...(childOptions ? { agentOptions: childOptions } : {}),
      });
      if (!childRun?.result || typeof childRun.result.then !== 'function') {
        throw providerError('DSH provider returned no result promise', 'codeagent_provider_invalid');
      }
      const result = await childRun.result;
      if (result?.stopReason !== 'completed') {
        const reason = result?.stopReason ?? 'unknown';
        const code = reason === 'aborted' ? 'codeagent_cancelled'
          : reason === 'max-tokens' ? 'codeagent_provider_max_tokens'
            : reason === 'refusal' ? 'codeagent_provider_refusal'
              : 'codeagent_provider_failed';
        throw providerError(`DSH provider stopped with ${reason}`, code, {
          provider,
          stop_reason: reason,
          diagnostic: result?.diagnostic ?? null,
        });
      }
      return {
        output: result.output ?? [],
        structured: result.structured,
        usage: usageFor(childRun, result),
        diagnostic: result.diagnostic,
        provider_run_id: childRun.id ?? null,
      };
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      try {
        await childRun?.dispose?.();
      } catch (error) {
        if (!failure) throw providerError(`failed to dispose DSH provider run: ${error.message}`, 'codeagent_cleanup_failed');
      }
      try {
        await parentHandle?.dispose?.();
      } catch (error) {
        if (!failure) throw providerError(`failed to dispose DSH parent Agent: ${error.message}`, 'codeagent_cleanup_failed');
      }
    }
  };
}
