# 导航信息架构

## Stable Navigation

仓内只维护耐久的所有权层级：

```text
subsystem
  -> component 或 process
    -> capability
      -> feature
        -> 当前源码定位入口
```

导航节点统一使用 `subsystems/**/README.md`。节点只允许包含名称、父子关系、别名、候选关键词和当前源码验证方法。

## Dynamic Source

以下内容只在当前 OpenHarmony 工作区解析，不持久化到知识库：

- repo manifest、分支、HEAD、脏状态；
- 文件、符号、API、调用关系；
- `bundle.json`、GN target、依赖、产物；
- 产品选入、feature switch、init、SA、进程和权限；
- 测试、真机、性能和 CI 结果。

动态事实的引用必须携带当前仓路径和 HEAD，并链接或指向实际源码/配置/证据。

## 目录

```text
openharmony-knowledge-base/
├── README.md / USAGE.md
├── INFORMATION_ARCHITECTURE.md
├── architecture/       # 稳定系统概念和源码验证路线
├── subsystems/         # 稳定所有权导航树，只保留 README 节点
├── templates/          # 导航节点模板
├── tools/search/       # 稳定导航 BM25
└── skills/             # 导航并验证当前源码的 Skill
```

`generated/`、`workspace/`、`source-domains/` 和 `products/` 快照不属于该架构。
