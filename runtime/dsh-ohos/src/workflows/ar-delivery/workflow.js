import { ProtocolError, invariant } from '../../core/errors.js';
import { digest, expectId, expectInteger, expectObject, expectString, expectStringArray,
  optionalString, parseJson } from '../../core/validation.js';
import { deliveryPosition, deliveryStage, deliveryTaskInstructions, firstDeliveryStage,
  nextDeliveryStage } from './stages.js';
import { resourcesOverlap } from '../../core/resource-identity.js';

const EXCLUSIVE_CAPABILITIES = new Set(['workspace_write', 'build_execution', 'device_access', 'network_publish']);

export class DeliveryWorkflow {
  constructor({ store, taskController, adapter = null, failureHints, clock = () => new Date() }) {
    Object.assign(this, { store, taskController, adapter, failureHints, clock });
    this.runPrefix = 'dev';
    // A release is the credentialed owner's acknowledgement that it AND its
    // subprocesses stopped. Lease expiry alone never supplies that acknowledgement.
    this.allowExpiredOwnerRelease = true;
  }

  bootstrap(args) {
    return args.pipeline_dir
      ? (args.initial_phase ? deliveryStage(args.initial_phase) : firstDeliveryStage())
      : { phase: 'P0', role: 'environment-analyst' };
  }

  expiredLeaseStatus() { return 'needs_reconcile'; }

  onClaim(run, task, _args, { required }) {
    const exclusive = required.filter((capability) => EXCLUSIVE_CAPABILITIES.has(capability));
    if (exclusive.length > 0) {
      const blockers = this.store.db.prepare(`
        SELECT t.id AS task_id, t.run_id, t.required_capabilities_json,
               r.workspace_root, r.device_ref
        FROM attempts a JOIN tasks t ON t.id = a.task_id
        JOIN runs r ON r.id = t.run_id
        WHERE (a.status IN ('leased', 'executing') OR t.status = 'needs_reconcile') AND t.id != ?
      `).all(task.id).flatMap((row) => {
        const held = parseJson(row.required_capabilities_json,
          'tasks.required_capabilities_json');
        const overlap = exclusive.filter((capability) => {
          if (!held.includes(capability)
              && !(capability === 'workspace_write' && held.includes('build_execution'))
              && !(capability === 'build_execution' && held.includes('workspace_write'))) return false;
          if (capability === 'device_access') {
            return !run.device_ref || !row.device_ref || run.device_ref === row.device_ref;
          }
          return resourcesOverlap(run.workspace_root, row.workspace_root);
        });
        return overlap.length > 0 ? [{
          run_id: row.run_id, task_id: row.task_id, capabilities: overlap,
        }] : [];
      });
      invariant(blockers.length === 0, 'resource_busy',
        `Exclusive delivery resources are busy for task ${task.id}.`, { blockers });
    }
  }

  taskContext(row) {
    return { constraints: [
      ...(row.pipeline_dir ? deliveryTaskInstructions(row.phase, row.pipeline_dir) : []),
      'Before submit or release, stop and reap every subprocess you started. An expired lease does not prove that a build stopped.',
      'If your lease expires, stop work and release with the original credential; include all partial artifacts. Never start a second writer to recover an unknown process.',
    ] };
  }

  insertTask(args) {
    return this.taskController.insertTask({ workflow: 'delivery', ...args });
  }

  async start(raw, principal = 'parent') {
    invariant(this.adapter, 'delivery_adapter_unavailable',
      'The Python AR delivery adapter is not configured.');
    const args = expectObject(raw);
    const inputRef = expectString(args.input_ref, 'input_ref', { max: 4096 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const skills = args.skills === undefined
      ? [] : expectStringArray(args.skills, 'skills', { max: 50 });
    invariant(args.confirm_defaults === undefined || typeof args.confirm_defaults === 'boolean',
      'invalid_input', 'confirm_defaults must be a boolean.');
    const payload = {
      input_ref: inputRef,
      ar_path: optionalString(args.ar_path, 'ar_path', { max: 4096 }),
      ar_text: optionalString(args.ar_text, 'ar_text', { max: 1_000_000 }),
      pipeline_dir: optionalString(args.pipeline_dir, 'pipeline_dir', { max: 4096 }),
      repo_root: optionalString(args.repo_root, 'repo_root', { max: 4096 }),
      environment: optionalString(args.environment, 'environment', { max: 64 }),
      component_type: optionalString(args.component_type, 'component_type', { max: 64 }),
      device_type: optionalString(args.device_type, 'device_type', { max: 256 }),
      device_serial: optionalString(args.device_serial, 'device_serial', { max: 256 }),
      git_dir: optionalString(args.git_dir, 'git_dir', { max: 4096 }),
      build_target: optionalString(args.build_target, 'build_target', { max: 512 }),
      part: optionalString(args.part, 'part', { max: 512 }),
      base_commit: optionalString(args.base_commit, 'base_commit', { max: 256 }),
      agent: optionalString(args.agent, 'agent', { max: 128 }),
      model: optionalString(args.model, 'model', { max: 256 }),
      confirm_defaults: args.confirm_defaults === true,
      skills,
    };
    invariant(payload.pipeline_dir || payload.repo_root, 'invalid_input',
      'pipeline_dir or repo_root is required.');
    const payloadDigest = digest(payload);
    const previous = this.store.getOperation(principal, 'start_delivery',
      idempotencyKey, payloadDigest);
    if (previous) return previous;

    let runId = args.run_id === undefined
      ? `dev-${digest({ idempotencyKey, payload }).slice(7, 31)}`
      : expectId(args.run_id, 'run_id');
    const initialized = await this.adapter.initialize({
      ...payload,
      run_id: runId,
    });
    const pythonRunId = expectId(initialized.pipeline_run_id, 'adapter.pipeline_run_id');
    if (args.run_id !== undefined) {
      invariant(pythonRunId === runId, 'pipeline_conflict',
        `Python pipeline belongs to ${pythonRunId}, not ${runId}.`);
    }
    runId = pythonRunId;
    const pipelineDir = expectString(initialized.pipeline_dir,
      'adapter.pipeline_dir', { max: 4096 });
    const aligned = await this.#alignPythonPipeline(pipelineDir, initialized);
    const persistedRun = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
    if (persistedRun) {
      invariant(persistedRun.workflow === 'delivery'
          && persistedRun.pipeline_dir === pipelineDir,
      'pipeline_conflict', `Run ${runId} is already bound to another workflow or pipeline.`);
      const recovered = await this.sync({
        run_id: runId,
        idempotency_key: `start-recover-${digest({ runId, payloadDigest }).slice(7, 31)}`,
      }, principal);
      return this.store.transaction(() => {
        const replay = this.store.getOperation(principal, 'start_delivery',
          idempotencyKey, payloadDigest);
        if (replay) return replay;
        const enriched = {
          ...recovered,
          workflow: 'delivery',
          pipeline_dir: pipelineDir,
          python_state: recovered.python_state ?? aligned.state,
        };
        this.store.saveOperation(principal, 'start_delivery', idempotencyKey,
          payloadDigest, enriched, this.#now());
        return enriched;
      });
    }
    const internalKey = `delivery-${digest({ runId, payloadDigest }).slice(7, 31)}`;
    const result = this.taskController.createRun({
      workflow: 'delivery',
      run_id: runId,
      input_ref: inputRef,
      docs_root: pipelineDir,
      environment_profile: initialized.environment ?? payload.environment ?? undefined,
      pipeline_dir: pipelineDir,
      workspace_root: initialized.repo_root ?? payload.repo_root ?? undefined,
      device_ref: initialized.device_serial ?? payload.device_serial ?? undefined,
      agent: payload.agent,
      initial_phase: aligned.position.stage?.key,
      initial_status: aligned.position.status === 'awaiting_consent'
        ? 'awaiting_consent' : 'queued',
      completed: aligned.position.complete,
      idempotency_key: internalKey,
    }, principal);
    return this.store.transaction(() => {
      const replay = this.store.getOperation(principal, 'start_delivery',
        idempotencyKey, payloadDigest);
      if (replay) return replay;
      const enriched = {
        ...result,
        pipeline_dir: pipelineDir,
        python_state: aligned.state,
      };
      this.store.saveOperation(principal, 'start_delivery', idempotencyKey,
        payloadDigest, enriched, this.#now());
      return enriched;
    });
  }

  async sync(raw, principal = 'parent') {
    invariant(this.adapter, 'delivery_adapter_unavailable',
      'The Python AR delivery adapter is not configured.');
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payloadDigest = digest({ runId });
    const previous = this.store.getOperation(principal, 'sync_delivery',
      idempotencyKey, payloadDigest);
    if (previous) return previous;

    const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
    invariant(run && run.workflow === 'delivery', 'run_not_found',
      `Delivery run ${runId} does not exist.`);
    invariant(run.pipeline_dir, 'delivery_pipeline_missing',
      `Delivery run ${runId} is not bound to a Python pipeline.`);
    const uncertain = this.store.db.prepare(`SELECT t.id FROM tasks t JOIN attempts a ON a.task_id=t.id
      WHERE t.run_id=? AND a.lease_epoch=t.lease_epoch AND
        a.status IN ('leased','executing','expired') LIMIT 1`).get(runId);
    if (uncertain) return { status: 'needs_reconcile', run_id: runId,
      reason: 'Confirm the previous writer stopped and release its attempt before synchronizing.' };
    const inspected = await this.adapter.inspect(run.pipeline_dir);
    const aligned = await this.#alignPythonPipeline(run.pipeline_dir, inspected);

    return this.store.transaction(() => {
      const currentRun = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
      const tasks = this.store.db.prepare(`
        SELECT * FROM tasks WHERE run_id = ? ORDER BY created_at, id
      `).all(runId);
      const active = tasks.find((task) => !['accepted', 'cancelled'].includes(task.status));
      const now = this.#now();

      if (aligned.position.complete) {
        this.store.db.prepare(`
          UPDATE tasks SET status = 'accepted', lease_until = NULL, updated_at = ?
          WHERE run_id = ? AND status != 'cancelled'
        `).run(now, runId);
        this.store.db.prepare(`
          UPDATE attempts SET status = 'accepted', updated_at = ?
          WHERE task_id IN (SELECT id FROM tasks WHERE run_id = ?)
            AND status NOT IN ('rejected', 'released')
        `).run(now, runId);
        this.store.db.prepare(`UPDATE runs SET status = 'completed', updated_at = ? WHERE id = ?`)
          .run(now, runId);
        const result = {
          status: 'completed', run_id: runId, next: null, python_state: aligned.state,
        };
        this.store.event(runId, 'delivery.synced', { status: 'completed' }, now);
        this.store.saveOperation(principal, 'sync_delivery', idempotencyKey,
          payloadDigest, result, now);
        return result;
      }

      const desired = aligned.position.stage;
      const desiredStatus = aligned.position.status;
      let revision = currentRun.revision;
      let desiredTask = tasks.find((task) => task.phase === desired.key
        && !['accepted', 'cancelled'].includes(task.status));
      const activeIndex = active ? deliveryStage(active.phase).index : null;

      if (!active || activeIndex > desired.index) {
        revision += 1;
        for (const task of tasks) {
          if (deliveryStage(task.phase).index >= desired.index && task.status !== 'cancelled') {
            this.store.db.prepare(`UPDATE tasks SET status = 'cancelled', lease_until = NULL, updated_at = ? WHERE id = ?`)
              .run(now, task.id);
            this.store.db.prepare(`UPDATE attempts SET status = 'superseded', updated_at = ? WHERE task_id = ? AND status NOT IN ('rejected', 'released')`)
              .run(now, task.id);
          }
        }
        desiredTask = null;
      } else if (activeIndex < desired.index) {
        this.store.db.prepare(`UPDATE tasks SET status = 'accepted', lease_until = NULL, updated_at = ? WHERE id = ?`)
          .run(now, active.id);
        this.store.db.prepare(`UPDATE attempts SET status = 'accepted', updated_at = ? WHERE task_id = ? AND status NOT IN ('rejected', 'released')`)
          .run(now, active.id);
        for (let index = activeIndex + 1; index < desired.index; index += 1) {
          const stage = deliveryStageByIndex(index);
          const existing = tasks.find((task) => task.phase === stage.key
            && !['cancelled'].includes(task.status));
          if (!existing) {
            this.insertTask({
              runId, phase: stage.key, role: stage.role, revision,
              inputDigest: currentRun.input_digest, pipelineDir: currentRun.pipeline_dir,
              workspaceRoot: currentRun.workspace_root,
              requiredCapabilities: stage.capabilities, status: 'accepted', now,
            });
          }
        }
        desiredTask = tasks.find((task) => task.phase === desired.key
          && !['accepted', 'cancelled'].includes(task.status));
      }

      if (!desiredTask) {
        const taskId = this.insertTask({
          runId, phase: desired.key, role: desired.role, revision,
          inputDigest: currentRun.input_digest, pipelineDir: currentRun.pipeline_dir,
          workspaceRoot: currentRun.workspace_root,
          requiredCapabilities: desired.capabilities, status: desiredStatus, now,
        });
        desiredTask = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      } else if (!['leased', 'executing'].includes(desiredTask.status)
          || desiredStatus === 'awaiting_consent') {
        const priorStatus = desiredTask.status;
        this.store.db.prepare(`UPDATE tasks SET status = ?, lease_until = NULL, updated_at = ? WHERE id = ?`)
          .run(desiredStatus, now, desiredTask.id);
        if (desiredStatus === 'awaiting_consent') {
          this.store.db.prepare(`UPDATE attempts SET status = 'validated', updated_at = ? WHERE task_id = ? AND status NOT IN ('rejected', 'released')`)
            .run(now, desiredTask.id);
        } else if (['validating', 'validation_running', 'consent_running', 'awaiting_consent']
          .includes(priorStatus)) {
          this.store.db.prepare(`UPDATE attempts SET status = 'superseded', updated_at = ? WHERE task_id = ? AND status NOT IN ('rejected', 'released')`)
            .run(now, desiredTask.id);
        }
      }

      const runStatus = desiredStatus === 'awaiting_consent'
        ? 'awaiting_consent' : ['leased', 'executing'].includes(desiredTask.status)
          ? 'working' : 'awaiting_host';
      this.store.db.prepare(`UPDATE runs SET status = ?, revision = ?, updated_at = ? WHERE id = ?`)
        .run(runStatus, revision, now, runId);
      const result = {
        status: runStatus,
        run_id: runId,
        revision,
        python_state: aligned.state,
        next: {
          status: desiredStatus === 'awaiting_consent' ? 'needs_input' : 'dispatch_needed',
          task_id: desiredTask.id,
          phase: desired.key,
          role: desired.role,
          expected_revision: revision,
          ...(desiredStatus === 'awaiting_consent'
            ? { consent_phase: desired.phaseNumber } : {}),
        },
      };
      this.store.event(runId, 'delivery.synced', {
        status: runStatus, phase: desired.key, task_id: desiredTask.id, revision,
      }, now);
      this.store.saveOperation(principal, 'sync_delivery', idempotencyKey,
        payloadDigest, result, now);
      return result;
    });
  }

  async validate(raw, principal = 'parent') {
    invariant(this.adapter, 'delivery_adapter_unavailable',
      'The Python AR delivery adapter is not configured.');
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const taskId = expectId(args.task_id, 'task_id');
    const expectedRevision = expectInteger(args.expected_revision,
      'expected_revision', { min: 1 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payload = { runId, taskId, expectedRevision };
    const payloadDigest = digest(payload);
    const previous = this.store.getOperation(principal, 'validate_delivery',
      idempotencyKey, payloadDigest);
    if (previous) return previous;

    const snapshot = this.store.transaction(() => {
      const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
      invariant(run && run.workflow === 'delivery', 'run_not_found',
        `Delivery run ${runId} does not exist.`);
      invariant(run.pipeline_dir, 'delivery_pipeline_missing',
        `Delivery run ${runId} is not bound to a Python pipeline.`);
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ? AND run_id = ?')
        .get(taskId, runId);
      invariant(task, 'task_not_found', `Task ${taskId} does not exist in ${runId}.`);
      invariant(task.revision === expectedRevision, 'stale_revision',
        `Task ${taskId} is at revision ${task.revision}, not ${expectedRevision}.`);
      invariant(task.status === 'validating', 'task_not_validating',
        `Task ${taskId} is ${task.status}, not validating.`);
      const stage = deliveryStage(task.phase);
      const now = this.#now();
      this.store.db.prepare(`UPDATE tasks SET status = 'validation_running', updated_at = ? WHERE id = ?`)
        .run(now, taskId);
      this.store.db.prepare(`UPDATE runs SET status = 'validating', updated_at = ? WHERE id = ?`)
        .run(now, runId);
      return { run, task, stage };
    });

    let pythonResult;
    try {
      if (snapshot.stage.validation === 'upload-precheck') {
        pythonResult = await this.adapter.validateGate(
          snapshot.run.pipeline_dir, snapshot.stage.phaseNumber, { uploadPrecheck: true });
      } else if (snapshot.stage.consent) {
        pythonResult = await this.adapter.validateGate(
          snapshot.run.pipeline_dir, snapshot.stage.phaseNumber);
      } else {
        pythonResult = await this.adapter.advance(
          snapshot.run.pipeline_dir, snapshot.stage.phaseNumber);
      }
    } catch (error) {
      if (error instanceof ProtocolError && error.code === 'delivery_gate_rejected') {
        return this.#rejectDeliveryValidation({
          principal, idempotencyKey, payloadDigest, runId, taskId,
          expectedRevision, error,
        });
      }
      this.store.transaction(() => {
        this.store.db.prepare(`UPDATE tasks SET status = 'validating', updated_at = ? WHERE id = ?`)
          .run(this.#now(), taskId);
      });
      throw error;
    }

    return this.store.transaction(() => {
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      invariant(task?.status === 'validation_running', 'external_state_unknown',
        `Task ${taskId} changed while Python validation was running.`);
      const now = this.#now();
      let result;
      if (snapshot.stage.consent) {
        this.store.db.prepare(`UPDATE tasks SET status = 'awaiting_consent', updated_at = ? WHERE id = ?`)
          .run(now, taskId);
        this.store.db.prepare(`UPDATE attempts SET status = 'validated', updated_at = ? WHERE task_id = ? AND status = 'produced'`)
          .run(now, taskId);
        this.store.db.prepare(`UPDATE runs SET status = 'awaiting_consent', updated_at = ? WHERE id = ?`)
          .run(now, runId);
        this.store.event(runId, 'task.awaiting_consent', {
          task_id: taskId,
          phase: snapshot.stage.key,
          evidence: pythonResult.entry ?? null,
        }, now);
        result = {
          status: 'needs_input',
          reason: 'human_consent_required',
          run_id: runId,
          task_id: taskId,
          phase: snapshot.stage.key,
          consent_phase: snapshot.stage.phaseNumber,
          evidence: pythonResult.entry ?? null,
        };
      } else {
        result = this.#acceptDeliveryTask(snapshot.run, task, snapshot.stage, now, pythonResult);
      }
      this.store.saveOperation(principal, 'validate_delivery', idempotencyKey,
        payloadDigest, result, now);
      return result;
    });
  }

  async consent(raw, principal = 'parent') {
    invariant(this.adapter, 'delivery_adapter_unavailable',
      'The Python AR delivery adapter is not configured.');
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const taskId = expectId(args.task_id, 'task_id');
    const phase = expectInteger(args.phase, 'phase', { min: 0, max: 8 });
    const token = expectString(args.token, 'token', { max: 1024 });
    const idempotencyKey = expectId(args.idempotency_key, 'idempotency_key');
    const payload = { runId, taskId, phase, token };
    const payloadDigest = digest(payload);
    const previous = this.store.getOperation(principal, 'consent_delivery',
      idempotencyKey, payloadDigest);
    if (previous) return previous;

    const snapshot = this.store.transaction(() => {
      const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
      invariant(run && run.workflow === 'delivery', 'run_not_found',
        `Delivery run ${runId} does not exist.`);
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ? AND run_id = ?')
        .get(taskId, runId);
      invariant(task, 'task_not_found', `Task ${taskId} does not exist in ${runId}.`);
      const stage = deliveryStage(task.phase);
      invariant(stage.consent && stage.phaseNumber === phase, 'invalid_consent_phase',
        `Task ${taskId} does not await consent for P${phase}.`);
      invariant(task.status === 'awaiting_consent', 'task_not_awaiting_consent',
        `Task ${taskId} is ${task.status}, not awaiting_consent.`);
      this.store.db.prepare(`UPDATE tasks SET status = 'consent_running', updated_at = ? WHERE id = ?`)
        .run(this.#now(), taskId);
      return { run, task, stage };
    });

    try {
      await this.adapter.consent(snapshot.run.pipeline_dir, phase, token);
      if (snapshot.stage.validation !== 'upload-precheck') {
        await this.adapter.advance(snapshot.run.pipeline_dir, phase);
      }
    } catch (error) {
      this.store.transaction(() => {
        this.store.db.prepare(`UPDATE tasks SET status = 'awaiting_consent', updated_at = ? WHERE id = ?`)
          .run(this.#now(), taskId);
      });
      throw error;
    }

    return this.store.transaction(() => {
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      invariant(task?.status === 'consent_running', 'external_state_unknown',
        `Task ${taskId} changed while consent was being recorded.`);
      const now = this.#now();
      const result = this.#acceptDeliveryTask(snapshot.run, task, snapshot.stage, now, {
        consent_recorded: true,
      });
      this.store.saveOperation(principal, 'consent_delivery', idempotencyKey,
        payloadDigest, result, now);
      return result;
    });
  }

  async #alignPythonPipeline(pipelineDir, initialState) {
    let state = initialState;
    for (let step = 0; step < 10; step += 1) {
      const position = deliveryPosition(state);
      if (position.status !== 'ready_to_advance') return { state, position };
      state = await this.adapter.advance(pipelineDir, position.stage.phaseNumber);
    }
    throw new ProtocolError('python_state_mismatch',
      'Python delivery state did not converge after advancing all delivery phases.');
  }

  #acceptDeliveryTask(runSnapshot, task, stage, now, pythonResult) {
    this.store.db.prepare(`UPDATE tasks SET status = 'accepted', lease_until = NULL, updated_at = ? WHERE id = ?`)
      .run(now, task.id);
    this.store.db.prepare(`
      UPDATE attempts SET status = 'accepted', updated_at = ?
      WHERE task_id = ? AND status IN ('produced', 'validated')
    `).run(now, task.id);
    const next = nextDeliveryStage(stage.key);
    if (!next) {
      this.store.db.prepare(`UPDATE runs SET status = 'completed', updated_at = ? WHERE id = ?`)
        .run(now, runSnapshot.id);
      this.store.event(runSnapshot.id, 'run.completed', {
        task_id: task.id,
        phase: stage.key,
      }, now);
      return {
        status: 'completed',
        run_id: runSnapshot.id,
        task_id: task.id,
        phase: stage.key,
        python_state: pythonResult,
      };
    }

    const nextTaskId = this.insertTask({
      runId: runSnapshot.id,
      phase: next.key,
      role: next.role,
      revision: runSnapshot.revision,
      inputDigest: runSnapshot.input_digest,
      pipelineDir: runSnapshot.pipeline_dir,
      workspaceRoot: runSnapshot.workspace_root,
      requiredCapabilities: next.capabilities,
      now,
    });
    this.store.db.prepare(`UPDATE runs SET status = 'awaiting_host', updated_at = ? WHERE id = ?`)
      .run(now, runSnapshot.id);
    this.store.event(runSnapshot.id, 'task.accepted', {
      task_id: task.id,
      phase: stage.key,
      next_task_id: nextTaskId,
      next_phase: next.key,
    }, now);
    return {
      status: 'dispatch_needed',
      run_id: runSnapshot.id,
      accepted_task_id: task.id,
      accepted_phase: stage.key,
      python_state: pythonResult,
      next: {
        status: 'dispatch_needed',
        task_id: nextTaskId,
        phase: next.key,
        role: next.role,
        expected_revision: runSnapshot.revision,
      },
    };
  }

  #rejectDeliveryValidation({
    principal,
    idempotencyKey,
    payloadDigest,
    runId,
    taskId,
    expectedRevision,
    error,
  }) {
    return this.store.transaction(() => {
      const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      invariant(task?.status === 'validation_running', 'external_state_unknown',
        `Task ${taskId} changed while validation failed.`);
      const nextRevision = expectedRevision + 1;
      const now = this.#now();
      this.store.db.prepare(`
        UPDATE tasks SET status = 'queued', revision = ?, lease_until = NULL, updated_at = ?
        WHERE id = ?
      `).run(nextRevision, now, taskId);
      this.store.db.prepare(`
        UPDATE attempts SET status = 'rejected', updated_at = ?
        WHERE task_id = ? AND status = 'produced'
      `).run(now, taskId);
      this.store.db.prepare(`
        UPDATE runs SET status = 'awaiting_host', revision = ?, updated_at = ? WHERE id = ?
      `).run(nextRevision, now, runId);
      const result = {
        status: 'needs_repair',
        ...(this.failureHints ? { diagnostic: this.failureHints(runId, task.phase, error) } : {}),
        reason: error.message,
        details: error.details,
        run_id: runId,
        task_id: taskId,
        phase: task.phase,
        revision: nextRevision,
        next: {
          status: 'dispatch_needed',
          task_id: taskId,
          phase: task.phase,
          role: task.role,
          expected_revision: nextRevision,
        },
      };
      this.store.event(runId, 'task.validation_rejected', {
        task_id: taskId,
        phase: task.phase,
        revision: nextRevision,
        reason: error.message,
      }, now);
      this.store.saveOperation(principal, 'validate_delivery', idempotencyKey,
        payloadDigest, result, now);
      return result;
    });
  }

  #now() {
    return this.clock().toISOString();
  }
}

function deliveryStageByIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 9) {
    throw new ProtocolError('invalid_delivery_stage', `Unknown delivery stage index: ${index}`);
  }
  if (index < 8) return deliveryStage(`P${index}`);
  return deliveryStage(index === 8 ? 'P8-precheck' : 'P8-publish');
}
