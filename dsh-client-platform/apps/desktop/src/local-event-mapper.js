import { createHash } from 'node:crypto';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/u;

function hash(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function safePhase(value) {
  const match = /^P[0-8]$/u.exec(String(value ?? '').toUpperCase());
  return match?.[0] ?? null;
}

function safeId(value, fallback) {
  return typeof value === 'string' && TOKEN.test(value) ? value : fallback;
}

function safeCode(value, fallback) {
  const normalized = String(value ?? '').toLowerCase().replace(/[^a-z0-9_]+/gu, '_').replace(/^_+|_+$/gu, '');
  return /^[a-z][a-z0-9_]{0,63}$/u.test(normalized) ? normalized : fallback;
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function actorHash(value) {
  return typeof value === 'string' && value.trim() ? hash(value.trim().toLowerCase()) : null;
}

function actionType(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (['approve', 'approved', 'accept'].includes(normalized)) return 'approve';
  if (['reject', 'rejected', 'return'].includes(normalized)) return 'reject';
  if (normalized === 'cancel') return 'cancel';
  return 'input';
}

function eventResult(type, payload, event) {
  return {
    type,
    payload,
    occurred_at: typeof event.created_at === 'string' && Number.isFinite(Date.parse(event.created_at))
      ? event.created_at : new Date().toISOString(),
  };
}

function findTask(event, tasks) {
  const taskId = event.payload?.task_id;
  return Array.isArray(tasks) ? tasks.find((task) => task.task_id === taskId) ?? null : null;
}

export function mapLocalArEvent(event, { workflowId = 'ar-delivery', tasks = [], includeHumanInputContent = false } = {}) {
  if (!event || !Number.isSafeInteger(event.seq) || event.seq < 1 || typeof event.type !== 'string') return null;
  const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload : {};
  const task = findTask(event, tasks);
  const phase = safePhase(payload.phase ?? task?.phase);

  switch (event.type) {
    case 'run.started':
    case 'run.attached_complete':
      return eventResult('run.created', {
        workflow_id: safeId(workflowId, 'ar-delivery'),
        status: event.type === 'run.attached_complete' ? 'completed' : 'running',
        data_policy: 'metrics_only',
      }, event);
    case 'task.claimed':
      return phase ? eventResult('stage.started', {
        phase,
        ...(count(task?.attempt) === null ? {} : { attempt: count(task.attempt) }),
      }, event) : null;
    case 'task.produced':
      return phase ? eventResult('stage.task_submitted', {
        phase,
        task_id: safeId(payload.task_id, `task-${hash(event.seq).slice(0, 20)}`),
        artifact_refs: Array.isArray(payload.artifact_refs)
          ? payload.artifact_refs.filter((item) => typeof item === 'string' && /^artifact:sha256:[a-f0-9]{64}$/u.test(item)).slice(0, 100)
          : [],
      }, event) : null;
    case 'gate.passed':
      return phase ? eventResult('stage.gate_completed', {
        phase, gate_id: 'delivery_gate', status: 'passed',
      }, event) : null;
    case 'task.validation_rejected':
      return phase ? eventResult('stage.gate_completed', {
        phase, gate_id: 'delivery_gate', status: 'failed',
        failure_class: safeCode(payload.failure_class, 'gate_rejected'),
        reason_code: 'gate_rejected',
      }, event) : null;
    case 'task.awaiting_consent':
      return phase ? eventResult('human.wait_started', {
        phase, wait_id: safeId(payload.wait_id, `wait-${hash(event.seq).slice(0, 24)}`), action_type: 'approve',
      }, event) : null;
    case 'human.action_recorded':
      return phase ? eventResult('human.wait_completed', {
        phase, wait_id: safeId(payload.wait_id, `wait-${hash(event.seq).slice(0, 24)}`),
        action_type: actionType(payload.decision),
        ...(actorHash(payload.actor) ? { actor_hash: actorHash(payload.actor) } : {}),
      }, event) : null;
    case 'human.input_recorded': {
      if (typeof payload.content !== 'string') return null;
      const mapped = {
        action_type: 'input', content_sha256: hash(payload.content),
        content_bytes: Buffer.byteLength(payload.content, 'utf8'),
        content_policy: includeHumanInputContent ? 'full_diagnostics' : 'metrics_only',
        ...(actorHash(payload.actor) ? { actor_hash: actorHash(payload.actor) } : {}),
      };
      if (includeHumanInputContent) {
        let contentText = '';
        let bytes = 0;
        for (const character of payload.content) {
          const size = Buffer.byteLength(character, 'utf8');
          if (bytes + size > 16 * 1024) break;
          contentText += character;
          bytes += size;
        }
        mapped.content_text = contentText;
      }
      return eventResult('human.input_recorded', mapped, event);
    }
    case 'task.usage_reported': {
      const usage = payload.usage && typeof payload.usage === 'object' ? payload.usage : {};
      const input = count(usage.input_tokens);
      const output = count(usage.output_tokens);
      const total = count(usage.total_tokens) ?? (input !== null && output !== null ? input + output : null);
      const mapped = {
        agent_id: safeId(payload.agent, 'unknown'),
        usage_source: usage.status === 'complete' ? 'provider_reported' : 'agent_reported',
        usage_complete: usage.status === 'complete',
      };
      if (safePhase(payload.phase)) mapped.phase = safePhase(payload.phase);
      if (safeId(payload.model, null)) mapped.model_id = safeId(payload.model, null);
      if (count(payload.duration_ms) !== null) mapped.duration_ms = count(payload.duration_ms);
      if (input !== null) mapped.input_tokens = input;
      if (output !== null) mapped.output_tokens = output;
      if (total !== null) mapped.total_tokens = total;
      return eventResult('agent.execution_completed', mapped, event);
    }
    case 'scheduler.failed':
      return phase ? eventResult('stage.blocked', {
        phase, failure_class: safeCode(payload.code, 'scheduler_error'), reason_code: 'scheduler_failed',
      }, event) : eventResult('run.failed', {
        workflow_id: safeId(workflowId, 'ar-delivery'), status: 'failed',
        failure_class: safeCode(payload.code, 'scheduler_error'), reason_code: 'scheduler_failed',
      }, event);
    case 'run.completed':
      return eventResult('run.completed', { workflow_id: safeId(workflowId, 'ar-delivery'), status: 'completed' }, event);
    case 'run.cancelled':
      return eventResult('run.cancelled', { workflow_id: safeId(workflowId, 'ar-delivery'), status: 'cancelled' }, event);
    default:
      return null;
  }
}
