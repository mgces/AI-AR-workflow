# 开始使用

> 本栏目帮新用户快速完成"认知 → 初始化 → 首次运行"三步，降低首次使用门槛。

::: tip 🚀 大部分人都从这里开始
**[5 分钟快速开始](/getting-started/quick-start)** 是整站的推荐入口——6 步跑通整条流水线，每步标注"你做什么 / workflow 做什么 / 预计多久"。

不需要先读完整生命周期。跑通后再回头看 [生命周期总览](/workflow/lifecycle-overview) 理解全局。

**[→ 立即开始 5 分钟快速开始](/getting-started/quick-start)**
:::

## 这是什么

AI-AR Workflow 是一套面向 OpenHarmony 研发的**证据门控开发流水线**：从已澄清的 AR（架构需求）出发，自动推进设计、开发、编译、测试、真机验证、质量验证与上库 review。每个阶段只能由确定性门控脚本基于"真实证据"判定通过，绝不能用模型的自由文本当作阶段结束。

详见 [什么是 AI-AR Workflow](/getting-started/what-is-ai-ar-workflow)。

## 适合谁

- 想用 workflow 推进 OpenHarmony 代码开发的主用户
- 想复用 skill 的开发者
- 想借助知识库理解 OpenHarmony 代码结构的人

## 与普通 README / skill 集合的区别

| 形态 | 区别 |
|---|---|
| 普通 README | 只描述静态信息，不形成端到端闭环 |
| 普通 skill 集合 | 零散工具，无统一编排与门控 |
| **本 workflow** | 编排器 + 阶段做事 skill + 确定性门控脚本三层，阶段边界是脚本门控而非用户点头 |

## 如何开始

1. **先跑 [5 分钟快速开始](/getting-started/quick-start)** — 6 步跑通最短可执行路径
2. 跑之前如需准备环境，看 [环境初始化](/getting-started/environment-init)
3. 想建立整体认知，看 [什么是 AI-AR Workflow](/getting-started/what-is-ai-ar-workflow)
4. 第一次跑通后看 [首次运行一个 AR](/getting-started/first-ar-run) 理解产物结构
