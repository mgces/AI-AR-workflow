import { invariant } from '../../core/errors.js';

const base = ['mcp_tools', 'native_subagent', 'workspace_write'];
const stage = (key, role, files, skills, options = {}) => Object.freeze({
  key, role, files, skills, capabilities: base, ...options,
});

// Substeps preserve the existing R1-R9 metrics vocabulary. Waiting nodes never lease a worker.
export const REQUIREMENT_STAGES = Object.freeze([
  stage('R1', 'requirement-analyst', ['01-requirement.md', 'clarification-questions.md'],
    ['ohos-req-requirement-intake'], { confirmation: 'clarification' }),
  stage('R2-input', 'parent', [], [], { input: 'feasibility_inputs' }),
  stage('R2', 'feasibility-analyst', ['02-feasibility.md', '_draft/feasibility-inputs.md'],
    ['ohos-req-feasibility-analysis'], { confirmation: 'feasibility' }),
  stage('R3-options', 'architecture-analyst', ['_draft/arch-options.md'],
    ['ohos-req-arch-decision'], { confirmation: 'architecture' }),
  stage('R3', 'architecture-analyst', ['03-arch-decision-record.md'], ['ohos-req-arch-decision']),
  stage('R4', 'feature-analyst', ['04-feature.md'], ['ohos-req-feature-baseline'],
    { confirmation: 'split' }),
  stage('R5', 'requirement-reviewer', [], ['ohos-req-review-gate'],
    { capabilities: [...base, 'isolated_context'] }),
  stage('R6-input', 'parent', [], [], { input: 'review_minutes' }),
  stage('R6', 'value-review-recorder', ['value-decision-record.md'], ['ohos-req-value-decision']),
  stage('R7-plan', 'requirement-planner', ['IR.md'], ['ohos-req-feature-to-ir'],
    { confirmation: 'gate_a' }),
  stage('R7-SR', 'sr-author', [], ['ohos-req-proposal-to-sr']),
  stage('R8', 'handoff-author', ['handoff.md'], ['ohos-req-intake-orchestration']),
  stage('R9', 'ar-author', ['AR.md'], ['ohos-req-intake-orchestration']),
]);

export function requirementStage(key) {
  const value = REQUIREMENT_STAGES.find((item) => item.key === key);
  invariant(value, 'invalid_requirement_stage', `Unknown requirement stage: ${key}`);
  return value;
}

export const requirementIndex = (key) => REQUIREMENT_STAGES.indexOf(requirementStage(key));
export const nextRequirementStage = (key) => REQUIREMENT_STAGES[requirementIndex(key) + 1] ?? null;

export function requirementInstructions(key) {
  const current = requirementStage(key);
  return [
    `Read the referenced skills: ${current.skills.join(', ')}. Complete only ${key}.`,
    'Write outputs inside docs_root. Keep accepted upstream artifacts unchanged; request a parent reset to revise them.',
    'Write a separate DSH submission JSON using the contract in requirement.contract_path; never add DSH fields to native Gate JSON.',
    'Submit the absolute path to that JSON in artifact_refs. It must bind run_id, phase, revision, and context_id.',
    'Record actual skill use in workflow_metrics.json with requirement_metrics.py; metrics are advisory, never acceptance evidence.',
    'At R1 initialize metrics with this run_id if absent. Record stage-open, actual use-skill, and stage-close using metrics_phase; never overwrite an existing metrics history.',
    'Human decisions come from requirement.decisions. Missing decisions must be requested through the parent, never invented.',
    'Return paths and at most 15 lines of summary. Do not start or modify the delivery P0-P8 pipeline.',
    ...(key === 'R5' ? ['Use a new host subagent context distinct from all document authors. Read 01-04, write native Gate JSON/Markdown and a separate FR-to-AC traceability file; do not modify the baseline.'] : []),
    ...(key === 'R3-options' ? ['Use _draft/arch-options.md for PendingDecision candidates; only R3 may finalize 03-arch-decision-record.md after the recorded user choice.'] : []),
    ...(key === 'R7-plan' ? ['Generate IR and proposals with the approved split. Do not generate SR yet; return the full proposal matrix for evidence-bound GA confirmation.'] : []),
  ];
}
