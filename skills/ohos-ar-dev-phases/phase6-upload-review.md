# P6 代码上库 review(upload-review)

**唯一对外不可逆动作。** 即使全自动,push 前必须有人工一次性同意。

## 做事(调用现有技能)
两道 code review 夹住上库,均要求**机器可读的零问题报告**(与 P5 同一 review 报告契约:
JSON `issue_count/finding_count/...==0` 或 `issues/findings/...` 空数组,或文本 `review_issue_count=0`):

- **A. 本地自检(commit 之前)**:对 `git diff base_commit` 的改动做 review。
  `ohos-dev-cpp-coding-style`(review 模式)+ `ohos-dev-security-code-review`(IPC/权限/并发/隐私)。
  产出机器可读零问题报告(如 `local_review.txt` 含 `review_issue_count=0` 或 `local_review.json`)。
  **有问题 → 改代码 → `advance.py reset` 回 P1 重走**。
- **B. PR review(建 PR 之后、CI 校验之前)**:PR 已存在,用 `ohos-dev-gitcode-pr-review` 拉 PR
  上下文做 review,产出机器可读零问题报告(如 `pr_review.json`)。
  **有问题 → 改代码 → `advance.py reset` 回 P1 重走**。
- **报告要求**:不管 review 出多少问题,**全部错误 + 已完成的修改都写进报告**(供人工 consent 复核);
  gate 只对报告里的**机器可读问题计数**做确定性判定(计数为 0 才放行)。
- GitCode 操作:`ohos-ci-gitcode-cli-usage`(`oh-gc`,必要时 `npm i -g @oh-gc/cli@latest` 并 `oh-gc auth login`)。
- CI 判读:`ohos-ci-openharmony-ci-analysis`(脚本 `openharmony_ci.py`)。

## 前置(门控会强校验)
P1–P5 全部 `status==passed`(看 `advance.py status`)。
**先建好关联 Issue**(OpenHarmony CI 门禁只对绑定了 Issue 的 PR 触发):
```bash
oh-gc issue create --repo <owner/repo> --title "<标题>" --body "<描述>"   # 记下返回的 #编号
```

## 步骤
1. 先 DRY(不推送、不产 PASS),确认分支/PR 计划:
   ```bash
   python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
       --repo-slug <owner/repo> --branch <local_branch> --base master \
       --title "<title>" --issue <issue编号>
   ```
   DRY 会**把全部代码改动的 diff 落到 `evidence/phase6/`**(`full_diff.patch` +
   `full_diff.stat.txt`,相对 `base_commit`)并打印改动统计与"需两份零问题 review 报告"提示,
   **作为上库前给人工确认的内容**。编排器到这里必须停下,把这份 diff/统计呈现给用户核对。
2. **先跑 A 本地自检**,产出零问题报告;若有问题,改代码后 `advance.py reset --reason "<改了什么>"` 回 P1 重走。
3. **人工同意**后记录一次性令牌:
   ```bash
   python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 6 --token "<approver-or-ticket>"
   ```
4. 正式上库(带 A 报告;push+建 PR 后编排器跑 B review 产出 `pr_review` 报告,再带 B 报告重跑本门控):
   ```bash
   python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
       --repo-slug <owner/repo> --branch <local_branch> --base master \
       --title "<title>" --issue <issue编号> --allow-push \
       --local-review-report <A报告路径> --pr-review-report <B报告路径>
   ```
脚本逻辑(硬控顺序):
**A 硬控**(解析 `--local-review-report`,非零/缺失/无计数 → FAIL,不 commit 不 push)→
`git add -A && git commit -s`(有未提交改动才提交,`-s` 自动补 DCO `Signed-off-by`)→
`git push` → `oh-gc pr create`(PR body 用仓库模板并把 `**IssueNo**` 填成 `#编号`)→
`oh-gc pr view --json`(取 PR head SHA)→
**B 硬控**(解析 `--pr-review-report`,非零 → FAIL,不进 CI 校验、不 PASS)→
`openharmony_ci.py --pr N --repo ... --json`(取 `overall_result`)。
证据:`local_code_review_report.*`、`pr.json`、`pr_create.txt`、`pr_review_report.*`、`ci_status.json`。

> **两报告必填**:A/B 任一缺失或非零问题,gate 都 fail-closed。B 失败时 PR 已建(不可逆),
> 修复途径是**改代码 → `advance.py reset` 回 P1 重走**(下次上库会 push 新提交、更新同一 PR)。
> **`--issue` 必填**:缺 `--issue`(且非 `--pr` 复验)会在建 PR 前 fail-closed,避免建出"门禁永远不触发"的 PR。
> **提交与代码指纹**:代码指纹相对 `base_commit` 计算(commit 无关),因此 A 通过后的 `git commit -s`
> **不会**被判"代码漂移"。反之,**进入 P6 后若又改了代码内容**(含 review 后的修复),指纹相对 base 变化,
> `advance --phase 6` 仍会拒绝并要求 `advance.py reset` 回 P1 重走。

## 通过条件
A 本地自检报告零问题 **且** B PR review 报告零问题 **且** PR 已创建 **且**
CI `overall_result ∈ {success,passed}` **且** PR head SHA == 本次 push 的 SHA
(SHA 不可变,杜绝旧绿冒充)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 6   # 同时再校验 consent 令牌
```
完成后给用户:PR 链接 + CI 状态 + 各阶段证据路径。
