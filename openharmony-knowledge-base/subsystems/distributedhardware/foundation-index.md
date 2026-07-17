# distributedhardware：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 7 |
| rk3568 选入部件 | 7 |
| GN 目标 | 1665 |
| 生产目标 | 134 |
| 测试目标 | 1369 |
| 构建支持目标 | 137 |
| 聚合/代码生成目标 | 25 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| device_manager | yes | foundation/distributedhardware/device_manager | 396 | 50 | 316 | [查看](components/device_manager/foundation-index.md) |
| distributed_audio | yes | foundation/distributedhardware/distributed_audio | 226 | 10 | 191 | [查看](components/distributed_audio/foundation-index.md) |
| distributed_camera | yes | foundation/distributedhardware/distributed_camera | 237 | 11 | 211 | [查看](components/distributed_camera/foundation-index.md) |
| distributed_hardware_fwk | yes | foundation/distributedhardware/distributed_hardware_fwk | 336 | 28 | 245 | [查看](components/distributed_hardware_fwk/foundation-index.md) |
| distributed_input | yes | foundation/distributedhardware/distributed_input | 112 | 17 | 94 | [查看](components/distributed_input/foundation-index.md) |
| distributed_screen | yes | foundation/distributedhardware/distributed_screen | 146 | 11 | 114 | [查看](components/distributed_screen/foundation-index.md) |
| mechbody_controller | yes | foundation/distributedhardware/mechbody_controller | 212 | 7 | 198 | [查看](components/mechbody_controller/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "distributedhardware"' specs/knowledge-base/generated/foundation/modules.tsv
```
