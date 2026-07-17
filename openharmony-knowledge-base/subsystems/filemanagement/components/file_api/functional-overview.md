# file_api 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

provides the application with JS interfaces for IO

源码 README 补充说明：

> 文件访问接口提供基础文件IO操作能力，其具体包括用于管理文件的基本文件接口，管理目录的基本目录接口，获取文件信息的统计接口，流式读写文件的流式接口，以及文件锁接口。 文件访问接口仅面向应用程序提供应用文件访问能力，其由ohos.file.fs模块、ohos.file.statvfs模块、ohos.file.hash模块、ohos.file.securityLabel模块和ohos.file.environment模块组成。架构上，文件访问接口实现了自研的 LibN，其抽象了 NAPI 层接口，向文件访问接口提供包括基本类型系统、内存管理、通用编程模型在内的基本能力。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4096KB / 4096KB |
| 源码仓 | `foundation/filemanagement/file_api` |

## 核心能力

- **File Management File File IO**：提供“file file io”能力，系统能力标识为 `SystemCapability.FileManagement.File.FileIO`。
- **File Management File File IO Lite**：提供“file io lite”能力，系统能力标识为 `SystemCapability.FileManagement.File.FileIO.Lite`。
- **File Management File Environment**：提供“file environment”能力，系统能力标识为 `SystemCapability.FileManagement.File.Environment`。
- **File Management File Environment Folder Obtain**：提供“environment folder obtain”能力，系统能力标识为 `SystemCapability.FileManagement.File.Environment.FolderObtain`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `file_api_read_optimize`：file api read optimize。
- `file_api_feature_hyperaio`：file api 功能 hyperaio。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/file_api/interfaces](../../../../../../foundation/filemanagement/file_api/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 99 | `kits` |
| [foundation/filemanagement/file_api/utils](../../../../../../foundation/filemanagement/file_api/utils) | 跨模块复用的基础工具和通用数据结构。 | 6 | `common`, `filemgmt_libfs`, `filemgmt_libhilog`, `filemgmt_libn` |

## 对外与内部接口

该部件声明 14 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/file_api/interfaces/kits/native:remote_uri_native` | `//foundation/filemanagement/file_api/interfaces/kits/native/remote_uri` | `remote_uri.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/hyperaio:HyperAio` | `//foundation/filemanagement/file_api/interfaces/kits/hyperaio/include` | `hyperaio.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/native:environment_native` | `//foundation/filemanagement/file_api/interfaces/kits/native/environment` | `environment_native.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/native:fileio_native` | `//foundation/filemanagement/file_api/interfaces/kits/native/fileio` | `fileio_native.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/rust:rust_file` | `//foundation/filemanagement/file_api/interfaces/kits/rust/include` | `rust_file.h` |
| `//foundation/filemanagement/file_api/utils/filemgmt_libfs:filemgmt_libfs` | `//foundation/filemanagement/file_api/utils/filemgmt_libfs/include` | `filemgmt_libfs.h` |
| `//foundation/filemanagement/file_api/utils/filemgmt_libn:filemgmt_libn` | `//foundation/filemanagement/file_api/utils/filemgmt_libn/include` | `filemgmt_libn.h` |
| `//foundation/filemanagement/file_api/utils/filemgmt_libhilog:filemgmt_libhilog` | `//foundation/filemanagement/file_api/utils/filemgmt_libhilog` | `filemgmt_libhilog.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/c/environment:ohenvironment` | `//foundation/filemanagement/file_api/interfaces/kits/c/environment` | `environment.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/c/fileio:ohfileio` | `//foundation/filemanagement/file_api/interfaces/kits/c/fileio` | `fileio.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/c/compress:oharchive` | `//foundation/filemanagement/file_api/interfaces/kits/c/compress` | `interface/inner_api/archive/include/oh_archive.h`, `interface/inner_api/archive/include/oh_archive_errcode.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/js:securitylabel` | `//foundation/filemanagement/file_api/interfaces/kits/js/src/mod_securitylabel` | `security_label.h` |
| `//foundation/filemanagement/file_api/interfaces/kits/cj:cj_file_fs_ffi` | `//foundation/filemanagement/file_api/interfaces/kits/cj/src` | - |
| `//foundation/filemanagement/file_api/interfaces/kits/cj:cj_statvfs_ffi` | `//foundation/filemanagement/file_api/interfaces/kits/cj/src` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 28 个，`ohos_source_set` 5 个，`ohos_ndk_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 27 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `api_metrics`, `app_file_service`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `common_event_service`, `data_share`, `dfs_service`, `eventhandler`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `liburing`, `libuv`, `napi`, `node`, `openssl`, `os_account`, `runtime_core`, `rust_libc`, `samgr`, `zlib`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 25 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 18 个，`group` 5 个，`ohos_fuzztest` 1 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/file_api/bundle.json](../../../../../../foundation/filemanagement/file_api/bundle.json)
- 原始源码 README：[foundation/filemanagement/file_api/README_zh.md](../../../../../../foundation/filemanagement/file_api/README_zh.md)、[foundation/filemanagement/file_api/README.md](../../../../../../foundation/filemanagement/file_api/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
