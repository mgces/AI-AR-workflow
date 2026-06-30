# P6 代码上库 review(upload-review)

**唯一对外不可逆动作。** 即使全自动,push 前必须有人工一次性同意。

## 做事(调用现有技能)
- 上库前自检:`ohos-dev-security-code-review`(IPC/权限/并发/隐私)、`ohos-dev-gitcode-pr-review`
  (本地 review draft)。把结论落到 `$PDIR/evidence/phase6/`。
- GitCode 操作:`ohos-ci-gitcode-cli-usage`(`oh-gc`,必要时 `npm i -g @oh-gc/cli@latest` 并 `oh-gc auth login`)。
- CI 判读:`ohos-ci-openharmony-ci-analysis`(脚本 `openharmony_ci.py`)。

## 前置(门控会强校验)
P1–P5 全部 `status==passed`(看 `advance.py status`)。

## 步骤
1. 先 DRY(不推送、不产 PASS),确认分支/PR 计划:
   ```bash
   python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" \
       --repo-slug <owner/repo> --branch <local_branch> --base master --title "<title>"
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
       --title "<title>" --allow-push
   ```
脚本逻辑:`git push` → `oh-gc pr create` → `oh-gc pr view --json`(取 PR head SHA)→
`openharmony_ci.py --pr N --repo ... --json`(取 `overall_result`)。证据:`pr.json`、
`ci_status.json`、`pr_create.txt`。

## 通过条件
PR 已创建 **且** CI `overall_result ∈ {success,passed}` **且** PR head SHA == 本次 push 的 SHA
(SHA 不可变,杜绝旧绿冒充)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 6   # 同时再校验 consent 令牌
```
完成后给用户:PR 链接 + CI 状态 + 各阶段证据路径。
