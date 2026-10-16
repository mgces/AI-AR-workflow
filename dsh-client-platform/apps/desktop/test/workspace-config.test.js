import assert from 'node:assert/strict';
import test from 'node:test';
import {
  discoverWslDistributions,
  parseSshHostAliases,
  parseWslDistributionList,
  validateSshTarget,
} from '../src/workspace-config.js';

test('parses the UTF-16LE output returned by Windows wsl.exe --list --quiet', () => {
  const output = Buffer.from('Ubuntu-24.04\0\r\0\n\0docker-desktop\0\r\0\n\0', 'utf16le');
  assert.deepEqual(parseWslDistributionList(output), ['Ubuntu-24.04', 'docker-desktop']);
});

test('discovers WSL distros using the safe argv-only Windows CLI contract', async () => {
  const calls = [];
  const result = await discoverWslDistributions({
    platform: 'win32',
    execFileImpl: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: Buffer.from('Ubuntu-24.04\0\r\0\n\0', 'utf16le') };
    },
  });
  assert.deepEqual(result, { status: 'available', distributions: ['Ubuntu-24.04'] });
  assert.equal(calls[0].command, 'wsl.exe');
  assert.deepEqual(calls[0].args, ['--list', '--quiet']);
  assert.equal(calls[0].options.windowsHide, true);
});

test('reports WSL as unsupported outside Windows without invoking a process', async () => {
  let invoked = false;
  const result = await discoverWslDistributions({
    platform: 'linux',
    execFileImpl: async () => { invoked = true; return { stdout: '' }; },
  });
  assert.deepEqual(result, { status: 'unsupported_platform', distributions: [] });
  assert.equal(invoked, false);
});

test('parses concrete OpenSSH Host aliases while ignoring wildcard and negated patterns', () => {
  assert.deepEqual(parseSshHostAliases(`
Host wsl-dev builder
  HostName 10.0.0.8
Host *.corp !blocked
  User ignored
Host git.example.com
`), ['builder', 'git.example.com', 'wsl-dev']);
});

test('validates SSH target input before invoking OpenSSH and accepts configured aliases', async () => {
  const calls = [];
  const target = await validateSshTarget('wsl-dev', {
    execFileImpl: async (command, args) => {
      calls.push({ command, args });
      return { stdout: 'hostname 10.0.0.8\nuser mgces\nport 22\n' };
    },
  });
  assert.deepEqual(target, { target: 'wsl-dev', host: '10.0.0.8', username: 'mgces', port: 22 });
  assert.deepEqual(calls[0].args, ['-G', '--', 'wsl-dev']);
});

test('rejects SSH command options, credentials and shell syntax without executing a process', async () => {
  let calls = 0;
  for (const unsafe of ['-oProxyCommand=bad', 'user:password@host', 'user@host;whoami', '']) {
    await assert.rejects(() => validateSshTarget(unsafe, {
      execFileImpl: async () => { calls += 1; return { stdout: '' }; },
    }), { code: 'ssh_target_invalid' });
  }
  assert.equal(calls, 0);
});
