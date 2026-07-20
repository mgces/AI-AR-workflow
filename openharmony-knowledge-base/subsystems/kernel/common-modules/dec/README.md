# dec — 数据增强访问控制

## 归属

```text
kernel -> common_modules -> dec
```

## 目标与边界

Data Enhance Control。内核层的数据访问增强控制,基于路径约束树对文件/数据访问做细粒度管控
（沙箱/隔离增强）。19 个 C/H 文件。

- 目标：路径约束树、访问控制策略、sysctl 调优接口。
- 非目标：用户态权限管理框架（AccessToken 等）。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [dec_kernel_interface.c](../../../../../kernel/linux/common_modules/dec/dec_kernel_interface.c) | 内核接口 |
| [dec_constraint_tree.c](../../../../../kernel/linux/common_modules/dec/dec_constraint_tree.c) | 约束树核心 |
| [dec_path_tree.c](../../../../../kernel/linux/common_modules/dec/dec_path_tree.c) | 路径树 |
| [dec_misc.c](../../../../../kernel/linux/common_modules/dec/dec_misc.c) | 模块入口 |
| [sysctl.c](../../../../../kernel/linux/common_modules/dec/sysctl.c) | sysctl 调优接口 |

## 配置与开关

- `CONFIG_SECURITY_DEC`、`CONFIG_SECURITY_DEC_DEVELOP`。
- **rk3568:defconfig 未直接命中(需构建确认)。**

## 运行链

- 通过内核接口注册访问控制策略,以路径约束树匹配访问请求;经 sysctl 暴露调优参数。
  具体挂接点需读 `dec_kernel_interface.c` 确认。

## 风险 / 安全

- **安全关键**:访问控制策略,约束树匹配正确性关系隔离是否被绕过。

## 运维

暂无独立 operations。
