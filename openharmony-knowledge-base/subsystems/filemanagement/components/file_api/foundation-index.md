# file_api：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `filemanagement` |
| component | `file_api` |
| Git 子仓 | `foundation/filemanagement/file_api` |
| bundle | [foundation/filemanagement/file_api/bundle.json](../../../../../../foundation/filemanagement/file_api/bundle.json) |
| rk3568 selected | yes |
| adapted systems | mini,small,standard |
| component dependencies | 27 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 14 |
| declared test entries | 2 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `api_metrics`, `app_file_service`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `common_event_service`, `data_share`, `dfs_service`, `eventhandler`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `liburing`, `libuv`, `napi`, `node`, `openssl`, `os_account`, `runtime_core`, `rust_libc`, `samgr`, `zlib`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/filemanagement/file_api/interfaces/test/unittest:file_api_unittest`
- `//foundation/filemanagement/file_api/interfaces/test/fuzztest:file_api_fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 47 |
| test | 25 |
| build-support | 14 |
| aggregate-codegen | 19 |
| total | 105 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/filemanagement/file_api/utils/filemgmt_libfs:libfs_public_config` | [foundation/filemanagement/file_api/utils/filemgmt_libfs/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libfs/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/utils/filemgmt_libfs:filemgmt_libfs` | [foundation/filemanagement/file_api/utils/filemgmt_libfs/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libfs/BUILD.gn) | 26 |
| build-support | `config` | `//foundation/filemanagement/file_api/utils/filemgmt_libhilog:log_public_config` | [foundation/filemanagement/file_api/utils/filemgmt_libhilog/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libhilog/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/utils/filemgmt_libhilog:filemgmt_libhilog` | [foundation/filemanagement/file_api/utils/filemgmt_libhilog/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libhilog/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/filemanagement/file_api/utils/filemgmt_libn:libn_public_config` | [foundation/filemanagement/file_api/utils/filemgmt_libn/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libn/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/utils/filemgmt_libn:filemgmt_libn` | [foundation/filemanagement/file_api/utils/filemgmt_libn/BUILD.gn](../../../../../../foundation/filemanagement/file_api/utils/filemgmt_libn/BUILD.gn) | 27 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/c/fileio:ohfileio` | [foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn) | 18 |
| production | `ohos_ndk_library` | `//foundation/filemanagement/file_api/interfaces/kits/c/fileio:libohfileio` | [foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn) | 54 |
| production | `ohos_ndk_headers` | `//foundation/filemanagement/file_api/interfaces/kits/c/fileio:oh_fileio_header` | [foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/fileio/BUILD.gn) | 61 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/c/compress:oharchive` | [foundation/filemanagement/file_api/interfaces/kits/c/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/compress/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/c/environment:ohenvironment` | [foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn) | 18 |
| production | `ohos_ndk_headers` | `//foundation/filemanagement/file_api/interfaces/kits/c/environment:oh_environment_header` | [foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn) | 53 |
| production | `ohos_ndk_library` | `//foundation/filemanagement/file_api/interfaces/kits/c/environment:libohenvironment` | [foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/c/environment/BUILD.gn) | 58 |
| aggregate-codegen | `action` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:build_streamhash_js` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 19 |
| production | `es2abc_gen_abc` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:gen_streamhash_abc` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 40 |
| aggregate-codegen | `gen_obj` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:streamhash_js` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 52 |
| aggregate-codegen | `gen_obj` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:streamhash_abc` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 63 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:optimize-size` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 76 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:streamhash` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 88 |
| production | `ohos_source_set` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:streamhash_static` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 106 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamhash:streamhash_packages` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamhash/BUILD.gn) | 132 |
| aggregate-codegen | `action` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:build_streamrw_js` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 19 |
| production | `es2abc_gen_abc` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:gen_streamrw_abc` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 40 |
| aggregate-codegen | `gen_obj` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:streamrw_js` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 52 |
| aggregate-codegen | `gen_obj` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:streamrw_abc` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 63 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:optimize-size` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 76 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:streamrw` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 88 |
| production | `ohos_source_set` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:streamrw_static` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 106 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/ts/streamrw:streamrw_packages` | [foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/ts/streamrw/BUILD.gn) | 132 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/native:remote_uri_config` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/native:task_signal_config` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 25 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/native:remote_uri_native` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/native:task_signal_native` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 71 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/native:environment_config` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 112 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/native:environment_native` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 117 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/native:fileio_config` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 155 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/native:fileio_native` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 160 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/native:build_kits_native` | [foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/native/BUILD.gn) | 198 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/hyperaio:group_hyperaio` | [foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/hyperaio:hyperaio_config` | [foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/hyperaio:HyperAio` | [foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/hyperaio/BUILD.gn) | 29 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/rust:public_config` | [foundation/filemanagement/file_api/interfaces/kits/rust/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/rust/BUILD.gn) | 16 |
| production | `ohos_rust_shared_ffi` | `//foundation/filemanagement/file_api/interfaces/kits/rust:rust_file` | [foundation/filemanagement/file_api/interfaces/kits/rust/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/rust/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/cj:js_common_config` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/filemanagement/file_api/interfaces/kits/cj:js_common_src` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 35 |
| production | `ohos_source_set` | `//foundation/filemanagement/file_api/interfaces/kits/cj:js_stream_exporter_src` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 71 |
| production | `ohos_source_set` | `//foundation/filemanagement/file_api/interfaces/kits/cj:js_trace_src` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 106 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/cj:cj_file_fs_ffi` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 143 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/cj:cj_statvfs_ffi` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 280 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/cj:fs_ffi_packages` | [foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/cj/BUILD.gn) | 341 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/js:kits_public_config` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 32 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:fileio` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 38 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:fs` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 142 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:hash` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 301 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:file` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 357 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:statfs` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 416 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:statvfs` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 465 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:environment` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 516 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:securitylabel` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 562 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:document` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 611 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/js:build_kits_js` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 660 |
| build-support | `config` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_config` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 674 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/filemanagement/file_api/interfaces/kits/js:copy_taihe` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 700 |
| production | `ohos_taihe` | `//foundation/filemanagement/file_api/interfaces/kits/js:run_taihe` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 704 |
| production | `taihe_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:file_fs_taihe` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 713 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_fs_abc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 927 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_fs_abc_etc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 935 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_file_hash` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 943 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_hash_abc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1003 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_hash_abc_etc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1010 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_file_securitylabel` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1018 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_securityLabel_abc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1070 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_securityLabel_abc_etc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1077 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_file_environment` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1085 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_environment_abc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1144 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_environment_abc_etc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1151 |
| production | `ohos_shared_library` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_file_statvfs` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1159 |
| aggregate-codegen | `generate_static_abc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_statvfs_abc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1223 |
| production | `ohos_prebuilt_etc` | `//foundation/filemanagement/file_api/interfaces/kits/js:ohos_file_statvfs_abc_etc` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1230 |
| aggregate-codegen | `group` | `//foundation/filemanagement/file_api/interfaces/kits/js:ani_file_api` | [foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/kits/js/BUILD.gn) | 1238 |
| test | `ohos_fuzztest` | `//foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer:HyperaioFuzzTest` | [foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer:fuzztest` | [foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/fuzztest/hyperaio_fuzzer/BUILD.gn) | 59 |
| test | `group` | `//foundation/filemanagement/file_api/interfaces/test/fuzztest:file_api_fuzztest` | [foundation/filemanagement/file_api/interfaces/test/fuzztest/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/fuzztest/BUILD.gn) | 15 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/napi_js:napi_file_fs_mock_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/napi_js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/napi_js/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/napi_js:napi_file_environment_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/napi_js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/napi_js/BUILD.gn) | 184 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/class_file:class_file_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/class_file/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/class_file/BUILD.gn) | 17 |
| test | `group` | `//foundation/filemanagement/file_api/interfaces/test/unittest:file_api_unittest` | [foundation/filemanagement/file_api/interfaces/test/unittest/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:streamwrite_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 35 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:zip_writer_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 43 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:zip_writer_open_source_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 51 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:archive_reader_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 59 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:archive_reader_open_source_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 67 |
| test | `group` | `//foundation/filemanagement/file_api/interfaces/test/unittest/compress:compress_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/compress/BUILD.gn) | 75 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/hyperaio:hyperaio_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/hyperaio/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/hyperaio/BUILD.gn) | 17 |
| test | `ohos_js_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/napi_test:file_api_js_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/napi_test/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/napi_test/BUILD.gn) | 17 |
| test | `group` | `//foundation/filemanagement/file_api/interfaces/test/unittest/napi_test:unittest` | [foundation/filemanagement/file_api/interfaces/test/unittest/napi_test/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/napi_test/BUILD.gn) | 23 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/filemgmt_libn_test:filemgmt_libn_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/filemgmt_libn_test/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/filemgmt_libn_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/remote_uri:remote_uri_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/remote_uri/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/remote_uri/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_environment_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 23 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_fs_mock_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 132 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_fs_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 247 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_hash_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 360 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_securitylabel_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 407 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/js:ani_file_statvfs_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/js/BUILD.gn) | 452 |
| test | `ohos_unittest` | `//foundation/filemanagement/file_api/interfaces/test/unittest/task_signal:task_signal_test` | [foundation/filemanagement/file_api/interfaces/test/unittest/task_signal/BUILD.gn](../../../../../../foundation/filemanagement/file_api/interfaces/test/unittest/task_signal/BUILD.gn) | 17 |

## 查询命令

```bash
awk -F '\t' '$1 == "filemanagement" && $2 == "file_api"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
