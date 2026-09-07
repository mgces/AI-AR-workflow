// DSH dynamic workflow SCRIPT BODY example. A DSH model Provider is required.
// Submit this body through DSH's workflow tool; it is not a saved-workflow API.
phase('Discover', 'Read authoritative state and select only relevant modules')
const discovery = await agent(
  `Call ar_dev_next for pipelineDir=${args.pipelineDir} with task tags from args.taskTags.
Return the phase, objective, selected module ids, next gate and required inputs.`,
  {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        phase: { type: 'string' },
        objective: { type: 'string' },
        moduleIds: { type: 'array', items: { type: 'string' } },
        nextGate: { type: 'string' },
        requiredInputs: { type: 'array', items: { type: 'string' } }
      },
      required: ['phase', 'objective', 'moduleIds', 'nextGate', 'requiredInputs']
    }
  }
)

phase('Execute', discovery.objective)
let outcome = await agent(
  `Work on ${args.pipelineDir}. Use only these on-demand modules: ${discovery.moduleIds.join(', ')}.
Follow their SKILL.md files by path returned from ar_dev_next. Complete the current action, call
ar_dev_gate with the exact gate arguments required by the original workflow, and return whether
the authoritative gate passed. Do not call ar_dev_advance.`,
  {
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        passed: { type: 'boolean' },
        repairPacket: { type: 'object', additionalProperties: true },
        summary: { type: 'string' }
      },
      required: ['passed', 'summary']
    }
  }
)

let attempts = 0
while (!outcome.passed && outcome.repairPacket?.strategy?.automatic && attempts < 2) {
  attempts += 1
  phase(`Repair ${attempts}`, outcome.repairPacket.failureClass)
  outcome = await agent(
    `Apply this scoped repair packet without changing authority scripts or weakening tests:
${JSON.stringify(outcome.repairPacket)}
Rerun the same authoritative gate and return its actual result.`,
    {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          passed: { type: 'boolean' },
          repairPacket: { type: 'object', additionalProperties: true },
          summary: { type: 'string' }
        },
        required: ['passed', 'summary']
      }
    }
  )
}

return { discovery, outcome, repairAttempts: attempts }
