# pipeline.json 状态结构

每个 AR 一个运行态目录:`$OHOS_ROOT/specs/pipeline/{YYYYMMDD}-{ar-slug}/`

```
pipeline.json          # 规范状态;只有 advance.py 写
todo.md                # 人读镜像(由 refresh_todo.py 依 AR_design 重写,与 TodoWrite 双轨)
ar.md                  # 输入的已澄清 AR 原文
AR_design.md           # P1a 固化的设计文档(6 必含章节;签名副本在 evidence/phase1/)
evidence/              # 机器证据(签名,gitignore)——真相所在
  manifest.jsonl       # 追加式、HMAC 链式签名证据账本
  phase0/ … phase6/    # 各阶段真实产物:AR_design.md / summary_report.xml /
                       # hilog_capture.txt / diff.patch / pr.json / ci_status.json ...
reports/               # 人读 HTML 审计报告(脱敏,可归档)——与 evidence/ 并列分离
  device_functional.html / quality.html / summary.html
  pr_description.md    # P6 汇总,gate_upload_ci 注入 PR 描述
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

`code_fingerprint`:**旧全量指纹**(组件仓 `git diff base_commit` + `untracked 文件内容` sha256),
保留供 legacy run 兼容。

`functional_fingerprint`:P1 锁定的**功能指纹**——只对**非测试路径**的变更内容计算 sha256(相对
`base_commit`,commit 无关)。P2–P6 推进前比对,**功能代码/配置内容一改就拒绝**,要求 `advance.py reset`
回 P1;`verify-all` 同样按功能漂移回退。测试文件的增改不影响它。

`locked_all_paths`:P1 锁定时的全量变更路径基线。P3/P4/P5 推进时,**新出现的路径必须都是测试路径**
(`test/`/`unittest/`/`*Test.cpp` 等,含 test 目录下 BUILD.gn),否则拒绝——保证"只增独立测试、
不改功能代码"。`reset` 会清空 `functional_fingerprint`/`locked_all_paths`/`code_fingerprint`/`consent_tokens`(P0 保留)。
