import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

const sync = await import('../src/local-event-sync.js').catch(() => null);
const { DurableEventOutbox } = await import('../src/sync-outbox.js');
const { verifySignedRunEvent } = await import('../../../packages/contracts/src/run-event.js');

test('local AR event sync maps, signs, persists and deduplicates all safe runtime facts', async () => {
  assert.equal(typeof sync?.enqueueLocalArEvents, 'function');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const outbox = new DurableEventOutbox(':memory:');
  const sourceEvents = [
    { seq: 1, type: 'run.started', created_at: '2026-09-21T00:00:00.000Z', payload: { workflow: 'delivery', phase: 'P0' } },
    { seq: 2, type: 'task.claimed', created_at: '2026-09-21T00:00:01.000Z', payload: { task_id: 'task-p0' } },
    { seq: 3, type: 'human.input_recorded', created_at: '2026-09-21T00:00:02.000Z', payload: { actor: 'alice@example.com', content: 'private /home/alice/source description', kind: 'user_correction' } },
    { seq: 4, type: 'gate.passed', created_at: '2026-09-21T00:00:03.000Z', payload: { phase: 'P0', validation: 'P0 environment' } },
    { seq: 5, type: 'internal.debug', created_at: '2026-09-21T00:00:04.000Z', payload: { secret: 'never upload' } },
  ];
  const context = {
    outbox, privateKey, keyId: 'device-key-1',
    identity: { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1' },
    listRuns: async () => ({ runs: [{ run_id: 'run-1', revision: 2 }] }),
    getRunStatus: async (_runId, cursor) => ({
      revision: 2, tasks: [{ task_id: 'task-p0', phase: 'P0', attempt: 1 }],
      events: sourceEvents.filter((event) => event.seq > cursor),
    }),
  };

  assert.equal(await sync.enqueueLocalArEvents(context), 4);
  assert.equal(await outbox.sourceCursor('ar:run-1'), 5);
  const firstBatch = await outbox.pending();
  assert.deepEqual(firstBatch.map((event) => event.client_seq), [1, 2, 3, 4]);
  assert.deepEqual(firstBatch.map((event) => event.type), [
    'run.created', 'stage.started', 'human.input_recorded', 'stage.gate_completed',
  ]);
  for (const event of firstBatch) assert.equal(verifySignedRunEvent(event, publicKey), true);
  assert.equal(JSON.stringify(firstBatch).includes('/home/alice/source'), false);
  assert.equal(JSON.stringify(firstBatch).includes('alice@example.com'), false);
  assert.equal(await sync.enqueueLocalArEvents(context), 0);
  assert.equal((await outbox.pending()).length, 4);
});


test('local probe sync reads persisted workspace probes into the same signed durable outbox', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const outbox = new DurableEventOutbox(':memory:');
  const calls = [];
  const identity = { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'cloud-workspace-1' };
  const context = {
    request: async (method, path) => {
      calls.push([method, path]);
      return { probes: [
        { seq: 1, id: 'env-probe-1', kind: 'environment', checked_at: '2026-09-21T00:00:00.000Z', capability_id: 'hdc', status: 'blocked', reason_code: 'executable_not_found' },
        { seq: 1, id: 'device-probe-1', kind: 'device', checked_at: '2026-09-21T00:00:01.000Z', device_alias: 'device-secret-serial', product_family: 'openharmony', status: 'available' },
      ] };
    },
    outbox, identity, privateKey, keyId: 'device-key-1', workspaceId: 'wsl-local',
  };
  assert.equal(await sync.syncLocalProbeEvents(context), 2);
  assert.deepEqual(calls, [['GET', '/api/observability/probes?workspace_id=wsl-local']]);
  const events = await outbox.pending();
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.type), ['environment.probed', 'device.probed']);
  assert.ok(events.every((event) => event.run_id === '__connector_telemetry__'));
  assert.ok(events.every((event) => event.workspace_id === 'cloud-workspace-1'));
  assert.ok(events.every((event) => verifySignedRunEvent(event, publicKey)));
  assert.equal(JSON.stringify(events).includes('device-secret-serial'), false);
  assert.equal(await sync.syncLocalProbeEvents(context), 0);
  assert.equal((await outbox.pending()).length, 2);
});

test('human input bodies enter the signed outbox only when the explicit sync policy is enabled', async () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const outbox = new DurableEventOutbox(':memory:');
  const context = {
    outbox, privateKey, keyId: 'device-key-1',
    identity: { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1' },
    listRuns: async () => ({ runs: [{ run_id: 'run-private', revision: 1 }] }),
    getRunStatus: async () => ({ revision: 1, events: [
      { seq: 1, type: 'human.input_recorded', created_at: '2026-09-21T00:00:00.000Z', payload: { content: 'Private input body' } },
    ] }),
  };
  await sync.enqueueLocalArEvents(context);
  assert.equal((await outbox.pending())[0].payload.content_text, undefined);
  assert.equal((await outbox.pending())[0].payload.content_policy, 'metrics_only');

  const optedOutbox = new DurableEventOutbox(':memory:');
  await sync.enqueueLocalArEvents({ ...context, outbox: optedOutbox, includeHumanInputContent: true });
  assert.equal((await optedOutbox.pending())[0].payload.content_text, 'Private input body');
  assert.equal((await optedOutbox.pending())[0].payload.content_policy, 'full_diagnostics');
});
