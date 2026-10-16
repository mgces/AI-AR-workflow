import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { createLocalConsoleServer } from '../src/server.js';

const repositoryRoot = new URL('../../../../', import.meta.url).pathname.replace(/\/$/u, '');
const registry = new Map();
const executions = [];
let stateDirectory;
let server;
let origin;

before(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), 'dsh-callback-test-'));
  server = createLocalConsoleServer({
    repoRoot: repositoryRoot,
    runtimeRoot: repositoryRoot,
    workspaceRoot: repositoryRoot,
    stateFile: join(stateDirectory, 'state.json'),
    agentSettingsFile: join(stateDirectory, 'agents.json'),
    runtimeService: { listRuns() { return []; }, close() {} },
    dshCallbackToken: 'private-dsh-callback-token-that-is-long-enough',
    dshSessionRegistry: registry,
    workspaceExecutionFactory: ({ workspace }) => ({
      workspaceId: workspace.workspace_id,
      transport: workspace.transport,
      remoteRoot: workspace.code_root,
      deliveryAdapter: { transport: workspace.transport },
      codeAgentExecutor: { async run() { return { artifactRefs: ['reports/result.md'] }; } },
      async probe() { return { status: 'available' }; },
      async preflight() { return { can_start_p0: true }; },
      async probeAgent({ provider_id }) { return { available: true, provider_id }; },
      async runCodeAgent(input, { context }) {
        executions.push({ input, context });
        return {
          output: 'Local agent analyzed the active run.', stderr: '',
          duration_ms: 100, artifact_refs: ['reports/analysis.md'],
          usage: { input_tokens: 7, output_tokens: 4, status: 'complete' },
          invocation: { execution: 'remote_tools', workspace_mode: 'remote_tools', provider: 'claude-code' },
        };
      },
    }),
    codeAgentExecutor: {
      async run(input) {
        executions.push(input);
        return {
          summary: 'Local agent analyzed the active run.', stdout: 'answer', stderr: '',
          exitCode: 0, durationMs: 100, artifactRefs: ['reports/analysis.md'],
          usage: { input_tokens: 7, output_tokens: 4, status: 'complete' },
          invocation: { execution: 'local-cli', provider: 'claude-code' },
        };
      },
    },
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  origin = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${origin}/api/workspaces/wsl-local`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transport: 'ssh', target: 'builder@10.0.0.8', code_root: '/mnt/c/ohos' }),
  });
});

after(async () => {
  registry.clear();
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  await rm(stateDirectory, { recursive: true, force: true });
});

async function request(path, body, token = 'private-dsh-callback-token-that-is-long-enough') {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, value: await response.json() };
}

test('DSH callback can execute only the provider and workspace bound to a scheduler session', async () => {
  registry.set('session-1', {
    session_id: 'session-1', provider_id: 'claude-code', model: 'claude-sonnet-4',
    context: {
      run_id: 'ar-run-1', attempt_id: 'attempt-1', phase: 'P4', role: 'build-engineer',
      workspace_root: '/mnt/c/ohos', pipeline_dir: '/mnt/c/ohos/specs/pipeline/ar-run-1',
    },
    execution: null,
  });

  const result = await request('/internal/dsh/codeagent/execute', {
    provider_id: 'claude-code', model: 'claude-sonnet-4', session_id: 'session-1',
    workspace_root: '/untrusted/from-session-header',
    system: 'Follow AR evidence gates.', messages: [{ role: 'user', content: 'Analyze the failing P4 build.' }],
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.value.output, 'Local agent analyzed the active run.');
  assert.deepEqual(result.value.artifact_refs, ['reports/analysis.md']);
  assert.equal(executions[0].context.run_id, 'ar-run-1');
  assert.equal(executions[0].context.workspace_root, '/mnt/c/ohos');
  assert.equal(executions[0].input.session_id, 'session-1');
  assert.equal(executions[0].input.messages[0].content, 'Analyze the failing P4 build.');
  assert.equal(registry.get('session-1').execution.artifactRefs[0], 'reports/analysis.md');
});

test('DSH callback rejects missing credentials, unbound sessions, and a different local CodeAgent', async () => {
  const unauthorized = await request('/internal/dsh/codeagent/execute', {
    provider_id: 'claude-code', session_id: 'session-1', messages: [{ role: 'user', content: 'x' }],
  }, 'wrong-token');
  assert.equal(unauthorized.response.status, 401);

  const unbound = await request('/internal/dsh/codeagent/execute', {
    provider_id: 'claude-code', session_id: 'missing-session', messages: [{ role: 'user', content: 'x' }],
  });
  assert.equal(unbound.response.status, 409);
  assert.equal(unbound.value.error.code, 'codeagent_session_unbound');

  const mismatch = await request('/internal/dsh/codeagent/execute', {
    provider_id: 'opencode', session_id: 'session-1', messages: [{ role: 'user', content: 'x' }],
  });
  assert.equal(mismatch.response.status, 409);
  assert.equal(mismatch.value.error.code, 'codeagent_provider_mismatch');

  const modelMismatch = await request('/internal/dsh/codeagent/execute', {
    provider_id: 'claude-code', model: 'different-model', session_id: 'session-1',
    messages: [{ role: 'user', content: 'x' }],
  });
  assert.equal(modelMismatch.response.status, 409);
  assert.equal(modelMismatch.value.error.code, 'codeagent_model_mismatch');
});
