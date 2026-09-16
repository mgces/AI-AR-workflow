import { defineTool } from '@deepseek-ai/dsh-tools';
import { randomUUID } from 'node:crypto';
import { AdaptiveWorkflowController } from '../core/controller.js';
import { createToolCatalog } from '../tools/catalog.js';
import { createDeliveryRuntimeTools } from './delivery-runtime.js';
import { CodeAgentRegistry } from './codeagents.js';
import { ArRuntimeService } from '../../../platform/apps/local-console/src/ar-runtime.js';
import { LocalCodeAgentExecutor } from '../../../platform/apps/local-console/src/codeagent-executor.js';
import { RemoteCodeAgentExecutor } from '../../../platform/apps/local-console/src/remote-codeagent-executor.js';
import { ConnectorCodeAgentExecutor } from '../../../platform/apps/local-console/src/connector-codeagent-executor.js';
import { RemotePythonDeliveryAdapter } from '../../../platform/apps/local-console/src/remote-delivery-adapter.js';
import { ArDeliveryScheduler } from '../../../platform/apps/local-console/src/scheduler.js';
import { probeHostCapabilities } from '../../../platform/apps/local-console/src/capabilities.js';
import { HttpRagModelAdapter, LocalRagIndex, RemoteRagIndex } from '../../../platform/apps/local-console/src/rag.js';
import { probeDebugSurface, RemoteDebugSurface } from '../../../platform/apps/local-console/src/debug.js';
import { createOfficialProviderRunner } from './official-provider.js';
import { registerDeliveryWebRoutes } from './web-routes.js';
import { WorkspaceGatewayClient } from '../../../workspace-gateway/src/connector/http-client.js';
import { createHmacSigner } from '../../../workspace-gateway/src/authority/signature.js';
import { ConnectorWebSocketHub } from '../../../workspace-gateway/src/connector/websocket.js';
import { ConnectorPairingRegistry } from '../../../workspace-gateway/src/connector/pairing-registry.js';
import { cgroupOptionsFromEnv, ProcessSupervisor } from '../../../workspace-gateway/src/supervisor/process-supervisor.js';
import { createAuthorityEnvelope } from '../../../workspace-gateway/src/authority/envelope.js';
import { join, posix, resolve } from 'node:path';
import {
  DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH,
  evaluatePrerequisites,
  probeLocalPrerequisites,
  REQUIRED_AR_GATE_SCRIPTS,
} from '../../../platform/apps/local-console/src/preflight.js';

export const name = 'ai-ar-adaptive-workflow-controller';
export const inject = ['tools'];

function createConfiguredRagAdapter(config, remoteRagConfig, env = process.env) {
  const explicit = config.ragModelAdapter ?? remoteRagConfig?.modelAdapter;
  if (explicit) return explicit;
  const endpoint = remoteRagConfig?.endpoint
    ?? config.ragModelEndpoint
    ?? env?.DSH_RAG_ENDPOINT
    ?? null;
  if (!endpoint) return null;
  const secretEnv = remoteRagConfig?.apiKeyEnv ?? config.ragModelApiKeyEnv ?? 'DSH_RAG_API_KEY';
  return new HttpRagModelAdapter({
    endpoint,
    // RAG credentials are host secrets. Do not accept an API key from the
    // patch/config object, where it could be persisted or echoed by DSH.
    apiKey: env?.[secretEnv] ?? null,
    embeddingPath: remoteRagConfig?.embeddingPath ?? config.ragModelEmbeddingPath ?? '/embeddings',
    rerankPath: remoteRagConfig?.rerankPath ?? config.ragModelRerankPath ?? '/rerank',
    timeoutMs: remoteRagConfig?.timeoutMs ?? config.ragModelTimeoutMs ?? 30_000,
  });
}

function resolveSecretReference(value, env = process.env) {
  if (typeof value !== 'string') return value ?? null;
  const match = value.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/u);
  return match ? (env?.[match[1]] ?? null) : value;
}

const HEADER_ENV_REFERENCE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu;

/**
 * Resolve deployment secret references in Gateway transport headers. Header
 * values may use `${ENV_NAME}` inside a larger value (for example
 * `Bearer ${DSH_GATEWAY_BEARER_TOKEN}`); unresolved references remain literal
 * so a missing secret produces a transport 401 instead of silently weakening
 * the Gateway authorization boundary. Secrets are held only in the client
 * process and are never written back to the Cordis patch.
 */
export function resolveGatewayHeaders(headers, env = process.env) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return {};
  return Object.fromEntries(Object.entries(headers).map(([name, raw]) => {
    if (typeof raw !== 'string' || raw.length > 16 * 1024 || /[\0\r\n]/u.test(raw)) {
      throw Object.assign(new Error(`Gateway header value contains control characters or is too large (${name})`), {
        code: 'workspace_gateway_header_invalid',
      });
    }
    const value = raw.replace(HEADER_ENV_REFERENCE, (reference, key) => {
      const resolved = env?.[key];
      if (resolved === undefined || resolved === null) return reference;
      const stringValue = String(resolved);
      if (/[\0\r\n]/u.test(stringValue)) {
        throw Object.assign(new Error(`Gateway header value contains control characters (${name})`), {
          code: 'workspace_gateway_header_invalid',
        });
      }
      return stringValue;
    });
    return [name, value];
  }));
}

/**
 * Resolve the immutable identity that the remote Gateway expects on every
 * Authority envelope.  A Gateway binds its own tenant/workspace values at
 * startup, so letting a remote adapter construct envelopes without these
 * fields would only fail on the first operation (usually as an opaque 400).
 * Require the binding while the DSH plugin is loading and keep run-specific
 * fields optional; the adapters derive those per operation.
 */
export function resolveRemoteAuthorityContext({ remoteConfig = {}, config = {}, env = process.env } = {}) {
  const configured = remoteConfig?.authorityContext ?? remoteConfig?.authority_context
    ?? config?.authorityContext ?? config?.authority_context;
  if (configured !== undefined && (!configured || typeof configured !== 'object' || Array.isArray(configured))) {
    throw Object.assign(new Error('workspace Gateway authorityContext must be an object'), {
      code: 'workspace_gateway_authority_context_invalid',
    });
  }
  const context = { ...(configured ?? {}) };
  const valueFor = (field, ...fallbacks) => {
    let value = context[field];
    if (value === undefined || value === null || value === '') {
      value = fallbacks.find((item) => item !== undefined && item !== null && item !== '') ?? null;
    }
    const resolved = resolveSecretReference(value, env);
    if (typeof resolved !== 'string' || resolved.trim() === ''
        || /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(resolved)
        || /[\0\r\n]/u.test(resolved)) {
      throw Object.assign(new Error(`workspace Gateway authorityContext.${field} is required`), {
        code: 'workspace_gateway_authority_context_unconfigured',
        details: { field },
      });
    }
    return resolved.trim();
  };
  context.tenant_id = valueFor('tenant_id', remoteConfig?.tenantId, remoteConfig?.tenant_id,
    config?.tenantId, config?.tenant_id, env?.DSH_TENANT_ID);
  context.workspace_id = valueFor('workspace_id', remoteConfig?.workspaceId, remoteConfig?.workspace_id,
    config?.workspaceId, config?.workspace_id, env?.DSH_WORKSPACE_ID);
  return context;
}

function createConnectorPairingRegistry(localConfig) {
  const configured = localConfig?.pairingRegistry ?? localConfig?.pairing_registry ?? null;
  if (!configured) return null;
  if (typeof configured.authorize === 'function') return configured;
  if (typeof configured !== 'object' || Array.isArray(configured)) {
    throw Object.assign(new Error('local Connector pairingRegistry must be an object or registry instance'), {
      code: 'connector_pairing_config_invalid',
    });
  }
  const filePath = configured.filePath ?? configured.file_path ?? null;
  return new ConnectorPairingRegistry({
    ...(filePath ? { filePath: resolve(filePath) } : {}),
    ...(Number.isSafeInteger(configured.defaultTtlMs ?? configured.default_ttl_ms)
      ? { defaultTtlMs: configured.defaultTtlMs ?? configured.default_ttl_ms } : {}),
    ...(Number.isSafeInteger(configured.maxRecords ?? configured.max_records)
      ? { maxRecords: configured.maxRecords ?? configured.max_records } : {}),
  });
}

function createLazyDeliveryService(config, capabilityProbe, deliveryAdapter = null) {
  let instance;
  const get = () => {
    instance ??= new ArRuntimeService({
      dataRoot: config.dataRoot,
      deliveryScriptsRoot: config.deliveryScriptsRoot,
      deliveryBridgePath: config.deliveryBridgePath,
      pythonCommand: config.pythonCommand,
      deliveryAdapter,
      hostBindingId: config.hostBindingId ?? 'dsh-web-agent',
      hostKind: config.hostKind ?? 'other',
      hostVersion: config.hostVersion ?? process.version,
      hostCapabilities: capabilityProbe?.capabilities,
      capabilitySource: capabilityProbe?.capability_source ?? 'host-probe',
    });
    return instance;
  };
  const proxy = new Proxy({}, {
    get(_target, property) {
      const value = get()[property];
      return typeof value === 'function' ? value.bind(get()) : value;
    },
  });
  return {
    get,
    proxy,
    close() {
      if (instance) instance.close();
    },
  };
}

/**
 * Attach the durable process journal used by a local official DSH deployment.
 *
 * The runtime owns the SQLite connection, so the CodeAgent supervisor and the
 * AR scheduler recover from the same database after a DSH restart.  A runtime
 * supplied by a test or an embedding host may not expose a database; in that
 * case the executor keeps its explicitly requested in-memory process mode.
 */
export function attachLocalProcessSupervisor(executor, runtimeService, {
  maxOutputBytes,
  defaultTimeoutMs,
  cgroupOptions = {},
} = {}) {
  if (!executor || typeof executor.run !== 'function') throw new TypeError('executor.run is required');
  const db = runtimeService?.runtime?.store?.db ?? runtimeService?.store?.db ?? null;
  if (!db) return { supervisor: null, ready: Promise.resolve(null) };
  const options = { db };
  if (Number.isSafeInteger(maxOutputBytes)) options.maxOutputBytes = maxOutputBytes;
  if (Number.isSafeInteger(defaultTimeoutMs)) options.defaultTimeoutMs = defaultTimeoutMs;
  if (cgroupOptions && typeof cgroupOptions === 'object') Object.assign(options, cgroupOptions);
  const supervisor = new ProcessSupervisor(options);
  const ready = Promise.resolve().then(() => supervisor.reconcile());
  // Keep an initialization failure observable through `executor.supervisorReady`
  // without producing an unhandled rejection when no run is submitted yet.
  void ready.catch(() => {});
  executor.processSupervisor = supervisor;
  executor.supervisorReady = ready;
  return { supervisor, ready };
}

function unavailableProcessSnapshot(reason) {
  return {
    durable: false,
    generated_at: new Date().toISOString(),
    counts: { starting: 0, running: 0, unknown: 0, completed: 0, failed: 0, cancelled: 0 },
    operations: [],
    ...(reason ? { state: 'unavailable', reason: String(reason).slice(0, 512) } : {}),
  };
}

function publicationTarget(publication) {
  if (!publication || typeof publication !== 'object') return null;
  return publication.repo_slug ?? publication.project ?? publication.target ?? null;
}

function publicationConfigured(publication) {
  if (!publication || typeof publication !== 'object') return false;
  const backend = publication.backend;
  const target = publicationTarget(publication);
  return (backend === 'gitcode' || backend === 'gerrit')
    && typeof target === 'string' && target.trim() !== ''
    && typeof publication.branch === 'string' && publication.branch.trim() !== '';
}

async function gatewayHealth(gateway) {
  if (!gateway || typeof gateway.health !== 'function') {
    return { configured: Boolean(gateway), reachable: false, reason: 'gateway_health_probe_unavailable' };
  }
  try {
    const value = await gateway.health();
    return { configured: true, reachable: value?.status === 'ok', reason: value?.status === 'ok' ? null : 'gateway_health_invalid' };
  } catch (error) {
    return { configured: true, reachable: false, reason: error?.code ?? 'gateway_unreachable', error: error?.message ?? String(error) };
  }
}

function connectorProbeView(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    status: value.status ?? null,
    workspace_id: value.workspace_id ?? null,
    device_id: value.device_id ?? null,
    remote_root: value.remote_root ?? null,
    workspace_access: value.workspace_access ?? null,
    local_root_exists: value.local_root_exists ?? null,
    local_root_writable: value.local_root_writable ?? null,
    remote_workspace_reachable: value.remote_workspace_reachable ?? null,
    remote_workspace_writable: value.remote_workspace_writable ?? null,
    remote_tools: value.workspace_access === 'remote_tools' || value.remote_tools === true,
    reason: value.reason ?? null,
    agents: value.agents && typeof value.agents === 'object' ? structuredClone(value.agents) : null,
  };
}

async function connectorWorkspaceStatus(connector, workspaceId, { probe = false } = {}) {
  if (!connector || typeof connector.snapshot !== 'function' || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    return { configured: false, reachable: false, workspace_id: workspaceId ?? null, device_id: null, reason: 'connector_not_configured' };
  }
  let probeResult = null;
  let probeError = null;
  if (probe) {
    try {
      if (typeof connector.probeWorkspace === 'function') {
        probeResult = await connector.probeWorkspace(workspaceId, { timeoutMs: 30_000 });
      } else if (typeof connector.request === 'function') {
        probeResult = await connector.request(workspaceId, {
          kind: 'probe', payload: { workspace_id: workspaceId },
        }, { timeoutMs: 30_000 });
      } else {
        probeError = Object.assign(new Error('Connector does not expose a probe command'), { code: 'connector_probe_unavailable' });
      }
    } catch (error) {
      probeError = error;
    }
  }
  try {
    const snapshot = await connector.snapshot();
    const workspace = snapshot?.workspaces?.find((item) => item?.workspace_id === workspaceId) ?? null;
    const capabilities = workspace?.capabilities ?? {};
    const workspaceAccess = probeResult?.workspace_access ?? capabilities.workspace_access ?? 'sshfs_mount';
    const localRootExists = probeResult?.local_root_exists ?? capabilities.local_root_exists ?? null;
    const localRootWritable = probeResult?.local_root_writable ?? capabilities.local_root_writable ?? null;
    const remoteWorkspaceReachable = probeResult?.remote_workspace_reachable ?? capabilities.remote_workspace_reachable ?? null;
    const remoteWorkspaceWritable = probeResult?.remote_workspace_writable ?? capabilities.remote_workspace_writable ?? null;
    const connected = workspace?.connected === true;
    const workspaceReady = workspaceAccess === 'remote_tools'
      ? remoteWorkspaceReachable === true && remoteWorkspaceWritable === true
      : localRootExists === true && localRootWritable === true;
    const mountReady = !probe || (probeError === null && workspaceReady);
    return {
      configured: true,
      reachable: connected && mountReady,
      workspace_id: workspaceId,
      device_id: workspace?.device_id ?? null,
      workspace_access: workspaceAccess,
      capabilities,
      local_root_exists: localRootExists,
      local_root_writable: localRootWritable,
      remote_workspace_reachable: remoteWorkspaceReachable,
      remote_workspace_writable: remoteWorkspaceWritable,
      last_probe: connectorProbeView(probeResult),
      reason: !connected ? 'connector_offline' : probeError?.code
        ?? (mountReady ? null : (probeResult?.reason ?? 'connector_workspace_unavailable')),
    };
  } catch (error) {
    return { configured: true, reachable: false, workspace_id: workspaceId, device_id: null, workspace_access: 'sshfs_mount',
      local_root_exists: probeResult?.local_root_exists ?? null,
      local_root_writable: probeResult?.local_root_writable ?? null,
      last_probe: connectorProbeView(probeResult), reason: error?.code ?? probeError?.code ?? 'connector_snapshot_failed' };
  }
}

function remotePathInsideRoot(remoteRoot, requested, label = 'repoRoot') {
  if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot)) {
    return { root: null, path: null, relative: null, reason: 'remote_root_invalid' };
  }
  const root = posix.normalize(remoteRoot);
  if (requested === null || requested === undefined || requested === '') {
    return { root, path: root, relative: '.', reason: null };
  }
  if (typeof requested !== 'string' || requested.includes('\\') || requested.includes('\0')) {
    return { root, path: null, relative: null, reason: `${label}_invalid` };
  }
  const path = posix.normalize(posix.isAbsolute(requested) ? requested : posix.join(root, requested));
  const prefix = root === '/' ? '/' : `${root}/`;
  if (path !== root && !path.startsWith(prefix)) {
    return { root, path, relative: null, reason: `${label}_outside_root` };
  }
  return { root, path, relative: path === root ? '.' : posix.relative(root, path), reason: null };
}

function remoteMarkerPath(remoteRoot, repoRoot, marker) {
  const selected = remotePathInsideRoot(remoteRoot, repoRoot, 'repoRoot');
  if (selected.reason || typeof marker !== 'string' || marker.trim() === ''
      || posix.isAbsolute(marker) || marker.includes('\\') || marker.includes('\0')) return null;
  const candidate = remotePathInsideRoot(remoteRoot, posix.join(selected.path, marker), 'source_marker');
  if (candidate.reason) return null;
  const selectedPrefix = selected.path === '/' ? '/' : `${selected.path}/`;
  if (candidate.path !== selected.path && !candidate.path.startsWith(selectedPrefix)) return null;
  return candidate.relative;
}

function preflightAuthorityContext(remoteConfig = {}) {
  const context = { ...(remoteConfig.authorityContext ?? {}) };
  const workspaceId = context.workspace_id ?? 'workspace';
  const runId = context.cloud_run_id ?? `preflight-${workspaceId}`;
  context.cloud_run_id = String(runId);
  context.authority_run_id ??= `authority-${context.cloud_run_id}`;
  if (!Number.isInteger(context.revision) || context.revision < 1) context.revision = 1;
  context.phase_epoch ??= 'phase-preflight';
  if (!Number.isInteger(context.connection_epoch) || context.connection_epoch < 1) context.connection_epoch = 1;
  return context;
}

/**
 * Check the actual SSH code root through the fixed Gateway operation.  The
 * HTTP health endpoint only proves that a Gateway process is listening; it
 * does not prove that its SSH target, registered root, read permissions, and
 * write permissions are usable by the AR workflow.
 */
async function executeRemoteWorkspaceProbe({
  gateway, remoteConfig, sign = null, signature = null,
  path = '.', expect = 'directory', requireWrite = false, requireExecutable = false,
  operationPrefix = 'workspace',
} = {}) {
  if (!gateway || typeof gateway.execute !== 'function') {
    return { reachable: false, readable: false, writable: false, reason: 'gateway_workspace_probe_unavailable' };
  }
  const context = preflightAuthorityContext(remoteConfig);
  const fields = {
    ...context,
    message_type: 'operation.start',
    operation_id: `preflight-${operationPrefix}-${randomUUID()}`,
    nonce: randomUUID(),
    sent_at: new Date().toISOString(),
    payload: {
      operation_kind: 'workspace.probe', path, expect,
      require_write: requireWrite, require_executable: requireExecutable,
    },
  };
  try {
    const unsigned = createAuthorityEnvelope(fields);
    const detached = sign ? await sign(unsigned) : signature;
    if (!detached || typeof detached !== 'object') {
      return { reachable: false, readable: false, writable: false, reason: 'gateway_signature_unconfigured' };
    }
    const response = await gateway.execute(createAuthorityEnvelope({ ...fields, signature: detached }));
    const result = response?.status === 'completed' && response.result && typeof response.result === 'object'
      ? response.result : response;
    const executableVerified = requireExecutable ? result?.executable === true : result?.executable ?? null;
    if (result?.operation !== 'probe' || result.reachable !== true || result.readable !== true
        || (result.kind !== undefined && result.kind !== expect)
        || (requireExecutable && executableVerified !== true)) {
      return { reachable: false, readable: false, writable: false, reason: 'gateway_workspace_probe_invalid', path, expect };
    }
    return {
      reachable: true,
      readable: true,
      writable: requireWrite ? result.writable === true : null,
      executable: executableVerified,
      executable_verified: requireExecutable ? executableVerified === true : null,
      kind: result.kind ?? null,
      kind_verified: result.kind === expect,
      path,
      expect,
      reason: requireWrite && result.writable !== true ? 'workspace_not_writable' : null,
    };
  } catch (error) {
    return {
      reachable: false,
      readable: false,
      writable: false,
      path,
      expect,
      reason: error?.code ?? 'gateway_workspace_probe_failed',
      error: error?.message ?? String(error),
    };
  }
}

async function probeRemoteWorkspace({ gateway, remoteConfig, repoRoot = null, sign = null, signature = null } = {}) {
  const selected = remotePathInsideRoot(remoteConfig?.remoteRoot, repoRoot, 'repoRoot');
  if (selected.reason) {
    return {
      reachable: false, readable: false, writable: false, path: selected.path,
      expect: 'directory', reason: selected.reason,
    };
  }
  return executeRemoteWorkspaceProbe({
    gateway, remoteConfig, sign, signature, path: selected.relative, expect: 'directory', requireWrite: true,
    operationPrefix: 'workspace',
  });
}

function remoteSourceMarkers(environment, componentType, configured = null) {
  if (Array.isArray(configured) && configured.length > 0) {
    return configured.map((marker) => typeof marker === 'string'
      ? {
          path: marker,
          expect: marker.endsWith('developer_test') ? 'directory' : 'file',
          require_executable: marker.endsWith('.sh'),
        }
      : {
          path: marker?.path,
          expect: marker?.kind ?? marker?.expect ?? 'file',
          require_executable: marker?.executable === true,
        })
      .filter((marker) => typeof marker.path === 'string' && marker.path.trim() !== ''
        && (marker.expect === 'file' || marker.expect === 'directory'));
  }
  if (environment === 'openharmony') {
    return [
      { path: 'build.sh', expect: 'file', require_executable: true },
      { path: 'test/testfwk/developer_test', expect: 'directory' },
      { path: 'test/testfwk/developer_test/start.sh', expect: 'file', require_executable: true },
    ];
  }
  // HarmonyOS source roots are product-specific. Their root markers must be
  // supplied by the selected environment profile; a guessed build script
  // would let an incomplete profile appear ready while the Python gate still
  // refuses its UNSET root_markers value.
  return [];
}

async function probeRemoteSourceLayout({ gateway, remoteConfig, repoRoot = null, sign, signature, environment, componentType, sourceLayoutMarkers = null } = {}) {
  if (remoteConfig?.sourceLayoutVerified === true || remoteConfig?.source_layout_verified === true) {
    return { status: 'pass', source_layout_verified: true, reason: null, markers: [] };
  }
  const markers = remoteSourceMarkers(environment, componentType, sourceLayoutMarkers);
  if (markers.length === 0) return { status: 'blocked', source_layout_verified: false, markers, reason: 'source_layout_markers_unknown' };
  const results = [];
  for (const marker of markers) {
    const markerPath = remoteMarkerPath(remoteConfig?.remoteRoot, repoRoot, marker.path);
    if (!markerPath) {
      results.push({ ...marker, reachable: false, readable: false, writable: false,
        kind_verified: false, path: marker.path, reason: 'repoRoot_outside_root' });
      continue;
    }
    const result = await executeRemoteWorkspaceProbe({
      gateway, remoteConfig, sign, signature, path: markerPath, expect: marker.expect,
      requireWrite: false, requireExecutable: marker.require_executable === true,
      operationPrefix: `source-${marker.expect}`,
    });
    results.push({ ...marker, ...result });
  }
  const failed = results.filter((item) => item.reachable !== true || item.readable !== true || item.kind_verified !== true);
  return {
    status: failed.length === 0 ? 'pass' : 'blocked',
    source_layout_verified: failed.length === 0,
    markers: results,
    missing: failed.map((item) => item.path),
    reason: failed.length === 0 ? null : 'source_layout_markers_missing',
  };
}

function remoteConfiguredPath(remoteRoot, repoRoot, configured, fallback, label) {
  const hasConfiguredPath = configured !== null && configured !== undefined && configured !== '';
  // A missing/invalid repoRoot must become a normal blocked preflight result.
  // Calling posix.join(null, ...) would throw before the operator can see which
  // remote prerequisite is missing.
  if (!hasConfiguredPath && (typeof repoRoot !== 'string' || !posix.isAbsolute(repoRoot))) {
    return {
      path: repoRoot ?? null,
      relative: null,
      reason: 'repo_root_invalid',
    };
  }
  const raw = hasConfiguredPath ? configured : posix.join(repoRoot, fallback);
  const selected = remotePathInsideRoot(remoteRoot, raw, label);
  return selected.reason
    ? { path: selected.path, relative: null, reason: selected.reason }
    : { path: selected.path, relative: selected.relative, reason: null };
}

/**
 * Verify the actual gate bundle on the SSH code host before P0. The remote
 * helper is intentionally allowed to use a deployment-owned bundle under the
 * registered remoteRoot (for example `.dsh/ar-workflow/...`), but the cloud
 * must not infer that the cloud checkout is visible to the SSH host.
 */
async function probeRemoteWorkflowBundle({ gateway, remoteConfig, repoRoot, sign, signature } = {}) {
  const remoteRoot = remoteConfig?.remoteRoot;
  const scripts = remoteConfiguredPath(
    remoteRoot,
    repoRoot,
    remoteConfig?.deliveryScriptsRoot ?? remoteConfig?.delivery_scripts_root,
    'skills/ohos-ar-dev-phases/scripts',
    'deliveryScriptsRoot',
  );
  const bridge = remoteConfiguredPath(
    remoteRoot,
    repoRoot,
    remoteConfig?.deliveryBridgePath ?? remoteConfig?.delivery_bridge_path,
    DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH,
    'deliveryBridgePath',
  );
  const files = {};
  let scriptsRoot = { status: 'blocked', reason: scripts.reason ?? 'delivery_scripts_root_invalid' };
  if (!scripts.reason) {
    scriptsRoot = await executeRemoteWorkspaceProbe({
      gateway, remoteConfig, sign, signature, path: scripts.relative,
      expect: 'directory', requireWrite: false, operationPrefix: 'delivery-scripts',
    });
  }
  for (const name of REQUIRED_AR_GATE_SCRIPTS) {
    if (scripts.reason) {
      files[name] = { status: 'blocked', path: null, reason: scripts.reason };
      continue;
    }
    const result = await executeRemoteWorkspaceProbe({
      gateway, remoteConfig, sign, signature,
      path: posix.join(scripts.relative, name), expect: 'file',
      requireWrite: false, operationPrefix: `delivery-${name.replaceAll('.', '-')}`,
    });
    files[name] = {
      ...result,
      status: result.reachable === true && result.readable === true && result.kind_verified === true ? 'pass' : 'blocked',
    };
  }
  const profilePath = scripts.relative ? posix.join(scripts.relative, 'lib/environments.py') : null;
  const profile = scripts.reason ? { status: 'blocked', path: null, reason: scripts.reason }
    : await executeRemoteWorkspaceProbe({
      gateway, remoteConfig, sign, signature, path: profilePath,
      expect: 'file', requireWrite: false, operationPrefix: 'delivery-environment-profile',
    });
  const bridgeResult = bridge.reason ? { status: 'blocked', path: null, reason: bridge.reason }
    : await executeRemoteWorkspaceProbe({
      gateway, remoteConfig, sign, signature, path: bridge.relative,
      expect: 'file', requireWrite: false, operationPrefix: 'delivery-bridge',
    });
  const missing = Object.entries(files).filter(([, result]) => result.status !== 'pass').map(([name]) => name);
  const scriptsReady = scriptsRoot.reachable === true && scriptsRoot.readable === true
    && missing.length === 0;
  return {
    scripts: scriptsReady,
    profiles: scriptsReady && profile.reachable === true && profile.readable === true && profile.kind_verified === true,
    bridge: bridgeResult.reachable === true && bridgeResult.readable === true && bridgeResult.kind_verified === true,
    scripts_root: scripts.path,
    bridge_path: bridge.path,
    scripts_root_probe: { ...scriptsRoot, status: scriptsReady ? 'pass' : 'blocked' },
    files,
    profile: { ...profile, status: profile.reachable === true && profile.readable === true && profile.kind_verified === true ? 'pass' : 'blocked' },
    bridge_probe: { ...bridgeResult, status: bridgeResult.reachable === true && bridgeResult.readable === true && bridgeResult.kind_verified === true ? 'pass' : 'blocked' },
    required: [...REQUIRED_AR_GATE_SCRIPTS],
    missing,
    reason: scriptsReady && profile.reachable === true && profile.readable === true && profile.kind_verified === true
      && bridgeResult.reachable === true && bridgeResult.readable === true && bridgeResult.kind_verified === true
      ? null : 'remote_delivery_bundle_missing',
  };
}

/**
 * Build the operator-facing preflight callback mounted at
 * `/api/ohos-ar/preflight`.  It deliberately separates a P0 dispatch check
 * from the prerequisites that are only exercised by P4/P6/P8, so an operator
 * can see why a run may start while still being unable to complete.
 */
export function createDeliveryPreflight({
  config = {},
  remoteConfig = null,
  remoteGateway = null,
  remoteSigner = null,
  remoteSignature = null,
  connector = null,
  connectorWorkspaceId = null,
  codeAgents,
  debug = null,
  defaultRepoRoot = null,
} = {}) {
  return async ({ environment = null, componentType = null, deviceType = null, deviceSerial = null,
    publication = null, agent = null, model = null, repoRoot = null, arPath = null, arText = null } = {}) => {
    const catalog = codeAgents?.snapshot ? await codeAgents.snapshot() : {};
    const requestedAgent = typeof agent === 'string' && agent.trim() !== '' ? agent.trim() : null;
    const configuredAgent = requestedAgent
      ? (catalog.options?.find((item) => item.id === requestedAgent) ?? {
          id: requestedAgent,
          name: requestedAgent,
          available: false,
          dispatchable: false,
          execution_mode: null,
          status: 'not_configured',
          reason: 'requested CodeAgent is not present in the catalog',
        })
      : catalog.selected_config ?? catalog.options?.find((item) => item.id === catalog.selected) ?? null;
    const selected = configuredAgent && model
      ? { ...configuredAgent, model }
      : configuredAgent;
    const configuredProfile = config.environmentProfile ?? remoteConfig?.environmentProfile ?? null;
    const configuredProfileDigest = config.environmentProfileDigest
      ?? config.environment_profile_digest
      ?? configuredProfile?.profile_digest
      ?? remoteConfig?.environmentProfileDigest
      ?? remoteConfig?.environment_profile_digest
      ?? null;
    const configuredProfileEnvironment = config.environmentProfileEnvironment
      ?? config.environment_profile_environment
      ?? configuredProfile?.environment
      ?? remoteConfig?.environmentProfileEnvironment
      ?? remoteConfig?.environment_profile_environment
      ?? null;
    const configuredProfileComponent = config.environmentProfileComponentType
      ?? config.environment_profile_component_type
      ?? configuredProfile?.component_type
      ?? remoteConfig?.environmentProfileComponentType
      ?? remoteConfig?.environment_profile_component_type
      ?? remoteConfig?.environmentProfile?.component_type
      ?? null;
    const configuredSourceMarkers = config.sourceLayoutMarkers
      ?? config.source_layout_markers
      ?? configuredProfile?.root_markers
      ?? configuredProfile?.source_layout_markers
      ?? remoteConfig?.sourceLayoutMarkers
      ?? remoteConfig?.source_layout_markers
      ?? remoteConfig?.environmentProfile?.root_markers
      ?? null;
    const sourceLayoutVerified = config.sourceLayoutVerified === true
      || config.source_layout_verified === true
      || remoteConfig?.sourceLayoutVerified === true
      || remoteConfig?.source_layout_verified === true;
    const profileBranchMatches = environment === 'harmonyos'
      ? configuredProfileComponent === componentType
      : !configuredProfileComponent;
    const selectedEnvironment = {
      selected: environment,
      component_type: environment === 'harmonyos' ? componentType : null,
      device_type: environment === 'harmonyos' ? deviceType : null,
      // A digest without the requested environment is not a binding. This
      // keeps an OpenHarmony profile from being silently reused for the
      // HarmonyOS system/chip branches.
      profile_bound: Boolean(environment && configuredProfileDigest
        && configuredProfileEnvironment === environment && profileBranchMatches),
      profile_digest: configuredProfileDigest,
      profile_environment: configuredProfileEnvironment,
      profile_component_type: configuredProfileComponent,
      source_layout_markers: Array.isArray(configuredSourceMarkers) ? configuredSourceMarkers : null,
      source_layout_verified: sourceLayoutVerified,
    };
    const requestedPublication = publication ?? config.publication ?? null;
    if (!remoteGateway && connector) {
      const connectorStatus = await connectorWorkspaceStatus(connector, connectorWorkspaceId, { probe: true });
      return evaluatePrerequisites({
        workspaceMode: 'local_connector',
        repoRoot: remoteConfig?.remoteRoot ?? null,
        remoteRoot: remoteConfig?.remoteRoot ?? null,
        workspace: { configured: Boolean(remoteConfig?.remoteRoot), reachable: false, writable: false, path: remoteConfig?.remoteRoot ?? null },
        transport: { configured: false, reachable: false, reason: 'workspace_gateway_required_for_remote_gates' },
        connector: {
          ...connectorStatus,
        },
        runtime: { node: { status: 'pass', version: process.versions.node }, python: { status: 'blocked', reason: 'workspace_gateway_required_for_remote_gates' }, git: { status: 'blocked', reason: 'workspace_gateway_required_for_remote_gates' } },
        workflow: { scripts: false, profiles: false, bridge: false, required: [...REQUIRED_AR_GATE_SCRIPTS], missing: [...REQUIRED_AR_GATE_SCRIPTS], reason: 'workspace_gateway_required_for_remote_gates' },
        agent: selected,
        environment: selectedEnvironment,
        device: { configured: Boolean(deviceSerial || deviceType), reachable: false, serial: deviceSerial ?? null },
        publication: { configured: publicationConfigured(requestedPublication), authenticated: false, backend: requestedPublication?.backend ?? null, target: publicationTarget(requestedPublication) },
        arInput: { status: 'blocked', source: null, path: null, reason: 'workspace_gateway_required_for_remote_gates' },
      });
    }
    if (!remoteGateway) {
      let debugSnapshot = null;
      try { debugSnapshot = debug?.status ? await debug.status() : null; } catch (error) {
        debugSnapshot = { device_probe: { status: 'probe_failed', reason: error?.message ?? String(error) } };
      }
      const targetDevice = debugSnapshot?.device_probe ?? {};
      return probeLocalPrerequisites({
        repoRoot: repoRoot ?? config.repoRoot ?? config.workspaceRoot ?? defaultRepoRoot,
        deliveryScriptsRoot: config.deliveryScriptsRoot,
        deliveryBridgePath: config.deliveryBridgePath,
        pythonCommand: config.pythonCommand ?? 'python3',
        gitCommand: config.gitCommand ?? 'git',
        hdcCommand: config.hdcCommand
          ?? config.hdc_command
          ?? config.codeAgentEnv?.DSH_HDC_CLI
          ?? 'hdc',
        agent: selected,
        environment: selectedEnvironment,
        device: {
          configured: Boolean(deviceSerial || deviceType || config.deviceAccess === true),
          reachable: targetDevice.status === 'available',
          serial: deviceSerial ?? null,
        },
        publication: {
          configured: publicationConfigured(requestedPublication),
          authenticated: config.networkPublish === true,
          backend: requestedPublication?.backend ?? null,
          target: publicationTarget(requestedPublication),
        },
        arPath: arPath ?? (!arText ? (config.defaultArPath ?? null) : null),
        arText,
        env: config.codeAgentEnv ?? process.env,
      });
    }

    const selectedRemote = remotePathInsideRoot(remoteConfig?.remoteRoot, repoRoot, 'repoRoot');
    const selectedRemoteRoot = selectedRemote.reason ? null : selectedRemote.path;
    const health = await gatewayHealth(remoteGateway);
    const workspaceProbe = health.reachable
      ? await probeRemoteWorkspace({
          gateway: remoteGateway,
          remoteConfig,
          repoRoot: selectedRemoteRoot,
          sign: remoteSigner,
          signature: remoteSignature ?? remoteConfig?.signature ?? null,
        })
      : { reachable: false, readable: false, writable: false, reason: health.reason ?? 'gateway_unreachable' };
    const sourceLayout = health.reachable && selectedRemoteRoot
      ? await probeRemoteSourceLayout({
          gateway: remoteGateway,
          remoteConfig,
          repoRoot: selectedRemoteRoot,
          sign: remoteSigner,
          signature: remoteSignature ?? remoteConfig?.signature ?? null,
          environment,
          componentType,
          sourceLayoutMarkers: selectedEnvironment.source_layout_markers,
        })
      : { status: 'blocked', source_layout_verified: false, markers: [], reason: selectedRemote.reason ?? 'gateway_unreachable' };
    let remoteArInput = null;
    // A local sample path belongs to the DSH host and must never be guessed on
    // an SSH code host.  Remote runs may use a default only when the Gateway
    // profile explicitly declares one; otherwise the operator must provide a
    // file under the selected remote repo root or inline AR text.
    const effectiveArPath = arPath ?? (!arText
      ? (remoteConfig?.defaultArPath ?? remoteConfig?.default_ar_path ?? null)
      : null);
    if (typeof arText === 'string' && arText.trim() !== '') {
      remoteArInput = {
        status: 'pass', source: 'inline', bytes: Buffer.byteLength(arText, 'utf8'), path: null, reason: null,
      };
    } else if (typeof effectiveArPath === 'string' && effectiveArPath.trim() !== '') {
      const rawPath = effectiveArPath.trim();
      const root = selectedRemoteRoot;
      const absolutePath = root
        ? (posix.isAbsolute(rawPath) ? posix.normalize(rawPath) : posix.join(root, rawPath))
        : null;
      const prefix = root === '/' ? '/' : `${root}/`;
      if (!root) {
        remoteArInput = { status: 'blocked', source: 'file', path: absolutePath, reason: selectedRemote.reason ?? 'repo_root_unconfigured' };
      } else if (absolutePath !== root && !absolutePath.startsWith(prefix)) {
        remoteArInput = { status: 'blocked', source: 'file', path: absolutePath, reason: 'ar_input_outside_repo_root' };
      } else {
        const probe = await executeRemoteWorkspaceProbe({
          gateway: remoteGateway,
          remoteConfig,
          sign: remoteSigner,
          signature: remoteSignature ?? remoteConfig?.signature ?? null,
          path: absolutePath === root ? '.' : posix.relative(root, absolutePath),
          expect: 'file',
          requireWrite: false,
          operationPrefix: 'ar-input',
        });
        remoteArInput = {
          status: probe.reachable === true && probe.readable === true && probe.kind_verified === true ? 'pass' : 'blocked',
          source: 'file', path: absolutePath, reason: probe.reason ?? null,
          kind_verified: probe.kind_verified === true,
        };
      }
    } else {
      remoteArInput = { status: 'blocked', source: null, path: null, reason: 'ar_input_required' };
    }
    let debugSnapshot = null;
    try { debugSnapshot = debug?.status ? await debug.status() : null; } catch (error) {
      debugSnapshot = { device_probe: { status: 'probe_failed', reason: error?.message ?? String(error) } };
    }
    const targetDevice = debugSnapshot?.device_probe ?? {};
    const deliveryProfileNames = ['init', 'inspect', 'validate', 'advance', 'consent', 'failureSnapshot'];
    const deliveryProfilesConfigured = deliveryProfileNames.every((name) => {
      const value = remoteConfig?.deliveryProfiles?.[name] ?? remoteConfig?.profileByOperation?.[name];
      return typeof value === 'string' && value.trim() !== '';
    });
    const workflowBundle = deliveryProfilesConfigured
      ? await probeRemoteWorkflowBundle({
          gateway: remoteGateway,
          remoteConfig,
          repoRoot: selectedRemoteRoot ?? remoteConfig.remoteRoot,
          sign: remoteSigner,
          signature: remoteSignature ?? remoteConfig?.signature ?? null,
        })
      : {
          scripts: false, profiles: false, bridge: false, required: [...REQUIRED_AR_GATE_SCRIPTS],
          missing: [...REQUIRED_AR_GATE_SCRIPTS], reason: 'delivery_profiles_unconfigured',
        };
    const pythonStatus = deliveryProfilesConfigured && workflowBundle.scripts && workflowBundle.profiles && workflowBundle.bridge
      ? 'pass' : 'blocked';
    const connectorStatus = await connectorWorkspaceStatus(connector, connectorWorkspaceId, { probe: Boolean(connector) });
    return evaluatePrerequisites({
      workspaceMode: connector ? 'local_connector' : 'workspace_gateway',
      remoteRoot: remoteConfig.remoteRoot,
      repoRoot: selectedRemoteRoot ?? repoRoot ?? null,
      workspace: {
        configured: true,
        reachable: health.reachable && workspaceProbe.reachable,
        writable: health.reachable && workspaceProbe.writable,
        path: selectedRemoteRoot ?? repoRoot ?? remoteConfig.remoteRoot,
      },
      transport: {
        ...health,
        reachable: health.reachable && workspaceProbe.reachable,
        workspace_probe: workspaceProbe,
      },
      connector: connectorStatus,
      runtime: {
        node: { status: 'pass', version: process.versions.node, source: 'dsh_host' },
        python: { status: pythonStatus, reason: deliveryProfilesConfigured ? null : 'delivery_profiles_unconfigured' },
        git: { status: deliveryProfilesConfigured ? 'pass' : 'blocked', reason: deliveryProfilesConfigured ? null : 'delivery_profiles_unconfigured' },
      },
      workflow: {
        ...workflowBundle,
        scripts: deliveryProfilesConfigured && workflowBundle.scripts,
        profiles: deliveryProfilesConfigured && workflowBundle.profiles,
        bridge: deliveryProfilesConfigured && workflowBundle.bridge,
        source_layout: sourceLayout,
      },
      agent: selected,
      environment: selectedEnvironment,
      device: {
        configured: Boolean(deviceSerial || deviceType || remoteConfig.deviceProfile),
        reachable: targetDevice.status === 'available',
        serial: deviceSerial ?? null,
      },
      publication: {
        configured: publicationConfigured(requestedPublication),
        authenticated: remoteConfig.networkPublish === true,
        backend: requestedPublication?.backend ?? null,
        target: publicationTarget(requestedPublication),
      },
      arInput: remoteArInput,
    });
  };
}

/**
 * Adapt a remote Gateway read-only inspect response to the same snapshot
 * contract used by the local ProcessSupervisor. The cloud never receives
 * remote argv or output; the code host performs the redaction.
 */
export function createRemoteProcessSupervisorView({
  gateway,
  authorityContext = {},
  signature = null,
  sign = null,
} = {}) {
  if (!gateway || typeof gateway.execute !== 'function') throw new TypeError('gateway.execute is required');
  if (!authorityContext || typeof authorityContext !== 'object' || Array.isArray(authorityContext)) {
    throw new TypeError('authorityContext must be an object');
  }
  if (signature !== null && (!signature || typeof signature !== 'object')) throw new TypeError('signature must be an object');
  if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
  return {
    durable: true,
    async snapshot({ operationId = null, runId = null, limit = 200 } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) {
        throw Object.assign(new Error('limit must be between 1 and 2000'), { code: 'supervisor_input_invalid' });
      }
      const payload = {
        include_processes: true,
        process_limit: limit,
        ...(operationId ? { process_operation_id: operationId } : {}),
        ...(runId ? { process_run_id: runId } : {}),
      };
      try {
        const fields = {
          ...authorityContext,
          message_type: 'authority.inspect',
          operation_id: 'authority-inspect-' + randomUUID(),
          nonce: randomUUID(),
          sent_at: new Date().toISOString(),
          payload,
        };
        const unsigned = createAuthorityEnvelope(fields);
        const detached = sign ? await sign(unsigned) : signature;
        if (!detached || typeof detached !== 'object') {
          return unavailableProcessSnapshot('remote Gateway signature is not configured');
        }
        const response = await gateway.execute(createAuthorityEnvelope({ ...fields, signature: detached }));
        const snapshot = response?.supervisor;
        if (!snapshot || typeof snapshot !== 'object') {
          return unavailableProcessSnapshot('remote Gateway did not return a supervisor snapshot');
        }
        return snapshot;
      } catch (error) {
        return unavailableProcessSnapshot(error?.message ?? error);
      }
    },
  };
}

export function apply(ctx, config = {}) {
  const controllerPromise = AdaptiveWorkflowController.create({
    workspaceRoot: config.workspaceRoot,
    stateDir: config.stateDir,
    registryFile: config.registryFile,
    strategiesFile: config.strategiesFile,
    python: config.python,
  });

  for (const spec of createToolCatalog({
    developmentStatus: async (...args) => (await controllerPromise).developmentStatus(...args),
    developmentNext: async (...args) => (await controllerPromise).developmentNext(...args),
    developmentGate: async (...args) => (await controllerPromise).developmentGate(...args),
    developmentAdvance: async (...args) => (await controllerPromise).developmentAdvance(...args),
    developmentConsent: async (...args) => (await controllerPromise).developmentConsent(...args),
    developmentVerify: async (...args) => (await controllerPromise).developmentVerify(...args),
    evolutionProposals: async (...args) => (await controllerPromise).evolutionProposals(...args),
    resolveModules: async (...args) => (await controllerPromise).resolveModules(...args),
    requirements: {
      start: async (...args) => (await controllerPromise).requirements.start(...args),
      status: async (...args) => (await controllerPromise).requirements.status(...args),
      next: async (...args) => (await controllerPromise).requirements.next(...args),
      submit: async (...args) => (await controllerPromise).requirements.submit(...args),
    },
  })) {
    ctx.tools.register(defineTool({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        return await spec.execute(args);
      },
    }));
  }
  if (config.enableDeliveryRuntime === true) {
    const localConnectorConfig = config.localConnector && typeof config.localConnector === 'object'
      ? config.localConnector : null;
    const localConnectorEnabled = localConnectorConfig?.enabled === true;
    const localCodeAgentExecutor = new LocalCodeAgentExecutor({
      timeoutMs: config.codeAgentTimeoutMs,
      maxOutputBytes: config.codeAgentMaxOutputBytes,
      env: config.codeAgentEnv ?? process.env,
    });
    const remoteConfig = config.workspaceGateway;
    const remoteProfiles = remoteConfig && typeof remoteConfig.profiles === 'object'
      ? { ...remoteConfig.profiles }
      : {};
    if (remoteConfig && typeof remoteConfig.profileByAdapter === 'object') {
      Object.assign(remoteProfiles, remoteConfig.profileByAdapter);
    }
    const remoteGateway = remoteConfig?.enabled === true
      ? (remoteConfig.client ?? new WorkspaceGatewayClient({
          baseUrl: remoteConfig.baseUrl,
          headers: (() => {
            const headers = resolveGatewayHeaders(remoteConfig.headers, config.codeAgentEnv ?? process.env);
            const hasAuthorization = Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
            const bearer = config.codeAgentEnv?.DSH_GATEWAY_BEARER_TOKEN ?? process.env.DSH_GATEWAY_BEARER_TOKEN;
            if (!hasAuthorization && bearer) headers.authorization = `Bearer ${bearer}`;
            return headers;
          })(),
          timeoutMs: remoteConfig.timeoutMs,
        }))
      : null;
    // Remote adapters all sign the same Authority envelope contract. Resolve
    // the tenant/workspace binding once during plugin startup so a malformed
    // cloud patch cannot leave the Web page healthy while every AR operation
    // fails later at the Gateway boundary.
    const remoteAuthorityContext = remoteGateway
      ? resolveRemoteAuthorityContext({ remoteConfig, config, env: config.codeAgentEnv ?? process.env })
      : null;
    const effectiveRemoteConfig = remoteGateway
      ? { ...remoteConfig, authorityContext: remoteAuthorityContext }
      : remoteConfig;
    const connectorWorkspaceId = localConnectorConfig?.workspaceId
      ?? localConnectorConfig?.workspace_id
      ?? remoteAuthorityContext?.workspace_id
      ?? config.workspaceId
      ?? null;
    const connectorRemoteRoot = localConnectorConfig?.remoteRoot
      ?? localConnectorConfig?.remote_root
      ?? remoteConfig?.remoteRoot
      ?? null;
    const remoteWorkspaceId = remoteAuthorityContext?.workspace_id ?? null;
    if (remoteWorkspaceId && connectorWorkspaceId && remoteWorkspaceId !== connectorWorkspaceId) {
      throw Object.assign(new Error('local Connector and Workspace Gateway must use the same workspace_id'), {
        code: 'connector_workspace_binding_mismatch',
        details: { connector_workspace_id: connectorWorkspaceId, gateway_workspace_id: remoteWorkspaceId },
      });
    }
    if (remoteConfig?.remoteRoot && connectorRemoteRoot
        && posix.normalize(remoteConfig.remoteRoot) !== posix.normalize(connectorRemoteRoot)) {
      throw Object.assign(new Error('local Connector and Workspace Gateway must use the same remoteRoot'), {
        code: 'connector_remote_root_mismatch',
        details: { connector_remote_root: connectorRemoteRoot, gateway_remote_root: remoteConfig.remoteRoot },
      });
    }
    let connectorTransport = localConnectorEnabled
      ? (localConnectorConfig.hub ?? localConnectorConfig.transport ?? localConnectorConfig.client ?? null)
      : null;
    let connectorHub = connectorTransport?.request ? connectorTransport : null;
    if (localConnectorEnabled && !connectorHub) {
      const connectorPairingRegistry = createConnectorPairingRegistry(localConnectorConfig);
      const connectorAuthToken = resolveSecretReference(localConnectorConfig.authToken ?? localConnectorConfig.token,
        config.codeAgentEnv ?? process.env)
        ?? config.codeAgentEnv?.DSH_CONNECTOR_TOKEN ?? process.env.DSH_CONNECTOR_TOKEN ?? null;
      if (!connectorAuthToken && typeof localConnectorConfig.authorize !== 'function' && !connectorPairingRegistry) {
        throw Object.assign(new Error('local Connector authToken or authorize hook is required'), {
          code: 'connector_auth_unconfigured',
        });
      }
      const connectorOutboxFilePath = localConnectorConfig.outboxFilePath
        ?? localConnectorConfig.outbox_file_path
        ?? config.codeAgentEnv?.DSH_CONNECTOR_OUTBOX_FILE
        ?? process.env.DSH_CONNECTOR_OUTBOX_FILE
        ?? null;
      connectorHub = new ConnectorWebSocketHub({
        authToken: connectorAuthToken,
        workspaceId: connectorWorkspaceId,
        deviceId: localConnectorConfig.deviceId ?? localConnectorConfig.device_id ?? null,
        authorize: localConnectorConfig.authorize ?? null,
        allowedOrigins: localConnectorConfig.allowedOrigins ?? localConnectorConfig.allowed_origins ?? null,
        requireTls: localConnectorConfig.requireTls ?? localConnectorConfig.require_tls ?? false,
        requireClientCertificate: localConnectorConfig.requireClientCertificate
          ?? localConnectorConfig.require_client_certificate ?? false,
        certificateFingerprints: localConnectorConfig.certificateFingerprints
          ?? localConnectorConfig.certificate_fingerprints ?? null,
        pairingRegistry: connectorPairingRegistry,
        audit: typeof localConnectorConfig.audit === 'function' ? localConnectorConfig.audit : null,
        replayPending: localConnectorConfig.replayPending ?? localConnectorConfig.replay_pending
          ?? Boolean(connectorOutboxFilePath),
        maxReplayPending: localConnectorConfig.maxReplayPending ?? localConnectorConfig.max_replay_pending ?? 1024,
        outboxFilePath: connectorOutboxFilePath,
        outboxRetentionMs: localConnectorConfig.outboxRetentionMs
          ?? localConnectorConfig.outbox_retention_ms ?? undefined,
        outboxMaxBytes: localConnectorConfig.outboxMaxBytes
          ?? localConnectorConfig.outbox_max_bytes ?? undefined,
        requestTimeoutMs: localConnectorConfig.requestTimeoutMs ?? config.codeAgentTimeoutMs ?? undefined,
        heartbeatMs: localConnectorConfig.heartbeatMs ?? 30_000,
      });
      connectorTransport = connectorHub;
    }
    let remoteSigner = remoteConfig?.sign ?? null;
    if (!remoteSigner && remoteGateway) {
      const secretEnv = remoteConfig.signatureSecretEnv ?? 'DSH_AUTHORITY_SHARED_SECRET';
      const secret = remoteConfig.signatureSecret
        ?? config.codeAgentEnv?.[secretEnv]
        ?? process.env[secretEnv];
      if (secret) {
        remoteSigner = createHmacSigner({
          secret,
          keyId: remoteConfig.signatureKeyId ?? remoteConfig.keyId ?? 'dsh-cloud',
        });
      }
    }
    const codeAgentExecutor = connectorHub
      ? new ConnectorCodeAgentExecutor({
          connector: connectorHub,
          workspaceId: connectorWorkspaceId,
          remoteRoot: connectorRemoteRoot ?? remoteConfig?.remoteRoot,
          timeoutMs: config.codeAgentTimeoutMs,
          requestTimeoutMs: localConnectorConfig?.requestTimeoutMs ?? config.codeAgentTimeoutMs,
        })
      : remoteGateway
      ? new RemoteCodeAgentExecutor({
          gateway: remoteGateway,
          remoteRoot: remoteConfig.remoteRoot,
          authorityContext: remoteAuthorityContext,
          signature: remoteConfig.signature,
          sign: remoteSigner,
          profileByAdapter: Object.keys(remoteProfiles).length > 0 ? remoteProfiles : undefined,
        })
      : localCodeAgentExecutor;
    const remoteDeliveryAdapter = remoteGateway
      ? new RemotePythonDeliveryAdapter({
          gateway: remoteGateway,
          remoteRoot: remoteConfig.remoteRoot,
          authorityContext: remoteAuthorityContext,
          signature: remoteConfig.signature,
          sign: remoteSigner,
          profiles: remoteConfig.deliveryProfiles ?? remoteConfig.profileByOperation,
          scriptsRoot: remoteConfig.deliveryScriptsRoot ?? remoteConfig.delivery_scripts_root ?? null,
          bridgePath: remoteConfig.deliveryBridgePath ?? remoteConfig.delivery_bridge_path ?? null,
        })
      : null;
    const deliveryAdapter = remoteDeliveryAdapter;
    const capabilityRoot = remoteGateway
      ? remoteConfig.remoteRoot
      : (config.repoRoot ?? config.workspaceRoot);
    const capabilityProbe = probeHostCapabilities({
      repoRoot: capabilityRoot,
      executor: codeAgentExecutor,
      env: config.codeAgentEnv ?? process.env,
      buildExecution: config.buildExecution,
      deviceAccess: config.deviceAccess,
      networkPublish: config.networkPublish,
      hdcCommand: config.hdcCommand,
      gitCommand: config.gitCommand,
    });
    if (remoteGateway) {
      const configured = remoteConfig.capabilities && typeof remoteConfig.capabilities === 'object'
        ? remoteConfig.capabilities : {};
      const remoteBaseCapabilities = [
        'native_subagent', 'isolated_context', 'workspace_write',
        'model_observable', 'usage_observable', 'cancel_observable', 'background_execution',
      ];
      for (const key of remoteBaseCapabilities) {
        capabilityProbe.capabilities[key] = configured[key] !== false;
      }
      for (const key of ['build_execution', 'device_access', 'network_publish']) {
        capabilityProbe.capabilities[key] = configured[key] === true;
      }
      capabilityProbe.capability_source = 'workspace-gateway-config';
      capabilityProbe.diagnostics = {
        ...capabilityProbe.diagnostics,
        workspace_mode: connectorHub ? 'local_connector' : 'workspace_gateway',
        remote_root: remoteConfig.remoteRoot,
        configured_capabilities: { ...configured },
      };
    }
    if (connectorHub) {
      const configured = localConnectorConfig?.capabilities && typeof localConnectorConfig.capabilities === 'object'
        ? localConnectorConfig.capabilities : {};
      for (const key of ['native_subagent', 'isolated_context', 'workspace_write', 'model_observable', 'usage_observable', 'cancel_observable', 'background_execution']) {
        capabilityProbe.capabilities[key] = configured[key] !== false;
      }
      capabilityProbe.capabilities.build_execution = remoteGateway !== null;
      capabilityProbe.capabilities.device_access = remoteGateway !== null && configured.device_access === true;
      capabilityProbe.capability_source = 'local-connector';
      capabilityProbe.diagnostics = {
        ...capabilityProbe.diagnostics,
        workspace_mode: 'local_connector',
        connector_workspace_id: connectorWorkspaceId,
        remote_root: connectorRemoteRoot,
        configured_capabilities: { ...configured },
      };
    }
    const lazy = createLazyDeliveryService(config, capabilityProbe, deliveryAdapter);
    const remoteRagConfig = remoteConfig?.rag && typeof remoteConfig.rag === 'object'
      ? remoteConfig.rag : {};
    const ragModelAdapter = createConfiguredRagAdapter(config, remoteRagConfig, config.codeAgentEnv ?? process.env);
    const remoteRagEnabled = Boolean(remoteGateway)
      && remoteConfig?.rag !== false
      && remoteConfig?.ragEnabled !== false
      && remoteRagConfig.enabled !== false;
    const rag = config.rag ?? (remoteRagEnabled
      ? new RemoteRagIndex({
          gateway: remoteGateway,
          remoteRoot: remoteConfig.remoteRoot,
          authorityContext: remoteAuthorityContext,
          signature: remoteConfig.signature,
          sign: remoteSigner,
          indexFile: remoteRagConfig.indexFile
            ?? join(config.dataRoot ?? '/tmp/dsh-ohos-official', 'remote-rag-index.json'),
          modelProfile: remoteRagConfig.modelProfile ?? remoteRagConfig.model_profile,
          modelAdapter: ragModelAdapter,
        })
      : !remoteGateway && (config.repoRoot ?? config.workspaceRoot)
        ? new LocalRagIndex({ root: config.repoRoot ?? config.workspaceRoot, modelAdapter: ragModelAdapter })
        : null);
    const debugRoot = remoteGateway ? null : (config.repoRoot ?? config.workspaceRoot);
    const debug = config.debug ?? (remoteGateway
      ? new RemoteDebugSurface({
          gateway: remoteGateway,
          remoteRoot: remoteConfig.remoteRoot,
          authorityContext: remoteAuthorityContext,
          signature: remoteConfig.signature,
          sign: remoteSigner,
          deviceProfile: remoteConfig.deviceProfile ?? remoteConfig.debug?.deviceProfile,
        })
      : debugRoot
        ? { status: () => probeDebugSurface(debugRoot), scan: () => probeDebugSurface(debugRoot) }
        : null);
    let localProcessSupervisor = null;
    const remoteProcessSupervisor = remoteGateway
      ? createRemoteProcessSupervisorView({
          gateway: remoteGateway,
          authorityContext: remoteAuthorityContext,
          signature: remoteConfig.signature,
          sign: remoteSigner,
        })
      : null;
    for (const definition of createDeliveryRuntimeTools({ ...config, service: lazy.proxy, rag })) {
      ctx.tools.register(definition);
    }
    if (typeof ctx.inject === 'function') {
      ctx.inject(['webServer', 'connection', 'subagents', 'agents', 'agentDefaultModel'], (webCtx) => {
        const codeAgents = new CodeAgentRegistry({
          dataRoot: config.dataRoot,
          subagents: webCtx.subagents,
          env: config.codeAgentEnv ?? process.env,
          remoteProfiles: remoteConfig?.enabled === true ? remoteProfiles : null,
          connector: connectorHub,
          connectorWorkspaceId,
        });
        if (codeAgentExecutor === localCodeAgentExecutor) {
          codeAgentExecutor.providerRunner = createOfficialProviderRunner({
            subagents: webCtx.subagents,
            agents: webCtx.agents,
            agentDefaultModel: webCtx.agentDefaultModel,
          });
          const attachment = attachLocalProcessSupervisor(localCodeAgentExecutor, lazy.get(), {
            ...(Number.isSafeInteger(config.codeAgentMaxOutputBytes)
              ? { maxOutputBytes: config.codeAgentMaxOutputBytes } : {}),
            ...(Number.isSafeInteger(config.codeAgentTimeoutMs)
              ? { defaultTimeoutMs: config.codeAgentTimeoutMs } : {}),
            cgroupOptions: {
              ...cgroupOptionsFromEnv(config.codeAgentEnv ?? process.env),
              ...(config.processSupervisorOptions && typeof config.processSupervisorOptions === 'object'
                ? config.processSupervisorOptions : {}),
            },
          });
          localProcessSupervisor = attachment.supervisor;
        }
        const scheduler = new ArDeliveryScheduler({
          service: lazy.proxy,
          resolveAgent: (id, model) => codeAgents.resolveSelected(id, {
            requireDispatchable: true,
            ...(model ? { model } : {}),
          }),
          executor: codeAgentExecutor,
          heartbeatIntervalMs: config.schedulerHeartbeatIntervalMs,
          maxSteps: config.schedulerMaxSteps,
        });
        const preflight = createDeliveryPreflight({
          config,
          remoteConfig: effectiveRemoteConfig,
          remoteGateway,
          remoteSigner,
          remoteSignature: remoteConfig?.signature ?? null,
          connector: connectorHub,
          connectorWorkspaceId,
          codeAgents,
          debug,
          defaultRepoRoot: config.repoRoot ?? config.workspaceRoot ?? null,
        });
        const register = () => registerDeliveryWebRoutes(webCtx, {
          service: lazy.proxy,
          scheduler,
          connection: webCtx.connection,
          subagents: webCtx.subagents,
          codeAgents,
          repoRoot: config.repoRoot,
          defaultArPath: config.defaultArPath,
          remoteDefaultArPath: remoteGateway
            ? (remoteConfig.defaultArPath ?? remoteConfig.default_ar_path ?? null)
            : null,
          workspaceId: config.workspaceId,
          workflowId: config.workflowId,
          remoteRoot: remoteGateway ? remoteConfig.remoteRoot : connectorHub ? connectorRemoteRoot : null,
          remoteMode: Boolean(remoteGateway || connectorHub),
          connector: connectorHub,
          connectorWorkspaceId,
          workspaceGateway: remoteGateway ? { enabled: true, base_url: remoteConfig.baseUrl ?? null } : { enabled: false },
          processSupervisor: localProcessSupervisor ?? remoteProcessSupervisor,
          rag,
          debug,
          preflight,
        });
        if (connectorHub?.handleUpgrade && typeof webCtx.webServer?.registerUpgrade === 'function') {
          const path = localConnectorConfig?.path ?? '/v1/connect';
          const disposeUpgrade = webCtx.webServer.registerUpgrade({ path, handler: (req, socket, head) => connectorHub.handleUpgrade(req, socket, head) });
          if (typeof webCtx.effect === 'function') webCtx.effect(() => disposeUpgrade, 'ai-ar: local Connector WebSocket transport cleanup');
        }
        if (typeof webCtx.effect === 'function') {
          webCtx.effect(register, 'ai-ar: official DSH delivery routes');
          webCtx.effect(() => () => {
            scheduler.close();
            lazy.close();
          }, 'ai-ar: delivery runtime cleanup');
        } else {
          register();
        }
      });
    }
  }
}
