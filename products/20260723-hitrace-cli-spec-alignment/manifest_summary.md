# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `20260723-hitrace-cli-spec-alignment`
- build_target: `hitrace`
- base_commit: `7141a84986afce2fba78af51584025afcbc19884`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL> (warn: oh_gc,gitcode_auth)
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `d883d0f4374da489d2dc93fd8a866bac13fe226682ca5567cb638c40a6191101`
  - `evidence/phase0/build_probe.log` : `0b22db2f762ca8d4bc9e03679909965900ad8355d264a85f292f8804d99c6747`

## P1 develop — PASS
- gate: `gate_design.py`
- reason: design sections 6/6 ok; contract build_artifacts=1 test_cases=4 device_cases=1
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `2bf15e7720ee47ee8506bf8ca12e34c3ee0f3bfd5adaa63200d574d689cf4a56`
  - `evidence/phase1/design_check.txt` : `3face18aca702d8ae9f49238952f536f0f3443d7496db9c0d06eda5714717738`
  - `evidence/phase1/ar_contract.json` : `9153dfcb3f2f2a9e56ad352fc286d8d9fd31574206cf291ff55e35b0c0e9e260`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 7141a84986af->7141a84986af, 15 file(s) changed (12 untracked), style_ok=False strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `ca5f3740835f5f2a5aa976126ebafbf7431b55f9eb0db7e133577f57a5927f12`
  - `evidence/phase1/changed_files.txt` : `4e85a1e7a7f830d0b7bd2a78f084034d5ed7be402c186af9a3e41480793b058d`
  - `evidence/phase1/style_report.txt` : `aef9da43cad54ba6d2565c7c1568035517ba86cb136bc32521d91292637bffcc`
  - `evidence/phase1/strict_cpp_report.txt` : `7b52e42af45f81fd21f28219cf07c3ede5ebf5d06eb6e9e12f6bbea0f1594683`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head 7141a84986af->7141a84986af, 15 file(s) changed (12 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `782892630d4485c8d16140c9bd790692ebef32fabeac46bb03efb3b3ada268ec`
  - `evidence/phase1/changed_files.txt` : `4e85a1e7a7f830d0b7bd2a78f084034d5ed7be402c186af9a3e41480793b058d`
  - `evidence/phase1/style_report.txt` : `6ae9765c01505d8163c5e4ebf6808e9f89e6f938d8ba9226aa5654a1db16fc86`
  - `evidence/phase1/strict_cpp_report.txt` : `7b52e42af45f81fd21f28219cf07c3ede5ebf5d06eb6e9e12f6bbea0f1594683`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hitrace) artifacts 1/1 present
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `aaaef0cc64a852cd07e03c0946704eef1273c436bbc834c8e1f4340f85fc0bf6`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase2/artifact_check.txt` : `8f3739194925d52a2436560740247ac7de7b51032832a02152bd36e0e4228f08`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-12-49-24 gtest_cov=0/4 MISSING: HitraceCMDTest.HitraceCMDRustSpec001, HitraceCMDTest.HitraceCMDRustParser002, HitraceCMDTest.HitraceCMDRustValidation003, HitraceCMDTest.HitraceCMDRustBootGate004
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `ed67a7c8f1b3cb6054d3c9a6c821b42e39544dfd2fd07be024eec3d1bd017c5a`
  - `evidence/phase3/start_sh_stdout.txt` : `2e7788a1a46537d765c8ab218247dbc38ae0705ac619f86ab40e8ce0d86d8db2`
  - `evidence/phase3/report_dir.txt` : `5af4bebedd4733d569a2a539dad74d191a63b9d3ffd0356902e2f889d620b421`
  - `evidence/phase3/summary_report.xml` : `3b2eea2bd3236620e0134621a2f730bb89c35716a3558fb10f152f4d53b88eeb`
  - `evidence/phase3/gtest_coverage.txt` : `9ecc25361be9bbc4878cfaadf1f412fb03acb94404ed7afa804324af6b8632a5`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=61 failures=0 errors=0 fresh=2026-07-23-12-53-55 gtest_cov=0/4 MISSING: HitraceCMDTest.HitraceCMDRustSpec001, HitraceCMDTest.HitraceCMDRustParser002, HitraceCMDTest.HitraceCMDRustValidation003, HitraceCMDTest.HitraceCMDRustBootGate004
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `a444940f095414ecf79db849031768e11ac312462699f8464481bd0462d0ae2c`
  - `evidence/phase3/start_sh_stdout.txt` : `583cd95384710ec06b9d7256ba366e9a6eba3f5049da79621b4ceebd7c1c92e0`
  - `evidence/phase3/report_dir.txt` : `9bf8d9f19bf9af68e3a8f150dd7f67dcc2f59a84d221a99f30dc098060665b63`
  - `evidence/phase3/summary_report.xml` : `4bd04f6e44fb6e0050fec7a40131a670cc426d37040a9e85d9fe864e356595a6`
  - `evidence/phase3/gtest_coverage.txt` : `9ecc25361be9bbc4878cfaadf1f412fb03acb94404ed7afa804324af6b8632a5`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=61 failures=0 errors=0 fresh=2026-07-23-13-56-08 gtest_cov=4/4
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `30434d8653057c312201a4731c5909f2a4bef31c23e5e8df3a4dcbf8c83bcbc9`
  - `evidence/phase3/start_sh_stdout.txt` : `9b7f7c7ef3b84142cd35594f19302924e2fae549b8763307419a7d3f02921e7a`
  - `evidence/phase3/report_dir.txt` : `b979ba047e28f9d4082fd8071cd9167bac30ff644856b01880bf8f780e5a9e45`
  - `evidence/phase3/summary_report.xml` : `72249ee2a72a0f9bce800fc6b7ff3893e788c560601f5101abf6adc16113559a`
  - `evidence/phase3/result_HitraceCMDTest.xml` : `3d2d45f593de27b5d2742e582a22204d1bee5ff778d7e384770748ca4c167191`
  - `evidence/phase3/gtest_coverage.txt` : `dbbd65ff05d36292a279b32d2ef8cea0edd999ede4c7871205cbeb22fc334809`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True device_cases=1/1 artifact_hash=True uptime 1185401.36->1185417.21 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `86cf536eb348b921d1213407b4c0fdcda929c170eea5e7fb09d0cb7078f28546`
  - `evidence/phase4/device_cmds.txt` : `b0c4303394961d7e6550d985a57fd99db115746f44b6c661fc90a8c4a1047648`
  - `evidence/phase4/run_meta.txt` : `e5fab3436eef1193dc8a9cbca49b6e479c26ba14e5ffdaf75f983a914f37e878`
  - `evidence/phase4/artifact_runtime_proof.txt` : `9a526abc9be0c01bd39c424bc6fb2b16592274ef5e2210a5e23e27bb414fcff4`
  - `evidence/phase4/device_marker_coverage.txt` : `fbb955ca9a4664b9f4d2b3d5df16d4914dda54022579be852b8c102dc46ba08d`

## P5 quality-verify — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True device_cases=0/0 artifact_hash=True uptime 1188400.36->1188416.07 mono=True
- artifacts (path : sha256):
  - `evidence/phase5/hilog_capture.txt` : `4f26878816d0249f6c5593e86d288bb56ae2702bbef05e0a6e66323af7418cee`
  - `evidence/phase5/device_cmds.txt` : `5a6fcb13b6610b6904623e615f5152312c544136ed9a7c6d2fd12165a173bdc5`
  - `evidence/phase5/run_meta.txt` : `11713454266149a827c1028266de1dcbd2437c84af106182eae72a92b250446c`
  - `evidence/phase5/artifact_runtime_proof.txt` : `9a526abc9be0c01bd39c424bc6fb2b16592274ef5e2210a5e23e27bb414fcff4`

## P5 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=61 failures=0 errors=0 fresh=2026-07-23-14-53-21 | quality:coverage=evidence/phase5/coverage_report.html; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 2 file(s) | external_review evidence/phase5/external_code_review_report.json issue_count=0 finding_count=0 blocker_count=0 issues=0 findings=0 blockers=0
- artifacts (path : sha256):
  - `evidence/phase5/start_sh_stdout.txt` : `7eff8cb5918098bb3940d29136de0f1dd579c6f261066ca30ca660a9609a7ecb`
  - `evidence/phase5/summary_report.xml` : `9b690291ed3d9c95f0d09ff1001c1be655d6b790371bb23b73c70b6ea1373215`
  - `evidence/phase5/report_dir.txt` : `fd3f452f79aaac0e271db25619cea2fd4e5bd89a7abd06722fc2273fbe2b25a1`
  - `evidence/phase5/coverage_report.html` : `296a1489d85b6c752614ee86c7c77bd74d18b2bce9afe385a6b46d55b6a763f0`
  - `evidence/phase5/performance_report.md` : `98f92e5e04c5f99c24c3d6f064bd3129ef3d19b5afa168132c9771f474033ba5`
  - `evidence/phase5/power_report.md` : `ab70dad5145ce472e362c758ee23395def63723c57b9abd3cada7b791628534c`
  - `evidence/phase5/stability_report.md` : `f65c8f75c9712d64623efed4b199418990e35ae327e9a114efa4ab7ed23d330c`
  - `evidence/phase5/code_review_report.txt` : `7a774f7dc655b9e2a2540750599f96af6ea52f46b53e17072e68b584c1be9a89`
  - `evidence/phase5/external_code_review_report.json` : `49462a404dbf3cad45ac6d191fc221b33718559d3b5b55c40152fde0c55c3228`

## P6 upload-review — INFO
- gate: `gate_upload_ci.py:dry`
- reason: P6 DRY complete: full diff/stat captured for human upload review
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `0d2ab68421142e9510d6c7f93a8597a51f4bff9dfd9defde66384b468795daec`
  - `evidence/phase6/full_diff.stat.txt` : `f8d097208669a0a2d7cf2030143bb7501174ccec9c219d0043c1051836ea5d53`

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: oh-gc pr create failed: /bin/sh: 1: Syntax error: end of file unexpected

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: pr=1053 overall= ci_ok=False pushed=974e75c012d0 pr_head=974e75c012d0 sha_ok=True local_review=skipped (--pr re-verify) pr_review=issue_count=0 finding_count=0 blocker_count=0 issues=0 findings=0 blockers=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `0d2ab68421142e9510d6c7f93a8597a51f4bff9dfd9defde66384b468795daec`
  - `evidence/phase6/full_diff.stat.txt` : `f8d097208669a0a2d7cf2030143bb7501174ccec9c219d0043c1051836ea5d53`
  - `evidence/phase6/pr.json` : `daacbb20a1f684497bddf70135928a70ed3dbfbcc758af061627b6f1e085b615`
  - `evidence/phase6/pr_create.txt` : `6190aaef08a070d54fac82ad2f6c4fd569594ea11b093bfebee872163607b26d`
  - `evidence/phase6/pr_review_report.json` : `bf7e266bfabf639fd655aac00cc192f432007ac48289ad5cd6b8b8d8241f509b`
  - `evidence/phase6/ci_status.json` : `838b9d247e9d141d460245bd5b5d01286c113b305ecb52cde2aecceabb0a3257`
