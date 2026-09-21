const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function fail(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('connector_workspace_request_invalid', `${field} must be an object`, { field });
  }
  return value;
}

function operationId(envelope) {
  const value = envelope?.operation_id;
  if (typeof value !== 'string' || value.length === 0 || value.length > 256 || /[\0\r\n]/u.test(value)) {
    fail('connector_workspace_request_invalid', 'operation_id is invalid');
  }
  return value;
}

/**
 * Cloud-side Workspace Gateway facade backed by the authenticated Local
 * Connector WebSocket. Every workspace read/write/profile request is sent to
 * the user's Connector; the DSH host never executes an SSH, build, gate, or
 * device command itself.
 */
export class ConnectorWorkspaceGatewayClient {
  constructor({ connector, workspaceId, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!connector || typeof connector.request !== 'function' || typeof connector.snapshot !== 'function') {
      throw new TypeError('connector must expose request and snapshot');
    }
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') throw new TypeError('workspaceId is required');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs is invalid');
    this.connector = connector;
    this.workspaceId = workspaceId.trim();
    this.timeoutMs = timeoutMs;
  }

  async health() {
    const snapshot = await this.connector.snapshot();
    const workspace = snapshot?.workspaces?.find((item) => item?.workspace_id === this.workspaceId) ?? null;
    if (workspace?.connected !== true) {
      fail('local_connector_required', 'the Local Connector workspace is offline', { workspace_id: this.workspaceId });
    }
    return {
      status: 'ok',
      transport: 'local_connector',
      workspace_id: this.workspaceId,
      device_id: workspace.device_id ?? null,
    };
  }

  async execute(rawEnvelope, { signal } = {}) {
    const envelope = structuredClone(object(rawEnvelope, 'envelope'));
    const id = operationId(envelope);
    const command = {
      kind: 'workspace.execute',
      payload: {
        workspace_id: this.workspaceId,
        operation_id: id,
        envelope,
      },
    };
    const onAbort = () => {
      void this.connector.request(this.workspaceId, {
        kind: 'workspace.cancel',
        payload: { workspace_id: this.workspaceId, operation_id: `cancel-${id}`, target_operation_id: id },
      }, { timeoutMs: 10_000 }).catch(() => {});
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await this.connector.request(this.workspaceId, command, { signal, timeoutMs: this.timeoutMs });
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
