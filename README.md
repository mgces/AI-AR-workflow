# AI-AR-workflow — OHOS AR→上库 证据门控自动化流水线

一套基于 Claude Code 的编排 agent:从**已澄清的 AR(架构需求)**出发,自动推进
OHOS(rk3568,C/C++ 系统组件)的完整研发生命周期,直到代码上库:

```
代码开发 → 编译验证 → 测试用例编写与验证 → 真机功能测试 → 集成功能测试 → 代码上库review
  P1        P2          P3                   P4            P5            P6
```

**核心设计:每个阶段只能由确定性门控脚本基于"真实证据"判定通过 ——
绝不能用模型的自由文本当作阶段结束。** 真实证据 = 真实构建日志的成功横幅、真机
`hdc`+`hilog` 抓取、`gtest`/`xdevice` 测试报告、CI 绿状态。

---

## 1. 为什么"文本不能当通过"(防伪机制)

| 机制 | 作用 |
|---|---|
| **单一写入器** | 只有 `advance.py` 能写 `pipeline.json` 的阶段状态。模型没有任何工具能直接改它。 |
| **签名证据账本** | 每个门控脚本把真实证据落盘,并向 `evidence/manifest.jsonl` 追加一条 **HMAC 签名**记录(含每个产物的 sha256)。 |
| **推进充要条件** | `advance.py` 推进 N→N+1 时校验:该阶段最后一条记录 `verdict=PASS` + HMAC 有效 + 每个产物当前 sha256 仍匹配 + 阶段顺序不可跳。任一不符即拒绝。 |
| **密钥隔离** | per-run 密钥(32B,mode 600)存于 `~/.claude/.lifecycle-secret/<run>`,**不在**证据目录内,模型无法据此伪造签名。 |
| **真机 RTC 无关** | 设备 RTC 错乱,新鲜度不靠时间戳,而靠 per-run **nonce** + `/proc/uptime` 单调锚 + 内容切窗 + sha256。 |
| **抗事后篡改** | 任何阶段事后被改动证据文件 → `verify-all` 重校验时 sha256/HMAC 失配 → 该阶段降级回退,必须重跑。 |

> 已用真证据验证:篡改任一 evidence 字节 → sha256 失配被拒;伪造 manifest verdict
> 为 PASS → HMAC 失配被拒。详见文末「验证记录」。

---

## 2. 目录结构

```
AI-AR-workflow/
├── README.md                              ← 本文件
└── skills/
    ├── ohos-ar-dev-workflow/           ← thin 入口(编排器):路由/init/调度/断点恢复
    │   ├── SKILL.md
    │   ├── README.md                      ← 架构图
    │   └── references/                     ← 门控契约 / 防伪协议 / 状态结构
    ├── ohos-ar-dev-phases/             ← thick 阶段说明 + 承重脚本
    │   ├── SKILL.md
    │   ├── phase1-develop.md … phase6-upload-review.md
    │   └── scripts/                        ★ 系统承重核心
    │       ├── advance.py                  ← 唯一状态写入器(init/advance/consent/verify-all/status)
    │       ├── gate_env_init.py            ← P0 环境+真机预检
    │       ├── gate_develop.py             ← P1 git diff + 风格
    │       ├── gate_build.py               ← P2 编译(捕获 build.sh stdout 判横幅)
    │       ├── gate_test_ut.py             ← P3 ohos_unittest(developer_test)
    │       ├── gate_device_func.py         ← P4 真机功能(nonce+uptime+hilog)
    │       ├── gate_integration.py         ← P5 集成(MST 套件)
    │       ├── gate_upload_ci.py           ← P6 上库(oh-gc PR + CI 绿,SHA 绑定)
    │       └── lib/{gatelib.py, device.sh} ← 签名账本 + hdc-over-WSL helper
    ├── ohos-ar-dev-init/               ← 一次性环境配置
    │
    └── (被各阶段调用的现有能力技能,随包携带)
        ohos-dev-sa-codegen/  ohos-dev-napi-module/  ohos-dev-cpp-coding-style/
        tdd-enforcer/  ohos-dev-build-execution-diagnosis/  ohos-build-flash/
        ohos-test-ut-generation/  ohos-dev-hdc-command-usage/
        ohos-ci-gitcode-cli-usage/  ohos-ci-openharmony-ci-analysis/
        ohos-dev-gitcode-pr-review/  ohos-dev-security-code-review/
```

---

## 3. 安装 / 部署

本包是**便携副本**(便于版本管理与分享)。有两种使用方式:

### 方式 A:让 Claude Code 自动发现技能(推荐用于交互式编排)
把本包的技能软链(或复制)到 Claude 的技能目录 `~/.claude/skills/`:

```bash
for d in ~/code/AI-AR-workflow/skills/*/ ; do
  ln -sfn "${d%/}" ~/.claude/skills/"$(basename "$d")"
done
```
之后在 Claude Code 里说「跑流水线 / 从这个 AR 自动开发到上库」即可触发
`ohos-ar-dev-workflow`。

> 依赖技能的脚本路径会自动解析:门控脚本按 `环境变量 → 包内同级技能 → ~/.claude/skills`
> 顺序查找 `oh_cpp_guard.py` / `openharmony_ci.py`,所以软链或就地用都能工作。

### 方式 B:直接命令行驱动脚本(无需技能发现,可脚本化/CI 化)
所有门控都是独立 Python 脚本,直接 `python3` 调用即可(见第 5 节)。

---

## 4. 前置依赖

| 依赖 | 说明 | 检查 |
|---|---|---|
| OHOS 代码仓 | repo 多仓树,如 `$OHOS_ROOT` | `out/ohos_config.json` 产品=rk3568 |
| 构建环境 | `./build.sh` 可用 | P0 `gate_env_init.py` 自检 |
| 真机 rk3568 | 经 hdc 可达,**序列号自动探测**(不写死) | P0 自检 `dev_assert_online` |
| developer_test | `test/testfwk/developer_test/start.sh` | P0 自检 |
| `oh-gc`(P6 才需) | `npm i -g @oh-gc/cli@latest` + `oh-gc auth login` | **不在 P0 校验**;P6 前装好即可 |

> ⚠️ **OHOS 根目录不是 git 仓**(每个组件子目录才是)。`init` 时必须用 `--git-dir`
> 指定你改动的**组件路径**(如 `base/hiviewdfx/hiview`);`build_target` 与
> `developer_test` 仍以**仓根**为准。

### 设备连接(全部来自环境,不硬编码任何 IP/序列号,换机即用)

`scripts/lib/device.sh` 在运行时按以下优先级解析:

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 上的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE`(`ip:port`)→ 若设了 `$HDC_WIN_PORT` 则用 **WSL 默认网关 IP**:端口 → 否则原生 hdc(USB/本地 daemon,不加 `-s`) |
| 设备序列号 | `$DEVICE_SERIAL` → 否则 `hdc list targets` 的**唯一**连接目标(0 或多个则报错让你配) |

- **原生 USB 的 Linux**:开箱即用,什么都不用设。
- **WSL→Windows hdc 桥接**:`export HDC_WIN_PORT=10086`(Windows IP 自动从默认网关取,**不写死本机 IP**)。
- **远端/多设备**:`export HDC_HOST_OVERRIDE=<ip:port>` 和/或 `export DEVICE_SERIAL=<serial>`。

P0 会把探测到的序列号回填进 `pipeline.json` 与 `evidence/phase0/env.json`,作为本次运行的设备凭据。

---

## 5. 快速开始(完整一轮命令)

```bash
REPO="${OHOS_ROOT:-$HOME/ohos/master}"          # 你的 OHOS 仓根(按需修改)
export OHOS_ROOT="$REPO"
S=~/code/AI-AR-workflow/skills/ohos-ar-dev-phases/scripts     # 或 ~/.claude/skills/...
RUN=$(date +%Y%m%d)-<ar-slug>
export PDIR=$REPO/specs/pipeline/$RUN
mkdir -p "$PDIR"; printf '%s\n' "<把已澄清的 AR 原文写这里>" > "$PDIR/ar.md"

# 初始化状态机(注意 --git-dir 指向改动的组件子仓)
python3 $S/advance.py --pipeline-dir "$PDIR" init \
    --git-dir base/hiviewdfx/hiview \
    --build-target <你的GN目标> --part <testpart>

# ── P0 环境+真机预检 ──
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0

# ── P1 代码开发(先用 sa-codegen/tdd-enforcer 等写代码,再门控)──
python3 $S/gate_develop.py --pipeline-dir "$PDIR"          # 无C/C++改动加 --no-style
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 1

# ── P2 编译验证 ──
python3 $S/gate_build.py --pipeline-dir "$PDIR"            # target 取自 pipeline.json
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 2

# ── P3 测试用例编写与验证(先用 ohos-test-ut-generation 生成,再门控)──
python3 $S/gate_test_ut.py --pipeline-dir "$PDIR" \
    --test-target <UT的GN目标> --suite <套件二进制名> [--part <testpart>]
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 3

# ── P4 真机功能测试(自己准备 deploy.sh / scenario.sh,见 phase4 文档)──
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh --scenario-script /path/scenario.sh \
    --marker "<功能成功标记字符串>"
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 4

# ── P5 集成功能测试(套件型;或用 gate_device_func.py --phase 5 做设备行为型)──
python3 $S/gate_integration.py --pipeline-dir "$PDIR" \
    --testtype MST --suites <suite1> [<suite2> ...]
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 5

# ── P6 代码上库(唯一对外不可逆;先 DRY,人工同意后 push)──
python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
    --repo-slug <owner/repo> --branch <local_branch> --base master --title "<title>"   # DRY
python3 $S/advance.py --pipeline-dir "$PDIR" consent --token "<审批人/工单号>"
python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
    --repo-slug <owner/repo> --branch <local_branch> --base master --title "<title>" --allow-push
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 6

# 随时查看进度 / 断点恢复
python3 $S/advance.py --pipeline-dir "$PDIR" status
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all     # 重校验,被篡改则回退
```

---

## 6. 各阶段:做事技能 / 门控 / 通过条件 / 证据

| 阶段 | 做事(调用的技能) | 门控脚本 | 通过条件 | 落盘证据(`evidence/phaseN/`) |
|---|---|---|---|---|
| **P0** | ohos-ar-dev-init | `gate_env_init.py` | build/compile/git/testfwk/hdc 二进制/真机(自动探测并记录序列号)全部就绪 | `env.json` |
| **P1 开发** | ohos-dev-sa-codegen / -napi-module / -cpp-coding-style / tdd-enforcer | `gate_develop.py` | 相对 `base_commit` 有改动 **且** 风格检查通过 | `diff.patch`、`changed_files.txt`、`style_report.txt` |
| **P2 编译** | ohos-dev-build-execution-diagnosis / ohos-build-flash | `gate_build.py` | build.sh exit 0 **且** 输出含 `=====build…successful=====` 且无 error 横幅 | `build_stdout.log`、`build_banner.txt`(失败再加 `error_distill.txt`) |
| **P3 测试** | ohos-test-ut-generation / tdd-enforcer | `gate_test_ut.py` | 编出测试二进制 + developer_test 本次**新建**报告 + `tests>0 && failures==0 && errors==0` | `summary_report.xml`、`result_*.xml`、`start_sh_stdout.txt`、`report_dir.txt` |
| **P4 真机** | ohos-build-flash / ohos-dev-hdc-command-usage | `gate_device_func.py` | 部署命令全 exit 0 + hilog 含**本次 nonce** + 含 marker + uptime 单调 | `hilog_capture.txt`、`device_cmds.txt`、`run_meta.txt` |
| **P5 集成** | ohos-build-flash / developer_test(MST) | `gate_integration.py`(或 `gate_device_func.py --phase 5`) | 集成 summary `failures==0 && errors==0 && tests>0` + 新报告目录 | `summary_report.xml`、`start_sh_stdout.txt`、`report_dir.txt` |
| **P6 上库** | ohos-ci-gitcode-cli-usage / -gitcode-pr-review / -security-code-review / -openharmony-ci-analysis | `gate_upload_ci.py` | P1–P5 全过 + consent 令牌 + PR 已建 + CI `overall∈{success,passed}` + PR head SHA==push SHA | `pr.json`、`ci_status.json`、`pr_create.txt` |

每个阶段在 Claude Code 里的"做事"细节见 `skills/ohos-ar-dev-phases/phaseN-*.md`。

---

## 7. 运行态目录(每个 AR 一个)

```
$REPO/specs/pipeline/{YYYYMMDD}-{slug}/
├── pipeline.json        # 规范状态(只有 advance.py 写)
├── ar.md                # 输入的已澄清 AR
├── todo.md              # 人读镜像(与 TodoWrite 双轨,可选)
└── evidence/
    ├── manifest.jsonl   # 追加式 HMAC 签名证据账本(真相所在)
    └── phase0/ … phase6/  # 各阶段真实产物
```
`pipeline.json` 字段说明见 `skills/ohos-ar-dev-workflow/references/pipeline-schema.md`。

---

## 8. 故障排查(实战踩过的坑)

| 现象 | 原因 / 处理 |
|---|---|
| P0 `git_head` BAD | 用 `--git-dir` 指定**组件子仓**,而非 repo 根(根目录无 `.git`)。 |
| P6 缺 `oh-gc` | init 不再检查 oh-gc;P6 前 `npm i -g @oh-gc/cli@latest && oh-gc auth login`。 |
| P0 `device_online` BAD | 检查 hdc daemon 与 `HDC_HOST_OVERRIDE`/`DEVICE_SERIAL`;`device.sh` 默认从 WSL 默认网关取 Windows IP。 |
| P2 横幅没识别到 | build.sh 横幅打在 **stdout**,且 `out/rk3568/build.log` 可能轮转/为空;门控已改为捕获 build.sh stdout 并用正则判定。 |
| P4 抓取里没有 nonce | scenario 脚本要让组件把 `$GATE_NONCE` 打进设备日志(`hilog`/`log -t … NONCE=$GATE_NONCE`),否则无法证明日志是本次的。 |
| `advance` 报 REFUSED | 该阶段门控不是 PASS,或证据被改动(sha256/HMAC 失配)。读 `evidence/phaseN/` 真实日志修复后重跑门控。 |
| 阶段顺序报错 | 阶段不可跳;只能关闭 `current_phase` 指向的阶段。 |

---

## 9. 脚本速查(`skills/ohos-ar-dev-phases/scripts/`)

```
advance.py  init        --git-dir <组件> --build-target <t> --part <p> [--base-commit <sha>]
            advance     --phase N
            consent     --token <s>            # 记录 P6 一次性人工同意
            verify-all                          # 重校验已通过阶段(被篡改则回退)
            status
gate_env_init.py    --pipeline-dir P
gate_develop.py     --pipeline-dir P [--no-style]
gate_build.py       --pipeline-dir P [--target T]
gate_test_ut.py     --pipeline-dir P --test-target T --suite S [--part P]
gate_device_func.py --pipeline-dir P [--deploy-script f] --scenario-script f --marker M [--phase 4|5]
gate_integration.py --pipeline-dir P [--testtype MST] --suites S1 [S2 …] [--part P]
gate_upload_ci.py   --pipeline-dir P --repo-slug owner/repo --branch B [--base master] [--title T] [--pr N] [--allow-push]
```
统一可用环境变量 `PIPELINE_DIR` 代替 `--pipeline-dir`。

---

## 10. 验证记录(已用真证据跑过)

- **P0**:真机 `hdc` 取回 `uptime`,真实组件 HEAD → PASS → advance。
- **P1**:真实 `git diff` + `oh_cpp_guard` 风格检查 → PASS → advance。
- **P2**:真跑 `build.sh`,对非法目标捕获到真实 `=====build error=====` + 45 条
  `[OHOS ERROR]`(含 "unknown target")→ FAIL → advance 拒绝。
- **防伪**:篡改 evidence 字节 → `verify-all` 因 sha256 失配降级回退;伪造 manifest
  verdict=PASS → `advance` 因 HMAC 失配拒绝。

**尚未用真特性端到端跑通** P3/P4/P6 —— 需要一个具体 AR + 可构建的 UT 目标 + 真机套件 +
`oh-gc` 登录。各门控已编译通过,且 P3/P5 复用 P2 的构建捕获、P4/P5-设备复用 P0 已验证可达的
`device.sh`。

---

## 11. 设计范式

「thin 入口 + thick 阶段 skill + 确定性门控脚本」三层,借鉴 AID/MigBot 工作流,但
**阶段边界是脚本门控,不是用户点头**(全自动,仅 P6 push 保留一次性人工同意)。
架构图见 `skills/ohos-ar-dev-workflow/README.md`。
