#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
KB_DIR="$ROOT_DIR/specs/knowledge-base"
OUT_DIR="$KB_DIR/generated/foundation"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$ROOT_DIR"

rg --files foundation -g '*.json' -g '*.cfg' > "$TMP_DIR/runtime-files.txt"

node - "$ROOT_DIR" "$KB_DIR" "$OUT_DIR" "$TMP_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const kbDir = process.argv[3];
const outDir = process.argv[4];
const tmpDir = process.argv[5];

function readLines(filePath)
{
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? content.split(/\r?\n/) : [];
}

function readTsv(filePath)
{
    const lines = readLines(filePath);
    const header = lines.shift().split('\t');
    return lines.map((line) => {
        const fields = line.split('\t');
        return Object.fromEntries(header.map((name, index) => [name, fields[index] || '']));
    });
}

function clean(value)
{
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(',');
    return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}

function md(value)
{
    return clean(value).replace(/\|/g, '\\|');
}

function safeName(value)
{
    return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function humanize(value)
{
    return String(value || '')
        .replace(/^lib/, '')
        .replace(/\.z\.so$|\.so$/g, '')
        .replace(/[_./:-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function excluded(filePath)
{
    return /(^|\/)(test|tests|unittest|fuzztest|systemtest|moduletest|benchmark|example|examples|demo|demos)(\/|$)/i
        .test(filePath);
}

function writeTsv(filePath, header, rows)
{
    const lines = [header.join('\t')];
    for (const row of rows) lines.push(row.map(clean).join('\t'));
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

const components = readTsv(path.join(outDir, 'components.tsv')).map((item) => ({
    ...item,
    bundleDir: path.posix.dirname(item.bundle_path),
    docName: safeName(item.component),
})).sort((a, b) => b.bundleDir.length - a.bundleDir.length);
const modules = readTsv(path.join(outDir, 'modules.tsv'));

function componentFor(filePath)
{
    return components.find((item) => filePath === item.bundleDir || filePath.startsWith(item.bundleDir + '/')) || null;
}

function getProcess(map, name)
{
    if (!map.has(name)) {
        map.set(name, {
            name,
            initServices: [],
            systemAbilities: [],
            executableTargets: [],
            components: new Map(),
        });
    }
    return map.get(name);
}

function addComponent(process, component, role)
{
    if (!component) return;
    const key = `${component.subsystem}:${component.component}`;
    if (!process.components.has(key)) process.components.set(key, { component, roles: new Set() });
    process.components.get(key).roles.add(role);
}

const processes = new Map();
for (const filePath of readLines(path.join(tmpDir, 'runtime-files.txt'))) {
    if (excluded(filePath)) continue;
    let data;
    try {
        data = JSON.parse(fs.readFileSync(path.join(rootDir, filePath), 'utf8'));
    } catch (error) {
        continue;
    }
    const owner = componentFor(filePath);
    if (Array.isArray(data.services)) {
        for (const service of data.services) {
            if (!service || !service.name || typeof service.name !== 'string') continue;
            const process = getProcess(processes, service.name);
            process.initServices.push({
                component: owner,
                filePath,
                executable: Array.isArray(service.path) ? service.path.join(' ') : clean(service.path),
                uid: clean(service.uid),
                gid: clean(service.gid),
                selinux: clean(service.secon),
                startMode: clean(service['start-mode'] || service.start_mode ||
                    (service.ondemand === true ? 'ondemand' : service.ondemand === false ? 'boot' : '')),
                ondemand: service.ondemand === undefined ? '' : String(service.ondemand),
                critical: clean(service.critical),
                permissions: Array.isArray(service.permission) ? service.permission : [],
            });
            addComponent(process, owner, 'init-owner');
        }
    }
    if (data.process && typeof data.process === 'string' && Array.isArray(data.systemability)) {
        const process = getProcess(processes, data.process);
        for (const ability of data.systemability) {
            if (!ability || ability.name === undefined) continue;
            process.systemAbilities.push({
                component: owner,
                filePath,
                saId: clean(ability.name),
                library: clean(ability.libpath),
                runOnCreate: ability['run-on-create'] === undefined ? '' : String(ability['run-on-create']),
                autoRestart: ability['auto-restart'] === undefined ? '' : String(ability['auto-restart']),
                distributed: ability.distributed === undefined ? '' : String(ability.distributed),
                dumpLevel: clean(ability.dump_level ?? ability['dump-level']),
            });
            addComponent(process, owner, 'sa-provider');
        }
    }
}

const executableModules = modules.filter((item) => item.category === 'production' &&
    /executable/.test(item.target_type.toLowerCase()) && !excluded(item.build_file) &&
    !/(^|\/)(tools?|cli)(\/|$)/i.test(item.build_file));
for (const process of processes.values()) {
    const executableNames = new Set(process.initServices.flatMap((item) => {
        const parts = item.executable.split(/\s+/).filter(Boolean);
        return parts.map((value) => path.posix.basename(value));
    }));
    for (const module of executableModules) {
        if (module.target_name === process.name || executableNames.has(module.target_name)) {
            process.executableTargets.push(module);
            const owner = components.find((item) => item.subsystem === module.subsystem &&
                item.component === module.component) || null;
            addComponent(process, owner, 'executable-owner');
        }
    }
}

function hostSubsystem(process)
{
    const initSubsystems = process.initServices.map((item) => item.component?.subsystem).filter(Boolean);
    if (initSubsystems.length > 0) return mostCommon(initSubsystems);
    const executableSubsystems = process.executableTargets.map((item) => item.subsystem).filter(Boolean);
    if (executableSubsystems.length > 0) return mostCommon(executableSubsystems);
    const saSubsystems = process.systemAbilities.map((item) => item.component?.subsystem).filter(Boolean);
    return mostCommon(saSubsystems) || 'unknown';
}

function mostCommon(values)
{
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}

const runtimeRows = [];
for (const process of processes.values()) {
    process.hostSubsystem = hostSubsystem(process);
    for (const item of process.initServices) {
        runtimeRows.push({
            hostSubsystem: process.hostSubsystem,
            process: process.name,
            entityType: 'init-service',
            ownerSubsystem: item.component?.subsystem || '',
            ownerComponent: item.component?.component || '',
            executable: item.executable,
            saId: '',
            library: '',
            startMode: item.startMode,
            ondemand: item.ondemand,
            runOnCreate: '',
            uid: item.uid,
            gid: item.gid,
            selinux: item.selinux,
            evidenceFile: item.filePath,
            mappingMethod: item.component ? 'component-prefix' : 'unmapped',
        });
    }
    for (const item of process.systemAbilities) {
        runtimeRows.push({
            hostSubsystem: process.hostSubsystem,
            process: process.name,
            entityType: 'system-ability',
            ownerSubsystem: item.component?.subsystem || '',
            ownerComponent: item.component?.component || '',
            executable: '',
            saId: item.saId,
            library: item.library,
            startMode: '',
            ondemand: '',
            runOnCreate: item.runOnCreate,
            uid: '',
            gid: '',
            selinux: '',
            evidenceFile: item.filePath,
            mappingMethod: item.component ? 'component-prefix' : 'unmapped',
        });
    }
}

runtimeRows.sort((a, b) => a.hostSubsystem.localeCompare(b.hostSubsystem) ||
    a.process.localeCompare(b.process) || a.entityType.localeCompare(b.entityType) ||
    a.evidenceFile.localeCompare(b.evidenceFile) || a.saId.localeCompare(b.saId));
writeTsv(path.join(outDir, 'runtime-entities.tsv'), [
    'host_subsystem', 'process', 'entity_type', 'owner_subsystem', 'owner_component',
    'executable', 'sa_id', 'library', 'start_mode', 'ondemand', 'run_on_create',
    'uid', 'gid', 'selinux_domain', 'evidence_file', 'mapping_method',
], runtimeRows.map((item) => [
    item.hostSubsystem, item.process, item.entityType, item.ownerSubsystem, item.ownerComponent,
    item.executable, item.saId, item.library, item.startMode, item.ondemand, item.runOnCreate,
    item.uid, item.gid, item.selinux, item.evidenceFile, item.mappingMethod,
]));

const processRows = [...processes.values()].sort((a, b) =>
    a.hostSubsystem.localeCompare(b.hostSubsystem) || a.name.localeCompare(b.name));
writeTsv(path.join(outDir, 'processes.tsv'), [
    'host_subsystem', 'process', 'init_service_count', 'system_ability_count',
    'participating_component_count', 'executable_targets', 'start_modes', 'uids', 'gids',
    'selinux_domains', 'sa_ids', 'libraries', 'evidence_files',
], processRows.map((process) => [
    process.hostSubsystem, process.name, process.initServices.length, process.systemAbilities.length,
    process.components.size,
    [...new Set(process.executableTargets.map((item) => item.gn_label))].join(','),
    [...new Set(process.initServices.map((item) => item.startMode).filter(Boolean))].join(','),
    [...new Set(process.initServices.map((item) => item.uid).filter(Boolean))].join(','),
    [...new Set(process.initServices.map((item) => item.gid).filter(Boolean))].join(','),
    [...new Set(process.initServices.map((item) => item.selinux).filter(Boolean))].join(','),
    [...new Set(process.systemAbilities.map((item) => item.saId))].join(','),
    [...new Set(process.systemAbilities.map((item) => item.library).filter(Boolean))].join(','),
    [...new Set([
        ...process.initServices.map((item) => item.filePath),
        ...process.systemAbilities.map((item) => item.filePath),
    ])].join(','),
]));

const bySubsystem = new Map();
for (const process of processRows) {
    if (!bySubsystem.has(process.hostSubsystem)) bySubsystem.set(process.hostSubsystem, []);
    bySubsystem.get(process.hostSubsystem).push(process);
}

function componentLink(fromSubsystem, component)
{
    return `../../../${safeName(component.subsystem)}/components/${component.docName}/functional-overview.md`;
}

for (const [subsystem, subsystemProcesses] of bySubsystem.entries()) {
    if (subsystem === 'unknown') continue;
    const subsystemDir = path.join(kbDir, 'subsystems', safeName(subsystem));
    fs.mkdirSync(path.join(subsystemDir, 'processes'), { recursive: true });
    const indexLines = [
        `# ${subsystem}：Foundation 运行进程`, '',
        '> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。', '',
        '[返回子系统](README.md) | [功能全景](functional-overview.md)', '',
        '## 进程清单', '',
        '| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |',
        '| --- | ---: | ---: | ---: | --- | --- | --- | --- |',
    ];
    for (const process of subsystemProcesses) {
        const processDirName = safeName(process.name);
        indexLines.push(`| \`${md(process.name)}\` | ${process.initServices.length} | ` +
            `${process.systemAbilities.length} | ${process.components.size} | ` +
            `${md([...new Set(process.initServices.map((item) => item.startMode).filter(Boolean))].join(',') || '-')} | ` +
            `${md([...new Set(process.initServices.map((item) => item.uid).filter(Boolean))].join(',') || '-')} | ` +
            `${md([...new Set(process.initServices.map((item) => item.selinux).filter(Boolean))].join(',') || '-')} | ` +
            `[查看](processes/${processDirName}/foundation-runtime.md) |`);

        const processDir = path.join(subsystemDir, 'processes', processDirName);
        fs.mkdirSync(processDir, { recursive: true });
        const processReadme = path.join(processDir, 'README.md');
        if (!fs.existsSync(processReadme)) {
            fs.writeFileSync(processReadme,
                `# ${process.name} 进程\n\n` +
                `- [Foundation 运行时说明](foundation-runtime.md)\n` +
                `- [返回 ${subsystem} 进程清单](../../foundation-processes.md)\n\n` +
                `后续能力继续放入 \`capabilities/<domain>/features/<feature>/\`。\n`);
        }

        const sourcePrefix = '../../../../../../';
        const lines = [
            `# ${process.name}：Foundation 运行时说明`, '',
            '> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。', '',
            '[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)', '',
            '## 运行定位', '',
            `\`${process.name}\` 归入 \`${process.hostSubsystem}\` 子系统的进程层。` +
            `当前源码识别到 ${process.initServices.length} 条 init 服务配置、` +
            `${process.systemAbilities.length} 个 System Ability 和 ${process.components.size} 个参与部件。`, '',
            '## 运行身份与启动', '',
        ];
        if (process.initServices.length > 0) {
            lines.push('| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |',
                '| --- | --- | --- | --- | --- | --- | --- |');
            for (const item of process.initServices) {
                lines.push(`| \`${md(process.name)}\` | \`${md(item.executable || '-')}\` | ` +
                    `${md(item.startMode || '-')} | ${md(item.uid || '-')} | ${md(item.gid || '-')} | ` +
                    `${md(item.selinux || '-')} | [${md(item.filePath)}](${sourcePrefix}${item.filePath}) |`);
            }
        } else {
            lines.push('没有在当前 Foundation 路径中找到该进程的 init 服务配置；进程归属来自 SA profile。');
        }
        lines.push('', '## 承载的 System Ability', '');
        if (process.systemAbilities.length > 0) {
            lines.push('| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |',
                '| ---: | --- | --- | --- | --- | --- |');
            for (const item of process.systemAbilities.sort((a, b) => a.saId.localeCompare(b.saId))) {
                const owner = item.component;
                lines.push(`| ${md(item.saId)} | \`${md(item.library || '-')}\` | ` +
                    `${md(item.runOnCreate || '-')} | ${md(item.autoRestart || '-')} | ` +
                    `${owner ? `[${owner.subsystem}:${owner.component}](${componentLink(subsystem, owner)})` : '-'} | ` +
                    `[${md(item.filePath)}](${sourcePrefix}${item.filePath}) |`);
            }
        } else {
            lines.push('当前没有识别到由该进程承载的 SA profile；它可能是独立 daemon、渲染进程或辅助服务。');
        }
        lines.push('', '## 功能职责', '');
        const libraries = [...new Set(process.systemAbilities.map((item) => item.library).filter(Boolean))];
        if (libraries.length > 0) {
            for (const library of libraries) {
                lines.push(`- 装载 \`${md(library)}\`，承载 ${md(humanize(library))} 相关系统能力。`);
            }
        }
        for (const { component, roles } of [...process.components.values()].sort((a, b) =>
            a.component.component.localeCompare(b.component.component))) {
            let description = '';
            try {
                const bundle = JSON.parse(fs.readFileSync(path.join(rootDir, component.bundle_path), 'utf8'));
                description = clean(bundle.description || bundle.component?.description);
            } catch (error) {
                description = '';
            }
            lines.push(`- [${component.subsystem}:${component.component}](${componentLink(subsystem, component)})：` +
                `${description || '参与该进程的服务、接口或 SA 实现'}（${[...roles].join(', ')}）。`);
        }
        lines.push('', '## 部件与进程关系', '',
            '| 子系统 | 部件 | 角色 |', '| --- | --- | --- |');
        for (const { component, roles } of [...process.components.values()].sort((a, b) =>
            a.component.subsystem.localeCompare(b.component.subsystem) ||
            a.component.component.localeCompare(b.component.component))) {
            lines.push(`| \`${component.subsystem}\` | ` +
                `[${component.component}](${componentLink(subsystem, component)}) | ${[...roles].join(', ')} |`);
        }
        lines.push('', '角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。',
            '', '## 可执行构建目标', '');
        if (process.executableTargets.length > 0) {
            for (const item of process.executableTargets) {
                lines.push(`- \`${md(item.gn_label)}\`：` +
                    `[${md(item.build_file)}](${sourcePrefix}${item.build_file})`);
            }
        } else {
            lines.push('- 没有找到与进程名或 init 可执行文件名直接匹配的 Foundation 生产可执行目标。' +
                '对于 `sa_main` 宿主，核心行为由 SA 动态库提供。');
        }
        lines.push('', '## 生命周期判断', '');
        let hasLifecycleFact = false;
        if (process.initServices.some((item) => item.startMode === 'ondemand' || item.ondemand === 'true')) {
            lines.push('- init 配置包含按需启动，首次访问相关能力时可能触发进程创建。');
            hasLifecycleFact = true;
        }
        if (process.initServices.some((item) => item.startMode === 'boot' || item.ondemand === 'false')) {
            lines.push('- init 配置包含开机启动或非按需启动路径。');
            hasLifecycleFact = true;
        }
        if (process.initServices.some((item) => item.startMode === 'condition')) {
            lines.push('- init 配置使用条件启动，需结合对应 parameter/job 判断触发时机。');
            hasLifecycleFact = true;
        }
        if (process.systemAbilities.some((item) => item.runOnCreate === 'true')) {
            lines.push('- 部分 SA 设置 `run-on-create=true`，进程建立后会立即创建这些能力。');
            hasLifecycleFact = true;
        }
        if (process.systemAbilities.some((item) => item.runOnCreate === 'false')) {
            lines.push('- 部分 SA 设置 `run-on-create=false`，通常由访问或框架调度触发加载。');
            hasLifecycleFact = true;
        }
        if (!hasLifecycleFact) {
            lines.push('- 当前配置没有显式声明启动模式或 SA 创建策略，需要结合 init job、产品参数和真机启动时序确认。');
        }
        lines.push('', '## 安全与验证重点', '',
            '- 核对 init 中的 uid、gid、SELinux domain、permission 与实际访问资源一致。',
            '- 核对 SA ID、实现库和宿主进程配置一致，避免 profile 安装但进程无法装载。',
            '- 对按需启动进程验证首次调用、并发加载、失败回调、死亡重启和资源回收。',
            '- 对跨部件宿主进程评估单个 SA 异常对同进程其他能力的影响。',
            '- 真机验证应结合 `ps`、`hidumper -ls`、SA 查询、hilog 和进程 SELinux 上下文。',
            '', '## 扫描边界', '',
            '- 本页只纳入生产路径中的有效 JSON init 配置和 SA profile。',
            '- 测试、示例、benchmark、CLI 工具不会建立生产进程节点。',
            '- 条件编译可能选择不同 init/profile 变体，因此同一进程可能出现多条配置证据。', '');
        fs.writeFileSync(path.join(processDir, 'foundation-runtime.md'), lines.join('\n'));
    }
    indexLines.push('', '## 说明', '',
        '- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。',
        '- 一个进程可以承载多个部件甚至多个子系统提供的 SA。',
        '- 测试、示例和 CLI 工具不进入本清单。', '');
    fs.writeFileSync(path.join(subsystemDir, 'foundation-processes.md'), indexLines.join('\n'));
}

const summaryPath = path.join(outDir, 'summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
summary.processes = processRows.length;
summary.initServiceEntries = runtimeRows.filter((item) => item.entityType === 'init-service').length;
summary.systemAbilityEntries = runtimeRows.filter((item) => item.entityType === 'system-ability').length;
summary.processSubsystems = bySubsystem.size;
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

console.log(`generated ${processRows.length} Foundation process nodes`);
NODE
