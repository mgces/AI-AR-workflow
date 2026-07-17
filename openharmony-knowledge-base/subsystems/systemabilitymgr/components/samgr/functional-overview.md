# samgr 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

samgr组件是OpenHarmony的核心组件，提供OpenHarmony系统服务启动、注册、查询等功能。 samgr服务接收到sa框架层发送的注册消息，会在本地缓存中存入系统服务相关信息。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `systemabilitymgr` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 300KB / 7130KB |
| 源码仓 | `foundation/systemabilitymgr/samgr` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `samgr_feature_coverage`：samgr 功能 覆盖率。
- `samgr_enable_extend_load_timeout`：samgr 启用 延长加载超时。
- `samgr_enable_delay_dbinder`：samgr 启用 延迟启动 DBinder。
- `samgr_support_multi_instance`：samgr 支持 多实例。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/systemabilitymgr/samgr/services](../../../../../../foundation/systemabilitymgr/samgr/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 29 | `common`, `dfx`, `lsamgr`, `samgr` |
| [foundation/systemabilitymgr/samgr/interfaces](../../../../../../foundation/systemabilitymgr/samgr/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 18 | `innerkits` |
| [foundation/systemabilitymgr/samgr/etc](../../../../../../foundation/systemabilitymgr/samgr/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 5 | - |
| [foundation/systemabilitymgr/samgr/frameworks](../../../../../../foundation/systemabilitymgr/samgr/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `native` |
| [foundation/systemabilitymgr/samgr/utils](../../../../../../foundation/systemabilitymgr/samgr/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `native` |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy:samgr_proxy` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/include/` | `if_system_ability_manager.h`, `iservice_registry.h`, `isystem_ability_load_callback.h`, `isystem_ability_status_change.h`, `isystem_process_status_change.h`, `system_ability_definition.h`, `system_ability_manager_proxy.h`, `system_ability_load_callback_stub.h` 等 11 个 |
| `//foundation/systemabilitymgr/samgr/interfaces/innerkits/common:samgr_common` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/common/include/` | `sa_profiles.h`, `parse_util.h` |
| `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust:samgr_rust` | - | - |
| `//foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache:dynamic_cache` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache/include` | `dynamic_cache.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [samgr](../../processes/samgr/foundation-runtime.md) | 启动配置 | - | - |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/systemabilitymgr/samgr/services/samgr/native:samgr` | [foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn) |

生产库形态：`ohos_shared_library` 2 个，`ohos_static_library` 2 个，`ohos_rust_shared_library` 1 个。

## 依赖与协作边界

该部件声明 24 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `access_token`, `c_utils`, `common_event_service`, `device_manager`, `dsoftbus`, `ffrt`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `json`, `libxml2`, `mksh`, `preferences`, `safwk`, `selinux_adapter`, `qos_manager`, `toybox`, `config_policy`, `rust_cxx`, `ylong_runtime`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 37 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`group` 11 个，`ohos_unittest` 11 个，`ohos_fuzztest` 4 个，`ohos_executable` 3 个，`ohos_static_library` 2 个，`ohos_rust_unittest` 2 个，`rust_cxx` 1 个，`ohos_rust_systemtest` 1 个，`ohos_shared_library` 1 个，`ohos_rust_shared_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/systemabilitymgr/samgr/bundle.json](../../../../../../foundation/systemabilitymgr/samgr/bundle.json)
- 原始源码 README：[foundation/systemabilitymgr/samgr/README_zh.md](../../../../../../foundation/systemabilitymgr/samgr/README_zh.md)、[foundation/systemabilitymgr/samgr/README.md](../../../../../../foundation/systemabilitymgr/samgr/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
