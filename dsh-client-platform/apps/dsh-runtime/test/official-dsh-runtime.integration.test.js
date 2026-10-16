import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const DSH_PACKAGES = resolve(HERE, '../../../../dsh-workflow/node_modules/@deepseek-ai');

async function loadDshPackage(packageName) {
  const entry = join(DSH_PACKAGES, packageName, 'lib/index.js');
  return import(pathToFileURL(entry).href);
}

test('official Cordis, LLM, and Tool APIs drive a local CodeAgent turn without a DSH model route', async () => {
  const [{ Context }, { SystemPrompt }, { LlmRuntime }, { ToolRegistry }, providerPlugin] = await Promise.all([
    loadDshPackage('cordis'),
    loadDshPackage('dsh-system-prompt'),
    loadDshPackage('dsh-llm'),
    loadDshPackage('dsh-tools'),
    import('../src/codeagent-provider.js'),
  ]);
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init.body);
    calls.push({ path, authorization: init.headers.authorization, body });
    return new Response(JSON.stringify(path.endsWith('/probe')
      ? { available: true }
      : { output: 'The selected local CodeAgent completed the edit.', usage: { input_tokens: 21, output_tokens: 13 }, duration_ms: 3000 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const ctx = new Context();
  try {
    await ctx.plugin(SystemPrompt);
    await ctx.plugin(ToolRegistry);
    await ctx.plugin(LlmRuntime);
    await ctx.plugin({ name: providerPlugin.name, inject: providerPlugin.inject, apply: providerPlugin.apply }, {
      endpoint: 'http://127.0.0.1:43129',
      token: '0123456789abcdef0123456789abcdef',
      agentIds: ['claude-code'],
      fetchImpl,
    });

    assert.deepEqual(ctx.llm.listProviders().map((provider) => provider.id), ['dsh-local-codeagent-claude-code']);
    assert.deepEqual(ctx.tools.schemas().map((tool) => tool.name), ['dsh_local_codeagent_execute']);
    const request = {
      provider: 'dsh-local-codeagent-claude-code',
      model: 'claude-sonnet-4',
      sessionId: 'dsh-session-42',
      system: 'Use the AR workflow and never claim a gate passed without evidence.',
      tools: ctx.tools.schemas(),
      signal: new AbortController().signal,
      messages: [{
        id: 'user-message-1',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Fix the failing P4 build.' }],
      }],
    };

    const firstTurn = [];
    for await (const chunk of ctx.llm.stream(request)) firstTurn.push(chunk);
    const call = firstTurn.find((chunk) => chunk.type === 'block-end' && chunk.block.type === 'tool-call')?.block;
    assert.equal(call?.name, 'dsh_local_codeagent_execute');
    assert.equal(firstTurn.at(-1)?.reason?.kind, 'tool-calls');

    const toolResult = await ctx.tools.execute({
      callId: call.id,
      name: call.name,
      arguments: JSON.parse(call.arguments),
      signal: new AbortController().signal,
      agent: {
        id: request.sessionId,
        options: { provider: request.provider, model: request.model },
        session: { id: request.sessionId, header: { cwd: '/authorized/source' } },
      },
    });
    assert.equal(toolResult.isError, false);

    const secondTurn = [];
    for await (const chunk of ctx.llm.stream({
      ...request,
      messages: [
        ...request.messages,
        { id: 'tool-result-1', role: 'user', source: { kind: 'tool', callId: call.id }, content: [{
          type: 'tool-result', toolCallId: call.id, content: toolResult.content,
        }] },
      ],
    })) secondTurn.push(chunk);
    assert.ok(secondTurn.some((chunk) => chunk.type === 'text-delta' && chunk.text.includes('selected local CodeAgent')));
    assert.ok(secondTurn.some((chunk) => chunk.type === 'usage' && chunk.usage.inputTokens === 21 && chunk.usage.outputTokens === 13));
    assert.equal(secondTurn.at(-1)?.reason?.kind, 'stop');
    assert.deepEqual(calls.map((call) => call.path), [
      '/internal/dsh/codeagent/probe',
      '/internal/dsh/codeagent/execute',
      '/internal/dsh/codeagent/probe',
    ]);
    assert.equal(calls[1].body.provider_id, 'claude-code');
    assert.equal(calls[1].body.session_id, 'dsh-session-42');
    assert.equal(calls[1].body.workspace_root, '/authorized/source');
    assert.equal(calls[1].body.messages[0].content, 'Fix the failing P4 build.');
    assert.equal(calls[1].body.tools, undefined);
    assert.equal(calls.every((call) => call.authorization === 'Bearer 0123456789abcdef0123456789abcdef'), true);
  } finally {
    await ctx.fiber.dispose();
  }
});
