import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { SshfsMountManager } from '../../src/connector/sshfs-mount.js';

function child() {
  const value = new EventEmitter();
  value.stdout = new EventEmitter();
  value.stderr = new EventEmitter();
  value.kill = () => value.emit('close', 143, 'SIGTERM');
  return value;
}

test('SshfsMountManager builds a fixed argv and manages only its configured mount', async () => {
  let mounted = false;
  const calls = [];
  const manager = new SshfsMountManager({
    host: 'code-host', username: 'builder', port: 2222,
    remoteRoot: '/srv/project', mountPoint: '/tmp/dsh-code',
    identityFile: '/home/user/.ssh/id_ed25519', knownHostsFile: '/home/user/.ssh/known_hosts',
    options: ['reconnect', 'ServerAliveInterval=15'],
    mountInfoReader: async () => mounted ? '36 29 0:32 / /tmp/dsh-code rw - fuse.sshfs sshfs rw\n' : '',
    spawnImpl: (command, args, options) => {
      calls.push({ command, args, options });
      const process = child();
      setImmediate(() => {
        mounted = command === 'sshfs';
        process.emit('close', 0, null);
      });
      return process;
    },
  });
  const result = await manager.mount();
  assert.equal(result.started, true);
  assert.deepEqual(calls[0], {
    command: 'sshfs',
    args: [
      'builder@code-host:/srv/project', '/tmp/dsh-code', '-p', '2222', '-o', 'StrictHostKeyChecking=yes',
      '-o', 'IdentityFile=/home/user/.ssh/id_ed25519', '-o', 'UserKnownHostsFile=/home/user/.ssh/known_hosts',
      '-o', 'reconnect', '-o', 'ServerAliveInterval=15',
    ],
    options: { shell: false, stdio: ['ignore', 'pipe', 'pipe'] },
  });
  const status = await manager.status();
  assert.equal(status.mounted, true);
  const unmounted = await manager.unmount();
  assert.equal(unmounted.unmounted, true);
  assert.equal(calls[1].command, 'fusermount3');
  assert.deepEqual(calls[1].args, ['-u', '/tmp/dsh-code']);
});

test('SshfsMountManager rejects shell syntax and reports an unmounted SSH root', async () => {
  assert.throws(() => new SshfsMountManager({
    host: 'code-host', remoteRoot: '/srv/project', mountPoint: '/mnt/dsh-code', options: ['x;rm -rf /'],
  }), (error) => error.code === 'sshfs_config_invalid');
  const manager = new SshfsMountManager({
    host: 'code-host', remoteRoot: '/srv/project', mountPoint: '/tmp/dsh-unmounted',
    mountInfoReader: async () => '',
  });
  const status = await manager.status();
  assert.equal(status.mounted, false);
  assert.equal(status.reason, 'mount_point_not_found');
});
