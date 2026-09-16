import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTargets } from '../bin/dsh-device-probe.js';

test('device probe parses hdc target states without executing a shell', () => {
  const parsed = parseTargets('List of devices attached\ndevice-1\tdevice\ndevice-2\toffline\n');
  assert.deepEqual(parsed, [
    { id: 'device-1', state: 'device' },
    { id: 'device-2', state: 'offline' },
  ]);
});

test('device probe reports no device for an empty hdc response', () => {
  const parsed = parseTargets('List of devices attached\n\n');
  assert.deepEqual(parsed, []);
});
