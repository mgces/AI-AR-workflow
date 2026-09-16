import { posix } from 'node:path';
import { CodeAgentExecutionError } from './codeagent-executor.js';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function executorError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function safeId(value, field) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 160 || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw executorError('connector_context_invalid', `${field} is invalid`, { field });
  }
  return value.trim();
}

function relativeRemote(root, requested, field) {
  if (typeof requested !== 'string' || requested.trim() === '' || requested.includes('\\') || requested.includes('\0') || !posix.isAbsolute(requested)) {
    throw executorError('connector_workspace_invalid', `${field} must be an absolute POSIX path`, { field });
  }
  const normalizedRoot = posix.normalize(root);
  const normalized = posix.normalize(requested);
  const value = normalized === normalizedRoot ? '.' : posix.relative(normalizedRoot, normalized);
  if (value === '..' || value.startsWith('../') || value.startsWith('/') || value.includes('/../')) {
    throw executorError('connector_workspace_outside_root', `${field} is outside the registered SSH root`, {
      field, root: normalizedRoot, requested: normalized,
    });
  }
  return value || '.';
}

function cloneContext(context, { workspaceRoot, pipelineDir } = {}) {
  const value = context && typeof context === 'object' && !Array.isArray(context) ? structuredClone(context) : {};
  delete value.workspace_root;
  delete value.pipeline_dir;
  // Keep the paths out of the cloud-to-local payload. They are reconstructed
  // from the two relative bindings below and cannot be used to escape them.
  delete value.repo_root;
  delete value.source_root;
  return { ...value, workspace_root_relative: workspaceRoot, pipeline_relative: pipelineDir };
}

function normalizeResult(value, definition, context) {
  if (!value || typeof value !== 'object') throw executorError('connector_result_invalid', 'local Connector returned no result');
  if (value.status === 'cancelled') throw new CodeAgentExecutionError(value.reason ?? 'CodeAgent execution was cancelled', 'codeagent_cancelled', value);
  if (value.status !== 'completed') throw executorError('connector_result_invalid', 'local Connector returned an incomplete CodeAgent result', { status: value.status ?? null });
  const exitCode = Number.isInteger(value.exitCode ?? value.exit_code) ? (value.exitCode ?? value.exit_code) : null;
  if (exitCode !== 0) throw new CodeAgentExecutionError(`CodeAgent exited with ${exitCode ?? 'unknown'}`, 'codeagent_failed', value);
  return {
    artifactRefs: Array.isArray(value.artifactRefs ?? value.artifact_refs) ? [...(value.artifactRefs ?? value.artifact_refs)] : [],
    summary: typeof value.summary === 'string' ? value.summary : String(value.stdout ?? value.stderr ?? '').trim().slice(-4096),
    stdout: String(value.stdout ?? ''),
    stderr: String(value.stderr ?? ''),
    exitCode,
    durationMs: Number.isSafeInteger(value.durationMs ?? value.duration_ms) ? (value.durationMs ?? value.duration_ms) : 0,
    usage: value.usage && typeof value.usage === 'object' ? structuredClone(value.usage) : null,
    invocation: {
      execution: 'local_connector',
      provider: definition?.id ?? null,
      model: definition?.model ?? context?.model ?? null,
      // Preserve the connector's actual workspace transport.  In
      // `remote_tools` mode the CLI runs in a disposable local sandbox and
      // edits the SSH checkout only through the short-lived MCP capability;
      // reporting it as SSHFS would make the DSH observability panel lie.
      workspace_mode: value.invocation?.workspace_mode
        ?? context?.workspace_mode
        ?? 'sshfs_mount',
    },
  };
}

/**
 * Cloud-side CodeAgent adapter. DSH never starts a local process itself: it
 * sends a bounded `agent.start` command to the user's Connector, which runs
 * the selected Claude/OpenCode/Codex/custom CLI either in the local SSHFS mount
 * or in a disposable local sandbox backed by the remote-tools MCP capability.
 */
export class ConnectorCodeAgentExecutor {
  constructor({ connector, workspaceId, remoteRoot, timeoutMs = DEFAULT_TIMEOUT_MS, requestTimeoutMs = timeoutMs } = {}) {
    if (!connector || typeof connector.request !== 'function') throw new TypeError('connector.request is required');
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') throw new TypeError('workspaceId is required');
    if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot)) throw new TypeError('remoteRoot must be an absolute POSIX path');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs is invalid');
    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) throw new TypeError('requestTimeoutMs is invalid');
    this.connector = connector;
    this.workspaceId = workspaceId.trim();
    this.remoteRoot = posix.normalize(remoteRoot);
    this.timeoutMs = timeoutMs;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  async probe() {
    return this.connector.request(this.workspaceId, { kind: 'probe', payload: { workspace_id: this.workspaceId } }, { timeoutMs: Math.min(this.requestTimeoutMs, 30_000) });
  }

  async cancel(operationId) {
    const value = safeId(operationId, 'operation_id');
    return this.connector.request(this.workspaceId, { kind: 'agent.cancel', payload: { operation_id: value } }, { timeoutMs: 10_000 });
  }

  async run({ definition, context, signal } = {}) {
    const workspaceRoot = relativeRemote(this.remoteRoot, context?.workspace_root, 'workspace_root');
    const pipelineDir = relativeRemote(this.remoteRoot, context?.pipeline_dir, 'pipeline_dir');
    const workspaceAbsolute = posix.normalize(context.workspace_root);
    const pipelineAbsolute = posix.normalize(context.pipeline_dir);
    const pipelineFromWorkspace = posix.relative(workspaceAbsolute, pipelineAbsolute);
    if (pipelineFromWorkspace === '..' || pipelineFromWorkspace.startsWith('../') || pipelineFromWorkspace.startsWith('/')) {
      throw executorError('connector_workspace_outside_root', 'pipeline_dir must stay inside workspace_root');
    }
    const operationId = safeId(context?.attempt_id ?? `attempt-${Date.now()}`, 'attempt_id');
    const agentId = safeId(definition?.id ?? definition?.provider, 'agent_id');
    const command = {
      kind: 'agent.start',
      payload: {
        operation_id: operationId,
        workspace_id: this.workspaceId,
        agent_id: agentId,
        ...(typeof definition?.model === 'string' && definition.model.trim() ? { model: definition.model.trim() } : {}),
        repo_relative: workspaceRoot,
        pipeline_relative: pipelineDir,
        context: cloneContext(context, { workspaceRoot, pipelineDir }),
      },
    };
    let cancelSent = false;
    const onAbort = () => {
      cancelSent = true;
      void this.cancel(operationId).catch(() => {});
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
    try {
      let value;
      try {
        value = await this.connector.request(this.workspaceId, command, { signal, timeoutMs: this.timeoutMs });
      } catch (error) {
        if (error?.code === 'connector_timeout') {
          // The request timer only stops waiting for the response; the local
          // Connector may still have a live CLI process. Send a best-effort
          // cancellation on a separate request before surfacing the timeout.
          await this.cancel(operationId).catch(() => {});
        }
        if (signal?.aborted || cancelSent || ['connector_aborted', 'connector_disconnected'].includes(error?.code)) {
          throw new CodeAgentExecutionError('CodeAgent execution was cancelled', 'codeagent_cancelled', { operation_id: operationId });
        }
        throw new CodeAgentExecutionError(error?.message ?? 'local Connector command failed', error?.code ?? 'connector_agent_failed', {
          operation_id: operationId, cause: error?.details ?? {},
        });
      }
      return normalizeResult(value, definition, context);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
