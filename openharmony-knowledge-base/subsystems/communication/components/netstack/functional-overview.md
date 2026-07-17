# netstack 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

网络协议栈模块作为电话子系统可裁剪部件，主要分为HTTP和socket模块；如图1：Http接口架构图；如图2：socket接口架构图； \| 类型 \| 接口 \| 功能说明 \| \| ---- \| ---- \| ---- \| \| ohos.net.socket \| function createHttp(): HttpRequest \| 返回一个HttpRequest对象 \| \| ohos.net.http.HttpRequest \| on(type: "headerReceive", callback: AsyncCallback\ ): void \| 监听收到Http头的事件 \| \| ohos.net.http.HttpRequest \| once(type: "headerReceive", callback: Callback\ ): void \| 监听收到Http头的事件，只监听一次 \| \| ohos.net.http.HttpRequest \| off(type: "headerReceive", callback: AsyncCallback\ ): void \| 取消监听收到Http头的事件 \| \| ohos.net.http.HttpRequest \| on(type: "headerReceive", callback: Callback\ ): void \| 监听收到Http头的事件 \| \| ohos.net.http.HttpRequest \| once(type: "headerReceive", callback: Callback\ ): void \| 监听收到Http头的事件，只监听一次 \| \| ohos.net.http.HttpRequest \| off(type: "headerReceive", callback: Callback\ ): void \| 取消监听收到Http头的事件 \| \| ohos.net.http.HttpRequest \| request(url: string, callback: AsyncCallback\ ): void \| 用**GET**方法请求一个域名，调用callback \| \| ohos.net.http.HttpRequest \| request(url: string, options: HttpRequestOptions, callback: AsyncCallback\ ): void \| 请求一个域名，options中携带请求参数，调用callback \| \| ohos.net.http.HttpRequest \| request(url: string, options?: HttpRequestOptions: Promise\ \| 请求一个域名，options中携

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 3MB / 5MB |
| 源码仓 | `foundation/communication/netstack` |

## 核心能力

- **Communication Net Stack**：提供“communication net stack”能力，系统能力标识为 `SystemCapability.Communication.NetStack`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `netstack_feature_http3`：netstack 功能 http3。
- `netstack_http_boringssl`：netstack http boringssl。
- `netstack_feature_communication_http3`：netstack 功能 communication http3。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/netstack/frameworks](../../../../../../foundation/communication/netstack/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 30 | `cj`, `ets`, `js`, `native` |
| [foundation/communication/netstack/interfaces](../../../../../../foundation/communication/netstack/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 20 | `innerkits`, `kits` |
| [foundation/communication/netstack/utils](../../../../../../foundation/communication/netstack/utils) | 跨模块复用的基础工具和通用数据结构。 | 6 | `common_utils`, `http_over_curl`, `log`, `napi_utils`, `netstack_chr_client`, `profiler_utils`, `tlv_utils` |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/netstack/interfaces/innerkits/http_client:http_client` | `//foundation/communication/netstack/interfaces/innerkits/http_client/include` | `http_client.h`, `http_client_constant.h`, `http_client_request.h`, `http_client_response.h`, `http_client_error.h`, `http_client_task.h` |
| `//foundation/communication/netstack/interfaces/innerkits/net_ssl:net_ssl` | `//foundation/communication/netstack/interfaces/innerkits/net_ssl/include` | `net_ssl_type.h`, `net_ssl.h` |
| `//foundation/communication/netstack/interfaces/innerkits/websocket_native:websocket_native` | `//foundation/communication/netstack/interfaces/innerkits/websocket_native/include` | `websocket_client_innerapi.h`, `websocket_server_innerapi.h` |
| `//foundation/communication/netstack/interfaces/innerkits/http_interceptor:http_interceptor` | `//foundation/communication/netstack/interfaces/innerkits/http_interceptor/include` | `http_interceptor_mgr.h` |
| `//foundation/communication/netstack/interfaces/innerkits/rust/ylong_http_client:ylong_http_client` | - | - |
| `//foundation/communication/netstack/frameworks/cj/websocket:cj_net_websocket_ffi` | `//foundation/communication/netstack/frameworks/cj/websocket/include` | - |
| `//foundation/communication/netstack/frameworks/cj/socket:cj_net_socket_ffi` | `//foundation/communication/netstack/frameworks/cj/socket/include` | - |
| `//foundation/communication/netstack/frameworks/cj/http:cj_net_http_ffi` | `//foundation/communication/netstack/frameworks/cj/http/include` | - |
| `//foundation/communication/netstack/frameworks/cj/network_security:cj_net_network_security_ffi` | `//foundation/communication/netstack/frameworks/cj/network_security/include` | - |
| `//foundation/communication/netstack/interfaces/innerkits/rust/netstack_rs:netstack_rs` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 19 个，`ohos_static_library` 6 个，`ohos_rust_shared_library` 5 个，`ohos_rust_static_library` 2 个，`lite_library` 1 个。

## 依赖与协作边界

该部件声明 29 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `bounds_checking_function`, `curl`, `ffrt`, `hilog`, `hitrace`, `hisysevent`, `ipc`, `zlib`, `cJSON`, `c_utils`, `init`, `napi`, `netmanager_base`, `ylong_http`, `openssl`, `hiprofiler`, `time_service`, `ability_runtime`, `samgr`, `libwebsockets`, `node`, `jsoncpp`, `access_token`, `hiappevent`, `bundle_framework`, `safwk`, `runtime_core`, `rust_cxx`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 41 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 25 个，`group` 16 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/netstack/bundle.json](../../../../../../foundation/communication/netstack/bundle.json)
- 原始源码 README：[foundation/communication/netstack/README_zh.md](../../../../../../foundation/communication/netstack/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
