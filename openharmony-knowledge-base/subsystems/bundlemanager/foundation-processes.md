# bundlemanager：Foundation 运行进程

> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。

[返回子系统](README.md) | [功能全景](functional-overview.md)

## 进程清单

| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `app_domain_verify_agent` | 1 | 1 | 2 | ondemand | app_domain_verify | u:r:app_domain_verify_agent:s0 | [查看](processes/app_domain_verify_agent/foundation-runtime.md) |
| `d-bms` | 1 | 1 | 2 | condition | dbms | u:r:d-bms:s0 | [查看](processes/d-bms/foundation-runtime.md) |
| `installs` | 2 | 1 | 2 | ondemand | installs | u:r:installs:s0 | [查看](processes/installs/foundation-runtime.md) |

## 说明

- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。
- 一个进程可以承载多个部件甚至多个子系统提供的 SA。
- 测试、示例和 CLI 工具不进入本清单。
