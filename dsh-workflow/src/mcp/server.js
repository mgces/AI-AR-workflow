#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { AdaptiveWorkflowController } from '../core/controller.js';

function result(value) {
  const structuredContent = Array.isArray(value) ? { items: value } : value;
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    ...(structuredContent && typeof structuredContent === 'object' ? { structuredContent } : {}),
  };
}

function failure(error) {
  return {
    isError: true,
    content: [{ type: 'text', text: error?.stack ?? error?.message ?? String(error) }],
  };
}

function safe(handler) {
  return async (args) => {
    try {
      return result(await handler(args));
    } catch (error) {
      return failure(error);
    }
  };
}

function stringList() {
  return z.array(z.string()).optional().default([]);
}

export function createServer(controller) {
  const server = new McpServer(
    { name: 'ai-ar-dsh-workflow', version: '0.1.0' },
    {
      instructions: [
        'Use ar_dev_status/ar_dev_next before acting on a P0-P8 run.',
        'Only advance.py and existing gate_*.py decide authoritative state.',
        'Use returned modules on demand; do not load every Skill at once.',
        'On failure, follow repairPacket and rerun the same gate.',
        'Never infer human consent.',
      ].join(' '),
    },
  );

  server.registerTool(
    'ar_dev_status',
    {
      description: 'Read authoritative P0-P8 status.',
      inputSchema: z.object({ pipelineDir: z.string() }),
    },
    safe((args) => controller.developmentStatus(args)),
  );
  server.registerTool(
    'ar_dev_next',
    {
      description: 'Read next action and resolve its minimum Skill module set.',
      inputSchema: z.object({
        pipelineDir: z.string(),
        taskTags: stringList(),
        capabilities: stringList(),
      }),
    },
    safe((args) => controller.developmentNext(args)),
  );
  server.registerTool(
    'ar_dev_gate',
    {
      description: 'Run an allowlisted existing gate and return repair guidance on failure.',
      inputSchema: z.object({
        pipelineDir: z.string(),
        gate: z.enum([
          'gate_env_init.py',
          'gate_design.py',
          'gate_develop.py',
          'gate_test_develop.py',
          'gate_build.py',
          'gate_test_ut.py',
          'gate_device_func.py',
          'gate_integration.py',
          'gate_upload_ci.py',
        ]),
        gateArgs: stringList(),
        taskTags: stringList(),
        capabilities: stringList(),
        allowIrreversible: z.boolean().optional().default(false),
      }),
    },
    safe((args) => controller.developmentGate(args)),
  );
  server.registerTool(
    'ar_dev_advance',
    {
      description: 'Close one phase through advance.py authoritative validation.',
      inputSchema: z.object({ pipelineDir: z.string(), phase: z.number().int().min(0).max(8) }),
    },
    safe((args) => controller.developmentAdvance(args)),
  );
  server.registerTool(
    'ar_dev_consent',
    {
      description: 'Record explicit human consent through advance.py.',
      inputSchema: z.object({
        pipelineDir: z.string(),
        phase: z.union([z.literal(1), z.literal(6), z.literal(7), z.literal(8)]),
        token: z.string().min(1),
      }),
    },
    safe((args) => controller.developmentConsent(args)),
  );
  server.registerTool(
    'ar_dev_verify',
    {
      description: 'Run verify-all before resuming.',
      inputSchema: z.object({ pipelineDir: z.string() }),
    },
    safe((args) => controller.developmentVerify(args)),
  );
  server.registerTool(
    'ar_requirement_start',
    {
      description: 'Start an isolated R1-R9 requirement controller projection.',
      inputSchema: z.object({
        runId: z.string(),
        docsDir: z.string(),
        taskTags: stringList(),
        capabilities: stringList(),
      }),
    },
    safe((args) => controller.requirements.start(args)),
  );
  server.registerTool(
    'ar_requirement_status',
    {
      description: 'Read R1-R9 requirement controller state.',
      inputSchema: z.object({ runId: z.string() }),
    },
    safe(({ runId }) => controller.requirements.status(runId)),
  );
  server.registerTool(
    'ar_requirement_next',
    {
      description: 'Read current requirement action and resolve its minimum modules.',
      inputSchema: z.object({
        runId: z.string(),
        taskTags: stringList(),
        capabilities: stringList(),
        failureClass: z.string().optional(),
      }),
    },
    safe(({ runId, ...overrides }) => controller.requirements.next(runId, overrides)),
  );
  server.registerTool(
    'ar_requirement_submit',
    {
      description: 'Validate current-stage artifacts and advance the R1-R9 projection.',
      inputSchema: z.object({
        runId: z.string(),
        stage: z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']),
        expectedRevision: z.number().int().positive().optional(),
        evidence: stringList(),
        gateDecision: z.enum(['Ready', 'Conditional Ready']).optional(),
        reviewDecision: z.enum(['accepted', 'rejected', 'rework']).optional(),
        reworkStage: z.enum(['R1', 'R2', 'R3', 'R4', 'R5']).optional(),
        humanActor: z.string().optional(),
        humanApproved: z.boolean().optional(),
      }),
    },
    safe(({ runId, humanActor, humanApproved, ...submission }) => controller.requirements.submit(
      runId,
      {
        ...submission,
        humanApproval: humanActor
          ? { actor: humanActor, approved: humanApproved ?? true }
          : undefined,
      },
    )),
  );
  server.registerTool(
    'ar_module_resolve',
    {
      description: 'Resolve minimum transitive Skill modules for a phase/failure.',
      inputSchema: z.object({
        workflow: z.enum(['requirement', 'development']),
        phase: z.string(),
        taskTags: stringList(),
        capabilities: stringList(),
        failureClass: z.string().optional(),
      }),
    },
    safe((args) => ({ modules: controller.resolveModules(args) })),
  );
  server.registerTool(
    'ar_evolution_proposals',
    {
      description: 'Create staging-only module-routing proposals from authoritative gate experiences.',
      inputSchema: z.object({ minSamples: z.number().int().min(1).optional().default(3) }),
    },
    safe((args) => controller.evolutionProposals(args)),
  );
  return server;
}

export async function main() {
  const controller = await AdaptiveWorkflowController.create();
  const handle = serveStdio(() => createServer(controller), {
    onerror: (error) => console.error(error),
  });
  // Some desktop/WSL launchers expose stdin as an initially paused pipe. Keep
  // the stdio process alive explicitly until its owning MCP client disconnects.
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once('end', resolve));
  await handle.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
