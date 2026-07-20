# code_sign — 基于 FS-Verity 的代码签名

## 归属

```text
kernel -> common_modules -> code_sign
```

## 目标与边界

在内核侧对代码/文件做签名校验,基于 FS-Verity（文件完整性度量）扩展,确保加载执行的代码
未被篡改。是 OHOS 应用完整性与防篡改的内核支撑。

- 目标：ELF/文件签名校验、证书链验证。
- 非目标：应用签名的用户态签发流程。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [code_sign_elf.c](../../../../../kernel/linux/common_modules/code_sign/code_sign_elf.c) | ELF 代码签名校验 |
| [verify_cert_chain.c](../../../../../kernel/linux/common_modules/code_sign/verify_cert_chain.c) | 证书链验证 |
| [code_sign_misc.c](../../../../../kernel/linux/common_modules/code_sign/code_sign_misc.c) | 模块入口 / 杂项 |
| `Kconfig` / `Makefile` | 构建与开关 |

## 配置与开关

- 主开关 `CONFIG_SECURITY_CODE_SIGN`。
- **rk3568:`CONFIG_SECURITY_CODE_SIGN=y`（启用）。**

## 运行链

- 挂接 FS-Verity 度量路径,在文件打开/执行时触发签名与证书链校验;校验失败拒绝加载。
  具体 hook 点需读 `code_sign_misc.c` 确认。

## 风险 / 安全

- **安全关键**:签名/证书链校验是防篡改的最后一道。证书链解析、签名算法实现是重点审计对象。

## 运维

小模块（10 文件),暂无独立 operations。
