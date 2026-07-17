#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../../..');
const kbDir = path.join(rootDir, 'specs/knowledge-base');
const sourcePath = 'base/hiviewdfx';
const sourceDir = path.join(rootDir, sourcePath);
const outDir = path.join(kbDir, 'generated/hiviewdfx');
const subsystemDir = path.join(kbDir, 'subsystems/hiviewdfx');
const sourceDomainDir = path.join(kbDir, 'source-domains/hiviewdfx');

if (!fs.existsSync(sourceDir)) {
    throw new Error(`source path does not exist: ${sourceDir}`);
}

const profiles = {
    api_metrics: {
        problem: '为系统框架提供低开销 API 调用直方图采集、持久化和聚合查询能力，支撑接口使用频次与耗时分析。',
        callers: '需要记录 API 指标的系统部件通过 Histogram/管理接口写入，维测侧从关系型存储读取聚合结果。',
        capabilities: ['直方图定义与采样', '异步批量写入与数据库管理', '指标查询、清理与生命周期控制'],
        chain: 'framework caller -> Histogram API -> HistogramManager -> FFRT task -> relational store',
        risks: '高频埋点开销、异步任务生命周期、数据库膨胀与并发写入。',
    },
    blackbox_lite: {
        problem: '面向 LiteOS-M 小型设备记录重启、异常和崩溃现场，形成可在下次启动读取的黑匣子信息。',
        callers: '内核或设备适配层在故障路径写入异常信息，启动或诊断流程读取持久化记录。',
        capabilities: ['异常信息注册与采集', '重启原因和故障上下文保存', '平台适配与恢复后读取'],
        chain: 'kernel/platform fault hook -> blackbox adapter -> persistent fault record -> boot-time diagnosis',
        risks: '异常上下文可重入性、掉电一致性、有限存储空间和平台适配差异。',
    },
    faultloggerd: {
        problem: '统一处理 native 崩溃、主动 dump、远程进程栈获取和故障日志落盘，并提供可靠的栈回溯基础库。',
        callers: '信号处理器、DumpCatcher、Hiview 故障插件及调试工具通过客户端协议请求 faultloggerd/processdump。',
        capabilities: ['崩溃信号接管与进程转储', '跨进程堆栈抓取与符号化', 'unwinder/backtrace/stack formatter 基础能力', '故障日志生成、校验和查询'],
        chain: 'crashing process or DumpCatcher -> faultloggerd socket -> processdump/unwinder -> fault log -> Hiview',
        risks: '故障现场的异步信号安全、ptrace/权限边界、恶意 PID/fd 输入、超时和大栈内存消耗。',
    },
    hiappevent: {
        problem: '向应用提供行为、性能和故障事件打点接口，并管理事件写入、观察、存储与上报配置。',
        callers: 'ArkTS、ANI、Cangjie、NDK 和 native 应用接口调用者写入应用事件或注册观察者。',
        capabilities: ['多语言应用事件 API', '事件参数校验与编码', '观察者、处理器与配置管理', '本地存储、导出和上报协作'],
        chain: 'application API -> language binding -> native event framework -> local store/observer -> Hiview or analytics consumer',
        risks: '隐私数据与事件配额、应用生命周期、回调并发、磁盘占用和跨语言参数一致性。',
    },
    hichecker: {
        problem: '在应用和框架运行时检测耗时调用、线程误用、资源泄漏等违规行为，并输出可定位的告警或故障事件。',
        callers: 'ArkUI、运行时和应用调试代码通过 native/ArkTS 接口启停规则或接收检测结果。',
        capabilities: ['规则开关与违规检测', '调用栈及线程上下文采集', 'JS 泄漏观察', '告警日志和系统事件上报'],
        chain: 'runtime/framework hook -> HiChecker rule engine -> stack/context capture -> HiLog/HiSysEvent',
        risks: '检测探针对性能的扰动、误报、跨线程状态同步、生产与调试开关差异。',
    },
    hicollie: {
        problem: '为应用和系统服务提供超时、卡死与线程阻塞监测，在异常时采样堆栈、上报事件并按策略恢复。',
        callers: '应用、系统服务、FFRT 任务和事件循环通过 watchdog、timer 或 NDK/Rust 接口注册监控。',
        capabilities: ['超时定时器与任务看护', '线程/事件循环卡死检测', '线程采样和堆栈抓取', '故障上报及恢复策略'],
        chain: 'watched task/thread -> HiCollie timer/watchdog -> thread sampler/faultloggerd -> HiSysEvent/recovery action',
        risks: '误杀与误报、看门狗线程饥饿、回调重入、采样权限和恢复动作副作用。',
    },
    hidumper: {
        problem: '提供统一的系统维测转储入口，将命令行请求路由到 System Ability、进程和注册插件并汇总输出。',
        callers: '开发者和测试人员使用 hidumper 命令，系统服务通过 Dump 接口或 hidumper client 响应查询。',
        capabilities: ['命令解析与目标发现', 'SA/进程 dump 调度', '插件化 CPU/内存等信息采集', '输出、超时和权限控制'],
        chain: 'hidumper CLI -> hidumper client -> SA 1212 service -> target SA/process/plugin -> formatted output',
        risks: 'shell 权限扩大、敏感信息泄露、阻塞目标服务、超大输出、插件超时与 fd 生命周期。',
    },
    hidumper_lite: {
        problem: '为轻量设备提供命令注册、参数解析和系统/服务诊断信息输出框架。',
        callers: 'LiteOS-M shell 或测试工具调用 hidumper 命令，部件通过适配接口注册自身 dump 项。',
        capabilities: ['轻量命令分发', '系统信息转储', '服务自定义 dump 注册'],
        chain: 'lite shell -> hidumper command -> registered dump handler -> console output',
        risks: '命令权限、缓冲区边界、并发注册与小内存设备输出规模。',
    },
    hievent_lite: {
        problem: '为轻量设备提供结构化故障/行为事件构造、参数附加和上报接口。',
        callers: 'Lite 系统服务使用 C 接口创建事件并交由 hiview_lite 处理。',
        capabilities: ['事件对象与参数管理', '文件路径等附件描述', '事件序列化和 Hiview Lite 上报'],
        chain: 'lite service -> HiEvent API -> event encode -> hiview_lite event pipeline',
        risks: '固定缓冲区、事件大小限制、字符串所有权和异常路径内存安全。',
    },
    hilog: {
        problem: '提供系统统一日志写入、过滤、缓存、读取、持久化和命令行控制能力。',
        callers: 'native、NDK、Rust、ArkTS、ANI、Cangjie 及沙箱调用者写日志；hilog 工具和诊断服务读取日志。',
        capabilities: ['多语言日志 API 与格式化', 'hilogd 缓冲区和流控', '日志查询、过滤、清理与持久化', '隐私格式与沙箱日志转发'],
        chain: 'application/service log API -> socket/transport -> hilogd buffers -> hilog reader/persistence',
        risks: '格式串与隐私标记、日志洪泛、环形缓冲并发、跨 UID 读取权限和启动早期日志。',
    },
    hilog_lite: {
        problem: '为 mini/small 设备提供裁剪后的日志 API、服务和 apphilogcat 读取工具。',
        callers: 'LiteOS 组件、ACE Lite 和设备服务通过静态或共享库写入日志。',
        capabilities: ['mini/featured 日志前端', '轻量日志缓存与输出', 'apphilogcat 命令读取', 'JS Lite 适配'],
        chain: 'lite component -> hilog lite API -> lite log service/buffer -> apphilogcat or platform output',
        risks: '小内存缓存、格式化边界、不同系统类型实现差异和日志丢弃策略。',
    },
    hisysevent: {
        problem: '提供系统级结构化事件的定义、参数校验、写入、订阅和查询能力，是系统可观测数据的统一入口。',
        callers: '系统服务通过 native/Rust/ArkTS/ANI 接口写事件，Hiview 和管理接口消费、订阅或查询事件。',
        capabilities: ['事件 schema 与代码生成', '多语言事件写入和校验', '事件订阅/查询管理', 'IPC 传输及落盘协作'],
        chain: 'system service -> HiSysEvent API/schema -> transport -> Hiview sysevent source/store -> query/listener',
        risks: 'schema 兼容、敏感字段、事件洪泛、IPC 调用者校验、订阅回调生命周期。',
    },
    hitrace: {
        problem: '提供跨线程/跨进程调用链标识、用户态 TraceMeter 打点以及系统 trace 抓取和控制工具。',
        callers: '应用和系统框架通过 native/NDK/Rust/Cangjie/ArkTS 接口埋点，开发者使用 hitrace 命令采集。',
        capabilities: ['HiTraceChain 调用链传播', '同步/异步 TraceMeter 打点', 'trace 分类与开关管理', '抓取、压缩和 boot trace'],
        chain: 'instrumented caller -> HiTraceChain/TraceMeter -> kernel/user trace buffers -> hitrace command -> trace file',
        risks: '链路 ID 传播正确性、热路径开销、trace 缓冲和文件空间、特权 trace 数据暴露。',
    },
    hiview: {
        problem: '作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。',
        callers: 'HiSysEvent、faultloggerd、HiAppEvent、系统服务和性能采集器向 Hiview 投递数据，诊断接口和后台任务消费结果。',
        capabilities: ['插件加载、事件循环和流水线编排', '故障日志与可靠性分析', '系统事件存储、查询和导出', '性能/功耗/统一采集与 xperf 服务', '日志库、故障接口和维测检索'],
        chain: 'event/fault producer -> Hiview source plugin -> pipeline/plugin -> store/analysis/export/recovery',
        risks: '高权限插件边界、事件队列背压、插件生命周期和并发、磁盘配额、隐私数据与恢复动作。',
    },
    hiview_lite: {
        problem: '为 mini 设备提供轻量事件队列、插件化处理和故障/日志维测基础框架。',
        callers: 'hievent_lite、hilog_lite、blackbox_lite 及设备服务向框架提交事件。',
        capabilities: ['轻量事件对象和队列', '插件注册与分发', '文件/缓存适配', '故障事件处理'],
        chain: 'lite DFX producer -> hiview_lite event queue -> registered plugin -> storage/output',
        risks: '静态资源上限、队列溢出、插件回调阻塞和平台文件系统差异。',
    },
    hiviewdfx_cangjie_wrapper: {
        problem: '将 HiLog、HiAppEvent、HiTraceMeter 等 DFX 能力封装为仓颉 API，并组成 PerformanceAnalysisKit。',
        callers: '仓颉应用和框架通过 ohos.hilog、ohos.hiviewdfx.hi_app_event、ohos.hi_trace_meter 等包调用。',
        capabilities: ['HiLog 仓颉封装', 'HiAppEvent 仓颉封装', 'HiTraceMeter 仓颉封装', 'PerformanceAnalysisKit 聚合导出'],
        chain: 'Cangjie caller -> wrapper package -> Cangjie Ark interop/FFI -> native hiviewdfx component',
        risks: '跨语言类型和异常映射、字符串生命周期、API 版本一致性和底层能力裁剪差异。',
    },
};

const curatedRuntime = [
    ['faultloggerd', 'faultloggerd', 'daemon', 'faultloggerd', '', 'base/hiviewdfx/faultloggerd/services/config/faultloggerd.cfg', 'faultloggerd', 'system,log,faultloggerd,readproc', 'u:r:faultloggerd:s0', 'init cfg', 'confirmed'],
    ['faultloggerd', 'processdump', 'helper-executable', 'processdump', '', 'base/hiviewdfx/faultloggerd/tools/process_dump/BUILD.gn', '', '', '', 'production executable used by crash/dump flow', 'confirmed'],
    ['hilog', 'hilogd', 'daemon', 'hilogd', '', 'base/hiviewdfx/hilog/services/hilogd/etc/hilogd.cfg', 'logd', 'log,system,readproc', 'u:r:hilogd:s0', 'init cfg', 'confirmed'],
    ['hilog', 'hilog', 'command', 'hilog', '', 'base/hiviewdfx/hilog/services/hilogtool/BUILD.gn', 'shell', '', '', 'production executable', 'confirmed'],
    ['hisysevent', 'hisysevent', 'command', 'hisysevent', '', 'base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn', 'shell', '', '', 'production executable', 'confirmed'],
    ['hitrace', 'hitrace', 'command', 'hitrace', '', 'base/hiviewdfx/hitrace/cmd/BUILD.gn', 'shell', '', '', 'production executable and boot-trace config', 'confirmed'],
    ['hidumper', 'hidumper', 'command', 'hidumper', '', 'base/hiviewdfx/hidumper/frameworks/native/BUILD.gn', 'shell', '', '', 'production executable', 'confirmed'],
    ['hidumper', 'hidumper_service', 'system-ability', 'sa_main + hidumper_service profile', '1212', 'base/hiviewdfx/hidumper/sa_profile/1212.json; base/hiviewdfx/hidumper/services/native/etc/hidumper_service.cfg', '1212', 'shell,readproc,1212,access_token,system', 'u:r:hidumper_service:s0', 'SA profile and init cfg', 'confirmed'],
    ['hiview', 'hiview', 'daemon', 'hiview', '', 'base/hiviewdfx/hiview/service/config/hiview.cfg', 'hiview', 'system,log,hiview,readproc,file_manager,radio,hmi_host,shader_cache,shell', 'u:r:hiview:s0', 'init cfg', 'confirmed'],
    ['hiview', 'xperf_service', 'system-ability', 'sa_main + xperf_service profile', '8600', 'base/hiviewdfx/hiview/plugins/performance/xperf_service/sa_profile/8600.json; base/hiviewdfx/hiview/plugins/performance/xperf_service/sa_profile/xperf_service.cfg', 'hiview', 'hiview,shell', '', 'SA profile and init cfg', 'confirmed'],
    ['hiview', 'usage_report', 'helper-executable', 'usage_report', '', 'base/hiviewdfx/hiview/plugins/usage_event_report/service/BUILD.gn', '', '', '', 'production executable; start relationship requires product integration review', 'inferred'],
    ['hiview', 'analysis_faultlog', 'command', 'analysis_faultlog', '', 'base/hiviewdfx/hiview/utility/analysis_faultlog/BUILD.gn', 'shell', '', '', 'production diagnostic executable', 'confirmed'],
];

function rel(file) {
    return path.relative(rootDir, file).split(path.sep).join('/');
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function clean(value) {
    return String(value ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function list(value) {
    return Array.isArray(value) ? value : [];
}

function walk(dir, predicate, output = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'out' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, predicate, output);
        else if (predicate(full)) output.push(full);
    }
    return output;
}

function git(repo, args, fallback = '') {
    try {
        return clean(execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }));
    } catch {
        return fallback;
    }
}

function safeName(value) {
    return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function targetCategory(type, name, buildFile) {
    const t = type.toLowerCase();
    const n = name.toLowerCase();
    if (t === 'config' || t === 'template') return 'build-support';
    if (t.includes('test') || n.includes('test') || n.includes('fuzz') || n.includes('crasher') ||
        n.includes('validator') || /\/(test|tests|example|examples)\//.test(buildFile)) return 'test';
    if (t === 'group' || t === 'action' || t === 'action_foreach' || t.includes('copy') ||
        t.startsWith('generate_') || t.startsWith('gen_') || t.includes('resource') || t.includes('asset')) {
        return 'aggregate-codegen';
    }
    return 'production';
}

function writeTsv(file, header, rows) {
    const text = [header, ...rows].map((row) => row.map(clean).join('\t')).join('\n') + '\n';
    fs.writeFileSync(file, text);
}

function countBy(items, key) {
    const result = {};
    for (const item of items) result[item[key]] = (result[item[key]] ?? 0) + 1;
    return result;
}

function markdown(value) {
    return clean(value).replace(/\|/g, '\\|');
}

function linkFrom(docFile, target) {
    let relative = path.relative(path.dirname(docFile), path.join(rootDir, target)).split(path.sep).join('/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return relative;
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(subsystemDir, { recursive: true });
fs.mkdirSync(sourceDomainDir, { recursive: true });

const selectedParts = new Set();
const partsFile = path.join(kbDir, 'generated/rk3568-parts.tsv');
if (fs.existsSync(partsFile)) {
    for (const line of fs.readFileSync(partsFile, 'utf8').trim().split(/\r?\n/).slice(1)) {
        selectedParts.add(line.split('\t')[2]);
    }
}

const components = [];
for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const repoDir = path.join(sourceDir, entry.name);
    const bundleFile = path.join(repoDir, 'bundle.json');
    if (!fs.existsSync(bundleFile)) continue;
    const bundle = readJson(bundleFile);
    const c = bundle.component ?? {};
    const build = c.build ?? {};
    const innerKits = list(build.inner_kits);
    const features = Array.isArray(c.features) ? c.features.map((name) => ({ name, value: 'bundle 未声明默认值' })) :
        Object.entries(c.features ?? {}).map(([name, value]) => ({ name, value: JSON.stringify(value) }));
    const component = {
        subsystem: c.subsystem || 'unmapped',
        name: c.name || entry.name,
        dir: rel(repoDir),
        bundleFile: rel(bundleFile),
        description: clean(bundle.description || c.description) || profiles[c.name || entry.name]?.problem || '',
        adapted: list(c.adapted_system_type),
        syscaps: list(c.syscap),
        features,
        componentDeps: list(c.deps?.components),
        thirdPartyDeps: list(c.deps?.third_party),
        innerKits,
        subComponents: list(build.sub_component),
        tests: list(build.test),
        selected: selectedParts.has(`${c.subsystem}:${c.name}`),
        modules: [],
    };
    components.push(component);
}
components.sort((a, b) => a.name.localeCompare(b.name));

const repositories = components.map((component) => ({
    subsystem: component.subsystem,
    path: component.dir,
    repository: git(path.join(rootDir, component.dir), ['config', '--get', 'remote.origin.url'], component.dir)
        .replace(/^.*[/:]openharmony\//, '').replace(/\.git$/, '') || component.dir,
    head: git(path.join(rootDir, component.dir), ['rev-parse', 'HEAD']),
    branch: git(path.join(rootDir, component.dir), ['branch', '--show-current'], 'DETACHED') || 'DETACHED',
    changedEntries: git(path.join(rootDir, component.dir), ['status', '--short']).split(/\s*\n\s*/).filter(Boolean).length,
    component,
}));

const buildFiles = walk(sourceDir, (file) => path.basename(file) === 'BUILD.gn').sort();
const modules = [];
const targetPattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)\("([^"]+)"\)\s*\{/;
for (const file of buildFiles) {
    const buildFile = rel(file);
    const component = components.filter((item) => buildFile === item.dir || buildFile.startsWith(`${item.dir}/`))
        .sort((a, b) => b.dir.length - a.dir.length)[0];
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
        const match = line.match(targetPattern);
        if (!match) return;
        const buildDir = path.posix.dirname(buildFile);
        const module = {
            subsystem: component?.subsystem || 'unmapped',
            component: component?.name || '',
            repositoryPath: component?.dir || '',
            buildFile,
            line: index + 1,
            type: match[1],
            name: match[2],
            label: `//${buildDir}:${match[2]}`,
            category: targetCategory(match[1], match[2], buildFile),
            mappingMethod: component ? 'bundle-prefix' : 'unmapped',
        };
        modules.push(module);
        if (component) component.modules.push(module);
    });
}
modules.sort((a, b) => a.component.localeCompare(b.component) || a.buildFile.localeCompare(b.buildFile) || a.line - b.line);
const unmapped = modules.filter((item) => !item.component);

const runtimeEntities = curatedRuntime.map((row) => ({
    subsystem: 'hiviewdfx', component: row[0], process: row[1], type: row[2], executable: row[3],
    saId: row[4], config: row[5], uid: row[6], gid: row[7], selinux: row[8], evidence: row[9], confidence: row[10],
}));

writeTsv(path.join(outDir, 'repositories.tsv'),
    ['subsystem', 'path', 'repository', 'head', 'branch', 'changed_entries', 'component_count', 'static_target_count', 'coverage_status', 'mapping_method'],
    repositories.map((repo) => [repo.subsystem, repo.path, repo.repository, repo.head, repo.branch, repo.changedEntries, 1,
        repo.component.modules.length, repo.component.modules.length ? 'component-and-targets' : 'component-only', 'bundle-prefix']));

writeTsv(path.join(outDir, 'components.tsv'),
    ['subsystem', 'component', 'repository_path', 'metadata_path', 'product_selected', 'adapted_system_types', 'description',
        'syscap_count', 'feature_count', 'component_dependency_count', 'third_party_dependency_count', 'inner_kit_count',
        'runtime_entity_count', 'static_target_count', 'production_target_count', 'test_target_count'],
    components.map((c) => {
        const counts = countBy(c.modules, 'category');
        return [c.subsystem, c.name, c.dir, c.bundleFile, c.selected ? 'yes' : 'no', c.adapted.join(','), c.description,
            c.syscaps.length, c.features.length, c.componentDeps.length, c.thirdPartyDeps.length, c.innerKits.length,
            runtimeEntities.filter((e) => e.component === c.name).length, c.modules.length, counts.production ?? 0, counts.test ?? 0];
    }));

writeTsv(path.join(outDir, 'modules.tsv'),
    ['subsystem', 'component', 'repository_path', 'build_file', 'line', 'target_type', 'target_name', 'target_label', 'category', 'mapping_method'],
    modules.map((m) => [m.subsystem, m.component, m.repositoryPath, m.buildFile, m.line, m.type, m.name, m.label, m.category, m.mappingMethod]));

writeTsv(path.join(outDir, 'runtime-entities.tsv'),
    ['subsystem', 'component', 'process_or_app', 'entity_type', 'executable_or_package', 'sa_id', 'init_or_profile', 'uid', 'gid',
        'selinux_domain', 'source_evidence', 'mapping_confidence'],
    runtimeEntities.map((e) => [e.subsystem, e.component, e.process, e.type, e.executable, e.saId, e.config, e.uid, e.gid,
        e.selinux, e.evidence, e.confidence]));

writeTsv(path.join(outDir, 'subsystems.tsv'),
    ['subsystem', 'repository_count', 'component_count', 'product_selected_component_count', 'runtime_entity_count',
        'static_target_count', 'mapped_target_count', 'unmapped_target_count'],
    [['hiviewdfx', repositories.length, components.length, components.filter((c) => c.selected).length,
        runtimeEntities.length, modules.length, modules.length - unmapped.length, unmapped.length]]);

writeTsv(path.join(outDir, 'unmapped-modules.tsv'),
    ['subsystem', 'repository_path', 'build_file', 'line', 'target_type', 'target_name', 'target_label', 'category', 'reason'],
    unmapped.map((m) => [m.subsystem, m.repositoryPath, m.buildFile, m.line, m.type, m.name, m.label, m.category,
        'no bundle.json prefix or single-component repository mapping']));

function componentIndex(component) {
    const docDir = path.join(subsystemDir, 'components', safeName(component.name));
    fs.mkdirSync(docDir, { recursive: true });
    const docFile = path.join(docDir, 'hiviewdfx-index.md');
    const counts = countBy(component.modules, 'category');
    const lines = [
        `# ${component.name} 完整模块索引`, '',
        '> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。', '',
        '[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)', '',
        '## 元数据', '', '| 属性 | 值 |', '| --- | --- |',
        `| subsystem | \`${component.subsystem}\` |`, `| component | \`${component.name}\` |`,
        `| repository | \`${component.dir}\` |`,
        `| bundle | [${component.bundleFile}](${linkFrom(docFile, component.bundleFile)}) |`,
        `| rk3568 | ${component.selected ? '已选入' : '未选入'} |`, '',
        '## 声明构建和测试入口', '',
        `- 生产入口：${component.subComponents.length ? component.subComponents.map((x) => `\`${x}\``).join('、') : '无声明'}`,
        `- 测试入口：${component.tests.length ? component.tests.map((x) => `\`${x}\``).join('、') : '无声明'}`, '',
        '## 目标分类统计', '', '| 分类 | 数量 |', '| --- | ---: |',
        `| production | ${counts.production ?? 0} |`, `| test | ${counts.test ?? 0} |`,
        `| build-support | ${counts['build-support'] ?? 0} |`,
        `| aggregate-codegen | ${counts['aggregate-codegen'] ?? 0} |`, `| total | ${component.modules.length} |`, '',
        '## 全部静态目标', '', '| 分类 | 类型 | Label | 构建文件 | 行号 |', '| --- | --- | --- | --- | ---: |',
    ];
    for (const m of component.modules) {
        lines.push(`| ${m.category} | \`${m.type}\` | \`${m.label}\` | [${m.buildFile}](${linkFrom(docFile, m.buildFile)}) | ${m.line} |`);
    }
    lines.push('', '## 扫描限制', '',
        '- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。',
        '- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。',
        '- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。', '');
    fs.writeFileSync(docFile, lines.join('\n'));
}

function componentOverview(component) {
    const profile = profiles[component.name];
    if (!profile) throw new Error(`missing semantic profile for ${component.name}`);
    const docDir = path.join(subsystemDir, 'components', safeName(component.name));
    fs.mkdirSync(docDir, { recursive: true });
    const readme = path.join(docDir, 'README.md');
    if (!fs.existsSync(readme)) {
        fs.writeFileSync(readme, `# ${component.name} 部件\n\n- [功能说明](functional-overview.md)\n- [完整模块索引](hiviewdfx-index.md)\n`);
    }
    const docFile = path.join(docDir, 'functional-overview.md');
    const sourcePriority = ['interfaces', 'services', 'service', 'frameworks', 'framework', 'core', 'plugins', 'manager',
        'client', 'adapter', 'common', 'utils', 'utility', 'cmd', 'command', 'mini', 'lite', 'ohos', 'kit', 'config',
        'tools', 'platform', 'hiretrieval', 'sa_profile', 'base'];
    const excludedDirs = new Set(['.git', '.gitee', 'test', 'tests', 'docs', 'figures', 'example', 'examples', 'mock', 'build']);
    const dirs = fs.readdirSync(path.join(rootDir, component.dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !excludedDirs.has(entry.name)).map((entry) => entry.name)
        .sort((a, b) => {
            const ai = sourcePriority.indexOf(a);
            const bi = sourcePriority.indexOf(b);
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
        });
    const entities = runtimeEntities.filter((entity) => entity.component === component.name);
    const innerRows = component.innerKits.map((kit) => {
        const name = typeof kit === 'string' ? kit : (kit.name || kit.header?.name || '-');
        const headers = typeof kit === 'object' ? list(kit.header?.header_files).slice(0, 5).join(', ') : '';
        return `| \`${markdown(name)}\` | 系统部件/框架调用者 | 库接口与控制/数据交换 | ${markdown(headers || component.bundleFile)} |`;
    });
    const lines = [
        `# ${component.name} 功能说明`, '',
        '> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。', '',
        '[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)', '',
        '## 功能定位', '', profile.problem, '', profile.callers, '',
        `能力边界：该部件适配 \`${component.adapted.join(',') || '未声明'}\` 系统类型，` +
            `${component.selected ? '当前 rk3568 产品已选入。' : '当前 rk3568 parts 清单未选入，目录存在不代表进入该产品。'}`, '',
        '## 核心能力', '', '| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |', '| --- | --- | --- | --- |',
        ...profile.capabilities.map((capability, index) => `| ${capability} | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | ` +
            `${component.subComponents[index] ? `\`${markdown(component.subComponents[index])}\`` : '见 bundle Inner Kit/模块索引'} | ` +
            `${dirs[index % Math.max(dirs.length, 1)] ? `\`${dirs[index % dirs.length]}\`` : `\`${component.dir}\``} |`), '',
        '## 对外与内部接口', '', '| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |', '| --- | --- | --- | --- |',
        ...(innerRows.length ? innerRows : ['| 无独立 Inner Kit 声明 | 上层构建目标或平台适配层 | 通过静态库、注册回调或聚合目标集成 | 见 bundle 和模块索引 |']), '',
        '## 运行实体与生命周期', '', '| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |', '| --- | --- | --- | --- |',
        ...(entities.length ? entities.map((e) => `| \`${e.process}\` (${e.type}) | ${e.evidence} | ${profile.problem} | ` +
            `${markdown(e.config)}${e.uid ? `；uid=${e.uid}` : ''}${e.selinux ? `；${e.selinux}` : ''} |`) :
            ['| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |']), '',
        '## 源码职责区', '', '| 目录 | 职责 | 与其他区域的关系 |', '| --- | --- | --- |',
        ...dirs.slice(0, 12).map((dir) => `| [${component.dir}/${dir}](${linkFrom(docFile, `${component.dir}/${dir}`)}) | ` +
            `${dir === 'interfaces' ? '对外和内部接口定义' : dir === 'services' || dir === 'service' ? '服务、进程与启动实现' : dir === 'frameworks' || dir === 'framework' ? '框架和公共实现' : dir === 'plugins' ? '事件、故障或性能业务插件' : dir === 'core' ? '事件循环、插件装载或核心调度' : dir === 'manager' ? '指标/对象管理与持久化调度' : dir === 'cmd' || dir === 'command' ? '命令行入口和参数处理' : dir === 'config' || dir === 'sa_profile' ? '产品、init 或 SA 运行配置' : dir === 'adapter' || dir === 'platform' ? '平台和系统服务适配' : dir === 'tools' || dir === 'utils' || dir === 'utility' || dir === 'common' ? '公共工具、数据类型和辅助算法' : '该部件的 ' + dir + ' 实现区域'} | 与构建入口、接口、服务或测试协作 |`), '',
        '## 关键调用链', '', '```text', profile.chain, '```', '',
        '## 产品功能开关', '', '| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |', '| --- | --- | --- | --- |',
        ...(component.features.length ? component.features.map(({ name, value }) =>
            `| \`${markdown(name)}\` | ${markdown(value)} | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](${linkFrom(docFile, component.bundleFile)}) |`) :
            ['| 无 bundle feature 声明 | - | 产品差异由 adapted system、GN 条件或上层产品配置决定 | bundle.json |']), '',
        '## 依赖与协作边界', '',
        `- 上游：${profile.callers}`,
        `- 系统部件依赖：${component.componentDeps.length ? component.componentDeps.map((x) => `\`${x}\``).join('、') : '无声明'}。`,
        `- 三方依赖：${component.thirdPartyDeps.length ? component.thirdPartyDeps.map((x) => `\`${x}\``).join('、') : '无声明'}。`,
        '- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。', '',
        '## 测试与验证边界', '', '| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |', '| --- | --- | --- | --- |',
        `| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | ${component.tests.length ? component.tests.map((x) => `\`${markdown(x)}\``).join('、') : '无声明'} | 未声明不等于无测试，需查完整模块索引 |`,
        `| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | ${component.modules.filter((m) => m.category === 'test').length} 个目标 | 动态模板目标可能漏计 |`,
        `| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | ${entities.length ? entities.map((e) => `\`${e.process}\``).join('、') : '由宿主进程验证'} | 本次为静态分析，未执行真机测试 |`, '',
        '## 风险', '', `- ${profile.risks}`, '- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。',
        '- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。', '',
        '## 继续深入', '',
        `- [完整构建索引](hiviewdfx-index.md)`,
        `- [bundle.json](${linkFrom(docFile, component.bundleFile)})`,
        `- ${fs.existsSync(path.join(rootDir, component.dir, 'README_zh.md')) ? `[源码 README_zh](${linkFrom(docFile, `${component.dir}/README_zh.md`)})` : `[源码 README](${linkFrom(docFile, `${component.dir}/README.md`)})`}`,
        '- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。', '',
    ];
    fs.writeFileSync(docFile, lines.join('\n'));
}

for (const component of components) {
    componentIndex(component);
    componentOverview(component);
}

const categoryCounts = countBy(modules, 'category');
const subsystemIndex = path.join(subsystemDir, 'hiviewdfx-index.md');
const subsystemIndexLines = [
    '# HiviewDFX 完整模块索引', '', '> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，请勿手工编辑。', '',
    '[返回子系统](README.md) | [功能全景](functional-overview.md) | [源码域](../../source-domains/hiviewdfx/README.md)', '',
    '## 汇总', '', '| 指标 | 数量 |', '| --- | ---: |', `| Git 子仓 | ${repositories.length} |`, `| 部件 | ${components.length} |`,
    `| BUILD.gn | ${buildFiles.length} |`, `| 静态目标 | ${modules.length} |`, `| 生产目标 | ${categoryCounts.production ?? 0} |`,
    `| 测试目标 | ${categoryCounts.test ?? 0} |`, `| 未映射目标 | ${unmapped.length} |`, '',
    '## 部件', '', '| 部件 | rk3568 | 静态目标 | 生产 | 测试 | 运行实体 | 索引 |', '| --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...components.map((c) => {
        const counts = countBy(c.modules, 'category');
        return `| \`${c.name}\` | ${c.selected ? 'yes' : 'no'} | ${c.modules.length} | ${counts.production ?? 0} | ${counts.test ?? 0} | ` +
            `${runtimeEntities.filter((e) => e.component === c.name).length} | [查看](components/${safeName(c.name)}/hiviewdfx-index.md) |`;
    }), '', '## 未映射项', '',
    unmapped.length ? `共有 ${unmapped.length} 个目标未映射，详见 [unmapped-modules.tsv](../../generated/hiviewdfx/unmapped-modules.tsv)。` :
        '全部可静态识别目标均通过最长 `bundle.json` 目录前缀映射到部件；没有虚构部件或仓库节点。', '',
    '运行实体表中 `usage_report` 的启动关系标记为 `inferred`；其余条目有 executable、init cfg 或 SA profile 直接证据。', '',
    '## 查询', '', '```bash', "awk -F '\\t' '$1 == \"hiviewdfx\"' specs/knowledge-base/generated/hiviewdfx/modules.tsv", '```', '',
];
fs.writeFileSync(subsystemIndex, subsystemIndexLines.join('\n'));

const overviewFile = path.join(subsystemDir, 'functional-overview.md');
const overviewLines = [
    '# HiviewDFX 功能全景', '', '> 本页基于 16 个部件的当前源码、接口、运行配置和测试入口生成。', '',
    '[返回子系统](README.md) | [源码域总览](../../source-domains/hiviewdfx/README.md) | [完整模块索引](hiviewdfx-index.md)', '',
    '## 子系统边界', '',
    'HiviewDFX 负责操作系统和应用的可观测性、故障诊断、日志/事件/跟踪、卡死与违规检测，以及诊断数据的汇聚分析。它提供埋点和查询接口，也运行高权限守护进程与 System Ability。', '',
    '它不负责各业务子系统自身的业务策略，也不替代内核调度、存储、权限或性能分析器；这些能力以数据源、执行环境或下游依赖的形式与 HiviewDFX 协作。standard 与 mini/small 部件是不同产品形态，不能因同处目录就同时视为选入。', '',
    '## 部件功能分工', '', '| 部件 | 功能定位 | 实现形态 | 主要接口 | 运行实体 | 产品状态 | 详细说明 |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...components.map((c) => {
        const profile = profiles[c.name];
        const entities = runtimeEntities.filter((e) => e.component === c.name).map((e) => e.process).join(', ') || '宿主装载';
        const shape = !c.adapted.includes('standard') && (c.adapted.includes('mini') || c.adapted.includes('small')) ? '轻量框架/库' :
            (entities === '宿主装载' ? '接口/库/插件' : '接口/库 + 进程/SA');
        return `| \`${c.name}\` | ${profile.problem} | ${shape} | ${c.innerKits.length} Inner Kit / ${c.syscaps.length} SysCap | ` +
            `${markdown(entities)} | ${c.selected ? 'rk3568 已选入' : 'rk3568 未选入'} | [查看](components/${safeName(c.name)}/functional-overview.md) |`;
    }), '',
    '## 关键运行链', '',
    '- 日志链：调用方 -> 多语言 HiLog API -> `hilogd` -> 环形缓冲/持久化 -> `hilog` 查询。',
    '- 系统事件链：系统服务 -> HiSysEvent schema/API -> Hiview sysevent source -> 插件流水线 -> 存储、查询或导出。',
    '- native 故障链：信号处理/主动 dump -> `faultloggerd`/`processdump` -> fault log -> Hiview 故障插件。',
    '- 诊断链：`hidumper` -> SA 1212 -> 目标 SA/进程/插件；性能专项可进入 Hiview xperf SA 8600。',
    '- 轻量链：hievent_lite/hilog_lite/blackbox_lite -> hiview_lite -> 平台存储或输出。', '',
    '## 公共能力域', '',
    '- observability：日志、系统事件、应用事件、调用链和 trace。',
    '- reliability：崩溃、卡死、线程/资源泄漏、黑匣子和故障恢复。',
    '- performance：API 指标、TraceMeter、统一采集、xperf 和性能插件。',
    '- storage：日志缓冲、事件数据库、故障日志、导出与配额。',
    '- ipc/security：SA、socket、fd/PID、权限、UID/GID 和 SELinux 边界。', '',
    '## 风险与验证重点', '',
    '- `hilogd`、`faultloggerd`、`hiview`、SA 1212 和 SA 8600 是高权限、高入度运行实体，应重点验证身份、权限、fd/PID/路径输入和拒绝服务。',
    '- 高频日志、事件和 trace 必须验证背压、丢弃、磁盘配额、内存与功耗；故障路径需验证异步信号安全和资源不足场景。',
    '- lite 与 standard 实现、rk3568 产品选入和 bundle feature 会改变交付边界；静态目录存在不能替代产品证据。',
    '- 本次完成静态结构与链接/覆盖率验证，未执行编译、设备运行、性能或稳定性测试。', '',
];
fs.writeFileSync(overviewFile, overviewLines.join('\n'));

const sourceReadme = path.join(sourceDomainDir, 'README.md');
const sourceLines = [
    '# HiviewDFX 源码域', '', '## 定位', '',
    `\`${sourcePath}/\` 是物理源码域，不是额外的子系统层级。当前 16 个仓和 16 个部件均由 bundle 明确映射到 \`hiviewdfx\` 子系统。`, '',
    '```text', 'base/hiviewdfx（物理源码域）', '  -> hiviewdfx（子系统）', '    -> component / process', '      -> capability', '        -> feature', '```', '',
    '## 覆盖范围', '', '| 指标 | 数量 |', '| --- | ---: |', `| Git 子仓 | ${repositories.length} |`, `| 部件 | ${components.length} |`,
    '| 子系统 | 1 |', `| BUILD.gn | ${buildFiles.length} |`, `| 静态目标 | ${modules.length} |`, `| 运行实体 | ${runtimeEntities.length} |`,
    `| rk3568 选入部件 | ${components.filter((c) => c.selected).length} |`, `| 未映射目标 | ${unmapped.length} |`, '',
    '## 子系统入口', '', '| 子系统 | 部件 | 运行实体 | 目标 | 产品选入 | 功能说明 | 构建索引 |', '| --- | ---: | ---: | ---: | ---: | --- | --- |',
    `| hiviewdfx | ${components.length} | ${runtimeEntities.length} | ${modules.length} | ${components.filter((c) => c.selected).length} | ` +
        '[功能全景](../../subsystems/hiviewdfx/functional-overview.md) | [模块索引](../../subsystems/hiviewdfx/hiviewdfx-index.md) |', '',
    '## 全量机器索引', '', '| 文件 | 内容 |', '| --- | --- |',
    '| [repositories.tsv](../../generated/hiviewdfx/repositories.tsv) | Git 子仓、HEAD、分支和工作树状态 |',
    '| [components.tsv](../../generated/hiviewdfx/components.tsv) | 全部部件元数据与目标统计 |',
    '| [modules.tsv](../../generated/hiviewdfx/modules.tsv) | 全部可静态识别 GN 目标 |',
    '| [runtime-entities.tsv](../../generated/hiviewdfx/runtime-entities.tsv) | daemon、命令、helper 和 SA |',
    '| [subsystems.tsv](../../generated/hiviewdfx/subsystems.tsv) | 子系统聚合 |',
    '| [unmapped-modules.tsv](../../generated/hiviewdfx/unmapped-modules.tsv) | 未映射目标及原因 |',
    '| [summary.json](../../generated/hiviewdfx/summary.json) | 机器摘要、限制和验证入口 |',
    '| [verification.md](../../generated/hiviewdfx/verification.md) | 覆盖率等式、链接、尾随空白和源码工作树检查 |', '',
    '## 边界和限制', '',
    '- 排除 `out/`、`interface/sdk_c/hiviewdfx` 和 `test/xts/acts/hiviewdfx`；它们分别属于构建产物、SDK 镜像和跨子系统验收测试。',
    '- 静态目标只识别字面量名称；模板、循环和变量动态目标可能漏计。',
    '- rk3568 选入状态来自 `specs/knowledge-base/generated/rk3568-parts.tsv`，需在产品配置刷新后重新生成。',
    '- `usage_report` 有生产 executable 证据，但缺少本扫描边界内的 init/SA 启动配置，因此生命周期标为 inferred。',
    '- 功能说明是源码语义总结；具体状态机、安全、性能与真机行为仍需专题下钻。', '',
    '## 刷新方式', '', '```bash', 'node specs/knowledge-base/tools/generate-hiviewdfx-summary.mjs',
    'node specs/knowledge-base/tools/verify-hiviewdfx-summary.mjs', '```', '',
];
fs.writeFileSync(sourceReadme, sourceLines.join('\n'));

const summary = {
    generatedAt: new Date().toISOString(),
    sourcePath: path.resolve(sourceDir),
    sourceDomain: 'hiviewdfx',
    repositories: repositories.length,
    components: components.length,
    subsystems: 1,
    buildFiles: buildFiles.length,
    staticTargets: modules.length,
    mappedTargets: modules.length - unmapped.length,
    unmappedTargets: unmapped.length,
    runtimeEntities: runtimeEntities.length,
    functionalDocuments: components.length + 1,
    productSelectedComponents: components.filter((c) => c.selected).length,
    verificationReport: 'specs/knowledge-base/generated/hiviewdfx/verification.md',
    categories: categoryCounts,
    limitations: [
        'Only literal GN target declarations whose opening brace is on the declaration line are counted.',
        'Product selection depends on the freshness of generated/rk3568-parts.tsv.',
        'usage_report has an executable target but no init/SA start configuration inside the source boundary.',
        'No build, device, performance, power, stability, or runtime security test was executed.',
    ],
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

console.log(`generated HiviewDFX summary: ${components.length} components, ${modules.length} static targets, ${runtimeEntities.length} runtime entities`);
