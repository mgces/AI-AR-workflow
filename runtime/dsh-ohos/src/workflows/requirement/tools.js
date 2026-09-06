import { objectSchema, id, ref } from '../../core/tool-schema.js';

export const REQUIREMENT_TOOLS = Object.freeze([
  {
    name: 'ohos_requirement_start',
    description: 'Start the R1-R9 requirement workflow and return a durable run id.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({
      input_ref: ref,
      docs_root: ref,
      input_text: { type: 'string', minLength: 1, maxLength: 1_000_000 },
      run_id: id,
      idempotency_key: id,
    }, ['input_ref', 'docs_root', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.requirement.start(args, principal),
  },
  {
    name: 'ohos_requirement_validate',
    description: 'Validate the leased R1-R9 submission, independent review structure, traceability and immutable prerequisites; advance or request repair/human input.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id, task_id: id,
      expected_revision: { type: 'integer', minimum: 1 }, idempotency_key: id,
    }, ['run_id', 'task_id', 'expected_revision', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.requirement.validate(args, principal),
  },
  {
    name: 'ohos_requirement_decide',
    description: 'Record an actual human decision bound to the displayed artifact digest and a saved user response/minutes file. Never infer approval.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id, task_id: id,
      expected_revision: { type: 'integer', minimum: 1 }, snapshot_digest: ref,
      source_ref: ref, decision: { type: 'object', additionalProperties: true }, idempotency_key: id,
    }, ['run_id', 'task_id', 'expected_revision', 'snapshot_digest', 'source_ref', 'decision', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.requirement.decide(args, principal),
  },
  {
    name: 'ohos_requirement_sync',
    description: 'Resume a durable requirement run, verify snapshots, and invalidate changed prerequisites. Does not infer completion from legacy Markdown.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id, idempotency_key: id }, ['run_id', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.requirement.sync(args, principal),
  },
  {
    name: 'ohos_requirement_reset',
    description: 'Reopen a reached requirement phase for repair and invalidate dependent artifacts and human decisions. Stop/release writers first.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id,
      target_phase: { type: 'string', enum: ['R1', 'R2-input', 'R2', 'R3-options', 'R3', 'R4',
        'R5', 'R6-input', 'R6', 'R7-plan', 'R7-SR', 'R8', 'R9'] },
      expected_revision: { type: 'integer', minimum: 1 }, reason: ref, idempotency_key: id,
    }, ['run_id', 'target_phase', 'expected_revision', 'reason', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.requirement.reset(args, principal),
  },
]);
