# AI-AR-workflow — OHOS AR→上库 证据门控自动化流水线

一套基于通用 Agent 技能协议的编排流程:从**已澄清的 AR(架构需求)**出发,自动推进
OHOS(rk3568,C/C++ 系统组件)的完整研发生命周期,直到代码上库:

```
设计固化 → 代码开发 → 测试用例编写 → 编译验证 → 单测执行验证 → 真机功能测试 → 功能/覆盖率/性能/功耗/稳定性验证 → 代码上库review
   P1        P2          P3            P4          P5            P6              P7                                P8
```

**核心设计:每个阶段只能由确定性门控脚本基于"真实证据"判定通过 ——
绝不能用模型的自由文本当作阶段结束。** 真实证据 = 真实构建日志的成功横幅、真机
`hdc`+`hilog` 抓取、`gtest`/`xdevice` 测试报告、CI 绿状态。

> **物理阶段 = 逻辑阶段 1:1(共 9 个,phase0–8)**:底层状态机、`evidence/` 目录、签名 manifest
> 都用真实的 **物理 phase 0–8**,与面向模型执行的**逻辑阶段 P0–P8** 一一对应(见第 12 节)。
> 早期版本曾把物理 phase1 用子状态机压进"设计+开发+测试开发"三合一;现已展开为三个独立的真实
> 签名物理阶段(P1 设计 / P2 开发 / P3 测试开发),编译及其后每阶段号相应后移。**放行权只在
> 物理 phase 的签名证据 + `advance.py`。** 本文正文的 P1–P8 即**物理 phase**。

---

## 0. 流程图(端到端)

```
                          ┌─────────────────────────────────────────────┐
      已澄清的 AR ───────▶│  ohos-ar-dev-workflow(编排器 / 唯一大脑)   │
                          │  每轮循环:refresh_todo → 做事 → 跑门控 → advance │
                          └───────────────────────┬─────────────────────┘
                                                  │
   ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
   │  P0  环境预检   gate_env_init.py                                                               │
   │      build/compile/git/testfwk/hdc/真机(自动探测序列号) 全就绪 ── PASS ─▶ advance --phase 0  │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P1 设计固化 gate_design.py ── AR_design.md 6 必含章节 + ar-contract 契约块,HMAC 签名 ┐
   │      (设计前:kb_search.py 检索知识库 → design_refs.md 供参考,advisory 不进门控)              │
   │      目标组件 / 功能需求 / 完整代码框架 / 完整测试框架 / 需测试功能点 / 真机用例构造              │
   │      PASS(emit 1)─▶ advance --phase 1;需人工 consent --phase 1(在 P2 开发门内校验)             │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P2 代码开发 gate_develop.py ── 强制依赖签名 AR_design ＋ P1 consent ＋ diff 非空 ─── ┐
   │      ＋ C++ 强门控(emit 2)── PASS ─▶ advance --phase 2 ── 闭合时锁定【功能指纹】(仅非测试路径)   │
   │      ＋ locked_all_paths                                                                       │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P3 测试开发 gate_test_develop.py ── ★Finding 1:编译前测试代码已写 ─────────────── ┐
   │      契约每个 test_cases[].gtest 的 suite 出现在**新测试文件**里(编写覆盖,非执行),测试源签名快照 │
   │      ⚠ 只允许新增独立测试文件(功能指纹漂移会被拒);PASS(emit 3)─▶ advance --phase 3 ─▶ 才到 build │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P4 编译 gate_build.py ── build.sh exit0 ＋ 成功横幅(无 error)＋ build_artifacts 覆盖 ┐
   │             PASS(emit 4)─▶ advance --phase 4                                                    │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P5 单测执行 gate_test_ut.py ── 编测试目标 ＋ 本次新建报告 ＋ tests>0,fail==0,err==0 ─┐
   │             ＋ 契约每个 test_cases[].gtest 通过(执行覆盖);⚠ 只允许新增独立测试文件               │
   │             PASS(emit 5)─▶ advance --phase 5                                                    │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P6 真机 gate_device_func.py ── 部署 sha256 一致 ＋ hilog 含 nonce/marker/e2e ＋ ──┐
   │             uptime 单调 ── 证据 PASS(emit 6)──▶【停:人工核对真机结果】── consent --phase 6 ─▶ advance │
   │             (render_report --kind device → reports/device_functional.md)                      │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P7 质量 gate_integration.py ── 功能 summary ＋ 覆盖率/性能/功耗/稳定性 ＋ review==0 ┐
   │             ── 证据 PASS(emit 7)──▶【停:人工核对质量/review】── consent --phase 7 ─▶ advance     │
   │             (render_report --kind quality → reports/quality.md)                               │
   └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                  ▼
   ┌──────────── P8 上库 gate_upload_ci.py ─────────────────────────────────────────────────────── ┐
   │   A 本地自检==0(commit 前硬控) → git commit -s(DCO) → push → 建 issue 绑定 PR                │
   │   → B PR review==0(硬控) → CI overall∈{success,passed} ＋ PR head SHA==push SHA               │
   │   render_report --kind summary → pr_description.md 注入 PR(背景/设计/修改/用例/结果)          │
   │   证据 PASS(emit 8)──▶【停:人工确认上库(唯一不可逆)】── consent --phase 8 ─▶ advance ── 完成 ✅ │
   └──────────────────────────────────────────────────────────────────────────────────────────────┘

   ▲ 任一阶段发现要改功能代码 ─────────────────────────────────────────────────────────────────────┐
   └──── advance.py reset --reason "…" ── 打回 P1 重走(功能指纹漂移会强制拒绝,不许只补跑当前阶段) ─┘

   证据两轨分离:evidence/(机器,HMAC 签名,gitignore) ‖ reports/(人读 Markdown,可脱敏归档)
```

---


## 1. 为什么"文本不能当通过"(防伪机制)

| 机制 | 作用 |
|---|---|
| **单一写入器** | 只有 `advance.py` 能写 `pipeline.json` 的阶段状态。模型没有任何工具能直接改它。 |
| **签名证据账本(哈希链)** | 每个门控脚本把真实证据落盘,并向 `evidence/manifest.jsonl` 追加一条 **HMAC 签名**记录(含每个产物的 sha256)。记录带 `seq`+`prev`(上一条 hmac)形成**哈希链**。 |
| **推进充要条件** | `advance.py` 推进 N→N+1 时校验:**哈希链完整** + 该阶段最后一条记录 `verdict=PASS` + HMAC 有效 + 每个产物当前 sha256 仍匹配 + 阶段顺序不可跳。任一不符即拒绝。 |
| **密钥隔离** | per-run 密钥(32B,mode 600)存于当前 Agent 配置目录的 `.lifecycle-secret/<run>`,**不在**证据目录内,模型无法据此伪造签名。 |
| **真机 RTC 无关** | 设备 RTC 错乱,新鲜度不靠时间戳,而靠 per-run **nonce** + `/proc/uptime` 单调锚 + 内容切窗 + sha256。 |
| **抗事后篡改 / 抗重放** | 改动证据文件 → `verify-all` sha256/HMAC 失配 → 降级回退;**重放一条历史合法 PASS 记录** → `seq`/`prev` 对不上链尾被拒(无密钥无法重签)。 |
| **设计先行门控** | P1 设计门 `gate_design.py`(`emit 1`)先确定性校验 `AR_design.md` 6 必含章节 + ar-contract 契约并签名;P2 开发门 `gate_develop.py`(`emit 2`)**强制依赖**该签名设计 + P1 consent 才允许写码通过。 |
| **编译前测试代码已写(Finding 1)** | P3 测试开发门 `gate_test_develop.py`(`emit 3`)是"先写完功能+测试代码再编译"的**真签名门**——不闭合 phase3 就到不了 phase4(build)。它证明测试**编写**(契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件),测试**执行**留到 P5(`gate_test_ut.py`)。 |
| **签名且绑定证据的 consent** | P6/P7/P8 人工确认令牌**签名**并绑定当前 PASS 证据的 entry_id;凭空盖章、重跑门控后旧 consent 复用都会失效。P1 设计 consent 绑签名设计条目,重跑 gate_design 即作废。 |
| **改码回 P1 重走(功能指纹分层)** | **P2(feature-develop)闭合时锁定功能指纹**(仅**非测试路径**内容,相对 `base_commit`、commit 无关)。改**功能代码/配置内容** → `advance P3..P8` 因功能指纹漂移被拒(`check_code_drift` 从 phase3 起生效);**P3/P5/P6/P7 只允许新增独立测试文件**(test 路径),新增非测试路径被拒——必须 `advance.py reset` 回 P1。P8 的 `git commit -s` 不算漂移。 |
| **真机抗伪造三层证明(P6)** | 真机功能不再只认"日志里出现过 marker",而是叠加:①**进程溯源**——marker 命中行绑定 PID,校验进程名与契约 `device_cases[].process` 一致、且 `/proc/<pid>/exe\|maps` 真加载了 `artifact_loaded`;②**副作用断言**——`side_effect` 的 `shell_assert` 命令实跑并比对期望;③**负对照差分**——按 `absent_before_trigger` 切 baseline/trigger 窗口,marker 若在触发前已出现即 FAIL。证据优先级:进程溯源 > artifact_loaded > side_effect > baseline/trigger 差分 > runtime/e2e marker > 纯文本 marker。 |
| **失败三分回路 + 双熔断 + 人工升级** | 失败按 `Retry / Repair / Regenerate` 三分(§10 判定矩阵机械化):Retry 同阶段重试不动 bundle;Repair 新窗口修复、bundle revision 升级、显式声明 `downstream_revalidate_scope`;越设计边界才 Regenerate 回 P1/P2/P3。`MAX_RETRY_ROUNDS`/`MAX_REPAIR_ROUNDS`(默认各 2)超预算即 `human_escalation_needed`。外部 API/网络瞬时不可用(`external_api_unstable`)与"真红 CI"区分,前者直接升级人工而非空转 repair。 |

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
    │   ├── references/                     ← 门控契约 / 防伪协议 / 状态结构
    │   └── scripts/                        ← 归档与人读产物(纯 Python 无依赖)
    │       ├── archive_product.py          ← 脱敏归档到 products/(--include-reports)
    │       ├── render_report.py            ← 渲染 reports/ 人读 Markdown + PR 描述
    │       └── refresh_todo.py             ← 依 AR_design 刷新 todo.md
    ├── ohos-ar-dev-phases/             ← thick 阶段说明 + 承重脚本
    │   ├── SKILL.md
    │   ├── phase1-design.md … phase8-upload-review.md（物理 phase 1–8;phase0 bootstrap 无独立文档）
    │   └── scripts/                        ★ 系统承重核心
    │       ├── advance.py                  ← 唯一状态写入器(init/advance/consent/reset/verify-all/migrate/status/next)
    │       ├── gate_env_init.py            ← P0 环境+真机预检
    │       ├── gate_design.py              ← P1 设计固化(校验 AR_design.md 6 章节 + ar-contract 契约并签名;派生 bundle;emit 1)
    │       ├── gate_develop.py             ← P2 git/untracked diff + C++ 强门控(依赖签名 AR_design + P1 consent;emit 2;闭合锁功能指纹)
    │       ├── gate_test_develop.py        ← P3 测试开发真签名门(★Finding 1:编译前测试代码已写;契约 gtest suite 出现在新测试文件;emit 3)
    │       ├── prepare_test_bundle.py      ← P3 控制层薄层(test_intent_matrix + bundle revision;非真相门,由 gate_test_develop 调用)
    │       ├── gate_build.py               ← P4 编译(捕获 build.sh stdout 判横幅;emit 4)
    │       ├── gate_test_ut.py             ← P5 ohos_unittest 执行(developer_test;emit 5)
    │       ├── gate_device_func.py         ← P6 真机功能(nonce+uptime+hilog+抗伪造三层证明;emit 6;集成复用 --phase 7)
    │       ├── gate_integration.py         ← P7 功能与质量验证(MST + 覆盖率/性能/功耗/稳定性报告;emit 7)
    │       ├── gate_upload_ci.py           ← P8 上库(oh-gc PR + CI 绿,SHA 绑定;emit 8)
    │       ├── schemas/                    ← 控制层各包 draft-07 schema(stage_packet/handoff/repair/…/bundle_definition)
    │       └── lib/{gatelib.py, device.sh} ← 签名账本(HMAC 链+指纹分层)+ 控制层 helper + hdc-over-WSL helper
    ├── ohos-ar-dev-init/               ← 一次性环境配置
    │
    └── (被各阶段调用的现有能力技能,随包携带)
        ohos-dev-sa-codegen/  ohos-dev-napi-module/  code-ruleset-style-check/
        ohos-code-skeletons/  ← 写码脚手架:hiview 插件/单测/模块测试/模糊测试 占位符骨架
        tdd-enforcer/  ohos-dev-build-execution-diagnosis/  ohos-build-flash/
        ohos-test-ut-generation/  ohos-dev-hdc-command-usage/
        ohos-ci-gitcode-cli-usage/  ohos-ci-openharmony-ci-analysis/
        ohos-dev-gitcode-pr-review/  ohos-dev-security-code-review/
        ohos-committer-review/  ohos-dev-cpp-coding-style/
```

---

## 3. 安装 / 部署

本包是**便携副本**(便于版本管理与分享)。有两种使用方式:

### 方式 A:让 Agent 自动发现技能(推荐用于交互式编排)
把本包技能同步到目标 Agent 的技能目录。技能目录可通过 `--target` 精确指定，
也可用 `--agent` 使用常见目录约定；项目 `skills/` 是唯一真源:

```bash
bash sync-skills.sh --agent claude       # 默认兼容旧用法
bash sync-skills.sh --agent codex        # ~/.codex/skills/
bash sync-skills.sh --target "$HOME/.my-agent/skills"  # 任意 Agent
```

之后**重启 Agent 会话**,说「跑流水线 / 从这个 AR 自动开发到上库」即可触发
`ohos-ar-dev-workflow`。(`sync-skills.sh` 是单向拷贝,不会删除目标目录下的其他技能。)

> 依赖技能的脚本路径会自动解析:按 `环境变量 → 包内同级技能 → 旧版 Claude 技能目录`
> 顺序查找所需脚本。复制到任意 Agent 的完整技能目录后，依赖技能会优先从当前安装位置查找。

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
| `oh-gc`(P8 才需) | `npm i -g @oh-gc/cli@latest` + `oh-gc auth login` | **P0 SOFT 检查**(oh-gc 已装 + gitcode token 已配);缺失只告警并给配置指引 |

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
| **P1 设计** | (设计前 kb_search 检索知识库,advisory)写 AR_design.md(6 章节 + ar-contract 契约块) | `gate_design.py`(emit 1) | AR_design.md 6 必含章节齐全 + ar-contract 三非空数组并签名 | `AR_design.md`、`design_check.txt` |
| **P2 开发** | ohos-dev-sa-codegen / -napi-module / code-ruleset-style-check / ohos-dev-cpp-coding-style(OHOS C++ 约定,可选) / ohos-dev-security-code-review(安全左移,advisory) / tdd-enforcer / ohos-code-skeletons | `gate_develop.py`(emit 2) | 已有签名 AR_design **且** 已有绑定的 P1 设计 consent **且** 相对 `base_commit` 有 tracked/untracked 改动 **且** C/C++ 格式 guard + 强规则检查通过;**闭合时锁功能指纹** | `diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt` |
| **P3 测试开发** | ohos-test-ut-generation / tdd-enforcer(**只增独立测试**) | `gate_test_develop.py`(emit 3) | phase2 冻结快照存在 **且** 无新增非测试路径 **且** 契约每个 `test_cases[].gtest` 的 suite 被某个**新测试文件**引用(编写覆盖) | `new_test_files.txt`、`authorship_coverage.txt`、`authored/*`(签名快照) |
| **P4 编译** | ohos-dev-build-execution-diagnosis / ohos-build-flash / code-ruleset-style-check(编译后 clang-tidy) | `gate_build.py`(emit 4) | build.sh exit 0 **且** 输出含 `=====build…successful=====` 且无 error 横幅 **且** 契约 `build_artifacts` 全部编译出 **且** clang-tidy 子步(有 compdb 则 findings 为空硬控;compdb/工具缺失则降级放行并标注) | `build_tail.log`、`build_banner.txt`、`artifact_check.txt`、`clang_tidy_findings.json`、`clang_tidy_note.txt`(失败再加 `error_distill.txt`) |
| **P5 单测执行** | ohos-test-ut-generation / tdd-enforcer | `gate_test_ut.py`(emit 5) | 编出测试二进制 + developer_test 本次**新建**报告 + `tests>0 && failures==0 && errors==0` **且** 契约每个 `test_cases[].gtest` 通过(执行覆盖) | `summary_report.xml`、`result_*.xml`、`gtest_coverage.txt`、`start_sh_stdout.txt`、`report_dir.txt` |
| **P6 真机** | ohos-build-flash / ohos-dev-hdc-command-usage | `gate_device_func.py`(emit 6) | 部署命令全 exit 0 + 主机/设备产物 sha256 一致 + hilog 含**本次 nonce**、功能 marker、运行时 marker、端到端 marker + 契约每个 `device_cases[].marker` 命中 + uptime 单调 + **抗伪造三层**(进程溯源 `process` / `artifact_loaded` 加载证明 / `side_effect` shell 断言 / `absent_before_trigger` 负对照差分);**证据 PASS 后停下,人工核对真机真实结果并 `consent --phase 6` 才推进** | `hilog_capture.txt`、`device_cmds.txt`、`run_meta.txt`、`artifact_runtime_proof.txt`、`device_marker_coverage.txt` |
| **P7 质量验证** | ohos-build-flash / developer_test(MST) / ohos-test-ut-generation / coverage / performance / power / stability / code-ruleset-style-check / ohos-dev-security-code-review | `gate_integration.py`(emit 7;或 `gate_device_func.py --phase 7` + `gate_integration.py`) | 功能 summary `failures==0 && errors==0 && tests>0` **且 覆盖率、性能、功耗、稳定性报告全部生成并签名,代码 review 问题数为 0;证据 PASS 后需人工确认并 `consent --phase 7` 才进入 P8** | `summary_report.xml`、`coverage_report.*`、`performance_report.*`、`power_report.*`、`stability_report.*`、`code_review_report.txt`、`report_dir.txt` |
| **P8 上库** | ohos-ci-gitcode-cli-usage / -gitcode-pr-review / ohos-committer-review(P8-A 补充维度) / -security-code-review / -openharmony-ci-analysis | `gate_upload_ci.py`(emit 8) | P1–P7 全过 + 上库前落全部代码 diff 供人工确认 + **A 本地自检零问题报告(commit 前硬控)** + `git commit -s`(DCO 签名)+ push + **`--issue` 绑定的 PR**(CI 门禁只对绑定 Issue 的 PR 触发)+ **B PR review 零问题报告(建 PR 后、CI 前硬控)** + consent --phase 8 + CI `overall∈{success,passed}` + PR head SHA==push SHA | `full_diff.patch`、`full_diff.stat.txt`、`local_code_review_report.*`、`pr.json`、`pr_create.txt`、`pr_review_report.*`、`ci_status.json` |

每个阶段在 Agent 里的"做事"细节见 `skills/ohos-ar-dev-phases/phaseN-*.md`。

---

## 7. 运行态目录(每个 AR 一个)

证据两轨分离:`evidence/`(机器,HMAC 签名,gitignore)与 `reports/`(人读 Markdown,可脱敏归档)并列。

```
$REPO/specs/pipeline/{YYYYMMDD}-{slug}/
├── pipeline.json        # 规范状态(只有 advance.py 写;含 functional_fingerprint/locked_all_paths)
├── ar.md                # 输入的已澄清 AR 原文
├── AR_design.md         # P1 固化的设计文档(6 必含章节;签名副本在 evidence/phase1/)
├── todo.md              # 人读镜像(由 refresh_todo.py 依 AR_design 重写,与 TodoWrite 双轨)
├── next_action.json     # 导航层:当前逻辑阶段/物理 phase/substate/下一步(controls/ 内有镜像)
├── evidence/            # ← 机器证据(签名,gitignore),真相所在
│   ├── manifest.jsonl   #   追加式 HMAC 链式签名证据账本
│   └── phase0/ … phase8/  # 各阶段真实产物(含 phase1/AR_design.md 签名副本、phase3/authored 测试源快照)
├── controls/            # ← 弱模型控制/导航层(best-effort,非放行依据,可缺失容忍)
│   ├── next_action.json #   与 root 同源镜像
│   ├── packets/         #   各逻辑阶段 Stage Packet(entry/exit/allowed/forbidden;由共享 def 表产)
│   ├── memory_cards/    #   Phase Memory Card(current.json:5~10 条最重要事实,新窗口先读)
│   ├── handoffs/        #   Handoff Packet(阶段→下一阶段事实摘要)
│   ├── repairs/         #   Repair Packet(bundle_revision_from/suspect_*/downstream_revalidate_scope/repair_disallowed_if/regen_trigger_if)
│   ├── receipts/        #   Completion Receipt(semantic_done/truth_layer_pass_known/next_phase_ready/human_gate_pending)
│   ├── indexes/         #   artifact/evidence/report 三类索引(避免在目录里迷路)
│   ├── design_orchestrate/ … upload_review/  # 各逻辑阶段专属产物(bundle 定义 / 子状态快照等)
│   └── test_develop/    #   P3 薄层:signed_test_scope / test_intent_matrix(prepare_test_bundle.py 产)
└── reports/             # ← 人读 Markdown 审计报告(脱敏,可归档),与 evidence/ 分离
    ├── device_functional.md            # 真机功能完整报告
    ├── quality.md                      # 覆盖率/性能/功耗/稳定性 + 代码 review(六段聚合)
    ├── summary.md                      # 上库汇总(背景/设计/修改/用例/结果)
    ├── pr_description.md               # P8 汇总,gate_upload_ci 注入 PR 描述
    └── index.md
```
`pipeline.json` 字段(含 `functional_fingerprint` / `locked_all_paths`)说明见
`skills/ohos-ar-dev-workflow/references/pipeline-schema.md`;`controls/` 各包的字段结构见
`skills/ohos-ar-dev-phases/scripts/schemas/*.schema.json`(draft-07)与
`products/20260723-weak-model-optimization/stage_packet_templates.md`。

> 归档到 `products/` 时用 `archive_product.py --include-reports`:只落脱敏摘要
> (`ar.md` + `manifest_summary.md`)与脱敏 Markdown 报告;原始 `evidence/` 留本地(gitignore)。

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
            consent     --phase N --token <s>   # 记录 P1 设计 / P6 真机 / P7 质量报告 / P8 上库 的人工确认
            reset       --reason <s>            # 改了代码 → 回 P1 重走(打回 P1-P8)
            migrate                             # 在途旧 7 阶段 run 迁到 9 阶段(仅 current_phase<=1;只动 pipeline.json,不碰 manifest)
            verify-all                          # 重校验已通过阶段(篡改/代码漂移则回退)
            status                              # [--json] 含 logical_phase_id/physical_phase/substate/action_kind/control_refs
            next                                # 导航层:输出当前逻辑阶段+下一步(retry/repair/regenerate/escalate),并写 next_action.json
gate_env_init.py    --pipeline-dir P
gate_design.py      --pipeline-dir P [--design F] [--allow-contract-v1]
                    # P1:校验 AR_design.md 6 章节 + ar-contract 契约(v2:拒 TODO/TBD 占位 + 需求/文件/测试/设备引用闭环)并签名(emit 1);派生初始 bundle 定义
gate_develop.py     --pipeline-dir P [--no-style] [--allow-missing-design]
                    # P2:强制依赖签名 AR_design + P1 consent(emit 2,闭合锁功能指纹);--no-style 仅无 C/C++ 改动时兼容;--allow-missing-design 仅 legacy run 留痕放行
gate_test_develop.py --pipeline-dir P [--allow-missing-contract]
                    # P3:编译前测试代码已写(emit 3):契约每个 test_cases[].gtest 的 suite 出现在新测试文件;测试源签名快照;调 prepare_test_bundle 产控制层
prepare_test_bundle.py --pipeline-dir P
                    # P3 控制层薄层(非真相门):冻结快照对齐 + test_intent_matrix + bundle revision 升级 + handoff;由 gate_test_develop 调用
gate_build.py       --pipeline-dir P [--target T]          # P4,emit 4
gate_test_ut.py     --pipeline-dir P --test-target T --suite S [--part P]   # P5,emit 5
gate_device_func.py --pipeline-dir P [--deploy-script f] --scenario-script f --marker M
                    --host-artifact F --device-artifact P
                    --runtime-marker M --e2e-marker M [--phase 6|7]         # P6(emit 6);集成复用 --phase 7
                    # 契约里的 device_cases[].process / artifact_loaded / side_effect / absent_before_trigger 驱动抗伪造三层证明
gate_integration.py --pipeline-dir P [--testtype MST] --suites S1 [S2 …] [--part P]   # P7,emit 7
                    --coverage-report F --performance-report F --power-report F --stability-report F
                    [--code-review-report F]
gate_upload_ci.py   --pipeline-dir P --repo-slug owner/repo --branch B [--base master] [--title T]  # P8,emit 8
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
- **P1/P2**:真实 `git diff` + untracked 文件清单 + `code_ruleset_guard` + `code-ruleset-style-check` 硬规则检查 → PASS → advance。
- **P4**:真跑 `build.sh`,对非法目标捕获到真实 `=====build error=====` + 45 条
  `[OHOS ERROR]`(含 "unknown target")→ FAIL → advance 拒绝。
- **防伪**:篡改 evidence 字节 → `verify-all` 因 sha256 失配降级回退;伪造 manifest
  verdict=PASS → `advance` 因 HMAC 失配拒绝。

**尚未用真特性端到端跑通** P3/P5/P6/P8 —— 需要一个具体 AR + 可构建的 UT 目标 + 真机套件 +
`oh-gc` 登录。各门控已编译通过,且 P4/P5 复用 P4 的构建捕获、P6/P7-设备复用 P0 已验证可达的
`device.sh`。

---

## 11. 设计范式

「thin 入口 + thick 阶段 skill + 确定性门控脚本」三层,借鉴 AID/MigBot 工作流,但
**阶段边界是脚本门控,不是用户点头**(证据自动放行;仅 **P1 设计**、**P6 真机结果**、**P7 质量/review** 与 **P8 上库** 在证据 PASS 后停下等人工签名 consent 确认)。
架构图见 `skills/ohos-ar-dev-workflow/README.md`。

---

## 12. 逻辑阶段控制层(面向弱模型,导航非放行)

为让中等能力模型(如 `minimax2.7`/`glm5.1`)也能稳定跑完整条链,在**不改动真相层**的前提下,
叠加了一层 machine-readable 的执行控制/窗口隔离/失败恢复协议。设计与置信度评估见
`products/20260723-weak-model-optimization/`。

### 12.1 逻辑阶段 P0–P8 与物理 phase 一一对应

物理阶段与逻辑阶段现已 **1:1**(共 9 个,phase0–8)。早期版本曾把物理 phase1 用子状态机压进
三个逻辑子阶段;现已展开为三个独立的真实签名物理阶段:

| 逻辑阶段 | 逻辑名 | 物理 phase | 主门控 |
|---|---|---:|---|
| P0 | bootstrap | 0 | gate_env_init.py |
| P1 | design-orchestrate | 1 | gate_design.py |
| P2 | feature-develop | 2 | gate_develop.py |
| P3 | test-develop | 3 | gate_test_develop.py(真签名门;prepare_test_bundle 为其控制层薄层) |
| P4 | build-verify | 4 | gate_build.py |
| P5 | test-author | 5 | gate_test_ut.py |
| P6 | device-functional | 6 | gate_device_func.py |
| P7 | quality-verify | 7 | gate_integration.py(含 4 子状态) |
| P8 | upload-review | 8 | gate_upload_ci.py(含 7 子状态) |

`advance.py status --json` / `next` 输出 `logical_phase_id / logical_phase_name /
physical_phase / logical_substate / action_kind / control_refs`。P7 子状态:
`integration-run / quality-check / review-check / human-review-await`;P8 子状态:
`precheck / local-review / consent-await / push-pr / pr-review / ci-green / finalize`。

### 12.2 控制包家族(全部落 `controls/`,best-effort,非放行依据)

- **Stage Packet** — 每逻辑阶段唯一执行入口(目标/准入/退出/allowed/forbidden/failure classes),由 `gatelib.STAGE_PACKET_DEFS` 共享 def 表统一产出,9 个 gate 运行时自发。
- **Handoff Packet** — 阶段→下一阶段的事实摘要。
- **Repair Packet** — 修复窗口最小连续上下文(`bundle_revision_from`/`suspect_files`/`suspect_tests`/`downstream_revalidate_scope`/`repair_disallowed_if`/`regen_trigger_if`)。
- **Phase Memory Card** — 5~10 条最重要事实(bundle_revision/current_blocker/forbidden_actions/next_expected_action_class/last_failure_class/human_escalation_needed),新窗口按 `window_startup_order()` 先读。
- **Completion Receipt** — 极短退出凭据(semantic_done/truth_layer_pass_known/next_phase_ready/human_gate_pending)。
- **Development Bundle** — P1 设计派生、P2 开发闭合冻结的开发交付单元(需求/changed_files/构建/测试/设备覆盖义务),draft-07 schema。
- **artifact / evidence / report 三类索引** — 让弱模型不在目录里迷路。

每个包都有 draft-07 schema(`scripts/schemas/*.json`)与 `validate_control_payload()`
**建议性**校验(`validated_by ∈ {jsonschema, structural, none}`);校验失败**只告警不挡写入、
绝不改变门控 verdict**。

### 12.3 失败三分回路

`Retry`(同阶段重试,不动 bundle)/ `Repair`(新窗口修复,bundle revision 升级,声明
`downstream_revalidate_scope ∈ {P4_only, P4_P5, P4_to_P6, P4_to_P7, all_downstream}`)/
`Regenerate`(越设计边界 → 回 P1/P2/P3 重派生)。§10 判定矩阵机械化为
`REGENERATE_FAILURE_CLASSES` 与 regen 信号;双熔断 `MAX_RETRY_ROUNDS`/`MAX_REPAIR_ROUNDS`
(默认各 2)超预算即人工升级;`external_api_unstable`(外部 API/网络瞬时不可用)与真红 CI
区分后直接升级人工。

> **不变式**:控制层的一切写入都是 best-effort,`pipeline.json` 唯一写入者仍是 `advance.py`,
> 放行唯一真相源仍是 `evidence/manifest.jsonl` 签名记录。控制 JSON 永远不是第二真相源。
