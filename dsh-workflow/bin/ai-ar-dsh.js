#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { AdaptiveWorkflowController } from '../src/core/controller.js';

function parse(argv) {
  const [command, ...rest] = argv;
  const values = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith('--')) throw new Error(`unexpected argument: ${item}`);
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      values[key] = true;
    } else {
      values[key] = value;
      index += 1;
    }
  }
  return { command, values };
}

function list(value) {
  return value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function number(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer`);
  return parsed;
}

function help() {
  return `Usage:
  ai-ar-dsh dev-status --pipeline-dir <dir>
  ai-ar-dsh dev-next --pipeline-dir <dir> [--tags sa,ipc] [--capabilities security-review]
  ai-ar-dsh dev-gate --pipeline-dir <dir> --gate gate_build.py [--gate-args=...]
  ai-ar-dsh dev-advance --pipeline-dir <dir> --phase <0-8>
  ai-ar-dsh dev-verify --pipeline-dir <dir>
  ai-ar-dsh modules --workflow development --phase P2 [--tags sa,cpp]
  ai-ar-dsh req-start --run-id <id> --docs-dir <dir>
  ai-ar-dsh req-status --run-id <id>
  ai-ar-dsh req-next --run-id <id>
  ai-ar-dsh req-submit --run-id <id> --submission <json-file>`;
}

async function run() {
  const { command, values } = parse(process.argv.slice(2));
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log(help());
    return;
  }
  const controller = await AdaptiveWorkflowController.create();
  let output;
  const common = {
    pipelineDir: values.pipelineDir,
    taskTags: list(values.tags),
    capabilities: list(values.capabilities),
  };
  switch (command) {
    case 'dev-status':
      output = await controller.developmentStatus(common);
      break;
    case 'dev-next':
      output = await controller.developmentNext(common);
      break;
    case 'dev-gate':
      output = await controller.developmentGate({
        ...common,
        gate: values.gate,
        gateArgs: list(values.gateArgs),
        allowIrreversible: values.allowIrreversible === 'true',
      });
      break;
    case 'dev-advance':
      output = await controller.developmentAdvance({
        pipelineDir: values.pipelineDir,
        phase: number(values.phase, 'phase'),
      });
      break;
    case 'dev-verify':
      output = await controller.developmentVerify(common);
      break;
    case 'modules':
      output = {
        modules: controller.resolveModules({
          workflow: values.workflow,
          phase: values.phase,
          taskTags: list(values.tags),
          capabilities: list(values.capabilities),
          failureClass: values.failureClass,
        }),
      };
      break;
    case 'req-start':
      output = await controller.requirements.start({
        runId: values.runId,
        docsDir: values.docsDir,
        taskTags: list(values.tags),
        capabilities: list(values.capabilities),
      });
      break;
    case 'req-status':
      output = await controller.requirements.status(values.runId);
      break;
    case 'req-next':
      output = await controller.requirements.next(values.runId, {
        taskTags: list(values.tags),
        capabilities: list(values.capabilities),
        failureClass: values.failureClass,
      });
      break;
    case 'req-submit': {
      if (!values.submission) throw new Error('--submission <json-file> is required');
      const submission = JSON.parse(await readFile(values.submission, 'utf8'));
      output = await controller.requirements.submit(values.runId, submission);
      break;
    }
    default:
      throw new Error(`unknown command ${command}\n${help()}`);
  }
  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exitCode = 1;
});
