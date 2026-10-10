import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
const url=new URL('../dist/upload-view.mjs',import.meta.url);
test('upload waits stay separate from failures and diagnostic text is escaped',async()=>{
  assert.ok(existsSync(url),'implement upload wait history view');
  const {uploadWaitDetails}=await import(url);
  const html=uploadWaitDetails({phases:[{id:'P8',upload_wait_history:[{kind:'ci_wait',reason:'<img src=x>',pr:4593,at:'2026-10-10T00:00:00Z'}]}]});
  assert.match(html,/CI 等待/);assert.match(html,/4593/);
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
  assert.match(html,/不计为门禁失败/);
});
test('old snapshots do not invent zero waits',async()=>{
  assert.ok(existsSync(url),'implement upload wait history view');
  const {uploadWaitDetails}=await import(url);
  assert.match(uploadWaitDetails({phases:[{id:'P8'}]}),/未记录/);
});
