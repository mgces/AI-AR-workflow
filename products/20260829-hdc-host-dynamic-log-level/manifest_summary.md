# 证据与产物摘要（脱敏）

> 本文件是 standalone AR Workflow 的人读摘要，不是目标仓库 P0～P8 流水线生成的 HMAC 账本。未归档访问令牌、设备标识、CI 会话数据或本地私有路径；所有列出的文档均可用 SHA-256 复核。

- run_id: `20260829-requirement-add-host-dynamic-log-level`
- workflow: `REQUIREMENT_CLARIFYING -> ARCHITECTURE_DESIGNING -> TESTCASE_DESIGNING -> DEVELOPING`
- source_repo: `openharmony/developtools_hdc`
- source_base: `7a47ffb4b74b8b44ebf801c98e352e020427ce06`
- source_head: `4804486da102698fad018d9c14c5838b3c420a70`
- source_pr: `https://gitcode.com/openharmony/developtools_hdc/merge_requests/2515`
- linked_issue: `https://gitcode.com/openharmony/developtools_hdc/issues/1956`

## REQUIREMENT_CLARIFYING — PASS

- reason: 用户目标、命令范围、运行态语义、兼容边界与性能重点已收敛。
- artifacts:
  - `workflow/clarification.md` : `c5aee24052e653d62a0407201da27ed1ca795cc6d9e1b85152c0c85de97784c5`
  - `workflow/requirement-spec.md` : `18217ae97eef066d3ddde902a6924a4fbfe7d1b1e6d241666b035a478f5895e7`

## ARCHITECTURE_DESIGNING — PASS

- reason: F-001～F-006 已映射到 host CLI、原子状态、日志热路径、libusb、安全边界、风险与回滚；包含控制流和热路径 Mermaid 图。
- artifacts:
  - `workflow/architecture.md` : `540b81abdefdb6c8d0e60708b9fa90024699a1cd0bd63860736807657fa45847`

## TESTCASE_DESIGNING — PASS

- reason: 6 个功能点均有测试，13 个 TC 定义完整，14 组 F/TC pair 覆盖正常、边界、异常、并发、性能回归、兼容和安全路径。
- artifacts:
  - `workflow/test-cases.md` : `7a8ea459ffef5f4fa7ee849495cba2cd97b79827d4b8fc00c5ec496fe9cdb240`
  - `workflow/feature-test-matrix.md` : `024e1fe87fd4bc323acaf9c1b24d475f889e668f5ea39aa70bb936d02a7015a9`

## DEVELOPING — PASS

- reason: 每个任务声明关联 F/TC；Linux/Windows 构建、相关测试对象、host-native smoke、隔离 server e2e、静态检查和上游门禁均有真实证据。
- artifacts:
  - `workflow/tasks.md` : `3461cf277304b1213f6a72c0807099ee45563742b428955e562376c44588e026`
  - `workflow/apply-report.md` : `d452bce85e9779728190b68c34bc48b21d01c359e5bcdf201f0bc1b41d2aeb78`
  - `workflow/todo.md` : `e92f5756706490f30816bc980ca72a8e46831f8910d235c004c8ae812889e2b8`

## PAIR VALIDATION — PASS

- actual run: 等价 Python pair validator。
- result: 6/6 features covered；13/13 tests defined；14/14 F/TC pairs verified。
- replay command on Windows: `powershell -ExecutionPolicy Bypass -File workflow/validate-change.ps1 -ChangeDir workflow`
- validator:
  - `workflow/validate-change.ps1` : `807840aecaffee14a5fcd9dce04ec59a7330653b1794b19c79737e4fe9abba34`

## 人读归档

  - `README.md` : `f4392e677ae2544d0c0cfb404d596b836928d10a0095210cfef033aefc477613`
  - `AR_design.md` : `540b81abdefdb6c8d0e60708b9fa90024699a1cd0bd63860736807657fa45847`
  - `ar.md` : `18217ae97eef066d3ddde902a6924a4fbfe7d1b1e6d241666b035a478f5895e7`
  - `todo.md` : `e92f5756706490f30816bc980ca72a8e46831f8910d235c004c8ae812889e2b8`
  - `reports/summary.md` : `abf46f0d2d63778ca27634f2bd80b9437befc76db1942b6c87eb78c4f656a88c`
  - `reports/quality.md` : `f5f482c99db255ad1bdcf40f3a841b531f89fc6013334524081c414d23032ea3`
  - `reports/pr_description.md` : `135a574805f3fad18e77e55853b9fdd37cc8d424cc754351c01dafa9f6e476f1`

## 外部验证锚点

- HDC source commit: `4804486da102698fad018d9c14c5838b3c420a70`
- DCP runlist: `6a92ad6f64650f998b6990d8`
- PR state at archive time: `open`, `mergeable`, `waiting_for_review`
- PR labels at archive time: `dco检查成功`, `编译成功`, `静态检查成功`, `冒烟测试成功`
- Windows hdc.exe: `8a495db0e5e53c8ad4587c5dd5caac533cad5bd71668aea67e4f2f5756ef8847`
- Windows artifact type/size: `PE32+ x86-64`, `5,761,536 bytes`

## 脱敏说明

未归档 GitCode token、DCP token、设备序列号、用户凭据、原始流水线响应、本地绝对路径或 Windows 二进制。代码提交、PR、Issue、公开门禁标签、DCP runlist ID 和二进制哈希保留用于交叉复核。
