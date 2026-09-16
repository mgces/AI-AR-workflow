import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { ProcessSupervisor } from '../../src/supervisor/process-supervisor.js';

const childScript = [
  "const { spawn } = require('node:child_process');",
  "const child = spawn('/bin/sleep', ['30']);",
  "process.stdout.write(String(child.pid) + '\\n');",
  'setInterval(() => {}, 1000);',
].join('');

test('ProcessSupervisor persists intent and terminates a process tree on cancellation', async () => {
  const db = new DatabaseSync(':memory:');
  const supervisor = new ProcessSupervisor({ db });
  const controller = new AbortController();
  const pending = supervisor.start({
    operationId: 'op-process-tree',
    command: process.execPath,
    args: ['-e', childScript],
    signal: controller.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const before = supervisor.inspect('op-process-tree');
  assert.equal(before.state, 'running');
  assert.equal(typeof before.pid, 'number');
  controller.abort();
  const result = await pending;
  assert.equal(result.aborted, true);
  const after = supervisor.inspect('op-process-tree');
  assert.equal(after.state, 'cancelled');
  assert.equal(after.exit_code, null);
  db.close();
});

test('ProcessSupervisor marks a live operation unknown after a supervisor restart', async () => {
  const db = new DatabaseSync(':memory:');
  const first = new ProcessSupervisor({ db });
  const pending = first.start({
    operationId: 'op-reconcile',
    command: process.execPath,
    args: ['-e', 'setInterval(() => {}, 1000);'],
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const second = new ProcessSupervisor({ db });
  const reconciled = await second.reconcile();
  assert.equal(reconciled.some((item) => item.operation_id === 'op-reconcile' && item.state === 'unknown'), true);
  assert.equal(second.inspect('op-reconcile').state, 'unknown');
  await first.cancel('op-reconcile');
  await pending;
  db.close();
});

test('ProcessSupervisor reaps a process left alive across restart before reconciliation', async () => {
  const db = new DatabaseSync(':memory:');
  const first = new ProcessSupervisor({ db });
  const pending = first.start({
    operationId: 'op-reap',
    command: process.execPath,
    args: ['-e', 'setInterval(() => {}, 1000);'],
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const pid = first.inspect('op-reap').pid;
  const second = new ProcessSupervisor({ db });
  const reconciled = await second.reconcile();
  assert.equal(reconciled.some((item) => item.operation_id === 'op-reap' && item.state === 'unknown'), true);
  await assert.doesNotReject(async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try { process.kill(pid, 0); } catch { return; }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`pid ${pid} was not reaped after reconciliation`);
  });
  await pending;
  db.close();
});

test('ProcessSupervisor waits for restart reconciliation to prove termination', async () => {
  const db = new DatabaseSync(':memory:');
  const first = new ProcessSupervisor({ db });
  const pending = first.start({
    operationId: 'op-reconcile-proof',
    command: process.execPath,
    args: ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);'],
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const pid = first.inspect('op-reconcile-proof').pid;
  const second = new ProcessSupervisor({ db });
  const started = Date.now();
  const reconciled = await second.reconcile({ graceMs: 25 });
  assert.equal(reconciled[0].state, 'unknown');
  assert.ok(Date.now() - started >= 20);
  assert.throws(() => process.kill(pid, 0));
  await pending;
  db.close();
});

test('ProcessSupervisor waits for termination proof before cancelling a post-restart operation', async () => {
  const db = new DatabaseSync(':memory:');
  const supervisor = new ProcessSupervisor({ db });
  const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);'], {
    detached: process.platform !== 'win32',
    stdio: 'ignore',
  });
  const childClosed = new Promise((resolve) => child.once('close', resolve));
  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO supervised_processes(
        operation_id, parent_operation_id, state, command, args_json, cwd,
        pid, pgid, created_at, updated_at
      ) VALUES (?, ?, 'running', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'op-cancel-after-restart', 'op-cancel-after-restart', process.execPath,
      JSON.stringify(['-e', 'signal-resistant']), process.cwd(), child.pid,
      process.platform === 'win32' ? null : child.pid, timestamp, timestamp,
    );
    const result = await supervisor.cancel('op-cancel-after-restart', { graceMs: 25 });
    assert.equal(result.status, 'cancelled');
    assert.equal(supervisor.inspect('op-cancel-after-restart').state, 'cancelled');
    await childClosed;
  } finally {
    try { child.kill('SIGKILL'); } catch { /* already gone */ }
    db.close();
  }
});

test('ProcessSupervisor exposes a redacted durable snapshot for gateway operations', async () => {
  const db = new DatabaseSync(':memory:');
  const supervisor = new ProcessSupervisor({ db });
  const pending = supervisor.start({
    operationId: 'op-snapshot',
    command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 500);'],
    metadata: { phase: 'P4', task_id: 'task-1' },
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const snapshot = supervisor.snapshot();
  assert.equal(snapshot.durable, true);
  assert.equal(snapshot.counts.running, 1);
  assert.equal(snapshot.operations[0].operation_id, 'op-snapshot');
  assert.equal(snapshot.operations[0].state, 'running');
  assert.equal(snapshot.operations[0].identity_verified, true);
  assert.equal('stdout' in snapshot.operations[0], false);
  assert.equal('args' in snapshot.operations[0], false);
  assert.deepEqual(snapshot.operations[0].metadata, { phase: 'P4', task_id: 'task-1' });
  await pending;
  db.close();
});

test('ProcessSupervisor forwards an explicit child environment without persisting it', async () => {
  const db = new DatabaseSync(':memory:');
  const supervisor = new ProcessSupervisor({ db });
  const result = await supervisor.start({
    operationId: 'op-explicit-env',
    command: process.execPath,
    args: ['-e', 'require("node:fs").writeFileSync(1, process.env.DSH_TEST_MARKER ?? "missing")'],
    env: { ...process.env, DSH_TEST_MARKER: 'forwarded' },
  });
  assert.equal(result.stdout, 'forwarded');
  const record = supervisor.inspect('op-explicit-env');
  assert.deepEqual(record.args, ['-e', 'require("node:fs").writeFileSync(1, process.env.DSH_TEST_MARKER ?? "missing")']);
  assert.equal(record.metadata.DSH_TEST_MARKER, undefined);
  assert.equal(record.state, 'completed');
  db.close();
});

test('ProcessSupervisor can run a private command without persisting argv contents', async () => {
  const db = new DatabaseSync(':memory:');
  const supervisor = new ProcessSupervisor({ db });
  const secret = 'prompt-with-user-code-and-private-token';
  const result = await supervisor.start({
    operationId: 'op-private-argv',
    command: process.execPath,
    args: ['-e', `process.stdout.write(${JSON.stringify(secret)})`],
    persistArgs: false,
  });
  assert.equal(result.stdout, secret);
  const record = supervisor.inspect('op-private-argv');
  assert.deepEqual(record.args, []);
  assert.equal(record.args_persisted, false);
  assert.match(record.args_digest, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(record).includes(secret), false);
  db.close();
});

test('ProcessSupervisor treats a fast child stdin EPIPE as a normal close', async () => {
  const supervisor = new ProcessSupervisor();
  const result = await supervisor.start({
    operationId: 'op-fast-stdin-close',
    command: '/bin/echo',
    args: ['fast-child'],
    input: 'the child exits before stdin is drained',
  });
  assert.equal(result.state, 'completed');
  assert.match(result.stdout, /fast-child/u);
});

test('ProcessSupervisor records best-effort cgroup isolation when the host has no delegated cgroup', async () => {
  const cgroupRoot = mkdtempSync(join(tmpdir(), 'dsh-cgroup-unavailable-'));
  const supervisor = new ProcessSupervisor({ cgroupMode: 'best_effort', cgroupRoot });
  const result = await supervisor.start({
    operationId: 'op-cgroup-best-effort',
    command: process.execPath,
    args: ['-e', 'process.stdout.write("ok")'],
  });
  assert.equal(result.state, 'completed');
  const record = supervisor.inspect('op-cgroup-best-effort');
  assert.equal(record.metadata.process_isolation.mode, 'best_effort');
  assert.equal(record.metadata.process_isolation.active, false);
  assert.equal(record.metadata.process_isolation.reason, 'cgroup_v2_unavailable');
  assert.equal(supervisor.snapshot().operations[0].process_isolation.active, false);
});

test('ProcessSupervisor required cgroup isolation fails closed before spawning a child', async () => {
  const cgroupRoot = mkdtempSync(join(tmpdir(), 'dsh-cgroup-required-'));
  const marker = join(cgroupRoot, 'spawned');
  const supervisor = new ProcessSupervisor({ cgroupMode: 'required', cgroupRoot });
  await assert.rejects(
    supervisor.start({
      operationId: 'op-cgroup-required',
      command: process.execPath,
      args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'yes')`],
    }),
    (error) => error.code === 'supervisor_isolation_unavailable',
  );
  assert.equal(supervisor.inspect('op-cgroup-required').state, 'failed');
  assert.equal(supervisor.inspect('op-cgroup-required').error.code, 'supervisor_isolation_unavailable');
  await assert.rejects(import('node:fs/promises').then(({ access }) => access(marker)));
});
