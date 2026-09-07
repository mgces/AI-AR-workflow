import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ModuleRegistry } from '../src/core/module-registry.js';
import { RequirementController } from '../src/core/requirement-controller.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('requirement projection enforces artifact status, human approval and revision', async () => {
  const temp = await mkdtemp('/tmp/ai-ar-dsh-');
  const docsDir = path.join(temp, 'docs');
  const registry = await new ModuleRegistry({ workspaceRoot: ROOT }).load();
  const controller = new RequirementController({
    stateDir: path.join(temp, 'state'),
    moduleRegistry: registry,
  });
  const started = await controller.start({ runId: 'rr-test', docsDir });
  assert.equal(started.currentStage, 'R1');
  const next = await controller.next('rr-test');
  assert.ok(next.modules.some((item) => item.id === 'ohos-req-requirement-intake'));

  await writeFile(path.join(docsDir, '01-requirement.md'), '---\nstatus: Clarified\n---\n', 'utf8');
  await assert.rejects(
    controller.submit('rr-test', { stage: 'R1', expectedRevision: 1 }),
    /humanApproval/,
  );
  const advanced = await controller.submit('rr-test', {
    stage: 'R1',
    expectedRevision: 1,
    humanApproval: { approved: true, actor: 'reviewer' },
  });
  assert.equal(advanced.currentStage, 'R2');
  assert.equal(advanced.revision, 2);
  await assert.rejects(
    controller.submit('rr-test', {
      stage: 'R2',
      expectedRevision: 1,
      humanApproval: { approved: true, actor: 'reviewer' },
    }),
    /revision conflict/,
  );
});
