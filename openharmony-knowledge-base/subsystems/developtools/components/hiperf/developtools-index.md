# hiperf：developtools 完整模块索引

> 本文件由知识库 Skill 生成，不承担功能解释。

[功能说明](developtools-functional-overview.md)

| 分类 | 类型 | Label | 构建文件 | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//developtools/hiperf:hiperf_inner_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 19 |
| build-support | `config` | `//developtools/hiperf:hiperf_syspara_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 185 |
| build-support | `config` | `//developtools/hiperf:libunwinder_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 189 |
| production | `ohos_source_set` | `//developtools/hiperf:adapt_mingw_sourceset` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 201 |
| production | `ohos_source_set` | `//developtools/hiperf:hiperf_platform_common` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 219 |
| build-support | `config` | `//developtools/hiperf:platform_linux_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 274 |
| production | `ohos_source_set` | `//developtools/hiperf:hiperf_platform_linux` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 278 |
| build-support | `config` | `//developtools/hiperf:elf_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 313 |
| production | `ohos_source_set` | `//developtools/hiperf:support_elf` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 315 |
| build-support | `config` | `//developtools/hiperf:protobuf_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 322 |
| production | `ohos_source_set` | `//developtools/hiperf:support_protobuf` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 326 |
| aggregate-codegen | `action` | `//developtools/hiperf:hiperf_host_build_proto` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 388 |
| build-support | `config` | `//developtools/hiperf:proto_file_cpp_config` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 413 |
| production | `ohos_source_set` | `//developtools/hiperf:proto_file_cpp` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 425 |
| production | `ohos_executable` | `//developtools/hiperf:hiperf` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 441 |
| production | `ohos_executable` | `//developtools/hiperf:hiperf_host` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 484 |
| production | `ohos_prebuilt_etc` | `//developtools/hiperf:hiperf.para` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 512 |
| production | `ohos_prebuilt_etc` | `//developtools/hiperf:hiperf.para.dac` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 523 |
| production | `ohos_prebuilt_etc` | `//developtools/hiperf:hiperf.cfg` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 534 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_etc` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 541 |
| production | `ohos_source_set` | `//developtools/hiperf:hiperf_platform_host` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 549 |
| production | `ohos_shared_library` | `//developtools/hiperf:hiperf_host_lib` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 571 |
| production | `ohos_executable` | `//developtools/hiperf:hiperf_host_lib_demo` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 583 |
| aggregate-codegen | `ohos_copy` | `//developtools/hiperf:hiperf_host_python` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 597 |
| production | `ohos_source_set` | `//developtools/hiperf:hiperf_code_analyze` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 607 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_target` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 617 |
| test | `group` | `//developtools/hiperf:hiperf_test_target` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 625 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_target_all` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 630 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_demo` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 661 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_example_cmd` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 669 |
| aggregate-codegen | `group` | `//developtools/hiperf:hiperf_all` | [developtools/hiperf/BUILD.gn](../../../../../../developtools/hiperf/BUILD.gn) | 677 |
| test | `ohos_executable` | `//developtools/hiperf/demo/cpp:hiperf_demo` | [developtools/hiperf/demo/cpp/BUILD.gn](../../../../../../developtools/hiperf/demo/cpp/BUILD.gn) | 17 |
| test | `ohos_executable` | `//developtools/hiperf/demo/cpp:hiperf_example_cmd` | [developtools/hiperf/demo/cpp/BUILD.gn](../../../../../../developtools/hiperf/demo/cpp/BUILD.gn) | 26 |
| build-support | `config` | `//developtools/hiperf/interfaces/innerkits/native/hiperf_client:hiperf_client_config` | [developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn](../../../../../../developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//developtools/hiperf/interfaces/innerkits/native/hiperf_client:hiperf_client` | [developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn](../../../../../../developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn) | 26 |
| production | `ohos_static_library` | `//developtools/hiperf/interfaces/innerkits/native/hiperf_client:hiperf_client_static` | [developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn](../../../../../../developtools/hiperf/interfaces/innerkits/native/hiperf_client/BUILD.gn) | 45 |
| build-support | `config` | `//developtools/hiperf/interfaces/innerkits/native/hiperf_local:hiperf_local_config` | [developtools/hiperf/interfaces/innerkits/native/hiperf_local/BUILD.gn](../../../../../../developtools/hiperf/interfaces/innerkits/native/hiperf_local/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//developtools/hiperf/interfaces/innerkits/native/hiperf_local:hiperf_local` | [developtools/hiperf/interfaces/innerkits/native/hiperf_local/BUILD.gn](../../../../../../developtools/hiperf/interfaces/innerkits/native/hiperf_local/BUILD.gn) | 25 |
| build-support | `config` | `//developtools/hiperf/test:hiperf_test_config` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 85 |
| test | `ohos_executable` | `//developtools/hiperf/test:hiperf_test_demo` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 104 |
| test | `ohos_unittest` | `//developtools/hiperf/test:hiperf_unittest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 111 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:CommandLineFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 245 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:LibReportFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 274 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:ClientApiFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 292 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:SpeDecoderFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 314 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:PerfFileFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 336 |
| test | `ohos_fuzztest` | `//developtools/hiperf/test:PerfFileFormatFuzzTest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 360 |
| test | `group` | `//developtools/hiperf/test:hiperf_fuzztest` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 383 |
| test | `group` | `//developtools/hiperf/test:hiperf_test` | [developtools/hiperf/test/BUILD.gn](../../../../../../developtools/hiperf/test/BUILD.gn) | 397 |

动态模板、循环或变量生成的目标仍需直接阅读构建文件。
