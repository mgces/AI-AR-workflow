import assert from 'node:assert/strict';
import test from 'node:test';
import { toStartupError } from '../src/startup-error.js';

test('startup failure preserves the concrete cause and adds an actionable recovery hint', () => {
  const result = toStartupError(Object.assign(new Error('runtime bundle is missing'), { code: 'runtime_bundle_missing' }));
  assert.deepEqual(result, {
    code: 'runtime_bundle_missing',
    message: 'runtime bundle is missing',
    recovery: '检查客户端文件是否完整；也可以重试启动或重新选择源码工作区。',
  });
});

test('startup failure safely normalizes unknown thrown values', () => {
  assert.deepEqual(toStartupError('unexpected'), {
    code: 'client_startup_failed',
    message: 'unexpected',
    recovery: '重试启动本机服务；如果仍失败，请复制错误信息反馈。',
  });
});

test('runtime resolution preserves the fallback path and exposes resolution failure to the UI', async () => {
  const { resolveStartupRuntime } = await import('../src/startup-error.js');
  const failure = Object.assign(new Error('DSH runtime files are missing'), { code: 'runtime_bundle_incomplete' });
  const result = resolveStartupRuntime({ resolveRoot: () => { throw failure; }, fallbackRoot: '/app/resources/runtime' });
  assert.deepEqual(result, {
    runtimeRoot: '/app/resources/runtime',
    startupError: {
      code: 'runtime_bundle_incomplete',
      message: 'DSH runtime files are missing',
      recovery: '客户端工作流文件不完整，请修复或重新安装客户端后重试。',
    },
  });
});

test('runtime resolution returns the verified root when complete', async () => {
  const { resolveStartupRuntime } = await import('../src/startup-error.js');
  assert.deepEqual(resolveStartupRuntime({ resolveRoot: () => '/app/resources/runtime', fallbackRoot: '/fallback' }), {
    runtimeRoot: '/app/resources/runtime', startupError: null,
  });
});
