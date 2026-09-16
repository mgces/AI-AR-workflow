import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeliveryRuntimeTools } from '../src/dsh/delivery-runtime.js';

test('DSH delivery tools preserve the authoritative runtime input and observability projection', async () => {
  const calls = [];
  const service = {
    async start(input) { calls.push(['start', input]); return { run_id: input.runId, status: 'awaiting_host' }; },
    async status(runId) { calls.push(['status', runId]); return { run_id: runId, observability: { stage_count: 10 } }; },
  };
  const definitions = createDeliveryRuntimeTools({ service });
  const start = definitions.find((item) => item.name === 'ohos_delivery_start');
  const observability = definitions.find((item) => item.name === 'ohos_run_observability');
  assert.ok(start);
  assert.deepEqual(await start.execute({
    input_ref: 'inline://ar', idempotency_key: 'idempotent', ar_text: '# AR',
    repo_root: '/workspace', environment: 'openharmony', component_type: 'system',
    publication: { backend: 'gitcode', repo_slug: 'owner/repo', branch: 'feature/x' },
  }), { run_id: undefined, status: 'awaiting_host' });
  assert.deepEqual(calls[0], ['start', {
    runId: undefined, inputRef: 'inline://ar', arText: '# AR', arPath: undefined,
    pipelineDir: undefined, repoRoot: '/workspace', environment: 'openharmony',
    componentType: 'system', deviceType: undefined, deviceSerial: undefined,
    gitDir: undefined, buildTarget: undefined, part: undefined, baseCommit: undefined,
    agent: undefined, model: undefined, confirmDefaults: undefined, skills: undefined,
    publication: { backend: 'gitcode', repo_slug: 'owner/repo', branch: 'feature/x' },
    idempotencyKey: 'idempotent',
  }]);
  assert.deepEqual(await observability.execute({ run_id: 'ar-1' }), { stage_count: 10 });
  assert.deepEqual(calls[1], ['status', 'ar-1']);
});

test('DSH delivery tools expose full artifact content, human input and RAG operations', async () => {
  const calls = [];
  const service = {
    async artifactContent(runId, path) { calls.push(['artifactContent', runId, path]); return { run_id: runId, content: 'report' }; },
    async recordHumanInput(input) { calls.push(['input', input]); return { recorded: true }; },
    async ragStatus() { calls.push(['ragStatus']); return { state: 'ready' }; },
    async ragIndex() { calls.push(['ragIndex']); return { state: 'ready', file_count: 2 }; },
    async ragSearch(query) { calls.push(['ragSearch', query]); return { status: 'ready', query, results: [] }; },
    async ragProfile() { calls.push(['ragProfile']); return { mode: 'local_lexical', execution: 'active' }; },
    async ragProfileUpdate(profile) { calls.push(['ragProfileUpdate', profile]); return { model_profile: { ...profile, execution: 'planned' } }; },
  };
  const definitions = createDeliveryRuntimeTools({ service });
  const artifact = definitions.find((item) => item.name === 'ohos_run_artifact_content');
  const humanInput = definitions.find((item) => item.name === 'ohos_run_human_input');
  const ragStatus = definitions.find((item) => item.name === 'ohos_rag_status');
  const ragIndex = definitions.find((item) => item.name === 'ohos_rag_index');
  const ragSearch = definitions.find((item) => item.name === 'ohos_rag_search');
  const ragProfile = definitions.find((item) => item.name === 'ohos_rag_profile');
  const ragProfileUpdate = definitions.find((item) => item.name === 'ohos_rag_profile_update');
  assert.ok(artifact && humanInput && ragStatus && ragIndex && ragSearch && ragProfile && ragProfileUpdate);
  assert.deepEqual(await artifact.execute({ run_id: 'run-1', path: 'reports/summary.md' }), { run_id: 'run-1', content: 'report' });
  assert.deepEqual(await humanInput.execute({ run_id: 'run-1', task_id: 'task-1', phase: 'P1', kind: 'review', actor: 'alice', content: 'continue' }), { recorded: true });
  assert.deepEqual(await ragStatus.execute({}), { state: 'ready' });
  assert.deepEqual(await ragIndex.execute({}), { state: 'ready', file_count: 2 });
  assert.deepEqual(await ragSearch.execute({ query: 'profile' }), { status: 'ready', query: 'profile', results: [] });
  assert.deepEqual(await ragProfile.execute({}), { mode: 'local_lexical', execution: 'active' });
  assert.deepEqual(await ragProfileUpdate.execute({ mode: 'embedding_reranker', embedding_model: 'qwen3-embedding' }), {
    model_profile: { mode: 'embedding_reranker', embedding_model: 'qwen3-embedding', execution: 'planned' },
  });
  assert.deepEqual(calls, [
    ['artifactContent', 'run-1', 'reports/summary.md'],
    ['input', { runId: 'run-1', taskId: 'task-1', phase: 'P1', kind: 'review', actor: 'alice', content: 'continue' }],
    ['ragStatus'], ['ragIndex'], ['ragSearch', 'profile'], ['ragProfile'],
    ['ragProfileUpdate', { mode: 'embedding_reranker', embedding_model: 'qwen3-embedding' }],
  ]);
});
