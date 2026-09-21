import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareCommandInvocation, resolveCommandPath } from '../src/command.js';

test('command resolution unwraps known Windows npm .cmd shims without a shell', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-command-win-'));
  try {
    const command = join(root, 'claude.cmd');
    const executable = join(root, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    await mkdir(join(root, 'node_modules', '@anthropic-ai', 'claude-code', 'bin'), { recursive: true });
    await writeFile(command, '@echo off\r\n', 'utf8');
    await writeFile(executable, 'fixture\n', 'utf8');
    await chmod(command, 0o755);
    await chmod(executable, 0o755);
    assert.equal(resolveCommandPath('claude', { PATH: root }, 'win32'), command);
    const originalArgs = ['-p', 'literal & percent % and\nline'];
    const prepared = prepareCommandInvocation('claude', originalArgs, { env: { PATH: root }, platform: 'win32' });
    assert.equal(prepared.command, executable);
    assert.deepEqual(prepared.args, originalArgs);
    assert.equal(prepared.shell, false);
    assert.equal(prepared.wrapped, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Codex npm shim runs its JavaScript entry through Node with argv preserved', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-command-codex-win-'));
  try {
    const command = join(root, 'codex.cmd');
    const entry = join(root, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    await mkdir(join(root, 'node_modules', '@openai', 'codex', 'bin'), { recursive: true });
    await writeFile(command, '@echo off\r\n', 'utf8');
    await writeFile(entry, 'fixture\n', 'utf8');
    const prepared = prepareCommandInvocation(command, ['exec', 'a & b'], { env: { PATH: root }, platform: 'win32' });
    assert.equal(prepared.command, process.execPath);
    assert.deepEqual(prepared.args, [entry, 'exec', 'a & b']);
    assert.equal(prepared.shell, false);
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
