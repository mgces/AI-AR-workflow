import { createRuntime } from '../runtime.js';

export const name = 'ohos-domain-tools';
export const inject = ['tools'];

export function apply(ctx) {
  const runtime = createRuntime();
  ctx.effect(() => () => runtime.close(), 'ohos-domain-tools.store');
  for (const tool of runtime.tools.values()) {
    ctx.tools.register(createDshToolDefinition(tool));
  }
}

export function createDshToolDefinition(tool) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    output: {
      // Results vary by operation but always remain lossless JSON.
      schema: {},
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      if (exec?.signal?.aborted) throw exec.signal.reason ?? new Error('Operation aborted.');
      const outcome = await tool.call(args);
      if (!outcome.ok) {
        const error = new Error(`${outcome.error.code}: ${outcome.error.message}`);
        error.code = outcome.error.code;
        error.details = outcome.error.details;
        throw error;
      }
      return outcome.result;
    },
  };
}
