import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { runDoctor } from '../doctor.mjs';

function openHarmonyFixture() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-doctor-'));
  mkdirSync(join(root, 'test/testfwk/developer_test'), { recursive: true });
  writeFileSync(join(root, 'build.sh'), '#!/bin/sh\nexit 0\n');
  writeFileSync(join(root, 'test/testfwk/developer_test/start.sh'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(root, 'build.sh'), 0o755);
  chmodSync(join(root, 'test/testfwk/developer_test/start.sh'), 0o755);
  return root;
}

test('deployment doctor reports the real blockers for an incomplete source root', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-doctor-empty-'));
  const report = runDoctor({
    repoRoot: root,
    stateRoot: join(root, '.state'),
    deliveryScriptsRoot: join(root, 'missing-scripts'),
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  assert.equal(report.status, 'blocked');
  assert.equal(report.gates.can_start_p0, false);
  assert.ok(report.checks.some((item) => item.id === 'source_tree' && item.status === 'blocked'));
  assert.ok(report.checks.some((item) => item.id === 'delivery_scripts' && item.status === 'blocked'));
});

test('deployment doctor can prove a complete local P0/P8 fixture while keeping device and publish explicit', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) {
    writeFileSync(join(scripts, name), '# fixture\n');
  }
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
    requireDevice: false,
    requirePublish: false,
  });
  assert.equal(report.status, 'ready');
  assert.equal(report.gates.can_start_p0, true);
  assert.equal(report.gates.can_complete_p8, true);
  assert.equal(report.checks.find((item) => item.id === 'device')?.required, false);
  assert.equal(report.checks.find((item) => item.id === 'publish')?.required, false);
});

test('deployment doctor requires an actual hdc target when P8 device validation is requested', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(scripts, { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
    deviceProbe: () => ({ status: 'blocked', reason: 'no_device_target' }),
    requireDevice: true,
    requirePublish: false,
  });
  assert.equal(report.checks.find((item) => item.id === 'device')?.reason, 'no_device_target');
  assert.equal(report.gates.can_complete_p8, false);
});

test('deployment doctor makes required cgroup isolation a P0 admission condition', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(scripts, { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
    cgroupMode: 'required',
    cgroupRoot: join(root, 'missing-cgroup'),
  });
  assert.equal(report.checks.find((item) => item.id === 'process_isolation')?.status, 'blocked');
  assert.equal(report.gates.can_start_p0, false);
});

test('deployment doctor proves the official DSH binary and deployment patch when requested', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const patchPath = join(root, 'cordis.cloud.patch.yml');
  writeFileSync(patchPath, '- insert: []\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    dshCommand: '/bin/echo',
    patchFile: patchPath,
    requireDsh: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  assert.equal(report.status, 'ready');
  assert.equal(report.checks.find((item) => item.id === 'official_dsh')?.status, 'pass');
  assert.equal(report.gates.can_start_p0, true);
});

test('deployment doctor fails closed when required official DSH inputs are absent', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    requireDsh: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  const dsh = report.checks.find((item) => item.id === 'official_dsh');
  assert.equal(dsh?.status, 'blocked');
  assert.equal(dsh?.reason, 'dsh_not_configured');
  assert.equal(report.gates.can_start_p0, false);
});

test('deployment doctor rejects a cloud patch that still points at a developer checkout', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const patchPath = join(root, 'cordis.cloud.patch.yml');
  writeFileSync(patchPath, "repoRoot: '/home/mgces/code/AI-AR-workflow'\n");
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    dshCommand: '/bin/echo',
    patchFile: patchPath,
    requireDsh: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  const dsh = report.checks.find((item) => item.id === 'official_dsh');
  assert.equal(dsh?.status, 'blocked');
  assert.equal(dsh?.reason, 'patch_developer_path');
  assert.equal(report.gates.can_start_p0, false);
});

test('deployment doctor validates the Gateway profile bundle when it is required', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const profiles = join(root, 'gateway-profiles.json');
  writeFileSync(profiles, JSON.stringify({ 'codeagent.custom': { command: 'my-codeagent', args: [] } }));
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    gatewayProfilesFile: profiles,
    requireGatewayProfiles: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  assert.equal(report.checks.find((item) => item.id === 'gateway_profiles')?.status, 'pass');
  assert.equal(report.gates.can_start_p0, true);
});

test('deployment doctor fails closed when a required Gateway profile bundle is absent', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    gatewayProfilesFile: join(root, 'missing-gateway-profiles.json'),
    requireGatewayProfiles: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  const profiles = report.checks.find((item) => item.id === 'gateway_profiles');
  assert.equal(profiles?.status, 'blocked');
  assert.equal(report.gates.can_start_p0, false);
});

test('deployment doctor applies the same fixed argv validation as Gateway startup', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(join(scripts, 'lib'), { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const profiles = join(root, 'gateway-profiles.json');
  writeFileSync(profiles, JSON.stringify({ 'unsafe.profile': { command: 'git status', args: [] } }));
  const report = runDoctor({
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    gatewayProfilesFile: profiles,
    requireGatewayProfiles: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  });
  const gateway = report.checks.find((item) => item.id === 'gateway_profiles');
  assert.equal(gateway?.status, 'blocked');
  assert.equal(gateway?.reason, 'profile_invalid');
  assert.equal(report.gates.can_start_p0, false);
});

test('deployment doctor validates matching DSH and Gateway Bearer env files without echoing secrets', () => {
  const root = openHarmonyFixture();
  const scripts = join(root, 'skills');
  mkdirSync(scripts, { recursive: true });
  for (const name of ['advance.py', 'gate_env_init.py', 'gate_design.py', 'gate_develop.py', 'gate_test_develop.py', 'gate_build.py', 'gate_test_ut.py', 'gate_device_func.py', 'gate_integration.py', 'gate_upload_ci.py', 'prepare_test_bundle.py']) writeFileSync(join(scripts, name), '# fixture\n');
  writeFileSync(join(root, 'delivery_bridge.py'), '# fixture\n');
  const dshEnvFile = join(root, 'dsh.env');
  const gatewayEnvFile = join(root, 'gateway.env');
  const secret = 'fixture-bearer-secret-123';
  const authority = 'fixture-authority-secret-1234567890';
  writeFileSync(dshEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_AUTHORITY_SHARED_SECRET=${authority}\n`);
  writeFileSync(gatewayEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_GATEWAY_SHARED_SECRET=${authority}\n`);
  const base = {
    repoRoot: root,
    stateRoot: root,
    deliveryScriptsRoot: scripts,
    deliveryBridgePath: join(root, 'delivery_bridge.py'),
    codeagentCommand: '/bin/echo',
    dshEnvFile,
    gatewayEnvFile,
    requireGatewayAuth: true,
    nodeVersion: 'v24.1.0',
    commandProbe: () => ({ status: 'pass', version: 'fixture' }),
  };
  const ready = runDoctor(base);
  const auth = ready.checks.find((item) => item.id === 'gateway_auth');
  assert.equal(auth?.status, 'pass');
  assert.equal(JSON.stringify(ready).includes(secret), false);
  assert.equal(JSON.stringify(ready).includes(authority), false);

  writeFileSync(gatewayEnvFile, 'DSH_GATEWAY_BEARER_TOKEN=different-secret\n');
  const mismatch = runDoctor(base);
  const mismatchAuth = mismatch.checks.find((item) => item.id === 'gateway_auth');
  assert.equal(mismatchAuth?.status, 'blocked');
  assert.equal(mismatchAuth?.reason, 'gateway_bearer_mismatch');
  assert.equal(JSON.stringify(mismatch).includes(secret), false);

  writeFileSync(dshEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_AUTHORITY_SHARED_SECRET=short\n`);
  writeFileSync(gatewayEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_GATEWAY_SHARED_SECRET=short\n`);
  const shortAuthority = runDoctor(base);
  const shortAuthorityAuth = shortAuthority.checks.find((item) => item.id === 'gateway_auth');
  assert.equal(shortAuthorityAuth?.status, 'blocked');
  assert.equal(shortAuthorityAuth?.reason, 'gateway_authority_secret_too_short');

  writeFileSync(dshEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_AUTHORITY_SHARED_SECRET=${authority}\n`);
  writeFileSync(gatewayEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_GATEWAY_SHARED_SECRET=different-authority-secret-1234567890\n`);
  const authorityMismatch = runDoctor(base);
  const authorityMismatchAuth = authorityMismatch.checks.find((item) => item.id === 'gateway_auth');
  assert.equal(authorityMismatchAuth?.status, 'blocked');
  assert.equal(authorityMismatchAuth?.reason, 'gateway_authority_secret_mismatch');
  assert.equal(JSON.stringify(authorityMismatch).includes(authority), false);

  writeFileSync(dshEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_AUTHORITY_SHARED_SECRET=${authority}\n`);
  writeFileSync(gatewayEnvFile, `DSH_GATEWAY_BEARER_TOKEN=${secret}\nDSH_GATEWAY_SHARED_SECRET=${authority}\n`);
  writeFileSync(dshEnvFile, 'DSH_GATEWAY_BEARER_TOKEN=${TOKEN_FROM_SHELL}\nDSH_AUTHORITY_SHARED_SECRET=${AUTHORITY_FROM_SHELL}\n');
  writeFileSync(gatewayEnvFile, 'DSH_GATEWAY_BEARER_TOKEN=${TOKEN_FROM_SHELL}\nDSH_GATEWAY_SHARED_SECRET=${AUTHORITY_FROM_SHELL}\n');
  const unresolved = runDoctor(base);
  const unresolvedAuth = unresolved.checks.find((item) => item.id === 'gateway_auth');
  assert.equal(unresolvedAuth?.status, 'blocked');
  assert.equal(unresolvedAuth?.reason, 'gateway_bearer_not_configured');
});

test('systemd DSH unit uses concrete executable and patch paths', () => {
  const unit = readFileSync(new URL('../systemd/dsh-web.service', import.meta.url), 'utf8');
  assert.ok(unit.includes('ExecStart=/opt/dsh/official/node_modules/.bin/dsh --profile web \\\n'));
  assert.ok(unit.includes('--patch /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml \\\n'));
  assert.ok(unit.includes('ExecStartPre=/usr/bin/test -x /opt/dsh/official/node_modules/.bin/dsh\n'));
  assert.ok(unit.includes('ExecStartPre=/usr/bin/test -r /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml\n'));
  assert.doesNotMatch(unit, /ExecStart=\$\{|--patch \$\{/u);
});

test('canonical cloud patch keeps the remote gate bundle inside the SSH root', () => {
  const patch = readFileSync(new URL('../cordis.cloud.patch.yml', import.meta.url), 'utf8');
  assert.match(patch, /remoteRoot:\s*['"]\/srv\/project['"]/u);
  assert.match(patch, /deliveryScriptsRoot:\s*['"]\/srv\/project\/\.dsh\/ar-workflow\/skills\/ohos-ar-dev-phases\/scripts['"]/u);
  assert.match(patch, /deliveryBridgePath:\s*['"]\/srv\/project\/\.dsh\/ar-workflow\/runtime\/delivery_bridge\.py['"]/u);
  assert.doesNotMatch(patch, /deliveryScriptsRoot:\s*['"]\/opt\/dsh\//u);
  assert.doesNotMatch(patch, /deliveryBridgePath:\s*['"]\/opt\/dsh\//u);
});
