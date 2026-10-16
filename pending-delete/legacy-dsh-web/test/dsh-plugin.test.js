import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { apply, attachLocalProcessSupervisor, createDeliveryPreflight, createRemoteProcessSupervisorView, resolveGatewayHeaders, resolveRemoteAuthorityContext } from '../src/dsh/plugin.js';
import { LocalCodeAgentExecutor } from '../../platform/apps/local-console/src/codeagent-executor.js';

test('DSH resolves Gateway header secret references without persisting unresolved literals', () => {
  assert.deepEqual(resolveGatewayHeaders({ authorization: 'Bearer ${DSH_GATEWAY_BEARER_TOKEN}', 'x-test': 'static' }, {
    DSH_GATEWAY_BEARER_TOKEN: 'gateway-secret',
  }), { authorization: 'Bearer gateway-secret', 'x-test': 'static' });
  assert.deepEqual(resolveGatewayHeaders({ authorization: 'Bearer ${MISSING_TOKEN}' }, {}), {
    authorization: 'Bearer ${MISSING_TOKEN}',
  });
  assert.throws(() => resolveGatewayHeaders({ authorization: 'Bearer bad\nvalue' }, {}), /header value contains control characters/u);
});

test('DSH requires an explicit remote Authority tenant/workspace binding', () => {
  assert.deepEqual(resolveRemoteAuthorityContext({
    remoteConfig: { authorityContext: { tenant_id: '${DSH_TENANT_ID}', workspace_id: '${DSH_WORKSPACE_ID}' } },
    env: { DSH_TENANT_ID: 'tenant-fixture', DSH_WORKSPACE_ID: 'workspace-fixture' },
  }), { tenant_id: 'tenant-fixture', workspace_id: 'workspace-fixture' });
  assert.throws(() => resolveRemoteAuthorityContext({
    remoteConfig: { authorityContext: { workspace_id: 'workspace-fixture' } },
  }), (error) => error.code === 'workspace_gateway_authority_context_unconfigured'
    && error.details.field === 'tenant_id');
});

test('DSH Cordis plugin registers the shared controller tools', async () => {
  const definitions = [];
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
  });
  assert.equal(definitions.length, 12);
  assert.ok(definitions.some((item) => item.name === 'ar_dev_gate'));
  assert.ok(definitions.some((item) => item.name === 'ar_evolution_proposals'));
  const resolver = definitions.find((item) => item.name === 'ar_module_resolve');
  const result = await resolver.execute({
    workflow: 'development',
    phase: 'P2',
    taskTags: ['sa'],
  });
  assert.ok(result.modules.some((item) => item.id === 'ohos-dev-sa-codegen'));
});

test('DSH Cordis plugin can register the authoritative delivery tools for the official Web UI', () => {
  const definitions = [];
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
  }, { enableDeliveryRuntime: true });
  assert.ok(definitions.some((item) => item.name === 'ohos_delivery_start'));
  assert.ok(definitions.some((item) => item.name === 'ohos_run_observability'));
  assert.ok(definitions.some((item) => item.name === 'ohos_run_artifacts'));
});

test('DSH Cordis plugin mounts the AR route on the official authenticated Web Server', () => {
  const routes = [];
  const definitions = [];
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: { register(route) { routes.push(route); return () => {}; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
    inject(_services, callback) { callback(webCtx); },
  }, { enableDeliveryRuntime: true, repoRoot: '/workspace' });
  assert.ok(definitions.some((item) => item.name === 'ohos_run_observability'));
  assert.equal(routes.length, 1);
  assert.equal(routes[0].kind, 'prefix');
  assert.equal(routes[0].path, '/api/ohos-ar');
});

test('DSH Cordis plugin mounts a scheduler-backed route with a visible job surface', async () => {
  const routes = [];
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: { register(route) { routes.push(route); return () => {}; } },
    subagents: { getProvider() { return undefined; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: { register() { return () => {}; } },
    inject(_services, callback) { callback(webCtx); },
  }, { enableDeliveryRuntime: true, repoRoot: process.cwd() });
  assert.equal(routes.length, 1);
  const response = {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status; },
    end(value = '') { this.body = value; },
  };
  await routes[0].handler({
    method: 'GET', url: '/api/ohos-ar/overview', headers: {},
    async *[Symbol.asyncIterator]() {},
  }, response);
  assert.equal(response.statusCode, 200);
  const overview = JSON.parse(response.body);
  assert.equal(overview.scheduler.enabled, true);
  assert.deepEqual(overview.scheduler.jobs, []);
});

test('DSH Cordis plugin wires remote Python delivery and exposes the workspace gateway mode', async () => {
  const routes = [];
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: { register(route) { routes.push(route); return () => {}; } },
    subagents: { getProvider() { return undefined; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: { register() { return () => {}; } },
    inject(_services, callback) { callback(webCtx); },
  }, {
    enableDeliveryRuntime: true,
    workspaceGateway: {
      enabled: true,
      remoteRoot: '/srv/project',
      authorityContext: {
        tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
        authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1,
      },
      signature: { key_id: 'test', value: 'signed' },
      client: { async execute() { return { operation: 'inspect', status: 'ready' }; } },
      profiles: { 'claude-code': 'codeagent.claude', custom: 'codeagent.custom' },
    },
  });
  assert.equal(routes.length, 1);
  const response = {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status; },
    end(value = '') { this.body = value; },
  };
  await routes[0].handler({
    method: 'GET', url: '/api/ohos-ar/overview', headers: {},
    async *[Symbol.asyncIterator]() {},
  }, response);
  assert.equal(response.statusCode, 200);
  const overview = JSON.parse(response.body);
  assert.equal(overview.workspace_mode, 'workspace_gateway');
  assert.equal(overview.repo_root, '/srv/project');
  assert.equal(overview.workspace_gateway.enabled, true);
  assert.equal(overview.rag.mode, 'remote_lexical');
  assert.ok(['not_indexed', 'ready'].includes(overview.rag.state));
  assert.equal(overview.debug.source_root, '/srv/project');
  assert.equal(overview.codeagents.claude_code.source, 'workspace-gateway');
  assert.equal(overview.codeagents.claude_code.profile_id, 'codeagent.claude');
  assert.equal(overview.codeagents.claude_code.dispatchable, true);
});

test('DSH Cordis plugin wires a local Connector CodeAgent to the SSH workspace mode', async () => {
  const routes = [];
  const upgrades = [];
  const connector = {
    snapshot() {
      return { connected: true, transport: 'websocket', workspaces: [{
        workspace_id: 'workspace-1', device_id: 'windows-1', connected: true,
        capabilities: { agents: { opencode: { available: true, command: 'opencode', version: '1.0' } } },
      }] };
    },
    async request(workspaceId, command) {
      if (command?.kind === 'device.probe') return {
        status: 'available', source: 'local_connector', command: 'hdc.exe',
        targets: [{ id: 'windows-usb-01', state: 'connected' }],
        device_relay: { enabled: true, status: 'ready', remote_endpoint: '127.0.0.1:18710' },
      };
      return { status: 'ready', workspace_id: workspaceId };
    },
  };
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: {
      register(route) { routes.push(route); return () => {}; },
      registerUpgrade(route) { upgrades.push(route); return () => {}; },
    },
    subagents: { getProvider() { return undefined; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: { register() { return () => {}; } },
    inject(_services, callback) { callback(webCtx); },
  }, {
    enableDeliveryRuntime: true,
    localConnector: {
      enabled: true, client: connector, workspaceId: 'workspace-1', remoteRoot: '/srv/project', authToken: 'connector-secret',
      deviceRelay: { enabled: true, remotePort: 18710 },
    },
    workspaceGateway: {
      enabled: true, remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1', authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1 },
      signature: { key_id: 'test', value: 'signed' },
      client: { async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.list') return { entries: [] };
        if (envelope.payload.operation_kind === 'workspace.exec_profile') {
          assert.equal(envelope.payload.variables.device_hdc_host_override, '127.0.0.1:18710');
          return { exit_code: 0, stdout: JSON.stringify({ status: 'available', targets: [{ id: 'windows-usb-01', state: 'device' }] }) };
        }
        return { operation: envelope.payload.operation_kind, status: 'ready' };
      } },
      deviceProfile: 'debug.device_probe',
      profiles: { opencode: 'codeagent.opencode' },
    },
  });
  assert.equal(routes.length, 1);
  assert.equal(upgrades.length, 0);
  const response = { statusCode: 0, body: '', writeHead(status) { this.statusCode = status; }, end(value = '') { this.body = value; } };
  await routes[0].handler({ method: 'GET', url: '/api/ohos-ar/overview', headers: {}, async *[Symbol.asyncIterator]() {} }, response);
  const overview = JSON.parse(response.body);
  assert.equal(overview.workspace_mode, 'local_connector');
  assert.equal(overview.workspace_gateway.enabled, true);
  assert.equal(overview.connector.workspace_id, 'workspace-1');
  assert.equal(overview.codeagents.opencode.source, 'local-connector');
  assert.equal(overview.codeagents.opencode.execution_mode, 'local_connector');
  assert.equal(overview.debug.device_probe.source, 'local_connector_relay');
  assert.equal(overview.debug.device_probe.device_relay.status, 'ready');
  assert.equal(overview.debug.device_probe.targets[0].id, 'windows-usb-01');
});

test('DSH routes connector-only workflow, build, gate and device operations through the Local Connector', async () => {
  const routes = [];
  const commands = [];
  const connector = {
    snapshot() {
      return { connected: true, transport: 'websocket', workspaces: [{
        workspace_id: 'workspace-1', device_id: 'windows-1', connected: true,
        capabilities: {
          workspace_access: 'remote_tools', remote_workspace_reachable: true, remote_workspace_writable: true,
          agents: { codex: { available: true, command: 'codex.cmd', version: '1.0' } },
        },
      }] };
    },
    async request(workspaceId, command) {
      commands.push({ workspaceId, command });
      if (command.kind === 'probe') return {
        status: 'ready', workspace_id: workspaceId, device_id: 'windows-1', workspace_access: 'remote_tools',
        remote_workspace_reachable: true, remote_workspace_writable: true,
        agents: { codex: { available: true, command: 'codex.cmd', version: '1.0' } },
        device_probe: { status: 'available', source: 'local_connector', targets: [{ id: 'usb-1', state: 'connected' }] },
        device_relay: { enabled: true, status: 'ready', remote_endpoint: '127.0.0.1:18710' },
      };
      if (command.kind === 'device.probe') return {
        status: 'available', source: 'local_connector', command: 'hdc.exe',
        targets: [{ id: 'usb-1', state: 'connected' }],
        device_relay: { enabled: true, status: 'ready', remote_endpoint: '127.0.0.1:18710' },
      };
      if (command.kind === 'workspace.execute') {
        const operation = command.payload.envelope.payload.operation_kind;
        if (operation === 'workspace.list') {
          return { operation_id: command.payload.operation_id, status: 'completed', result: { entries: [] } };
        }
        if (operation === 'workspace.exec_profile') {
          return { operation_id: command.payload.operation_id, status: 'completed', result: {
            exit_code: 0, stdout: JSON.stringify({ status: 'available', targets: [{ id: 'usb-1', state: 'connected' }] }), stderr: '',
          } };
        }
      }
      throw new Error(`unexpected Connector command: ${command.kind}`);
    },
  };
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: { register(route) { routes.push(route); return () => {}; } },
    subagents: { getProvider() { return undefined; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: { register() { return () => {}; } },
    inject(_services, callback) { callback(webCtx); },
  }, {
    enableDeliveryRuntime: true,
    requireLocalConnector: true,
    localConnector: {
      enabled: true, client: connector, workspaceId: 'workspace-1', remoteRoot: '/srv/project', authToken: 'connector-secret',
      deviceRelay: { enabled: true, remotePort: 18710 },
      deviceProfile: 'debug.device_probe',
      capabilities: { build_execution: true, device_access: true },
    },
  });
  const response = { statusCode: 0, body: '', writeHead(status) { this.statusCode = status; }, end(value = '') { this.body = value; } };
  await routes[0].handler({ method: 'GET', url: '/api/ohos-ar/overview', headers: {}, async *[Symbol.asyncIterator]() {} }, response);
  const overview = JSON.parse(response.body);
  assert.equal(overview.workspace_mode, 'local_connector');
  assert.equal(overview.workspace_gateway.enabled, false);
  assert.equal(overview.debug.source_root, '/srv/project');
  assert.equal(overview.debug.device_probe.source, 'local_connector_relay');
  assert.ok(commands.some(({ command }) => command.kind === 'workspace.execute'
    && command.payload.envelope.payload.operation_kind === 'workspace.list'));
  assert.ok(commands.some(({ command }) => command.kind === 'workspace.execute'
    && command.payload.envelope.payload.operation_kind === 'workspace.exec_profile'));
});

test('DSH Cordis plugin rejects a local-only execution policy without a Connector transport', () => {
  assert.throws(() => apply({ tools: { register() { return () => {}; } } }, {
    enableDeliveryRuntime: true,
    requireLocalConnector: true,
  }), (error) => error.code === 'connector_required_unconfigured');
});

test('DSH Cordis plugin registers the Connector WebSocket upgrade on official WebServer', () => {
  const upgrades = [];
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: {
      register() { return () => {}; },
      registerUpgrade(route) { upgrades.push(route); return () => {}; },
    },
    subagents: { getProvider() { return undefined; } },
    effect(fn) { return fn(); },
  };
  apply({ tools: { register() { return () => {}; } }, inject(_services, callback) { callback(webCtx); } }, {
    enableDeliveryRuntime: true,
    localConnector: { enabled: true, workspaceId: 'workspace-1', remoteRoot: '/srv/project', authToken: 'connector-secret' },
  });
  assert.equal(upgrades.length, 1);
  assert.equal(upgrades[0].path, '/v1/connect');
});

test('official plugin passes the durable Connector outbox settings to the hub', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-plugin-outbox-'));
  try {
    const routes = [];
    const webCtx = {
      connection: { requestRejection() { return undefined; } },
      webServer: {
        register(route) { routes.push(route); return () => {}; },
        registerUpgrade() { return () => {}; },
      },
      subagents: { getProvider() { return undefined; } },
      effect(fn) { return fn(); },
    };
    apply({ tools: { register() { return () => {}; } }, inject(_services, callback) { callback(webCtx); } }, {
      enableDeliveryRuntime: true,
      dataRoot: root,
      localConnector: {
        enabled: true,
        workspaceId: 'workspace-outbox',
        remoteRoot: '/srv/project',
        authToken: 'connector-secret',
        replayPending: true,
        outboxFilePath: join(root, 'connector-outbox.json'),
      },
    });
    const response = { statusCode: 0, body: '', writeHead(status) { this.statusCode = status; }, end(value = '') { this.body = value; } };
    await routes[0].handler({ method: 'GET', url: '/api/ohos-ar/connector', headers: {}, async *[Symbol.asyncIterator]() {} }, response);
    const value = JSON.parse(response.body);
    assert.equal(value.security.persistent_outbox_enabled, true);
    assert.equal(value.security.replay_pending_enabled, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('official plugin attaches a durable process supervisor to the local CodeAgent executor', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const executor = new LocalCodeAgentExecutor();
    const attached = attachLocalProcessSupervisor(executor, { runtime: { store: { db } } });
    assert.ok(attached.supervisor);
    assert.equal(attached.supervisor.durable, true);
    assert.equal(executor.processSupervisor, attached.supervisor);
    await assert.doesNotReject(attached.ready);
  } finally {
    db.close();
  }
});

test('remote process supervisor view requests a redacted authority snapshot', async () => {
  const calls = [];
  const view = createRemoteProcessSupervisorView({
    gateway: {
      async execute(envelope) {
        calls.push(envelope);
        return {
          supervisor: {
            durable: true,
            counts: { running: 1 },
            operations: [{ operation_id: 'remote-op', state: 'running' }],
          },
        };
      },
    },
    authorityContext: {
      tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
      authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1,
    },
    signature: { key_id: 'test', value: 'signed' },
  });
  const snapshot = await view.snapshot({ runId: 'run-1', limit: 10 });
  assert.equal(snapshot.counts.running, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].message_type, 'authority.inspect');
  assert.equal(calls[0].payload.process_run_id, 'run-1');
  assert.equal(calls[0].payload.process_limit, 10);
});

test('preflight binds the selected environment to the configured profile digest', async () => {
  const preflight = createDeliveryPreflight({
    config: {
      repoRoot: process.cwd(),
      environmentProfile: { environment: 'openharmony', profile_digest: 'sha256:openharmony-profile' },
    },
    codeAgents: {
      async snapshot() {
        return {
          selected: 'opencode',
          selected_config: {
            id: 'opencode', available: true, dispatchable: true,
            execution_mode: 'local_cli', source: 'dsh-host',
          },
          options: [],
        };
      },
    },
  });
  const result = await preflight({ environment: 'openharmony' });
  const environment = result.checks.find((item) => item.id === 'environment_profile');
  assert.equal(environment.status, 'pass');
  assert.equal(environment.profile_digest, 'sha256:openharmony-profile');
  assert.equal(result.execution_plan.agent_load_strategy, 'local_cli_path');

  const wrongBranch = await preflight({ environment: 'harmonyos', componentType: 'chip' });
  assert.equal(wrongBranch.checks.find((item) => item.id === 'environment_profile').status, 'pending');
  assert.equal(wrongBranch.checks.find((item) => item.id === 'environment_profile').component_type, 'chip');
});

test('preflight automatically selects the configured source environment when the user supplies only AR and source root', async () => {
  const preflight = createDeliveryPreflight({
    config: {
      repoRoot: process.cwd(),
      environmentProfile: {
        environment: 'harmonyos', component_type: 'system', device_type: 'phone',
        profile_digest: 'sha256:harmony-system', upload_backend: 'gerrit',
      },
      publication: { backend: 'gerrit', project: 'platform/frameworks', branch: 'main' },
      networkPublish: true,
    },
    codeAgents: {
      async snapshot() {
        return {
          selected: 'codex',
          selected_config: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_connector' },
          options: [],
        };
      },
    },
  });

  const result = await preflight({ repoRoot: process.cwd(), arText: '# AR request' });
  assert.equal(result.resolved_input.environment, 'harmonyos');
  assert.equal(result.resolved_input.component_type, 'system');
  assert.equal(result.resolved_input.device_type, 'phone');
  assert.deepEqual(result.resolved_input.publication, {
    backend: 'gerrit', project: 'platform/frameworks', branch: 'main',
  });
  assert.equal(result.resolved_input.detection.environment_source, 'configured_profile');
  assert.equal(result.checks.find((item) => item.id === 'environment_selection').status, 'pass');
  assert.equal(result.checks.find((item) => item.id === 'environment_profile').status, 'pass');
});

test('preflight also binds HarmonyOS system and chip to different profile metadata', async () => {
  const preflight = createDeliveryPreflight({
    config: {
      repoRoot: process.cwd(),
      environmentProfile: {
        environment: 'harmonyos', component_type: 'system', profile_digest: 'sha256:harmony-system',
      },
    },
    codeAgents: {
      async snapshot() {
        return {
          selected: 'opencode',
          selected_config: { id: 'opencode', available: true, dispatchable: true, execution_mode: 'local_cli' },
          options: [],
        };
      },
    },
  });
  const system = await preflight({ environment: 'harmonyos', componentType: 'system', deviceType: 'phone' });
  const chip = await preflight({ environment: 'harmonyos', componentType: 'chip', deviceType: 'chip' });
  assert.equal(system.checks.find((item) => item.id === 'environment_profile').status, 'pass');
  assert.equal(chip.checks.find((item) => item.id === 'environment_profile').status, 'pending');
  assert.equal(chip.checks.find((item) => item.id === 'environment_profile').reason, 'environment_profile_component_mismatch');
});

test('preflight does not silently replace an explicitly requested unknown CodeAgent', async () => {
  const preflight = createDeliveryPreflight({
    config: { repoRoot: process.cwd() },
    codeAgents: {
      async snapshot() {
        return {
          selected: 'claude-code',
          selected_config: { id: 'claude-code', available: true, dispatchable: true, execution_mode: 'dsh_provider' },
          options: [{ id: 'claude-code', available: true, dispatchable: true, execution_mode: 'dsh_provider' }],
        };
      },
    },
  });
  const result = await preflight({ environment: 'openharmony', agent: 'missing-agent' });
  const check = result.checks.find((item) => item.id === 'codeagent_selected');
  assert.equal(check.status, 'blocked');
  assert.equal(check.id, 'codeagent_selected');
  assert.equal(result.execution_plan.agent_load_strategy, 'unresolved');
});

test('remote preflight detects OpenHarmony from the selected source root without asking for environment fields', async () => {
  const paths = [];
  const deliveryProfiles = {
    init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
    advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
  };
  const preflight = createDeliveryPreflight({
    remoteConfig: {
      remoteRoot: '/srv/project', deliveryProfiles,
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', value: 'signed' },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute(envelope) {
        const payload = envelope.payload ?? {};
        paths.push(payload.path);
        const missing = ['ohos/build_system.sh', 'ohos/build_vendor.sh'].includes(payload.path);
        if (missing) throw Object.assign(new Error('missing'), { code: 'workspace_unavailable' });
        return {
          operation: 'probe', relative_path: payload.path ?? '', kind: payload.expect ?? 'directory',
          reachable: true, readable: true, writable: payload.require_write === true,
          executable: payload.require_executable === true ? true : null,
        };
      },
    },
    codeAgents: { async snapshot() { return {
      selected: 'codex', selected_config: { id: 'codex', available: true, dispatchable: true }, options: [],
    }; } },
  });

  const result = await preflight({ repoRoot: '/srv/project/ohos', arText: '# AR request' });
  assert.equal(result.resolved_input.environment, 'openharmony');
  assert.equal(result.resolved_input.component_type, null);
  assert.equal(result.resolved_input.detection.environment_source, 'source_layout');
  assert.equal(result.checks.find((item) => item.id === 'environment_selection').status, 'pass');
  assert.equal(result.checks.find((item) => item.id === 'source_tree_layout').status, 'pass');
  assert.ok(paths.includes('ohos/build.sh'));
  assert.ok(paths.includes('ohos/build_system.sh'));
  assert.ok(paths.includes('ohos/build_vendor.sh'));
});

test('remote preflight infers GitCode publication and base commit from the selected source repository', async () => {
  const deliveryProfiles = {
    init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
    advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
  };
  const preflight = createDeliveryPreflight({
    remoteConfig: {
      remoteRoot: '/srv/project', deliveryProfiles, networkPublish: true,
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', value: 'signed' },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.git_context') {
          return {
            operation: 'git_context', git_root: '/srv/project/ohos',
            head: '0123456789abcdef0123456789abcdef01234567', branch: 'feature/ar',
            remotes: [{ name: 'origin', url: 'https://gitcode.com/owner/project.git' }],
          };
        }
        const payload = envelope.payload ?? {};
        return {
          operation: 'probe', relative_path: payload.path ?? '', kind: payload.expect ?? 'directory',
          reachable: true, readable: true, writable: payload.require_write === true,
          executable: payload.require_executable === true ? true : null,
        };
      },
    },
    codeAgents: { async snapshot() { return {
      selected: 'codex', selected_config: { id: 'codex', available: true, dispatchable: true }, options: [],
    }; } },
  });
  const result = await preflight({
    environment: 'openharmony', repoRoot: '/srv/project/ohos', arText: '# AR request',
  });
  assert.equal(result.resolved_input.base_commit, '0123456789abcdef0123456789abcdef01234567');
  assert.deepEqual(result.resolved_input.publication, {
    backend: 'gitcode', repo_slug: 'owner/project', branch: 'feature/ar', base: 'main',
  });
  assert.equal(result.resolved_input.detection.publication_source, 'git_remote');
  assert.equal(result.checks.find((item) => item.id === 'publication_target').status, 'pass');
});

test('remote preflight probes the registered SSH workspace instead of trusting Gateway health alone', async () => {
  const calls = [];
  const deliveryProfiles = {
    init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
    advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
  };
  const preflight = createDeliveryPreflight({
    config: { defaultArPath: '/home/dsh/local-only/ar.md' },
    remoteConfig: {
      remoteRoot: '/srv/project', deliveryProfiles,
      authorityContext: {
        tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
        authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1,
      },
      signature: { key_id: 'test', value: 'signed' },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute(envelope) {
        calls.push(envelope);
        const payload = envelope.payload ?? {};
        return {
          operation: 'probe', relative_path: payload.path ?? '', kind: payload.expect ?? 'directory',
          reachable: true, readable: true, writable: payload.require_write === true,
          executable: payload.require_executable === true ? true : null,
        };
      },
    },
    codeAgents: {
      async snapshot() {
        return { selected: 'opencode', selected_config: { id: 'opencode', available: true, dispatchable: true }, options: [] };
      },
    },
  });
  const result = await preflight({ environment: 'openharmony', agent: 'opencode', repoRoot: '/srv/project/repo' });
  const probeCalls = calls.filter((item) => item.payload.operation_kind === 'workspace.probe');
  assert.equal(probeCalls.length, 18);
  assert.equal(probeCalls[0].message_type, 'operation.start');
  assert.equal(probeCalls[0].payload.require_write, true);
  assert.equal(probeCalls[0].payload.path, 'repo');
  assert.equal(probeCalls[1].payload.path, 'repo/build.sh');
  assert.equal(probeCalls[1].payload.require_executable, true);
  assert.equal(probeCalls[2].payload.path, 'repo/test/testfwk/developer_test');
  assert.equal(probeCalls[3].payload.path, 'repo/test/testfwk/developer_test/start.sh');
  assert.equal(probeCalls[3].payload.require_executable, true);
  const bundlePaths = probeCalls.slice(4).map((item) => item.payload.path);
  assert.ok(bundlePaths.includes('repo/skills/ohos-ar-dev-phases/scripts'));
  assert.ok(bundlePaths.includes('repo/skills/ohos-ar-dev-phases/scripts/lib/environments.py'));
  assert.ok(bundlePaths.includes('repo/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py'));
  assert.equal(result.execution_plan.source_root, '/srv/project/repo');
  assert.equal(result.checks.find((item) => item.id === 'workspace_binding').status, 'pass');
  assert.equal(result.checks.find((item) => item.id === 'workspace_transport').status, 'pass');
  assert.equal(result.checks.find((item) => item.id === 'source_tree_layout').status, 'pass');
  assert.equal(result.checks.find((item) => item.id === 'ar_input').reason, 'ar_input_required');
});

test('remote preflight keeps a local Connector device blocked for SSH-host P6/P7 gates', async () => {
  const preflight = createDeliveryPreflight({
    config: {},
    remoteConfig: {
      remoteRoot: '/srv/project',
      authorityContext: {
        tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
        authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1,
      },
      signature: { key_id: 'test', value: 'signed' },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute(envelope) {
        return {
          operation: 'probe', relative_path: envelope.payload.path ?? '', kind: envelope.payload.expect ?? 'directory',
          reachable: true, readable: true, writable: envelope.payload.require_write === true,
        };
      },
    },
    connector: {
      snapshot() { return { workspaces: [{ workspace_id: 'workspace-1', device_id: 'windows-1', connected: true }] }; },
      async request() { return { status: 'ready', workspace_id: 'workspace-1', workspace_access: 'remote_tools', remote_workspace_reachable: true, remote_workspace_writable: true }; },
    },
    connectorWorkspaceId: 'workspace-1',
    debug: { async status() { return { device_probe: {
      status: 'available', source: 'local_connector', targets: [{ id: 'usb-01', state: 'connected' }],
    } }; } },
    codeAgents: { async snapshot() { return {
      selected: 'opencode', selected_config: { id: 'opencode', available: true, dispatchable: true }, options: [],
    }; } },
  });

  const result = await preflight({ environment: 'openharmony', agent: 'opencode', arText: '# request' });
  const device = result.checks.find((item) => item.id === 'device_transport');
  assert.equal(device.status, 'blocked');
  assert.equal(device.source, 'local_connector');
  assert.equal(device.observed_status, 'available');
  assert.equal(device.reason, 'local_device_not_forwarded_to_ssh_gate');
});

test('remote HarmonyOS preflight requires profile-provided source markers', async () => {
  const calls = [];
  const preflight = createDeliveryPreflight({
    remoteConfig: {
      remoteRoot: '/srv/project',
      deliveryProfiles: {
        init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
        advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
      },
      sourceLayoutMarkers: ['vendor/build.sh'],
      authorityContext: { tenant_id: 't', workspace_id: 'w' },
      signature: { key_id: 'test', value: 'signed' },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute(envelope) {
        calls.push(envelope);
        const payload = envelope.payload ?? {};
        return {
          operation: 'probe', relative_path: payload.path ?? '', kind: payload.expect ?? 'directory',
          reachable: true, readable: true, writable: payload.require_write === true,
          executable: payload.require_executable === true ? true : null,
        };
      },
    },
    codeAgents: {
      async snapshot() {
        return { selected: 'opencode', selected_config: { id: 'opencode', available: true, dispatchable: true }, options: [] };
      },
    },
  });
  const result = await preflight({ environment: 'harmonyos', componentType: 'system', deviceType: 'phone', repoRoot: '/srv/project/product' });
  const probeCalls = calls.filter((item) => item.payload.operation_kind === 'workspace.probe');
  assert.equal(probeCalls.length, 16);
  assert.ok(probeCalls.slice(1).some((item) => item.payload.path === 'product/vendor/build.sh'));
  assert.ok(probeCalls.slice(1).some((item) => item.payload.path === 'product/skills/ohos-ar-dev-phases/scripts/lib/environments.py'));
  assert.equal(probeCalls[0].payload.path, 'product');
  assert.equal(probeCalls[1].payload.path, 'product/vendor/build.sh');
  assert.equal(result.checks.find((item) => item.id === 'source_tree_layout').status, 'pass');
});

test('remote preflight fails closed instead of throwing for an invalid remote root', async () => {
  let executeCalls = 0;
  const preflight = createDeliveryPreflight({
    remoteConfig: {
      remoteRoot: 'relative-root',
      deliveryProfiles: {
        init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
        advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
      },
    },
    remoteGateway: {
      async health() { return { status: 'ok' }; },
      async execute() { executeCalls += 1; throw new Error('must not probe an invalid root'); },
    },
    codeAgents: {
      async snapshot() {
        return { selected: 'opencode', selected_config: { id: 'opencode', available: true, dispatchable: true }, options: [] };
      },
    },
  });
  const result = await preflight({ environment: 'openharmony', agent: 'opencode' });
  assert.equal(result.status, 'blocked');
  assert.equal(result.checks.find((item) => item.id === 'workspace_binding').status, 'blocked');
  assert.equal(result.checks.find((item) => item.id === 'workflow_scripts').status, 'blocked');
  assert.equal(executeCalls, 0);
});

test('local Connector preflight probes the mounted root instead of trusting socket liveness', async () => {
  const connector = {
    snapshot() {
      return { workspaces: [{ workspace_id: 'workspace-1', device_id: 'windows-1', connected: true,
        capabilities: { workspace_access: 'sshfs_mount', agents: { opencode: { available: true } } } }] };
    },
    async probeWorkspace() {
      return { status: 'blocked', workspace_id: 'workspace-1', local_root_exists: true,
        local_root_writable: false, reason: 'local_root_not_readable_or_writable' };
    },
  };
  const preflight = createDeliveryPreflight({
    connector,
    connectorWorkspaceId: 'workspace-1',
    codeAgents: {
      async snapshot() {
        return { selected: 'opencode', selected_config: { id: 'opencode', available: true,
          dispatchable: true, execution_mode: 'local_connector' }, options: [] };
      },
    },
  });
  const result = await preflight({ environment: 'openharmony' });
  const check = result.checks.find((item) => item.id === 'connector_transport');
  assert.equal(check.status, 'blocked');
  assert.equal(check.reason, 'local_root_not_readable_or_writable');
  assert.equal(check.local_root_writable, false);
});
