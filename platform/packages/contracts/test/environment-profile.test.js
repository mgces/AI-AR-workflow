import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ProfileValidationError,
  assertEnvironmentBinding,
  computeProfileDigest,
  detectEnvironment,
  validateEnvironmentProfile,
} from '../src/environment-profile.js';

const openHarmonyProfile = {
  profile_id: 'openharmony-rk3568-v1',
  version: '1.0.0',
  environment: 'openharmony',
  component_type: null,
  product: 'rk3568',
  device_type: 'rk3568',
  abi: 'arm64-v8a',
  variant: 'root',
  out_dir: 'out/rk3568',
  root_markers: ['build.sh', 'test/testfwk/developer_test'],
  build_entry: 'build.sh',
  build_argv_template: [
    '--product-name', '${product}', '--ccache', '--build-target', '${build_target}',
  ],
  upload_backend: 'gitcode',
};

const harmonySystemProfile = {
  profile_id: 'harmonyos-system-board-v1',
  version: '1.0.0',
  environment: 'harmonyos',
  component_type: 'system',
  product: 'example-system',
  device_type: 'example-device',
  abi: 'arm64-v8a',
  variant: 'release',
  out_dir: 'out/example-system',
  root_markers: ['build_system.sh', 'system/components'],
  build_entry: 'build_system.sh',
  build_argv_template: ['--product', '${product}', '--target', '${build_target}'],
  upload_backend: 'gerrit',
};

describe('environment profile contract', () => {
  test('accepts a complete OpenHarmony profile and produces a stable digest', () => {
    const normalized = validateEnvironmentProfile(openHarmonyProfile);
    const reordered = validateEnvironmentProfile({
      upload_backend: 'gitcode',
      build_argv_template: [...openHarmonyProfile.build_argv_template],
      build_entry: 'build.sh',
      root_markers: [...openHarmonyProfile.root_markers],
      out_dir: 'out/rk3568',
      variant: 'root',
      abi: 'arm64-v8a',
      device_type: 'rk3568',
      product: 'rk3568',
      component_type: null,
      environment: 'openharmony',
      version: '1.0.0',
      profile_id: 'openharmony-rk3568-v1',
    });

    assert.equal(normalized.environment, 'openharmony');
    assert.match(computeProfileDigest(normalized), /^[a-f0-9]{64}$/);
    assert.equal(computeProfileDigest(normalized), computeProfileDigest(reordered));
  });

  test('requires an explicit HarmonyOS subtype and device profile', () => {
    assert.throws(
      () => validateEnvironmentProfile({ ...harmonySystemProfile, component_type: null }),
      (error) => error instanceof ProfileValidationError
        && error.code === 'environment_subtype_required',
    );
    assert.throws(
      () => validateEnvironmentProfile({ ...harmonySystemProfile, device_type: null }),
      (error) => error instanceof ProfileValidationError
        && error.code === 'device_type_required',
    );
    assert.equal(validateEnvironmentProfile(harmonySystemProfile).upload_backend, 'gerrit');
  });

  test('rejects unresolved placeholders in an installable profile', () => {
    assert.throws(
      () => validateEnvironmentProfile({
        ...harmonySystemProfile,
        product: 'UNSET',
      }),
      (error) => error instanceof ProfileValidationError
        && error.code === 'profile_placeholder',
    );
  });

  test('reports unknown and ambiguous detection instead of selecting a default', () => {
    assert.deepEqual(detectEnvironment({}), {
      status: 'unknown',
      candidates: [],
    });
    assert.deepEqual(detectEnvironment({
      openharmony: true,
      harmonyos_system: true,
    }), {
      status: 'ambiguous',
      candidates: ['openharmony', 'harmonyos/system'],
    });
    assert.deepEqual(detectEnvironment({ harmonyos_chip: true }), {
      status: 'detected',
      candidates: ['harmonyos/chip'],
      environment: 'harmonyos',
      component_type: 'chip',
    });
  });

  test('binds a run to the confirmed project, workspace and profile digest', () => {
    const profile = validateEnvironmentProfile(openHarmonyProfile);
    const digest = computeProfileDigest(profile);
    const binding = assertEnvironmentBinding({
      project_id: 'project-1',
      workspace_id: 'workspace-1',
      environment_profile_digest: digest,
      profile,
      confirmation: {
        confirmed: true,
        project_id: 'project-1',
        workspace_id: 'workspace-1',
        environment: 'openharmony',
        component_type: null,
        profile_digest: digest,
        actor_id: 'user-1',
      },
    });
    assert.equal(binding.profile_digest, digest);

    assert.throws(
      () => assertEnvironmentBinding({
        project_id: 'project-1',
        workspace_id: 'workspace-1',
        environment_profile_digest: digest,
        profile,
        confirmation: { confirmed: false },
      }),
      (error) => error instanceof ProfileValidationError
        && error.code === 'environment_confirmation_required',
    );
  });
});
