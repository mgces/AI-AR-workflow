export function createToolCatalog(controller) {
  return [
    {
      name: 'ar_dev_status',
      description: 'Read authoritative P0-P8 status. Does not let DSH decide PASS.',
      parameters: {
        pipelineDir: { type: 'string', required: true, description: 'Absolute pipeline run directory' },
      },
      execute: (args) => controller.developmentStatus(args),
    },
    {
      name: 'ar_dev_next',
      description: 'Return authoritative next action plus the smallest relevant Skill module set.',
      parameters: {
        pipelineDir: { type: 'string', required: true },
        taskTags: { type: 'array', items: { type: 'string' } },
        capabilities: { type: 'array', items: { type: 'string' } },
      },
      execute: (args) => controller.developmentNext(args),
    },
    {
      name: 'ar_dev_gate',
      description: 'Run an allowlisted existing gate and return a repair packet on failure.',
      parameters: {
        pipelineDir: { type: 'string', required: true },
        gate: { type: 'string', required: true },
        gateArgs: { type: 'array', items: { type: 'string' } },
        taskTags: { type: 'array', items: { type: 'string' } },
        capabilities: { type: 'array', items: { type: 'string' } },
        allowIrreversible: { type: 'boolean' },
      },
      execute: (args) => controller.developmentGate(args),
    },
    {
      name: 'ar_dev_advance',
      description: 'Ask advance.py to close one phase. Signed evidence and consent are revalidated.',
      parameters: {
        pipelineDir: { type: 'string', required: true },
        phase: { type: 'number', required: true },
      },
      execute: (args) => controller.developmentAdvance(args),
    },
    {
      name: 'ar_dev_consent',
      description: 'Record explicit human consent through advance.py for P1/P6/P7/P8.',
      parameters: {
        pipelineDir: { type: 'string', required: true },
        phase: { type: 'number', required: true },
        token: { type: 'string', required: true },
      },
      execute: (args) => controller.developmentConsent(args),
    },
    {
      name: 'ar_dev_verify',
      description: 'Run verify-all before resuming and return repair guidance if authority rejects state.',
      parameters: {
        pipelineDir: { type: 'string', required: true },
      },
      execute: (args) => controller.developmentVerify(args),
    },
    {
      name: 'ar_requirement_start',
      description: 'Start an isolated R1-R9 DSH controller projection for the requirement workflow.',
      parameters: {
        runId: { type: 'string', required: true },
        docsDir: { type: 'string', required: true },
        taskTags: { type: 'array', items: { type: 'string' } },
        capabilities: { type: 'array', items: { type: 'string' } },
      },
      execute: (args) => controller.requirements.start(args),
    },
    {
      name: 'ar_requirement_status',
      description: 'Read the isolated R1-R9 controller state.',
      parameters: {
        runId: { type: 'string', required: true },
      },
      execute: (args) => controller.requirements.status(args.runId),
    },
    {
      name: 'ar_requirement_next',
      description: 'Return the current requirement action and only its relevant modules.',
      parameters: {
        runId: { type: 'string', required: true },
        taskTags: { type: 'array', items: { type: 'string' } },
        capabilities: { type: 'array', items: { type: 'string' } },
        failureClass: { type: 'string' },
      },
      execute: ({ runId, ...overrides }) => controller.requirements.next(runId, overrides),
    },
    {
      name: 'ar_requirement_submit',
      description: 'Validate current-stage artifacts and advance the isolated requirement controller.',
      parameters: {
        runId: { type: 'string', required: true },
        stage: { type: 'string', required: true },
        expectedRevision: { type: 'number' },
        evidence: { type: 'array', items: { type: 'string' } },
        gateDecision: { type: 'string' },
        reviewDecision: { type: 'string' },
        reworkStage: { type: 'string' },
        humanActor: { type: 'string' },
        humanApproved: { type: 'boolean' },
      },
      execute: ({ runId, humanActor, humanApproved, ...submission }) => controller.requirements.submit(
        runId,
        {
          ...submission,
          humanApproval: humanActor ? { actor: humanActor, approved: humanApproved ?? true } : undefined,
        },
      ),
    },
    {
      name: 'ar_module_resolve',
      description: 'Resolve the minimal transitive Skill module set for one phase and failure class.',
      parameters: {
        workflow: { type: 'string', required: true },
        phase: { type: 'string', required: true },
        taskTags: { type: 'array', items: { type: 'string' } },
        capabilities: { type: 'array', items: { type: 'string' } },
        failureClass: { type: 'string' },
      },
      execute: async (args) => ({ modules: await controller.resolveModules(args) }),
    },
    {
      name: 'ar_evolution_proposals',
      description: 'Aggregate authoritative gate experiences into staging-only routing proposals.',
      parameters: {
        minSamples: { type: 'number' },
      },
      execute: (args) => controller.evolutionProposals(args),
    },
  ];
}
