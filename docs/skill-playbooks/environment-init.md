# 环境初始化 skill 实战

> 围绕 `ohos-ar-dev-init`:适合何时调用、最常见用户命令、初始化后用户会得到什么。

## 适合何时调用

- 首次跑 `ohos-ar-dev-workflow` 前
- 用户说"初始化流水线环境"时
- 环境有变动(换机器/换仓/换设备)后重新校验

这是一次性、幂等的技能——不写死任何机器特定值(IP、设备序列号都在运行时解析/探测)。

## 最常见用户命令

```bash
# 在 Agent 里说
/ohos-ar-dev-init
```

底层脚本(在 `ohos-ar-dev-phases/scripts/`):

```bash
S="$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts"
python3 $S/advance.py --pipeline-dir "$PDIR" init \
    --environment openharmony|harmonyos [--component-type system|chip] \
    [--git-dir <组件路径> --build-target <gn目标> --part <testpart> | --confirm-defaults]
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
```

默认候选部件 hiview:`--git-dir base/hiviewdfx/hiview` / `--build-target hiview_package` / `--part hiviewdfx`。

> **环境形态从 init 强制区分**:`--environment openharmony`(gitcode/rk3568,默认)或 `--environment harmonyos --component-type system|chip`(HarmonyOS,Gerrit 上库)。`--environment` 缺失硬失败;harmonyos 时 `--component-type` 必填。跑 init 前先用 `AskUserQuestion` 跟用户确认。

## 初始化后用户会得到什么

- `specs/initialized.flag` — 记录仓路径、产品、连接方式、探测到的序列号、检查时间
- `evidence/phase0/env.json` — 各项能力校验结果 + 设备序列号回填
- 之后由 `ohos-ar-dev-workflow` 为每个 AR 在 `specs/pipeline/{date}-{slug}/` 建独立流水线

## 能力校验逻辑

逐项探测,HARD 缺失即阻塞,SOFT 仅告警:

| 能力 | 级别 | 校验内容 |
|---|---|---|
| build | HARD | `./build.sh` 存在(编译命令按环境 profile 解析) |
| compile | HARD | 真实编译探针(每仓首次 init 编一次,通过后写 `specs/.build-probe-ok`;HarmonyOS 占位未填则硬失败) |
| git | HARD | `--git-dir` 组件子仓是 git 仓 |
| testfwk | HARD | developer_test start.sh 存在 |
| hdc_bin | HARD | 能解析到 hdc 二进制 |
| device | HARD | 唯一真机在线(自动探测序列号) |
| oh_gc / gitcode_auth | SOFT | (仅 gitcode)`oh-gc` 已装 + token 已登录 |
| git_remote / gerrit_hook | SOFT | (仅 gerrit/HarmonyOS)git remote + commit-msg Change-Id 钩子 |

## 设备连接(可移植)

`lib/device.sh` 按优先级解析,换机器无需改代码:

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE` → `$HDC_WIN_PORT`(WSL 默认网关 IP:端口) → 原生 hdc |
| 设备序列号 | `$DEVICE_SERIAL` → `hdc list targets` 唯一目标 |

## 常见误区

- **把 OHOS 根目录当 git 仓**:OHOS 根不是 git 仓,`git` 校验针对 `--git-dir` 组件路径
- **oh-gc 未装就慌**:仅 gitcode 环境需要,SOFT 告警不阻塞,P8 前配好即可(HarmonyOS/gerrit 环境改探 git remote / commit-msg 钩子)
- **compile 探针每次都重编**:不会,每仓首次 init 编一次后写标记跳过

## 延伸阅读

- [环境初始化](/getting-started/environment-init) — 详细的环境变量与设备连接
- [P0 环境预检阶段](/workflow/phase-0-init) — P0 的门控细节
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 A 的首步
