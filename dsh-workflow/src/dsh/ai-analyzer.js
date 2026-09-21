import { randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';

const MAX_PROMPT_BYTES = 128 * 1024;

function analyzerError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function nestedText(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(nestedText).filter(Boolean).join('\n').trim();
  if (!value || typeof value !== 'object') return '';
  for (const key of ['result', 'output_text', 'text', 'content', 'message', 'part', 'item', 'delta']) {
    const text = nestedText(value[key]);
    if (text) return text;
  }
  return '';
}

function assistantText(stdout, stderr) {
  const source = String(stdout ?? '').trim();
  const candidates = [];
  for (const line of source.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const text = nestedText(JSON.parse(line));
      if (text && !candidates.includes(text)) candidates.push(text);
    } catch {
      // A normal CLI may print plain text instead of JSON.
    }
  }
  if (candidates.length > 0) return candidates.at(-1);
  if (source) return source;
  return String(stderr ?? '').trim();
}

function conversationPrompt(prompt, history) {
  if (history === undefined) return prompt;
  if (!Array.isArray(history)) throw analyzerError('ai_history_invalid', 'AI conversation history must be an array');
  const rows = history.slice(-12).map((item) => {
    const role = item?.role;
    const content = typeof item?.content === 'string' ? item.content.trim() : '';
    if (!['user', 'assistant'].includes(role) || !content || content.length > 8000) {
      throw analyzerError('ai_history_invalid', 'AI conversation history contains an invalid message');
    }
    return `${role === 'user' ? '用户' : 'CodeAgent'}：${content}`;
  });
  if (rows.length === 0) return prompt;
  return [
    '以下是同一个 CodeAgent 问题分析窗口中的此前对话，仅用于理解上下文：',
    ...rows,
    `当前用户请求：\n${prompt}`,
  ].join('\n\n');
}

/**
 * Create the authenticated HTTP fallback used when the DSH root model cannot
 * start. It intentionally reuses the same selected CodeAgent registry and
 * executor as the P0-P8 scheduler, so local, Gateway, and Connector deployments
 * all preserve their configured execution boundary.
 */
export function createCodeAgentAnalyzer({ workspaceRoot, codeAgents, executor, timeoutMs = 120_000 } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw analyzerError('ai_analysis_unavailable', 'AI analysis timeout must be a positive integer');
  }
  let current = null;
  let last = null;

  const publicCurrent = () => {
    if (!current) return null;
    return {
      request_id: current.requestId,
      started_at: current.startedAt,
      timeout_ms: timeoutMs,
      ...(current.agent ? { agent: current.agent } : {}),
    };
  };

  const analyzeWithSelectedCodeAgent = async function analyzeWithSelectedCodeAgent({ prompt, history, signal } = {}) {
    const text = typeof prompt === 'string' ? prompt.trim() : '';
    if (!text) throw analyzerError('ai_prompt_required', 'AI analysis prompt is required');
    const effectivePrompt = conversationPrompt(text, history);
    const bytes = Buffer.byteLength(effectivePrompt, 'utf8');
    if (bytes > MAX_PROMPT_BYTES) {
      throw analyzerError('ai_prompt_too_large', `AI analysis prompt exceeds ${MAX_PROMPT_BYTES} bytes`, {
        max_bytes: MAX_PROMPT_BYTES,
        actual_bytes: bytes,
      });
    }
    if (current) throw analyzerError('ai_analysis_busy', 'another AI analysis request is already running');
    if (typeof workspaceRoot !== 'string' || !isAbsolute(workspaceRoot)) {
      throw analyzerError('ai_analysis_unavailable', 'AI analysis workspace is not configured');
    }
    if (typeof codeAgents?.resolveSelected !== 'function' || typeof executor?.run !== 'function') {
      throw analyzerError('ai_analysis_unavailable', 'selected CodeAgent execution is unavailable');
    }

    const requestId = `ai-${randomUUID()}`;
    const startedAt = new Date().toISOString();
    const startedTime = Date.now();
    const controller = new AbortController();
    current = { requestId, startedAt, startedTime, controller, agent: null };
    const timeoutError = analyzerError(
      'ai_analysis_timeout',
      `CodeAgent analysis exceeded the ${timeoutMs} ms time limit`,
      { timeout_ms: timeoutMs },
    );
    const timeout = setTimeout(() => controller.abort(timeoutError), timeoutMs);
    const abortFromCaller = () => controller.abort(analyzerError(
      'ai_analysis_cancelled',
      'CodeAgent analysis was cancelled because the browser request closed',
    ));
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener?.('abort', abortFromCaller, { once: true });
    let rejectOnAbort;
    const aborted = new Promise((resolve, reject) => { rejectOnAbort = reject; });
    const rejectAbort = () => rejectOnAbort(controller.signal.reason ?? analyzerError(
      'ai_analysis_cancelled',
      'CodeAgent analysis was cancelled',
    ));
    if (controller.signal.aborted) rejectAbort();
    else controller.signal.addEventListener('abort', rejectAbort, { once: true });
    const bounded = (promise) => {
      const operation = Promise.resolve(promise);
      operation.catch(() => {});
      return Promise.race([operation, aborted]);
    };

    try {
      const definition = await bounded(codeAgents.resolveSelected(undefined, { requireDispatchable: true }));
      const agent = {
        id: definition.id ?? definition.provider ?? 'unknown',
        name: definition.name ?? definition.id ?? definition.provider ?? 'CodeAgent',
        execution_mode: definition.execution_mode ?? null,
      };
      current.agent = agent;
      const result = await bounded(executor.run({
        definition,
        signal: controller.signal,
        context: {
          run_id: 'ai-analysis',
          attempt_id: requestId,
          phase: 'AI',
          role: 'diagnostician',
          workflow: 'DSH AI problem analysis',
          workspace_root: workspaceRoot,
          pipeline_dir: join(workspaceRoot, '.dsh', 'ai-analysis'),
          analysis_mode: true,
          prompt_override: effectivePrompt,
          constraints: ['Analyze only. Do not modify source code, configuration, devices, or workflow state.'],
        },
      }));
      const message = assistantText(result?.stdout, result?.stderr);
      if (!message) throw analyzerError('ai_analysis_empty', `${definition.name ?? definition.id ?? 'CodeAgent'} returned no text`);
      const response = {
        backend: 'codeagent',
        request_id: requestId,
        agent,
        message,
        usage: result?.usage ?? null,
        duration_ms: Number.isSafeInteger(result?.durationMs) ? result.durationMs : null,
      };
      last = {
        ...publicCurrent(),
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedTime,
      };
      return response;
    } catch (cause) {
      let error = cause;
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        error = reason instanceof Error
          ? reason
          : analyzerError('ai_analysis_cancelled', String(reason || 'CodeAgent analysis was cancelled'));
      }
      const status = error?.code === 'ai_analysis_timeout'
        ? 'timeout'
        : error?.code === 'ai_analysis_cancelled' ? 'cancelled' : 'failed';
      last = {
        ...publicCurrent(),
        status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedTime,
        error: {
          code: error?.code ?? 'ai_analysis_failed',
          message: error?.message ?? String(error),
        },
      };
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener?.('abort', abortFromCaller);
      controller.signal.removeEventListener('abort', rejectAbort);
      if (current?.requestId === requestId) current = null;
    }
  };

  analyzeWithSelectedCodeAgent.status = () => ({
    available: true,
    running: current !== null,
    ...(publicCurrent() ?? {}),
    ...(last ? { last } : {}),
  });
  analyzeWithSelectedCodeAgent.cancel = (reason = 'cancelled by user') => {
    if (!current) return { cancelled: false, reason: 'no_analysis_running', ...(last ? { last } : {}) };
    const requestId = current.requestId;
    const message = typeof reason === 'string' && reason.trim() ? reason.trim() : 'cancelled by user';
    current.controller.abort(analyzerError('ai_analysis_cancelled', message));
    return { cancelled: true, request_id: requestId, reason: message };
  };
  return analyzeWithSelectedCodeAgent;
}

export { MAX_PROMPT_BYTES };
