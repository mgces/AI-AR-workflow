# 新增功能端到端

> 主打示例:从一个新 AR 开始,到设计、开发、编译、测试、真机、质量、上库的完整路线。每一步标注用户做什么 / workflow 做什么 / gate 检查什么 / 何时停下人工确认。

## 场景

以根 README 的示例 AR 为例:

> 在 `base/hiviewdfx/hiview` 下面新增一个线程泄漏检测插件,阈值 3000,超过阈值后只触发一次调用。
> 调用 hidumper sa 的能力获取进程线程维测,然后通过 `LogCatcherUtils::DumpStacktrace` 抓取当前应用调用栈,
> 并保存一份线程泄漏文件在 `data/log/reliability/resource_leak/thread_leak/` 中。

## 步骤 0:环境预检(P0)

### 用户做什么
1. 确认本 AR 要编译的部件(默认候选 hiview 部件)
2. 调用 `/ohos-ar-dev-init`

### workflow 做什么
1. 编排器建运行态 `$PDIR = specs/pipeline/{date}-{slug}/`
2. 跑 `gate_env_init.py` 逐项校验 build/compile/git/testfwk/hdc/真机

### gate 检查什么
- HARD:build.sh / 编译探针 / 组件子仓 git / developer_test / hdc 二进制 / 真机在线
- SOFT:oh-gc / gitcode token(缺失只告警)

### 是否停下
否,自动 advance --phase 0。

## 步骤 1:设计固化(P1a,物理 phase 1)

### 用户做什么
1. 把已澄清的 AR 文本交给编排器
2. 调用 `/ohos-ar-dev-workflow <AR 文本>`

### workflow 做什么
1. `kb_search.py` 检索知识库生成 `design_refs.md`(advisory)
2. 写 `AR_design.md`(6 必含章节 + 内嵌 ar-contract 契约块)
3. 跑 `gate_design.py`(emit 1)

### gate 检查什么
- AR_design.md 6 必含章节齐全
- ar-contract 三非空数组(`build_artifacts`/`test_cases`/`device_cases`)
- v2 拒 TODO/TBD 占位 + 引用闭环
- 并签名

### 是否停下
**是**——PASS 后停下,把签名 AR_design 与编译路径呈现给用户,等 consent。

## 步骤 2:设计确认(P1 consent)

### 用户做什么
1. 复核签名 AR_design 与编译路径
2. 同意后 `advance.py consent --phase 1 --token <你的确认令牌>`

### workflow 做什么
记录绑定签名设计条目的 consent令牌(重跑 gate_design 即作废)。

### gate 检查什么
此时不校验,consent 将在 P2 `gate_develop.py` 内强校验(没签字 P2 直接 FAIL)。

### 是否停下
**是**——等用户 consent 才继续。

## 步骤 3:代码开发(P1b,物理 phase 2)

### 用户做什么
无,编排器自动调度。

### workflow 做什么
1. 调用 `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `ohos-code-skeletons` 写代码
2. 调用 `code-ruleset-style-check` / `tdd-enforcer` 门控代码质量
3. 跑 `gate_develop.py`(emit 2)

### gate 检查什么
- 已有签名 AR_design 且已有绑定的 P1 consent
- 相对 base_commit 有 tracked/untracked 改动
- C/C++ 格式 guard + 强规则检查通过
- 闭合时**锁定功能指纹**(仅非测试路径)

### 是否停下
否,自动 advance --phase 2。

## 步骤 4:测试开发(P3,物理 phase 3)

### 用户做什么
无,编排器自动调度。

### workflow 哈什么
1. 调用 `ohos-test-ut-generation` 按契约 `test_cases[].gtest` 生成新增独立测试文件
2. 调用 `tdd-enforcer` 约束测试质量
3. 跑 `gate_test_develop.py`(emit 3)

### gate 检查什么
- phase2 冻结快照存在
- 无新增非测试路径
- 契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件(编写覆盖)
- 测试源签名快照

### 是否停下
否,自动 advance --phase 3。

## 步骤 5:编译(P4,物理 phase 4)

### 用户做什么
无,编排器自动调度。

### workflow 做什么
1. 调用 `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` 编译
2. 跑 `gate_build.py`(emit 4)

### gate 检查什么
- build.sh exit 0
- 输出含成功横幅 `=====build…successful=====` 且无 error
- 契约 `build_artifacts` 全部编译出

### 是否停下
否,自动 advance --phase 4。

## 步骤 6:单测执行(P5,物理 phase 5)

### 用户做什么
无,编排器自动调度。

### workflow 做什么
1. 调用 `ohos-test-ut-generation` 用 developer_test 跑单测
2. 跑 `gate_test_ut.py`(emit 5)

### gate 检查什么
- 编出测试二进制
- developer_test 本次**新建**报告
- `tests>0 && failures==0 && errors==0`
- 契约每个 `test_cases[].gtest` 通过(执行覆盖)

### 是否停下
否,自动 advance --phase 5。

## 步骤 7:真机功能(P6,物理 phase 6)

### 用户做什么
1. 真机阶段证据 PASS 后停下,人工核对真机真实结果
2. 同意后 `advance.py consent --phase 6 --token <人>`

### workflow 做什么
1. 调用 `ohos-build-flash` 增量构建 + 部署到设备
2. 调用 `ohos-dev-hdc-command-usage` scenario 触发 + hilog 抓取
3. 跑 `gate_device_func.py`(emit 6)
4. 渲染 `reports/device_functional.md` + `reports/test_report.md`

### gate 检查什么
- 部署命令全 exit 0
- 主机/设备产物 sha256 一致
- hilog 含本次 nonce、功能 marker、运行时 marker、端到端 marker
- 契约每个 `device_cases[].marker` 命中
- uptime 单调
- 抗伪造三层(进程溯源 / artifact_loaded / side_effect / 负对照差分)

### 是否停下
**是**——证据 PASS 后停下,等人工核对并 consent。

## 步骤 8:质量验证(P7,物理 phase 7)

### 用户做什么
1. 质量/review 报告 PASS 后停下,人工核对
2. 同意后 `advance.py consent --phase 7 --token <人>`

### workflow 做什么
1. 跑 coverage / performance / power / stability 报告
2. 跑 `code-ruleset-style-check` / `ohos-dev-security-code-review` 产 review 报告
3. 跑 `gate_integration.py`(emit 7)
4. 渲染 `reports/quality.md`

### gate 检查什么
- 功能 summary `failures==0 && errors==0 && tests>0`
- 覆盖率/性能/功耗/稳定性报告全部生成并签名
- 代码 review 问题数为 0(机器可读计数)

### 是否停下
**是**——证据 PASS 后停下,等人工核对并 consent。

## 步骤 9:上库(P8,物理 phase 8)

### 用户做什么
1. 本地自检零问题 + PR review 零问题 + CI 绿后停下,人工确认上库
2. 同意后 `advance.py consent --phase 8 --token <人>`

### workflow 做什么
1. 跑 `gate_upload_ci.py`(emit 8)的 A 门:本地自检零问题 → `git commit -s`(DCO) → push → 建 issue 绑定 PR
2. 跑 B 门:PR review 零问题 → CI `overall∈{success,passed}` + PR head SHA==push SHA
3. 渲染 `reports/summary.md` + `pr_description.md` 注入 PR

### gate 检查什么
- A 本地自检零问题报告(commit 前硬控)
- B PR review 零问题报告(建 PR 后、CI 前硬控)
- `--issue N` 必填(CI 门禁只对绑定 Issue 的 PR 触发)
- CI overall∈{success,passed} + PR head SHA==push SHA

### 是否停下
**是**——证据 PASS 后停下,等人工确认上库(唯一不可逆)并 consent。

## 完成

P8 通过(`advance --phase 8` 成功)即流水线完成。编排器给用户一份汇总:PR 链接 + CI 状态 + 各阶段证据路径。

归档产物到 `products/`:

```bash
python3 archive_product.py --pipeline-dir "$PDIR" --product-dir products/<run> --include-reports
```

只产脱敏摘要,原始可验签证据留在本地(已 gitignore)。

## 常见误区

- **以为中间步骤能跳过**:不能。阶段顺序固定,不可跳
- **改了代码想继续当前阶段**:不行。必须 reset 回 P1 重走
- **真机日志没 nonce**:scenario 必须把 `$GATE_NONCE` 打进设备日志,否则无法证明日志是本次的

## 延伸阅读

- [生命周期总览](/workflow/lifecycle-overview) — 每个阶段的输入/产物/是否停下
- [Consent 与 Reset](/workflow/consent-and-reset) — 为什么四处要人工确认
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 A 的 skill 组合表
