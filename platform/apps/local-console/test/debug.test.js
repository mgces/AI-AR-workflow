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
    });
    const result = await surface.status();
    assert.equal(result.status, 'ready');
    assert.equal(result.artifacts.artifacts[0].relative_path, 'out/product/demo.hap');
    assert.equal(result.artifacts.artifacts[0].sha256, 'a'.repeat(64));
    assert.equal(result.device_probe.targets[0], 'device-1');
    assert.equal(calls.every((item) => item.signature?.value === 'signed'), true);
    assert.equal(calls.some((item) => item.payload.operation_kind === 'workspace.hash'), true);
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
});
