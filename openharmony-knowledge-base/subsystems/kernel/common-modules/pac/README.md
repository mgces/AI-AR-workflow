# pac — 指针认证（ARM Pointer Authentication）

## 归属

```text
kernel -> common_modules -> pac
```

## 目标与边界

利用 ARMv8.3 Pointer Authentication（PAC）硬件特性,对指针加签名（PAC 码）以缓解内存安全漏洞
利用（如 ROP/JOP 攻击链）。针对"内存安全漏洞是最严重威胁"。6 个源文件。

- 目标：指针认证密钥/上下文管理。
- 非目标：不依赖 PAC 硬件的软件缓解。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [src/pointer_auth_key.c](../../../../../kernel/linux/common_modules/pac/src/pointer_auth_key.c) | PAC 密钥管理 |
| [src/pointer_auth_context.c](../../../../../kernel/linux/common_modules/pac/src/pointer_auth_context.c) | PAC 上下文 |

## 配置与开关

- 由模块 Kconfig 控制(无 grep 命中标准名)。**rk3568:未确认启用(需构建 + 依赖 ARMv8.3 硬件)。**

## 运行链

- 进程上下文切换时管理 PAC 密钥,内核对返回地址等指针加/验签。具体切换点需读源码确认。

## 风险 / 安全

- **安全关键**:缓解内存漏洞利用。依赖硬件特性,密钥管理正确性是关键。

## 运维

小模块,暂无独立 operations。
