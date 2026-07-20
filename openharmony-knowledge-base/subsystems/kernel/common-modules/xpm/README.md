# xpm — 执行页保护 / 开发者模式

## 归属

```text
kernel -> common_modules -> xpm
```

## 目标与边界

eXecutable Page Manager。针对"应用滥用热更新机制绕过应用市场审核、在端侧动态下发可执行代码"
的风险,在内核层管控可执行页与开发者模式。含 secureshield 安全防护与 developer 模式两部分。

- 目标：可执行内存页校验/管控、开发者模式（DSMM）门控。
- 非目标：应用市场审核本身。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [core/xpm_module.c](../../../../../kernel/linux/common_modules/xpm/core/xpm_module.c) | 模块入口 |
| [core/xpm_security_hooks.c](../../../../../kernel/linux/common_modules/xpm/core/xpm_security_hooks.c) | LSM 安全 hook |
| [core/xpm_misc_device.c](../../../../../kernel/linux/common_modules/xpm/core/xpm_misc_device.c) | misc 设备节点 |
| [developer/dsmm_developer.c](../../../../../kernel/linux/common_modules/xpm/developer/dsmm_developer.c) | 开发者模式管控 |
| [secureshield/dsmm_secureshield.c](../../../../../kernel/linux/common_modules/xpm/secureshield/dsmm_secureshield.c) | 安全防护 |

## 配置与开关

- `CONFIG_SECURITY_XPM`、`CONFIG_DSMM_DEVELOPER_ENABLE`、`CONFIG_SECURITY_XPM_DEBUG`。
- **rk3568:`CONFIG_SECURITY_XPM_DEBUG=y`(启用 debug 变体);** 生产开关组合需构建确认。

## 运行链

- 通过 LSM（Linux Security Module）hook 挂接内核安全检查路径,在可执行页映射/加载时校验;
  开发者模式经 DSMM 门控。具体 hook 见 `xpm_security_hooks.c`。

## 风险 / 安全

- **安全关键**:直接关系"能否在端侧执行未审核代码"。LSM hook 覆盖面与绕过路径是审计重点。

## 运维

暂无独立 operations。
