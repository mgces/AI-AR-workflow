import { randomUUID } from 'node:crypto';
import { DurableResourceLockStore } from '../../../../workspace-gateway/src/supervisor/resource-locks.js';

const TERMINAL_JOB_STATES = new Set(['completed', 'failed', 'cancelled', 'blocked', 'needs_repair']);
const WAITING_JOB_STATES = new Set(['awaiting_consent', 'needs_reconcile']);
const ARTIFACT_ROOTS = new Set(['evidence', 'reports', 'controls']);

function clone(value) {
  return structuredClone(value);
}

function timestamp(clock) {
  return clock().toISOString();
}

function errorInfo(error) {
  return {
    code: error?.code ?? 'scheduler_error',
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? {},
  };
}

function assertArtifactRefs(value) {
  if (!Array.isArray(value) || value.length === 0
      || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw Object.assign(new Error('CodeAgent must return at least one artifact reference'), {
      code: 'agent_artifacts_missing',
    });
  }
  const refs = value.map((item) => item.trim().replaceAll('\\', '/'));
  if (refs.some((item) => item.startsWith('/') || item.includes('\0')
      || item.split('/').some((part) => part === '..')
      || !ARTIFACT_ROOTS.has(item.split('/')[0])
      || item.endsWith('/'))) {
    throw Object.assign(new Error('CodeAgent returned an artifact reference outside the permitted artifact roots'), {
      code: 'agent_artifact_invalid',
      details: { allowed_roots: [...ARTIFACT_ROOTS] },
    });
  }
  return [...new Set(refs)];
}

/**
 * Durable single-writer scheduler for the AR delivery graph.
 *
 * The scheduler owns only dispatch. Runtime state, leases, gate verdicts and
 * consent remain authoritative in ArRuntimeService. A provider adapter must
 * return artifact references; a zero-artifact response is rejected and the
 * lease is released so a model cannot accidentally advance a phase.
 */
export class ArDeliveryScheduler {
  constructor({
    service,
    resolveAgent,
    executor,
    resourceLocks = undefined,
    hostBindingId = 'dsh-scheduler-host',
    heartbeatIntervalMs = 30_000,
    maxSteps = 64,
    clock = () => new Date(),
  } = {}) {
    if (!service) throw new TypeError('service is required');
    if (!executor || typeof executor.run !== 'function') {
      throw new TypeError('executor.run is required');
    }
    this.service = service;
    this.resolveAgent = resolveAgent ?? (async (id) => ({ id, name: id, available: true, dispatchable: true }));
    this.executor = executor;
    this.hostBindingId = hostBindingId;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.maxSteps = maxSteps;
    this.clock = clock;
    this.jobs = new Map();
    this.active = new Map();
    this.waiters = new Map();
    this.closed = false;
    this.db = service.runtime?.store?.db ?? null;
    this.resourceLocks = resourceLocks === undefined
      ? new DurableResourceLockStore({ db: this.db, ownerNamespace: 'scheduler' })
      : resourceLocks;
    if (this.resourceLocks !== null && (!this.resourceLocks || typeof this.resourceLocks.acquire !== 'function')) {
      throw new TypeError('resourceLocks must expose acquire');
    }
    this.#ensurePersistence();
    this.#loadPersistedJobs();
  }

  /** Start a run and asynchronously dispatch it until a gate needs a person. */
  async start(input) {
    if (this.closed) {
      throw Object.assign(new Error('scheduler is closed'), { code: 'scheduler_closed' });
    }
    const result = await this.service.start(input);
    const runId = result.run_id;
    const current = this.jobs.get(runId);
    const job = current ?? {
      run_id: runId,
      agent: input?.agent ?? result.agent ?? null,
      model: input?.model ?? result.model ?? null,
      status: 'queued',
      created_at: timestamp(this.clock),
      updated_at: timestamp(this.clock),
      attempts: 0,
      last_error: null,
      active_attempt_id: null,
      cancel_requested: false,
      cancel_reason: null,
    };
    if (input?.agent !== undefined) job.agent = input.agent;
    if (input?.model !== undefined) job.model = input.model;
    if (job.status !== 'completed') job.status = 'queued';
    job.updated_at = timestamp(this.clock);
    this.jobs.set(runId, job);
    this.#persist(job);
    this.#schedule(runId);
    return { ...result, scheduler: { status: 'queued', run_id: runId } };
  }

  /** Apply a human decision, then continue the same durable run. */
  async consent(input) {
    const result = await this.service.consent(input);
    const job = this.#ensureJob(input.runId ?? input.run_id);
    job.cancel_requested = false;
    job.status = result.status === 'completed' ? 'completed' : 'queued';
    job.last_error = null;
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    if (result.status !== 'completed') this.#schedule(job.run_id);
    this.#notify(job);
    return result;
  }

  /** Resume a run after a repair, reconciliation or process restart. */
  async resume(runId) {
    const job = this.#ensureJob(runId);
    if (this.closed) throw Object.assign(new Error('scheduler is closed'), { code: 'scheduler_closed' });
    // A terminal job notifies waiters from #finish before the dispatch promise
    // has run its final cleanup. Wait for that tiny hand-off so an immediate
    // browser/API resume cannot enqueue a second run behind a stale `active`
    // entry.
    const active = this.active.get(runId);
    if (active) await active.promise.catch(() => {});
    if (typeof this.service.sync === 'function') {
      try {
        const synced = await this.service.sync(runId);
        if (synced?.status === 'needs_reconcile') {
          return this.#pause(job, 'needs_reconcile', {
            code: 'needs_reconcile',
            message: synced.reason ?? 'Runtime requires reconciliation before resume.',
          });
        }
      } catch (error) {
        return this.#pause(job, 'needs_reconcile', errorInfo(error));
      }
      if (!this.active.has(runId) && typeof this.resourceLocks?.releaseForRun === 'function') {
        try {
          await this.resourceLocks.releaseForRun(runId);
        } catch (error) {
          return this.#pause(job, 'needs_reconcile', {
            code: 'resource_lock_reconcile_failed',
            message: error?.message ?? String(error),
            details: error?.details ?? {},
          });
        }
      }
    }
    job.cancel_requested = false;
    job.status = 'queued';
    job.last_error = null;
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    this.#schedule(runId);
    return this.job(runId);
  }

  /** Abort a provider process and release its lease. */
  async cancel(runId, reason = 'cancelled by user') {
    const job = this.#ensureJob(runId);
    if (['completed', 'cancelled'].includes(job.status)) return this.job(runId);
    const normalizedReason = typeof reason === 'string' && reason.trim() !== ''
      ? reason.trim().slice(0, 1024) : 'cancelled by user';
    job.cancel_requested = true;
    job.cancel_reason = normalizedReason;
    job.status = 'cancelling';
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    const active = this.active.get(runId);
    if (active && typeof this.service.requestCancel === 'function') {
      try {
        await this.service.requestCancel({ runId, reason: normalizedReason });
      } catch (error) {
        job.last_error = errorInfo(error);
        job.updated_at = timestamp(this.clock);
        this.#persist(job);
      }
    }
    active?.controller.abort(Object.assign(new Error(normalizedReason), { code: 'cancel_requested' }));
    if (!active) {
      try {
        const result = await this.service.cancel?.({ runId, reason: normalizedReason });
        if (result?.status === 'needs_reconcile' || result?.status === 'cancelling') {
          return this.#pause(job, 'needs_reconcile', {
            code: 'cancel_pending',
            message: 'Runtime has not confirmed cancellation; reconcile before resuming.',
          });
        }
        this.#finish(job, 'cancelled');
      } catch (error) {
        return this.#pause(job, 'needs_reconcile', errorInfo(error));
      }
    }
    return this.job(runId);
  }

  job(runId) {
    const job = this.jobs.get(runId);
    return job ? clone(job) : null;
  }

  listJobs() {
    return [...this.jobs.values()].sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map((job) => clone(job));
  }

  /** Wait until dispatch pauses or reaches a terminal state. */
  async waitForIdle(runId, { timeoutMs = 120_000 } = {}) {
    const job = this.jobs.get(runId);
    if (job && (TERMINAL_JOB_STATES.has(job.status) || WAITING_JOB_STATES.has(job.status))) {
      return this.job(runId);
    }
    let waiter;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#removeWaiter(runId, waiter);
        reject(Object.assign(new Error(`scheduler did not become idle for ${runId}`), {
          code: 'scheduler_timeout',
        }));
      }, timeoutMs);
      waiter = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const bucket = this.waiters.get(runId) ?? new Set();
      bucket.add(waiter);
      this.waiters.set(runId, bucket);
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const active of this.active.values()) active.controller.abort();
  }

  #ensurePersistence() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_jobs (
        run_id TEXT PRIMARY KEY,
        agent TEXT,
        model TEXT,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        active_attempt_id TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        cancel_reason TEXT,
        last_error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    const columns = this.db.prepare('PRAGMA table_info(scheduler_jobs)').all();
    if (!columns.some((column) => column.name === 'cancel_reason')) {
      this.db.exec('ALTER TABLE scheduler_jobs ADD COLUMN cancel_reason TEXT');
    }
    if (!columns.some((column) => column.name === 'model')) {
      this.db.exec('ALTER TABLE scheduler_jobs ADD COLUMN model TEXT');
    }
  }

  #loadPersistedJobs() {
    if (!this.db) return;
    const rows = this.db.prepare('SELECT * FROM scheduler_jobs ORDER BY updated_at DESC').all();
    for (const row of rows) {
      let lastError = null;
      if (row.last_error_json) {
        try {
          const parsed = JSON.parse(row.last_error_json);
          lastError = parsed && typeof parsed === 'object' ? parsed : {
            code: 'scheduler_state_corrupt', message: 'persisted scheduler error is not an object', details: {},
          };
        } catch (error) {
          // A damaged diagnostic must not prevent the scheduler from starting
          // and recovering the durable run. Keep an explicit machine-readable
          // marker so operators can repair the state instead of losing it.
          lastError = {
            code: 'scheduler_state_corrupt',
            message: 'persisted scheduler error could not be parsed',
            details: { cause: error.message },
          };
        }
      }
      const job = {
        run_id: row.run_id,
        agent: row.agent,
        model: row.model ?? null,
        status: row.status === 'running' || row.status === 'cancelling' ? 'queued' : row.status,
        attempts: row.attempts,
        active_attempt_id: null,
        cancel_requested: Boolean(row.cancel_requested),
        cancel_reason: row.cancel_reason ?? null,
        last_error: lastError,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      this.jobs.set(job.run_id, job);
      if (job.status === 'queued' && !job.cancel_requested) this.#schedule(job.run_id);
    }
  }

  #persist(job) {
    if (!this.db) return;
    this.db.prepare(`
      INSERT INTO scheduler_jobs(
        run_id, agent, model, status, attempts, active_attempt_id,
        cancel_requested, cancel_reason, last_error_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        agent = excluded.agent,
        model = excluded.model,
        status = excluded.status,
        attempts = excluded.attempts,
        active_attempt_id = excluded.active_attempt_id,
        cancel_requested = excluded.cancel_requested,
        cancel_reason = excluded.cancel_reason,
        last_error_json = excluded.last_error_json,
        updated_at = excluded.updated_at
    `).run(
      job.run_id, job.agent, job.model ?? null, job.status, job.attempts, job.active_attempt_id,
      job.cancel_requested ? 1 : 0, job.cancel_reason ?? null,
      job.last_error ? JSON.stringify(job.last_error) : null,
      job.created_at, job.updated_at,
    );
  }

  #ensureJob(runId) {
    if (typeof runId !== 'string' || runId.length === 0) {
      throw Object.assign(new Error('run_id is required'), { code: 'invalid_input' });
    }
    const job = this.jobs.get(runId);
    if (!job) throw Object.assign(new Error(`scheduler job ${runId} does not exist`), { code: 'scheduler_job_not_found' });
    return job;
  }

  #schedule(runId) {
    if (this.closed) return;
    if (this.active.has(runId)) return;
    const controller = new AbortController();
    const promise = this.#run(runId, controller)
      .catch((error) => this.#fail(runId, error))
      .finally(() => {
        this.active.delete(runId);
        const job = this.jobs.get(runId);
        if (job?.status === 'running') {
          job.status = 'queued';
          job.active_attempt_id = null;
          job.updated_at = timestamp(this.clock);
          this.#persist(job);
        }
        this.#notify(job);
      });
    this.active.set(runId, { controller, promise });
  }

  async #run(runId, controller) {
    const job = this.#ensureJob(runId);
    job.status = 'running';
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    let claim = null;
    let producedRefs = [];
    let usageRecorded = false;
    let pendingValidation = null;
    try {
      for (let step = 0; step < this.maxSteps; step += 1) {
        if (job.cancel_requested || (controller.signal.aborted && !this.closed)) {
          throw Object.assign(new Error('scheduler cancellation requested'), { code: 'cancel_requested' });
        }
        if (this.closed && controller.signal.aborted) {
          throw Object.assign(new Error('scheduler stopped before completing the task'), { code: 'scheduler_shutdown' });
        }
        const status = await this.service.status(runId);
        if (status.status === 'completed') return this.#finish(job, 'completed');
        if (['cancelled', 'closed'].includes(status.status)) return this.#finish(job, 'cancelled');
        const current = (status.tasks ?? []).find((task) => !['accepted', 'cancelled', 'superseded'].includes(task.status));
        if (!current) {
          return this.#pause(job, 'blocked', { code: 'no_dispatchable_task', message: 'No active task is available.' });
        }
        if (current.status === 'awaiting_consent' || status.status === 'awaiting_consent') {
          return this.#finish(job, 'awaiting_consent');
        }
        if (current.status === 'needs_reconcile' || status.status === 'needs_reconcile') {
          return this.#pause(job, 'needs_reconcile', {
            code: 'needs_reconcile',
            message: 'Runtime requires reconciliation before another CodeAgent attempt.',
            details: { task_id: current.task_id, task_status: current.status, run_status: status.status },
          });
        }
        if (['leased', 'executing', 'validating', 'validation_running', 'consent_running'].includes(current.status)
            || ['working', 'validating', 'validation_running', 'consent_running'].includes(status.status)) {
          return this.#pause(job, 'needs_reconcile', {
            code: 'active_runtime_state',
            message: `Runtime task ${current.task_id} is ${current.status}; reconcile it before dispatching again.`,
            details: { task_id: current.task_id, task_status: current.status, run_status: status.status },
          });
        }
        if (!['queued', 'awaiting_host'].includes(current.status)) {
          return this.#pause(job, 'blocked', {
            code: 'task_owned_by_other_worker',
            message: `Task ${current.task_id} is already ${current.status}.`,
          });
        }

        const definition = await this.resolveAgent(job.agent ?? status.agent, job.model ?? status.model);
        if (!definition || definition.available === false || definition.dispatchable === false) {
          throw Object.assign(new Error(`${definition?.name ?? job.agent ?? 'CodeAgent'} is not dispatchable`), {
            code: 'codeagent_adapter_unavailable',
            details: { agent: job.agent ?? status.agent ?? null },
          });
        }
        claim = await this.service.claim({
          runId,
          role: current.role,
          expectedRevision: current.revision ?? status.revision,
          contextId: `scheduler:${runId}:${current.task_id}:${randomUUID()}`,
        });
        job.attempts += 1;
        job.active_attempt_id = claim.attempt_id;
        job.updated_at = timestamp(this.clock);
        this.#persist(job);
        const context = await this.service.context(claim);
        const resourceKey = typeof context?.workspace_root === 'string' && context.workspace_root.trim() !== ''
          ? context.workspace_root.trim()
          : (typeof context?.pipeline_dir === 'string' && context.pipeline_dir.trim() !== '' ? context.pipeline_dir.trim() : null);
        let resourceLock = null;
        let heartbeat = null;
        let produced;
        usageRecorded = false;
        const submittedClaim = claim;
        try {
          if (resourceKey && this.resourceLocks) {
            resourceLock = await this.resourceLocks.acquire({
              resourceKey,
              runId,
              attemptId: claim.attempt_id,
              metadata: { task_id: claim.task_id, phase: claim.phase, agent: definition.id ?? null },
            });
          }
          heartbeat = this.#startHeartbeat(claim, controller);
          try {
            produced = await this.executor.run({
              definition,
              context,
              claim,
              runId,
              signal: controller.signal,
            });
            producedRefs = assertArtifactRefs(produced?.artifactRefs ?? produced?.artifact_refs);
            if (typeof this.service.recordUsage === 'function') {
              await this.service.recordUsage({
                runId,
                attemptId: claim.attempt_id,
                phase: claim.phase,
                agent: definition.id ?? null,
                provider: produced?.invocation?.provider ?? definition.provider ?? null,
                model: produced?.invocation?.model ?? definition.model ?? null,
                usage: produced?.usage ?? null,
                durationMs: Number.isFinite(produced?.durationMs) ? produced.durationMs : null,
                status: 'completed',
              });
              usageRecorded = true;
            }
            const summary = typeof produced?.summary === 'string' && produced.summary.trim() !== ''
              ? produced.summary.trim().slice(0, 4096)
              : `${claim.phase} CodeAgent execution completed.`;
            await this.service.submit({
              attemptId: claim.attempt_id,
              leaseEpoch: claim.lease_epoch,
              taskCredential: claim.task_credential,
              revision: claim.revision,
              artifactRefs: producedRefs,
              summary,
            });
            claim = null;
            producedRefs = [];
            pendingValidation = submittedClaim;
          } finally {
            // The runtime lease is no longer owned after submit, so stop
            // heartbeats while the deterministic gate evaluates the artifacts.
            heartbeat?.stop();
          }
          // Keep the workspace lock through validation so another scheduler
          // cannot start a conflicting build while the gate is still reading it.
          const validation = await this.service.validate({
            runId,
            taskId: submittedClaim.task_id,
            expectedRevision: submittedClaim.revision,
          });
          pendingValidation = null;
          if (validation.status === 'completed') return this.#finish(job, 'completed');
          if (validation.status === 'needs_input') return this.#finish(job, 'awaiting_consent');
          if (validation.status === 'needs_repair') {
            return this.#pause(job, 'needs_repair', {
              code: 'deterministic_gate_rejected',
              message: validation.reason ?? 'The deterministic gate rejected the candidate.',
              details: validation.diagnostic ?? {},
            });
          }
          if (validation.status !== 'dispatch_needed') {
            return this.#pause(job, 'blocked', {
              code: 'unexpected_validation_status',
              message: `Unexpected validation result: ${validation.status ?? 'unknown'}.`,
            });
          }
        } finally {
          await resourceLock?.release();
        }
      }
      return this.#pause(job, 'blocked', {
        code: 'scheduler_step_limit',
        message: `Scheduler stopped after ${this.maxSteps} task transitions.`,
      });
    } catch (error) {
      if (!usageRecorded && claim && typeof this.service.recordUsage === 'function') {
        try {
          await this.service.recordUsage({
            runId,
            attemptId: claim.attempt_id,
            phase: claim.phase,
            agent: job.agent ?? null,
            model: job.model ?? null,
            usage: error?.usage ?? null,
            durationMs: Number.isSafeInteger(error?.durationMs) ? error.durationMs : null,
            status: error?.code === 'cancel_requested' || error?.code === 'codeagent_cancelled' ? 'cancelled' : 'failed',
          });
        } catch {
          // Usage is best-effort; lease and authoritative runtime state remain primary.
        }
      }
      if (claim) {
        const partialRefs = Array.isArray(error?.artifactRefs) ? this.#safeArtifactRefs(error.artifactRefs) : producedRefs;
        await this.#releaseAfterFailure(claim, partialRefs, error);
        claim = null;
      }
      if (pendingValidation) {
        await this.#recordFailure(runId, error, {
          taskId: pendingValidation.task_id,
          phase: pendingValidation.phase,
          attemptId: pendingValidation.attempt_id,
        });
        return this.#pause(job, 'needs_reconcile', {
          code: 'validation_interrupted',
          message: errorInfo(error).message,
          details: { task_id: pendingValidation.task_id, phase: pendingValidation.phase ?? null },
        });
      }
      if (this.closed && controller.signal.aborted && !job.cancel_requested) {
        return this.#pause(job, 'queued', {
          code: 'scheduler_shutdown',
          message: 'Scheduler stopped; the run remains queued for a later scheduler instance.',
        });
      }
      if (error?.code === 'cancel_requested' || job.cancel_requested || (controller.signal.aborted && !this.closed)) {
        return this.#finalizeCancellation(job, error);
      }
      throw error;
    }
  }

  #startHeartbeat(claim, controller) {
    let stopped = false;
    const beat = async () => {
      if (stopped || controller.signal.aborted) return;
      try {
        const result = await this.service.heartbeat(claim);
        if (result?.status === 'cancel_requested' || result?.status === 'lease_lost') controller.abort();
      } catch {
        controller.abort();
      }
    };
    const timer = setInterval(beat, this.heartbeatIntervalMs);
    return { stop() { stopped = true; clearInterval(timer); } };
  }

  async #releaseAfterFailure(claim, artifactRefs, error) {
    try {
      await this.service.release({
        attemptId: claim.attempt_id,
        leaseEpoch: claim.lease_epoch,
        taskCredential: claim.task_credential,
        reason: errorInfo(error).message,
        artifactRefs,
      });
    } catch {
      // The original failure is the actionable result. Runtime reconciliation
      // remains authoritative if the owner could not release its lease.
    }
  }

  #safeArtifactRefs(value) {
    try {
      return assertArtifactRefs(value);
    } catch {
      return [];
    }
  }

  async #finalizeCancellation(job, error) {
    try {
      const result = await this.service.cancel?.({
        runId: job.run_id,
        reason: job.cancel_reason ?? error?.message ?? 'cancelled by user',
      });
      if (result?.status === 'needs_reconcile' || result?.status === 'cancelling') {
        return this.#pause(job, 'needs_reconcile', {
          code: 'cancel_pending',
          message: 'Runtime has not confirmed cancellation; reconcile before resuming.',
        });
      }
      return this.#finish(job, 'cancelled');
    } catch (cancelError) {
      return this.#pause(job, 'needs_reconcile', {
        code: 'cancel_finalize_failed',
        message: cancelError instanceof Error ? cancelError.message : String(cancelError),
        details: cancelError?.details ?? {},
      });
    }
  }

  #finish(job, status) {
    job.status = status;
    job.active_attempt_id = null;
    job.last_error = null;
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    this.#notify(job);
    return this.job(job.run_id);
  }

  #pause(job, status, error = null) {
    job.status = status;
    job.active_attempt_id = null;
    job.last_error = error;
    job.updated_at = timestamp(this.clock);
    this.#persist(job);
    this.#notify(job);
    return this.job(job.run_id);
  }

  async #fail(runId, error) {
    const job = this.jobs.get(runId);
    if (!job) return null;
    if (job.cancel_requested || error?.code === 'cancel_requested') return this.#finish(job, 'cancelled');
    // Preserve the concrete attempt that failed.  Without it a replay after a
    // scheduler restart can only be keyed by a mutable error string and may
    // create duplicate failure events for one CodeAgent attempt.
    await this.#recordFailure(runId, error, { attemptId: job.active_attempt_id });
    return this.#pause(job, 'failed', errorInfo(error));
  }

  async #recordFailure(runId, error, context = {}) {
    if (typeof this.service.recordSchedulerFailure !== 'function') return;
    try {
      await this.service.recordSchedulerFailure({ runId, error, ...context });
    } catch {
      // Observability must never hide the authoritative scheduler outcome.
    }
  }

  #notify(job) {
    if (!job || !(TERMINAL_JOB_STATES.has(job.status) || WAITING_JOB_STATES.has(job.status))) return;
    const bucket = this.waiters.get(job.run_id);
    if (!bucket) return;
    this.waiters.delete(job.run_id);
    for (const waiter of bucket) waiter(this.job(job.run_id));
  }

  #removeWaiter(runId, waiter) {
    const bucket = this.waiters.get(runId);
    if (!bucket) return;
    bucket.delete(waiter);
    if (bucket.size === 0) this.waiters.delete(runId);
  }
}
