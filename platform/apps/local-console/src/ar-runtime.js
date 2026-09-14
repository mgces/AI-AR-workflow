import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { createRuntime } from '../../../../runtime/dsh-ohos/src/runtime.js';

const MAX_ARTIFACTS = 500;
const MAX_ARTIFACT_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_BYTES = 512 * 1024;
const ALL_HOST_CAPABILITIES = Object.freeze({
  mcp_tools: true,
  native_subagent: true,
  isolated_context: true,
  workspace_write: true,
  build_execution: true,
  device_access: true,
  network_publish: true,
  model_observable: false,
  usage_observable: false,
  cancel_observable: true,
  background_execution: true,
});

function now() {
  return new Date().toISOString();
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function id(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function duration(start, end = now()) {
  const first = Date.parse(start);
  const last = Date.parse(end);
  return Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, last - first) : null;
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

async function walkFiles(root, current = root, result = []) {
  if (result.length >= MAX_ARTIFACTS) return result;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (result.length >= MAX_ARTIFACTS || entry.isSymbolicLink()) break;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'evidence' || entry.name === 'reports' || entry.name === 'controls') {
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
    hostCapabilities = ALL_HOST_CAPABILITIES,
  } = {}) {
    this.runtime = runtime ?? runtimeFactory({
      dataRoot,
      deliveryAdapter,
      deliveryScriptsRoot,
      deliveryBridgePath,
      pythonCommand,
      principal: 'all',
    });
    this.hostBindingId = hostBindingId;
    this.hostKind = hostKind;
    this.hostVersion = hostVersion;
    this.hostCapabilities = { ...hostCapabilities };
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
    const result = await this.#call('ohos_host_register', {
      binding_id: this.hostBindingId,
      host_kind: this.hostKind,
      host_version: this.hostVersion,
      execution_mode: 'host_native',
      capabilities: this.hostCapabilities,
      capability_source: 'local-console-probe',
      idempotency_key: `${this.hostBindingId}-register`,
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
      idempotency_key: id('claim'),
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
      idempotency_key: id('release'),
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
      idempotency_key: id('submit'),
    });
  }

  async validate({ runId, taskId, expectedRevision }) {
    return this.#call('ohos_delivery_validate', {
      run_id: runId,
      task_id: taskId,
      expected_revision: expectedRevision,
      idempotency_key: id('validate'),
    });
  }

  async consent({ runId, taskId, phase, token }) {
    return this.#call('ohos_delivery_consent', {
      run_id: runId,
      task_id: taskId,
      phase,
      token,
      idempotency_key: id('consent'),
    });
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
      pipeline_dir, workspace_root, device_ref, agent, created_at, updated_at
      FROM runs ORDER BY updated_at DESC, id DESC`).all().map((run) => ({
      run_id: run.id,
      workflow: run.workflow,
      revision: run.revision,
      status: run.status,
      input_ref: run.input_ref,
      environment_profile: run.environment_profile,
      pipeline_dir: run.pipeline_dir,
      workspace_root: run.workspace_root,
      device_ref: run.device_ref,
      agent: run.agent,
      created_at: run.created_at,
      updated_at: run.updated_at,
      observability: this.observability(run.id),
    }));
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
    const failedEvents = events.filter((event) => event.type === 'task.validation_rejected');
    const stages = tasks.map((task) => {
      const stageAttempts = attempts.filter((attempt) => attempt.task_id === task.id);
      const executionElapsed = stageAttempts.reduce((total, attempt) =>
        total + (duration(attempt.created_at, attempt.updated_at) ?? 0), 0);
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
            ? task.updated_at : now()),
        execution_elapsed_ms: executionElapsed,
        attempts: stageAttempts.map((attempt) => ({
          attempt_id: attempt.id,
          attempt_no: attempt.attempt_no,
          status: attempt.status,
          lease_epoch: attempt.lease_epoch,
          created_at: attempt.created_at,
          updated_at: attempt.updated_at,
          artifact_refs: attempt.artifact_refs_json ? safeJson(attempt.artifact_refs_json) : [],
          summary: attempt.summary,
        })),
        gate_attempts: stageAttempts.filter((attempt) => attempt.status !== 'leased').length,
        validation_failures: failedEvents.filter((event) => event.payload?.phase === task.phase).length,
      };
    });
    const currentTask = tasks.find((task) => !['accepted', 'cancelled', 'superseded'].includes(task.status));
    return {
      metrics_version: 1,
      as_of: now(),
      run_started_at: run.created_at,
      run_updated_at: run.updated_at,
      current_stage: currentTask?.phase ?? null,
      current_blockers: currentTask?.status === 'awaiting_consent'
        ? [{ code: 'HUMAN_CONSENT_REQUIRED', phase: currentTask.phase }]
        : currentTask?.status === 'needs_reconcile'
          ? [{ code: 'NEEDS_RECONCILE', phase: currentTask.phase }]
          : [],
      stage_count: stages.length,
      stages,
      human_intervention_count: humanEvents.length,
      human_wait_count: humanEvents.length,
      human_inputs: humanEvents.map((event) => ({
        kind: 'consent_request',
        phase: event.payload?.phase,
        task_id: event.payload?.task_id,
        at: event.created_at,
        evidence: event.payload?.evidence ?? null,
      })),
      token_usage: {
        status: 'unknown',
        input_tokens: null,
        output_tokens: null,
        source: 'host_usage_not_reported',
      },
      success_count: run.status === 'completed' ? 1 : 0,
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
      current_stage: tasks.find((task) => !['accepted', 'cancelled'].includes(task.status))?.phase ?? null,
      stage_count: tasks.length,
      stages: tasks,
      human_intervention_count: 0,
      human_wait_count: 0,
      human_inputs: [],
      token_usage: { status: 'unknown', input_tokens: null, output_tokens: null },
      success_count: status?.status === 'completed' ? 1 : 0,
      failure_count: 0,
      event_count: status?.events?.length ?? 0,
    };
  }

  async artifacts(runId) {
    const status = await this.status(runId);
    const root = status.pipeline_dir;
    if (!root || !existsSync(root)) return { pipeline_dir: root ?? null, artifacts: [], complete: false };
    const files = await walkFiles(root);
    const artifacts = [];
    for (const path of files) {
      const metadata = await stat(path);
      if (metadata.size > MAX_ARTIFACT_BYTES) continue;
      const content = await readFile(path);
      const relativePath = relative(root, path).split('\\').join('/');
      artifacts.push({
        artifact_id: `${runId}:${relativePath}`,
        relative_path: relativePath,
        filename: basename(path),
        role: relativePath.startsWith('reports/') ? 'report' : 'evidence',
        size_bytes: metadata.size,
        sha256: sha256(content),
        content_type: path.endsWith('.json') ? 'application/json' : 'text/plain',
        content: content.length <= MAX_INLINE_BYTES ? content.toString('utf8') : null,
        truncated: content.length > MAX_INLINE_BYTES,
      });
    }
    return { pipeline_dir: root, artifacts, complete: status.status === 'completed' };
  }
}
