# disk_manager：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `filemanagement` |
| component | `disk_manager` |
| Git 子仓 | `foundation/filemanagement/disk_manager` |
| bundle | [foundation/filemanagement/disk_manager/bundle.json](../../../../../../foundation/filemanagement/disk_manager/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 22 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `bounds_checking_function`, `common_event_service`, `c_utils`, `dfs_service`, `file_api`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `json`, `libuv`, `napi`, `node`, `runtime_core`, `safwk`, `samgr`, `security_guard`, `taihe_ffi_gen`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/filemanagement/disk_manager:test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 12 |
| test | 27 |
| build-support | 7 |
| aggregate-codegen | 5 |
| total | 51 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/filemanagement/disk_manager:disk_manager_all` | [foundation/filemanagement/disk_manager/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/BUILD.gn) | 16 |
| test | `group` | `//foundation/filemanagement/disk_manager:test` | [foundation/filemanagement/disk_manager/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/BUILD.gn) | 27 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/common:disk_manager_common_include` | [foundation/filemanagement/disk_manager/common/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/common/BUILD.gn) | 17 |
| production | `ohos_sa_profile` | `//foundation/filemanagement/disk_manager/sa_profile:disk_manager_sa_profile` | [foundation/filemanagement/disk_manager/sa_profile/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/sa_profile/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/disk_manager/sa_profile:disk_manager_cfg` | [foundation/filemanagement/disk_manager/sa_profile/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/sa_profile/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/utils:disk_manager_utils_include` | [foundation/filemanagement/disk_manager/utils/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/utils/BUILD.gn) | 17 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:copy_taihe` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 23 |
| production | `ohos_taihe` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:run_taihe` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 27 |
| production | `taihe_shared_library` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:volume_manager_taihe` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 36 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:volume_manager_taihe_abc` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 105 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:volume_manager_etc` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 113 |
| aggregate-codegen | `group` | `//foundation/filemanagement/disk_manager/interfaces/kits/taihe:disk_manager_volume_manager_taihe` | [foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/taihe/BUILD.gn) | 121 |
| production | `ohos_shared_library` | `//foundation/filemanagement/disk_manager/interfaces/kits/js:volumemanager` | [foundation/filemanagement/disk_manager/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/js/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/filemanagement/disk_manager/interfaces/kits/js:disk_manager_js` | [foundation/filemanagement/disk_manager/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/kits/js/BUILD.gn) | 90 |
| production | `idl_gen_interface` | `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_interface_native` | [foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_idl_public_config` | [foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn) | 24 |
| production | `ohos_source_set` | `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_ipc_native` | [foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn) | 31 |
| production | `ohos_source_set` | `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_header` | [foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn) | 52 |
| production | `ohos_shared_library` | `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_innerkits` | [foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/interfaces/innerkits/BUILD.gn) | 70 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/disk_manager/etc:disk_manager_disk_config` | [foundation/filemanagement/disk_manager/etc/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/etc/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/services/disk_manager:disk_manager_config` | [foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/filemanagement/disk_manager/services/disk_manager:disk_manager_server` | [foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn) | 35 |
| test | `group` | `//foundation/filemanagement/disk_manager/test/fuzztest:disk_manager_fuzztest` | [foundation/filemanagement/disk_manager/test/fuzztest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/fuzztest/BUILD.gn) | 16 |
| test | `ohos_fuzztest` | `//foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer:DiskmanagerStubFuzzTest` | [foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer:diskmanagerstub_fuzztest` | [foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/fuzztest/diskmanagerstub_fuzzer/BUILD.gn) | 83 |
| test | `group` | `//foundation/filemanagement/disk_manager/test:disk_manager_ut` | [foundation/filemanagement/disk_manager/test/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/BUILD.gn) | 17 |
| test | `group` | `//foundation/filemanagement/disk_manager/test:disk_manager_fuzz` | [foundation/filemanagement/disk_manager/test/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/BUILD.gn) | 23 |
| test | `group` | `//foundation/filemanagement/disk_manager/test:disk_manager_mock` | [foundation/filemanagement/disk_manager/test/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/BUILD.gn) | 29 |
| test | `group` | `//foundation/filemanagement/disk_manager/test:test` | [foundation/filemanagement/disk_manager/test/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/BUILD.gn) | 35 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/test/mock:disk_manager_mock_include` | [foundation/filemanagement/disk_manager/test/mock/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/mock/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/test/mock:uevent_bootstrap_mock_include` | [foundation/filemanagement/disk_manager/test/mock/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/mock/BUILD.gn) | 22 |
| test | `group` | `//foundation/filemanagement/disk_manager/test/mock:disk_manager_mock` | [foundation/filemanagement/disk_manager/test/mock/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/mock/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_unittest_common` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_common_event_publisher_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 33 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:storage_daemon_proxy_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 78 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_client_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 106 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:uevent_env_parser_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 140 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_server_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 161 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 220 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:volume_core_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 242 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:volume_external_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 264 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:partition_types_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 287 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:storage_daemon_adapter_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 309 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:usb_fuse_adapter_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 343 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:voldata_uuid_store_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 377 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_config_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 403 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:partition_table_parser_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 424 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_provider_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 453 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:block_info_table_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 514 |
| test | `ohos_unittest` | `//foundation/filemanagement/disk_manager/test/unittest:uevent_bootstrap_test` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 551 |
| test | `group` | `//foundation/filemanagement/disk_manager/test/unittest:disk_manager_ut` | [foundation/filemanagement/disk_manager/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/test/unittest/BUILD.gn) | 604 |

## 查询命令

```bash
awk -F '\t' '$1 == "filemanagement" && $2 == "disk_manager"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
