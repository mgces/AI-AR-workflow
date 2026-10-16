import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEVELOPMENT_ROOT = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));

export async function loadLocalConsoleServer({ runtimeRoot = DEVELOPMENT_ROOT } = {}) {
  const entry = resolve(runtimeRoot, 'platform/apps/local-console/src/server.js');
  if (!existsSync(entry)) {
    throw Object.assign(new Error(`DSH local workflow runtime is missing: ${runtimeRoot}`), {
      code: 'runtime_bundle_incomplete',
      details: { runtime_root: resolve(runtimeRoot), entry },
    });
  }
  const runtime = await import(pathToFileURL(entry).href);
  if (typeof runtime.createLocalConsoleServer !== 'function') {
    throw Object.assign(new Error('DSH local workflow runtime has no Local Console server factory'), {
      code: 'runtime_bundle_invalid',
      details: { runtime_root: resolve(runtimeRoot), entry },
    });
  }
  return runtime.createLocalConsoleServer;
}
