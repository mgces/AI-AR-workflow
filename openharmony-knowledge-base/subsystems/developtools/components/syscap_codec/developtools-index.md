# syscap_codec：developtools 完整模块索引

> 本文件由知识库 Skill 生成，不承担功能解释。

[功能说明](developtools-functional-overview.md)

| 分类 | 类型 | Label | 构建文件 | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//developtools/syscap_codec:internal` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 18 |
| production | `ohos_executable` | `//developtools/syscap_codec:syscap_tool_bin` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 35 |
| build-support | `config` | `//developtools/syscap_codec:syscap_interface_public_config` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 69 |
| aggregate-codegen | `group` | `//developtools/syscap_codec:syscap_interface_shared` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 75 |
| production | `shared_library` | `//developtools/syscap_codec:syscap_interface_shared` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 78 |
| production | `ohos_shared_library` | `//developtools/syscap_codec:syscap_interface_shared` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 114 |
| aggregate-codegen | `group` | `//developtools/syscap_codec:syscap_tool_bin_linux` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 142 |
| production | `build_ext_component` | `//developtools/syscap_codec:generate_pcid` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 146 |
| production | `ohos_prebuilt_etc` | `//developtools/syscap_codec:pcid.sc` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 164 |
| aggregate-codegen | `action` | `//developtools/syscap_codec:gen_syscap_define_custom` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 173 |
| aggregate-codegen | `group` | `//developtools/syscap_codec:pcid_sc` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 191 |
| aggregate-codegen | `group` | `//developtools/syscap_codec:syscap_codec` | [developtools/syscap_codec/BUILD.gn](../../../../../../developtools/syscap_codec/BUILD.gn) | 195 |
| aggregate-codegen | `gen_js_obj` | `//developtools/syscap_codec/napi:query_syscap_js` | [developtools/syscap_codec/napi/BUILD.gn](../../../../../../developtools/syscap_codec/napi/BUILD.gn) | 21 |
| production | `ohos_shared_library` | `//developtools/syscap_codec/napi:systemcapability` | [developtools/syscap_codec/napi/BUILD.gn](../../../../../../developtools/syscap_codec/napi/BUILD.gn) | 34 |
| aggregate-codegen | `group` | `//developtools/syscap_codec/taihe:taihe_group` | [developtools/syscap_codec/taihe/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/BUILD.gn) | 16 |
| aggregate-codegen | `copy_taihe_idl` | `//developtools/syscap_codec/taihe/syscap:copy_systemCapability` | [developtools/syscap_codec/taihe/syscap/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/syscap/BUILD.gn) | 17 |
| production | `ohos_taihe` | `//developtools/syscap_codec/taihe/syscap:run_taihe` | [developtools/syscap_codec/taihe/syscap/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/syscap/BUILD.gn) | 24 |
| production | `taihe_shared_library` | `//developtools/syscap_codec/taihe/syscap:systemCapability_taihe_native` | [developtools/syscap_codec/taihe/syscap/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/syscap/BUILD.gn) | 33 |
| aggregate-codegen | `generate_static_abc` | `//developtools/syscap_codec/taihe/syscap:systemCapability` | [developtools/syscap_codec/taihe/syscap/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/syscap/BUILD.gn) | 72 |
| production | `ohos_prebuilt_etc` | `//developtools/syscap_codec/taihe/syscap:systemCapability_etc` | [developtools/syscap_codec/taihe/syscap/BUILD.gn](../../../../../../developtools/syscap_codec/taihe/syscap/BUILD.gn) | 80 |
| test | `executable` | `//developtools/syscap_codec/test/unittest/common:test_syscap_napi_unittest` | [developtools/syscap_codec/test/unittest/common/BUILD.gn](../../../../../../developtools/syscap_codec/test/unittest/common/BUILD.gn) | 23 |
| test | `group` | `//developtools/syscap_codec/test/unittest/common:unittest` | [developtools/syscap_codec/test/unittest/common/BUILD.gn](../../../../../../developtools/syscap_codec/test/unittest/common/BUILD.gn) | 61 |
| test | `ohos_unittest` | `//developtools/syscap_codec/test/unittest/common:syscap_codec_test` | [developtools/syscap_codec/test/unittest/common/BUILD.gn](../../../../../../developtools/syscap_codec/test/unittest/common/BUILD.gn) | 72 |
| test | `group` | `//developtools/syscap_codec/test/unittest/common:unittest` | [developtools/syscap_codec/test/unittest/common/BUILD.gn](../../../../../../developtools/syscap_codec/test/unittest/common/BUILD.gn) | 100 |

动态模板、循环或变量生成的目标仍需直接阅读构建文件。
