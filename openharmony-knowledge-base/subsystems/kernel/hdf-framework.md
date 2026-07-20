# HDF 驱动框架（Hardware Driver Foundation）

## 归属

```text
kernel -> hdf（跨内核态/用户态的统一驱动框架）
```

HDF 是 OHOS 的统一驱动框架,横跨内核态与用户态,提供设备管理、驱动加载、总线/平台驱动模型
与 HDI（Hardware Driver Interface）。它是「公共模块 → 驱动 → 设备」内核网络里承上启下的一环:
上接用户态服务（经 HDI）、下接具体外设驱动与板级配置（HCS）。

## 三层设备模型

```
DevmgrService（设备管理器）        drivers/hdf_core/framework/core/manager
  │  按 HCS 配置加载 host / device
  ▼
DevHostService（驱动宿主进程）     drivers/hdf_core/framework/core/host
  │  加载并托管一组驱动
  ▼
HdfDriverEntry（单个驱动）         { moduleName, Bind, Init, Release }
     Bind    绑定服务对象
     Init    初始化硬件/资源
     Release 释放
```

## 代码入口（源码仓相对路径）

| 目录/文件 | 职责 |
| --- | --- |
| [hdf_core/framework/core/manager](../../../../drivers/hdf_core/framework/core/manager) | DevmgrService 设备管理器 |
| [hdf_core/framework/core/host](../../../../drivers/hdf_core/framework/core/host)（devhost_service.c / hdf_driver_loader.c / hdf_device.c） | DevHostService 宿主 + 驱动加载 |
| [hdf_core/framework/core/common/src/hdf_attribute.c](../../../../drivers/hdf_core/framework/core/common/src/hdf_attribute.c) | HCS 属性解析 |
| [hdf_core/framework/model](../../../../drivers/hdf_core/framework/model) | 平台/总线驱动模型（见下） |
| [hdf_core/framework/support/platform](../../../../drivers/hdf_core/framework/support/platform) | 平台驱动能力（i2c/spi/uart/gpio/dac/regulator…） |
| [hdf_core/framework/sample/platform/uart](../../../../drivers/hdf_core/framework/sample/platform/uart) | HdfDriverEntry 范例（Bind/Init/Release） |
| [hdf_core/adapter](../../../../drivers/hdf_core/adapter) | Linux/LiteOS 内核适配层 |
| [drivers/interface](../../../../drivers/interface) | HDI 接口定义（用户态调驱动） |

## 驱动模型分类（framework/model）

| 类别 | 说明 |
| --- | --- |
| display | 显示 |
| audio | 音频 |
| camera | 相机 |
| input | 输入（触摸/按键） |
| sensor | 传感器 |
| storage | 存储 |
| usb | USB |
| network | 网络设备 |
| misc | 其它（vibrator/light 等） |

## HDI（Hardware Driver Interface）

[drivers/interface](../../../../drivers/interface) 下按外设类型定义 IDL 接口（display/audio/camera/
sensor/usb/input/battery/light/vibrator/huks/face_auth/fingerprint_auth…),用户态服务通过 HDI
调用驱动,屏蔽内核态/用户态部署差异。具体外设实现见
[drivers/peripheral](../../../../drivers/peripheral)。

## 装载链（HCS 驱动)

```
vendor/hihope/rk3568/hdf_config/*.hcs（板级设备描述）
  → DevmgrService 解析 HCS → 创建 host/device 节点
    → DevHostService 加载对应 moduleName 的 HdfDriverEntry
      → Bind → Init（初始化硬件）
```
rk3568 实际挂载的驱动/设备见 [HCS 设备拓扑](../rk3568-hdf-topology.md)（下一节点）。

## 风险 / 安全

- HDF 是设备接入总入口,HCS 配置错误 → 设备加载失败;驱动 Init 的资源申请/释放不配对 → 泄漏。
- HDI 是用户态↔驱动边界,参数校验是安全审计点（同 P6 安全 review）。

## 与本仓的关系

- 写 HDF 驱动的代码骨架属 `ohos-code-skeletons` roadmap 第二批（HDF 骨架,暂缓）。
- 本页是知识沉淀（导航 + 模型),骨架是脚手架（写码模板),两者互补。
