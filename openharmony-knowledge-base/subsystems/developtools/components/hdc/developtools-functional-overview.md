# hdc：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

Device debug connector that provides the device connection capability and a command line tool

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | standard |
| ROM/RAM | 1725KB / 1599KB |
| 源码仓 | `developtools/hdc` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- `hdc_feature_support_sudo`
- `hdc_feature_support_credential`
- `hdc_feature_support_report_command_event`
- `hdc_feature_support_usr_symlink`

## 进程归属

| 宿主子系统 | 进程 | 角色 | SA | 实现库 |
| --- | --- | --- | --- | --- |
| `developtools` | [hdc_credential](../../processes/hdc_credential/developtools-runtime.md) | 启动配置 | - | - |
| `developtools` | [hdcd](../../processes/hdcd/developtools-runtime.md) | 启动配置 | - | - |

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/hdc/hdc_rust](../../../../../../developtools/hdc/hdc_rust) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 6 | `src` |
| [developtools/hdc/src](../../../../../../developtools/hdc/src) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 6 | `host`, `test`, `register`, `common`, `daemon` |
| [developtools/hdc/credential](../../../../../../developtools/hdc/credential) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | - |
| [developtools/hdc/hdcd_user_permit](../../../../../../developtools/hdc/hdcd_user_permit) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | `src` |
| [developtools/hdc/sudo](../../../../../../developtools/hdc/sudo) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | `src` |
| [developtools/hdc/scripts](../../../../../../developtools/hdc/scripts) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |

## 接口、依赖与测试

- Inner Kit：//developtools/hdc:hdc_updater。
- 组件依赖：init,c_utils,faultloggerd,hitrace,hilog,ipc,ability_base,ability_runtime,common_event_service,window_manager,ylong_runtime,bounds_checking_function,lz4,selinux,openssl,libusb,libuv,os_account,user_auth_framework,pin_auth,rust_rust-openssl,huks,rust_libc,hisysevent,i18n。
- 三方依赖：无声明。
- 测试入口：//developtools/hdc/test:hdc_fuzztest。
- 静态目标：生产 25，测试 23，总计 68。

## 继续深入

- 组件元数据：[developtools/hdc/bundle.json](../../../../../../developtools/hdc/bundle.json)
- 原始 README：[developtools/hdc/README_zh.md](../../../../../../developtools/hdc/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
