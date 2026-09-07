import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { AuthorityAdapter } from '../src/core/authority-adapter.js';

test('authority adapter calls the isolated Python authority interface without a shell', async () => {
  const root = await mkdtemp('/tmp/ai-ar-authority-');
  const scripts = path.join(root, 'skills/ohos-ar-dev-phases/scripts');
  const pipelineDir = path.join(root, 'run');
  await mkdir(scripts, { recursive: true });
  await mkdir(pipelineDir, { recursive: true });
  await writeFile(path.join(pipelineDir, 'pipeline.json'), '{}\n', 'utf8');
  const program = `#!/usr/bin/env python3
import json, sys
if sys.argv[-2:] == ['status', '--json']:
    print(json.dumps({'current_phase': 2, 'current_substate': 'awaiting_develop_gate'}))
elif sys.argv[-2:] == ['next', '--json']:
    print(json.dumps({'current_phase': 2, 'next_gate': 'gate_develop.py'}))
else:
    print('ok')
`;
  const advance = path.join(scripts, 'advance.py');
  await writeFile(advance, program, 'utf8');
  await chmod(advance, 0o755);
  await writeFile(path.join(scripts, 'gate_develop.py'), "print('gate pass')\n", 'utf8');

  const adapter = new AuthorityAdapter({ workspaceRoot: root });
  await adapter.assertAvailable();
  assert.equal((await adapter.status(pipelineDir)).current_phase, 2);
  assert.equal((await adapter.next(pipelineDir)).next_gate, 'gate_develop.py');
  const gate = await adapter.runGate(pipelineDir, 'gate_develop.py');
  assert.equal(gate.ok, true);
  assert.match(gate.output, /gate pass/);
  await assert.rejects(
    adapter.runGate(pipelineDir, 'gate_develop.py', ['--pipeline-dir', '/tmp/other']),
    /cannot override/,
  );
});
