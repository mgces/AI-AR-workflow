# cast_engine：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `castplus` |
| component | `cast_engine` |
| Git 子仓 | `foundation/CastEngine/castengine_cast_framework` |
| bundle | [foundation/CastEngine/castengine_cast_framework/bundle.json](../../../../../../foundation/CastEngine/castengine_cast_framework/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 41 |
| third-party dependencies | 2 |
| declared sub_component | 5 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog`, `hisysevent`, `hitrace`, `media_foundation`, `access_token`, `audio_framework`, `av_codec`, `ipc`, `init`, `input`, `safwk`, `samgr`, `c_utils`, `eventhandler`, `power_manager`, `dsoftbus`, `device_manager`, `common_event_service`, `bundle_framework`, `ability_base`, `ability_runtime`, `ace_engine`, `napi`, `graphic_2d`, `graphic_surface`, `window_manager`, `player_framework`, `image_framework`, `wifi`, `device_auth`, `device_info_manager`, `thermal_manager`, `screenlock_mgr`, `state_registry`, `core_service`, `call_manager`, `os_account`, `sharing_framework`, `jsoncpp`, `openssl`, `json`

三方依赖：`bounds_checking_function`, `musl`

## 声明构建入口

- `//foundation/CastEngine/castengine_cast_framework/service:cast_engine_service`
- `//foundation/CastEngine/castengine_cast_framework/interfaces/inner_api:cast_engine_client`
- `//foundation/CastEngine/castengine_cast_framework/sa_profile:cast_engine_sa_profile`
- `//foundation/CastEngine/castengine_cast_framework/etc/init:cast_engine_service.cfg`
- `//foundation/CastEngine/castengine_cast_framework/interfaces/kits/js:cast`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 14 |
| test | 0 |
| build-support | 13 |
| aggregate-codegen | 0 |
| total | 27 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/client:cast_client_config` | [foundation/CastEngine/castengine_cast_framework/client/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/client/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/client:cast_client_inner` | [foundation/CastEngine/castengine_cast_framework/client/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/client/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework:cast_engine_default_config` | [foundation/CastEngine/castengine_cast_framework/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/common:cast_engine_common_private_config` | [foundation/CastEngine/castengine_cast_framework/common/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/common/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/common:cast_engine_common_sources` | [foundation/CastEngine/castengine_cast_framework/common/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/common/BUILD.gn) | 20 |
| production | `ohos_sa_profile` | `//foundation/CastEngine/castengine_cast_framework/sa_profile:cast_engine_sa_profile` | [foundation/CastEngine/castengine_cast_framework/sa_profile/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/sa_profile/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/interfaces/kits/js:cast_config` | [foundation/CastEngine/castengine_cast_framework/interfaces/kits/js/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/interfaces/kits/js/BUILD.gn) | 15 |
| production | `ohos_shared_library` | `//foundation/CastEngine/castengine_cast_framework/interfaces/kits/js:cast` | [foundation/CastEngine/castengine_cast_framework/interfaces/kits/js/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/interfaces/kits/js/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/interfaces/inner_api:cast_interfaces_config` | [foundation/CastEngine/castengine_cast_framework/interfaces/inner_api/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/interfaces/inner_api/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/CastEngine/castengine_cast_framework/interfaces/inner_api:cast_engine_client` | [foundation/CastEngine/castengine_cast_framework/interfaces/inner_api/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/interfaces/inner_api/BUILD.gn) | 20 |
| production | `ohos_prebuilt_etc` | `//foundation/CastEngine/castengine_cast_framework/etc/init:cast_engine_service.cfg` | [foundation/CastEngine/castengine_cast_framework/etc/init/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/etc/init/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/device_manager:cast_discovery_config` | [foundation/CastEngine/castengine_cast_framework/service/src/device_manager/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/device_manager/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/device_manager:cast_discovery` | [foundation/CastEngine/castengine_cast_framework/service/src/device_manager/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/device_manager/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service:cast_service_config` | [foundation/CastEngine/castengine_cast_framework/service/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/CastEngine/castengine_cast_framework/service:cast_engine_service` | [foundation/CastEngine/castengine_cast_framework/service/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils:cast_session_utils_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils:cast_session_utils` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/utils/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream:cast_session_stream_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream:cast_session_stream` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/stream/BUILD.gn) | 28 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp:cast_session_rtsp_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp:cast_session_rtsp` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/rtsp/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel:cast_session_channel_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel:cast_session_channel` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/channel/BUILD.gn) | 29 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror:cast_session_mirror_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror:cast_session_mirror` | [foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/src/mirror/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/CastEngine/castengine_cast_framework/service/src/session:cast_session_config` | [foundation/CastEngine/castengine_cast_framework/service/src/session/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_framework/service/src/session:cast_session` | [foundation/CastEngine/castengine_cast_framework/service/src/session/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/src/session/BUILD.gn) | 22 |

## 查询命令

```bash
awk -F '\t' '$1 == "castplus" && $2 == "cast_engine"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
