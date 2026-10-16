import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';
import { createDshRuntimeSupervisor } from '../src/dsh-runtime-supervisor.js';

const node = process.execPath;

async function fakeLauncher(directory) {
  const path = join(directory, 'fake-dsh-sidecar.mjs');
  await writeFile(path, `
    import { createInterface } from 'node:readline';
    const output = (value) => process.stdout.write(JSON.stringify(value) + '\\n');
    output({ type: 'ready', protocol_version: 1 });
    const input = createInterface({ input: process.stdin });
    input.on('line', (line) => {
      const request = JSON.parse(line);
      if (request.type === 'run') output({ type: 'result', id: request.id, result: { final_response: request.prompt, session_id: request.session_id } });
      else if (request.type === 'shutdown') { output({ type: 'stopped', id: request.id }); process.exit(0); }
      else if (request.type === 'cancel') output({ type: 'error', id: request.id, error: { code: 'codeagent_cancelled', message: 'cancelled' } });
    });
  `);
  return path;
}

test('DSH runtime supervisor starts a fixed argv process and returns an authenticated-session result', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-sidecar-test-'));
  const launcher = await fakeLauncher(directory);
  const supervisor = createDshRuntimeSupervisor({ nodeExecutable: node, launcherPath: launcher, cwd: directory });
  afterCloseAndRemove(t, () => supervisor.close(), directory);
  const value = await supervisor.run({
    provider_id: 'claude-code', model: 'claude-sonnet-4', session_id: 'session-1', prompt: 'phase prompt',
  });
  assert.equal(value.final_response, 'phase prompt');
  assert.equal(value.session_id, 'session-1');
});

test('DSH runtime supervisor sends cancellation to the sidecar and settles the caller', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-sidecar-cancel-'));
  const launcher = await fakeLauncher(directory);
  const supervisor = createDshRuntimeSupervisor({ nodeExecutable: node, launcherPath: launcher, cwd: directory });
  afterCloseAndRemove(t, () => supervisor.close(), directory);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(supervisor.run({
    provider_id: 'codex', model: 'native-default', session_id: 'session-2', prompt: 'cancel me', signal: controller.signal,
  }), { code: 'codeagent_cancelled' });
});
