# 文档站部署与双仓库同步

> 本页说明本项目的仓库托管方式，以及文档站（VitePress）如何构建与自动部署。
> 是「用到时查」的运维参考，不是新手入口。

## 两个仓库

项目在两个平台同步托管，**内容一致**：

| 平台 | 地址 | 角色 |
|---|---|---|
| GitCode | <https://gitcode.com/mgce1/AI-AR-workflow> | 主仓（`fetch` 来源） |
| GitHub | <https://github.com/mgces/AI-AR-workflow> | 镜像 + 文档站部署源 |

在线文档站：<https://mgces.github.io/AI-AR-workflow/>

::: tip 为什么两个仓库
GitCode 是开发主仓；GitHub 仅用于跑 GitHub Pages（GitCode 无原生 Pages 服务）。两边不是自动镜像——靠一条 `git push` 同时推送保持一致（见下）。
:::

## 一条命令推双远端

`origin` 的 `fetch` 只指向 GitCode，`push` 配了 **两个** URL（GitCode + GitHub），所以 `git push` 一次两边都更新：

```bash
git remote -v
# origin  https://gitcode.com/mgce1/AI-AR-workflow.git (fetch)
# origin  https://gitcode.com/mgce1/AI-AR-workflow.git (push)
# origin  git@github.com:mgces/AI-AR-workflow.git       (push)
```

日常提交后：

```bash
git push origin main   # 同时推到 GitCode 与 GitHub
```

### 首次配置（换机器/换克隆时重建）

```bash
# GitCode 作为唯一 fetch 源（clone 后默认已是）
git remote set-url --add --push origin https://gitcode.com/mgce1/AI-AR-workflow.git
git remote set-url --add --push origin git@github.com:mgces/AI-AR-workflow.git
```

> GitHub 用 SSH URL（`git@github.com:...`）免密推送，需本机 SSH key 已加到 GitHub 账号。
> 验证：`ssh -T git@github.com` 回 `Hi mgces!` 即就绪。

## 文档站自动部署

推送到 GitHub `main` 且改动了 `docs/**` 时，GitHub Actions 自动构建并发布 Pages，**无需手动操作**。

- 工作流：[`.github/workflows/deploy-docs.yml`](https://github.com/mgces/AI-AR-workflow/blob/main/.github/workflows/deploy-docs.yml)
- 流程：`docs/` 下 `npm ci` → `vitepress build` → 上传 `docs/.vitepress/dist` → 部署到 Pages
- 触发：`push main`（仅 `docs/**` 变更）或 Actions 页手动 `Run workflow`

### 一次性开启（仅首配）

在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（不是 "Deploy from a branch"）。开启后每次符合条件的 push 自动部署。

## 子路径 base（改仓库名时必看）

文档站部署在 **项目子路径** `https://mgces.github.io/AI-AR-workflow/` 下，因此：

- `docs/.vitepress/config.mjs` 设了 `base: '/AI-AR-workflow/'`。
- `docs/index.md` 里几处**裸 HTML** `<a href="/AI-AR-workflow/...">` 手动带了前缀——VitePress 只给 Markdown 链接和 `logo`/hero image 自动补 `base`，裸 HTML 不补，漏了会在子路径下 404。

::: warning 改仓库名 / 换成用户站点时
若把 GitHub 仓库改名，或换成用户/组织站点（`<user>.github.io`，根路径部署），要**同步**：
1. 改 `config.mjs` 的 `base`（用户站点根路径时设为 `'/'`）；
2. 改 `docs/index.md` 里所有裸 `<a href="/AI-AR-workflow/...">` 的前缀。
:::

## 本地预览

```bash
cd docs
npm ci                # 首次
npm run docs:dev      # 本地开发预览（热更新）
npm run docs:build    # 构建，产物在 docs/.vitepress/dist
npm run docs:preview  # 预览构建产物
```

`docs/.vitepress/dist`、`docs/.vitepress/cache`、`docs/node_modules` 均已 gitignore——只提交源码，构建产物由 CI 生成。
