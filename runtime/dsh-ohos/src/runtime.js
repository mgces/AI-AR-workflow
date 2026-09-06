import { resolve } from 'node:path';
import { OhosController } from './controller.js';
import { loadOrCreateCredentialKey, TaskCredentials } from './core/credential.js';
import { SqliteStore } from './core/store/sqlite-store.js';
import { createToolCatalog } from './tools/catalog.js';
import { PythonDeliveryAdapter } from './workflows/ar-delivery/python-adapter.js';

export function createRuntime(options = {}) {
  const dataRoot = resolve(options.dataRoot ?? process.env.OHOS_DSH_DATA_ROOT ?? '.dsh-ohos');
  const databasePath = options.databasePath ?? resolve(dataRoot, 'controller.sqlite3');
  const keyPath = options.keyPath ?? resolve(dataRoot, 'task-credential.key');
  const store = options.store ?? new SqliteStore(databasePath);
  const credentials = options.credentials
    ?? new TaskCredentials(loadOrCreateCredentialKey(keyPath));
  const deliveryAdapter = options.deliveryAdapter ?? new PythonDeliveryAdapter({
    pythonCommand: options.pythonCommand,
    scriptsRoot: options.deliveryScriptsRoot,
    bridgePath: options.deliveryBridgePath,
    timeoutMs: options.deliveryCommandTimeoutMs,
  });
  const controller = new OhosController({
    store,
    credentials,
    deliveryAdapter,
    requirementPreflight: options.requirementPreflight,
    requirementSkillsRoot: options.requirementSkillsRoot,
    pythonCommand: options.pythonCommand,
    clock: options.clock,
    leaseMs: options.leaseMs,
  });
  const principal = options.principal ?? process.env.OHOS_DSH_PRINCIPAL ?? 'all';
  return {
    controller,
    store,
    tools: createToolCatalog(controller, { principal }),
    close: () => store.close(),
  };
}
