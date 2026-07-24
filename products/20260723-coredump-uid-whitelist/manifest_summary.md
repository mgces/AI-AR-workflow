# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `20260723-coredump-uid-whitelist`
- build_target: `faultloggerd`
- base_commit: `f5005e1e2cc6c2a5af9958eb6fe000c45ebf5584`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL>
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `49a2171b23e04d2faa05ed7b068258de7bda3e20555957c309ac212e5a16f836`

## P1 develop — PASS
- gate: `gate_design.py`
- reason: design sections 6/6 ok; contract build_artifacts=1 test_cases=3 device_cases=2
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `c9555da40e6a5ebb1bda1c3957765c5337e0e4476a15a16118c50e19ca2b5c0a`
  - `evidence/phase1/design_check.txt` : `d576cd8364d1ffe7fd4c6a0b125e848a9d95a6e0693e7ded8f7ae2199db9266e`
  - `evidence/phase1/ar_contract.json` : `36fcae917c876bf0dfb4fd224d26f82b721d26fac843f3d4af096395e65d0543`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head f5005e1e2cc6->f5005e1e2cc6, 5 file(s) changed (2 untracked), style_ok=False strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `c5dadd7a5f55d6cebc40a01e08fb0bd04792f7af66107ae9996d542d115ae370`
  - `evidence/phase1/changed_files.txt` : `2a29ef84639d357a56b8e44f600bf5f9da7e04bc6f0ad7ecdf0f0fd57f33bda3`
  - `evidence/phase1/style_report.txt` : `61347d382711c3e7e1ee9d84c6d0edbac49d1636f19cc8b51ced0c284341dade`
  - `evidence/phase1/strict_cpp_report.txt` : `2a186b9613ec0d9f7a339500a7f4e6b38d93b6aa3caa6f7c8b0262ea524f7a1b`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head f5005e1e2cc6->f5005e1e2cc6, 5 file(s) changed (2 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `8aaff82a5137b5abc198452bbc235a05e96800bb9c9f197b656e83d19cfd9c6a`
  - `evidence/phase1/changed_files.txt` : `2a29ef84639d357a56b8e44f600bf5f9da7e04bc6f0ad7ecdf0f0fd57f33bda3`
  - `evidence/phase1/style_report.txt` : `883ba85d84d32a2d2ca66a2055eef4f4ebbe91ab534cd033c9d247555f3755bb`
  - `evidence/phase1/strict_cpp_report.txt` : `2a186b9613ec0d9f7a339500a7f4e6b38d93b6aa3caa6f7c8b0262ea524f7a1b`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=faultloggerd) artifacts 1/1 present
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `3b03d8286b7440aa3535429de9707d434f61ec0f260ea3cbeace6f08ecbc4d1b`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase2/artifact_check.txt` : `70b88264668dcfc4326f3ae749876cc2bb3c2d2683c06c5306e8f2187cabcad7`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-15-01-31 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `de4d62474cfe0656c8ca9d5ed35c641c5d3d7f5bd16ff807a1659cfb6404ae2e`
  - `evidence/phase3/start_sh_stdout.txt` : `66a574668ecded04302f61c2dfb827c50e39b0b50586d2c8a9abd6b12fe4dc0c`
  - `evidence/phase3/report_dir.txt` : `7963739669c5a5da8b6c268e1921f180bc0afaac03d0490280a3d8ee093c94e4`
  - `evidence/phase3/summary_report.xml` : `7fc6d5105a0b849a17f527810e48acce97901f7afb784fb45f722ec80264f0c5`
  - `evidence/phase3/result_test_service.xml` : `c56190bc5b53bc62dace542b523a509a84bbf83c6acccdc740a872eb5970819d`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-15-11-46 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `aca06bc79ed8ab005a3449bcf329b24195b01b4c5bf42e23ff3ae61645813f01`
  - `evidence/phase3/start_sh_stdout.txt` : `4e5be317f9bdf4c3991f0d3c4e42b0d51abdbf10889107c709c2dc5be3d38b2a`
  - `evidence/phase3/report_dir.txt` : `f2e778d86de4eac01b784d03c331a1400d7ac7f5a7897230616dde53e48aabf1`
  - `evidence/phase3/summary_report.xml` : `882fa8c31fe5cb50893df675e613ad18a1838b1cc2e6ffe78172eb78b1aad4a9`
  - `evidence/phase3/result_test_service.xml` : `1957d510bbe3773596e3332ad2a698ef4561eadb8a8a452efb4fa2762dae7351`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-15-49-10 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `6d72f688219a53426c060b0d72bb8790f552f45db5410ab724bf3b6a0fee5402`
  - `evidence/phase3/start_sh_stdout.txt` : `ce75c778879f7512dc1e7bd4076f43cb3be31de8bc66d2ef52798ad4c53b8ef6`
  - `evidence/phase3/report_dir.txt` : `6e93f9ed606db20b45261a179db70431779b4285d6fc65df20a645a371f07295`
  - `evidence/phase3/summary_report.xml` : `fc9026247fc1b22dc0eb96d420007450a5e480d2f11d057f9766b06850d5f736`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-16-03-51 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `2e2c75fab3df93c8a4ae96141b11d303cc5b33b990383aa006f688e82d488e06`
  - `evidence/phase3/start_sh_stdout.txt` : `c8981eb1b3d41a738b76946c45283343566964becc602f1d89ab7e51a1719858`
  - `evidence/phase3/report_dir.txt` : `77da3d2c0e00d1a020cb63aafc18e94bfe04bb8d9fa39e3f0e7012a5a3cd76cc`
  - `evidence/phase3/summary_report.xml` : `6654213b143cbc9eca8187bfa269c1882e88e83bd67515e541bf10a05300b602`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-16-14-03 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `3e0053057a6ea9d8dc2eb3fd86d6d4b989e223edf2a5baaeb19b15250346ec8c`
  - `evidence/phase3/start_sh_stdout.txt` : `48c31a4eee8fa4f90bcc3f6c749f15b91fe781ab7648db9de68f106c6dda6174`
  - `evidence/phase3/report_dir.txt` : `9775f9fff8c01a5e5d862ad1267ed337390c679741b6e533a720c9a17d371c35`
  - `evidence/phase3/summary_report.xml` : `62c7e23eca3ed7202eb6e60b72a15943553381c13c205ac237d16dcbe33cc7b4`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-16-55-37 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `0c9fd1573d071440e718be355b5c2208d82b43819089182a95b9719c949c236d`
  - `evidence/phase3/start_sh_stdout.txt` : `6079d220ba1805aa9fe220c1307be8b3985750d0484e4196a31563b65808f1d1`
  - `evidence/phase3/report_dir.txt` : `437694362c24c60c7ac5668cbb64b3d6854bdefe8880b62be3e57a65534ebb9f`
  - `evidence/phase3/summary_report.xml` : `215605ac392cdb62b964c7c08ef02288de3708161674f7c5206721b3cb275ea3`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-17-16-18 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `ef15380ee11491002eb3d78634390ee78cf75156db7825ca876a6b54c6d16529`
  - `evidence/phase3/start_sh_stdout.txt` : `18c5d3bd9cc1b809dc0ebe06c668c8f1b428cc42627c4dbf402d21849a56c287`
  - `evidence/phase3/report_dir.txt` : `5019712f7c1ec9baaa7f17a1339db4b705ee0ca4a0a5be6afb25ad936864aa72`
  - `evidence/phase3/summary_report.xml` : `c4ba2f9d6652febefec6af1f6e760f00166cf0e64a6d2a87ec065ab7e80a18fd`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-17-25-54 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `f7150b2ef7422ace7cec0947e7ebe4ae908db7cad4c1bbca8f700fee4e4e3e3a`
  - `evidence/phase3/start_sh_stdout.txt` : `08e3260d1c9c0471e45426299778e383bfd195bae0fb1b8b71f6f7678d2305f4`
  - `evidence/phase3/report_dir.txt` : `eb719bf4362337fa5dfae2096c5cbefd934371b73721492f8842e363bb3dbd16`
  - `evidence/phase3/summary_report.xml` : `539abc721ee85ae70d1c2a54aa63f5cd79a47c3b66ffa8636d2764b61c0872fa`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-19-03-27 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `fbafa03ab1b56b995260b97dd0a5bcf67604f71e0ef7a8e2f301c164ffc3fece`
  - `evidence/phase3/start_sh_stdout.txt` : `3850bd8624cd80865c7378e65d53f1d3e228c5dfe6253b3abf70275a35b0d446`
  - `evidence/phase3/report_dir.txt` : `156f431e3d73e7fb348649101fb1d8e78c122427c296ae0d421aa3d6e64ec140`
  - `evidence/phase3/summary_report.xml` : `a55a4ff6a3f1e2ae760c53dc7c0a523bc913f8e8049e3753744dc559b50fe5a4`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-19-13-18 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `c2b2b37978d3ebe624ddee129101293ef4fed89350db2ab50fed50b0d7cb8a06`
  - `evidence/phase3/start_sh_stdout.txt` : `03393cf6d2bf5dfa7dce61b740b885d04ed1a33a78defa9466abb30683c63e0f`
  - `evidence/phase3/report_dir.txt` : `ddc2dac149f25498b9a616a067c09e83a0fd82b9e0517b0d65593a2bffefcc8e`
  - `evidence/phase3/summary_report.xml` : `f3bab5e3faa79b30edf491aad70b3cf34513a323da61bc0236ea0ce82d46faf5`
  - `evidence/phase3/gtest_coverage.txt` : `8497598b32e57f9d0edbceecf70a952a1bffd2c5b558af1c3ffb1fd83db1cb51`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-23-19-40-42 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001 [device-xml-fallback OK: tests=3 failures=0 errors=0 gtest_cov=3/3]
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `b058139c88b7bc24aa3161f6029665d4531e855b617d8c1edde95db99536d5b0`
  - `evidence/phase3/start_sh_stdout.txt` : `0dc3287c55255b522ec85b6bd1b07c72d050a475ecac3086be6c38e979afc898`
  - `evidence/phase3/report_dir.txt` : `2533479a7205274b5491ced158b26802548f6c54144bb99dd4ca30cc2b668c70`
  - `evidence/phase3/summary_report.xml` : `11e16fac4fb597e62cc2f175808ef89e164bacbd669942b8d1202fb5f777ad3d`
  - `evidence/phase3/gtest_coverage.txt` : `0e46efd8f4a670d134315b989605e7fa71636d55fbda2c1ea211e73c9433fe0c`
  - `evidence/phase3/device_coredump_uid_whitelist_test.xml` : `bb6b672e208ce61eacd12a91a07021e0bce9f689eb588bab1bb740affb10a2a1`

## P4 device-functional — FAIL
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=False e2e=True device_cases=1/2 artifact_hash=False uptime 79772.07->79779.08 mono=True MISSING_device_markers=AR_COREDUMP_UID_WHITELIST_DENY
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `7cb7d83e000141b69c8bb9f22abfd7762448647c4a6acbda8420cddce28eabfe`
  - `evidence/phase4/device_cmds.txt` : `1d5e59a73fa7153299fbb72c2b0a46fc92c979910820b0301670dee2ec02f6af`
  - `evidence/phase4/run_meta.txt` : `35699cbef028a5d838262177aa3e198b9668f563a9561d5499c6215a7274b0f9`
  - `evidence/phase4/artifact_runtime_proof.txt` : `ddc901d43fb695a1218ad180de64e49f35f052030dd649ea356e1fd644f7c94f`
  - `evidence/phase4/device_marker_coverage.txt` : `0a384981015e35473d5ed72b6625880ed266629c1515ce98b29df6d0f7b877ce`

## P4 device-functional — FAIL
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=False e2e=True device_cases=1/2 artifact_hash=True uptime 80033.90->80038.65 mono=True MISSING_device_markers=AR_COREDUMP_UID_WHITELIST_DENY
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `fdf1864ed485dfcc5c8592721e2888a053ff86e8830b52e408738e4bc7d607c7`
  - `evidence/phase4/device_cmds.txt` : `4563fb8517ee89475fc5f09271611837e3972ee82aae12f9fbfa8977d4cbf84f`
  - `evidence/phase4/run_meta.txt` : `a1766afe90673d761db11a7b008e5d683f116fbf20b9a611f5785b297d41f9ff`
  - `evidence/phase4/artifact_runtime_proof.txt` : `5b2693c0e8c5ff50c1b8246243eabb648b2c81dbafc2174f5cd56a6c2552de34`
  - `evidence/phase4/device_marker_coverage.txt` : `0a384981015e35473d5ed72b6625880ed266629c1515ce98b29df6d0f7b877ce`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True device_cases=2/2 artifact_hash=True uptime 81726.01->81731.54 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `4a31f8a5e47d7b8a8965462c0bdf02513ebabc1727c1ef300c87e22aad6b04ef`
  - `evidence/phase4/device_cmds.txt` : `803782a77de82ebba6559cfc4ddb66b01c8b72b24ca51a921a6a4f5180a3d771`
  - `evidence/phase4/run_meta.txt` : `2e3e12f280c99f9f48d91009c8599e3e43a99699a4fcd27e643a2546826d9b55`
  - `evidence/phase4/artifact_runtime_proof.txt` : `5b2693c0e8c5ff50c1b8246243eabb648b2c81dbafc2174f5cd56a6c2552de34`
  - `evidence/phase4/device_marker_coverage.txt` : `0c4ee94dc8f467956be27f7b550789bb22252444cabece88c20368dd7cbd50c3`

## P5 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=3 failures=0 errors=0 fresh=2026-07-24-10-09-40 | quality:coverage=evidence/phase5/coverage_report.md; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 1 file(s) | external_review evidence/phase5/external_code_review_report.txt review_issue_count=0 [device-xml-fallback OK: tests=3]
- artifacts (path : sha256):
  - `evidence/phase5/start_sh_stdout.txt` : `b7155bcd698eacc8803dd46e707094fd184070e47cb169291817b04ae6c3aea0`
  - `evidence/phase5/summary_report.xml` : `54e0072495e14f4cdd051f1546d614809d8a4774e9fda5da11d32a48f8231c64`
  - `evidence/phase5/report_dir.txt` : `35b7d1142bbe7ea0d310abf26b8df16d3f05ac80c47e9177414e162eac3a8eea`
  - `evidence/phase5/device_coredump_uid_whitelist_test.xml` : `58e2e7bcd682767e9b239ab6b4f4dbb8998aff0cc32fd4ae8c68c6f5be7540aa`
  - `evidence/phase5/coverage_report.md` : `367530ac1baab18971fd83031d66bf5c0d4d01c586330b670362af171ee61a75`
  - `evidence/phase5/performance_report.md` : `cfabbe88a05ea4eefc98fd13b1ada42eebc2c3bd83ff8a8017cb48d28414e792`
  - `evidence/phase5/power_report.md` : `fd5dcff848d83daba86dc22c0b270c3148c18deb279c6111754c2ec09fc7384a`
  - `evidence/phase5/stability_report.md` : `b06b62666a7a73e47efc9884994156007ee07dd21fea7df1b1c545e260950d9a`
  - `evidence/phase5/code_review_report.txt` : `3885c327ee3b5627226a90c36fe396ff911897b24625418a5665173aa9eed886`
  - `evidence/phase5/external_code_review_report.txt` : `9d82067557a2cccc97b11f243d7597fdb6632995b9e0ee76702b513ce0fe27b9`

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: pr=2630 overall= ci_ok=False pushed=b8d6ca39bdef pr_head=b8d6ca39bdef sha_ok=True local_review=review_issue_count=0 pr_review=review_issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `0fe534bab9250555337f8985937b653e6c2581f50e066a934b2d0d65fa6f918c`
  - `evidence/phase6/full_diff.stat.txt` : `24eb79f95fd84edcaae418677c81af64a0ece9cf3cf415c17ebbbb2c8dd8006d`
  - `evidence/phase6/local_code_review_report.txt` : `8aec48311ff10f462cbd4bf6324cab26f5eca02b20db11d1e4b30637c094af3f`
  - `evidence/phase6/pr.json` : `f521cd92a2d8fb362b79084b20ee91a0429490629f02ad780c7d955eea59bdd4`
  - `evidence/phase6/pr_create.txt` : `41fda5a890d964e86564a4899e49375fb00cc26f4521afb698bf68c00f4d3e3f`
  - `evidence/phase6/pr_review_report.txt` : `789ad9deefb3d3e291fe4d51f6cb33d281c3b7087ba74ad1b9ba22f6451a089e`
  - `evidence/phase6/ci_status.json` : `90c5995f48e8c408e5a81dd1ee5da111248dbcdc76aa72cdffedbabaa11fed55`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: fix CI codeCheck findings (strncpy->snprintf, C->C++ headers, magic literals, bounded loops, K&R class brace) in P4 driver + functional .h; also fixed env-local .clang-format AfterClass bug

## P1 develop — PASS
- gate: `gate_design.py`
- reason: design sections 6/6 ok; contract build_artifacts=1 test_cases=3 device_cases=2
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `c9555da40e6a5ebb1bda1c3957765c5337e0e4476a15a16118c50e19ca2b5c0a`
  - `evidence/phase1/design_check.txt` : `d576cd8364d1ffe7fd4c6a0b125e848a9d95a6e0693e7ded8f7ae2199db9266e`
  - `evidence/phase1/ar_contract.json` : `36fcae917c876bf0dfb4fd224d26f82b721d26fac843f3d4af096395e65d0543`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head f5005e1e2cc6->b8d6ca39bdef, 9 file(s) changed (0 untracked), style_ok=False strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `cb85498df1502035fbd827b0137c4ba779a2e3a2ec822b1b09d134167683875b`
  - `evidence/phase1/changed_files.txt` : `40465133c69cd94446f60120d102d42a38435681d19a834c316009f7ac5d8fe9`
  - `evidence/phase1/style_report.txt` : `3bd50a458cf9b2d7a9c4d58f95a510ee4fcf3321611f83f4807b653365e6d9ac`
  - `evidence/phase1/strict_cpp_report.txt` : `322f053015b0bddb44edb1f1242c4a33491a8062d000fc8f0b62a52578d3622f`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head f5005e1e2cc6->a90f19c5284c, 9 file(s) changed (0 untracked), style_ok=False strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `cb85498df1502035fbd827b0137c4ba779a2e3a2ec822b1b09d134167683875b`
  - `evidence/phase1/changed_files.txt` : `5fee448c103a480611e08d8e4165cfd7d7c6a4acf6c9950b5b91004241ecee16`
  - `evidence/phase1/style_report.txt` : `3bd50a458cf9b2d7a9c4d58f95a510ee4fcf3321611f83f4807b653365e6d9ac`
  - `evidence/phase1/strict_cpp_report.txt` : `322f053015b0bddb44edb1f1242c4a33491a8062d000fc8f0b62a52578d3622f`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head f5005e1e2cc6->a90f19c5284c, 9 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `cb85498df1502035fbd827b0137c4ba779a2e3a2ec822b1b09d134167683875b`
  - `evidence/phase1/changed_files.txt` : `5fee448c103a480611e08d8e4165cfd7d7c6a4acf6c9950b5b91004241ecee16`
  - `evidence/phase1/style_report.txt` : `ea2602bee0978bfad9e567cf9c049396f70ae7a0c9e414ee0fc448d2d9c12bc8`
  - `evidence/phase1/strict_cpp_report.txt` : `322f053015b0bddb44edb1f1242c4a33491a8062d000fc8f0b62a52578d3622f`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=faultloggerd) artifacts 1/1 present
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `7a47d0de21534cb0fe39509f02388504b6ea3b46bf9604e31fbcb670bea79605`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase2/artifact_check.txt` : `70b88264668dcfc4326f3ae749876cc2bb3c2d2683c06c5306e8f2187cabcad7`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=0 failures=0 errors=0 fresh=2026-07-24-15-05-36 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001 [device-xml-fallback OK: tests=3 failures=0 errors=0 gtest_cov=3/3]
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `3afe7c635d7eb97df0b0b6fcc3a3889a8d37efcf8042457aac2d6efc9ee0dc95`
  - `evidence/phase3/start_sh_stdout.txt` : `75703e8cb8cd0df7b0bc2bd1230d5e3ac67b7b6e32891a15565cf0ad69c139f8`
  - `evidence/phase3/report_dir.txt` : `7745a6acf26fc91f712d82d2521fdd63662612cd519584c734853bef13a4532e`
  - `evidence/phase3/summary_report.xml` : `ac49e4ff27bd20cf610704fe4c3570b9bd8b74db548736848c507cacddf40a69`
  - `evidence/phase3/gtest_coverage.txt` : `0e46efd8f4a670d134315b989605e7fa71636d55fbda2c1ea211e73c9433fe0c`
  - `evidence/phase3/device_coredump_uid_whitelist_test.xml` : `2f778f032fda9d66fd0b172d66c5eb7ff1c58947fa0ada743667594425df0ae7`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True device_cases=2/2 artifact_hash=True uptime 100387.53->100393.04 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `33952a5f47e017e982645ee25e52ba2f1aa9480def05062a222df8703d2e9b6d`
  - `evidence/phase4/device_cmds.txt` : `9336cd43a1770b3a8e828315c14c752ec8bdb36298c42e37b1b291f0bd4626e7`
  - `evidence/phase4/run_meta.txt` : `87f4091ee40f20c68f04700d68b0556048e0978e6d140ffe4be8dfae995618a9`
  - `evidence/phase4/artifact_runtime_proof.txt` : `8da83475822168f0cec64b48ee85de2e9b80669ffabb59995c4aa3c25cfd933e`
  - `evidence/phase4/device_marker_coverage.txt` : `0c4ee94dc8f467956be27f7b550789bb22252444cabece88c20368dd7cbd50c3`

## P5 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=3 failures=0 errors=0 fresh=2026-07-24-15-08-48 | quality:coverage=evidence/phase5/coverage_report.md; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 5 file(s) | external_review evidence/phase5/external_code_review_report.txt review_issue_count=0 [device-xml-fallback OK: tests=3]
- artifacts (path : sha256):
  - `evidence/phase5/start_sh_stdout.txt` : `44360db23841e858cf73dd2f538ae1d58b498b2451065a18e5500dd19e7415b2`
  - `evidence/phase5/summary_report.xml` : `6e0706f1b45d635f59d667fc07e1ed836fa8542a245ff48b2d4a000df298e91b`
  - `evidence/phase5/report_dir.txt` : `30fe7a50034a4103d6f1c0974a90ddf8e7ddc5624bf4d0d687b75604b86066e6`
  - `evidence/phase5/device_coredump_uid_whitelist_test.xml` : `30622793e6fcab9464e7d34637d2264a54bf6839bddc05f5f4d13ae6f254f230`
  - `evidence/phase5/coverage_report.md` : `367530ac1baab18971fd83031d66bf5c0d4d01c586330b670362af171ee61a75`
  - `evidence/phase5/performance_report.md` : `cfabbe88a05ea4eefc98fd13b1ada42eebc2c3bd83ff8a8017cb48d28414e792`
  - `evidence/phase5/power_report.md` : `fd5dcff848d83daba86dc22c0b270c3148c18deb279c6111754c2ec09fc7384a`
  - `evidence/phase5/stability_report.md` : `b06b62666a7a73e47efc9884994156007ee07dd21fea7df1b1c545e260950d9a`
  - `evidence/phase5/code_review_report.txt` : `a29c9c56efa21c79ee0457efcfb6c7be1ca4e39e10d3cf0dcccc8601e5a62423`
  - `evidence/phase5/external_code_review_report.txt` : `9d82067557a2cccc97b11f243d7597fdb6632995b9e0ee76702b513ce0fe27b9`

## P6 upload-review — PASS
- gate: `gate_upload_ci.py`
- reason: pr=2630 overall=success ci_ok=True pushed=cce8b35c4467 pr_head=cce8b35c4467 sha_ok=True local_review=skipped (--pr re-verify) pr_review=review_issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `156484f224138a4b068e0f1c9c155e6758750c27a2150c057e8f03268a708dea`
  - `evidence/phase6/full_diff.stat.txt` : `bd81809e298b07642d5c344fec8b5056e9699dfdf99836059df16081c976867a`
  - `evidence/phase6/pr.json` : `ac72273d841295ecad55ae38998ae8cc071cbb8153258ee301df94dad0c0adbf`
  - `evidence/phase6/pr_create.txt` : `41fda5a890d964e86564a4899e49375fb00cc26f4521afb698bf68c00f4d3e3f`
  - `evidence/phase6/pr_review_report.txt` : `789ad9deefb3d3e291fe4d51f6cb33d281c3b7087ba74ad1b9ba22f6451a089e`
  - `evidence/phase6/ci_status.json` : `f8077cbb4f47fc552e8ee4ab49400d917e10ee31002cc0c9528b0459f8c0c4ec`
