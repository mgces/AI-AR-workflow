#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
OUT_DIR="$ROOT_DIR/specs/knowledge-base/generated"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

repo list 2>/dev/null | while IFS= read -r line; do
    project_path=${line%% : *}
    repository=${line#* : }
    branch=$(git -C "$project_path" symbolic-ref --short -q HEAD || printf DETACHED)
    head=$(git -C "$project_path" rev-parse HEAD)
    stats=$(git -C "$project_path" status --porcelain=v1 | awk '
        {
            total++
            x = substr($0, 1, 1)
            y = substr($0, 2, 1)
            if (x == "?" && y == "?") {
                untracked++
            } else {
                if (x != " ") staged++
                if (y != " ") unstaged++
            }
        }
        END {
            printf "%d\t%d\t%d\t%d", total + 0, staged + 0, unstaged + 0, untracked + 0
        }')
    printf '%s\t%s\t%s\t%s\t%s\n' \
        "$project_path" "$repository" "$head" "$branch" "$stats"
done > "$TMP_DIR/projects.tsv"

{
    printf 'path\trepository\thead\tbranch\tchanged_entries\tstaged\tunstaged\tuntracked\n'
    LC_ALL=C sort -t $'\t' -k1,1 "$TMP_DIR/projects.tsv"
} > "$OUT_DIR/projects.tsv"

rg --files \
    -g 'bundle.json' \
    -g '!out/**' \
    -g '!prebuilts/**' \
    -g '!**/node_modules/**' \
    > "$TMP_DIR/bundles.txt"

rg --files \
    -g '!out/**' \
    -g '!prebuilts/**' \
    -g '!.repo/**' \
    -g '!**/node_modules/**' \
    > "$TMP_DIR/files.txt"

node - "$ROOT_DIR" "$TMP_DIR" "$OUT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const tmpDir = process.argv[3];
const outDir = process.argv[4];

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

function list(value)
{
    return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

const projectRows = readLines(path.join(tmpDir, 'projects.tsv')).map((line) => {
    const fields = line.split('\t');
    return {
        path: fields[0],
        repository: fields[1],
        head: fields[2],
        branch: fields[3],
        changedEntries: Number(fields[4]),
        staged: Number(fields[5]),
        unstaged: Number(fields[6]),
        untracked: Number(fields[7]),
    };
});

const bundleFiles = readLines(path.join(tmpDir, 'bundles.txt'));
const components = [];
let dependencyEdges = 0;
let innerKitEntries = 0;
let subComponentTargets = 0;
let testEntries = 0;

for (const bundlePath of bundleFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(rootDir, bundlePath), 'utf8'));
    const component = data.component || {};
    const deps = component.deps || {};
    const build = component.build || {};
    const componentDeps = list(deps.components);
    const thirdPartyDeps = list(deps.third_party);
    const subComponents = list(build.sub_component);
    const innerKits = Array.isArray(build.inner_kits) ? build.inner_kits : [];
    const tests = list(build.test);

    dependencyEdges += componentDeps.length;
    innerKitEntries += innerKits.length;
    subComponentTargets += subComponents.length;
    testEntries += tests.length;

    components.push({
        subsystem: clean(component.subsystem),
        component: clean(component.name),
        path: bundlePath,
        adaptedSystemTypes: list(component.adapted_system_type),
        componentDeps,
        thirdPartyDeps,
        subComponents,
        innerKitCount: innerKits.length,
        tests,
    });
}

components.sort((a, b) =>
    a.subsystem.localeCompare(b.subsystem) ||
    a.component.localeCompare(b.component) ||
    a.path.localeCompare(b.path));

const componentLines = [[
    'subsystem',
    'component',
    'bundle_path',
    'adapted_system_types',
    'component_dependency_count',
    'component_dependencies',
    'third_party_dependency_count',
    'third_party_dependencies',
    'sub_component_target_count',
    'sub_component_targets',
    'inner_kit_count',
    'test_entry_count',
    'test_entries',
].join('\t')];

for (const item of components) {
    componentLines.push([
        item.subsystem,
        item.component,
        item.path,
        item.adaptedSystemTypes.join(','),
        item.componentDeps.length,
        item.componentDeps.join(','),
        item.thirdPartyDeps.length,
        item.thirdPartyDeps.join(','),
        item.subComponents.length,
        item.subComponents.join(','),
        item.innerKitCount,
        item.tests.length,
        item.tests.join(','),
    ].map(clean).join('\t'));
}
fs.writeFileSync(path.join(outDir, 'components.tsv'), componentLines.join('\n') + '\n');

const partsPath = path.join(rootDir, 'out/preloader/rk3568/parts.json');
const effectiveParts = fs.existsSync(partsPath) ?
    JSON.parse(fs.readFileSync(partsPath, 'utf8')).parts || [] : [];
effectiveParts.sort();
const partLines = ['subsystem\tcomponent\tpart'];
for (const part of effectiveParts) {
    const splitAt = part.indexOf(':');
    const subsystem = splitAt >= 0 ? part.slice(0, splitAt) : '';
    const component = splitAt >= 0 ? part.slice(splitAt + 1) : part;
    partLines.push([subsystem, component, part].map(clean).join('\t'));
}
fs.writeFileSync(path.join(outDir, 'rk3568-parts.tsv'), partLines.join('\n') + '\n');

const visibleFiles = readLines(path.join(tmpDir, 'files.txt'));
const filesByTopLevel = {};
const filesByExtension = {};
for (const filePath of visibleFiles) {
    const topLevel = filePath.split('/')[0];
    filesByTopLevel[topLevel] = (filesByTopLevel[topLevel] || 0) + 1;
    const base = path.basename(filePath);
    const dot = base.lastIndexOf('.');
    const extension = dot > 0 ? base.slice(dot).toLowerCase() : '[no_ext]';
    filesByExtension[extension] = (filesByExtension[extension] || 0) + 1;
}

const projectsByTopLevel = {};
for (const project of projectRows) {
    const topLevel = project.path.split('/')[0];
    projectsByTopLevel[topLevel] = (projectsByTopLevel[topLevel] || 0) + 1;
}

const componentsBySubsystem = {};
const incomingDependencies = {};
for (const component of components) {
    componentsBySubsystem[component.subsystem] =
        (componentsBySubsystem[component.subsystem] || 0) + 1;
    for (const dependency of component.componentDeps) {
        incomingDependencies[dependency] = (incomingDependencies[dependency] || 0) + 1;
    }
}

const partsBySubsystem = {};
for (const part of effectiveParts) {
    const subsystem = part.split(':', 1)[0];
    partsBySubsystem[subsystem] = (partsBySubsystem[subsystem] || 0) + 1;
}

function topEntries(object, limit)
{
    return Object.entries(object)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
}

const buildConfigPath = path.join(rootDir, 'out/preloader/rk3568/build_config.json');
const buildConfig = fs.existsSync(buildConfigPath) ?
    JSON.parse(fs.readFileSync(buildConfigPath, 'utf8')) : null;

const summary = {
    generatedAt: new Date().toISOString(),
    workspaceRoot: rootDir,
    projects: {
        total: projectRows.length,
        dirty: projectRows.filter((item) => item.changedEntries > 0).length,
        detached: projectRows.filter((item) => item.branch === 'DETACHED').length,
        nonDetachedBranches: projectRows
            .filter((item) => item.branch !== 'DETACHED')
            .map((item) => ({ path: item.path, branch: item.branch, head: item.head })),
        byTopLevel: topEntries(projectsByTopLevel, Number.MAX_SAFE_INTEGER),
    },
    source: {
        visibleFiles: visibleFiles.length,
        byTopLevel: topEntries(filesByTopLevel, Number.MAX_SAFE_INTEGER),
        topExtensions: topEntries(filesByExtension, 100),
    },
    components: {
        bundleFiles: bundleFiles.length,
        total: components.length,
        subsystemCount: Object.keys(componentsBySubsystem).length,
        dependencyEdges,
        innerKitEntries,
        subComponentTargets,
        testEntries,
        bySubsystem: topEntries(componentsBySubsystem, Number.MAX_SAFE_INTEGER),
        mostReferencedDependencies: topEntries(incomingDependencies, 100),
    },
    rk3568: {
        buildConfig,
        effectiveParts: effectiveParts.length,
        effectiveSubsystems: Object.keys(partsBySubsystem).length,
        partsBySubsystem: topEntries(partsBySubsystem, Number.MAX_SAFE_INTEGER),
    },
};

fs.writeFileSync(
    path.join(outDir, 'workspace-summary.json'),
    JSON.stringify(summary, null, 2) + '\n');
NODE

printf 'generated %s\n' "$OUT_DIR/projects.tsv"
printf 'generated %s\n' "$OUT_DIR/components.tsv"
printf 'generated %s\n' "$OUT_DIR/rk3568-parts.tsv"
printf 'generated %s\n' "$OUT_DIR/workspace-summary.json"
