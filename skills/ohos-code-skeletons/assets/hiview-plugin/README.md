# hiview 插件骨架

把一个新功能做成 hiview 插件的最小可编译骨架。替换占位符后可直接进入 P1b→P2 编译。

## 装载/注册链

```
hiview_package
  → 插件 .so (libXXX) 或聚合包 (如 bdfr) 里的 source_set
    → REGISTER(<PLUGIN_NAME>)  ← 插件被 hiview 工厂发现的唯一途径
      → OnLoad()   启动:定时/FFRT 任务、读 param、订阅事件
      → OnEvent()  事件驱动:IsInterestedPipelineEvent 过滤后路由(可删)
      → OnUnload() 卸载:停任务、释放
```

## 占位符变量表(每个占位符都必须替换)

| 占位符 | 含义 | 取值来源 / 示例 |
| --- | --- | --- |
| `<PLUGIN_NAME>` | 插件类名(PascalCase) | 如 `ThreadLeakDetector` |
| `<PLUGIN_GUARD>` | 头文件 include guard 片段(UPPER_SNAKE) | 如 `THREAD_LEAK_DETECTOR` |
| `<plugin_file>` | 源文件名前缀(snake_case) | 如 `thread_leak_detector`,文件即 `thread_leak_detector.h/.cpp` |
| `<plugin_dir>` | 插件目录名 / GN 目标前缀(snake_case) | 通常同 `<plugin_file>`;`.so` 名为 `lib<plugin_dir>` |
| `<PLUGIN_LOG_TAG>` | HIVIEW_LOGx 日志 TAG | 如 `ThreadLeak` |
| `<PLUGIN_WORK_METHOD>` | 插件真实工作入口方法名 | 如 `PollOnce` |
| `<PLUGIN_PARAM_KEY>` | 系统参数键(若用 config) | 如 `hiview.thread_leak.threshold` |
| `<PLUGIN_PARAM_DEFAULT>` | 参数默认值 | 如 `3000` |
| `<RUNTIME_MARKER>` | 只在改动代码运行路径输出的标记(供 P4 `--runtime-marker`) | 如 `THREAD_LEAK_PLUGIN_LOADED` |
| `<E2E_MARKER>` | 只在端到端成功后输出的标记(供 P4 `--e2e-marker`) | 如 `THREAD_LEAK_CONCLUSION_GENERATED` |

> `<plugin_dir>` / bundle 归属 / 链入的聚合包名可用知识库
> `components.tsv`(bundle_path、sub_component_targets 列)查得。

## 裁剪点

- **poll-only 插件**(不吃事件):删掉 `IsInterestedPipelineEvent` 和 `OnEvent`(.h + .cpp)。
- **无静态配置**:删 `config/` 目录 + BUILD.gn 里的 `ohos_prebuilt_etc`。
- **BUILD.gn 二选一**:standalone `ohos_shared_library`(默认)**或** 链入聚合包的 `source_set`
  (见 BUILD.gn 注释 (b)),保留一种。

## 对照的真实源码范例(在 OHOS 源码仓)

- `base/hiviewdfx/hiview/plugins/crash_validator/`(事件驱动,含 IsInterestedPipelineEvent)
- `base/hiviewdfx/hiview/plugins/privacy_controller/`(较小)
- `base/hiviewdfx/hiview/plugins/reliability/thread_leak_detector/`(poll-only + FFRT + 上报,
  本仓 `products/20260707-thread-leak-detector/` 有其深析专题)

## 常见坑

- **必须 `REGISTER(<PLUGIN_NAME>)`**——缺了编译通过但插件永不加载。
- REGISTER 宏来自 `plugin_factory.h`,必须 include。
- 命名空间固定 `OHOS::HiviewDFX`。
- P4 真机门控要求 `<RUNTIME_MARKER>`/`<E2E_MARKER>` **由运行路径真实输出**,不能写死在
  部署/场景脚本里(gate_device_func 会拒)。
