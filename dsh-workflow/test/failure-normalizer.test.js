import assert from 'node:assert/strict';
import test from 'node:test';
import { FailureNormalizer } from '../src/core/failure-normalizer.js';

test('classifies signed evidence failures before generic build text', async () => {
  const normalizer = await new FailureNormalizer().load();
  const result = normalizer.classify({
    stderr: 'REFUSED: signed manifest HMAC mismatch while checking build artifact sha',
  });
  assert.equal(result.failureClass, 'authority_or_signature_invalid');
  assert.equal(result.strategy.automatic, false);
});

test('classifies compiler failures as automatically repairable', async () => {
  const normalizer = await new FailureNormalizer().load();
  const result = normalizer.classify({ stderr: 'linker: undefined reference to Foo' });
  assert.equal(result.failureClass, 'compile_error');
  assert.equal(result.strategy.automatic, true);
  assert.equal(result.strategy.maxAttempts, 2);
});
