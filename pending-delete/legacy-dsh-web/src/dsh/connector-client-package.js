import { readFile } from 'node:fs/promises';
import { deflateRawSync, gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const PACKAGE_ROOT = 'dsh-local-client/';

// Keep the bootstrap client intentionally small: only the Connector runtime
// and its direct local-console dependencies are included.  In particular, the
// cloud workflow UI, AR gates, sample repositories, and documentation corpus
// are not part of the client download.
const CONNECTOR_RUNTIME_FILES = [
  'workspace-gateway/package.json',
  'workspace-gateway/bin/dsh-local-connector.js',
  'workspace-gateway/bin/dsh-device-probe.js',
  'workspace-gateway/src/authority/envelope.js',
  'workspace-gateway/src/connector/hdc-device-relay.js',
  'workspace-gateway/src/connector/remote-tools-mcp.js',
  'workspace-gateway/src/connector/sshfs-mount.js',
  'workspace-gateway/src/connector/websocket.js',
  'workspace-gateway/src/connector/workspace-connector.js',
  'workspace-gateway/src/supervisor/process-supervisor.js',
  'platform/package.json',
  'platform/apps/local-console/src/agents.js',
  'platform/apps/local-console/src/codeagent-executor.js',
  'platform/apps/local-console/src/command.js',
  'platform/apps/local-console/src/connector-agent.js',
  'platform/apps/local-console/src/connector-operation-journal.js',
];

const WINDOWS_LAUNCHER = String.raw`param([switch]$ChooseTransport)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$connector = Join-Path $root 'workspace-gateway\bin\dsh-local-connector.js'
$template = Join-Path $root 'dsh-connector.json.template'
$config = Join-Path $root 'dsh-connector.json'

function Get-DshCommand([string]$name) {
  $command = Get-Command -Name $name -ErrorAction SilentlyContinue
  if (!$command -and $name -notmatch '\.exe$') {
    $command = Get-Command -Name ($name + '.exe') -ErrorAction SilentlyContinue
  }
  return $command
}

function ConvertTo-DshArgument([string]$argument) {
  if ($argument -match '[\s"]') { return '"' + $argument.Replace('"', '\"') + '"' }
  return $argument
}

function Invoke-DshCapturedProcess([string]$filePath, [string[]]$arguments) {
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $filePath
  $info.Arguments = (@($arguments | ForEach-Object { ConvertTo-DshArgument ([string]$_) }) -join ' ')
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($info)
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  return [pscustomobject]@{ ExitCode = $process.ExitCode; StdOut = $stdoutTask.Result; StdErr = $stderrTask.Result }
}

function Invoke-DshCapturedBytes([string]$filePath, [string[]]$arguments) {
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $filePath
  $info.Arguments = (@($arguments | ForEach-Object { ConvertTo-DshArgument ([string]$_) }) -join ' ')
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($info)
  $stdout = New-Object System.IO.MemoryStream
  $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  $stdoutTask.Wait()
  return [pscustomobject]@{ ExitCode = $process.ExitCode; StdOutBytes = $stdout.ToArray(); StdErr = $stderrTask.Result }
}

function ConvertFrom-DshNativeBytes([byte[]]$bytes) {
  if (!$bytes -or $bytes.Length -eq 0) { return '' }
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    $text = [Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
  } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
    $text = [Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
  } elseif ([Array]::IndexOf($bytes, [byte]0) -ge 0) {
    $text = [Text.Encoding]::Unicode.GetString($bytes)
  } else {
    $text = [Text.Encoding]::UTF8.GetString($bytes)
  }
  return $text.Replace([string][char]0, '').Replace([string][char]0xFEFF, '')
}

function Get-DshWslDistributions([string]$wslPath) {
  $result = Invoke-DshCapturedBytes -FilePath $wslPath -Arguments @('--list', '--quiet')
  if ($result.ExitCode -ne 0) {
    $detail = if ([string]::IsNullOrWhiteSpace($result.StdErr)) { '' } else { ' ' + $result.StdErr.Trim() }
    throw "无法读取 WSL 发行版列表（exit $($result.ExitCode)）。请确认 WSL 已启用并完成初始化。$detail"
  }
  $text = ConvertFrom-DshNativeBytes $result.StdOutBytes
  $names = @($text -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { ![string]::IsNullOrWhiteSpace($_) })
  if ($names.Count -eq 0) { throw '没有检测到已安装的 WSL 发行版。请先安装并启动一个 WSL 发行版，再重试。' }
  return [pscustomobject]@{ Names = $names }
}

function Select-DshWslDistribution([string]$wslPath, [string]$preferred) {
  $discovery = Get-DshWslDistributions $wslPath
  $distros = @($discovery.Names)
  if (![string]::IsNullOrWhiteSpace($preferred) -and $distros -contains $preferred) {
    return [pscustomobject]@{ Name = $preferred; Command = $wslPath }
  }
  if (![string]::IsNullOrWhiteSpace($preferred)) {
    Write-Host "已保存的 WSL 发行版不可用：$preferred。请重新选择。" -ForegroundColor Yellow
  }
  if ($distros.Count -eq 1) {
    Write-Host "自动选择唯一的 WSL 发行版：$($distros[0])" -ForegroundColor Green
    return [pscustomobject]@{ Name = [string]$distros[0]; Command = $wslPath }
  }
  Write-Host '检测到多个 WSL 发行版，请选择代码所在的发行版：'
  for ($index = 0; $index -lt $distros.Count; $index++) {
    Write-Host (('  [{0}] {1}' -f ($index + 1), $distros[$index]))
  }
  while ($true) {
    $choice = (Read-Host '选择 WSL 发行版编号').Trim()
    if ($choice -match '^\d+$') {
      $number = [int]$choice
      if ($number -ge 1 -and $number -le $distros.Count) {
        return [pscustomobject]@{ Name = [string]$distros[$number - 1]; Command = $wslPath }
      }
    }
    Write-Host '编号无效，请从列表中选择。' -ForegroundColor Yellow
  }
}

function Start-DshProcess([string]$filePath, [string[]]$arguments, [string]$workingDirectory) {
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $filePath
  $info.Arguments = (@($arguments | ForEach-Object { ConvertTo-DshArgument ([string]$_) }) -join ' ')
  $info.WorkingDirectory = $workingDirectory
  $info.UseShellExecute = $false
  $process = [System.Diagnostics.Process]::Start($info)
  $process.WaitForExit()
  return $process.ExitCode
}

if (!(Test-Path -LiteralPath $connector)) { throw '客户端包不完整：找不到本机 Connector 程序。' }
if (!(Test-Path -LiteralPath $config)) {
  Copy-Item -LiteralPath $template -Destination $config
}

$privateNode = Join-Path $root 'runtime\node.exe'
$node = if (Test-Path -LiteralPath $privateNode) { $null } else { Get-DshCommand 'node' }
$nodePath = if (Test-Path -LiteralPath $privateNode) { $privateNode } elseif ($node) { $node.Source } else { $null }
if (!$nodePath) { throw '未发现 Node.js 24+。请通过 DSH Connector 安装器启动，或安装 Node.js 24 后重试。' }
$nodeProbe = Invoke-DshCapturedProcess -FilePath $nodePath -Arguments @('--version')
if ($nodeProbe.ExitCode -ne 0) { throw '无法启动 Node.js；请重新安装 Node.js 24 或更高版本后重试。' }
$nodeVersion = $nodeProbe.StdOut.Trim().TrimStart('v')
if ([Version]$nodeVersion -lt [Version]'24.0') { throw "DSH Connector 需要 Node.js 24 或更高版本；当前为 $nodeVersion。" }

$settings = Get-Content -LiteralPath $config -Raw -Encoding UTF8 | ConvertFrom-Json
if (!$settings.PSObject.Properties['ssh']) {
  $settings | Add-Member -MemberType NoteProperty -Name 'ssh' -Value ([pscustomobject]@{})
} elseif ($null -eq $settings.ssh) {
  $settings.ssh = [pscustomobject]@{}
}
if (!$settings.PSObject.Properties['workspace_transport']) {
  $settings | Add-Member -MemberType NoteProperty -Name 'workspace_transport' -Value ''
}
if (!$settings.PSObject.Properties['wsl_distribution']) {
  $settings | Add-Member -MemberType NoteProperty -Name 'wsl_distribution' -Value ''
}
if (!$settings.PSObject.Properties['wsl_command']) {
  $settings | Add-Member -MemberType NoteProperty -Name 'wsl_command' -Value ''
}
if (!$settings.ssh.PSObject.Properties['host']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'host' -Value ''
}
if (!$settings.ssh.PSObject.Properties['username']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'username' -Value ''
}
if (!$settings.ssh.PSObject.Properties['port']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'port' -Value 22
}
if (!$settings.ssh.PSObject.Properties['ssh_command']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'ssh_command' -Value 'ssh'
}
if (!$settings.ssh.PSObject.Properties['identity_file']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'identity_file' -Value ''
}
if (!$settings.ssh.PSObject.Properties['known_hosts_file']) {
  $settings.ssh | Add-Member -MemberType NoteProperty -Name 'known_hosts_file' -Value ''
}
$workspaceTransport = [string]$settings.workspace_transport
if ($ChooseTransport) {
  $workspaceTransport = ''
  $settings.ssh.host = ''
  $settings.ssh.username = ''
}
if ([string]::IsNullOrWhiteSpace($workspaceTransport)) {
  Write-Host ''
  Write-Host '选择源码连接方式：'
  Write-Host '  [1] WSL：自动发现本机 WSL 发行版，直接连接其中的源码目录。'
  Write-Host '  [2] SSH：连接远端 Linux 主机或 SSH 配置别名。'
  $transportChoice = (Read-Host '请选择 1（WSL）或 2（SSH）').Trim()
  if ($transportChoice -eq '1') { $workspaceTransport = 'wsl' }
  elseif ($transportChoice -eq '2') { $workspaceTransport = 'ssh' }
  else { throw '连接方式无效，请重新启动并选择 WSL 或 SSH。' }
}
if ($workspaceTransport -notin @('wsl', 'ssh')) { throw 'workspace_transport 只能是 wsl 或 ssh；请重新下载 Connector 客户端。' }
$remoteRoot = [string]$settings.remote_root
if ([string]::IsNullOrWhiteSpace($remoteRoot) -or !$remoteRoot.StartsWith('/') -or $remoteRoot -match '[\x00-\x1f]') {
  throw 'DSH 未提供有效的源码目录根路径，请让管理员配置绝对路径格式的 remoteRoot。'
}

if ($workspaceTransport -eq 'ssh') {
$sshCommand = [string]$settings.ssh.ssh_command
if ([string]::IsNullOrWhiteSpace($sshCommand)) { $sshCommand = 'ssh' }
$ssh = Get-DshCommand $sshCommand
if (!$ssh -and (Test-Path -LiteralPath $sshCommand)) { $ssh = Get-Item -LiteralPath $sshCommand }
if (!$ssh) { throw '未发现 Windows OpenSSH ssh.exe。请启用 Windows OpenSSH Client 后重试。' }

$target = ''
if ([string]::IsNullOrWhiteSpace([string]$settings.ssh.host)) {
  Write-Host ''
  Write-Host '首次连接只需填写一个 SSH 目标。可以使用 Windows OpenSSH 配置中的 Host 别名，'
  Write-Host '也可以输入 user@host。私钥、代理跳转和 known_hosts 优先沿用 ~/.ssh/config。'
  $target = (Read-Host 'SSH 配置别名或 user@host（例如 wsl-dev 或 builder@10.0.0.8）').Trim()
} else {
  $targetHost = [string]$settings.ssh.host
  $targetUser = [string]$settings.ssh.username
  $target = if ([string]::IsNullOrWhiteSpace($targetUser)) { $targetHost } else { $targetUser + '@' + $targetHost }
}

while ($true) {
  if ([string]::IsNullOrWhiteSpace($target) -or $target.StartsWith('-') -or $target -match '[\s\x00-\x1f]') {
    throw 'SSH 目标无效；请填写 SSH 配置别名或 user@host。'
  }
  $sshProbe = Invoke-DshCapturedProcess -FilePath $ssh.Source -Arguments @('-G', $target)
  if ($sshProbe.ExitCode -ne 0) {
    Write-Host 'Windows OpenSSH 无法解析这个目标：' -ForegroundColor Red
    if (![string]::IsNullOrWhiteSpace($sshProbe.StdErr)) { Write-Host $sshProbe.StdErr.Trim() }
    $target = (Read-Host '请重新输入 SSH 别名或 user@host；直接回车退出').Trim()
    if ([string]::IsNullOrWhiteSpace($target)) { throw 'SSH 目标未通过本机配置检查。' }
    continue
  }
  $resolvedLines = @($sshProbe.StdOut -split '\r?\n')
  $resolved = @{}
  foreach ($line in $resolvedLines) {
    if ($line -match '^(hostname|user|port)\s+(.+)$') { $resolved[$Matches[1]] = $Matches[2].Trim() }
  }
  $hostnameMissing = [string]::IsNullOrWhiteSpace($resolved['hostname'])
  $usernameMissing = [string]::IsNullOrWhiteSpace($resolved['user'])
  $portInvalid = $resolved['port'] -notmatch '^\d+$'
  if ($hostnameMissing -or $usernameMissing -or $portInvalid) {
    Write-Host 'Windows OpenSSH 未能解析 SSH 主机、用户或端口。' -ForegroundColor Red
    $target = (Read-Host '请重新输入 SSH 别名或 user@host；直接回车退出').Trim()
    if ([string]::IsNullOrWhiteSpace($target)) { throw 'SSH 目标未通过本机配置检查。' }
    continue
  }
  $sshHost = $target
  $sshUsername = $resolved['user']
  if ($target -match '^([^@\s]+)@(.+)$') {
    $sshUsername = $Matches[1]
    $sshHost = $Matches[2]
  }

  $quotedRoot = "'" + $remoteRoot.Replace("'", "'\''") + "'"
  $remoteCommand = "if [ ! -d $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_DIRECTORY; exit 94; fi; if [ ! -r $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_READABLE; exit 96; fi; if [ ! -w $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_WRITABLE; exit 97; fi"
  $destination = $sshUsername + '@' + $sshHost
  $remoteProbe = Invoke-DshCapturedProcess -FilePath $ssh.Source -Arguments @(
    '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-p', [string]$resolved['port'],
    '--', $destination, $remoteCommand
  )
  if ($remoteProbe.ExitCode -eq 0) { break }
  if ($remoteProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_DIRECTORY') {
    throw "SSH 可连接，但云端配置的 remote_root 不存在或不是目录：$remoteRoot"
  }
  if ($remoteProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_READABLE') {
    throw "SSH 可连接，但当前用户无法读取 remote_root：$remoteRoot"
  }
  if ($remoteProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_WRITABLE') {
    throw "SSH 可连接，但当前用户无法写入 remote_root：$remoteRoot"
  }
  Write-Host 'SSH 连接检查失败；Connector 不会保存错误的目标或要求输入 token。' -ForegroundColor Red
  if (![string]::IsNullOrWhiteSpace($remoteProbe.StdErr)) { Write-Host $remoteProbe.StdErr.Trim() }
  if ($remoteProbe.StdErr -match 'Could not resolve hostname|Name or service not known|No such host') {
    Write-Host 'Host 别名未解析：请检查 Windows 用户的 %USERPROFILE%\.ssh\config，或输入 user@host / user@IP。' -ForegroundColor Yellow
  } elseif ($remoteProbe.StdErr -match 'Permission denied|publickey|authentication failed') {
    Write-Host '请检查 SSH 用户、IdentityFile 与 ssh-agent；Connector 不会弹出 SSH 密码输入框。' -ForegroundColor Yellow
  } elseif ($remoteProbe.StdErr -match 'Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED') {
    Write-Host '请先在 PowerShell 执行 ssh <目标> 核对主机密钥并更新 known_hosts，再重试。' -ForegroundColor Yellow
  } else {
    Write-Host '请检查 SSH 网络、端口、ProxyJump、known_hosts 和远端 shell。' -ForegroundColor Yellow
  }
  $recoveryChoice = (Read-Host '输入 1 切换并重新选择 WSL/SSH，输入 2 重试 SSH；直接回车退出').Trim()
  if ($recoveryChoice -eq '1') {
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $exitCode = Start-DshProcess -FilePath $powerShell -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-ChooseTransport') -WorkingDirectory $root
    exit $exitCode
  }
  if ($recoveryChoice -ne '2') { throw 'SSH 连接失败；未修改已保存配置。重新启动客户端后可再次选择连接方式。' }
  $target = (Read-Host '输入新的 SSH 别名或 user@host').Trim()
  if ([string]::IsNullOrWhiteSpace($target)) { throw 'SSH 目标未填写；未修改已保存配置。' }
}

  $settings.ssh.host = $sshHost
  $settings.ssh.username = $sshUsername
  $settings.ssh.port = [int]$resolved['port']
  $settings.ssh.ssh_command = $ssh.Source
  $settings.workspace_transport = 'ssh'
  $settings.wsl_distribution = ''
  if ($settings.workspace_access -eq 'remote_tools' -and @($settings.remote_tools.allowed_profiles).Count -eq 0) {
    Write-Host '提示：当前云端未下发远端命令白名单；Agent 仍可连接，构建和测试由云端 workflow gate 执行。' -ForegroundColor Yellow
  }
  $json = $settings | ConvertTo-Json -Depth 50
  [IO.File]::WriteAllText($config, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
  Write-Host 'SSH 目标与远端代码目录检查通过，配置已保存在本机。' -ForegroundColor Green

if ([string]::IsNullOrWhiteSpace([string]$settings.ssh.username)) {
  $ssh = Get-DshCommand ([string]$settings.ssh.ssh_command)
  if ($ssh) {
    $sshProbe = Invoke-DshCapturedProcess -FilePath $ssh.Source -Arguments @('-G', [string]$settings.ssh.host)
    $resolvedLines = @($sshProbe.StdOut -split '\r?\n')
    foreach ($line in $resolvedLines) {
      if ($line -match '^user\s+(.+)$') { $settings.ssh.username = $Matches[1].Trim(); break }
    }
  }
  if ([string]::IsNullOrWhiteSpace([string]$settings.ssh.username)) { $settings.ssh.username = $null }
  $json = $settings | ConvertTo-Json -Depth 50
  [IO.File]::WriteAllText($config, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}
}
else {
  if ($settings.workspace_access -ne 'remote_tools') {
    throw 'WSL 直连要求 workspace_access=remote_tools；请让管理员更新 WSL Connector profile。'
  }
  Write-Host "WSL 中必须存在云端配置的源码目录：$remoteRoot" -ForegroundColor Cyan
  $wsl = Get-DshCommand 'wsl'
  if (!$wsl) { throw '未检测到 wsl.exe。请先启用 Windows Subsystem for Linux 后重试。' }
  $selection = Select-DshWslDistribution -wslPath $wsl.Source -preferred ([string]$settings.wsl_distribution)
  $quotedRoot = "'" + $remoteRoot.Replace("'", "'\''") + "'"
  $remoteCommand = "if [ ! -d $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_DIRECTORY; exit 94; fi; if [ ! -r $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_READABLE; exit 96; fi; if [ ! -w $quotedRoot ]; then echo DSH_REMOTE_ROOT_NOT_WRITABLE; exit 97; fi"
  $wslProbe = Invoke-DshCapturedProcess -FilePath $selection.Command -Arguments @(
    '--distribution', $selection.Name, '--exec', 'bash', '-lc', $remoteCommand
  )
  if ($wslProbe.ExitCode -ne 0) {
    if ($wslProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_DIRECTORY') {
      throw "WSL 发行版 $($selection.Name) 中不存在配置的源码目录：$remoteRoot"
    }
    if ($wslProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_READABLE') {
      throw "当前 WSL 用户无法读取源码目录：$remoteRoot"
    }
    if ($wslProbe.StdOut -match 'DSH_REMOTE_ROOT_NOT_WRITABLE') {
      throw "当前 WSL 用户无法写入源码目录：$remoteRoot"
    }
    $detail = if ([string]::IsNullOrWhiteSpace($wslProbe.StdErr)) { '' } else { ' ' + $wslProbe.StdErr.Trim() }
    throw "无法通过 WSL 发行版 $($selection.Name) 检查源码目录（exit $($wslProbe.ExitCode)）。$detail"
  }
  $settings.workspace_transport = 'wsl'
  $settings.wsl_distribution = $selection.Name
  $settings.wsl_command = $selection.Command
  $settings.ssh.host = ''
  $settings.ssh.username = ''
  $json = $settings | ConvertTo-Json -Depth 50
  [IO.File]::WriteAllText($config, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
  Write-Host "WSL 发行版 $($selection.Name) 与源码目录检查通过，配置已保存在本机。" -ForegroundColor Green
}

$oldToken = $env:DSH_CONNECTOR_TOKEN
$tokenFile = Join-Path $root 'connector-token.dpapi'
$tokenPointer = [IntPtr]::Zero
$secureToken = $null
try {
  if ([string]::IsNullOrWhiteSpace($env:DSH_CONNECTOR_TOKEN)) {
    if (Test-Path -LiteralPath $tokenFile) {
      try {
        $protectedToken = [IO.File]::ReadAllText($tokenFile).Trim()
        $secureToken = ConvertTo-SecureString $protectedToken
      } catch {
        throw '本机保存的 Connector 凭据无法解密；删除 connector-token.dpapi 后重新启动并输入管理员 token。'
      }
    } else {
      $secureToken = Read-Host '输入部署管理员提供的 Connector token（仅首次需要）' -AsSecureString
      if (!$secureToken -or $secureToken.Length -lt 16) { throw 'Connector token 无效；请检查管理员发放的 token。' }
      $protectedToken = ConvertFrom-SecureString $secureToken
      [IO.File]::WriteAllText($tokenFile, $protectedToken + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
    }
    if (!$secureToken -or $secureToken.Length -lt 16) { throw '本机 Connector token 无效；删除 connector-token.dpapi 后重新输入。' }
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $env:DSH_CONNECTOR_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  }
  $connectorExitCode = Start-DshProcess -FilePath $nodePath -Arguments @($connector, '--config', $config) -WorkingDirectory $root
  exit $connectorExitCode
}
finally {
  if ($tokenPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer) }
  $secureToken = $null
  if ($null -eq $oldToken) { Remove-Item Env:DSH_CONNECTOR_TOKEN -ErrorAction SilentlyContinue }
  else { $env:DSH_CONNECTOR_TOKEN = $oldToken }
}`;

const POSIX_LAUNCHER = String.raw`#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "$0")" && pwd)"
connector="$root/workspace-gateway/bin/dsh-local-connector.js"
template="$root/dsh-connector.json.template"
config="$root/dsh-connector.json"

if [[ ! -f "$connector" ]]; then echo '客户端包不完整：找不到本机 Connector 程序。' >&2; exit 1; fi
if [[ ! -f "$config" ]]; then
  cp -- "$template" "$config"
  echo '已生成 dsh-connector.json。请填写 SSH 主机、用户、密钥路径和 allowed_profiles 后重新启动。'
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then echo '未发现 Node.js 24 或更高版本。' >&2; exit 1; fi
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( node_major < 24 )); then echo "需要 Node.js 24 或更高版本；当前为 $(node --version)。" >&2; exit 1; fi
token="$(printenv DSH_CONNECTOR_TOKEN 2>/dev/null || true)"
if [[ -z "$token" ]]; then
  read -r -s -p '输入部署管理员提供的 Connector token: ' token
  echo
  export DSH_CONNECTOR_TOKEN="$token"
fi
exec node "$connector" --config "$config"`;

const README = `# DSH 本机 Connector 客户端

这是一个便携式本机客户端包，不需要克隆完整的 AI-AR-workflow 仓库。它只包含本机 Connector 运行所需的代码；AR Workflow 仍在 DSH 网页选择后，经 Connector 下载到所选源码目录。若已有 SSH 配置失效，启动器可重新进入 WSL/SSH 选择，不会覆盖原配置后直接退出。

## Windows

1. 从 DSH 页面下载并运行 **Install-DSH-Connector.cmd**；不需要克隆仓库或手动解压。
2. 首次启动选择 **WSL** 或 **SSH**。WSL 会自动发现发行版，只有一个时直接使用，多个时显示列表供选择；WSL 发行版中必须存在云端配置的源码目录。SSH 输入配置别名或 **user@host**，并沿用 Windows OpenSSH 配置。
3. 首次启动时输入部署管理员提供的 Connector token。Windows 使用当前用户 DPAPI 加密保存，后续启动不再重复询问；token 不写入 JSON 配置。
4. 安装器创建开始菜单入口和 dsh-connector://start 启动链接；以后可从网页或开始菜单启动 Connector。

需要 Node.js 24 或更高版本。安装器会在同一个窗口启动 Connector；保持窗口打开即可维持网页连接。WSL 模式需要已安装的 WSL 发行版；SSH 模式还需要 Windows OpenSSH Client。配置与运行日志仅保存在本机；代码改动、编译和 gate 在所选 WSL 发行版或 SSH 代码端执行。

## WSL / Linux

运行 **./start-dsh-connector.sh**。首次启动会复制配置模板，请编辑 **dsh-connector.json** 后再次运行。系统同样要求 Node.js 24 或更高版本。

## 安全边界

- Connector 只连接当前 DSH 地址和登记的 workspace。
- SSH 私钥内容不上传到 DSH；SSH 别名、用户和端口沿用 Windows OpenSSH 的本机配置。WSL 模式使用 wsl.exe 直接在所选发行版执行工作区操作，不要求安装或配置 sshd。
- 仅管理员登记在 allowed_profiles 中的远端操作可被 Agent 调用。
- 本机 Connector token 通过隐藏输入读取，不包含在下载包或 JSON 配置中；Windows 运行后仅以当前用户 DPAPI 加密保存在本机。
`;

const WINDOWS_INSTALLER_COMMAND = String.raw`$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$work = $null
try {
  $raw = [IO.File]::ReadAllText($env:DSH_CONNECTOR_INSTALLER)
  $marker = '::DSH_CONNECTOR_PAYLOAD_BEGIN::'
  $markerIndex = $raw.LastIndexOf($marker)
  if ($markerIndex -lt 0) { throw 'Installer payload is missing.' }
  $payload = $raw.Substring($markerIndex + $marker.Length) -replace '\s', ''
  $work = Join-Path ([IO.Path]::GetTempPath()) ('dsh-connector-install-' + [guid]::NewGuid().ToString('N'))
  $null = New-Item -ItemType Directory -Path $work -Force
  $archive = Join-Path $work 'client.zip'
  [IO.File]::WriteAllBytes($archive, [Convert]::FromBase64String($payload))
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $unpack = Join-Path $work 'unpack'
  $null = New-Item -ItemType Directory -Path $unpack -Force
  [IO.Compression.ZipFile]::ExtractToDirectory($archive, $unpack)
  $source = Join-Path $unpack 'dsh-local-client'
  $install = Join-Path $env:LOCALAPPDATA 'DSH\Connector'
  $null = New-Item -ItemType Directory -Path $install -Force
  Copy-Item -Path (Join-Path $source '*') -Destination $install -Recurse -Force

  $privateNode = Join-Path $install 'runtime\node.exe'
  $nodePath = $null
  if (Test-Path -LiteralPath $privateNode) {
    $privateVersionInfo = New-Object System.Diagnostics.ProcessStartInfo($privateNode, '--version')
    $privateVersionInfo.UseShellExecute = $false
    $privateVersionInfo.RedirectStandardOutput = $true
    $privateVersionProcess = [System.Diagnostics.Process]::Start($privateVersionInfo)
    $privateVersion = $privateVersionProcess.StandardOutput.ReadToEnd().Trim().TrimStart('v')
    $privateVersionProcess.WaitForExit()
    if ($privateVersionProcess.ExitCode -eq 0 -and [Version]$privateVersion -ge [Version]'24.0') { $nodePath = $privateNode }
  }
  if (!$nodePath) {
    $systemNode = Get-Command -Name node -ErrorAction SilentlyContinue
    if (!$systemNode) { $systemNode = Get-Command -Name node.exe -ErrorAction SilentlyContinue }
    if ($systemNode) {
      $systemVersionInfo = New-Object System.Diagnostics.ProcessStartInfo($systemNode.Source, '--version')
      $systemVersionInfo.UseShellExecute = $false
      $systemVersionInfo.RedirectStandardOutput = $true
      $systemVersionProcess = [System.Diagnostics.Process]::Start($systemVersionInfo)
      $systemVersion = $systemVersionProcess.StandardOutput.ReadToEnd().Trim().TrimStart('v')
      $systemVersionProcess.WaitForExit()
      if ($systemVersionProcess.ExitCode -eq 0 -and [Version]$systemVersion -ge [Version]'24.0') { $nodePath = $systemNode.Source }
    }
  }
  if (!$nodePath) {
    $architecture = if (![string]::IsNullOrWhiteSpace($env:PROCESSOR_ARCHITEW6432)) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    switch ($architecture.ToUpperInvariant()) {
      { $_ -in @('AMD64', 'X64') } {
        $nodeArchitecture = 'x64'
        $nodeArchiveName = 'node-v24.21.0-win-x64.zip'
        $nodeArchiveHash = '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541'
      }
      'ARM64' {
        $nodeArchitecture = 'arm64'
        $nodeArchiveName = 'node-v24.21.0-win-arm64.zip'
        $nodeArchiveHash = '8779b1bde1d39f8d420e3b57aa657b39891af434d3de44a919044cec06785921'
      }
      default { throw ('此 Windows 架构暂不支持自动准备 Node.js 24：' + $architecture + '。请安装 Node.js 24 或更高版本后重试。') }
    }
    Write-Host '未发现 Node.js 24+，正在从官方 Node.js 源下载并校验私有运行时。'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $nodeArchive = Join-Path $work $nodeArchiveName
    $nodeUrl = 'https://nodejs.org/dist/v24.21.0/' + $nodeArchiveName
    try {
      Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeArchive -UseBasicParsing -TimeoutSec 180
    } catch {
      throw ('无法下载官方 Node.js 24.21.0 运行时；检查本机到 nodejs.org 的网络，或手动安装 Node.js 24+ 后重试。' + $_.Exception.Message)
    }
    $actualNodeHash = (Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualNodeHash -ne $nodeArchiveHash) { throw '官方 Node.js 运行时 SHA-256 校验失败；为保护本机，已拒绝安装。' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $nodeZip = [IO.Compression.ZipFile]::OpenRead($nodeArchive)
    try {
      $nodeArchiveRoot = ($nodeArchiveName -replace '\.zip$', '') + '/'
      $nodeEntry = $nodeZip.GetEntry($nodeArchiveRoot + 'node.exe')
      $licenseEntry = $nodeZip.GetEntry($nodeArchiveRoot + 'LICENSE')
      if (!$nodeEntry -or !$licenseEntry) { throw '官方 Node.js 压缩包缺少必需文件。' }
      $runtimeDirectory = Split-Path -Parent $privateNode
      $null = New-Item -ItemType Directory -Path $runtimeDirectory -Force
      $nodeStream = $nodeEntry.Open()
      try {
        $nodeFile = [IO.File]::Open($privateNode, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $nodeStream.CopyTo($nodeFile) } finally { $nodeFile.Dispose() }
      } finally { $nodeStream.Dispose() }
      $licenseStream = $licenseEntry.Open()
      try {
        $licenseFile = [IO.File]::Open((Join-Path $runtimeDirectory 'NODE-LICENSE.txt'), [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $licenseStream.CopyTo($licenseFile) } finally { $licenseFile.Dispose() }
      } finally { $licenseStream.Dispose() }
    } finally { $nodeZip.Dispose() }
    $nodePath = $privateNode
  }
  $nodeVersionInfo = New-Object System.Diagnostics.ProcessStartInfo($nodePath, '--version')
  $nodeVersionInfo.UseShellExecute = $false
  $nodeVersionInfo.RedirectStandardOutput = $true
  $nodeVersionProcess = [System.Diagnostics.Process]::Start($nodeVersionInfo)
  $nodeVersion = $nodeVersionProcess.StandardOutput.ReadToEnd().Trim().TrimStart('v')
  $nodeVersionProcess.WaitForExit()
  if ($nodeVersionProcess.ExitCode -ne 0 -or [Version]$nodeVersion -lt [Version]'24.0') { throw 'DSH Connector 需要可用的 Node.js 24 或更高版本。' }

  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  $null = New-Item -ItemType Directory -Path $startMenu -Force
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut((Join-Path $startMenu 'DSH Connector.lnk'))
  $shortcut.TargetPath = Join-Path $install 'Start-DSH-Connector.cmd'
  $shortcut.WorkingDirectory = $install
  $shortcut.Save()

  $config = Join-Path $install 'dsh-connector.json'
  if (!(Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $install 'dsh-connector.json.template') -Destination $config
  }
  $protocolPath = 'HKCU:\Software\Classes\dsh-connector'
  $commandPath = Join-Path $protocolPath 'shell\open\command'
  $null = New-Item -Path $commandPath -Force
  Set-Item -Path $protocolPath -Value 'URL:DSH Local Connector Protocol'
  $null = New-ItemProperty -Path $protocolPath -Name 'URL Protocol' -Value '' -PropertyType String -Force
  $commandShell = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $launcher = Join-Path $install 'Start-DSH-Connector.cmd'
  $handlerCommand = '"' + $commandShell + '" /d /s /c ""' + $launcher + '""'
  Set-Item -Path $commandPath -Value $handlerCommand

  Write-Host 'DSH Connector 已安装到当前 Windows 用户目录。'
  Write-Host ('Node.js 运行时：' + $nodeVersion + '。缺少系统运行时的设备使用 Connector 私有目录中的校验版本。')
  Write-Host '正在启动 Connector。首次运行选择 WSL 或 SSH，并输入管理员提供的 Connector token。'
  Write-Host '请保持此窗口打开；网页会自动检测连接状态。'
  $launcherScript = Join-Path $install 'Start-DSH-Connector.ps1'
  $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $launcherProcess = Start-Process -FilePath $powerShell -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $launcherScript + '"')
  ) -NoNewWindow -Wait -PassThru
  $connectorExitCode = $launcherProcess.ExitCode
  if ($connectorExitCode -ne 0) {
    throw ('Connector 启动失败，退出码：' + $connectorExitCode)
  }
} catch {
  Write-Host ('DSH Connector 安装失败：' + $_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  if ($work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}`;

const WINDOWS_INSTALLER_BOOTSTRAP = String.raw`$ErrorActionPreference='Stop';$raw=[IO.File]::ReadAllText($env:DSH_CONNECTOR_INSTALLER);$scriptMarker='::DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN::';$payloadMarker='::DSH_CONNECTOR_PAYLOAD_BEGIN::';$start=$raw.IndexOf($scriptMarker);$end=$raw.IndexOf($payloadMarker,$start);if($start -lt 0 -or $end -le $start){throw 'Installer script payload is missing.'};$encoded=$raw.Substring($start+$scriptMarker.Length,$end-$start-$scriptMarker.Length) -replace '\s','';$bytes=[Convert]::FromBase64String($encoded);$stream=[IO.MemoryStream]::new($bytes);$gzip=[IO.Compression.GZipStream]::new($stream,[IO.Compression.CompressionMode]::Decompress);$reader=[IO.StreamReader]::new($gzip,[Text.Encoding]::Unicode);Invoke-Expression $reader.ReadToEnd()`;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(value = new Date()) {
  const year = Math.max(1980, value.getFullYear());
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
  };
}

function zipFile(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const { time, date } = dosDateTime();
  for (const [name, rawBytes] of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
    const compressed = deflateRawSync(data, { level: 9 });
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names.
    local.writeUInt16LE(8, 8); // Deflate.
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);
    localOffset += local.length + nameBytes.length + compressed.length;
  }
  const centralBytes = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBytes, eocd]);
}

function connectorConfigTemplate(value = {}) {
  const config = value && typeof value === 'object' && !Array.isArray(value) ? structuredClone(value) : {};
  config.token = '${DSH_CONNECTOR_TOKEN}';
  config.workspace_transport ??= '';
  config.wsl_distribution ??= '';
  config.ssh ??= {
    host: '',
    port: 22,
    username: '',
    ssh_command: 'ssh',
    identity_file: '',
    known_hosts_file: '',
  };
  if (config.workspace_access === 'remote_tools') {
    config.remote_tools ??= { enabled: true, allowed_profiles: [], mcp_config_format: 'auto' };
    config.remote_tools.enabled = true;
    config.remote_tools.allowed_profiles ??= [];
    config.remote_tools.mcp_config_format ??= 'auto';
  }
  return `${JSON.stringify(config, null, 2)}\n`;
}

export async function buildConnectorClientPackage({ configTemplate = {} } = {}) {
  const entries = [];
  for (const relativePath of CONNECTOR_RUNTIME_FILES) {
    const bytes = await readFile(resolve(REPOSITORY_ROOT, relativePath));
    entries.push([`${PACKAGE_ROOT}${relativePath}`, bytes]);
  }
  entries.push([`${PACKAGE_ROOT}package.json`, JSON.stringify({
    name: 'dsh-local-connector-client', version: '0.1.0', private: true, type: 'module',
  }, null, 2) + '\n']);
  entries.push([`${PACKAGE_ROOT}README.md`, README]);
  entries.push([`${PACKAGE_ROOT}Start-DSH-Connector.ps1`, Buffer.from(`\uFEFF${WINDOWS_LAUNCHER}`, 'utf8')]);
  entries.push([`${PACKAGE_ROOT}Start-DSH-Connector.cmd`, [
    '@echo off',
    'setlocal',
    'set "DSH_CONNECTOR_POWERSHELL=%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"',
    'if not exist "%DSH_CONNECTOR_POWERSHELL%" (',
    '  echo DSH Connector startup failed: Windows PowerShell was not found.',
    '  pause',
    '  exit /b 1',
    ')',
    '"%DSH_CONNECTOR_POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-DSH-Connector.ps1"',
    'set "DSH_CONNECTOR_EXIT=%ERRORLEVEL%"',
    'if not "%DSH_CONNECTOR_EXIT%"=="0" (',
    '  echo DSH Connector startup failed. PowerShell exit code: %DSH_CONNECTOR_EXIT%.',
    '  pause',
    ')',
    'endlocal & exit /b %DSH_CONNECTOR_EXIT%',
    '',
  ].join('\r\n')]);
  entries.push([`${PACKAGE_ROOT}start-dsh-connector.sh`, POSIX_LAUNCHER]);
  entries.push([`${PACKAGE_ROOT}dsh-connector.json.template`, connectorConfigTemplate(configTemplate)]);
  const bytes = zipFile(entries);
  return { filename: 'dsh-local-connector-client.zip', bytes, file_count: entries.length };
}

export async function buildConnectorClientInstaller({ configTemplate = {} } = {}) {
  const bundle = await buildConnectorClientPackage({ configTemplate });
  const payload = bundle.bytes.toString('base64').match(/.{1,76}/gu).join('\r\n');
  const compressedScript = gzipSync(Buffer.from(WINDOWS_INSTALLER_COMMAND, 'utf16le')).toString('base64');
  const encodedCommand = Buffer.from(WINDOWS_INSTALLER_BOOTSTRAP, 'utf16le').toString('base64');
  const scriptPayload = compressedScript.match(/.{1,76}/gu).join('\r\n');
  const launcher = [
    '@echo off',
    'setlocal',
    'set "DSH_CONNECTOR_INSTALLER=%~f0"',
    'set "DSH_CONNECTOR_POWERSHELL=%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"',
    'if not exist "%DSH_CONNECTOR_POWERSHELL%" (',
    '  echo DSH Connector installer failed: Windows PowerShell was not found.',
    '  pause',
    '  exit /b 1',
    ')',
    `"%DSH_CONNECTOR_POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedCommand}`,
    'set "DSH_CONNECTOR_INSTALLER_EXIT=%ERRORLEVEL%"',
    'if not "%DSH_CONNECTOR_INSTALLER_EXIT%"=="0" (',
    '  echo DSH Connector installer failed. PowerShell exit code: %DSH_CONNECTOR_INSTALLER_EXIT%.',
    '  pause',
    ')',
    'endlocal & exit /b %DSH_CONNECTOR_INSTALLER_EXIT%',
    '::DSH_CONNECTOR_INSTALL_SCRIPT_BEGIN::',
    scriptPayload,
    '::DSH_CONNECTOR_PAYLOAD_BEGIN::',
    payload,
    '',
  ].join('\r\n');
  return {
    filename: 'Install-DSH-Connector.cmd',
    bytes: Buffer.from(launcher, 'utf8'),
    embedded_package_bytes: bundle.bytes.length,
    file_count: bundle.file_count,
  };
}

export { CONNECTOR_RUNTIME_FILES };
