# rk3568 产品画像

## 产品身份

当前构建产品来自 [vendor/hihope/rk3568/config.json](../../../../vendor/hihope/rk3568/config.json)：

| 属性 | 值 |
| --- | --- |
| product | `rk3568` |
| company | `hihope` |
| device company | `rockchip` |
| system type | `standard` |
| target OS | `ohos` |
| target CPU | `arm` |
| board arch | `armv8-a` |
| CPU | Cortex-A55 |
| toolchain | Clang，`//build/toolchain/ohos:ohos_clang_arm` |
| kernel | 默认 Linux 6.6，arm64 defconfig |
| ramdisk | enabled |
| A/B system | disabled |
| SELinux | enabled |
| seccomp | enabled |
| config API version | 8 |

硬件是 ARMv8-A 64 位平台，但当前产品用户态 target 为 `arm`，内核使用 arm64 配置。这是分析 ABI、库安装目录和内核模块时必须保留的区别。

## 继承与裁剪

产品继承：

```text
productdefine/common/inherit/rich.json
productdefine/common/inherit/chipset_common.json
```

静态配置层：

- 产品自身显式 22 个子系统、65 个组件。
- `rich.json` 提供标准富设备基础能力。
- `chipset_common.json` 提供芯片侧 HDF 外设实现。

实际 preloader 层：

```text
58 effective subsystems
387 effective parts
```

最终部件清单见 [rk3568-parts.tsv](../../generated/rk3568-parts.tsv)。

## 部件构成

主要部件数量：

| 子系统 | 部件数 | 说明 |
| --- | ---: | --- |
| thirdparty | 102 | libc、图形、多媒体、加密、网络、Rust 等依赖 |
| hdf | 71 | HDI 接口、外设实现、devhost 和 HDF core |
| security | 15 | AccessToken、HUKS、证书、验签、DLP 等 |
| communication | 13 | IPC、SoftBus、网络、Wi-Fi、蓝牙、DHCP |
| multimedia | 13 | 音频、相机、编解码、媒体库、图片、DRM |
| hiviewdfx | 10 | 日志、事件、故障、跟踪、Hiview |
| resourceschedule | 10 | FFRT、资源/QoS/内存/后台任务调度 |
| distributeddatamgr | 8 | 数据库、DataShare、UDMF、剪贴板 |
| telephony | 8 | 核心服务、通话、数据、短信和 RIL |
| graphic | 7 | 2D/3D、Surface、Vulkan、图形效果 |
| distributedhardware | 7 | 分布式音频、相机、屏幕、输入和设备管理 |
| developtools | 7 | HDC、Profiler、打包、SysCap、前端工具 |
| applications | 7 | 当前产品选择的系统应用部件 |

第三方和 HDF 共 173 个部件，占有效部件约 45%，说明硬件适配与底层依赖是该产品构成的重要部分。

## 板级代码

[device/board/hihope/rk3568](../../../../device/board/hihope/rk3568) 提供：

- `cfg/init.rk3568.cfg`：板级启动动作和 ISP 服务。
- `cfg/init.rk3568.usb.cfg`：USB/HDC 配置触发器。
- `cfg/fstab.rk3568`：分区挂载。
- `kernel/BUILD.gn`、`build_kernel.sh`：内核构建。
- `loader/`：MiniLoader、U-Boot、分区参数。
- `audio_alsa/`、`audio_drivers/`：板级音频适配。
- `wifi/`：Wi-Fi 内核模块配置。
- `camera/vdi_impl/v4l2`：相机板级 VDI。
- `bootanimation/`：启动动画资源。

`device/board/hihope/rk3568/ohos.build` 定义 `rockchip_products` 部件，聚合板级 group、蓝牙 vendor 库、固件和相机 VDI，并声明内核/相机测试入口。

## Vendor 产品代码

[vendor/hihope/rk3568](../../../../vendor/hihope/rk3568) 的 `product_rk3568` 部件聚合：

```text
default_app_config
custom_image_conf
preinstall-config
resourceschedule
product_etc_conf
hdf_audio_config
hdf_codec_config
hdf_config
window_config
```

关键区域：

| 目录 | 影响 |
| --- | --- |
| `preinstall-config` | 预装/卸载应用、权限和 capability |
| `image_conf` | system/ramdisk/updater 镜像内容 |
| `hdf_config` | HDF 设备、devhost 和外设装载 |
| `resourceschedule` | cgroup、资源调度插件和 SoC 性能参数 |
| `window_config` | 显示与窗口管理产品参数 |
| `security_config` | 关键重启进程、高权限进程、sanitizer 名单 |
| `etc/param` | 硬件和产品系统参数 |
| `hals/audio` | 音频 adapter/path/effect 配置 |

## 显式能力覆写

产品不是只继承 rich 默认值，还对关键硬件能力做了覆写。

### ArkUI

```text
accessibility enabled
web enabled
upgraded Skia enabled
```

### 图形

```text
Render Service EGLImage enabled
Texgine enabled
upgraded Skia enabled
Graphic 3D + Vulkan loader/headers included
```

### 通信

```text
Wi-Fi non-separate P2P
non-HDF Wi-Fi driver path
P2P random MAC
NetFirewall SysCap disabled
```

### 多媒体

```text
Audio DTMF/OpenSL ES/audio suite enabled
OS account audio support disabled
HDMI detect audio enabled
Image upgraded Skia enabled
AVSession input cast SysCap enabled
```

### HDF

产品显式加入 RIL、蓝牙、音频、编解码、显示、WLAN、LP player 等接口和外设实现，并针对 community/default VDI、OMX 扩展测试、HDI v1 等设置 feature。

### HiviewDFX

```text
hiview_feature_bbox_userspace = true
hiview_enable_leak_detector = true
hiview_enable_performance_monitor = true
```

因此当前线程泄漏检测插件所在 Hiview 组件确实被产品选中，并且产品启用了 leak detector 总体特性。

## 启动与安全关键进程

关键重启名单：

```text
samgr
foundation
param_watcher
appspawn
render_service
storage_daemon
storage_manager
hdf_devmgr
accountmgr
accesstoken_service
privacy_service
```

高权限进程名单还包括 `cjappspawn`、`nativespawn`、`hybridspawn`、`media_service`、`netsysnative`、资源调度进程、`hdcd` 和升级服务。

这两份名单是产品安全审计入口：新增 root/system 进程或调整守护策略时必须检查 vendor 配置、init cfg、SELinux domain 和权限组。

## 内核路径

当前 kernel 构建：

```text
kernel/linux/linux-6.6
  -> copy to out/kernel/src_tmp/linux-6.6
  -> RK3568 patch
  -> HDF/common module patches
  -> merge arm64 + standard + product defconfig
  -> boot_linux.img/resource.img
```

注入的公共能力包括 HDF、TEE、XPM、QoS Auth、隐藏地址、统一采集、代码签名和设备执行控制等。修改公共内核模块会影响最终复制后的临时源码，不应只在 `out/kernel/src_tmp` 修改。

## 当前构建状态

现有 `out` 由以下目标产生：

```text
hiview_package
ThreadLeakDetectorUnitTest
ThreadLeakDetectorModuleTest
```

已有：

- 产品 preloader 结果。
- GN args 和 Ninja 图。
- Hiview/测试产物。

缺少：

- 完整 `packages/phone/images`。
- 完整 `/system/profile` SA 聚合结果。
- 全系统安装清单和可刷写镜像。

因此当前知识库可准确描述“产品选择与局部目标”，不能声称当前源码已经完成全量 rk3568 镜像验证。

## 产品变更检查点

| 变更 | 必查项 |
| --- | --- |
| 新增组件 | config 选择、bundle 元数据、preloader parts、GN 入口 |
| 新增 SA | profile、cfg、安装路径、SELinux、SA ID 冲突 |
| 新增预装 HAP | install list、签名、权限白名单、卸载策略 |
| 修改 HDF | HCS、HDI、devhost、vendor 实现、内核模块 |
| 修改图形/窗口 | 产品 XML、RS/WM、显示 HDI、旋转/分辨率 |
| 修改安全名单 | init 用户组、SELinux domain、最小权限、守护策略 |
| 修改 kernel | 源码/patch/config 三者来源，不能只改临时输出 |
| 修改镜像内容 | image conf、install image、分区容量和启动验证 |
