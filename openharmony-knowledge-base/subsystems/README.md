# rk3568 子系统地图

本表以 `out/preloader/rk3568/parts.json` 为准，覆盖当前产品的 58 个有效子系统。部件全量清单见 [rk3568-parts.tsv](../generated/rk3568-parts.tsv)。

已建立深度所有权树的子系统：

- [HiviewDFX](hiviewdfx/README.md)

## 核心框架

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| ability | 5 | Ability/App 生命周期、DMS、Form、IDL | [foundation/ability](../../../foundation/ability) |
| arkui | 5 | ArkUI 引擎、组件、NAPI、UI appearance/lite | [foundation/arkui](../../../foundation/arkui) |
| arkcompiler | 6 | ETS 前端、运行时、静态运行时、工具链 | [arkcompiler](../../../arkcompiler) |
| bundlemanager | 5 | HAP/HSP 安装、查询、工具、分布式包管理 | [foundation/bundlemanager](../../../foundation/bundlemanager) |
| systemabilitymgr | 3 | SAMgr、SA framework、服务选择 | [foundation/systemabilitymgr](../../../foundation/systemabilitymgr) |
| window | 1 | 窗口、SceneBoard、显示/会话管理 | [foundation/window/window_manager](../../../foundation/window/window_manager) |
| graphic | 7 | Render Service、2D/3D、Surface、Vulkan | [foundation/graphic](../../../foundation/graphic) |
| multimodalinput | 1 | 输入设备、事件分发和注入 | [foundation/multimodalinput/input](../../../foundation/multimodalinput/input) |
| barrierfree | 1 | 无障碍服务与接口 | [foundation/barrierfree/accessibility](../../../foundation/barrierfree/accessibility) |
| inputmethod | 1 | 输入法框架 | [base/inputmethod/imf](../../../base/inputmethod/imf) |
| web | 1 | ArkWeb/WebView | [base/web/webview](../../../base/web/webview) |

## 系统基础服务

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| startup | 3 | init、appspawn、启动阶段 | [base/startup](../../../base/startup) |
| account | 1 | OS 帐号与多用户 | [base/account/os_account](../../../base/account/os_account) |
| accesscontrol | 1 | 沙箱管理 | [base/accesscontrol/sandbox_manager](../../../base/accesscontrol/sandbox_manager) |
| security | 15 | AccessToken、验签、HUKS、证书、DLP | [base/security](../../../base/security) |
| useriam | 5 | PIN、人脸、指纹、统一认证 | [base/useriam](../../../base/useriam) |
| tee | 1 | TEE client | [base/tee/tee_client](../../../base/tee/tee_client) |
| customization | 2 | 配置策略、企业设备管理 | [base/customization](../../../base/customization) |
| notification | 3 | 公共事件、分布式通知、事件循环 | [base/notification](../../../base/notification) |
| request | 1 | 下载/上传请求服务 | [base/request/request](../../../base/request/request) |
| time | 1 | 系统时间服务 | [base/time/time_service](../../../base/time/time_service) |
| theme | 2 | 锁屏与壁纸 | [base/theme](../../../base/theme) |
| print | 1 | 打印框架 | [base/print/print_fwk](../../../base/print/print_fwk) |
| officeservice | 1 | 对象编辑服务 | [foundation/officeservice/object_editor](../../../foundation/officeservice/object_editor) |

## 数据、文件与全局化

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| distributeddatamgr | 8 | RDB、KV、DataShare、UDMF、剪贴板 | [foundation/distributeddatamgr](../../../foundation/distributeddatamgr) |
| filemanagement | 6 | 存储、文件 API、DFS、磁盘、应用文件 | [foundation/filemanagement](../../../foundation/filemanagement) |
| global | 5 | i18n、时区、资源管理、字体、系统资源 | [base/global](../../../base/global) |
| contacts_data | 1 | 联系人数据服务 | [applications/standard/contacts_data](../../../applications/standard/contacts_data) |
| deviceprofile | 1 | 分布式设备 Profile | [foundation/deviceprofile/device_info_manager](../../../foundation/deviceprofile/device_info_manager) |

## 通信与分布式

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| communication | 13 | IPC、SoftBus、网络、Wi-Fi、蓝牙、DHCP | [foundation/communication](../../../foundation/communication) |
| distributedhardware | 7 | 分布式音频、相机、屏幕、输入、设备管理 | [foundation/distributedhardware](../../../foundation/distributedhardware) |
| location | 7 | GNSS、网络、地理编码和定位服务 | [base/location](../../../base/location) |
| castplus | 2 | 投屏与共享框架 | [foundation/CastEngine](../../../foundation/CastEngine) |
| msdp | 1 | 设备状态与协同交互 | [base/msdp/device_status](../../../base/msdp/device_status) |

## 多媒体与感知

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| multimedia | 13 | 音频、相机、编解码、播放器、图片、媒体库 | [foundation/multimedia](../../../foundation/multimedia) |
| sensors | 3 | 传感器和小器件服务 | [base/sensors](../../../base/sensors) |
| ai | 3 | NNRT、MindSpore、智能语音 | [foundation/ai](../../../foundation/ai) |
| game | 1 | 游戏控制器框架 | [domains/game/game_controller_framework](../../../domains/game/game_controller_framework) |
| advertising | 2 | 广告与 OAID | [domains/advertising](../../../domains/advertising) |

## 资源、电源与设备管理

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| resourceschedule | 10 | FFRT、资源/QoS/内存/后台任务/待机 | [foundation/resourceschedule](../../../foundation/resourceschedule) |
| powermgr | 5 | 电源、电池、显示、热管理、统计 | [base/powermgr](../../../base/powermgr) |
| usb | 1 | USB 主机、设备与端口管理 | [base/usb/usb_manager](../../../base/usb/usb_manager) |
| updater | 3 | OTA、更新服务、系统安装 | [base/update](../../../base/update) |

## DFX 与开发工具

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| hiviewdfx | 10 | hilog、hisysevent、Hiview、故障、跟踪 | [知识节点](hiviewdfx/README.md) / [源码](../../../base/hiviewdfx) |
| developtools | 7 | HDC、Profiler、HiPerf、打包、SysCap | [developtools](../../../developtools) |
| commonlibrary | 6 | C/C++、ETS、内存和 YLong Rust 公共库 | [commonlibrary](../../../commonlibrary) |
| build | 1 | GN/Ninja 构建框架 | [build](../../../build) |
| sdk | 1 | SDK 聚合与接口交付 | [interface](../../../interface) |

## 电话与业务服务

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| telephony | 8 | SIM、RIL、蜂窝数据、通话、短信 | [base/telephony](../../../base/telephony) |
| applications | 7 | 产品选择的系统应用部件 | [applications/standard](../../../applications/standard) |

## 驱动、产品与第三方

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| hdf | 71 | HDF core、HDI 和外设实现 | [drivers](../../../drivers) |
| device_rk3568 | 1 | rk3568 板级构建聚合 | [device/board/hihope/rk3568](../../../device/board/hihope/rk3568) |
| rockchip_products | 1 | Rockchip 板级、蓝牙和相机 VDI | [device/board/hihope/rk3568/ohos.build](../../../device/board/hihope/rk3568/ohos.build) |
| product_rk3568 | 1 | 产品配置、预装、镜像、HDF、窗口 | [vendor/hihope/rk3568](../../../vendor/hihope/rk3568) |
| thirdparty | 102 | 系统依赖的第三方软件 | [third_party](../../../third_party) |

## 测试体系

| 子系统 | 部件数 | 主要职责 | 代码入口 |
| --- | ---: | --- | --- |
| testfwk | 1 | ArkXTest 产品部件；developer_test/xdevice 提供基础设施 | [test/testfwk](../../../test/testfwk) |
| xts | 4 | ACTS、DCTS、HATS、Device Attest | [test/xts](../../../test/xts) |
| ostest | 1 | Wukong 稳定性测试 | [test/ostest/wukong](../../../test/ostest/wukong) |

## 分析优先级

跨子系统问题可按以下顺序定位：

1. 产品是否选择了部件：`rk3568-parts.tsv`。
2. 组件元数据和跨部件依赖：`components.tsv`。
3. 组件 `sub_component` 与 GN 目标。
4. SA/init/HDF/应用运行入口。
5. 真机进程、日志、权限和设备节点。

只按目录搜索容易遗漏产品未选择、组件别名、共享进程和动态加载关系。
