import { createHash } from 'node:crypto';

function normalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('canonical JSON does not support non-finite numbers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])]),
    );
  }
  throw new TypeError(`canonical JSON does not support ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function sha256Hex(value) {
  const input = typeof value === 'string' ? value : canonicalJson(value);
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function isSha256Digest(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

export function cloneWithout(value, keys) {
  const excluded = new Set(keys);
  if (Array.isArray(value)) return value.map((item) => cloneWithout(item, keys));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !excluded.has(key))
        .map(([key, item]) => [key, cloneWithout(item, keys)]),
    );
  }
  return value;
}
