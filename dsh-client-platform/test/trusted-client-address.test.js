import assert from 'node:assert/strict';
import test from 'node:test';
import { trustedClientAddress } from '../apps/cloud-api/src/client-address.js';

test('pairing client identity uses the forwarded IP only behind the explicitly trusted proxy', () => {
  const request = { headers: { 'x-dsh-client-ip': '203.0.113.7' }, socket: { remoteAddress: '10.20.0.5' } };
  assert.equal(trustedClientAddress(request), '10.20.0.5');
  assert.equal(trustedClientAddress(request, { trustProxy: true }), '203.0.113.7');
});

test('pairing client identity rejects malformed forwarded addresses and falls back safely', () => {
  const request = { headers: { 'x-dsh-client-ip': 'spoofed, 203.0.113.7' }, socket: { remoteAddress: '10.20.0.5' } };
  assert.equal(trustedClientAddress(request, { trustProxy: true }), '10.20.0.5');
  assert.equal(trustedClientAddress({ headers: {}, socket: {} }, { trustProxy: true }), 'unknown');
});
