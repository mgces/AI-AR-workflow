# 知识库信息架构

## 目标

知识库必须保持同一层级只出现同一抽象维度，避免把“产品”“子系统”“进程”和“小功能点”并列。

采用两套结构：

1. **所有权树**：回答某项能力归谁维护、运行在哪里、实现到什么粒度。
2. **横向视图**：回答系统如何构建、产品如何裁剪、当前工作区是什么状态。

横向视图不拥有功能节点，具体功能必须落到所有权树。

## 顶层目录

```text
knowledge-base/
├── README.md                   # 总入口，只展示同层级导航
├── USAGE.md                    # 使用方法
├── INFORMATION_ARCHITECTURE.md # 本规范
├── architecture/               # 跨子系统系统架构视图
├── products/                   # 产品实例与裁剪视图
├── source-domains/             # foundation/base 等物理源码域视图
├── subsystems/                 # 功能所有权主树
├── workspace/                  # 当前源码工作区快照
├── generated/                  # 机器生成全量索引
├── templates/                  # 新节点模板
└── tools/                      # 索引生成工具
```

收到新的代码路径时，使用 [给定代码路径的全局索引、进程与功能说明模板](templates/code-path-global-summary.md)，先建立源码域横向视图和运行进程树，再映射到既有所有权树。

## 所有权树层级

```text
L1 subsystem
  L2 component 或 process
    L3 capability domain
      L4 feature
        L5 implementation / operation / test / evidence
```

### L1：子系统

路径：

```text
subsystems/<subsystem>/README.md
```

职责：

- 子系统边界和目标。
- 产品选入的组件。
- 运行进程/SA。
- 对外接口和依赖。
- 能力域目录。

例子：`subsystems/hiviewdfx/README.md`。

### L2：组件

路径：

```text
subsystems/<subsystem>/components/<component>/README.md
```

适用于：

- 主要是库、SDK、构建工具或配置集合。
- 没有独立运行进程。
- 一个进程无法完整代表组件边界。

组件节点记录 `bundle.json`、GN 入口、Inner API、依赖和测试。

Foundation 等大规模源码域的组件节点分为三类文档：

```text
README.md             # 组件入口
functional-overview.md # 功能定位、能力、接口、运行实体和测试边界
foundation-index.md    # 全量 GN 目标与构建事实
```

阅读入口必须优先指向功能说明，不能用数千条构建目标代替功能介绍。需要继续深入时，再从功能说明拆出能力域和 feature 文档。

### L2：运行进程/SA

路径：

```text
subsystems/<subsystem>/processes/<process>/README.md
```

适用于：

- init service。
- System Ability 进程。
- appspawn/render service/devhost 等运行实体。
- 组件的核心行为主要由某个进程承载。

进程节点记录：启动方式、uid/gid、SELinux domain、SA、socket、动态库、插件和上下游。

Foundation 的进程基线使用：

```text
subsystems/<subsystem>/foundation-processes.md
subsystems/<subsystem>/processes/<process>/README.md
subsystems/<subsystem>/processes/<process>/foundation-runtime.md
```

进程归属优先由 init 配置确定。SA profile 可以来自其他部件或其他子系统，因此必须同时记录“宿主子系统”和“SA 提供部件”，不能把宿主进程简单归到每个 SA 的源码目录。

### L3：能力域

路径：

```text
.../capabilities/<domain>/README.md
```

能力域是稳定的业务分类，不应是单个需求名。

示例：

```text
reliability
event-processing
performance
logging
security
storage
ipc
```

### L4：具体功能

路径：

```text
.../capabilities/<domain>/features/<feature>/README.md
```

功能节点可以对应一个插件、检测器、协议、算法或独立需求。

例子：

```text
subsystems/hiviewdfx/processes/hiview/
  capabilities/reliability/features/thread-leak-detector/
```

thread leak 只能出现在此层，不应出现在知识库根导航中与子系统并列。

### L5：实现与运维

功能目录可继续包含：

```text
README.md       # 功能设计和代码分析
operations.md   # 构建、部署、参数、日志、排障
testing.md      # 测试矩阵和覆盖边界
security.md     # 权限、IPC、隐私和攻击面
evidence/       # 必要时保存证据索引，不复制大产物
```

只有信息量足够时才拆分文件，避免为每个函数建立目录。

## 三种归属方式

### 进程内功能

运行时行为明确属于某个进程：

```text
subsystems/<s>/processes/<p>/capabilities/<c>/features/<f>/
```

例如 Hiview 插件、SAMgr 的按需启动、Render Service 的合成策略。

### 组件内能力

库/API/工具没有单一运行进程：

```text
subsystems/<s>/components/<component>/capabilities/<c>/features/<f>/
```

例如 IPC 序列化、编译器优化 pass、构建规则。

### 子系统级跨进程能力

一个能力由多个进程和组件共同实现：

```text
subsystems/<s>/capabilities/<c>/README.md
```

该节点只描述跨节点协作，并链接到各进程/组件实现，不复制实现细节。

## 横向视图

### architecture

回答：

- 系统分层和跨子系统调用链。
- 构建、启动、IPC、应用运行。
- 不承载某个子系统的具体功能清单。

### products

回答：

- 产品选择了哪些部件。
- 板级、SoC、内核和 feature 覆写。
- 产品节点链接到子系统节点，不复制子系统内部功能分析。

### workspace

回答：

- 当前 checkout、HEAD、脏仓、LFS 和构建输出状态。
- 工作区状态是时间快照，不是系统架构。

### source-domains

回答：

- `foundation/`、`base/` 等物理源码目录包含哪些仓、部件和 GN 目标。
- 物理目录中的代码分别归属哪些子系统。
- 是否存在没有 `bundle.json` 的仓库级构建目标。

源码域是横向映射视图，不是所有权树层级。例如 `foundation` 不能与 `ability`、`communication` 并列为子系统，也不能拥有独立的功能节点。链接方向应为：

```text
source domain -> subsystem -> component/process -> capability -> feature
```

### generated

回答：

- 全量项目、组件、部件和统计查询。
- 生成文件不承担人工架构解释。

## 节点链接规则

链接方向应保持：

```text
产品 -> 子系统
子系统 -> 组件/进程
进程/组件 -> 能力域
能力域 -> 功能
功能 -> 源码/测试/证据
```

允许反向提供“返回上级”链接，但不要跨过中间层直接把叶子功能放到首页。

## 命名规则

- 目录使用源码/运行时稳定名称，小写加连字符。
- 子系统使用产品 part 的 subsystem 名，如 `hiviewdfx`。
- 组件使用 `bundle.json` 的 component name。
- 进程使用设备实际进程名，如 `hiview`、`faultloggerd`、`hidumper-service`。
- 能力域使用稳定业务词，如 `reliability`，不要使用需求单号。
- feature 使用具体实现名，如 `thread-leak-detector`。

## 拆分判断

满足任意两项时，可以把一个功能拆成独立 feature：

- 有独立构建目标或插件。
- 有独立配置、参数或产物。
- 有独立测试套件。
- 有明确运行时状态机。
- 有独立故障域、安全边界或运维流程。
- 预计后续会持续演进。

只有少量函数且没有独立边界时，应保留在上级能力文档中。

## 扩展示例

未来继续细分 Hiview：

```text
subsystems/hiviewdfx/processes/hiview/
├── README.md
└── capabilities/
    ├── event-processing/
    │   ├── README.md
    │   └── features/
    │       ├── event-validator/
    │       └── event-store/
    ├── reliability/
    │   ├── README.md
    │   └── features/
    │       ├── thread-leak-detector/
    │       ├── native-memory-leak/
    │       ├── bbox-detector/
    │       └── freeze-detector/
    └── performance/
        ├── README.md
        └── features/
            ├── unified-collector/
            └── xperf/
```

未来细分其他子系统时复制同一结构，不再新增新的顶层分类方式。
