import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthorityAdapter } from './authority-adapter.js';
import { CommandError } from './process.js';
import { FailureNormalizer } from './failure-normalizer.js';
import { ExperienceStore } from './experience-store.js';
import { ModuleRegistry } from './module-registry.js';
import { RequirementController } from './requirement-controller.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '../..');
const DEFAULT_WORKSPACE = path.resolve(PACKAGE_ROOT, '..');
const DEFAULT_STATE_DIR = path.resolve(PACKAGE_ROOT, '.runtime');

function phaseId(status) {
  return `P${status.current_phase ?? status.currentPhase ?? 0}`;
}

export class AdaptiveWorkflowController {
  static async create(options = {}) {
    const workspaceRoot = path.resolve(
      options.workspaceRoot ?? process.env.AI_AR_WORKSPACE ?? DEFAULT_WORKSPACE,
    );
    const stateDir = path.resolve(
      options.stateDir ?? process.env.AI_AR_DSH_STATE_DIR ?? DEFAULT_STATE_DIR,
    );
    const moduleRegistry = await new ModuleRegistry({
      workspaceRoot,
      registryFile: options.registryFile,
    }).load();
    const failureNormalizer = await new FailureNormalizer({
      strategiesFile: options.strategiesFile,
    }).load();
    const controller = new AdaptiveWorkflowController({
      workspaceRoot,
      stateDir,
      moduleRegistry,
      failureNormalizer,
      python: options.python,
    });
    await controller.authority.assertAvailable();
    return controller;
  }

  constructor({ workspaceRoot, stateDir, moduleRegistry, failureNormalizer, python }) {
    this.workspaceRoot = workspaceRoot;
    this.stateDir = stateDir;
    this.moduleRegistry = moduleRegistry;
    this.failureNormalizer = failureNormalizer;
    this.authority = new AuthorityAdapter({ workspaceRoot, python });
    this.requirements = new RequirementController({ stateDir, moduleRegistry });
    this.experience = new ExperienceStore({ stateDir });
  }

  resolveModules(input) {
    return this.moduleRegistry.resolve(input);
  }

  async developmentStatus({ pipelineDir }) {
    return {
      authority: 'advance.py status --json',
      status: await this.authority.status(pipelineDir),
    };
  }

  async developmentNext({ pipelineDir, taskTags = [], capabilities = [] }) {
    const [status, action] = await Promise.all([
      this.authority.status(pipelineDir),
      this.authority.next(pipelineDir),
    ]);
    const phase = phaseId(status);
    return {
      authority: 'advance.py + signed gates remain authoritative',
      status,
      action,
      modules: this.resolveModules({
        workflow: 'development',
        phase,
        taskTags,
        capabilities,
      }),
    };
  }

  repairPacket({ workflow, phase, error, taskTags = [], capabilities = [] }) {
    const failure = this.failureNormalizer.classify(error);
    const fingerprint = createHash('sha256').update(failure.summary).digest('hex');
    return {
      failureId: `sha256:${fingerprint}`,
      workflow,
      phase,
      failureClass: failure.failureClass,
      strategy: failure.strategy,
      evidenceSummary: failure.summary,
      modules: this.resolveModules({
        workflow,
        phase,
        taskTags,
        capabilities,
        failureClass: failure.failureClass,
      }),
      invariants: [
        'do not edit advance.py or gate_*.py',
        'do not weaken tests or signed evidence requirements',
        'do not bypass consent',
        'rerun the same authoritative gate after repair',
      ],
    };
  }

  async developmentGate({
    pipelineDir,
    gate,
    gateArgs = [],
    taskTags = [],
    capabilities = [],
    allowIrreversible = false,
  }) {
    let status;
    let modules = [];
    try {
      status = await this.authority.status(pipelineDir);
      const phase = phaseId(status);
      modules = this.resolveModules({
        workflow: 'development',
        phase,
        taskTags,
        capabilities,
      });
      const result = await this.authority.runGate(
        pipelineDir,
        gate,
        gateArgs,
        { allowIrreversible },
      );
      const experience = await this.experience.record({
        workflow: 'development',
        phase,
        gate,
        result: 'pass',
        moduleIds: modules.map((item) => item.id),
      });
      return { ...result, experienceId: experience.eventId };
    } catch (error) {
      const detail = error instanceof CommandError ? error.result : { message: error.message };
      const phase = status ? phaseId(status) : 'P0';
      const repairPacket = this.repairPacket({
        workflow: 'development',
        phase,
        error: detail,
        taskTags,
        capabilities,
      });
      const experience = await this.experience.record({
        workflow: 'development',
        phase,
        gate,
        result: 'fail',
        failureClass: repairPacket.failureClass,
        failureId: repairPacket.failureId,
        moduleIds: repairPacket.modules.map((item) => item.id),
      });
      return {
        ok: false,
        error: detail,
        repairPacket,
        experienceId: experience.eventId,
      };
    }
  }

  async developmentAdvance(args) {
    return await this.authority.advance(args.pipelineDir, args.phase);
  }

  async developmentConsent(args) {
    return await this.authority.consent(args.pipelineDir, args.phase, args.token);
  }

  async developmentVerify({ pipelineDir }) {
    try {
      return await this.authority.verify(pipelineDir);
    } catch (error) {
      const detail = error instanceof CommandError ? error.result : { message: error.message };
      return {
        ok: false,
        error: detail,
        repairPacket: this.repairPacket({
          workflow: 'development',
          phase: 'P0',
          error: detail,
        }),
      };
    }
  }

  async evolutionProposals({ minSamples = 3 } = {}) {
    return await this.experience.proposals({ minSamples });
  }
}
