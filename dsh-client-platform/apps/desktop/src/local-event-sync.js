import { createHash, randomUUID } from 'node:crypto';
import { createSignedRunEvent } from '../../../packages/contracts/src/run-event.js';
import { mapLocalArEvent } from './local-event-mapper.js';

export async function enqueueLocalArEvents({
  listRuns, getRunStatus, outbox, identity, privateKey, keyId, includeHumanInputContent = false,
} = {}) {
  if (typeof listRuns !== 'function' || typeof getRunStatus !== 'function' || !outbox) {
    throw new TypeError('local run readers and durable outbox are required');
  }
  for (const field of ['tenant_id', 'device_id', 'workspace_id']) {
    if (typeof identity?.[field] !== 'string' || !identity[field].trim()) {
      throw Object.assign(new Error(`device ${field} is required to sync local workflow events`), { code: 'sync_identity_incomplete' });
    }
  }
  if (!privateKey || typeof keyId !== 'string' || !keyId) {
    throw Object.assign(new Error('device signing credentials are unavailable'), { code: 'sync_signer_unavailable' });
  }

  const catalog = await listRuns();
  let queued = 0;
  for (const run of Array.isArray(catalog?.runs) ? catalog.runs : []) {
    if (typeof run?.run_id !== 'string' || !run.run_id.trim()) continue;
    const sourceKey = `ar:${run.run_id}`;
    let cursor = await outbox.sourceCursor(sourceKey);
    while (true) {
      const status = await getRunStatus(run.run_id, cursor);
      const events = Array.isArray(status?.events) ? [...status.events].sort((left, right) => left.seq - right.seq) : [];
      if (events.length === 0) break;
      for (const sourceEvent of events) {
        const mapped = mapLocalArEvent(sourceEvent, {
          workflowId: 'ar-delivery', tasks: status.tasks, includeHumanInputContent: includeHumanInputContent === true,
        });
        if (!Number.isSafeInteger(sourceEvent.seq) || sourceEvent.seq < 1) {
          throw Object.assign(new Error('local AR runtime returned an invalid event cursor'), { code: 'sync_source_event_invalid' });
        }
        if (mapped) {
          const revision = Number.isSafeInteger(status.revision) && status.revision > 0
            ? status.revision
            : Number.isSafeInteger(run.revision) && run.revision > 0 ? run.revision : 1;
          const event = await outbox.enqueueSourceEvent(sourceKey, sourceEvent.seq, (clientSeq) => createSignedRunEvent({
            fields: {
              event_id: randomUUID(), tenant_id: identity.tenant_id,
              device_id: identity.device_id, workspace_id: identity.workspace_id,
              run_id: run.run_id, client_seq: clientSeq, run_revision: revision,
              type: mapped.type, occurred_at: mapped.occurred_at, payload: mapped.payload,
            },
            privateKey,
            keyId,
          }));
          if (event) queued += 1;
        } else {
          await outbox.advanceSourceCursor(sourceKey, sourceEvent.seq);
        }
        cursor = sourceEvent.seq;
      }
      if (events.length < 100) break;
    }
  }
  return queued;
}

function probeStatus(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (['available', 'ready', 'online', 'connected', 'pass'].includes(normalized)) return 'available';
  if (['blocked', 'unavailable', 'offline', 'failed', 'unreachable', 'incomplete', 'missing'].includes(normalized)) return 'blocked';
  return 'unknown';
}

function probeCode(value, fallback) {
  const normalized = String(value ?? '').toLowerCase().replace(/[^a-z0-9_]+/gu, '_').replace(/^_+|_+$/gu, '');
  return /^[a-z][a-z0-9_]{0,63}$/u.test(normalized) ? normalized : fallback;
}

function probeToken(value, fallback) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/u.test(value) ? value : fallback;
}

export async function enqueueLocalProbeEvents({ listProbes, outbox, identity, privateKey, keyId } = {}) {
  if (typeof listProbes !== 'function' || !outbox) throw new TypeError('probe reader and durable outbox are required');
  for (const field of ['tenant_id', 'device_id', 'workspace_id']) {
    if (typeof identity?.[field] !== 'string' || !identity[field].trim()) {
      throw Object.assign(new Error(`device ${field} is required to sync probe events`), { code: 'sync_identity_incomplete' });
    }
  }
  if (!privateKey || typeof keyId !== 'string' || !keyId) {
    throw Object.assign(new Error('device signing credentials are unavailable'), { code: 'sync_signer_unavailable' });
  }
  const catalog = await listProbes();
  let queued = 0;
  for (const probe of Array.isArray(catalog?.probes) ? catalog.probes : []) {
    if (!['environment', 'device'].includes(probe?.kind) || !Number.isSafeInteger(probe.seq) || probe.seq < 1) continue;
    const checkedAt = typeof probe.checked_at === 'string' && Number.isFinite(Date.parse(probe.checked_at))
      ? new Date(probe.checked_at).toISOString() : null;
    if (!checkedAt) continue;
    const sourceKey = `probe:${probe.kind}`;
    const cursor = await outbox.sourceCursor(sourceKey);
    if (probe.seq <= cursor) continue;
    if (probe.seq !== cursor + 1) {
      // Local retention can prune old history. Advance over the gap so current
      // telemetry keeps flowing; missing history is explicitly not fabricated.
      await outbox.advanceSourceCursor(sourceKey, probe.seq - 1);
    }
    const duration = Number.isSafeInteger(probe.duration_ms) && probe.duration_ms >= 0 ? probe.duration_ms : undefined;
    const payload = probe.kind === 'environment'
      ? {
          capability_id: probeToken(probe.capability_id, 'unknown'),
          status: probeStatus(probe.status),
          ...(probe.reason_code ? { reason_code: probeCode(probe.reason_code, 'probe_failed') } : {}),
          ...(duration === undefined ? {} : { duration_ms: duration }),
        }
      : {
          device_alias_hash: createHash('sha256').update(String(probe.device_alias ?? probe.device_id ?? 'unknown')).digest('hex'),
          product_family: ['openharmony', 'harmonyos'].includes(probe.product_family) ? probe.product_family : 'unknown',
          status: probeStatus(probe.status),
          ...(probe.reason_code ? { reason_code: probeCode(probe.reason_code, 'probe_failed') } : {}),
          ...(duration === undefined ? {} : { duration_ms: duration }),
        };
    const event = await outbox.enqueueSourceEvent(sourceKey, probe.seq, (clientSeq) => createSignedRunEvent({
      fields: {
        event_id: probe.id ?? randomUUID(), tenant_id: identity.tenant_id, device_id: identity.device_id,
        workspace_id: identity.workspace_id, run_id: '__connector_telemetry__', client_seq: clientSeq,
        run_revision: 1, type: probe.kind === 'environment' ? 'environment.probed' : 'device.probed',
        occurred_at: checkedAt, payload,
      }, privateKey, keyId,
    }));
    if (event) queued += 1;
  }
  return queued;
}


export async function syncLocalProbeEvents({ request, outbox, identity, privateKey, keyId, workspaceId = 'wsl-local' } = {}) {
  if (typeof request !== 'function') throw new TypeError('Local Core request function is required');
  if (typeof workspaceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(workspaceId)) {
    throw Object.assign(new Error('workspace id is invalid'), { code: 'sync_workspace_invalid' });
  }
  return enqueueLocalProbeEvents({
    listProbes: () => request('GET', `/api/observability/probes?workspace_id=${encodeURIComponent(workspaceId)}`),
    outbox, identity, privateKey, keyId,
  });
}
