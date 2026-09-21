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
      // `hdc list targets` commonly prints only the serial for an online
      // device. Presence in that command's output is itself the connected
      // signal; explicit offline/unauthorized states still take precedence.
      const [id, state = 'device'] = line.split(/\s+/u);
      return { id, state: state.toLowerCase() };
    }).filter((item) => item.id && !/^[-=]+$/u.test(item.id));
}

export function hdcProbeArgs(env = process.env) {
  const override = typeof env?.HDC_HOST_OVERRIDE === 'string' ? env.HDC_HOST_OVERRIDE.trim() : '';
  if (!override) return ['list', 'targets'];
  const match = /^127\.0\.0\.1:([0-9]{1,5})$/u.exec(override);
  const port = match ? Number(match[1]) : 0;
  if (!match || !Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
    fail('HDC_HOST_OVERRIDE must be 127.0.0.1 on a port between 1024 and 65535');
  }
  return ['-s', override, 'list', 'targets'];
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
        : targets.length === 1 && ['device', 'connected', 'online'].includes(targets[0].state) ? 'available'
          : targets.length > 1 ? 'ambiguous' : 'not_ready';
  return {
    status,
    command: hdc,
    targets,
    ...(error || result?.error ? { reason: error?.message ?? result?.error?.message ?? 'hdc probe failed' } : {}),
  };
}

export function main(argv = process.argv.slice(2), { env = process.env, spawnSyncImpl = spawnSync } = {}) {
  const hdc = parseArgs(argv);
  const args = hdcProbeArgs(env);
  let result;
  try {
    result = spawnSyncImpl(hdc, args, {
      encoding: 'utf8', timeout: 4000, shell: false,
      env: { ...env },
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
