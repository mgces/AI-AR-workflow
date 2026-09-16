#!/usr/bin/env node

import { ConnectorPairingRegistry } from '../src/connector/pairing-registry.js';

function value(name, args, { required = true } = {}) {
  const index = args.indexOf(name);
  const result = index >= 0 ? args[index + 1] : undefined;
  if (result && !result.startsWith('-')) return result;
  if (required) throw new Error(`${name} is required`);
  return null;
}

function usage() {
  process.stderr.write(`Usage:\n  dsh-connector-pair --registry /absolute/pairings.json --device-id DEVICE --workspace-id WORKSPACE [--label LABEL] [--ttl-ms MS]\n  dsh-connector-pair --registry /absolute/pairings.json --rotate --device-id DEVICE --workspace-id WORKSPACE\n  dsh-connector-pair --registry /absolute/pairings.json --revoke PAIRING_ID\n  dsh-connector-pair --registry /absolute/pairings.json --list [--device-id DEVICE] [--workspace-id WORKSPACE]\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { usage(); return; }
  const registry = new ConnectorPairingRegistry({ filePath: value('--registry', args) });
  if (args.includes('--list')) {
    process.stdout.write(`${JSON.stringify(await registry.list({
      deviceId: value('--device-id', args, { required: false }),
      workspaceId: value('--workspace-id', args, { required: false }),
    }), null, 2)}\n`);
    return;
  }
  if (args.includes('--revoke')) {
    const result = await registry.revoke({ pairingId: value('--revoke', args) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const deviceId = value('--device-id', args);
  const workspaceId = value('--workspace-id', args);
  const input = {
    deviceId,
    workspaceId,
    label: value('--label', args, { required: false }) ?? '',
    ...(value('--ttl-ms', args, { required: false }) ? { ttlMs: Number(value('--ttl-ms', args)) } : {}),
  };
  const issued = args.includes('--rotate') ? await registry.rotate(input) : await registry.pair(input);
  process.stdout.write(`${JSON.stringify(issued, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`dsh-connector-pair: ${error.message}\n`);
  usage();
  process.exitCode = 1;
});
