import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hdcProbeArgs, parseTargets } from '../bin/dsh-device-probe.js';

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

test('device probe accepts connected and online HDC state labels', () => {
  assert.equal(parseTargets('serial-1 Connected')[0].state, 'connected');
  assert.equal(parseTargets('serial-1 Online')[0].state, 'online');
});

test('device probe treats a serial-only hdc target as an online device', () => {
  assert.deepEqual(parseTargets('7001005458323933328a01fce1fe3800\n'), [
    { id: '7001005458323933328a01fce1fe3800', state: 'device' },
  ]);
});

test('device probe pins an enabled relay to the configured loopback HDC server', () => {
  assert.deepEqual(hdcProbeArgs({ HDC_HOST_OVERRIDE: '127.0.0.1:18710' }), [
    '-s', '127.0.0.1:18710', 'list', 'targets',
  ]);
  assert.deepEqual(hdcProbeArgs({}), ['list', 'targets']);
  assert.throws(() => hdcProbeArgs({ HDC_HOST_OVERRIDE: '0.0.0.0:18710' }), /HDC_HOST_OVERRIDE/u);
  assert.throws(() => hdcProbeArgs({ HDC_HOST_OVERRIDE: '127.0.0.1:22' }), /HDC_HOST_OVERRIDE/u);
});
