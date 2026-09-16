import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, symlink, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalConnectorAgentService } from '../src/connector-agent.js';

test('local Connector agent service maps remote workspace paths to the controlled mount', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-connector-'));
  const calls = [];
  try {
    await writeFile(join(root, 'ar.md'), '# request\n', 'utf8');
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1',
      deviceId: 'windows-connector-1',
      localRoot: root,
      remoteRoot: '/srv/openharmony',
      executor: {
        async run(input) {
          calls.push(input);
          await writeFile(join(input.context.pipeline_dir, 'reports', 'agent.md'), 'done\n', 'utf8').catch(async (error) => {
            if (error.code !== 'ENOENT') throw error;
            const { mkdir } = await import('node:fs/promises');
            await mkdir(join(input.context.pipeline_dir, 'reports'), { recursive: true });
            await writeFile(join(input.context.pipeline_dir, 'reports', 'agent.md'), 'done\n', 'utf8');
          });
          return { artifactRefs: ['reports/agent.md'], stdout: 'ok', stderr: '', exitCode: 0, durationMs: 3,
            usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3, status: 'complete' } };
        },
      },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode', version: '1.0' } }),
    });
    const result = await service.handleCommand({ kind: 'agent.start', payload: {
      workspace_id: 'workspace-1', agent_id: 'opencode', model: 'test/model',
      repo_relative: '.', pipeline_relative: 'pipeline',
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P2', role: 'developer', constraints: [] },
    }});
    assert.equal(result.status, 'completed');
    assert.equal(result.workspace_id, 'workspace-1');
    assert.equal(result.remote_root, '/srv/openharmony');
    assert.equal(result.pipeline_relative, 'pipeline');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].definition.id, 'opencode');
    assert.equal(calls[0].definition.command, 'opencode');
    assert.equal(calls[0].context.workspace_root, root);
    assert.equal(calls[0].context.pipeline_dir, join(root, 'pipeline'));
    assert.equal(await readFile(join(root, 'pipeline', 'reports', 'agent.md'), 'utf8'), 'done\n');
    const probe = await service.probe();
    assert.equal(probe.device_id, 'windows-connector-1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector agent service refuses path escapes and unknown agents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-connector-guard-'));
  try {
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1', localRoot: root, remoteRoot: '/srv/code',
      executor: { async run() { throw new Error('must not execute'); } },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    await assert.rejects(
      service.handleCommand({ kind: 'agent.start', payload: {
        workspace_id: 'workspace-1', agent_id: 'opencode', repo_relative: '../outside', pipeline_relative: '.',
        context: { run_id: 'r', attempt_id: 'a', phase: 'P1', role: 'designer' },
      }}),
      (error) => error.code === 'connector_workspace_outside_root',
    );
    await assert.rejects(
      service.handleCommand({ kind: 'agent.start', payload: {
        workspace_id: 'workspace-1', agent_id: 'missing', repo_relative: '.', pipeline_relative: '.',
        context: { run_id: 'r', attempt_id: 'a', phase: 'P1', role: 'designer' },
      }}),
      (error) => error.code === 'connector_agent_unavailable',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector resolves mount symlinks before starting an agent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-connector-symlink-'));
  const outside = await mkdtemp(join(tmpdir(), 'dsh-local-connector-outside-'));
  try {
    await symlink(outside, join(root, 'escape'), 'dir');
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1', localRoot: root, remoteRoot: '/srv/code',
      executor: { async run() { throw new Error('must not execute'); } },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    await assert.rejects(
      service.handleCommand({ kind: 'agent.start', payload: {
        workspace_id: 'workspace-1', agent_id: 'opencode', repo_relative: 'escape', pipeline_relative: 'escape/pipeline',
        context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer' },
      }}),
      (error) => error.code === 'connector_workspace_outside_root',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('local Connector cancellation aborts the active CodeAgent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-connector-cancel-'));
  try {
    let aborted = false;
    let release;
    let startResolve;
    const started = new Promise((resolve) => { startResolve = resolve; });
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1', localRoot: root, remoteRoot: '/srv/code',
      executor: {
        run({ signal }) {
          startResolve();
          return new Promise((resolve) => {
            release = () => resolve({ artifactRefs: [], stdout: '', stderr: '', exitCode: 0, durationMs: 1 });
            signal.addEventListener('abort', () => { aborted = true; release(); }, { once: true });
          });
        },
      },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    const running = service.handleCommand({ kind: 'agent.start', payload: {
      operation_id: 'operation-1', workspace_id: 'workspace-1', agent_id: 'opencode',
      repo_relative: '.', pipeline_relative: '.',
      context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer' },
    }});
    await started;
    const cancelled = await service.handleCommand({ kind: 'agent.cancel', payload: { operation_id: 'operation-1' } });
    assert.equal(cancelled.cancelled, true);
    const result = await running;
    assert.equal(result.status, 'cancelled');
    assert.equal(aborted, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector publishes and dispatches a configured custom argv agent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-connector-custom-'));
  try {
    const command = join(root, 'custom-agent');
    await writeFile(command, '#!/bin/sh\nprintf "custom 1.0\\n"\n', 'utf8');
    await chmod(command, 0o755);
    const calls = [];
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1', localRoot: root, remoteRoot: '/srv/code',
      settings: { snapshot() { return { custom: { name: 'Custom', command, args: ['{{prompt}}'], model: '' } }; } },
      executor: { async run(input) { calls.push(input); return { artifactRefs: ['reports/custom.md'], exitCode: 0 }; } },
      agentCatalog: async () => ({}),
    });
    const probe = await service.probe();
    assert.equal(probe.agents.custom.available, true);
    assert.equal(probe.agents.custom.dispatchable, true);
    const result = await service.handleCommand({ kind: 'agent.start', payload: {
      workspace_id: 'workspace-1', agent_id: 'custom', repo_relative: '.', pipeline_relative: '.',
      context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer' },
    }});
    assert.equal(result.status, 'completed');
    assert.equal(calls[0].definition.command, command);
    assert.deepEqual(calls[0].definition.args, ['{{prompt}}']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote-tools mode runs a local Agent with an MCP capability and keeps logs on SSH workspace', async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'dsh-remote-tools-runtime-'));
  const calls = [];
  let executionInput;
  let opencodeMcp;
  try {
    const workspaceConnector = {
      async execute(envelope) {
        calls.push(envelope);
        const kind = envelope.payload.operation_kind;
        if (kind === 'workspace.probe') return { status: 'completed', result: { operation: 'probe', reachable: true, readable: true, writable: true, kind: 'directory' } };
        if (kind === 'workspace.list') return { status: 'completed', result: { operation: 'list', entries: ['agent.stdout.log'] } };
        return { status: 'completed', result: { operation: kind, written: true } };
      },
    };
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-remote', deviceId: 'device-remote', remoteRoot: '/srv/code',
      workspaceAccess: 'remote_tools', workspaceConnector,
      runtimeRoot, remoteTools: { allowedProfiles: ['build'] },
      remoteToolsBrokerFactory: async () => ({
        async start() { return this; },
        async stop() {},
        mcpServerSpec() { return { command: process.execPath, args: ['remote-tools-mcp.js'], env: {} }; },
      }),
      executor: { async run(input) {
        executionInput = input;
        await access(input.context.remote_tools.mcp_config_file);
        opencodeMcp = JSON.parse(await readFile(input.context.remote_tools.mcp_config_file, 'utf8'));
        return { artifactRefs: [], stdout: 'ok', stderr: '', exitCode: 0, durationMs: 2 };
      } },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    const probe = await service.probe();
    assert.equal(probe.status, 'ready');
    assert.equal(probe.workspace_access, 'remote_tools');
    assert.equal(probe.remote_workspace_reachable, true);
    const result = await service.handleCommand({ kind: 'agent.start', payload: {
      operation_id: 'remote-op-1', workspace_id: 'workspace-remote', agent_id: 'opencode',
      repo_relative: '.', pipeline_relative: 'specs/pipeline/run-1',
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P2', role: 'developer' },
    }});
    assert.equal(result.status, 'completed');
    assert.equal(result.invocation.workspace_mode, 'remote_tools');
    assert.equal(executionInput.context.workspace_mode, 'remote_tools');
    assert.equal(executionInput.context.remote_workspace_root, '/srv/code');
    assert.equal(executionInput.context.remote_pipeline_dir, '/srv/code/specs/pipeline/run-1');
    assert.equal(opencodeMcp.mcp.dsh_remote.type, 'local');
    assert.equal(opencodeMcp.mcp.dsh_remote.enabled, true);
    assert.equal(opencodeMcp.permission.bash, 'deny');
    assert.equal(opencodeMcp.permission.edit, 'deny');
    assert.equal(opencodeMcp.permission.write, 'deny');
    assert.equal(opencodeMcp.permission.apply_patch, 'deny');
    assert.equal(opencodeMcp.permission.question, 'deny');
    assert.equal(executionInput.context.remote_tools.opencode_config_file, executionInput.context.remote_tools.mcp_config_file);
    assert.ok(calls.some((item) => item.payload.operation_kind === 'workspace.write' && item.payload.path.endsWith('codeagent.stdout.log')));
    const remaining = await import('node:fs/promises').then(({ readdir }) => readdir(runtimeRoot));
    assert.deepEqual(remaining, []);
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

test('remote-tools Codex runs preserve file-backed local authentication in the isolated home', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-tools-codex-'));
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'dsh-remote-tools-codex-runtime-'));
  const home = join(root, 'home');
  const auth = join(home, '.codex', 'auth.json');
  let codexHome;
  try {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(auth, '{"token":"local-only"}\n', { encoding: 'utf8', mode: 0o600 });
    const workspaceConnector = {
      async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.probe') {
          return { status: 'completed', result: { operation: 'probe', reachable: true, readable: true, writable: true, kind: 'directory' } };
        }
        if (envelope.payload.operation_kind === 'workspace.list') {
          return { status: 'completed', result: { operation: 'list', entries: [] } };
        }
        return { status: 'completed', result: { operation: envelope.payload.operation_kind } };
      },
    };
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-codex', deviceId: 'device-codex', remoteRoot: '/srv/code',
      workspaceAccess: 'remote_tools', workspaceConnector, runtimeRoot,
      env: { HOME: home, PATH: process.env.PATH },
      remoteTools: { allowedProfiles: [] },
      remoteToolsBrokerFactory: async () => ({
        async start() {}, async stop() {}, mcpServerSpec() { return { command: process.execPath, args: ['remote-tools-mcp.js'], env: {} }; },
      }),
      executor: { async run(input) {
        codexHome = input.context.remote_tools.codex_home;
        assert.equal(await readFile(join(codexHome, 'auth.json'), 'utf8'), '{"token":"local-only"}\n');
        return { artifactRefs: [], stdout: '', stderr: '', exitCode: 0, durationMs: 1 };
      } },
      agentCatalog: async () => ({ codex: { available: true, command: 'codex' } }),
    });
    const result = await service.handleCommand({ kind: 'agent.start', payload: {
      operation_id: 'codex-auth-operation', workspace_id: 'workspace-codex', agent_id: 'codex',
      repo_relative: '.', pipeline_relative: 'specs/pipeline/codex',
      context: { run_id: 'run-codex-auth', attempt_id: 'attempt-codex-auth', phase: 'P2', role: 'developer' },
    }});
    assert.equal(result.status, 'completed');
    assert.ok(codexHome);
    await assert.rejects(access(codexHome), /ENOENT/u);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

test('local Connector replays a completed operation after a process restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-journal-'));
  const journalPath = join(root, 'state', 'operations.json');
  let executions = 0;
  const makeService = () => new LocalConnectorAgentService({
    workspaceId: 'workspace-journal', deviceId: 'device-journal', localRoot: root, remoteRoot: '/srv/code',
    operationJournalPath: journalPath,
    executor: { async run() {
      executions += 1;
      return { artifactRefs: ['reports/result.json'], stdout: 'ok', stderr: '', exitCode: 0, durationMs: 4,
        usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 } };
    } },
    agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
  });
  const command = { kind: 'agent.start', payload: {
    operation_id: 'journal-operation', workspace_id: 'workspace-journal', agent_id: 'opencode',
    repo_relative: '.', pipeline_relative: 'pipeline',
    context: { run_id: 'journal-run', attempt_id: 'journal-attempt', phase: 'P2', role: 'developer' },
  }};
  try {
    const first = await makeService().handleCommand(command);
    const replay = await makeService().handleCommand(structuredClone(command));
    assert.deepEqual(replay, first);
    assert.equal(executions, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector rejects operation id reuse with different input', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-journal-conflict-'));
  const journalPath = join(root, 'operations.json');
  const service = new LocalConnectorAgentService({
    workspaceId: 'workspace-journal', deviceId: 'device-journal', localRoot: root, remoteRoot: '/srv/code',
    operationJournalPath: journalPath,
    executor: { async run() { return { artifactRefs: ['reports/result.json'], exitCode: 0 }; } },
    agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
  });
  try {
    const base = { kind: 'agent.start', payload: {
      operation_id: 'journal-conflict', workspace_id: 'workspace-journal', agent_id: 'opencode',
      repo_relative: '.', pipeline_relative: 'pipeline',
      context: { run_id: 'journal-run', attempt_id: 'journal-attempt', phase: 'P2', role: 'developer' },
    }};
    await service.handleCommand(base);
    await assert.rejects(
      service.handleCommand({ ...base, payload: { ...base.payload, phase: 'P3' } }),
      (error) => error.code === 'connector_operation_replay_conflict',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector exposes a running journal record as unknown after restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-journal-unknown-'));
  const journalPath = join(root, 'operations.json');
  let release;
  let started;
  const startedPromise = new Promise((resolve) => { started = resolve; });
  const firstService = new LocalConnectorAgentService({
    workspaceId: 'workspace-journal', deviceId: 'device-journal', localRoot: root, remoteRoot: '/srv/code',
    operationJournalPath: journalPath,
    executor: { run({ signal }) {
      started();
      return new Promise((resolve) => {
        release = () => resolve({ artifactRefs: ['reports/result.json'], exitCode: 0 });
        signal.addEventListener('abort', release, { once: true });
      });
    } },
    agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
  });
  const command = { kind: 'agent.start', payload: {
    operation_id: 'journal-running', workspace_id: 'workspace-journal', agent_id: 'opencode',
    repo_relative: '.', pipeline_relative: 'pipeline',
    context: { run_id: 'journal-run', attempt_id: 'journal-attempt', phase: 'P2', role: 'developer' },
  }};
  const running = firstService.handleCommand(command);
  try {
    await startedPromise;
    const restarted = new LocalConnectorAgentService({
      workspaceId: 'workspace-journal', deviceId: 'device-journal', localRoot: root, remoteRoot: '/srv/code',
      operationJournalPath: journalPath,
      executor: { async run() { throw new Error('must not start a duplicate'); } },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    await assert.rejects(restarted.handleCommand(command), (error) => error.code === 'connector_operation_unknown');
  } finally {
    await firstService.handleCommand({ kind: 'agent.cancel', payload: { operation_id: 'journal-running' } });
    release?.();
    await running;
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector reuses the active promise when a reconnect replays the same operation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-replay-active-'));
  let release;
  let started;
  const startedPromise = new Promise((resolve) => { started = resolve; });
  const service = new LocalConnectorAgentService({
    workspaceId: 'workspace-replay', deviceId: 'device-replay', localRoot: root, remoteRoot: '/srv/code',
    executor: { run({ signal }) {
      started();
      return new Promise((resolve) => {
        release = () => resolve({ artifactRefs: ['reports/result.json'], stdout: 'done', exitCode: 0 });
        signal.addEventListener('abort', release, { once: true });
      });
    } },
    agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
  });
  const command = { kind: 'agent.start', payload: {
    operation_id: 'replay-active', workspace_id: 'workspace-replay', agent_id: 'opencode',
    repo_relative: '.', pipeline_relative: 'pipeline',
    context: { run_id: 'replay-run', attempt_id: 'replay-attempt', phase: 'P2', role: 'developer' },
  }};
  try {
    const first = service.handleCommand(command);
    await startedPromise;
    const replay = service.handleCommand(structuredClone(command));
    await service.handleCommand({ kind: 'agent.cancel', payload: { operation_id: 'replay-active' } });
    release?.();
    assert.deepEqual(await replay, await first);
  } finally {
    release?.();
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector exposes durable operation status and result for cloud reconciliation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-result-'));
  const journalPath = join(root, 'operations.json');
  const service = new LocalConnectorAgentService({
    workspaceId: 'workspace-result', deviceId: 'device-result', localRoot: root, remoteRoot: '/srv/code',
    operationJournalPath: journalPath,
    executor: { async run() { return { artifactRefs: ['reports/result.json'], stdout: 'complete', exitCode: 0 }; } },
    agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
  });
  try {
    await service.handleCommand({ kind: 'agent.start', payload: {
      operation_id: 'result-operation', workspace_id: 'workspace-result', agent_id: 'opencode',
      repo_relative: '.', pipeline_relative: 'pipeline',
      context: { run_id: 'result-run', attempt_id: 'result-attempt', phase: 'P2', role: 'developer' },
    }});
    const status = await service.handleCommand({ kind: 'agent.status' });
    assert.equal(status.operations.find((item) => item.operation_id === 'result-operation').state, 'completed');
    const result = await service.handleCommand({ kind: 'agent.result', payload: { operation_id: 'result-operation' } });
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.artifact_refs, ['reports/result.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
