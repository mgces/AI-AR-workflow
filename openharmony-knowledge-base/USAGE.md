# OpenHarmony 代码知识库使用指南

> **路径约定**:本文所有 `specs/knowledge-base/...` 命令路径相对 OpenHarmony 源码仓根
> `$OHOS_ROOT`(知识库真源部署在那里)。在本仓的副本目录下照抄会失败——请在 `$OHOS_ROOT`
> 下执行,或把前缀 `specs/knowledge-base` 换成本副本目录 `openharmony-knowledge-base`。

## 1. 这套知识库解决什么问题

知识库用于回答五类问题：

1. **代码在哪里**：某个能力属于哪个子系统、组件和 Git 子仓。
2. **产品有没有使用它**：组件是否进入当前 rk3568 产品。
3. **它依赖什么**：组件声明的内部依赖、三方依赖和公共基础能力。
4. **如何构建和测试**：组件生产目标、Inner API 和测试入口是什么。
5. **当前工作区是否安全**：哪些仓有未提交修改，哪些是 LFS、依赖安装或测试产物。

它不是源码的替代品，而是源码导航和分析索引。正确使用方式是：

```text
知识库定位范围
  -> bundle.json/BUILD.gn 确认构建边界
  -> 阅读具体源码
  -> 选择构建、测试和真机验证
```

## 2. 从哪里开始

总入口：[README.md](README.md)

第一次使用建议按以下顺序阅读：

1. [知识库信息架构](INFORMATION_ARCHITECTURE.md)：理解横向视图和功能所有权树。
2. [工作区总览](workspace/overview.md)：理解多仓、组件、GN 模块和产品部件的区别。
3. [系统架构](architecture/system.md)：理解 OpenHarmony 全局分层。
4. [构建与运行链路](architecture/build-runtime.md)：理解代码如何变成镜像，以及服务如何启动。
5. [rk3568 产品](products/rk3568/README.md)：理解当前实际产品。
6. [子系统目录](subsystems/README.md)：按业务领域进入所有权树。

日常使用通常不需要从头阅读全部文档，可以直接查生成索引。

分析新的代码路径时，直接使用 [给定代码路径的全局索引、进程与功能说明模板](templates/code-path-global-summary.md)。模板包含输入参数、扫描步骤、进程宿主建模、输出目录、机器索引字段、功能说明格式和验收清单。

也可以直接调用 [OpenHarmony 代码知识库 Skill](skills/ohos-code-knowledge-base/SKILL.md)(本副本自带)：

```text
使用 $ohos-code-knowledge-base 分析 <代码路径>，
源码域命名为 <domain>，生成或更新全局索引、进程树和功能说明。
```

Skill 会优先复用已有专用生成器；没有专用生成器时，执行内置的通用扫描、文档生成、变化比较和验证流水线。

## 3. 文件说明

### 人工分析文档

| 文件 | 用途 |
| --- | --- |
| `README.md` | 知识库总入口和关键结论 |
| `INFORMATION_ARCHITECTURE.md` | 层级、目录、命名和继续细分规范 |
| `workspace/overview.md` | 工作区规模、组织层级、公共依赖 |
| `architecture/system.md` | 内核到应用的全局架构 |
| `architecture/build-runtime.md` | 构建、启动、SA、IPC、应用和测试链路 |
| `products/rk3568/README.md` | 当前 rk3568 产品的配置和裁剪结果 |
| `subsystems/README.md` | 58 个有效子系统的职责和路径 |
| `subsystems/<subsystem>/README.md` | 子系统组件、进程和能力域 |
| `workspace/state.md` | 当前 12 个脏子仓及风险分类 |
| `subsystems/hiviewdfx/processes/hiview/capabilities/reliability/features/thread-leak-detector/README.md` | Hiview 线程泄漏插件专题 |

### 机器生成索引

| 文件 | 每行代表什么 |
| --- | --- |
| `generated/projects.tsv` | 一个 Git 子仓 |
| `generated/components.tsv` | 一个 `bundle.json` 组件 |
| `generated/rk3568-parts.tsv` | 一个进入 rk3568 的有效部件 |
| `generated/workspace-summary.json` | 工作区聚合统计 |
| `generated/foundation/repositories.tsv` | 一个 Foundation Git 子仓 |
| `generated/foundation/components.tsv` | 一个 Foundation 部件及 GN 目标统计 |
| `generated/foundation/modules.tsv` | 一个 Foundation 静态 GN 目标 |
| `generated/foundation/processes.tsv` | 一个 Foundation 运行进程 |
| `generated/foundation/runtime-entities.tsv` | 一条 init 服务或 SA profile 运行证据 |
| `generated/foundation/unmapped-modules.tsv` | 一个未映射到部件的 Foundation GN 目标 |
| `generated/foundation/summary.json` | Foundation 全域聚合统计 |

TSV 是制表符分隔文件，适合使用 `awk -F '\t'` 查询。

### Foundation 全域入口

[Foundation 源码域](source-domains/foundation/README.md)覆盖 `foundation/` 下全部 117 个仓、115 个部件和 18 个子系统。它是物理源码视图，不是第 19 个子系统。

查看 `ability_runtime` 的全部静态 GN 目标：

```bash
awk -F '\t' '$1 == "ability" && $2 == "ability_runtime"' \
  specs/knowledge-base/generated/foundation/modules.tsv
```

只查看 `communication:ipc` 的测试目标：

```bash
awk -F '\t' '$1 == "communication" && $2 == "ipc" && $10 == "test"' \
  specs/knowledge-base/generated/foundation/modules.tsv
```

列出 rk3568 选入的 Foundation 部件：

```bash
awk -F '\t' 'NR > 1 && $6 == "yes" {print $1 ":" $2}' \
  specs/knowledge-base/generated/foundation/components.tsv
```

查看没有映射到 `bundle.json` 部件的目标：

```bash
column -t -s $'\t' \
  specs/knowledge-base/generated/foundation/unmapped-modules.tsv
```

查看没有标准部件/目标覆盖的边界仓：

```bash
awk -F '\t' 'NR == 1 || $9 != "component-and-targets"' \
  specs/knowledge-base/generated/foundation/repositories.tsv
```

从人工导航进入某个部件：

```text
source-domains/foundation/README.md
  -> subsystems/<subsystem>/functional-overview.md
    -> components/<component>/functional-overview.md
      -> foundation-index.md
```

其中 `functional-overview.md` 回答“做什么、提供什么接口、运行在哪里”，`foundation-index.md` 回答“由哪些 GN 目标和 BUILD.gn 构成”。

查询一个进程承载的全部 SA：

```bash
awk -F '\t' '$2 == "foundation" && $3 == "system-ability"' \
  specs/knowledge-base/generated/foundation/runtime-entities.tsv
```

查询某个部件运行在哪些进程中：

```bash
awk -F '\t' '$4 == "ability" && $5 == "ability_runtime" {print $1, $2, $3, $7, $8}' \
  specs/knowledge-base/generated/foundation/runtime-entities.tsv
```

## 4. 核心概念

### Git 子仓

由 `repo` 管理的版本控制单元，例如：

```text
foundation/multimedia/av_codec
```

一个 Git 子仓可能包含一个或多个组件。

### 子系统

产品能力分类，例如：

```text
multimedia
hiviewdfx
communication
security
```

### 组件/部件

由 `bundle.json` 或 `ohos.build` 描述的产品裁剪单元，例如：

```text
multimedia:av_codec
hiviewdfx:hiview
```

### GN 模块

`BUILD.gn` 中实际编译的目标，例如共享库、可执行文件、配置和测试。一个组件通常包含多个 GN 模块。

### 运行实体

设备上的进程、System Ability、应用进程或 HDF devhost。它与组件不是一一对应关系。

### 能力域和功能

功能按以下所有权路径组织：

```text
subsystem -> component/process -> capability domain -> feature
```

查具体功能时不要从知识库根目录平铺搜索，应先进入子系统，再进入组件或运行进程。

## 5. 查询组件

### 按组件名查询

```bash
awk -F '\t' '$2 == "av_codec"' \
  specs/knowledge-base/generated/components.tsv
```

组件可能重名。更严格的查询应同时指定子系统：

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "av_codec"' \
  specs/knowledge-base/generated/components.tsv
```

### 按关键词模糊查询

```bash
rg -i 'camera|codec|audio' \
  specs/knowledge-base/generated/components.tsv
```

模糊查询可能匹配依赖列表和测试入口，不只匹配组件名。

### 查看某子系统全部组件

```bash
awk -F '\t' '$1 == "hiviewdfx" {print $2, $3}' \
  specs/knowledge-base/generated/components.tsv
```

输出内容：组件名和 `bundle.json` 路径。

## 6. 理解 components.tsv

字段顺序：

| 列 | 字段 | 说明 |
| ---: | --- | --- |
| 1 | subsystem | 所属子系统 |
| 2 | component | 组件名 |
| 3 | bundle_path | `bundle.json` 路径 |
| 4 | adapted_system_types | mini/small/standard |
| 5 | component_dependency_count | 组件依赖数量 |
| 6 | component_dependencies | 依赖组件列表 |
| 7 | third_party_dependency_count | 三方依赖数量 |
| 8 | third_party_dependencies | 三方依赖列表 |
| 9 | sub_component_target_count | 生产构建入口数量 |
| 10 | sub_component_targets | GN 生产入口 |
| 11 | inner_kit_count | Inner API 数量 |
| 12 | test_entry_count | 测试入口数量 |
| 13 | test_entries | 测试 GN 入口 |

只显示重点字段：

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "av_codec" {
  print "bundle:", $3
  print "deps:", $6
  print "third_party:", $8
  print "build:", $10
  print "tests:", $13
}' specs/knowledge-base/generated/components.tsv
```

## 7. 查询依赖

### 查看一个组件依赖什么

```bash
awk -F '\t' '$2 == "hiview" {print $6}' \
  specs/knowledge-base/generated/components.tsv | tr ',' '\n'
```

### 查看谁依赖某个组件

下面查询 `ipc` 的反向依赖：

```bash
awk -F '\t' -v dep="ipc" '
NR > 1 {
  count = split($6, items, ",")
  for (i = 1; i <= count; i++) {
    if (items[i] == dep) {
      print $1 ":" $2
      break
    }
  }
}' specs/knowledge-base/generated/components.tsv
```

统计反向依赖数量：

```bash
awk -F '\t' -v dep="ipc" '
NR > 1 {
  count = split($6, items, ",")
  for (i = 1; i <= count; i++) {
    if (items[i] == dep) {
      users++
      break
    }
  }
}
END {print users + 0}
' specs/knowledge-base/generated/components.tsv
```

注意：这里是 `bundle.json` 的组件级依赖，不包含所有 GN 私有依赖、动态加载和运行时 IPC 调用。

## 8. 判断组件是否进入 rk3568

查询具体部件：

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "av_codec"' \
  specs/knowledge-base/generated/rk3568-parts.tsv
```

有输出表示当前 preloader 将其选入 rk3568；无输出表示没有进入当前产品，或部件名称与查询名称不同。

查询某子系统进入产品的全部部件：

```bash
awk -F '\t' '$1 == "security" {print $2}' \
  specs/knowledge-base/generated/rk3568-parts.tsv
```

判断产品包含组件时，应优先查询 `rk3568-parts.tsv`，不能只因为源码目录存在就认为设备镜像包含它。

## 9. 查询 Git 子仓状态

### 查询指定仓

```bash
awk -F '\t' '$1 == "foundation/multimedia/av_codec"' \
  specs/knowledge-base/generated/projects.tsv
```

字段：

| 列 | 字段 |
| ---: | --- |
| 1 | path |
| 2 | repository |
| 3 | HEAD |
| 4 | branch/DETACHED |
| 5 | changed entries |
| 6 | staged |
| 7 | unstaged |
| 8 | untracked |

### 查看所有脏子仓

```bash
awk -F '\t' 'NR == 1 || $5 > 0' \
  specs/knowledge-base/generated/projects.tsv
```

### 继续查看真实 Git 状态

索引只提供计数。要查看文件：

```bash
git -C foundation/multimedia/av_codec status --short
git -C foundation/multimedia/av_codec diff
git -C foundation/multimedia/av_codec diff --cached
```

必须同时检查 `diff` 和 `diff --cached`，因为当前多个媒体仓的 LFS 实体已经被暂存，普通 `git diff` 看不到。

## 10. 从组件定位源码

以 `multimedia:av_codec` 为例。

### 第一步：查组件

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "av_codec"' \
  specs/knowledge-base/generated/components.tsv
```

得到：

- `bundle.json` 路径。
- 依赖组件。
- 生产构建入口。
- 测试入口。

### 第二步：确认进入产品

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "av_codec"' \
  specs/knowledge-base/generated/rk3568-parts.tsv
```

### 第三步：读取组件元数据

```bash
sed -n '1,260p' foundation/multimedia/av_codec/bundle.json
```

### 第四步：寻找构建入口

```bash
rg -n 'group\(|ohos_shared_library\(|ohos_executable\(' \
  foundation/multimedia/av_codec -g 'BUILD.gn'
```

### 第五步：寻找核心类和服务

```bash
rg -n 'REGISTER_SYSTEM_ABILITY|SystemAbility|OnRemoteRequest|main\(' \
  foundation/multimedia/av_codec -g '*.cpp' -g '*.h'
```

### 第六步：查看当前仓状态

```bash
git -C foundation/multimedia/av_codec status --short
git -C foundation/multimedia/av_codec diff --cached --stat
```

当前该仓的 25 个变化是 LFS 媒体实体被暂存，不应与业务代码修改混在一起分析。

## 11. 从问题定位子系统

常见问题对应入口：

| 问题 | 首先查阅 | 常见代码区域 |
| --- | --- | --- |
| 应用无法启动 | `architecture/build-runtime.md` | ability_runtime、bundle_framework、appspawn |
| SA 获取失败 | `architecture/system.md` | samgr、safwk、sa_profile、IPC |
| IPC 权限问题 | `architecture/build-runtime.md` | Stub、AccessToken、帐号、SELinux |
| 界面不显示 | `subsystems/README.md` | ArkUI、Window、Render Service、Display HDI |
| 音视频异常 | `subsystems/README.md` | multimedia、HDF audio/camera/codec |
| 设备驱动异常 | `products/rk3568/README.md` | HDF、HCS、devhost、kernel、vendor |
| 开机服务未启动 | `architecture/build-runtime.md` | init cfg、SA profile、安装路径 |
| 产品没有某能力 | `rk3568-parts.tsv` | product config、inherit、feature |
| 编译依赖错误 | `components.tsv` | bundle deps、external_deps、GN deps |
| 当前修改能否提交 | `workspace/state.md` | Git 状态、LFS、生成文件 |

## 12. 从知识库选择构建目标

组件查询结果第 10 列是生产入口，第 13 列是测试入口。

显示构建入口：

```bash
awk -F '\t' '$1 == "hiviewdfx" && $2 == "hiview" {
  print $10
}' specs/knowledge-base/generated/components.tsv | tr ',' '\n'
```

构建完整产品组件入口：

```bash
./build.sh --product-name rk3568 --ccache --build-target <target>
```

测试入口可能只是聚合 group，实际 suite 名还需阅读对应 `BUILD.gn`。

选择验证范围：

| 修改范围 | 建议验证 |
| --- | --- |
| 私有函数 | 目标编译 + 相关 UT |
| 组件公共接口 | 组件编译 + 反向依赖部件 + API/ABI |
| SA/IPC | UT + 真机注册/调用 + 权限与非法输入 |
| 产品配置 | preloader 差异 + 全量镜像 + 开机验证 |
| HDF/内核 | 内核/模块编译 + 刷机 + 设备测试 |
| 高入度组件 | 多部件/多产品 CI，不只局部编译 |

## 13. 使用 workspace-summary.json

环境没有预装 `jq`，可以使用 Node.js 查询。

查看概要：

```bash
node -e '
const s = require("./specs/knowledge-base/generated/workspace-summary.json")
console.log({
  projects: s.projects.total,
  dirty: s.projects.dirty,
  components: s.components.total,
  parts: s.rk3568.effectiveParts,
  subsystems: s.rk3568.effectiveSubsystems
})
'
```

查看依赖最多的公共组件：

```bash
node -e '
const s = require("./specs/knowledge-base/generated/workspace-summary.json")
console.table(s.components.mostReferencedDependencies.slice(0, 20))
'
```

查看 rk3568 各子系统部件数量：

```bash
node -e '
const s = require("./specs/knowledge-base/generated/workspace-summary.json")
console.table(s.rk3568.partsBySubsystem)
'
```

## 14. 刷新知识库

执行：

```bash
bash specs/knowledge-base/tools/generate-global-index.sh
bash specs/knowledge-base/tools/generate-foundation-index.sh
bash specs/knowledge-base/tools/generate-foundation-process-docs.sh
bash specs/knowledge-base/tools/generate-foundation-functional-docs.sh
```

生成器会：

1. 遍历 512 个子仓并读取 HEAD、分支和工作树计数。
2. 扫描并解析全部 `bundle.json`。
3. 读取当前 `out/preloader/rk3568/parts.json`。
4. 统计源码文件和扩展名。
5. 覆盖 `generated/` 下四个索引文件。

Foundation 生成器另外扫描全部 Foundation `bundle.json` 和 `BUILD.gn`，并生成 18 个子系统、115 个部件的导航页。部件 `README.md` 只在缺失时创建，`foundation-index.md` 会在刷新时覆盖。

进程文档生成器解析生产 init 配置和 SA profile，建立进程、启动身份、SA、实现库和跨部件宿主关系；测试、示例和 CLI 工具不会进入生产进程树。

功能文档生成器结合 `bundle.json`、源码 README、SystemCapability、feature、Inner Kit、源码目录和生产/测试目标，生成 18 个子系统功能全景与 115 个部件功能说明。

生成器不会修改任何 Git 子仓，但会覆盖：

```text
specs/knowledge-base/generated/projects.tsv
specs/knowledge-base/generated/components.tsv
specs/knowledge-base/generated/rk3568-parts.tsv
specs/knowledge-base/generated/workspace-summary.json
```

Foundation 生成器会覆盖：

```text
specs/knowledge-base/generated/foundation/*
specs/knowledge-base/subsystems/*/foundation-index.md
specs/knowledge-base/subsystems/*/components/*/foundation-index.md
specs/knowledge-base/subsystems/*/foundation-processes.md
specs/knowledge-base/subsystems/*/processes/*/foundation-runtime.md
specs/knowledge-base/subsystems/*/functional-overview.md
specs/knowledge-base/subsystems/*/components/*/functional-overview.md
```

### 什么时候刷新

- `repo sync` 后。
- 切换 manifest 或产品后。
- 修改 `bundle.json`/`ohos.build` 后。
- 重新执行 preloader/构建后。
- 提交、暂存或清理大量文件后。
- 准备做全局影响分析前。

### 检查生成时间

```bash
node -e '
const s = require("./specs/knowledge-base/generated/workspace-summary.json")
console.log(s.generatedAt)
'
```

## 15. 切换产品后的使用方式

当前生成器固定读取：

```text
out/preloader/rk3568/parts.json
out/preloader/rk3568/build_config.json
```

如果切换到其他产品：

1. 先对新产品执行 preloader 或构建。
2. 修改生成器中的产品输出路径，或为新产品增加参数。
3. 重新生成部件索引。
4. 不要继续把 `rk3568-parts.tsv` 当作新产品事实来源。

全局 `components.tsv` 与产品无关，可以继续使用；产品部件表必须按产品刷新。

## 16. 与 AI/Codex 配合使用

### 分析一个组件

```text
请先读取 specs/knowledge-base/README.md、subsystems/README.md，
再查询 generated/components.tsv 中 multimedia:av_codec 的记录，
分析它的源码入口、依赖、rk3568 是否包含、构建和测试方式。
```

### 分析跨子系统调用链

```text
基于 specs/knowledge-base/architecture/system.md 和 architecture/build-runtime.md，
从 ArkUI 页面启动追踪到 Window、Render Service 和 Display HDI，
并用当前源码文件验证每个关键入口。
```

### 分析修改影响

```text
查询 generated/components.tsv，找出所有依赖 ipc 的组件，
再结合当前 git diff 分析修改 foundation/communication/ipc 的影响面，
给出最小构建和回归矩阵。
```

### 分析当前工作区

```text
读取 specs/knowledge-base/workspace/state.md 和 generated/projects.tsv，
区分真实源码修改、LFS 状态、依赖安装产物和测试产物，
不要执行任何清理命令。
```

要求 AI “用知识库定位，再回到源码验证”，可以减少只依赖文档产生的误判。

## 17. Hiview 专题示例

需求：理解线程泄漏插件如何进入系统。

1. 查询组件：

```bash
awk -F '\t' '$1 == "hiviewdfx" && $2 == "hiview"' \
  specs/knowledge-base/generated/components.tsv
```

2. 确认进入产品：

```bash
awk -F '\t' '$1 == "hiviewdfx" && $2 == "hiview"' \
  specs/knowledge-base/generated/rk3568-parts.tsv
```

3. 阅读专题：

- [Thread Leak Detector 设计与代码](subsystems/hiviewdfx/processes/hiview/capabilities/reliability/features/thread-leak-detector/README.md)
- [Thread Leak Detector 运维](subsystems/hiviewdfx/processes/hiview/capabilities/reliability/features/thread-leak-detector/operations.md)

4. 验证生产链：

```text
hiview_package
  -> plugin_build:bdfr
  -> thread_leak_detector source set
  -> libbdfr.z.so
  -> bdfr_plugin_config
  -> Hiview 插件 OnLoad
```

5. 查看仓状态：

```bash
git -C base/hiviewdfx/hiview status --short --branch
```

## 18. 常见误用

### 看到源码目录就认为产品包含组件

错误。必须查询 `rk3568-parts.tsv`。

### 把 repo 项目当作组件

错误。一个仓可能包含多个 `bundle.json`，一个产品部件也可能由 `ohos.build` 聚合。

### 只看 components.tsv 就判断完整依赖

错误。还需要检查 GN `deps`、`external_deps`、动态库加载、SA 和运行时 IPC。

### 只执行 git diff 判断工作树

错误。当前存在 staged LFS 实体，必须同时执行 `git diff --cached`。

### 手工修改 generated 文件

不建议。刷新时会被覆盖。需要补充解释时应修改人工分析文档或生成器。

### 把当前 out 当作全量镜像

错误。当前只有局部目标构建，没有完整 `packages/phone/images`。

### 用旧的部件表分析新产品

错误。`rk3568-parts.tsv` 只对应当前 rk3568 preloader 输出。

## 19. 故障排查

### 生成器执行慢

它会对 512 个仓执行 Git 状态查询，并扫描约 120 万个文件。十几秒属于正常范围。

### 生成器报告组件数量变化

检查：

```bash
repo status
rg --files -g 'bundle.json' -g '!out/**' -g '!prebuilts/**' | wc -l
```

可能原因是 repo sync、组件新增/删除或工作树生成了额外 `bundle.json`。

### rk3568-parts.tsv 为空

检查：

```bash
ls -l out/preloader/rk3568/parts.json
```

如果文件不存在，需要先执行 rk3568 的 preloader/GN 生成或构建。

### 查询不到组件

依次检查：

```bash
rg -i '<keyword>' specs/knowledge-base/generated/components.tsv
rg -i '<keyword>' -g 'bundle.json'
rg -i '<keyword>' -g 'ohos.build'
```

部分产品部件由 `ohos.build` 定义，不一定有同名 `bundle.json`。

### projects.tsv 与 repo status 不一致

重新运行生成器。索引是快照，不会自动更新。

## 20. 推荐日常流程

### 开始开发前

```text
刷新索引
  -> 检查脏子仓
  -> 定位组件和产品部件
  -> 阅读 bundle.json/BUILD.gn
```

### 修改代码后

```text
查看具体 Git diff
  -> 根据依赖选择编译范围
  -> 执行 UT/MST/真机验证
  -> 刷新项目状态索引
```

### 做代码评审时

```text
确定变更子仓
  -> 映射到组件和部件
  -> 查正向/反向依赖
  -> 检查运行边界和权限
  -> 检查测试是否覆盖影响面
```

### 排查系统问题时

```text
根据现象找子系统
  -> 找运行进程/SA
  -> 找 IPC/HDF/应用调用链
  -> 对照产品配置
  -> 用真机日志和文件验证
```

知识库最有价值的使用方式不是“阅读完所有文档”，而是快速缩小源码和验证范围，然后回到当前代码确认事实。
