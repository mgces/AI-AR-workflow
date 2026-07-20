# newip — New IP 短地址协议

## 归属

```text
kernel -> common_modules -> newip
```

## 目标与边界

在现有 IPv4/IPv6 之外新增的协议栈,支持可变长/短地址等新型寻址(面向 IoT/短距等场景)。
68 个 C/H 文件,含独立协议实现与 demo。

- 目标：New IP 地址配置、路由、TCP/UDP over New IP、ICMP。
- 非目标：替换标准 IPv4/IPv6。

## 代码入口（源码仓相对路径）

| 文件/目录 | 职责 |
| --- | --- |
| [third_party/linux-5.10/net/newip/](../../../../../kernel/linux/common_modules/newip/third_party/linux-5.10/net/newip)（nip_addrconf.c / icmp.c …） | New IP 协议栈 |
| [src/linux-5.10/drivers/net/bt/btdev.c](../../../../../kernel/linux/common_modules/newip/src/linux-5.10/drivers/net/bt/btdev.c) | BT 网络设备 |
| [examples/](../../../../../kernel/linux/common_modules/newip/examples)（nip_tcp/udp/route demo） | 使用示例 |

## 配置与开关

- 由独立 config 控制(见模块 Kconfig)。**rk3568:arm64_defconfig 未直接命中,启用需构建确认。**

## 运行链

- 作为新协议族注册进内核网络栈,提供 New IP 的地址配置(`nip_addrconf.c`)、路由、传输层。
  具体协议族注册点需读协议栈源码确认。

## 风险 / 安全

- 新协议栈解析不可信报文,需关注报文解析健壮性(fuzz 价值高)。

## 运维

大模块,后续可拆协议细节文档。
