import { spawn } from 'node:child_process';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { ProcessSupervisor } from '../../../../workspace-gateway/src/supervisor/process-supervisor.js';
import { prepareCommandInvocation } from './command.js';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_ARTIFACT_FILES = 1000;

function safeSegment(value, field, fallback = 'unknown') {
  const candidate = value === undefined || value === null || value === '' ? fallback : String(value);
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(candidate)) {
    throw Object.assign(new Error(`${field} must be a safe single path segment`), {
      code: 'agent_context_invalid',
      details: { field },
    });
  }
  return candidate;
}

export class CodeAgentExecutionError extends Error {
  constructor(message, code, result = null) {
    super(message);
    this.name = 'CodeAgentExecutionError';
    this.code = code;
    this.result = result;
  }
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
    `Workspace root: ${context.remote_workspace_root ?? context.workspace_root ?? 'unknown'}.`,
    `Pipeline directory: ${context.remote_pipeline_dir ?? context.pipeline_dir ?? 'unknown'}.`,
    `Read the AR request first at ${(context.remote_pipeline_dir ?? context.pipeline_dir) ? `${context.remote_pipeline_dir ?? context.pipeline_dir}/ar.md` : 'the pipeline ar.md file'}; treat it as the task input, not as gate evidence.`,
    ...(context.workspace_mode === 'remote_tools'
      ? [
          'The source workspace is remote. Use only the registered DSH remote workspace MCP tools for reading, searching, editing, diff, and approved profiles; do not use a local filesystem copy or claim gate evidence.',
          ...(Array.isArray(context.remote_tools?.allowed_profiles) && context.remote_tools.allowed_profiles.length > 0
            ? [`Approved remote execution profiles: ${context.remote_tools.allowed_profiles.join(', ')}.`]
            : []),
        ]
      : []),
    'Use the existing repository skills and trusted gate scripts. Do not edit pipeline state or claim PASS.',
    ...constraints.map((item) => `Constraint: ${item}`),
    'When the task is complete, leave all required evidence in the designated pipeline directories and summarize the work.',
  ].join('\n');
}

const USAGE_FIELDS = Object.freeze({
  input_tokens: ['input_tokens', 'inputtokens', 'prompt_tokens', 'prompttokens', 'input'],
  output_tokens: ['output_tokens', 'outputtokens', 'completion_tokens', 'completiontokens', 'output'],
  total_tokens: ['total_tokens', 'totaltokens', 'total'],
  cache_read_tokens: ['cache_read_tokens', 'cachereadtokens', 'cache_read', 'cacheread', 'read'],
  cache_write_tokens: ['cache_write_tokens', 'cachewritetokens', 'cache_write', 'cachewrite', 'write'],
  reasoning_tokens: ['reasoning_tokens', 'reasoningtokens', 'reasoning'],
});

function numeric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function usageObject(value, { generic = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const usage = {};
  let found = false;
  for (const [field, aliases] of Object.entries(USAGE_FIELDS)) {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.replaceAll('-', '_').toLowerCase();
      if ((!generic && ['input', 'output', 'total', 'reasoning', 'read', 'write'].includes(normalized))
          || !aliases.includes(normalized)) continue;
      const parsed = numeric(child);
      if (parsed !== null) {
        usage[field] = parsed;
        found = true;
        break;
      }
    }
  }
  const cache = value.cache;
  if (cache && typeof cache === 'object') {
    const read = numeric(cache.read ?? cache.read_tokens ?? cacheRead(cache));
    const write = numeric(cache.write ?? cache.write_tokens ?? cacheWrite(cache));
    if (read !== null) { usage.cache_read_tokens = read; found = true; }
    if (write !== null) { usage.cache_write_tokens = write; found = true; }
  }
  if (!found) return null;
  const input = usage.input_tokens ?? null;
  const output = usage.output_tokens ?? null;
  usage.total_tokens = usage.total_tokens ?? (input !== null && output !== null ? input + output : null);
  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    total_tokens: usage.total_tokens,
    cache_read_tokens: usage.cache_read_tokens ?? null,
    cache_write_tokens: usage.cache_write_tokens ?? null,
    reasoning_tokens: usage.reasoning_tokens ?? null,
  };
}

function cacheRead(value) {
  return value?.readTokens ?? value?.read_tokens ?? value?.cache_read_tokens ?? null;
}

function cacheWrite(value) {
  return value?.writeTokens ?? value?.write_tokens ?? value?.cache_write_tokens ?? null;
}

function usageCandidates(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const direct = usageObject(node);
  if (direct) return [direct];
  for (const key of ['usage', 'tokens']) {
    const nested = usageObject(node[key], { generic: true });
    if (nested) return [nested];
  }
  return Object.values(node).flatMap((child) => usageCandidates(child));
}

function usageFrom(value) {
  const total = {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
  };
  const seen = Object.fromEntries(Object.keys(total).map((key) => [key, false]));
  for (const line of String(value ?? '').split(/\r?\n/u)) {
    try {
      for (const usage of usageCandidates(JSON.parse(line))) {
        for (const key of Object.keys(total)) {
          if (usage[key] === null) continue;
          total[key] = (total[key] ?? 0) + usage[key];
          seen[key] = true;
        }
      }
    } catch { /* normal text output */ }
  }
  if (!seen.total_tokens && seen.input_tokens && seen.output_tokens) {
    total.total_tokens = total.input_tokens + total.output_tokens;
    seen.total_tokens = true;
  }
  return {
    ...Object.fromEntries(Object.keys(total).map((key) => [key, seen[key] ? total[key] : null])),
    status: seen.input_tokens && seen.output_tokens ? 'complete'
      : seen.input_tokens || seen.output_tokens ? 'partial' : 'unknown',
  };
}

function normalizeUsage(value) {
  if (!value || typeof value !== 'object') return usageFrom('');
  const input = value.input_tokens ?? value.inputTokens ?? value.prompt_tokens ?? value.promptTokens ?? null;
  const output = value.output_tokens ?? value.outputTokens ?? value.completion_tokens ?? value.completionTokens ?? null;
  const total = value.total_tokens ?? value.totalTokens ?? (Number.isFinite(input) && Number.isFinite(output) ? input + output : null);
  const cacheRead = value.cache_read_tokens ?? value.cacheReadTokens ?? null;
  const cacheWrite = value.cache_write_tokens ?? value.cacheWriteTokens ?? null;
  const reasoning = value.reasoning_tokens ?? value.reasoningTokens ?? null;
  return {
    input_tokens: Number.isFinite(input) ? input : null,
    output_tokens: Number.isFinite(output) ? output : null,
    total_tokens: Number.isFinite(total) ? total : null,
    cache_read_tokens: Number.isFinite(cacheRead) ? cacheRead : null,
    cache_write_tokens: Number.isFinite(cacheWrite) ? cacheWrite : null,
    reasoning_tokens: Number.isFinite(reasoning) ? reasoning : null,
    status: Number.isFinite(input) && Number.isFinite(output)
      ? 'complete' : Number.isFinite(input) || Number.isFinite(output) ? 'partial' : 'unknown',
  };
}

function outputText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => typeof part === 'string' ? part : part?.text ?? '').join('');
  }
  if (value && typeof value === 'object') {
    if (value.output !== undefined) return outputText(value.output);
    if (value.content !== undefined) return outputText(value.content);
    return JSON.stringify(value);
  }
  return '';
}

async function collectArtifacts(root, current = root, result = []) {
  if (result.length >= MAX_ARTIFACT_FILES) return result;
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (result.length >= MAX_ARTIFACT_FILES || entry.isSymbolicLink()) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) await collectArtifacts(root, path, result);
    else result.push(relative(root, path).split('\\').join('/'));
  }
  return result;
}

function terminate(child) {
  if (child.pid && process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGTERM'); return; } catch { /* process may already exit */ }
  }
  try { child.kill('SIGTERM'); } catch { /* process may already exit */ }
}

async function runSupervisedProcess(supervisor, command, args, {
  cwd, env, timeoutMs, maxOutputBytes, signal, operationId, metadata,
  launchCommand = command, launchArgs = args, launchEnv = env,
}) {
  let value;
  try {
    value = await supervisor.run({
      operationId,
      parentOperationId: operationId,
      command: launchCommand,
      args: launchArgs,
      cwd,
      input: '',
      env: launchEnv,
      signal,
      timeoutMs,
      maxOutputBytes,
      metadata,
      persistArgs: false,
    });
  } catch (error) {
    const result = error?.result ?? { command, args, cwd, stdout: '', stderr: error?.message ?? '', exitCode: null, durationMs: 0 };
    throw new CodeAgentExecutionError(error?.message ?? 'CodeAgent process could not be started', 'codeagent_spawn_failed', result);
  }
  const result = {
    command,
    args,
    cwd,
    exitCode: value?.exitCode ?? null,
    signal: value?.signal ?? null,
    stdout: String(value?.stdout ?? ''),
    stderr: String(value?.stderr ?? ''),
    timedOut: value?.timedOut === true,
    outputLimitExceeded: value?.outputLimitExceeded === true,
    aborted: value?.aborted === true,
    durationMs: Number.isSafeInteger(value?.durationMs) ? value.durationMs : 0,
  };
  if (result.aborted || value?.state === 'cancelled') {
    throw new CodeAgentExecutionError('CodeAgent execution was cancelled', 'codeagent_cancelled', result);
  }
  if (result.timedOut) throw new CodeAgentExecutionError('CodeAgent execution timed out', 'codeagent_timeout', result);
  if (result.outputLimitExceeded) throw new CodeAgentExecutionError('CodeAgent output exceeded the configured limit', 'codeagent_output_limit', result);
  if (value?.state !== 'completed' || result.exitCode !== 0) {
    throw new CodeAgentExecutionError(`CodeAgent exited with ${result.exitCode ?? result.signal ?? 'unknown'}`, 'codeagent_failed', result);
  }
  return result;
}

function runProcess(command, args, {
  cwd, env, timeoutMs, maxOutputBytes, signal, processSupervisor = null, operationId = null, metadata = {},
  launchCommand = command, launchArgs = args, launchEnv = env,
}) {
  if (processSupervisor) {
    if (!(processSupervisor instanceof ProcessSupervisor) && typeof processSupervisor.run !== 'function') {
      return Promise.reject(new CodeAgentExecutionError('configured process supervisor is invalid', 'codeagent_supervisor_invalid'));
    }
    return runSupervisedProcess(processSupervisor, command, args, {
      cwd, env, timeoutMs, maxOutputBytes, signal, operationId, metadata,
      launchCommand, launchArgs, launchEnv,
    });
  }
  return new Promise((resolveResult, reject) => {
    const started = Date.now();
    let child;
    try {
      child = spawn(launchCommand, launchArgs, {
        cwd,
        env: launchEnv,
        shell: false,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(new CodeAgentExecutionError(error.message, 'codeagent_spawn_failed'));
      return;
    }
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    let timedOut = false;
    let limitExceeded = false;
    let aborted = false;
    let settled = false;
    const append = (target, chunk) => {
      bytes += chunk.length;
      if (bytes > maxOutputBytes) {
        limitExceeded = true;
        terminate(child);
        return;
      }
      target.push(chunk);
    };
    child.stdout.on('data', (chunk) => append(stdout, chunk));
    child.stderr.on('data', (chunk) => append(stderr, chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, timeoutMs);
    const onAbort = () => {
      aborted = true;
      terminate(child);
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      callback({
        command,
        args,
        cwd,
        exitCode: child.exitCode,
        signal: null,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        timedOut,
        outputLimitExceeded: limitExceeded,
        durationMs: Date.now() - started,
      });
    };
    child.once('error', (error) => {
      finish((result) => reject(new CodeAgentExecutionError(error.message, 'codeagent_spawn_failed', result)));
    });
    child.once('close', (code, closeSignal) => {
      finish((result) => {
        result.exitCode = code;
        result.signal = closeSignal;
        if (aborted) reject(new CodeAgentExecutionError('CodeAgent execution was cancelled', 'codeagent_cancelled', result));
        else if (timedOut) reject(new CodeAgentExecutionError('CodeAgent execution timed out', 'codeagent_timeout', result));
        else if (limitExceeded) reject(new CodeAgentExecutionError('CodeAgent output exceeded the configured limit', 'codeagent_output_limit', result));
        else if (code !== 0) reject(new CodeAgentExecutionError(`CodeAgent exited with ${code ?? closeSignal}`, 'codeagent_failed', result));
        else resolveResult(result);
      });
    });
  });
}

function expand(value, fields) {
  return String(value)
    .replaceAll('{{repo_root}}', fields.repoRoot)
    .replaceAll('{{workspace_root}}', fields.workspaceRoot)
    .replaceAll('{{pipeline_dir}}', fields.pipelineDir)
    .replaceAll('{{model}}', fields.model ?? '')
    .replaceAll('{{phase}}', fields.phase)
    .replaceAll('{{role}}', fields.role)
    .replaceAll('{{attempt_id}}', fields.attemptId)
    .replaceAll('{{prompt_file}}', fields.promptFile)
    .replaceAll('{{mcp_config_file}}', fields.mcpConfigFile ?? '')
    .replaceAll('{{remote_workspace_root}}', fields.remoteWorkspaceRoot ?? fields.workspaceRoot)
    .replaceAll('{{remote_pipeline_dir}}', fields.remotePipelineDir ?? fields.pipelineDir)
    .replaceAll('{{prompt}}', fields.prompt);
}

function commandAndArgs(definition, fields) {
  const command = definition.path ?? definition.command;
  if (typeof command !== 'string' || command.trim() === '') {
    throw Object.assign(new Error('CodeAgent executable is not configured'), { code: 'codeagent_command_missing' });
  }
  const configured = Array.isArray(definition.args) ? definition.args : [];
  let args = configured.map((item) => expand(item, fields));
  const hasPrompt = configured.some((item) => String(item).includes('{{prompt'));
  const hasMcpConfig = configured.some((item) => String(item).includes('{{mcp_config_file}}'));
  const mcpConfigArg = definition.mcp_config_arg ?? definition.mcpConfigArg
    ?? ({ 'claude-code-cli': '--mcp-config' }[definition.adapter ?? definition.id] ?? null);
  const remoteTools = fields.workspaceMode === 'remote_tools' && Boolean(fields.mcpConfigFile);
  if (args.length === 0 && definition.id === 'codex') {
    // Codex CLI 0.15x replaced the removed --ask-for-approval flag with
    // --approve-for-me. That option already selects the workspace-write
    // sandbox and is mutually exclusive with an explicit --sandbox flag.
    args = ['exec', '--json', ...(remoteTools ? ['--sandbox', 'read-only'] : ['--approve-for-me']), '-C', fields.workspaceRoot];
    if (fields.model) args.push('--model', fields.model);
    if (fields.mcpConfigFile && mcpConfigArg) args.push(mcpConfigArg, fields.mcpConfigFile);
    args.push(fields.prompt);
  } else if (args.length === 0 && (definition.adapter === 'claude-code-cli' || definition.id === 'claude-code')) {
    // Claude Code's print mode exits after one request. `permission-mode`
    // keeps the scheduler non-interactive while retaining the CLI's normal
    // permission boundary; callers can provide a stricter fixed args list.
    args = ['-p', '--output-format', 'json'];
    if (fields.model) args.push('--model', fields.model);
    if (fields.mcpConfigFile && mcpConfigArg) {
      args.push('--strict-mcp-config', mcpConfigArg, fields.mcpConfigFile, '--tools', '');
    }
    args.push('--permission-mode', 'acceptEdits', fields.prompt.replace(/\s+/gu, ' ').trim());
  } else if (args.length === 0 && (definition.adapter === 'opencode-cli' || definition.id === 'opencode')) {
    // OpenCode's `run` command is the non-interactive entry point. Keep every
    // value as an argv item so workspace paths and prompts cannot become shell
    // syntax. The CLI accepts model ids in provider/model form.
    args = ['run', '--format', 'json', '--dir', fields.workspaceRoot];
    if (fields.model) args.push('--model', fields.model);
    // OpenCode receives its generated file through OPENCODE_CONFIG; passing
    // it as `--config <path>` would be interpreted as a key=value override.
    // A single argv item is safer for CLIs that render one message per line;
    // the full prompt remains available through DSH_PROMPT_FILE.
    args.push(fields.prompt.replace(/\s+/gu, ' ').trim());
  } else if (!hasPrompt) {
    args.push(fields.prompt);
  }
  if (fields.mcpConfigFile && mcpConfigArg && configured.length > 0 && !hasMcpConfig) {
    // A registered adapter can opt out by explicitly setting
    // `mcp_config_arg: null`; otherwise a remote-tools run must actually
    // attach the generated server configuration instead of merely claiming
    // the capability in its metadata.
    const promptIndex = args.findIndex((item) => item === fields.prompt || item === fields.prompt.replace(/\s+/gu, ' ').trim());
    args.splice(promptIndex >= 0 ? promptIndex : args.length, 0, mcpConfigArg, fields.mcpConfigFile);
  }
  return { command: command.trim(), args };
}

function sanitizeRemoteToolsEnvironment(value) {
  const environment = { ...value };
  // A remote-tools CodeAgent must not inherit credentials that authorize the
  // Connector, Gateway, SSH transport, or cloud-side services. Provider API
  // keys remain available because they are the user's local CodeAgent auth;
  // the MCP child receives only its short-lived socket capability separately.
  const forbidden = /^(?:DSH_(?:CONNECTOR_TOKEN|AUTHORITY_SHARED_SECRET|GATEWAY_(?:BEARER_TOKEN|SHARED_SECRET)|RAG_API_KEY)|SSH_(?:PRIVATE_KEY|AUTH_SOCK)|GIT_SSH_COMMAND|SSH_ASKPASS|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|AZURE_CLIENT_SECRET|GOOGLE_APPLICATION_CREDENTIALS)$/u;
  for (const key of Object.keys(environment)) if (forbidden.test(key)) delete environment[key];
  return environment;
}

export class LocalCodeAgentExecutor {
  constructor({
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    env = process.env,
    providerRunner = null,
    processSupervisor = null,
    supervisorReady = null,
  } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxOutputBytes = maxOutputBytes;
    this.env = env;
    this.providerRunner = providerRunner;
    this.processSupervisor = processSupervisor;
    // The official DSH plugin supplies a promise that reconciles durable
    // process records before the first dispatch.  Keeping this gate in the
    // executor prevents callers from accidentally bypassing recovery when
    // they reuse the executor outside the browser scheduler.
    this.supervisorReady = supervisorReady;
  }

  async run({ definition, context, signal, env = {} } = {}) {
    const workspaceRoot = context?.workspace_root;
    const pipelineDir = context?.pipeline_dir;
    if (!isAbsolute(workspaceRoot ?? '') || !isAbsolute(pipelineDir ?? '')) {
      throw Object.assign(new Error('CodeAgent context must contain absolute workspace_root and pipeline_dir'), {
        code: 'agent_context_invalid',
      });
    }
    const normalizedWorkspaceRoot = resolve(workspaceRoot);
    const normalizedPipelineDir = resolve(pipelineDir);
    const remainder = relative(normalizedWorkspaceRoot, normalizedPipelineDir);
    if (remainder === '..' || remainder.startsWith(`..${sep}`) || isAbsolute(remainder)) {
      throw Object.assign(new Error('CodeAgent pipeline_dir must stay inside workspace_root'), {
        code: 'agent_context_outside_workspace',
        details: { workspace_root: normalizedWorkspaceRoot, pipeline_dir: normalizedPipelineDir },
      });
    }
    if (this.supervisorReady) {
      try {
        const ready = typeof this.supervisorReady === 'function'
          ? this.supervisorReady()
          : this.supervisorReady;
        await ready;
      } catch (cause) {
        throw Object.assign(new Error(`CodeAgent supervisor reconciliation failed: ${cause?.message ?? String(cause)}`), {
          code: 'codeagent_supervisor_reconcile_failed',
          details: {
            cause_code: cause?.code ?? null,
            cause: cause?.details ?? {},
          },
        });
      }
    }
    const workspaceRootForRun = normalizedWorkspaceRoot;
    const pipelineDirForRun = normalizedPipelineDir;
    const phase = safeSegment(context?.phase, 'phase');
    const attemptId = safeSegment(context?.attempt_id, 'attempt_id', String(Date.now()));
    const prompt = promptFor(context ?? {});
    const promptDir = join(pipelineDirForRun, '.dsh', 'scheduler-prompts');
    const promptFile = join(promptDir, `${attemptId}.md`);
    await mkdir(promptDir, { recursive: true });
    await writeFile(promptFile, prompt, { encoding: 'utf8', mode: 0o600 });
    const fields = {
      repoRoot: workspaceRootForRun,
      workspaceRoot: workspaceRootForRun,
      pipelineDir: pipelineDirForRun,
      phase,
      role: String(context.role ?? ''),
      attemptId,
      model: String(definition?.model ?? context.model ?? ''),
      promptFile,
      prompt,
      remoteWorkspaceRoot: context.remote_workspace_root ?? workspaceRootForRun,
      remotePipelineDir: context.remote_pipeline_dir ?? pipelineDirForRun,
      mcpConfigFile: context.remote_tools?.mcp_config_file ?? context.mcp_config_file ?? null,
      workspaceMode: context.workspace_mode ?? 'local',
    };
    if (definition?.kind === 'official-provider') {
      if (typeof this.providerRunner !== 'function') {
        const failure = Object.assign(new Error(`No adapter is configured for official provider ${definition.provider ?? definition.id ?? 'unknown'}`), {
          code: 'codeagent_adapter_unavailable',
        });
        await this.#cleanupPrompt(promptFile, failure);
        throw failure;
      }
      const started = Date.now();
      let produced;
      try {
        produced = await this.providerRunner({
          definition,
          context,
          prompt,
          promptFile,
          signal,
        });
      } catch (error) {
        const output = error?.result ?? {};
        const result = {
          stdout: outputText(output.stdout ?? output.output),
          stderr: outputText(output.stderr ?? error?.message),
          durationMs: Date.now() - started,
        };
        await this.#writeLogs(pipelineDirForRun, phase, result);
        await this.#cleanupPrompt(promptFile, error);
        error.durationMs = Number.isSafeInteger(output.durationMs) ? output.durationMs : result.durationMs;
        error.usage = error.usage ?? usageFrom(result.stdout);
        error.invocation = { provider: definition.provider ?? definition.id };
        error.artifactRefs = await this.#artifactRefs(pipelineDirForRun);
        throw error;
      }
      const result = {
        stdout: outputText(produced?.stdout ?? produced?.output ?? produced),
        stderr: outputText(produced?.stderr ?? produced?.diagnostic),
        durationMs: Number.isFinite(produced?.durationMs) ? produced.durationMs : Date.now() - started,
      };
      await this.#writeLogs(pipelineDirForRun, phase, result);
      await this.#cleanupPrompt(promptFile);
      const explicitRefs = produced?.artifactRefs ?? produced?.artifact_refs ?? [];
      const artifactRefs = [...new Set([
        ...(Array.isArray(explicitRefs) ? explicitRefs : []),
        ...await this.#artifactRefs(pipelineDirForRun),
      ])].sort();
      return {
        artifactRefs,
        summary: summarize(result.stdout || result.stderr),
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        durationMs: result.durationMs,
        usage: produced?.usage ? normalizeUsage(produced.usage) : usageFrom(result.stdout),
        invocation: {
          provider: definition.provider ?? definition.id,
          model: definition.model ?? context?.model ?? null,
        },
      };
    }
    let invocation;
    try {
      invocation = commandAndArgs(definition ?? {}, fields);
    } catch (error) {
      // The prompt is private scheduler input.  Configuration validation can
      // fail before a child process exists, so it still needs the same
      // cleanup path as spawn/exit failures.
      await this.#cleanupPrompt(promptFile, error);
      throw error;
    }
    const inheritedEnv = context.workspace_mode === 'remote_tools'
      ? sanitizeRemoteToolsEnvironment({ ...this.env, ...env })
      : { ...this.env, ...env };
    const processEnv = {
      ...inheritedEnv,
      DSH_RUN_ID: String(context.run_id ?? ''),
      DSH_ATTEMPT_ID: attemptId,
      DSH_PHASE: phase,
      DSH_PIPELINE_DIR: pipelineDirForRun,
      DSH_WORKSPACE_ROOT: workspaceRootForRun,
      DSH_REMOTE_WORKSPACE_ROOT: fields.remoteWorkspaceRoot,
      DSH_REMOTE_PIPELINE_DIR: fields.remotePipelineDir,
      DSH_WORKSPACE_MODE: context.workspace_mode ?? 'local',
      DSH_PROMPT_FILE: promptFile,
      ...(fields.mcpConfigFile ? { DSH_MCP_CONFIG_FILE: fields.mcpConfigFile } : {}),
      ...(context.remote_tools?.opencode_config_file ? { OPENCODE_CONFIG: context.remote_tools.opencode_config_file } : {}),
      ...(context.remote_tools?.codex_home ? { CODEX_HOME: context.remote_tools.codex_home } : {}),
    };
    const launch = prepareCommandInvocation(invocation.command, invocation.args, {
      env: processEnv,
      platform: process.platform,
    });
    let result;
    try {
      result = await runProcess(invocation.command, invocation.args, {
        cwd: workspaceRootForRun,
        env: processEnv,
        launchCommand: launch.command,
        launchArgs: launch.args,
        launchEnv: launch.env,
        timeoutMs: this.timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
        signal,
        processSupervisor: this.processSupervisor,
        operationId: `codeagent-${attemptId}`,
        metadata: {
          run_id: String(context.run_id ?? ''), phase, role: String(context.role ?? ''),
          agent: String(definition?.id ?? definition?.provider ?? 'unknown'),
        },
      });
    } catch (error) {
      result = error.result ?? { stdout: '', stderr: error.message, exitCode: null, durationMs: 0 };
      await this.#writeLogs(pipelineDirForRun, phase, result);
      await this.#cleanupPrompt(promptFile, error);
      error.durationMs = Number.isSafeInteger(result.durationMs) ? result.durationMs : 0;
      error.usage = error.usage ?? usageFrom(result.stdout);
      error.invocation = { command: invocation.command, args: invocation.args };
      error.artifactRefs = await this.#artifactRefs(pipelineDirForRun);
      throw error;
    }
    await this.#writeLogs(pipelineDirForRun, phase, result);
    await this.#cleanupPrompt(promptFile);
    return {
      artifactRefs: await this.#artifactRefs(pipelineDirForRun),
      summary: summarize(result.stdout || result.stderr),
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      usage: usageFrom(result.stdout),
      invocation: { command: invocation.command, args: invocation.args, model: definition?.model ?? context?.model ?? null },
    };
  }

  async #writeLogs(pipelineDir, phase, result) {
    const phaseDir = join(pipelineDir, 'evidence', safeSegment(phase, 'phase'));
    await mkdir(phaseDir, { recursive: true });
    await writeFile(join(phaseDir, 'codeagent.stdout.log'), result.stdout ?? '', 'utf8');
    await writeFile(join(phaseDir, 'codeagent.stderr.log'), result.stderr ?? '', 'utf8');
  }

  async #artifactRefs(pipelineDir) {
    const refs = [];
    for (const directory of ['evidence', 'reports', 'controls']) {
      refs.push(...await collectArtifacts(pipelineDir, join(pipelineDir, directory)));
    }
    return [...new Set(refs)].sort();
  }

  async #removePrompt(promptFile) {
    try {
      await unlink(promptFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async #cleanupPrompt(promptFile, primaryError = null) {
    try {
      await this.#removePrompt(promptFile);
    } catch (error) {
      const wrapped = Object.assign(new Error(`CodeAgent prompt cleanup failed: ${error?.message ?? String(error)}`), {
        code: 'codeagent_prompt_cleanup_failed',
        details: error?.details ?? {},
      });
      if (primaryError) {
        primaryError.cleanup_error = cleanupDiagnostic(wrapped);
        return;
      }
      throw wrapped;
    }
  }
}

function summarize(value) {
  const text = String(value ?? '').trim().replace(/\s+/gu, ' ');
  if (text.length === 0) return 'CodeAgent completed without textual output.';
  return text.length <= 4096 ? text : `${text.slice(-4093)}...`;
}

function cleanupDiagnostic(error) {
  return {
    code: error?.code ?? 'codeagent_prompt_cleanup_failed',
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? {},
  };
}
