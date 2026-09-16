import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { probeHostCapabilities } from '../src/capabilities.js';

test('host capability probe reports only capabilities backed by the configured workspace and tools', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-capabilities-'));
  const bin = await mkdtemp(join(tmpdir(), 'dsh-capabilities-bin-'));
  try {
    await writeFile(join(root, 'build.sh'), '#!/bin/sh\n', 'utf8');
    await chmod(join(root, 'build.sh'), 0o755);
    await writeFile(join(bin, 'hdc'), '#!/bin/sh\nprintf "Targets\tdevice-1\\n"\n', 'utf8');
    await chmod(join(bin, 'hdc'), 0o755);
    await writeFile(join(bin, 'git'), '#!/bin/sh\nprintf "git version 2.0\\n"\n', 'utf8');
    await chmod(join(bin, 'git'), 0o755);
    const capabilities = probeHostCapabilities({
      repoRoot: root,
      executor: { run() {} },
      env: { PATH: bin },
      deviceAccess: true,
      networkPublish: true,
    });
    assert.equal(capabilities.capability_source, 'host-probe');
    assert.equal(capabilities.capabilities.workspace_write, true);
    assert.equal(capabilities.capabilities.build_execution, true);
    assert.equal(capabilities.capabilities.device_access, true);
    assert.equal(capabilities.capabilities.network_publish, true);
    assert.equal(capabilities.capabilities.native_subagent, true);
    assert.equal(capabilities.capabilities.cancel_observable, true);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(bin, { recursive: true, force: true });
  }
});

test('host capability probe fails closed for an unconfigured workspace and device', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-capabilities-'));
  try {
    const capabilities = probeHostCapabilities({
      repoRoot: join(root, 'missing'),
      executor: null,
      env: { PATH: '' },
      deviceAccess: true,
      networkPublish: true,
    });
    assert.equal(capabilities.capabilities.workspace_write, false);
    assert.equal(capabilities.capabilities.build_execution, false);
    assert.equal(capabilities.capabilities.device_access, false);
    assert.equal(capabilities.capabilities.network_publish, false);
    assert.equal(capabilities.capabilities.native_subagent, false);
    assert.equal(capabilities.capability_source, 'host-probe');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
