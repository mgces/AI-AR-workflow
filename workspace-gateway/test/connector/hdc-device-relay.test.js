import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { HdcDeviceRelay } from '../../src/connector/hdc-device-relay.js';

class FakeChild extends EventEmitter {
  constructor(pid = 1234) {
    super();
    this.pid = pid;
    this.exitCode = null;
    this.signalCode = null;
    this.killed = false;
  }

  kill(signal) {
    this.killed = true;
    this.signalCode = signal;
    this.emit('close', null, signal);
    return true;
  }
}

test('HDC relay binds both ends to loopback and owns server/tunnel process lifetimes', async () => {
  const spawnCalls = [];
  const probeCalls = [];
  const children = [];
  const relay = new HdcDeviceRelay({
    enabled: true,
    host: 'code-host.example',
    username: 'builder',
    port: 2222,
    identityFile: '/home/user/.ssh/id_ed25519',
    knownHostsFile: '/home/user/.ssh/known_hosts',
    hdcCommand: '/opt/openharmony/hdc',
    sshCommand: '/usr/bin/ssh',
    localPort: 18710,
    remotePort: 18711,
    startupDelayMs: 0,
    spawnImpl(command, args, options) {
      spawnCalls.push({ command, args, options });
      const child = new FakeChild(2000 + children.length);
      children.push(child);
      queueMicrotask(() => child.emit('spawn'));
      return child;
    },
    portProbeImpl: async () => false,
    execFileImpl: async (command, args, options) => {
      probeCalls.push({ command, args, options });
      return { stdout: '[Empty]\n', stderr: '' };
    },
  });

  const started = await relay.start();
  assert.equal(started.status, 'ready');
  assert.equal(started.server_mode, 'started');
  assert.deepEqual(spawnCalls[0].args, ['-s', '127.0.0.1:18710', '-m']);
  assert.ok(spawnCalls[1].args.includes('-R'));
  assert.ok(spawnCalls[1].args.includes('127.0.0.1:18711:127.0.0.1:18710'));
  assert.equal(spawnCalls.every((call) => call.options.shell === false), true);
  assert.deepEqual(probeCalls[0].args, ['-s', '127.0.0.1:18710', 'list', 'targets']);
  assert.deepEqual(relay.hdcProbeArgs(), ['-s', '127.0.0.1:18710', 'list', 'targets']);

  await relay.stop();
  assert.equal(children.every((child) => child.killed), true);
  assert.equal((await relay.status()).status, 'stopped');
});

test('HDC relay fails closed when the reverse SSH tunnel cannot stay up', async () => {
  const children = [];
  const relay = new HdcDeviceRelay({
    enabled: true,
    host: 'code-host.example',
    localPort: 18710,
    remotePort: 18711,
    startupDelayMs: 0,
    spawnImpl(_command, _args, options) {
      const child = new FakeChild(3000 + children.length);
      children.push(child);
      queueMicrotask(() => {
        child.emit('spawn');
        if (children.length === 2 && options.env.DSH_TEST_FAIL_TUNNEL === '1') {
          child.exitCode = 255;
          child.emit('close', 255, null);
        }
      });
      return child;
    },
    env: { DSH_TEST_FAIL_TUNNEL: '1' },
    portProbeImpl: async () => false,
    execFileImpl: async () => ({ stdout: '', stderr: '' }),
  });

  const result = await relay.start();
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'ssh_reverse_forward_failed');
  assert.equal(children[0].killed, true);
});

test('HDC relay rejects non-loopback forwarding and invalid ports', () => {
  const relay = new HdcDeviceRelay({ enabled: true, host: 'code-host.example', bindHost: '0.0.0.0' });
  assert.ok(relay.sshArgs().includes('127.0.0.1:18710:127.0.0.1:8710'));
  assert.throws(() => new HdcDeviceRelay({ enabled: true, host: 'code-host.example', remotePort: 22 }), /remotePort/u);
});

test('HDC relay reuses the configured single HDC server and does not stop it', async () => {
  const spawnCalls = [];
  const children = [];
  const probeCalls = [];
  const relay = new HdcDeviceRelay({
    enabled: true,
    host: 'wsl-host',
    remotePort: 18710,
    startupDelayMs: 0,
    spawnImpl(command, args, options) {
      spawnCalls.push({ command, args, options });
      const child = new FakeChild(4000 + children.length);
      children.push(child);
      queueMicrotask(() => child.emit('spawn'));
      return child;
    },
    portProbeImpl: async (_host, port) => port === 8710,
    execFileImpl: async (_command, args) => {
      probeCalls.push(args);
      return { stdout: 'usb-01 Connected\n', stderr: '' };
    },
  });

  const status = await relay.start();
  assert.equal(status.status, 'ready');
  assert.equal(status.server_mode, 'reused');
  assert.deepEqual(probeCalls, [['-s', '127.0.0.1:8710', 'list', 'targets']]);
  assert.equal(spawnCalls.length, 1);
  assert.ok(spawnCalls[0].args.includes('127.0.0.1:18710:127.0.0.1:8710'));

  await relay.stop();
  assert.equal(children.length, 1);
  assert.equal(children[0].killed, true);
});

test('HDC relay rejects starting a second service when the configured server port is already active', async () => {
  const spawnCalls = [];
  const relay = new HdcDeviceRelay({
    enabled: true,
    host: 'wsl-host',
    localPort: 18710,
    remotePort: 18711,
    env: {},
    portProbeImpl: async (_host, port) => port === 8710,
    spawnImpl(command, args) {
      spawnCalls.push({ command, args });
      const child = new FakeChild();
      queueMicrotask(() => child.emit('spawn'));
      return child;
    },
  });
  const status = await relay.start();
  assert.equal(status.status, 'failed');
  assert.equal(status.reason, 'hdc_server_already_running_on_other_port');
  assert.equal(spawnCalls.length, 0);
});

test('HDC relay follows OHOS_HDC_SERVER_PORT when no local port is specified', () => {
  const relay = new HdcDeviceRelay({
    enabled: true,
    host: 'wsl-host',
    env: { OHOS_HDC_SERVER_PORT: '18710' },
  });
  assert.equal(relay.localPort, 18710);
  assert.deepEqual(relay.hdcProbeArgs(), ['-s', '127.0.0.1:18710', 'list', 'targets']);
  assert.throws(() => new HdcDeviceRelay({
    enabled: true, host: 'wsl-host', env: { OHOS_HDC_SERVER_PORT: 'not-a-port' },
  }), /OHOS_HDC_SERVER_PORT/u);
});
