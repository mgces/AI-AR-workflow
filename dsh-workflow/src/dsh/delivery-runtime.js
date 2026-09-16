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
    publication: args.publication,
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
  const getRag = () => {
    if (!config.rag) throw Object.assign(new Error('RAG service is unavailable'), { code: 'rag_unavailable' });
    return config.rag;
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
      publication: {
        type: 'object', additionalProperties: false,
        properties: {
          backend: { type: 'string', enum: ['gitcode', 'gerrit'] },
          repo_slug: { type: 'string' }, project: { type: 'string' },
          branch: { type: 'string' }, base: { type: 'string' }, issue: { type: 'string' },
          title: { type: 'string' }, head_owner: { type: 'string' },
          local_review_report: { type: 'string' }, pr_review_report: { type: 'string' },
          change_id: { type: 'string' },
        },
      },
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
    defineRuntimeTool({ name: 'ohos_run_artifact_content', description: 'Read the bounded full text of one authorized AR report, control or evidence artifact by relative path.', inputSchema: idSchema({ run_id: { type: 'string' }, path: { type: 'string' } }, ['run_id', 'path']), execute: (args) => getService().artifactContent(args.run_id, args.path) }),
    defineRuntimeTool({ name: 'ohos_run_events', description: 'Read the event-sourced AR workflow timeline for a run.', inputSchema: idSchema({ run_id: { type: 'string' }, cursor: { type: 'integer' } }, ['run_id']), execute: async (args) => { const status = await getService().status(args.run_id, args.cursor ?? 0); return { run_id: args.run_id, events: status.events, next_cursor: status.next_cursor }; } }),
    defineRuntimeTool({ name: 'ohos_task_claim', description: 'Lease the next AR stage to the current DSH host and return scoped credentials.', inputSchema: idSchema({ run_id: { type: 'string' }, role: { type: 'string' }, expected_revision: { type: 'integer' }, context_id: { type: 'string' } }, ['run_id', 'role']), execute: (args) => getService().claim({ runId: args.run_id, role: args.role, expectedRevision: args.expected_revision, contextId: args.context_id }) }),
    defineRuntimeTool({ name: 'ohos_task_context', description: 'Read the scoped context for a leased AR stage.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential']), execute: (args) => getService().context(args) }),
    defineRuntimeTool({ name: 'ohos_task_heartbeat', description: 'Renew a leased AR stage and observe cancellation.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential']), execute: (args) => getService().heartbeat(args) }),
    defineRuntimeTool({ name: 'ohos_task_submit', description: 'Submit artifact references for deterministic AR gate validation; submission never grants PASS.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' }, revision: { type: 'integer' }, artifact_refs: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, ['attempt_id', 'lease_epoch', 'task_credential', 'revision', 'artifact_refs', 'summary']), execute: (args) => getService().submit({ attemptId: args.attempt_id, leaseEpoch: args.lease_epoch, taskCredential: args.task_credential, revision: args.revision, artifactRefs: args.artifact_refs, summary: args.summary }) }),
    defineRuntimeTool({ name: 'ohos_task_release', description: 'Release an AR lease and force reconciliation when partial work exists.', inputSchema: idSchema({ attempt_id: { type: 'string' }, lease_epoch: { type: 'integer' }, task_credential: { type: 'string' }, reason: { type: 'string' }, artifact_refs: { type: 'array', items: { type: 'string' } } }, ['attempt_id', 'lease_epoch', 'task_credential', 'reason']), execute: (args) => getService().release({ attemptId: args.attempt_id, leaseEpoch: args.lease_epoch, taskCredential: args.task_credential, reason: args.reason, artifactRefs: args.artifact_refs }) }),
    defineRuntimeTool({ name: 'ohos_delivery_validate', description: 'Run the authoritative Python gate for the current AR stage.', inputSchema: idSchema({ run_id: { type: 'string' }, task_id: { type: 'string' }, expected_revision: { type: 'integer' } }, ['run_id', 'task_id', 'expected_revision']), execute: (args) => getService().validate({ runId: args.run_id, taskId: args.task_id, expectedRevision: args.expected_revision }) }),
    defineRuntimeTool({ name: 'ohos_run_human_input', description: 'Persist a bounded operator note or review decision and expose it in AR observability.', inputSchema: idSchema({ run_id: { type: 'string' }, task_id: { type: 'string' }, phase: { type: 'string' }, kind: { type: 'string' }, category: { type: 'string' }, actor: { type: 'string' }, content: { type: 'string' }, idempotency_key: { type: 'string' } }, ['run_id', 'content']), execute: (args) => getService().recordHumanInput({ runId: args.run_id, taskId: args.task_id, phase: args.phase, kind: args.kind, actor: args.actor, content: args.content, ...(args.category === undefined ? {} : { category: args.category }), ...(args.idempotency_key === undefined ? {} : { idempotencyKey: args.idempotency_key }) }) }),
    defineRuntimeTool({ name: 'ohos_delivery_consent', description: 'Record evidence-bound human consent for P1, P6, P7 or P8 publish precheck.', inputSchema: idSchema({ run_id: { type: 'string' }, task_id: { type: 'string' }, phase: { type: 'integer' }, token: { type: 'string' }, content: { type: 'string' }, actor: { type: 'string' }, kind: { type: 'string' } }, ['run_id', 'task_id', 'phase', 'token']), execute: (args) => getService().consent({ runId: args.run_id, taskId: args.task_id, phase: args.phase, token: args.token, ...(args.content === undefined ? {} : { content: args.content }), ...(args.actor === undefined ? {} : { actor: args.actor }), ...(args.kind === undefined ? {} : { kind: args.kind }) }) }),
    defineRuntimeTool({ name: 'ohos_delivery_cancel', description: 'Request or complete a safe AR run cancellation after stopping any active writer.', inputSchema: idSchema({ run_id: { type: 'string' }, reason: { type: 'string' } }, ['run_id', 'reason']), execute: (args) => getService().cancel({ runId: args.run_id, reason: args.reason }) }),
    defineRuntimeTool({ name: 'ohos_rag_status', description: 'Read the configured code knowledge index status for the current workspace.', inputSchema: idSchema({}, []), execute: () => getService().ragStatus?.() ?? getRag().status() }),
    defineRuntimeTool({ name: 'ohos_rag_index', description: 'Build or refresh the code knowledge index from the configured workspace.', inputSchema: idSchema({}, []), execute: () => getService().ragIndex?.() ?? getRag().refresh() }),
    defineRuntimeTool({ name: 'ohos_rag_search', description: 'Search the workspace code knowledge index; results must be revalidated against current files before implementation.', inputSchema: idSchema({ query: { type: 'string' } }, ['query']), execute: (args) => getService().ragSearch?.(args.query) ?? getRag().search(args.query) }),
    defineRuntimeTool({ name: 'ohos_rag_profile', description: 'Read the configured RAG provider/model profile and whether a real embedding/reranker executor is active.', inputSchema: idSchema({}, []), execute: () => getService().ragProfile?.() ?? getRag().profile() }),
    defineRuntimeTool({ name: 'ohos_rag_profile_update', description: 'Persist a RAG provider/model profile. Credentials are never accepted; when an endpoint is configured the HTTP embedding/reranker adapter is used, otherwise lexical mode remains available.', inputSchema: idSchema({ mode: { type: 'string', enum: ['local_lexical', 'embedding_reranker'] }, provider: { type: 'string' }, embedding_model: { type: 'string' }, reranker_model: { type: 'string' }, endpoint: { type: 'string' } }, []), execute: (args) => getService().ragProfileUpdate?.(args) ?? getRag().updateProfile(args) }),
    defineRuntimeTool({ name: 'ohos_delivery_sync', description: 'Reconcile DSH state with the Python evidence and consent state.', inputSchema: idSchema({ run_id: { type: 'string' } }, ['run_id']), execute: (args) => getService().sync(args.run_id) }),
  ];
}
