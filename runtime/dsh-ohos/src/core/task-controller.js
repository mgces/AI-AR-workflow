import { randomUUID } from 'node:crypto';
import { invariant } from './errors.js';
import {
  digest, expectCapabilities, expectHostKind, expectId, expectInteger, expectObject,
  expectString, expectStringArray, expectWorkflow, optionalString, parseJson,
} from './validation.js';
import { missingCapabilities } from './capabilities.js';

const CLAIMABLE = new Set(['queued', 'awaiting_host']);
const ACTIVE_ATTEMPT = new Set(['leased', 'executing']);

// Shared lifecycle only. Domain handlers supply bootstrap, claims, context,
// status and expired-lease policy; this module never imports a workflow.
export class TaskController {
  constructor({ store, credentials, clock = () => new Date(), leaseMs = 15 * 60 * 1000 }) {
    Object.assign(this, { store, credentials, clock, leaseMs });
    this.workflows = new Map();
  }

  registerWorkflow(kind, handler) {
    expectWorkflow(kind);
    invariant(!this.workflows.has(kind), 'workflow_already_registered', `Workflow ${kind} is already registered.`);
    this.workflows.set(kind, handler);
  }

  registerHost(raw, principal = 'parent') {
    const args = expectObject(raw);
    const id = expectId(args.binding_id, 'binding_id');
    const hostKind = expectHostKind(args.host_kind);
    const hostVersion = optionalString(args.host_version, 'host_version', { max: 128 });
    const executionMode = args.execution_mode ?? 'host_native';
    invariant(executionMode === 'host_native' || executionMode === 'external', 'invalid_input',
      'execution_mode must be host_native or external.');
    const capabilities = expectCapabilities(args.capabilities);
    const capabilitySource = expectString(args.capability_source, 'capability_source', { max: 256 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payload = { id, hostKind, hostVersion, executionMode, capabilities, capabilitySource };
    const payloadDigest = digest(payload);

    return this.store.transaction(() => {
      const previous = this.store.getOperation(principal, 'register_host', idempotencyKey, payloadDigest);
      if (previous) return previous;
      const now = this.#now();
      this.store.db.prepare(`
        INSERT INTO host_bindings(
          id, host_kind, host_version, execution_mode, capabilities_json,
          capability_source, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          host_kind = excluded.host_kind,
          host_version = excluded.host_version,
          execution_mode = excluded.execution_mode,
          capabilities_json = excluded.capabilities_json,
          capability_source = excluded.capability_source,
          enabled = 1,
          updated_at = excluded.updated_at
      `).run(id, hostKind, hostVersion, executionMode, JSON.stringify(capabilities),
        capabilitySource, now, now);
      const result = {
        binding_id: id,
        host_kind: hostKind,
        execution_mode: executionMode,
        capabilities,
        capability_source: capabilitySource,
      };
      this.store.saveOperation(principal, 'register_host', idempotencyKey, payloadDigest, result, now);
      this.store.event(null, 'host.registered', { binding_id: id, host_kind: hostKind }, now);
      return result;
    });
  }

  hostCapabilities(raw) {
    const args = expectObject(raw);
    const id = expectId(args.binding_id, 'binding_id');
    const row = this.store.db.prepare(`
      SELECT * FROM host_bindings WHERE id = ? AND enabled = 1
    `).get(id);
    invariant(row, 'host_not_found', `No enabled host binding exists for ${id}.`);
    return this.#host(row);
  }

  createRun(raw, principal = 'parent') {
    const args = expectObject(raw);
    const workflow = expectWorkflow(args.workflow);
    const inputRef = expectString(args.input_ref, 'input_ref', { max: 4096 });
    const docsRoot = optionalString(args.docs_root, 'docs_root', { max: 4096 });
    const environmentProfile = optionalString(args.environment_profile,
      'environment_profile', { max: 256 });
    const pipelineDir = optionalString(args.pipeline_dir, 'pipeline_dir', { max: 4096 });
    const workspaceRoot = optionalString(args.workspace_root, 'workspace_root', { max: 4096 });
    const deviceRef = optionalString(args.device_ref, 'device_ref', { max: 256 });
    const agent = optionalString(args.agent, 'agent', { max: 128 });
    const requestedRunId = args.run_id === undefined
      ? null : expectId(args.run_id, 'run_id');
    const requestedInitialPhase = args.initial_phase === undefined
      ? null : expectId(args.initial_phase, 'initial_phase');
    const requestedInitialStatus = args.initial_status ?? 'queued';
    invariant(['queued', 'awaiting_consent'].includes(requestedInitialStatus),
      'invalid_input', 'initial_status must be queued or awaiting_consent.');
    const completed = args.completed === true;
    invariant(args.completed === undefined || typeof args.completed === 'boolean',
      'invalid_input', 'completed must be a boolean.');
    const handler = this.workflows.get(workflow);
    invariant(handler, 'workflow_unavailable', `No workflow is registered for ${workflow}.`);
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payload = {
      workflow, inputRef, docsRoot, environmentProfile, pipelineDir, workspaceRoot, deviceRef, agent,
      requestedRunId,
      requestedInitialPhase, requestedInitialStatus, completed,
    };
    const inputDigest = digest(payload);

    return this.store.transaction(() => {
      const previous = this.store.getOperation(principal, 'start_run', idempotencyKey, inputDigest);
      if (previous) return previous;
      const now = this.#now();
      const runId = requestedRunId
        ?? `${handler.runPrefix ?? workflow}-${randomUUID()}`;
      const initial = handler.bootstrap(args);
      const phase = initial.key ?? initial.phase;
      const runStatus = completed ? 'completed'
        : requestedInitialStatus === 'awaiting_consent' ? 'awaiting_consent' : 'awaiting_host';
      this.store.db.prepare(`
        INSERT INTO runs(
          id, workflow, revision, status, input_ref, docs_root,
          environment_profile, pipeline_dir, workspace_root, device_ref,
          agent, input_digest, created_at, updated_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(runId, workflow, runStatus, inputRef, docsRoot, environmentProfile, pipelineDir,
        workspaceRoot, deviceRef, agent,
        inputDigest, now, now);
      this.initializeRun?.(runId);
      const taskId = completed ? null : this.insertTask({
        runId, workflow, phase, role: initial.role, revision: 1, inputDigest, pipelineDir,
        workspaceRoot,
        requiredCapabilities: initial.capabilities ?? ['mcp_tools', 'native_subagent'],
        status: requestedInitialStatus, now,
      });
      const result = {
        run_id: runId,
        workflow,
        revision: 1,
        status: runStatus,
        agent,
        next: completed ? null : {
          status: requestedInitialStatus === 'awaiting_consent'
            ? 'needs_input' : 'dispatch_needed',
          phase,
          role: initial.role,
          task_id: taskId,
          expected_revision: 1,
        },
      };
      this.store.saveOperation(principal, 'start_run', idempotencyKey, inputDigest, result, now);
      this.store.event(runId, completed ? 'run.attached_complete' : 'run.started', {
        workflow, revision: 1, task_id: taskId, role: initial.role, phase, status: runStatus,
      }, now);
      return result;
    });
  }

  claimTask(raw) {
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const role = expectId(args.role, 'role');
    const bindingId = expectId(args.host_binding_id, 'host_binding_id');
    const expectedRevision = expectInteger(args.expected_revision, 'expected_revision', { min: 1 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const contextId = args.context_id === undefined ? null : expectId(args.context_id, 'context_id');
    const payload = { runId, role, bindingId, expectedRevision, contextId };
    const payloadDigest = digest(payload);
    const principal = `host:${bindingId}`;

    return this.store.transaction(() => {
      const previous = this.store.getOperation(principal, 'claim_task', idempotencyKey, payloadDigest);
      if (previous) return this.#attachCredential(previous);
      const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
      invariant(run, 'run_not_found', `Run ${runId} does not exist.`);
      invariant(run.revision === expectedRevision, 'stale_revision',
        `Run ${runId} is at revision ${run.revision}, not ${expectedRevision}.`,
        { actual_revision: run.revision });
      invariant(!['cancelled', 'completed', 'closed'].includes(run.status), 'run_not_claimable',
        `Run ${runId} is ${run.status}.`);
      const now = this.#now();
      this.#reapExpiredLeases(now);

      const host = this.store.db.prepare(`
        SELECT * FROM host_bindings WHERE id = ? AND enabled = 1
      `).get(bindingId);
      invariant(host, 'host_not_found', `No enabled host binding exists for ${bindingId}.`);
      const capabilities = parseJson(host.capabilities_json, 'host_bindings.capabilities_json');
      const task = this.store.db.prepare(`
        SELECT * FROM tasks
        WHERE run_id = ? AND role = ? AND revision = ?
          AND status IN ('queued', 'awaiting_host')
        ORDER BY created_at, id LIMIT 1
      `).get(runId, role, expectedRevision);

      if (!task) {
        const next = this.store.db.prepare(`
          SELECT id, phase, role, status FROM tasks
          WHERE run_id = ? AND revision = ? AND status NOT IN ('accepted', 'cancelled')
          ORDER BY created_at, id LIMIT 1
        `).get(runId, expectedRevision);
        if (next) return {
          status: next.status === 'queued' ? 'dispatch_needed' : next.status,
          run_id: runId,
          task_id: next.id,
          phase: next.phase,
          role: next.role,
        };
        return { status: 'no_available_task', run_id: runId };
      }

      invariant(CLAIMABLE.has(task.status), 'task_not_claimable',
        `Task ${task.id} is ${task.status}.`);
      const required = parseJson(task.required_capabilities_json,
        'tasks.required_capabilities_json');
      const missing = missingCapabilities(capabilities, required);
      invariant(missing.length === 0, 'capability_missing',
        `Host ${bindingId} lacks capabilities required by task ${task.id}.`,
        { missing_capabilities: missing });
      this.workflows.get(run.workflow)?.onClaim?.(run, task, args, { required, now });

      const leaseUntil = new Date(new Date(now).getTime() + this.leaseMs).toISOString();
      const attemptNo = task.attempt_seq + 1;
      const leaseEpoch = task.lease_epoch + 1;
      const attemptId = `attempt-${randomUUID()}`;
      this.store.db.prepare(`
        UPDATE tasks SET status = 'leased', attempt_seq = ?, lease_epoch = ?,
          lease_until = ?, updated_at = ? WHERE id = ?
      `).run(attemptNo, leaseEpoch, leaseUntil, now, task.id);
      this.store.db.prepare(`
        INSERT INTO attempts(
          id, task_id, attempt_no, host_binding_id, execution_mode, status,
          lease_epoch, lease_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'leased', ?, ?, ?, ?)
      `).run(attemptId, task.id, attemptNo, bindingId, host.execution_mode,
        leaseEpoch, leaseUntil, now, now);
      if (args.context_id !== undefined) {
        this.store.db.prepare('UPDATE attempts SET context_id = ? WHERE id = ?')
          .run(expectId(args.context_id, 'context_id'), attemptId);
      }
      this.store.db.prepare(`
        UPDATE runs SET status = 'working', updated_at = ? WHERE id = ?
      `).run(now, runId);

      const result = {
        schema_version: 1,
        status: 'leased',
        run_id: runId,
        task_id: task.id,
        attempt_id: attemptId,
        phase: task.phase,
        role: task.role,
        revision: task.revision,
        attempt: attemptNo,
        lease_epoch: leaseEpoch,
        lease_until: leaseUntil,
        host_binding_ref: `host:${bindingId}`,
        execution_mode: host.execution_mode,
        context_ref: task.context_ref,
        input_digest: task.input_digest,
        workspace_ref: task.workspace_ref,
        output_ref: task.output_ref,
        policy_ref: task.policy_ref,
      };
      this.store.saveOperation(principal, 'claim_task', idempotencyKey,
        payloadDigest, result, now);
      this.store.event(runId, 'task.claimed', {
        task_id: task.id, attempt_id: attemptId, lease_epoch: leaseEpoch,
        host_binding_id: bindingId,
      }, now);
      return this.#attachCredential(result);
    });
  }

  heartbeatTask(raw) {
    const args = expectObject(raw);
    return this.store.transaction(() => {
      const attempt = this.#authorizedAttempt(args);
      invariant(ACTIVE_ATTEMPT.has(attempt.status), 'lease_lost',
        `Attempt ${attempt.id} is ${attempt.status}.`);
      const now = this.#now();
      invariant(new Date(attempt.lease_until).getTime() >= new Date(now).getTime(),
        'lease_lost', `Attempt ${attempt.id} lease has expired.`);
      const leaseUntil = new Date(new Date(now).getTime() + this.leaseMs).toISOString();
      this.store.db.prepare(`
        UPDATE attempts SET status = 'executing', lease_until = ?, updated_at = ? WHERE id = ?
      `).run(leaseUntil, now, attempt.id);
      this.store.db.prepare(`
        UPDATE tasks SET status = 'executing', lease_until = ?, updated_at = ?
        WHERE id = ? AND lease_epoch = ?
      `).run(leaseUntil, now, attempt.task_id, attempt.lease_epoch);
      return {
        status: attempt.cancel_requested ? 'cancel_requested' : 'executing',
        attempt_id: attempt.id,
        lease_epoch: attempt.lease_epoch,
        lease_until: leaseUntil,
      };
    });
  }

  taskContext(raw) {
    const args = expectObject(raw);
    const attempt = this.#authorizedAttempt(args);
    invariant(ACTIVE_ATTEMPT.has(attempt.status), 'lease_lost',
      `Attempt ${attempt.id} is ${attempt.status}.`);
    const now = this.#now();
    invariant(new Date(attempt.lease_until).getTime() >= new Date(now).getTime(),
      'lease_lost', `Attempt ${attempt.id} lease has expired.`);
    const row = this.store.db.prepare(`
      SELECT t.id AS task_id, t.phase, t.role, t.revision, t.context_ref,
             t.input_digest, t.workspace_ref, t.output_ref, t.policy_ref,
             r.id AS run_id, r.workflow, r.input_ref, r.docs_root,
             r.environment_profile, r.pipeline_dir, r.workspace_root, r.device_ref, r.agent
      FROM tasks t JOIN runs r ON r.id = t.run_id WHERE t.id = ?
    `).get(attempt.task_id);
    invariant(row, 'task_not_found', `Task ${attempt.task_id} does not exist.`);
    const extension = this.workflows.get(row.workflow)?.taskContext?.(row, attempt) ?? {};
    return {
      schema_version: 1,
      run_id: row.run_id,
      workflow: row.workflow,
      task_id: row.task_id,
      attempt_id: attempt.id,
      phase: row.phase,
      role: row.role,
      revision: row.revision,
      context_ref: row.context_ref,
      input_ref: row.input_ref,
      input_digest: row.input_digest,
      docs_root: row.docs_root,
      environment_profile: row.environment_profile,
      pipeline_dir: row.pipeline_dir,
      workspace_root: row.workspace_root,
      device_ref: row.device_ref,
      agent: row.agent,
      workspace_ref: row.workspace_ref,
      output_ref: row.output_ref,
      policy_ref: row.policy_ref,
      ...extension.data,
      ...(this.contextExtension ? this.contextExtension(row, attempt) : {}),
      constraints: [
        'Write candidate artifacts only within the task workspace and designated output paths.',
        'Do not report workflow PASS; submit artifact references for deterministic validation.',
        'Release the task when work cannot finish, listing any partial artifacts.',
        ...(extension.constraints ?? []),
      ],
    };
  }

  submitTask(raw) {
    const args = expectObject(raw);
    const attemptId = expectId(args.attempt_id, 'attempt_id');
    const leaseEpoch = expectInteger(args.lease_epoch, 'lease_epoch', { min: 1 });
    const revision = expectInteger(args.revision, 'revision', { min: 1 });
    const artifactRefs = expectStringArray(args.artifact_refs, 'artifact_refs', { min: 1 });
    const summary = expectString(args.summary, 'summary', { max: 4096 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payload = {
      attemptId, revision, leaseEpoch, artifactRefs, summary,
    };
    const payloadDigest = digest(payload);
    const principal = `attempt:${attemptId}`;

    return this.store.transaction(() => {
      const attempt = this.#authorizedAttempt(args);
      const previous = this.store.getOperation(principal, 'submit_task',
        idempotencyKey, payloadDigest);
      if (previous) return previous;
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(attempt.task_id);
      invariant(task, 'task_not_found', `Task ${attempt.task_id} does not exist.`);
      invariant(task.revision === revision, 'stale_revision',
        `Task ${task.id} is at revision ${task.revision}, not ${revision}.`);
      invariant(task.lease_epoch === attempt.lease_epoch, 'lease_lost',
        `Task ${task.id} is owned by a newer lease.`);
      invariant(ACTIVE_ATTEMPT.has(attempt.status), 'lease_lost',
        `Attempt ${attempt.id} is ${attempt.status}.`);
      invariant(!attempt.cancel_requested && !task.cancel_requested, 'cancel_requested',
        `Attempt ${attempt.id} has been asked to stop.`);
      const now = this.#now();
      invariant(new Date(attempt.lease_until).getTime() >= new Date(now).getTime(),
        'lease_lost', `Attempt ${attempt.id} lease has expired.`);

      this.store.db.prepare(`
        UPDATE attempts SET status = 'produced', artifact_refs_json = ?, summary = ?,
          updated_at = ? WHERE id = ?
      `).run(JSON.stringify(artifactRefs), summary, now, attempt.id);
      this.store.db.prepare(`
        UPDATE tasks SET status = 'validating', lease_until = NULL, updated_at = ? WHERE id = ?
      `).run(now, task.id);
      const run = this.store.db.prepare('SELECT run_id FROM tasks WHERE id = ?').get(task.id);
      this.store.db.prepare(`UPDATE runs SET status = 'validating', updated_at = ? WHERE id = ?`)
        .run(now, run.run_id);
      const result = {
        status: 'validating',
        run_id: run.run_id,
        task_id: task.id,
        attempt_id: attempt.id,
        revision,
        lease_epoch: attempt.lease_epoch,
        artifact_refs: artifactRefs,
        message: 'Artifacts were recorded and await deterministic validation; no PASS was granted.',
      };
      this.store.saveOperation(principal, 'submit_task', idempotencyKey,
        payloadDigest, result, now);
      this.store.event(run.run_id, 'task.produced', {
        task_id: task.id, attempt_id: attempt.id, artifact_refs: artifactRefs,
      }, now);
      return result;
    });
  }

  releaseTask(raw) {
    const args = expectObject(raw);
    const attemptId = expectId(args.attempt_id, 'attempt_id');
    const leaseEpoch = expectInteger(args.lease_epoch, 'lease_epoch', { min: 1 });
    const reason = expectString(args.reason, 'reason', { max: 1024 });
    const artifactRefs = args.artifact_refs === undefined
      ? [] : expectStringArray(args.artifact_refs, 'artifact_refs');
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const targetStatus = artifactRefs.length === 0 ? 'awaiting_host' : 'needs_reconcile';
    const payload = {
      attemptId, leaseEpoch, reason, artifactRefs,
    };
    const payloadDigest = digest(payload);
    const principal = `attempt:${attemptId}`;
    return this.store.transaction(() => {
      const attempt = this.#authorizedAttempt(args);
      const previous = this.store.getOperation(principal, 'release_task',
        idempotencyKey, payloadDigest);
      if (previous) return previous;
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(attempt.task_id);
      invariant(task?.lease_epoch === attempt.lease_epoch, 'lease_lost',
        'A newer attempt owns this task.');
      const workflow = this.store.db.prepare('SELECT workflow FROM runs WHERE id = ?').get(attempt.run_id);
      const canReleaseExpired = attempt.status === 'expired' && task.status === 'needs_reconcile'
        && this.workflows.get(workflow.workflow)?.allowExpiredOwnerRelease === true;
      invariant(ACTIVE_ATTEMPT.has(attempt.status) || canReleaseExpired, 'lease_lost',
        `Attempt ${attempt.id} is ${attempt.status}.`);
      const now = this.#now();
      this.store.db.prepare(`
        UPDATE attempts SET status = 'released', artifact_refs_json = ?, summary = ?,
          updated_at = ? WHERE id = ?
      `).run(JSON.stringify(artifactRefs), reason, now, attempt.id);
      this.store.db.prepare(`
        UPDATE tasks SET status = ?, lease_until = NULL, updated_at = ?
        WHERE id = ? AND lease_epoch = ?
      `).run(targetStatus, now, attempt.task_id, attempt.lease_epoch);
      const run = this.store.db.prepare('SELECT run_id FROM tasks WHERE id = ?').get(attempt.task_id);
      this.store.db.prepare(`UPDATE runs SET status = ?, updated_at = ? WHERE id = ?`)
        .run(targetStatus, now, run.run_id);
      this.store.event(run.run_id, 'task.released', {
        task_id: attempt.task_id, attempt_id: attempt.id, status: targetStatus,
        reason, artifact_refs: artifactRefs,
      }, now);
      const result = { status: targetStatus, run_id: run.run_id, task_id: attempt.task_id };
      this.store.saveOperation(principal, 'release_task', idempotencyKey,
        payloadDigest, result, now);
      return result;
    });
  }

  runStatus(raw) {
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const cursor = args.cursor === undefined ? 0
      : expectInteger(args.cursor, 'cursor', { min: 0 });
    const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
    invariant(run, 'run_not_found', `Run ${runId} does not exist.`);
    const tasks = this.store.db.prepare(`
      SELECT id, phase, role, revision, status, attempt_seq, lease_epoch, lease_until
      FROM tasks WHERE run_id = ? ORDER BY created_at, id
    `).all(runId).map((row) => ({
      task_id: row.id,
      phase: row.phase,
      role: row.role,
      revision: row.revision,
      status: row.status,
      attempt: row.attempt_seq,
      lease_epoch: row.lease_epoch,
      lease_until: row.lease_until,
    }));
    const events = this.store.db.prepare(`
      SELECT seq, type, payload_json, created_at FROM events
      WHERE run_id = ? AND seq > ? ORDER BY seq LIMIT 100
    `).all(runId, cursor).map((row) => ({
      seq: row.seq,
      type: row.type,
      payload: parseJson(row.payload_json, 'events.payload_json'),
      created_at: row.created_at,
    }));
    return {
      run_id: run.id,
      workflow: run.workflow,
      revision: run.revision,
      status: run.status,
      input_ref: run.input_ref,
      input_digest: run.input_digest,
      pipeline_dir: run.pipeline_dir,
      workspace_root: run.workspace_root,
      device_ref: run.device_ref,
      agent: run.agent,
      tasks,
      events,
      next_cursor: events.length ? events.at(-1).seq : cursor,
      ...this.workflows.get(run.workflow)?.runStatus?.(run),
    };
  }

  insertTask({
    runId,
    workflow,
    phase,
    role,
    revision,
    inputDigest,
    pipelineDir,
    workspaceRoot,
    requiredCapabilities,
    status = 'queued',
    now,
  }) {
    this.initializeRun?.(runId);
    invariant(['queued', 'awaiting_consent', 'accepted'].includes(status),
      'invalid_task_status', `Cannot create a task with status ${status}.`);
    const taskId = taskIdentifier(runId, phase, revision);
    this.store.db.prepare(`
      INSERT INTO tasks(
        id, run_id, phase, role, revision, status, input_digest,
        context_ref, workspace_ref, output_ref, policy_ref,
        required_capabilities_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      runId,
      phase,
      role,
      revision,
      status,
      digest({ inputDigest, phase, revision }),
      `context:${runId}:${phase}:r${revision}`,
      workspaceRoot ? `workspace:${workspaceRoot}`
        : pipelineDir ? `pipeline:${pipelineDir}` : null,
      pipelineDir ? `pipeline-artifacts:${pipelineDir}:${phase}` : `artifact-area:${runId}:${phase}:1`,
      `policy:${workflow}:${phase}:v1`,
      JSON.stringify(requiredCapabilities),
      now,
      now,
    );
    return taskId;
  }

  #reapExpiredLeases(now) {
    const expired = this.store.db.prepare(`
      SELECT a.id AS attempt_id, a.lease_epoch, t.id AS task_id, t.run_id, r.workflow
      FROM attempts a JOIN tasks t ON t.id = a.task_id
      JOIN runs r ON r.id = t.run_id
      WHERE a.status IN ('leased', 'executing') AND a.lease_until < ?
    `).all(now);
    for (const item of expired) {
      this.store.db.prepare(`
        UPDATE attempts SET status = 'expired', updated_at = ?
        WHERE id = ? AND status IN ('leased', 'executing')
      `).run(now, item.attempt_id);
      const recoveredStatus = this.workflows.get(item.workflow)?.expiredLeaseStatus?.(item.run_id)
        ?? 'awaiting_host';
      const reset = this.store.db.prepare(`
        UPDATE tasks SET status = ?, lease_until = NULL, updated_at = ?
        WHERE id = ? AND lease_epoch = ? AND status IN ('leased', 'executing')
      `).run(recoveredStatus, now, item.task_id, item.lease_epoch);
      if (reset.changes > 0) {
        this.store.db.prepare(`
          UPDATE runs SET status = ?, updated_at = ?
          WHERE id = ? AND status NOT IN ('completed', 'cancelled')
        `).run(recoveredStatus, now, item.run_id);
        this.store.event(item.run_id, 'task.lease_expired', {
          task_id: item.task_id,
          attempt_id: item.attempt_id,
          lease_epoch: item.lease_epoch,
        }, now);
      }
    }
  }

  #authorizedAttempt(args) {
    const attemptId = expectId(args.attempt_id, 'attempt_id');
    const leaseEpoch = expectInteger(args.lease_epoch, 'lease_epoch', { min: 1 });
    const credential = expectString(args.task_credential, 'task_credential', { max: 512 });
    const attempt = this.store.db.prepare(`
      SELECT a.*, t.cancel_requested AS task_cancel_requested,
             t.revision AS task_revision, t.run_id
      FROM attempts a JOIN tasks t ON t.id = a.task_id WHERE a.id = ?
    `).get(attemptId);
    invariant(attempt, 'attempt_not_found', `Attempt ${attemptId} does not exist.`);
    invariant(attempt.lease_epoch === leaseEpoch, 'lease_lost',
      `Attempt ${attemptId} has lease epoch ${attempt.lease_epoch}, not ${leaseEpoch}.`);
    invariant(this.credentials.verify(credential, attemptId, leaseEpoch),
      'unauthorized_task', 'The task credential is invalid.');
    attempt.cancel_requested = Boolean(attempt.cancel_requested || attempt.task_cancel_requested);
    return attempt;
  }

  #attachCredential(result) {
    if (!result.attempt_id || !result.lease_epoch) return result;
    return {
      ...result,
      task_credential: this.credentials.issue(result.attempt_id, result.lease_epoch),
    };
  }

  #host(row) {
    return {
      binding_id: row.id,
      host_kind: row.host_kind,
      host_version: row.host_version,
      execution_mode: row.execution_mode,
      capabilities: parseJson(row.capabilities_json, 'host_bindings.capabilities_json'),
      capability_source: row.capability_source,
      enabled: Boolean(row.enabled),
      updated_at: row.updated_at,
    };
  }

  #now() {
    return this.clock().toISOString();
  }
}

function taskIdentifier(runId, phase, revision) {
  const candidate = `${runId}:${phase}:${revision}`;
  return candidate.length <= 128
    ? candidate
    : `task-${digest({ runId, phase, revision }).slice(7, 47)}`;
}
