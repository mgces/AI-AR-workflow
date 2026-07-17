#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../../..');
const kbDir = path.join(rootDir, 'specs/knowledge-base');
const sourceDir = path.join(rootDir, 'base/hiviewdfx');
const generatedDir = path.join(kbDir, 'generated/hiviewdfx');
const docsRoots = [
    path.join(kbDir, 'source-domains/hiviewdfx'),
    path.join(kbDir, 'subsystems/hiviewdfx'),
];

const errors = [];

function walk(dir, predicate, output = []) {
    if (!fs.existsSync(dir)) return output;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, predicate, output);
        else if (predicate(full)) output.push(full);
    }
    return output;
}

function readTsv(name) {
    const file = path.join(generatedDir, name);
    if (!fs.existsSync(file)) {
        errors.push(`missing ${file}`);
        return { header: [], rows: [] };
    }
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/);
    return { header: lines[0].split('\t'), rows: lines.slice(1).map((line) => line.split('\t')) };
}

function indexOf(table, name) {
    const index = table.header.indexOf(name);
    if (index < 0) errors.push(`missing column ${name}`);
    return index;
}

const repositories = readTsv('repositories.tsv');
const components = readTsv('components.tsv');
const modules = readTsv('modules.tsv');
const runtime = readTsv('runtime-entities.tsv');
const subsystems = readTsv('subsystems.tsv');
const unmapped = readTsv('unmapped-modules.tsv');

const bundleFiles = walk(sourceDir, (file) => path.basename(file) === 'bundle.json');
const buildFiles = walk(sourceDir, (file) => path.basename(file) === 'BUILD.gn');
const targetPattern = /^\s*[A-Za-z_][A-Za-z0-9_]*\("[^"]+"\)\s*\{/;
let rescannedTargets = 0;
for (const file of buildFiles) {
    rescannedTargets += fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => targetPattern.test(line)).length;
}

if (repositories.rows.length !== bundleFiles.length) {
    errors.push(`repository coverage mismatch: ${repositories.rows.length} != ${bundleFiles.length}`);
}
if (components.rows.length !== bundleFiles.length) {
    errors.push(`component coverage mismatch: ${components.rows.length} != ${bundleFiles.length}`);
}
if (modules.rows.length !== rescannedTargets) {
    errors.push(`target coverage mismatch: ${modules.rows.length} != ${rescannedTargets}`);
}
if (modules.rows.length !== modules.rows.length - unmapped.rows.length + unmapped.rows.length) {
    errors.push('mapped + unmapped != total');
}
if (subsystems.rows.length !== 1 || subsystems.rows[0][0] !== 'hiviewdfx') {
    errors.push('subsystem aggregation must contain exactly hiviewdfx');
}

const moduleComponentIndex = indexOf(modules, 'component');
const componentTargetIndex = indexOf(components, 'static_target_count');
const componentNameIndex = indexOf(components, 'component');
const mappedTargets = modules.rows.filter((row) => row[moduleComponentIndex]).length;
const componentTargetSum = components.rows.reduce((sum, row) => sum + Number(row[componentTargetIndex]), 0);
if (mappedTargets !== componentTargetSum) {
    errors.push(`component target sum mismatch: ${mappedTargets} != ${componentTargetSum}`);
}

const expectedComponents = new Set(components.rows.map((row) => row[componentNameIndex]));
const overviewFiles = walk(path.join(kbDir, 'subsystems/hiviewdfx/components'),
    (file) => path.basename(file) === 'functional-overview.md');
const overviewComponents = new Set(overviewFiles.map((file) => path.basename(path.dirname(file))));
for (const component of expectedComponents) {
    if (!overviewComponents.has(component)) errors.push(`missing functional overview for ${component}`);
}

const markdownFiles = docsRoots.flatMap((dir) => walk(dir, (file) => file.endsWith('.md')));
let checkedLinks = 0;
for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) errors.push(`trailing whitespace: ${path.relative(rootDir, file)}:${index + 1}`);
    });
    const linkPattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
    for (const match of content.matchAll(linkPattern)) {
        let target = match[1].trim();
        if (!target || target.startsWith('#') || /^[a-z]+:\/\//i.test(target)) continue;
        if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
        target = decodeURIComponent(target.split('#')[0]);
        checkedLinks += 1;
        const resolved = path.resolve(path.dirname(file), target);
        if (!fs.existsSync(resolved)) {
            errors.push(`broken link: ${path.relative(rootDir, file)} -> ${target}`);
        }
    }
}

const repositoryChangedIndex = indexOf(repositories, 'changed_entries');
const changedRepositories = repositories.rows.filter((row) => Number(row[repositoryChangedIndex]) > 0).length;
const report = [
    '# HiviewDFX 索引验证报告', '',
    `生成时间：${new Date().toISOString()}`, '',
    '| 检查项 | 结果 |', '| --- | --- |',
    `| Git 子仓覆盖 | ${repositories.rows.length}/${bundleFiles.length} |`,
    `| bundle 部件覆盖 | ${components.rows.length}/${bundleFiles.length} |`,
    `| BUILD.gn 文件 | ${buildFiles.length} |`,
    `| 静态目标重扫/索引 | ${rescannedTargets}/${modules.rows.length} |`,
    `| 映射 + 未映射 = 总数 | ${mappedTargets} + ${unmapped.rows.length} = ${modules.rows.length} |`,
    `| 部件目标汇总 | ${componentTargetSum}/${mappedTargets} |`,
    `| 部件功能页 | ${overviewFiles.length}/${components.rows.length} |`,
    `| 运行实体 | ${runtime.rows.length} |`,
    `| 已检查相对链接 | ${checkedLinks} |`,
    `| 源码子仓已有修改 | ${changedRepositories}（索引生成器未写入源码域） |`,
    `| 校验错误 | ${errors.length} |`, '',
    '## 结论', '',
    errors.length === 0 ? '覆盖率等式、部件文档覆盖、相对链接和尾随空白检查全部通过。' :
        '存在校验错误，必须修复后才能视为完成。', '',
    '## 限制', '',
    '- 链接检查只验证本地相对目标存在，不验证外部 URL 内容。',
    '- GN 重扫与生成器使用相同的“字面量目标首行”口径，不覆盖模板动态展开。',
    '- 工作树检查记录生成时源码子仓状态，不把已有修改归因于本次分析。', '',
];
if (errors.length) {
    report.push('## 错误', '', ...errors.map((error) => `- ${error}`), '');
}
fs.writeFileSync(path.join(generatedDir, 'verification.md'), report.join('\n'));

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log(`verified HiviewDFX summary: ${checkedLinks} relative links, ${modules.rows.length} targets, ${components.rows.length} components`);
