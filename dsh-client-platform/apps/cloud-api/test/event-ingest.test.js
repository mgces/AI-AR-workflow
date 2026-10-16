import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';

const api = await import('../src/server.js').catch(() => null);
const protocol = await import('../../../packages/contracts/src/run-event.js').catch(() => null);

async function start(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('cloud API exposes a durable event-ingest server factory', () => {
  assert.equal(typeof api?.createCloudApiServer, 'function');
});

test('event batches are authenticated, signed, contiguous, and idempotent', async (t) => {
  assert.equal(typeof api?.createCloudApiServer, 'function');
  assert.equal(typeof protocol?.createSignedRunEvent, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'dsh-client-cloud-'));
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const server = api.createCloudApiServer({
    databasePath: join(dir, 'cloud.sqlite3'),
    allowInsecureLocalUser: true,
    authenticateUser: async (request) => request.headers['x-user'] === 'other'
      ? { tenant_id: 'tenant-1', user_id: 'other-user', workspace_ids: ['workspace-other'] }
      : { tenant_id: 'tenant-1', user_id: 'reviewer-1', workspace_ids: ['workspace-1'] },
    authenticateDevice: async (request) => request.headers.authorization === 'Bearer test-device-token'
      ? { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1', key_id: 'device-key-1', public_key: publicKey }
      : null,
  });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await start(server);
  const portal = await fetch(origin);
  assert.equal(portal.status, 200);
  const page = await portal.text();
  assert.match(page, /DSH Cloud Console/u);
  assert.match(page, /待审核工作/u);
  assert.match(page, /reviewNote/u);
  assert.equal((await fetch(`${origin}/details.css`)).status, 200);
  const createEvent = (eventId, seq, type, payload = {}, workspaceId = 'workspace-1') => protocol.createSignedRunEvent({
    fields: {
      event_id: eventId, tenant_id: 'tenant-1', device_id: 'device-1',
      workspace_id: workspaceId, run_id: 'run-1', client_seq: seq,
      run_revision: seq, type, occurred_at: `2026-09-21T00:00:0${seq}.000Z`, payload,
    },
    privateKey,
    keyId: 'device-key-1',
  });
  const post = (events) => fetch(`${origin}/v1/devices/device-1/events:batch`, {
    method: 'POST',
    headers: { authorization: 'Bearer test-device-token', 'content-type': 'application/json' },
    body: JSON.stringify({ events }),
  });

  const first = createEvent('event-1', 1, 'run.created', { workflow_id: 'ar-delivery' });
  const accepted = await post([first]);
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).accepted_through_client_seq, 1);

  const duplicate = await post([first]);
  assert.equal(duplicate.status, 200);
  assert.deepEqual((await duplicate.json()).duplicate_event_ids, ['event-1']);

  const wrongWorkspace = await post([createEvent('event-other-workspace', 2, 'run.created',
    { workflow_id: 'ar-delivery' }, 'workspace-other')]);
  assert.equal(wrongWorkspace.status, 403);
  assert.equal((await wrongWorkspace.json()).error.code, 'event_workspace_mismatch');

  const untrustedFreeText = await post([{
    schema_version: 1, event_id: 'event-free-text', tenant_id: 'tenant-1', device_id: 'device-1',
    workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 2, run_revision: 2,
    type: 'run.created', occurred_at: new Date().toISOString(),
    payload: { workflow_id: 'ar-delivery', note: '/home/user/private source' },
  }]);
  assert.equal(untrustedFreeText.status, 400);
  assert.equal((await untrustedFreeText.json()).error.code, 'run_event_payload_unknown_field');

  const sensitive = await post([{
    schema_version: 1, event_id: 'event-private', tenant_id: 'tenant-1', device_id: 'device-1',
    workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 2, run_revision: 2,
    type: 'human.input_recorded', occurred_at: new Date().toISOString(),
    payload: { content: 'private prompt text' },
  }]);
  assert.equal(sensitive.status, 400);
  assert.equal((await sensitive.json()).error.code, 'event_payload_sensitive_field');

  const gap = await post([createEvent('event-3', 3, 'stage.started', { phase: 'P1' })]);
  assert.equal(gap.status, 409);
  assert.equal((await gap.json()).expected_next_client_seq, 2);

  const next = await post([createEvent('event-2', 2, 'stage.started', { phase: 'P0' })]);
  assert.equal(next.status, 200);
  assert.equal((await next.json()).accepted_through_client_seq, 2);

  const passed = await post([createEvent('event-4', 3, 'stage.gate_completed', {
    phase: 'P0', gate_id: 'environment_gate', status: 'passed', duration_ms: 1000,
  })]);
  assert.equal(passed.status, 200);
  const measured = await post([
    createEvent('event-5', 4, 'agent.execution_completed', {
      agent_id: 'claude-code', model_id: 'claude-sonnet-4', phase: 'P0', duration_ms: 2500,
      input_tokens: 120, output_tokens: 55, total_tokens: 175,
      usage_source: 'provider_reported', usage_complete: true,
    }),
    createEvent('event-6', 5, 'human.wait_started', { phase: 'P1', wait_id: 'wait-1', action_type: 'approve' }),
    createEvent('event-7', 6, 'human.wait_completed', {
      phase: 'P1', wait_id: 'wait-1', action_type: 'approve', actor_hash: 'a'.repeat(64),
    }),
    createEvent('event-8', 7, 'human.input_recorded', {
      action_type: 'input', actor_hash: 'b'.repeat(64), content_sha256: 'c'.repeat(64),
      content_bytes: 23, content_policy: 'metrics_only',
    }),
    createEvent('event-9', 8, 'human.input_recorded', {
      action_type: 'input', actor_hash: 'd'.repeat(64), content_sha256: 'e'.repeat(64),
      content_bytes: Buffer.byteLength('Please inspect the failing AR stage.'), content_policy: 'full_diagnostics', content_text: 'Please inspect the failing AR stage.',
    }),
  ]);
  assert.equal(measured.status, 200);
  const detail = await fetch(`${origin}/v1/runs/run-1?device_id=device-1`);
  assert.equal(detail.status, 200);
  const detailPayload = await detail.json();
  assert.equal(detailPayload.events.length, 8);
  assert.equal(detailPayload.events.find((event) => event.event_id === 'event-9').payload.content_text,
    'Please inspect the failing AR stage.');
  assert.equal(detailPayload.observability.stage_success_count, 1);
  assert.equal(detailPayload.observability.human_intervention_count, 1);
  assert.equal(detailPayload.observability.human_input_count, 2);
  assert.equal(detailPayload.observability.human_wait_duration_ms, 1000);
  assert.equal(detailPayload.observability.token_usage.total_tokens, 175);
  assert.equal(detailPayload.stages[0].phase, 'P0');
  assert.equal(detailPayload.stages[0].duration_ms, 1000);
  const deniedDetail = await fetch(`${origin}/v1/runs/run-1?device_id=device-1`, { headers: { 'x-user': 'other' } });
  assert.equal(deniedDetail.status, 404);

  const runs = await fetch(`${origin}/v1/runs`);
  assert.equal(runs.status, 200);
  const list = await runs.json();
  assert.equal(list.runs.length, 1);
  assert.equal(list.runs[0].run_id, 'run-1');

  const probeEvents = [
    protocol.createSignedRunEvent({ fields: {
      event_id: 'probe-env-event', tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1',
      run_id: '__connector_telemetry__', client_seq: 9, run_revision: 1, type: 'environment.probed',
      occurred_at: '2026-09-21T00:00:08.000Z', payload: { capability_id: 'hdc', status: 'blocked', reason_code: 'executable_not_found', duration_ms: 20 },
    }, privateKey, keyId: 'device-key-1' }),
    protocol.createSignedRunEvent({ fields: {
      event_id: 'probe-device-event', tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1',
      run_id: '__connector_telemetry__', client_seq: 10, run_revision: 1, type: 'device.probed',
      occurred_at: '2026-09-21T00:00:09.000Z', payload: { device_alias_hash: 'a'.repeat(64), product_family: 'openharmony', status: 'available', duration_ms: 30 },
    }, privateKey, keyId: 'device-key-1' }),
  ];
  assert.equal((await post(probeEvents)).status, 200);
  const probeRuns = await (await fetch(`${origin}/v1/runs`)).json();
  assert.equal(probeRuns.runs.some((run) => run.run_id === '__connector_telemetry__'), false);
  const probesResponse = await fetch(`${origin}/v1/probes`);
  assert.equal(probesResponse.status, 200);
  const probes = await probesResponse.json();
  assert.equal(probes.probes.length, 2);
  const environmentProbe = probes.probes.find((item) => item.type === 'environment.probed');
  assert.ok(environmentProbe);
  assert.equal(environmentProbe.payload.reason_code, 'executable_not_found');
  const deniedProbes = await fetch(`${origin}/v1/probes`, { headers: { 'x-user': 'other' } });
  assert.equal(deniedProbes.status, 200);
  assert.equal((await deniedProbes.json()).probes.length, 0);

  const unauthenticated = await fetch(`${origin}/v1/devices/device-1/events:batch`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [first] }),
  });
  assert.equal(unauthenticated.status, 401);
});

test('device APIs reject incomplete identities from a custom authenticator', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-client-cloud-bad-principal-'));
  const server = api.createCloudApiServer({
    databasePath: join(dir, 'cloud.sqlite3'),
    authenticateDevice: async () => ({ device_id: 'device-1' }),
  });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await start(server);
  const sync = await fetch(`${origin}/v1/devices/device-1/sync-state`, {
    headers: { authorization: 'Bearer custom-token' },
  });
  assert.equal(sync.status, 401);
  const heartbeat = await fetch(`${origin}/v1/devices/device-1/heartbeat`, {
    method: 'POST', headers: { authorization: 'Bearer custom-token', 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(heartbeat.status, 401);
});
