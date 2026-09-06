import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ProtocolError } from './errors.js';

export function loadOrCreateCredentialKey(keyPath) {
  if (existsSync(keyPath)) {
    const key = readFileSync(keyPath);
    if (key.length < 32) throw new ProtocolError('invalid_configuration',
      'The task credential key must contain at least 32 bytes.');
    return key;
  }
  mkdirSync(dirname(keyPath), { recursive: true });
  const key = randomBytes(32);
  try {
    writeFileSync(keyPath, key, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const concurrentKey = readFileSync(keyPath);
    if (concurrentKey.length < 32) throw new ProtocolError('invalid_configuration',
      'The concurrently created task credential key is invalid.');
    return concurrentKey;
  }
  try { chmodSync(keyPath, 0o600); } catch { /* Windows ACLs are configured separately. */ }
  return key;
}

export class TaskCredentials {
  constructor(key) {
    this.key = key;
  }

  issue(attemptId, leaseEpoch) {
    const subject = `${attemptId}:${leaseEpoch}`;
    const signature = createHmac('sha256', this.key).update(subject).digest('base64url');
    return `${attemptId}.${leaseEpoch}.${signature}`;
  }

  verify(token, expectedAttemptId, expectedLeaseEpoch) {
    if (typeof token !== 'string') return false;
    const expected = this.issue(expectedAttemptId, expectedLeaseEpoch);
    const actualBytes = Buffer.from(token);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  }
}
