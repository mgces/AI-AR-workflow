import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ModuleRegistry } from '../src/core/module-registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('resolves transitive SA modules without loading unrelated NAPI module', async () => {
  const registry = await new ModuleRegistry({ workspaceRoot: ROOT }).load();
  const modules = registry.resolve({
    workflow: 'development',
    phase: 'P2',
    taskTags: ['sa', 'cpp', 'ipc'],
  });
  const ids = modules.map((item) => item.id);
  assert.ok(ids.includes('ohos-dev-sa-codegen'));
  assert.ok(ids.includes('ohos-dev-cpp-coding-style'));
  assert.ok(ids.includes('ohos-dev-security-code-review'));
  assert.ok(!ids.includes('ohos-dev-napi-module'));
});

test('adds build diagnosis module for compile repair', async () => {
  const registry = await new ModuleRegistry({ workspaceRoot: ROOT }).load();
  const ids = registry.resolve({
    workflow: 'development',
    phase: 'P4',
    failureClass: 'compile_error',
  }).map((item) => item.id);
  assert.ok(ids.includes('ohos-dev-build-execution-diagnosis'));
  assert.ok(ids.includes('ohos-dev-cpp-coding-style'));
});
