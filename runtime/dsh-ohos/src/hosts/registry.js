export const HOST_ADAPTERS = Object.freeze({
  codex: Object.freeze({
    configDirectory: '.codex/agents',
    configFormat: 'toml',
    defaultModelStrategy: 'inherit-host',
  }),
  'claude-code': Object.freeze({
    configDirectory: '.claude/agents',
    configFormat: 'markdown-frontmatter',
    defaultModelStrategy: 'inherit-host',
  }),
  cursor: Object.freeze({
    configDirectory: '.cursor/agents',
    configFormat: 'markdown-frontmatter',
    defaultModelStrategy: 'inherit',
  }),
  trae: Object.freeze({
    configDirectory: '.trae/agents',
    configFormat: 'markdown-frontmatter',
    defaultModelStrategy: 'host-selected',
  }),
});

export const CAPABILITIES = Object.freeze([
  'mcp_tools',
  'native_subagent',
  'isolated_context',
  'workspace_write',
  'model_observable',
  'usage_observable',
  'cancel_observable',
  'background_execution',
]);

export function describeHost(hostKind) {
  return HOST_ADAPTERS[hostKind] ?? {
    configDirectory: null,
    configFormat: 'custom',
    defaultModelStrategy: 'host-selected',
  };
}

export { missingCapabilities } from '../core/capabilities.js';
