import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { DurableResourceLockStore } from '../../src/supervisor/resource-locks.js';

test('durable resource locks serialize owners and require the lease owner to release', async () => {
  const db = new DatabaseSync(':memory:');
  const firstStore = new DurableResourceLockStore({ db, ownerNamespace: 'scheduler' });
  const secondStore = new DurableResourceLockStore({ db, ownerNamespace: 'gateway' });
  const first = await firstStore.acquire({ resourceKey: '/workspace/project', runId: 'run-1', attemptId: 'attempt-1' });
  await assert.rejects(
    secondStore.acquire({ resourceKey: '/workspace/project', runId: 'run-2', attemptId: 'attempt-2' }),
    (error) => error.code === 'resource_busy' && error.details.owner_run_id === 'run-1',
  );
  assert.equal((await firstStore.list()).length, 1);
  await assert.rejects(firstStore.release({ ...first, token: 'wrong-token' }), { code: 'resource_lock_owner_mismatch' });
  await first.renew();
  await first.release();
  const second = await secondStore.acquire({ resourceKey: '/workspace/project', runId: 'run-2', attemptId: 'attempt-2' });
  assert.equal(second.owner_run_id, 'run-2');
  await second.release();
  db.close();
});

test('the same operation can recover its persisted lock after a process restart', async () => {
  const db = new DatabaseSync(':memory:');
  const original = new DurableResourceLockStore({ db, ownerNamespace: 'scheduler' });
  const first = await original.acquire({ resourceKey: 'workspace-a', runId: 'run-1', attemptId: 'attempt-1' });
  const restarted = new DurableResourceLockStore({ db, ownerNamespace: 'scheduler' });
  const recovered = await restarted.acquire({ resourceKey: 'workspace-a', runId: 'run-1', attemptId: 'attempt-1', token: first.token });
  assert.equal(recovered.token, first.token);
  await recovered.release();
  db.close();
});

test('reconciliation can release only locks owned by the recovered run namespace', async () => {
  const db = new DatabaseSync(':memory:');
  const scheduler = new DurableResourceLockStore({ db, ownerNamespace: 'scheduler' });
  const gateway = new DurableResourceLockStore({ db, ownerNamespace: 'gateway' });
  await scheduler.acquire({ resourceKey: 'workspace-a', runId: 'run-1', attemptId: 'attempt-1' });
  await scheduler.acquire({ resourceKey: 'workspace-b', runId: 'run-2', attemptId: 'attempt-2' });
  await gateway.acquire({ resourceKey: 'workspace-c', runId: 'run-1', attemptId: 'attempt-3' });
  const result = await scheduler.releaseForRun('run-1');
  assert.equal(result.released, 1);
  assert.deepEqual((await scheduler.list()).map((item) => item.resource_key), ['workspace-b']);
  assert.deepEqual((await gateway.list()).map((item) => item.resource_key), ['workspace-c']);
  db.close();
});
