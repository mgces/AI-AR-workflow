import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const main = await readFile(join(root, 'apps/desktop/src/main.js'), 'utf8').catch(() => '');
const preload = await readFile(join(root, 'apps/desktop/src/preload.cjs'), 'utf8').catch(() => '');

test('desktop renderer is isolated from Node and receives a sandboxed preload', () => {
  assert.match(main, /contextIsolation\s*:\s*true/u);
  assert.match(main, /nodeIntegration\s*:\s*false/u);
  assert.match(main, /sandbox\s*:\s*true/u);
  assert.match(main, /preload\s*:/u);
});

test('desktop preload exposes named operations without exposing Local Core credentials', () => {
  assert.match(preload, /contextBridge\.exposeInMainWorld\(['"]dsh['"]/u);
  assert.match(preload, /getStatus/u);
  assert.match(preload, /startRun/u);
  assert.match(preload, /discoverWorkspaceOptions/u);
  assert.match(preload, /configureWorkspace/u);
  assert.match(preload, /uploadReviewBundle/u);
  assert.doesNotMatch(preload, /token|authorization|localCoreOrigin|genericInvoke/iu);
});

test('cloud pairing and secret storage stay in Electron Main, not in the renderer bridge', () => {
  assert.match(main, /safeStorage\.encryptString/u);
  assert.match(main, /safeStorage\.decryptString/u);
  assert.match(preload, /pairCloud/u);
  assert.match(preload, /getCloudState/u);
});

test('human input cloud sharing uses only dedicated boolean settings IPC operations', () => {
  assert.match(preload, /getHumanInputSyncSetting/u);
  assert.match(preload, /setHumanInputSyncEnabled/u);
  assert.match(main, /registerIpc\('getHumanInputSyncSetting'/u);
  assert.match(main, /registerIpc\('setHumanInputSyncEnabled'/u);
  assert.match(main, /typeof value\.enabled !== 'boolean'/u);
  assert.match(main, /sync_human_input_content === true/u);
});
