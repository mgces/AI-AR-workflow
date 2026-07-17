#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
KB_DIR="$ROOT_DIR/specs/knowledge-base"

cd "$ROOT_DIR"

node - "$ROOT_DIR" "$KB_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const kbDir = process.argv[3];

function readTsv(filePath)
{
    const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
    const header = lines.shift().split('\t');
    return lines.map((line) => {
        const fields = line.split('\t');
        return Object.fromEntries(header.map((name, index) => [name, fields[index] || '']));
    });
}

function safeName(value)
{
    return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function md(value)
{
    return String(value || '').replace(/[\t\r\n]+/g, ' ').replace(/\|/g, '\\|').trim();
}

function list(value)
{
    return Array.isArray(value) ? value.filter((item) => item !== undefined && item !== null) : [];
}

function humanize(value)
{
    return String(value || '')
        .replace(/^SystemCapability\./, '')
        .replace(/[_./:-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function isWeakDescription(description, componentName)
{
    const value = String(description || '').trim().toLowerCase();
    return !value || value === String(componentName || '').toLowerCase() || value.length < 32;
}

function describeFeature(value)
{
    const words = humanize(value).toLowerCase();
    const replacements = [
        ['support', '支持'], ['enabled', '启用'], ['enable', '启用'], ['feature', '功能'],
        ['rpc', '跨设备 RPC'], ['trace', '调用链追踪'], ['freeze', '冻结检测'],
        ['memory usage', '内存使用统计'], ['calling user info', '调用方用户信息'],
        ['audio decoder', '音频解码'], ['audio encoder', '音频编码'], ['audio codec', '音频编解码'],
        ['video decoder', '视频解码'], ['video encoder', '视频编码'], ['codec', '编解码'],
        ['demuxer', '解封装'], ['muxer', '封装'], ['source', '媒体源'],
        ['software', '软件实现'], ['start stop on demand', '按需启停'], ['qos', '服务质量'],
        ['graphics', '图形协同'], ['power', '电源协同'], ['test', '测试'],
        ['coverage', '覆盖率'], ['extend load timeout', '延长加载超时'],
        ['delay dbinder', '延迟启动 DBinder'], ['multi instance', '多实例'],
    ];
    let result = words;
    for (const [from, to] of replacements) result = result.replaceAll(from, to);
    return result.replace(/\s+/g, ' ').trim();
}

function shortSummary(value, fallback)
{
    const text = String(value || '').replace(/\\([()])/g, '$1').replace(/\s+/g, ' ').trim();
    const sentences = text.split(/(?<=[。！？.!?])\s*/).map((item) => item.trim())
        .filter((item) => item.length >= 18 && item.length <= 220)
        .filter((item) => (item.match(/ - /g) || []).length < 3);
    const functional = sentences.find((item) => /提供|实现|用于|负责|能力|provides?|implements?|used to/i.test(item));
    return (functional || sentences[0] || text.slice(0, 140) || fallback).slice(0, 220);
}

function readmeCandidates(componentDir)
{
    const preferred = ['README_zh.md', 'README_ZH.md', 'README.md', 'README_en.md', 'README_EN.md'];
    const entries = fs.readdirSync(componentDir);
    const result = [];
    for (const name of preferred) {
        if (entries.includes(name)) {
            result.push(path.join(componentDir, name));
        }
    }
    for (const name of entries.sort()) {
        if (/^readme(?:[._-].*)?$/i.test(name)) {
            const filePath = path.join(componentDir, name);
            if (!result.includes(filePath) && fs.statSync(filePath).isFile()) {
                result.push(filePath);
            }
        }
    }
    return result;
}

function extractReadmeSummary(filePath)
{
    if (!filePath || !fs.existsSync(filePath)) {
        return '';
    }
    const content = fs.readFileSync(filePath, 'utf8')
        .replace(/```[\s\S]*?```/g, '\n')
        .replace(/<table[\s\S]*?<\/table>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    const paragraphs = content.split(/\n\s*\n/).map((block) => block
        .replace(/^#{1,6}\s+.*$/gm, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+[.)]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim())
        .filter((block) => block.length >= 40 && block.length <= 1200)
        .filter((block) => !/when you're done|software architecture description|fork the repository|gitee feature/i.test(block))
        .filter((block) => !/^(introduction|description|architecture|目录|简介)$/i.test(block));
    return paragraphs.slice(0, 2).join(' ').slice(0, 1200);
}

const areaDescriptions = {
    interfaces: '对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。',
    frameworks: '客户端框架、公共运行库以及面向上层的能力封装。',
    framework: '客户端框架、公共运行库以及面向上层的能力封装。',
    services: '服务端核心实现、状态管理、调度逻辑和 IPC Stub。',
    service: '服务端核心实现、状态管理、调度逻辑和 IPC Stub。',
    sa_profile: 'System Ability 注册信息及进程装载配置。',
    profiles: '组件注册、系统能力或产品装配配置。',
    profile: '组件注册、系统能力或产品装配配置。',
    etc: '安装到系统镜像的运行配置、权限、启动或策略文件。',
    plugins: '可插拔能力实现，由框架或服务在运行时选择和装载。',
    plugin: '可插拔能力实现，由框架或服务在运行时选择和装载。',
    adapters: '平台、硬件、协议或不同系统形态之间的适配层。',
    adapter: '平台、硬件、协议或不同系统形态之间的适配层。',
    utils: '跨模块复用的基础工具和通用数据结构。',
    common: '组件内部共享的公共定义、工具和基础实现。',
    tools: '开发、诊断、命令行或构建辅助工具。',
    cli: '面向开发者或系统维护的命令行工具。',
    engine: '核心引擎、状态机或主要算法实现。',
    ipc: '设备内 Binder IPC、跨设备 RPC 及其对象、Parcel、Proxy/Stub 等核心实现。',
    dbinder: '跨设备 Binder 服务发现、代理映射和远端调用实现。',
    codec: '音视频编解码能力、编解码器选择和数据处理实现。',
    media_engine: '媒体管线、Filter、Plugin 和数据流调度实现。',
    audio: '音频采集、播放、路由、焦点或处理能力。',
    camera: '相机设备访问、会话、流和图像处理能力。',
    window: '窗口生命周期、布局、层级和交互管理能力。',
    scheduler: '任务、资源或服务调度策略实现。',
    storage: '持久化存储、卷、文件或数据生命周期管理。',
    core: '组件核心模型和关键执行逻辑。',
    components: '可组合的功能单元或上层组件实现。',
    component: '可组合的功能单元或上层组件实现。',
    client: '客户端代理、调用封装和连接管理。',
    server: '服务提供方实现、请求处理和资源管理。',
    native: 'Native 层实现及 C/C++ 运行时接口。',
    napi: 'ArkTS/JavaScript 到 Native 能力的 NAPI 绑定。',
    cj: '仓颉语言接口或 FFI 适配。',
    ani: '基于 ANI 的 ArkTS Native 接口绑定。',
    rust: 'Rust 语言实现或跨语言桥接。',
    config: '编译期或运行期功能配置。',
    resources: '运行资源、界面资源或组件随包资源。',
    applications: '随组件交付的系统应用或管理界面。',
    app: '随组件交付的系统应用或管理界面。',
};

function describeArea(name)
{
    const lower = name.toLowerCase();
    return areaDescriptions[lower] ||
        (lower.includes('interface') ? areaDescriptions.interfaces :
        lower.includes('service') ? areaDescriptions.services :
        lower.includes('framework') ? areaDescriptions.frameworks :
        lower.includes('plugin') ? areaDescriptions.plugins :
        lower.includes('adapter') ? areaDescriptions.adapters :
        lower.includes('ipc') ? areaDescriptions.ipc :
        lower.includes('binder') ? areaDescriptions.dbinder :
        lower.includes('codec') ? areaDescriptions.codec :
        lower.includes('media_engine') ? areaDescriptions.media_engine :
        lower.includes('audio') ? areaDescriptions.audio :
        lower.includes('camera') ? areaDescriptions.camera :
        lower.includes('window') ? areaDescriptions.window :
        lower.includes('sched') ? areaDescriptions.scheduler :
        lower.includes('storage') ? areaDescriptions.storage :
        '该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。');
}

function sourceAreas(componentDir, modules)
{
    const ignored = new Set([
        '.git', '.gitee', '.github', 'build', 'test', 'tests', 'unittest', 'fuzztest',
        'docs', 'doc', 'figures', 'examples', 'example', 'tools_test', 'benchmark',
    ]);
    return fs.readdirSync(componentDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !ignored.has(entry.name.toLowerCase()))
        .map((entry) => {
            const relative = path.posix.join(path.relative(rootDir, componentDir).split(path.sep).join('/'), entry.name);
            const children = fs.readdirSync(path.join(componentDir, entry.name), { withFileTypes: true })
                .filter((child) => child.isDirectory() && !child.name.startsWith('.') &&
                    !['test', 'tests', 'unittest', 'fuzztest'].includes(child.name.toLowerCase()))
                .map((child) => child.name)
                .slice(0, 8);
            return {
                name: entry.name,
                relative,
                targetCount: modules.filter((item) => item.build_file === relative + '/BUILD.gn' ||
                    item.build_file.startsWith(relative + '/')).length,
                children,
            };
        })
        .sort((a, b) => b.targetCount - a.targetCount || a.name.localeCompare(b.name))
        .slice(0, 16);
}

function implementationForm(component, innerKits, runtimeTargets, productionLibraries)
{
    const forms = [];
    if (runtimeTargets.length > 0) forms.push('服务/运行实体');
    if (innerKits.length > 0) forms.push('系统内部接口');
    if (productionLibraries.length > 0) forms.push('框架或基础库');
    if (Number(component.aggregate_codegen_target_count) > 0) forms.push('聚合/代码生成');
    return forms.length ? forms.join(' + ') : '配置或资源型部件';
}

const components = readTsv(path.join(kbDir, 'generated/foundation/components.tsv'));
const modules = readTsv(path.join(kbDir, 'generated/foundation/modules.tsv'));
const runtimeEntitiesPath = path.join(kbDir, 'generated/foundation/runtime-entities.tsv');
const runtimeEntities = fs.existsSync(runtimeEntitiesPath) ? readTsv(runtimeEntitiesPath) : [];
const duplicateNames = new Map();
for (const component of components) {
    const key = `${component.subsystem}:${component.component}`;
    duplicateNames.set(key, (duplicateNames.get(key) || 0) + 1);
}

const subsystemData = new Map();
for (const component of components) {
    const bundle = JSON.parse(fs.readFileSync(path.join(rootDir, component.bundle_path), 'utf8'));
    const metadata = bundle.component || {};
    const build = metadata.build || {};
    const componentModules = modules.filter((item) =>
        item.subsystem === component.subsystem && item.component === component.component);
    const componentRuntimeEntities = runtimeEntities.filter((item) =>
        item.owner_subsystem === component.subsystem && item.owner_component === component.component);
    const innerKits = list(build.inner_kits);
    const syscaps = list(metadata.syscap);
    const features = list(metadata.features);
    const runtimeTargets = componentModules.filter((item) => {
        const type = item.target_type.toLowerCase();
        const buildFile = item.build_file.toLowerCase();
        const name = item.target_name.toLowerCase();
        if (item.category !== 'production' || /\/(test|tests|example|examples|benchmark)[^/]*\//.test(buildFile)) {
            return false;
        }
        return /executable|sa_profile|ohos_app|hap/.test(type) ||
            (/\/(service|services)\//.test(buildFile) && /library/.test(type) &&
                /(^|[_-])(service|server|daemon)([_-]|$)/.test(name));
    });
    const productionLibraries = componentModules.filter((item) => item.category === 'production' &&
        /library|source_set/.test(item.target_type.toLowerCase()));
    const componentDir = path.join(rootDir, path.dirname(component.bundle_path));
    const readmes = readmeCandidates(componentDir);
    const readmeSummary = readmes.map((file) => extractReadmeSummary(file)).find(Boolean) || '';
    const description = String(bundle.description || metadata.description || '').trim();
    const functionalDescription = isWeakDescription(description, component.component) && readmeSummary ?
        readmeSummary : (description || readmeSummary ||
            `该部件是 ${component.subsystem} 子系统中的 ${component.component} 实现单元。`);
    const key = `${component.subsystem}:${component.component}`;
    const docName = duplicateNames.get(key) === 1 ? safeName(component.component) :
        `${safeName(component.component)}-${safeName(component.repository_path)}`;
    const componentDocDir = path.join(kbDir, 'subsystems', safeName(component.subsystem), 'components', docName);
    fs.mkdirSync(componentDocDir, { recursive: true });
    const sourcePrefix = '../../../../../../';
    const areas = sourceAreas(componentDir, componentModules);
    const testTypes = new Map();
    for (const item of componentModules.filter((module) => module.category === 'test')) {
        testTypes.set(item.target_type, (testTypes.get(item.target_type) || 0) + 1);
    }

    const lines = [
        `# ${component.component} 功能说明`,
        '',
        '> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。',
        '',
        '[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)',
        '',
        '## 功能定位',
        '',
        md(functionalDescription),
        '',
    ];
    if (readmeSummary && readmeSummary !== functionalDescription) {
        lines.push('源码 README 补充说明：', '', `> ${md(readmeSummary)}`, '');
    }
    lines.push(
        '| 属性 | 说明 |',
        '| --- | --- |',
        `| 所属子系统 | \`${component.subsystem}\` |`,
        `| 实现形态 | ${implementationForm(component, innerKits, runtimeTargets, productionLibraries)} |`,
        `| 适配系统 | ${component.adapted_system_types || '-'} |`,
        `| rk3568 | ${component.rk3568_selected === 'yes' ? '已选入' : '未选入当前产品'} |`,
        `| ROM/RAM 声明 | ${md(metadata.rom || '-')} / ${md(metadata.ram || '-')} |`,
        `| 源码仓 | \`${component.repository_path}\` |`,
        '',
        '## 核心能力',
        '');
    if (syscaps.length > 0) {
        for (const syscap of syscaps) {
            lines.push(`- **${md(humanize(syscap))}**：提供“${md(describeFeature(syscap.split('.').slice(-2).join(' ')))}”能力，系统能力标识为 \`${md(syscap)}\`。`);
        }
    } else {
        lines.push('- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。');
    }
    lines.push('', '## 产品功能开关', '');
    if (features.length > 0) {
        lines.push('这些开关决定具体能力是否进入产品构建或采用何种实现路径：', '');
        for (const feature of features) {
            lines.push(`- \`${md(feature)}\`：${md(describeFeature(feature))}。`);
        }
    } else {
        lines.push('该部件没有在 `bundle.json` 中声明独立 feature 开关。');
    }
    lines.push('', '## 源码职责区', '');
    if (areas.length > 0) {
        lines.push('| 目录 | 职责 | 静态目标 | 主要子目录 |', '| --- | --- | ---: | --- |');
        for (const area of areas) {
            lines.push(`| [${md(area.relative)}](${sourcePrefix}${area.relative}) | ${describeArea(area.name)} | ` +
                `${area.targetCount} | ${area.children.length ? area.children.map((item) => `\`${md(item)}\``).join(', ') : '-'} |`);
        }
    } else {
        lines.push('源码没有形成可独立列出的一级实现目录，需直接从构建入口进入。');
    }
    lines.push('', '## 对外与内部接口', '');
    if (innerKits.length > 0) {
        lines.push(`该部件声明 ${innerKits.length} 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：`, '',
            '| Inner Kit | 头文件根目录 | 代表性头文件 |', '| --- | --- | --- |');
        for (const kit of innerKits) {
            const header = kit && typeof kit === 'object' ? kit.header || {} : {};
            const bases = Array.isArray(header.header_base) ? header.header_base : [header.header_base].filter(Boolean);
            const headers = list(header.header_files);
            lines.push(`| \`${md(kit.name || '-') }\` | ${bases.length ? bases.map((item) => `\`${md(item)}\``).join('<br>') : '-'} | ` +
                `${headers.length ? headers.slice(0, 8).map((item) => `\`${md(item)}\``).join(', ') + (headers.length > 8 ? ` 等 ${headers.length} 个` : '') : '-'} |`);
        }
    } else {
        lines.push('该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。');
    }
    lines.push('', '## 运行实体与交付形态', '');
    const processGroups = new Map();
    for (const entity of componentRuntimeEntities) {
        const key = `${entity.host_subsystem}:${entity.process}`;
        if (!processGroups.has(key)) processGroups.set(key, { ...entity, entities: [] });
        processGroups.get(key).entities.push(entity);
    }
    if (processGroups.size > 0) {
        lines.push('### 进程归属', '',
            '下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：', '',
            '| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |',
            '| --- | --- | --- | --- | --- |');
        for (const group of [...processGroups.values()].sort((a, b) =>
            a.host_subsystem.localeCompare(b.host_subsystem) || a.process.localeCompare(b.process))) {
            const processLink = group.host_subsystem === component.subsystem ?
                `../../processes/${safeName(group.process)}/foundation-runtime.md` :
                `../../../${safeName(group.host_subsystem)}/processes/${safeName(group.process)}/foundation-runtime.md`;
            const roles = [...new Set(group.entities.map((item) => item.entity_type === 'init-service' ?
                '启动配置' : 'SA 实现'))];
            const saIds = [...new Set(group.entities.map((item) => item.sa_id).filter(Boolean))];
            const libraries = [...new Set(group.entities.map((item) => item.library).filter(Boolean))];
            lines.push(`| \`${md(group.host_subsystem)}\` | [${md(group.process)}](${processLink}) | ` +
                `${roles.join(', ')} | ${saIds.length ? saIds.map((item) => `\`${md(item)}\``).join(', ') : '-'} | ` +
                `${libraries.length ? libraries.map((item) => `\`${md(item)}\``).join(', ') : '-'} |`);
        }
        lines.push('', '同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。', '');
    } else {
        lines.push('### 进程归属', '',
            '当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。' +
            '它通常以库、接口、插件、资源或构建工具形式被其他部件使用。', '');
    }
    lines.push('### 构建交付形态', '');
    if (runtimeTargets.length > 0) {
        lines.push('以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：', '',
            '| 类型 | 目标 | 源码位置 |', '| --- | --- | --- |');
        for (const target of runtimeTargets.slice(0, 40)) {
            lines.push(`| \`${md(target.target_type)}\` | \`${md(target.gn_label)}\` | ` +
                `[${md(target.build_file)}](${sourcePrefix}${target.build_file}) |`);
        }
        if (runtimeTargets.length > 40) {
            lines.push('', `其余 ${runtimeTargets.length - 40} 个运行相关目标见 [完整模块索引](foundation-index.md)。`);
        }
    } else {
        lines.push(`没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。`);
    }
    if (productionLibraries.length > 0) {
        const libraryTypes = new Map();
        for (const item of productionLibraries) {
            libraryTypes.set(item.target_type, (libraryTypes.get(item.target_type) || 0) + 1);
        }
        lines.push('', '生产库形态：' + [...libraryTypes.entries()].sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `\`${name}\` ${count} 个`).join('，') + '。');
    }
    lines.push('', '## 依赖与协作边界', '',
        `该部件声明 ${component.component_dependency_count} 个组件依赖和 ${component.third_party_dependency_count} 个三方依赖。`, '');
    const componentDeps = String(component.component_dependency_count) === '0' ? [] :
        list((metadata.deps || {}).components);
    const thirdPartyDeps = list((metadata.deps || {}).third_party);
    if (componentDeps.length > 0) {
        lines.push(`- 系统组件协作：${componentDeps.map((item) => `\`${md(item)}\``).join(', ')}。`);
    }
    if (thirdPartyDeps.length > 0) {
        lines.push(`- 三方实现依赖：${thirdPartyDeps.map((item) => `\`${md(item)}\``).join(', ')}。`);
    }
    lines.push('- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。',
        '', '## 测试与验证边界', '',
        `当前静态索引识别 ${component.test_target_count} 个测试目标，` +
        `bundle 声明 ${component.declared_test_entry_count} 个测试入口。`);
    if (testTypes.size > 0) {
        lines.push('', '主要测试形态：' + [...testTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
            .map(([name, count]) => `\`${name}\` ${count} 个`).join('，') + '。');
    }
    lines.push('', '验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。',
        '', '## 继续深入', '',
        `- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)`,
        `- 组件声明：[${component.bundle_path}](${sourcePrefix}${component.bundle_path})`,
        `- 原始源码 README：${readmes.length ? readmes.map((file) => {
            const relative = path.relative(rootDir, file).split(path.sep).join('/');
            return `[${relative}](${sourcePrefix}${relative})`;
        }).join('、') : '未找到'}`,
        '- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。', '');
    fs.writeFileSync(path.join(componentDocDir, 'functional-overview.md'), lines.join('\n'));

    const componentReadme = path.join(componentDocDir, 'README.md');
    const existing = fs.existsSync(componentReadme) ? fs.readFileSync(componentReadme, 'utf8') : '';
    if (!existing || (existing.includes('[Foundation 完整模块索引](foundation-index.md)') &&
        existing.includes('## 继续细分'))) {
        fs.writeFileSync(componentReadme,
            `# ${component.component} 部件\n\n` +
            `- [功能说明](functional-overview.md)\n` +
            `- [完整模块索引](foundation-index.md)\n\n` +
            `功能继续按 \`capabilities/<domain>/features/<feature>/\` 细分；独立运行进程在子系统的 ` +
            `\`processes/<process>/\` 建立节点。\n`);
    }

    if (!subsystemData.has(component.subsystem)) subsystemData.set(component.subsystem, []);
    subsystemData.get(component.subsystem).push({
        component, metadata, description: functionalDescription, syscaps, features, innerKits,
        runtimeTargets, productionLibraries, docName, componentRuntimeEntities,
    });
}

for (const [subsystem, items] of subsystemData.entries()) {
    items.sort((a, b) => a.component.component.localeCompare(b.component.component));
    const selected = items.filter((item) => item.component.rk3568_selected === 'yes').length;
    const runtimeCount = items.filter((item) => item.runtimeTargets.length > 0).length;
    const interfaceCount = items.filter((item) => item.innerKits.length > 0).length;
    const lines = [
        `# ${subsystem}：Foundation 功能全景`, '',
        '> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。', '',
        '[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)', '',
        '## 子系统构成', '',
        `Foundation 在该子系统下包含 ${items.length} 个部件，其中 ${selected} 个进入当前 rk3568 产品。` +
        `${runtimeCount} 个部件包含可识别的服务/可执行程序/SA profile，${interfaceCount} 个部件声明 Inner Kit。`, '',
        '## 部件功能分工', '',
        '| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |',
        '| --- | --- | --- | ---: | --- | --- |',
    ];
    for (const item of items) {
        const shortDescription = md(shortSummary(item.description, `${item.component.component} 功能部件`));
        lines.push(`| \`${item.component.component}\` | ${shortDescription} | ` +
            `${implementationForm(item.component, item.innerKits, item.runtimeTargets, item.productionLibraries)} | ` +
            `${item.syscaps.length}/${item.features.length} | ` +
            `${item.component.rk3568_selected === 'yes' ? 'yes' : 'no'} | ` +
            `[查看](components/${item.docName}/functional-overview.md) |`);
    }
    lines.push('', '“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。', '',
        '## 运行进程与跨部件宿主', '');
    const subsystemRuntime = items.flatMap((item) => item.componentRuntimeEntities);
    const processGroups = new Map();
    for (const entity of subsystemRuntime) {
        const key = `${entity.host_subsystem}:${entity.process}`;
        if (!processGroups.has(key)) processGroups.set(key, { ...entity, entities: [] });
        processGroups.get(key).entities.push(entity);
    }
    if (processGroups.size > 0) {
        lines.push('| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |',
            '| --- | --- | --- | ---: | --- |');
        for (const group of [...processGroups.values()].sort((a, b) =>
            a.host_subsystem.localeCompare(b.host_subsystem) || a.process.localeCompare(b.process))) {
            const owners = [...new Set(group.entities.map((item) => item.owner_component).filter(Boolean))];
            const saCount = new Set(group.entities.map((item) => item.sa_id).filter(Boolean)).size;
            const processLink = group.host_subsystem === subsystem ?
                `processes/${safeName(group.process)}/foundation-runtime.md` :
                `../${safeName(group.host_subsystem)}/processes/${safeName(group.process)}/foundation-runtime.md`;
            lines.push(`| \`${md(group.host_subsystem)}\` | [${md(group.process)}](${processLink}) | ` +
                `${owners.map((item) => `\`${md(item)}\``).join(', ') || '-'} | ${saCount} | [查看](${processLink}) |`);
        }
    } else {
        lines.push('当前没有从 Foundation 生产 init 配置或 SA profile 中识别到该子系统部件的进程关系。');
    }
    lines.push('',
        '## 阅读顺序', '',
        '1. 先从上表确认部件的功能定位和实现形态。',
        '2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。',
        '3. 需要编译或定位文件时，再进入完整模块索引。',
        '4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。', '');
    const subsystemDir = path.join(kbDir, 'subsystems', safeName(subsystem));
    fs.writeFileSync(path.join(subsystemDir, 'functional-overview.md'), lines.join('\n'));
    const subsystemReadme = path.join(subsystemDir, 'README.md');
    const existing = fs.existsSync(subsystemReadme) ? fs.readFileSync(subsystemReadme, 'utf8') : '';
    if (!existing || (existing.includes('[Foundation 部件与模块索引](foundation-index.md)') &&
        (existing.includes('## 继续细分') || existing.includes('运行进程放入 `processes/<process>/`')))) {
        const processIndex = path.join(subsystemDir, 'foundation-processes.md');
        fs.writeFileSync(subsystemReadme,
            `# ${subsystem} 子系统\n\n` +
            `- [Foundation 功能全景](functional-overview.md)\n` +
            (fs.existsSync(processIndex) ? `- [Foundation 运行进程](foundation-processes.md)\n` : '') +
            `- [Foundation 部件与模块索引](foundation-index.md)\n\n` +
            `运行进程放入 \`processes/<process>/\`，库和工具放入 \`components/<component>/\`，` +
            `具体功能继续放入 \`capabilities/<domain>/features/<feature>/\`。\n`);
    }
}

console.log(`generated functional documentation for ${components.length} Foundation components`);
NODE
