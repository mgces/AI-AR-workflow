# ringtone_library 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

provides a set of native APIs for access ringtone db information

源码 README 补充说明：

> **ringtone\_library** 仓库提供了一系列易用的接口用于设定及获取系统铃音信息。 **ringtone\_library** 提供了标准DataShareExtension接口，支持存储及查询通过SystemSoundManager设置的自定义来电/闹钟/短信/系统通知铃音文件。 系统应用及音乐开放能力RingtoneKit通过SystemSoundManager设置及查询自定义铃音，非系统应用通过音乐开放能力RingtoneKit设置及查询自定义铃音。 支持能力列举如下： 读取铃音内容 存储和删除自定义铃音 读取铃音列表，包含系统铃音和自定义铃音 扫描系统预制铃音目录 支持应用静默访问铃音库

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 363.2KB / 348KB |
| 源码仓 | `foundation/multimedia/ringtone_library` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/ringtone_library/services](../../../../../../foundation/multimedia/ringtone_library/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 13 | `etc`, `ringtone_data_extension`, `ringtone_dfx`, `ringtone_helper`, `ringtone_restore`, `ringtone_scanner`, `ringtone_setting`, `utils` |
| [foundation/multimedia/ringtone_library/frameworks](../../../../../../foundation/multimedia/ringtone_library/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 4 | `ringtone_extension_hap` |
| [foundation/multimedia/ringtone_library/interfaces](../../../../../../foundation/multimedia/ringtone_library/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/ringtone_library/services:ringtone_data_extension` | `//foundation/multimedia/ringtone_library/interfaces/inner_api/native` | `ringtone_type.h`, `ringtone_db_const.h`, `ringtone_proxy_uri.h` |
| `//foundation/multimedia/ringtone_library/services/ringtone_helper:ringtone_data_helper` | `//foundation/multimedia/ringtone_library/interfaces/inner_api/native` | `ringtone_asset.h`, `ringtone_check_utils.h`, `ringtone_fetch_result.h`, `simcard_setting_asset.h`, `vibrate_asset.h`, `haptic_2_tone_asset.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:ringtone_extension_hap` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) |
| `ohos_app_scope` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:RingtoneLibStage_app_profile` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) |

生产库形态：`ohos_shared_library` 5 个。

## 依赖与协作边界

该部件声明 28 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `bundle_framework`, `c_utils`, `common_event_service`, `config_policy`, `data_share`, `hilog`, `hicollie`, `hisysevent`, `hitrace`, `image_framework`, `init`, `ipc`, `kv_store`, `libxml2`, `media_foundation`, `media_library`, `napi`, `player_framework`, `relational_store`, `samgr`, `preferences`, `os_account`, `safwk`, `ets_frontend`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 24 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 11 个，`ohos_unittest` 10 个，`ohos_executable` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/ringtone_library/bundle.json](../../../../../../foundation/multimedia/ringtone_library/bundle.json)
- 原始源码 README：[foundation/multimedia/ringtone_library/README_zh.md](../../../../../../foundation/multimedia/ringtone_library/README_zh.md)、[foundation/multimedia/ringtone_library/README.md](../../../../../../foundation/multimedia/ringtone_library/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
