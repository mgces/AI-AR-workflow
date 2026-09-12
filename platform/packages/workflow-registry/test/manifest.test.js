import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  ManifestValidationError,
  computeManifestDigest,
  validateArDeliveryManifest,
  validateWorkflowManifest,
} from '../src/manifest.js';

const draft = JSON.parse(readFileSync(
  new URL('../../../../docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json', import.meta.url),
));

function installableManifest() {
  const manifest = structuredClone(draft);
  manifest.installable = true;
  manifest.source_lock_status = 'locked';
  manifest.source_lock.runtime_digest = 'a'.repeat(64);
  manifest.source_lock.skills_digest = 'b'.repeat(64);
  manifest.source_lock.dsh_version = '0.1.0';
  manifest.signature = { key_id: 'test-key', value: 'test-signature' };
  manifest.digest = computeManifestDigest(manifest);
  return manifest;
}

describe('workflow manifest contract', () => {
  test('validates the AR physical phases and consent gates', () => {
    const normalized = validateArDeliveryManifest(draft, { installable: false });
    assert.deepEqual(normalized.stages.map((stage) => stage.id), [
      'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8-precheck', 'P8-publish',
    ]);
  });

  test('rejects a draft manifest when installation is requested', () => {
    assert.throws(
      () => validateWorkflowManifest(draft),
      (error) => error instanceof ManifestValidationError
        && error.code === 'manifest_digest_required',
    );
  });

  test('accepts a signed, content-addressed manifest', () => {
    const manifest = installableManifest();
    const normalized = validateArDeliveryManifest(manifest);
    assert.equal(normalized.digest, manifest.digest);
  });

  test('rejects cycles, path traversal and missing publish receipt policy', () => {
    const cycle = installableManifest();
    cycle.stages[0].depends_on = ['P8-publish'];
    cycle.digest = computeManifestDigest(cycle);
    assert.throws(
      () => validateArDeliveryManifest(cycle),
      (error) => error instanceof ManifestValidationError && error.code === 'stage_cycle',
    );

    const escaped = installableManifest();
    escaped.stages[2].gate = '../gate_build.py';
    escaped.digest = computeManifestDigest(escaped);
    assert.throws(
      () => validateArDeliveryManifest(escaped),
      (error) => error instanceof ManifestValidationError && error.code === 'unsafe_gate_path',
    );

    const noReceipt = installableManifest();
    delete noReceipt.stages.at(-1).requires_valid_publish_receipt;
    noReceipt.digest = computeManifestDigest(noReceipt);
    assert.throws(
      () => validateArDeliveryManifest(noReceipt),
      (error) => error instanceof ManifestValidationError
        && error.code === 'publish_receipt_required',
    );
  });

  test('rejects fields outside the signed manifest contract', () => {
    const manifest = installableManifest();
    manifest.untrusted_script = 'javascript:run-anything';
    manifest.digest = computeManifestDigest(manifest);
    assert.throws(
      () => validateWorkflowManifest(manifest),
      (error) => error instanceof ManifestValidationError && error.code === 'unknown_field',
    );
  });
});
