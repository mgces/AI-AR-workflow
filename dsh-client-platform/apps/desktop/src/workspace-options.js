import { readFile } from 'node:fs/promises';
import { parseSshHostAliases } from './workspace-config.js';

export async function discoverSshHostAliases({ sshConfigPath, readFileImpl = readFile } = {}) {
  if (typeof sshConfigPath !== 'string' || !sshConfigPath.trim()) {
    return { status: 'config_missing', aliases: [] };
  }
  let content;
  try { content = await readFileImpl(sshConfigPath, 'utf8'); } catch (error) {
    return { status: error?.code === 'ENOENT' ? 'config_missing' : 'read_failed', aliases: [] };
  }
  const aliases = parseSshHostAliases(content);
  return { status: aliases.length ? 'available' : 'no_aliases', aliases };
}
