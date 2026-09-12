import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

async function probe(name, command) {
  if (command.includes('/') && !existsSync(command)) {
    return { status: 'missing', command, version: null };
  }
  try {
    const result = await execFile(command, ['--version'], { timeout: 5000, maxBuffer: 16 * 1024 });
    const version = `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] || null;
    return { status: 'available', command, version };
  } catch (error) {
    return {
      status: error.code === 'ENOENT' ? 'missing' : 'probe_failed',
      command,
      version: null,
      reason: error.code === 'ENOENT' ? 'executable not found' : 'version probe failed',
    };
  }
}

export async function probeLocalAgents() {
  const claudeCommand = process.env.DSH_CLAUDE_CLI
    || '/mnt/c/Users/mgces/AppData/Roaming/npm/claude';
  const opencodeCommand = process.env.DSH_OPENCODE_CLI || 'opencode';
  const [claude, opencode] = await Promise.all([
    probe('claude_code', claudeCommand),
    probe('opencode', opencodeCommand),
  ]);
  return { claude_code: claude, opencode };
}
