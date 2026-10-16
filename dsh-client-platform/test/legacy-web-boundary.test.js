import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const canRead = async (path) => access(path).then(() => true, () => false);

test('old DSH web UI assets are archived under the pending-delete boundary', async () => {
  assert.equal(await canRead(join(root, 'pending-delete/legacy-dsh-web/README.md')), true);
  assert.equal(await canRead(join(root, 'dsh-workflow/src/dsh/client.js')), false);
  assert.equal(await canRead(join(root, 'dsh-workflow/src/dsh/web-routes.js')), false);
  assert.equal(await canRead(join(root, 'dsh-workflow/src/dsh/connector-client-package.js')), false);
});

test('active DSH bundle no longer declares the archived browser panel', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'dsh-workflow/package.json'), 'utf8'));
  assert.equal(manifest.exports?.['./client'], undefined);
  assert.equal(manifest.dsh?.client, undefined);
});
