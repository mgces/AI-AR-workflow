import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '../..');
