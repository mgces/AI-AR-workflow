import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { OhosController, SqliteStore, TaskCredentials } from '../../src/index.js';

export const GATE_CHECK_IDS = ['overview_value', 'scope', 'ac_complete', 'affected_scope', 'split_decision',
  'effort_constraint', 'tech_direction', 'impact_analysis', 'module_coverage', 'term_consistency',
  'condition_propagation', 'followup_closure'];

// Deliberately synthetic documents: these exercise structural protocol checks, not model quality.
export class RequirementFixture {
  constructor({ disk = false, preflight = () => {}, conditional = false } = {}) {
    this.root = mkdtempSync(join(tmpdir(), 'ohos-dsh-requirement-'));
    this.docs = join(this.root, 'docs');
    this.dbPath = disk ? join(this.root, 'controller.sqlite3') : ':memory:';
    this.preflight = preflight;
    this.conditional = conditional;
    this.now = new Date('2026-09-06T00:00:00.000Z');
    this.counter = 0;
    this.open();
    this.controller.registerHost({ binding_id: 'host', host_kind: 'codex', capabilities: {
      mcp_tools: true, native_subagent: true, isolated_context: true, workspace_write: true,
    }, capability_source: 'test:synthetic', idempotency_key: this.key() });
  }

  open() {
    this.store = new SqliteStore(this.dbPath);
    this.controller = new OhosController({ store: this.store, credentials: new TaskCredentials(Buffer.alloc(32, 8)),
      clock: () => this.now, leaseMs: 60_000, requirementPreflight: this.preflight });
    this.flow = this.controller.requirement;
  }
  reopen() { this.store.close(); this.open(); }
  close() { this.store.close(); rmSync(this.root, { recursive: true, force: true }); }
  key() { return `op-${++this.counter}`; }
  write(name, content) {
    const path = resolve(this.docs, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
    return path;
  }
  md(name, status, body = '', extra = '') {
    return this.write(name, `---\nfeature_id: FEAT-1\nrr_id: RR-1\nstatus: ${status}\n${extra}---\n# ${name}\n${body}\n`);
  }
  start() {
    this.state = this.flow.start({ input_ref: 'user:fixture', input_text: '测试需求：输出结构化需求基线。',
      docs_root: this.docs, idempotency_key: this.key() });
    this.runId = this.state.run_id;
    return this.state;
  }
  refresh() { this.state = this.flow.position(this.runId); return this.state; }
  claim(contextId = `ctx-${this.key()}`) {
    const next = this.refresh().next;
    this.claimed = this.controller.claimTask({ run_id: this.runId, role: next.role,
      host_binding_id: 'host', context_id: contextId, expected_revision: next.expected_revision,
      idempotency_key: this.key() });
    this.context = this.controller.taskContext(this.claimed);
    return this.claimed;
  }
  candidate({ gate = null, review = null, dataPatch = {} } = {}) {
    const phase = this.claimed.phase;
    let data = {};
    const conditions = this.conditional ? [{ check_id: 'ac_complete', desc: '补齐验证数据', owner: 'Owner-A',
      close_action: '执行验证', close_at: 'P5前' }] : [];
    switch (phase) {
      case 'R1':
        this.md('01-requirement.md', 'Clarified', 'FR-01 来源：用户。FR-02 来源：评审。');
        this.write('clarification-questions.md', '用户确认全部已知事实。');
        break;
      case 'R2':
        this.md('02-feasibility.md', 'Clarified', '实现位置和风险已分析。');
        this.write('_draft/feasibility-inputs.md', '用户确认不额外提供材料。');
        break;
      case 'R3-options':
        this.md('_draft/arch-options.md', 'PendingDecision', '方案A 方案B');
        data = { options: ['方案A', '方案B'] };
        break;
      case 'R3': this.md('03-arch-decision-record.md', 'Accepted', '方案A 复用现有接口 王工 无遗留问题。'); break;
      case 'R4': this.md('04-feature.md', 'Baseline', 'AC-01 验证 FR-01\nAC-02 验证 FR-02'); break;
      case 'R5': {
        const counts = { pass: 12, warn: 0, fail: 0 };
        const checks = GATE_CHECK_IDS.map((id) => ({ id, status: 'pass', evidence: '合成测试证据', section_ref: '§1' }));
        let conclusion = this.conditional ? 'Conditional Ready' : 'Ready';
        if (this.conditional) { checks[2].status = 'warn'; counts.pass--; counts.warn++; }
        if (gate === 'Not Ready') { checks[0].status = 'fail'; counts.pass--; counts.fail++; conclusion = gate; }
        data.gate_ref = this.write('tmp/gate.json', { schema_version: '1.0', skill: 'ohos-req-review-gate',
          feature_id: 'FEAT-1', checks, conditions, observations: [], summary: counts,
          gate: conclusion, block_reasons: gate ? ['证据不足'] : [] });
        data.gate_summary_ref = this.write('tmp/gate.md', '独立评审摘要。');
        data.traceability_ref = this.write('tmp/traceability.json', { links: [
          { fr: 'FR-01', ac: 'AC-01' }, { fr: 'FR-02', ac: 'AC-02' },
        ] });
        break;
      }
      case 'R6': {
        const decision = review ?? this.flow.decisions(this.runId).find((item) => item.phase === 'R6-input').data;
        this.md('value-decision-record.md', decision.decision, '评审会议已记录。');
        data.decision_ref = this.write('tmp/value-decision.json', { schema_version: '1.0',
          skill: 'ohos-req-value-decision', rr_id: 'RR-1', feature_id: 'FEAT-1', decision: decision.decision,
          review_opinions: [], modifications: decision.decision === 'PendingRe-review'
            ? [{ doc: '04-feature.md', requirement: '修改验收项' }] : [],
          routing: { action: { Accepted: 'proceed', Rejected: 'close', 'PendingRe-review': 'rollback' }[decision.decision],
            target_step: decision.decision === 'PendingRe-review' ? '0.4' : null } });
        break;
      }
      case 'R7-plan':
        this.md('IR.md', this.conditional ? 'Conditional' : 'Baseline',
          `PROP-01 05-proposal-01.md AC-01\nPROP-02 05-proposal-02.md AC-02\n${conditions.flatMap(Object.values).join(' ')}`);
        data.proposals = [1, 2].map((i) => {
          this.md(`05-proposal-0${i}.md`, 'GA-Approved', `PROP-0${i} AC-0${i}`);
          return { id: `PROP-0${i}`, path: `05-proposal-0${i}.md`, sr_path: `SR-0${i}.md`,
            ac_ids: [`AC-0${i}`], complexity: 'standard', effort_pm: 7, owner: 'Owner-A', dependencies: [] };
        });
        break;
      case 'R7-SR':
        for (const i of [1, 2]) this.md(`SR-0${i}.md`, 'Baseline', `PROP-0${i} AC-0${i}\n`
          + ['分析责任人', 'SE', 'TSE', '测试责任人'].map((role) => `| ${role} | 王工 |`).join('\n'));
        break;
      case 'R8':
      case 'R9': {
        const refs = ['01-requirement.md', '02-feasibility.md', '03-arch-decision-record.md', '04-feature.md',
          'IR.md', '05-proposal-01.md', '05-proposal-02.md', 'SR-01.md', 'SR-02.md'];
        if (phase === 'R9') refs.push('handoff.md');
        this.md(phase === 'R8' ? 'handoff.md' : 'AR.md', 'Accepted',
          `${refs.join('\n')}\n方案A FR-01 FR-02 AC-01 AC-02 PROP-01 PROP-02 Owner-A\n${conditions.flatMap(Object.values).join(' ')}\n`
          + (phase === 'R9' ? Array.from({ length: 8 }, (_, i) => `## ${i + 1}. 测试章节\n结构化测试内容。`).join('\n') : ''));
        break;
      }
      default: throw new Error(`Unexpected phase ${phase}`);
    }
    this.manifest = { schema_version: 1, run_id: this.runId, phase,
      revision: this.claimed.revision, context_id: this.context.context_id, data: { ...data, ...dataPatch } };
    this.write(this.context.requirement.manifest_path, this.manifest);
    return this.manifest;
  }
  submit() {
    return this.controller.submitTask({ ...this.claimed,
      artifact_refs: [this.context.requirement.manifest_path], summary: '合成候选产物供结构校验。',
      idempotency_key: this.key() });
  }
  validate() {
    this.state = this.flow.validate({ run_id: this.runId, task_id: this.claimed.task_id,
      expected_revision: this.claimed.revision, idempotency_key: this.key() });
    return this.state;
  }
  work(options = {}) { this.claim(options.contextId); this.candidate(options); this.submit(); return this.validate(); }
  human(data = null) {
    const { next } = this.refresh();
    if (!data) {
      data = { confirmed: true };
      if (next.phase === 'R2-input') data = { no_extra_materials: true };
      if (next.phase === 'R3-options') data = { selection: '方案A', rationale: '复用现有接口', decider: '王工', open_issues: [] };
      if (next.phase === 'R6-input') data = { decision: 'Accepted' };
      if (next.phase === 'R7-plan') data = { approvals: next.candidate.proposals.map((item) => ({
        proposal_id: item.id, decision: 'GA-Approved', reviewer: '评审人',
        evidence_ref: this.write(`human/ga-${item.id}-${this.key()}.md`, '测试：评审会议批准该 Proposal。'),
      })) };
    }
    const args = { run_id: this.runId, task_id: next.task_id, expected_revision: next.expected_revision,
      snapshot_digest: next.snapshot_digest, source_ref: this.write(`human/${this.key()}.md`, JSON.stringify(data)),
      decision: data, idempotency_key: this.key() };
    this.lastDecision = args;
    this.state = this.flow.decide(args);
    return this.state;
  }
  until(phase) {
    for (let i = 0; i < 40; i++) {
      const { next } = this.refresh();
      if (next?.phase === phase) return this.state;
      if (!next) throw new Error(`Completed before ${phase}`);
      if (next.status === 'needs_input') this.human();
      else this.work();
    }
    throw new Error(`Did not reach ${phase}`);
  }
}
