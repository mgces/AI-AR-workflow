# P0 环境预检

> 本页拆解 P0 的初始化检查目标、产出证据、通过条件、常见失败、对应 skill。

## 初始化检查目标

P0 是流水线的环境预检阶段——在真正开始一个 AR 之前,确认整套工具链就绪:

- `build.sh` 可用(编译命令按环境 profile 解析,openharmony 为产品 rk3568)
- 编译探针真跑通(GN+ninja+ccache 工具链;HarmonyOS 编译命令占位未填则硬失败)
- `--git-dir` 指向的组件子仓是 git 仓
- `developer_test` 测试框架就绪
- hdc 二进制可解析
- 真机在线(唯一连接目标,自动探测序列号)
- 上库能力(SOFT 告警,不阻塞):gitcode 环境探 oh-gc + gitcode token;gerrit/HarmonyOS 环境探 git remote + commit-msg 钩子

> **环境形态从 init 就区分**。`advance.py init` 必须带 `--environment openharmony|harmonyos`(缺失硬失败);`harmonyos` 时 `--component-type system|chip` 必填。环境相关的编译命令/产物目录/上库后端全部由 `lib/environments.py` 单点解析,门控不再写死。详见 [环境初始化](/getting-started/environment-init)。

## 产出什么证据

落盘到 `$PDIR/evidence/phase0/`:

- `env.json` — 各项能力的校验结果 + 探测到的设备序列号
- `build_probe.log` — 编译探针日志(每仓首次 init 编译一次)

并向 `evidence/manifest.jsonl` 追加一条 HMAC 签名记录。

## 通过条件

`gate_env_init.py` 逐项探测,**HARD 缺失即阻塞**,SOFT 仅告警:

| 能力 | 级别 | 校验内容 |
|---|---|---|
| build | HARD | `./build.sh` 存在(编译命令按环境 profile 解析) |
| compile | HARD | 真实编译探针跑通(环境 profile 的编译命令/横幅;HarmonyOS 占位未填则硬失败) |
| git | HARD | `--git-dir` 指向的组件子仓是 git 仓 |
| testfwk | HARD | `test/testfwk/developer_test/start.sh` 存在 |
| hdc_bin | HARD | 能解析到 hdc 二进制 |
| device | HARD | 唯一真机在线 |
| oh_gc | SOFT | (仅 gitcode)`oh-gc --version` 已装 |
| gitcode_auth | SOFT | (仅 gitcode)`oh-gc auth status` 已登录 |
| git_remote | SOFT | (仅 gerrit)`--git-dir` 有 git remote |
| gerrit_hook | SOFT | (仅 gerrit)`commit-msg` Change-Id 钩子已装 |

全部 HARD 通过 + SOFT 告警 → `verdict=PASS` → `advance --phase 0`。

## 常见失败

| 现象 | 原因 / 处理 |
|---|---|
| `environment not confirmed` | 裸 `init` 缺 `--environment` 硬失败;先跟用户确认 openharmony / harmonyos,再传 `--environment` |
| `--component-type is required` | `--environment harmonyos` 缺组件类型;补 `--component-type system|chip` |
| HarmonyOS 编译命令占位未填 | `lib/environments.py` 的 harmonyos profile 为 UNSET 占位;填入真实编译命令后重跑 |
| `git_head` BAD | 用 `--git-dir` 指定**组件子仓**,而非 repo 根(根目录无 `.git`) |
| `oh_gc`/`gitcode_auth` BAD | 仅 gitcode 环境探测;SOFT 告警不阻塞;按提示 `npm i -g @oh-gc/cli@latest` 装 CLI、`oh-gc auth login` 配 token |
| `git_remote`/`gerrit_hook` BAD | 仅 gerrit/HarmonyOS 环境探测;SOFT 告警不阻塞;P8 push 前配好 Gerrit 远端与 commit-msg 钩子 |
| `device_online` BAD | 检查 hdc daemon 与 `HDC_HOST_OVERRIDE`/`DEVICE_SERIAL`;WSL 用 `HDC_WIN_PORT=10086` |
| 仓根不像 OHOS 仓 | 重新在 OHOS 仓根目录打开 Agent,或用 `--repo` / `OHOS_ROOT` 指定 |

## 对应 skill

- [`ohos-ar-dev-init`](/skill-playbooks/environment-init) — 一次性环境配置与能力校验
- `gate_env_init.py` / `advance.py` / `lib/device.sh` 在 `ohos-ar-dev-phases/scripts/`

## 延伸阅读

- [环境初始化](/getting-started/environment-init) — 详细的环境变量与设备连接方式
- [run 目录结构参考](/reference/pipeline-layout)
