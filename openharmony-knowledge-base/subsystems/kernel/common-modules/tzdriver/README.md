# tzdriver — TEE 安全执行通信驱动

## 归属

```text
kernel -> common_modules -> tzdriver
```

## 目标与边界

部署在 REE（Rich Execution Environment，普通 Linux 侧）的内核驱动，支撑 REE 与 TEE
（Trusted Execution Environment，TrustZone 安全世界）之间的通信——CA（Client App）通过它
调用 TA（Trusted App）。是 OHOS 安全能力（密钥、指纹、支付等）的内核基座。本模块 82 个 C/H,
是 common_modules 中最大的一个。

- 目标：REE↔TEE 通道、共享内存（ion）、TUI（可信 UI）、tlogger（安全日志）。
- 非目标：TA 本身运行在 TEE 内,不在本模块。

## 代码入口（源码仓相对路径）

| 文件/目录 | 职责 |
| --- | --- |
| [core/](../../../../../kernel/linux/common_modules/tzdriver/core) | REE↔TEE 通信核心 |
| [ion/](../../../../../kernel/linux/common_modules/tzdriver/ion)（dynamic/static_ion_mem.c） | 安全共享内存 |
| [tui/tui.c](../../../../../kernel/linux/common_modules/tzdriver/tui/tui.c) | 可信 UI 通道 |
| [tlogger/tlogger.c](../../../../../kernel/linux/common_modules/tzdriver/tlogger/tlogger.c) | 安全世界日志 |
| [ko_adapt.c](../../../../../kernel/linux/common_modules/tzdriver/ko_adapt.c) | ko 适配层 |
| `Kconfig` / `Makefile` | 构建与开关 |

## 配置与开关

- 主开关 `CONFIG_TZDRIVER`（tristate,可编 =m）。相关:`SECBOOT_IMG` / `SECBOOT_IMG_V2`（安全启动镜像）、`ASAN_DEBUG`。
- **rk3568:`CONFIG_TZDRIVER=y`（启用）。**

## 运行链

- 内核驱动注册（misc/char device）→ 用户态 CA 通过设备节点 ioctl 发起 TEE 调用 → 经共享内存传参 →
  TEE 侧 TA 处理 → 返回。具体注册点与 ioctl 命令需读 `core/` 确认。

## 风险 / 安全

- **安全关键**:REE↔TEE 边界,任何 ioctl 参数校验缺陷可能是安全世界攻击面。共享内存生命周期
  （ion 静态/动态)是重点。P6 安全 review 若改动本模块须格外谨慎。

## 运维

复杂度高,后续可拆 `security.md` 专述 TEE 调用链与内存模型。
