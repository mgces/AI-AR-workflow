# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `20260707-thread-leak-detector`
- build_target: `hiview_package`
- base_commit: `c28ac3e289390e068f4a37748eb2e8ec40fb8b91`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL>
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `97c2c1a6b10a6d175a026271060138f40d61c92b389f37a4dac9715104e86d5b`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=False strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `f04c6ec48724ff933ed37b134d979856c71523634c634a21f2424ff4e5e71127`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 108 marker line(s)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `49f3210e9beaa027b78a1461a76a9bd22345558ef7d9f9f759ef579bedfc8ea3`
  - `evidence/phase2/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase2/error_distill.txt` : `c5d4f8060ac9340598c2096487b9a4ae748be602900150654579e8368df2e74a`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P2 GN fail: source_set needs CFI sanitize block; also add missing std headers <cstdlib>/<cerrno>/<map>

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 144 marker line(s)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `cb315423e7e6dcf43ac00c738469c434ce0d1503b7e00a6605870b194f7f055e`
  - `evidence/phase2/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase2/error_distill.txt` : `8e34d0203d7c77b14473319c72b932544e3f702382c8819861f27c3011cd696d`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P2 compile fixes: hidumper via IDumpBroker proxy (avoid broken dump_manager_client transitive include), HiSysEventWrite literal domain/name, local BUF_SIZE consts

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 123 marker line(s)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `c46684082d16c799ffd583a1944082e49bb224224c03361becbf4c3c9fb00195`
  - `evidence/phase2/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase2/error_distill.txt` : `fca412038ea45db9a432e79fb762ad0f82e37b4e2fee4a005b9ba4e224e1b258`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P2 compile fixes 2: HiSysEvent::Domain::RELIABILITY enum, ThreadCpuStatInfo in HiviewDFX ns

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `20e5980f514fe045822581dd6d3d521dad0c5735a0b7632d85466254cf080cf6`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-07-20-18-08
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `aa6955f44b0ecd3be06b7d552fb781cf535dfafe15f80350a04fe6519600faf4`
  - `evidence/phase3/start_sh_stdout.txt` : `932eb0ab4d99bb075e9853e36c5164ee39df996e188dca038d22540fac31e95d`
  - `evidence/phase3/report_dir.txt` : `b37e3681862338f2261ca0aaa15e288ed19ce3da92512091bf362b012ef2f0c2`
  - `evidence/phase3/summary_report.xml` : `0a1cde813efea13005766a66b4942ba6af1e03aab99e13bde778493de022bc25`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P4 dry-run: hidumper SA section empty because CheckSystemAbility does not load-on-demand; switch to LoadSystemAbility (blocking) so hidumper thread maintenance is actually captured per AR

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `83379356f02a29438305142ca72b6aa7138fb5482a39a2d629ce0fcc9da8937d`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-07-20-37-09
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `79a3aa4bcb58606eff2d1af85543418fe3cf398f4b6eb65ef60e3b5e351a44a4`
  - `evidence/phase3/start_sh_stdout.txt` : `9c7140ff1b27b2a4594664c38e29ffcd826ca5546978fff99a0b2df51af86e49`
  - `evidence/phase3/report_dir.txt` : `cf1b1753d604ca61955fd8748825a2dbd08487d04386d00591bf432d365b6eb6`
  - `evidence/phase3/summary_report.xml` : `8bb122104746d4685daf37b9bbdb8b4494728b17ed889bdcf4b448628d6ca57b`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True artifact_hash=True uptime 84584.05->84648.90 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `1fa683ad358554f6ab8130319421622bbbe34fb36f7e21a5772a557153dd2a4d`
  - `evidence/phase4/device_cmds.txt` : `2ec3713a5b834470b2ec45078578ac4dd3745ff22859d1361e607b9d059688d1`
  - `evidence/phase4/run_meta.txt` : `e1af27e9fd0ff3216fc7fe411cb4a13276c3f33e0619f3addfd6b26bc4605b50`
  - `evidence/phase4/artifact_runtime_proof.txt` : `3f8d04487e59bca0908d2b0c88e1ca21730579442357c6514d8a1cdfedeeeebd`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: User P4 review: (1) hidumper args must mirror CLI SetCmdArgs (append trailing pid) to get --thread summary not ps -efT; (2) use text stacktrace not JSON; plus test-artifact changes for warning->fault merge demo and diverse thread names

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 21 file(s) changed (17 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `1876f57a9119111b136695539d8924108cb4b808f8f7920e991f1e92d0ff1600`
  - `evidence/phase1/changed_files.txt` : `a66f5b0bc91f7f34391e742b809bbf375971faf1463e936eab5ecb556148c739`
  - `evidence/phase1/style_report.txt` : `8968919c89cb3f35808dc0de3bcb1c565eb14984c3624c657d7b631af6911cc2`
  - `evidence/phase1/strict_cpp_report.txt` : `c68cf3dfb2ae3d195cb4cd19f9605a4552d60400f59d26d09fc18f0e4006754c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `47d43636dc318287c29299977a481bfd32269ca3864268e71990dca5f7fcde7c`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-10-09-39
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `387c057338d94903808e4061990793ca53d0a949adaaf50afb51557358de0873`
  - `evidence/phase3/start_sh_stdout.txt` : `3c7afd50325ab58d03cc9843bb6f377744f910c5326cdbc52e65032bfb9f32a1`
  - `evidence/phase3/report_dir.txt` : `b4c1b310fbfe462fedc5236b4c03291ffe740cc3c06eadf0dd7514a13d470d88`
  - `evidence/phase3/summary_report.xml` : `c3b9f9e3f7e69cf589833cae0c78678e0b625eae3a86a23dfbb11e875d5f3ee2`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True artifact_hash=True uptime 86658.15->86757.25 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `12a75b2511091a296c9f9744b272abb29aa333bc026362f83d9db0f82c490ae4`
  - `evidence/phase4/device_cmds.txt` : `f087532e1e31141a56780f341d7d48d2adb404a71d7cb997fdd1802f123bb225`
  - `evidence/phase4/run_meta.txt` : `f380260de5b6aac19b214a57b4827c510ad1f7a7a9e615f18c8bd188fd0c6bc1`
  - `evidence/phase4/artifact_runtime_proof.txt` : `5d32731e0ed0a6519b9c1763ff28892166a80c09af083a8818bb2990e0264288`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: Add moduletest driving detector at REAL thresholds (warn 2000/fault 3000) with 3000+ real in-process threads; test saved in repo

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 23 file(s) changed (19 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `e4ebd81ece5a6682f171bfcdf57c31c33df9a47b8a6c2ae3641c790295838510`
  - `evidence/phase1/changed_files.txt` : `ae0b5c42cab9309d96c9398fa62942c7d83f10ee9037437c9cb331ef3481ec28`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `4d7230384d6436ce5c4569c04f60ed7ac3fde6a4829258431655c01f12a188d5`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-10-35-55
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `f83c185144107cd062f63ef363f1003759991732b92c4cec88940cca74187c3e`
  - `evidence/phase3/start_sh_stdout.txt` : `4598b67e27584ed8b664958a45c722aeab1298d2fe3b4fcd1ac33f8c6199e64f`
  - `evidence/phase3/report_dir.txt` : `241d5e0c83f2e6002e21f8dbece9f2f1f0cb3c84e8182e30fbcdfcfc3b199e38`
  - `evidence/phase3/summary_report.xml` : `7bcd3f68f3778641f863735fbba884cab50f7807db5c7d588c91a319cbde42fc`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: Redesign moduletest: detector must dump an EXTERNAL child-victim process (staged warning->fault via pipe), not self-dump thousands of own threads (self-dump wedges). Keeps real thresholds 2000/3000.

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 23 file(s) changed (19 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `e4ebd81ece5a6682f171bfcdf57c31c33df9a47b8a6c2ae3641c790295838510`
  - `evidence/phase1/changed_files.txt` : `ae0b5c42cab9309d96c9398fa62942c7d83f10ee9037437c9cb331ef3481ec28`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `fa04271db56321ebfab8452471e4bc1776a524a0cff7dc7753c57380464b6485`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: test target build failed: ThreadLeakDetectorUnitTest
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `b8edc2a0e0a8078bd03925187061913364d4a5c7b3b2a6758616c4567caded2f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-11-52-27
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `bea16fb8fbd5f763853b6474c594aaa4a1fddabae6f24fddedd4b0068f2a8ad0`
  - `evidence/phase3/start_sh_stdout.txt` : `7acdada3247301456b6139ca01f67b86e28ba0742429aeefc988782af8b62d2a`
  - `evidence/phase3/report_dir.txt` : `0c5ce1340c8de33c5506f6ae70d7f9b4a8a815c9b769e9451617e777bd58c5dc`
  - `evidence/phase3/summary_report.xml` : `85f5bad6c0e8f594e79fb0232d7fa01bab43ecd63a6d2b131e68e173b0d6a82c`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: Add committable real-threshold sample log (from ThreadLeakDetectorModuleTest external-victim run at warn2000/fault3000) under test/moduletest/sample_thread_leak_conclusion.txt

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->c28ac3e28939, 24 file(s) changed (20 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `26cc0cf1efe0f673a1e725a9b08f7e1a96f85eaf12bb0629e8feb79fdab3b76a`
  - `evidence/phase1/changed_files.txt` : `e33a42968b0994deb4d2cb86676824559fa8051079acf69eb46d54502d299981`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `d06efe0d8672986727d73489cc37468c3507a64dfe0b66d64bd8d8409beca182`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-12-16-25
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `008ab71fdb4492ed7ee0822045233dc14e7c815a66b38eddc1a3e2ac3fabbe5c`
  - `evidence/phase3/start_sh_stdout.txt` : `11bd8b18414001b3bac7b2b49f2b48fb551a766a2aecf596ed4071e7a8695725`
  - `evidence/phase3/report_dir.txt` : `e4763e372cb9157fe8e4935e267b133ef8c76d290f1e14411ebf7a3984ca57ea`
  - `evidence/phase3/summary_report.xml` : `6055e3dfdb471f20690a502d49218f792352e04461b34a0cde4acd93ec7024a0`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True artifact_hash=True uptime 1032.15->1125.44 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `fdd1a24f602a58449fdba7761c746694150cfbe77d4553abcc04adfecada5c8a`
  - `evidence/phase4/device_cmds.txt` : `8243cf30c922fd6c7b0bf31de7608fa4e64d2ae1a0f661eda38f2837b79551cf`
  - `evidence/phase4/run_meta.txt` : `e00d8dfe94ba3ec8f17a553d1bb090bba7ec06f98f6ce5e685b8e57bd9d60d09`
  - `evidence/phase4/artifact_runtime_proof.txt` : `5d32731e0ed0a6519b9c1763ff28892166a80c09af083a8818bb2990e0264288`

## P5 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=9 failures=0 errors=0 fresh=2026-07-08-14-16-05 | quality:coverage=evidence/phase5/coverage_report.html; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 no C/C++ changes | external_review evidence/phase5/external_code_review_report.json issue_count=0
- artifacts (path : sha256):
  - `evidence/phase5/start_sh_stdout.txt` : `ae8166b4a1ab4e4c37f8ee42276de7bce5220a8d536d60f4f40b60df8f20bdbc`
  - `evidence/phase5/summary_report.xml` : `0014baf5f2b59f527705e41461839d75b692353a9ad849ff35f206c605916bd7`
  - `evidence/phase5/report_dir.txt` : `fc3833273282a13b8023fa35634f710913f8c6df9c2e0415251b260c2f5fb92b`
  - `evidence/phase5/coverage_report.html` : `ea6f78f1b6e79f0f78fd81f297f8fb1fed4a9fef8b60f01b369807cf79ff84cc`
  - `evidence/phase5/performance_report.md` : `3440994c7b6659ab214c57ab54ffadb708a62dc708a2706665040794641e06b0`
  - `evidence/phase5/power_report.md` : `fc68d1c76c904680e59ca8ea829a1b836ea874eb9abdfcafa5c9848aeda9eb03`
  - `evidence/phase5/stability_report.md` : `26b2f83d998bb779a9db003f220f1fcd7980ff8aaf3631c43db9e08035ce667a`
  - `evidence/phase5/code_review_report.txt` : `5f332ee24717eecafbd3a4c17a63d1f4da32a08f953fef2b0e08e08659fa64bb`
  - `evidence/phase5/external_code_review_report.json` : `9e7d9e3fea5bf4e238004e587982c69ce66337bf5bff411f0362976cff629c94`

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: git push failed: To https://gitcode.com/mgce1/hiviewdfx_hiview.git
 ! [rejected]          thread-leak-detector -> thread-leak-detector (fetch first)
error: failed to push some refs to 'https://gitcode.com/mgce1/hiviewdfx_hiview.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note abo

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: oh-gc pr create failed: ›   Error: API error 403: 
 ›   {"error_code":403,"error_code_name":"UN_KNOW","error_message":"403 
 ›   Forbidden - Unauthorized 
 ›   access","trace_id":"<REDACTED-SERIAL>"}

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: pr=1 overall= ci_ok=False pushed=932a6b6fb23e pr_head=932a6b6fb23e sha_ok=True local_review=issue_count=0 pr_review=issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `195f70e34826e5bb0ed51271fa8bfb01e9a81b71970e6149284d85f9a2511292`
  - `evidence/phase6/full_diff.stat.txt` : `41ec78e4c68407413a28c2b9b790ed6d8317e63bf0f79ee6619b1a4bbfb012a0`
  - `evidence/phase6/local_code_review_report.json` : `d08ec884876040c3ee8fb8bda8e604e8c20b004b184c717eaceac7a0c5bacfd3`
  - `evidence/phase6/pr.json` : `0ab8848e08675e42def731ac847eed0087064edb529c21d5e7f3c3bb5e7e5a93`
  - `evidence/phase6/pr_create.txt` : `6e5801dc1e815590a9b2b83accb6b8b5af222b97851ed30c4c6498c4bd6a0052`
  - `evidence/phase6/pr_review_report.json` : `3e95ec72579644ac4d313c4a58af66bfc632e1ecf1eb4ec2b749a8cd12305f10`
  - `evidence/phase6/ci_status.json` : `2b43339b6748a286d8058041fac0f99d8b71809e4da868b1c87a9937ec03f1dd`

## P6 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: pr=4328 overall=pending ci_ok=False pushed=932a6b6fb23e pr_head=932a6b6fb23e sha_ok=True local_review=skipped (--pr re-verify) pr_review=issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `195f70e34826e5bb0ed51271fa8bfb01e9a81b71970e6149284d85f9a2511292`
  - `evidence/phase6/full_diff.stat.txt` : `41ec78e4c68407413a28c2b9b790ed6d8317e63bf0f79ee6619b1a4bbfb012a0`
  - `evidence/phase6/pr.json` : `c7fe477e3ed7343ed3e6de0c0ebc8ffa25bd5d7b815139f74090d859ea627ece`
  - `evidence/phase6/pr_create.txt` : `6e5801dc1e815590a9b2b83accb6b8b5af222b97851ed30c4c6498c4bd6a0052`
  - `evidence/phase6/pr_review_report.json` : `3e95ec72579644ac4d313c4a58af66bfc632e1ecf1eb4ec2b749a8cd12305f10`
  - `evidence/phase6/ci_status.json` : `57ba073cf8fea4f2be0f4a09d45d3d592ea824fd363521aae892dfb0734a5c99`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: Drop committable sample .txt from the change per review (keep full artifact only in pipeline evidence); no code/binary impact

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->932a6b6fb23e, 23 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `3bb089e90a9491984060d5a5ca7f066c41452ab43057cd5fb4c1762f6c763546`
  - `evidence/phase1/changed_files.txt` : `86dc8402e82431dbae8ba3db0d8be692a05b73cf6e8b1d52f5e8db3feb9fb5e7`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->94cd542343ea, 23 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `3bb089e90a9491984060d5a5ca7f066c41452ab43057cd5fb4c1762f6c763546`
  - `evidence/phase1/changed_files.txt` : `6ff900fbe5c2191bba980ffa7a5ca750a7929d51f551d65002e75bb08e0ade54`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: Fix CI codecheck defects

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->94cd542343ea, 23 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `bb607e886fd659f2b3df863f61616bd714af7039343040633597b8ccb4948a05`
  - `evidence/phase1/changed_files.txt` : `6ff900fbe5c2191bba980ffa7a5ca750a7929d51f551d65002e75bb08e0ade54`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `8ad547e588a40798b8eed6dbefdf071cc8d17296420c0744ace706855445a018`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-17-37-35
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `cc5c54ad365481718b9d51f89219e99e77e4097bb09c6ce74c0f58091c6450e7`
  - `evidence/phase3/start_sh_stdout.txt` : `63b1633cdd935c61b18919f8ef75895a68aa366ff736ed206e41d5de18e3bedd`
  - `evidence/phase3/report_dir.txt` : `cc96b8c1d0d7a2fa27d986eddc3dbd2472e0268a45c0b914de193f06277435bc`
  - `evidence/phase3/summary_report.xml` : `ed132c4b46dd5a5942854aa1473abed324756164b09b5d1a0c4758947dfc0ef7`

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: CI round-2: hisysevent.yaml duplicate THREAD_LEAK key (event pre-existed at base line159) breaks package yaml parse on arm64; remove my dup + align HiSysEventWrite to existing schema

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head c28ac3e28939->193b3505f52a, 22 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `0d0f0efe5c64ee797523769c940c323e1d2e90159d3231aefe7c451d287f5d77`
  - `evidence/phase1/changed_files.txt` : `f47c4e738f8617c261e8f37785c877c961dbdfd5a1bd2cd89e128899af3cc3a4`
  - `evidence/phase1/style_report.txt` : `b8d6bf54a491ef5a325be80001c0a06b8e893c13afaadcc804ae2831a3a1e167`
  - `evidence/phase1/strict_cpp_report.txt` : `77f68c55a4a119ed70c6b4d692fe06ac21501486f8ee0b73e533aee56c7bab3c`

## P2 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `7112fc0d5b90ae05088eec1deae52a7684f23965ade3478cccaefb778cad272d`
  - `evidence/phase2/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`

## P3 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=9 failures=0 errors=0 fresh=2026-07-08-18-44-53
- artifacts (path : sha256):
  - `evidence/phase3/test_build_stdout.log` : `da0e99cf0996cd286d76feada79b0abc0429fddf5437abe384289a13bcc540cf`
  - `evidence/phase3/start_sh_stdout.txt` : `b12296d8c64e6e7fec3a4e1e669002c78c91f45d040779567136d11a79d6b928`
  - `evidence/phase3/report_dir.txt` : `046fb97b48e84761dc53542ef99cf799303f8bcc3c4cbda5e5547bd033b60000`
  - `evidence/phase3/summary_report.xml` : `3b83e99cf51edce6325eefaa19417e812e597a25f4bb2775d678ba67801bdc7f`

## P4 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True marker=True runtime=True e2e=True artifact_hash=True uptime 27271.11->27364.80 mono=True
- artifacts (path : sha256):
  - `evidence/phase4/hilog_capture.txt` : `5ed13a6a80666bf5a3eb5ce927ac7a725022b0e80b910746cfadea24540e62af`
  - `evidence/phase4/device_cmds.txt` : `9c1f6a5469637ceff19715a9a9ef4e27ee86aab2351c702df24244d20d00d453`
  - `evidence/phase4/run_meta.txt` : `e05f43abc01facab12db1129a219c3f5dc5b463948f92b7e5e9e3b85bd4269ab`
  - `evidence/phase4/artifact_runtime_proof.txt` : `ca7eb94eec1372f49566e242650a8ec39b73c776449f3dc2b510c9e385e2370c`

## P5 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=9 failures=0 errors=0 fresh=2026-07-08-19-36-23 | quality:coverage=evidence/phase5/coverage_report.html; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 15 file(s) | external_review evidence/phase5/external_code_review_report.json issue_count=0
- artifacts (path : sha256):
  - `evidence/phase5/start_sh_stdout.txt` : `04d3417d7d4acc218e3446482152444b6070980978e51a3dbfffe71e0cddf693`
  - `evidence/phase5/summary_report.xml` : `9c36606edd01ceb80c4e93fcd129b9ec97f2fbdc5ff1e81124ce5aa64026648f`
  - `evidence/phase5/report_dir.txt` : `b1b36ca32e8d2e2b2b0f82d908042f4460e38f6f758f4d6bf9371e9168462ff4`
  - `evidence/phase5/coverage_report.html` : `ea6f78f1b6e79f0f78fd81f297f8fb1fed4a9fef8b60f01b369807cf79ff84cc`
  - `evidence/phase5/performance_report.md` : `3440994c7b6659ab214c57ab54ffadb708a62dc708a2706665040794641e06b0`
  - `evidence/phase5/power_report.md` : `fc68d1c76c904680e59ca8ea829a1b836ea874eb9abdfcafa5c9848aeda9eb03`
  - `evidence/phase5/stability_report.md` : `26b2f83d998bb779a9db003f220f1fcd7980ff8aaf3631c43db9e08035ce667a`
  - `evidence/phase5/code_review_report.txt` : `5ae6160af1afd520ee46b9aaa02856fc656c698ee7d49084aea92c1e703bb36d`
  - `evidence/phase5/external_code_review_report.json` : `9e7d9e3fea5bf4e238004e587982c69ce66337bf5bff411f0362976cff629c94`

## P6 upload-review — PASS
- gate: `gate_upload_ci.py`
- reason: pr=4328 overall=success ci_ok=True pushed=a6624f1d2552 pr_head=a6624f1d2552 sha_ok=True local_review=skipped (--pr re-verify) pr_review=issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `0d0f0efe5c64ee797523769c940c323e1d2e90159d3231aefe7c451d287f5d77`
  - `evidence/phase6/full_diff.stat.txt` : `64d0a9dfba0ce9e6790800ab3ec69d39048fddff6edfacf750b5810ee9d2f2c2`
  - `evidence/phase6/pr.json` : `78ec492c944885ab501f432932de2d82a751b2ab02991bc4ecc3921dee2271c9`
  - `evidence/phase6/pr_create.txt` : `6e5801dc1e815590a9b2b83accb6b8b5af222b97851ed30c4c6498c4bd6a0052`
  - `evidence/phase6/pr_review_report.json` : `3e95ec72579644ac4d313c4a58af66bfc632e1ecf1eb4ec2b749a8cd12305f10`
  - `evidence/phase6/ci_status.json` : `27510d4db23222a469815c730e9dca0e677f0b61f491094fd35950f722dc8acf`
