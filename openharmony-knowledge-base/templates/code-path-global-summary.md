# 给定代码路径的全局索引、进程与功能说明模板

该模板已封装为 `$ohos-code-knowledge-base` Skill。优先直接调用 Skill；需要审查或扩展输出规范时再阅读本文。

## 1. 使用场景

当下一次提供一个新的代码目录、源码域或子系统路径时，按本模板完成：

1. 全局代码规模与仓库边界扫描。
2. 子系统、部件、进程、构建目标的所有权映射。
3. 机器可查询的 TSV/JSON 全量索引。
4. 真实运行进程、SA、应用和宿主关系说明。
5. 子系统和部件功能说明。
6. 可继续下钻到 capability 和 feature 的知识架构。

本模板适用于 OpenHarmony，也可用于具有 manifest、组件描述文件和构建系统的其他大型代码库。

## 2. 任务输入

执行前填写：

| 参数 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `<source-path>` | 是 | `/workspace/code/base` | 待分析代码路径，可以是绝对路径或工作区相对路径 |
| `<source-domain>` | 是 | `base` | 物理源码域名称，不自动视为子系统 |
| `<workspace-root>` | 是 | `/workspace/code` | 多仓工作区根目录 |
| `<knowledge-base>` | 是 | `specs/knowledge-base` | 知识库输出根目录 |
| `<product-name>` | 否 | `rk3568` | 需要判断产品选入状态时填写 |
| `<product-parts-file>` | 否 | `out/preloader/rk3568/parts.json` | 产品有效部件事实来源 |
| `<exclude-patterns>` | 否 | `out,prebuilts,node_modules` | 不属于源码分析范围的目录 |
| `<focus>` | 否 | `安全、运行时、接口` | 需要额外深入的分析维度 |

开始前必须确认 `<source-path>` 存在，并记录其规范化路径。路径只是物理扫描边界，不代表所有权层级。

## 3. 可直接复用的请求

下次可以直接提交以下内容，只替换尖括号参数：

```text
请按照 specs/knowledge-base/templates/code-path-global-summary.md 分析：

- source-path: <source-path>
- source-domain: <source-domain>
- workspace-root: <workspace-root>
- product-name: <product-name 或 none>
- product-parts-file: <product-parts-file 或 none>
- exclude-patterns: <exclude-patterns>
- focus: <focus 或 none>

要求完成全局索引、生产进程树、跨部件宿主关系、子系统功能全景、全部部件功能说明、未映射项说明和链接/覆盖率验证。
不要把源码域当成子系统，不要只生成 BUILD.gn 清单，不要修改或清理现有代码仓工作树。
```

## 4. 固定信息架构

所有分析必须映射到：

```text
source domain（物理源码视图）
  -> subsystem（产品与架构所有权）
    -> component 或 process
      -> capability domain
        -> feature
          -> implementation / operation / test / evidence
```

约束：

- `<source-domain>` 是横向物理视图，不与子系统并列。
- Git 仓库不是组件，组件也不等于进程。
- 小功能不能放在知识库根目录与产品、架构、子系统并列。
- 没有组件声明的仓库保留为仓库节点，不虚构组件。
- 无法确定的归属必须记录为 `unmapped` 或 `inferred`。

## 5. 执行阶段

### 阶段 A：边界和工作区安全

记录：

- 源码路径、工作区根目录和扫描时间。
- Git/repo 子仓数量、HEAD、分支和工作树状态。
- 已排除目录及原因。
- 产品上下文是否存在、是否过期。
- 当前目录是否包含用户修改、LFS 状态或生成产物。

禁止：

- 清理或重置任何工作树。
- 把未提交修改解释为本次分析产生的修改。
- 因为目录存在就判断功能已经进入产品。

### 阶段 B：全量物理索引

至少扫描：

| 对象 | 常见事实来源 |
| --- | --- |
| Git 子仓 | `repo list`、`.git`、manifest |
| 组件/部件 | `bundle.json`、`ohos.build`、package manifest |
| 构建文件 | `BUILD.gn`、CMake、Make、Cargo、package scripts |
| 静态目标 | library、executable、app、test、config、codegen |
| 公共接口 | Inner Kit、SDK Kit、IDL、NAPI、ANI、FFI、HDI |
| 运行实体 | executable、init cfg、SA profile、HAP、devhost、daemon |
| 产品选择 | preloader parts、产品配置、feature 覆写 |
| 测试 | unittest、fuzztest、systemtest、module test、benchmark |
| 安全边界 | permission、AccessToken、SELinux、uid/gid、IPC Stub |

静态目标只统计能够可靠识别的声明。变量、循环或模板动态生成的目标必须列为扫描限制。

运行实体扫描必须区分强弱证据：

- 强证据：生产 init/service 配置、SA profile、应用 manifest、容器或服务管理配置。
- 中等证据：生产 executable 目标、入口函数、安装路径和明确 README。
- 弱证据：目录名、目标名或文件名推断，只能标记为 `inferred`。

### 阶段 C：所有权映射

映射优先级：

1. 组件描述文件明确声明的 subsystem/component。
2. 构建目标位于组件描述文件目录前缀内。
3. Git 仓只有一个组件时，可回退到该组件。
4. README、产品配置或运行配置明确说明归属。
5. 目录名推断只能标记为 `inferred`，不能当作确定事实。
6. 仍无法确定时进入 `unmapped-*` 索引。

当多个组件目录嵌套时，使用最长目录前缀匹配。

### 阶段 D：运行进程建模

建立进程树时必须先排除：

- `test/tests/unittest/fuzztest/systemtest/moduletest`。
- `example/examples/demo/benchmark`。
- CLI、开发工具和仅供测试的 server/client。

进程归属规则：

1. init/service 配置所在部件定义宿主子系统和 `init-owner`。
2. 与可执行路径或进程名匹配的生产目标定义 `executable-owner`。
3. SA profile 所在部件定义 `sa-provider`，但不自动拥有宿主进程。
4. 插件、应用和动态模块分别标记 `plugin-provider`、`app-owner`。
5. 一个宿主进程可装载多个部件或多个子系统的 SA。
6. 一个部件可向多个宿主进程提供能力。
7. 只有 SA profile、没有 init 配置时，宿主子系统必须标记映射依据和置信度。

进程节点至少回答：

- 设备可见进程名和可执行路径。
- 启动方式、uid/gid、SELinux domain、权限和 capability。
- 承载的 SA ID、动态库、`run-on-create` 和 `auto-restart`。
- init owner、executable owner 和 SA/plugin provider。
- 跨部件、跨子系统宿主关系。
- 启动、按需加载、死亡重启和资源回收。
- IPC、文件、设备节点和下游服务边界。

详细格式使用 [进程模板](process.md)。

### 阶段 E：功能语义分析

功能说明的事实优先级：

1. 当前源码和公开接口。
2. 组件描述文件中的 description、syscap、feature、inner_kits。
3. 源码 README 中的 introduction、architecture、constraints 和 usage。
4. 服务实现、SA profile、init cfg、应用配置和可执行目标。
5. BUILD.gn 生产目标和源码目录结构。
6. 测试用例名称与覆盖范围。

功能说明不能只做以下事情：

- 罗列目录。
- 罗列 GN 目标。
- 把 `feature_name` 的下划线换成空格。
- 重复 `bundle.json` 原文但不解释能力边界。

每个部件至少回答：

- 它解决什么问题。
- 上层调用者如何使用它。
- 核心能力分别是什么。
- 主要接口、数据或控制入口是什么。
- 是否有独立进程、SA、应用或插件。
- 主要源码区域如何协作。
- 产品开关改变什么行为。
- 依赖哪些公共服务或三方实现。
- 需要覆盖哪些测试和运行风险。

### 阶段 F：重点功能下钻

满足以下任意两项时，建立 capability/feature 节点：

- 有独立构建目标或插件。
- 有独立配置、协议或状态机。
- 有独立测试套件。
- 有独立运行实体或故障域。
- 有明确安全、性能或资源边界。
- 后续会持续演进。

下钻路径：

```text
subsystems/<subsystem>/components/<component>/capabilities/<domain>/features/<feature>/
```

或：

```text
subsystems/<subsystem>/processes/<process>/capabilities/<domain>/features/<feature>/
```

## 6. 标准输出结构

```text
knowledge-base/
├── source-domains/<source-domain>/README.md
├── generated/<source-domain>/
│   ├── repositories.tsv
│   ├── components.tsv
│   ├── modules.tsv
│   ├── processes.tsv
│   ├── runtime-entities.tsv
│   ├── subsystems.tsv
│   ├── unmapped-modules.tsv
│   └── summary.json
└── subsystems/<subsystem>/
    ├── README.md
    ├── functional-overview.md
    ├── <source-domain>-processes.md
    ├── <source-domain>-index.md
    ├── processes/<process>/
    │   ├── README.md
    │   └── <source-domain>-runtime.md
    └── components/<component>/
        ├── README.md
        ├── functional-overview.md
        ├── <source-domain>-index.md
        └── capabilities/<domain>/features/<feature>/...
```

如果已有同名人工 README，不得直接覆盖。生成文件应有“由生成器生成”的标记，人工说明和机器索引必须分离。

## 7. 机器索引字段

### repositories.tsv

```text
subsystem
path
repository
head
branch
changed_entries
component_count
static_target_count
coverage_status
mapping_method
```

`coverage_status` 建议值：

- `component-and-targets`
- `repository-targets-only`
- `repository-only`
- `component-only`

### components.tsv

```text
subsystem
component
repository_path
metadata_path
product_selected
adapted_system_types
description
syscap_count
feature_count
component_dependency_count
third_party_dependency_count
inner_kit_count
runtime_entity_count
static_target_count
production_target_count
test_target_count
```

### modules.tsv

```text
subsystem
component
repository_path
build_file
line
target_type
target_name
target_label
category
mapping_method
```

`category` 至少区分：

- `production`
- `test`
- `build-support`
- `aggregate-codegen`

### processes.tsv

每行代表一个真实宿主进程：

```text
host_subsystem
process
init_service_count
system_ability_count
participating_component_count
executable_targets
start_modes
uids
gids
selinux_domains
sa_ids
libraries
evidence_files
mapping_confidence
```

### runtime-entities.tsv

每行代表一条 init、SA、应用或插件运行证据：

```text
host_subsystem
process
entity_type
owner_subsystem
owner_component
executable
sa_id
library_or_package
start_mode
ondemand
run_on_create
uid
gid
selinux_domain
evidence_file
mapping_method
```

`entity_type` 建议值：

- `init-service`
- `system-ability`
- `application`
- `plugin`
- `daemon`

必须能从 `owner_component` 反查宿主进程，也能从进程反查所有 SA/插件提供部件。

### summary.json

至少包含：

```json
{
  "generatedAt": "<ISO-8601>",
  "sourcePath": "<source-path>",
  "sourceDomain": "<source-domain>",
  "repositories": 0,
  "components": 0,
  "subsystems": 0,
  "buildFiles": 0,
  "staticTargets": 0,
  "mappedTargets": 0,
  "unmappedTargets": 0,
  "processes": 0,
  "initServiceEntries": 0,
  "systemAbilityEntries": 0,
  "runtimeEntities": 0,
  "functionalDocuments": 0,
  "productSelectedComponents": 0,
  "limitations": []
}
```

## 8. 源码域总览模板

```markdown
# <Source Domain> 源码域

## 定位

说明该目录是物理源码域，不是子系统，并给出所有权映射路径。

## 覆盖范围

| 指标 | 数量 |
| --- | ---: |
| Git 子仓 | |
| 组件/部件 | |
| 子系统 | |
| 构建文件 | |
| 静态目标 | |
| 运行进程 | |
| init 服务配置项 | |
| System Ability 配置项 | |
| 产品选入部件 | |
| 未映射目标 | |

## 子系统入口

| 子系统 | 部件 | 宿主进程 | 目标 | 产品选入 | 功能说明 | 进程说明 | 构建索引 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |

## 边界和限制

- 动态构建目标。
- 无组件声明仓库。
- 无法确认的运行实体。
- 产品上下文限制。

## 刷新方式

给出确定性的生成命令。
```

## 9. 子系统功能全景模板

```markdown
# <Subsystem> 功能全景

## 子系统边界

- 负责什么。
- 不负责什么。
- 与相邻子系统如何协作。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 主要接口 | 运行实体 | 产品状态 | 详细说明 |
| --- | --- | --- | --- | --- | --- | --- |

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA/插件 | 运行说明 |
| --- | --- | --- | ---: | --- |

需要明确区分“本子系统拥有宿主进程”和“本子系统部件被其他子系统进程装载”。

## 关键运行链

- 调用者 -> 接口 -> 服务/引擎 -> 下游依赖。
- 启动和按需加载关系。
- 关键数据流或控制流。

## 公共能力域

- security
- reliability
- performance
- storage
- ipc
- 其他稳定业务能力

## 风险与验证重点

- 高入度接口。
- IPC/权限边界。
- 并发和生命周期。
- 产品裁剪差异。
```

## 10. 部件功能说明模板

````markdown
# <Component> 功能说明

## 功能定位

用两到四段说明业务问题、主要调用者和能力边界。优先引用并校验源码 README，不使用空泛描述。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |

## 进程归属

| 宿主子系统 | 进程 | 部件角色 | SA/插件 | 实现库/模块 |
| --- | --- | --- | --- | --- |

没有独立进程时，明确说明该部件是被其他进程装载，还是纯库、接口、资源或工具部件。

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |

## 关键调用链

```text
caller
  -> public/inner API
    -> proxy/framework
      -> service/engine/plugin
        -> IPC/HDI/storage/third party
```

必须用实际类、接口、目标或配置替换占位内容。

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |

## 依赖与协作边界

- 上游调用者。
- 下游组件。
- 三方实现。
- 动态加载和运行时 IPC。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |

## 风险

- 正确性和状态机。
- 并发、生命周期和资源释放。
- IPC、权限、帐号和 SELinux。
- 性能、内存、功耗和稳定性。

## 继续深入

- 完整构建索引。
- bundle/package manifest。
- 源码 README。
- capability/feature 子节点。
````

## 11. 进程说明模板

每个强证据进程建立：

```text
subsystems/<host-subsystem>/processes/<process>/README.md
subsystems/<host-subsystem>/processes/<process>/<source-domain>-runtime.md
```

详细章节直接使用 [进程模板](process.md)，至少包含：

- 归属和证据等级。
- 运行身份、启动模式、uid/gid 和 SELinux。
- SA/服务单元、实现库和提供部件。
- 部件与进程角色关系。
- 接口、生命周期、构建交付和安全边界。
- 真机验证与扫描限制。

进程入口 README 只做导航；生成的运行事实与人工 capability/feature 文档分离。

## 12. 构建索引模板

```markdown
# <Component> 完整模块索引

> 本文件由生成器生成，不承担功能解释。

## 元数据

## 声明构建和测试入口

## 目标分类统计

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |

## 扫描限制

- 动态目标。
- 模板展开。
- 条件编译。
- 外部生成文件。
```

## 13. 验收清单

### 覆盖完整性

- [ ] 所有 Git 子仓进入 `repositories.tsv`。
- [ ] 所有组件描述文件进入 `components.tsv`。
- [ ] 所有可静态识别目标进入 `modules.tsv`。
- [ ] 映射目标数加未映射目标数等于目标总数。
- [ ] 子系统目标汇总等于全域目标总数。
- [ ] 组件目标汇总等于已映射目标数。
- [ ] 无组件声明仓库被单独说明。

### 进程覆盖完整性

- [ ] 所有生产 init/service 配置进入 `runtime-entities.tsv`。
- [ ] 所有生产 SA profile 进入 `runtime-entities.tsv`。
- [ ] 所有强证据宿主进程进入 `processes.tsv` 和进程树。
- [ ] init owner、executable owner、SA/plugin provider 可以双向查询。
- [ ] 跨部件和跨子系统宿主关系没有被压平。
- [ ] 测试、示例、benchmark 和 CLI 未被误判为生产进程。
- [ ] 只有 SA、没有 init 配置的进程标记了映射依据。
- [ ] 同一 SA ID 的产品/条件变体被保留并解释。

### 功能说明质量

- [ ] 每个子系统有功能全景。
- [ ] 每个组件有功能说明。
- [ ] 每个强证据进程有运行说明。
- [ ] 每个功能说明包含定位、能力、接口、运行实体、源码职责区、依赖和测试。
- [ ] 每个部件功能页可以反查宿主进程、SA 和实现库。
- [ ] 短描述优先由源码 README 和接口事实补全。
- [ ] 没有把示例或测试程序误判为生产运行实体。
- [ ] 没有把 feature 名机械改写当作完整功能解释。
- [ ] 高风险组件包含实际调用链和安全/并发边界。

### 文档与安全

- [ ] 所有相对链接有效。
- [ ] 生成脚本语法检查通过。
- [ ] 没有尾随空白。
- [ ] 没有覆盖人工维护的 README。
- [ ] 没有修改、清理或重置待分析代码仓。
- [ ] 最终报告说明扫描限制和未完成的人工深挖范围。

## 14. 最终汇报模板

```markdown
已完成 `<source-path>` 的全局索引和功能说明。

覆盖：

- Git 子仓：<count>
- 组件：<count>
- 子系统：<count>
- 构建文件：<count>
- 静态目标：<count>
- 运行进程：<count>
- init 服务配置项：<count>
- System Ability 配置项：<count>
- 运行证据：<count>
- 子系统功能页：<count>
- 组件功能页：<count>
- 进程运行页：<count>
- 未映射目标：<count>

主要入口：

- 源码域总览：<link>
- 机器摘要：<link>
- 使用说明：<link>

限制：

- <dynamic target limitation>
- <product context limitation>
- <manual deep-dive limitation>

验证：链接、覆盖率、脚本语法和代码仓状态均已检查。
```

## 15. 生成顺序

生成器必须按依赖顺序执行：

```text
全局工作区索引
  -> 源码域仓库/组件/模块索引
    -> 进程与运行证据索引
      -> 子系统和部件功能说明
        -> capability/feature 人工深挖
```

原因：部件功能说明需要读取进程索引，建立“部件 -> 宿主进程 -> SA/实现库”的反向链接。模块生成器后运行会覆盖进程统计时，应在最后重新合并摘要。

## 16. 结果分层

最终结果应明确区分：

1. **机器确定事实**：仓库、组件声明、构建目标、文件和行号。
2. **源码语义总结**：README、接口、服务和测试共同支持的功能说明。
3. **规则推断**：目录或目标名推断，必须标记置信度。
4. **人工深度分析**：调用链、状态机、安全和性能专题。

模板的目标不是一次性替代源码分析，而是保证每次拿到新代码路径时，先得到完整且同层级的知识骨架，再沿着高价值能力继续深入。
