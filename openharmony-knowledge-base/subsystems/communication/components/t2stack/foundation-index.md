# t2stack：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `t2stack` |
| Git 子仓 | `foundation/communication/t2stack` |
| bundle | [foundation/communication/t2stack/bundle.json](../../../../../../foundation/communication/t2stack/bundle.json) |
| rk3568 selected | yes |
| adapted systems | mini,small,standard |
| component dependencies | 8 |
| third-party dependencies | 8 |
| declared sub_component | 0 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`bounds_checking_function`, `c_utils`, `cJSON`, `dsoftbus`, `hilog`, `libcoap`, `mbedtls`, `openssl`

三方依赖：`cJSON`, `json`, `mbedtls`, `openssl`, `bounds_checking_function`, `sqlite`, `zlib`, `libnl`

## 声明构建入口

- 无

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 5 |
| build-support | 8 |
| aggregate-codegen | 1 |
| total | 27 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/communication/t2stack/fillp:nstackx_FillpSo_open_header` | [foundation/communication/t2stack/fillp/BUILD.gn](../../../../../../foundation/communication/t2stack/fillp/BUILD.gn) | 36 |
| production | `shared_library` | `//foundation/communication/t2stack/fillp:FillpSo.open` | [foundation/communication/t2stack/fillp/BUILD.gn](../../../../../../foundation/communication/t2stack/fillp/BUILD.gn) | 44 |
| production | `ohos_shared_library` | `//foundation/communication/t2stack/fillp:FillpSo.open` | [foundation/communication/t2stack/fillp/BUILD.gn](../../../../../../foundation/communication/t2stack/fillp/BUILD.gn) | 114 |
| production | `lite_component` | `//foundation/communication/t2stack:nstackx` | [foundation/communication/t2stack/BUILD.gn](../../../../../../foundation/communication/t2stack/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//foundation/communication/t2stack:nstackx` | [foundation/communication/t2stack/BUILD.gn](../../../../../../foundation/communication/t2stack/BUILD.gn) | 27 |
| production | `shared_library` | `//foundation/communication/t2stack/nstackx_congestion:nstackx_congestion.open` | [foundation/communication/t2stack/nstackx_congestion/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_congestion/BUILD.gn) | 20 |
| production | `ohos_shared_library` | `//foundation/communication/t2stack/nstackx_congestion:nstackx_congestion.open` | [foundation/communication/t2stack/nstackx_congestion/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_congestion/BUILD.gn) | 71 |
| test | `group` | `//foundation/communication/t2stack/test:unittest` | [foundation/communication/t2stack/test/BUILD.gn](../../../../../../foundation/communication/t2stack/test/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/communication/t2stack/test/unittest:DfileTest` | [foundation/communication/t2stack/test/unittest/BUILD.gn](../../../../../../foundation/communication/t2stack/test/unittest/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/communication/t2stack/test/unittest:DstreamTest` | [foundation/communication/t2stack/test/unittest/BUILD.gn](../../../../../../foundation/communication/t2stack/test/unittest/BUILD.gn) | 56 |
| test | `ohos_unittest` | `//foundation/communication/t2stack/test/unittest:DfinderTest` | [foundation/communication/t2stack/test/unittest/BUILD.gn](../../../../../../foundation/communication/t2stack/test/unittest/BUILD.gn) | 95 |
| test | `group` | `//foundation/communication/t2stack/test/unittest:unittest` | [foundation/communication/t2stack/test/unittest/BUILD.gn](../../../../../../foundation/communication/t2stack/test/unittest/BUILD.gn) | 137 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_ctrl:nstackx_ctrl_interface` | [foundation/communication/t2stack/nstackx_ctrl/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_ctrl/BUILD.gn) | 105 |
| production | `static_library` | `//foundation/communication/t2stack/nstackx_ctrl:nstackx_ctrl` | [foundation/communication/t2stack/nstackx_ctrl/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_ctrl/BUILD.gn) | 112 |
| production | `shared_library` | `//foundation/communication/t2stack/nstackx_ctrl:nstackx_ctrl` | [foundation/communication/t2stack/nstackx_ctrl/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_ctrl/BUILD.gn) | 151 |
| production | `ohos_shared_library` | `//foundation/communication/t2stack/nstackx_ctrl:nstackx_ctrl` | [foundation/communication/t2stack/nstackx_ctrl/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_ctrl/BUILD.gn) | 203 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_core/dfile:dfile_lite_config` | [foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_core/dfile:dfile_linux_config` | [foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn) | 34 |
| production | `shared_library` | `//foundation/communication/t2stack/nstackx_core/dfile:nstackx_dfile.open` | [foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn) | 45 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_core/dfile:nstackx_dfile_open_header` | [foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn) | 135 |
| production | `ohos_shared_library` | `//foundation/communication/t2stack/nstackx_core/dfile:nstackx_dfile.open` | [foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_core/dfile/BUILD.gn) | 142 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_util:nstackx_util_header` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_util:nstackx_util_header` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 28 |
| production | `static_library` | `//foundation/communication/t2stack/nstackx_util:nstackx_util.open` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 36 |
| production | `shared_library` | `//foundation/communication/t2stack/nstackx_util:nstackx_util.open` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 79 |
| build-support | `config` | `//foundation/communication/t2stack/nstackx_util:nstackx_util_header` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 166 |
| production | `ohos_shared_library` | `//foundation/communication/t2stack/nstackx_util:nstackx_util.open` | [foundation/communication/t2stack/nstackx_util/BUILD.gn](../../../../../../foundation/communication/t2stack/nstackx_util/BUILD.gn) | 173 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "t2stack"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
