# pipeline.json 状态结构

每个 AR 一个运行态目录:`$OHOS_ROOT/specs/pipeline/{YYYYMMDD}-{ar-slug}/`

```
pipeline.json          # 规范状态;只有 advance.py 写
todo.md                # 人读镜像(与 TodoWrite 双轨)
ar.md                  # 输入的已澄清 AR 原文
evidence/
  manifest.jsonl       # 追加式、HMAC 签名证据账本(真相所在)
  phase0/ … phase6/    # 各阶段真实产物:build_tail.log / summary_report.xml /
                       # hilog_capture.txt / diff.patch / pr.json / ci_status.json ...
```

## pipeline.json 字段

```json
{
  "run_id": "20260629-<slug>",
  "ar": "20260629-<slug>",
  "repo": "$OHOS_ROOT",
  "product": "rk3568",
  "device_serial": "",
  "build_target": "<gn target>",
  "test": { "part": "<testpart>", "ut_suites": [], "mst_suites": [] },
  "base_commit": "<phase1 起点 SHA>",
  "current_phase": 0,
  "consent_tokens": {},
  "code_fingerprint": null,
  "phases": [
    { "id": 0, "name": "bootstrap",        "status": "passed",
      "manifest_ref": "<闭合记录的 id>", "closed_at_utc": "..." },
    { "id": 1, "name": "develop",          "status": "pending", "manifest_ref": null, "closed_at_utc": null },
    { "id": 2, "name": "build-verify",     "status": "pending", "...": null },
    { "id": 3, "name": "test-author",      "status": "pending", "...": null },
    { "id": 4, "name": "device-functional","status": "pending", "...": null },
    { "id": 5, "name": "quality-verify",   "status": "pending", "...": null },
    { "id": 6, "name": "upload-review",    "status": "pending", "...": null }
  ]
}
```

`status ∈ pending | running | passed | failed`。`manifest_ref` = 闭合该阶段的 manifest 记录
规范字节的 sha256(可在账本中回溯到具体证据)。

`device_serial` 初始为空,由 P0 `gate_env_init.py` 在真机上自动探测(`hdc list targets` 唯一设备)
后回填,或由 `init --device-serial` / 环境变量 `$DEVICE_SERIAL` 显式指定。**不写死任何机器特定值。**

`consent_tokens` 记录需人工签字的阶段令牌(`{"4": "...", "5": "...", "6": "..."}`):**P4 真机功能测试**、
**P5 质量/review 报告** 与 **P6 上库** 在证据 PASS 后需人工核对真实结果/审批,
`advance.py consent --phase N --token <人>`
写入后该阶段才可 `advance`。没有对应令牌时 `advance --phase 4|5|6` 会 HOLD,不推进。

`code_fingerprint`:P1(开发)通过时锁定的代码指纹(组件仓 `git diff base_commit` + `untracked 文件内容` 的 sha256,相对 `base_commit` 计算,**与是否已 commit 无关**)。
P2–P6 推进前会比对当前指纹,**一旦改过代码内容就拒绝推进**,要求 `advance.py reset` 回 P1 重走;P6 上库的 `git commit -s` 因指纹 commit 无关而不触发拒绝;
`reset` 会把 P1–P6 打回 pending、清空 `consent_tokens` 与 `code_fingerprint`(P0 保留)。
