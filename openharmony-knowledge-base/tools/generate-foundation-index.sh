#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
KB_DIR="$ROOT_DIR/specs/knowledge-base"
OUT_DIR="$KB_DIR/generated/foundation"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

awk -F '\t' 'NR == 1 || $1 ~ /^foundation\//' \
    specs/knowledge-base/generated/projects.tsv > "$TMP_DIR/projects.tsv"

awk -F '\t' 'NR == 1 || $3 ~ /^foundation\//' \
    specs/knowledge-base/generated/components.tsv > "$TMP_DIR/components.tsv"

rg -n --no-heading \
    '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*\("[^"]+"\)[[:space:]]*\{' \
    foundation -g 'BUILD.gn' > "$TMP_DIR/targets.txt"

find foundation -type f -name BUILD.gn | LC_ALL=C sort > "$TMP_DIR/build-gn-files.txt"

node - "$ROOT_DIR" "$KB_DIR" "$TMP_DIR" "$OUT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const kbDir = process.argv[3];
const tmpDir = process.argv[4];
const outDir = process.argv[5];

function readLines(filePath)
{
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content.length === 0 ? [] : content.split(/\r?\n/);
}

function clean(value)
{
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}

function csv(value)
{
    if (!value) {
        return [];
    }
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function safeName(value)
{
    return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function markdownEscape(value)
{
    return clean(value).replace(/\|/g, '\\|');
}

const projectLines = readLines(path.join(tmpDir, 'projects.tsv')).slice(1);
const projects = projectLines.map((line) => {
    const f = line.split('\t');
    return {
        path: f[0],
        repository: f[1],
        head: f[2],
        branch: f[3],
        changedEntries: Number(f[4]),
    };
}).sort((a, b) => b.path.length - a.path.length);

const selectedPartsPath = path.join(kbDir, 'generated/rk3568-parts.tsv');
const selectedParts = new Set(readLines(selectedPartsPath).slice(1).map((line) => line.split('\t')[2]));

const componentLines = readLines(path.join(tmpDir, 'components.tsv')).slice(1);
const components = componentLines.map((line) => {
    const f = line.split('\t');
    const bundlePath = f[2];
    const bundleDir = path.posix.dirname(bundlePath);
    const project = projects.find((item) =>
        bundlePath === item.path || bundlePath.startsWith(item.path + '/'));
    return {
        subsystem: f[0],
        component: f[1],
        bundlePath,
        bundleDir,
        repositoryPath: project ? project.path : '',
        repository: project ? project.repository : '',
        adaptedSystemTypes: f[3],
        componentDeps: csv(f[5]),
        thirdPartyDeps: csv(f[7]),
        subComponentTargets: csv(f[9]),
        innerKitCount: Number(f[10]),
        testEntries: csv(f[12]),
        selected: selectedParts.has(`${f[0]}:${f[1]}`),
        modules: [],
    };
});

const duplicateNames = new Map();
for (const item of components) {
    const key = `${item.subsystem}:${item.component}`;
    duplicateNames.set(key, (duplicateNames.get(key) || 0) + 1);
}
for (const item of components) {
    const key = `${item.subsystem}:${item.component}`;
    item.docName = duplicateNames.get(key) === 1 ? safeName(item.component) :
        `${safeName(item.component)}-${safeName(item.repositoryPath)}`;
}

function inferSubsystem(buildFile)
{
    const parts = buildFile.split('/');
    if (parts[1] === 'CastEngine') {
        return 'castplus';
    }
    return parts[1] || 'unknown';
}

function classifyTarget(type, name, buildFile)
{
    const lowerType = type.toLowerCase();
    const lowerName = name.toLowerCase();
    if (lowerType === 'config' || lowerType === 'template') {
        return 'build-support';
    }
    if (lowerType.includes('test') || lowerName.includes('test') ||
        /\/(test|tests)\//.test(buildFile)) {
        return 'test';
    }
    if (lowerType === 'group' || lowerType === 'action' || lowerType === 'action_foreach' ||
        lowerType.includes('copy') || lowerType.startsWith('generate_') ||
        lowerType.startsWith('gen_') || lowerType.includes('assets') ||
        lowerType.includes('resources')) {
        return 'aggregate-codegen';
    }
    return 'production';
}

const modules = [];
const unmapped = [];
for (const line of readLines(path.join(tmpDir, 'targets.txt'))) {
    const firstColon = line.indexOf(':');
    const secondColon = line.indexOf(':', firstColon + 1);
    if (firstColon < 0 || secondColon < 0) {
        continue;
    }
    const buildFile = line.slice(0, firstColon);
    const lineNumber = Number(line.slice(firstColon + 1, secondColon));
    const source = line.slice(secondColon + 1);
    const match = source.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\("([^"]+)"\)\s*\{/);
    if (!match) {
        continue;
    }
    const type = match[1];
    const name = match[2];
    const buildDir = path.posix.dirname(buildFile);
    const repository = projects.find((item) =>
        buildFile === item.path || buildFile.startsWith(item.path + '/'));

    let component = components
        .filter((item) => buildFile === item.bundleDir || buildFile.startsWith(item.bundleDir + '/'))
        .sort((a, b) => b.bundleDir.length - a.bundleDir.length)[0];
    let mappingMethod = component ? 'bundle-prefix' : '';

    if (!component && repository) {
        const repositoryComponents = components.filter((item) => item.repositoryPath === repository.path);
        if (repositoryComponents.length === 1) {
            component = repositoryComponents[0];
            mappingMethod = 'single-component-repository';
        }
    }

    const module = {
        subsystem: component ? component.subsystem : inferSubsystem(buildFile),
        component: component ? component.component : '',
        repositoryPath: repository ? repository.path : '',
        repository: repository ? repository.repository : '',
        buildFile,
        line: lineNumber,
        type,
        name,
        label: `//${buildDir}:${name}`,
        category: classifyTarget(type, name, buildFile),
        mappingMethod: mappingMethod || 'unmapped',
    };
    modules.push(module);
    if (component) {
        component.modules.push(module);
    } else {
        unmapped.push(module);
    }
}

modules.sort((a, b) =>
    a.subsystem.localeCompare(b.subsystem) ||
    a.component.localeCompare(b.component) ||
    a.buildFile.localeCompare(b.buildFile) ||
    a.line - b.line);

function writeTsv(filePath, header, rows)
{
    const lines = [header.join('\t')];
    for (const row of rows) {
        lines.push(row.map(clean).join('\t'));
    }
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

writeTsv(path.join(outDir, 'modules.tsv'), [
    'subsystem', 'component', 'repository_path', 'repository', 'build_file', 'line',
    'target_type', 'target_name', 'gn_label', 'category', 'mapping_method',
], modules.map((item) => [
    item.subsystem, item.component, item.repositoryPath, item.repository, item.buildFile,
    item.line, item.type, item.name, item.label, item.category, item.mappingMethod,
]));

writeTsv(path.join(outDir, 'unmapped-modules.tsv'), [
    'subsystem', 'repository_path', 'build_file', 'line', 'target_type', 'target_name',
    'gn_label', 'category',
], unmapped.map((item) => [
    item.subsystem, item.repositoryPath, item.buildFile, item.line, item.type,
    item.name, item.label, item.category,
]));

function categoryCounts(items)
{
    const result = { production: 0, test: 0, 'build-support': 0, 'aggregate-codegen': 0 };
    for (const item of items) {
        result[item.category] = (result[item.category] || 0) + 1;
    }
    return result;
}

const componentRows = components.slice().sort((a, b) =>
    a.subsystem.localeCompare(b.subsystem) || a.component.localeCompare(b.component));
writeTsv(path.join(outDir, 'components.tsv'), [
    'subsystem', 'component', 'repository_path', 'repository', 'bundle_path',
    'rk3568_selected', 'adapted_system_types', 'component_dependency_count',
    'third_party_dependency_count', 'declared_sub_component_count', 'inner_kit_count',
    'declared_test_entry_count', 'gn_target_count', 'production_target_count',
    'test_target_count', 'build_support_target_count', 'aggregate_codegen_target_count',
], componentRows.map((item) => {
    const counts = categoryCounts(item.modules);
    return [
        item.subsystem, item.component, item.repositoryPath, item.repository, item.bundlePath,
        item.selected ? 'yes' : 'no', item.adaptedSystemTypes, item.componentDeps.length,
        item.thirdPartyDeps.length, item.subComponentTargets.length, item.innerKitCount,
        item.testEntries.length, item.modules.length, counts.production, counts.test,
        counts['build-support'], counts['aggregate-codegen'],
    ];
}));

const subsystemMap = new Map();
for (const component of components) {
    if (!subsystemMap.has(component.subsystem)) {
        subsystemMap.set(component.subsystem, { components: [], modules: [], repositories: new Set() });
    }
    subsystemMap.get(component.subsystem).components.push(component);
}
for (const module of modules) {
    if (!subsystemMap.has(module.subsystem)) {
        subsystemMap.set(module.subsystem, { components: [], modules: [], repositories: new Set() });
    }
    subsystemMap.get(module.subsystem).modules.push(module);
}
for (const project of projects) {
    const repositoryComponents = components.filter((item) => item.repositoryPath === project.path);
    const subsystem = repositoryComponents.length > 0 ? repositoryComponents[0].subsystem :
        inferSubsystem(`${project.path}/BUILD.gn`);
    if (!subsystemMap.has(subsystem)) {
        subsystemMap.set(subsystem, { components: [], modules: [], repositories: new Set() });
    }
    subsystemMap.get(subsystem).repositories.add(project.path);
}

writeTsv(path.join(outDir, 'repositories.tsv'), [
    'subsystem', 'path', 'repository', 'head', 'branch', 'changed_entries',
    'component_count', 'literal_gn_target_count', 'coverage_status',
], projects.slice().sort((a, b) => a.path.localeCompare(b.path)).map((item) => {
    const repositoryComponents = components.filter((component) => component.repositoryPath === item.path);
    const repositoryModules = modules.filter((module) => module.repositoryPath === item.path);
    const subsystem = repositoryComponents.length > 0 ? repositoryComponents[0].subsystem :
        inferSubsystem(`${item.path}/BUILD.gn`);
    let coverageStatus = 'component-and-targets';
    if (repositoryComponents.length === 0 && repositoryModules.length > 0) {
        coverageStatus = 'repository-targets-only';
    } else if (repositoryComponents.length === 0) {
        coverageStatus = 'repository-only';
    } else if (repositoryModules.length === 0) {
        coverageStatus = 'component-only';
    }
    return [
        subsystem, item.path, item.repository, item.head, item.branch, item.changedEntries,
        repositoryComponents.length, repositoryModules.length, coverageStatus,
    ];
}));

writeTsv(path.join(outDir, 'subsystems.tsv'), [
    'subsystem', 'repository_count', 'component_count', 'rk3568_selected_component_count',
    'gn_target_count', 'production_target_count', 'test_target_count',
    'build_support_target_count', 'aggregate_codegen_target_count',
], [...subsystemMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => {
    const counts = categoryCounts(data.modules);
    return [
        name, data.repositories.size, data.components.length,
        data.components.filter((item) => item.selected).length,
        data.modules.length, counts.production, counts.test,
        counts['build-support'], counts['aggregate-codegen'],
    ];
}));

for (const [subsystem, data] of subsystemMap.entries()) {
    if (data.components.length === 0) {
        continue;
    }
    const subsystemDir = path.join(kbDir, 'subsystems', safeName(subsystem));
    fs.mkdirSync(subsystemDir, { recursive: true });
    const subsystemReadme = path.join(subsystemDir, 'README.md');
    if (!fs.existsSync(subsystemReadme)) {
        fs.writeFileSync(subsystemReadme,
            `# ${subsystem} 子系统\n\n` +
            `- [Foundation 功能全景](functional-overview.md)\n` +
            `- [Foundation 部件与模块索引](foundation-index.md)\n\n` +
            `## 继续细分\n\n` +
            `- 运行进程放入 \`processes/<process>/\`。\n` +
            `- 库和工具放入 \`components/<component>/\`。\n` +
            `- 具体功能继续放入 \`capabilities/<domain>/features/<feature>/\`。\n`);
    }

    const counts = categoryCounts(data.modules);
    const lines = [
        `# ${subsystem}：Foundation 部件与模块索引`,
        '',
        '> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。',
        '',
        `[返回子系统节点](README.md) | [功能全景](functional-overview.md)`,
        '',
        '## 汇总',
        '',
        '| 指标 | 数量 |',
        '| --- | ---: |',
        `| 部件 | ${data.components.length} |`,
        `| rk3568 选入部件 | ${data.components.filter((item) => item.selected).length} |`,
        `| GN 目标 | ${data.modules.length} |`,
        `| 生产目标 | ${counts.production} |`,
        `| 测试目标 | ${counts.test} |`,
        `| 构建支持目标 | ${counts['build-support']} |`,
        `| 聚合/代码生成目标 | ${counts['aggregate-codegen']} |`,
        '',
        '## 部件',
        '',
        '| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |',
        '| --- | --- | --- | ---: | ---: | ---: | --- |',
    ];
    for (const component of data.components.slice().sort((a, b) => a.component.localeCompare(b.component))) {
        const componentCounts = categoryCounts(component.modules);
        lines.push(`| ${markdownEscape(component.component)} | ${component.selected ? 'yes' : 'no'} | ` +
            `${markdownEscape(component.repositoryPath)} | ${component.modules.length} | ` +
            `${componentCounts.production} | ${componentCounts.test} | ` +
            `[查看](components/${component.docName}/foundation-index.md) |`);
    }
    const subsystemUnmapped = data.modules.filter((item) => item.mappingMethod === 'unmapped');
    if (subsystemUnmapped.length > 0) {
        lines.push('', '## 未归属部件的仓库模块', '',
            '以下目标位于 Foundation Git 子仓中，但所在仓没有可用于归属的 `bundle.json`。' +
            '它们保留在源码域索引，不虚构部件节点。', '',
            '| Git 子仓 | 分类 | 类型 | GN label | BUILD.gn | 行 |',
            '| --- | --- | --- | --- | --- | ---: |');
        for (const module of subsystemUnmapped) {
            lines.push(`| ${markdownEscape(module.repositoryPath)} | ${module.category} | ` +
                `\`${markdownEscape(module.type)}\` | \`${markdownEscape(module.label)}\` | ` +
                `[${markdownEscape(module.buildFile)}](../../../../${module.buildFile}) | ${module.line} |`);
        }
    }
    const repositoryOnly = [...data.repositories].filter((repositoryPath) =>
        !data.components.some((item) => item.repositoryPath === repositoryPath) &&
        !data.modules.some((item) => item.repositoryPath === repositoryPath));
    if (repositoryOnly.length > 0) {
        lines.push('', '## 仅仓库节点', '',
            '以下 Git 子仓没有 `bundle.json`，也没有可静态识别的字面量 GN 目标，' +
            '因此只保留物理源码域节点，不虚构部件或模块。', '');
        for (const repositoryPath of repositoryOnly.sort()) {
            lines.push(`- \`${repositoryPath}\``);
        }
    }
    lines.push('', '## 全量查询', '',
        '```bash',
        `awk -F '\\t' '$1 == "${subsystem}"' specs/knowledge-base/generated/foundation/modules.tsv`,
        '```', '');
    fs.writeFileSync(path.join(subsystemDir, 'foundation-index.md'), lines.join('\n'));

    for (const component of data.components) {
        const componentDir = path.join(subsystemDir, 'components', component.docName);
        fs.mkdirSync(componentDir, { recursive: true });
        const componentReadme = path.join(componentDir, 'README.md');
        if (!fs.existsSync(componentReadme)) {
            fs.writeFileSync(componentReadme,
                `# ${component.component} 部件\n\n` +
                `- [功能说明](functional-overview.md)\n` +
                `- [Foundation 完整模块索引](foundation-index.md)\n\n` +
                `## 继续细分\n\n` +
                `- 无独立进程的能力放入 \`capabilities/<domain>/features/<feature>/\`。\n` +
                `- 独立运行进程应在子系统的 \`processes/<process>/\` 建立节点。\n`);
        }

        const componentCounts = categoryCounts(component.modules);
        const sourcePrefix = '../../../../../../';
        const indexLines = [
            `# ${component.component}：Foundation 完整模块索引`,
            '',
            '> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。',
            '',
            `[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)`,
            '',
            '## 部件元数据',
            '',
            '| 属性 | 值 |',
            '| --- | --- |',
            `| subsystem | \`${component.subsystem}\` |`,
            `| component | \`${component.component}\` |`,
            `| Git 子仓 | \`${component.repositoryPath}\` |`,
            `| bundle | [${component.bundlePath}](${sourcePrefix}${component.bundlePath}) |`,
            `| rk3568 selected | ${component.selected ? 'yes' : 'no'} |`,
            `| adapted systems | ${component.adaptedSystemTypes || '-'} |`,
            `| component dependencies | ${component.componentDeps.length} |`,
            `| third-party dependencies | ${component.thirdPartyDeps.length} |`,
            `| declared sub_component | ${component.subComponentTargets.length} |`,
            `| inner kits | ${component.innerKitCount} |`,
            `| declared test entries | ${component.testEntries.length} |`,
            '',
            '## 依赖',
            '',
            `组件依赖：${component.componentDeps.length ? component.componentDeps.map((item) => `\`${item}\``).join(', ') : '无声明'}`,
            '',
            `三方依赖：${component.thirdPartyDeps.length ? component.thirdPartyDeps.map((item) => `\`${item}\``).join(', ') : '无声明'}`,
            '',
            '## 声明构建入口',
            '',
            ...(component.subComponentTargets.length ? component.subComponentTargets.map((item) => `- \`${item}\``) : ['- 无']),
            '',
            '## 声明测试入口',
            '',
            ...(component.testEntries.length ? component.testEntries.map((item) => `- \`${item}\``) : ['- 无']),
            '',
            '## GN 目标汇总',
            '',
            '| 分类 | 数量 |',
            '| --- | ---: |',
            `| production | ${componentCounts.production} |`,
            `| test | ${componentCounts.test} |`,
            `| build-support | ${componentCounts['build-support']} |`,
            `| aggregate-codegen | ${componentCounts['aggregate-codegen']} |`,
            `| total | ${component.modules.length} |`,
            '',
            '## 全部静态目标',
            '',
            '| 分类 | 类型 | GN label | BUILD.gn | 行 |',
            '| --- | --- | --- | --- | ---: |',
        ];
        for (const module of component.modules) {
            indexLines.push(`| ${module.category} | \`${markdownEscape(module.type)}\` | ` +
                `\`${markdownEscape(module.label)}\` | ` +
                `[${markdownEscape(module.buildFile)}](${sourcePrefix}${module.buildFile}) | ${module.line} |`);
        }
        indexLines.push('', '## 查询命令', '', '```bash',
            `awk -F '\\t' '$1 == "${component.subsystem}" && $2 == "${component.component}"' \
  specs/knowledge-base/generated/foundation/modules.tsv`,
            '```', '',
            '静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。', '');
        fs.writeFileSync(path.join(componentDir, 'foundation-index.md'), indexLines.join('\n'));
    }
}

const totalCounts = categoryCounts(modules);
const allBuildGnFiles = readLines(path.join(tmpDir, 'build-gn-files.txt'));
const repositoriesWithComponents = new Set(components.map((item) => item.repositoryPath).filter(Boolean));
const repositoriesWithTargets = new Set(modules.map((item) => item.repositoryPath).filter(Boolean));
const summary = {
    generatedAt: new Date().toISOString(),
    sourceDomain: 'foundation',
    repositories: projects.length,
    components: components.length,
    subsystems: [...new Set(components.map((item) => item.subsystem))].length,
    rk3568SelectedComponents: components.filter((item) => item.selected).length,
    buildGnFiles: allBuildGnFiles.length,
    buildGnFilesWithLiteralTargets: new Set(modules.map((item) => item.buildFile)).size,
    literalGnTargets: modules.length,
    mappedTargets: modules.length - unmapped.length,
    unmappedTargets: unmapped.length,
    repositoryCoverage: {
        componentAndTargets: projects.filter((item) =>
            repositoriesWithComponents.has(item.path) && repositoriesWithTargets.has(item.path)).length,
        repositoryTargetsOnly: projects.filter((item) =>
            !repositoriesWithComponents.has(item.path) && repositoriesWithTargets.has(item.path)).length,
        repositoryOnly: projects.filter((item) =>
            !repositoriesWithComponents.has(item.path) && !repositoriesWithTargets.has(item.path)).length,
        componentOnly: projects.filter((item) =>
            repositoriesWithComponents.has(item.path) && !repositoriesWithTargets.has(item.path)).length,
    },
    categories: totalCounts,
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
NODE

printf 'generated Foundation index under %s\n' "$OUT_DIR"
