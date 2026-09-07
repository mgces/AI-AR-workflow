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
