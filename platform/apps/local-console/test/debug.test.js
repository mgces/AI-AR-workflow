import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, before, after } from 'node:test';
import { RemoteDebugSurface, scanArtifacts } from '../src/debug.js';

let root;

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-debug-test-'));
  await mkdir(join(root, 'out', 'product'), { recursive: true });
  await writeFile(join(root, 'out', 'product', 'demo.hap'), 'demo artifact');
  await writeFile(join(root, 'out', 'product', 'demo.txt'), 'not a deployable artifact');
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('local artifact scan', () => {
  test('identifies known artifact extensions with advisory provenance', async () => {
    const result = await scanArtifacts(root);
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].role, 'application_package');
    assert.equal(result.artifacts[0].relative_path, 'out/product/demo.hap');
    assert.equal(result.artifacts[0].confidence, 'advisory_extension');
    assert.match(result.artifacts[0].sha256, /^[a-f0-9]{64}$/);
  });
});

describe('remote debug surface', () => {
  test('scans remote build artifacts and executes an optional device probe profile', async () => {
    const calls = [];
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.list') {
          assert.equal(envelope.payload.with_metadata, true);
          return { entries: [
            { relative_path: 'out/product/demo.hap', size_bytes: 15, mtime_ms: 10 },
            { relative_path: 'out/product/demo.txt', size_bytes: 3, mtime_ms: 10 },
          ] };
        }
        if (operation === 'workspace.hash') {
          assert.equal(envelope.payload.path, 'out/product/demo.hap');
          return { sha256: 'a'.repeat(64), bytes: 15 };
        }
        if (operation === 'workspace.read') {
          throw new Error('workspace.read should not be used for a binary artifact');
        }
        if (operation === 'workspace.exec_profile') {
          assert.equal(envelope.payload.profile_id, 'debug.device_probe');
          return { exit_code: 0, stdout: JSON.stringify({ status: 'available', targets: ['device-1'] }), stderr: '' };
        }
        throw new Error(`unexpected operation ${operation}`);
      },
    };
    const surface = new RemoteDebugSurface({
      gateway,
      remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      deviceProfile: 'debug.device_probe',
      deviceHdcHostOverride: '127.0.0.1:18710',
    });
    const result = await surface.status();
    assert.equal(result.status, 'ready');
    assert.equal(result.artifacts.artifacts[0].relative_path, 'out/product/demo.hap');
    assert.equal(result.artifacts.artifacts[0].sha256, 'a'.repeat(64));
    assert.equal(result.device_probe.targets[0], 'device-1');
    assert.equal(calls.every((item) => item.signature?.value === 'signed'), true);
    assert.equal(calls.some((item) => item.payload.operation_kind === 'workspace.hash'), true);
    assert.deepEqual(calls.find((item) => item.payload.operation_kind === 'workspace.exec_profile')
      .payload.variables, { device_hdc_host_override: '127.0.0.1:18710' });
  });

  test('reports a remote device probe as unconfigured without hiding artifacts', async () => {
    const surface = new RemoteDebugSurface({
      gateway: { async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.list') return { entries: [] };
        throw new Error('device profile must not run');
      } },
      remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
    });
    const result = await surface.scan();
    assert.equal(result.device_probe.status, 'unconfigured');
    assert.equal(result.status, 'partial');
  });

  test('prefers the paired local Connector for device discovery when available', async () => {
    const connectorCalls = [];
    const gatewayCalls = [];
    const surface = new RemoteDebugSurface({
      gateway: { async execute(envelope) {
        gatewayCalls.push(envelope.payload.operation_kind);
        if (envelope.payload.operation_kind === 'workspace.list') return { entries: [] };
        throw new Error('SSH-host device profile must not run when local device mode is selected');
      } },
      remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      connectorWorkspaceId: 'workspace-1',
      deviceConnector: { async request(workspaceId, command) {
        connectorCalls.push({ workspaceId, command });
        return {
          status: 'available', source: 'local_connector', command: 'C:/DevEco/hdc.exe',
          targets: [{ id: 'windows-usb-01', state: 'connected' }],
        };
      } },
      deviceProfile: 'debug.device_probe',
    });

    const result = await surface.status();

    assert.equal(result.device_probe.status, 'available');
    assert.equal(result.device_probe.source, 'local_connector');
    assert.deepEqual(result.device_probe.targets, [{ id: 'windows-usb-01', state: 'connected' }]);
    assert.equal(connectorCalls.length, 1);
    assert.equal(connectorCalls[0].workspaceId, 'workspace-1');
    assert.equal(connectorCalls[0].command.kind, 'device.probe');
    assert.ok(gatewayCalls.includes('workspace.list'));
    assert.equal(gatewayCalls.includes('workspace.exec_profile'), false);
  });

  test('accepts a local HDC device only after SSH relay probe confirms the same target', async () => {
    const gatewayCalls = [];
    const surface = new RemoteDebugSurface({
      gateway: { async execute(envelope) {
        gatewayCalls.push(envelope.payload.operation_kind);
        if (envelope.payload.operation_kind === 'workspace.list') return { entries: [] };
        if (envelope.payload.operation_kind === 'workspace.exec_profile') {
          return { exit_code: 0, stdout: JSON.stringify({ status: 'available', targets: [{ id: 'device-01', state: 'device' }] }) };
        }
        throw new Error(`unexpected operation ${envelope.payload.operation_kind}`);
      } },
      remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      connectorWorkspaceId: 'workspace-1',
      deviceHdcHostOverride: '127.0.0.1:18710',
      deviceConnector: { async request() {
        return {
          status: 'available', source: 'local_connector', command: 'hdc.exe',
          targets: [{ id: 'device-01', state: 'connected' }],
          device_relay: { enabled: true, status: 'ready', remote_endpoint: '127.0.0.1:18710' },
        };
      } },
      deviceProfile: 'debug.device_probe',
    });

    const result = await surface.status();
    assert.equal(result.device_probe.status, 'available');
    assert.equal(result.device_probe.source, 'local_connector_relay');
    assert.equal(result.device_probe.device_relay.status, 'ready');
    assert.ok(gatewayCalls.includes('workspace.exec_profile'));
  });

  test('does not accept an HDC relay whose remote target differs from the local device', async () => {
    const surface = new RemoteDebugSurface({
      gateway: { async execute(envelope) {
        if (envelope.payload.operation_kind === 'workspace.list') return { entries: [] };
        if (envelope.payload.operation_kind === 'workspace.exec_profile') {
          return { exit_code: 0, stdout: JSON.stringify({ status: 'available', targets: [{ id: 'other-device', state: 'device' }] }) };
        }
        throw new Error(`unexpected operation ${envelope.payload.operation_kind}`);
      } },
      remoteRoot: '/srv/project',
      authorityContext: { tenant_id: 'tenant-1', workspace_id: 'workspace-1' },
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      connectorWorkspaceId: 'workspace-1',
      deviceHdcHostOverride: '127.0.0.1:18710',
      deviceConnector: { async request() {
        return {
          status: 'available', source: 'local_connector', targets: [{ id: 'device-01', state: 'connected' }],
          device_relay: { enabled: true, status: 'ready', remote_endpoint: '127.0.0.1:18710' },
        };
      } },
      deviceProfile: 'debug.device_probe',
    });

    const result = await surface.status();
    assert.equal(result.device_probe.status, 'device_relay_target_mismatch');
    assert.equal(result.device_probe.source, 'local_connector_relay');
    assert.equal(result.device_probe.reason, 'device_relay_target_mismatch');
  });
});
