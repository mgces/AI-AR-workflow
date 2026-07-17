# global_resource_tool：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

restool（资源编译工具）是一种资源构建工具。通过编译资源文件创建资源索引、解析资源。restool保存在sdk安装目录下的toolchains子目录。 支持参数配置类型：MccMnc、Locale、Orientation、Device、ColorMode、Density

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | no |
| 适配系统 | mini,small,standard |
| ROM/RAM | 0KB / 0KB |
| 源码仓 | `developtools/global_resource_tool` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- 未声明独立产品 feature。

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/global_resource_tool/include](../../../../../../developtools/global_resource_tool/include) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `cmd` |
| [developtools/global_resource_tool/src](../../../../../../developtools/global_resource_tool/src) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `cmd` |

## 接口、依赖与测试

- Inner Kit：未声明。
- 组件依赖：zlib。
- 三方依赖：bounds_checking_function,cJSON,libpng。
- 测试入口：未声明。
- 静态目标：生产 4，测试 1，总计 6。

## 继续深入

- 组件元数据：[developtools/global_resource_tool/bundle.json](../../../../../../developtools/global_resource_tool/bundle.json)
- 原始 README：[developtools/global_resource_tool/README_zh.md](../../../../../../developtools/global_resource_tool/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
