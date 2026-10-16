import { randomUUID } from 'node:crypto';

function fail(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function cloneContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    fail('dsh_context_invalid', 'AR scheduler context is required for a DSH CodeAgent turn');
  }
  return structuredClone(context);
}

function safeProvider(value) {
  if (typeof value !== 'string' || !['claude-code', 'opencode', 'codex', 'custom'].includes(value)) {
    fail('dsh_provider_invalid', 'selected local CodeAgent provider is not supported');
  }
  return value;
}

export function createDshCodeAgentExecutor({ runtime, sessionRegistry = new Map(), promptBuilder } = {}) {
  if (!runtime || typeof runtime.run !== 'function') throw new TypeError('runtime.run is required');
  if (!(sessionRegistry instanceof Map)) throw new TypeError('sessionRegistry must be a Map');
  if (promptBuilder !== undefined && typeof promptBuilder !== 'function') throw new TypeError('promptBuilder must be a function');

  return {
    async run({ definition, context, signal } = {}) {
      const providerId = safeProvider(definition?.id ?? definition?.provider);
      const model = typeof definition?.model === 'string' && definition.model.trim() ? definition.model.trim() : null;
      const boundContext = cloneContext(context);
      const sessionId = `ar-${randomUUID()}`;
      const entry = {
        session_id: sessionId,
        provider_id: providerId,
        model,
        context: boundContext,
        execution: null,
      };
      sessionRegistry.set(sessionId, entry);
      try {
        const prompt = promptBuilder
          ? await promptBuilder(boundContext, definition)
          : `Execute the ${boundContext.workflow ?? 'AR'} workflow task for run ${boundContext.run_id ?? 'unknown'}, phase ${boundContext.phase ?? 'unknown'}, role ${boundContext.role ?? 'unknown'}. Follow all local workflow instructions and report only evidence-backed results.`;
        if (typeof prompt !== 'string' || prompt.trim() === '') fail('dsh_prompt_invalid', 'AR workflow prompt is empty');
        const turn = await runtime.run({
          provider_id: providerId, model, session_id: sessionId, prompt, signal,
        });
        if (entry.execution_error && typeof entry.execution_error === 'object') {
          throw Object.assign(new Error(entry.execution_error.message ?? 'local CodeAgent execution failed'), {
            code: entry.execution_error.code ?? 'codeagent_failed',
          });
        }
        const execution = entry.execution;
        if (!execution || typeof execution !== 'object' || Array.isArray(execution)) {
          fail('dsh_local_execution_missing', 'DSH session finished without a local CodeAgent execution result');
        }
        const artifactRefs = execution.artifactRefs ?? execution.artifact_refs;
        if (!Array.isArray(artifactRefs) || artifactRefs.length === 0) {
          fail('agent_artifacts_missing', 'local CodeAgent did not produce required AR workflow evidence');
        }
        const exitCode = execution.exitCode ?? execution.exit_code ?? 0;
        if (exitCode !== 0) fail('codeagent_failed', `local CodeAgent exited with ${exitCode}`, execution);
        return {
          ...execution,
          summary: typeof execution.summary === 'string' && execution.summary.trim()
            ? execution.summary : String(turn?.final_response ?? '').trim(),
          stdout: String(execution.stdout ?? turn?.final_response ?? ''),
          stderr: String(execution.stderr ?? ''),
          exitCode,
          durationMs: Number.isSafeInteger(execution.durationMs ?? execution.duration_ms)
            ? execution.durationMs ?? execution.duration_ms : 0,
          artifactRefs: [...new Set(artifactRefs)],
          invocation: {
            ...(execution.invocation && typeof execution.invocation === 'object' ? execution.invocation : {}),
            execution: 'dsh-sdk-local-codeagent', provider: providerId, model,
            dsh_session_id: sessionId,
          },
        };
      } finally {
        sessionRegistry.delete(sessionId);
      }
    },
  };
}
