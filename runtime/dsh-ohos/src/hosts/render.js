import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { PACKAGE_ROOT } from '../core/paths.js';
import { invariant } from '../core/errors.js';
import { DOMAIN_AGENTS, agentInstructions } from './spec.js';
import { TOOL_DEFINITIONS } from '../tools/catalog.js';

const toolsFor = (principal) => Object.freeze(TOOL_DEFINITIONS
  .filter((tool) => tool.principals.includes(principal)).map((tool) => tool.name));
const WORKER_TOOLS = toolsFor('worker');
const PARENT_TOOLS = toolsFor('parent');

export function renderHostBundle(hostKind, options) {
  invariant(['codex', 'claude-code', 'cursor', 'trae'].includes(hostKind),
    'unsupported_host_adapter',
    'hostKind must be codex, claude-code, cursor, or trae.');
  const config = normalizeOptions(options);
  return {
    codex: renderCodex,
    'claude-code': renderClaude,
    cursor: renderCursor,
    trae: renderTrae,
  }[hostKind](config);
}

export function writeHostBundle(outputRoot, bundle, { force = false } = {}) {
  invariant(typeof outputRoot === 'string' && isAbsolute(outputRoot),
    'invalid_input', 'outputRoot must be an absolute path.');
  const root = resolve(outputRoot);
  const targets = Object.entries(bundle.files).map(([name, content]) => {
    const target = resolve(root, name);
    const rel = relative(root, target);
    invariant(rel !== '' && !rel.startsWith('..') && !isAbsolute(rel),
      'invalid_export_path', `Export path escapes output root: ${name}`);
    return { target, content };
  });
  if (!force) {
    const conflicts = targets.filter(({ target }) => existsSync(target)).map(({ target }) => target);
    invariant(conflicts.length === 0, 'export_conflict',
      'Host files already exist; review them before using force.', { conflicts });
  }
  for (const { target, content } of targets) {
    mkdirSync(dirname(target), { recursive: true });
    const temporary = `${target}.tmp-${randomUUID()}`;
    writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, target);
  }
  return targets.map(({ target }) => target);
}

function normalizeOptions(options = {}) {
  const workspaceRoot = resolveAbsolute(options.workspaceRoot, 'workspaceRoot');
  const dataRoot = resolveAbsolute(options.dataRoot, 'dataRoot');
  const serverPath = resolveAbsolute(options.serverPath ?? resolve(PACKAGE_ROOT, 'src/mcp/stdio.js'),
    'serverPath');
  const nodeCommand = options.nodeCommand ?? process.execPath;
  const pythonCommand = options.pythonCommand ?? process.env.OHOS_DSH_PYTHON ?? 'python3';
  const deliveryScriptsRoot = resolveAbsolute(options.deliveryScriptsRoot
    ?? resolve(PACKAGE_ROOT, '../..', 'skills/ohos-ar-dev-phases/scripts'),
  'deliveryScriptsRoot');
  const requirementSkillsRoot = resolveAbsolute(options.requirementSkillsRoot
    ?? resolve(PACKAGE_ROOT, '../..', 'skills'), 'requirementSkillsRoot');
  invariant(typeof nodeCommand === 'string' && nodeCommand.length > 0,
    'invalid_input', 'nodeCommand must be a non-empty string.');
  invariant(typeof pythonCommand === 'string' && pythonCommand.length > 0,
    'invalid_input', 'pythonCommand must be a non-empty string.');
  return { workspaceRoot, dataRoot, serverPath, nodeCommand, pythonCommand, deliveryScriptsRoot, requirementSkillsRoot };
}

function renderCodex(config) {
  const files = {};
  for (const agent of DOMAIN_AGENTS) {
    files[`.codex/agents/${agent.id}.toml`] = [
      `name = ${toml(agent.id)}`,
      `description = ${toml(agent.description)}`,
      'sandbox_mode = "workspace-write"',
      `developer_instructions = ${toml(agentInstructions(agent))}`,
      '',
      '[mcp_servers.ohos_worker]',
      `command = ${toml(config.nodeCommand)}`,
      `args = [${toml(config.serverPath)}]`,
      `cwd = ${toml(config.workspaceRoot)}`,
      'required = true',
      `enabled_tools = [${WORKER_TOOLS.map(toml).join(', ')}]`,
      '',
      '[mcp_servers.ohos_worker.env]',
      `OHOS_DSH_DATA_ROOT = ${toml(config.dataRoot)}`,
      'OHOS_DSH_PRINCIPAL = "worker"',
      `OHOS_DSH_PYTHON = ${toml(config.pythonCommand)}`,
      `OHOS_AR_SCRIPTS_ROOT = ${toml(config.deliveryScriptsRoot)}`,
      `OHOS_REQ_SKILLS_DIR = ${toml(config.requirementSkillsRoot)}`,
      '',
    ].join('\n');
  }
  files['.codex/ohos-parent-mcp.snippet.toml'] = [
    '# Merge this reviewed snippet into .codex/config.toml or ~/.codex/config.toml.',
    '[mcp_servers.ohos_parent]',
    `command = ${toml(config.nodeCommand)}`,
    `args = [${toml(config.serverPath)}]`,
    `cwd = ${toml(config.workspaceRoot)}`,
    'required = true',
    `enabled_tools = [${PARENT_TOOLS.map(toml).join(', ')}]`,
    '',
    '[mcp_servers.ohos_parent.env]',
    `OHOS_DSH_DATA_ROOT = ${toml(config.dataRoot)}`,
    'OHOS_DSH_PRINCIPAL = "parent"',
    `OHOS_DSH_PYTHON = ${toml(config.pythonCommand)}`,
    `OHOS_AR_SCRIPTS_ROOT = ${toml(config.deliveryScriptsRoot)}`,
    `OHOS_REQ_SKILLS_DIR = ${toml(config.requirementSkillsRoot)}`,
    '',
  ].join('\n');
  return manifest('codex', files, config, [
    'Merge the parent MCP snippet; Codex does not automatically load files named *.snippet.toml.',
    'The agent files intentionally omit model and model_reasoning_effort so Codex resolves them from launch defaults or the parent.',
  ], { role_isolation: 'per-agent-mcp-principal' });
}

function renderClaude(config) {
  const files = {};
  for (const agent of DOMAIN_AGENTS) {
    files[`.claude/agents/${agent.id}.md`] = [
      '---',
      `name: ${agent.id}`,
      `description: ${yamlString(agent.description)}`,
      'model: inherit',
      'mcpServers:',
      '  - ohos_worker:',
      '      type: stdio',
      `      command: ${yamlString(config.nodeCommand)}`,
      `      args: [${yamlString(config.serverPath)}]`,
      `      cwd: ${yamlString(config.workspaceRoot)}`,
      '      env:',
      `        OHOS_DSH_DATA_ROOT: ${yamlString(config.dataRoot)}`,
      '        OHOS_DSH_PRINCIPAL: worker',
      `        OHOS_DSH_PYTHON: ${yamlString(config.pythonCommand)}`,
      `        OHOS_AR_SCRIPTS_ROOT: ${yamlString(config.deliveryScriptsRoot)}`,
      `        OHOS_REQ_SKILLS_DIR: ${yamlString(config.requirementSkillsRoot)}`,
      '---',
      '',
      agentInstructions(agent),
      '',
    ].join('\n');
  }
  files['.claude/ohos-parent-mcp.fragment.json'] = `${JSON.stringify({
    mcpServers: {
      ohos_parent: {
        type: 'stdio',
        command: config.nodeCommand,
        args: [config.serverPath],
        cwd: config.workspaceRoot,
        env: {
          OHOS_DSH_DATA_ROOT: config.dataRoot,
          OHOS_DSH_PRINCIPAL: 'parent',
          OHOS_DSH_PYTHON: config.pythonCommand,
          OHOS_AR_SCRIPTS_ROOT: config.deliveryScriptsRoot,
          OHOS_REQ_SKILLS_DIR: config.requirementSkillsRoot,
        },
      },
    },
  }, null, 2)}\n`;
  return manifest('claude-code', files, config, [
    'Merge the parent MCP fragment into .mcp.json; Claude Code does not automatically load *.fragment.json.',
    'Project agent inline MCP servers require the project folder to be trusted.',
  ], { role_isolation: 'per-agent-mcp-principal' });
}

function renderCursor(config) {
  const files = {};
  for (const agent of DOMAIN_AGENTS) {
    files[`.cursor/agents/${agent.id}.md`] = markdownAgent([
      `name: ${agent.id}`,
      `description: ${yamlString(agent.description)}`,
      'model: inherit',
    ], agentInstructions(agent));
  }
  files['.cursor/mcp.json'] = jsonMcpConfig(config);
  return manifest('cursor', files, config, [
    'Cursor local subagents inherit MCP tools from the parent. Both scoped MCP connections are visible, so role separation is advisory at the host layer; controller credentials, leases, and revisions still fail closed.',
    'Cursor cloud subagents do not use this local stdio configuration; configure an equivalent server in the Cursor team environment before using cloud execution.',
    'Cursor can override an inherited model when the selected plan or team policy does not allow it.',
  ], {
    role_isolation: 'advisory-host-inherited-tools',
    supported_execution: ['editor-local', 'cli-local'],
  });
}

function renderTrae(config) {
  const files = {};
  const workerTools = [
    'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash',
    ...WORKER_TOOLS.map((name) => `mcp__ohos_worker__${name}`),
  ];
  for (const agent of DOMAIN_AGENTS) {
    const frontmatter = [
      `name: ${agent.id}`,
      `description: ${yamlString(agent.description)}`,
      `tools: ${workerTools.join(', ')}`,
      'mcpServers:',
      '    - ohos_worker',
    ];
    const content = markdownAgent(frontmatter, agentInstructions(agent));
    files[`.trae/agents/${agent.id}.md`] = content;
    files[`.traecli/agents/${agent.id}.md`] = content;
  }
  files['.trae/mcp.json'] = jsonMcpConfig(config);
  files['.traecli/ohos-mcp.snippet.toml'] = traeCliMcpSnippet(config);
  return manifest('trae', files, config, [
    'Enable the Trae Subagents directory beta feature and project-level MCP before using the IDE files.',
    'Merge the reviewed Trae CLI MCP snippet into ~/.trae/traecli.toml; *.snippet.toml is not loaded automatically.',
    'The agent files intentionally omit model so Trae uses the model selected by the parent Agent.',
  ], {
    role_isolation: 'host-tool-whitelist',
    supported_execution: ['ide-local', 'cli-local'],
  });
}

function jsonMcpConfig(config) {
  return `${JSON.stringify({
    mcpServers: {
      ohos_parent: stdioServer(config, 'parent'),
      ohos_worker: stdioServer(config, 'worker'),
    },
  }, null, 2)}\n`;
}

function stdioServer(config, principal) {
  return {
    command: config.nodeCommand,
    args: [config.serverPath],
    env: {
      OHOS_DSH_DATA_ROOT: config.dataRoot,
      OHOS_DSH_PRINCIPAL: principal,
      OHOS_DSH_PYTHON: config.pythonCommand,
      OHOS_AR_SCRIPTS_ROOT: config.deliveryScriptsRoot,
      OHOS_REQ_SKILLS_DIR: config.requirementSkillsRoot,
    },
  };
}

function traeCliMcpSnippet(config) {
  const lines = ['# Merge this reviewed snippet into ~/.trae/traecli.toml.'];
  for (const principal of ['parent', 'worker']) {
    lines.push(
      '',
      `[mcp_servers.ohos_${principal}]`,
      `command = ${toml(config.nodeCommand)}`,
      `args = [${toml(config.serverPath)}]`,
      '',
      `[mcp_servers.ohos_${principal}.env]`,
      `OHOS_DSH_DATA_ROOT = ${toml(config.dataRoot)}`,
      `OHOS_DSH_PRINCIPAL = ${toml(principal)}`,
      `OHOS_DSH_PYTHON = ${toml(config.pythonCommand)}`,
      `OHOS_AR_SCRIPTS_ROOT = ${toml(config.deliveryScriptsRoot)}`,
      `OHOS_REQ_SKILLS_DIR = ${toml(config.requirementSkillsRoot)}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function markdownAgent(frontmatter, instructions) {
  return ['---', ...frontmatter, '---', '', instructions, ''].join('\n');
}

function manifest(hostKind, files, config, warnings, adapter = {}) {
  for (const agent of DOMAIN_AGENTS) files[`${agent.id}-parent.md`] = agent.parentGuide();
  const emittedFiles = [...Object.keys(files), 'ohos-host-bundle.json'].sort();
  files['ohos-host-bundle.json'] = `${JSON.stringify({
    schema_version: 1,
    host_kind: hostKind,
    model_strategy: 'inherit-host',
    execution_mode: 'host_native',
    workspace_root: config.workspaceRoot,
    data_root: config.dataRoot,
    python_command: config.pythonCommand,
    delivery_scripts_root: config.deliveryScriptsRoot,
    requirement_skills_root: config.requirementSkillsRoot,
    files: emittedFiles,
    adapter,
    warnings,
  }, null, 2)}\n`;
  return { hostKind, files, warnings };
}

function resolveAbsolute(value, field) {
  invariant(typeof value === 'string' && isAbsolute(value),
    'invalid_input', `${field} must be an absolute path.`);
  return resolve(value);
}

function toml(value) {
  return JSON.stringify(value);
}

function yamlString(value) {
  return JSON.stringify(value);
}
