import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RESOURCES_ROOT = resolve(SCRIPT_DIR, '../release/win-unpacked/resources');

function requireFile(path) {
  if (!existsSync(path)) {
    throw Object.assign(new Error(`required Windows package file is missing: ${path}`), {
      code: 'windows_package_resource_missing', details: { path },
    });
  }
}

function runChecked(spawnSyncImpl, command, args, cwd) {
  const result = spawnSyncImpl(command, args, {
    cwd, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000,
  });
  if (result?.error || result?.status !== 0) {
    throw Object.assign(new Error(`Windows package smoke command failed: ${command} ${args.join(' ')}`), {
      code: 'windows_package_smoke_failed',
      details: { status: result?.status ?? null, error: result?.error?.message ?? null,
        stderr: String(result?.stderr ?? '').slice(-2048) },
    });
  }
  return String(result.stdout ?? '').trim();
}

export async function verifyWindowsPackage({ resourcesRoot = DEFAULT_RESOURCES_ROOT, spawnSyncImpl = spawnSync } = {}) {
  const root = resolve(resourcesRoot);
  const nodeExe = join(root, 'node-runtime', 'node.exe');
  const asarUnpacked = join(root, 'app.asar.unpacked');
  const sdkPath = join(asarUnpacked, 'node_modules', '@deepseek-ai', 'dsh-sdk-client', 'lib', 'index.js');
  const dshBin = join(asarUnpacked, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
  const conptyPrebuild = join(asarUnpacked, 'node_modules', 'node-pty', 'prebuilds', 'win32-x64', 'conpty.node');
  const launcher = join(asarUnpacked, 'apps/dsh-runtime/launcher.js');
  const provider = join(root, 'dsh-runtime', 'bundles', '@ai-ar', 'dsh-local-codeagent-provider', 'src', 'codeagent-provider.js');
  for (const path of [nodeExe, sdkPath, dshBin, launcher, provider, conptyPrebuild]) requireFile(path);

  const nodeVersion = runChecked(spawnSyncImpl, nodeExe, ['--version'], root);
  if (nodeVersion !== 'v24.15.0') {
    throw Object.assign(new Error(`packaged Node runtime version mismatch: ${nodeVersion}`), {
      code: 'windows_package_node_version_mismatch', details: { expected: 'v24.15.0', actual: nodeVersion },
    });
  }
  const importCheck = `const sdk = await import(${JSON.stringify(pathToFileURL(sdkPath).href)}); if (typeof sdk.HarnessClient !== 'function') throw new Error('HarnessClient export is missing'); console.log('DSH SDK import ok');`;
  runChecked(spawnSyncImpl, nodeExe, ['--input-type=module', '-e', importCheck], asarUnpacked);
  const conptyCheck = `const addon = require(${JSON.stringify(conptyPrebuild)}); if (typeof addon.startProcess !== 'function') throw new Error('node-pty ConPTY prebuild is incompatible'); console.log('node-pty ConPTY prebuild ok');`;
  runChecked(spawnSyncImpl, nodeExe, ['-e', conptyCheck], asarUnpacked);
  runChecked(spawnSyncImpl, nodeExe, [dshBin, '--help'], root);
  return { status: 'passed', node_version: nodeVersion, dsh_bin: dshBin,
    sdk_entry: sdkPath, launcher_entry: launcher, provider_entry: provider, conpty_prebuild: conptyPrebuild };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = await verifyWindowsPackage();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
