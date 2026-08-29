# OpenHarmony 源码导航库

> 本目录只负责导航，不是 OpenHarmony 代码事实库。

它保存稳定的所有权词汇和层级，帮助把需求缩小到候选子系统、组件、进程、能力或 feature；文件、接口、GN target、依赖、产品配置、测试和运行行为必须回到当前 OpenHarmony 源码仓验证。

## 两层模型

| 层 | 保存位置 | 用途 |
|---|---|---|
| `stable-navigation` | 本目录 | 稳定名称、父子关系、候选检索词、源码定位方法 |
| `dynamic-source` | 当前 `$OHOS_ROOT` | 仓 HEAD、文件、API、构建、配置、测试和运行事实 |

动态层不复制进本仓，不维护工作区快照、机器生成清单或产品选入快照。

## 使用入口

- [使用指南](USAGE.md)
- [信息架构](INFORMATION_ARCHITECTURE.md)
- [系统概念导航](architecture/system.md)
- [构建与运行验证导航](architecture/build-runtime.md)
- [子系统导航树](subsystems/README.md)
- [OpenHarmony Source Navigator Skill](skills/ohos-code-knowledge-base/SKILL.md)

## 基本原则

1. 先用知识库找候选归属。
2. 再到当前 repo 工作区定位真实仓。
3. 记录候选仓的当前 HEAD。
4. 从当前 `bundle.json`、`BUILD.gn`、接口、测试和运行配置取得代码事实。
5. 知识库与源码冲突时，以当前源码和真实验证证据为准，并修正导航。
