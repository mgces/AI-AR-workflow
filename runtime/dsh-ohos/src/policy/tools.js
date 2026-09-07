import { objectSchema, id } from '../core/tool-schema.js';
import { expectId, expectObject } from '../core/validation.js';

const strings = { type: 'array', maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 4096 } };
export const POLICY_TOOLS = Object.freeze([
  {
    name: 'ohos_policy_configure',
    description: 'Pin task tags and phase-specific Skill requirements before the first claim. Only observe mode is available.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id, mode: { type: 'string', enum: ['observe'] },
      task_tags: strings,
      capabilities_by_phase: { type: 'object', propertyNames: { pattern: '^(R[1-9]|P[0-8])$' },
        additionalProperties: strings }, idempotency_key: id }, ['run_id', 'mode', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.policy.configure(args, principal),
  },
  {
    name: 'ohos_policy_status',
    description: 'Read the pinned policy, routing and durable budget counters. Does not inspect or advance the Python pipeline.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id }, ['run_id']),
    invoke: (controller, raw) => {
      const args = expectObject(raw);
      const runId = expectId(args.run_id, 'run_id');
      const binding = controller.policy.binding(runId);
      return { run_id: runId, policy_id: binding.policy_id, mode: binding.mode,
        routing: JSON.parse(binding.routing_json), budget: controller.budgets.usage(runId),
        managed_execution_available: false, automatic_evolution_available: false };
    },
  },
  {
    name: 'ohos_repair_plan',
    description: 'Inspect signed current P4 failure evidence and return an observe-only plan bound to source and policy hashes. Does not execute repairs or reserve execution budget.',
    principals: ['parent', 'all'],
    inputSchema: objectSchema({ run_id: id, expected_revision: { type: 'integer', minimum: 1 },
      idempotency_key: id }, ['run_id', 'expected_revision', 'idempotency_key']),
    invoke: (controller, args, principal) => controller.repairs.plan(args, principal),
  },
]);
