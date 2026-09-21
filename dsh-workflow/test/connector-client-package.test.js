import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { posix } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';
import test from 'node:test';
import { buildConnectorClientInstaller, buildConnectorClientPackage } from '../src/dsh/connector-client-package.js';

function zipEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? inflateRawSync(compressed) : compressed;
    entries.set(name, content.toString('utf8'));
    offset = dataStart + compressedSize;
  }
  return entries;
}

function installerScriptFrom(source) {
  const scriptMarker = '::DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN::';
  const packageMarker = '::DSH_CONNECTOR_PAYLOAD_BEGIN::';
  const start = source.indexOf(scriptMarker);
  const end = source.indexOf(packageMarker, start);
  if (start < 0 || end <= start) return '';
  const compressed = source.slice(start + scriptMarker.length, end).replace(/\s/gu, '');
  return gunzipSync(Buffer.from(compressed, 'base64')).toString('utf16le');
}

test('standalone Connector client bundle runs without a full AI-AR-workflow checkout', async () => {
  const bundle = await buildConnectorClientPackage({
    configTemplate: {
      url: 'wss://dsh.example.test/v1/connect',
      token: '${DSH_CONNECTOR_TOKEN}',
      device_id: 'local-device',
      workspace_id: 'local-workspace',
      workspace_access: 'remote_tools',
      remote_root: '/srv/project',
    },
  });
  const entries = zipEntries(bundle.bytes);

  assert.equal(bundle.filename, 'dsh-local-connector-client.zip');
  assert.match(entries.get('dsh-local-client/README.md'), /不需要克隆完整的 AI-AR-workflow 仓库/u);
  assert.match(entries.get('dsh-local-client/Start-DSH-Connector.ps1'), /dsh-local-connector\.js/u);
  assert.match(entries.get('dsh-local-client/dsh-connector.json.template'), /wss:\/\/dsh\.example\.test/u);
  assert.equal(entries.has('dsh-local-client/dsh-connector.json.template'), true);
  const config = JSON.parse(entries.get('dsh-local-client/dsh-connector.json.template'));
  assert.equal(config.token, '${DSH_CONNECTOR_TOKEN}');
  assert.equal(config.ssh.host, '');
  assert.deepEqual(config.remote_tools.allowed_profiles, []);
  assert.equal(config.remote_root, '/srv/project');
  assert.equal(entries.has('dsh-local-client/workspace-gateway/bin/dsh-local-connector.js'), true);
  assert.equal(entries.has('dsh-local-client/platform/apps/local-console/src/connector-agent.js'), true);
  assert.equal([...entries.keys()].some((name) => name.includes('dsh-workflow/src/dsh/client.js')), false);

  // Every relative JavaScript import must resolve inside the downloaded package.
  for (const [name, source] of entries) {
    if (!name.endsWith('.js')) continue;
    for (const match of source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/gu)) {
      const specifier = match[2];
      if (!specifier.startsWith('.')) continue;
      const entryName = posix.normalize(posix.join(posix.dirname(name), specifier));
      assert.equal(entries.has(entryName), true, `${name} imports missing package file ${specifier}`);
    }
  }
});

test('Windows Connector first run asks for one SSH target instead of requiring manual JSON editing', async () => {
  const bundle = await buildConnectorClientPackage({
    configTemplate: {
      url: 'wss://dsh.example.test/v1/connect',
      token: '${DSH_CONNECTOR_TOKEN}',
      device_id: 'local-device',
      workspace_id: 'local-workspace',
      workspace_access: 'remote_tools',
      remote_root: '/srv/project',
    },
  });
  const entries = zipEntries(bundle.bytes);
  const launcher = entries.get('dsh-local-client/Start-DSH-Connector.ps1');

  assert.ok(launcher.startsWith('\uFEFF'), 'Windows PowerShell 5.1 needs a UTF-8 BOM for the Chinese launcher text');
  assert.match(launcher, /Get-Content -LiteralPath \$config -Raw -Encoding UTF8/u);
  assert.match(launcher, /SSH 配置别名或 user@host/u);
  assert.match(launcher, /Get-DshWslDistributions/u, 'first run should discover installed WSL distributions');
  assert.match(launcher, /选择源码连接方式.*WSL.*SSH/su, 'first run should let the user choose WSL or SSH');
  const transportSelection = launcher.slice(
    launcher.indexOf('$workspaceTransport ='),
    launcher.indexOf("if ($workspaceTransport -notin"),
  );
  assert.doesNotMatch(transportSelection, /if\s*\(!\[string\]::IsNullOrWhiteSpace\(\[string\]\$settings\.ssh\.host\)\)/u,
    'an existing SSH target must not silently force SSH when transport has not been chosen');
  assert.match(launcher, /distros\.Count -eq 1/u, 'a single installed WSL distribution should be selected automatically');
  assert.match(launcher, /选择 WSL 发行版/u, 'multiple WSL distributions should be offered as a numbered choice');
  assert.match(launcher, /workspace_transport/u, 'the selected workspace transport should be saved locally');
  assert.match(launcher, /wsl_distribution/u, 'the selected WSL distribution should be saved locally');
  assert.match(launcher, /ChooseTransport/u, 'saved broken SSH config should be able to reopen transport selection');
  assert.match(launcher, /切换.*WSL|WSL.*切换/u, 'SSH failure should offer a path to switch to WSL');
  assert.match(launcher, /-G/u);
  assert.match(launcher, /StrictHostKeyChecking=yes/u, 'the first-run SSH probe should use the same host-key policy as Connector');
  assert.match(launcher, /DSH_REMOTE_ROOT_NOT_DIRECTORY/u, 'the first-run probe should validate the actual remote code root');
  assert.match(launcher, /输入新的 SSH/u, 'an unreachable saved SSH target should offer an in-place recovery path');
  assert.match(launcher, /ConvertTo-Json/u);
  assert.match(launcher, /connector-token\.dpapi/u);
  assert.match(launcher, /ConvertFrom-SecureString/u);
  assert.match(launcher, /ConvertTo-SecureString/u);
  assert.doesNotMatch(launcher, /Start-Process -FilePath notepad\.exe/u);
  assert.doesNotMatch(launcher, /allowed_profiles 后重新启动/u);
  assert.doesNotMatch(launcher, /^\s+-(?:or|and|notmatch)\b/mu, 'Windows PowerShell continuation operators must not begin a new line');
});

test('Connector config template leaves transport unset for the first-run WSL or SSH choice', async () => {
  const bundle = await buildConnectorClientPackage({
    configTemplate: {
      url: 'wss://dsh.example.test/v1/connect',
      token: '${DSH_CONNECTOR_TOKEN}',
      device_id: 'local-device',
      workspace_id: 'local-workspace',
      workspace_access: 'remote_tools',
      remote_root: '/srv/project',
    },
  });
  const entries = zipEntries(bundle.bytes);
  const config = JSON.parse(entries.get('dsh-local-client/dsh-connector.json.template'));

  assert.equal(config.workspace_transport, '');
  assert.equal(config.wsl_distribution, '');
  assert.equal(config.ssh.host, '');
});

test('Windows launcher upgrades older connector configs before assigning new transport fields', async () => {
  const bundle = await buildConnectorClientPackage();
  const launcher = zipEntries(bundle.bytes).get('dsh-local-client/Start-DSH-Connector.ps1');
  const settingsLoad = launcher.indexOf('$settings = Get-Content');
  const transportRead = launcher.indexOf('$workspaceTransport =');
  const compatibilityBlock = launcher.slice(settingsLoad, transportRead);

  assert.ok(settingsLoad >= 0 && transportRead > settingsLoad, 'configuration compatibility must run before transport selection');
  assert.match(compatibilityBlock, /PSObject\.Properties\['ssh'\][\s\S]*?Add-Member[\s\S]*?Name 'ssh'/u,
    'older JSON must receive an SSH object before the launcher reads or updates it');
  assert.match(compatibilityBlock, /PSObject\.Properties\['workspace_transport'\][\s\S]*?Add-Member[\s\S]*?workspace_transport/u,
    'older JSON must receive the workspace_transport property before the launcher assigns it');
  assert.match(compatibilityBlock, /PSObject\.Properties\['wsl_distribution'\][\s\S]*?Add-Member[\s\S]*?wsl_distribution/u,
    'older JSON must receive the WSL distribution property before the launcher assigns it');
  assert.match(compatibilityBlock, /PSObject\.Properties\['wsl_command'\][\s\S]*?Add-Member[\s\S]*?wsl_command/u,
    'older JSON must receive the WSL executable property before the launcher assigns it');
  for (const property of ['host', 'username', 'port', 'ssh_command', 'identity_file', 'known_hosts_file']) {
    assert.match(compatibilityBlock, new RegExp(`PSObject\\.Properties\\['${property}'\\][\\s\\S]*?Add-Member[\\s\\S]*?Name '${property}'`),
      `older JSON must receive the SSH ${property} property before the launcher updates it`);
  }
});

test('Windows installer and launcher resolve executable files when PATHEXT omits EXE', async () => {
  const bundle = await buildConnectorClientPackage();
  const launcher = zipEntries(bundle.bytes).get('dsh-local-client/Start-DSH-Connector.ps1');
  const installer = await buildConnectorClientInstaller();
  const installerSource = installer.bytes.toString('utf8');
  const encodedCommand = installerSource.match(/-EncodedCommand ([A-Za-z0-9+/=]+)/u)?.[1] ?? '';
  const bootstrap = Buffer.from(encodedCommand, 'base64').toString('utf16le');
  const installerScript = installerScriptFrom(installerSource);

  assert.match(launcher, /Get-DshCommand 'node'/u);
  assert.match(launcher, /runtime\\node\.exe/u, 'installed private Node runtime should be preferred by the Connector launcher');
  assert.match(launcher, /Get-DshCommand \$sshCommand/u);
  assert.match(launcher, /Get-Command -Name \(\$name \+ '\.exe'\)/u);
  assert.match(launcher, /Invoke-DshCapturedProcess -FilePath \$nodePath -Arguments @\('--version'\)/u);
  assert.match(launcher, /Invoke-DshCapturedProcess -FilePath \$ssh\.Source -Arguments @\('-G', \$target\)/u);
  assert.match(launcher, /Start-DshProcess -FilePath \$nodePath/u);
  assert.match(installerScript, /Get-Command -Name node\.exe/u);
  assert.match(installerScript, /systemVersionInfo\.RedirectStandardOutput = \$true/u);
  assert.match(installerScript, /nodeVersionInfo\.RedirectStandardOutput = \$true/u);
  assert.match(installerScript, /node-v24\.21\.0-win-x64\.zip/u, 'first install should bootstrap a pinned Node runtime when the system has none');
  assert.match(installerScript, /node-v24\.21\.0-win-arm64\.zip/u, 'first install should support Windows ARM64');
  assert.match(installerScript, /Get-FileHash[\s\S]*?SHA256/u, 'downloaded runtime must be checked before extraction');
  assert.match(installerScript, /158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541/u);
  assert.match(installerScript, /8779b1bde1d39f8d420e3b57aa657b39891af434d3de44a919044cec06785921/u);
  assert.match(installerScript, /runtime\\node\.exe/u);
  assert.doesNotMatch(installerScript, /if \(!\$node\) \{ throw '未检测到 Node\.js/u,
    'a clean machine should not be blocked by a missing global Node install');
});

test('Windows launch wrappers call system PowerShell directly and report startup failures', async () => {
  const bundle = await buildConnectorClientPackage();
  const entries = zipEntries(bundle.bytes);
  const connectorCmd = entries.get('dsh-local-client/Start-DSH-Connector.cmd');
  const installer = await buildConnectorClientInstaller();
  const installerSource = installer.bytes.toString('utf8');
  const installerCmd = installerSource.slice(0, installerSource.indexOf('::DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN::'));

  for (const [name, wrapper] of [['Connector launcher', connectorCmd], ['installer', installerCmd]]) {
    assert.match(wrapper, /%SystemRoot%\\System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/iu, `${name} should use the system PowerShell executable path`);
    assert.match(wrapper, /%ERRORLEVEL%/u, `${name} should capture PowerShell's exit code`);
    assert.match(wrapper, /failed|失败|无法启动/iu, `${name} should explain startup failures before pausing`);
  }
});

test('Windows one-click installer unpacks the Connector into the user profile and launches it', async () => {
  const installer = await buildConnectorClientInstaller({
    configTemplate: {
      url: 'wss://dsh.example.test/v1/connect',
      token: '${DSH_CONNECTOR_TOKEN}',
      device_id: 'local-device',
      workspace_id: 'local-workspace',
      workspace_access: 'remote_tools',
      remote_root: '/srv/project',
    },
  });
  const source = installer.bytes.toString('utf8');
  const marker = '::DSH_CONNECTOR_PAYLOAD_BEGIN::';
  const payload = source.slice(source.lastIndexOf(marker) + marker.length).replace(/\s/gu, '');
  const packageEntries = zipEntries(Buffer.from(payload, 'base64'));
  const packagedLauncher = packageEntries.get('dsh-local-client/Start-DSH-Connector.ps1');
  const packagedTemplate = JSON.parse(packageEntries.get('dsh-local-client/dsh-connector.json.template'));
  const encodedCommand = source.match(/-EncodedCommand ([A-Za-z0-9+/=]+)/u)?.[1];
  const commandLine = source.split(/\r?\n/u).find((line) => line.includes('-EncodedCommand')) ?? '';
  const bootstrap = encodedCommand ? Buffer.from(encodedCommand, 'base64').toString('utf16le') : '';
  const powershell = installerScriptFrom(source);

  assert.equal(installer.filename, 'Install-DSH-Connector.cmd');
  assert.match(powershell, /\$env:LOCALAPPDATA/u);
  assert.match(powershell, /Start-DSH-Connector\.cmd/u);
  assert.match(powershell, /Node\.js 24/u);
  assert.match(powershell, /Invoke-WebRequest/u, 'missing system Node should be fetched by the installer');
  assert.match(powershell, /官方.*Node/u, 'the first-run installer should identify its runtime source');
  assert.match(powershell, /CreateShortcut/u);
  assert.match(powershell, /HKCU:\\Software\\Classes\\dsh-connector/u);
  assert.match(powershell, /URL Protocol/u);
  assert.match(powershell, /Join-Path \$env:SystemRoot 'System32\\cmd\.exe'/u);
  assert.match(powershell, /\$handlerCommand = '"' \+ \$commandShell \+ '" \/d \/s \/c ""'/u);
  assert.match(powershell, /Write-Host .*保持此窗口(打开|运行)/u,
    'the installer should explain that its visible console hosts the running Connector');
  assert.match(powershell, /Start-Process -FilePath \$powerShell[\s\S]*?-NoNewWindow[\s\S]*?-Wait[\s\S]*?-PassThru/u,
    'the installer should run the PowerShell launcher in the same console and wait for its real process exit code');
  assert.match(powershell, /\$connectorExitCode = \$launcherProcess\.ExitCode/u,
    'the installer should report the actual launcher exit code instead of a stale or empty LASTEXITCODE');
  assert.match(powershell, /\$ProgressPreference = 'SilentlyContinue'/u,
    'runtime bootstrap should not flood the installer window with per-chunk download progress');
  assert.match(powershell, /Connector 启动失败.*退出码/u,
    'a Connector process that exits unsuccessfully must make the installer fail visibly');
  assert.doesNotMatch(powershell, /\$connectorExitCode = \$LASTEXITCODE/u,
    'the installer must not base its result on an unrelated PowerShell native-command status');
  assert.match(packagedLauncher, /PSObject\.Properties\['workspace_transport'\][\s\S]*?Add-Member/u,
    'the one-click installer must carry the launcher that can migrate existing client configs');
  assert.match(packagedLauncher, /选择源码连接方式/u);
  assert.equal(packagedTemplate.token, '${DSH_CONNECTOR_TOKEN}', 'the downloaded installer must not embed an administrator token');
  assert.ok(commandLine.length < 8191, 'installer command must fit within cmd.exe command-line limit');
  assert.ok(commandLine.length > 0, 'installer must invoke PowerShell with a bounded bootstrap command');
  assert.match(source, /::DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN::/u,
    'the long installer script should be carried in the downloaded file instead of the cmd.exe command line');
  assert.match(bootstrap, /DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN/u,
    'the bounded bootstrap should load the installer script from its own downloaded file');
  assert.deepEqual(Buffer.from(payload, 'base64').subarray(0, 4), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
});

test('generated Connector PowerShell scripts pass the native parser on Windows', async (t) => {
  if (process.platform !== 'win32') {
    t.skip('Windows PowerShell parser is available only on Windows');
    return;
  }
  const bundle = await buildConnectorClientPackage();
  const launcher = zipEntries(bundle.bytes).get('dsh-local-client/Start-DSH-Connector.ps1');
  const installer = await buildConnectorClientInstaller();
  const source = installer.bytes.toString('utf8');
  const encodedCommand = source.match(/-EncodedCommand ([A-Za-z0-9+/=]+)/u)?.[1] ?? '';
  const bootstrap = Buffer.from(encodedCommand, 'base64').toString('utf16le');
  const installerScript = installerScriptFrom(source);
  const parserCommand = '$source=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1}';

  for (const [name, script] of [['Connector launcher', launcher], ['installer bootstrap', bootstrap], ['installer script', installerScript]]) {
    assert.ok(script, `${name} source should be present`);
    const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', parserCommand], {
      input: script,
      encoding: 'utf8',
    });
    assert.equal(result.error, undefined, `${name}: ${result.error?.message ?? ''}`);
    assert.equal(result.status, 0, `${name}: ${result.stderr || result.stdout}`);
  }
});
