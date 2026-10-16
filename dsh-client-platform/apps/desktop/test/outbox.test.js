import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const module = await import('../src/sync-outbox.js').catch(() => null);

test('durable event outbox preserves sequence across ack and restart', async (t) => {
  assert.equal(typeof module?.DurableEventOutbox, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'dsh-event-outbox-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'outbox.json');
  const first = new module.DurableEventOutbox(path);
  const firstEvent = await first.enqueue((seq) => ({ event_id: 'event-1', client_seq: seq }));
  assert.equal(firstEvent.client_seq, 1);
  await first.enqueue((seq) => ({ event_id: 'event-2', client_seq: seq }));

  const restarted = new module.DurableEventOutbox(path);
  assert.deepEqual((await restarted.pending()).map((event) => event.client_seq), [1, 2]);
  await restarted.acknowledge(1);
  const third = await restarted.enqueue((seq) => ({ event_id: 'event-3', client_seq: seq }));
  assert.equal(third.client_seq, 3);
  assert.deepEqual((await restarted.pending()).map((event) => event.client_seq), [2, 3]);
});

test('outbox rejects a cloud ACK beyond the highest allocated device sequence', async () => {
  assert.equal(typeof module?.DurableEventOutbox, 'function');
  const outbox = new module.DurableEventOutbox(':memory:');
  await assert.rejects(outbox.acknowledge(1), { code: 'sync_ack_invalid' });
});

test('outbox records source cursors atomically with mapped events and skips duplicate source events', async () => {
  const outbox = new module.DurableEventOutbox(':memory:');
  assert.equal(await outbox.sourceCursor('ar-run-1'), 0);
  const first = await outbox.enqueueSourceEvent('ar-run-1', 1, (seq) => ({ event_id: 'event-1', client_seq: seq }));
  assert.equal(first.client_seq, 1);
  assert.equal(await outbox.sourceCursor('ar-run-1'), 1);
  assert.equal(await outbox.enqueueSourceEvent('ar-run-1', 1, () => { throw new Error('must not rebuild acknowledged source'); }), null);
  await outbox.advanceSourceCursor('ar-run-1', 2);
  assert.equal(await outbox.sourceCursor('ar-run-1'), 2);
  assert.equal((await outbox.status()).next_client_seq, 2);
});
