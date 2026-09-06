import { ProtocolError } from '../core/errors.js';
import { mcpTools } from '../tools/catalog.js';

export const MCP_PROTOCOL_VERSION = '2025-06-18';
const SUPPORTED_VERSIONS = new Set(['2024-11-05', '2025-03-26', MCP_PROTOCOL_VERSION]);

export class McpServer {
  constructor({ catalog, serverName = 'ohos-dsh', serverVersion = '0.2.0' }) {
    this.catalog = catalog;
    this.serverName = serverName;
    this.serverVersion = serverVersion;
    this.initializeReceived = false;
    this.initialized = false;
  }

  async receive(message) {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
      return rpcError(null, -32600, 'Invalid JSON-RPC request.');
    }
    if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return rpcError(message.id ?? null, -32600, 'Invalid JSON-RPC request.');
    }
    const isNotification = message.id === undefined;
    if (isNotification) {
      if (message.method === 'notifications/initialized' && this.initializeReceived) {
        this.initialized = true;
      }
      return null;
    }
    try {
      return { jsonrpc: '2.0', id: message.id, result: await this.#request(message) };
    } catch (error) {
      const code = error instanceof ProtocolError && error.code === 'method_not_found'
        ? -32601
        : error instanceof ProtocolError && error.code === 'mcp_not_initialized'
          ? -32002 : -32602;
      return rpcError(message.id, code, error.message,
        error instanceof ProtocolError ? error.details : undefined);
    }
  }

  async #request(message) {
    switch (message.method) {
      case 'initialize': {
        const requested = message.params?.protocolVersion;
        const protocolVersion = SUPPORTED_VERSIONS.has(requested)
          ? requested : MCP_PROTOCOL_VERSION;
        this.initializeReceived = true;
        return {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: this.serverName, version: this.serverVersion },
          instructions: 'Use start tools from a parent agent. A host-native subagent must claim one scoped task, write only to its candidate area, and submit artifact references. Submission never grants workflow PASS.',
        };
      }
      case 'ping':
        return {};
      case 'tools/list':
        this.#requireInitialized();
        return { tools: mcpTools(this.catalog) };
      case 'tools/call': {
        this.#requireInitialized();
        const name = message.params?.name;
        if (typeof name !== 'string' || !this.catalog.has(name)) {
          throw new ProtocolError('method_not_found', `Unknown tool: ${String(name)}`);
        }
        const outcome = await this.catalog.get(name).call(message.params?.arguments ?? {});
        const text = JSON.stringify(outcome.ok ? outcome.result : outcome.error);
        return {
          content: [{ type: 'text', text }],
          structuredContent: outcome.ok ? outcome.result : { error: outcome.error },
          isError: !outcome.ok,
        };
      }
      default:
        throw new ProtocolError('method_not_found', `Method not found: ${message.method}`);
    }
  }

  #requireInitialized() {
    if (!this.initialized) {
      throw new ProtocolError('mcp_not_initialized',
        'MCP initialization has not completed.');
    }
  }
}

function rpcError(id, code, message, data = undefined) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  };
}
