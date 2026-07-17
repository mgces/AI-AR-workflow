# netstack：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `netstack` |
| Git 子仓 | `foundation/communication/netstack` |
| bundle | [foundation/communication/netstack/bundle.json](../../../../../../foundation/communication/netstack/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 29 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 10 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `bounds_checking_function`, `curl`, `ffrt`, `hilog`, `hitrace`, `hisysevent`, `ipc`, `zlib`, `cJSON`, `c_utils`, `init`, `napi`, `netmanager_base`, `ylong_http`, `openssl`, `hiprofiler`, `time_service`, `ability_runtime`, `samgr`, `libwebsockets`, `node`, `jsoncpp`, `access_token`, `hiappevent`, `bundle_framework`, `safwk`, `runtime_core`, `rust_cxx`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/communication/netstack/test:netstack_test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 41 |
| test | 41 |
| build-support | 13 |
| aggregate-codegen | 5 |
| total | 100 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_rust_shared_library` | `//foundation/communication/netstack/frameworks/ets/ani/http:http_ani` | [foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn) | 18 |
| aggregate-codegen | `generate_static_abc` | `//foundation/communication/netstack/frameworks/ets/ani/http:http` | [foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn) | 48 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/netstack/frameworks/ets/ani/http:http_etc` | [foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/http/BUILD.gn) | 55 |
| production | `rust_cxx` | `//foundation/communication/netstack/frameworks/ets/ani/web_socket:websocket_ani_cxx` | [foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn) | 18 |
| production | `ohos_static_library` | `//foundation/communication/netstack/frameworks/ets/ani/web_socket:websocket_ani_static` | [foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn) | 22 |
| production | `ohos_rust_shared_library` | `//foundation/communication/netstack/frameworks/ets/ani/web_socket:websocket_ani` | [foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn) | 60 |
| aggregate-codegen | `generate_static_abc` | `//foundation/communication/netstack/frameworks/ets/ani/web_socket:websocket` | [foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn) | 90 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/netstack/frameworks/ets/ani/web_socket:websocket_etc` | [foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/web_socket/BUILD.gn) | 97 |
| aggregate-codegen | `group` | `//foundation/communication/netstack/frameworks/ets/ani:ani_package` | [foundation/communication/netstack/frameworks/ets/ani/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/BUILD.gn) | 16 |
| production | `ohos_rust_static_library` | `//foundation/communication/netstack/frameworks/ets/ani/common:netstack_common` | [foundation/communication/netstack/frameworks/ets/ani/common/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/common/BUILD.gn) | 16 |
| production | `rust_cxx` | `//foundation/communication/netstack/frameworks/ets/ani/net_ssl:network_security_ani_cxx` | [foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn) | 18 |
| production | `ohos_static_library` | `//foundation/communication/netstack/frameworks/ets/ani/net_ssl:network_security_ani_static` | [foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn) | 22 |
| production | `ohos_rust_shared_library` | `//foundation/communication/netstack/frameworks/ets/ani/net_ssl:network_security_ani` | [foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn) | 57 |
| aggregate-codegen | `generate_static_abc` | `//foundation/communication/netstack/frameworks/ets/ani/net_ssl:network_security` | [foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn) | 85 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/netstack/frameworks/ets/ani/net_ssl:network_security_etc` | [foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/ets/ani/net_ssl/BUILD.gn) | 92 |
| build-support | `config` | `//foundation/communication/netstack/frameworks/cj/http:http_ffi_config` | [foundation/communication/netstack/frameworks/cj/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/cj/http/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/cj/http:cj_net_http_ffi` | [foundation/communication/netstack/frameworks/cj/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/cj/http/BUILD.gn) | 64 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/cj/websocket:cj_net_websocket_ffi` | [foundation/communication/netstack/frameworks/cj/websocket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/cj/websocket/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/cj/network_security:cj_net_network_security_ffi` | [foundation/communication/netstack/frameworks/cj/network_security/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/cj/network_security/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/cj/socket:cj_net_socket_ffi` | [foundation/communication/netstack/frameworks/cj/socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/cj/socket/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/communication/netstack/frameworks/js/napi/http:http_config` | [foundation/communication/netstack/frameworks/js/napi/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/http/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/js/napi/http:http` | [foundation/communication/netstack/frameworks/js/napi/http/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/http/BUILD.gn) | 78 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/js/napi/websocket:websocket` | [foundation/communication/netstack/frameworks/js/napi/websocket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/websocket/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/js/napi/fetch:fetch` | [foundation/communication/netstack/frameworks/js/napi/fetch/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/fetch/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/js/napi/socket:socket` | [foundation/communication/netstack/frameworks/js/napi/socket/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/socket/BUILD.gn) | 62 |
| build-support | `config` | `//foundation/communication/netstack/frameworks/js/napi/net_ssl:networksecurity_napi_config` | [foundation/communication/netstack/frameworks/js/napi/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/net_ssl/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/frameworks/js/napi/net_ssl:networksecurity_napi` | [foundation/communication/netstack/frameworks/js/napi/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/napi/net_ssl/BUILD.gn) | 41 |
| build-support | `config` | `//foundation/communication/netstack/frameworks/js/builtin:http_lite_config` | [foundation/communication/netstack/frameworks/js/builtin/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/builtin/BUILD.gn) | 45 |
| production | `lite_library` | `//foundation/communication/netstack/frameworks/js/builtin:http_lite_shared` | [foundation/communication/netstack/frameworks/js/builtin/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/builtin/BUILD.gn) | 50 |
| production | `ndk_lib` | `//foundation/communication/netstack/frameworks/js/builtin:http_lite_ndk` | [foundation/communication/netstack/frameworks/js/builtin/BUILD.gn](../../../../../../foundation/communication/netstack/frameworks/js/builtin/BUILD.gn) | 62 |
| aggregate-codegen | `group` | `//foundation/communication/netstack/utils:common_utils` | [foundation/communication/netstack/utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/communication/netstack/utils:stack_utils_common_public_config` | [foundation/communication/netstack/utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/utils:stack_utils_common` | [foundation/communication/netstack/utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/BUILD.gn) | 37 |
| build-support | `config` | `//foundation/communication/netstack/utils/napi_utils:napi_utils_public_config` | [foundation/communication/netstack/utils/napi_utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/napi_utils/BUILD.gn) | 17 |
| production | `ohos_static_library` | `//foundation/communication/netstack/utils/napi_utils:napi_utils` | [foundation/communication/netstack/utils/napi_utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/napi_utils/BUILD.gn) | 27 |
| production | `ohos_static_library` | `//foundation/communication/netstack/utils/napi_utils:napi_utils_static` | [foundation/communication/netstack/utils/napi_utils/BUILD.gn](../../../../../../foundation/communication/netstack/utils/napi_utils/BUILD.gn) | 80 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/kits/c/net_http:net_http_ndk` | [foundation/communication/netstack/interfaces/kits/c/net_http/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/kits/c/net_http/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/kits/c/http_interceptor:http_interceptor_ndk` | [foundation/communication/netstack/interfaces/kits/c/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/kits/c/http_interceptor/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/kits/c/net_websocket:net_websocket` | [foundation/communication/netstack/interfaces/kits/c/net_websocket/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/kits/c/net_websocket/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/kits/c/net_ssl:net_ssl_ndk` | [foundation/communication/netstack/interfaces/kits/c/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/kits/c/net_ssl/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/communication/netstack/interfaces/innerkits/http_client:http_client_config` | [foundation/communication/netstack/interfaces/innerkits/http_client/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/http_client/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/http_client:http_client` | [foundation/communication/netstack/interfaces/innerkits/http_client/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/http_client/BUILD.gn) | 76 |
| build-support | `config` | `//foundation/communication/netstack/interfaces/innerkits/websocket_native:websocket_native_config` | [foundation/communication/netstack/interfaces/innerkits/websocket_native/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/websocket_native/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/websocket_native:websocket_native` | [foundation/communication/netstack/interfaces/innerkits/websocket_native/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/websocket_native/BUILD.gn) | 43 |
| production | `rust_cxx` | `//foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs:netstack_rs_cxx_gen` | [foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn) | 18 |
| production | `ohos_static_library` | `//foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs:netstack_rs_cxx` | [foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn) | 22 |
| production | `ohos_rust_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs:netstack_rs` | [foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs/BUILD.gn) | 59 |
| production | `rust_cxx` | `//foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs:ffrt_rs_cxx_gen` | [foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn) | 17 |
| production | `ohos_static_library` | `//foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs:ffrt_rs_cxx` | [foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn) | 21 |
| production | `ohos_rust_static_library` | `//foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs:ffrt_rs` | [foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/ffrt_rs/BUILD.gn) | 51 |
| production | `ohos_rust_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/rust/ylong_http_client:ylong_http_client` | [foundation/communication/netstack/interfaces/innerkits/rust/ylong_http_client/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/rust/ylong_http_client/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/communication/netstack/interfaces/innerkits/http_interceptor:http_interceptor_common_config` | [foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/http_interceptor:http_interceptor` | [foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn) | 81 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/http_interceptor:http_interceptor_http` | [foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/http_interceptor/BUILD.gn) | 101 |
| build-support | `config` | `//foundation/communication/netstack/interfaces/innerkits/net_ssl:net_ssl_config` | [foundation/communication/netstack/interfaces/innerkits/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/net_ssl/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/communication/netstack/interfaces/innerkits/net_ssl:net_ssl` | [foundation/communication/netstack/interfaces/innerkits/net_ssl/BUILD.gn](../../../../../../foundation/communication/netstack/interfaces/innerkits/net_ssl/BUILD.gn) | 41 |
| test | `group` | `//foundation/communication/netstack/test:netstack_test` | [foundation/communication/netstack/test/BUILD.gn](../../../../../../foundation/communication/netstack/test/BUILD.gn) | 14 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/netssl:netssl_unittest` | [foundation/communication/netstack/test/unittest/netssl/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/netssl/BUILD.gn) | 32 |
| test | `group` | `//foundation/communication/netstack/test/unittest/netssl:unittest` | [foundation/communication/netstack/test/unittest/netssl/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/netssl/BUILD.gn) | 78 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/http_client:http_client_unittest` | [foundation/communication/netstack/test/unittest/http_client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http_client/BUILD.gn) | 29 |
| test | `group` | `//foundation/communication/netstack/test/unittest/http_client:unittest` | [foundation/communication/netstack/test/unittest/http_client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http_client/BUILD.gn) | 96 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/http:http_unittest` | [foundation/communication/netstack/test/unittest/http/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http/BUILD.gn) | 35 |
| test | `group` | `//foundation/communication/netstack/test/unittest/http:unittest` | [foundation/communication/netstack/test/unittest/http/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http/BUILD.gn) | 158 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/http/cache:http_cache_unittest` | [foundation/communication/netstack/test/unittest/http/cache/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http/cache/BUILD.gn) | 31 |
| test | `group` | `//foundation/communication/netstack/test/unittest/http/cache:unittest` | [foundation/communication/netstack/test/unittest/http/cache/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http/cache/BUILD.gn) | 75 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/net_http:nethttp_unittest` | [foundation/communication/netstack/test/unittest/net_http/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/net_http/BUILD.gn) | 28 |
| test | `group` | `//foundation/communication/netstack/test/unittest/net_http:unittest` | [foundation/communication/netstack/test/unittest/net_http/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/net_http/BUILD.gn) | 66 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/websocket:websocket_unittest` | [foundation/communication/netstack/test/unittest/websocket/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket/BUILD.gn) | 31 |
| test | `group` | `//foundation/communication/netstack/test/unittest/websocket:unittest` | [foundation/communication/netstack/test/unittest/websocket/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket/BUILD.gn) | 97 |
| build-support | `config` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_test_config` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 101 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_socket_unilateral_connection` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 119 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:secure_data_unittest` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 171 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_key_test` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 198 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_cert_test` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 246 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_configuration_test` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 294 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_context_test` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 342 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:socket_error_unittest` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 390 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/client:tls_socket_branch_test` | [foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/client/BUILD.gn) | 438 |
| build-support | `config` | `//foundation/communication/netstack/test/unittest/tlssocket/core:tls_test_config` | [foundation/communication/netstack/test/unittest/tlssocket/core/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/core/BUILD.gn) | 99 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/core:tls_socket_core_test` | [foundation/communication/netstack/test/unittest/tlssocket/core/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/core/BUILD.gn) | 119 |
| test | `group` | `//foundation/communication/netstack/test/unittest/tlssocket:unittest` | [foundation/communication/netstack/test/unittest/tlssocket/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/communication/netstack/test/unittest/tlssocket/server:tls_test_config` | [foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn) | 98 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/server:two_way_tls_socket_server_unittest` | [foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn) | 118 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/tlssocket/server:tls_socket_server_mock_branch_test` | [foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/tlssocket/server/BUILD.gn) | 169 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/utils/profiler_utils:netstack_network_profiler_utils_test` | [foundation/communication/netstack/test/unittest/utils/profiler_utils/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/profiler_utils/BUILD.gn) | 30 |
| test | `group` | `//foundation/communication/netstack/test/unittest/utils/profiler_utils:unittest` | [foundation/communication/netstack/test/unittest/utils/profiler_utils/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/profiler_utils/BUILD.gn) | 86 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/utils/netstack_chr_client:netstack_common_utils_test` | [foundation/communication/netstack/test/unittest/utils/netstack_chr_client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/netstack_chr_client/BUILD.gn) | 27 |
| test | `group` | `//foundation/communication/netstack/test/unittest/utils/netstack_chr_client:unittest` | [foundation/communication/netstack/test/unittest/utils/netstack_chr_client/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/netstack_chr_client/BUILD.gn) | 63 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/utils/http_handover_handler:http_handover_handler_test` | [foundation/communication/netstack/test/unittest/utils/http_handover_handler/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/http_handover_handler/BUILD.gn) | 28 |
| test | `group` | `//foundation/communication/netstack/test/unittest/utils/http_handover_handler:unittest` | [foundation/communication/netstack/test/unittest/utils/http_handover_handler/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/http_handover_handler/BUILD.gn) | 122 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/utils/common_utils:netstack_common_utils_test` | [foundation/communication/netstack/test/unittest/utils/common_utils/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/common_utils/BUILD.gn) | 29 |
| test | `group` | `//foundation/communication/netstack/test/unittest/utils/common_utils:unittest` | [foundation/communication/netstack/test/unittest/utils/common_utils/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/utils/common_utils/BUILD.gn) | 60 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/socket:socket_unittest` | [foundation/communication/netstack/test/unittest/socket/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/socket/BUILD.gn) | 33 |
| test | `group` | `//foundation/communication/netstack/test/unittest/socket:unittest` | [foundation/communication/netstack/test/unittest/socket/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/socket/BUILD.gn) | 170 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/websocket_inner_unittest:websocket_inner_unittest` | [foundation/communication/netstack/test/unittest/websocket_inner_unittest/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket_inner_unittest/BUILD.gn) | 33 |
| test | `group` | `//foundation/communication/netstack/test/unittest/websocket_inner_unittest:unittest` | [foundation/communication/netstack/test/unittest/websocket_inner_unittest/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket_inner_unittest/BUILD.gn) | 55 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/http_interceptor:http_interceptor_unittest` | [foundation/communication/netstack/test/unittest/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http_interceptor/BUILD.gn) | 31 |
| test | `group` | `//foundation/communication/netstack/test/unittest/http_interceptor:unittest` | [foundation/communication/netstack/test/unittest/http_interceptor/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/http_interceptor/BUILD.gn) | 63 |
| test | `ohos_unittest` | `//foundation/communication/netstack/test/unittest/websocket_capi_unittest:websocket_capi_unittest` | [foundation/communication/netstack/test/unittest/websocket_capi_unittest/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket_capi_unittest/BUILD.gn) | 30 |
| test | `group` | `//foundation/communication/netstack/test/unittest/websocket_capi_unittest:unittest` | [foundation/communication/netstack/test/unittest/websocket_capi_unittest/BUILD.gn](../../../../../../foundation/communication/netstack/test/unittest/websocket_capi_unittest/BUILD.gn) | 49 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "netstack"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
