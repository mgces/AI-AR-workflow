import assert from 'node:assert/strict';
import test from 'node:test';

const mapper = await import('../src/local-event-mapper.js').catch(() => null);

test('local AR events map to typed cloud facts without copying private input or error text by default', () => {
  assert.equal(typeof mapper?.mapLocalArEvent, 'function');
  const human = mapper.mapLocalArEvent({
    seq: 4, type: 'human.input_recorded', created_at: '2026-09-21T00:00:00.000Z',
    payload: { kind: 'user_correction', actor: 'alice@example.com', content: 'Change /home/alice/private/source to fix this.' },
  });
  assert.equal(human.type, 'human.input_recorded');
  assert.equal(human.payload.action_type, 'input');
  assert.equal(human.payload.content_bytes, Buffer.byteLength('Change /home/alice/private/source to fix this.'));
  assert.match(human.payload.content_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(human).includes('/home/alice/private/source'), false);
  assert.equal(JSON.stringify(human).includes('alice@example.com'), false);

  const optedIn = mapper.mapLocalArEvent({
    seq: 9, type: 'human.input_recorded', created_at: '2026-09-21T00:00:01.000Z',
    payload: { actor: 'alice@example.com', content: 'User approved syncing this text.' },
  }, { includeHumanInputContent: true });
  assert.equal(optedIn.payload.content_policy, 'full_diagnostics');
  assert.equal(optedIn.payload.content_text, 'User approved syncing this text.');
  assert.equal(optedIn.payload.content_bytes, Buffer.byteLength('User approved syncing this text.'));

  const oversized = mapper.mapLocalArEvent({
    seq: 10, type: 'human.input_recorded', created_at: '2026-09-21T00:00:01.000Z',
    payload: { content: '中'.repeat(10_000) },
  }, { includeHumanInputContent: true });
  assert.ok(Buffer.byteLength(oversized.payload.content_text, 'utf8') <= 16 * 1024);
  assert.equal([...oversized.payload.content_text].every((character) => character === '中'), true);
  assert.equal(oversized.payload.content_bytes, Buffer.byteLength('中'.repeat(10_000), 'utf8'));
  assert.match(oversized.payload.content_sha256, /^[a-f0-9]{64}$/u);

  const failure = mapper.mapLocalArEvent({
    seq: 5, type: 'task.validation_rejected', created_at: '2026-09-21T00:00:02.000Z',
    payload: { task_id: 'task-1', phase: 'P4', failure_class: 'raw_gate', reason: 'compiler failed at /home/alice/project/src/file.cpp' },
  });
  assert.equal(failure.type, 'stage.gate_completed');
  assert.equal(failure.payload.status, 'failed');
  assert.equal(failure.payload.phase, 'P4');
  assert.equal(JSON.stringify(failure).includes('/home/alice/project'), false);
});

test('local usage events retain only provider counters and stable agent identifiers', () => {
  const usage = mapper.mapLocalArEvent({
    seq: 6, type: 'task.usage_reported', created_at: '2026-09-21T00:00:03.000Z',
    payload: {
      phase: 'P2', agent: 'claude-code', model: 'claude-sonnet-4', provider: 'anthropic',
      duration_ms: 1234, status: 'completed',
      usage: { input_tokens: 120, output_tokens: 55, total_tokens: 175, status: 'complete' },
    },
  });
  assert.equal(usage.type, 'agent.execution_completed');
  assert.equal(usage.payload.total_tokens, 175);
  assert.equal(usage.payload.usage_complete, true);
  assert.equal(usage.payload.agent_id, 'claude-code');
  assert.equal(JSON.stringify(usage).includes('anthropic'), false);
});

test('unmapped local events are omitted rather than leaking their raw payload', () => {
  assert.equal(mapper.mapLocalArEvent({ seq: 7, type: 'internal.debug', payload: { secret: 'x' } }), null);
});

test('submitted artifacts sync only immutable SHA-256 references and never local paths', () => {
  const digestRef = `artifact:sha256:${'d'.repeat(64)}`;
  const mapped = mapper.mapLocalArEvent({
    seq: 8, type: 'task.produced', created_at: '2026-09-21T00:00:08.000Z',
    payload: { task_id: 'task-p2', artifact_refs: [digestRef, '/home/alice/source/specs/design.md'] },
  }, { tasks: [{ task_id: 'task-p2', phase: 'P2' }] });
  assert.equal(mapped.type, 'stage.task_submitted');
  assert.equal(mapped.payload.phase, 'P2');
  assert.deepEqual(mapped.payload.artifact_refs, [digestRef]);
  assert.equal(JSON.stringify(mapped).includes('/home/alice/source'), false);
});
