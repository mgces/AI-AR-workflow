# distributed_bundle_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式包管理服务负责管理跨设备的组件调度和任务管理，实现跨设备RPC的能力，可以按需获取跨设备指定语言的资源。 getRemoteAbilityInfo获取由elementName指定的远程设备上的应用的AbilityInfo信息(callback形式)

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | ~400KB / ~6577KB |
| 源码仓 | `foundation/bundlemanager/distributed_bundle_framework` |

## 核心能力

- **Bundle Manager Distributed Bundle Framework**：提供“bundle manager distributed bundle framework”能力，系统能力标识为 `SystemCapability.BundleManager.DistributedBundleFramework`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `distributed_bundle_framework_graphics`：distributed bundle framework 图形协同。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/distributed_bundle_framework/services](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 15 | `dbms` |
| [foundation/bundlemanager/distributed_bundle_framework/interfaces](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 13 | `inner_api`, `kits` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api:dbms_fwk` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api/include` | `distributed_bms_interface.h`, `distributed_bms_proxy.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `bundlemanager` | [d-bms](../../processes/d-bms/foundation-runtime.md) | 启动配置, SA 实现 | `402` | `libdbms.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile:distributedbms_sa_profile` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 6 个。

## 依赖与协作边界

该部件声明 23 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `access_token`, `bundle_framework`, `cJSON`, `c_utils`, `dsoftbus`, `hisysevent`, `hilog`, `i18n`, `ipc`, `image_framework`, `napi`, `os_account`, `resource_management`, `runtime_core`, `safwk`, `samgr`, `selinux_adapter`, `common_event_service`, `device_manager`, `hicollie`, `init`, `kv_store`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 13 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 7 个，`ohos_unittest` 2 个，`ohos_fuzztest` 2 个，`ohos_copy` 1 个，`ohos_app` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/distributed_bundle_framework/bundle.json](../../../../../../foundation/bundlemanager/distributed_bundle_framework/bundle.json)
- 原始源码 README：[foundation/bundlemanager/distributed_bundle_framework/README_zh.md](../../../../../../foundation/bundlemanager/distributed_bundle_framework/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
