import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDshToolDefinition } from '../../src/dsh/plugin.js';

test('DSH tool definition exposes raw JSON Schema and canonical JSON output', async () => {
  const tool = {
    name: 'example',
    description: 'Example tool.',
    inputSchema: {
      type: 'object', properties: { value: { type: 'string' } }, required: ['value'],
    },
    call: async (args) => ({ ok: true, result: { echoed: args.value } }),
  };
  const definition = createDshToolDefinition(tool);
  assert.equal(definition.parameters, tool.inputSchema);
  assert.deepEqual(await definition.execute({ value: 'ok' }, { signal: new AbortController().signal }),
    { echoed: 'ok' });
  assert.deepEqual(definition.output.render({}, { echoed: 'ok' }), [
    { type: 'text', text: '{"echoed":"ok"}' },
  ]);
});

test('DSH tool definition turns domain failures into tool failures', async () => {
  const definition = createDshToolDefinition({
    name: 'example',
    description: 'Example tool.',
    inputSchema: { type: 'object' },
    call: async () => ({
      ok: false,
      error: { code: 'stale_revision', message: 'Revision changed.' },
    }),
  });
  await assert.rejects(() => definition.execute({}, { signal: new AbortController().signal }),
    (error) => error.code === 'stale_revision');
});
