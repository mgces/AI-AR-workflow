import { createHash, randomUUID } from 'node:crypto';
import { realpath, readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createRuntime } from '../../../../runtime/dsh-ohos/src/runtime.js';

const MAX_ARTIFACTS = 500;
const MAX_ARTIFACT_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_BYTES = 512 * 1024;
const MAX_HUMAN_INPUT_BYTES = 256 * 1024;
const MAX_FAILURE_CODE_LENGTH = 128;
const MAX_FAILURE_MESSAGE_BYTES = 4096;
const MAX_FAILURE_DETAILS_BYTES = 16 * 1024;
const TEXT_ARTIFACT_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx', '.gn', '.gni',
  '.json', '.jsonl', '.md', '.txt', '.log', '.patch', '.diff', '.py', '.sh',
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.ets', '.idl', '.xml', '.yaml', '.yml',
  '.toml', '.ini',
]);
const DEFAULT_HOST_CAPABILITIES = Object.freeze({
  mcp_tools: true,
  native_subagent: false,
  isolated_context: false,
  workspace_write: false,
  build_execution: false,
  device_access: false,
  network_publish: false,
  model_observable: false,
  usage_observable: false,
  cancel_observable: false,
  background_execution: false,
});
const HOST_KINDS = new Set(['codex', 'claude-code', 'cursor', 'trae', 'other']);

export function normalizeHostKind(value) {
  return HOST_KINDS.has(value) ? value : 'other';
}

function now() {
  return new Date().toISOString();
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function id(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function operationKey(prefix, value) {
  return `${prefix}-${sha256(JSON.stringify(value)).slice(0, 32)}`;
}

function hostRegistrationKey({ bindingId, hostKind, hostVersion, executionMode, capabilities, capabilitySource }) {
  // Host registration is an upsert, but the controller quite correctly rejects
  // reusing an idempotency key with a different payload.  A fixed key therefore
  // made a restarted DSH process fail as soon as a capability probe or version
  // changed.  Bind the key to the complete public registration payload so a
  // restart replays unchanged state and refreshes changed state safely.
  const canonical = {
    binding_id: bindingId,
    host_kind: hostKind,
    host_version: hostVersion ?? null,
    execution_mode: executionMode,
    capabilities: Object.fromEntries(Object.entries(capabilities ?? {}).sort(([left], [right]) => left.localeCompare(right))),
    capability_source: capabilitySource,
  };
  return `host-register-${sha256(JSON.stringify(canonical)).slice(0, 48)}`;
}

function duration(start, end = now()) {
  const first = Date.parse(start);
  const last = Date.parse(end);
  return Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, last - first) : null;
}

function timestampMs(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function interval(start, end) {
  const first = timestampMs(start);
  const last = timestampMs(end);
  if (first === null || last === null || last < first) return null;
  return { start: first, end: last };
}

function mergeIntervals(intervals) {
  const sorted = intervals.filter(Boolean)
    .map((item) => ({ start: item.start, end: item.end }))
    .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end >= item.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged = [];
  for (const current of sorted) {
    const previous = merged.at(-1);
    if (previous && current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function intersectIntervals(left, right) {
  const intersections = [];
  for (const first of mergeIntervals(left)) {
    for (const second of mergeIntervals(right)) {
      const start = Math.max(first.start, second.start);
      const end = Math.min(first.end, second.end);
      if (end >= start) intersections.push({ start, end });
    }
  }
  return mergeIntervals(intersections);
}

function intervalsDuration(intervals) {
  return mergeIntervals(intervals).reduce((total, item) => total + item.end - item.start, 0);
}

function phaseNumber(value) {
  const match = /^P(\d+)/u.exec(String(value ?? ''));
  return match ? Number(match[1]) : null;
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function errorFromTool(tool, response) {
  const payload = response.error ?? response;
  const error = new Error(payload.message || `${tool} failed`);
  error.code = payload.code || 'runtime_tool_failed';
  error.details = payload.details || {};
  return error;
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder));
}

function artifactRole(relativePath) {
  if (relativePath.startsWith('reports/')) return 'report';
  if (relativePath.startsWith('controls/')) return 'control';
  if (relativePath.startsWith('evidence/')) return 'evidence';
  return 'artifact';
}

function artifactExtension(relativePath) {
  const filename = basename(relativePath).toLowerCase();
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index) : '';
}

function artifactIsText(relativePath) {
  return TEXT_ARTIFACT_EXTENSIONS.has(artifactExtension(relativePath));
}

function artifactContentType(relativePath) {
  const extension = artifactExtension(relativePath);
  if (extension === '.json' || extension === '.jsonl') return 'application/json';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  if (artifactIsText(relativePath)) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function safeArtifactPath(root, requested) {
  if (typeof requested !== 'string' || requested.trim() === '' || isAbsolute(requested)) {
    throw Object.assign(new Error('artifact path is invalid'), { code: 'artifact_not_found' });
  }
  const relativePath = requested.replaceAll('\\', '/');
  const candidate = resolve(root, relativePath);
  const remainder = relative(root, candidate);
  if (remainder === '' || remainder.startsWith('..') || isAbsolute(remainder)
      || !['evidence', 'reports', 'controls'].some((prefix) => remainder === prefix || remainder.startsWith(`${prefix}${sep}`))) {
    throw Object.assign(new Error('artifact path is outside the run artifact roots'), { code: 'artifact_not_found' });
  }
  return { candidate, relativePath: remainder.split(sep).join('/') };
}

function boundedToken(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeUsage(value) {
  const input = boundedToken(value?.input_tokens ?? value?.inputTokens ?? value?.prompt_tokens);
  const output = boundedToken(value?.output_tokens ?? value?.outputTokens ?? value?.completion_tokens);
  const totalCandidate = value?.total_tokens ?? value?.totalTokens;
  const total = boundedToken(totalCandidate)
    ?? (input !== null && output !== null ? input + output : null);
  const cacheRead = boundedToken(value?.cache_read_tokens ?? value?.cacheReadTokens);
  const cacheWrite = boundedToken(value?.cache_write_tokens ?? value?.cacheWriteTokens);
  const reasoning = boundedToken(value?.reasoning_tokens ?? value?.reasoningTokens);
  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    reasoning_tokens: reasoning,
    status: input !== null && output !== null ? 'complete' : input !== null || output !== null ? 'partial' : 'unknown',
  };
}

function addUsage(target, usage) {
  for (const key of ['input_tokens', 'output_tokens', 'total_tokens',
    'cache_read_tokens', 'cache_write_tokens', 'reasoning_tokens']) {
    if (usage[key] !== null) target[key] = (target[key] ?? 0) + usage[key];
  }
}

function emptyUsage() {
  return {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
  };
}

function boundedFailureDetails(value) {
  if (value === null || value === undefined) return {};
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return {};
  }
  if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > MAX_FAILURE_DETAILS_BYTES) {
    return { truncated: true };
  }
  try {
    return JSON.parse(serialized);
  } catch {
    return {};
  }
}

async function walkFiles(root, current = root, result = []) {
  if (result.length >= MAX_ARTIFACTS) return result;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (result.length >= MAX_ARTIFACTS) break;
    // A symlink is outside the artifact trust boundary, but must not prevent
    // sibling evidence files from being listed.
    if (entry.isSymbolicLink()) continue;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      // The artifact roots contain phase and tool-specific subdirectories
      // (for example evidence/P0/codeagent.stdout.log). Once traversal has
      // entered one of the authorized roots, recurse through every ordinary
      // directory while keeping the root-level allowlist intact.
      if (current !== root || entry.name === 'evidence' || entry.name === 'reports' || entry.name === 'controls') {
        await walkFiles(root, path, result);
      }
    } else {
      result.push(path);
    }
  }
  return result;
}

export class ArRuntimeService {
  constructor({
    runtime = null,
    runtimeFactory = createRuntime,
    dataRoot = resolve(process.env.TMPDIR ?? '/tmp', 'dsh-local-console/runtime'),
    deliveryAdapter,
    deliveryScriptsRoot,
    deliveryBridgePath,
    pythonCommand,
    hostBindingId = 'local-agent',
    hostKind = 'claude-code',
    hostVersion = 'unprobed',
    hostCapabilities = null,
    capabilitySource = 'unverified',
  } = {}) {
    this.runtime = runtime ?? runtimeFactory({
      dataRoot,
      deliveryAdapter,
      deliveryScriptsRoot,
      deliveryBridgePath,
      pythonCommand,
      principal: 'all',
    });
    this.deliveryAdapter = deliveryAdapter ?? this.runtime?.controller?.deliveryAdapter ?? null;
    this.hostBindingId = hostBindingId;
    this.hostKind = normalizeHostKind(hostKind);
    this.hostVersion = hostVersion;
    this.hostCapabilities = { ...DEFAULT_HOST_CAPABILITIES, ...(hostCapabilities ?? {}) };
    this.capabilitySource = hostCapabilities ? capabilitySource : 'unverified';
    this.hostRegistered = false;
  }

  close() {
    this.runtime.close?.();
  }

  async #call(tool, args) {
    const definition = this.runtime.tools?.get(tool);
    if (!definition) throw Object.assign(new Error(`runtime tool unavailable: ${tool}`), {
      code: 'runtime_tool_unavailable',
    });
    const response = await definition.call(args);
    if (!response.ok) throw errorFromTool(tool, response);
    return response.result;
  }

  async ensureHost() {
    if (this.hostRegistered) return { binding_id: this.hostBindingId };
    const registration = {
      binding_id: this.hostBindingId,
      host_kind: this.hostKind,
      host_version: this.hostVersion,
      execution_mode: 'host_native',
      capabilities: this.hostCapabilities,
      capability_source: this.capabilitySource,
    };
    const result = await this.#call('ohos_host_register', {
      ...registration,
      idempotency_key: hostRegistrationKey({
        bindingId: this.hostBindingId,
        hostKind: this.hostKind,
        hostVersion: this.hostVersion,
        executionMode: 'host_native',
        capabilities: this.hostCapabilities,
        capabilitySource: this.capabilitySource,
      }),
    });
    this.hostRegistered = true;
    return result;
  }

  async start({
    runId = `ar-${randomUUID()}`,
    inputRef = `local://ar/${runId}`,
    arText,
    arPath,
    pipelineDir,
    repoRoot,
    environment,
    componentType,
    deviceType,
    deviceSerial,
    gitDir,
    buildTarget,
    part,
    baseCommit,
    agent = this.hostKind,
    model,
    confirmDefaults = false,
    skills = [],
    publication = undefined,
    idempotencyKey = `start-${runId}`,
  }) {
    await this.ensureHost();
    return this.#call('ohos_delivery_start', {
      run_id: runId,
      input_ref: inputRef,
      ar_text: arText,
      ar_path: arPath,
      pipeline_dir: pipelineDir,
      repo_root: repoRoot,
      environment,
      component_type: componentType,
      device_type: deviceType,
      device_serial: deviceSerial,
      git_dir: gitDir,
      build_target: buildTarget,
      part,
      base_commit: baseCommit,
      agent,
      model,
      confirm_defaults: confirmDefaults,
      skills,
      publication,
      idempotency_key: idempotencyKey,
    });
  }

  async status(runId, cursor = 0) {
    const result = await this.#call('ohos_run_status', { run_id: runId, cursor });
    return { ...result, observability: this.observability(runId, result) };
  }

  async claim({ runId, role, expectedRevision, contextId }) {
    await this.ensureHost();
    return this.#call('ohos_task_claim', {
      run_id: runId,
      role,
      host_binding_id: this.hostBindingId,
      context_id: contextId,
      expected_revision: expectedRevision,
      idempotency_key: operationKey('claim', { runId, role, expectedRevision, contextId }),
    });
  }

  async context(claim) {
    return this.#call('ohos_task_context', {
      attempt_id: claim.attempt_id,
      lease_epoch: claim.lease_epoch,
      task_credential: claim.task_credential,
    });
  }

  async heartbeat(claim) {
    return this.#call('ohos_task_heartbeat', {
      attempt_id: claim.attempt_id,
      lease_epoch: claim.lease_epoch,
      task_credential: claim.task_credential,
    });
  }

  async release({ attemptId, leaseEpoch, taskCredential, reason, artifactRefs }) {
    return this.#call('ohos_task_release', {
      attempt_id: attemptId,
      lease_epoch: leaseEpoch,
      task_credential: taskCredential,
      reason,
      artifact_refs: artifactRefs,
      idempotency_key: operationKey('release', {
        attemptId, leaseEpoch, taskCredential, reason: reason ?? null, artifactRefs: artifactRefs ?? [],
      }),
    });
  }

  async submit({ attemptId, leaseEpoch, taskCredential, revision, artifactRefs, summary }) {
    return this.#call('ohos_task_submit', {
      attempt_id: attemptId,
      lease_epoch: leaseEpoch,
      task_credential: taskCredential,
      revision,
      artifact_refs: artifactRefs,
      summary,
      idempotency_key: operationKey('submit', {
        attemptId, leaseEpoch, taskCredential, revision, artifactRefs: artifactRefs ?? [], summary: summary ?? null,
      }),
    });
  }

  async validate({ runId, taskId, expectedRevision }) {
    return this.#call('ohos_delivery_validate', {
      run_id: runId,
      task_id: taskId,
      expected_revision: expectedRevision,
      idempotency_key: operationKey('validate', { runId, taskId, expectedRevision }),
    });
  }

  async consent({ runId, taskId, phase, token, content = null, actor = 'web-user', kind = 'consent_decision' }) {
    const consentIdempotencyKey = operationKey('consent', { runId, taskId, phase, token });
    if (content !== null && content !== undefined && String(content).trim() !== '') {
      await this.recordHumanInput({
        runId, taskId, phase, kind, category: 'required_workflow', actor, content,
        idempotencyKey: `consent-input-${consentIdempotencyKey}`,
      });
    }
    return this.#call('ohos_delivery_consent', {
      run_id: runId,
      task_id: taskId,
      phase,
      token,
      actor,
      idempotency_key: consentIdempotencyKey,
    });
  }

  async requestCancel({ runId, reason = 'cancelled by user' } = {}) {
    return this.#call('ohos_delivery_cancel', {
      run_id: runId,
      reason,
      idempotency_key: `cancel-request-${runId}`,
    });
  }

  async cancel({ runId, reason = 'cancelled by user' } = {}) {
    return this.#call('ohos_delivery_cancel', {
      run_id: runId,
      reason,
      idempotency_key: `cancel-final-${runId}`,
    });
  }

  /** Store a bounded, operator-authored note while keeping task credentials out of the event. */
  async recordHumanInput({
    runId, taskId = null, phase = null, kind = 'user_note', category = null,
    actor = 'web-user', content, idempotencyKey = null,
  } = {}) {
    const db = this.runtime.store?.db;
    if (!db) throw Object.assign(new Error('runtime store is unavailable'), { code: 'runtime_tool_unavailable' });
    const run = db.prepare('SELECT id FROM runs WHERE id = ?').get(runId);
    if (!run) throw Object.assign(new Error(`run not found: ${runId}`), { code: 'run_not_found' });
    if (typeof content !== 'string' || content.trim() === '') {
      throw Object.assign(new Error('human input content is required'), { code: 'input_content_required' });
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_HUMAN_INPUT_BYTES) {
      throw Object.assign(new Error('human input content is too large'), { code: 'input_content_too_large' });
    }
    if (typeof kind !== 'string' || kind.length === 0 || kind.length > 64
        || typeof actor !== 'string' || actor.length === 0 || actor.length > 256) {
      throw Object.assign(new Error('human input metadata is invalid'), { code: 'invalid_input' });
    }
    if (category !== null && (typeof category !== 'string' || category.length === 0 || category.length > 64)) {
      throw Object.assign(new Error('human input category is invalid'), { code: 'invalid_input' });
    }
    if (idempotencyKey !== null && (typeof idempotencyKey !== 'string'
        || idempotencyKey.length === 0 || idempotencyKey.length > 128
        || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(idempotencyKey))) {
      throw Object.assign(new Error('human input idempotency key is invalid'), { code: 'invalid_input' });
    }
    const normalizedCategory = category ?? (
      new Set(['user_correction', 'blocked_unplanned', 'review_decision']).has(kind)
        ? kind : 'informational');
    const payload = {
      input_id: idempotencyKey
        ? `human-input-${sha256(JSON.stringify({ runId, taskId, phase, kind, normalizedCategory, actor, content, idempotencyKey })).slice(0, 48)}`
        : id('human-input'),
      task_id: typeof taskId === 'string' ? taskId : null,
      phase: typeof phase === 'string' || Number.isInteger(phase) ? String(phase) : null,
      kind,
      category: normalizedCategory,
      actor,
      content,
    };
    const payloadDigest = sha256(JSON.stringify({
      runId, taskId: payload.task_id, phase: payload.phase, kind,
      category: normalizedCategory, actor, content,
    }));
    const store = this.runtime.store;
    const record = () => {
      if (idempotencyKey) {
        const previous = store.getOperation('all', 'human_input', idempotencyKey, payloadDigest);
        if (previous) return previous;
      }
      const seq = store.event(runId, 'human.input_recorded', payload, now());
      const result = { recorded: true, run_id: runId, seq, ...payload };
      if (idempotencyKey) store.saveOperation('all', 'human_input', idempotencyKey, payloadDigest, result, now());
      return result;
    };
    return typeof store.transaction === 'function' ? store.transaction(record) : record();
  }

  /** Persist provider usage as an auditable event without storing prompts or credentials. */
  async recordUsage({
    runId, attemptId = null, phase = null, agent = null, provider = null, model = null,
    usage = null, durationMs = null, status = 'completed',
  } = {}) {
    const db = this.runtime.store?.db;
    if (!db) throw Object.assign(new Error('runtime store is unavailable'), { code: 'runtime_tool_unavailable' });
    const run = db.prepare('SELECT id FROM runs WHERE id = ?').get(runId);
    if (!run) throw Object.assign(new Error(`run not found: ${runId}`), { code: 'run_not_found' });
    if (attemptId !== null && (typeof attemptId !== 'string' || attemptId.length > 256)) {
      throw Object.assign(new Error('attempt_id is invalid'), { code: 'invalid_input' });
    }
    const normalized = normalizeUsage(usage ?? {});
    const boundedDuration = Number.isSafeInteger(durationMs) && durationMs >= 0 ? durationMs : null;
    const payload = {
      attempt_id: attemptId,
      phase: typeof phase === 'string' && phase.length <= 64 ? phase : null,
      agent: typeof agent === 'string' && agent.length <= 256 ? agent : null,
      provider: typeof provider === 'string' && provider.length <= 256 ? provider : null,
      model: typeof model === 'string' && model.length <= 256 ? model : null,
      usage: normalized,
      duration_ms: boundedDuration,
      status: typeof status === 'string' && status.length <= 64 ? status : 'completed',
    };
    const usageKey = operationKey('usage', {
      runId, attemptId, phase: payload.phase, agent: payload.agent,
      provider: payload.provider, model: payload.model, usage: normalized,
      durationMs: boundedDuration, status: payload.status,
    });
    const payloadDigest = sha256(JSON.stringify({
      runId, attemptId, phase: payload.phase, agent: payload.agent,
      provider: payload.provider, model: payload.model, usage: normalized,
      durationMs: boundedDuration, status: payload.status,
    }));
    const store = this.runtime.store;
    const record = () => {
      const previous = store.getOperation('all', 'task_usage', usageKey, payloadDigest);
      if (previous) return previous;
      const seq = store.event(runId, 'task.usage_reported', payload, now());
      const result = { recorded: true, run_id: runId, attempt_id: attemptId, seq, usage: normalized };
      store.saveOperation('all', 'task_usage', usageKey, payloadDigest, result, now());
      return result;
    };
    return typeof store.transaction === 'function' ? store.transaction(record) : record();
  }

  /** Persist a scheduler/CodeAgent failure in the same event ledger as gate failures. */
  async recordSchedulerFailure({
    runId, taskId = null, phase = null, attemptId = null, error = null, code = null, message = null, details = null,
  } = {}) {
    const db = this.runtime.store?.db;
    if (!db) throw Object.assign(new Error('runtime store is unavailable'), { code: 'runtime_tool_unavailable' });
    const run = db.prepare('SELECT id FROM runs WHERE id = ?').get(runId);
    if (!run) throw Object.assign(new Error(`run not found: ${runId}`), { code: 'run_not_found' });
    if (taskId !== null && (typeof taskId !== 'string' || taskId.length === 0 || taskId.length > 256)) {
      throw Object.assign(new Error('task_id is invalid'), { code: 'invalid_input' });
    }
    if (attemptId !== null && (typeof attemptId !== 'string' || attemptId.length === 0 || attemptId.length > 256)) {
      throw Object.assign(new Error('attempt_id is invalid'), { code: 'invalid_input' });
    }
    const task = taskId
      ? db.prepare('SELECT id, phase, status FROM tasks WHERE id = ? AND run_id = ?').get(taskId, runId)
      : db.prepare(`SELECT id, phase, status FROM tasks WHERE run_id = ?
          AND status NOT IN ('accepted', 'cancelled', 'superseded')
          ORDER BY created_at, id LIMIT 1`).get(runId);
    const source = error && typeof error === 'object' ? error : {};
    const rawCode = code ?? source.code ?? 'scheduler_error';
    const rawMessage = message ?? source.message ?? String(error ?? 'Scheduler execution failed');
    const normalizedCode = String(rawCode || 'scheduler_error').slice(0, MAX_FAILURE_CODE_LENGTH);
    const normalizedMessage = String(rawMessage || 'Scheduler execution failed').slice(0, MAX_FAILURE_MESSAGE_BYTES);
    const normalizedPhase = phase === null || phase === undefined
      ? (task?.phase ?? null)
      : String(phase).slice(0, 64);
    const payload = {
      task_id: task?.id ?? taskId ?? null,
      attempt_id: attemptId,
      phase: normalizedPhase,
      code: normalizedCode,
      message: normalizedMessage,
      details: boundedFailureDetails(details ?? source.details),
    };
    const payloadDigest = sha256(JSON.stringify({ runId, ...payload }));
    const failureKey = operationKey('scheduler-failure', { runId, ...payload });
    const store = this.runtime.store;
    const record = () => {
      const previous = store.getOperation('all', 'scheduler_failure', failureKey, payloadDigest);
      if (previous) return previous;
      const seq = store.event(runId, 'scheduler.failed', payload, now());
      const result = { recorded: true, run_id: runId, seq, ...payload };
      store.saveOperation('all', 'scheduler_failure', failureKey, payloadDigest, result, now());
      return result;
    };
    return typeof store.transaction === 'function' ? store.transaction(record) : record();
  }

  async sync(runId) {
    return this.#call('ohos_delivery_sync', {
      run_id: runId,
      idempotency_key: id('sync'),
    });
  }

  listRuns() {
    const db = this.runtime.store?.db;
    if (!db) return [];
    return db.prepare(`SELECT id, workflow, revision, status, input_ref, environment_profile,
      pipeline_dir, workspace_root, device_ref, agent, config_json, created_at, updated_at
      FROM runs ORDER BY updated_at DESC, id DESC`).all().map((run) => {
      const config = safeJson(run.config_json ?? '{}');
      return {
      run_id: run.id,
      workflow: run.workflow,
      revision: run.revision,
      status: run.status,
      input_ref: run.input_ref,
      environment_profile: run.environment_profile,
      environment: config.environment ?? run.environment_profile ?? null,
      component_type: config.component_type ?? null,
      device_type: config.device_type ?? null,
      environment_profile_digest: config.environment_profile_digest ?? null,
      product: config.product ?? null,
      pipeline_dir: run.pipeline_dir,
      workspace_root: run.workspace_root,
      device_ref: run.device_ref,
      agent: run.agent,
      model: config.model ?? null,
      publication: config.publication ?? null,
      created_at: run.created_at,
      updated_at: run.updated_at,
      observability: this.observability(run.id),
      };
    });
  }

  observability(runId, status = null) {
    const db = this.runtime.store?.db;
    if (!db) return this.#fallbackObservability(status);
    const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
    if (!run) return this.#fallbackObservability(status);
    const tasks = db.prepare(`SELECT * FROM tasks WHERE run_id = ? ORDER BY created_at, id`).all(runId);
    const attempts = db.prepare(`
      SELECT a.*, t.phase FROM attempts a JOIN tasks t ON t.id = a.task_id
      WHERE t.run_id = ? ORDER BY a.created_at, a.id
    `).all(runId);
    const events = db.prepare(`SELECT seq, type, payload_json, created_at FROM events
      WHERE run_id = ? ORDER BY seq`).all(runId).map((event) => ({
      ...event, payload: safeJson(event.payload_json),
    }));
    const humanEvents = events.filter((event) => event.type === 'task.awaiting_consent');
    const humanInputEvents = events.filter((event) => event.type === 'human.input_recorded');
    const humanActionEvents = events.filter((event) => event.type === 'human.action_recorded');
    const validationFailureEvents = events.filter((event) => event.type === 'task.validation_rejected');
    const schedulerFailureEvents = events.filter((event) => event.type === 'scheduler.failed');
    const failedEvents = [...validationFailureEvents, ...schedulerFailureEvents];
    const gatePassEvents = events.filter((event) => event.type === 'gate.passed');
    const stageCompletionEvents = events.filter((event) => event.type === 'task.accepted');
    const runSuccessEvents = events.filter((event) => event.type === 'run.completed');
    const asOf = now();
    const asOfMs = timestampMs(asOf);
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const terminalTaskStatuses = new Set(['accepted', 'cancelled', 'rejected', 'superseded']);
    const stageIntervals = tasks.map((task) => {
      const end = terminalTaskStatuses.has(task.status) ? task.updated_at : asOf;
      return { task, interval: interval(task.created_at, end) };
    }).filter((item) => item.interval !== null);
    const actionEvents = [...humanActionEvents].sort((left, right) => left.seq - right.seq);
    const consumedActions = new Set();
    const waitRecordsById = new Map();
    for (const event of humanEvents) {
      const payload = event.payload ?? {};
      const task = taskById.get(payload.task_id);
      const waitId = typeof payload.wait_id === 'string' && payload.wait_id.length > 0
        ? payload.wait_id
        : `wait-${payload.task_id ?? 'unknown'}-${payload.phase ?? 'unknown'}-${payload.revision ?? 'unknown'}`;
      const openedMs = timestampMs(event.created_at);
      const actionIndex = actionEvents.findIndex((candidate, index) => {
        if (consumedActions.has(index)) return false;
        const candidatePayload = candidate.payload ?? {};
        const candidateMs = timestampMs(candidate.created_at);
        if (openedMs === null || candidateMs === null || candidateMs < openedMs) return false;
        const sameWait = typeof candidatePayload.wait_id === 'string'
          && candidatePayload.wait_id.length > 0 && candidatePayload.wait_id === payload.wait_id;
        const categoryMatches = !payload.category || !candidatePayload.category
          || candidatePayload.category === payload.category;
        const legacySameTask = candidatePayload.task_id === payload.task_id
          && candidatePayload.phase === payload.phase
          && (!payload.wait_id || !candidatePayload.wait_id);
        return categoryMatches && (sameWait || legacySameTask);
      });
      const action = actionIndex >= 0 ? actionEvents[actionIndex] : null;
      if (action) consumedActions.add(actionIndex);
      const closedMs = action ? timestampMs(action.created_at) : null;
      const openNow = !action && task?.status === 'awaiting_consent' && asOfMs !== null;
      const endMs = closedMs ?? (openNow ? asOfMs : null);
      const status = action ? 'closed' : openNow ? 'open' : 'unknown';
      const record = {
        wait_id: waitId,
        task_id: payload.task_id ?? null,
        phase: payload.phase ?? null,
        category: payload.category ?? 'required_workflow',
        opened_at: event.created_at,
        closed_at: action?.created_at ?? null,
        duration_ms: openedMs !== null && endMs !== null && endMs >= openedMs
          ? endMs - openedMs : null,
        status,
        action_id: action?.payload?.action_id ?? null,
      };
      const previous = waitRecordsById.get(waitId);
      // A replayed event must not create a second wait. Prefer a closed record,
      // then an open record, over an unresolved legacy record.
      if (!previous || (previous.status !== 'closed' && record.status === 'closed')
          || (previous.status === 'unknown' && record.status === 'open')) {
        waitRecordsById.set(waitId, record);
      }
    }
    const humanWaitIntervals = [...waitRecordsById.values()];
    const waitTimeIntervals = humanWaitIntervals
      .filter((item) => item.duration_ms !== null)
      .map((item) => ({
        wait_id: item.wait_id,
        task_id: item.task_id,
        start: timestampMs(item.opened_at),
        end: timestampMs(item.closed_at) ?? asOfMs,
      }));
    const wallTimeIntervals = stageIntervals.map((item) => item.interval);
    const wallUnion = mergeIntervals(wallTimeIntervals);
    const humanWaitUnion = intersectIntervals(waitTimeIntervals, wallUnion);
    const wallElapsedMs = wallUnion.length > 0 ? intervalsDuration(wallUnion) : null;
    const unknownWaitCount = humanWaitIntervals.filter((item) => item.status === 'unknown').length;
    // A single unresolved legacy interval makes the aggregate wait and
    // effective elapsed time non-authoritative.  Returning the known subset
    // would undercount human time and make efficiency comparisons look exact.
    const humanWaitMs = unknownWaitCount > 0
      ? null : waitTimeIntervals.length > 0 ? intervalsDuration(humanWaitUnion) : 0;
    const effectiveElapsedMs = wallElapsedMs === null || humanWaitMs === null
      ? null : Math.max(0, wallElapsedMs - humanWaitMs);
    const uniqueEventCount = (items, identity) => new Set(items.map((event) => identity(event))).size;
    const humanInterventionEvents = [
      ...humanActionEvents,
      ...humanInputEvents.filter((event) => ['blocked_unplanned', 'user_correction', 'review_decision']
        .includes(event.payload?.category)),
    ];
    const humanInterventionCount = uniqueEventCount(humanInterventionEvents,
      (event) => event.payload?.action_id ?? event.payload?.input_id ?? `event-${event.seq}`);
    const humanInterventionByCategory = {};
    for (const event of humanInterventionEvents) {
      const identity = event.payload?.action_id ?? event.payload?.input_id ?? `event-${event.seq}`;
      if (humanInterventionEvents.findIndex((candidate) =>
        (candidate.payload?.action_id ?? candidate.payload?.input_id ?? `event-${candidate.seq}`) === identity) !== humanInterventionEvents.indexOf(event)) continue;
      const category = event.payload?.category ?? 'unknown';
      humanInterventionByCategory[category] = (humanInterventionByCategory[category] ?? 0) + 1;
    }
    const gatePassCount = uniqueEventCount(gatePassEvents,
      (event) => event.payload?.gate_id ?? `${event.payload?.task_id ?? 'task'}:${event.payload?.revision ?? event.seq}`);
    const stageCompletionCount = uniqueEventCount(stageCompletionEvents,
      (event) => event.payload?.task_id ?? `event-${event.seq}`);
    const runSuccessCount = uniqueEventCount(runSuccessEvents,
      (event) => event.payload?.run_id ?? runId);
    const terminalFailureCount = ['failed', 'needs_repair'].includes(run.status) ? 1 : 0;
    const runOutcomeCount = runSuccessCount + terminalFailureCount;
    const runSuccessRate = runOutcomeCount > 0 ? runSuccessCount / runOutcomeCount : null;
    const usageEvents = events.filter((event) => event.type === 'task.usage_reported');
    const usageByAttempt = new Map(usageEvents
      .filter((event) => typeof event.payload?.attempt_id === 'string')
      .map((event) => [event.payload.attempt_id, event.payload]));
    const usageByPhase = {};
    const totalUsage = emptyUsage();
    for (const event of usageEvents) {
      const usage = normalizeUsage(event.payload?.usage);
      addUsage(totalUsage, usage);
      const phase = event.payload?.phase ?? 'unknown';
      usageByPhase[phase] ??= emptyUsage();
      addUsage(usageByPhase[phase], usage);
    }
    const requiredPhases = new Set(tasks.map((task) => task.phase));
    const usageComplete = requiredPhases.size > 0
      && [...requiredPhases].every((phase) => usageByPhase[phase] !== undefined)
      && usageEvents.every((event) => normalizeUsage(event.payload?.usage).status === 'complete');
    const usageStatus = usageEvents.length === 0 ? 'unknown' : usageComplete ? 'complete' : 'partial';
    const stages = tasks.map((task) => {
      const stageAttempts = attempts.filter((attempt) => attempt.task_id === task.id);
      const stageInterval = stageIntervals.find((item) => item.task.id === task.id)?.interval ?? null;
      const stageWallMs = stageInterval ? stageInterval.end - stageInterval.start : null;
      const stageWaitRecords = humanWaitIntervals.filter((item) => item.task_id === task.id);
      const stageWaitTimeIntervals = waitTimeIntervals.filter((item) => item.task_id === task.id);
      const stageUnknownWaitCount = stageWaitRecords.filter((item) => item.status === 'unknown').length;
      const stageWaitMs = stageInterval && stageUnknownWaitCount > 0
        ? null : stageInterval && stageWaitTimeIntervals.length > 0
          ? intervalsDuration(intersectIntervals(stageWaitTimeIntervals, [stageInterval]))
          : stageInterval ? 0 : null;
      const executionElapsed = stageAttempts.reduce((total, attempt) =>
        total + (duration(attempt.created_at, attempt.updated_at) ?? 0), 0);
      const stageUsageEvents = usageEvents.filter((event) => event.payload?.phase === task.phase);
      const stageUsage = emptyUsage();
      let codeagentDuration = 0;
      for (const event of stageUsageEvents) {
        addUsage(stageUsage, normalizeUsage(event.payload?.usage));
        if (Number.isSafeInteger(event.payload?.duration_ms)) codeagentDuration += event.payload.duration_ms;
      }
      return {
        phase: task.phase,
        role: task.role,
        revision: task.revision,
        status: task.status,
        started_at: task.created_at,
        finished_at: ['accepted', 'cancelled', 'rejected', 'superseded'].includes(task.status)
          ? task.updated_at : null,
        elapsed_ms: duration(task.created_at,
          ['accepted', 'cancelled', 'rejected', 'superseded'].includes(task.status)
            ? task.updated_at : asOf),
        wall_ms: stageWallMs,
        human_wait_ms: stageWallMs === null ? null : stageWaitMs,
        effective_elapsed_ms: stageWallMs === null || stageWaitMs === null
          ? null : Math.max(0, stageWallMs - stageWaitMs),
        execution_elapsed_ms: executionElapsed,
        codeagent_duration_ms: codeagentDuration,
        token_usage: {
          ...stageUsage,
          status: stageUsageEvents.length === 0 ? 'unknown'
            : stageUsageEvents.every((event) => normalizeUsage(event.payload?.usage).status === 'complete')
              ? 'complete' : 'partial',
        },
        attempts: stageAttempts.map((attempt) => ({
          attempt_id: attempt.id,
          attempt_no: attempt.attempt_no,
          status: attempt.status,
          lease_epoch: attempt.lease_epoch,
          created_at: attempt.created_at,
          updated_at: attempt.updated_at,
          artifact_refs: attempt.artifact_refs_json ? safeJson(attempt.artifact_refs_json) : [],
          summary: attempt.summary,
          usage: usageByAttempt.get(attempt.id)?.usage
            ? normalizeUsage(usageByAttempt.get(attempt.id).usage) : null,
          provider: usageByAttempt.get(attempt.id)?.provider ?? null,
          model: usageByAttempt.get(attempt.id)?.model ?? null,
        })),
        gate_attempts: stageAttempts.filter((attempt) => attempt.status !== 'leased').length,
        gate_pass_count: uniqueEventCount(gatePassEvents.filter((event) => event.payload?.task_id === task.id
          || event.payload?.phase === task.phase),
        (event) => event.payload?.gate_id ?? `${event.payload?.task_id ?? task.id}:${event.payload?.revision ?? event.seq}`),
        stage_completion_count: uniqueEventCount(stageCompletionEvents.filter((event) => event.payload?.task_id === task.id),
          (event) => event.payload?.task_id ?? `event-${event.seq}`),
        validation_failures: validationFailureEvents.filter((event) => event.payload?.phase === task.phase).length,
        execution_failures: schedulerFailureEvents.filter((event) =>
          event.payload?.phase === task.phase || event.payload?.task_id === task.id).length,
      };
    });
    const currentTask = tasks.find((task) => !['accepted', 'cancelled', 'superseded'].includes(task.status));
    const latestSchedulerFailure = [...schedulerFailureEvents].reverse().find((event) =>
      currentTask && (event.payload?.task_id === currentTask.id || event.payload?.phase === currentTask.phase));
    const failureReasons = failedEvents.map((event) => ({
      type: event.type,
      code: event.payload?.code ?? (event.type === 'task.validation_rejected' ? 'validation_rejected' : 'scheduler_error'),
      message: event.payload?.message ?? event.payload?.reason ?? 'Workflow execution failed.',
      phase: event.payload?.phase ?? null,
      task_id: event.payload?.task_id ?? null,
      details: event.payload?.details ?? event.payload?.diagnostic ?? {},
      at: event.created_at,
    }));
    const blockers = currentTask?.status === 'awaiting_consent'
      ? [{ code: 'HUMAN_CONSENT_REQUIRED', phase: currentTask.phase, phase_number: phaseNumber(currentTask.phase) }]
      : currentTask?.status === 'needs_reconcile'
        ? [{ code: 'NEEDS_RECONCILE', phase: currentTask.phase, phase_number: phaseNumber(currentTask.phase) }]
        : [];
    if (latestSchedulerFailure && ['awaiting_host', 'failed', 'blocked', 'needs_reconcile'].includes(run.status)) {
      blockers.push({
        code: 'SCHEDULER_FAILURE',
        phase: latestSchedulerFailure.payload?.phase ?? currentTask?.phase ?? null,
        phase_number: phaseNumber(latestSchedulerFailure.payload?.phase ?? currentTask?.phase),
        task_id: latestSchedulerFailure.payload?.task_id ?? currentTask?.id ?? null,
        message: latestSchedulerFailure.payload?.message ?? 'Scheduler execution failed.',
        details: latestSchedulerFailure.payload?.details ?? {},
      });
    }
    return {
      metrics_version: 1,
      as_of: asOf,
      run_started_at: run.created_at,
      run_updated_at: run.updated_at,
      wall_elapsed_ms: wallElapsedMs,
      human_wait_ms: humanWaitMs,
      effective_elapsed_ms: effectiveElapsedMs,
      current_stage: currentTask?.phase ?? null,
      current_blockers: blockers,
      stage_count: stages.length,
      stages,
      human_intervention_count: humanInterventionCount,
      human_wait_count: humanWaitIntervals.length,
      human_wait_open_count: humanWaitIntervals.filter((item) => item.status === 'open').length,
      human_wait_unknown_count: unknownWaitCount,
      human_wait_data_quality: unknownWaitCount > 0 ? 'partial' : 'complete',
      human_wait_intervals: humanWaitIntervals,
      human_input_count: humanInputEvents.length,
      human_inputs: events.filter((event) =>
        event.type === 'task.awaiting_consent' || event.type === 'human.input_recorded'
          || event.type === 'human.action_recorded').map((event) =>
        event.type === 'human.input_recorded'
          ? {
              input_id: event.payload?.input_id ?? null,
              kind: event.payload?.kind ?? 'user_note',
              category: event.payload?.category ?? 'informational',
              phase: event.payload?.phase ?? null,
              task_id: event.payload?.task_id ?? null,
              actor: event.payload?.actor ?? null,
              content: event.payload?.content ?? null,
              at: event.created_at,
            } : event.type === 'human.action_recorded' ? {
              action_id: event.payload?.action_id ?? null,
              kind: event.payload?.kind ?? 'review',
              category: event.payload?.category ?? 'required_workflow',
              decision: event.payload?.decision ?? null,
              phase: event.payload?.phase ?? null,
              task_id: event.payload?.task_id ?? null,
              actor: event.payload?.actor ?? null,
              at: event.created_at,
            } : {
              kind: 'consent_request',
              wait_id: event.payload?.wait_id ?? null,
              phase: event.payload?.phase,
              task_id: event.payload?.task_id,
              at: event.created_at,
              status: humanWaitIntervals.find((item) => item.wait_id === event.payload?.wait_id)?.status ?? 'unknown',
              evidence: event.payload?.evidence ?? null,
            }),
      token_usage: {
        status: usageStatus,
        input_tokens: usageEvents.length === 0 ? null : totalUsage.input_tokens,
        output_tokens: usageEvents.length === 0 ? null : totalUsage.output_tokens,
        total_tokens: usageEvents.length === 0 ? null : totalUsage.total_tokens,
        cache_read_tokens: usageEvents.length === 0 ? null : totalUsage.cache_read_tokens,
        cache_write_tokens: usageEvents.length === 0 ? null : totalUsage.cache_write_tokens,
        reasoning_tokens: usageEvents.length === 0 ? null : totalUsage.reasoning_tokens,
        by_phase: usageByPhase,
          source: usageEvents.length === 0 ? 'host_usage_not_reported' : 'codeagent_executor',
      },
      failure_reasons: failureReasons,
      gate_pass_count: gatePassCount,
      stage_completion_count: stageCompletionCount,
      run_success_count: runSuccessCount || (run.status === 'completed' ? 1 : 0),
      run_success_rate: runSuccessRate ?? (run.status === 'completed' ? 1 : null),
      raw_gate_fail_count: validationFailureEvents.filter((event) =>
        event.payload?.raw_failure !== false).length,
      normalized_gate_failure_count: validationFailureEvents.length,
      execution_failure_count: schedulerFailureEvents.length,
      human_intervention_by_category: humanInterventionByCategory,
      success_count: runSuccessCount || (run.status === 'completed' ? 1 : 0),
      failure_count: failedEvents.length,
      event_count: events.length,
      last_event_seq: events.at(-1)?.seq ?? 0,
    };
  }

  #fallbackObservability(status) {
    const tasks = status?.tasks ?? [];
    return {
      metrics_version: 1,
      as_of: now(),
      wall_elapsed_ms: null,
      human_wait_ms: null,
      effective_elapsed_ms: null,
      current_stage: tasks.find((task) => !['accepted', 'cancelled'].includes(task.status))?.phase ?? null,
      stage_count: tasks.length,
      stages: tasks,
      human_intervention_count: 0,
      human_wait_count: 0,
      human_wait_open_count: 0,
      human_wait_unknown_count: 0,
      human_wait_data_quality: 'unknown',
      human_wait_intervals: [],
      human_input_count: 0,
      human_inputs: [],
      current_blockers: [],
      failure_reasons: [],
      token_usage: {
        status: 'unknown', input_tokens: null, output_tokens: null, total_tokens: null,
        cache_read_tokens: null, cache_write_tokens: null, reasoning_tokens: null,
      },
      gate_pass_count: 0,
      stage_completion_count: 0,
      run_success_count: status?.status === 'completed' ? 1 : 0,
      run_success_rate: status?.status === 'completed' ? 1 : null,
      raw_gate_fail_count: 0,
      normalized_gate_failure_count: 0,
      execution_failure_count: 0,
      human_intervention_by_category: {},
      success_count: status?.status === 'completed' ? 1 : 0,
      failure_count: 0,
      event_count: status?.events?.length ?? 0,
    };
  }

  async artifacts(runId) {
    const status = await this.status(runId);
    const root = status.pipeline_dir;
    if (this.deliveryAdapter?.artifacts && root) {
      return this.deliveryAdapter.artifacts(root, { ...status, run_id: runId });
    }
    if (!root || !existsSync(root)) return { pipeline_dir: root ?? null, artifacts: [], complete: false };
    const files = await walkFiles(root);
    const artifacts = [];
    for (const path of files) {
      const metadata = await stat(path);
      if (metadata.size > MAX_ARTIFACT_BYTES) continue;
      const content = await readFile(path);
      const relativePath = relative(root, path).split('\\').join('/');
      const binary = !artifactIsText(relativePath);
      artifacts.push({
        artifact_id: `${runId}:${relativePath}`,
        relative_path: relativePath,
        filename: basename(path),
        role: artifactRole(relativePath),
        size_bytes: metadata.size,
        sha256: sha256(content),
        content_type: artifactContentType(relativePath),
        content: binary || content.length > MAX_INLINE_BYTES ? null : content.toString('utf8'),
        truncated: !binary && content.length > MAX_INLINE_BYTES,
        binary,
        content_available: !binary,
      });
    }
    return { pipeline_dir: root, artifacts, complete: status.status === 'completed' };
  }

  async artifactContent(runId, requestedPath) {
    const status = await this.status(runId);
    const root = status.pipeline_dir;
    if (this.deliveryAdapter?.artifactContent && root) {
      return this.deliveryAdapter.artifactContent(root, requestedPath, runId);
    }
    if (!root || !existsSync(root)) {
      throw Object.assign(new Error('run artifact directory does not exist'), { code: 'artifact_not_found' });
    }
    const { candidate, relativePath } = safeArtifactPath(root, requestedPath);
    let canonical;
    try {
      canonical = await realpath(candidate);
    } catch {
      throw Object.assign(new Error(`artifact not found: ${relativePath}`), { code: 'artifact_not_found' });
    }
    const canonicalRoot = await realpath(root);
    if (!inside(canonicalRoot, canonical)) {
      throw Object.assign(new Error('artifact path is outside the run workspace'), { code: 'artifact_not_found' });
    }
    const metadata = await stat(canonical);
    if (!metadata.isFile() || metadata.size > MAX_ARTIFACT_BYTES) {
      throw Object.assign(new Error('artifact is unavailable or exceeds the size limit'), { code: 'artifact_not_found' });
    }
    const content = await readFile(canonical);
    const binary = !artifactIsText(relativePath);
    return {
      run_id: runId,
      pipeline_dir: root,
      artifact_id: `${runId}:${relativePath}`,
      relative_path: relativePath,
      filename: basename(canonical),
      role: artifactRole(relativePath),
      size_bytes: metadata.size,
      sha256: sha256(content),
      content_type: artifactContentType(relativePath),
      content: binary ? null : content.toString('utf8'),
      ...(binary ? { content_base64: content.toString('base64') } : {}),
      truncated: false,
      binary,
      content_available: true,
    };
  }
}
