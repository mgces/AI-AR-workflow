# distributedhardware：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 7 个部件，其中 7 个进入当前 rk3568 产品。7 个部件包含可识别的服务/可执行程序/SA profile，5 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `device_manager` | DeviceManager组件在OpenHarmony上提供账号无关的分布式设备的认证组网能力，并为开发者提供了一套用于分布式设备间监听、发现和认证的接口。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/4 | yes | [查看](components/device_manager/functional-overview.md) |
| `distributed_audio` | 分布式音频是指多个设备之间音频外设跨设备协同使用的能力，如将设备A的音频通过设备B的Speaker进行播音，或者设备A使用设备B的Mic进行录音。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 | 0/2 | yes | [查看](components/distributed_audio/functional-overview.md) |
| `distributed_camera` | 分布式相机是多个设备的相机同时协同使用的能力。 | 服务/运行实体 + 框架或基础库 | 0/4 | yes | [查看](components/distributed_camera/functional-overview.md) |
| `distributed_hardware_fwk` | 分布式硬件管理框架是为分布式硬件子系统提供信息管理能力的部件。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/distributed_hardware_fwk/functional-overview.md) |
| `distributed_input` | 分布式输入提供了跨设备的输入外设控制能力，使一台设备可以使用另一台设备的输入外设（如鼠标，键盘，触摸板等）在本设备进行输入操作（如鼠标点击，键盘打字，触摸板滑动等），对端设备的外设输入事件在本机生效。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 | 0/0 | yes | [查看](components/distributed_input/functional-overview.md) |
| `distributed_screen` | 分布式屏幕是一种屏幕虚拟化能力，支持用户指定组网认证过的其他OpenHarmony设备的屏幕作为Display的显示区域。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 | 0/0 | yes | [查看](components/distributed_screen/functional-overview.md) |
| `mechbody_controller` | 机械体设备是一个具备自主运动能力的智能机械（比如云台，机械臂，自动升降架，机械车等）。 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/mechbody_controller/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `distributedhardware` | [daudio](processes/daudio/foundation-runtime.md) | `distributed_audio` | 2 | [查看](processes/daudio/foundation-runtime.md) |
| `distributedhardware` | [dcamera](processes/dcamera/foundation-runtime.md) | `distributed_camera` | 2 | [查看](processes/dcamera/foundation-runtime.md) |
| `distributedhardware` | [device_manager](processes/device_manager/foundation-runtime.md) | `device_manager` | 1 | [查看](processes/device_manager/foundation-runtime.md) |
| `distributedhardware` | [dhardware](processes/dhardware/foundation-runtime.md) | `distributed_hardware_fwk` | 1 | [查看](processes/dhardware/foundation-runtime.md) |
| `distributedhardware` | [dinput](processes/dinput/foundation-runtime.md) | `distributed_input` | 2 | [查看](processes/dinput/foundation-runtime.md) |
| `distributedhardware` | [dscreen](processes/dscreen/foundation-runtime.md) | `distributed_screen` | 2 | [查看](processes/dscreen/foundation-runtime.md) |
| `distributedhardware` | [mechbody](processes/mechbody/foundation-runtime.md) | `mechbody_controller` | 1 | [查看](processes/mechbody/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
