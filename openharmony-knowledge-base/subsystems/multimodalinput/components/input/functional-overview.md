# input 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

本组件应用于标准系统之上，为设备提供单指触控输入能力。本组件将触屏输入产生的事件上报到JS UI框架或用户程序框架，JS UI框架根据上报的事件再次封装，对应用提供接口。 当系统应用需要返回上一层时，通过注入接口将BACK键注入到多模服务，多模服务再上传到应用，以实现返回到上一层级目录的效果。使用方式如下所示：

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimodalinput` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 5120KB |
| 源码仓 | `foundation/multimodalinput/input` |

## 核心能力

- **Multimodal Input Input Infrared Emitter**：提供“input infrared emitter”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.InfraredEmitter`。
- **Multimodal Input Input Cooperator**：提供“input cooperator”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.Cooperator`。
- **Multimodal Input Input Pointer**：提供“input pointer”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.Pointer`。
- **Multimodal Input Input Short Key**：提供“input short key”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.ShortKey`。
- **Multimodal Input Input Input Monitor**：提供“input input monitor”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.InputMonitor`。
- **Multimodal Input Input Input Simulator**：提供“input input simulator”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.InputSimulator`。
- **Multimodal Input Input Core**：提供“input core”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.Core`。
- **Multimodal Input Input Input Device**：提供“input input device”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.InputDevice`。
- **Multimodal Input Input Input Consumer**：提供“input input consumer”能力，系统能力标识为 `SystemCapability.MultimodalInput.Input.InputConsumer`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `input_feature_product`：input 功能 product。
- `input_feature_enable_pgo`：input 功能 启用 pgo。
- `input_feature_pgo_path`：input 功能 pgo path。
- `input_feature_combination_key`：input 功能 combination key。
- `input_feature_input_device`：input 功能 input device。
- `input_feature_interceptor`：input 功能 interceptor。
- `input_feature_keyboard`：input 功能 keyboard。
- `input_feature_monitor`：input 功能 monitor。
- `input_feature_mouse`：input 功能 mouse。
- `input_feature_pointer_drawing`：input 功能 pointer drawing。
- `input_feature_switch`：input 功能 switch。
- `input_feature_touchscreen`：input 功能 touchscreen。
- `input_feature_short_key`：input 功能 short key。
- `input_feature_fingerprint`：input 功能 fingerprint。
- `input_feature_crown`：input 功能 crown。
- `input_feature_joystick`：input 功能 joystick。
- `input_feature_coverage`：input 功能 覆盖率。
- `input_shortcut_key_manager_enabled`：input shortcut key manager 启用。
- `input_shortcut_key_rules_enabled`：input shortcut key rules 启用。
- `input_feature_virtual_keyboard`：input 功能 virtual keyboard。
- `input_feature_dfx_radar_enable`：input 功能 dfx radar 启用。
- `input_feature_one_hand_mode_enable`：input 功能 one hand mode 启用。
- `input_feature_touch_drawing`：input 功能 touch drawing。
- `input_feature_watch_cfg_source`：input 功能 watch cfg 媒体源。
- `input_feature_upgrade_skia`：input 功能 upgrade skia。
- `input_feature_mistouch_prevention`：input 功能 mistouch prevention。
- `input_feature_key_hook`：input 功能 key hook。
- `input_feature_key_pressed_handler`：input 功能 key pressed handler。
- `input_feature_external_screen`：input 功能 external screen。
- `input_feature_knuckle`：input 功能 knuckle。
- `input_feature_touchpad`：input 功能 touchpad。
- `input_feature_pen`：input 功能 pen。
- `input_feature_touch_gesture`：input 功能 touch gesture。
- `input_feature_universal_drag_enable`：input 功能 universal drag 启用。
- `input_feature_triple_finger_snapshot`：input 功能 triple finger snapshot。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimodalinput/input/frameworks](../../../../../../foundation/multimodalinput/input/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 170 | `ets`, `napi`, `native`, `proxy` |
| [foundation/multimodalinput/input/service](../../../../../../foundation/multimodalinput/input/service) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 161 | `account_manager`, `app_state_manager`, `common`, `connect_manager`, `crown_transform_processor`, `custom_config_parser`, `delegate_task`, `device_config` |
| [foundation/multimodalinput/input/intention](../../../../../../foundation/multimodalinput/input/intention) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 78 | `adapters`, `common`, `cooperate`, `data`, `dfx`, `drag`, `frameworks`, `ipc` |
| [foundation/multimodalinput/input/etc](../../../../../../foundation/multimodalinput/input/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 18 | `joystick`, `mouse_icon` |
| [foundation/multimodalinput/input/tools](../../../../../../foundation/multimodalinput/input/tools) | 开发、诊断、命令行或构建辅助工具。 | 15 | `event_inject`, `inject_event`, `vuinput` |
| [foundation/multimodalinput/input/util](../../../../../../foundation/multimodalinput/input/util) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 15 | `common`, `json_parser`, `napi`, `network`, `rust_key`, `screen_capture`, `socket` |
| [foundation/multimodalinput/input/common](../../../../../../foundation/multimodalinput/input/common) | 组件内部共享的公共定义、工具和基础实现。 | 7 | `anco`, `event_integrity`, `property_name_mapper` |
| [foundation/multimodalinput/input/libudev](../../../../../../foundation/multimodalinput/input/libudev) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `include`, `src` |
| [foundation/multimodalinput/input/interfaces](../../../../../../foundation/multimodalinput/input/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `api_temp`, `kits`, `native` |
| [foundation/multimodalinput/input/sa_profile](../../../../../../foundation/multimodalinput/input/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/multimodalinput/input/uinput](../../../../../../foundation/multimodalinput/input/uinput) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/multimodalinput/input/watch](../../../../../../foundation/multimodalinput/input/watch) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 20 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimodalinput/input/frameworks/proxy:libmmi-client` | `//foundation/multimodalinput/input/interfaces/native/innerkits` | `proxy/include/window_info.h`, `proxy/include/input_manager.h`, `event/include/key_event.h`, `event/include/pointer_event.h`, `event/include/input_event.h`, `event/include/mmi_event_observer.h`, `event/include/pointer_style.h` |
| `//foundation/multimodalinput/input/util:libmmi-util` | `//foundation/multimodalinput/input/util` | `network/include/net_packet.h`, `common/include/input_event_data_transformation.h`, `common/include/i_input_device_consumer.h` |
| `//foundation/multimodalinput/input/frameworks/native/input:oh_input_manager` | `//foundation/multimodalinput/input/interfaces/kits/c` | `input/oh_input_manager.h`, `input/oh_key_code.h` |
| `//foundation/multimodalinput/input/util/napi:libmmi-napi` | `//foundation/multimodalinput/input/util/napi/include` | `key_event_napi.h` |
| `//foundation/multimodalinput/input/service:libmmi-server-common` | `//foundation/multimodalinput/input/service/common` | `include/old_display_info.h`, `setting_datashare/include/setting_datashare.h`, `setting_datashare/include/setting_observer.h`, `timer_manager/include/timer_manager.h` |
| `//foundation/multimodalinput/input/libudev:mmi_libudev` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/input_consumer:input_consumer_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/input_event:input_event_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/input_monitor:input_monitor_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/intention_code:intention_code_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/gesture_event:gesture_event_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/mouse_event:mouse_event_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/key_code:key_code_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/key_event:key_event_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/short_key:short_key_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/touch_event:touch_event_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/input_event_client:input_event_client_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/input_device:input_device_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/pointer:pointer_taihe` | - | - |
| `//foundation/multimodalinput/input/frameworks/ets/infrared_emitter:infrared_emitter_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimodalinput` | [mmi_uinput_service](../../processes/mmi_uinput_service/foundation-runtime.md) | 启动配置 | - | - |
| `multimodalinput` | [multimodalinput](../../processes/multimodalinput/foundation-runtime.md) | 启动配置, SA 实现 | `3101` | `libmmi-server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/multimodalinput/input:uinput_inject` | [foundation/multimodalinput/input/BUILD.gn](../../../../../../foundation/multimodalinput/input/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimodalinput/input/intention/services/intention_service:intention_service` | [foundation/multimodalinput/input/intention/services/intention_service/BUILD.gn](../../../../../../foundation/multimodalinput/input/intention/services/intention_service/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/multimodalinput/input/sa_profile:multimodalinput_sa_profile` | [foundation/multimodalinput/input/sa_profile/BUILD.gn](../../../../../../foundation/multimodalinput/input/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimodalinput/input/service:libmmi-server-common` | [foundation/multimodalinput/input/service/BUILD.gn](../../../../../../foundation/multimodalinput/input/service/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimodalinput/input/service:libmmi-server` | [foundation/multimodalinput/input/service/BUILD.gn](../../../../../../foundation/multimodalinput/input/service/BUILD.gn) |
| `ohos_executable` | `//foundation/multimodalinput/input/tools/event_inject:mmi-event-injection` | [foundation/multimodalinput/input/tools/event_inject/BUILD.gn](../../../../../../foundation/multimodalinput/input/tools/event_inject/BUILD.gn) |
| `ohos_executable` | `//foundation/multimodalinput/input/tools/inject_event:uinput` | [foundation/multimodalinput/input/tools/inject_event/BUILD.gn](../../../../../../foundation/multimodalinput/input/tools/inject_event/BUILD.gn) |
| `ohos_executable` | `//foundation/multimodalinput/input/tools/vuinput:vuinput` | [foundation/multimodalinput/input/tools/vuinput/BUILD.gn](../../../../../../foundation/multimodalinput/input/tools/vuinput/BUILD.gn) |

生产库形态：`ohos_source_set` 45 个，`ohos_shared_library` 30 个，`taihe_shared_library` 13 个，`ohos_ndk_library` 1 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 52 个组件依赖和 4 个三方依赖。

- 系统组件协作：`api_metrics`, `window_manager`, `hisysevent`, `start`, `napi`, `c_utils`, `ipc`, `hitrace`, `resource_schedule_service`, `eventhandler`, `image_framework`, `graphic_2d`, `graphic_surface`, `drivers_interface_input`, `drivers_interface_display`, `safwk`, `ability_runtime`, `access_token`, `ability_base`, `samgr`, `config_policy`, `hicollie`, `init`, `preferences`, `security_component_manager`, `hilog`, `common_event_service`, `data_share`, `relational_store`, `faultloggerd`, `ffrt`, `hdf_core`, `bounds_checking_function`, `icu`, `call_manager`, `libinput`, `screenlock_mgr`, `googletest`, `player_framework`, `cJSON`, `qos_manager`, `audio_framework`, `graphic_surface`, `ipc`, `sensor`, `idl_tool`, `runtime_core`, `libinput`, `libuv`, `os_account`, `openssl`, `zlib`。
- 三方实现依赖：`libuv`, `libevdev`, `mtdev`, `rust`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 1062 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 441 个，`ohos_fuzztest` 418 个，`ohos_unittest` 172 个，`ohos_source_set` 23 个，`generate_static_abc` 6 个，`ohos_rust_unittest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimodalinput/input/bundle.json](../../../../../../foundation/multimodalinput/input/bundle.json)
- 原始源码 README：[foundation/multimodalinput/input/README_zh.md](../../../../../../foundation/multimodalinput/input/README_zh.md)、[foundation/multimodalinput/input/README.md](../../../../../../foundation/multimodalinput/input/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
