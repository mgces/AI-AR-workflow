#!/usr/bin/env node

/*
 * Fixed Gateway profile helper for read-only hdc discovery. It deliberately
 * accepts only an optional absolute executable path and never invokes a shell.
 */
import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

function fail(message) {
  throw new Error(message);
}

export function parseTargets(output) {
  return String(output ?? '').split(/\r?\n/u).map((line) => line.trim())
    .filter((line) => line && !/^list of devices attached/i.test(line))
    .map((line) => {
      const [id, state = 'unknown'] = line.split(/\s+/u);
      return { id, state: state.toLowerCase() };
    }).filter((item) => item.id && !/^[-=]+$/u.test(item.id));
}

function parseArgs(argv) {
  let hdc = process.env.DSH_HDC_CLI?.trim() || 'hdc';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--hdc' || typeof argv[index + 1] !== 'string') fail('only --hdc <absolute path> is supported');
    hdc = argv[++index];
    if (!isAbsolute(hdc) || hdc.includes('\\') || /[\0\r\n]/u.test(hdc)) fail('--hdc must be an absolute POSIX path');
  }
  return hdc;
}

function snapshot(hdc, result, error = null) {
  const targets = parseTargets(result?.stdout);
  const status = error?.code === 'ENOENT' ? 'missing'
    : error || result?.error ? 'probe_failed'
      : targets.length === 0 ? 'no_device'
        : targets.length === 1 && targets[0].state === 'device' ? 'available'
          : targets.length > 1 ? 'ambiguous' : 'not_ready';
  return {
    status,
    command: hdc,
    targets,
    ...(error || result?.error ? { reason: error?.message ?? result?.error?.message ?? 'hdc probe failed' } : {}),
  };
}

export function main(argv = process.argv.slice(2)) {
  const hdc = parseArgs(argv);
  let result;
  try {
    result = spawnSync(hdc, ['list', 'targets'], {
      encoding: 'utf8', timeout: 4000, shell: false,
      env: { ...process.env },
    });
  } catch (error) {
    process.stdout.write(`${JSON.stringify(snapshot(hdc, null, error))}\n`);
    return 0;
  }
  process.stdout.write(`${JSON.stringify(snapshot(hdc, result))}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`dsh-device-probe: ${error.message}\n`);
    process.exitCode = 2;
  }
}
