import assert from 'node:assert/strict';
import test from 'node:test';
import { apply } from '../src/dsh/plugin.js';

test('DSH runtime plugin registers workflow tools without mounting a browser UI or HTTP routes', () => {
  const definitions = [];
  const ctx = {
    tools: { register(definition) { definitions.push(definition); return () => {}; } },
    inject() { assert.fail('active DSH runtime plugin must not mount the archived web application'); },
  };
  apply(ctx, { enableDeliveryRuntime: true });
  assert.ok(definitions.some((item) => item.name === 'ar_dev_status'));
  assert.ok(definitions.some((item) => item.name === 'ohos_delivery_start'));
  assert.ok(definitions.some((item) => item.name === 'ohos_run_observability'));
});
