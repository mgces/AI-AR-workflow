# syscap_codec：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

System capability encode and decode.

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | small,standard |
| ROM/RAM | 0 / 0 |
| 源码仓 | `developtools/syscap_codec` |

## 核心能力

- `SystemCapability.Developtools.Syscap`

## 产品功能开关

- `syscap_codec_config_path`
- `syscap_codec_config_extern_path`

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/syscap_codec/taihe](../../../../../../developtools/syscap_codec/taihe) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 6 | `syscap` |
| [developtools/syscap_codec/napi](../../../../../../developtools/syscap_codec/napi) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | - |
| [developtools/syscap_codec/include](../../../../../../developtools/syscap_codec/include) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `codec_config` |
| [developtools/syscap_codec/interfaces](../../../../../../developtools/syscap_codec/interfaces) | 对外或系统内部接口定义，包括 Kit、Inner Kit、IDL 和多语言绑定。 | 0 | `inner_api` |
| [developtools/syscap_codec/src](../../../../../../developtools/syscap_codec/src) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |
| [developtools/syscap_codec/tools](../../../../../../developtools/syscap_codec/tools) | 开发、诊断或命令行辅助工具。 | 0 | - |

## 接口、依赖与测试

- Inner Kit：//developtools/syscap_codec:syscap_interface_shared。
- 组件依赖：napi,bounds_checking_function,cJSON,runtime_core。
- 三方依赖：无声明。
- 测试入口：//developtools/syscap_codec/test/unittest/common:unittest。
- 静态目标：生产 9，测试 4，总计 24。

## 继续深入

- 组件元数据：[developtools/syscap_codec/bundle.json](../../../../../../developtools/syscap_codec/bundle.json)
- 原始 README：[developtools/syscap_codec/README_ZH.md](../../../../../../developtools/syscap_codec/README_ZH.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
