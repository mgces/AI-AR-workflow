import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { invariant, ProtocolError } from '../../core/errors.js';
import { digest, expectObject, expectString, parseJson } from '../../core/validation.js';
import { requirementStage } from './stages.js';

const MAX_BYTES = 2_000_000;
const CHECKS = ['overview_value', 'scope', 'ac_complete', 'affected_scope', 'split_decision',
  'effort_constraint', 'tech_direction', 'impact_analysis', 'module_coverage', 'term_consistency',
  'condition_propagation', 'followup_closure'];

export function readArtifact(path, root = null) {
  try {
    invariant(isAbsolute(path), 'invalid_artifact', 'Artifact paths must be absolute.');
    const resolved = realpathSync(path);
    if (root) {
      const rel = relative(realpathSync(root), resolved);
      invariant(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel),
        'invalid_artifact', `Artifact escapes docs_root: ${path}`);
    }
    const stat = statSync(resolved);
    invariant(stat.isFile() && stat.size > 0 && stat.size <= MAX_BYTES,
      'invalid_artifact', `Artifact must be a nonempty file of at most ${MAX_BYTES} bytes: ${path}`);
    const bytes = readFileSync(resolved);
    invariant(bytes.length <= MAX_BYTES, 'invalid_artifact', 'Artifact grew beyond its size limit.');
    return { path: resolve(path), hash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      text: bytes.toString('utf8').replace(/^\uFEFF/, '') };
  } catch (error) {
    if (error instanceof ProtocolError) throw error;
    throw new ProtocolError('invalid_artifact', `Cannot read artifact: ${path}`, { cause: error.message });
  }
}

export function verifySnapshot(snapshot) {
  for (const file of snapshot) {
    if (readArtifact(file.path, file.root ?? null).hash !== file.hash) {
      throw new ProtocolError('artifact_changed', `Accepted or pending artifact changed: ${file.path}`);
    }
  }
}

export function frontmatter(text) {
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  invariant(header, 'requirement_gate_rejected', 'Markdown artifact needs scalar YAML frontmatter.');
  const values = {};
  for (const line of header[1].split(/\r?\n/)) {
    const match = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (!match) continue;
    invariant(!(match[1] in values), 'requirement_gate_rejected', `Duplicate metadata: ${match[1]}`);
    const raw = match[2].replace(/\s+#.*$/, '').trim();
    values[match[1]] = raw.replace(/^(["'])(.*)\1$/, '$2');
  }
  return values;
}

function check(condition, message) {
  invariant(condition, 'requirement_gate_rejected', message);
}

function meaningful(value, field) {
  expectString(value, field, { max: 10_000 });
  check(!/^(?:TBD|TODO|待补充|待定|未确定|<.*>|\[.*\])$/i.test(value.trim()), `${field} is a placeholder.`);
  return value;
}

function list(value, field, min = 1) {
  check(Array.isArray(value) && value.length >= min && value.length <= 200, `${field} must be a bounded array.`);
  return value;
}

function records(value, field, min = 1) {
  return list(value, field, min).map((item) => expectObject(item, field));
}

function identifiers(text, prefix) {
  return [...new Set(text.match(new RegExp(`\\b${prefix}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\\b`, 'g')) ?? [])];
}

function covers(text, values, field) {
  for (const value of values) check(text.includes(value), `${field} omits ${value}`);
}

export function validateRequirementArtifacts({ run, task, attempt, manifestPath, receipts, decisions }) {
  const files = new Map();
  const read = (name) => {
    expectString(name, 'artifact path');
    const artifact = readArtifact(resolve(run.docs_root, name), run.docs_root);
    files.set(artifact.path, { path: artifact.path, hash: artifact.hash, root: run.docs_root });
    return artifact.text;
  };
  const json = (name) => expectObject(parseJson(read(name), name), name);
  const manifest = json(manifestPath);
  check(manifest.schema_version === 1 && manifest.run_id === run.id
    && manifest.phase === task.phase && manifest.revision === task.revision,
  'Submission must match schema_version=1, run_id, phase, and current revision.');
  check(manifest.context_id === attempt.context_id, 'Submission context_id must match its leased attempt.');
  const data = expectObject(manifest.data ?? {}, 'data');
  const previous = (phase) => {
    const receipt = receipts.find((item) => item.phase === phase);
    check(receipt, `Missing accepted prerequisite: ${phase}`);
    return receipt.result;
  };
  const decision = (phase) => {
    const item = decisions.find((entry) => entry.phase === phase);
    check(item, `Missing human decision: ${phase}`);
    return item.data;
  };
  const metadata = (name, statuses = null, tracked = true) => {
    const text = read(name);
    const meta = frontmatter(text);
    if (statuses) check(statuses.includes(meta.status), `${name}: expected status ${statuses.join('/')}.`);
    if (tracked) {
      meaningful(meta.rr_id, `${name}.rr_id`);
      meaningful(meta.feature_id, `${name}.feature_id`);
      if (task.phase !== 'R1') {
        const first = previous('R1');
        check(meta.rr_id === first.rr_id && meta.feature_id === first.feature_id,
          `${name}: rr_id and feature_id must match R1.`);
      }
    }
    return { text, meta };
  };
  for (const name of requirementStage(task.phase).files) read(name);
  let result = {};
  switch (task.phase) {
    case 'R1': {
      const { text, meta } = metadata('01-requirement.md', ['Clarified']);
      const fr = identifiers(text, 'FR');
      check(fr.length > 0, 'R1 requires explicit FR identifiers for downstream traceability.');
      result = { rr_id: meta.rr_id, feature_id: meta.feature_id, fr_ids: fr, nfr_ids: identifiers(text, 'NFR') };
      break;
    }
    case 'R2': {
      const { text } = metadata('02-feasibility.md', ['Clarified']);
      decision('R2-input');
      result = { code_refs: [...new Set(text.match(/[A-Za-z0-9_./\\:-]+\.(?:cpp|h|c|cc|hpp|ts|ets|json|gn|gni|py):[1-9]\d*/g) ?? [])] };
      break;
    }
    case 'R3-options':
      metadata('_draft/arch-options.md', ['PendingDecision']);
      result = { options: list(data.options, 'options').map((item) => meaningful(item, 'option')) };
      break;
    case 'R3': {
      const { text } = metadata('03-arch-decision-record.md', ['Accepted']);
      const chosen = decision('R3-options');
      covers(text, [chosen.selection, chosen.rationale, chosen.decider], 'ADR');
      for (const issue of chosen.open_issues) covers(text, Object.values(issue), 'ADR open issues');
      result = { selection: chosen.selection };
      break;
    }
    case 'R4': {
      const { text } = metadata('04-feature.md');
      const ac = identifiers(text, 'AC');
      check(ac.length > 0, 'Feature needs explicit AC identifiers.');
      result = { ac_ids: ac };
      break;
    }
    case 'R5': {
      const gate = json(data.gate_ref);
      read(data.gate_summary_ref);
      check(gate.schema_version === '1.0' && gate.skill === 'ohos-req-review-gate'
        && gate.feature_id === previous('R1').feature_id, 'Invalid native Review Ready Gate identity.');
      const checks = records(gate.checks, 'gate.checks');
      check(checks.length === CHECKS.length && new Set(checks.map((item) => item.id)).size === CHECKS.length
        && CHECKS.every((id) => checks.some((item) => item.id === id)), 'Gate requires all 12 distinct checks.');
      for (const item of checks) {
        check(['pass', 'warn', 'fail'].includes(item.status), 'Invalid Gate check status.');
        meaningful(item.evidence, 'check.evidence');
        meaningful(item.section_ref, 'check.section_ref');
      }
      const counts = Object.fromEntries(['pass', 'warn', 'fail'].map((status) =>
        [status, checks.filter((item) => item.status === status).length]));
      check(Object.keys(counts).every((key) => gate.summary?.[key] === counts[key]), 'Gate counts disagree with checks.');
      const conditions = records(gate.conditions, 'gate.conditions', 0);
      const observations = records(gate.observations, 'gate.observations', 0);
      for (const item of observations) {
        for (const key of ['desc', 'owner', 'target_phase', 'close_at']) meaningful(item[key], `observation.${key}`);
      }
      const completeCondition = (item) => ['desc', 'owner', 'close_action', 'close_at']
        .every((key) => typeof item[key] === 'string' && item[key].trim()
          && !/^(TBD|TODO|待补充|待定|<.*>)$/i.test(item[key].trim()));
      const warningsClosed = checks.filter((item) => item.status === 'warn').every((item) =>
        conditions.some((condition) => condition.check_id === item.id && completeCondition(condition))
        || observations.some((observation) => observation.check_id === item.id
          && observation.owner && observation.target_phase && observation.close_at));
      const expected = counts.fail || !warningsClosed ? 'Not Ready'
        : conditions.length ? 'Conditional Ready' : 'Ready';
      check(['Ready', 'Conditional Ready', 'Not Ready'].includes(gate.gate)
        && gate.gate === expected, 'Native Gate conclusion contradicts its checks; request reviewer repair.');
      // This checks consistency of the independent review, never judges document semantics itself.
      if (gate.gate !== 'Not Ready') {
        check(conditions.every(completeCondition), 'All conditions require owner, action, and closing time.');
        const links = records(json(data.traceability_ref).links, 'traceability.links');
        const fr = previous('R1').fr_ids;
        const ac = previous('R4').ac_ids;
        check(links.every((item) => fr.includes(item.fr) && ac.includes(item.ac)), 'Traceability contains unknown FR/AC.');
        check(fr.every((id) => links.some((item) => item.fr === id))
          && ac.every((id) => links.some((item) => item.ac === id)), 'FR-to-AC traceability is incomplete.');
      }
      result = { gate: gate.gate, conditions, observations, block_reasons: gate.block_reasons ?? [] };
      break;
    }
    case 'R6': {
      const recorded = decision('R6-input');
      metadata('value-decision-record.md', [recorded.decision]);
      const value = json(data.decision_ref);
      check(value.schema_version === '1.0' && value.skill === 'ohos-req-value-decision'
        && value.decision === recorded.decision && value.rr_id === previous('R1').rr_id
        && value.feature_id === previous('R1').feature_id,
      'Value decision must match the recorded human review.');
      const action = { Accepted: 'proceed', Rejected: 'close', 'PendingRe-review': 'rollback' }[recorded.decision];
      check(value.routing?.action === action, 'Value decision routing contradicts the human outcome.');
      for (const opinion of records(value.review_opinions, 'review_opinions', 0)) {
        meaningful(opinion.handling, 'review_opinion.handling');
        meaningful(opinion.owner, 'review_opinion.owner');
      }
      if (recorded.decision === 'PendingRe-review') {
        const modifications = records(value.modifications, 'modifications');
        const map = { '01-requirement.md': 'R1', '02-feasibility.md': 'R2',
          '03-arch-decision-record.md': 'R3-options', '04-feature.md': 'R4' };
        check(modifications.every((item) => map[item.doc] && item.requirement), 'Invalid review modification.');
        const lowest = modifications.map((item) => map[item.doc]).sort()[0];
        check(lowest === recorded.target_phase, 'Rollback must start at the earliest modified document.');
        check(value.routing.target_step === { R1: '0.1', R2: '0.2', 'R3-options': '0.3', R4: '0.4' }[lowest],
          'Value decision target_step disagrees with modifications.');
      }
      result = { decision: recorded.decision, target_phase: recorded.target_phase ?? null };
      break;
    }
    case 'R7-plan': {
      const gate = previous('R5');
      const { text } = metadata('IR.md', [gate.gate === 'Conditional Ready' ? 'Conditional' : 'Baseline']);
      for (const item of gate.conditions) covers(text, [item.desc, item.owner, item.close_action, item.close_at], 'IR conditions');
      const proposals = records(data.proposals, 'proposals');
      for (const item of proposals) {
        expectString(item.path, 'proposal.path');
        expectString(item.sr_path, 'proposal.sr_path');
      }
      check(new Set(proposals.map((item) => item.id)).size === proposals.length
        && new Set(proposals.map((item) => resolve(run.docs_root, item.path))).size === proposals.length
        && new Set(proposals.map((item) => resolve(run.docs_root, item.sr_path))).size === proposals.length,
      'Proposal IDs, paths, and target SR paths must be one-to-one.');
      const ac = previous('R4').ac_ids;
      check(identifiers(text, 'AC').every((id) => ac.includes(id)), 'IR introduces an unapproved AC.');
      for (const item of proposals) {
        meaningful(item.id, 'proposal.id');
        check(/^05-proposal[^/\\]*\.md$/.test(item.path) && /^SR(?:-[^/\\]+)?\.md$/.test(item.sr_path),
          'Use 05-proposal*.md and SR[-*].md inside docs_root.');
        const proposal = metadata(item.path, ['GA-Approved']);
        meaningful(item.owner, 'proposal.owner');
        const limit = { simple: 5, standard: 8, complex: 15 }[item.complexity];
        check(limit && Number.isFinite(item.effort_pm) && item.effort_pm > 0 && item.effort_pm <= limit,
          'Proposal exceeds its complexity effort limit (5/8/15 person-months).');
        list(item.ac_ids, 'proposal.ac_ids');
        check(item.ac_ids.every((id) => ac.includes(id)), 'Proposal contains an unknown AC.');
        covers(proposal.text, [item.id, ...item.ac_ids], 'Proposal scope');
        check(identifiers(proposal.text, 'AC').every((id) => item.ac_ids.includes(id)),
          'Proposal document disagrees with its AC matrix.');
        list(item.dependencies, 'proposal.dependencies', 0);
        check(item.dependencies.every((id) => id !== item.id && proposals.some((other) => other.id === id)),
          'Proposal dependency must reference another proposal in the matrix.');
        covers(text, [item.id, item.path], 'IR proposal matrix');
      }
      check(ac.every((id) => proposals.some((item) => item.ac_ids.includes(id))), 'Proposal matrix omits an AC.');
      result = { proposals };
      break;
    }
    case 'R7-SR': {
      const plan = previous('R7-plan');
      decision('R7-plan');
      for (const item of plan.proposals) {
        const { text } = metadata(item.sr_path, ['Baseline', 'Accepted']);
        covers(text, [item.id, ...item.ac_ids], 'SR traceability');
        check(identifiers(text, 'AC').every((id) => item.ac_ids.includes(id)), 'SR introduces an AC outside its approved proposal.');
        for (const role of ['分析责任人', 'SE', 'TSE', '测试责任人']) {
          const row = text.split(/\r?\n/).find((line) => line.split('|')[1]?.trim() === role);
          meaningful(row?.split('|')[2]?.trim(), `SR role ${role}`);
        }
      }
      result = { sr_paths: plan.proposals.map((item) => item.sr_path) };
      break;
    }
    case 'R8':
    case 'R9': {
      const name = task.phase === 'R8' ? 'handoff.md' : 'AR.md';
      const { text } = metadata(name, ['Accepted']);
      const plan = previous('R7-plan');
      const refs = ['01-requirement.md', '02-feasibility.md', '03-arch-decision-record.md',
        '04-feature.md', 'IR.md', ...plan.proposals.flatMap((item) => [item.path, item.sr_path])];
      if (task.phase === 'R9') refs.push('handoff.md');
      covers(text, refs, name);
      covers(text, [previous('R3').selection], `${name} selected architecture`);
      covers(text, previous('R2').code_refs, `${name} code references`);
      for (const issue of decision('R3-options').open_issues) covers(text, Object.values(issue), `${name} open issues`);
      for (const proposal of plan.proposals) covers(text, [proposal.id, proposal.owner, ...proposal.dependencies], `${name} proposal matrix`);
      for (const condition of previous('R5').conditions) {
        covers(text, [condition.desc, condition.owner, condition.close_action, condition.close_at], name);
      }
      for (const observation of previous('R5').observations) {
        covers(text, [observation.desc, observation.owner, observation.target_phase, observation.close_at], `${name} observations`);
      }
      if (task.phase === 'R9') {
        const baseline = previous('R1');
        covers(text, [...baseline.fr_ids, ...baseline.nfr_ids, ...previous('R4').ac_ids], 'AR traceability');
        check(identifiers(text, 'FR').every((id) => baseline.fr_ids.includes(id))
          && identifiers(text, 'NFR').every((id) => baseline.nfr_ids.includes(id))
          && identifiers(text, 'AC').every((id) => previous('R4').ac_ids.includes(id)), 'AR introduces an unapproved FR/NFR/AC.');
        for (let section = 1; section <= 8; section++) {
          check(new RegExp(`^## ${section}\\.\\s+\\S`, 'm').test(text), `AR must include template section ${section}.`);
        }
        check(!text.includes('```ar-contract'), 'AR is a requirement input, not a delivery design contract.');
      }
      result = { [task.phase === 'R8' ? 'handoff_path' : 'ar_path']: resolve(run.docs_root, name) };
      break;
    }
    default: check(false, 'Input-only nodes cannot submit worker artifacts.');
  }
  const snapshot = [...files.values()];
  return { snapshot, snapshot_digest: digest(snapshot), result };
}

export function validateHumanDecision(phase, value, receipt) {
  const data = expectObject(value, 'decision');
  if (phase === 'R2-input') {
    check(typeof data.no_extra_materials === 'boolean', 'Explicitly record whether extra materials were supplied.');
    if (!data.no_extra_materials) list(data.material_refs, 'material_refs');
  } else if (phase === 'R3-options') {
    check(receipt.result.options.includes(data.selection), 'Select one of the presented architecture options.');
    meaningful(data.rationale, 'rationale');
    meaningful(data.decider, 'decider');
    for (const item of records(data.open_issues, 'open_issues', 0)) {
      for (const key of ['description', 'owner', 'action', 'close_at']) meaningful(item[key], `open_issue.${key}`);
    }
  } else if (phase === 'R6-input') {
    check(['Accepted', 'Rejected', 'PendingRe-review'].includes(data.decision), 'Review outcome must be explicit.');
    if (data.decision === 'PendingRe-review') {
      check(['R1', 'R2', 'R3-options', 'R4'].includes(data.target_phase), 'Review rollback target must be R1-R4.');
      meaningful(data.reason, 'review modification reason');
    }
  } else if (phase === 'R7-plan') {
    const approvals = records(data.approvals, 'approvals');
    check(approvals.length === receipt.result.proposals.length
      && new Set(approvals.map((item) => item.proposal_id)).size === approvals.length,
    'Each proposal requires exactly one GA approval.');
    for (const proposal of receipt.result.proposals) {
      const approval = approvals.find((item) => item.proposal_id === proposal.id);
      check(approval?.decision === 'GA-Approved', `Missing GA approval for ${proposal.id}`);
      meaningful(approval.reviewer, 'GA reviewer');
      meaningful(approval.evidence_ref, 'GA evidence_ref');
    }
  } else {
    check(data.confirmed === true, 'Explicit human confirmation is required.');
  }
  return data;
}
