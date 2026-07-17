# dhcp 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The DHCP module provides DHCP client and DHCP service, used to obtain, assign and manage IP address.

源码 README 补充说明：

> 动态主机配置协议 DHCP（Dynamic Host Configuration Protocol，动态主机配置协议） 是 RFC 1541定义的标准协议，该协议允许服务器向客户端动态分配IP地址和配置信息。DHCP协议支持C/S（客户端/服务器）结构，主要分为两部分： 1、DHCP客户端：通常为网络中的手机、PC、打印机等终端设备，使用从DHCP服务器分配下来的IP信息，包括IP地址、默认网关及DNS等。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 框架或基础库 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/dhcp` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/dhcp/services](../../../../../../foundation/communication/dhcp/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 13 | `dhcp_client`, `dhcp_server`, `dhcp_v6_client`, `sa_profile`, `utils` |
| [foundation/communication/dhcp/frameworks](../../../../../../foundation/communication/dhcp/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 6 | `native` |
| [foundation/communication/dhcp/interfaces](../../../../../../foundation/communication/dhcp/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [wifi_manager_service](../../processes/wifi_manager_service/foundation-runtime.md) | SA 实现 | `1126`, `1127` | `libdhcp_client.z.so`, `libdhcp_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `shared_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server_static` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/dhcp/services/sa_profile:wifi_standard_sa_profile` | [foundation/communication/dhcp/services/sa_profile/BUILD.gn](../../../../../../foundation/communication/dhcp/services/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 5 个，`shared_library` 4 个，`ohos_source_set` 2 个，`ohos_static_library` 2 个。

## 依赖与协作边界

该部件声明 14 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_runtime`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `hilog`, `init`, `ipc`, `netmanager_base`, `safwk`, `access_token`, `samgr`, `ffrt`, `time_service`, `wifi`。
- 三方实现依赖：`openssl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 27 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_fuzztest` 19 个，`group` 4 个，`ohos_unittest` 4 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/dhcp/bundle.json](../../../../../../foundation/communication/dhcp/bundle.json)
- 原始源码 README：[foundation/communication/dhcp/README.md](../../../../../../foundation/communication/dhcp/README.md)、[foundation/communication/dhcp/README.en.md](../../../../../../foundation/communication/dhcp/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
