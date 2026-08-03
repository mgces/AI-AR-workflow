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

> ⚠️ **真机连不上时的话术(面向 Agent)**:P0 的 device 门失败会打印一段**大白话**指引——
> **不要**把 `HDC_HOST_OVERRIDE`/`HDC_WIN_PORT`/`DEVICE_SERIAL` 这些环境变量名甩给用户。
> 只让用户在**插着设备那台电脑**上跑一条命令:`hdc -m -s 0.0.0.0:10086 start`,然后把
> 那台电脑的 **IP 和端口**(如 `192.168.1.23:10086`)报给你。拿到后由**你**在本机
> `export HDC_HOST_OVERRIDE=<ip:port>` 再重跑 init——宏是你内部用的,用户全程只提供 IP:端口。

## 能力校验(P0 门控 `$S/gate_env_init.py` 落地,产签名证据)

> 🚨 **init 分两步,`advance.py init` 只是第一步,不等于"环境已检测"。**
> `advance.py init` **只写运行态**(`pipeline.json`),打印 `initialized...` / `PDIR=` /
> environment 摘要——**这些全是纸面校验,没有真正探测任何环境能力**。真正探测
> build.sh/编译/hdc/device/testfwk/git 的是**下一条命令 `gate_env_init.py`**。
> **绝不能**看到 init 打印了 `PDIR=` 和 environment 摘要就以为初始化完成了——那时环境**根本没测**。
> init 的输出末尾也会打印一段 `!! INIT IS NOT DONE` 横幅提醒你继续。完整两步(缺一不可):
> ```bash
> PDIR=$(python3 $S/advance.py init ... | sed -n 's/^PDIR=//p')   # ① 只写状态
> python3 $S/gate_env_init.py --pipeline-dir "$PDIR"              # ② 真正探测能力(必跑)
> python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0  # ③ 凭签名证据推进
> ```
> ②没跑 → ③ 会 `REFUSED`(无签名证据)。**只做①就停 = 环境没检测,init 没完成。**

逐项探测,**HARD 缺失即阻塞**,SOFT 仅告警;并把探测到的设备序列号回填进
`pipeline.json` 与 `evidence/phase0/env.json`。先 `advance.py init` 建好运行态再跑校验:

```bash
# 环境形态由用户按 AR 确定:init 必须用 --environment 指定,裸 init 缺 --environment 会硬失败。
#   --environment openharmony            gitcode + rk3568(默认形态)
#   --environment harmonyos --component-type system|chip --device-type <type>   HarmonyOS(Gerrit 上库)
#     HarmonyOS 还需 --device-type(与源码根绑定,一般不变):
#       系统组件 general_all_phone_standard / 芯片组件 general_7315L_phone_standard(样例值,按本仓确认)
# 编译部件由用户按 AR 确定,init 不再静默默认为 hiview:裸 init(三个参数都不给)会硬失败,
# 逼你停下来跟用户确认要编译哪个部件。确认后二选一放行:
#   A. 本 AR 改的组件:显式传 --git-dir/--build-target/--part
#        --git-dir      被编译组件子仓,如 base/hiviewdfx/hiview
#        --build-target GN 目标,如 hiview_package
#        --part         developer_test part,如 hiviewdfx
#   B. 用户确认沿用 hiview 默认部件:加 --confirm-defaults(不传任何组件参数时才需要)
# PDIR 由 init 依 --repo 派生成 <repo>/specs/pipeline/<run-id>,不手工拼;抓 PDIR= 行得权威路径。
PDIR=$(python3 $S/advance.py init \
    --repo "$OHOS_ROOT" --run-id "$RUN" \
    --environment openharmony \
    [--git-dir <组件路径> --build-target <gn目标> --part <testpart> | --confirm-defaults] \
    | sed -n 's/^PDIR=//p')
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"            # 逐项能力校验,产证据
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
```

> 💡 **环境形态是人工强确认点。** 跑 init 前先用 `AskUserQuestion` 问清本 AR 属于哪种环境:
> `openharmony`(gitcode/rk3568,上库走 oh-gc)/ `harmonyos-系统组件` / `harmonyos-芯片组件`
> (HarmonyOS,上库走 Gerrit)。缺 `--environment` 会**硬失败**;`--environment harmonyos`
> 时 `--component-type system|chip` **必填**,且 `--device-type <type>` **必填**(与源码根绑定)。
> HarmonyOS 两种组件编译命令**已填入** `lib/environments.py`(系统组件 `build_system.sh`、
> 芯片组件 `build_vendor.sh`,成功横幅 `=====build ... successful=====`、失败横幅
> `=====do make ... error=====`);但 `product`/`out_dir`/`root_markers` **仍为占位(UNSET)**,
> P0 根校验/P4 产物门等需要它们时会硬失败并打印"待填"提示,绝不静默跑错。

> 💡 **编译部件是人工确认点。** 跑 init 前先用 `AskUserQuestion` 问清用户本 AR 要编译的部件
> (默认候选:hiview 部件 git_dir=`base/hiviewdfx/hiview` / build_target=`hiview_package` /
> part=`hiviewdfx`)。用户答别的组件 → 传三个参数;用户确认沿用 hiview → 加 `--confirm-defaults`。
> 裸 `init`(三者皆缺又不带 `--confirm-defaults`)会**硬失败并打印确认指引**,绝不静默编译 hiview。


| 能力 | 级别 | 校验内容 | 服务阶段 |
|---|---|---|---|
| build | HARD | `./build.sh` 存在(编译命令按环境 profile 解析,openharmony 为产品 rk3568) | P2 |
| compile | HARD | **真实编译探针**:默认 `--build-target hiview_package`,用**环境 profile 的编译命令/横幅**跑通(openharmony 用 build.sh;HarmonyOS 用 build_system.sh/build_vendor.sh,需 `--device-type`)。**仅每个仓首次 init 编译一次**,通过后写稳定标记 `specs/.build-probe-ok`,之后 init 自动跳过;`--force-build-probe` 强制重编,`--skip-build-probe` 跳过 | P2 |
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
该目录是否像**当前环境**的源码根。**"像不像"的标志按 environment profile 取,不写死**:
- `openharmony`:同时有 `build.sh` 与 `test/testfwk/developer_test/`(历史行为不变)。
- `harmonyos`:标志由 `lib/environments.py` 的 `root_markers` 决定;**目前为占位(UNSET)**,
  未填时 P0 **硬失败**并提示去 `environments.py` 填,绝不退回 OHOS 布局瞎猜。

不匹配就立即失败并给出可操作提示:

```
PHASE 0 FAIL — '<dir>' does not look like a <env> source root (missing: ...)
  * reopen your Agent in the source repo root, or
  * re-run `advance.py init` with --repo <source_root>, or
  * export OHOS_ROOT=<source_root> before init.
```

即:**默认就在你打开的目录上探测;若目录不对,按提示把 Claude 重新在源码根目录打开**
(或用 `--repo` / `OHOS_ROOT` 指定),再重跑 init。

> ⚠️ **证据/文档强制锚定在源码根下。** PDIR(所有 `evidence/`、`reports/`、`pipeline.json`
> 的落地处)由 init **依 `--repo` 派生**成 `<repo>/specs/pipeline/<run-id>`——传 `--repo` +
> `--run-id`,不要手工拼 PDIR。若你显式传 `--pipeline-dir`,它**必须**落在
> `<repo>/specs/pipeline/` 之内,否则 init 硬失败。**弱模型即便忘了 `export OHOS_ROOT` 或
> 拼错路径,也不可能把文档/证据写到源码根之外。** init 打印 `PDIR=<abs>` 行,抓它即得权威路径。

> ⚠️ 源码根不是 git 仓;`git` 校验针对你 `--git-dir` 指定的组件路径
> (如 `base/hiviewdfx/hiview`),不是仓根。

## 产物
- `specs/initialized.flag`(记录仓路径、产品、连接方式、探测到的序列号、检查时间)。
- 之后由 `ohos-ar-dev-workflow` 为每个 AR 在 `specs/pipeline/{date}-{slug}/` 起独立流水线。

> 本技能负责首次环境就绪与 flag 落盘;P0 `$S/gate_env_init.py` 负责每次运行的可验证能力预检
> (它产 HMAC 签名证据并允许 `advance --phase 0`)。脚本本体在 `ohos-ar-dev-phases/scripts/`。
