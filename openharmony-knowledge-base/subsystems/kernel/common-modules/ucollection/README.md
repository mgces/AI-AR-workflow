# ucollection — 统一采集（进程 CPU 维测）

## 归属

```text
kernel -> common_modules -> ucollection
```

## 目标与边界

Unified Collection。内核侧采集进程 CPU 等维测数据,支撑开发者性能问题分析,与用户态
HiviewDFX unified_collection（[hiviewdfx/hiview](../../../hiviewdfx/README.md)）配套。

- 目标：进程 CPU 维测数据采集,经驱动暴露给用户态。
- 非目标：数据的上层分析/展示（属 hiview）。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [unified_collection_driver.c](../../../../../kernel/linux/common_modules/ucollection/unified_collection_driver.c) | 采集驱动入口 |
| [ucollection_process_cpu.c](../../../../../kernel/linux/common_modules/ucollection/ucollection_process_cpu.c) | 进程 CPU 采集 |

## 配置与开关

- `CONFIG_UNIFIED_COLLECTION`（tristate,可编 =m）。
- **rk3568:defconfig 未直接命中(需构建确认;可能以 ko 动态加载)。**

## 运行链

- 注册字符/misc 设备 → 用户态（hiview ucollection）读取进程 CPU 维测 → 内核 `ucollection_process_cpu.c`
  采集并返回。具体设备节点需读 `unified_collection_driver.c`。

## 风险 / 安全

- 维测采集,注意信息暴露面（进程数据可见性）。

## 运维

小模块,暂无独立 operations。
