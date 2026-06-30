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
S=~/.claude/skills/ohos-ar-dev-phases/scripts   # 安装态;包内则 ~/code/AI-AR-workflow/skills/ohos-ar-dev-phases/scripts
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
python3 $S/advance.py --pipeline-dir "$PDIR" init --git-dir <组件路径> --build-target <gn目标> --part <testpart>
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"            # 逐项能力校验,产证据
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
```


| 能力 | 级别 | 校验内容 | 服务阶段 |
|---|---|---|---|
| build | HARD | `./build.sh` 存在(产品 rk3568) | P2 |
| compile | HARD | **真实编译探针**:默认 `--build-target hiview_package` 跑通(出现成功横幅且无 error)。**自动执行,不需用户确认**;可用 `--probe-target <t>` 换目标或 `--skip-build-probe` 跳过 | P2 |
| git | HARD | `--git-dir` 指向的**组件子仓**是 git 仓(记录 HEAD) | P1/P6 |
| testfwk | HARD | `test/testfwk/developer_test/start.sh` 存在 | P3/P5 |
| hdc_bin | HARD | 能解析到 hdc 二进制 | P0/P4/P5 |
| device | HARD | 唯一真机在线(自动探测并记录序列号) | P4/P5 |
| oh_gc | SOFT | `oh-gc --version`(P6 才需,`npm i -g @oh-gc/cli@latest`) | P6 |

> 💡 compile 探针默认编译 `hiview_package` 来验证整套构建工具链可用(GN+ninja+ccache)。
> 它**直接运行、无需任何确认**;探针日志落 `evidence/phase0/build_probe.log` 并计入签名证据。
> 仅想校验环境而不编译时加 `--skip-build-probe`。

> ⚠️ OHOS 根目录不是 git 仓;`git` 校验针对你 `--git-dir` 指定的组件路径
> (如 `base/hiviewdfx/hiview`),不是仓根。

## 产物
- `specs/initialized.flag`(记录仓路径、产品、连接方式、探测到的序列号、检查时间)。
- 之后由 `ohos-ar-dev-workflow` 为每个 AR 在 `specs/pipeline/{date}-{slug}/` 起独立流水线。

> 本技能负责首次环境就绪与 flag 落盘;P0 `$S/gate_env_init.py` 负责每次运行的可验证能力预检
> (它产 HMAC 签名证据并允许 `advance --phase 0`)。脚本本体在 `ohos-ar-dev-phases/scripts/`。
