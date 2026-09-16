import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_ALGORITHM = 'sha256';
const MIN_SECRET_BYTES = 32;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new TypeError(`HMAC secret must contain at least ${MIN_SECRET_BYTES} UTF-8 bytes`);
  }
  return secret;
}

function requireKeyId(keyId) {
  if (typeof keyId !== 'string' || keyId.trim() === '' || keyId.length > 256 || /[\0\r\n]/u.test(keyId)) {
    throw new TypeError('HMAC keyId must be a bounded non-empty string');
  }
  return keyId.trim();
}

/** Return the canonical JSON bytes covered by an Authority signature. */
export function canonicalAuthorityEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new TypeError('Authority envelope must be an object');
  }
  const unsigned = { ...envelope };
  delete unsigned.signature;
  return stableStringify(unsigned);
}

function digest(secret, envelope) {
  return createHmac(SIGNATURE_ALGORITHM, secret)
    .update(canonicalAuthorityEnvelope(envelope), 'utf8')
    .digest('base64url');
}

export function createHmacSigner({ secret, keyId = 'dsh-gateway' } = {}) {
  const material = requireSecret(secret);
  const id = requireKeyId(keyId);
  return async (envelope) => ({
    key_id: id,
    algorithm: `hmac-${SIGNATURE_ALGORITHM}`,
    value: digest(material, envelope),
  });
}

export function createHmacVerifier({ secret, keyId = 'dsh-gateway' } = {}) {
  const material = requireSecret(secret);
  const id = requireKeyId(keyId);
  return async (envelope) => {
    try {
      const signature = envelope?.signature;
      if (!signature || signature.key_id !== id || signature.algorithm !== `hmac-${SIGNATURE_ALGORITHM}` || typeof signature.value !== 'string') return false;
      const expected = Buffer.from(digest(material, envelope), 'utf8');
      const actual = Buffer.from(signature.value, 'utf8');
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  };
}

export const AUTHORITY_SIGNATURE_ALGORITHM = `hmac-${SIGNATURE_ALGORITHM}`;
export const MIN_AUTHORITY_SECRET_BYTES = MIN_SECRET_BYTES;
