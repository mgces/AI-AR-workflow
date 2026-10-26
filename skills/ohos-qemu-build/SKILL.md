---
name: ohos-qemu-build
description: 独立执行 OpenHarmony arm64_virt 系统整编、指定 GN 目标增量编译和 hb 部件独立编译，包含新增模块接入、产物架构核验与编译日志记录。用于“只编译新增模块”“QEMU 代码增量构建”“独立编译部件”；不自动启动或部署到设备。
---

# ARM64 QEMU 编译入口

编译可以单独调用，不依赖 QEMU 已启动。公共入口在同装的 `../ohos-qemu-workflow/scripts/workflow.py --root <OH_ROOT>`；以下命令从源码根运行。构建语义与错误诊断优先复用已有 `ohos-dev-build-execution-diagnosis`，产品始终显式为 arm64_virt，不套用其 rk3568 默认命令。

## 选择模式

```bash
# 只打印命令，不触发编译
./qemu-workflow/qemu build full --dry-run

# 系统整编，保留 out/ 增量缓存；后台模式可跨应用关闭继续
./qemu-workflow/qemu build full --background

# 只编译已确认存在的 GN 目标（这里的标签必须替换为真实标签）
./qemu-workflow/qemu build target //path/to/component:target_name --background

# 查看本流程最近一次构建的退出码、状态与日志目录
./qemu-workflow/qemu build status
```

`full` 表示生成产品完整镜像，调用已验证 build.sh 命令；不是强制清理重编，也不额外启用 make_all/make_test。jobs 默认 4；当前分支 `--jobs` 已标 deprecated，但该参数组合实际整编通过，迁移分支需检查参数定义后调整。

已有目标、只改源文件且确认没有 BUILD.gn/gni/产品/依赖配置变动时，才可用：

```bash
./qemu-workflow/qemu build target //path/to/component:target_name --fast --config-unchanged
```

新增目标和依赖修改必须正常 GN 生成；`--config-unchanged` 是调用者核实的声明，不是脚本自动证明。

`hb` 部件独立构建要求 hb 已在 PATH（先激活用户现有 OHOS venv；没有则在已授权环境准备范围内从本地 build/hb 安装）。组件名查 bundle.json 的 component.name，不能直接用仓库名：

```bash
./qemu-workflow/qemu build component updater --dry-run
./qemu-workflow/qemu build component updater --background
# 源码构建成功后，用户确需测试编译才执行
./qemu-workflow/qemu build component updater --tests --background
```

独立构建不是所有部件都支持；会使用独立依赖/工具链配置，产物通常在 out/standard/。必须核对实际 ARM64 ELF 架构和依赖再部署。`--tests` 只编译测试，不运行测试。

## 新增代码、打包和运行

遇到新增模块、目标找不到、产物部署或希望编译与运行并行时，读取 [build-and-deploy.md](references/build-and-deploy.md)。先确认 BUILD.gn / bundle / 产品选择和 GN 可见性，再选定向编译；禁止猜一个标签并声称已编译。

## 完成与失败

脚本保存命令、console.log、主 build.log 快照、退出码和 result.json。完整系统还检查成功横幅和 8 个非空必需镜像。目标/部件编译必须再确认实际期望产物，不能只凭旧文件存在。

产品构建遇到运行实例使用输出基础镜像时拒绝执行；先停实例，或先切换到独立镜像快照。不要跳过保护、清空 out/ 或 reset 旧实例。失败从该次 primary-build.log/主日志找第一处实质错误，窄范围修复后恢复相同命令，不删除功能逻辑凑编译成功。
