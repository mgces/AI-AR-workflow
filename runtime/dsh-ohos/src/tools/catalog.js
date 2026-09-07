import { ProtocolError, errorPayload } from '../core/errors.js';
import { CORE_TOOLS } from '../core/tools.js';
import { REQUIREMENT_TOOLS } from '../workflows/requirement/tools.js';
import { DELIVERY_TOOLS } from '../workflows/ar-delivery/tools.js';
import { POLICY_TOOLS } from '../policy/tools.js';

// Composition only: each domain owns its tool schema and business handler.
export const TOOL_DEFINITIONS = Object.freeze([
  ...CORE_TOOLS, ...REQUIREMENT_TOOLS, ...DELIVERY_TOOLS, ...POLICY_TOOLS,
]);

export function createToolCatalog(controller, { principal = 'all' } = {}) {
  if (!['parent', 'worker', 'all'].includes(principal)) {
    throw new ProtocolError('invalid_configuration',
      'principal must be parent, worker, or all.');
  }
  const visible = TOOL_DEFINITIONS.filter((definition) => definition.principals.includes(principal));
  return new Map(visible.map((definition) => [definition.name, {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    async call(args = {}) {
      try {
        const result = await definition.invoke(controller, args, principal);
        return { ok: true, result };
      } catch (error) {
        return { ok: false, ...errorPayload(error) };
      }
    },
  }]));
}

export function mcpTools(catalog) {
  return [...catalog.values()].map(({ name, description, inputSchema }) => ({
    name, description, inputSchema,
  }));
}
