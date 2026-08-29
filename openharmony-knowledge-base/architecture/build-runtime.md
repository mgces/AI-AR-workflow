# 构建与运行验证导航

知识库不保存当前 GN target、产物路径、test part、产品选入或运行实体结论。

## 构建事实

从候选源码仓的当前 `bundle.json`、`BUILD.gn`、`.gni` 和产品配置确认：

```text
component -> target -> dependency -> product selection -> artifact
```

## 测试与运行事实

从当前测试配置、测试源码、init/SA/插件配置和真实设备证据确认：

```text
test part/suite -> built test -> deployment -> runtime trigger -> observable result
```

任何写入 `AR_design.md` 或 `ar-contract` 的 target、artifact、test case、device marker 都必须有当前源码或真实验证锚点，不能引用知识库摘要作为证明。
