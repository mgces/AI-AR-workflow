# qos_auth — FFRT QoS 调度鉴权

## 归属

```text
kernel -> common_modules -> qos_auth
```

## 目标与边界

为支持并发编程框架 FFRT（Function Flow Runtime）的底层调度能力而设计,允许 app 侧根据业务
向内核申请 QoS 等级,内核对申请做鉴权与管控。

- 目标：QoS 申请鉴权（auth）、QoS 控制（qos_ctrl）。
- 非目标：FFRT 用户态调度本身。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [auth_ctl/auth_ctrl.c](../../../../../kernel/linux/common_modules/qos_auth/auth_ctl/auth_ctrl.c) | 鉴权控制 |
| [auth_ctl/qos_ctrl.c](../../../../../kernel/linux/common_modules/qos_auth/auth_ctl/qos_ctrl.c) | QoS 控制 |
| [auth_ctl/auth_qos_debug.c](../../../../../kernel/linux/common_modules/qos_auth/auth_ctl/auth_qos_debug.c) | 调试 |

## 配置与开关

- 由模块 Kconfig 控制(无 grep 命中标准名)。**rk3568:未确认启用(需构建确认)。**

## 运行链

- app 通过设备节点/系统调用向内核申请 QoS 等级 → `auth_ctrl.c` 鉴权 → `qos_ctrl.c` 应用到调度。
  具体接口需读 `auth_ctrl.c` 确认。

## 风险 / 安全

- 鉴权缺陷可能导致低权限 app 抢占高 QoS,影响调度公平性。

## 运维

暂无独立 operations。
