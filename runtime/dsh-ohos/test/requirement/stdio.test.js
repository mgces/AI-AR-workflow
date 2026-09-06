import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RequirementFixture } from '../../test-support/requirement/fixture.js';
import { stdioClient } from '../../test-support/core/mcp-client.js';

test('separate parent and worker stdio processes share R1 claim, candidate, validation and human hold',
  { skip: !process.env.OHOS_DSH_TEST_PYTHON, timeout: 20_000 }, async () => {
    const f = new RequirementFixture({ disk: true });
    const clients = [];
    try {
      const parent = await stdioClient(f.root, 'parent', process.env.OHOS_DSH_TEST_PYTHON); clients.push(parent);
      const worker = await stdioClient(f.root, 'worker', process.env.OHOS_DSH_TEST_PYTHON); clients.push(worker);
      const start = await parent.call('ohos_requirement_start', { input_ref: 'user:stdio', input_text: 'MCP 合成需求',
        docs_root: f.docs, idempotency_key: f.key() });
      f.runId = start.run_id;
      f.claimed = await worker.call('ohos_task_claim', { run_id: f.runId, role: start.next.role,
        expected_revision: 1, host_binding_id: 'host', context_id: 'stdio-author-1', idempotency_key: f.key() });
      const auth = { attempt_id: f.claimed.attempt_id, lease_epoch: f.claimed.lease_epoch,
        task_credential: f.claimed.task_credential };
      f.context = await worker.call('ohos_task_context', auth);
      f.candidate();
      const produced = await worker.call('ohos_task_submit', { ...auth, revision: 1,
        artifact_refs: [f.context.requirement.manifest_path], summary: '合成 R1 产物。', idempotency_key: f.key() });
      assert.equal(produced.status, 'validating');
      const validated = await parent.call('ohos_requirement_validate', { run_id: f.runId, task_id: produced.task_id,
        expected_revision: 1, idempotency_key: f.key() });
      assert.equal(validated.next.status, 'needs_input');
      await assert.rejects(() => worker.call('ohos_requirement_decide', {}), /Unknown tool/);
      const confirmed = await parent.call('ohos_requirement_decide', { run_id: f.runId, task_id: produced.task_id,
        expected_revision: 1, snapshot_digest: validated.next.snapshot_digest, decision: { confirmed: true },
        source_ref: f.write('human/actual-test-response.md', '合成测试用户确认。'), idempotency_key: f.key() });
      assert.equal(confirmed.next.phase, 'R2-input');
      assert.equal(f.flow.position(f.runId).next.phase, 'R2-input');
    } finally {
      for (const client of clients.reverse()) await client.close();
      f.close();
    }
  });
