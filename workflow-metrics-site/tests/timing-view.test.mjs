import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
const url = new URL('../dist/timing-view.mjs', import.meta.url);
test('timing view reports incomplete history and escapes diagnostic text', async () => {
  assert.ok(existsSync(url), 'implement timing coverage view');
  const {timingDetails} = await import(url);
  const html = timingDetails({recording_quality:{status:'incomplete',note:'<script>bad</script>',initialization_count:2},phases:[]});
  assert.match(html, /历史不完整/);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
test('old data never claims complete coverage; round timestamps remain visible', async () => {
  assert.ok(existsSync(url), 'implement timing coverage view');
  const {timingDetails} = await import(url);
  assert.match(timingDetails({phases:[]}), /未验证/);
  const html=timingDetails({recording_quality:{status:'complete'},phases:[{id:'P1',rounds_detail:[{opened_at:'2026-10-10T00:00:00Z',closed_at:'2026-10-10T00:30:00Z',kind:'work'}]}]});
  assert.ok(html.includes('2026-10-10T00:00:00Z'));
  assert.match(html, /P1/);
});
