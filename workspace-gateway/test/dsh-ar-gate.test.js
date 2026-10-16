import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main, resolveActivePipeline } from '../bin/dsh-ar-gate.js';

test('binds the current allowlisted gate to a verified active AR run and returns gate exit status', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ar-gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runId = 'run-42';
  const pipelineRoot = join(root, 'specs', 'pipeline');
  const pipelineDir = join(pipelineRoot, runId);
  const scriptsRoot = join(root, '.dsh/workflows/ar-delivery/current/skills/ohos-ar-dev-phases/scripts');
  await mkdir(pipelineDir, { recursive: true });
  await mkdir(scriptsRoot, { recursive: true });
  const gate = join(scriptsRoot, 'gate_build.py');
  await writeFile(join(pipelineRoot, 'ACTIVE'), `${pipelineDir}\n`);
  await writeFile(join(pipelineDir, 'pipeline.json'), JSON.stringify({ run_id: runId, current_phase: 4 }));
  await writeFile(gate, '# fixed test gate\n');

  assert.deepEqual(await resolveActivePipeline({ root, runId }), { pipelineDir, phase: 4 });
  let invocation;
  const exitCode = await main(['--run-id', runId], {
    root,
    python: 'python3',
    scriptsRoot,
    spawnSyncImpl: (command, args, options) => {
      invocation = { command, args, options };
      return { status: 17, signal: null, error: null };
    },
  });
  assert.equal(exitCode, 17);
  assert.equal(invocation.command, 'python3');
  assert.deepEqual(invocation.args, [gate, '--pipeline-dir', pipelineDir]);
  assert.equal(invocation.options.cwd, root);
  assert.equal(invocation.options.shell, false);
});

test('refuses an ACTIVE pointer for another run and a symlinked run directory', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ar-gate-'));
  const outside = await mkdtemp(join(tmpdir(), 'dsh-ar-gate-outside-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  const pipelineRoot = join(root, 'specs', 'pipeline');
  await mkdir(pipelineRoot, { recursive: true });
  await mkdir(join(pipelineRoot, 'run-42'), { recursive: true });
  await writeFile(join(pipelineRoot, 'run-42', 'pipeline.json'), JSON.stringify({ run_id: 'run-42', current_phase: 4 }));
  await writeFile(join(pipelineRoot, 'ACTIVE'), `${outside}\n`);
  assert.throws(() => resolveActivePipeline({ root, runId: 'run-42' }), { code: 'active_pipeline_mismatch' });

  await rm(join(pipelineRoot, 'ACTIVE'));
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, 'pipeline.json'), JSON.stringify({ run_id: 'run-42', current_phase: 4 }));
  await rm(join(pipelineRoot, 'run-42'), { recursive: true });
  await symlink(outside, join(pipelineRoot, 'run-42'));
  await writeFile(join(pipelineRoot, 'ACTIVE'), `${join(pipelineRoot, 'run-42')}\n`);
  assert.throws(() => resolveActivePipeline({ root, runId: 'run-42' }), { code: 'active_pipeline_invalid' });
});
