---
name: ohos-ar-dev-init
description: >
  一次性初始化并校验 OHOS 生命周期流水线所需的各项能力:代码仓/build.sh/developer_test/
  hdc 二进制/真机连通(自动探测设备序列号)/oh-gc,建立 specs/pipeline 目录约定,写
  specs/initialized.flag。当用户首次跑 ohos-ar-dev-workflow 或说"初始化流水线环境"时触发。
---

# ohos-ar-dev-init — 流水线环境初始化与能力校验

mirror aid-init,面向 OHOS 全量仓 + 真机。一次性、幂等。**不写死任何机器特定值**
(IP、设备序列号都在运行时解析/探测)。

## 脚本位置(重要)

本技能目录**只含 SKILL.md**,没有自己的 `scripts/`。所有门控脚本(`gate_env_init.py`、
`advance.py`)与公共库(`lib/gatelib.py`、`lib/device.sh`)统一放在**同级技能
`ohos-ar-dev-phases/scripts/`** 里(它们共享 `gatelib`/`advance`,不重复一份)。
本技能引用到的 `gate_env_init.py`、`lib/device.sh` 都指这里:

```bash
AGENT_SKILLS_DIR="${AGENT_SKILLS_DIR:-$HOME/.claude/skills}"
S="$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts"   # 安装态;包内则 <workflow>/skills/ohos-ar-dev-phases/scripts
ls "$S/gate_env_init.py" "$S/lib/device.sh"     # 确认存在
```

## 连接配置(可移植,全部来自环境,不硬编码)

`$S/lib/device.sh` 按以下优先级解析,换机器无需改代码:

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 上的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE`(host:port)→ 若设了 `$HDC_WIN_PORT` 则用 **WSL 默认网关 IP** :端口 → 否则原生 hdc(USB/本地 daemon,不加 `-s`) |
| 设备序列号 | `$DEVICE_SERIAL` → 否则 `hdc list targets` 的**唯一**连接目标(0 个或多个则报错让你配) |

- 原生 USB 的 Linux:开箱即用。
- WSL→Windows hdc 桥接:`export HDC_WIN_PORT=10086`(IP 自动从默认网关取,不写死)。
- 任意远端/多设备:`export HDC_HOST_OVERRIDE=<ip:port>` 和/或 `export DEVICE_SERIAL=<serial>`。

## 能力校验(P0 门控 `$S/gate_env_init.py` 落地,产签名证据)

逐项探测,**HARD 缺失即阻塞**,SOFT 仅告警;并把探测到的设备序列号回填进
`pipeline.json` 与 `evidence/phase0/env.json`。先 `advance.py init` 建好运行态再跑校验:

```bash
# 环境形态由用户按 AR 确定:init 必须用 --environment 指定,裸 init 缺 --environment 会硬失败。
#   --environment openharmony            gitcode + rk3568(默认形态)
#   --environment harmonyos --component-type system|chip   HarmonyOS(Gerrit 上库,系统/芯片组件)
# 编译部件由用户按 AR 确定,init 不再静默默认为 hiview:裸 init(三个参数都不给)会硬失败,
# 逼你停下来跟用户确认要编译哪个部件。确认后二选一放行:
#   A. 本 AR 改的组件:显式传 --git-dir/--build-target/--part
#        --git-dir      被编译组件子仓,如 base/hiviewdfx/hiview
#        --build-target GN 目标,如 hiview_package
#        --part         developer_test part,如 hiviewdfx
#   B. 用户确认沿用 hiview 默认部件:加 --confirm-defaults(不传任何组件参数时才需要)
python3 $S/advance.py --pipeline-dir "$PDIR" init \
    --environment openharmony \
    [--git-dir <组件路径> --build-target <gn目标> --part <testpart> | --confirm-defaults]
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"            # 逐项能力校验,产证据
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
```

> 💡 **环境形态是人工强确认点。** 跑 init 前先用 `AskUserQuestion` 问清本 AR 属于哪种环境:
> `openharmony`(gitcode/rk3568,上库走 oh-gc)/ `harmonyos-系统组件` / `harmonyos-芯片组件`
> (HarmonyOS,上库走 Gerrit)。缺 `--environment` 会**硬失败**;`--environment harmonyos`
> 时 `--component-type system|chip` **必填**。HarmonyOS 两种组件编译命令不同且**目前为占位**,
> P0/P4 编译门与 P8 上库门会在 `lib/environments.py` 未填时硬失败并打印"待填"提示,绝不静默跑错。

> 💡 **编译部件是人工确认点。** 跑 init 前先用 `AskUserQuestion` 问清用户本 AR 要编译的部件
> (默认候选:hiview 部件 git_dir=`base/hiviewdfx/hiview` / build_target=`hiview_package` /
> part=`hiviewdfx`)。用户答别的组件 → 传三个参数;用户确认沿用 hiview → 加 `--confirm-defaults`。
> 裸 `init`(三者皆缺又不带 `--confirm-defaults`)会**硬失败并打印确认指引**,绝不静默编译 hiview。


| 能力 | 级别 | 校验内容 | 服务阶段 |
|---|---|---|---|
| build | HARD | `./build.sh` 存在(编译命令按环境 profile 解析,openharmony 为产品 rk3568) | P2 |
| compile | HARD | **真实编译探针**:默认 `--build-target hiview_package`,用**环境 profile 的编译命令/横幅**跑通(HarmonyOS 占位未填则硬失败)。**仅每个仓首次 init 编译一次**,通过后写稳定标记 `specs/.build-probe-ok`,之后 init 自动跳过;`--force-build-probe` 强制重编,`--skip-build-probe` 跳过 | P2 |
| git | HARD | `--git-dir` 指向的**组件子仓**是 git 仓(记录 HEAD) | P1/P6 |
| testfwk | HARD | `test/testfwk/developer_test/start.sh` 存在 | P3/P5 |
| hdc_bin | HARD | 能解析到 hdc 二进制 | P0/P4/P5 |
| device | HARD | 唯一真机在线(自动探测并记录序列号) | P4/P5 |
| oh_gc | SOFT | (**仅 gitcode 环境**)gitcode CLI `oh-gc` 已安装(`oh-gc --version`) | P8 |
| gitcode_auth | SOFT | (**仅 gitcode 环境**)gitcode **token 已配置**(`oh-gc auth status` 为已登录) | P8 |
| git_remote | SOFT | (**仅 gerrit/HarmonyOS 环境**)`--git-dir` 有 git remote(Gerrit push 目标) | P8 |
| gerrit_hook | SOFT | (**仅 gerrit/HarmonyOS 环境**)`commit-msg` 的 Change-Id 钩子已装(review 需要) | P8 |

> **上库能力按环境分支探测**(取自 `--environment`,由 `lib/environments.py` 的 upload_backend 决定):
> - `gitcode`(openharmony):探 `oh_gc` + `gitcode_auth`。未配置时 P0 打印指引:
>   `npm i -g @oh-gc/cli@latest` 安装、`oh-gc auth login` **手动登录配置 token**
>   (存于 `~/.config/gitcode-cli/config.json`,`oh-gc auth status` 验证)。
> - `gerrit`(harmonyos):探 `git_remote` + `gerrit_hook`。
>
> 二者都是 **P8 上库才用到,SOFT:缺失只告警、不阻塞 P0**,P8 前配好即可。

> 💡 compile 探针默认编译 `hiview_package` 来验证整套构建工具链可用(GN+ninja+ccache)。
> **每个仓只在首次 init 编译一次**(通过后写 `specs/.build-probe-ok` 标记),之后 init 自动跳过,
> 避免每次都重编。环境若有变动用 `--force-build-probe` 重验;明确不想编译用 `--skip-build-probe`。
> 探针日志落 `evidence/phase0/build_probe.log` 并计入签名证据。

## 仓根(OHOS_ROOT)解析与纠错

`advance.py init --repo` 默认取 **`$OHOS_ROOT`,否则 Agent 打开的当前目录(cwd)**。P0 会先校验
该目录是否像 OHOS 仓根(同时有 `build.sh` 与 `test/testfwk/developer_test/`)。**不像就立即失败**
并给出可操作提示:

```
PHASE 0 FAIL — '<dir>' does not look like an OHOS source root ...
  * reopen your Agent in your OHOS repo root, or
  * re-run `advance.py init` with --repo <ohos_root>, or
  * export OHOS_ROOT=<ohos_root> before init.
```

即:**默认就在你打开的目录上探测;若目录不对,按提示把 Claude 重新在 OHOS 仓根目录打开**
(或用 `--repo` / `OHOS_ROOT` 指定),再重跑 init。

> ⚠️ OHOS 根目录不是 git 仓;`git` 校验针对你 `--git-dir` 指定的组件路径
> (如 `base/hiviewdfx/hiview`),不是仓根。

## 产物
- `specs/initialized.flag`(记录仓路径、产品、连接方式、探测到的序列号、检查时间)。
- 之后由 `ohos-ar-dev-workflow` 为每个 AR 在 `specs/pipeline/{date}-{slug}/` 起独立流水线。

> 本技能负责首次环境就绪与 flag 落盘;P0 `$S/gate_env_init.py` 负责每次运行的可验证能力预检
> (它产 HMAC 签名证据并允许 `advance --phase 0`)。脚本本体在 `ohos-ar-dev-phases/scripts/`。
