import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', '__pycache__']);
const ARTIFACT_ROLES = Object.freeze({
  '.hap': 'application_package',
  '.hsp': 'shared_package',
  '.so': 'shared_library',
  '.ko': 'kernel_module',
  '.elf': 'executable',
  '.img': 'system_image',
  '.bin': 'binary_image',
});
const MAX_FILES = 3000;
const MAX_BYTES = 128 * 1024 * 1024;

async function walk(root, current = root, result = []) {
  if (result.length >= MAX_FILES) return result;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (result.length >= MAX_FILES) break;
    if (entry.isSymbolicLink()) continue;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await walk(root, path, result);
      continue;
    }
    const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop().toLowerCase()}` : '';
    if (ARTIFACT_ROLES[extension]) result.push({ path, extension });
  }
  return result;
}

export async function scanArtifacts(root) {
  const sourceRoot = resolve(root);
  if (!existsSync(sourceRoot)) {
    return { status: 'unavailable', source_root: sourceRoot, artifacts: [], reason: 'source root not found' };
  }
  const candidates = await walk(sourceRoot);
  let bytes = 0;
  const artifacts = [];
  for (const candidate of candidates) {
    const metadata = await stat(candidate.path);
    if (metadata.size > MAX_BYTES || bytes + metadata.size > MAX_BYTES) continue;
    const content = await readFile(candidate.path);
    bytes += content.length;
    artifacts.push({
      relative_path: relative(sourceRoot, candidate.path).split('\\').join('/'),
      role: ARTIFACT_ROLES[candidate.extension],
      size_bytes: metadata.size,
      sha256: createHash('sha256').update(content).digest('hex'),
      source: 'workspace_scan',
      confidence: 'advisory_extension',
      compatibility: 'not_verified',
    });
  }
  return {
    status: 'ready',
    source_root: sourceRoot,
    artifacts,
    scanned_files: candidates.length,
    bytes_scanned: bytes,
    limits: { max_files: MAX_FILES, max_bytes: MAX_BYTES },
  };
}

async function probeHdc(command) {
  try {
    const result = await execFile(command, ['list', 'targets'], { timeout: 4000, maxBuffer: 32 * 1024 });
    const targets = `${result.stdout || ''}`.split(/\r?\n/).map((line) => line.trim())
      .filter((line) => line && !/^list of devices/i.test(line));
    return { status: 'available', command, targets };
  } catch (error) {
    return {
      status: error.code === 'ENOENT' ? 'missing' : 'probe_failed',
      command,
      targets: [],
      reason: error.code === 'ENOENT' ? 'hdc executable not found' : 'hdc probe failed',
    };
  }
}

export async function probeDebugSurface(root) {
  const artifacts = await scanArtifacts(root);
  const command = process.env.DSH_HDC_CLI || 'hdc';
  const device = await probeHdc(command);
  return {
    status: artifacts.status === 'ready' && (artifacts.artifacts.length > 0 || device.status === 'available')
      ? 'ready'
      : artifacts.status === 'ready' ? 'partial' : 'unavailable',
    artifacts,
    device_probe: device,
    deployment: 'disabled_until_profile_and_device_match',
  };
}
