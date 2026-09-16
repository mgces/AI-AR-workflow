import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';

const PROFILE_BY_ADAPTER = Object.freeze({
  'claude-code-cli': 'codeagent.claude',
  'opencode-cli': 'codeagent.opencode',
  'codex-cli': 'codeagent.codex',
  'argv-cli': 'codeagent.custom',
});
const PROFILE_ALIASES = Object.freeze({
  'claude-code-cli': ['claude-code-cli', 'claude-code', 'claude_code', 'claude'],
  'opencode-cli': ['opencode-cli', 'opencode'],
  'codex-cli': ['codex-cli', 'codex'],
  'argv-cli': ['argv-cli', 'custom'],
});
const ARTIFACT_ROOTS = new Set(['evidence', 'reports', 'controls']);
const MAX_PROMPT_BYTES = 512 * 1024;

function safeSegment(value, field, fallback = 'unknown') {
  const candidate = value === undefined || value === null || value === '' ? fallback : String(value);
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(candidate)) {
    throw Object.assign(new Error(`${field} must be a safe single path segment`), {
      code: 'remote_context_invalid', details: { field },
    });
  }
  return candidate;
}

function promptFor(context) {
  const constraints = Array.isArray(context.constraints) ? context.constraints : [];
  const config = context.config && typeof context.config === 'object' ? context.config : {};
  const environment = context.environment_profile ?? config.environment ?? 'unresolved';
  const component = config.component_type ?? context.component_type ?? null;
  const device = config.device_type ?? context.device_type ?? null;
  return [
    `You are executing one task from the ${context.workflow ?? 'OHOS AR'} delivery workflow.`,
    `Run: ${context.run_id ?? 'unknown'}; phase: ${context.phase ?? 'unknown'}; role: ${context.role ?? 'unknown'}.`,
    `Environment: ${environment}${component ? `; component branch: ${component}` : ''}${device ? `; device type: ${device}` : ''}.`,
    `Workspace root: ${context.workspace_root ?? 'unknown'}.`,
    `Pipeline directory: ${context.pipeline_dir ?? 'unknown'}.`,
    `Read the AR request first at ${context.pipeline_dir ? `${context.pipeline_dir}/ar.md` : 'the pipeline ar.md file'}; treat it as the task input, not as gate evidence.`,
    'Use the existing repository skills and trusted gate scripts. Do not edit pipeline state or claim PASS.',
    ...constraints.map((item) => `Constraint: ${item}`),
    'When the task is complete, leave all required evidence in the designated pipeline directories and summarize the work.',
  ].join('\n');
}

function numeric(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function usageFrom(value) {
  const total = { input_tokens: null, output_tokens: null, total_tokens: null, cache_read_tokens: null, cache_write_tokens: null, reasoning_tokens: null };
  const lines = String(value ?? '').split(/\r?\n/u);
  let found = false;
  for (const line of lines) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    const candidates = [parsed, parsed?.usage, parsed?.tokens, parsed?.part?.tokens, parsed?.part?.usage];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const input = numeric(candidate.input_tokens ?? candidate.inputTokens ?? candidate.prompt_tokens ?? candidate.input);
      const output = numeric(candidate.output_tokens ?? candidate.outputTokens ?? candidate.completion_tokens ?? candidate.output);
      const explicitTotal = numeric(candidate.total_tokens ?? candidate.totalTokens ?? candidate.total);
      const read = numeric(candidate.cache_read_tokens ?? candidate.cacheReadTokens ?? candidate.cache?.read ?? candidate.cache?.read_tokens);
      const write = numeric(candidate.cache_write_tokens ?? candidate.cacheWriteTokens ?? candidate.cache?.write ?? candidate.cache?.write_tokens);
      const reasoning = numeric(candidate.reasoning_tokens ?? candidate.reasoningTokens ?? candidate.reasoning);
      if ([input, output, explicitTotal, read, write, reasoning].every((item) => item === null)) continue;
      found = true;
      if (input !== null) total.input_tokens = (total.input_tokens ?? 0) + input;
      if (output !== null) total.output_tokens = (total.output_tokens ?? 0) + output;
      if (explicitTotal !== null) total.total_tokens = (total.total_tokens ?? 0) + explicitTotal;
      if (read !== null) total.cache_read_tokens = (total.cache_read_tokens ?? 0) + read;
      if (write !== null) total.cache_write_tokens = (total.cache_write_tokens ?? 0) + write;
      if (reasoning !== null) total.reasoning_tokens = (total.reasoning_tokens ?? 0) + reasoning;
      break;
    }
  }
  if (total.total_tokens === null && total.input_tokens !== null && total.output_tokens !== null) total.total_tokens = total.input_tokens + total.output_tokens;
  return { ...total, status: total.input_tokens !== null && total.output_tokens !== null ? 'complete' : found ? 'partial' : 'unknown' };
}

function validArtifact(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const path = value.trim().replaceAll('\\', '/');
  if (path.startsWith('/') || path.includes('\0') || path.split('/').some((part) => part === '..') || !ARTIFACT_ROOTS.has(path.split('/')[0])) return null;
  return path;
}

function artifactRefsFrom(value) {
  const refs = [];
  for (const line of String(value ?? '').split(/\r?\n/u)) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    for (const candidate of [parsed?.artifact_refs, parsed?.artifactRefs, parsed?.result?.artifact_refs, parsed?.result?.artifactRefs]) {
      if (!Array.isArray(candidate)) continue;
      for (const item of candidate) {
        const ref = validArtifact(item);
        if (ref) refs.push(ref);
      }
    }
  }
  return [...new Set(refs)];
}

function summary(value) {
  const text = String(value ?? '').trim().replace(/\s+/gu, ' ');
  return text.length <= 4096 ? text : `${text.slice(0, 4093)}...`;
}

function relativeToRoot(root, candidate) {
  if (typeof candidate !== 'string' || !posix.isAbsolute(candidate)) {
    throw Object.assign(new Error('remote CodeAgent workspace paths must be absolute POSIX paths'), { code: 'remote_workspace_invalid' });
  }
  const normalizedRoot = posix.normalize(root);
  const normalized = posix.normalize(candidate);
  const prefix = normalizedRoot === '/' ? '/' : `${normalizedRoot}/`;
  if (normalized !== normalizedRoot && !normalized.startsWith(prefix)) {
    throw Object.assign(new Error('CodeAgent workspace is outside the registered remote root'), { code: 'remote_workspace_outside_root' });
  }
  return normalized === normalizedRoot ? '.' : posix.relative(normalizedRoot, normalized);
}

function profileForDefinition(definition, profiles) {
  const explicit = typeof definition?.profile_id === 'string' ? definition.profile_id.trim() : '';
  if (explicit) return explicit;
  const adapter = typeof definition?.adapter === 'string' ? definition.adapter : '';
  const aliases = PROFILE_ALIASES[adapter] ?? (adapter ? [adapter] : []);
  for (const key of aliases) {
    const value = profiles?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

function unwrapGatewayResult(result) {
  if (result?.status === 'completed' && result.result && typeof result.result === 'object') {
    return result.result;
  }
  if (result?.status === 'failed' && result.error) {
    throw Object.assign(new Error(result.error.message ?? 'workspace gateway operation failed'), {
      code: result.error.code ?? 'gateway_request_failed',
      details: result.error.details ?? {},
    });
  }
  return result;
}

function authorityForRun(base, context, payload) {
  const fields = { ...base };
  const variables = payload?.variables && typeof payload.variables === 'object' ? payload.variables : {};
  const runId = context?.run_id ?? variables.run_id ?? payload?.run_id ?? fields.cloud_run_id;
  if (!fields.cloud_run_id && runId) fields.cloud_run_id = String(runId);
  if (!fields.authority_run_id && runId) fields.authority_run_id = `authority-${runId}`;
  if (!Number.isInteger(fields.revision) || fields.revision < 1) {
    fields.revision = Number.isInteger(context?.revision) && context.revision > 0 ? context.revision : 1;
  }
  if (!fields.phase_epoch) {
    const phase = context?.phase ?? variables.phase ?? payload?.phase ?? 'unknown';
    fields.phase_epoch = `phase-${String(phase)}`;
  }
  if (!Number.isInteger(fields.connection_epoch) || fields.connection_epoch < 1) fields.connection_epoch = 1;
  return fields;
}

export class RemoteCodeAgentExecutor {
  constructor({ gateway, remoteRoot, authorityContext, signature = null, sign = null, profileByAdapter = PROFILE_BY_ADAPTER } = {}) {
    if (!gateway || typeof gateway.execute !== 'function') throw new TypeError('gateway.execute is required');
    if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot)) throw new TypeError('remoteRoot must be an absolute POSIX path');
    if (!authorityContext || typeof authorityContext !== 'object') throw new TypeError('authorityContext is required');
    if (signature !== null && (!signature || typeof signature !== 'object')) throw new TypeError('signature must be an object');
    if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
    this.gateway = gateway;
    this.remoteRoot = posix.normalize(remoteRoot);
    this.authorityContext = { ...authorityContext };
    this.signature = signature;
    this.sign = sign;
    this.profileByAdapter = { ...profileByAdapter };
  }

  async run({ definition, context, signal } = {}) {
    const workspaceRoot = context?.workspace_root;
    const pipelineDir = context?.pipeline_dir;
    const workspacePath = relativeToRoot(this.remoteRoot, workspaceRoot);
    const pipelinePath = relativeToRoot(this.remoteRoot, pipelineDir);
    const prompt = promptFor(context ?? {});
    if (Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT_BYTES) throw Object.assign(new Error('CodeAgent prompt exceeds the remote gateway limit'), { code: 'codeagent_prompt_too_large' });
    const profileId = profileForDefinition(definition, this.profileByAdapter)
      ?? PROFILE_BY_ADAPTER[definition?.adapter];
    if (!profileId) throw Object.assign(new Error(`No remote gateway profile is registered for ${definition?.adapter ?? definition?.id ?? 'CodeAgent'}`), { code: 'remote_profile_required' });
    const phase = safeSegment(context?.phase, 'phase');
    const attemptId = safeSegment(context?.attempt_id, 'attempt_id', randomUUID());
    const promptPath = posix.join(pipelinePath, '.dsh', 'scheduler-prompts', `${attemptId}.md`);
    await this.#execute('workspace.write', { path: promptPath, content: prompt }, { signal, context });
    const operationId = `codeagent-${attemptId}`;
    let aborted = false;
    const cancel = () => {
      aborted = true;
      void this.#execute('operation.cancel', { target_operation_id: operationId, reason: 'CodeAgent execution aborted by scheduler' }, { operationId: `${operationId}-cancel`, context }).catch(() => {});
    };
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
    const started = Date.now();
    let result;
    let primaryError = null;
    try {
      result = await this.#execute('workspace.exec_profile', {
        profile_id: profileId,
        variables: {
          run_id: String(context?.run_id ?? ''), attempt_id: attemptId,
          phase, role: String(context?.role ?? ''), model: String(definition?.model ?? context?.model ?? ''),
          workspace_root: workspaceRoot, pipeline_dir: pipelineDir,
          workspace_path: workspacePath, pipeline_path: pipelinePath,
          prompt_file: posix.join(this.remoteRoot, promptPath), prompt_file_relative: promptPath,
          prompt,
        },
      }, { operationId, signal, context });
    } catch (error) {
      primaryError = (aborted || signal?.aborted)
        ? Object.assign(new Error('CodeAgent execution was cancelled'), {
          code: 'codeagent_cancelled',
          cause: error,
          durationMs: Date.now() - started,
        })
        : error;
    } finally {
      signal?.removeEventListener('abort', cancel);
      // Prompt text is transient execution input.  Remove it from the code
      // host even when the agent fails or is cancelled; the scheduler already
      // persists structured usage/diagnostics and does not need a second copy
      // of the full prompt in the user's workspace.
      try {
        await this.#removePrompt(promptPath, context);
      } catch (error) {
        if (primaryError) {
          primaryError.cleanup_error = {
            code: 'codeagent_prompt_cleanup_failed',
            message: error?.message ?? String(error),
            details: error?.details ?? {},
          };
        } else {
          throw error;
        }
      }
    }
    if (primaryError) throw primaryError;
    if (aborted || signal?.aborted) throw Object.assign(new Error('CodeAgent execution was cancelled'), { code: 'codeagent_cancelled', durationMs: Date.now() - started });
    if (!Number.isInteger(result?.exit_code) || result.exit_code !== 0) {
      throw Object.assign(new Error(`remote CodeAgent exited with ${result.exit_code}`), {
        code: 'codeagent_failed', result: { ...result, exit_code: Number.isInteger(result?.exit_code) ? result.exit_code : null },
        durationMs: Date.now() - started, usage: usageFrom(result?.stdout),
      });
    }
    const stdout = String(result?.stdout ?? '');
    const stderr = String(result?.stderr ?? '');
    const stdoutRef = posix.join(pipelinePath, 'evidence', phase, 'codeagent.stdout.log');
    const stderrRef = posix.join(pipelinePath, 'evidence', phase, 'codeagent.stderr.log');
    await this.#execute('workspace.write', { path: stdoutRef, content: stdout }, { signal, context });
    await this.#execute('workspace.write', { path: stderrRef, content: stderr }, { signal, context });
    const discoveredRefs = await this.#listArtifactRefs(pipelinePath, context);
    const refs = [...new Set([
      ...artifactRefsFrom(stdout),
      ...discoveredRefs,
      `evidence/${phase}/codeagent.stdout.log`,
      `evidence/${phase}/codeagent.stderr.log`,
    ])].sort();
    return {
      artifactRefs: refs,
      summary: summary(stdout || stderr || 'Remote CodeAgent completed without textual output.'),
      stdout, stderr, exitCode: 0, durationMs: Date.now() - started,
      usage: usageFrom(stdout),
      invocation: { provider: definition?.id ?? definition?.provider ?? null, model: definition?.model ?? context?.model ?? null, gateway_profile: profileId },
    };
  }

  async #execute(operationKind, payload, { operationId = `${operationKind}-${randomUUID()}`, signal = undefined, context = null } = {}) {
    const fields = {
      message_type: operationKind === 'operation.cancel' ? 'operation.cancel' : 'operation.start',
      operation_id: operationId,
      nonce: randomUUID(),
      sent_at: new Date().toISOString(),
      payload: operationKind === 'operation.cancel' ? payload : { operation_kind: operationKind, ...payload },
      ...authorityForRun(this.authorityContext, context, payload),
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signed = this.sign ? await this.sign(unsigned) : this.signature;
    if (!signed || typeof signed !== 'object') throw Object.assign(new Error('remote gateway signature is not configured'), { code: 'gateway_signature_unconfigured' });
    const envelope = createAuthorityEnvelope({ ...fields, signature: signed });
    return unwrapGatewayResult(await this.gateway.execute(envelope, { signal }));
  }

  async #listArtifactRefs(pipelinePath, context = null) {
    const refs = [];
    for (const root of ['evidence', 'reports', 'controls']) {
      const result = await this.#execute('workspace.list', {
        path: posix.join(pipelinePath, root),
        recursive: true,
        max_entries: 1000,
      }, { context });
      for (const entry of Array.isArray(result?.entries) ? result.entries : []) {
        if (typeof entry !== 'string' || entry.trim() === '') continue;
        const ref = validArtifact(posix.join(root, entry.trim()));
        if (ref) refs.push(ref);
      }
    }
    return [...new Set(refs)];
  }

  async #removePrompt(promptPath, context) {
    try {
      await this.#execute('workspace.remove', { path: promptPath }, { context });
    } catch (error) {
      throw Object.assign(new Error(`remote CodeAgent prompt cleanup failed: ${error?.message ?? String(error)}`), {
        code: 'codeagent_prompt_cleanup_failed',
        details: error?.details ?? {},
      });
    }
  }
}

export { PROFILE_BY_ADAPTER };
