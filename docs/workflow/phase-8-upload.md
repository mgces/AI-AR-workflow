# P8 上库

> 本页拆解 P8(物理 phase 8)的本地 review / PR review / issue / PR / CI / consent、不可逆动作的边界、GitCode skill 组合方式。

## 上库后端按环境分支

P8 的上库后端取自 `pipeline.json` 的 `environment`(由 `lib/environments.py` 解析):

| 环境 | 后端 | 上库方式 | `--repo-slug` / `--issue` |
|---|---|---|---|
| `openharmony`(默认) | gitcode | `oh-gc` 建 PR + OpenHarmony CI 绿 | 必填 |
| `harmonyos` | gerrit | `git push refs/for/<base>` + Gerrit review 标签作 CI 绿等价 | 不适用 |

**两道 review 门 + 人工 consent + head-SHA 绑定在两种后端下照旧复用**——只是「push+建 PR」「查 CI 绿」这两步换成对应后端的命令。**Gerrit 后端目前为占位**:内部 push/review 查询命令未填时门控**硬失败并打印"待填"提示**(与编译命令占位同风格),须在 `gate_upload_ci.py` 的 gerrit 分支填入真实命令后才能上库。

> 本页以下步骤以 **gitcode(openharmony)** 后端为例;gerrit 后端的 P8 子状态机、两道 review 门、consent、SHA 绑定完全一致,仅 push/PR/CI 三步的底层命令不同。

## P8 两道 review 门

P8 是上库阶段,含两道硬控 review 门:

### A 本地自检零问题报告(commit 前硬控)

`--local-review-report F` 携带的报告必须计数为 0,才允许 `git commit -s`(DCO 签名)。

### B PR review 零问题报告(建 PR 后、CI 前硬控)

`--pr-review-report F` 携带的报告必须计数为 0,才允许触发 CI。

两道 review 报告契约同 P7:JSON `issue_count/finding_count/...==0` 或文本 `review_issue_count=0`。

## issue / PR / CI 联动

`gate_upload_ci.py`(emit 8)参数:

```bash
gate_upload_ci.py --pipeline-dir P --repo-slug owner/repo --branch B [--base master] [--title T]
    --issue N                         # 建 PR 必填(CI 门禁只对绑定 Issue 的 PR 触发;仅 gitcode)
    --local-review-report F           # A 本地自检零问题报告(commit 前硬控)
    --pr-review-report F              # B PR review 零问题报告(建 PR 后、CI 前硬控)
    [--pr N] [--allow-push]           # push+commit -s(DCO)只在 --allow-push 时发生
```

> `--repo-slug` / `--issue` 仅 **gitcode(openharmony)** 后端适用且必填;gerrit(harmonyos)后端不需要,改用 `--base` 指定 refs/for 目标分支。

流程:

1. A 本地自检==0(commit 前硬控)
2. `git commit -s`(DCO 签名)
3. push
4. 建绑定 Issue 的 PR(`--issue N` 必填,CI 门禁只对绑定 Issue 的 PR 触发)
5. B PR review==0(建 PR 后、CI 前硬控)
6. consent --phase 8(人工确认上库)
7. CI `overall∈{success,passed}` + PR head SHA==push SHA

`render_report --kind summary` 渲染 `reports/summary.md` + `pr_description.md` 注入 PR(背景/设计/修改/用例/结果)。

## 不可逆动作的边界

P8 的 push 是**唯一对外不可逆动作**——一旦 push,代码就到了远端。所以 P8 证据 PASS 后**不自动放行**:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 8 --token <人>
```

没令牌时 `advance` 会 HOLD。这是最后一次人工确认,确保上库真实被人工核对。

## GitCode skill 组合方式

| skill | 作用 |
|---|---|
| [`ohos-ci-gitcode-cli-usage`](/skill-playbooks/gitcode-pr-and-review) | oh-gc CLI 建 issue / PR / 管 review / label / release |
| [`ohos-dev-gitcode-pr-review`](/skill-playbooks/gitcode-pr-and-review) | PR review 草稿与显式确认提交 |
| `ohos-dev-security-code-review` | 安全 review |
| [`ohos-ci-openharmony-ci-analysis`](/reference/skill-map) | CI 状态分析(DCP event / build label / artifact) |

## P8 子状态

P8(物理 phase 8)含 7 子状态:`precheck / local-review / consent-await / push-pr / pr-review / ci-green / finalize`。

`advance.py status --json` 输出 `logical_substate`。

## 顺序边界

P8 是最后一阶段,在 P7 质量之后:

```
P7 质量验证 → consent → P8 上库 → consent → 完成 ✅
```

P8 通过(`advance --phase 8` 成功)即流水线完成。

## 常见误区

- **想不建 issue 直接建 PR**:不行。`--issue N` 必填,CI 门禁只对绑定 Issue 的 PR 触发
- **以为 commit 了就上库**:不够。还要 push + 建 PR + PR review 零问题 + CI 绿 + consent
- **PR head SHA 与 push SHA 不一致**:gate 校验 SHA 绑定,不一致即 FAIL
- **本地自检报告有文字但没计数**:gate 只认机器可读计数,文字不算

## 延伸阅读

- [Skill 实战:GitCode PR 与 review](/skill-playbooks/gitcode-pr-and-review)
- [上库 CI 示例](/examples/upload-ci-example) — issue → dry run → local review → consent → push → PR review → CI
- [门控契约](/reference/gate-contract) — gate_upload_ci 两道 review 门
- [关键命令](/reference/key-commands) — gate_upload_ci 命令速查
