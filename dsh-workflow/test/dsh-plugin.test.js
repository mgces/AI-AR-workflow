import assert from 'node:assert/strict';
import test from 'node:test';
import { apply } from '../src/dsh/plugin.js';

test('DSH Cordis plugin registers the shared controller tools', async () => {
  const definitions = [];
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
  });
  assert.equal(definitions.length, 12);
  assert.ok(definitions.some((item) => item.name === 'ar_dev_gate'));
  assert.ok(definitions.some((item) => item.name === 'ar_evolution_proposals'));
  const resolver = definitions.find((item) => item.name === 'ar_module_resolve');
  const result = await resolver.execute({
    workflow: 'development',
    phase: 'P2',
    taskTags: ['sa'],
  });
  assert.ok(result.modules.some((item) => item.id === 'ohos-dev-sa-codegen'));
});

test('DSH Cordis plugin can register the authoritative delivery tools for the official Web UI', () => {
  const definitions = [];
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
  }, { enableDeliveryRuntime: true });
  assert.ok(definitions.some((item) => item.name === 'ohos_delivery_start'));
  assert.ok(definitions.some((item) => item.name === 'ohos_run_observability'));
  assert.ok(definitions.some((item) => item.name === 'ohos_run_artifacts'));
});

test('DSH Cordis plugin mounts the AR route on the official authenticated Web Server', () => {
  const routes = [];
  const definitions = [];
  const webCtx = {
    connection: { requestRejection() { return undefined; } },
    webServer: { register(route) { routes.push(route); return () => {}; } },
    effect(fn) { return fn(); },
  };
  apply({
    tools: {
      register(definition) {
        definitions.push(definition);
        return () => {};
      },
    },
    inject(_services, callback) { callback(webCtx); },
  }, { enableDeliveryRuntime: true, repoRoot: '/workspace' });
  assert.ok(definitions.some((item) => item.name === 'ohos_run_observability'));
  assert.equal(routes.length, 1);
  assert.equal(routes[0].kind, 'prefix');
  assert.equal(routes[0].path, '/api/ohos-ar');
});
