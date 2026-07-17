# hapsigner：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

hap包签名工具，支持.hsp、.hqf、.hap和.app等文件签名

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | no |
| 适配系统 | standard |
| ROM/RAM | 0KB / 0KB |
| 源码仓 | `developtools/hapsigner` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- 未声明独立产品 feature。

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/hapsigner/hapsigntool_cpp/api](../../../../../../developtools/hapsigner/hapsigntool_cpp/api) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/cmd](../../../../../../developtools/hapsigner/hapsigntool_cpp/cmd) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/codesigning](../../../../../../developtools/hapsigner/hapsigntool_cpp/codesigning) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `utils`, `fsverity`, `datastructure`, `sign` |
| [developtools/hapsigner/hapsigntool_cpp/common](../../../../../../developtools/hapsigner/hapsigntool_cpp/common) | 组件内部共享的公共定义和基础实现。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/hap](../../../../../../developtools/hapsigner/hapsigntool_cpp/hap) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `config`, `provider`, `verify`, `entity`, `utils`, `sign` |
| [developtools/hapsigner/hapsigntool_cpp/profile](../../../../../../developtools/hapsigner/hapsigntool_cpp/profile) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/signer](../../../../../../developtools/hapsigner/hapsigntool_cpp/signer) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/utils](../../../../../../developtools/hapsigner/hapsigntool_cpp/utils) | 跨模块复用的工具和基础数据结构。 | 0 | `include`, `src` |
| [developtools/hapsigner/hapsigntool_cpp/zip](../../../../../../developtools/hapsigner/hapsigntool_cpp/zip) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `include`, `src` |

## 接口、依赖与测试

- Inner Kit：未声明。
- 组件依赖：bounds_checking_function,c_utils,cJSON,elfio,openssl,zlib,hilog。
- 三方依赖：openssl。
- 测试入口：//developtools/hapsigner/hapsigntool_cpp_test/unittest:hapsigntool_pc_unittest,//developtools/hapsigner/hapsigntool_cpp_test/fuzztest:hapsigntool_pc_fuzztest。
- 静态目标：生产 3，测试 62，总计 69。

## 继续深入

- 组件元数据：[developtools/hapsigner/hapsigntool_cpp/bundle.json](../../../../../../developtools/hapsigner/hapsigntool_cpp/bundle.json)
- 原始 README：未找到
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
