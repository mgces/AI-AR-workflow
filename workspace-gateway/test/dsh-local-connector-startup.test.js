import assert from 'node:assert/strict';
import test from 'node:test';
import { formatConnectorStartupError, resolveWorkspaceTransport } from '../bin/dsh-local-connector.js';

test('Windows direct Connector startup does not silently default an unset transport to SSH', () => {
  assert.throws(() => resolveWorkspaceTransport({ ssh: { host: 'wsl-dev' } }, 'win32'), /Start-DSH-Connector/u);
  assert.equal(resolveWorkspaceTransport({ workspace_transport: 'wsl' }, 'win32'), 'wsl');
  assert.equal(resolveWorkspaceTransport({ ssh: { host: 'builder@example.test' } }, 'linux'), 'ssh');
});

test('Connector startup explains SSH public-key failures without printing irrelevant usage', () => {
  const message = formatConnectorStartupError(Object.assign(
    new Error('local_root is not ready: remote_command_failed'),
    { workspaceDiagnostic: {
      code: 'remote_command_failed',
      message: 'SSH operation exited with 255',
      exit_code: 255,
      stderr: 'Permission denied (publickey).',
    } },
  ));

  assert.match(message, /Permission denied \(publickey\)/u);
  assert.match(message, /ssh-agent|IdentityFile|公钥认证/iu);
  assert.doesNotMatch(message, /Usage:/u);
});

test('Connector startup diagnoses an unresolved SSH Host alias', () => {
  const message = formatConnectorStartupError(Object.assign(
    new Error('local_root is not ready: remote_command_failed'),
    { workspaceDiagnostic: {
      code: 'remote_command_failed',
      message: 'SSH operation exited with 255',
      exit_code: 255,
      stderr: 'ssh: Could not resolve hostname wsl-dev: Name or service not known',
    } },
  ));

  assert.match(message, /wsl-dev/u);
  assert.match(message, /%USERPROFILE%\\\.ssh\\config/u);
  assert.match(message, /user@host|user@IP/iu);
});

test('Connector startup reports WSL workspace failures as WSL diagnostics', () => {
  const message = formatConnectorStartupError(Object.assign(
    new Error('local_root is not ready: remote_command_failed'),
    { workspaceDiagnostic: {
      code: 'remote_command_failed',
      message: 'WSL operation exited with 1',
      transport: 'wsl',
      exit_code: 1,
      stderr: 'There is no distribution with the supplied name.',
    } },
  ));

  assert.match(message, /WSL exit code: 1/u);
  assert.match(message, /发行版/u);
  assert.doesNotMatch(message, /SSH 网络/u);
});
