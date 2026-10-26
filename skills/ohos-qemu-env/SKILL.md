---
name: ohos-qemu-env
description: 配置和检查 Ubuntu 24.04 x86_64/WSL2 上 OpenHarmony ARM64 QEMU、qemu-img 与 noVNC 便携运行环境，支持校验锁定软件包并离线恢复。用于 QEMU 环境准备或运行库缺失；不负责全量源码同步或系统编译。
---

# QEMU 运行环境

此 skill 与 `ohos-qemu-workflow` 一起安装。先使用公共入口 `python3 -B <skill-dir>/../ohos-qemu-workflow/scripts/workflow.py --root <OH_ROOT>`；工作区已有短入口时可执行以下命令。

## 检查和复用

从含 .gn/build.sh 的源码根执行：

```bash
./qemu-workflow/qemu env check
./qemu-workflow/qemu env prepare
```

`check` 仅检查工具加载、noVNC Python 依赖和关键构建工具文件，并写 `out/qemu-workflow/environment.json`。不会启动系统；`runtime_ready` 不是构建或启动通过。

`prepare` 优先复用正常环境。确需恢复时从 `.local-tools/{qemu-arm64,novnc}/packages/` 读取软件包，对 [packages.lock.json](references/packages.lock.json) 的 17 个版本和 SHA-256 全部校验后，用 dpkg-deb 解包到工作区，无 sudo/apt install。恢复运行库前须停 QEMU。

## 缺软件包时

本用户要求环境配置已授权准备所需运行工具。离线归档不足时，明确需要联网下载才执行：

```bash
./qemu-workflow/qemu env prepare --download
```

只 apt-get download 锁定版本，不运行 apt update、不改系统软件源、不自动换最新版。锁定版本已下架或 SHA 不匹配时停止并说明；要迁移版本则核对来源、更新锁并重新做真实运行验证。

宿主依赖包括 bash、Python 3.11+、dpkg-deb、numpy、pkg_resources 以及系统基础动态库。缺依赖时依据具体导入/加载错误补齐，不把此便携包描述为通用静态安装包。其他 Ubuntu 版本、ARM64 宿主或原生 Windows 要重新选运行包，此恢复器会拒绝不匹配宿主。

HDC 使用源码 SDK 工具，不从 Windows SDK 混拷 Linux 二进制；更换 SDK 目录后更新 config.json。源码、prebuilts 和编译依赖若未准备，使用现有 `ohos-env-setup`，不要让这个 skill 隐式同步几百 GB 源码。

## 成功条件

运行程序能报告版本、noVNC Python 模块能加载，环境 JSON 为 runtime_ready=true；随后交给 `ohos-qemu-run` 做实际启动/HDC/图形验证。x86_64 模拟 ARM64 使用 TCG，本便携包没有 GTK/SDL；Windows 浏览器通过 localhost 访问 noVNC。
