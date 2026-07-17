# ability_runtime 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Ability管理服务统一调度和管理应用中各Ability和应用管理服务, 用于管理应用运行关系、调度应用进程生命周期及状态

源码 README 补充说明：

> **元能力子系统**实现对Ability的运行及生命周期进行统一的调度和管理，应用进程能够支撑多个Ability，Ability具有跨应用进程间和同一进程内调用的能力。Ability管理服务统一调度和管理应用中各Ability，并对Ability的生命周期变更进行管理。 **Ability Kit**为Ability的运行提供基础的运行环境支撑。Ability是系统调度应用的最小单元，是能够完成一个独立功能的组件，一个应用可以包含一个或多个Ability。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/ability_runtime` |

## 核心能力

- **Ability Ability Runtime Core**：提供“ability runtime core”能力，系统能力标识为 `SystemCapability.Ability.AbilityRuntime.Core`。
- **Ability Ability Runtime FAModel**：提供“ability runtime famodel”能力，系统能力标识为 `SystemCapability.Ability.AbilityRuntime.FAModel`。
- **Ability Ability Runtime Ability Core**：提供“ability runtime ability core”能力，系统能力标识为 `SystemCapability.Ability.AbilityRuntime.AbilityCore`。
- **Ability Ability Runtime Mission**：提供“ability runtime mission”能力，系统能力标识为 `SystemCapability.Ability.AbilityRuntime.Mission`。
- **Ability Ability Runtime Quick Fix**：提供“ability runtime quick fix”能力，系统能力标识为 `SystemCapability.Ability.AbilityRuntime.QuickFix`。
- **Ability Ability Tools Ability Assistant**：提供“ability tools ability assistant”能力，系统能力标识为 `SystemCapability.Ability.AbilityTools.AbilityAssistant`。
- **Ability App Startup**：提供“ability app startup”能力，系统能力标识为 `SystemCapability.Ability.AppStartup`。
- **Ability App Extension Photo Editor Extension**：提供“app extension photo editor extension”能力，系统能力标识为 `SystemCapability.Ability.AppExtension.PhotoEditorExtension`。
- **Ability App Extension Vertical Panel**：提供“app extension vertical panel”能力，系统能力标识为 `SystemCapability.Ability.AppExtension.VerticalPanel`。
- **Ability Agent Runtime Core**：提供“agent runtime core”能力，系统能力标识为 `SystemCapability.Ability.AgentRuntime.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ability_runtime_auto_fill_ability`：ability runtime auto fill ability。
- `ability_runtime_graphics`：ability runtime 图形协同。
- `ability_runtime_power`：ability runtime 电源协同。
- `ability_runtime_app_no_response_dialog`：ability runtime app no response dialog。
- `ability_runtime_app_no_response_dialog_wearable`：ability runtime app no response dialog wearable。
- `ability_runtime_app_no_response_bundlename`：ability runtime app no response bundlename。
- `ability_runtime_start_window_options_with_pixelmap`：ability runtime start window options with pixelmap。
- `ability_runtime_check_internet_permission`：ability runtime check internet permission。
- `ability_runtime_no_screen`：ability runtime no screen。
- `ability_runtime_forbid_start_enabled`：ability runtime forbid start 启用。
- `ability_runtime_enable_clone_for_account`：ability runtime 启用 clone for account。
- `ability_runtime_dsoftbus_enable`：ability runtime dsoftbus 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/ability_runtime/frameworks](../../../../../../foundation/ability/ability_runtime/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 715 | `c`, `cj`, `ets`, `js`, `native`, `simulator` |
| [foundation/ability/ability_runtime/tools](../../../../../../foundation/ability/ability_runtime/tools) | 开发、诊断、命令行或构建辅助工具。 | 73 | `aa`, `cc`, `ohos-aa`, `ohos-arktsScript` |
| [foundation/ability/ability_runtime/cli_tool_framework](../../../../../../foundation/ability/ability_runtime/cli_tool_framework) | 客户端框架、公共运行库以及面向上层的能力封装。 | 69 | `etc`, `frameworks`, `interfaces`, `services` |
| [foundation/ability/ability_runtime/agent_runtime_framework](../../../../../../foundation/ability/ability_runtime/agent_runtime_framework) | 客户端框架、公共运行库以及面向上层的能力封装。 | 64 | `frameworks`, `interfaces`, `services` |
| [foundation/ability/ability_runtime/interfaces](../../../../../../foundation/ability/ability_runtime/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 64 | `inner_api`, `kits` |
| [foundation/ability/ability_runtime/services](../../../../../../foundation/ability/ability_runtime/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 59 | `abilitymgr`, `appdfr`, `appmgr`, `common`, `dataobsmgr`, `dialog_ui`, `quickfixmgr`, `sa_profile` |
| [foundation/ability/ability_runtime/service_router_framework](../../../../../../foundation/ability/ability_runtime/service_router_framework) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 20 | `interfaces`, `services` |
| [foundation/ability/ability_runtime/js_environment](../../../../../../foundation/ability/ability_runtime/js_environment) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 11 | `frameworks`, `interfaces` |
| [foundation/ability/ability_runtime/ets_environment](../../../../../../foundation/ability/ability_runtime/ets_environment) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `frameworks`, `interfaces` |
| [foundation/ability/ability_runtime/utils](../../../../../../foundation/ability/ability_runtime/utils) | 跨模块复用的基础工具和通用数据结构。 | 6 | `global`, `server` |
| [foundation/ability/ability_runtime/cj_environment](../../../../../../foundation/ability/ability_runtime/cj_environment) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `frameworks`, `interfaces` |
| [foundation/ability/ability_runtime/skills](../../../../../../foundation/ability/ability_runtime/skills) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `codecheck` |

## 对外与内部接口

该部件声明 81 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/ability_runtime/interfaces/inner_api/deps_wrapper:ability_deps_wrapper` | `//foundation/ability/ability_runtime/interfaces/inner_api/deps_wrapper/include` | `os_account_manager_wrapper.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/error_utils:ability_runtime_error_util` | `//foundation/ability/ability_runtime/interfaces/inner_api/error_utils/include` | `ability_runtime_error_util.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/wantagent:wantagent_innerkits` | `//foundation/ability/ability_runtime/interfaces/inner_api/wantagent/include/` | `pending_want.h`, `trigger_info.h`, `want_agent_constant.h`, `want_agent_helper.h`, `want_agent_info.h`, `want_agent.h` |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/want_agent:cj_want_agent_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/want_agent/include` | `cj_want_agent_ffi.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:cj_ui_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/ui_extension_base` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native/:cj_photo_editor_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/photo_editor_extension_ability` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:cj_form_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/form_runtime` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:ets_form_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/form_runtime` | - |
| `//foundation/ability/ability_runtime/frameworks/ets/ani/dialog_request_info:dialog_request_info_ani_kit` | `//foundation/ability/ability_runtime/frameworks/ets/ani/dialog_request_info/include` | `ets_request_info.h` |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/context:cj_context_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/context` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability:cj_ability_context_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/ability_runtime` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:cj_extensionkit_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:cj_abilitykit_native_ffi` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:cj_insight_intent_executor` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/insight_intent_executor` | - |
| `//foundation/ability/ability_runtime/frameworks/native/insight_intent/insight_intent_context:cj_insightintentcontext` | `//foundation/ability/ability_runtime/interfaces/inner_api/insight_intent/insight_intent_context` | - |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:ability_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `ability_manager_client.h`, `launch_param.h`, `start_params_by_SCB.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability:ability_context_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/ability_runtime` | `ability_context.h` |
| `//foundation/ability/ability_runtime/js_environment/frameworks/js_environment:js_environment` | `//foundation/ability/ability_runtime/js_environment/interfaces/inner_api` | `js_environment.h`, `js_environment_impl.h` |
| `//foundation/ability/ability_runtime/ets_environment/frameworks/ets_environment:ets_environment` | `//foundation/ability/ability_runtime/ets_environment/interfaces/inner_api` | - |
| `//foundation/ability/ability_runtime/cj_environment/frameworks/cj_environment:cj_environment` | `//foundation/ability/ability_runtime/cj_environment/interfaces/inner_api` | `cj_environment.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/runtime:runtime` | `//foundation/ability/ability_runtime/interfaces/inner_api/runtime/include/` | `js_runtime.h`, `runtime.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/napi_base_context:napi_base_context` | `//foundation/ability/ability_runtime/interfaces/inner_api/napi_base_context/include` | `napi_base_context.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ani_base_context:ani_base_context` | `//foundation/ability/ability_runtime/interfaces/inner_api/ani_base_context/include` | `ani_base_context.h` |
| `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_common:napi_common` | `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_common` | `napi_common_configuration.h`, `napi_common_start_options.h`, `napi_common_util.h`, `napi_common_want.h` |
| `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_common:ani_common` | `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_common/include` | `ani_common_ability_state_data.h`, `ani_common_child_process_param.h`, `ani_common_start_options.h`, `ani_common_want.h`, `ets_native_reference.h` |
| `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_observer:ani_observer` | `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_observer/include` | `ets_start_abilities_observer.h` |
| `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_ability_common:napi_ability_common` | `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_ability_common` | - |
| `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_wantagent_common:ani_wantagent_common` | `//foundation/ability/ability_runtime/frameworks/ets/ani/ani_wantagent_common` | `ani_common_want_agent.h` |
| `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_wantagent_common:napi_wantagent_common` | `//foundation/ability/ability_runtime/frameworks/js/napi/inner/napi_wantagent_common` | `napi_common_want_agent.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/app_manager:app_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/app_manager/include` | `appmgr/app_mgr_client.h`, `appmgr/page_state_data.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/connectionobs_manager:connection_obs_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/connectionobs_manager/include` | `connection_observer_client.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/foreground_app_obs_manager:foreground_app_obs_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/foreground_app_obs_manager/include` | `foreground_app_connection_client.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:service_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/` | `service_extension.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:extensionkit_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/` | `extension.h`, `extension_base.h`, `extension_module_loader.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:abilitykit_utils` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:abilitykit_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:data_ability_helper` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/` | - |
| `//foundation/ability/ability_runtime/frameworks/native/appkit:appkit_native` | `//foundation/ability/ability_runtime/interfaces/kits/native/appkit/app/` | - |
| `//foundation/ability/ability_runtime/frameworks/native/appkit:appkit_child_entry` | `//foundation/ability/ability_runtime/interfaces/kits/native/appkit/app/` | `child_process_api.h` |
| `//foundation/ability/ability_runtime/frameworks/js/napi/dialog_request_info:dialog_request_info` | `//foundation/ability/ability_runtime/frameworks/js/napi/dialog_request_info/include` | `request_info.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:ability_connect_callback_stub` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `ability_connect_callback_stub.h` |
| `//foundation/ability/ability_runtime/frameworks/native/appkit:app_context` | `//foundation/ability/ability_runtime/interfaces/kits/native/appkit/ability_runtime/context` | `application_context.h` |
| `//foundation/ability/ability_runtime/frameworks/native/appkit:application_image_observer_manager` | `//foundation/ability/ability_runtime/interfaces/kits/native/appkit/app` | `app_image_observer_manager.h` |
| `//foundation/ability/ability_runtime/frameworks/native/child_process:child_process` | `//foundation/ability/ability_runtime/interfaces/kits/c/ability/ability_runtime/child_process` | `native_child_process.h` |
| `//foundation/ability/ability_runtime/frameworks/c/ability_runtime:ability_runtime` | `//foundation/ability/ability_runtime/interfaces/kits/c/ability_runtime` | `ability_runtime_common.h`, `application_context.h`, `context_constant.h`, `start_options.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/uri_permission:uri_permission_mgr` | `//foundation/ability/ability_runtime/interfaces/inner_api/uri_permission/include/` | - |
| `//foundation/ability/ability_runtime/interfaces/inner_api/quick_fix:quickfix_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/quick_fix/include/` | `quick_fix_manager_client.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/dataobs_manager:dataobs_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/dataobs_manager/` | - |
| `//foundation/ability/ability_runtime/agent_runtime_framework/interfaces/inner_api:agent_manager` | `//foundation/ability/ability_runtime/agent_runtime_framework/interfaces/inner_api/include/` | `agent_manager_client.h` |
| `//foundation/ability/ability_runtime/service_router_framework/interfaces/inner_api:srms_fwk` | `//foundation/ability/ability_runtime/service_router_framework/interfaces/inner_api/include` | `service_info.h` |
| `//foundation/ability/ability_runtime/frameworks/simulator/ability_simulator:ability_simulator` | `//foundation/ability/ability_runtime/frameworks/simulator` | - |
| `//foundation/ability/ability_runtime/tools/aa:tools_aa_source_set` | `//foundation/ability/ability_runtime/tools/aa/include` | `shell_command.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:ability_start_setting` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `ability_start_setting.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:process_options` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `process_options.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:mission_info` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `mission_info.h`, `mission_snapshot.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:ui_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/ui_extension_base` | `ui_extension_context.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:ui_extension_ani` | `//foundation/ability/ability_runtime/frameworks/ets/ani/ui_extension_ability/include` | `ets_ui_extension_context.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:ui_extension_ani` | `//foundation/ability/ability_runtime/frameworks/ets/ani/ui_extension_base/include/` | `ets_ui_extension_base.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:auto_fill_extension` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/auto_fill_extension_ability` | `auto_fill_extension_context.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/extension_manager:extension_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/extension_manager/include` | `extension_manager_client.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/mission_manager:mission_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/mission_manager/include` | `mission_manager_client.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/session_handler:session_handler` | `//foundation/ability/ability_runtime/interfaces/inner_api/session_handler/include` | - |
| `//foundation/ability/ability_runtime/interfaces/inner_api/auto_fill_manager:auto_fill_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/auto_fill_manager/include` | `auto_fill_error.h`, `auto_fill_manager.h`, `fill_request_callback_interface.h`, `save_request_callback_interface.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:ability_start_options` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `start_options.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:dialog_request_callback` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/dialog_request_callback` | - |
| `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager:start_window_option` | `//foundation/ability/ability_runtime/interfaces/inner_api/ability_manager/include` | `start_window_option.h` |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi:cj_ability_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/application_context/include` | `cj_ability_lifecycle_callback.h`, `cj_application_context.h`, `cj_utils_ffi.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/app_manager:app_state_data` | `//foundation/ability/ability_runtime/interfaces/inner_api/app_manager/include` | `appmgr/app_state_data.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/connect_server_manager:connect_server_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/connect_server_manager/include` | `connect_server_manager.h` |
| `//foundation/ability/ability_runtime/interfaces/inner_api/page_config_manager:page_config_manager` | `//foundation/ability/ability_runtime/interfaces/inner_api/page_config_manager/include` | `page_config_manager.h` |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/app_manager:cj_app_manager_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/app_manager` | - |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/errormanager:cj_errormanager_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/errormanager` | - |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/recovery:cj_app_recovery_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/app/recovery` | - |
| `//foundation/ability/ability_runtime/frameworks/cj/ffi/ark_interop_helper:ark_interop_helper_ffi` | `//foundation/ability/ability_runtime/frameworks/cj/ffi/ark_interop_helper` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:uiabilitykit_native` | `//foundation/ability/ability_runtime/frameworks/native/ability/native` | - |
| `//foundation/ability/ability_runtime/frameworks/native/appkit:appkit_delegator` | `//foundation/ability/ability_runtime/frameworks/native/appkit` | - |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native:ability_business_error` | `//foundation/ability/ability_runtime/interfaces/kits/native/ability/native/ability_business_error` | `ability_business_error.h` |
| `//foundation/ability/ability_runtime/frameworks/ets/ani/featureAbility:featureability_ani` | `//foundation/ability/ability_runtime/frameworks/ets/ani/featureAbility/include` | `ani_data_ability_helper.h` |
| `//foundation/ability/ability_runtime/frameworks/native/ability/native/ability_runtime/madvise:ability_madvise` | `//foundation/ability/ability_runtime/frameworks/native/ability/native/ability_runtime/madvise` | `madvise_utils.h`, `vma_utils.h` |
| `//foundation/ability/ability_runtime/agent_runtime_framework/interfaces/kits/native/agent_extension/connection:agent_extension_connection` | `//foundation/ability/ability_runtime/agent_runtime_framework/interfaces/kits/native/agent_extension/connection/include/` | `agent_connector_proxy.h`, `agent_connector_stub.h`, `agent_extension_connection_constants.h`, `agent_receiver_proxy.h`, `agent_receiver_stub.h`, `iagent_connector.h`, `iagent_receiver.h` |
| `//foundation/ability/ability_runtime/cli_tool_framework/interfaces/cli_tool:cli_tool_client` | `//foundation/ability/ability_runtime/cli_tool_framework/interfaces/cli_tool/include` | `cli_tool_mgr_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `ability` | [aimgr](../../processes/aimgr/foundation-runtime.md) | 启动配置, SA 实现 | `186` | `libclimgr.z.so` |
| `ability` | [quick_fix](../../processes/quick_fix/foundation-runtime.md) | 启动配置, SA 实现 | `184` | `libquickfixms.z.so` |
| `ability` | [service_router](../../processes/service_router/foundation-runtime.md) | 启动配置, SA 实现 | `404` | `libsrms.z.so` |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `180`, `182`, `183`, `185`, `501` | `libabilityms.z.so`, `libdataobsms.z.so`, `libupms.z.so`, `libagentmgr.z.so`, `libappms.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/ability/ability_runtime/service_router_framework/services/srms/sa_profile:srms_sa_profile` | [foundation/ability/ability_runtime/service_router_framework/services/srms/sa_profile/BUILD.gn](../../../../../../foundation/ability/ability_runtime/service_router_framework/services/srms/sa_profile/BUILD.gn) |
| `ohos_app_scope` | `//foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog:ams_system_dialog_app_profile` | [foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog/BUILD.gn](../../../../../../foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog/BUILD.gn) |
| `ohos_app` | `//foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog:ams_system_dialog_hap` | [foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog/BUILD.gn](../../../../../../foundation/ability/ability_runtime/services/dialog_ui/ams_system_dialog/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/ability/ability_runtime/services/sa_profile:ams_sa_profile` | [foundation/ability/ability_runtime/services/sa_profile/BUILD.gn](../../../../../../foundation/ability/ability_runtime/services/sa_profile/BUILD.gn) |
| `ohos_executable` | `//foundation/ability/ability_runtime/tools/aa:aa` | [foundation/ability/ability_runtime/tools/aa/BUILD.gn](../../../../../../foundation/ability/ability_runtime/tools/aa/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/ability/ability_runtime/tools/cc:ohos-claw-cc` | [foundation/ability/ability_runtime/tools/cc/BUILD.gn](../../../../../../foundation/ability/ability_runtime/tools/cc/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/ability/ability_runtime/tools/ohos-aa:ohos-aa` | [foundation/ability/ability_runtime/tools/ohos-aa/BUILD.gn](../../../../../../foundation/ability/ability_runtime/tools/ohos-aa/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/ability/ability_runtime/tools/ohos-arktsScript:ohos-arkTSScript` | [foundation/ability/ability_runtime/tools/ohos-arktsScript/BUILD.gn](../../../../../../foundation/ability/ability_runtime/tools/ohos-arktsScript/BUILD.gn) |

生产库形态：`ohos_shared_library` 317 个，`ohos_static_library` 12 个，`ohos_source_set` 7 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 75 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `accessibility`, `access_token`, `ace_engine`, `api_metrics`, `app_domain_verify`, `app_file_service`, `appspawn`, `background_task_mgr`, `bounds_checking_function`, `bundle_framework`, `common_event_service`, `config_policy`, `c_utils`, `cJSON`, `data_share`, `dlp_permission_service`, `dsoftbus`, `eventhandler`, `ets_frontend`, `ets_runtime`, `ets_utils`, `faultloggerd`, `ffrt`, `form_fwk`, `graphic_2d`, `hiappevent`, `hichecker`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `hiview`, `i18n`, `icu`, `idl_tool`, `image_framework`, `init`, `input`, `ipc`, `json`, `kv_store`, `libjpeg-turbo`, `libuv`, `libxml2`, `media_library`, `memmgr`, `memory_utils`, `napi`, `netmanager_base`, `node`, `os_account`, `power_manager`, `preferences`, `previewer`, `qos_manager`, `relational_store`, `resource_management`, `resource_schedule_service`, `runtime_core`, `safwk`, `samgr`, `sandbox_manager`, `screenlock_mgr`, `selinux_adapter`, `storage_service`, `toolchain`, `udmf`, `webview`, `window_manager`, `zlib`, `hiperf`, `hiprofiler`, `taihe_ffi_gen`, `node`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 2771 个测试目标，bundle 声明 12 个测试入口。

主要测试形态：`group` 1292 个，`ohos_unittest` 796 个，`ohos_fuzztest` 579 个，`ohos_moduletest` 57 个，`ohos_app` 7 个，`ohos_shared_library` 6 个，`ohos_source_set` 6 个，`copy` 6 个，`gen_js_obj` 4 个，`ohos_copy` 3 个，`ohos_systemtest` 3 个，`es2abc_gen_abc` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/ability_runtime/bundle.json](../../../../../../foundation/ability/ability_runtime/bundle.json)
- 原始源码 README：[foundation/ability/ability_runtime/README_zh.md](../../../../../../foundation/ability/ability_runtime/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
