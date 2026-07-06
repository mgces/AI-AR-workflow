# P6 代码上库 review(upload-review)

**唯一对外不可逆动作。** 即使全自动,push 前必须有人工一次性同意。

## 做事(调用现有技能)
- 上库前自检:`ohos-dev-security-code-review`(IPC/权限/并发/隐私)、`ohos-dev-gitcode-pr-review`
  (本地 review draft)。把结论落到 `$PDIR/evidence/phase6/`。
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
   `full_diff.stat.txt`,相对 `base_commit`)并打印改动统计,**作为上库前给人工确认的内容**。
   编排器到这里必须停下,把这份 diff/统计呈现给用户核对。
2. **人工同意**后记录一次性令牌:
   ```bash
   python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 6 --token "<approver-or-ticket>"
   ```
3. 正式 push + 建 PR + 校验 CI:
   ```bash
   python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
       --repo-slug <owner/repo> --branch <local_branch> --base master \
       --title "<title>" --issue <issue编号> --allow-push
   ```
脚本逻辑:`git add -A && git commit -s`(有未提交改动才提交,`-s` 自动补 DCO `Signed-off-by`)→
`git push` → `oh-gc pr create`(PR body 用仓库模板并把 `**IssueNo**` 填成 `#编号`)→
`oh-gc pr view --json`(取 PR head SHA)→
`openharmony_ci.py --pr N --repo ... --json`(取 `overall_result`)。证据:`pr.json`、
`ci_status.json`、`pr_create.txt`。

> **`--issue` 必填**:缺 `--issue`(且非 `--pr` 复验)会在建 PR 前 fail-closed,避免建出"门禁永远不触发"的 PR。
> **提交与代码指纹**:代码指纹相对 `base_commit` 计算(commit 无关),因此 P6 这里 `git commit -s`
> **不会**被判"代码漂移"。反之,**进入 P6 后若又改了代码内容**,指纹相对 base 变化,`advance --phase 6`
> 仍会拒绝并要求 `advance.py reset` 回 P1 重走。

## 通过条件
PR 已创建 **且** CI `overall_result ∈ {success,passed}` **且** PR head SHA == 本次 push 的 SHA
(SHA 不可变,杜绝旧绿冒充)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 6   # 同时再校验 consent 令牌
```
完成后给用户:PR 链接 + CI 状态 + 各阶段证据路径。
