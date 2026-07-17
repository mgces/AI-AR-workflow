# device_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

DeviceManager组件在OpenHarmony上提供账号无关的分布式设备的认证组网能力，并为开发者提供了一套用于分布式设备间监听、发现和认证的接口。 dsoftbus提供能力： 提供设备上下线通知及设备信息，设备认证通道和设备发现能力。 deviceauth提供能力： 提供设备群组管理和群组认证能力。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard,mini |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 16384KB |
| 源码仓 | `foundation/distributedhardware/device_manager` |

## 核心能力

- **Distributed Hardware Device Manager**：提供“distributed hardware device manager”能力，系统能力标识为 `SystemCapability.DistributedHardware.DeviceManager`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `device_manager_no_interaction_auth`：device manager no interaction auth。
- `device_manager_feature_product`：device manager 功能 product。
- `device_manager_enable_ets_frontend`：device manager 启用 ets frontend。
- `device_manager_capability`：device manager capability。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/device_manager/interfaces](../../../../../../foundation/distributedhardware/device_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 22 | `cj`, `inner_kits`, `kits`, `mini_tools_kits` |
| [foundation/distributedhardware/device_manager/services](../../../../../../foundation/distributedhardware/device_manager/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 13 | `etc`, `implementation`, `service`, `softbuscache` |
| [foundation/distributedhardware/device_manager/common](../../../../../../foundation/distributedhardware/device_manager/common) | 组件内部共享的公共定义、工具和基础实现。 | 8 | `include`, `src` |
| [foundation/distributedhardware/device_manager/3rd](../../../../../../foundation/distributedhardware/device_manager/3rd) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 7 | `interfaces`, `services`, `utils` |
| [foundation/distributedhardware/device_manager/utils](../../../../../../foundation/distributedhardware/device_manager/utils) | 跨模块复用的基础工具和通用数据结构。 | 5 | `include`, `src` |
| [foundation/distributedhardware/device_manager/display](../../../../../../foundation/distributedhardware/device_manager/display) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `AppScope`, `entry`, `signature` |
| [foundation/distributedhardware/device_manager/radar](../../../../../../foundation/distributedhardware/device_manager/radar) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `include`, `src` |
| [foundation/distributedhardware/device_manager/sa_profile](../../../../../../foundation/distributedhardware/device_manager/sa_profile) | System Ability 注册信息及进程装载配置。 | 4 | - |
| [foundation/distributedhardware/device_manager/commondependency](../../../../../../foundation/distributedhardware/device_manager/commondependency) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `include`, `src` |
| [foundation/distributedhardware/device_manager/json](../../../../../../foundation/distributedhardware/device_manager/json) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `include`, `src` |
| [foundation/distributedhardware/device_manager/ext](../../../../../../foundation/distributedhardware/device_manager/ext) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `pin_auth` |
| [foundation/distributedhardware/device_manager/permission](../../../../../../foundation/distributedhardware/device_manager/permission) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | - |
| [foundation/distributedhardware/device_manager/.codespec](../../../../../../foundation/distributedhardware/device_manager/.codespec) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `changes` |
| [foundation/distributedhardware/device_manager/.gitcode](../../../../../../foundation/distributedhardware/device_manager/.gitcode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/distributedhardware/device_manager/commondependency_RefactorByAI](../../../../../../foundation/distributedhardware/device_manager/commondependency_RefactorByAI) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 7 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributedhardware/device_manager/interfaces/inner_kits/native_cpp:devicemanagersdk` | `//foundation/distributedhardware/device_manager/interfaces/inner_kits/native_cpp/include` | `device_manager.h`, `device_manager_callback.h`, `dm_device_info.h`, `dm_publish_info.h`, `dm_subscribe_info.h` |
| `//foundation/distributedhardware/device_manager/interfaces/mini_tools_kits/native_cpp:devicemanagerminisdk` | `//foundation/distributedhardware/device_manager/interfaces/mini_tools_kits/native_cpp/include` | `device_manager_mini.h` |
| `//foundation/distributedhardware/device_manager/interfaces/cj/kits:cj_distributed_device_manager_ffi` | - | - |
| `//foundation/distributedhardware/device_manager/json:devicemanagerjson` | `//foundation/distributedhardware/device_manager/json/include` | `json_object.h` |
| `//foundation/distributedhardware/device_manager/interfaces/kits/ndk:devicemanager_ndk` | `//foundation/distributedhardware/device_manager/interfaces/kits/ndk/include` | `oh_device_manager_err_code.h`, `oh_device_manager.h` |
| `//foundation/distributedhardware/device_manager/3rd/interfaces:devicemanager3rdsdk` | `//foundation/distributedhardware/device_manager/3rd/interfaces/include/interface` | `device_manager_callback_3rd.h`, `device_manager_impl_3rd.h` |
| `//foundation/distributedhardware/device_manager/3rd/utils:devicemanager3rdutils` | `//foundation/distributedhardware/device_manager/3rd/utils/include` | `device_manager_data_struct_3rd.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [device_manager](../../processes/device_manager/foundation-runtime.md) | 启动配置, SA 实现 | `4802` | `libdevicemanagerservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/distributedhardware/device_manager/display/entry:DeviceManager_UI` | [foundation/distributedhardware/device_manager/display/entry/BUILD.gn](../../../../../../foundation/distributedhardware/device_manager/display/entry/BUILD.gn) |
| `ohos_app_scope` | `//foundation/distributedhardware/device_manager/display/entry:devicemanager_ui_app_profile` | [foundation/distributedhardware/device_manager/display/entry/BUILD.gn](../../../../../../foundation/distributedhardware/device_manager/display/entry/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/distributedhardware/device_manager/sa_profile:dm_sa_profile` | [foundation/distributedhardware/device_manager/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/device_manager/sa_profile/BUILD.gn) |
| `executable` | `//foundation/distributedhardware/device_manager/services/service:devicemanagerservice` | [foundation/distributedhardware/device_manager/services/service/BUILD.gn](../../../../../../foundation/distributedhardware/device_manager/services/service/BUILD.gn) |

生产库形态：`ohos_shared_library` 18 个，`shared_library` 8 个，`static_library` 5 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 40 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bounds_checking_function`, `bluetooth`, `bundle_framework`, `cJSON`, `c_utils`, `common_event_service`, `data_share`, `device_auth`, `device_info_manager`, `dsoftbus`, `ets_frontend`, `eventhandler`, `ffrt`, `hicollie`, `hisysevent`, `hitrace`, `hilog`, `init`, `ipc`, `json`, `kv_store`, `mbedtls`, `memmgr`, `napi`, `libuv`, `node`, `openssl`, `os_account`, `power_manager`, `resource_management`, `runtime_core`, `safwk`, `samgr`, `screenlock_mgr`, `selinux_adapter`, `wifi`, `zlib`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 316 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 112 个，`group` 104 个，`ohos_fuzztest` 91 个，`ohos_shared_library` 4 个，`ohos_benchmarktest` 2 个，`ohos_static_library` 2 个，`unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/device_manager/bundle.json](../../../../../../foundation/distributedhardware/device_manager/bundle.json)
- 原始源码 README：[foundation/distributedhardware/device_manager/README_zh.md](../../../../../../foundation/distributedhardware/device_manager/README_zh.md)、[foundation/distributedhardware/device_manager/README.md](../../../../../../foundation/distributedhardware/device_manager/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
