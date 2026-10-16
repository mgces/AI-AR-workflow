import assert from 'node:assert/strict';
import test from 'node:test';
import { createDshCodeAgentExecutor } from '../src/dsh-codeagent-executor.js';
import { buildCodeAgentPrompt } from '../../../../platform/apps/local-console/src/codeagent-executor.js';

test('DSH scheduler executor binds the AR context before the SDK session and returns the delegated local-agent evidence', async () => {
  const registry = new Map();
  let request;
  const runtime = {
    async run(value) {
      request = value;
      const session = registry.get(value.session_id);
      assert.ok(session);
      assert.equal(session.provider_id, 'claude-code');
      assert.equal(session.context.run_id, 'run-1');
      session.execution = {
        summary: 'Fixed P4', stdout: 'Changed a file', stderr: '', exitCode: 0,
        durationMs: 812, usage: { input_tokens: 20, output_tokens: 8, status: 'complete' },
        artifactRefs: ['reports/fix.md'], invocation: { execution: 'local_cli', provider: 'claude-code' },
      };
      return { session_id: value.session_id, final_response: 'Fixed P4' };
    },
  };
  const executor = createDshCodeAgentExecutor({ runtime, sessionRegistry: registry, promptBuilder: buildCodeAgentPrompt });
  const result = await executor.run({
    definition: { id: 'claude-code', model: 'claude-sonnet-4' },
    context: {
      run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P4', role: 'build-engineer',
      workspace_root: '/mnt/c/source', pipeline_dir: '/mnt/c/source/specs/pipeline/run-1',
      environment_profile: 'openharmony',
    },
  });

  assert.equal(request.provider_id, 'claude-code');
  assert.equal(request.model, 'claude-sonnet-4');
  assert.match(request.prompt, /Run: run-1; phase: P4; role: build-engineer/u);
  assert.equal(result.summary, 'Fixed P4');
  assert.deepEqual(result.artifactRefs, ['reports/fix.md']);
  assert.deepEqual(result.usage, { input_tokens: 20, output_tokens: 8, status: 'complete' });
  assert.equal(result.invocation.execution, 'dsh-sdk-local-codeagent');
  assert.equal(registry.size, 0);
});

test('DSH executor fails closed when the local CodeAgent callback did not produce gate artifacts', async () => {
  const registry = new Map();
  const executor = createDshCodeAgentExecutor({
    sessionRegistry: registry,
    runtime: { async run(value) { return { session_id: value.session_id, final_response: 'It is done.' }; } },
  });
  await assert.rejects(executor.run({
    definition: { id: 'opencode' }, context: { run_id: 'run-2', phase: 'P1', workspace_root: '/work', pipeline_dir: '/work/pipeline' },
  }), { code: 'dsh_local_execution_missing' });
  assert.equal(registry.size, 0);
});
