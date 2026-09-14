import { defineTool } from '@deepseek-ai/dsh-tools';
import { AdaptiveWorkflowController } from '../core/controller.js';
import { createToolCatalog } from '../tools/catalog.js';
import { createDeliveryRuntimeTools } from './delivery-runtime.js';
import { CodeAgentRegistry } from './codeagents.js';
import { ArRuntimeService } from '../../../platform/apps/local-console/src/ar-runtime.js';
import { registerDeliveryWebRoutes } from './web-routes.js';

export const name = 'ai-ar-adaptive-workflow-controller';
export const inject = ['tools'];

function createLazyDeliveryService(config) {
  let instance;
  const get = () => {
    instance ??= new ArRuntimeService({
      dataRoot: config.dataRoot,
      deliveryScriptsRoot: config.deliveryScriptsRoot,
      deliveryBridgePath: config.deliveryBridgePath,
      pythonCommand: config.pythonCommand,
      hostBindingId: config.hostBindingId ?? 'dsh-web-agent',
      hostKind: config.hostKind ?? 'claude-code',
      hostVersion: config.hostVersion ?? 'dsh-web',
    });
    return instance;
  };
  const proxy = new Proxy({}, {
    get(_target, property) {
      const value = get()[property];
      return typeof value === 'function' ? value.bind(get()) : value;
    },
  });
  return {
    get,
    proxy,
    close() {
      if (instance) instance.close();
    },
  };
}

export function apply(ctx, config = {}) {
  const controllerPromise = AdaptiveWorkflowController.create({
    workspaceRoot: config.workspaceRoot,
    stateDir: config.stateDir,
    registryFile: config.registryFile,
    strategiesFile: config.strategiesFile,
    python: config.python,
  });

  for (const spec of createToolCatalog({
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
  })) {
    ctx.tools.register(defineTool({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        return await spec.execute(args);
      },
    }));
  }
  if (config.enableDeliveryRuntime === true) {
    const lazy = createLazyDeliveryService(config);
    for (const definition of createDeliveryRuntimeTools({ ...config, service: lazy.proxy })) {
      ctx.tools.register(definition);
    }
    if (typeof ctx.inject === 'function') {
      ctx.inject(['webServer', 'connection', 'subagents'], (webCtx) => {
        const codeAgents = new CodeAgentRegistry({
          dataRoot: config.dataRoot,
          subagents: webCtx.subagents,
        });
        const register = () => registerDeliveryWebRoutes(webCtx, {
          service: lazy.proxy,
          connection: webCtx.connection,
          subagents: webCtx.subagents,
          codeAgents,
          repoRoot: config.repoRoot,
          defaultArPath: config.defaultArPath,
          workspaceId: config.workspaceId,
          workflowId: config.workflowId,
        });
        if (typeof webCtx.effect === 'function') {
          webCtx.effect(register, 'ai-ar: official DSH delivery routes');
          webCtx.effect(() => () => lazy.close(), 'ai-ar: delivery runtime cleanup');
        } else {
          register();
        }
      });
    }
  }
}
