# 上库 CI 示例

> 给一个 P6(物理 phase 8)上库示例:issue → dry run → local review → consent → push → PR review → CI。

## 场景

P8 上库阶段是整条流水线的最后一环,含两道硬控 review 门 + 唯一对外不可逆动作(push)。

## 完整路径

### 1. 建 issue

```bash
oh-gc issue create --repo <owner/repo> --title "<标题>" --body "<背景/需求>"
```

**关键**:CI 门禁只对绑定 Issue 的 PR 触发,所以必须先有 issue。

### 2. dry run(本地自检)

不实际 push/建 PR,先本地跑一遍门控验证:

```bash
python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
    --repo-slug <owner/repo> --branch <分支> --base master \
    --issue <N> \
    --local-review-report <本地自检报告> \
    --pr-review-report <PR review 报告>
```

不带 `--allow-push` 时只校验不执行对外动作。

### 3. local review(A 门)

`--local-review-report` 携带的报告必须计数为 0,才允许 `git commit -s`(DCO 签名):

- JSON:`issue_count/finding_count/...==0` 或 `issues/findings/...` 空数组
- 文本:`review_issue_count=0`

报告由 `code-ruleset-style-check` + `ohos-dev-security-code-review` 产出。任一非零/缺失 → FAIL,改代码后 `reset` 回 P1。

### 4. consent(人工确认)

本地自检零问题 + commit 后,**不自动 push**——停下等人工确认:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 8 --token <人>
```

没令牌时 `advance` 会 HOLD。这是最后一次人工确认,确保上库真实被人工核对。

### 5. push

```bash
git push origin <分支>
```

push 是**唯一对外不可逆动作**——一旦 push,代码就到了远端。所以必须 consent 后才执行。

### 6. 建 PR

```bash
oh-gc pr create --repo <owner/repo> --head <分支> --base master \
    --issue <N> --title "<标题>"
```

`--issue <N>` 必填——CI 门禁只对绑定 Issue 的 PR 触发。

`gate_upload_ci.py` 会校验 PR head SHA == push SHA,不一致即 FAIL。

### 7. PR review(B 门)

建 PR 后、CI 前的硬控:`--pr-review-report` 必须计数为 0,才允许触发 CI。

报告由 `ohos-dev-gitcode-pr-review` 产出。任一非零/缺失 → FAIL。

### 8. CI

```bash
oh-gc pr view --pr <N>      # 查 PR 状态
# CI 分析用 ohos-ci-openharmony-ci-analysis skill
```

CI `overall∈{success,passed}` + PR head SHA==push SHA → 证据 PASS。

`render_report --kind summary` 渲染 `reports/summary.md` + `pr_description.md` 注入 PR(背景/设计/修改/用例/结果)。

## 两道 review 门对照

| 门 | 时机 | 报告字段 | 硬控 |
|---|---|---|---|
| A 本地自检 | commit 前 | `--local-review-report` | 计数==0 才 commit |
| B PR review | 建 PR 后、CI 前 | `--pr-review-report` | 计数==0 才触发 CI |

两道都要求机器可读问题计数,文字不算。

## P8 子状态

P6(物理 phase 8)含 7 子状态:`precheck / local-review / consent-await / push-pr / pr-review / ci-green / finalize`。

`advance.py status --json` 输出 `logical_substate`,编排器据此导航。

## 常见误区

- **想不建 issue 直接建 PR**:不行,`--issue N` 必填
- **以为 commit 了就上库**:不够,还要 push + PR + PR review 零问题 + CI 绿 + consent
- **PR head SHA 与 push SHA 不一致**:gate 校验 SHA 绑定,不一致即 FAIL
- **本地自检报告有文字但没计数**:gate 只认机器可读计数,文字不算

## 延伸阅读

- [P8 上库阶段](/workflow/phase-8-upload) — 两道 review 门与 issue 绑定
- [Skill 实战:GitCode PR 与 review](/skill-playbooks/gitcode-pr-and-review) — oh-gc + pr-review 详解
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 C 上库前自检
- [关键命令](/reference/key-commands) — oh-gc / advance 常用命令速查
