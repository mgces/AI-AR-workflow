import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeId, readJson, utcNow, writeJsonAtomic } from './io.js';

const STAGES = [
  {
    id: 'R1',
    name: 'requirement-intake',
    objective: '归一化原始需求并完成人工澄清',
    artifacts: ['01-requirement.md'],
    requiredStatus: 'Clarified',
    humanGate: 'requirement clarification',
  },
  {
    id: 'R2',
    name: 'feasibility-analysis',
    objective: '基于现有源码证据完成可行性分析与澄清',
    artifacts: ['02-feasibility.md'],
    requiredStatus: 'Clarified',
    humanGate: 'feasibility clarification',
  },
  {
    id: 'R3',
    name: 'architecture-decision',
    objective: '分析候选方案并由用户确认架构决策',
    artifacts: ['03-arch-decision-record.md'],
    requiredStatus: 'Accepted',
    humanGate: 'architecture decision',
  },
  {
    id: 'R4',
    name: 'feature-baseline',
    objective: '形成 Feature 基线并由用户确认 proposal 拆分',
    artifacts: ['04-feature.md'],
    humanGate: 'proposal split confirmation',
  },
  {
    id: 'R5',
    name: 'review-ready-gate',
    objective: '由独立 review gate 判定 Ready/Conditional Ready/Not Ready，并完成 AC 追溯',
    artifacts: [],
  },
  {
    id: 'R6',
    name: 'review-value-decision',
    objective: '记录用户提供的评审会议结论',
    artifacts: [],
    humanGate: 'review decision',
  },
  {
    id: 'R7',
    name: 'ir-proposal-sr',
    objective: '生成 IR、GA-Approved proposal 对应的 SR',
    artifacts: ['IR.md'],
  },
  {
    id: 'R8',
    name: 'handoff',
    objective: '生成并校验 handoff.md',
    artifacts: ['handoff.md'],
  },
  {
    id: 'R9',
    name: 'ar-generation',
    objective: '生成下游需求开发 workflow 的 AR.md 输入',
    artifacts: ['AR.md'],
  },
];

const STAGE_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));

async function statusInFrontmatter(file) {
  const content = (await readFile(file, 'utf8')).slice(0, 8192);
  const match = content.match(/^status\s*:\s*["']?([^\n"']+)/im);
  return match?.[1]?.trim() ?? null;
}

export class RequirementController {
  constructor({ stateDir, moduleRegistry }) {
    this.stateDir = path.resolve(stateDir);
    this.moduleRegistry = moduleRegistry;
  }

  stateFile(runId) {
    return path.join(this.stateDir, 'requirements', `${assertSafeId(runId, 'runId')}.json`);
  }

  async start({ runId, docsDir, taskTags = [], capabilities = [] }) {
    const id = assertSafeId(runId, 'runId');
    const resolvedDocs = path.resolve(docsDir);
    await mkdir(resolvedDocs, { recursive: true });
    const file = this.stateFile(id);
    try {
      await access(file);
      throw new Error(`requirement run already exists: ${id}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const now = utcNow();
    const state = {
      schemaVersion: 1,
      authority: 'controller-projection; official document gates remain authoritative',
      workflow: 'requirement',
      runId: id,
      docsDir: resolvedDocs,
      revision: 1,
      result: 'running',
      currentStage: 'R1',
      taskTags,
      capabilities,
      createdAtUtc: now,
      updatedAtUtc: now,
      stages: Object.fromEntries(STAGES.map((stage, index) => [
        stage.id,
        {
          name: stage.name,
          status: index === 0 ? 'active' : 'pending',
          attempts: 0,
          evidence: [],
        },
      ])),
      history: [{ atUtc: now, event: 'workflow-started', stage: 'R1' }],
    };
    await writeJsonAtomic(file, state);
    return await this.status(id);
  }

  async read(runId) {
    return await readJson(this.stateFile(runId));
  }

  async status(runId) {
    const state = await this.read(runId);
    const stage = STAGE_BY_ID.get(state.currentStage);
    return {
      ...state,
      currentAction: state.result === 'running' ? stage : null,
    };
  }

  async next(runId, overrides = {}) {
    const state = await this.read(runId);
    if (state.result !== 'running') {
      return { runId: state.runId, result: state.result, action: null, modules: [] };
    }
    const stage = STAGE_BY_ID.get(state.currentStage);
    const modules = this.moduleRegistry.resolve({
      workflow: 'requirement',
      phase: stage.id,
      taskTags: overrides.taskTags ?? state.taskTags,
      capabilities: overrides.capabilities ?? state.capabilities,
      failureClass: overrides.failureClass ?? null,
    });
    return {
      runId: state.runId,
      revision: state.revision,
      action: {
        stage: stage.id,
        name: stage.name,
        objective: stage.objective,
        docsDir: state.docsDir,
        expectedArtifacts: stage.artifacts,
        humanGate: stage.humanGate ?? null,
        forbiddenActions: [
          'skip stage',
          'infer human decision',
          'generate SR for a proposal without GA approval',
          'start downstream development workflow automatically',
        ],
      },
      modules,
    };
  }

  async validateArtifacts(state, stage, submission) {
    const evidence = [];
    for (const relative of stage.artifacts) {
      const file = path.join(state.docsDir, relative);
      await access(file);
      evidence.push(file);
      if (stage.requiredStatus) {
        const actual = await statusInFrontmatter(file);
        if (actual?.toLowerCase() !== stage.requiredStatus.toLowerCase()) {
          throw new Error(`${relative} status must be ${stage.requiredStatus}; got ${actual ?? '<missing>'}`);
        }
      }
    }

    if (['R1', 'R2', 'R3', 'R4'].includes(stage.id)) {
      if (!submission.humanApproval?.approved || !submission.humanApproval?.actor) {
        throw new Error(`${stage.id} requires explicit humanApproval.approved=true and actor`);
      }
    }
    if (stage.id === 'R5') {
      const decision = submission.gateDecision;
      if (!['Ready', 'Conditional Ready'].includes(decision)) {
        throw new Error('R5 gateDecision must be Ready or Conditional Ready to advance');
      }
      if (!submission.evidence?.length) {
        throw new Error('R5 requires the independent gate output path in evidence');
      }
    }
    if (stage.id === 'R6') {
      if (!['accepted', 'rejected', 'rework'].includes(submission.reviewDecision)) {
        throw new Error('R6 reviewDecision must be accepted, rejected, or rework');
      }
      if (!submission.humanApproval?.actor) {
        throw new Error('R6 requires the human decision actor');
      }
    }
    if (stage.id === 'R7') {
      const entries = await readdir(state.docsDir);
      const proposals = entries.filter((name) => /^05-proposal.*\.md$/i.test(name));
      const srs = entries.filter((name) => /^SR-.*\.md$/i.test(name));
      if (!proposals.length) throw new Error('R7 requires at least one 05-proposal*.md');
      if (srs.length < proposals.length) {
        throw new Error(`R7 requires one SR per proposal; proposals=${proposals.length}, SRs=${srs.length}`);
      }
      evidence.push(...proposals.map((name) => path.join(state.docsDir, name)));
      evidence.push(...srs.map((name) => path.join(state.docsDir, name)));
    }
    for (const file of submission.evidence ?? []) {
      const resolved = path.resolve(file);
      await access(resolved);
      evidence.push(resolved);
    }
    return [...new Set(evidence)];
  }

  async submit(runId, submission) {
    const state = await this.read(runId);
    if (state.result !== 'running') throw new Error(`workflow is ${state.result}`);
    if (submission.expectedRevision && submission.expectedRevision !== state.revision) {
      throw new Error(`revision conflict: expected ${submission.expectedRevision}, actual ${state.revision}`);
    }
    const stage = STAGE_BY_ID.get(state.currentStage);
    if (submission.stage !== stage.id) {
      throw new Error(`cannot submit ${submission.stage}; current stage is ${stage.id}`);
    }
    const evidence = await this.validateArtifacts(state, stage, submission);
    const now = utcNow();
    const stageState = state.stages[stage.id];
    stageState.status = 'completed';
    stageState.attempts += 1;
    stageState.evidence = evidence;
    stageState.completedAtUtc = now;
    stageState.submission = {
      gateDecision: submission.gateDecision ?? null,
      reviewDecision: submission.reviewDecision ?? null,
      actor: submission.humanApproval?.actor ?? null,
    };

    if (stage.id === 'R6' && submission.reviewDecision === 'rejected') {
      state.result = 'rejected';
      state.completedAtUtc = now;
    } else if (stage.id === 'R6' && submission.reviewDecision === 'rework') {
      const target = submission.reworkStage;
      if (!['R1', 'R2', 'R3', 'R4', 'R5'].includes(target)) {
        throw new Error('reworkStage must be R1 through R5');
      }
      const startIndex = STAGES.findIndex((item) => item.id === target);
      for (const item of STAGES.slice(startIndex)) {
        state.stages[item.id].status = item.id === target ? 'active' : 'pending';
      }
      state.currentStage = target;
    } else {
      const index = STAGES.findIndex((item) => item.id === stage.id);
      if (index === STAGES.length - 1) {
        state.result = 'completed';
        state.completedAtUtc = now;
      } else {
        const next = STAGES[index + 1];
        state.currentStage = next.id;
        state.stages[next.id].status = 'active';
      }
    }
    state.revision += 1;
    state.updatedAtUtc = now;
    state.history.push({
      atUtc: now,
      event: 'stage-submitted',
      stage: stage.id,
      result: state.result,
      nextStage: state.currentStage,
    });
    await writeJsonAtomic(this.stateFile(runId), state);
    return await this.status(runId);
  }
}
