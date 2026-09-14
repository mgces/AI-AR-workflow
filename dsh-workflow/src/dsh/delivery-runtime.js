import { defineTool } from '@deepseek-ai/dsh-tools';
import { resolve } from 'node:path';
import { ArRuntimeService } from '../../../platform/apps/local-console/src/ar-runtime.js';

const OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
};

// The authoritative runtime uses a JSON Schema dialect with operational bounds
// (minLength, maxLength, minimum). DSH's model-facing schema intentionally has
// a smaller, portable vocabulary, so this adapter keeps the type/enum/default
// contract and leaves the runtime to enforce its stricter bounds.
function valueSchema(schema) {
  if (!schema || typeof schema !== 'object') return { type: 'json' };
  const result = {};
  if (schema.type === 'object') {
    result.type = 'object';
    result.additionalProperties = schema.additionalProperties ?? true;
    if (schema.properties) {
      result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, child]) => [
        key,
        valueSchema(child),
      ]));
    }
  } else if (schema.type === 'array') {
    result.type = 'array';
    if (schema.items) result.items = valueSchema(schema.items);
  } else if (schema.type === 'json') {
    result.type = 'json';
  } else {
    result.type = schema.type ?? 'string';
    if (schema.enum) result.enum = [...schema.enum];
    if (schema.const !== undefined) result.const = schema.const;
  }
  if (schema.description) result.description = schema.description;
  if (schema.default !== undefined) result.default = schema.default;
  return result;
}

function parameters(inputSchema) {
  const required = new Set(inputSchema.required ?? []);
  return Object.fromEntries(Object.entries(inputSchema.properties ?? {}).map(([key, schema]) => [
    key,
    { ...valueSchema(schema), ...(required.has(key) ? { required: true } : {}) },
  ]));
}

function defineRuntimeTool({ name, description, inputSchema, execute }) {
  return defineTool({
    name,
    description,
    parameters: parameters(inputSchema),
    output: OUTPUT,
    execute,
  });
}

function mapStart(args) {
  return {
    runId: args.run_id,
    inputRef: args.input_ref,
    arText: args.ar_text,
    arPath: args.ar_path,
    pipelineDir: args.pipeline_dir,
    repoRoot: args.repo_root,
    environment: args.environment,
    componentType: args.component_type,
    deviceType: args.device_type,
    deviceSerial: args.device_serial,
    gitDir: args.git_dir,
    buildTarget: args.build_target,
    part: args.part,
    baseCommit: args.base_commit,
    agent: args.agent,
    model: args.model,
    confirmDefaults: args.confirm_defaults,
    skills: args.skills,
    idempotencyKey: args.idempotency_key,
  };
}

export function createDeliveryRuntimeTools({ service = null, ...config } = {}) {
  let runtimeService = service;
  const getService = () => {
    runtimeService ??= new ArRuntimeService({
      dataRoot: resolve(config.dataRoot ?? process.env.OHOS_DSH_DATA_ROOT ?? '.dsh-ohos'),
      deliveryScriptsRoot: config.deliveryScriptsRoot,
      deliveryBridgePath: config.deliveryBridgePath,
      pythonCommand: config.pythonCommand,
      hostBindingId: config.hostBindingId ?? 'dsh-web-agent',
      hostKind: config.hostKind ?? 'claude-code',
      hostVersion: config.hostVersion ?? 'dsh-web',
    });
    return runtimeService;
  };

  const startSchema = {
    type: 'object',
    properties: {
      input_ref: { type: 'string' }, run_id: { type: 'string' }, ar_path: { type: 'string' },
      ar_text: { type: 'string' }, pipeline_dir: { type: 'string' }, repo_root: { type: 'string' },
      environment: { type: 'string', enum: ['openharmony', 'harmonyos'] },
      component_type: { type: 'string', enum: ['system', 'chip'] }, device_type: { type: 'string' },
      device_serial: { type: 'string' }, git_dir: { type: 'string' }, build_target: { type: 'string' },
      part: { type: 'string' }, base_commit: { type: 'string' }, confirm_defaults: { type: 'boolean' },
      agent: { type: 'string' }, model: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } },
      idempotency_key: { type: 'string' },
    },
    required: ['input_ref', 'idempotency_key'],
  };
  const idSchema = (properties, required = []) => ({ type: 'object', properties, required });

  return [
    defineRuntimeTool({ name: 'ohos_delivery_start', description: 'Start or resume the authoritative OpenHarmony/HarmonyOS AR P0-P8 workflow.', inputSchema: startSchema, execute: (args) => getService().start(mapStart(args)) }),
    defineRuntimeTool({ name: 'ohos_run_status', description: 'Read the durable AR workflow state and bounded event cursor.', inputSchema: idSchema({ run_id: { type: 'string' }, cursor: { type: 'integer' } }, ['run_id']), execute: (args) => getService().status(args.run_id, args.cursor ?? 0) }),
    defineRuntimeTool({ name: 'ohos_run_observability', description: 'Read stage timing, attempts, human interventions, blockers, success/failure and token-usage coverage for an AR run.', inputSchema: idSchema({ run_id: { type: 'string' } }, ['run_id']), execute: async (args) => (await getService().status(args.run_id)).observability }),
    defineRuntimeTool({ name: 'ohos_run_artifacts', description: 'List hashed evidence, reports and control artifacts produced by an AR run.', inputSchema: idSchema({ run_id: { type: 'string' } }, ['run_id']), execute: (args) => getService().artifacts(args.run_id) }),
    defineRuntimeTool({ name: 'ohos_run_events', description: 'Read the event-sourced AR workflow timeline for a run.', inputSchema: idSchema({ run_id: { type: 'string' }, cursor: { type: 'integer' } }, ['run_id']), execute: async (args) => { const status = await getService().status(args.run_id, args.cursor ?? 0); return { run_id: args.run_id, events: status.events, next_cursor: status.next_cursor }; } }),
    defineRuntimeTool({ name: 'ohos_task_claim', description: 'Lease the next AR stage to the current DSH host and return scoped credentials.', inputSchema: idSchema({ run_id: { type: 'string' }, role: { type: 'string' }, expected_revision: { type: 'integer' }, context_id: { type: 'string' } }, ['run_id', 'role']), execute: (args) => getService().claim({ runId: args.run_id, role: args.role, expectedRevision: args.expected_revision, contextId: args.context_id }) }),
    defineRuntimeTool({ name: 'ohos_task_context', description: 'Read the scoped context for a leased AR stage.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential']), execute: (args) => getService().context(args) }),
    defineRuntimeTool({ name: 'ohos_task_heartbeat', description: 'Renew a leased AR stage and observe cancellation.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential']), execute: (args) => getService().heartbeat(args) }),
    defineRuntimeTool({ name: 'ohos_task_submit', description: 'Submit artifact references for deterministic AR gate validation; submission never grants PASS.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' }, revision: { type: 'integer' }, artifact_refs: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential', 'revision', 'artifact_refs', 'summary']), execute: (args) => getService().submit({ attemptId: args.attempt_id, leaseEpoch: args.lease_epoch, taskCredential: args.task_credential, revision: args.revision, artifactRefs: args.artifact_refs, summary: args.summary }) }),
    defineRuntimeTool({ name: 'ohos_task_release', description: 'Release an AR lease and force reconciliation when partial work exists.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' }, reason: { type: 'string' }, artifact_refs: { type: 'array', items: { type: 'string' } } }, ['attempt_id', 'lease_epoch', 'task_credential', 'reason']), execute: (args) => getService().release({ attemptId: args.attempt_id, leaseEpoch: args.lease_epoch, taskCredential: args.task_credential, reason: args.reason, artifactRefs: args.artifact_refs }) }),
    defineRuntimeTool({ name: 'ohos_delivery_validate', description: 'Run the authoritative Python gate for the current AR stage.', inputSchema: idSchema({ run_id: { type: 'string' }, task_id: { type: 'string' }, expected_revision: { type: 'integer' } }, ['run_id', 'task_id', 'expected_revision']), execute: (args) => getService().validate({ runId: args.run_id, taskId: args.task_id, expectedRevision: args.expected_revision }) }),
    defineRuntimeTool({ name: 'ohos_delivery_consent', description: 'Record evidence-bound human consent for P1, P6, P7 or P8 publish precheck.', inputSchema: idSchema({ run_id: { type: 'string' }, task_id: { type: 'string' }, phase: { type: 'integer' }, token: { type: 'string' } }, ['run_id', 'task_id', 'phase', 'token']), execute: (args) => getService().consent({ runId: args.run_id, taskId: args.task_id, phase: args.phase, token: args.token }) }),
    defineRuntimeTool({ name: 'ohos_delivery_sync', description: 'Reconcile DSH state with the Python evidence and consent state.', inputSchema: idSchema({ run_id: { type: 'string' } }, ['run_id']), execute: (args) => getService().sync(args.run_id) }),
  ];
}
