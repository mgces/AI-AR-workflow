import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareCommandInvocation, resolveCommandPath } from '../src/command.js';

test('command resolution honors Windows PATHEXT for npm-style .cmd wrappers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-command-win-'));
  try {
    const command = join(root, 'claude.cmd');
    const powershell = join(root, 'pwsh.exe');
    await writeFile(command, '@echo off\r\n', 'utf8');
    await writeFile(powershell, 'fixture\n', 'utf8');
    await chmod(command, 0o755);
    await chmod(powershell, 0o755);
    assert.equal(resolveCommandPath('claude', { PATH: root }, 'win32'), command);
    const prepared = prepareCommandInvocation('claude', ['-p', 'literal & percent % and\nline'], {
      env: { PATH: root, DSH_POWERSHELL_COMMAND: powershell },
      platform: 'win32',
    });
    assert.equal(prepared.command, powershell);
    assert.equal(prepared.shell, false);
    assert.deepEqual(JSON.parse(prepared.env.DSH_WINDOWS_ARGS), ['-p', 'literal & percent % and\nline']);
    assert.equal(prepared.env.DSH_WINDOWS_COMMAND, command);
    assert.ok(prepared.args.includes('-Command'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('non-Windows command invocation remains argv-only', () => {
  const env = { PATH: '/tmp' };
  const prepared = prepareCommandInvocation('/usr/bin/echo', ['a & b'], { env, platform: 'linux' });
  assert.deepEqual(prepared, {
    command: '/usr/bin/echo',
    args: ['a & b'],
    env,
    shell: false,
    wrapped: false,
  });
});
