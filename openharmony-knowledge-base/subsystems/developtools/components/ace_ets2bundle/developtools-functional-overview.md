# ace_ets2bundle：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

ArkUI declarative paradigm parser for syntax compilation, conversion, verification

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | standard |
| ROM/RAM | - / - |
| 源码仓 | `developtools/ace_ets2bundle` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- 未声明独立产品 feature。

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/ace_ets2bundle/ets1.2](../../../../../../developtools/ace_ets2bundle/ets1.2) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 34 | `libarkts`, `interop`, `node_modules`, `common`, `build-common`, `gn`, `compat` |
| [developtools/ace_ets2bundle/arkui-plugins](../../../../../../developtools/ace_ets2bundle/arkui-plugins) | 由框架或服务动态选择、加载的插件实现。 | 4 | `interop-plugins`, `ui-plugins`, `collectors`, `test`, `ui-syntax-plugins`, `node_modules`, `common`, `memo-plugins` |
| [developtools/ace_ets2bundle/koala-wrapper](../../../../../../developtools/ace_ets2bundle/koala-wrapper) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 4 | `koalaui`, `tools`, `node_modules`, `native`, `build`, `src` |
| [developtools/ace_ets2bundle/.codespec](../../../../../../developtools/ace_ets2bundle/.codespec) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `changes` |
| [developtools/ace_ets2bundle/.gitcode](../../../../../../developtools/ace_ets2bundle/.gitcode) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |
| [developtools/ace_ets2bundle/compiler](../../../../../../developtools/ace_ets2bundle/compiler) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `config`, `sample`, `script`, `insight_intents`, `tools`, `test`, `server`, `node_modules` |

## 接口、依赖与测试

- Inner Kit：//developtools/ace_ets2bundle/arkui-plugins:ohos_ets_ui_plugins,//developtools/ace_ets2bundle/koala-wrapper:ohos_ets_koala_wrapper,//developtools/ace_ets2bundle:ets_loader_ark_hap,//developtools/ace_ets2bundle/ets1.2:ohos_ets_libarkts,//developtools/ace_ets2bundle/ets1.2:ohos_ets_libarkts_pack_prebuilt,//developtools/ace_ets2bundle/ets1.2/libarkts:panda_sdk。
- 组件依赖：node,sdk,ets_frontend,typescript,bounds_checking_function。
- 三方依赖：typescript。
- 测试入口：未声明。
- 静态目标：生产 24，测试 0，总计 67。

## 继续深入

- 组件元数据：[developtools/ace_ets2bundle/bundle.json](../../../../../../developtools/ace_ets2bundle/bundle.json)
- 原始 README：[developtools/ace_ets2bundle/README_zh.md](../../../../../../developtools/ace_ets2bundle/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
