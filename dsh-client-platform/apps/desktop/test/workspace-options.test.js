import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverSshHostAliases } from '../src/workspace-options.js';

test('reads configured OpenSSH aliases without exposing secrets or failing when no config exists', async () => {
  const result = await discoverSshHostAliases({
    sshConfigPath: 'C:/Users/test/.ssh/config',
    readFileImpl: async () => 'Host builder\n  HostName 10.0.0.8\n  IdentityFile C:/private/key\nHost *.example\n',
  });
  assert.deepEqual(result, { status: 'available', aliases: ['builder'] });
  const missing = await discoverSshHostAliases({
    sshConfigPath: '/home/test/.ssh/config',
    readFileImpl: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); },
  });
  assert.deepEqual(missing, { status: 'config_missing', aliases: [] });
});
