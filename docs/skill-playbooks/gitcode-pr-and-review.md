# GitCode PR 与 review skill 实战

> 围绕 `ohos-ci-gitcode-cli-usage` + `ohos-dev-gitcode-pr-review`:展示 issue / PR 的最小路径、review 草稿与显式确认提交、PR URL / head / repo 的常见坑。

## ohos-ci-gitcode-cli-usage

用 `oh-gc` CLI 从终端管理 GitCode 仓库:建/review PR、分配 reviewer/tester、管 label/release、仓库设置。

### issue / PR 的最小路径

```bash
oh-gc issue create --repo <owner/repo> --title "<标题>" --body "<描述>"
oh-gc pr create --repo <owner/repo> --head <分支> --base master --issue <N> --title "<标题>"
```

**关键**:`--issue <N>` 必填——CI 门禁只对绑定 Issue 的 PR 触发。

### 命令覆盖

- 建 issue / PR
- 分配 reviewer / tester
- 管 label / release
- 仓库设置
- PR review

## ohos-dev-gitcode-pr-review

从 PR 号或 URL 拉取 PR metadata / diff / comments,结合本地仓库代码检查,产出具体 findings 或 GitCode 提交草稿。

### review 草稿与显式确认提交

- 先拉 PR 全量上下文(metadata + diff + comments)
- 结合本地代码定位具体问题
- 产出 review 草稿(findings)
- **显式确认**后才提交到 GitCode(不自动提交)

## PR URL / head / repo 的常见坑

| 常见坑 | 处理 |
|---|---|
| PR URL 格不规范 | 用 `oh-gc pr view --pr <N>` 拉取,不手解析 URL |
| head SHA 与 push SHA 不一致 | `gate_upload_ci.py` 校验 SHA 绑定,不一致即 FAIL |
| repo slug 写错 | 用 `owner/repo` 格式,别用完整 URL |
| base 分支错 | 默认 master,按需 `--base` 指定 |

## 与 workflow 配合

P6(物理 phase 8)上库阶段:

| 步骤 | skill | 做什么 |
|---|---|---|
| A 本地自检 | `code-ruleset-style-check` + `ohos-dev-security-code-review` | 产本地自检零问题报告 |
| commit | `git commit -s`(DCO 签名) | 编排器动作 |
| push | `git push` | 编排器动作 |
| 廑 PR | `ohos-ci-gitcode-cli-usage` | 命绑定 Issue 的 PR |
| B PR review | `ohos-dev-gitcode-pr-review` | 产 PR review 零问题报告 |
| CI 分析 | `ohos-ci-openharmony-ci-analysis` | DCP event / build label / artifact |

两道 review 门:

- A 本地自检零问题(commit 前硬控)
- B PR review 零问题(建 PR 后、CI 前硬控)

## 常见误区

- **想不建 issue 直接建 PR**:不行,`--issue N` 必填,CI 门禁只对绑定 Issue 的 PR 触发
- **review 草稿自动提交**:不,必须显式确认才提交
- **PR head SHA 与 push SHA 不一致**:gate 校验 SHA 绑定,不一致即 FAIL
- **本地自检报告有文字但没计数**:gate 只认机器可读计数,文字不算

## 延伸阅读

- [P8 上库阶段](/workflow/phase-8-upload) — 两道 review 门与 issue 绑定
- [上库 CI 示例](/examples/upload-ci-example) — issue → dry run → review → push → PR → CI
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 C 上库前自检
- [关键命令](/reference/key-commands) — oh-gc 常用命令速查
