import { defineTool } from '@deepseek-ai/dsh-tools';
import { AdaptiveWorkflowController } from '../core/controller.js';
import { createToolCatalog } from '../tools/catalog.js';
import { createDeliveryRuntimeTools } from './delivery-runtime.js';

export const name = 'ai-ar-adaptive-workflow-controller';
export const inject = ['tools'];

function registerTool(ctx, spec) {
  ctx.tools.register(defineTool({
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(args) { return await spec.execute(args); },
  }));
}

export function apply(ctx, config = {}) {
  const controllerPromise = AdaptiveWorkflowController.create({
    workspaceRoot: config.workspaceRoot,
    stateDir: config.stateDir,
    registryFile: config.registryFile,
    strategiesFile: config.strategiesFile,
    python: config.python,
  });

  const catalog = createToolCatalog({
    developmentStatus: async (...args) => (await controllerPromise).developmentStatus(...args),
    developmentNext: async (...args) => (await controllerPromise).developmentNext(...args),
    developmentGate: async (...args) => (await controllerPromise).developmentGate(...args),
    developmentAdvance: async (...args) => (await controllerPromise).developmentAdvance(...args),
    developmentConsent: async (...args) => (await controllerPromise).developmentConsent(...args),
    developmentVerify: async (...args) => (await controllerPromise).developmentVerify(...args),
    evolutionProposals: async (...args) => (await controllerPromise).evolutionProposals(...args),
    resolveModules: async (...args) => (await controllerPromise).resolveModules(...args),
    requirements: {
      start: async (...args) => (await controllerPromise).requirements.start(...args),
      status: async (...args) => (await controllerPromise).requirements.status(...args),
      next: async (...args) => (await controllerPromise).requirements.next(...args),
      submit: async (...args) => (await controllerPromise).requirements.submit(...args),
    },
  });
  for (const spec of catalog) registerTool(ctx, spec);

  if (config.enableDeliveryRuntime === true) {
    for (const definition of createDeliveryRuntimeTools(config)) ctx.tools.register(definition);
  }
}
