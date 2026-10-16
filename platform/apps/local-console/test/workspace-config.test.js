import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalRunStore } from '../src/store.js';

test('reopening with a different selected source updates only the managed default workspace', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workspace-config-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const runtimeRoot = process.cwd();
  const stateFile = join(directory, 'state.json');
  const firstRoot = join(directory, 'source-one');
  const secondRoot = join(directory, 'source-two');
  new LocalRunStore({ repoRoot: runtimeRoot, workspaceRoot: firstRoot, stateFile });

  const reopened = new LocalRunStore({ repoRoot: runtimeRoot, workspaceRoot: secondRoot, stateFile });
  const workspace = reopened.workspaces().find((item) => item.workspace_id === 'wsl-local');
  assert.equal(workspace.code_root, secondRoot);
  assert.equal(workspace.transport, 'local');
  assert.equal(workspace.status, 'configured');

  const explicitRoot = join(directory, 'explicit-source');
  reopened.updateWorkspace('wsl-local', { transport: 'local', code_root: explicitRoot });
  const restarted = new LocalRunStore({
    repoRoot: runtimeRoot, workspaceRoot: join(directory, 'later-source'), stateFile,
  });
  assert.equal(restarted.workspaces()[0].code_root, explicitRoot);
});

test('persists local, WSL and SSH workspace choices while remote choices remain unconnected', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workspace-config-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new LocalRunStore({ repoRoot: process.cwd(), stateFile: join(directory, 'state.json') });

  const local = store.updateWorkspace('wsl-local', { transport: 'local', code_root: join(directory, 'src') });
  assert.equal(local.transport, 'local');
  assert.equal(local.status, 'configured');

  const wsl = store.updateWorkspace('wsl-local', {
    transport: 'wsl', target: 'Ubuntu-24.04', code_root: '/home/user/ohos',
  });
  assert.equal(wsl.transport, 'wsl');
  assert.equal(wsl.connection.target, 'Ubuntu-24.04');
  assert.equal(wsl.status, 'connector_required');

  const ssh = store.updateWorkspace('wsl-local', {
    transport: 'ssh', target: 'builder@10.0.0.8', code_root: '/srv/openharmony', port: 2202,
  });
  assert.equal(ssh.transport, 'ssh');
  assert.deepEqual(ssh.connection, { target: 'builder@10.0.0.8', port: 2202 });
  assert.equal(ssh.status, 'connector_required');
});

test('rejects unsafe remote paths, SSH options and credential-bearing workspace updates', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workspace-config-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new LocalRunStore({ repoRoot: process.cwd(), stateFile: join(directory, 'state.json') });
  for (const input of [
    { transport: 'ssh', target: '-oProxyCommand=bad', code_root: '/src' },
    { transport: 'wsl', target: '../Ubuntu', code_root: '/src' },
    { transport: 'ssh', target: 'user:password@host', code_root: '/src' },
    { transport: 'ssh', target: 'user@host', code_root: 'relative/src' },
    { transport: 'local', code_root: '', private_key: 'secret' },
  ]) {
    assert.throws(() => store.updateWorkspace('wsl-local', input), { code: 'workspace_configuration_invalid' });
  }
  assert.equal(JSON.stringify(store.workspaces()).includes('secret'), false);
});
