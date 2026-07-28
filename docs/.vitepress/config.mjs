import { defineConfig } from 'vitepress'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// AI-AR Workflow documentation site configuration
// 顶层导航按设计方案 §5 排序：开始使用 → 开发 Workflow → Skill 实战 → 示例 → 知识库 → 参考 → 案例归档
export default defineConfig({
  extends: resolve(dirname(fileURLToPath(import.meta.url)), 'theme'),
  title: 'AI-AR Workflow',
  description: '面向 OpenHarmony 研发的证据门控代码开发流水线',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#3aa676' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '开始使用', link: '/getting-started/' },
      { text: '开发 Workflow', link: '/workflow/' },
      { text: 'Skill 实战', link: '/skill-playbooks/' },
      { text: '示例', link: '/examples/' },
      { text: '知识库', link: '/knowledge-base/' },
      { text: '参考', link: '/reference/' },
      { text: '案例归档', link: '/cases/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: '开始使用',
          items: [
            { text: '概览', link: '/getting-started/' },
            { text: '什么是 AI-AR Workflow', link: '/getting-started/what-is-ai-ar-workflow' },
            { text: '5 分钟快速开始', link: '/getting-started/quick-start' },
            { text: '环境初始化', link: '/getting-started/environment-init' },
            { text: '首次运行一个 AR', link: '/getting-started/first-ar-run' },
          ],
        },
      ],
      '/workflow/': [
        {
          text: '开发 Workflow',
          items: [
            { text: '概览', link: '/workflow/' },
            { text: '生命周期总览', link: '/workflow/lifecycle-overview' },
            { text: 'P0 环境预检', link: '/workflow/phase-0-init' },
            { text: 'P1 设计与开发', link: '/workflow/phase-1-design-and-develop' },
            { text: 'P2 代码开发', link: '/workflow/phase-2-build' },
            { text: 'P3 测试开发', link: '/workflow/phase-3-test' },
            { text: 'P4 编译', link: '/workflow/phase-4-build' },
            { text: 'P5 单测执行', link: '/workflow/phase-5-test-ut' },
            { text: 'P6 真机功能', link: '/workflow/phase-6-device' },
            { text: 'P7 质量验证', link: '/workflow/phase-7-quality' },
            { text: 'P8 上库', link: '/workflow/phase-8-upload' },
            { text: 'Consent 与 Reset', link: '/workflow/consent-and-reset' },
            { text: 'Evidence 与 Gates', link: '/workflow/evidence-and-gates' },
          ],
        },
      ],
      '/skill-playbooks/': [
        {
          text: 'Skill 实战',
          items: [
            { text: '概览', link: '/skill-playbooks/' },
            { text: 'Workflow 编排器', link: '/skill-playbooks/workflow-orchestration' },
            { text: '环境初始化', link: '/skill-playbooks/environment-init' },
            { text: '编译与诊断', link: '/skill-playbooks/build-and-diagnosis' },
            { text: '单测生成', link: '/skill-playbooks/unit-test-generation' },
            { text: '真机调试 hdc', link: '/skill-playbooks/device-debug-and-hdc' },
            { text: '增量构建与刷机', link: '/skill-playbooks/build-and-flash' },
            { text: 'GitCode PR 与 review', link: '/skill-playbooks/gitcode-pr-and-review' },
            { text: 'Skill 组合拳', link: '/skill-playbooks/common-combinations' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '概览', link: '/examples/' },
            { text: '新增功能端到端', link: '/examples/new-feature-end-to-end' },
            { text: '改码回退重走', link: '/examples/code-fix-and-rewalk' },
            { text: '只补测试', link: '/examples/test-only-follow-up' },
            { text: '真机验证示例', link: '/examples/device-verification-example' },
            { text: '上库 CI 示例', link: '/examples/upload-ci-example' },
          ],
        },
      ],
      '/knowledge-base/': [
        {
          text: '知识库',
          items: [
            { text: '概览', link: '/knowledge-base/' },
            { text: '如何支撑 workflow', link: '/knowledge-base/how-it-supports-workflow' },
            { text: '快速上手', link: '/knowledge-base/getting-started' },
            { text: '架构总览', link: '/knowledge-base/architecture-overview' },
            { text: '源代码域', link: '/knowledge-base/source-domains' },
            { text: '子系统', link: '/knowledge-base/subsystems' },
            { text: '产品', link: '/knowledge-base/products' },
            { text: 'workspace 与生成索引', link: '/knowledge-base/workspace-and-generated-indexes' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '概览', link: '/reference/' },
            { text: '状态机', link: '/reference/workflow-state-machine' },
            { text: '门控契约', link: '/reference/gate-contract' },
            { text: 'run 目录结构', link: '/reference/pipeline-layout' },
            { text: '关键命令', link: '/reference/key-commands' },
            { text: 'Skill 映射', link: '/reference/skill-map' },
            { text: 'FAQ', link: '/reference/faq' },
          ],
        },
      ],
      '/cases/': [
        {
          text: '案例归档',
          items: [
            { text: '概览', link: '/cases/' },
            { text: '线程泄漏检测', link: '/cases/thread-leak-detector' },
            { text: 'AppFreeze �恢复屏障', link: '/cases/appfreeze-recovery-barrier' },
            { text: '弱模型优化', link: '/cases/weak-model-optimization' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://atomgit.com' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 AI-AR Workflow',
    },

    search: {
      provider: 'local',
    },

    outline: { level: 2, label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '上次更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '栏目菜单',
    darkModeSwitchLabel: '深色模式',
  },
})
