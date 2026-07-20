# Kernel 子系统（内核层）

OHOS 的内核层不是 preloader parts 里的普通子系统（它没有 `bundle.json`、不进
`out/preloader/rk3568/parts.json`），因此单列。事实源是内核源码树 + rk3568 defconfig，
不是组件索引。

> 本页是内核层知识框架总入口。「完整内核网络」的各节点(版本/配置 → 公共模块 → HDF 框架 →
> 设备拓扑)均已建立,见下方总览图与各专题。

## 完整内核网络总览

```
                          ┌─────────────────────────────────────────────┐
   内核版本 linux-6.6 ────▶│  rk3568 内核配置画像 (三层 defconfig 合并)   │
   (arm64)                │  rk3568-kernel-config.md                     │
                          │  安全/QoS/内存/文件系统 特性开关(=y)         │
                          └───────────────┬─────────────────────────────┘
                                          │ 开关决定启用哪些能力
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
  common_modules (11 个)          HDF 驱动框架                    HDF 设备拓扑 (rk3568)
  OHOS 注入内核的功能模块          hdf-framework.md               rk3568-hdf-topology.md
  安全:code_sign/xpm/dec/          devmgr → devhost →             28 个 host → device →
   tzdriver/ced/pac/memory_sec     HdfDriverEntry(Bind/Init)      moduleName(.so)
  协议:newip  维测:ucollection      model: display/audio/camera/    平台:i2c/spi/uart/pwm
  调度:qos_auth  示例:module_sample  input/sensor/usb/…             外设:camera/audio/wlan
        │                          HDI: drivers/interface          传感器:bmi160/bh1745/…
        │                                 │                                 │
        └─────────────────────────────────┴─────────────────────────────────┘
                                          ▼
                        机器索引 generated/kernel-modules.tsv
                        (module/kconfig/rk3568启用/文件数/路径)
                        由 tools/generate-kernel-index.sh 生成
```

事实层次(与知识库「事实优先级」一致):内核源码 > defconfig/HCS 配置 > 本知识分析 > 真机验证。


## 内核版本与构建

| 内核 | 路径 | 说明 |
| --- | --- | --- |
| Linux 5.10 / 6.6 | [kernel/linux](../../../../kernel/linux) | 主线内核 + config + patches + common_modules |
| LiteOS-A / LiteOS-M | [kernel/liteos_a](../../../../kernel/liteos_a)、[kernel/liteos_m](../../../../kernel/liteos_m) | 小型 / 轻量系统内核 |
| UniProton | [kernel/uniproton](../../../../kernel/uniproton) | 实时内核 |

**rk3568 默认 `linux_kernel_version="linux-6.6"`。** 构建不在源码树内直接编译，而是复制到
`out/kernel/src_tmp/linux-6.6`，注入 HDF 与 OpenHarmony `common_modules` 补丁，合并
标准系统 / 板级 / 产品 defconfig 后构建（详见 [architecture/system.md](../../architecture/system.md)
「内核与板级层」）。rk3568 内核配置在
[kernel/linux/config/linux-6.6/rk3568](../../../../kernel/linux/config/linux-6.6/rk3568)。

## OHOS 注入内核的公共模块（common_modules）

[kernel/linux/common_modules](../../../../kernel/linux/common_modules) 是 OHOS 在通用 Linux
内核之上补充的功能模块（安全加固、TEE、协议、维测等），每个模块有独立 `Kconfig`/`Makefile`/源码。
rk3568 启用状态取自 `kernel/linux/config/linux-6.6/rk3568/arch/arm64_defconfig`。

| 模块 | 职责 | 主 Kconfig | rk3568 | 专题 |
| --- | --- | --- | :---: | --- |
| tzdriver | TEE 安全执行通信驱动（REE↔TEE） | `TZDRIVER` | ✅ =y | [→](common-modules/tzdriver/README.md) |
| newip | New IP 短地址协议（IPv4/IPv6 之外的新协议栈） | `NEWIP`* | — | [→](common-modules/newip/README.md) |
| xpm | 执行页保护 / 开发者模式（secureshield 防热更绕过审核） | `SECURITY_XPM` | ✅ debug=y | [→](common-modules/xpm/README.md) |
| dec | 数据增强访问控制（Data Enhance Control） | `SECURITY_DEC` | — | [→](common-modules/dec/README.md) |
| memory_security | 渲染进程内存保护（JIT 内存管控 / 地址隐藏） | `MEMORY_SECURITY` | ✅ =y | [→](common-modules/memory_security/README.md) |
| code_sign | 基于 FS-Verity 的代码签名 | `SECURITY_CODE_SIGN` | ✅ =y | [→](common-modules/code_sign/README.md) |
| qos_auth | FFRT 并发框架的 QoS 调度鉴权 | `QOS_CTRL`/`QOS_AUTHORITY` | ✅ =y | [→](common-modules/qos_auth/README.md) |
| container_escape_detection | 容器逃逸检测 | `SECURITY_CONTAINER_ESCAPE_DETECTION` | ✅ =y | [→](common-modules/container_escape_detection/README.md) |
| pac | 指针认证（ARM Pointer Authentication） | *（无标准名）* | — | [→](common-modules/pac/README.md) |
| ucollection | 统一采集（进程 CPU 维测数据） | `UNIFIED_COLLECTION` | — | [→](common-modules/ucollection/README.md) |
| module_sample | 内核模块开发示例 | *（无）* | — | [→](common-modules/module_sample/README.md) |

\* newip 的启用由独立 config 控制，未在 rk3568 arm64_defconfig 直接命中，标"—"表示未确认启用（需构建确认）。

> 安全关键模块集中在此：`code_sign`（代码签名）、`xpm`（执行保护）、`dec`（访问控制）、
> `tzdriver`（TEE）、`container_escape_detection`、`pac`、`memory_security` —— 做 P6 安全 review /
> 影响面分析时应重点关注。

## 内核网络节点（全部已建立）

- ✅ **公共模块**：本页 [common_modules 总表](#ohos-注入内核的公共模块common_modules)（11 专题）。
- ✅ **HDF 驱动框架**：[hdf-framework.md](hdf-framework.md) — 三层设备模型（devmgr→devhost→
  HdfDriverEntry）、model 分类、HDI、[drivers/hdf_core](../../../../drivers/hdf_core)。
- ✅ **rk3568 内核配置画像**：[rk3568-kernel-config.md](rk3568-kernel-config.md) — 版本、
  三层 defconfig 合并、关键 OHOS 特性开关(安全/QoS/内存/文件系统)。
- ✅ **HCS 设备拓扑**：[rk3568-hdf-topology.md](rk3568-hdf-topology.md) — 28 个 host、
  平台/外设/传感器/振动设备类别,`vendor/hihope/rk3568/hdf_config/*.hcs`。
- ✅ **内核索引生成器**：[tools/generate-kernel-index.sh](../../tools/generate-kernel-index.sh) →
  [generated/kernel-modules.tsv](../../generated/kernel-modules.tsv)（module/kconfig/rk3568启用/文件数/路径)。

## 后续可扩展（非本轮）

- **外设实现**：[drivers/peripheral](../../../../drivers/peripheral) 各外设的驱动实现细节专题。
- **liteos/uniproton** 小型/实时内核（rk3568 用 linux,优先级低）。
- **HDF 驱动代码骨架**：并入 `ohos-code-skeletons` 第二批。
