# bundle_tool 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

包管理命令行工具：提供命令行中执行hap包的安装、更新、卸载及信息查询的能力

源码 README 补充说明：

> bm是用来方便开发者调试的一个工具。bm工具被hdc工具封装，进入hdc shell命令后，就可以使用bm工具。 \| 命令 \| 描述 \| \| -------- \| -------- \| \| help \| 帮助命令，显示bm支持的命令信息。 \| \| install \| 安装命令，用来安装应用。 \| \| uninstall \| 卸载命令，用来卸载应用。 \| \| install-plugin \| 安装插件命令，用于安装插件。\| \| uninstall-plugin \| 卸载插件命令，用于卸载插件。\| \| dump \| 查询命令，用来查询应用的相关信息。 \| \| clean \| 清理命令，用来清理应用的缓存和数据。此命令在root版本下可用，在user版本下打开开发者模式可用。其它情况不可用。\| \| enable \| 使能命令，用来使能应用，使能后应用可以继续使用。此命令在root版本下可用，在user版本下不可用。 \| \| disable \| 禁用命令，用来禁用应用，禁用后应用无法使用。此命令在root版本下可用，在user版本下不可用。 \| \| get \| 获取udid命令，用来获取设备的udid。 \| \| quickfix \| 快速修复相关命令，用来执行补丁相关操作，如补丁安装、补丁查询。 \| \| compile \| 应用执行编译AOT命令。 \| \| copy-ap \| 把应用的ap文件拷贝到/data/local/pgo目录下，供shell用户读取文件。 \| \| dump-dependencies \| 查询应用依赖的模块信息。 \| \| dump-shared \| 查询应用间HSP应用信息。 \| \| dump-overlay \| 打印overlay应用的overlayModuleInfo。 \| \| dump-target-overlay \| 打印目标应用的所有关联overlay应用的overlayModuleInfo。 \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | ~300KB / ~100KB |
| 源码仓 | `foundation/bundlemanager/bundle_tool` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/bundle_tool/frameworks](../../../../../../foundation/bundlemanager/bundle_tool/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 6 | `include`, `src` |
| [foundation/bundlemanager/bundle_tool/ohos_bm](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `docs`, `include`, `src` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/bundlemanager/bundle_tool/frameworks:bm` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/bundlemanager/bundle_tool/ohos_bm:ohos-bm` | [foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn) |

生产库形态：`ohos_source_set` 2 个。

## 依赖与协作边界

该部件声明 21 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `access_token`, `ability_runtime`, `bundle_framework`, `common_event_service`, `c_utils`, `cJSON`, `device_manager`, `distributed_bundle_framework`, `hilog`, `init`, `ipc`, `os_account`, `samgr`, `selinux_adapter`, `json`, `jsoncpp`, `access_token`, `appverify`, `ffrt`, `kv_store`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 31 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`group` 11 个，`ohos_unittest` 9 个，`ohos_moduletest` 3 个，`ohos_systemtest` 3 个，`ohos_copy` 2 个，`ohos_source_set` 1 个，`ohos_executable` 1 个，`ohos_app` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/bundle_tool/bundle.json](../../../../../../foundation/bundlemanager/bundle_tool/bundle.json)
- 原始源码 README：[foundation/bundlemanager/bundle_tool/README_zh.md](../../../../../../foundation/bundlemanager/bundle_tool/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
