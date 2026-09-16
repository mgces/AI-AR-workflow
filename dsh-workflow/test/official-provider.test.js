import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfficialProviderRunner } from '../src/dsh/official-provider.js';

test('official provider runner creates an isolated parent, waits for the provider result and disposes both handles', async () => {
  const calls = [];
  const disposed = [];
  const runner = createOfficialProviderRunner({
    agents: {
      async create(options) {
        calls.push(['create', options]);
        return {
          agent: { id: 'parent-agent', session: { header: { cwd: options.meta.cwd } } },
          async dispose() { disposed.push('parent'); },
        };
      },
    },
    agentDefaultModel: { currentSelection() { return { provider: 'deepseek', model: 'deepseek-chat' }; } },
    subagents: {
      async start(provider, request) {
        calls.push(['start', provider, request]);
        return {
          id: 'child-1',
          result: Promise.resolve({
            output: [{ type: 'text', text: 'done' }],
            usage: { input_tokens: 2, output_tokens: 3 },
            stopReason: 'completed',
          }),
          async dispose() { disposed.push('child'); },
        };
      },
    },
  });
  assert.equal(typeof runner, 'function');
  const result = await runner({
    definition: { provider: 'claude-code' },
    context: { run_id: 'run-1', attempt_id: 'attempt-1', workspace_root: '/workspace' },
    prompt: 'do the task',
    signal: new AbortController().signal,
  });
  assert.equal(result.output[0].text, 'done');
  assert.deepEqual(calls.map((entry) => entry[0]), ['create', 'start']);
  assert.equal(calls[0][1].meta.cwd, '/workspace');
  assert.equal(calls[0][1].agentOptions.provider, 'deepseek');
  assert.equal(calls[1][2].agentOptions.provider, 'claude-code');
  assert.equal(calls[1][2].parent.id, 'parent-agent');
  assert.deepEqual(calls[1][2].prompt, [{ type: 'text', text: 'do the task' }]);
  assert.equal(calls[1][2].agentOptions.model, undefined);
  assert.deepEqual(disposed, ['child', 'parent']);
});

test('official provider runner maps non-completed provider results to actionable errors', async () => {
  const runner = createOfficialProviderRunner({
    agents: { async create() { return { agent: {}, async dispose() {} }; } },
    subagents: {
      async start() {
        return {
          result: Promise.resolve({ output: [], stopReason: 'aborted' }),
          async dispose() {},
        };
      },
    },
  });
  await assert.rejects(
    () => runner({ definition: { provider: 'claude-code' }, context: { workspace_root: '/workspace' }, prompt: 'x', signal: new AbortController().signal }),
    (error) => error.code === 'codeagent_cancelled',
  );
});

test('official provider runner reads usage from the child session event log', async () => {
  const runner = createOfficialProviderRunner({
    agents: {
      async create() {
        return { agent: { id: 'parent' }, async dispose() {} };
      },
    },
    subagents: {
      async start() {
        return {
          id: 'child-with-usage',
          localAgent: {
            session: {
              ownEvents() {
                return [
                  { type: 'assistant/message', data: { usage: { inputTokens: 11, outputTokens: 7, cacheReadTokens: 3 } } },
                  { type: 'tool/result', data: {} },
                  { type: 'assistant/message', data: { usage: { inputTokens: 2, outputTokens: 1, reasoningTokens: 4 } } },
                ];
              },
            },
          },
          result: Promise.resolve({ output: [{ type: 'text', text: 'done' }], stopReason: 'completed' }),
          async dispose() {},
        };
      },
    },
  });
  const result = await runner({
    definition: { provider: 'claude-code' },
    context: { workspace_root: '/workspace' },
    prompt: 'inspect',
    signal: new AbortController().signal,
  });
  assert.deepEqual(result.usage, {
    input_tokens: 13,
    output_tokens: 8,
    total_tokens: 21,
    cache_read_tokens: 3,
    cache_write_tokens: null,
    reasoning_tokens: 4,
  });
});
