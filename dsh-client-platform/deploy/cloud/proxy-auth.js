import { timingSafeEqual } from 'node:crypto';

const SAFE_ID = /^[A-Za-z0-9._:+@-]{1,160}$/u;

function configurationError(message) {
  return Object.assign(new Error(message), { code: 'cloud_proxy_auth_configuration_invalid' });
}

function parseIds(value, label) {
  if (!value) return [];
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (values.some((item) => !SAFE_ID.test(item))) throw configurationError(`${label} contains an invalid identifier`);
  return [...new Set(values)];
}

export async function createCloudAuth({ env = process.env } = {}) {
  const proxySecret = env.DSH_CLOUD_PROXY_AUTH_SECRET;
  const tenantId = env.DSH_CLOUD_TENANT_ID;
  const publicOrigin = env.DSH_CLOUD_PUBLIC_ORIGIN;
  if (typeof proxySecret !== 'string' || Buffer.byteLength(proxySecret) < 32) {
    throw configurationError('DSH_CLOUD_PROXY_AUTH_SECRET must contain at least 32 bytes');
  }
  if (typeof tenantId !== 'string' || !SAFE_ID.test(tenantId)) {
    throw configurationError('DSH_CLOUD_TENANT_ID is required and must be a valid identifier');
  }
  let parsedOrigin;
  try { parsedOrigin = new URL(publicOrigin); } catch { throw configurationError('DSH_CLOUD_PUBLIC_ORIGIN must be a valid HTTPS origin'); }
  if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== publicOrigin) {
    throw configurationError('DSH_CLOUD_PUBLIC_ORIGIN must be a canonical HTTPS origin without a path');
  }
  const workspaceIds = parseIds(env.DSH_CLOUD_WORKSPACE_IDS, 'DSH_CLOUD_WORKSPACE_IDS');
  const adminUsers = new Set(parseIds(env.DSH_CLOUD_ADMIN_USERS, 'DSH_CLOUD_ADMIN_USERS')
    .map((value) => value.toLowerCase()));
  const expected = Buffer.from(proxySecret, 'utf8');

  return {
    async authenticateUser(request) {
      const suppliedSecret = request?.headers?.['x-dsh-proxy-auth'];
      const userId = request?.headers?.['x-dsh-user-id'];
      if (typeof suppliedSecret !== 'string' || typeof userId !== 'string' || !SAFE_ID.test(userId)) return null;
      const actual = Buffer.from(suppliedSecret, 'utf8');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
          && request.headers.origin !== publicOrigin) return null;
      return {
        tenant_id: tenantId,
        user_id: userId,
        role: adminUsers.has(userId.toLowerCase()) ? 'tenant_admin' : 'member',
        ...(workspaceIds.length ? { workspace_ids: workspaceIds } : {}),
      };
    },
  };
}
