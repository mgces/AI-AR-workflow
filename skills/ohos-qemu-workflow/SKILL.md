---
name: ohos-qemu-workflow
description: 端到端运行 OpenHarmony arm64_virt 的 QEMU 开发流程，连接环境检查、整编或定向编译、实例启动、HDC、浏览器图形和真实证据验证。用于“QEMU 开发工作流”“继续 ARM64 模拟器验证”，也为 AR 开发流水线提供 QEMU 环境、构建和运行能力。仅编译时优先 ohos-qemu-build；P0-P8 编排由 ohos-ar-dev-workflow 负责。
---

# OpenHarmony ARM64 QEMU 工作流

把编译与运行作为可分别执行的阶段。已存在镜像且用户只要启动时，直接运行，不重复整编。
配套技能：`ohos-qemu-env`（运行环境）、`ohos-qemu-build`（独立编译入口）、`ohos-qemu-run`（运行/HDC/图形）。四者一起安装，公共脚本只有一份。

AR 开发使用 `ohos-ar-dev-workflow` 的 `--environment openharmony-qemu` 分支，读取
[AR QEMU 接入说明](../ohos-ar-dev-workflow/references/qemu-development.md)。本技能的启动检查不替代 AR 门控。

## 入口与配置

`<skill-dir>` 是本文件所在目录。公共入口：

```bash
python3 -B <skill-dir>/scripts/workflow.py --root <OH_ROOT> --help
```

另一工作区首次使用时执行 `python3 -B <skill-dir>/scripts/workflow.py --root <OH_ROOT> init`，生成配置与该工作区的 qemu-workflow/qemu 快捷入口；已有配置/入口均保留。通用初始配置见 [config.example.json](references/config.example.json)，默认新实例根是 out/arm64_virt/qemu_instances，不沿用本机历史目录。

本工作区提供等价短命令，从源码根运行：

```bash
./qemu-workflow/qemu env check
./qemu-workflow/qemu status
```

读取 `<OH_ROOT>/qemu-workflow/config.json`；`--config /absolute/path.json` 可选用另一个配置。相对工具、镜像和实例路径均相对源码根。配置固定 `arm64_virt`；QEMU 的 CPU、内存、设备、端口分配来自源码 profile，不复制另一套机器定义。

迁移到另一源码根时显式 `--root` 并调整配置中的工具路径、SDK HDC 路径、实例根。默认配置使用新的实例目录；[当前基线与限制](references/current-baseline.md) 仅记录来源机器的历史验收。历史验收不能当作本轮运行通过。

## 执行顺序

1. `env check`：工具加载、预编译工具文件检查；缺运行环境时使用 env skill。源码/工具链从零准备另用已有 `ohos-env-setup`，不隐式 sync/download。
2. 有代码修改时使用 build skill，选择 full、target 或 component。先确认目标真实存在和架构，保留日志、退出码、产物。未要求编译则跳过。
3. `up --timeout 600`：复用/启动实例，准备 HDC 和 noVNC，执行有界就绪验证。不会创建周期监听；只报告编译完成、启动验证、验证完成等关键节点。
4. `verify`：核验 AArch64、HDC shell、关键进程、必要挂载、5 个图形就绪标志、4 CPU/4 GiB 和 noVNC HTTP/WebSocket/RFB。`basic_boot_pass` 只表示这些条件通过。
5. `screenshot /absolute/path.png` 后查看真实原图，才能报告桌面可见。应用或新增模块需要各自实际运行与断言；未跑 UT/XTS 明确写 `NOT_RUN`。

## 镜像与增量迭代

- `build` 只编译，不自动部署、不重启实例。`hb` 独立构建的输出通常在 `out/standard/`，不能默认为 arm64_virt 镜像已更新。
- 产品构建会检查当前实例和该 UID 下仓库启动器记录的其他运行实例。正在使用 `out/arm64_virt/packages/phone/images` 的实例必须先停机，保留 qcow2 数据；禁止一边改写 backing image 一边运行。
- 定向构建也保守应用此保护，因为 `build.sh` 可能执行产品后处理。需要与开发编译并行运行时，先将运行环境切换到独立镜像快照，见 [编译与部署](../ohos-qemu-build/references/build-and-deploy.md)。
- 重新打包后旧实例 manifest 可能拒绝已变化的基础盘。保留旧实例，采用新镜像集/新实例根，不自动 reset/delete，不 rebase 掩盖不匹配。
- 只在实际需要系统文件替换时使用通用 `ohos-dev-hdc-command-usage` 的备份、权限、sync 和回滚流程。临时可执行文件优先 `/data/local/tmp`。

## 证据和失败

公共脚本在 `out/qemu-workflow/` 保存环境、编译、验证 JSON 和日志。编译后台运行使用独立会话，应用退出不会按普通终端挂断；WSL/Windows 重启会终止进程，保留 out/ 并用同命令增量恢复。

`connection` 的 JSON 包含当前实例目录、manifest 摘要及所有 qcow2 overlay 的设备号/inode。AR P0 会固定该身份，后续设备门据此检测实例或数据盘是否被替换；连接串口仍须结合本轮 pipeline 的签名证据判断。

不能把进程存在、VNC 握手、`aa start` 成功文本或旧截图当成应用功能成功。TCG 首次图形启动本机实测约 6 分钟，短时黑屏先检查 serial.log/hdc/就绪参数；超过超时记录失败，再诊断，不无限重试。

权限受限环境可能看不到宿主 PID/socket；出现 `BUSY_LEGACY` 时检查宿主进程命名空间后再判定，不当作实例已停止。只在确实需要访问本机进程/套接字或构建缓存时申请对应执行权限。
