# ⏱️ 5 分钟快速开始

::: tip 🚀 大部分人都从这里开始
这是整站的推荐入口——不管你是第一次用 workflow，还是只想快速跑通一个 AR，这一页给你**最短可执行路径**：5 步跑通，每步标注"你做什么 / workflow 做什么 / 预计多久"。

**不需要先读完整生命周期**。跑通后再回头看 [生命周期总览](/workflow/lifecycle-overview) 理解全局。
:::

## 获取代码

本项目在两个平台同步托管，内容一致，任选其一 clone：

```bash
# GitCode（主仓）
git clone https://gitcode.com/mgce1/AI-AR-workflow.git

# GitHub（镜像 + 文档站部署源）
git clone https://github.com/mgces/AI-AR-workflow.git
```

- GitCode：<https://gitcode.com/mgce1/AI-AR-workflow>
- GitHub：<https://github.com/mgces/AI-AR-workflow>
- 在线文档站：<https://mgces.github.io/AI-AR-workflow/>

## 前置条件

按顺序确认就绪，**第一项最优先**：

### 1. 同步 skills 到 Agent

本包 skills 是真源，先同步到 Agent 技能目录：

```bash
bash sync-skills.sh --agent claude       # 默认兼容旧用法
bash sync-skills.sh --agent codex        # ~/.codex/skills/
bash sync-skills.sh --target "$HOME/.my-agent/skills"  # 任意 Agent
```

之后**重启 Agent 会话**，说「跑流水线」即可触发 `ohos-ar-dev-workflow`。

### 2. OHOS 代码下载与编译环境配置

| 项 | 说明 | 新电脑没环境？ |
|---|---|---|
| OHOS 代码仓 | repo 多仓树，如 `$OHOS_ROOT`（`git@gitcode.com:openharmony/manifest.git`，分支 `master`） | 用 `ohos-env-setup` skill 从零复现（见下） |
| 编译环境 | `./build.sh` 可用，工具链由 `prebuilts/` 提供（`build/prebuilts_download.sh` 一键下载） | 同上，`ohos-env-setup` 一键全装好 |

::: details 🆕 新电脑从零装环境（ohos-env-setup skill）
在全新 Ubuntu 22.04/24.04 或 WSL2（x86_64）上从零复现 OpenHarmony 全量源码编译环境。优先跑打包脚本（5 步串好，支持分阶段单跑）：

```bash
bash <skill_dir>/scripts/ohos_env_bootstrap.sh            # 全流程 all
bash <skill_dir>/scripts/ohos_env_bootstrap.sh <stage>    # 单跑：apt|repo|sync|prebuilts|verify
bash <skill_dir>/scripts/ohos_env_bootstrap.sh --help     # 全部用法
# 常用变量：
#   CODE_DIR=~/openharmony/code   MANIFEST_REV=ebe9aa61（完全复现）
#   MANIFEST=https://gitcode.com/openharmony/manifest.git（HTTPS）
#   NPM_REGISTRY/PYPI_URL/TRUSTED_HOST（内网镜像）
#   SKIP_APT=1 / SKIP_SYNC=1 / SKIP_PREBUILTS=1（all 流程里跳过某段）
```

核心认知：OHOS 编译工具链（clang / gn / ninja / node / python / rustc / cmake / ohos-sdk）**几乎全部由源码树内的 `prebuilts/` 提供**，通过 `build/prebuilts_download.sh` 一键下载；该脚本还会自动创建 `oh_venv` 并装好构建所需 pip 包。系统层面只需少量 apt 依赖 + git/git-lfs + repo 工具，其余交给脚本。**不要用系统 python/node 去编译**，也**不要 sudo 跑 build**。
:::

### 3. 真机与 Agent

| 项 | 说明 |
|---|---|
| 真机 rk3568 | 经 hdc 可达（序列号自动探测，不写死） |
| Agent 已装 skills | 本 workflow 的全部 skills 已同步到 Agent 技能目录（见前置条件 1） |

> 如果环境还没就绪（build.sh / hdc / 真机 / oh-gc 不会配），先看 [环境初始化](/getting-started/environment-init)。

## 5 步时间预估

| 步 | 做什么 | 预计 | 会停下等人工？ |
|---:|---|---|:---:|
| 1 | 初始化环境（`/ohos-ar-dev-init`） | 2 分钟 | 否（但要确认编译部件） |
| 2 | 准备一个 AR 文本 | 1 分钟 | 否 |
| 3 | 调用编排器（`/ohos-ar-dev-workflow <AR>`） | 30 秒 | 否（随后自动推进） |
| 4 | 看状态推进方式 | 10 秒 | 否 |
| 5 | 知道哪几处停下等人工确认 | — | **是**（P1/P6/P7/P8） |

> 预计基于环境已就绪。首次编译探针（每仓首次 init）会多花几分钟编译 `hiview_package` 验证工具链。

## 步骤详解

每步用三列结构：**你做什么 / workflow 做什么 / 预计多久**。

### 步骤 1：初始化环境

| 你做 | workflow 做 | 预计 |
|---|---|---|
| 在 Agent 里说 `/ohos-ar-dev-init`,先确认**环境形态**(openharmony / harmonyos-系统 / harmonyos-芯片)与要编译的部件(默认候选 hiview 部件) | 逐项校验 build/compile/git/testfwk/hdc/真机,设备序列号回填,写 `specs/initialized.flag` | 2 分钟（首次含编译探针更久） |

> 💡 **环境形态 + 编译部件都是人工确认点**。跑 init 前先跟用户确认本 AR 属于哪种环境(`--environment` 缺失硬失败;harmonyos 时 `--component-type system|chip` 必填)、要编译哪个部件。裸 init 会硬失败,让用户输入,默认路径是 openharmony + hiview 仓。详见 [环境初始化](/getting-started/environment-init)。

### 步骤 2：准备一个 AR

| 你做 | workflow 做 | 预计 |
|---|---|---|
| 把已澄清的架构需求（AR）准备好——一段说明"在哪个组件下、做什么、阈值、调用什么能力、产物落哪"的需求文本 | — | 1 分钟 |

### 步骤 3：调用编排器

| 你做 | workflow 做 | 预计 |
|---|---|---|
| 在 Agent 里说 `/ohos-ar-dev-workflow <AR 文本>` | 为这个 AR 在 `specs/pipeline/{date}-{slug}/` 建独立流水线，开始按阶段推进 | 30 秒启动，随后自动推进 |

示例：

```
/ohos-ar-dev-workflow 在 base/hiviewdfx/hiview 下面新增一个线程泄漏检测插件，阈值 3000，
超过阈值后只触发一次调用，调用 hidumper sa 的能力获取进程线程维测，然后通过
LogCatcherUtils::DumpStacktrace 抓取当前应用调用栈，并保存一份线程泄漏文件在
data/log/reliability/resource_leak/thread_leak/ 中
```

### 步骤 4：看状态推进方式

| 你做 | workflow 做 | 预计 |
|---|---|---|
| 用 `advance.py status` 查当前阶段 | 每轮循环 `refresh_todo → 做事 → 跑门控 → advance` 自动推进 | 10 秒 |

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" status
```

### 步骤 5：知道哪几处停下等人工确认

| 你做 | workflow 做 | 预计 |
|---|---|---|
| 在 P1/P6/P7/P8 证据 PASS 后，核对结果并 `consent` | 其余阶段由门控脚本自动放行，不停 | — |

只有这四处会停下等人工签名 consent 确认：

| 阶段 | 停下原因 | consent 命令 |
|---|---|---|
| P1 设计 | 设计固化是后续契约真源，错了后面全错 | `consent --phase 1` |
| P6 真机 | 证据 PASS 后等人工核对真机真实结果 | `consent --phase 6` |
| P7 质量 | 证据 PASS 后等人工核对质量/review | `consent --phase 7` |
| P8 上库 | push 是唯一对外不可逆动作 | `consent --phase 8` |

其余阶段（P0/P2/P3/P4/P5）由门控脚本自动放行。

## 跑通了？下一步去哪

根据你跑通后的状态选下一步：

::: details ✅ 一气跑到 P8 上库完成
流水线完成。归档产物到 `products/`：

```bash
python3 archive_product.py --pipeline-dir "$PDIR" --product-dir products/<run> --include-reports
```

只产脱敏摘要，原始可验签证据留在本地（已 gitignore）。详见 [首次运行一个 AR](/getting-started/first-ar-run)。
:::

::: details 🟢 还在跑，想理解产物结构
看 [首次运行一个 AR](/getting-started/first-ar-run) —— run 目录如何创建、PDIR 里有什么、evidence/reports/pipeline.json 的关系。
:::

::: details 🟡 跑到一半想理解完整生命周期
看 [生命周期总览](/workflow/lifecycle-overview) —— 每个阶段的输入/产物/是否停下人工确认。
:::

::: details 🔵 想看一个完整端到端示例对照
看 [新增功能端到端](/examples/new-feature-end-to-end) —— 从一个新 AR 到上库的完整路线，每步标注用户/workflow/gate 各做什么。
:::

::: details ❌ 编译失败了
看 [Skill 实战:编译与诊断](/skill-playbooks/build-and-diagnosis) —— 定位 build.log、narrow rebuild、何时需要刷机。
改了功能代码必须 `advance.py reset` 回 P1 重走（功能指纹漂移会被拒）。
:::

::: details ❌ 真机 marker 抓不到 / hash 不一致
看 [真机验证示例](/examples/device-verification-example) —— deploy script、scenario script、marker 思路。
scenario 必须把 `$GATE_NONCE` 打进设备日志，否则无法证明日志是本次的。
:::

::: details ❌ 想改功能代码继续当前阶段
不行。改功能代码必须 `advance.py reset --reason "<改了什么>"` 回 P1 重走——这是硬控制（功能指纹漂移）。
只有新增独立测试文件不触发漂移，可继续。详见 [改码回退重走示例](/examples/code-fix-and-rewalk)。
:::

## 延伸阅读

- [环境初始化](/getting-started/environment-init) — 步骤 1 的详解：能力校验、设备连接、编译部件确认
- [首次运行一个 AR](/getting-started/first-ar-run) — 步骤 3~4 的详解：run 目录、PDIR、产物结构
- [生命周期总览](/workflow/lifecycle-overview) — 9 阶段的完整说明
- [新增功能端到端示例](/examples/new-feature-end-to-end) — 完整端到端路线演示
- [Consent 与 Reset](/workflow/consent-and-reset) — 步骤 5 的人工确认点与功能指纹
