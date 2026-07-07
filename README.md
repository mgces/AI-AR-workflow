# AI-AR-workflow — OHOS AR→上库 证据门控自动化流水线

一套基于 Claude Code 的编排 agent:从**已澄清的 AR(架构需求)**出发,自动推进
OHOS(rk3568,C/C++ 系统组件)的完整研发生命周期,直到代码上库:

```
代码开发 → 编译验证 → 测试用例编写与验证 → 真机功能测试 → 功能/覆盖率/性能/功耗/稳定性验证 → 代码上库review
  P1        P2          P3                   P4            P5                              P6
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
| **改码回 P1 重走** | P1 通过时锁定代码指纹(组件仓相对 `base_commit` 的 `git diff` + untracked 文件内容的 sha256,**commit 无关**)。任何阶段发现 bug 改了**代码内容** → `advance P2..P6` 因指纹漂移被拒,必须 `advance.py reset` 回 P1 踏实重走;`verify-all` 也按漂移自动回退。指纹相对 base 计算,故 P6 上库时的 `git commit -s` 不算漂移。 |

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
    │       ├── gate_develop.py             ← P1 git/untracked diff + C++ 强门控
    │       ├── gate_build.py               ← P2 编译(捕获 build.sh stdout 判横幅)
    │       ├── gate_test_ut.py             ← P3 ohos_unittest(developer_test)
    │       ├── gate_device_func.py         ← P4 真机功能(nonce+uptime+hilog)
    │       ├── gate_integration.py         ← P5 功能与质量验证(MST + 覆盖率/性能/功耗/稳定性报告)
    │       ├── gate_upload_ci.py           ← P6 上库(oh-gc PR + CI 绿,SHA 绑定)
    │       └── lib/{gatelib.py, device.sh} ← 签名账本 + hdc-over-WSL helper
    ├── ohos-ar-dev-init/               ← 一次性环境配置
    │
    └── (被各阶段调用的现有能力技能,随包携带)
        ohos-dev-sa-codegen/  ohos-dev-napi-module/  ohos-dev-cpp-coding-style/
        openharmony-cpp/  tdd-enforcer/  ohos-dev-build-execution-diagnosis/  ohos-build-flash/
        ohos-test-ut-generation/  ohos-dev-hdc-command-usage/
        ohos-ci-gitcode-cli-usage/  ohos-ci-openharmony-ci-analysis/
        ohos-dev-gitcode-pr-review/  ohos-dev-security-code-review/
```

---

## 3. 安装 / 部署

本包是**便携副本**(便于版本管理与分享)。有两种使用方式:

### 方式 A:让 Claude Code 自动发现技能(推荐用于交互式编排)
把本包技能同步到 Claude 的技能目录 `~/.claude/skills/`。**原生二进制版 Claude Code 不扫描软链接目录**,
所以用仓库自带的 `sync-skills.sh` 做真实拷贝(项目 `skills/` 为唯一真源,改完技能跑一次即可):

```bash
bash sync-skills.sh          # 项目 skills/ → ~/.claude/skills/(真实拷贝,排除 __pycache__)
```

之后**重启 Claude Code 窗口**,说「跑流水线 / 从这个 AR 自动开发到上库」即可触发
`ohos-ar-dev-workflow`。(`sync-skills.sh` 是单向拷贝,不会删除 `~/.claude/skills/` 下的其他技能。)

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
| `oh-gc`(P6 才需) | `npm i -g @oh-gc/cli@latest` + `oh-gc auth login` | **P0 SOFT 检查**(oh-gc 已装 + gitcode token 已配);缺失只告警并给配置指引 |

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

| 阶段 | 命令 | 功能 | 示例 |
|---|---|---|---|
| **1** | /ohos-ar-dev-init | 检测OHOS环境 | `/ohos-ar-dev-init` |
| **2** | /ohos-ar-dev-workflow | 开始AR流程开发 | `/ohos-ar-dev-workflow 在base/hiviewdfx/hiview下面新增一个线程泄漏检测插件，阈值3000，超过3000阈值之后只触发一次调用。调用hidumper sa的能力获取(类似hidumper -p <pid> --thread的维测)进程线程维测，然后通过LogCatcherUtils::DumpStacktrace抓取当前应用调用栈，并且保存一份线程泄漏文件在data/log/reliability/resource_leak/thread_leak/中` |


---

## 6. 各阶段:做事技能 / 门控 / 通过条件 / 证据

| 阶段 | 做事(调用的技能) | 门控脚本 | 通过条件 | 落盘证据(`evidence/phaseN/`) |
|---|---|---|---|---|
| **P0** | ohos-ar-dev-init | `gate_env_init.py` | build/compile/git/testfwk/hdc 二进制/真机(自动探测并记录序列号)全部就绪;oh-gc + gitcode token 为 SOFT 告警 | `env.json` |
| **P1 开发** | ohos-dev-sa-codegen / -napi-module / -cpp-coding-style / openharmony-cpp / tdd-enforcer | `gate_develop.py` | 相对 `base_commit` 有 tracked 或 untracked 改动 **且** C/C++ 格式 guard + 强规则检查通过;不可用 `--no-style` 绕过 | `diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt` |
| **P2 编译** | ohos-dev-build-execution-diagnosis / ohos-build-flash | `gate_build.py` | build.sh exit 0 **且** 输出含 `=====build…successful=====` 且无 error 横幅 | `build_stdout.log`、`build_banner.txt`(失败再加 `error_distill.txt`) |
| **P3 测试** | ohos-test-ut-generation / tdd-enforcer | `gate_test_ut.py` | 编出测试二进制 + developer_test 本次**新建**报告 + `tests>0 && failures==0 && errors==0` | `summary_report.xml`、`result_*.xml`、`start_sh_stdout.txt`、`report_dir.txt` |
| **P4 真机** | ohos-build-flash / ohos-dev-hdc-command-usage | `gate_device_func.py` | 部署命令全 exit 0 + 主机/设备产物 sha256 一致 + hilog 含**本次 nonce**、功能 marker、运行时 marker、端到端 marker + uptime 单调;**证据 PASS 后停下,人工核对真机真实结果并 `consent --phase 4` 才推进** | `hilog_capture.txt`、`device_cmds.txt`、`run_meta.txt`、`artifact_runtime_proof.txt` |
| **P5 质量验证** | ohos-build-flash / developer_test(MST) / ohos-test-ut-generation / coverage / performance / power / stability / ohos-dev-cpp-coding-style / ohos-dev-security-code-review | `gate_integration.py`(或 `gate_device_func.py --phase 5` + `gate_integration.py`) | 功能 summary `failures==0 && errors==0 && tests>0` **且 覆盖率、性能、功耗、稳定性报告全部生成并签名,代码 review 问题数为 0;证据 PASS 后需人工确认并 `consent --phase 5` 才进入 P6** | `summary_report.xml`、`coverage_report.*`、`performance_report.*`、`power_report.*`、`stability_report.*`、`code_review_report.txt`、`report_dir.txt` |
| **P6 上库** | ohos-ci-gitcode-cli-usage / -gitcode-pr-review / -security-code-review / -openharmony-ci-analysis | `gate_upload_ci.py` | P1–P5 全过 + 上库前落全部代码 diff 供人工确认 + **A 本地自检零问题报告(commit 前硬控)** + `git commit -s`(DCO 签名)+ push + **`--issue` 绑定的 PR**(CI 门禁只对绑定 Issue 的 PR 触发)+ **B PR review 零问题报告(建 PR 后、CI 前硬控)** + consent --phase 6 + CI `overall∈{success,passed}` + PR head SHA==push SHA | `full_diff.patch`、`full_diff.stat.txt`、`local_code_review_report.*`、`pr.json`、`pr_create.txt`、`pr_review_report.*`、`ci_status.json` |

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
| P0 `oh_gc`/`gitcode_auth` BAD | SOFT 告警不阻塞;按提示 `npm i -g @oh-gc/cli@latest` 装 CLI、`oh-gc auth login` 手动配 gitcode token(存 `~/.config/gitcode-cli/config.json`,`oh-gc auth status` 验证)。 |
| P0 `device_online` BAD | 检查 hdc daemon 与 `HDC_HOST_OVERRIDE`/`DEVICE_SERIAL`;`device.sh` 默认从 WSL 默认网关取 Windows IP。 |
| P2 横幅没识别到 | build.sh 横幅打在 **stdout**,且 `out/rk3568/build.log` 可能轮转/为空;门控已改为捕获 build.sh stdout 并用正则判定。 |
| P4 抓取里没有 nonce | scenario 脚本要让组件把 `$GATE_NONCE` 打进设备日志(`hilog`/`log -t … NONCE=$GATE_NONCE`),否则无法证明日志是本次的。 |
| P4 缺少 runtime/e2e marker 或 hash 不一致 | scenario 必须从真实入口触发改动代码,并在成功路径输出 `--runtime-marker` 与 `--e2e-marker`;同时确认 `--host-artifact` 是本次构建产物、`--device-artifact` 是部署后设备实际文件。 |
| `advance` 报 REFUSED | 该阶段门控不是 PASS,或证据被改动(sha256/HMAC 失配)。读 `evidence/phaseN/` 真实日志修复后重跑门控。 |
| 阶段顺序报错 | 阶段不可跳;只能关闭 `current_phase` 指向的阶段。 |

---

## 9. 脚本速查(`skills/ohos-ar-dev-phases/scripts/`)

```
advance.py  init        --git-dir <组件> --build-target <t> --part <p> [--base-commit <sha>]
            advance     --phase N
            consent     --phase N --token <s>   # 记录 P4 真机/P5 质量报告/P6 上库 的人工确认
            reset       --reason <s>            # 改了代码 → 回 P1 重走(打回 P1-P6)
            verify-all                          # 重校验已通过阶段(篡改/代码漂移则回退)
            status
gate_env_init.py    --pipeline-dir P
gate_develop.py     --pipeline-dir P [--no-style]   # 仅无 C/C++ 改动时兼容;有 C/C++ 改动会拒绝
gate_build.py       --pipeline-dir P [--target T]
gate_test_ut.py     --pipeline-dir P --test-target T --suite S [--part P]
gate_device_func.py --pipeline-dir P [--deploy-script f] --scenario-script f --marker M
                    --host-artifact F --device-artifact P
                    --runtime-marker M --e2e-marker M [--phase 4|5]
gate_integration.py --pipeline-dir P [--testtype MST] --suites S1 [S2 …] [--part P]
                    --coverage-report F --performance-report F --power-report F --stability-report F
                    [--code-review-report F]
gate_upload_ci.py   --pipeline-dir P --repo-slug owner/repo --branch B [--base master] [--title T]
                    --issue N                         # 建 PR 必填(CI 门禁只对绑定 Issue 的 PR 触发)
                    --local-review-report F           # A 本地自检零问题报告(commit 前硬控)
                    --pr-review-report F              # B PR review 零问题报告(建 PR 后、CI 前硬控)
                    [--pr N] [--allow-push]           # push+commit -s(DCO)只在 --allow-push 时发生
```
> **两道 review 报告契约**:必须携带机器可读问题计数(JSON `issue_count/finding_count/...==0`
> 或 `issues/findings/...` 空数组,或文本 `review_issue_count=0`)。报告可由模型/技能产出,gate
> 只在计数为 0 时放行;任一非零/缺失 → FAIL,改代码后 `advance.py reset` 回 P1 重走。
统一可用环境变量 `PIPELINE_DIR` 代替 `--pipeline-dir`。

---

## 10. 验证记录(已用真证据跑过)

- **P0**:真机 `hdc` 取回 `uptime`,真实组件 HEAD → PASS → advance。
- **P1**:真实 `git diff` + untracked 文件清单 + `oh_cpp_guard` + `openharmony-cpp` 硬规则检查 → PASS → advance。
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
**阶段边界是脚本门控,不是用户点头**(证据自动放行;仅 **P4 真机结果** 与 **P6 上库** 在证据 PASS 后停下等人工确认)。
架构图见 `skills/ohos-ar-dev-workflow/README.md`。
