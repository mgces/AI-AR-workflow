import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { LocalCodeAgentExecutor } from '../src/codeagent-executor.js';
import { ProcessSupervisor } from '../../../../workspace-gateway/src/supervisor/process-supervisor.js';

test('executor runs a configured CLI in the task workspace and collects signed-workflow artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-executor-'));
  const pipeline = join(root, 'pipeline');
  try {
    await mkdir(pipeline, { recursive: true });
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    const result = await executor.run({
      definition: { id: 'fixture', command: process.execPath, args: ['-e',
        "const fs=require('fs');fs.mkdirSync(process.env.PIPELINE+'/evidence/P0',{recursive:true});fs.writeFileSync(process.env.PIPELINE+'/evidence/P0/result.json','{}');fs.writeSync(1,JSON.stringify({input_tokens:3,output_tokens:5})+'\\n');"] },
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P0', role: 'environment-analyst', workspace_root: root, pipeline_dir: pipeline, constraints: [] },
      env: { PIPELINE: pipeline },
    });
    assert.ok(result.artifactRefs.includes('evidence/P0/result.json'));
    assert.equal(result.usage.input_tokens, 3);
    assert.equal(result.usage.output_tokens, 5);
    assert.match(await readFile(join(pipeline, 'evidence/P0/codeagent.stdout.log'), 'utf8'), /input_tokens/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor terminates a running CLI when the scheduler aborts its signal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-cancel-'));
  const controller = new AbortController();
  try {
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    const pending = executor.run({
      definition: { id: 'fixture', command: process.execPath, args: ['-e', 'setTimeout(() => {}, 10_000)'] },
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P0', role: 'environment-analyst', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(pending, (error) => error.code === 'codeagent_cancelled');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor refuses a pipeline directory outside the task workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-containment-'));
  try {
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await assert.rejects(
      executor.run({
        definition: { id: 'fixture', command: process.execPath, args: ['-e', 'process.exit(0)'] },
        context: {
          run_id: 'run-containment', attempt_id: 'attempt-containment', phase: 'P0',
          role: 'environment-analyst', workspace_root: root, pipeline_dir: join(root, '..', 'outside'), constraints: [],
        },
      }),
      (error) => error.code === 'agent_context_outside_workspace',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor rejects unsafe attempt and phase identifiers before creating prompt or logs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-identifiers-'));
  try {
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await assert.rejects(
      executor.run({
        definition: { id: 'fixture', command: process.execPath, args: ['-e', 'process.exit(0)'] },
        context: {
          run_id: 'run-safe', attempt_id: '../escape', phase: 'P0/../../escape',
          role: 'environment-analyst', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
        },
      }),
      (error) => error.code === 'agent_context_invalid',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor removes the scheduler prompt when a CLI command is not configured', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-missing-command-'));
  const pipeline = join(root, 'pipeline');
  try {
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await assert.rejects(
      executor.run({
        definition: { id: 'custom', command: '' },
        context: {
          run_id: 'run-missing-command', attempt_id: 'attempt-missing-command', phase: 'P0',
          role: 'environment-analyst', workspace_root: root, pipeline_dir: pipeline, constraints: [],
        },
      }),
      (error) => error.code === 'codeagent_command_missing',
    );
    assert.deepEqual(await readdir(join(pipeline, '.dsh', 'scheduler-prompts')), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor can run an official DSH provider through an injected provider adapter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-executor-provider-'));
  try {
    const calls = [];
    const executor = new LocalCodeAgentExecutor({
      providerRunner: async (input) => {
        calls.push(input);
        await mkdir(join(input.context.pipeline_dir, 'reports'), { recursive: true });
        await writeFile(join(input.context.pipeline_dir, 'reports', 'provider.json'), '{"ok":true}\n');
        return {
          output: 'provider completed',
          usage: { input_tokens: 12, output_tokens: 7, total_tokens: 19 },
        };
      },
    });
    const result = await executor.run({
      definition: { id: 'claude-code', kind: 'official-provider', provider: 'claude-code' },
      context: {
        run_id: 'run-provider', attempt_id: 'attempt-provider', phase: 'P1', role: 'designer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].definition.provider, 'claude-code');
    assert.match(calls[0].prompt, /phase: P1/);
    assert.ok(result.artifactRefs.includes('reports/provider.json'));
    assert.ok(result.artifactRefs.includes('evidence/P1/codeagent.stdout.log'));
    assert.deepEqual(result.usage, {
      input_tokens: 12, output_tokens: 7, total_tokens: 19,
      cache_read_tokens: null, cache_write_tokens: null, reasoning_tokens: null,
      status: 'complete',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor preserves partial usage and elapsed time when a CodeAgent exits unsuccessfully', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-executor-failure-'));
  try {
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await assert.rejects(
      executor.run({
        definition: { id: 'fixture', command: '/bin/sh', args: ['-c',
          "printf '%s\\n' '{\"input_tokens\":4,\"output_tokens\":2}'; exit 3"] },
        context: { run_id: 'run-failure', attempt_id: 'attempt-failure', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
      }),
      (error) => {
        assert.equal(error.code, 'codeagent_failed');
        assert.equal(error.usage.input_tokens, 4);
        assert.equal(error.usage.output_tokens, 2);
        assert.equal(Number.isSafeInteger(error.durationMs), true);
        assert.ok(error.artifactRefs.includes('evidence/P2/codeagent.stdout.log'));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor uses the non-interactive OpenCode CLI contract and forwards model/workspace safely', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-opencode-executor-'));
  const capture = join(root, 'argv.txt');
  const command = join(root, 'opencode-fixture');
  try {
    await writeFile(command, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DSH_CAPTURE"\nprintf \'{"input_tokens":2,"output_tokens":3}\\n\'\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    const result = await executor.run({
      definition: {
        id: 'opencode', kind: 'local-cli', adapter: 'opencode-cli',
        command, model: 'anthropic/claude-sonnet-4-5',
      },
      context: {
        run_id: 'run-opencode', attempt_id: 'attempt-opencode', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
      env: { DSH_CAPTURE: capture, CODEX_HOME: '' },
    });
    const args = (await readFile(capture, 'utf8')).trim().split(/\r?\n/u);
    assert.deepEqual(args.slice(0, 7), [
      'run', '--format', 'json', '--dir', root, '--model', 'anthropic/claude-sonnet-4-5',
    ]);
    assert.match(args.at(-1), /phase: P2/);
    assert.equal(result.usage.total_tokens, 5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor normalizes OpenCode step token events without losing cache and reasoning usage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-opencode-usage-'));
  const command = join(root, 'opencode-fixture');
  try {
    await writeFile(command, '#!/bin/sh\nprintf \'{"type":"step_finish","part":{"tokens":{"input":2,"output":3,"reasoning":1,"cache":{"read":4,"write":5}}}}\\n\'\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    const result = await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli', command },
      context: {
        run_id: 'run-opencode-usage', attempt_id: 'attempt-opencode-usage', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
    });
    assert.deepEqual(result.usage, {
      input_tokens: 2, output_tokens: 3, total_tokens: 5,
      cache_read_tokens: 4, cache_write_tokens: 5, reasoning_tokens: 1,
      status: 'complete',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor loads remote-tools MCP through each CLI native configuration contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-tools-cli-config-'));
  const command = join(root, 'agent-fixture');
  const capture = join(root, 'capture.txt');
  const opencodeConfig = join(root, 'remote-tools.json');
  const codexHome = join(root, 'codex-home');
  try {
    await mkdir(codexHome, { recursive: true });
    await writeFile(opencodeConfig, '{}', 'utf8');
    await writeFile(join(codexHome, 'config.toml'), '[mcp_servers.dsh_remote]\n', 'utf8');
    await writeFile(command, '#!/bin/sh\nprintf "%s\\n" "OPENCODE_CONFIG=$OPENCODE_CONFIG" "CODEX_HOME=$CODEX_HOME" "CONNECTOR=$DSH_CONNECTOR_TOKEN" "SSH_KEY=$SSH_PRIVATE_KEY" "GATEWAY_BEARER=$DSH_GATEWAY_BEARER_TOKEN" "GATEWAY_SECRET=$DSH_GATEWAY_SHARED_SECRET" > "$DSH_CAPTURE"\nprintf "%s\\n" "$@" >> "$DSH_CAPTURE"\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli', command },
      context: {
        run_id: 'run-remote-tools-opencode', attempt_id: 'attempt-remote-tools-opencode', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), workspace_mode: 'remote_tools',
        remote_tools: { mcp_config_file: opencodeConfig, opencode_config_file: opencodeConfig }, constraints: [],
      },
      env: {
        DSH_CAPTURE: capture,
        CODEX_HOME: '',
        DSH_CONNECTOR_TOKEN: 'must-not-pass',
        DSH_GATEWAY_BEARER_TOKEN: 'must-not-pass',
        DSH_GATEWAY_SHARED_SECRET: 'must-not-pass',
        SSH_PRIVATE_KEY: 'must-not-pass',
      },
    });
    let captured = (await readFile(capture, 'utf8')).split(/\r?\n/u).filter(Boolean);
    assert.equal(captured[0], `OPENCODE_CONFIG=${opencodeConfig}`);
    assert.equal(captured[1], 'CODEX_HOME=');
    assert.equal(captured[2], 'CONNECTOR=');
    assert.equal(captured[3], 'SSH_KEY=');
    assert.equal(captured[4], 'GATEWAY_BEARER=');
    assert.equal(captured[5], 'GATEWAY_SECRET=');
    assert.equal(captured.includes('--config'), false);

    await executor.run({
      definition: { id: 'codex', adapter: 'codex-cli', command },
      context: {
        run_id: 'run-remote-tools-codex', attempt_id: 'attempt-remote-tools-codex', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline-codex'), workspace_mode: 'remote_tools',
        remote_tools: { mcp_config_file: join(codexHome, 'config.toml'), codex_home: codexHome }, constraints: [],
      },
      env: {
        DSH_CAPTURE: capture,
        OPENCODE_CONFIG: '',
        DSH_AUTHORITY_SHARED_SECRET: 'must-not-pass',
        DSH_GATEWAY_BEARER_TOKEN: 'must-not-pass',
        DSH_GATEWAY_SHARED_SECRET: 'must-not-pass',
        SSH_AUTH_SOCK: '/tmp/secret.sock',
      },
    });
    captured = (await readFile(capture, 'utf8')).split(/\r?\n/u).filter(Boolean);
    assert.equal(captured[0], 'OPENCODE_CONFIG=');
    assert.equal(captured[1], `CODEX_HOME=${codexHome}`);
    assert.equal(captured[2], 'CONNECTOR=');
    assert.equal(captured[3], 'SSH_KEY=');
    assert.equal(captured[4], 'GATEWAY_BEARER=');
    assert.equal(captured[5], 'GATEWAY_SECRET=');
    assert.equal(captured.includes('--config'), false);
    assert.equal(captured.includes('--sandbox'), true);
    assert.equal(captured.includes('read-only'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor gives Claude strict MCP-only tools in remote-tools mode', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-tools-claude-'));
  const command = join(root, 'claude-fixture');
  const capture = join(root, 'capture.txt');
  const mcpConfig = join(root, 'remote-tools.json');
  try {
    await writeFile(mcpConfig, '{}', 'utf8');
    await writeFile(command, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DSH_CAPTURE"\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await executor.run({
      definition: { id: 'claude-code', adapter: 'claude-code-cli', command },
      context: {
        run_id: 'run-remote-tools-claude', attempt_id: 'attempt-remote-tools-claude', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), workspace_mode: 'remote_tools',
        remote_tools: { mcp_config_file: mcpConfig }, constraints: [],
      },
      env: { DSH_CAPTURE: capture },
    });
    const captured = (await readFile(capture, 'utf8')).split(/\r?\n/u).filter(Boolean);
    assert.deepEqual(captured.slice(0, 3), ['-p', '--output-format', 'json']);
    assert.equal(captured.includes('--strict-mcp-config'), true);
    assert.equal(captured.includes('--mcp-config'), true);
    assert.equal(captured.includes('--tools'), true);
    assert.equal(captured.includes(''), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor uses Claude Code print mode instead of starting an interactive REPL', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-claude-executor-'));
  const capture = join(root, 'argv.txt');
  const command = join(root, 'claude-fixture');
  try {
    await writeFile(command, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DSH_CAPTURE"\nprintf \'{"type":"result","usage":{"input_tokens":5,"output_tokens":4}}\\n\'\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    const result = await executor.run({
      definition: { id: 'claude-code', kind: 'local-cli', adapter: 'claude-code-cli', command, model: 'sonnet' },
      context: {
        run_id: 'run-claude', attempt_id: 'attempt-claude', phase: 'P1', role: 'designer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
      env: { DSH_CAPTURE: capture },
    });
    const args = (await readFile(capture, 'utf8')).trim().split(/\r?\n/u);
    assert.deepEqual(args.slice(0, 6), ['-p', '--output-format', 'json', '--model', 'sonnet', '--permission-mode']);
    assert.equal(args[6], 'acceptEdits');
    assert.match(args.at(-1), /phase: P1/);
    assert.equal(result.usage.total_tokens, 9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor uses the current Codex CLI non-interactive approval flag', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codex-executor-'));
  const capture = join(root, 'argv.txt');
  const command = join(root, 'codex-fixture');
  try {
    await writeFile(command, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DSH_CAPTURE"\n', 'utf8');
    await (await import('node:fs/promises')).chmod(command, 0o755);
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000 });
    await executor.run({
      definition: { id: 'codex', command, model: 'gpt-5.6' },
      context: {
        run_id: 'run-codex', attempt_id: 'attempt-codex', phase: 'P0', role: 'environment-analyst',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
      env: { DSH_CAPTURE: capture },
    });
    const args = (await readFile(capture, 'utf8')).trim().split(/\r?\n/u);
    assert.deepEqual(args.slice(0, 6), [
      'exec', '--json', '--approve-for-me', '-C', root, '--model',
    ]);
    assert.equal(args[6], 'gpt-5.6');
    assert.match(args.slice(7).join('\n'), /phase: P0/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor records a durable supervised process when a process journal is provided', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-supervised-'));
  const db = new DatabaseSync(':memory:');
  try {
    const supervisor = new ProcessSupervisor({ db });
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000, processSupervisor: supervisor });
    const result = await executor.run({
      definition: { id: 'fixture', command: process.execPath, args: ['-e', 'process.stdout.write("supervised\\n")'] },
      context: {
        run_id: 'run-supervised', attempt_id: 'attempt-supervised', phase: 'P0', role: 'environment-analyst',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
    });
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /supervised/u);
    const record = supervisor.inspect('codeagent-attempt-supervised');
    assert.equal(record.state, 'completed');
    assert.equal(record.exit_code, 0);
    assert.equal(record.args_persisted, false);
    assert.deepEqual(record.args, []);
    assert.equal(record.stdout, '');
  } finally {
    db.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('executor removes the scheduler prompt and keeps prompt argv out of the durable journal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-private-prompt-'));
  const db = new DatabaseSync(':memory:');
  try {
    const supervisor = new ProcessSupervisor({ db });
    const executor = new LocalCodeAgentExecutor({ timeoutMs: 5_000, processSupervisor: supervisor });
    await executor.run({
      definition: { id: 'fixture', command: process.execPath, args: ['-e', 'process.stdout.write("ok")'] },
      context: {
        run_id: 'run-private-prompt', attempt_id: 'attempt-private-prompt', phase: 'P0',
        role: 'environment-analyst', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
    });
    const record = supervisor.inspect('codeagent-attempt-private-prompt');
    assert.equal(record.args_persisted, false);
    assert.deepEqual(record.args, []);
    await assert.rejects(
      readFile(join(root, 'pipeline', '.dsh', 'scheduler-prompts', 'attempt-private-prompt.md'), 'utf8'),
      (error) => error.code === 'ENOENT',
    );
  } finally {
    db.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('executor waits for supervisor reconciliation before dispatching a CodeAgent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-supervisor-ready-'));
  try {
    const executor = new LocalCodeAgentExecutor({
      timeoutMs: 5_000,
      supervisorReady: {
        then(_resolve, reject) {
          reject(Object.assign(new Error('reconciliation failed'), {
            code: 'supervisor_reconciliation_failed',
          }));
        },
      },
    });
    await assert.rejects(
      executor.run({
        definition: { id: 'fixture', command: process.execPath, args: ['-e', 'process.exit(0)'] },
        context: {
          run_id: 'run-supervisor-ready', attempt_id: 'attempt-supervisor-ready', phase: 'P0',
          role: 'environment-analyst', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
        },
      }),
      (error) => error.code === 'codeagent_supervisor_reconcile_failed',
    );
    await assert.rejects(
      readFile(join(root, 'pipeline', 'evidence', 'P0', 'codeagent.stdout.log'), 'utf8'),
      (error) => error.code === 'ENOENT',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor preserves the agent failure when transient prompt cleanup also fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagent-cleanup-error-'));
  try {
    const executor = new LocalCodeAgentExecutor({
      timeoutMs: 5_000,
      providerRunner: async ({ promptFile }) => {
        await (await import('node:fs/promises')).unlink(promptFile);
        await mkdir(promptFile);
        throw Object.assign(new Error('gate command failed'), { code: 'codeagent_failed' });
      },
    });
    await assert.rejects(
      executor.run({
        definition: { id: 'official', kind: 'official-provider', provider: 'test-provider' },
        context: {
          run_id: 'run-cleanup-error', attempt_id: 'attempt-cleanup-error', phase: 'P4',
          role: 'build-runner', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
        },
      }),
      (error) => error.code === 'codeagent_failed'
        && error.cleanup_error?.code === 'codeagent_prompt_cleanup_failed',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
