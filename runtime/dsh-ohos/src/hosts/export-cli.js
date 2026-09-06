#!/usr/bin/env node
import { resolve } from 'node:path';
import { ProtocolError, errorPayload } from '../core/errors.js';
import { renderHostBundle, writeHostBundle } from './render.js';

try {
  const options = parseArgs(process.argv.slice(2));
  const bundle = renderHostBundle(options.host, {
    workspaceRoot: options.workspaceRoot,
    dataRoot: options.dataRoot,
    nodeCommand: options.nodeCommand,
    pythonCommand: options.pythonCommand,
    deliveryScriptsRoot: options.deliveryScriptsRoot,
    requirementSkillsRoot: options.requirementSkillsRoot,
  });
  const files = writeHostBundle(options.outputRoot, bundle, { force: options.force });
  process.stdout.write(`${JSON.stringify({
    status: 'exported', host_kind: options.host, files, warnings: bundle.warnings,
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify(errorPayload(error), null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(args) {
  const values = { force: false, nodeCommand: process.execPath, pythonCommand: process.env.OHOS_DSH_PYTHON ?? 'python3' };
  const names = new Map([
    ['--host', 'host'],
    ['--workspace-root', 'workspaceRoot'],
    ['--data-root', 'dataRoot'],
    ['--output-root', 'outputRoot'],
    ['--node-command', 'nodeCommand'],
    ['--python-command', 'pythonCommand'],
    ['--delivery-scripts-root', 'deliveryScriptsRoot'],
    ['--requirement-skills-root', 'requirementSkillsRoot'],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--force') {
      values.force = true;
      continue;
    }
    const field = names.get(arg);
    if (!field || index + 1 >= args.length) {
      throw new ProtocolError('invalid_input', `Unknown or incomplete option: ${arg}`);
    }
    values[field] = args[index + 1];
    index += 1;
  }
  for (const field of ['host', 'workspaceRoot', 'dataRoot', 'outputRoot']) {
    if (!values[field]) {
      throw new ProtocolError('invalid_input', `Missing required option: ${field}`);
    }
  }
  values.workspaceRoot = resolve(values.workspaceRoot);
  values.dataRoot = resolve(values.dataRoot);
  values.outputRoot = resolve(values.outputRoot);
  if (values.deliveryScriptsRoot) values.deliveryScriptsRoot = resolve(values.deliveryScriptsRoot);
  if (values.requirementSkillsRoot) values.requirementSkillsRoot = resolve(values.requirementSkillsRoot);
  return values;
}
