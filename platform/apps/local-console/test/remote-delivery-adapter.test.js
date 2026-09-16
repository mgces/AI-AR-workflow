import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { RemotePythonDeliveryAdapter } from '../src/remote-delivery-adapter.js';

const authorityContext = {
  tenant_id: 'tenant-1',
  workspace_id: 'workspace-1',
  cloud_run_id: 'run-1',
  authority_run_id: 'authority-1',
  revision: 1,
  phase_epoch: 'P0-a',
  connection_epoch: 1,
};

function fakeGateway(calls) {
  return {
    async execute(envelope) {
      calls.push(envelope);
      const { operation_kind: operation, profile_id: profile, variables } = envelope.payload;
      if (operation === 'workspace.write') {
        return { operation: 'write', relative_path: variables?.path ?? envelope.payload.path };
      }
      if (operation === 'workspace.read') {
        return { operation: 'read', relative_path: envelope.payload.path, content: '# remote AR', bytes: 10 };
      }
      if (operation !== 'workspace.exec_profile') return { operation };
      if (profile === 'ar.delivery.init') {
        return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
          stdout: JSON.stringify({ pipeline_dir: '/srv/project/specs/pipeline/run-1',
            pipeline_run_id: 'run-1', repo_root: '/srv/project', environment: 'openharmony' }) };
      }
      if (profile === 'ar.delivery.inspect') {
        return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
          stdout: JSON.stringify({ pipeline_run_id: 'run-1', pipeline_dir: variables.pipeline_dir,
            repo_root: '/srv/project', current_phase: 0, complete: false, gate: { ok: false } }) };
      }
      return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
        stdout: JSON.stringify({ ok: true, current_phase: Number(variables.phase ?? 0), complete: false }) };
    },
  };
}

function envelopedGateway(calls) {
  const direct = fakeGateway(calls);
  return {
    async execute(envelope) {
      return {
        operation_id: envelope.operation_id,
        status: 'completed',
        result: await direct.execute(envelope),
      };
    },
  };
}

test('remote delivery adapter initializes and validates through signed gateway profiles', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway(calls),
    remoteRoot: '/srv/project',
    authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });

  const initialized = await adapter.initialize({
    run_id: 'run-1', repo_root: '/srv/project', environment: 'openharmony',
    ar_text: '# remote AR',
  });
  assert.equal(initialized.pipeline_dir, '/srv/project/specs/pipeline/run-1');
  assert.equal(initialized.pipeline_run_id, 'run-1');
  assert.equal(calls[0].payload.operation_kind, 'workspace.exec_profile');
  assert.equal(calls[0].payload.profile_id, 'ar.delivery.init');
  assert.equal(calls[0].payload.variables.scripts_root, '/srv/project/skills/ohos-ar-dev-phases/scripts');
  assert.equal(calls[0].payload.variables.bridge_path, '/srv/project/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py');
  assert.equal(calls[1].payload.operation_kind, 'workspace.write');
  assert.equal(calls[1].payload.path, 'specs/pipeline/run-1/ar.md');
  assert.equal(calls.every((item) => item.signature?.value === 'signed'), true);

  const gate = await adapter.validateGate('/srv/project/specs/pipeline/run-1', 0);
  assert.equal(gate.ok, true);
  assert.equal(calls.at(-1).payload.profile_id, 'ar.delivery.validate');
});

test('remote delivery adapter passes only deployment-owned gate bundle paths to profiles', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway(calls),
    remoteRoot: '/srv/project',
    scriptsRoot: '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts',
    bridgePath: '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py',
    authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  await adapter.initialize({ run_id: 'run-1', repo_root: '/srv/project', environment: 'openharmony', ar_text: '# remote AR' });
  const variables = calls[0].payload.variables;
  assert.equal(variables.scripts_root, '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts');
  assert.equal(variables.bridge_path, '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py');
  await assert.rejects(
    Promise.resolve().then(() => new RemotePythonDeliveryAdapter({
      gateway: fakeGateway([]), remoteRoot: '/srv/project',
      scriptsRoot: '/opt/dsh/skills', authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    })),
    (error) => error.code === 'remote_workspace_outside_root',
  );
});

test('remote delivery adapter refuses a pipeline outside the registered remote root', async () => {
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway([]), remoteRoot: '/srv/project', authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  await assert.rejects(
    adapter.inspect('/srv/other/specs/pipeline/run-1'),
    (error) => error.code === 'remote_workspace_outside_root',
  );
});

test('remote delivery adapter unwraps the Workspace Gateway operation envelope', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: envelopedGateway(calls), remoteRoot: '/srv/project', authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  const initialized = await adapter.initialize({ run_id: 'run-1', repo_root: '/srv/project', environment: 'openharmony', ar_text: '# AR' });
  assert.equal(initialized.pipeline_run_id, 'run-1');
  assert.equal(calls[0].payload.profile_id, 'ar.delivery.init');
});

test('remote delivery adapter derives per-run authority fields for a workspace-scoped gateway', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway(calls), remoteRoot: '/srv/project',
    authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  await adapter.initialize({ run_id: 'run-dynamic', repo_root: '/srv/project', environment: 'openharmony', ar_text: '# AR' });
  assert.equal(calls[0].cloud_run_id, 'run-dynamic');
  assert.equal(calls[0].authority_run_id, 'authority-run-dynamic');
  assert.equal(calls[0].revision, 1);
  assert.equal(calls[0].phase_epoch, 'phase-P0');
  assert.equal(calls[0].connection_epoch, 1);
});

test('remote delivery adapter restores the run authority after a cloud process restart', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway(calls), remoteRoot: '/srv/project',
    authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });

  // No initialize call occurs in this process. The durable runtime only has
  // the remote pipeline path, so the adapter must recover the run id from it.
  await adapter.inspect('/srv/project/specs/pipeline/run-after-restart');
  assert.equal(calls[0].cloud_run_id, 'run-after-restart');
  assert.equal(calls[0].authority_run_id, 'authority-run-after-restart');
  assert.equal(calls[0].phase_epoch, 'phase-P0');
});

test('remote delivery adapter keeps concurrent run authority and workspace bindings isolated', async () => {
  const calls = [];
  const gateway = {
    async execute(envelope) {
      calls.push(envelope);
      const operation = envelope.payload.operation_kind;
      const variables = envelope.payload.variables ?? {};
      const runId = variables.run_id ?? envelope.cloud_run_id;
      if (operation === 'workspace.exec_profile' && envelope.payload.profile_id === 'ar.delivery.init') {
        await new Promise((resolve) => setTimeout(resolve, runId === 'run-a' ? 15 : 1));
        return {
          operation: 'exec_profile', profile_id: 'ar.delivery.init', exit_code: 0,
          stdout: JSON.stringify({ pipeline_dir: `/srv/project/specs/pipeline/${runId}`,
            pipeline_run_id: runId, repo_root: '/srv/project', environment: 'openharmony' }),
        };
      }
      if (operation === 'workspace.write') return { operation: 'write' };
      if (operation === 'workspace.read') return { operation: 'read', content: '# AR', bytes: 5 };
      return { operation: 'exec_profile', profile_id: envelope.payload.profile_id, exit_code: 0,
        stdout: JSON.stringify({ pipeline_run_id: runId, pipeline_dir: variables.pipeline_dir, repo_root: variables.repo_root, ok: true }) };
    },
  };
  const adapter = new RemotePythonDeliveryAdapter({
    gateway, remoteRoot: '/srv/project', authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  await Promise.all([
    adapter.initialize({ run_id: 'run-a', repo_root: '/srv/project', environment: 'openharmony', ar_text: '# A' }),
    adapter.initialize({ run_id: 'run-b', repo_root: '/srv/project', environment: 'openharmony', ar_text: '# B' }),
  ]);
  const initCalls = calls.filter((item) => item.payload.profile_id === 'ar.delivery.init');
  assert.deepEqual(initCalls.map((item) => item.cloud_run_id).sort(), ['run-a', 'run-b']);
  const writes = calls.filter((item) => item.payload.operation_kind === 'workspace.write');
  assert.deepEqual(writes.map((item) => item.cloud_run_id).sort(), ['run-a', 'run-b']);
  await adapter.inspect('/srv/project/specs/pipeline/run-a');
  const inspect = calls.findLast((item) => item.payload.profile_id === 'ar.delivery.inspect');
  assert.equal(inspect.cloud_run_id, 'run-a');
  assert.equal(inspect.payload.variables.repo_root, '/srv/project');
});

test('remote delivery adapter resolves AR input before creating a remote pipeline', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    remoteRoot: '/srv/project',
    authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    gateway: {
      async execute(envelope) {
        calls.push(envelope);
        if (envelope.payload.operation_kind === 'workspace.read') {
          throw Object.assign(new Error('source file is missing'), { code: 'remote_file_missing' });
        }
        return { operation: 'exec_profile', profile_id: 'ar.delivery.init', exit_code: 0,
          stdout: JSON.stringify({ pipeline_dir: '/srv/project/specs/pipeline/run-input', pipeline_run_id: 'run-input', repo_root: '/srv/project' }) };
      },
    },
  });
  await assert.rejects(
    adapter.initialize({ run_id: 'run-input', repo_root: '/srv/project', environment: 'openharmony', ar_path: 'docs/missing.md' }),
    (error) => error.code === 'remote_file_missing',
  );
  assert.equal(calls.some((item) => item.payload.profile_id === 'ar.delivery.init'), false);
});

test('remote delivery adapter resolves a relative AR path inside the registered workspace', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    gateway: fakeGateway(calls), remoteRoot: '/srv/project', authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });
  await adapter.initialize({ run_id: 'run-1', repo_root: '/srv/project', ar_path: 'docs/ar.md' });
  assert.ok(calls.some((item) => item.payload.operation_kind === 'workspace.read'
    && item.payload.path === 'docs/ar.md'));
});

test('remote delivery adapter rejects blank AR content before creating a pipeline', async () => {
  const calls = [];
  const adapter = new RemotePythonDeliveryAdapter({
    remoteRoot: '/srv/project', authorityContext, signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    gateway: {
      async execute(envelope) {
        calls.push(envelope);
        if (envelope.payload.operation_kind === 'workspace.read') return { operation: 'read', content: ' \n\t' };
        throw new Error('initializer must not be called');
      },
    },
  });
  await assert.rejects(
    adapter.initialize({ run_id: 'blank-remote', repo_root: '/srv/project', environment: 'openharmony', ar_path: 'docs/blank.md' }),
    (error) => error.code === 'ar_input_empty',
  );
  assert.equal(calls.some((item) => item.payload.profile_id === 'ar.delivery.init'), false);
});

test('remote delivery adapter requires an AR source for a new run', async () => {
  const adapter = new RemotePythonDeliveryAdapter({
    remoteRoot: '/srv/project', authorityContext, signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    gateway: { async execute() { throw new Error('initializer must not be called'); } },
  });
  await assert.rejects(
    adapter.initialize({ run_id: 'missing-remote-ar', repo_root: '/srv/project', environment: 'openharmony' }),
    (error) => error.code === 'ar_input_required',
  );
});

test('remote delivery adapter keeps the selected repository root for subdirectory workspaces', async () => {
  const calls = [];
  const gateway = {
    async execute(envelope) {
      calls.push(envelope);
      const { operation_kind: operation, profile_id: profile, variables = {} } = envelope.payload;
      if (operation === 'workspace.write') return { operation: 'write' };
      if (operation !== 'workspace.exec_profile') return { operation };
      if (profile === 'ar.delivery.init') {
        return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
          stdout: JSON.stringify({ pipeline_dir: variables.pipeline_dir, pipeline_run_id: variables.run_id,
            repo_root: variables.repo_root, environment: variables.environment }) };
      }
      if (profile === 'ar.delivery.inspect') {
        return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
          stdout: JSON.stringify({ pipeline_run_id: 'subdir-run', pipeline_dir: variables.pipeline_dir,
            repo_root: variables.repo_root, current_phase: 0, complete: false, gate: { ok: false } }) };
      }
      return { operation: 'exec_profile', profile_id: profile, exit_code: 0,
        stdout: JSON.stringify({ ok: true, current_phase: Number(variables.phase ?? 0), complete: false }) };
    },
  };
  const adapter = new RemotePythonDeliveryAdapter({
    gateway,
    remoteRoot: '/srv',
    authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });

  const initialized = await adapter.initialize({
    run_id: 'subdir-run', repo_root: '/srv/projects/project', environment: 'openharmony', ar_text: '# AR',
  });
  await adapter.validateGate(initialized.pipeline_dir, 0);
  const validate = calls.find((item) => item.payload.profile_id === 'ar.delivery.validate');
  assert.equal(validate.payload.variables.repo_root, '/srv/projects/project');
  assert.equal(validate.payload.variables.scripts_root, '/srv/projects/project/skills/ohos-ar-dev-phases/scripts');
  assert.equal(validate.payload.variables.bridge_path, '/srv/projects/project/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py');
});

test('remote delivery adapter hashes binary artifacts without decoding them as text', async () => {
  const calls = [];
  const gateway = {
    async execute(envelope) {
      calls.push(envelope);
      const operation = envelope.payload.operation_kind;
      if (operation === 'workspace.list') {
        assert.equal(envelope.payload.with_metadata, true);
        if (!envelope.payload.path.endsWith('/evidence')) return { operation: 'list', entries: [] };
        return {
          operation: 'list',
          entries: [
            { relative_path: 'release/app.hap', size_bytes: 4096, mtime_ms: 1234 },
            { relative_path: 'release/manifest.json', size_bytes: 24, mtime_ms: 1235 },
          ],
        };
      }
      if (operation === 'workspace.hash') {
        assert.equal(envelope.payload.path, 'specs/pipeline/run-1/evidence/release/app.hap');
        return { operation: 'hash', relative_path: envelope.payload.path, sha256: 'a'.repeat(64), bytes: 4096 };
      }
      if (operation === 'workspace.read') {
        assert.equal(envelope.payload.path, 'specs/pipeline/run-1/evidence/release/manifest.json');
        return { operation: 'read', relative_path: envelope.payload.path, content: '{"ok":true}', bytes: 11, sha256: 'b'.repeat(64) };
      }
      throw new Error(`unexpected operation ${operation}`);
    },
  };
  const adapter = new RemotePythonDeliveryAdapter({
    gateway,
    remoteRoot: '/srv/project',
    authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
  });

  const result = await adapter.artifacts('/srv/project/specs/pipeline/run-1', { run_id: 'run-1' });
  const binary = result.artifacts.find((item) => item.relative_path.endsWith('.hap'));
  const text = result.artifacts.find((item) => item.relative_path.endsWith('.json'));
  assert.deepEqual(binary, {
    artifact_id: 'run-1:evidence/release/app.hap',
    relative_path: 'evidence/release/app.hap',
    filename: 'app.hap',
    role: 'evidence',
    size_bytes: 4096,
    sha256: 'a'.repeat(64),
    content_type: 'application/octet-stream',
    content: null,
    truncated: false,
    binary: true,
    content_available: false,
  });
  assert.equal(text.content, '{"ok":true}');
  assert.equal(text.sha256, 'b'.repeat(64));
  assert.equal(calls.filter((item) => item.payload.operation_kind === 'workspace.read').length, 1);
  assert.equal(calls.filter((item) => item.payload.operation_kind === 'workspace.hash').length, 1);
});

test('remote delivery adapter reads a binary artifact as verified base64 for download', async () => {
  const calls = [];
  const bytes = Buffer.from([0, 1, 2, 127, 255]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const adapter = new RemotePythonDeliveryAdapter({
    remoteRoot: '/srv/project',
    authorityContext,
    signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    gateway: {
      async execute(envelope) {
        calls.push(envelope);
        assert.equal(envelope.payload.operation_kind, 'workspace.read_binary');
        return {
          operation: 'read_binary', relative_path: envelope.payload.path,
          content_base64: bytes.toString('base64'), sha256: digest, bytes: bytes.length,
        };
      },
    },
  });
  const value = await adapter.artifactContent('/srv/project/specs/pipeline/run-1', 'reports/release.hap', 'run-1');
  assert.equal(value.binary, true);
  assert.equal(value.content_available, true);
  assert.equal(value.content, null);
  assert.equal(value.content_base64, bytes.toString('base64'));
  assert.equal(value.sha256, digest);
  assert.equal(value.size_bytes, bytes.length);
  assert.equal(calls.length, 1);
});
