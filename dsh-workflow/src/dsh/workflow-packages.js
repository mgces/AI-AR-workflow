import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_FILES = 128;
const MAX_BYTES = 4 * 1024 * 1024;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const AR_WORKFLOW_FILES = Object.freeze([
  'workspace-gateway/bin/dsh-ar-delivery.js',
  'workspace-gateway/bin/dsh-device-probe.js',
  'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py',
  'skills/ohos-ar-dev-phases/scripts/advance.py',
  'skills/ohos-ar-dev-phases/scripts/gate_build.py',
  'skills/ohos-ar-dev-phases/scripts/gate_design.py',
  'skills/ohos-ar-dev-phases/scripts/gate_develop.py',
  'skills/ohos-ar-dev-phases/scripts/gate_device_func.py',
  'skills/ohos-ar-dev-phases/scripts/gate_env_init.py',
  'skills/ohos-ar-dev-phases/scripts/gate_integration.py',
  'skills/ohos-ar-dev-phases/scripts/gate_test_develop.py',
  'skills/ohos-ar-dev-phases/scripts/gate_test_ut.py',
  'skills/ohos-ar-dev-phases/scripts/gate_upload_ci.py',
  'skills/ohos-ar-dev-phases/scripts/prepare_test_bundle.py',
  'skills/ohos-ar-dev-phases/scripts/lib/device.sh',
  'skills/ohos-ar-dev-phases/scripts/lib/environments.py',
  'skills/ohos-ar-dev-phases/scripts/lib/gatelib.py',
  'skills/ohos-ar-dev-phases/scripts/schemas/bundle_definition.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/completion_receipt.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/handoff_packet.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/index.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/phase_memory_card.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/repair_packet.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/stage_packet.schema.json',
  'skills/ohos-ar-dev-phases/scripts/schemas/substate.schema.json',
]);

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function bundleDigest(files) {
  return hash(files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`).join('\n'));
}

function safeRelative(value) {
  if (typeof value !== 'string' || value === '' || value.includes('\\') || value.includes('\0') || posix.isAbsolute(value)) return null;
  const normalized = posix.normalize(value);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  return normalized;
}

function inside(root, candidate) {
  const relative = candidate.slice(root.length);
  return candidate === root || (candidate.startsWith(`${root}${sep}`) && relative !== '');
}

export class WorkflowPackageCatalog {
  constructor({ root = REPOSITORY_ROOT, workflows = null } = {}) {
    this.root = resolve(root);
    this.workflows = workflows ?? [{
      id: 'ar-delivery',
      name: 'AR workflow',
      description: 'OpenHarmony / HarmonyOS P0–P8 研发交付工作流',
      source_locations: [
        'workspace-gateway/bin/dsh-ar-delivery.js',
        'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py',
        'skills/ohos-ar-dev-phases/scripts/',
      ],
      install_path: '.dsh/workflows/ar-delivery/current',
      files: [...AR_WORKFLOW_FILES],
    }];
    this.cache = new Map();
  }

  async list(installed = []) {
    const installedIds = new Set((Array.isArray(installed) ? installed : [])
      .filter((item) => item?.status === 'installed' && typeof item.id === 'string')
      .map((item) => item.id));
    return Promise.all(this.workflows.map(async (workflow) => {
      const bundle = await this.bundle(workflow.id);
      return {
        id: bundle.id,
        name: bundle.name,
        description: bundle.description,
        source_locations: Array.isArray(bundle.source_locations) ? [...bundle.source_locations] : [],
        install_path: bundle.install_path,
        file_count: bundle.files.length,
        bytes: bundle.bytes,
        sha256: bundle.sha256,
        installed: installedIds.has(bundle.id),
      };
    }));
  }

  async bundle(workflowId) {
    if (this.cache.has(workflowId)) return structuredClone(await this.cache.get(workflowId));
    const loading = this.#load(workflowId);
    this.cache.set(workflowId, loading);
    try { return structuredClone(await loading); }
    catch (error) { this.cache.delete(workflowId); throw error; }
  }

  async #load(workflowId) {
    const workflow = this.workflows.find((item) => item?.id === workflowId);
    if (!workflow) throw Object.assign(new Error(`workflow ${workflowId} is unavailable`), { code: 'workflow_not_found' });
    if (!/^[a-z][a-z0-9._-]{0,63}$/u.test(workflow.id)
        || !Array.isArray(workflow.files) || workflow.files.length === 0 || workflow.files.length > MAX_FILES) {
      throw Object.assign(new Error('workflow package definition is invalid'), { code: 'workflow_package_invalid' });
    }
    const rootReal = await realpath(this.root);
    const files = [];
    let bytes = 0;
    for (const configured of workflow.files) {
      const path = safeRelative(configured);
      if (!path) throw Object.assign(new Error(`workflow file path is invalid: ${configured}`), { code: 'workflow_package_invalid' });
      const absolute = resolve(this.root, path);
      const actual = await realpath(absolute);
      const info = await lstat(actual);
      if (!inside(rootReal, actual) || !info.isFile() || info.isSymbolicLink()) {
        throw Object.assign(new Error(`workflow file is outside the package root: ${path}`), { code: 'workflow_package_invalid' });
      }
      const content = await readFile(actual, 'utf8');
      if (content.includes('\0')) throw Object.assign(new Error(`workflow file is not text: ${path}`), { code: 'workflow_package_invalid' });
      const size = Buffer.byteLength(content, 'utf8');
      bytes += size;
      if (bytes > MAX_BYTES) throw Object.assign(new Error('workflow package exceeds the size limit'), { code: 'workflow_package_too_large' });
      files.push({ path, content, bytes: size, sha256: hash(content) });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    return {
      schema_version: 1,
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      source_locations: Array.isArray(workflow.source_locations) ? [...workflow.source_locations] : [],
      install_path: workflow.install_path,
      files,
      bytes,
      sha256: bundleDigest(files),
    };
  }
}

export function createDefaultWorkflowPackageCatalog(options = {}) {
  return new WorkflowPackageCatalog(options);
}
