# distributedhardware：Foundation 运行进程

> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。

[返回子系统](README.md) | [功能全景](functional-overview.md)

## 进程清单

| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `daudio` | 1 | 4 | 2 | ondemand | daudio | u:r:daudio:s0 | [查看](processes/daudio/foundation-runtime.md) |
| `dcamera` | 1 | 4 | 2 | ondemand | dcamera | u:r:dcamera:s0 | [查看](processes/dcamera/foundation-runtime.md) |
| `device_manager` | 1 | 1 | 2 | - | device_manager | u:r:device_manager:s0 | [查看](processes/device_manager/foundation-runtime.md) |
| `dhardware` | 2 | 1 | 2 | ondemand | dhardware | u:r:dhardware:s0 | [查看](processes/dhardware/foundation-runtime.md) |
| `dinput` | 1 | 2 | 2 | ondemand | dinput | u:r:dinput:s0 | [查看](processes/dinput/foundation-runtime.md) |
| `dscreen` | 1 | 2 | 2 | ondemand | dscreen | u:r:dscreen:s0 | [查看](processes/dscreen/foundation-runtime.md) |
| `mechbody` | 1 | 1 | 2 | ondemand | mechbody | u:r:mechbody:s0 | [查看](processes/mechbody/foundation-runtime.md) |

## 说明

- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。
- 一个进程可以承载多个部件甚至多个子系统提供的 SA。
- 测试、示例和 CLI 工具不进入本清单。
