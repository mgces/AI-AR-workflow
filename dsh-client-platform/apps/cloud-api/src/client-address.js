import { isIP } from 'node:net';

export function trustedClientAddress(request, { trustProxy = false } = {}) {
  const peer = request?.socket?.remoteAddress;
  if (trustProxy) {
    const forwarded = request?.headers?.['x-dsh-client-ip'];
    if (typeof forwarded === 'string' && isIP(forwarded)) return forwarded;
  }
  return typeof peer === 'string' && peer ? peer : 'unknown';
}
