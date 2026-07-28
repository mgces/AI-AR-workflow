# 环境初始化

> 本页围绕 `ohos-ar-dev-init` 技能,解释一次性环境校验的作用、为什么需要 P0、各项能力的校验逻辑,以及环境变量与设备连接方式。

## ohos-ar-dev-init 的作用

一次性、幂等地初始化并校验 OHOS 生命周期流水线所需的各项能力,建立 `specs/pipeline` 目录约定,写 `specs/initialized.flag`。**不写死任何机器特定值**(IP、设备序列号都在运行时解析/探测)。

## 为什么需要 P0

P0 是流水线的环境预检阶段——在真正开始一个 AR 之前,确认整套工具链就绪,避免跑到一半才发现 `build.sh` 不在或真机连不上。P0 门控脚本 `gate_env_init.py` 逐项探测能力,产 HMAC 签名证据,通过后 `advance --phase 0` 放行。

## 能力校验逻辑

先 `advance.py init` 建运行态,再跑 `gate_env_init.py` 校验:

```bash
S="<workflow>/skills/ohos-ar-dev-phases/scripts"
python3 $S/advance.py --pipeline-dir "$PDIR" init \
    [--git-dir <组件路径> --build-target <gn目标> --part <testpart> | --confirm-defaults]
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"            # 逐项能力校验,产证据
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
```

逐项探测,**HARD 缺失即阻塞**,SOFT 仅告警:

| 能力 | 级别 | 校验内容 | 服务阶段 |
|---|---|---|---|
| build | HARD | `./build.sh` 存在(产品 rk3568) | P2 |
| compile | HARD | 真实编译探针:默认 `hiview_package` 跑通(成功横幅且无 error)。每仓首次 init 编译一次,通过后写 `specs/.build-probe-ok` | P2 |
| git | HARD | `--git-dir` 指向的**组件子仓**是 git 仓(记录 HEAD) | P1/P6 |
| testfwk | HARD | `test/testfwk/developer_test/start.sh` 存在 | P3/P5 |
| hdc_bin | HARD | 能解析到 hdc 二进制 | P0/P4/P5 |
| device | HARD | 唯一真机在线(自动探测并记录序列号) | P4/P5 |
| oh_gc | SOFT | gitcode CLI `oh-gc` 已安装 | P6 |
| gitcode_auth | SOFT | gitcode token 已配置(`oh-gc auth status` 已登录) | P6 |

> `oh_gc` / `gitcode_auth` 是 P8 上库才用到,**SOFT:缺失只告警、不阻塞 P0**。未配置时 P0 会打印手动配置指引,P8 前配好即可。

## 编译部件是人工确认点

跑 init 前必须先跟用户确认本 AR 要编译的部件。默认候选:

- `--git-dir base/hiviewdfx/hiview`
- `--build-target hiview_package`
- `--part hiviewdfx`

二选一放行:

- **A. 本 AR 改的组件**:显式传三个组件参数
- **B. 用户确认沿用 hiview 默认部件**:加 `--confirm-defaults`

裸 `init`(三者皆缺又不带 `--confirm-defaults`)会**硬失败并打印确认指引**,绝不静默编译 hiview。

## 设备连接方式

`scripts/lib/device.sh` 在运行时按以下优先级解析,换机器无需改代码:

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 上的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE`(host:port)→ 若设了 `$HDC_WIN_PORT` 则用 **WSL 默认网关 IP**:端口 → 否则原生 hdc(USB/本地 daemon,不加 `-s`) |
| 设备序列号 | `$DEVICE_SERIAL` → 否则 `hdc list targets` 的**唯一**连接目标(0 个或多个则报错让你配) |

三种典型场景:

- **原生 USB 的 Linux**:开箱即用,什么都不用设
- **WSL→Windows hdc 桥接**:`export HDC_WIN_PORT=10086`(Windows IP 自动从默认网关取,不写死)
- **远端/多设备**:`export HDC_HOST_OVERRIDE=<ip:port>` 和/或 `export DEVICE_SERIAL=<serial>`

P0 会把探测到的序列号回填进 `pipeline.json` 与 `evidence/phase0/env.json`,作为本次运行的设备凭据。

## 常见误区

- **把 OHOS 根目录当 git 仓**:OHOS 根不是 git 仓,每个组件子目录才是。`git` 校验针对 `--git-dir` 指定的组件路径,不是仓根
- **oh-gc 未装就慌**:P0 只是 SOFT 告警,不阻塞。按指引 `npm i -g @oh-gc/cli@latest` 装 CLI、`oh-gc auth login` 配 token,P6 前配好即可
- **compile 探针每次都重编**:不会。每仓只在首次 init 编译一次,通过后写 `specs/.build-probe-ok` 标记,之后自动跳过。环境有变动用 `--force-build-probe` 重验

## 延伸阅读

- [5 分钟快速开始](/getting-started/quick-start)
- [P0 环境预检阶段](/workflow/phase-0-init)
- [环境初始化 skill 实战](/skill-playbooks/environment-init)
