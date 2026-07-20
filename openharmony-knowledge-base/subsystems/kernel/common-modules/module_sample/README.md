# module_sample — 内核模块开发示例

## 归属

```text
kernel -> common_modules -> module_sample
```

## 目标与边界

OHOS 在 common_modules 下提供的**内核模块开发示例**,演示如何编写一个可加载内核模块（.ko）
并接入 OHOS 内核构建。是参考/模板,不承载生产功能。2 个源文件。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [ko_sample.c](../../../../../kernel/linux/common_modules/module_sample/ko_sample.c) | 示例 ko 入口（module_init/exit） |
| [sample_fun.c](../../../../../kernel/linux/common_modules/module_sample/sample_fun.c) | 示例函数 |

## 配置与开关

- 示例模块,通常不进产品 defconfig。**rk3568:未启用。**

## 用途

- 学习/参考:新增内核公共模块时,可照此结构（Kconfig + Makefile + module_init）起步。
- 与本仓 `ohos-code-skeletons` 定位类似,但面向**内核模块**（用户态组件骨架见该 skill）。

## 运维

示例,无 operations。
