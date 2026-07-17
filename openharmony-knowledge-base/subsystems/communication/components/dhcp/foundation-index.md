# dhcp：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `dhcp` |
| Git 子仓 | `foundation/communication/dhcp` |
| bundle | [foundation/communication/dhcp/bundle.json](../../../../../../foundation/communication/dhcp/bundle.json) |
| rk3568 selected | yes |
| adapted systems | small,standard |
| component dependencies | 14 |
| third-party dependencies | 1 |
| declared sub_component | 0 |
| inner kits | 0 |
| declared test entries | 2 |

## 依赖

组件依赖：`ability_runtime`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `hilog`, `init`, `ipc`, `netmanager_base`, `safwk`, `access_token`, `samgr`, `ffrt`, `time_service`, `wifi`

三方依赖：`openssl`

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/communication/dhcp/test/unittest:dhcp_unittest`
- `//foundation/communication/dhcp/test/fuzztest:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 15 |
| test | 27 |
| build-support | 8 |
| aggregate-codegen | 0 |
| total | 50 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/communication/dhcp:dhcp` | [foundation/communication/dhcp/BUILD.gn](../../../../../../foundation/communication/dhcp/BUILD.gn) | 18 |
| production | `shared_library` | `//foundation/communication/dhcp/frameworks/native:dhcp_sdk` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 35 |
| build-support | `config` | `//foundation/communication/dhcp/frameworks/native:dhcp_sdk_header` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 77 |
| build-support | `config` | `//foundation/communication/dhcp/frameworks/native:dhcp_sdk_config` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 81 |
| production | `ohos_source_set` | `//foundation/communication/dhcp/frameworks/native:dhcp_client_proxy_impl` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 92 |
| production | `ohos_source_set` | `//foundation/communication/dhcp/frameworks/native:dhcp_server_proxy_impl` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 122 |
| production | `ohos_shared_library` | `//foundation/communication/dhcp/frameworks/native:dhcp_sdk` | [foundation/communication/dhcp/frameworks/native/BUILD.gn](../../../../../../foundation/communication/dhcp/frameworks/native/BUILD.gn) | 152 |
| production | `shared_library` | `//foundation/communication/dhcp/services/dhcp_client:dhcp_client` | [foundation/communication/dhcp/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_client/BUILD.gn) | 42 |
| build-support | `config` | `//foundation/communication/dhcp/services/dhcp_client:dhcp_manager_service_header` | [foundation/communication/dhcp/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_client/BUILD.gn) | 120 |
| production | `ohos_shared_library` | `//foundation/communication/dhcp/services/dhcp_client:dhcp_client` | [foundation/communication/dhcp/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_client/BUILD.gn) | 124 |
| production | `ohos_static_library` | `//foundation/communication/dhcp/services/dhcp_client:dhcp_client_static` | [foundation/communication/dhcp/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_client/BUILD.gn) | 191 |
| production | `ohos_shared_library` | `//foundation/communication/dhcp/services/dhcp_client:dhcp_updater_client` | [foundation/communication/dhcp/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_client/BUILD.gn) | 256 |
| production | `ohos_sa_profile` | `//foundation/communication/dhcp/services/sa_profile:wifi_standard_sa_profile` | [foundation/communication/dhcp/services/sa_profile/BUILD.gn](../../../../../../foundation/communication/dhcp/services/sa_profile/BUILD.gn) | 16 |
| production | `shared_library` | `//foundation/communication/dhcp/services/utils:dhcp_utils` | [foundation/communication/dhcp/services/utils/BUILD.gn](../../../../../../foundation/communication/dhcp/services/utils/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/communication/dhcp/services/utils:dhcp_common_config` | [foundation/communication/dhcp/services/utils/BUILD.gn](../../../../../../foundation/communication/dhcp/services/utils/BUILD.gn) | 52 |
| production | `ohos_shared_library` | `//foundation/communication/dhcp/services/utils:dhcp_utils` | [foundation/communication/dhcp/services/utils/BUILD.gn](../../../../../../foundation/communication/dhcp/services/utils/BUILD.gn) | 56 |
| production | `shared_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) | 40 |
| build-support | `config` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_manager_service_header` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) | 107 |
| production | `ohos_shared_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) | 112 |
| production | `ohos_static_library` | `//foundation/communication/dhcp/services/dhcp_server:dhcp_server_static` | [foundation/communication/dhcp/services/dhcp_server/BUILD.gn](../../../../../../foundation/communication/dhcp/services/dhcp_server/BUILD.gn) | 153 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpfunction2_fuzzer:DhcpFunction2FuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpfunction2_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpfunction2_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/commonutil_fuzzer:CommonUtilFuzzTest` | [foundation/communication/dhcp/test/fuzztest/commonutil_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/commonutil_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpargument_fuzzer:DhcpArgumentFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpargument_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpargument_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/serverstub_fuzzer:ServerStubFuzzTest` | [foundation/communication/dhcp/test/fuzztest/serverstub_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/serverstub_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/addressutils_fuzzer:AddressUtilsFuzzTest` | [foundation/communication/dhcp/test/fuzztest/addressutils_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/addressutils_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcparpchecker_fuzzer:DhcpArpCheckerFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcparpchecker_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcparpchecker_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpcommonutils_fuzzer:DhcpCommonUtilsFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpcommonutils_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpcommonutils_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/dhcp/test/fuzztest:fuzztest` | [foundation/communication/dhcp/test/fuzztest/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/BUILD.gn) | 15 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpclient_fuzzer:DhcpClientFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpclient_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpclient_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/clientstub_fuzzer:ClientStubFuzzTest` | [foundation/communication/dhcp/test/fuzztest/clientstub_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/clientstub_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpdhcpd_fuzzer:DhcpDhcpdFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpdhcpd_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpdhcpd_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpservercbkstub_fuzzer:DhcpServerCbkStubFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpservercbkstub_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpservercbkstub_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpserver_fuzzer:DhcpServerFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpserver_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpserver_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpfunction_fuzzer:DhcpFunctionFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpfunction_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpfunction_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpserverimpl_fuzzer:DhcpServerImplFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpserverimpl_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpserverimpl_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpaddresspool_fuzzer:DhcpAddressPoolFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpaddresspool_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpaddresspool_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpclientfun_fuzzer:DhcpClientFunFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpclientfun_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpclientfun_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpbinding_fuzzer:DhcpBindingFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpbinding_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpbinding_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcp_event_fuzzer:DhcpEventFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcp_event_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcp_event_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/communication/dhcp/test/fuzztest/dhcpclientcbkstub_fuzzer:DhcpClientCbkStubFuzzTest` | [foundation/communication/dhcp/test/fuzztest/dhcpclientcbkstub_fuzzer/BUILD.gn](../../../../../../foundation/communication/dhcp/test/fuzztest/dhcpclientcbkstub_fuzzer/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/communication/dhcp/test/unittest/native:module_private_config` | [foundation/communication/dhcp/test/unittest/native/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/native/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/dhcp/test/unittest/native:dhcp_native_unittest` | [foundation/communication/dhcp/test/unittest/native/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/native/BUILD.gn) | 24 |
| test | `group` | `//foundation/communication/dhcp/test/unittest:dhcp_unittest` | [foundation/communication/dhcp/test/unittest/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/communication/dhcp/test/unittest/services/dhcp_client:module_private_config` | [foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/dhcp/test/unittest/services/dhcp_client:dhcp_client_unittest` | [foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn) | 24 |
| test | `group` | `//foundation/communication/dhcp/test/unittest/services/dhcp_client:unittest` | [foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_client/BUILD.gn) | 165 |
| test | `ohos_unittest` | `//foundation/communication/dhcp/test/unittest/services/utils:dhcp_util_unittest` | [foundation/communication/dhcp/test/unittest/services/utils/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/utils/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest:module_private_config` | [foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest:dhcp_server_unittest` | [foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn) | 24 |
| test | `group` | `//foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest:unittest` | [foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn](../../../../../../foundation/communication/dhcp/test/unittest/services/dhcp_server/unittest/BUILD.gn) | 137 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "dhcp"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
