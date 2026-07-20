# OpenHarmony 当前代码知识库

更新时间：2026-07-13

> **本目录是知识库的版本管理副本。** 真源部署在 OpenHarmony 源码仓的
> `$OHOS_ROOT/specs/knowledge-base/`(生成器需在源码仓根运行,读取 `repo list` /
> `bundle.json` / `out/preloader`)。**下文所有 `specs/knowledge-base/...` 命令路径均相对
> `$OHOS_ROOT`**;在本副本里直接照抄会找不到文件——请在源码仓 `$OHOS_ROOT` 下执行,
> 或把 `specs/knowledge-base` 替换为本副本目录 `openharmony-knowledge-base`。

## 使用入口

- [详细使用指南](USAGE.md)
- [知识库信息架构](INFORMATION_ARCHITECTURE.md)
- [OpenHarmony 代码知识库 Skill](skills/ohos-code-knowledge-base/SKILL.md)(本副本自带)

后续分析任意目录或子系统时，可以直接调用 `$ohos-code-knowledge-base`，完成全局索引、进程树、功能说明、变化摘要和覆盖验证。

知识库按“横向视图”和“功能所有权树”组织，不再把具体功能与系统/产品/子系统并列。

## 横向视图

### 系统架构

- [OpenHarmony 全局系统架构](architecture/system.md)
- [构建、启动与运行链路](architecture/build-runtime.md)

这里描述跨子系统的公共结构，不承载某个具体功能的实现分析。

### 产品

- [rk3568 产品画像](products/rk3568/README.md)

产品视图回答板级、内核、部件选择、feature 和安全配置，不复制子系统内部能力。

### 工作区

- [工作区总览](workspace/overview.md)
- [当前工作树状态](workspace/state.md)

工作区视图是源码 checkout 和构建输出的时间快照，不属于运行时架构。

### 源码域

- [Foundation 功能与全域索引](source-domains/foundation/README.md)
- [HiviewDFX 功能与全域索引](source-domains/hiviewdfx/README.md)

源码域按物理目录提供全量覆盖，再映射到子系统所有权树。Foundation 当前覆盖 117 个 Git 子仓、115 个部件和 27,239 个静态 GN 目标。

每个 Foundation 子系统都有功能全景，每个部件都有独立功能说明；另外识别了 68 个真实运行进程、79 条 init 服务配置和 108 条 System Ability 配置。

## 功能所有权树

- [rk3568 子系统目录](subsystems/README.md)
  - [HiviewDFX 子系统](subsystems/hiviewdfx/README.md)
    - [Hiview 进程](subsystems/hiviewdfx/processes/hiview/README.md)
      - [Reliability 能力域](subsystems/hiviewdfx/processes/hiview/capabilities/reliability/README.md)

首页导航只展示到稳定能力域。具体功能必须继续放入所属子系统、组件/进程和能力域内部，不在根 README 展开。

## 机器索引

以下文件由 [generate-global-index.sh](tools/generate-global-index.sh) 生成：

- [projects.tsv](generated/projects.tsv)：512 个 Git 子仓。
- [components.tsv](generated/components.tsv)：552 个 `bundle.json` 组件。
- [rk3568-parts.tsv](generated/rk3568-parts.tsv)：387 个 rk3568 有效部件。
- [workspace-summary.json](generated/workspace-summary.json)：机器可读汇总。

Foundation 专项索引由 [generate-foundation-index.sh](tools/generate-foundation-index.sh) 生成：

- [Foundation repositories.tsv](generated/foundation/repositories.tsv)：117 个 Git 子仓。
- [Foundation components.tsv](generated/foundation/components.tsv)：115 个部件。
- [Foundation modules.tsv](generated/foundation/modules.tsv)：27,239 个静态 GN 目标。
- [Foundation processes.tsv](generated/foundation/processes.tsv)：68 个运行进程。
- [Foundation runtime-entities.tsv](generated/foundation/runtime-entities.tsv)：init 和 SA 运行证据。
- [Foundation summary.json](generated/foundation/summary.json)：18 个子系统的聚合摘要。

HiviewDFX 专项索引由 [generate-hiviewdfx-summary.mjs](tools/generate-hiviewdfx-summary.mjs) 生成并由
[verify-hiviewdfx-summary.mjs](tools/verify-hiviewdfx-summary.mjs) 校验：

- [HiviewDFX repositories.tsv](generated/hiviewdfx/repositories.tsv)：16 个 Git 子仓。
- [HiviewDFX components.tsv](generated/hiviewdfx/components.tsv)：16 个部件。
- [HiviewDFX modules.tsv](generated/hiviewdfx/modules.tsv)：1,190 个静态 GN 目标。
- [HiviewDFX verification.md](generated/hiviewdfx/verification.md)：覆盖率和链接验证报告。

刷新：

```bash
bash specs/knowledge-base/tools/generate-global-index.sh
bash specs/knowledge-base/tools/generate-foundation-index.sh
bash specs/knowledge-base/tools/generate-foundation-process-docs.sh
bash specs/knowledge-base/tools/generate-foundation-functional-docs.sh
node specs/knowledge-base/tools/generate-hiviewdfx-summary.mjs
node specs/knowledge-base/tools/verify-hiviewdfx-summary.mjs
```

## 当前快照

| 指标 | 数量 |
| --- | ---: |
| `repo` 子仓 | 512 |
| 可见源码/资源文件 | 1,208,065 |
| `bundle.json` 组件 | 552 |
| 组件声明依赖边 | 6,131 |
| 源码 SA profile | 175 |
| rk3568 有效子系统 | 58 |
| rk3568 有效部件 | 387 |
| 当前脏子仓 | 12 |

## 扩展规范

新增知识节点前先阅读 [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)。模板：

- [子系统模板](templates/subsystem.md)
- [进程模板](templates/process.md)
- [能力域模板](templates/capability.md)
- [具体功能模板](templates/feature.md)
- [给定代码路径的全局索引、进程与功能说明模板](templates/code-path-global-summary.md)

标准路径：

```text
subsystems/<subsystem>/
  processes/<process>/capabilities/<domain>/features/<feature>/
```

无独立进程的库/API 功能使用：

```text
subsystems/<subsystem>/
  components/<component>/capabilities/<domain>/features/<feature>/
```

## 事实优先级

1. 当前源码、产品配置、`bundle.json`、`ohos.build` 和 `BUILD.gn`。
2. `out/preloader/rk3568` 与 `out/rk3568/args.gn`。
3. 当前 Git HEAD 和工作树。
4. 构建、测试、真机和 CI 证据。
5. 知识库人工分析、README、AR 和 PR 描述。

知识库用于定位和组织事实，最终结论仍需回到当前源码与真实运行证据验证。
