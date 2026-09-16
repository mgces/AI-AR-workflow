#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { createConnection, createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { createAuthorityEnvelope } from '../authority/envelope.js';

const MCP_PROTOCOL_VERSION = '2024-11-05';
const MAX_LINE_BYTES = 512 * 1024;
const MAX_ARGUMENT_BYTES = 512 * 1024;
const MAX_PROFILE_VARIABLES = 64;

const TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'dsh_workspace_probe',
    description: 'Verify the registered SSH workspace is a readable directory or file.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        path: { type: 'string', description: 'Path relative to the registered SSH root.' },
        expect: { type: 'string', enum: ['directory', 'file'] },
        require_write: { type: 'boolean' },
        require_executable: { type: 'boolean' },
      },
    },
  },
  {
    name: 'dsh_workspace_list',
    description: 'List files below the registered SSH workspace.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        path: { type: 'string' }, recursive: { type: 'boolean' },
        max_entries: { type: 'integer', minimum: 1, maximum: 10000 },
        with_metadata: { type: 'boolean' },
      },
    },
  },
  {
    name: 'dsh_workspace_read',
    description: 'Read a UTF-8 text file from the registered SSH workspace.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: { type: 'string' } } },
  },
  {
    name: 'dsh_workspace_search',
    description: 'Search literal text in files below the registered SSH workspace.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['query'],
      properties: {
        path: { type: 'string' }, query: { type: 'string', minLength: 1 },
        glob: { type: 'string' }, max_results: { type: 'integer', minimum: 1, maximum: 2000 },
      },
    },
  },
  {
    name: 'dsh_workspace_write',
    description: 'Write a UTF-8 file below the registered SSH workspace, optionally using a CAS hash.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['path', 'content'],
      properties: {
        path: { type: 'string' }, content: { type: 'string' }, expected_sha256: { type: 'string' },
      },
    },
  },
  {
    name: 'dsh_workspace_diff',
    description: 'Read the git diff from the registered SSH workspace.',
    inputSchema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' } } },
  },
  {
    name: 'dsh_workspace_hash',
    description: 'Return SHA-256 and byte count for a remote artifact.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: { type: 'string' } } },
  },
  {
    name: 'dsh_workspace_read_binary',
    description: 'Read a bounded remote binary artifact as base64.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: { type: 'string' } } },
  },
  {
    name: 'dsh_workspace_exec_profile',
    description: 'Run one administrator-registered workspace profile such as a build or test command.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['profile_id'],
      properties: {
        profile_id: { type: 'string' },
        variables: { type: 'object', additionalProperties: true },
      },
    },
  },
]);

const TOOL_OPERATIONS = Object.freeze({
  dsh_workspace_probe: 'workspace.probe',
  dsh_workspace_list: 'workspace.list',
  dsh_workspace_read: 'workspace.read',
  dsh_workspace_search: 'workspace.search',
  dsh_workspace_write: 'workspace.write',
  dsh_workspace_diff: 'workspace.diff',
  dsh_workspace_hash: 'workspace.hash',
  dsh_workspace_read_binary: 'workspace.read_binary',
  dsh_workspace_exec_profile: 'workspace.exec_profile',
});

function mcpError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function safeObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw mcpError('remote_tools_arguments_invalid', `${field} must be an object`, { field });
  }
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_ARGUMENT_BYTES) {
    throw mcpError('remote_tools_arguments_too_large', `${field} exceeds the configured limit`, { field });
  }
  return value;
}

function safeProfileId(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 128
      || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw mcpError('remote_tools_profile_invalid', 'profile_id is invalid');
  }
  return value.trim();
}

function unwrap(value) {
  if (value?.status === 'completed' && value.result && typeof value.result === 'object') return value.result;
  if (value?.status === 'failed') {
    throw mcpError(value.error?.code ?? 'remote_tools_operation_failed', value.error?.message ?? 'workspace operation failed', value.error?.details ?? {});
  }
  return value;
}

function defaultAuthorityContext(workspaceId, value = {}) {
  return {
    tenant_id: 'local-connector',
    workspace_id: workspaceId,
    cloud_run_id: 'local-remote-tools',
    authority_run_id: 'local-remote-tools',
    revision: 1,
    phase_epoch: 'local-remote-tools',
    connection_epoch: 1,
    ...value,
  };
}

/**
 * Model-facing SSH workspace tool boundary. The CodeAgent receives only a
 * short-lived MCP capability; SSH credentials and the WorkspaceConnector stay
 * in the parent Connector process. Every call is translated to the existing
 * Authority envelope and fixed WorkspaceConnector operation vocabulary.
 */
export class RemoteToolsBroker {
  constructor({ connector, workspaceId, authorityContext = {}, sign = null, allowedProfiles = [], socketPath = null, token = randomUUID() } = {}) {
    if (!connector || typeof connector.execute !== 'function') throw new TypeError('connector.execute is required');
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') throw new TypeError('workspaceId is required');
    if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
    if (!Array.isArray(allowedProfiles) || allowedProfiles.some((item) => typeof item !== 'string')) {
      throw new TypeError('allowedProfiles must be an array of strings');
    }
    if (typeof token !== 'string' || token.length < 16 || token.length > 256) throw new TypeError('token is invalid');
    this.connector = connector;
    this.workspaceId = workspaceId.trim();
    this.authorityContext = defaultAuthorityContext(this.workspaceId, authorityContext);
    this.sign = sign;
    this.allowedProfiles = new Set(allowedProfiles.map((item) => item.trim()).filter(Boolean));
    this.socketPath = socketPath;
    this.token = token;
    this.server = null;
    this.connections = new Set();
  }

  tools() {
    return TOOL_DEFINITIONS.map((item) => structuredClone(item));
  }

  async handleTool(name, args = {}, { signal = null, operationId = null } = {}) {
    if (typeof name !== 'string' || !Object.hasOwn(TOOL_OPERATIONS, name)) {
      throw mcpError('remote_tools_tool_not_allowed', `tool ${name ?? ''} is not allowed`);
    }
    const input = safeObject(args, 'arguments');
    const operationKind = TOOL_OPERATIONS[name];
    const payload = { operation_kind: operationKind };
    for (const key of ['path', 'recursive', 'max_entries', 'with_metadata', 'query', 'glob', 'max_results', 'content', 'expected_sha256', 'expect', 'require_write', 'require_executable']) {
      if (Object.hasOwn(input, key)) payload[key] = input[key];
    }
    if (operationKind === 'workspace.exec_profile') {
      const profileId = safeProfileId(input.profile_id);
      if (!this.allowedProfiles.has(profileId)) {
        throw mcpError('remote_tools_profile_not_allowed', `profile ${profileId} is not registered for remote CodeAgent tools`, { profile_id: profileId });
      }
      const variables = input.variables === undefined ? {} : safeObject(input.variables, 'variables');
      if (Object.keys(variables).length > MAX_PROFILE_VARIABLES) throw mcpError('remote_tools_variables_too_many', 'profile variables exceed the configured limit');
      payload.profile_id = profileId;
      payload.variables = structuredClone(variables);
    }
    if (operationKind === 'workspace.search' && (typeof payload.query !== 'string' || payload.query.length === 0)) {
      throw mcpError('remote_tools_query_invalid', 'search query is required');
    }
    const effectiveOperationId = operationId ?? `remote-tools-${randomUUID()}`;
    const fields = {
      ...this.authorityContext,
      message_type: 'operation.start',
      operation_id: effectiveOperationId,
      nonce: randomUUID(),
      sent_at: new Date().toISOString(),
      payload,
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signature = this.sign ? await this.sign(unsigned) : { key_id: 'local-connector', value: 'local-capability' };
    if (!signature || typeof signature !== 'object') throw mcpError('remote_tools_signature_unconfigured', 'remote tools authority signature is not configured');
    const executePromise = this.connector.execute(createAuthorityEnvelope({ ...fields, signature }));
    let response;
    if (signal) {
      const abortPromise = new Promise((_, reject) => {
        if (signal.aborted) reject(mcpError('remote_tools_cancelled', 'remote tools request was cancelled'));
        else signal.addEventListener('abort', () => reject(mcpError('remote_tools_cancelled', 'remote tools request was cancelled')), { once: true });
      });
      try {
        response = await Promise.race([executePromise, abortPromise]);
      } catch (error) {
        if (signal.aborted) void this.#cancelOperation(effectiveOperationId).catch(() => {});
        // The remote connector may finish after the MCP client disconnects;
        // consume that outcome so it cannot become an unhandled rejection.
        void executePromise.catch(() => {});
        throw error;
      }
    } else {
      response = await executePromise;
    }
    return unwrap(response);
  }

  async #cancelOperation(targetOperationId) {
    const fields = {
      ...this.authorityContext,
      message_type: 'operation.cancel',
      operation_id: `remote-tools-cancel-${randomUUID()}`,
      nonce: randomUUID(),
      sent_at: new Date().toISOString(),
      payload: { target_operation_id: targetOperationId },
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signature = this.sign ? await this.sign(unsigned) : { key_id: 'local-connector', value: 'local-capability' };
    if (!signature || typeof signature !== 'object') return null;
    return this.connector.execute(createAuthorityEnvelope({ ...fields, signature }));
  }

  async start() {
    if (this.server) return this;
    if (typeof this.socketPath !== 'string' || this.socketPath.trim() === '') throw new TypeError('socketPath is required to start the broker');
    this.server = createServer((socket) => this.#handleConnection(socket));
    await new Promise((resolve, reject) => {
      const onError = (error) => { this.server?.off('listening', onListening); reject(error); };
      const onListening = () => { this.server?.off('error', onError); resolve(); };
      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(this.socketPath);
    });
    return this;
  }

  async stop() {
    for (const socket of this.connections) socket.destroy();
    this.connections.clear();
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise((resolve) => server.close(() => resolve()));
  }

  mcpServerSpec({ command = process.execPath, args = [], env = {} } = {}) {
    if (!this.server || typeof this.socketPath !== 'string') throw mcpError('remote_tools_broker_not_started', 'start the remote tools broker before creating an MCP spec');
    return {
      command,
      args: [...args],
      env: { ...env, DSH_REMOTE_TOOLS_SOCKET: this.socketPath, DSH_REMOTE_TOOLS_TOKEN: this.token },
    };
  }

  async #handleConnection(socket) {
    this.connections.add(socket);
    let closed = false;
    const active = new Map();
    const activeByRequestId = new Map();
    const close = () => {
      if (closed) return;
      closed = true;
      this.connections.delete(socket);
      for (const entry of active.values()) entry.controller.abort();
      active.clear();
      activeByRequestId.clear();
    };
    socket.once('close', close);
    socket.once('error', close);
    const reader = createInterface({ input: socket, crlfDelay: Infinity, terminal: false });
    reader.on('line', (line) => {
      if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
        socket.end(`${JSON.stringify({ ok: false, error: { code: 'remote_tools_line_too_large', message: 'remote tools request is too large' } })}\n`);
        return;
      }
      let request;
      try { request = JSON.parse(line); } catch {
        socket.write(`${JSON.stringify({ ok: false, error: { code: 'remote_tools_json_invalid', message: 'remote tools request must be JSON' } })}\n`);
        return;
      }
      if (request?.type === 'cancel' || request?.method === 'notifications/cancelled') {
        const target = request.request_id ?? request.requestId ?? request.params?.requestId ?? request.params?.request_id;
        const entry = target === undefined ? null : activeByRequestId.get(String(target));
        if (entry) entry.controller.abort('cancelled by MCP client');
        return;
      }
      const requestOperationId = `remote-tools-${randomUUID()}`;
      const controller = new AbortController();
      const entry = { controller, requestId: request?.id };
      active.set(requestOperationId, entry);
      if (request?.id !== undefined && request?.id !== null) activeByRequestId.set(String(request.id), entry);
      Promise.resolve().then(async () => {
        if (request?.token !== this.token) throw mcpError('remote_tools_unauthorized', 'remote tools capability is invalid');
        const result = await this.handleTool(request.tool, request.arguments ?? {}, { signal: controller.signal, operationId: requestOperationId });
        return { id: request.id ?? null, ok: true, result };
      }).catch((error) => ({ id: request?.id ?? null, ok: false, error: {
        code: error?.code ?? 'remote_tools_failed', message: error?.message ?? String(error), details: error?.details ?? {},
      } })).then((response) => {
        active.delete(requestOperationId);
        if (request?.id !== undefined && request?.id !== null) activeByRequestId.delete(String(request.id));
        if (!closed && !socket.destroyed) socket.write(`${JSON.stringify(response)}\n`);
      });
    });
    reader.once('close', close);
  }
}

function writeJson(output, value) {
  try { output.write(`${JSON.stringify(value)}\n`); } catch { /* client closed */ }
}

function mcpSuccess(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function mcpFailure(id, code, message, details = {}) {
  return { jsonrpc: '2.0', id, error: { code, message, data: details } };
}

/** MCP stdio server used by Claude Code/OpenCode/Codex child processes. */
export function createRemoteToolsMcpStdio({ requestTool, tools = TOOL_DEFINITIONS, input = process.stdin, output = process.stdout, maxLineBytes = MAX_LINE_BYTES } = {}) {
  if (typeof requestTool !== 'function') throw new TypeError('requestTool is required');
  const server = {
    started: false,
    closed: false,
    start() {
      if (server.started || server.closed) return server;
      server.started = true;
      const active = new Map();
      const reader = createInterface({ input, crlfDelay: Infinity, terminal: false });
      reader.on('line', (line) => {
        if (Buffer.byteLength(line, 'utf8') > maxLineBytes) {
          writeJson(output, mcpFailure(null, -32600, 'MCP request is too large'));
          return;
        }
        let message;
        try { message = JSON.parse(line); } catch {
          writeJson(output, mcpFailure(null, -32700, 'MCP request must be valid JSON'));
          return;
        }
        if (!message || message.jsonrpc !== '2.0' || (message.id === undefined && !String(message.method ?? '').startsWith('notifications/'))) {
          if (message?.id !== undefined) writeJson(output, mcpFailure(message.id, -32600, 'invalid JSON-RPC request'));
          return;
        }
        const method = message.method;
        if (method === 'notifications/initialized') return;
        if (method === 'notifications/cancelled') {
          const target = message.params?.requestId ?? message.params?.request_id;
          const controller = target === undefined ? null : active.get(String(target));
          controller?.abort('cancelled by MCP client');
          return;
        }
        if (method === 'ping') { if (message.id !== undefined) writeJson(output, mcpSuccess(message.id, {})); return; }
        if (method === 'initialize') {
          writeJson(output, mcpSuccess(message.id, {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'dsh-remote-tools', version: '0.1.0' },
          }));
          return;
        }
        if (method === 'tools/list') {
          writeJson(output, mcpSuccess(message.id, { tools: tools.map((item) => structuredClone(item)) }));
          return;
        }
        if (method === 'tools/call') {
          const controller = new AbortController();
          if (message.id !== undefined && message.id !== null) active.set(String(message.id), controller);
          Promise.resolve().then(async () => {
            const name = message.params?.name;
            const args = message.params?.arguments ?? {};
            const value = await requestTool(name, args, { signal: controller.signal, requestId: message.id ?? null });
            return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
          }).then((result) => {
            if (!controller.signal.aborted) writeJson(output, mcpSuccess(message.id, result));
          }).catch((error) => {
            if (controller.signal.aborted) return;
            writeJson(output, mcpSuccess(message.id, {
              isError: true,
              content: [{ type: 'text', text: JSON.stringify({ code: error?.code ?? 'remote_tools_failed', message: error?.message ?? String(error), details: error?.details ?? {} }) }],
            }));
          }).finally(() => {
            if (message.id !== undefined && message.id !== null) active.delete(String(message.id));
          });
          return;
        }
        if (message.id !== undefined) writeJson(output, mcpFailure(message.id, -32601, `MCP method ${method} is not supported`));
      });
      reader.once('close', () => {
        server.closed = true;
        for (const controller of active.values()) controller.abort('MCP stdio closed');
        active.clear();
      });
      return server;
    },
    stop() {
      server.closed = true;
      input.destroy?.();
    },
  };
  return server;
}

function socketRequest(socketPath, token, tool, args, { signal = null, requestId = randomUUID() } = {}) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    let buffer = '';
    let settled = false;
    const onAbort = () => finish(() => reject(mcpError('remote_tools_cancelled', 'remote tools request was cancelled')));
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      socket.destroy();
      callback();
    };
    socket.once('error', (error) => finish(() => reject(error)));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      if (Buffer.byteLength(buffer, 'utf8') > MAX_LINE_BYTES) finish(() => reject(mcpError('remote_tools_response_too_large', 'remote tools response is too large')));
      const index = buffer.indexOf('\n');
      if (index < 0 || settled) return;
      const line = buffer.slice(0, index);
      let response;
      try { response = JSON.parse(line); } catch { finish(() => reject(mcpError('remote_tools_json_invalid', 'remote tools response was not JSON'))); return; }
      if (response.ok === true) finish(() => resolve(response.result));
      else finish(() => reject(mcpError(response.error?.code ?? 'remote_tools_failed', response.error?.message ?? 'remote tools request failed', response.error?.details ?? {})));
    });
    socket.once('connect', () => {
      if (signal?.aborted) { onAbort(); return; }
      socket.write(`${JSON.stringify({ id: requestId, token, tool, arguments: args })}\n`);
    });
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export async function runRemoteToolsMcpStdio({ socketPath = process.env.DSH_REMOTE_TOOLS_SOCKET, token = process.env.DSH_REMOTE_TOOLS_TOKEN } = {}) {
  if (typeof socketPath !== 'string' || socketPath.trim() === '' || typeof token !== 'string' || token.length < 16) {
    throw mcpError('remote_tools_configuration_invalid', 'DSH_REMOTE_TOOLS_SOCKET and DSH_REMOTE_TOOLS_TOKEN are required');
  }
  const server = createRemoteToolsMcpStdio({ requestTool: (name, args, options) => socketRequest(socketPath, token, name, args, options) });
  server.start();
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once('end', resolve));
}

if (process.argv[1] && process.argv[1].endsWith('remote-tools-mcp.js')) {
  runRemoteToolsMcpStdio().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export { MCP_PROTOCOL_VERSION, TOOL_DEFINITIONS };
