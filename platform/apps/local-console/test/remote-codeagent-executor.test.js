import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RemoteCodeAgentExecutor } from '../src/remote-codeagent-executor.js';

const authority = {
  tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
  authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P2-a', connection_epoch: 1,
};

test('remote executor writes auditable logs and invokes a registered gateway profile', async () => {
  const calls = [];
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-'));
  try {
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        if (envelope.payload.operation_kind === 'workspace.exec_profile') {
          return { operation: 'exec_profile', profile_id: envelope.payload.profile_id, exit_code: 0,
            stdout: '{"usage":{"input_tokens":7,"output_tokens":5},"artifact_refs":["reports/design.md"]}\n', stderr: '' };
        }
        if (envelope.payload.operation_kind === 'workspace.list') {
          return { operation: 'list', entries: envelope.payload.path.endsWith('/reports') ? ['design.md'] : [] };
        }
        return { operation: 'write', relative_path: envelope.payload.path };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway,
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    const result = await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli', model: 'anthropic/claude-sonnet-4-5' },
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: ['run tests'] },
    });
    assert.equal(calls.length, 8);
    assert.equal(calls[0].payload.operation_kind, 'workspace.write');
    assert.equal(calls[1].payload.operation_kind, 'workspace.exec_profile');
    assert.equal(calls[1].payload.profile_id, 'codeagent.opencode');
    assert.equal(calls[1].payload.variables.model, 'anthropic/claude-sonnet-4-5');
    assert.match(calls[1].payload.variables.prompt, /phase: P2/);
    assert.equal(calls[2].payload.operation_kind, 'workspace.remove');
    assert.match(calls[2].payload.path, /\.dsh\/scheduler-prompts\/attempt-1\.md$/u);
    assert.equal(calls[3].payload.operation_kind, 'workspace.write');
    assert.equal(calls[4].payload.operation_kind, 'workspace.write');
    assert.deepEqual(calls.slice(5).map((call) => call.payload.operation_kind), ['workspace.list', 'workspace.list', 'workspace.list']);
    assert.equal(calls.slice(5).some((call) => call.payload.recursive === true), true);
    assert.deepEqual(result.artifactRefs, ['evidence/P2/codeagent.stderr.log', 'evidence/P2/codeagent.stdout.log', 'reports/design.md']);
    assert.equal(result.usage.total_tokens, 12);
    assert.equal(result.invocation.provider, 'opencode');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor accepts CodeAgent id aliases in a profile map', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-profile-alias-'));
  const calls = [];
  try {
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.exec_profile') return { exit_code: 0, stdout: '{}\n', stderr: '' };
        if (operation === 'workspace.list') return { entries: [] };
        return { operation: 'write' };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway,
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
      profileByAdapter: { opencode: 'codeagent.opencode' },
    });
    await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: {
        run_id: 'run-1', attempt_id: 'attempt-profile-alias', phase: 'P2', role: 'developer',
        workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
      },
    });
    const invocation = calls.find((call) => call.payload.operation_kind === 'workspace.exec_profile');
    assert.equal(invocation.payload.profile_id, 'codeagent.opencode');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor rejects a workspace outside the registered remote root', async () => {
  const executor = new RemoteCodeAgentExecutor({
    gateway: { async execute() { throw new Error('must not call gateway'); } },
    remoteRoot: '/srv/code', authorityContext: authority, signature: { key_id: 'k', value: 'v' },
  });
  await assert.rejects(
    executor.run({
      definition: { id: 'codex', adapter: 'codex-cli' },
      context: { run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P1', role: 'designer', workspace_root: '/tmp/outside', pipeline_dir: '/tmp/outside/pipeline', constraints: [] },
    }),
    (error) => error.code === 'remote_workspace_outside_root',
  );
});

test('remote executor rejects unsafe phase and attempt identifiers before writing to the gateway', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-identifiers-'));
  const calls = [];
  try {
    const executor = new RemoteCodeAgentExecutor({
      gateway: { async execute(envelope) { calls.push(envelope); return {}; } },
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    await assert.rejects(
      executor.run({
        definition: { id: 'opencode', adapter: 'opencode-cli' },
        context: { run_id: 'run-1', attempt_id: '../escape', phase: 'P2/../../escape', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
      }),
      (error) => error.code === 'remote_context_invalid',
    );
    assert.equal(calls.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor fails closed when the gateway omits an exit code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-exit-code-'));
  try {
    const gateway = {
      async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.exec_profile') {
          return { operation: 'exec_profile', stdout: 'agent output', stderr: '' };
        }
        if (envelope.payload.operation_kind === 'workspace.list') return { operation: 'list', entries: [] };
        return { operation: 'write', relative_path: envelope.payload.path };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway,
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    await assert.rejects(
      executor.run({
        definition: { id: 'opencode', adapter: 'opencode-cli' },
        context: { run_id: 'run-1', attempt_id: 'attempt-missing-exit', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
      }),
      (error) => error.code === 'codeagent_failed' && error.result?.exit_code === null,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor unwraps the Workspace Gateway operation envelope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-envelope-'));
  try {
    const gateway = {
      async execute(envelope) {
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.exec_profile') {
          return { operation_id: envelope.operation_id, status: 'completed', result: {
            operation: 'exec_profile', profile_id: envelope.payload.profile_id, exit_code: 0,
            stdout: '{"usage":{"input_tokens":2,"output_tokens":3}}\n', stderr: '',
          } };
        }
        if (operation === 'workspace.list') return { operation_id: envelope.operation_id, status: 'completed', result: { operation: 'list', entries: [] } };
        return { operation_id: envelope.operation_id, status: 'completed', result: { operation: 'write', relative_path: envelope.payload.path } };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway, remoteRoot: root, authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    const result = await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: { run_id: 'run-1', attempt_id: 'attempt-envelope', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
    });
    assert.equal(result.usage.total_tokens, 5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor derives per-run authority fields when the gateway is workspace-scoped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-dynamic-context-'));
  const calls = [];
  try {
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.exec_profile') return { exit_code: 0, stdout: '{}\n', stderr: '' };
        if (operation === 'workspace.list') return { entries: [] };
        return { operation: 'write' };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway, remoteRoot: root,
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: { run_id: 'run-dynamic', attempt_id: 'attempt-dynamic', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
    });
    assert.equal(calls[0].cloud_run_id, 'run-dynamic');
    assert.equal(calls[0].authority_run_id, 'authority-run-dynamic');
    assert.equal(calls[0].revision, 1);
    assert.equal(calls[0].phase_epoch, 'phase-P2');
    assert.equal(calls[0].connection_epoch, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor propagates cancellation to the active gateway request and sends operation.cancel', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-executor-cancel-'));
  const controller = new AbortController();
  const calls = [];
  let executionOptions;
  let releaseExecution;
  try {
    const gateway = {
      async execute(envelope, options = {}) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.exec_profile') {
          executionOptions = options;
          await new Promise((resolve) => { releaseExecution = resolve; });
          return { operation, exit_code: 0, stdout: '', stderr: '' };
        }
        if (envelope.message_type === 'operation.cancel') {
          releaseExecution?.();
          return { operation: 'operation.cancel', cancelled: true };
        }
        return { operation: 'write', relative_path: envelope.payload.path };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway,
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    const pending = executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: { run_id: 'run-1', attempt_id: 'attempt-cancel', phase: 'P2', role: 'developer', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [] },
      signal: controller.signal,
    });
    for (let attempt = 0; attempt < 50 && !releaseExecution; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 1));
    assert.equal(typeof releaseExecution, 'function');
    controller.abort();
    await assert.rejects(pending, (error) => error.code === 'codeagent_cancelled');
    assert.equal(executionOptions.signal, controller.signal);
    assert.equal(calls.some((call) => call.message_type === 'operation.cancel'), true);
  } finally {
    releaseExecution?.();
    await rm(root, { recursive: true, force: true });
  }
});

test('remote executor preserves an agent failure when prompt cleanup fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-cleanup-error-'));
  const calls = [];
  try {
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.exec_profile') {
          throw Object.assign(new Error('remote gate failed'), { code: 'codeagent_failed' });
        }
        if (operation === 'workspace.remove') {
          throw Object.assign(new Error('remove denied'), { code: 'path_not_allowed' });
        }
        return operation === 'workspace.list' ? { entries: [] } : { operation: 'write' };
      },
    };
    const executor = new RemoteCodeAgentExecutor({
      gateway,
      remoteRoot: root,
      authorityContext: authority,
      signature: { key_id: 'test-key', value: 'test-signature' },
    });
    await assert.rejects(
      executor.run({
        definition: { id: 'opencode', adapter: 'opencode-cli' },
        context: {
          run_id: 'run-1', attempt_id: 'attempt-remote-cleanup-error', phase: 'P4',
          role: 'build-runner', workspace_root: root, pipeline_dir: join(root, 'pipeline'), constraints: [],
        },
      }),
      (error) => error.code === 'codeagent_failed'
        && error.cleanup_error?.code === 'codeagent_prompt_cleanup_failed',
    );
    assert.equal(calls.some((item) => item.payload.operation_kind === 'workspace.remove'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
