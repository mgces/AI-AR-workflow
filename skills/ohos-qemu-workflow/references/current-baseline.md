# 当前工作区基线（2026-10-20）

本文件是已验证历史与可迁移参数说明，不是每次执行自动通过的凭据。

- 源码根：`/home/mgces/openharmony/code`，Ubuntu 24.04 x86_64 / WSL2，Python 3.12。公共辅助脚本要求 Python 3.11+。
- 编译产品：`arm64_virt`；ARM64 全量系统、Linux 6.6.101、OpenHarmony-7.0.0.42。
- 运行器：`vendor/ohemu/qemu_arm64_linux_full/qemu_run.sh`，转发到 `vendor/ohemu/virt/qemu_run/arm64/`。设备定义在该目录的 `qemu_profile.json`。
- QEMU：`.local-tools/qemu-arm64/bin`，8.2.2，TCG、cortex-a57、4 CPU / 4096 MiB。该便携包没有 GTK/SDL 模块，图形使用 VNC/noVNC。
- 原始镜像：`out/arm64_virt/packages/phone/images`。
- 当前实例根：`out/qemu-validation/arm64-20261019-095450/clean-instances`，实例 `00`。
- 默认实例端口：VNC 6021、HDC 5655；脚本从 launcher status 获取，不能在换实例后仍写死。
- HDC 可执行文件：`prebuilts/ohos-sdk/linux/26.0.0/toolchains/hdc`，3.2.0f。独立宿主 HDC 服务端口 18710，避免影响默认 8710 会话。
- noVNC：`.local-tools/novnc/root`，浏览器端口 6080，仅监听 loopback。

编译修复历史：updater 的 log/log.h 补 `<cstdint>`；musl scripts/porting.sh 的 shell 比较改为 POSIX `=`。只在相同具体错误重现且源码仍缺修复时处理，不在新分支机械套补丁。最终整编 exit 0、成功横幅与镜像均已验证。

启动必需 8 个文件：`Image`、`ramdisk.img`、`updater.img`、`system.img`、`vendor.img`、`sys_prod.img`、`chip_prod.img`、`userdata.img`。另外 `eng_system.img` 是额外工程镜像，当前 profile 没有挂载。

已观察限制：计算器与设置的普通启动出现 sysfreeze，发布签名应用 `aa start -D` 返回 10106002，不能报告功能通过；不通过禁用冻结检测、放宽权限或调试签名限制来伪造成功。当前模拟产品不能替代 RK3568 实机外设/性能/功耗/安全行为验证。

原始证据在源码根的 `out/qemu-validation/arm64-20261019-095450/VALIDATION.md`、`final-validation.json` 和 screenshots/。此目录是当前机器的历史记录，移动技能不需要复制整套镜像或历史输出。
