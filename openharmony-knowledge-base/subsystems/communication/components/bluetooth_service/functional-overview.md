# bluetooth_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provides basic Bluetooth and BLE functions for applications

源码 README 补充说明：

> {**以下是 Gitee 平台说明，您可以替换此简介** Gitee 是 OSCHINA 推出的基于 Git 的代码托管平台（同时支持 SVN）。专为开发者提供稳定、高效、安全的云端软件开发协作平台 无论是个人、团队、或是企业，都能够用 Gitee 实现代码托管、项目管理、协作开发。企业项目请看 https://gitee.com/enterprises} Fork 本仓库 新建 Feat_xxx 分支 提交代码 新建 Pull Request

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4.5MB / 7.5MB |
| 源码仓 | `foundation/communication/bluetooth_service` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `bluetooth_service_avrcp_avsession`：bluetooth service avrcp avsession。
- `bluetooth_service_a2dp_sink_feature`：bluetooth service a2dp sink 功能。
- `bluetooth_service_a2dp_source_feature`：bluetooth service a2dp 媒体源 功能。
- `bluetooth_service_avrcp_ct_feature`：bluetooth service avrcp ct 功能。
- `bluetooth_service_avrcp_tg_feature`：bluetooth service avrcp tg 功能。
- `bluetooth_service_hfp_ag_feature`：bluetooth service hfp ag 功能。
- `bluetooth_service_hfp_hf_feature`：bluetooth service hfp hf 功能。
- `bluetooth_service_hid_host_feature`：bluetooth service hid host 功能。
- `bluetooth_service_pan_feature`：bluetooth service pan 功能。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/bluetooth_service/services](../../../../../../foundation/communication/bluetooth_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 24 | `bluetooth`, `bluetooth_lite` |
| [foundation/communication/bluetooth_service/sa_profile](../../../../../../foundation/communication/bluetooth_service/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [bluetooth_service](../../processes/bluetooth_service/foundation-runtime.md) | 启动配置, SA 实现 | `1130` | `libbluetooth_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/communication/bluetooth_service/sa_profile:communication_bluetooth_service_sa_profile` | [foundation/communication/bluetooth_service/sa_profile/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/sa_profile/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/bluetooth_service/services/bluetooth/ipc:btipc_service` | [foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/server:bluetooth_server` | [foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn) |

生产库形态：`ohos_shared_library` 6 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 31 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `audio_framework`, `av_session`, `hilog`, `hisysevent`, `hitrace`, `ipc`, `samgr`, `access_token`, `bluetooth`, `drivers_interface_bluetooth`, `eventhandler`, `ability_base`, `call_manager`, `core_service`, `hdf_core`, `init`, `input`, `safwk`, `common_event_service`, `state_registry`, `c_utils`, `jsoncpp`, `image_framework`, `googletest`, `libuv`, `libxml2`, `openssl`, `bounds_checking_function`, `bundle_framework`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 51 个测试目标，bundle 声明 8 个测试入口。

主要测试形态：`ohos_unittest` 23 个，`group` 20 个，`ohos_fuzztest` 4 个，`ohos_moduletest` 3 个，`action` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/bluetooth_service/bundle.json](../../../../../../foundation/communication/bluetooth_service/bundle.json)
- 原始源码 README：[foundation/communication/bluetooth_service/README.md](../../../../../../foundation/communication/bluetooth_service/README.md)、[foundation/communication/bluetooth_service/README.en.md](../../../../../../foundation/communication/bluetooth_service/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
