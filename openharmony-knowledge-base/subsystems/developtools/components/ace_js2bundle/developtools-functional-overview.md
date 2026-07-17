# ace_js2bundle：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

ArkUI Web-like paradigm parser for syntax compilation, conversion, verification

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | no |
| 适配系统 | standard |
| ROM/RAM | - / - |
| 源码仓 | `developtools/ace_js2bundle` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- 未声明独立产品 feature。

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/ace_js2bundle/ace-loader](../../../../../../developtools/ace_js2bundle/ace-loader) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `sample`, `test`, `third_party`, `node_modules`, `plugin`, `src` |

## 接口、依赖与测试

- Inner Kit：//developtools/ace_js2bundle:ace_loader_ark_hap。
- 组件依赖：无声明。
- 三方依赖：parse5,weex-loader。
- 测试入口：未声明。
- 静态目标：生产 0，测试 0，总计 6。

## 继续深入

- 组件元数据：[developtools/ace_js2bundle/bundle.json](../../../../../../developtools/ace_js2bundle/bundle.json)
- 原始 README：[developtools/ace_js2bundle/README_zh.md](../../../../../../developtools/ace_js2bundle/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
