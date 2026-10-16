import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import test from 'node:test';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { REQUIRED_AR_GATE_SCRIPTS } from '../src/preflight.js';
import {
  createArWorkflowInstallBundle,
  createWorkspaceExecutionRuntime,
} from '../src/workspace-execution.js';

const remoteRoot = '/srv/project';
const workflowInstallRoot = `${remoteRoot}/.dsh/workflows/ar-delivery/current`;

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function stageFixture(root) {
  const files = [
    ...REQUIRED_AR_GATE_SCRIPTS.map((name) => `skills/ohos-ar-dev-phases/scripts/${name}`),
    'skills/ohos-ar-dev-phases/scripts/lib/gatelib.py',
    'skills/ohos-ar-dev-phases/scripts/lib/environments.py',
    'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py',
    'workspace-gateway/bin/dsh-ar-delivery.js',
    'workspace-gateway/bin/dsh-ar-gate.js',
    'workspace-gateway/bin/dsh-device-probe.js',
  ];
  for (const path of files) {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, `fixture:${path}\n`);
  }
  return files;
}

function mockRemoteTransport({ deviceStatus = 'available' } = {}) {
  const calls = [];
  const files = new Map();
  let toolsBroker = null;
  const commandRunner = async (_command, args, options) => {
    const remoteCommand = String(args.at(-1) ?? '');
    calls.push({ remoteCommand, options });
    const read = remoteCommand.includes('cat -- "$target_real"');
    const write = remoteCommand.includes('cat > "$target_real"');
    const find = remoteCommand.includes('find "$target_real"');
    if (write) {
      const path = [...new Set([...files.keys(), `${workflowInstallRoot}/manifest.json`, `${remoteRoot}/reports/summary.md`])]
        .find((candidate) => remoteCommand.includes(`'${candidate}'`));
      if (path) files.set(path, options.input);
      if (remoteCommand.includes(`${workflowInstallRoot}/manifest.json`)) {
        files.set(`${workflowInstallRoot}/manifest.json`, options.input);
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    if (read) {
      if (remoteCommand.includes(`${workflowInstallRoot}/manifest.json`)) {
        return { stdout: files.get(`${workflowInstallRoot}/manifest.json`) ?? '', stderr: '', exitCode: 0 };
      }
      if (remoteCommand.includes('reports/summary.md')) {
        return { stdout: files.get(`${remoteRoot}/reports/summary.md`) ?? 'remote artifact body\n', stderr: '', exitCode: 0 };
      }
      return { stdout: 'remote workspace file\n', stderr: '', exitCode: 0 };
    }
    if (find) return { stdout: 'summary.md\t21\t1.0\n', stderr: '', exitCode: 0 };
    if (remoteCommand.includes('dsh-ar-delivery.js') && remoteCommand.includes("'init'")) {
      return { stdout: `PDIR=${remoteRoot}/specs/pipeline/run-42\n`, stderr: '', exitCode: 0 };
    }
    if (remoteCommand.includes('dsh-device-probe.js')) {
      return { stdout: JSON.stringify({ status: deviceStatus, command: 'hdc', targets: [{ id: 'device-1', state: 'device' }] }), stderr: '', exitCode: 0 };
    }
    if (remoteCommand.includes('python3') && remoteCommand.includes('--version')) {
      return { stdout: 'Python 3.12.1\n', stderr: '', exitCode: 0 };
    }
    if (remoteCommand.includes('git') && remoteCommand.includes('--version')) {
      return { stdout: 'git version 2.45.0\n', stderr: '', exitCode: 0 };
    }
    if (remoteCommand.includes('node') && remoteCommand.includes('--version')) {
      return { stdout: 'v22.20.0\n', stderr: '', exitCode: 0 };
    }
    if (remoteCommand.includes('workspace.exec_profile')) return { stdout: '', stderr: '', exitCode: 0 };
    if (remoteCommand.includes("'/srv/project/build_system.sh'")
        || remoteCommand.includes("'/srv/project/build_vendor.sh'")) {
      return { stdout: '', stderr: '', exitCode: 94 };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  };
  return {
    calls,
    files,
    commandRunner,
    get toolsBroker() { return toolsBroker; },
    setToolsBroker(value) { toolsBroker = value; },
  };
}

function mockRemoteToolsBroker(options, onReady) {
  const operations = {
    dsh_workspace_probe: 'workspace.probe', dsh_workspace_list: 'workspace.list',
    dsh_workspace_read: 'workspace.read', dsh_workspace_search: 'workspace.search',
    dsh_workspace_write: 'workspace.write', dsh_workspace_diff: 'workspace.diff',
    dsh_workspace_hash: 'workspace.hash', dsh_workspace_read_binary: 'workspace.read_binary',
    dsh_workspace_exec_profile: 'workspace.exec_profile',
  };
  const broker = {
    async start() { return this; },
    mcpServerSpec() { return { command: process.execPath, args: [] }; },
    async stop() {},
    async handleTool(name, args = {}) {
      const operation_kind = operations[name];
      assert.ok(operation_kind, `unexpected remote tool ${name}`);
      const fields = {
        ...options.authorityContext,
        message_type: 'operation.start',
        operation_id: `test-${Date.now()}-${Math.random()}`,
        nonce: `test-nonce-${Math.random()}`,
        sent_at: new Date().toISOString(),
        payload: { operation_kind, ...args },
        signature: { key_id: 'local-connector', value: 'local-capability' },
      };
      const result = await options.connector.execute(createAuthorityEnvelope(fields));
      if (result?.status === 'failed') throw Object.assign(new Error(result.error?.message ?? 'remote tool failed'), { code: result.error?.code });
      return result?.result ?? result;
    },
    async close() {},
  };
  onReady(broker);
  return broker;
}

test('stages only the bounded AR gate runtime and verifies a packaged runtime manifest', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ar-workflow-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = await stageFixture(root);
  const manifestFiles = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, sha(await readFile(join(root, path)))])));
  await writeFile(join(root, 'bundle-manifest.json'), JSON.stringify({ format_version: 1, files: manifestFiles }));

  const bundle = await createArWorkflowInstallBundle(root);
  assert.equal(bundle.id, 'ar-delivery');
  assert.equal(bundle.install_path, '.dsh/workflows/ar-delivery/current');
  assert.ok(bundle.files.every((file) => !file.path.includes('runtime/dsh-ohos/src/controller.js')));
  assert.ok(bundle.bytes < 4 * 1024 * 1024);
  assert.ok(bundle.files.length <= 128);
});

test('remote preflight installs the gate bundle and probes the chosen WSL/SSH code host', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workspace-execution-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtimeRoot = join(root, 'runtime');
  await stageFixture(runtimeRoot);
  const transport = mockRemoteTransport();
  const runtime = createWorkspaceExecutionRuntime({
    workspace: {
      workspace_id: 'workspace-1', transport: 'ssh', code_root: remoteRoot,
      connection: { target: 'wsl-dev' },
    },
    runtimeRoot,
    stateDirectory: join(root, 'state'),
    localAgentExecutor: { run: async () => ({ exitCode: 0, stdout: '', stderr: '', artifactRefs: [], summary: 'ok' }) },
    agentCatalog: { claude_code: { command: 'claude', available: true, dispatchable: true, status: 'available', version: '1' } },
    commandRunner: transport.commandRunner,
    workflowBundleLoader: createArWorkflowInstallBundle,
    remoteToolsBrokerFactory: async (options) => {
      return mockRemoteToolsBroker(options, (broker) => transport.setToolsBroker(broker));
    },
  });

  const preflight = await runtime.preflight({
    workspace_id: 'workspace-1', environment: 'openharmony', agent: 'claude-code', ar_text: 'Add an AR feature',
  });
  assert.equal(preflight.can_start_p0, true, JSON.stringify(preflight.checks.filter((item) => item.status !== 'pass')));
  assert.equal(preflight.execution_plan.workspace_mode, 'local_connector');
  assert.equal(preflight.checks.find((item) => item.id === 'workflow_scripts').status, 'pass', JSON.stringify({ workflow: preflight.checks.find((item) => item.id === 'workflow_scripts'), runtime: preflight.checks.filter((item) => item.id.includes('runtime')), errors: preflight.checks.filter((item) => item.status !== 'pass') }));
  assert.equal(preflight.checks.find((item) => item.id === 'device_transport').status, 'pass', JSON.stringify(preflight.checks.find((item) => item.id === 'device_transport')));
  assert.ok(transport.files.has(`${workflowInstallRoot}/manifest.json`));
  assert.ok(transport.calls.length > 20);
});

test('remote Python workflow reads artifacts and CodeAgent edits only through the remote-tools MCP capability', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workspace-execution-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtimeRoot = join(root, 'runtime');
  await stageFixture(runtimeRoot);
  const transport = mockRemoteTransport();
  let runMode = 'write';
  const runtime = createWorkspaceExecutionRuntime({
    workspace: {
      workspace_id: 'workspace-1', transport: 'wsl', code_root: remoteRoot,
      connection: { target: 'Ubuntu-24.04' },
    },
    runtimeRoot,
    stateDirectory: join(root, 'state'),
    localAgentExecutor: {
      async run({ context, signal }) {
        if (runMode === 'cancel') {
          return new Promise((resolve, reject) => signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('cancelled by test'), { code: 'codeagent_cancelled' }));
          }, { once: true }));
        }
        const target = posix.join(context.remote_pipeline_dir, 'evidence/P4/codeagent-edit.txt');
        const written = await transport.toolsBroker.handleTool('dsh_workspace_write', {
          path: posix.relative(remoteRoot, target), content: 'CodeAgent edit through MCP',
        });
        return { exitCode: 0, stdout: written.operation ?? 'written', stderr: '', summary: 'remote edit applied', durationMs: 12,
          artifactRefs: ['evidence/P4/codeagent-edit.txt'], usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
    agentCatalog: { claude_code: { command: 'claude', available: true, dispatchable: true, status: 'available', version: '1' } },
    commandRunner: transport.commandRunner,
    workflowBundleLoader: createArWorkflowInstallBundle,
    remoteToolsBrokerFactory: async (options) => {
      return mockRemoteToolsBroker(options, (broker) => transport.setToolsBroker(broker));
    },
  });
  await runtime.ensureWorkflowInstalled();
  const initialized = await runtime.deliveryAdapter.initialize({
    run_id: 'run-42', repo_root: remoteRoot, environment: 'openharmony', ar_text: 'Add an AR feature',
    agent: 'claude-code', confirm_defaults: true,
  });
  assert.equal(initialized.pipeline_dir, `${remoteRoot}/specs/pipeline/run-42`);

  const taskContext = {
    run_id: 'run-42', attempt_id: 'attempt-1', phase: 'P4', role: 'developer',
    workspace_root: remoteRoot, pipeline_dir: initialized.pipeline_dir,
  };
  const produced = await runtime.codeAgentExecutor.run({ definition: { id: 'claude-code' }, context: taskContext });
  assert.equal(produced.invocation.workspace_mode, 'remote_tools');
  assert.ok(produced.artifactRefs.includes('evidence/P4/codeagent-edit.txt'));
  assert.ok(transport.calls.some((item) => item.options.input === 'CodeAgent edit through MCP'));

  const artifactSet = await runtime.deliveryAdapter.artifacts(initialized.pipeline_dir, { run_id: 'run-42', status: 'running' });
  assert.ok(artifactSet.artifacts.some((item) => item.relative_path === 'reports/summary.md'));
  const artifact = await runtime.deliveryAdapter.artifactContent(initialized.pipeline_dir, 'reports/summary.md', 'run-42');
  assert.equal(artifact.content, 'remote artifact body\n');

  runMode = 'cancel';
  const pending = runtime.codeAgentExecutor.run({
    definition: { id: 'claude-code' },
    context: { ...taskContext, attempt_id: 'attempt-cancel' },
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  await runtime.codeAgentExecutor.cancel('attempt-cancel');
  await assert.rejects(pending, { code: 'codeagent_cancelled' });
});
