# mechbody_controller 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

机械体设备是一个具备自主运动能力的智能机械（比如云台，机械臂，自动升降架，机械车等）。 机械体设备控制器是OpenHarmony操作系统中用于控制机械体设备的模块。它提供查询机械体设备连接状态和控制机械体设备运动的接口，方便连接和控制机械体设备。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 950KB / 11000KB |
| 源码仓 | `foundation/distributedhardware/mechbody_controller` |

## 核心能力

- **Mechanic Core**：提供“mechanic core”能力，系统能力标识为 `SystemCapability.Mechanic.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `mechbody_controller_feature_L1`：mechbody controller 功能 l1。
- `mechbody_controller_feature_product`：mechbody controller 功能 product。
- `mechbody_controller_extended`：mechbody controller extended。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/mechbody_controller/interface](../../../../../../foundation/distributedhardware/mechbody_controller/interface) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 8 | `ets`, `napi` |
| [foundation/distributedhardware/mechbody_controller/etc](../../../../../../foundation/distributedhardware/mechbody_controller/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 2 | `init` |
| [foundation/distributedhardware/mechbody_controller/sa_profile](../../../../../../foundation/distributedhardware/mechbody_controller/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/distributedhardware/mechbody_controller/services](../../../../../../foundation/distributedhardware/mechbody_controller/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 1 | `include`, `src` |
| [foundation/distributedhardware/mechbody_controller/reference](../../../../../../foundation/distributedhardware/mechbody_controller/reference) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [mechbody](../../processes/mechbody/foundation-runtime.md) | 启动配置, SA 实现 | `8550` | `libmechbody_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributedhardware/mechbody_controller/sa_profile:mechbody_sa_profile` | [foundation/distributedhardware/mechbody_controller/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/mechbody_controller/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/distributedhardware/mechbody_controller/services:mechbody_service` | [foundation/distributedhardware/mechbody_controller/services/BUILD.gn](../../../../../../foundation/distributedhardware/mechbody_controller/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 29 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `ability_base`, `bluetooth`, `camera_framework`, `cJSON`, `c_utils`, `eventhandler`, `graphic_surface`, `ffrt`, `hilog`, `init`, `ipc`, `napi`, `safwk`, `samgr`, `ability_runtime`, `input`, `window_manager`, `sensor`, `os_account`, `hisysevent`, `runtime_core`, `drivers_interface_camera`, `device_manager`, `selinux_adapter`, `distributed_notification_service`, `api_metrics`, `icu`, `i18n`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 198 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 90 个，`ohos_fuzztest` 88 个，`ohos_unittest` 20 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/mechbody_controller/bundle.json](../../../../../../foundation/distributedhardware/mechbody_controller/bundle.json)
- 原始源码 README：[foundation/distributedhardware/mechbody_controller/README_zh.md](../../../../../../foundation/distributedhardware/mechbody_controller/README_zh.md)、[foundation/distributedhardware/mechbody_controller/README.md](../../../../../../foundation/distributedhardware/mechbody_controller/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
