# 稳定导航与动态源码

| 层 | 保存内容 | 位置 |
|---|---|---|
| `stable-navigation` | 名称、所有权层级、父子关系、搜索词 | `openharmony-knowledge-base/` |
| `dynamic-source` | 仓 HEAD、文件、接口、构建、配置、测试和运行事实 | 当前 `$OHOS_ROOT` |

稳定导航结构：

```text
subsystem
  -> component 或 process
    -> capability
      -> feature
```

物理源码域、产品选入、workspace 状态、GN/运行实体全量索引不再持久化到知识库。需要时从当前 repo manifest、源码和构建/运行证据解析。
