import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPOSITORY_ROOT = resolve(SCRIPT_DIR, '../..');
const COPY_PATHS = Object.freeze([
  'platform/apps/local-console',
  'platform/packages',
  'workspace-gateway/src',
  'workspace-gateway/bin/dsh-device-probe.js',
  'workspace-gateway/bin/dsh-ar-delivery.js',
  'workspace-gateway/bin/dsh-ar-gate.js',
  'runtime/dsh-ohos',
  'skills',
  'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
]);
const REQUIRED_BUNDLE_FILES = Object.freeze([
  'platform/apps/local-console/src/server.js',
  'platform/packages/contracts/src/environment-profile.js',
  'platform/packages/workflow-registry/src/manifest.js',
  'workspace-gateway/src/authority/envelope.js',
  'workspace-gateway/src/supervisor/process-supervisor.js',
  'workspace-gateway/bin/dsh-device-probe.js',
  'workspace-gateway/bin/dsh-ar-delivery.js',
  'workspace-gateway/bin/dsh-ar-gate.js',
  'runtime/dsh-ohos/src/runtime.js',
  'runtime/dsh-ohos/policies/modules.json',
  'skills/ohos-ar-dev-phases/scripts/advance.py',
  'skills/ohos-ar-dev-phases/scripts/lib/gatelib.py',
  'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
]);
const DSH_PROVIDER_SOURCE = 'dsh-client-platform/apps/dsh-runtime';
const DSH_PROVIDER_DEST = 'bundles/@ai-ar/dsh-local-codeagent-provider';
const DSH_PROVIDER_FILES = Object.freeze(['package.json', 'cordis.patch.yml', 'README.md', 'src']);
const NODE_EXECUTABLE_SOURCE = 'dsh-client-platform/node_modules/node/bin/node.exe';

function isExcluded(relativePath) {
  return relativePath.split(/[\\/]/u).some((part) => ['test', 'tests', 'test-support', '__pycache__', '.pytest_cache', '.dsh-ohos', 'node_modules', '.git'].includes(part))
    || relativePath.endsWith('.pyc') || relativePath.endsWith('.pyo') || relativePath.endsWith('.log');
}

async function collectFiles(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (isExcluded(path)) continue;
    if (entry.isDirectory()) files.push(...await collectFiles(root, path));
    else if (entry.isFile()) files.push(path.split(sep).join('/'));
  }
  return files;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function createRuntimeManifest(runtimeRoot, filePaths) {
  const root = resolve(runtimeRoot);
  const files = {};
  for (const path of [...new Set(filePaths)].sort()) {
    const candidate = resolve(root, path);
    const remainder = relative(root, candidate);
    if (!path || remainder === '..' || remainder.startsWith(`..${sep}`) || remainder.startsWith(sep)) {
      throw Object.assign(new Error(`runtime manifest path escapes bundle root: ${path}`), {
        code: 'runtime_bundle_path_invalid', details: { path },
      });
    }
    files[path.split(sep).join('/')] = sha256(await readFile(candidate));
  }
  return { format_version: 1, files };
}

function assertSafeOutputRoot(sourceRoot, targetRoot, protectedPaths = []) {
  const sourceUnderTarget = relative(targetRoot, sourceRoot);
  const targetContainsSource = sourceUnderTarget === ''
    || (!sourceUnderTarget.startsWith(`..${sep}`) && sourceUnderTarget !== '..' && !sourceUnderTarget.startsWith(sep));
  const targetOverwritesProtected = protectedPaths.some((path) => {
    const protectedRoot = resolve(sourceRoot, path);
    const targetUnderProtected = relative(protectedRoot, targetRoot);
    const protectedUnderTarget = relative(targetRoot, protectedRoot);
    return targetUnderProtected === '' || (!targetUnderProtected.startsWith(`..${sep}`)
      && targetUnderProtected !== '..' && !targetUnderProtected.startsWith(sep))
      || protectedUnderTarget === '' || (!protectedUnderTarget.startsWith(`..${sep}`)
        && protectedUnderTarget !== '..' && !protectedUnderTarget.startsWith(sep));
  });
  if (targetContainsSource || targetOverwritesProtected) {
    throw Object.assign(new Error('runtime bundle output must not overwrite source files or their parent directories'), {
      code: 'runtime_bundle_output_unsafe',
    });
  }
}

export function isRuntimeBundleReady(runtimeRoot) {
  const root = resolve(runtimeRoot);
  if (!REQUIRED_BUNDLE_FILES.every((path) => existsSync(join(root, path)))) return false;
  try {
    const { modules } = JSON.parse(readFileSync(join(root, 'runtime/dsh-ohos/policies/modules.json'), 'utf8'));
    return Array.isArray(modules) && modules.length > 0 && modules.every(({ id }) =>
      typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/u.test(id)
      && existsSync(join(root, 'skills', id, 'SKILL.md')));
  } catch {
    return false;
  }
}


export function isDshRuntimeBundleReady(runtimeRoot) {
  const providerRoot = join(resolve(runtimeRoot), DSH_PROVIDER_DEST);
  return ['package.json', 'cordis.patch.yml', 'src/codeagent-provider.js']
    .every((path) => existsSync(join(providerRoot, path)));
}

export function resolveRuntimeRoot({
  isPackaged = false,
  resourcesPath = process.resourcesPath,
  developmentRoot = DEFAULT_REPOSITORY_ROOT,
} = {}) {
  const runtimeRoot = isPackaged ? resolve(resourcesPath, 'runtime') : resolve(developmentRoot);
  if (!existsSync(join(runtimeRoot, 'platform/apps/local-console/src/server.js'))) {
    throw Object.assign(new Error(`DSH local workflow runtime is missing: ${runtimeRoot}`), {
      code: 'runtime_bundle_incomplete',
      details: { runtime_root: runtimeRoot, packaged: isPackaged },
    });
  }
  return runtimeRoot;
}

export async function stageRuntimeBundle({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  outputRoot = join(SCRIPT_DIR, '../runtime-bundle'),
} = {}) {
  const sourceRoot = resolve(repositoryRoot);
  const targetRoot = resolve(outputRoot);
  assertSafeOutputRoot(sourceRoot, targetRoot, COPY_PATHS);
  for (const relativePath of COPY_PATHS) {
    const sourcePath = join(sourceRoot, relativePath);
    if (!existsSync(sourcePath)) {
      throw Object.assign(new Error(`required runtime source is missing: ${relativePath}`), {
        code: 'runtime_bundle_source_missing',
        details: { path: relativePath },
      });
    }
  }
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });
  for (const relativePath of COPY_PATHS) {
    const sourcePath = join(sourceRoot, relativePath);
    const targetPath = join(targetRoot, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    if ((await stat(sourcePath)).isDirectory()) {
      await cp(sourcePath, targetPath, {
        recursive: true,
        filter: (candidate) => !isExcluded(relative(sourcePath, candidate)),
      });
    } else {
      await cp(sourcePath, targetPath);
    }
  }
  const missing = REQUIRED_BUNDLE_FILES.filter((path) => !existsSync(join(targetRoot, path)));
  if (missing.length) {
    throw Object.assign(new Error(`staged runtime is incomplete: ${missing.join(', ')}`), {
      code: 'runtime_bundle_incomplete', details: { missing },
    });
  }
  const files = await collectFiles(targetRoot);
  const manifest = await createRuntimeManifest(targetRoot, files);
  await writeFile(join(targetRoot, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { runtime_root: targetRoot, file_count: files.length, ready: true };
}

export async function stageDshRuntimeBundle({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  outputRoot = join(SCRIPT_DIR, '../dsh-runtime-bundle'),
} = {}) {
  const sourceRoot = resolve(repositoryRoot);
  const packageRoot = join(sourceRoot, DSH_PROVIDER_SOURCE);
  const targetRoot = resolve(outputRoot);
  assertSafeOutputRoot(sourceRoot, targetRoot, [DSH_PROVIDER_SOURCE]);
  for (const relativePath of DSH_PROVIDER_FILES) {
    if (!existsSync(join(packageRoot, relativePath))) {
      throw Object.assign(new Error(`required DSH provider source is missing: ${relativePath}`), {
        code: 'runtime_bundle_source_missing', details: { path: join(DSH_PROVIDER_SOURCE, relativePath) },
      });
    }
  }
  const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  if (metadata.name !== '@ai-ar/dsh-local-codeagent-provider'
      || typeof metadata.main !== 'string' || metadata.main.trim() === '') {
    throw Object.assign(new Error('DSH provider package metadata is invalid'), {
      code: 'runtime_bundle_source_invalid', details: { name: metadata.name },
    });
  }
  await rm(targetRoot, { recursive: true, force: true });
  const targetPackage = join(targetRoot, DSH_PROVIDER_DEST);
  await mkdir(targetPackage, { recursive: true });
  for (const relativePath of DSH_PROVIDER_FILES) {
    const from = join(packageRoot, relativePath);
    const to = join(targetPackage, relativePath);
    await mkdir(dirname(to), { recursive: true });
    if ((await stat(from)).isDirectory()) {
      await cp(from, to, {
        recursive: true,
        filter: (candidate) => !isExcluded(relative(from, candidate)),
      });
    } else {
      await cp(from, to);
    }
  }
  if (!isDshRuntimeBundleReady(targetRoot)) {
    throw Object.assign(new Error('staged DSH provider bundle is incomplete'), {
      code: 'runtime_bundle_incomplete', details: { runtime_root: targetRoot },
    });
  }
  const files = await collectFiles(targetRoot);
  const manifest = await createRuntimeManifest(targetRoot, files);
  await writeFile(join(targetRoot, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { runtime_root: targetRoot, provider_root: targetPackage, file_count: files.length, ready: true };
}

export function isNodeRuntimeBundleReady(runtimeRoot) {
  return existsSync(join(resolve(runtimeRoot), 'node.exe'));
}

export async function stageNodeRuntimeBundle({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  outputRoot = join(SCRIPT_DIR, '../node-runtime-bundle'),
  platform = process.platform,
  nodeExecutablePath = null,
} = {}) {
  const sourceRoot = resolve(repositoryRoot);
  const targetRoot = resolve(outputRoot);
  assertSafeOutputRoot(sourceRoot, targetRoot, [NODE_EXECUTABLE_SOURCE]);
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });
  if (platform !== 'win32') {
    return { runtime_root: targetRoot, ready: false, reason: 'windows_node_runtime_not_staged', platform };
  }
  const source = resolve(nodeExecutablePath ?? join(sourceRoot, NODE_EXECUTABLE_SOURCE));
  if (!existsSync(source)) {
    throw Object.assign(new Error(`pinned Windows Node executable is missing: ${source}`), {
      code: 'runtime_bundle_source_missing', details: { path: source },
    });
  }
  await cp(source, join(targetRoot, 'node.exe'));
  const manifest = await createRuntimeManifest(targetRoot, ['node.exe']);
  await writeFile(join(targetRoot, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { runtime_root: targetRoot, ready: isNodeRuntimeBundleReady(targetRoot), file_count: 1 };
}

export async function stageDesktopRuntimeBundles(options = {}) {
  const repositoryRoot = options.repositoryRoot ?? DEFAULT_REPOSITORY_ROOT;
  const runtimeRoot = options.runtimeOutputRoot ?? join(SCRIPT_DIR, '../runtime-bundle');
  const dshRuntimeRoot = options.dshRuntimeOutputRoot ?? join(SCRIPT_DIR, '../dsh-runtime-bundle');
  const nodeRuntimeRoot = options.nodeRuntimeOutputRoot ?? join(SCRIPT_DIR, '../node-runtime-bundle');
  const runtime = await stageRuntimeBundle({ repositoryRoot, outputRoot: runtimeRoot });
  const dshRuntime = await stageDshRuntimeBundle({ repositoryRoot, outputRoot: dshRuntimeRoot });
  const nodeRuntime = await stageNodeRuntimeBundle({ repositoryRoot, outputRoot: nodeRuntimeRoot });
  return { runtime, dsh_runtime: dshRuntime, node_runtime: nodeRuntime };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const repositoryRoot = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_REPOSITORY_ROOT;
  const outputRoot = process.argv[3] ? resolve(process.argv[3]) : join(SCRIPT_DIR, '../runtime-bundle');
  const dshRuntimeOutputRoot = process.argv[4] ? resolve(process.argv[4]) : join(SCRIPT_DIR, '../dsh-runtime-bundle');
  const nodeRuntimeOutputRoot = process.argv[5] ? resolve(process.argv[5]) : join(SCRIPT_DIR, '../node-runtime-bundle');
  const result = await stageDesktopRuntimeBundles({ repositoryRoot, runtimeOutputRoot: outputRoot, dshRuntimeOutputRoot, nodeRuntimeOutputRoot });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
