---
name: ohos-qemu-run
description: 启动、复用和停止 OpenHarmony ARM64 全系统 QEMU，提供实例定向 HDC、Windows/WSL 浏览器图形、真实截图与基础启动验证。用于“启动模拟器”“连接 QEMU 的 HDC”“查看桌面”；不隐式整编或自动刷写系统文件。
---

# QEMU 运行、HDC 与图形

与 `ohos-qemu-workflow` 同装，公共入口为 `python3 -B <skill-dir>/../ohos-qemu-workflow/scripts/workflow.py --root <OH_ROOT>`。下列命令从源码根运行。

```bash
./qemu-workflow/qemu status
./qemu-workflow/qemu up --timeout 600
./qemu-workflow/qemu verify
./qemu-workflow/qemu gui
```

up 复用 RUNNING 实例或按配置启动，不重建镜像、不 reset。仅本次调用有界等待，TCG 首次启动实测约 6 分钟；超过超时返回非零和 out/qemu-workflow/verify-latest.json，不建立长期监听。

## HDC

```bash
./qemu-workflow/qemu hdc connect
./qemu-workflow/qemu hdc targets
./qemu-workflow/qemu hdc shell
./qemu-workflow/qemu hdc shell uname -m
./qemu-workflow/qemu hdc hilog
./qemu-workflow/qemu hdc file send ./test.txt /data/local/tmp/test.txt
./qemu-workflow/qemu hdc file recv /data/local/tmp/test.txt ./test-back.txt
```

connect 使用匹配 SDK HDC：独立 loopback server 默认 18710，必要时 `hdc -s 127.0.0.1:18710 -m` 分离会话运行；新 server 进程单独设置临时目录，隔离 HDC 在所有端口间共用的 .HDCServer.pid 互斥文件。客户端加已由本地源码验证的 -p，禁止隐式自动拉起别的 server。从 launcher status 取得客户机端口，tconn 后核对 Connected 和实际 shell echo。18710 是宿主 HDC server，5655 是默认 QEMU 客户机转发，6080 是图形代理。

其他 hdc 子命令自动添加 -s 与 -t，不影响默认 8710 或其它设备。不要另外 export 全局变量改所有会话；确需直接操作 HDC 时显式指定 server/target。不能用 kill/restart 掩盖连接问题。系统写入、应用签名与多包依赖依照通用 ohos-dev-hdc-command-usage。

## 图形和截图

gui 输出 URL；Windows Edge/Chrome 或当前应用浏览器可打开。验证 HTTP 200、WebSocket 101、实际转发的 RFB 和本地进程目标；已有端口属于未知服务时拒绝覆盖。只监听 127.0.0.1，不开放到 LAN。

```bash
./qemu-workflow/qemu screenshot /tmp/openharmony-desktop.png
```

QMP 保存原始 PNG，不合成、不覆盖现有文件。调用图像查看工具确认实际画面后再交付；截图不解锁、不改电源设置。需要唤醒/交互时使用实际已有 power-shell/uinput/noVNC，验证后再宣称交互成功。

verify 的 basic_boot_pass 只覆盖 ARM64、HDC、进程、挂载、启动标志、4 CPU/4 GiB 和图形传输。`visual_desktop_verified` 默认 false，须人工/图像查看证据；应用、UT/XTS 默认 NOT_RUN，不能推导通过。

## 停止和重启

```bash
./qemu-workflow/qemu stop
./qemu-workflow/qemu status
```

先尝试 guest sync 和普通关机。尚在 RUNNING 时脚本返回非零，不自动强杀；确需结束时显式 `stop --force`，仍保留 overlay。此命令仅管理当前 QEMU，不停止共享 HDC/noVNC 服务，也不重启其它实例。

重启 Windows/WSL 后重新运行 up；无需重新编译。若基础镜像因编译变化导致 manifest 拒绝，保留旧目录、使用新镜像集/新实例根，不自动 reset。日志路径从 status.runtime_dir 取得，包括 serial.log、qemu.log、runtime.json；不要沿用另一实例的硬编码 /tmp hash。
