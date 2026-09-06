import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../core/paths.js';
import { taskAgentInstructions } from '../../core/agent-protocol.js';

export const REQUIREMENT_AGENT = Object.freeze({
  id: 'ohos-requirement',
  workflow: 'requirement',
  description: 'Runs one scoped task from the OHOS R1-R9 requirement workflow. Use after the parent starts or resumes a requirement run.',
  instructions: taskAgentInstructions({
    id: 'ohos-requirement',
    contextInstructions: 'Requirement tasks also require context_id, the actual host subagent session identity (a stable encoded ID if necessary); never invent a new identity for a reused context.',
    workInstructions: 'Read requirement.contract_path and skill_paths. Write only the current phase outputs in docs_root, then submit requirement.manifest_path. Keep accepted upstream files immutable. R5 requires a fresh isolated reviewer context and native ohos-req-review-gate output; do not author baseline documents in that context.',
  }),
  parentGuide: () => `# Requirement workflow parent protocol

Use the shared ohos_parent MCP connection and host-native ohos-requirement subagents.
Read the full contract: ${resolve(PACKAGE_ROOT, 'docs/requirement/contract.md')}

Start with ohos_requirement_start(input_ref, docs_root, idempotency_key).
Verify host capabilities before registering them; R5 needs a genuinely isolated native subagent context.
For dispatch_needed, pass the returned run_id, role, revision and binding to one subagent, along with the actual context_id.
The worker reads ohos_task_context and submits its required manifest. The parent calls ohos_requirement_validate.
For needs_input, present the candidate files, save the actual user response or review minutes, and call ohos_requirement_decide with the displayed snapshot_digest.
For resume, call ohos_requirement_sync with a new idempotency key. Use ohos_requirement_reset for requested revisions, after stopping active writers.
R7 requires every proposal's GA evidence before SR dispatch. Completion returns AR.md; start delivery separately only when the user has requested development.
The host selects the model. Do not configure a separate model API or fabricate host capabilities, session isolation, or human approvals.
`,
});
