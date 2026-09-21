import assert from 'node:assert/strict';
import test from 'node:test';
import { createCodeAgentAnalyzer } from '../src/dsh/ai-analyzer.js';

test('AI analyzer dispatches the exact diagnostic prompt through the selected CodeAgent', async () => {
  const calls = [];
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace',
    codeAgents: {
      async resolveSelected(requested, options) {
        assert.equal(requested, undefined);
        assert.equal(options.requireDispatchable, true);
        return { id: 'claude-code', name: 'Claude Code', kind: 'official-provider', provider: 'claude-code' };
      },
    },
    executor: {
      async run(input) {
        calls.push(input);
        return {
          stdout: '检查结论：hdc 位于本地 Connector，而不是 DSH 服务进程。',
          stderr: '',
          usage: { input_tokens: 12, output_tokens: 9, total_tokens: 21 },
          durationMs: 18,
        };
      },
    },
  });

  const result = await analyzer({ prompt: '只分析问题，不修改代码。' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].context.prompt_override, '只分析问题，不修改代码。');
  assert.equal(calls[0].context.analysis_mode, true);
  assert.equal(calls[0].context.workspace_root, '/workspace');
  assert.equal(calls[0].context.pipeline_dir, '/workspace/.dsh/ai-analysis');
  assert.equal(result.message, '检查结论：hdc 位于本地 Connector，而不是 DSH 服务进程。');
  assert.equal(result.agent.id, 'claude-code');
  assert.equal(result.backend, 'codeagent');
  assert.equal(result.usage.total_tokens, 21);
});

test('AI analyzer extracts assistant text from CodeAgent JSON output and serializes concurrent requests', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace',
    codeAgents: { async resolveSelected() { return { id: 'opencode', name: 'OpenCode', adapter: 'opencode-cli' }; } },
    executor: {
      async run() {
        await gate;
        return { stdout: '{"type":"message","message":{"content":[{"type":"text","text":"本地 Agent 回复"}]}}\n' };
      },
    },
  });
  const first = analyzer({ prompt: 'first' });
  await assert.rejects(analyzer({ prompt: 'second' }), (error) => error.code === 'ai_analysis_busy');
  release();
  assert.equal((await first).message, '本地 Agent 回复');
});

test('AI analyzer rejects blank and oversized prompts before dispatch', async () => {
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace',
    codeAgents: { async resolveSelected() { throw new Error('must not resolve'); } },
    executor: { async run() { throw new Error('must not run'); } },
  });
  await assert.rejects(analyzer({ prompt: '   ' }), (error) => error.code === 'ai_prompt_required');
  await assert.rejects(analyzer({ prompt: 'x'.repeat(128 * 1024 + 1) }), (error) => error.code === 'ai_prompt_too_large');
});

test('AI analyzer supplies bounded prior CodeAgent dialogue as context', async () => {
  let dispatched = '';
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace',
    codeAgents: { async resolveSelected() { return { id: 'codex', name: 'Codex CLI', adapter: 'codex-cli' }; } },
    executor: { async run({ context }) { dispatched = context.prompt_override; return { stdout: '继续回答' }; } },
  });
  await analyzer({
    prompt: '那下一步呢？',
    history: [
      { role: 'user', content: '为什么 hdc 不可用？' },
      { role: 'assistant', content: 'DSH 服务进程没有继承本地 PATH。' },
    ],
  });
  assert.match(dispatched, /此前对话/);
  assert.match(dispatched, /用户：为什么 hdc 不可用/);
  assert.match(dispatched, /CodeAgent：DSH 服务进程没有继承本地 PATH/);
  assert.match(dispatched, /当前用户请求：\n那下一步呢/);
});

test('AI analyzer exposes live status and supports cancellation', async () => {
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace',
    codeAgents: { async resolveSelected() { return { id: 'claude-code', name: 'Claude Code', provider: 'claude-code' }; } },
    executor: {
      async run({ signal }) {
        await new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      },
    },
  });
  const pending = analyzer({ prompt: 'test' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(analyzer.status().running, true);
  assert.equal(analyzer.status().agent.id, 'claude-code');
  assert.equal(analyzer.cancel('cancelled by test').cancelled, true);
  await assert.rejects(pending, (error) => error.code === 'ai_analysis_cancelled');
  assert.equal(analyzer.status().running, false);
  assert.equal(analyzer.status().last.status, 'cancelled');
});

test('AI analyzer fails a stuck CodeAgent with a bounded timeout', async () => {
  const analyzer = createCodeAgentAnalyzer({
    workspaceRoot: '/workspace', timeoutMs: 20,
    codeAgents: { async resolveSelected() { return { id: 'claude-code', name: 'Claude Code', provider: 'claude-code' }; } },
    executor: { async run() { await new Promise(() => {}); } },
  });
  await assert.rejects(analyzer({ prompt: 'test' }), (error) => error.code === 'ai_analysis_timeout');
  assert.equal(analyzer.status().running, false);
  assert.equal(analyzer.status().last.status, 'timeout');
});
