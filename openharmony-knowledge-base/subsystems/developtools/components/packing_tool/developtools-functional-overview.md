# packing_tool：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

packing_tool子系统用于生成打包工具和拆包工具，其中打包工具用于hap，app，hqf，appqf，hsp包的生成，拆包工具用于对hap，app，hqf，appqf，har，hsp包的拆包及对hap，hsp，app，appqf的解析。具体的功能介绍如下： \| 指令 \| 是否必选项 \| 选项 \| 描述 \| \|------------------\|-------\|---------------\|------------------------------------\| \| --mode \| 是 \| res \| 命令类型。 \| \| --entrycard-path \| 是 \| NA \| 快照目录的路径。 \| \| --pack-info-path \| 是 \| NA \| pack.info文件路径，包含卡片信息。 \| \| --out-path \| 是 \| NA \| 目标文件路径，文件名必须以.res为后缀。 \| \| --force \| 否 \| true或者false \| 默认值为false，如果为true，表示当目标文件存在时，强制删除。 \|

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | mini,small,standard |
| ROM/RAM | - / - |
| 源码仓 | `developtools/packing_tool` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- 未声明独立产品 feature。

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/packing_tool/packing_tool](../../../../../../developtools/packing_tool/packing_tool) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 154 | `frameworks` |
| [developtools/packing_tool/modulecheck](../../../../../../developtools/packing_tool/modulecheck) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 21 | - |
| [developtools/packing_tool/configcheck](../../../../../../developtools/packing_tool/configcheck) | 编译期和运行期功能配置。 | 2 | - |
| [developtools/packing_tool/ohos_packing_tool](../../../../../../developtools/packing_tool/ohos_packing_tool) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 1 | `frameworks` |
| [developtools/packing_tool/META-INF](../../../../../../developtools/packing_tool/META-INF) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `check_tool`, `packingbin_tool`, `unpacking_tool`, `packing_tool`, `collectingbininfo_tool` |
| [developtools/packing_tool/adapter](../../../../../../developtools/packing_tool/adapter) | 平台、硬件、协议或系统形态适配。 | 0 | `ohos`, `scanner` |
| [developtools/packing_tool/img](../../../../../../developtools/packing_tool/img) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |
| [developtools/packing_tool/jar](../../../../../../developtools/packing_tool/jar) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |

## 接口、依赖与测试

- Inner Kit：//developtools/packing_tool:packing_tool_external。
- 组件依赖：bounds_checking_function,cJSON,hilog,json,openssl,zlib。
- 三方依赖：无声明。
- 测试入口：//developtools/packing_tool/packing_tool/frameworks/test/unittest:unittest。
- 静态目标：生产 35，测试 113，总计 188。

## 继续深入

- 组件元数据：[developtools/packing_tool/bundle.json](../../../../../../developtools/packing_tool/bundle.json)
- 原始 README：[developtools/packing_tool/README_zh.md](../../../../../../developtools/packing_tool/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
