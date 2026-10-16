import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { detectEnvironment } from '../../../packages/contracts/src/environment-profile.js';

const STAGES = Object.freeze([
  'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8-precheck', 'P8-publish',
]);

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return structuredClone(value);
}

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isWithin(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder));
}

function defaultState(workspaceRoot) {
  return {
    schema_version: 1,
    projects: [{
      project_id: 'local-project',
      name: '当前本机工程',
      environment: null,
      component_type: null,
      status: 'awaiting_environment_confirmation',
      created_at: now(),
    }],
    workspaces: [{
      workspace_id: 'wsl-local',
      project_id: 'local-project',
      name: '本机代码端',
      transport: 'local',
      code_root: workspaceRoot,
      status: 'configured',
      managed_default: true,
      capabilities: { read: true, write: true, exec: false, device: false },
    }],
    runs: [],
  };
}

export class LocalRunStore {
  constructor({ repoRoot, workspaceRoot = repoRoot, stateFile }) {
    this.repoRoot = resolve(repoRoot);
    this.workspaceRoot = resolve(workspaceRoot);
    this.stateFile = resolve(stateFile);
    this.state = this.#load();
    this.#ensureSeed();
  }

  #load() {
    try {
      return JSON.parse(readFileSync(this.stateFile, 'utf8'));
    } catch {
      return defaultState(this.workspaceRoot);
    }
  }

  #save() {
    mkdirSync(dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, this.stateFile);
  }

  #ensureSeed() {
    let changed = false;
    if (!Array.isArray(this.state.projects)) this.state.projects = [];
    if (!Array.isArray(this.state.workspaces)) this.state.workspaces = [];
    if (!Array.isArray(this.state.runs)) this.state.runs = [];
    if (!this.state.workspaces.some((item) => item.workspace_id === 'wsl-local')) {
      const seed = defaultState(this.workspaceRoot);
      this.state.projects.push(seed.projects[0]);
      this.state.workspaces.push(seed.workspaces[0]);
      changed = true;
    } else {
      // Previous client versions seeded a fake WSL/SSH profile pointing at the
      // runtime repository. Upgrade that generated record once, while leaving
      // profiles explicitly configured by a user untouched.
      const seeded = this.state.workspaces.find((item) => item.workspace_id === 'wsl-local');
      if (seeded.managed_default === true
          || (seeded.transport === 'wsl-local-ssh' && seeded.status === 'ssh_service_not_configured')) {
        seeded.name = '本机代码端';
        seeded.transport = 'local';
        seeded.code_root = this.workspaceRoot;
        seeded.status = 'configured';
        seeded.managed_default = true;
        delete seeded.host;
        delete seeded.port;
        delete seeded.username;
        delete seeded.connection;
        changed = true;
      }
    }
    if (changed) this.#save();
  }

  projects() {
    return clone(this.state.projects);
  }

  workspaces() {
    return clone(this.state.workspaces);
  }

  updateWorkspace(workspaceId, input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw Object.assign(new Error('workspace settings must be an object'), { code: 'workspace_configuration_invalid' });
    }
    const workspace = this.state.workspaces.find((item) => item.workspace_id === workspaceId);
    if (!workspace) throw Object.assign(new Error('workspace not found'), { code: 'workspace_not_found' });
    const allowed = new Set(['transport', 'target', 'code_root', 'port', 'name']);
    if (Object.keys(input).some((key) => !allowed.has(key))) {
      throw Object.assign(new Error('workspace settings contain unsupported or secret fields'), { code: 'workspace_configuration_invalid' });
    }

    const transport = input.transport;
    const codeRoot = typeof input.code_root === 'string' ? input.code_root.trim() : '';
    if (!['local', 'wsl', 'ssh'].includes(transport) || !codeRoot || codeRoot.length > 4096 || /[\0\r\n]/u.test(codeRoot)) {
      throw Object.assign(new Error('transport and an absolute source directory are required'), { code: 'workspace_configuration_invalid' });
    }
    const absolute = transport === 'local' ? isAbsolute(codeRoot) : posix.isAbsolute(codeRoot);
    if (!absolute || (transport !== 'local' && codeRoot.split('/').includes('..'))) {
      throw Object.assign(new Error('source directory must be an absolute path for the selected transport'), { code: 'workspace_configuration_invalid' });
    }

    let connection = null;
    if (transport === 'wsl') {
      if (typeof input.target !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(input.target)) {
        throw Object.assign(new Error('select a valid WSL distribution name'), { code: 'workspace_configuration_invalid' });
      }
      connection = { target: input.target };
    } else if (transport === 'ssh') {
      if (typeof input.target !== 'string' || !/^(?:[A-Za-z0-9_.-]{1,128}|[A-Za-z0-9_.-]{1,64}@[A-Za-z0-9_.:[\]-]{1,255})$/u.test(input.target)
          || input.target.startsWith('-') || input.target.includes('..') || input.target.includes(':')) {
        throw Object.assign(new Error('SSH target must be a configured Host alias or user@host'), { code: 'workspace_configuration_invalid' });
      }
      const target = { target: input.target };
      if (input.port !== undefined) {
        if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
          throw Object.assign(new Error('SSH port must be between 1 and 65535'), { code: 'workspace_configuration_invalid' });
        }
        target.port = input.port;
      }
      connection = target;
    } else if (input.target !== undefined || input.port !== undefined) {
      throw Object.assign(new Error('local workspaces do not accept remote connection settings'), { code: 'workspace_configuration_invalid' });
    }
    if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120)) {
      throw Object.assign(new Error('workspace name must contain 1 to 120 characters'), { code: 'workspace_configuration_invalid' });
    }

    workspace.name = input.name?.trim() ?? (transport === 'local' ? '本机代码端' : transport === 'wsl' ? `WSL · ${input.target}` : `SSH · ${input.target}`);
    workspace.transport = transport;
    workspace.code_root = transport === 'local' ? resolve(codeRoot) : posix.normalize(codeRoot);
    workspace.connection = connection;
    workspace.status = transport === 'local' ? 'configured' : 'connector_required';
    workspace.managed_default = false;
    workspace.capabilities = transport === 'local'
      ? { read: true, write: true, exec: false, device: false }
      : { read: false, write: false, exec: false, device: false };
    workspace.updated_at = new Date().toISOString();
    this.#save();
    return clone(workspace);
  }

  runs() {
    return clone(this.state.runs).sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  #findRun(runId) {
    const run = this.state.runs.find((item) => item.run_id === runId);
    if (!run) throw Object.assign(new Error(`run not found: ${runId}`), { code: 'run_not_found' });
    return run;
  }

  #findProject(projectId) {
    const project = this.state.projects.find((item) => item.project_id === projectId);
    if (!project) throw Object.assign(new Error(`project not found: ${projectId}`), { code: 'project_not_found' });
    return project;
  }

  #event(run, type, details = {}) {
    run.events.push({ event_id: randomUUID(), type, at: now(), revision: run.revision, ...details });
  }

  createRun({ workflowId, workspaceId, sourceRoot }) {
    if (workflowId !== 'ar-delivery') {
      throw Object.assign(new Error('only ar-delivery is available in this MVP'), { code: 'workflow_not_available' });
    }
    const workspace = this.state.workspaces.find((item) => item.workspace_id === workspaceId);
    if (!workspace) throw Object.assign(new Error('workspace not found'), { code: 'workspace_not_found' });
    const project = this.#findProject(workspace.project_id);
    const root = resolve(sourceRoot || workspace.code_root);
    const workspaceRoot = resolve(workspace.code_root);
    if (!isWithin(workspaceRoot, root)) {
      throw Object.assign(new Error('source_root must stay inside the registered workspace'), {
        code: 'source_root_outside_workspace',
      });
    }
    const createdAt = now();
    const run = {
      run_id: randomUUID(),
      workflow_id: workflowId,
      workspace_id: workspaceId,
      project_id: project.project_id,
      environment_selection: project.environment ? {
        environment: project.environment,
        component_type: project.component_type,
      } : null,
      source_root: root,
      revision: 1,
      status: 'running',
      current_stage: 'P0',
      created_at: createdAt,
      updated_at: createdAt,
      stages: Object.fromEntries(STAGES.map((stage) => [stage, {
        id: stage,
        status: stage === 'P0' ? 'running' : 'queued',
        started_at: stage === 'P0' ? createdAt : null,
        finished_at: null,
      }])),
      blockers: [],
      inputs: [],
      artifacts: [],
      events: [],
      metrics: {
        stage_elapsed_ms: {},
        human_input_count: 0,
        human_intervention_count: 0,
        token_usage: { status: 'unknown', input_tokens: null, output_tokens: null },
        success_count: 0,
        failure_count: 0,
      },
    };
    this.#event(run, 'run.started', { source_root: root });
    this.state.runs.push(run);
    this.#save();
    return clone(run);
  }

  setEnvironmentSelection(projectId, { environment, componentType }) {
    const project = this.#findProject(projectId);
    const validOpenHarmony = environment === 'openharmony' && (componentType === null || componentType === undefined);
    const validHarmony = environment === 'harmonyos' && ['system', 'chip'].includes(componentType);
    if (!validOpenHarmony && !validHarmony) {
      throw Object.assign(new Error('environment must be openharmony or harmonyos with system/chip'), {
        code: 'environment_selection_invalid',
      });
    }
    project.environment = environment;
    project.component_type = environment === 'openharmony' ? null : componentType;
    project.status = 'profile_incomplete';
    project.environment_selection = {
      environment: project.environment,
      component_type: project.component_type,
      actor: 'local-user',
      selected_at: now(),
    };
    project.updated_at = now();
    this.#save();
    return clone(project);
  }

  executeEnvironmentProbe(runId) {
    const run = this.#findRun(runId);
    if (run.status !== 'running' || run.current_stage !== 'P0') return clone(run);
    const markerPaths = {
      openharmony_build: join(run.source_root, 'build.sh'),
      openharmony_developer_test: join(run.source_root, 'test/testfwk/developer_test'),
      harmonyos_system_build: join(run.source_root, 'build_system.sh'),
      harmonyos_chip_build: join(run.source_root, 'build_vendor.sh'),
    };
    const markers = Object.fromEntries(Object.entries(markerPaths).map(([key, path]) => [key, existsSync(path)]));
    const detection = detectEnvironment({
      openharmony: markers.openharmony_build && markers.openharmony_developer_test,
      harmonyos_system: markers.harmonyos_system_build,
      harmonyos_chip: markers.harmonyos_chip_build,
    });
    const project = this.#findProject(run.project_id);
    const selection = project.environment_selection ?? null;
    const report = {
      kind: 'environment_probe',
      source_root: run.source_root,
      checked_at: now(),
      markers,
      detection,
      environment_selection: selection,
      next_step: detection.status === 'detected'
        ? 'bind a complete signed environment profile and rerun P0'
        : 'ask a human to select the environment and provide a complete profile',
    };
    const content = JSON.stringify(report, null, 2);
    run.artifacts.push({
      artifact_id: randomUUID(),
      role: 'environment_report',
      filename: 'environment-report.json',
      content_type: 'application/json',
      sha256: digest(content),
      content,
      created_at: now(),
    });
    const stage = run.stages.P0;
    stage.finished_at = now();
    run.metrics.stage_elapsed_ms.P0 = Math.max(0, Date.parse(stage.finished_at) - Date.parse(stage.started_at));
    const selectionMatches = !selection || detection.status !== 'detected'
      || (selection.environment === detection.environment
        && (selection.component_type ?? null) === (detection.component_type ?? null));
    if (!selectionMatches) {
      stage.status = 'blocked';
      run.status = 'blocked';
      run.blockers = [{
        code: 'ENVIRONMENT_SELECTION_MISMATCH',
        message: '人工选择的工程分支与源码根标志不一致',
        details: { selection, detection },
        next_action: '检查代码根或重新选择正确的环境分支',
      }];
      this.#event(run, 'run.blocked', { code: 'ENVIRONMENT_SELECTION_MISMATCH', detection, selection });
    } else if (detection.status !== 'detected') {
      stage.status = 'blocked';
      run.status = 'blocked';
      run.blockers = [{
        code: selection ? 'PROFILE_REQUIRED' : 'ENVIRONMENT_UNKNOWN',
        message: selection
          ? '已选择工程分支，但当前代码根没有对应根标志或完整 profile'
          : '无法从当前代码根确定 OpenHarmony 或 HarmonyOS 分支',
        details: { detection, selection },
        next_action: '提供对应代码根和完整 environment profile 后重新执行 P0',
      }];
      this.#event(run, 'run.blocked', { code: run.blockers[0].code, detection, selection });
    } else {
      stage.status = 'passed';
      run.status = 'blocked';
      run.blockers = [{
        code: 'PROFILE_REQUIRED',
        message: '环境已识别，但尚未绑定签名 environment profile',
        next_action: '选择并确认 profile 后重新执行 P0',
      }];
      this.#event(run, 'stage.passed', { stage: 'P0' });
    }
    run.updated_at = now();
    this.#save();
    return clone(run);
  }

  getRun(runId) {
    return clone(this.#findRun(runId));
  }

  artifacts(runId) {
    return clone(this.#findRun(runId).artifacts);
  }

  events(runId) {
    return clone(this.#findRun(runId).events);
  }

  addInput(runId, { kind, content }) {
    if (typeof kind !== 'string' || kind.trim() === '') {
      throw Object.assign(new Error('input kind is required'), { code: 'input_kind_required' });
    }
    if (typeof content !== 'string' || content.trim() === '') {
      throw Object.assign(new Error('input content is required'), { code: 'input_content_required' });
    }
    const run = this.#findRun(runId);
    const input = { input_id: randomUUID(), kind, content, actor: 'local-user', created_at: now() };
    run.inputs.push(input);
    run.metrics.human_input_count += 1;
    run.metrics.human_intervention_count += 1;
    run.updated_at = now();
    this.#event(run, 'human.input.received', { input_id: input.input_id, kind });
    this.#save();
    return clone(input);
  }

  action(runId, action) {
    const run = this.#findRun(runId);
    if (action === 'cancel') {
      if (run.status === 'running') {
        run.status = 'cancelled';
        run.stages[run.current_stage].status = 'cancelled';
        run.updated_at = now();
        this.#event(run, 'run.cancelled');
        this.#save();
      }
      return clone(run);
    }
    throw Object.assign(new Error(`unsupported action: ${action}`), { code: 'action_not_supported' });
  }
}
