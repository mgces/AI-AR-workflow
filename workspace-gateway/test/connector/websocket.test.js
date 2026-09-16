import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Duplex } from 'node:stream';
import test from 'node:test';
import {
  ConnectorWebSocketHub,
  WebSocketConnectorClient,
} from '../../src/connector/websocket.js';

test('ConnectorWebSocketHub attaches a local session and correlates commands', async () => {
  const hub = new ConnectorWebSocketHub({ authToken: 'connector-secret', heartbeatMs: 0 });
  const peer = {
    onMessage: null,
    onClose: null,
    sent: [],
    send(message) {
      this.sent.push(message);
      if (message.type === 'command') setImmediate(() => this.onMessage?.({ type: 'response', id: message.id, ok: true, result: { status: 'ready', echoed: message.command.payload.value } }));
    },
    close() { this.onClose?.(); },
  };
  hub.attachPeer(peer, {
    deviceId: 'windows-1', workspaceId: 'workspace-1',
    capabilities: { agents: { opencode: { available: true, command: 'opencode' } } },
  });
  const snapshot = hub.snapshot();
  assert.equal(snapshot.workspaces[0].workspace_id, 'workspace-1');
  assert.equal(snapshot.workspaces[0].device_id, 'windows-1');
  assert.equal(snapshot.workspaces[0].capabilities.agents.opencode.available, true);
  const result = await hub.request('workspace-1', { kind: 'probe', payload: { value: 42 } });
  assert.deepEqual(result, { status: 'ready', echoed: 42 });
});

test('ConnectorWebSocketHub rejects an invalid transport token before hello', async () => {
  const hub = new ConnectorWebSocketHub({ authToken: 'expected', heartbeatMs: 0 });
  const socket = { writes: [], write(value) { this.writes.push(String(value)); }, destroy() { this.destroyed = true; } };
  await hub.handleUpgrade({ method: 'GET', url: '/v1/connect?token=wrong', headers: {
    upgrade: 'websocket', 'sec-websocket-key': 'test', 'sec-websocket-version': '13',
  } }, socket);
  assert.equal(socket.destroyed, true);
  assert.match(socket.writes[0], /^HTTP\/1\.1 401/u);
  assert.equal(hub.snapshot().workspaces.length, 0);
});

test('hub request fails closed when the local Connector is offline or times out', async () => {
  const hub = new ConnectorWebSocketHub({ heartbeatMs: 0, requestTimeoutMs: 20 });
  await assert.rejects(
    hub.request('missing', { kind: 'probe', payload: {} }),
    (error) => error.code === 'connector_offline',
  );
});

test('ConnectorWebSocketHub enforces the configured workspace and device binding', () => {
  const hub = new ConnectorWebSocketHub({
    authToken: 'connector-secret',
    workspaceId: 'workspace-1',
    deviceId: 'windows-1',
    heartbeatMs: 0,
  });
  const peer = { send() {}, close() {} };
  assert.throws(
    () => hub.attachPeer(peer, { deviceId: 'windows-2', workspaceId: 'workspace-1' }),
    (error) => error.code === 'connector_device_mismatch',
  );
  assert.throws(
    () => hub.attachPeer(peer, { deviceId: 'windows-1', workspaceId: 'workspace-2' }),
    (error) => error.code === 'connector_workspace_mismatch',
  );
  assert.equal(hub.snapshot().workspaces.length, 0);
});

test('local WebSocketConnectorClient sends hello and handles a command response', async () => {
  class FakeWebSocket {
    static OPEN = 1;
    static instances = [];
    constructor() {
      this.readyState = 0;
      FakeWebSocket.instances.push(this);
      setImmediate(() => { this.readyState = 1; this.onopen?.(); });
    }
    send(text) {
      const value = JSON.parse(text);
      if (value.type === 'hello') {
        setImmediate(() => this.onmessage?.({ data: JSON.stringify({ type: 'hello_ack', protocol_version: 1, workspace_id: value.workspace_id, connection_epoch: 2, heartbeat_ms: 0 }) }));
      }
    }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const client = new WebSocketConnectorClient({
    url: 'ws://dsh.test/v1/connect', deviceId: 'device-1', workspaceId: 'workspace-1',
    WebSocketImpl: FakeWebSocket, commandHandler: async () => ({ ok: true }),
  });
  await client.connect();
  assert.equal(client.ready, true);
  assert.equal(client.connectionEpoch, 2);
  client.close();
  assert.equal(FakeWebSocket.instances.length, 1);
});

test('ConnectorWebSocketHub enforces Origin and TLS client-certificate policy before upgrade', async () => {
  const makeSocket = () => ({
    writes: [],
    write(value) { this.writes.push(String(value)); },
    destroy() { this.destroyed = true; },
  });
  const request = (origin, socket) => ({ method: 'GET', url: '/v1/connect?token=connector-secret', headers: {
    origin, upgrade: 'websocket', 'sec-websocket-key': 'test', 'sec-websocket-version': '13',
  }, socket });
  const hub = new ConnectorWebSocketHub({
    authToken: 'connector-secret', heartbeatMs: 0, allowedOrigins: ['https://dsh.example'],
    requireTls: true, requireClientCertificate: true,
  });
  const wrongOrigin = makeSocket();
  await hub.handleUpgrade(request('https://evil.example', { encrypted: true, authorized: true }), wrongOrigin);
  assert.equal(wrongOrigin.destroyed, true);
  assert.match(wrongOrigin.writes[0], /^HTTP\/1\.1 403/u);
  const plain = makeSocket();
  await hub.handleUpgrade(request('https://dsh.example', { encrypted: false, authorized: true }), plain);
  assert.equal(plain.destroyed, true);
  assert.match(plain.writes[0], /^HTTP\/1\.1 400/u);
  const untrusted = makeSocket();
  await hub.handleUpgrade(request('https://dsh.example', { encrypted: true, authorized: false }), untrusted);
  assert.equal(untrusted.destroyed, true);
  assert.match(untrusted.writes[0], /^HTTP\/1\.1 401/u);
});

test('ConnectorWebSocketHub checks the durable pairing registry during hello', async () => {
  class FakeSocket extends Duplex {
    constructor() { super(); this.writes = []; }
    _read() {}
    _write(chunk, encoding, callback) { this.writes.push(Buffer.from(chunk, encoding)); callback(); }
    setNoDelay() {}
  }
  function maskedJson(value) {
    const payload = Buffer.from(JSON.stringify(value), 'utf8');
    const mask = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const header = payload.length < 126 ? Buffer.from([0x81, 0x80 | payload.length]) : Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff]);
    const encoded = Buffer.from(payload);
    for (let index = 0; index < encoded.length; index += 1) encoded[index] ^= mask[index % 4];
    return Buffer.concat([header, mask, encoded]);
  }
  const calls = [];
  const hub = new ConnectorWebSocketHub({
    heartbeatMs: 0,
    pairingRegistry: { async authorize(input) { calls.push(input); return { pairing_id: 'pair-1' }; } },
  });
  const socket = new FakeSocket();
  await hub.handleUpgrade({ method: 'GET', url: '/v1/connect?token=pair-token', headers: {
    upgrade: 'websocket', 'sec-websocket-key': 'test', 'sec-websocket-version': '13',
  }, socket }, socket);
  socket.push(maskedJson({ type: 'hello', protocol_version: 1, device_id: 'device-1', workspace_id: 'workspace-1', token: 'pair-token' }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [{ deviceId: 'device-1', workspaceId: 'workspace-1', token: 'pair-token', certificateFingerprint: null }]);
  assert.equal(hub.snapshot().security.pairing_registry_enabled, true);
  assert.equal(hub.snapshot().workspaces[0].workspace_id, 'workspace-1');
  hub.close();
});

test('ConnectorWebSocketHub replays an idempotent command after a Connector reconnect', async () => {
  const hub = new ConnectorWebSocketHub({ heartbeatMs: 0, replayPending: true, requestTimeoutMs: 1_000 });
  const first = {
    onMessage: null, onClose: null, sent: [],
    send(message) { this.sent.push(message); },
    close() { this.onClose?.(); },
  };
  hub.attachPeer(first, { deviceId: 'device-replay', workspaceId: 'workspace-replay' });
  const pending = hub.request('workspace-replay', { kind: 'agent.start', payload: { operation_id: 'replay-1' } });
  await new Promise((resolve) => setImmediate(resolve));
  const command = first.sent.find((item) => item.type === 'command');
  assert.ok(command);
  first.onClose();
  const second = {
    onMessage: null, onClose: null, sent: [],
    send(message) {
      this.sent.push(message);
      if (message.type === 'command') setImmediate(() => this.onMessage?.({ type: 'response', id: message.id, ok: true, result: { replayed: true } }));
    },
    close() { this.onClose?.(); },
  };
  hub.attachPeer(second, { deviceId: 'device-replay', workspaceId: 'workspace-replay' });
  assert.equal((await pending).replayed, true);
  assert.equal(second.sent.filter((item) => item.type === 'command').length, 1);
  hub.close();
});

test('ConnectorWebSocketHub persists pending operations and rebinds them after a cloud restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-outbox-'));
  const outboxFilePath = join(root, 'outbox.json');
  const first = {
    onMessage: null, onClose: null, sent: [],
    send(message) { this.sent.push(message); },
    close() { this.onClose?.(); },
  };
  const hub = new ConnectorWebSocketHub({
    heartbeatMs: 0, replayPending: true, requestTimeoutMs: 5_000, outboxFilePath,
  });
  hub.attachPeer(first, { deviceId: 'device-durable', workspaceId: 'workspace-durable' });
  const command = { kind: 'agent.start', payload: { operation_id: 'durable-operation-1', value: 7 } };
  const pending = hub.request('workspace-durable', command);
  await new Promise((resolve) => setImmediate(resolve));
  const commandId = first.sent.find((item) => item.type === 'command')?.id;
  assert.ok(commandId);
  first.onClose();
  hub.close();
  await assert.rejects(pending, (error) => error.code === 'connector_disconnected');
  const persisted = JSON.parse(await readFile(outboxFilePath, 'utf8'));
  assert.equal(persisted.records.length, 1);
  assert.equal(persisted.records[0].state, 'pending');
  assert.equal(hub.snapshot().durable_outbox[0].operation_key, 'agent.start:durable-operation-1');
  assert.equal(hub.snapshot().durable_outbox[0].state, 'pending');

  const second = {
    onMessage: null, onClose: null, sent: [],
    send(message) {
      this.sent.push(message);
      if (message.type === 'command') {
        setImmediate(() => this.onMessage?.({ type: 'response', id: message.id, ok: true,
          result: { status: 'completed', replayed: true } }));
      }
    },
    close() { this.onClose?.(); },
  };
  const recoveredHub = new ConnectorWebSocketHub({
    heartbeatMs: 0, replayPending: true, requestTimeoutMs: 5_000, outboxFilePath,
  });
  recoveredHub.attachPeer(second, { deviceId: 'device-durable', workspaceId: 'workspace-durable' });
  const result = await recoveredHub.request('workspace-durable', command);
  assert.deepEqual(result, { status: 'completed', replayed: true });
  assert.equal(second.sent.filter((item) => item.type === 'command').length, 1);
  assert.equal(second.sent.find((item) => item.type === 'command').id, commandId);
  recoveredHub.close();
  await rm(root, { recursive: true, force: true });
});

test('ConnectorWebSocketHub replays a durable completed result and rejects operation conflicts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-result-'));
  const outboxFilePath = join(root, 'outbox.json');
  const hub = new ConnectorWebSocketHub({ heartbeatMs: 0, replayPending: true, outboxFilePath });
  const peer = {
    onMessage: null, onClose: null, sent: [],
    send(message) {
      this.sent.push(message);
      if (message.type === 'command') setImmediate(() => this.onMessage?.({
        type: 'response', id: message.id, ok: true, result: { status: 'completed', value: 9 },
      }));
    },
    close() { this.onClose?.(); },
  };
  hub.attachPeer(peer, { deviceId: 'device-result', workspaceId: 'workspace-result' });
  const command = { kind: 'agent.start', payload: { operation_id: 'result-operation-1', value: 9 } };
  assert.deepEqual(await hub.request('workspace-result', command), { status: 'completed', value: 9 });
  hub.close();

  const recoveredHub = new ConnectorWebSocketHub({ heartbeatMs: 0, replayPending: true, outboxFilePath });
  assert.deepEqual(await recoveredHub.request('workspace-result', command), { status: 'completed', value: 9 });
  await assert.rejects(
    recoveredHub.request('workspace-result', { kind: 'agent.start', payload: { operation_id: 'result-operation-1', value: 10 } }),
    (error) => error.code === 'connector_operation_replay_conflict',
  );
  recoveredHub.close();
  await rm(root, { recursive: true, force: true });
});

test('ConnectorWebSocketHub fails closed when its durable outbox cannot be loaded', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-corrupt-outbox-'));
  const outboxFilePath = join(root, 'outbox.json');
  await writeFile(outboxFilePath, '{not-json', 'utf8');
  const hub = new ConnectorWebSocketHub({ heartbeatMs: 0, outboxFilePath });
  const peer = {
    onMessage: null, onClose: null, sent: [],
    send(message) { this.sent.push(message); },
    close() { this.onClose?.(); },
  };
  hub.attachPeer(peer, { deviceId: 'device-corrupt', workspaceId: 'workspace-corrupt' });
  assert.equal(hub.snapshot().security.outbox_load_error !== null, true);
  await assert.rejects(
    hub.request('workspace-corrupt', { kind: 'agent.start', payload: { operation_id: 'corrupt-1' } }),
    (error) => error.code === 'connector_outbox_load_failed',
  );
  assert.equal(peer.sent.some((item) => item.type === 'command'), false);
  hub.close();
  await rm(root, { recursive: true, force: true });
});

test('ConnectorWebSocketHub enables replay when a durable outbox path is configured', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-outbox-default-'));
  const hub = new ConnectorWebSocketHub({ heartbeatMs: 0, outboxFilePath: join(root, 'outbox.json') });
  assert.equal(hub.snapshot().security.replay_pending_enabled, true);
  hub.close();
  await rm(root, { recursive: true, force: true });
});
