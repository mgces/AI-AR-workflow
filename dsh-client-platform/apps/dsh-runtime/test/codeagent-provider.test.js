import assert from 'node:assert/strict';
import { test } from 'node:test';

let moduleUnderTest;
try {
  moduleUnderTest = await import('../src/codeagent-provider.js');
} catch {
  moduleUnderTest = null;
}

function fakeContext() {
  const routes = new Map();
  const toolDefinitions = new Map();
  const tools = {
    register(definition) { toolDefinitions.set(definition.name, definition); return () => toolDefinitions.delete(definition.name); },
    has(name) { return toolDefinitions.has(name); },
    get(name) { return toolDefinitions.get(name); },
    get size() { return toolDefinitions.size; },
  };
  return {
    routes,
    tools,
    llm: { registerAdapter(providers, adapter) { for (const provider of providers) routes.set(provider, adapter); return () => providers.forEach((provider) => routes.delete(provider)); } },
  };
}

function chunksFor(adapter, options) {
  return (async () => {
    const chunks = [];
    for await (const chunk of adapter.stream(options)) chunks.push(chunk);
    return chunks;
  })();
}

test('exports the official DSH local CodeAgent provider plugin', () => {
  assert.equal(typeof moduleUnderTest?.apply, 'function');
  assert.equal(moduleUnderTest?.name, 'dsh-local-codeagent-provider');
});

test('registers explicit local CodeAgent routes and a DSH tool-call bridge', () => {
  assert.equal(typeof moduleUnderTest?.apply, 'function');
  const ctx = fakeContext();
  const dispose = moduleUnderTest.apply(ctx, {
    endpoint: 'http://127.0.0.1:12345', token: 'local-runtime-token-with-32bytes',
    agentIds: ['claude-code', 'opencode'], fetchImpl: async () => { throw new Error('not expected'); },
  });
  assert.deepEqual([...ctx.routes.keys()], ['dsh-local-codeagent-claude-code', 'dsh-local-codeagent-opencode']);
  assert.equal(typeof ctx.routes.get('dsh-local-codeagent-claude-code')?.providerRetryPolicy, 'function');
  assert.ok(ctx.tools.has('dsh_local_codeagent_execute'));
  assert.equal(typeof dispose, 'function');
  dispose();
  assert.equal(ctx.routes.size, 0);
  assert.equal(ctx.tools.size, 0);
});

test('records a real DSH tool call, invokes only the selected local CodeAgent, and logs usage in the session stream', async () => {
  assert.equal(typeof moduleUnderTest?.apply, 'function');
  const requests = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init.body);
    requests.push({ method: init.method, authorization: init.headers.authorization, path, body });
    return new Response(JSON.stringify(path.endsWith('/probe')
      ? { available: true, provider_id: body.provider_id }
      : { output: 'Implemented locally by Claude Code.', stderr: 'compiler warning', usage: { input_tokens: 17, output_tokens: 8, total_tokens: 25 }, duration_ms: 1200, artifact_refs: ['evidence/P4/build.log'], invocation: { execution: 'remote_tools', workspace_mode: 'remote_tools' } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  const ctx = fakeContext();
  moduleUnderTest.apply(ctx, { endpoint: 'http://127.0.0.1:12345', token: 'local-runtime-token-with-32bytes', agentIds: ['claude-code'], fetchImpl });
  const provider = ctx.routes.get('dsh-local-codeagent-claude-code');
  assert.ok(provider);
  assert.deepEqual(await provider.resolveModel('dsh-local-codeagent-claude-code', 'claude-sonnet-4'), {
    provider: 'dsh-local-codeagent-claude-code', id: 'claude-sonnet-4', name: 'claude-sonnet-4',
  });

  const first = await chunksFor(provider, {
    provider: 'dsh-local-codeagent-claude-code', model: 'claude-sonnet-4', sessionId: 'session-1',
    system: 'Follow the AR workflow gate evidence.',
    tools: [{ name: 'dsh_local_codeagent_execute' }, { name: 'bash' }], signal: new AbortController().signal,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Fix the compile error.' }] }],
  });
  const toolCall = first.find((chunk) => chunk.type === 'block-end' && chunk.block.type === 'tool-call')?.block;
  assert.equal(toolCall?.name, 'dsh_local_codeagent_execute');
  assert.equal(first.at(-1)?.type, 'finish');
  assert.equal(first.at(-1)?.reason.kind, 'tool-calls');

  const result = await ctx.tools.get('dsh_local_codeagent_execute').execute({}, {
    agent: {
      id: 'session-1', options: { provider: 'dsh-local-codeagent-claude-code', model: 'claude-sonnet-4' },
      session: { id: 'session-1', header: { cwd: '/safe/repo' } },
    },
    signal: new AbortController().signal,
  });
  assert.equal(result.output, 'Implemented locally by Claude Code.');
  assert.equal(result.stderr, 'compiler warning');
  assert.deepEqual(result.artifact_refs, ['evidence/P4/build.log']);
  assert.deepEqual(result.invocation, { execution: 'remote_tools', provider: 'claude-code', model: 'claude-sonnet-4', workspace_mode: 'remote_tools' });
  assert.equal(requests.at(-1)?.authorization, 'Bearer local-runtime-token-with-32bytes');
  assert.equal(requests.at(-1)?.path, '/internal/dsh/codeagent/execute');
  assert.equal(requests.at(-1)?.body.provider_id, 'claude-code');
  assert.equal(requests.at(-1)?.body.model, 'claude-sonnet-4');
  assert.equal(requests.at(-1)?.body.session_id, 'session-1');
  assert.equal(requests.at(-1)?.body.workspace_root, '/safe/repo');
  assert.equal(requests.at(-1)?.body.system, 'Follow the AR workflow gate evidence.');
  assert.deepEqual(requests.at(-1)?.body.messages[0], { role: 'user', content: 'Fix the compile error.' });
  assert.equal(Object.hasOwn(requests.at(-1).body, 'tools'), false);

  const second = await chunksFor(provider, {
    provider: 'dsh-local-codeagent-claude-code', model: 'claude-sonnet-4', sessionId: 'session-1',
    messages: [{ role: 'user', content: [{ type: 'tool-result', toolCallId: toolCall.id, content: [{ type: 'text', text: JSON.stringify(result) }] }] }],
  });
  assert.ok(second.some((chunk) => chunk.type === 'text-delta' && chunk.text.includes('Implemented locally')));
  assert.ok(second.some((chunk) => chunk.type === 'usage' && chunk.usage.inputTokens === 17 && chunk.usage.outputTokens === 8));
  assert.equal(second.at(-1)?.type, 'finish');
  assert.equal(second.at(-1)?.reason.kind, 'stop');
});

test('fails closed on missing local runtime credentials and on CodeAgent errors without a DeepSeek fallback', async () => {
  assert.equal(typeof moduleUnderTest?.apply, 'function');
  const missingContext = fakeContext();
  assert.throws(() => moduleUnderTest.apply(missingContext, { endpoint: 'http://127.0.0.1:1' }), { code: 'dsh_codeagent_runtime_auth_missing' });

  const ctx = fakeContext();
  moduleUnderTest.apply(ctx, {
    endpoint: 'http://127.0.0.1:12345', token: 'local-runtime-token-with-32bytes', agentIds: ['opencode'],
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'codeagent_unavailable' } }), {
      status: 503, headers: { 'content-type': 'application/json' },
    }),
  });
  const provider = ctx.routes.get('dsh-local-codeagent-opencode');
  await assert.rejects(provider.resolveModel('dsh-local-codeagent-opencode', 'default'), { code: 'codeagent_unavailable' });
  assert.equal([...ctx.routes.keys()].some((name) => name.includes('deepseek')), false);
});

test('does not silently flatten image, tool-call, or tool-result content into a CodeAgent prompt', async () => {
  assert.equal(typeof moduleUnderTest?.apply, 'function');
  const ctx = fakeContext();
  moduleUnderTest.apply(ctx, {
    endpoint: 'http://127.0.0.1:12345', token: 'local-runtime-token-with-32bytes', agentIds: ['codex'],
    fetchImpl: async () => { throw new Error('must reject before IO'); },
  });
  const provider = ctx.routes.get('dsh-local-codeagent-codex');
  await assert.rejects(async () => {
    for await (const _chunk of provider.stream({
      provider: 'dsh-local-codeagent-codex', model: 'default', sessionId: 'session-image',
      messages: [{ role: 'user', content: [{ type: 'image', data: 'private' }] }],
    })) { /* collect */ }
  }, { code: 'codeagent_content_unsupported' });
});
