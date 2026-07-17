# HDC 设备连接与调试

## 边界

该能力把开发机命令可靠送达 OpenHarmony 设备，并返回 shell、文件、端口转发、应用管理和调试结果。主机侧 client/server 管理命令与连接复用，设备侧 `hdcd` 执行请求；`hdc_credential` 独立承担设备授权。

## 共享机制

- `HdcDaemon::InitMod` 按启动参数和编译开关装配 USB、TCP、模拟器 bridge，以及可选 UART 链路。
- init 条件启动 `hdcd`；主入口校验开发者模式、链路参数和权限降级策略，再进入会话循环。
- 握手、认证状态、已知主机和 root/shell 身份切换共同形成安全边界。

## 功能与调用链

| 功能 | 入口 | 宿主 | 实现区域 |
| --- | --- | --- | --- |
| 发现与会话 | `hdc list targets` | 主机 server + `hdcd` | `src/host`、`src/common`、`daemon.cpp` |
| shell/文件 | `hdc shell`、`file send/recv` | `hdcd` | daemon 任务处理器 |
| 转发/JDWP | `fport/rport`、JDWP 跟踪 | `hdcd` | `daemon_forward.cpp`、`jdwp.cpp` |
| 设备授权 | 新主机认证 | `hdc_credential` / `hdcd` | `credential`、SSL/认证逻辑 |

```text
开发者/IDE -> hdc client -> 主机 hdc server -> USB/TCP/bridge/UART
  -> hdcd -> 握手与认证 -> HdcDaemonUnity 命令分发
  -> shell/file/forward/app/JDWP -> 返回结果
```

`hdcd` 退出时读取 `WantRestart()`，需要时自重启；低权限实例退出后依赖 init 服务重新拉起。

## 接口、测试与风险

- 用户入口为跨平台 `hdc` CLI，内部接口包含 `//developtools/hdc:hdc_updater`。
- 测试和 fuzz 目标位于 `developtools/hdc/test`；真机至少验证设备发现、shell、双向传输、转发和断线重连。
- 重点风险：认证绕过、开发者模式门控、提权/降权、协议输入解析、任意文件访问与端口转发。

## 证据

- `developtools/hdc/README_zh.md`
- `developtools/hdc/src/daemon/main.cpp`
- `developtools/hdc/src/daemon/daemon.cpp`
- `developtools/hdc/src/daemon/etc/hdcd.cfg`
- `developtools/hdc/src/daemon/etc/hdc_credential.cfg`

