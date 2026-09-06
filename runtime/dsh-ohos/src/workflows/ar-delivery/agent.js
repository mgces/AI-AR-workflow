import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../core/paths.js';
import { taskAgentInstructions } from '../../core/agent-protocol.js';

export const DELIVERY_AGENT = Object.freeze({
  id: 'ohos-delivery',
  workflow: 'delivery',
  description: 'Runs one scoped task from the OHOS P0-P8 delivery workflow. Use after the parent starts or resumes a delivery run.',
  instructions: taskAgentInstructions({
    id: 'ohos-delivery',
    workInstructions: 'Work inside workspace_root and follow the phase constraints returned by ohos_task_context. Invoke the named trusted gate scripts to create evidence; do not hand-edit pipeline state, evidence manifests, consent records, gate scripts, or publishing state.',
  }),
  parentGuide: () => `# AR delivery workflow parent protocol

Read the full contract: ${resolve(PACKAGE_ROOT, 'docs/ar-delivery/contract.md')}
Use ohos_delivery_start to initialize or attach an authoritative Python pipeline.
Dispatch each returned role/revision to one host-native ohos-delivery subagent.
The worker claims, reads context, runs the phase skill and trusted gate, then submits.
The parent calls ohos_delivery_validate; human consent at P1/P6/P7/P8 must bind the displayed evidence.
Use ohos_delivery_consent for an actual authorized decision, then continue.
Use ohos_delivery_sync after interruption or Python-side reset. P8 precheck and publishing are separate tasks.
The host selects the model. Never bypass Python evidence or fabricate a human decision.
`,
});
