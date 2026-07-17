# safwk 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

在系统服务管理子系统中safwk组件定义OpenHarmony中SystemAbility的实现方法，并提供启动、注册等接口实现。 SystemAbility实现一般采用XXX.cfg + profile.json + libXXX.z.so的方式由init进程执行对应的XXX.cfg文件拉起相关SystemAbility进程。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `systemabilitymgr` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 200KB / 7130KB |
| 源码仓 | `foundation/systemabilitymgr/safwk` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `safwk_feature_coverage`：safwk 功能 覆盖率。
- `safwk_enable_run_on_demand_qos`：safwk 启用 run on demand 服务质量。
- `safwk_feature_support_saspawn`：safwk 功能 支持 saspawn。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/systemabilitymgr/safwk/interfaces](../../../../../../foundation/systemabilitymgr/safwk/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 13 | `innerkits` |
| [foundation/systemabilitymgr/safwk/services](../../../../../../foundation/systemabilitymgr/safwk/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 5 | `safwk` |
| [foundation/systemabilitymgr/safwk/etc](../../../../../../foundation/systemabilitymgr/safwk/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | `profile` |
| [foundation/systemabilitymgr/safwk/svc](../../../../../../foundation/systemabilitymgr/safwk/svc) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `include`, `src` |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_fwk` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk` | `system_ability.h`, `system_ability_ondemand_reason.h` |
| `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust:system_ability_fwk_rust` | - | - |
| `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_ondemand_reason` | - | - |
| `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:api_cache_manager` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk` | `api_cache_manager.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [foundation](../../processes/foundation/foundation-runtime.md) | 启动配置 | - | - |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/systemabilitymgr/safwk/services/safwk:sa_main` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) |
| `ohos_executable` | `//foundation/systemabilitymgr/safwk/svc:svc` | [foundation/systemabilitymgr/safwk/svc/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/svc/BUILD.gn) |

生产库形态：`ohos_shared_library` 3 个，`ohos_rust_shared_library` 3 个，`ohos_static_library` 2 个。

## 依赖与协作边界

该部件声明 12 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ffrt`, `hilog`, `hitrace`, `ipc`, `init`, `json`, `samgr`, `c_utils`, `access_token`, `rust_cxx`, `ylong_runtime`, `hisysevent`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 26 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_shared_library` 9 个，`ohos_unittest` 8 个，`group` 5 个，`ohos_rust_unittest` 1 个，`ohos_fuzztest` 1 个，`ohos_static_library` 1 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/systemabilitymgr/safwk/bundle.json](../../../../../../foundation/systemabilitymgr/safwk/bundle.json)
- 原始源码 README：[foundation/systemabilitymgr/safwk/README_zh.md](../../../../../../foundation/systemabilitymgr/safwk/README_zh.md)、[foundation/systemabilitymgr/safwk/README.md](../../../../../../foundation/systemabilitymgr/safwk/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
