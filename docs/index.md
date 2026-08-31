---
# 首页 — 官网风格，不直搬 README
layout: home

hero:
  name: "AI-AR Workflow"
  text: "证据门控开发流水线"
  tagline: OpenHarmony 需求分析与开发作业线——从需求分析、设计基线到证据门控开发与上库。
  image:
    src: /logo.svg
    alt: AI-AR Workflow
  actions:
    - theme: brand
      text: 5 分钟快速开始
      link: /getting-started/quick-start
    - theme: alt
      text: 进入需求开发
      link: /workflow/

features:
  - icon: 🚀
    title: 5 分钟快速开始
    details: 第一次使用？从这里进。根据当前输入选择起点，并了解安装、状态推进和人工确认点。
    link: /getting-started/quick-start
    linkText: 立即开始 →

  - icon: 🚀
    title: 需求开发工作流
    details: 以自然语言 AR 或分析设计产出的 AR.md 为输入，按 P0-P8 完成设计固化、代码开发、构建、测试、质量验证和上库。
    link: /workflow/
    linkText: 查看需求开发 →

  - icon: 🛡️
    title: 证据门控
    details: 每个阶段只能由确定性门控脚本基于"真实证据"判定通过——绝不能用模型的自由文本当作阶段结束。真实证据 = 真实构建日志的成功横幅、真机 hdc+hilog 抓取、gtest/xdevice 测试报告、CI 绿状态。
    link: /workflow/evidence-and-gates
    linkText: 查看证据与门控机制

  - icon: 📋
    title: 需求分析与设计工作流
    details: 需要先收敛原始需求时，使用需求分析与设计工作流（Requirement workflow）完成澄清、可行性、方案决策、Feature Gate、IR 和 SR，再生成 AR.md。
    link: /sdd/
    linkText: 查看需求分析与设计 →

  - icon: 🧩
    title: Skill 编排协作
    details: 编排器 ohos-ar-dev-workflow 作为"大脑"调度各阶段做事技能：构建诊断、单测生成、真机 hdc、刷机、PR review 等能力复用，形成完整闭环。
    link: /skill-playbooks/common-combinations
    linkText: 查看 Skill 组合拳

  - icon: 📱
    title: 端到端与质量验证
    details: 端到端功能验证叠加进程溯源、副作用断言、负对照差分三层抗伪造证明；质量阶段覆盖覆盖率、性能、功耗、稳定性与代码 review。
    link: /workflow/phase-6-device
    linkText: 查看真机功能阶段

  - icon: 🚀
    title: GitCode 上库流程
    details: P8 上库含本地自检零问题报告（commit 前硬控）、DCO 签名提交、绑定 Issue 的 PR、PR review 零问题报告（CI 前硬控）、CI 绿状态与 SHA 绑定。
    link: /workflow/phase-8-upload
    linkText: 查看上库阶段

  - icon: 📚
    title: OpenHarmony 知识库支撑
    details: 稳定导航帮助定位候选子系统、组件和进程；文件、接口、target、依赖与行为必须在当前源码仓验证。
    link: /knowledge-base/how-it-supports-workflow
    linkText: 查看知识库如何支撑 workflow
---

::: tip 🚀 大部分人都从这里开始
**[5 分钟快速开始](/getting-started/quick-start)** 是整站的推荐入口——不管你是第一次用 workflow，还是只想快速跑通一个 AR，这一页给你最短可执行路径：6 步跑通，每步标注"你做什么 / workflow 做什么 / 预计多久"。

**[→ 立即开始 5 分钟快速开始](/getting-started/quick-start)**
:::

## 5 分钟上手一览

不想离开首页？这里先给你一张最短路径一览。每一步的细节都在 [5 分钟快速开始](/getting-started/quick-start) 里。

<div class="vp-doc">

  <a href="/AI-AR-workflow/getting-started/quick-start" class="vp-home-quick-card">
    <div class="vp-home-quick-head">
      <span class="vp-home-quick-icon">🚀</span>
      <h3 class="vp-home-quick-title">5 分钟快速开始</h3>
    </div>
    <p class="vp-home-quick-desc">第一次使用？从这里进。6 步跑通整条流水线，适合第一次使用——每步标注"你做什么 / workflow 做什么 / 预计多久"。</p>
    <div class="vp-home-quick-pills">
      <span class="vp-home-quick-pill">① 初始化环境</span>
      <span class="vp-home-quick-pill">② 准备 AR</span>
      <span class="vp-home-quick-pill">③ 调用编排器</span>
      <span class="vp-home-quick-pill">④ 看状态</span>
      <span class="vp-home-quick-pill">⑤ 人工确认点</span>
    </div>
    <p class="vp-home-quick-cta">🚀 立即开始 →</p>
  </a>

</div>

<h4 style="margin: 24px 0 12px; opacity: 0.85;">还需要这些：</h4>

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 0 0 24px;">

  <a href="/AI-AR-workflow/getting-started/environment-init" style="border: 1px solid var(--vp-c-border); border-radius: 12px; padding: 16px 20px; display: block; transition: border-color 0.25s; text-decoration: none;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
      <span style="font-size: 22px;">🔧</span>
      <h3 style="margin: 0; font-size: 17px;">环境没就绪？</h3>
    </div>
    <p style="opacity: 0.8; margin: 4px 0 0; font-size: 14px;">build.sh / hdc / 真机 / oh-gc 不会配？看环境初始化详解。</p>
  </a>

  <a href="/AI-AR-workflow/examples/new-feature-end-to-end" style="border: 1px solid var(--vp-c-border); border-radius: 12px; padding: 16px 20px; display: block; transition: border-color 0.25s; text-decoration: none;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
      <span style="font-size: 22px;">📖</span>
      <h3 style="margin: 0; font-size: 17px;">想看完整示例？</h3>
    </div>
    <p style="opacity: 0.8; margin: 4px 0 0; font-size: 14px;">从一个新 AR 到上库的端到端完整路线演示。</p>
  </a>

</div>

## 三条推荐路径

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 24px 0;">
  <a href="/AI-AR-workflow/getting-started/quick-start" style="border: 1px solid var(--vp-c-border); border-radius: 8px; padding: 16px; display: block; transition: border-color 0.25s;">
    <h3 style="margin-top: 0;">路径 A：第一次使用 workflow</h3>
    <p style="opacity: 0.8; margin-bottom: 0;">5 分钟快速开始 → 初始化环境 → 跑第一次 AR</p>
  </a>
  <a href="/AI-AR-workflow/workflow/phase-1-design-and-develop" style="border: 1px solid var(--vp-c-border); border-radius: 8px; padding: 16px; display: block; transition: border-color 0.25s;">
    <h3 style="margin-top: 0;">路径 B：已经在做代码开发</h3>
    <p style="opacity: 0.8; margin-bottom: 0;">进入 P1 设计与开发 → 编译与测试 → 真机验证</p>
  </a>
  <a href="/AI-AR-workflow/skill-playbooks/" style="border: 1px solid var(--vp-c-border); border-radius: 8px; padding: 16px; display: block; transition: border-color 0.25s;">
    <h3 style="margin-top: 0;">路径 C：想单独复用某个 skill</h3>
    <p style="opacity: 0.8; margin-bottom: 0;">查 build skill → test skill → hdc / flash / PR review skill</p>
  </a>
</div>

## OpenHarmony 需求分析与开发作业线

| 作业阶段 | 工作流入口 | 适用场景 | 出口 |
|---|---|---|---|
| 需求分析与设计工作流（Requirement workflow） | `ohos-req-intake-orchestration` | 原始需求尚需澄清、分析和设计评审 | `AR.md` |
| 需求开发工作流 | `ohos-ar-dev-workflow` | 已有可开发 AR，需要推进 P0-P8 | PR + CI + 签名证据 |

```text
原始需求 → 需求分析与设计工作流（按需）→ AR.md ──显式交接──→ 需求开发 P0 → … → P8
```

需求分析与设计工作流是作业线的按需前置阶段；已有明确 AR 时可以直接进入需求开发。交接前后的门禁状态相互隔离，需求开发在 P1 会基于当前源码 HEAD 复核动态事实。所有可安装能力只从根 [`skills/`](/reference/skill-map) 同步。

## 推荐入口

- [完整生命周期图](/workflow/lifecycle-overview) — 从 P0 到 P8 的全生命周期说明
- [第一个示例](/examples/new-feature-end-to-end) — 从一个新 AR 到上库的完整路线
- [FAQ](/reference/faq) — 高频误解速查

## 关于知识库

OpenHarmony 知识库只提供稳定所有权导航。代码事实全部回到当前源码仓、构建、测试和运行证据确认——详见 [知识库栏目](/knowledge-base/)。

## 仓库地址

本项目在两个平台同步托管，内容一致：

- **GitCode**（主仓）：[gitcode.com/mgce1/AI-AR-workflow](https://gitcode.com/mgce1/AI-AR-workflow)
- **GitHub**（镜像 + 文档站部署源）：[github.com/mgces/AI-AR-workflow](https://github.com/mgces/AI-AR-workflow)

本文档站由 GitHub Actions 从 GitHub 仓库构建部署：<https://mgces.github.io/AI-AR-workflow/>。
