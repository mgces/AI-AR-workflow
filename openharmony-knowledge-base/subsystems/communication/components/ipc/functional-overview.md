# ipc 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

IPC（Inter-Process Communication）与RPC（Remote Procedure Call）机制用于实现跨进程通信，不同的是前者使用Binder驱动，用于设备内的跨进程通信，而后者使用软总线驱动，用于跨设备跨进程通信。IPC和RPC通常采用客户端-服务器（Client-Server）模型，服务请求方（Client）可获取提供服务提供方（Server）的代理 （Proxy），并通过此代理读写数据来实现进程间的数据通信。通常，系统能力（System Ability）Server侧会先注册到系统能力管理者（System Ability Manager，缩写SAMgr）中，SAMgr负责管理这些SA并向Client提供相关的接口。Client要和某个具体的SA通信，必须先从SAMgr中获取该SA的代理，然后使用代理和SA通信。三方应用可以使用FA提供的接口绑定服务提供方的Ability，获取代理，进行通信。下文使用Proxy表示服务请求方，Stub表示服务提供方。 单个设备上跨进程通信时，传输的数据量最大约为1MB，过大的数据量请使用匿名共享内存。 不支持把跨设备的Proxy对象传递回该Proxy对象所指向的Stub对象所在的设备。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard,small,mini |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 500KB / 100KB |
| 源码仓 | `foundation/communication/ipc` |

## 核心能力

- **Communication IPC Core**：提供“ipc core”能力，系统能力标识为 `SystemCapability.Communication.IPC.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ipc_feature_rpc_enabled`：ipc 功能 跨设备 RPC 启用。
- `ipc_feature_test_enabled`：ipc 功能 测试 启用。
- `ipc_feature_trace_enabled`：ipc 功能 调用链追踪 启用。
- `ipc_feature_freeze_enabled`：ipc 功能 冻结检测 启用。
- `ipc_feature_memory_usage_enabled`：ipc 功能 内存使用统计 启用。
- `ipc_feature_calling_user_info_enabled`：ipc 功能 调用方用户信息 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/ipc/interfaces](../../../../../../foundation/communication/ipc/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 49 | `innerkits`, `kits` |
| [foundation/communication/ipc/ipc](../../../../../../foundation/communication/ipc/ipc) | 设备内 Binder IPC、跨设备 RPC 及其对象、Parcel、Proxy/Stub 等核心实现。 | 21 | `native` |
| [foundation/communication/ipc/config](../../../../../../foundation/communication/ipc/config) | 编译期或运行期功能配置。 | 2 | - |
| [foundation/communication/ipc/dbinder](../../../../../../foundation/communication/ipc/dbinder) | 跨设备 Binder 服务发现、代理映射和远端调用实现。 | 0 | `c`, `dbinder_service` |
| [foundation/communication/ipc/dl_deps](../../../../../../foundation/communication/ipc/dl_deps) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/communication/ipc/utils](../../../../../../foundation/communication/ipc/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 12 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/ipc/ipc/native/src/taihe:rpc_taihe_idl` | - | - |
| `//foundation/communication/ipc/ipc/native/src/taihe:rpc_taihe` | `//foundation/communication/ipc/ipc/native/src/taihe/inc` | `remote_object_taihe_ani.h` |
| `//foundation/communication/ipc/interfaces/innerkits/ipc_core:ipc_core` | `//foundation/communication/ipc/interfaces/innerkits/ipc_core/include` | `ipc_payload_statistics.h`, `ipc_types.h`, `ipc_skeleton.h`, `iremote_object.h`, `iremote_proxy.h`, `iremote_stub.h`, `message_parcel.h`, `message_option.h` 等 13 个 |
| `//foundation/communication/ipc/ipc/native/src/ani/rpc:rpc_ani` | `//foundation/communication/ipc/ipc/native/src/ani/rpc/include` | `ani_remote_object.h`, `ani_utils.h` |
| `//foundation/communication/ipc/interfaces/innerkits/ipc_single:ipc_single` | `//foundation/communication/ipc/interfaces/innerkits/ipc_core/include` | `ipc_payload_statistics.h`, `ipc_types.h`, `ipc_skeleton.h`, `iremote_object.h`, `iremote_proxy.h`, `iremote_stub.h`, `message_parcel.h`, `message_option.h` 等 13 个 |
| `//foundation/communication/ipc/interfaces/innerkits/libdbinder:libdbinder` | `//foundation/communication/ipc/interfaces/innerkits/libdbinder/include` | `dbinder_service.h`, `dbinder_service_stub.h` |
| `//foundation/communication/ipc/interfaces/innerkits/ipc_napi_common:ipc_napi` | `//foundation/communication/ipc/interfaces/innerkits/ipc_napi_common/include` | `napi_remote_object.h` |
| `//foundation/communication/ipc/interfaces/innerkits/rust:ipc_rust` | - | - |
| `//foundation/communication/ipc/interfaces/innerkits/cj:cj_ipc_ffi` | `//foundation/communication/ipc/interfaces/innerkits/cj/include` | - |
| `//foundation/communication/ipc/interfaces/kits/js/napi:rpc` | `//foundation/communication/ipc/interfaces/innerkits/ipc_napi_common/include` | `napi_remote_object.h` |
| `//foundation/communication/ipc/interfaces/innerkits/c_api:ipc_capi` | `//foundation/communication/ipc/interfaces/innerkits/c_api/include` | `ipc_cparcel.h`, `ipc_cremote_object.h`, `ipc_cskeleton.h`, `ipc_error_code.h`, `ipc_inner_object.h`, `ipc_kit.h` |
| `//foundation/communication/ipc/interfaces/innerkits/rust:ipc_rust_cxx` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 13 个，`shared_library` 8 个，`static_library` 5 个，`ohos_rust_shared_library` 2 个，`ohos_prebuilt_shared_library` 1 个，`ohos_static_library` 1 个，`ohos_ndk_library` 1 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 0 个三方依赖。

- 系统组件协作：`samgr`, `hitrace`, `hilog`, `c_utils`, `access_token`, `napi`, `ylong_runtime`, `ffrt`, `libuv`, `bounds_checking_function`, `hisysevent`, `json`, `selinux`, `rust`, `faultloggerd`, `runtime_core`, `rust_cxx`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 342 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_fuzztest` 176 个，`group` 64 个，`ipc_unittest` 40 个，`executable` 8 个，`ipc_dbinder_unittest` 7 个，`c_api_unittest` 7 个，`ohos_executable` 6 个，`unittest` 6 个，`ohos_static_library` 5 个，`lite_component` 5 个，`ohos_rust_unittest` 3 个，`ohos_shared_library` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/ipc/bundle.json](../../../../../../foundation/communication/ipc/bundle.json)
- 原始源码 README：[foundation/communication/ipc/README_zh.md](../../../../../../foundation/communication/ipc/README_zh.md)、[foundation/communication/ipc/README.md](../../../../../../foundation/communication/ipc/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
