# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `20260818-resource-reliability-monitor`
- build_target: `hiview_package`
- base_commit: `428e80c18ff172dc857066dd2ec5686044fe6dde`

## P0 bootstrap — FAIL
- gate: `gate_env_init.py`
- reason: missing capabilities: device
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `7b834d592527dfba08aac87a360eee7b6e6fd3e99abbd233f6a5d3fb56c50cec`
  - `evidence/phase0/build_probe.log` : `ee005ba76f7d8225973fff065ad2a25fb60149101e25fd3df4c5bff27afb4093`

## P0 bootstrap — FAIL
- gate: `gate_env_init.py`
- reason: missing capabilities: device
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `f3bf00bc26481948e1dd61ccecfb274c006c988c461eae150e7e86895619748e`
  - `evidence/phase0/build_probe.log` : `ee005ba76f7d8225973fff065ad2a25fb60149101e25fd3df4c5bff27afb4093`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL>
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `1036fa61371feb13764fd5649f3de478b0f4e2b0535aac613fc0e5d3c0036d5b`
  - `evidence/phase0/build_probe.log` : `ee005ba76f7d8225973fff065ad2a25fb60149101e25fd3df4c5bff27afb4093`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL>
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `1036fa61371feb13764fd5649f3de478b0f4e2b0535aac613fc0e5d3c0036d5b`
  - `evidence/phase0/build_probe.log` : `ee005ba76f7d8225973fff065ad2a25fb60149101e25fd3df4c5bff27afb4093`

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `18f5778e7a9e827c3169c0020d7905726d9d5d493eedfa3b3377161064e7b00b`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 31 file(s) changed (30 untracked), style_ok=False strict_ok=True hygiene_ok=False changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `2860600771309348397f08593605cc1e215483d098a087ae61aaddf31682cf46`
  - `evidence/phase2/changed_files.txt` : `a1dce5ba7233eb12e8dc8496b324fa38260128c309a9af4d362ff54287cc85c5`
  - `evidence/phase2/style_report.txt` : `93ed9824c19d8311dd7a908fbfd0d6fab2acd482970ebfda41f521f23546c59a`
  - `evidence/phase2/strict_cpp_report.txt` : `d97ccac35b93c7589b6cc84dc9cfce0cfbe2552ca4789a33904a59307df29018`
  - `evidence/phase2/file_hygiene_report.txt` : `c4adac7e67150ea5d1616458f36c2019b3c6d3bcfb44f6610818fdda2c9c6f51`
  - `evidence/phase2/changed_files_coverage.txt` : `19272f32c6bb1216d538a53d1c356bd30d678917fc734caf81edae39223c6668`

## P2 feature-develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 31 file(s) changed (30 untracked), style_ok=False strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `2860600771309348397f08593605cc1e215483d098a087ae61aaddf31682cf46`
  - `evidence/phase2/changed_files.txt` : `a1dce5ba7233eb12e8dc8496b324fa38260128c309a9af4d362ff54287cc85c5`
  - `evidence/phase2/style_report.txt` : `212cfcb8b638df402cda807d8028bd55e4b18ea0e240a0e28b7a8b4840c233de`
  - `evidence/phase2/strict_cpp_report.txt` : `d97ccac35b93c7589b6cc84dc9cfce0cfbe2552ca4789a33904a59307df29018`
  - `evidence/phase2/file_hygiene_report.txt` : `522c6a39d0865c5a8d5e481944f4487c3bbb1de4f45ce9b0ae6db42e3c255cd7`
  - `evidence/phase2/changed_files_coverage.txt` : `19272f32c6bb1216d538a53d1c356bd30d678917fc734caf81edae39223c6668`

## P2 feature-develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 31 file(s) changed (30 untracked), style_ok=False strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `2860600771309348397f08593605cc1e215483d098a087ae61aaddf31682cf46`
  - `evidence/phase2/changed_files.txt` : `a1dce5ba7233eb12e8dc8496b324fa38260128c309a9af4d362ff54287cc85c5`
  - `evidence/phase2/style_report.txt` : `4906dfd8ba70099d49d9a8b8165078328708b429c92e70f538e2fafd55871d7d`
  - `evidence/phase2/strict_cpp_report.txt` : `d97ccac35b93c7589b6cc84dc9cfce0cfbe2552ca4789a33904a59307df29018`
  - `evidence/phase2/file_hygiene_report.txt` : `522c6a39d0865c5a8d5e481944f4487c3bbb1de4f45ce9b0ae6db42e3c255cd7`
  - `evidence/phase2/changed_files_coverage.txt` : `19272f32c6bb1216d538a53d1c356bd30d678917fc734caf81edae39223c6668`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 31 file(s) changed (30 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `2860600771309348397f08593605cc1e215483d098a087ae61aaddf31682cf46`
  - `evidence/phase2/changed_files.txt` : `a1dce5ba7233eb12e8dc8496b324fa38260128c309a9af4d362ff54287cc85c5`
  - `evidence/phase2/style_report.txt` : `37a9ddea8aad02cf316931bfd6b3ea79328a61f43103b29bd347651b4e4e7404`
  - `evidence/phase2/strict_cpp_report.txt` : `d97ccac35b93c7589b6cc84dc9cfce0cfbe2552ca4789a33904a59307df29018`
  - `evidence/phase2/file_hygiene_report.txt` : `522c6a39d0865c5a8d5e481944f4487c3bbb1de4f45ce9b0ae6db42e3c255cd7`
  - `evidence/phase2/changed_files_coverage.txt` : `19272f32c6bb1216d538a53d1c356bd30d678917fc734caf81edae39223c6668`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `28dd335f92c16d185350b0122abbbbe81c2983e6baafbf3812f1a8bc5ca8e2e3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `78e07e4d16fd2a714e272ad25ddaca6904ad87412697a8464d0d5130aa3fd375`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `3acd8549e7b2d0d273c8f16aa30e41c77a7f988fe3752818103acf788bbc3f95`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `c4c3c1977d5a2f74f12941b436b7062e745dbaad36cf915a2578be19cba8760a`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `079f525aafd4c79a59a2442f0f59ef7060e2e7c3da9a6edff60792f606537bec`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `42a1c61bafce6a6b8acdae0370e9c97bb95cd916bc408c2ce05fea633ff740d5`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `5fa1a9c2df8c37773a1ffc4973a8a7fb6e89bd66dd5fd20d28fb777ef37944e0`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `1196f3fb26f487bdf189740908f360cc2fae2f35492fd627f2751d8a772dd61b`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `b13a9d2b272d4d514a65489f0fdfca8d8f6fca2468c97d1cc121ea28b70e34c8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `e8a41a1219feae1e20d3dbe4e30a5a7f028027065e5a3b1d2cd6e49d73e4c30a`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `9858647866edab94c1d24c3e8dd7d53bde86839e2874410e5f2082d1797ce5b1`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `fd426a3e84d51be8d5fd742156f583772c2af186012d92044e3d2e01bd2f7816`

## P4 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 70 marker line(s) artifacts 1/1 present
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `780970c39f05bfe7e7de03f236be2bbbe5d3e88ac86d4f4e98f8f89cdba9c919`
  - `evidence/phase4/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/error_distill.txt` : `2e8e7e963c01c38570f40264b6691c1aff919e09646249bcd175fa27f6bae5a6`

## P1 design-orchestrate — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: compile fix in resmon_event_listener.cpp: SysEvent param read needs non-const view (const_cast) on the const Event& dispatch ref

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `18f5778e7a9e827c3169c0020d7905726d9d5d493eedfa3b3377161064e7b00b`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 45 file(s) changed (44 untracked), style_ok=False strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `be2809371c0f477df959babeea77a1a9f90ef3f750734da1175e36314ca5a94c`
  - `evidence/phase2/changed_files.txt` : `85360d8de864382b2c7fd7efe63801f091c5018949e5db01058870e92c1ccd0b`
  - `evidence/phase2/style_report.txt` : `e7e5db4b3efbea918882a09d0c50f6f72fc7f7dbedc6286aa78ea66418508d0a`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `cf259ec6cc1a168646481864f338c7ee5af808945553a170b67328f8238071d3`
  - `evidence/phase2/changed_files_coverage.txt` : `fe3d0c8ebcff092c58c6825ba6cdd4cf56487fe798ecce261d0c403d53a0211a`

## P2 feature-develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 45 file(s) changed (44 untracked), style_ok=False strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `be2809371c0f477df959babeea77a1a9f90ef3f750734da1175e36314ca5a94c`
  - `evidence/phase2/changed_files.txt` : `85360d8de864382b2c7fd7efe63801f091c5018949e5db01058870e92c1ccd0b`
  - `evidence/phase2/style_report.txt` : `d6edd9ebf756ea17b56ae8110954525c4f9629cce2e28492876f95691bebb919`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `cf259ec6cc1a168646481864f338c7ee5af808945553a170b67328f8238071d3`
  - `evidence/phase2/changed_files_coverage.txt` : `fe3d0c8ebcff092c58c6825ba6cdd4cf56487fe798ecce261d0c403d53a0211a`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 45 file(s) changed (44 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `be2809371c0f477df959babeea77a1a9f90ef3f750734da1175e36314ca5a94c`
  - `evidence/phase2/changed_files.txt` : `85360d8de864382b2c7fd7efe63801f091c5018949e5db01058870e92c1ccd0b`
  - `evidence/phase2/style_report.txt` : `04706dba5d22b48ca24c71381813904d7a5bcf5cd67193eea1f752e9519976e9`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `cf259ec6cc1a168646481864f338c7ee5af808945553a170b67328f8238071d3`
  - `evidence/phase2/changed_files_coverage.txt` : `fe3d0c8ebcff092c58c6825ba6cdd4cf56487fe798ecce261d0c403d53a0211a`

## P3 test-develop — FAIL
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=0, new_test_files=0 MISSING: ResmonConfigTest.LoadDefaults, ResmonConfigTest.LoadFromJson, ResmonConfigTest.InvalidFileKeepsDefaults, ResmonCpuCollectorTest.ParseProcStat, ResmonCpuCollectorTest.CpuUsageDelta, ResmonCpuCollectorTest.ProcCpuTopN, ResmonCpuCollectorTest.LoadAvg, ResmonMemCollectorTest.ParseMeminfo, ResmonMemCollectorTest.ProcMemTopN, ResmonMemCollectorTest.IonDegradeWhenAbsent, ResmonIoCollectorTest.ParseDiskstats, ResmonIoCollectorTest.PartitionWater, ResmonPwrCollectorTest.ThermalZones, ResmonPwrCollectorTest.TripPoints, ResmonNetCollectorTest.ParseNetDev, ResmonNetCollectorTest.NetDevDelta, ResmonThrCollectorTest.ThreadStateDistribution, ResmonThrCollectorTest.DStateMarked, ResmonThresholdTest.OverThresholdTrigger, ResmonThresholdTest.DebounceSuppress, ResmonThresholdTest.MinInterval, ResmonThresholdTest.IndependentSwitches, ResmonRingBufferTest.PushRoll, ResmonRingBufferTest.DrainSnapshotContext, ResmonLandingTest.FileNameConvention, ResmonLandingTest.AppendWrite, ResmonLandingTest.RollingByQuota, ResmonLandingTest.RollingByAge, ResmonEventListenerTest.OnUnorderedEventTriggersSnapshot, ResmonEventListenerTest.EventNameFiltered, ResmonEventListenerTest.OomSnapshotContent, ResmonEventListenerTest.AnrSnapshotContent, ResmonEventListenerTest.StabilitySnapshotWithRingContext, ResourceMonitorPluginTest.PeriodicTickLands, ResourceMonitorPluginTest.SingleItemFailureIsolated, ResourceMonitorPluginTest.DeferredConfigReload
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `d43d15960ea2cfce1e4ab576c8cce543c27ad327deba00d1386e288e11edbaa4`
  - `evidence/phase3/test_style_report.txt` : `86b9a718e169b98e63404f09054fa7f34dd39d9bd7518e0adf0204d756a40c7a`
  - `evidence/phase3/test_hygiene_report.txt` : `afedf06ce5bee607c807c9a69b9f25efd52f4a819b8c1ecc2546e6b55befad83`
  - `evidence/phase3/authorship_coverage.txt` : `af7af98c11249d933889dff5624338484179c8b1c260ccc8288b5a261734071e`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `28dd335f92c16d185350b0122abbbbe81c2983e6baafbf3812f1a8bc5ca8e2e3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `78e07e4d16fd2a714e272ad25ddaca6904ad87412697a8464d0d5130aa3fd375`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `74ee1bf160dca54358d5162bdb3475b9df32cf86511250506937178a6d590acc`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `acc2ebd5a9914cf77fbfddd3f19d5ba252a8f2fd55d755452c71e609cd3c0dea`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `079f525aafd4c79a59a2442f0f59ef7060e2e7c3da9a6edff60792f606537bec`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `7393bb429cb1ec56a2859e0b861859562379fb304f7d251bf8a68af1f15228b8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `fbb283b494054d2027dab0d7725516275aa549ebed6a3fbe80ad3f37d3c788ce`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `fd12deac6bb26c307f8dd4305b382edbf932b435fe158e1f3e2bcac0d93ea7c9`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `b13a9d2b272d4d514a65489f0fdfca8d8f6fca2468c97d1cc121ea28b70e34c8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `f556bb81f03198e44008d241ef1114a2b0b59f37dd17ab0dbb05b4a5c8257382`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `9858647866edab94c1d24c3e8dd7d53bde86839e2874410e5f2082d1797ce5b1`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `d72e332d8daf94163a59d798e5cda9afc5c007524d7206ff1cdf2c307de196b4`

## P4 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `e83d8f1d870efe1ad682171c29f2a9fd970c68d3e2e166940ac1291f59d007e6`
  - `evidence/phase4/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/metric_findings.json` : `a349871f191ee1d365328e38b99d46c9940cf56af6c39a0d23da73523ba1f8b6`
  - `evidence/phase4/clang_tidy_note.txt` : `9a04ffb3711aebf11cc38f91c4ccfe92e4579bceb5c78378263dfb94d30807b5`
  - `evidence/phase4/clang_tidy_findings.json` : `eeb3dc8e9701d27c15182f89c1aa3edeb0edf100a7d3dbf5be81a4c15b23389c`

## P5 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: no new reports/<timestamp>/ dir produced this run
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `2ea6667bd788822ccb0606f0ed46173a68d4a83ebf0d99338728b565b1506a56`
  - `evidence/phase5/start_sh_stdout.txt` : `5fcc88d809416ed29170c4050b19f933ecc0d7feb990173dbee52436c7daa6c6`

## P1 design-orchestrate — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: wire ResourceMonitorTest unittest into GN graph: add group(unittest) in resource_monitor/BUILD.gn + reliability/resource_monitor:unittest in plugins/BUILD.gn

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `18f5778e7a9e827c3169c0020d7905726d9d5d493eedfa3b3377161064e7b00b`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 46 file(s) changed (44 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `7203e6fb988151d9da1c01b787b96a2e747872f1a452346be5a4ae49e6fef6c9`
  - `evidence/phase2/changed_files.txt` : `edddb460f0f4f5df1500e8afeee49b6d681932ed15c8444b95f6f1ba56562bda`
  - `evidence/phase2/style_report.txt` : `04706dba5d22b48ca24c71381813904d7a5bcf5cd67193eea1f752e9519976e9`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `77d229a6540e715f000f1714fb4337985804d7b0f5d7615c053b20a4998799d0`
  - `evidence/phase2/changed_files_coverage.txt` : `cb8d5abd79c53d89e952823de245d30516db4c9a3d155e6a7a63a6b23ad84c49`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `28dd335f92c16d185350b0122abbbbe81c2983e6baafbf3812f1a8bc5ca8e2e3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `78e07e4d16fd2a714e272ad25ddaca6904ad87412697a8464d0d5130aa3fd375`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `74ee1bf160dca54358d5162bdb3475b9df32cf86511250506937178a6d590acc`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `acc2ebd5a9914cf77fbfddd3f19d5ba252a8f2fd55d755452c71e609cd3c0dea`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `079f525aafd4c79a59a2442f0f59ef7060e2e7c3da9a6edff60792f606537bec`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `7393bb429cb1ec56a2859e0b861859562379fb304f7d251bf8a68af1f15228b8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `fbb283b494054d2027dab0d7725516275aa549ebed6a3fbe80ad3f37d3c788ce`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `fd12deac6bb26c307f8dd4305b382edbf932b435fe158e1f3e2bcac0d93ea7c9`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `b13a9d2b272d4d514a65489f0fdfca8d8f6fca2468c97d1cc121ea28b70e34c8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `f556bb81f03198e44008d241ef1114a2b0b59f37dd17ab0dbb05b4a5c8257382`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `9858647866edab94c1d24c3e8dd7d53bde86839e2874410e5f2082d1797ce5b1`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `d72e332d8daf94163a59d798e5cda9afc5c007524d7206ff1cdf2c307de196b4`

## P4 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `a5800ed08a7845cce083eb52bb92be599af8dbbae7d18ca4e0e6253d7b5a91f9`
  - `evidence/phase4/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/metric_findings.json` : `a349871f191ee1d365328e38b99d46c9940cf56af6c39a0d23da73523ba1f8b6`
  - `evidence/phase4/clang_tidy_note.txt` : `9a04ffb3711aebf11cc38f91c4ccfe92e4579bceb5c78378263dfb94d30807b5`
  - `evidence/phase4/clang_tidy_findings.json` : `2de99e3bdb9ba56ac75d83ff9d50f491ccb1bd7b0604ae47e7b7f6fdfc7290de`

## P5 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: no new reports/<timestamp>/ dir produced this run
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `e032af38eec75b732e7dce2c71eac45481f55e4dc6f65fe0bf37450cee42ccc0`
  - `evidence/phase5/start_sh_stdout.txt` : `146180fd2dfdbd88d5b658d46bae6d3111b2cdb226bfe46f6cdd83131900797b`

## P1 design-orchestrate — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P5 first real execution found functional bug: resmon_net_collector ParseLine never trimmed /proc/net/dev's right-padded ifname, so '    lo:' != 'lo' and loopback leaked into the reported aggregate (contradicting the collector's own non-loopback contract). Fixed by trimming ifname. Also fixed 3 P5-discovered test bugs (cpu statTail field alignment, mem rssKb from statm, net net/ dir creation). Re-walking P1.

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `18f5778e7a9e827c3169c0020d7905726d9d5d493eedfa3b3377161064e7b00b`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 46 file(s) changed (44 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `7203e6fb988151d9da1c01b787b96a2e747872f1a452346be5a4ae49e6fef6c9`
  - `evidence/phase2/changed_files.txt` : `edddb460f0f4f5df1500e8afeee49b6d681932ed15c8444b95f6f1ba56562bda`
  - `evidence/phase2/style_report.txt` : `04706dba5d22b48ca24c71381813904d7a5bcf5cd67193eea1f752e9519976e9`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `77d229a6540e715f000f1714fb4337985804d7b0f5d7615c053b20a4998799d0`
  - `evidence/phase2/changed_files_coverage.txt` : `cb8d5abd79c53d89e952823de245d30516db4c9a3d155e6a7a63a6b23ad84c49`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `28dd335f92c16d185350b0122abbbbe81c2983e6baafbf3812f1a8bc5ca8e2e3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `369b9bc1434d46147cb27ee826bc100189fe3731f7a8adddb6d437022dbd2354`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `74ee1bf160dca54358d5162bdb3475b9df32cf86511250506937178a6d590acc`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `acc2ebd5a9914cf77fbfddd3f19d5ba252a8f2fd55d755452c71e609cd3c0dea`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `079f525aafd4c79a59a2442f0f59ef7060e2e7c3da9a6edff60792f606537bec`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `2bab8f8f0955bdb4139b7fca54aa290c8d4553d5e830de8bc295d6e3b6e7275a`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `166902d2f5034509d8b1b27661e8f7552dc903c28c5e48186f30d36b535e5ac3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `fd12deac6bb26c307f8dd4305b382edbf932b435fe158e1f3e2bcac0d93ea7c9`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `b13a9d2b272d4d514a65489f0fdfca8d8f6fca2468c97d1cc121ea28b70e34c8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `f556bb81f03198e44008d241ef1114a2b0b59f37dd17ab0dbb05b4a5c8257382`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `9858647866edab94c1d24c3e8dd7d53bde86839e2874410e5f2082d1797ce5b1`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `d72e332d8daf94163a59d798e5cda9afc5c007524d7206ff1cdf2c307de196b4`

## P4 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `b4cc9f2ed9dba917c2e96fb6cc11a05ae3bc7d4ed29c32b393e2a0e3ca8f4b1c`
  - `evidence/phase4/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/metric_findings.json` : `a349871f191ee1d365328e38b99d46c9940cf56af6c39a0d23da73523ba1f8b6`
  - `evidence/phase4/clang_tidy_note.txt` : `9a04ffb3711aebf11cc38f91c4ccfe92e4579bceb5c78378263dfb94d30807b5`
  - `evidence/phase4/clang_tidy_findings.json` : `b1f82ba39b129c271ac1648013db6ec073cbf090b948a006bd5d50a279d793ba`

## P5 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=36 failures=0 errors=0 fresh=2026-08-19-12-15-30 gtest_cov=36/36
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `62cf2a1b392ed9bee8ff537de175c5eac7d0b2595295930e9e9cfd6eac71e688`
  - `evidence/phase5/start_sh_stdout.txt` : `1d1f377edff3709138e352740360f0d6eabced422614a7917e378c3750ca20e2`
  - `evidence/phase5/report_dir.txt` : `c9a57ab5da289dede8ecdf7a155c3f7dc2f517b11d18521bc64d548f0f2f56d7`
  - `evidence/phase5/summary_report.xml` : `a44abec59e99d7f2c83b31ffb18ea940df37fb0cab3077abc6a919a8941e5937`
  - `evidence/phase5/result_hiview__resource_monitor__ResourceMonitorTest.xml` : `e3ff03f1140aa0a98089069456670d872850ae18abc280dc51e5dbf34cd15b14`
  - `evidence/phase5/gtest_coverage.txt` : `5992e25dedf664dade38f55b07a9192ab4833a0ab70248d7a58464b41234e222`

## P1 design-orchestrate — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: P6 device test: d4 EVT_SNAPSHOT never fires on real SCREEN_ON - RegisterUnorderedEventListener(SYS_EVENT) is not fed by real sys events in this hiview build (only maintenance/export events); resmon was the sole plugin on that dead path. Fix: register via AddDispatchInfo + OnEventListeningCallback (SysEventDispatcher path). d6 HOTCFG: OnConfigUpdate cert-blocked on device; add writable-cloud-config mtime polling fallback. Functional code change in resource_monitor_plugin.cpp/h

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `7f292059a7320eb0bb2fef577d70cd39fbd02ffef3f6b3ebea9c2f9ecaf54253`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->428e80c18ff1, 46 file(s) changed (44 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `7203e6fb988151d9da1c01b787b96a2e747872f1a452346be5a4ae49e6fef6c9`
  - `evidence/phase2/changed_files.txt` : `edddb460f0f4f5df1500e8afeee49b6d681932ed15c8444b95f6f1ba56562bda`
  - `evidence/phase2/style_report.txt` : `04706dba5d22b48ca24c71381813904d7a5bcf5cd67193eea1f752e9519976e9`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `77d229a6540e715f000f1714fb4337985804d7b0f5d7615c053b20a4998799d0`
  - `evidence/phase2/changed_files_coverage.txt` : `cb8d5abd79c53d89e952823de245d30516db4c9a3d155e6a7a63a6b23ad84c49`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `28dd335f92c16d185350b0122abbbbe81c2983e6baafbf3812f1a8bc5ca8e2e3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `369b9bc1434d46147cb27ee826bc100189fe3731f7a8adddb6d437022dbd2354`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `74ee1bf160dca54358d5162bdb3475b9df32cf86511250506937178a6d590acc`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `acc2ebd5a9914cf77fbfddd3f19d5ba252a8f2fd55d755452c71e609cd3c0dea`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `079f525aafd4c79a59a2442f0f59ef7060e2e7c3da9a6edff60792f606537bec`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `2bab8f8f0955bdb4139b7fca54aa290c8d4553d5e830de8bc295d6e3b6e7275a`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `166902d2f5034509d8b1b27661e8f7552dc903c28c5e48186f30d36b535e5ac3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `fd12deac6bb26c307f8dd4305b382edbf932b435fe158e1f3e2bcac0d93ea7c9`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `b13a9d2b272d4d514a65489f0fdfca8d8f6fca2468c97d1cc121ea28b70e34c8`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `f556bb81f03198e44008d241ef1114a2b0b59f37dd17ab0dbb05b4a5c8257382`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `9858647866edab94c1d24c3e8dd7d53bde86839e2874410e5f2082d1797ce5b1`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `a2d885284f48b7ccb460c0cc9f7f58f6225040dd7d9e0c9182871e97ae6b91b1`

## P4 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `417fd143ffdde5f80bc6c1215626779fb7b129fb3b05b4b1068378ffc3a25184`
  - `evidence/phase4/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/metric_findings.json` : `a349871f191ee1d365328e38b99d46c9940cf56af6c39a0d23da73523ba1f8b6`
  - `evidence/phase4/clang_tidy_note.txt` : `9a04ffb3711aebf11cc38f91c4ccfe92e4579bceb5c78378263dfb94d30807b5`
  - `evidence/phase4/clang_tidy_findings.json` : `0f6f02498e1723ce2a23e7ec35cb9d8925642058b8948582d9b62704dc22f2c8`

## P5 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: test target build failed: ResmonUnitTest
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `ff5e822fb2ee7875bb7926b430051215adeba2ffb92f820b40e3f2fae696edc7`

## P5 test-author — FAIL
- gate: `gate_test_ut.py`
- reason: tests=38 failures=2 errors=0 fresh=2026-08-19-13-14-19 gtest_cov=36/36
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `528577c83581665a380e63cf0e8cf0a323ce874fffde79428984ab240291e8f1`
  - `evidence/phase5/start_sh_stdout.txt` : `dd959a5bccb2a885f4288d29d860e17c04a0f5f97918820dda2bb1e7e0385c50`
  - `evidence/phase5/report_dir.txt` : `95b2fd49f474c8225c8f98600e0bf3ae46374f1767665a3bfc7d920b1cb90a7d`
  - `evidence/phase5/summary_report.xml` : `7c361e016ebb818db7b514533db3bd732b79404f9b045aa17fa9114e1d45d2f0`
  - `evidence/phase5/result_hiview__resource_monitor__ResourceMonitorTest.xml` : `8a189b7f9cb361f0c4227f1728ab05f63b3638ac07dc2b91388a2ae4ef0eef9f`
  - `evidence/phase5/gtest_coverage.txt` : `5992e25dedf664dade38f55b07a9192ab4833a0ab70248d7a58464b41234e222`

## P5 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=38 failures=0 errors=0 fresh=2026-08-19-13-15-42 gtest_cov=36/36
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `80d41496cd44a6706b88bc0cd1ce7b7086e7f9b8847cb7689408594be744b8bb`
  - `evidence/phase5/start_sh_stdout.txt` : `cd9cf2a4454f69c9323e442f0d2e161e0ce39c14f4df3b87e488be213f9d8896`
  - `evidence/phase5/report_dir.txt` : `399ab256459c20ea0525ed2c297df2d6552ed069ac6d33b5d6d3d32f2d0f8c5c`
  - `evidence/phase5/summary_report.xml` : `871db079fb9b981ab52a378f70c8d3dbf854002877b43ba604915034a6540fd4`
  - `evidence/phase5/result_hiview__resource_monitor__ResourceMonitorTest.xml` : `20a2cbbc8e81b0bbff6ae70702ea2e0756f5ee435886ba39a9e4ba249e00fc20`
  - `evidence/phase5/gtest_coverage.txt` : `fe6c1d8d8a5db469f8fae4b6d2602f8979fab8158a94a053d528d79f38bed1c0`

## P6 device-functional — FAIL
- gate: `gate_device_func.py`
- reason: nonce=True trigger_window=True marker=True runtime=True e2e=True device_cases=6/6 artifact_hash=True provenance=True artifact_loaded=True side_effect=False negative_control=True uptime 1718310.16->1718474.61 mono=True BAD_device_cases=d2
- artifacts (path : sha256):
  - `evidence/phase6/hilog_capture.txt` : `701e91660330c06d8719a59e959dc90fa1b2b11320ee4db99e4e9157ea1cd290`
  - `evidence/phase6/hilog_baseline_window.txt` : `e401fd69f72b63f54709ec1db9067d5a75ae8a3cbf94290d890af3bc4d0e693c`
  - `evidence/phase6/hilog_trigger_window.txt` : `2a4837f59343f96d4d11ab597421f23fcaea954f9c75ceec71a84564b1278866`
  - `evidence/phase6/device_cmds.txt` : `1adb95eebc181b7170e841620d5b0a8a56944ada9c60ae190b86275f5cf9935c`
  - `evidence/phase6/run_meta.txt` : `8ff93a641748d2340f5e4af636b39be1eab30fdaef38869c55b86a6609831fec`
  - `evidence/phase6/artifact_runtime_proof.txt` : `44c03e2c4f8c9d50bde1026819f40865de99e0b50006284bff932dcb982f05ab`
  - `evidence/phase6/device_marker_coverage.txt` : `1fc54e59d8f9e9aaec028c510b285963d9fbff0e6de2723fc46590af3caa7aee`
  - `evidence/phase6/device_case_results.json` : `d36d83ca7a96919335c5d39c48a7c1a780b0a33684c560d6f82a7bd6fab00c31`

## P6 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True trigger_window=True marker=True runtime=True e2e=True device_cases=6/6 artifact_hash=True provenance=True artifact_loaded=True side_effect=True negative_control=True uptime 1718531.22->1718712.83 mono=True
- artifacts (path : sha256):
  - `evidence/phase6/hilog_capture.txt` : `0c4525ae44473b8692ed13dcbc62cb183922d61c2a18ebcd0cd3673d33d1f934`
  - `evidence/phase6/hilog_baseline_window.txt` : `80e03cf1bf10f08753601a7d19d988f06d300c576af17b99bc6b8fc24d693d0e`
  - `evidence/phase6/hilog_trigger_window.txt` : `48e7d5de905d85355e233ef533aee13ec53d04e2c33bc245c89f73da2888b198`
  - `evidence/phase6/device_cmds.txt` : `523422531a107ceb54702eddae0951145741e1309c9f49bc47496c51d7ac38a9`
  - `evidence/phase6/run_meta.txt` : `19020881fe1cae04ab135db151d04eeac747c19cc595ec5d9dd3f287dfb9a62a`
  - `evidence/phase6/artifact_runtime_proof.txt` : `44c03e2c4f8c9d50bde1026819f40865de99e0b50006284bff932dcb982f05ab`
  - `evidence/phase6/device_marker_coverage.txt` : `1fc54e59d8f9e9aaec028c510b285963d9fbff0e6de2723fc46590af3caa7aee`
  - `evidence/phase6/device_case_results.json` : `d8438a82a91ae6101ee61f876f5108456002bde0cd9fd5f0c912a013864f31d0`

## P7 quality-verify — FAIL
- gate: `gate_integration.py`
- reason: no new reports/<timestamp>/ dir produced this run
- artifacts (path : sha256):
  - `evidence/phase7/start_sh_stdout.txt` : `cd3f66f748ffceb384a6f212b5d9f90a849be6236a7c1d3cb9c3d15f240de0e9`

## P7 quality-verify — FAIL
- gate: `gate_integration.py`
- reason: type=UT tests=38 failures=2 errors=0 fresh=2026-08-19-15-04-10 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided
- artifacts (path : sha256):
  - `evidence/phase7/start_sh_stdout.txt` : `3ceb7055d2a21e0b797f7438728bdb02362854ef858d6a6b8a607e2fd91748ef`
  - `evidence/phase7/summary_report.xml` : `4ab2cfe5af7b6bc537eb157e67a79fc620cd662bed23b5a95b7219a34e108fb5`
  - `evidence/phase7/report_dir.txt` : `3b8b0fb87f02d4143b10b181dc8859cb22a164a59c866b34459dab6c78acc616`
  - `evidence/phase7/coverage_report.md` : `23b2dc10ee28d60d82e944c0067f273f5be36ee04bd69bf325584799ad52adc0`
  - `evidence/phase7/performance_report.md` : `ceb3a3f04813f1d5771b173310fa943886c7170685ee5477cb82640528b97118`
  - `evidence/phase7/power_report.md` : `02596742c0bac192bc47cb0864143b3109b23562ff4fa5a7031e652d0946640e`
  - `evidence/phase7/stability_report.md` : `cb046d0ef4094fa0cba7f22524e5f7f557da8b1b3b49bc015e921b35fdd1d741`
  - `evidence/phase7/metric_findings.json` : `d0d497a8c7e18ca9582918668288904b59ec11b389b459c7f3df16e8d71b887e`
  - `evidence/phase7/code_review_report.txt` : `f5709531ae0c0d3e4a8ecdd87ac190de7c1a2854f36f5da9f1e465d38440c43d`

## P7 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=38 failures=0 errors=0 fresh=2026-08-19-15-05-28 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided
- artifacts (path : sha256):
  - `evidence/phase7/start_sh_stdout.txt` : `f23d1a78203ef2dd9fa71b8e1862caf73945db2d6df95b37108d48196f71fc6a`
  - `evidence/phase7/summary_report.xml` : `64fb6614ee9ad9be5fb2c492014785422a353b5d89b486fbd94f8bddadb64af5`
  - `evidence/phase7/report_dir.txt` : `76723692987baccaaf44ebb9a931b7695c4d6b6159cafa1531f561cadbd65262`
  - `evidence/phase7/coverage_report.md` : `23b2dc10ee28d60d82e944c0067f273f5be36ee04bd69bf325584799ad52adc0`
  - `evidence/phase7/performance_report.md` : `ceb3a3f04813f1d5771b173310fa943886c7170685ee5477cb82640528b97118`
  - `evidence/phase7/power_report.md` : `02596742c0bac192bc47cb0864143b3109b23562ff4fa5a7031e652d0946640e`
  - `evidence/phase7/stability_report.md` : `082565c55d36763b3ba2b8b79675af6ecb6c5e722596aed6cf12ab8ab0f56748`
  - `evidence/phase7/metric_findings.json` : `d0d497a8c7e18ca9582918668288904b59ec11b389b459c7f3df16e8d71b887e`
  - `evidence/phase7/code_review_report.txt` : `f5709531ae0c0d3e4a8ecdd87ac190de7c1a2854f36f5da9f1e465d38440c43d`

## P8 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: git push failed: To https://gitcode.com/weixin_45305306/hiviewdfx_hiview.git
 ! [rejected]          feat/resmon-resource-monitor -> feat/resmon-resource-monitor (non-fast-forward)
error: failed to push some refs to 'https://gitcode.com/weixin_45305306/hiviewdfx_hiview.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git

## P8 upload-review — PASS
- gate: `gate_upload_ci.py`
- reason: pr=4435 overall=success ci_ok=True pushed=799192071663 pr_head=799192071663 sha_ok=True fresh=True local_review=skipped (--pr re-verify) pr_review=review_issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `adaf75219923293e774778ed8eb0163f0bd54888c6ec82b45db6dcdf0238561f`
  - `evidence/phase6/full_diff.stat.txt` : `ab235ae210d283396fb56e60dcb8c189bcb5b3d4c74e15761f943953e06caee7`
  - `evidence/phase6/pr.json` : `b798784895d3a0b99ccc051b12e2dd603eea8632d65b604b02b6397202c7d955`
  - `evidence/phase6/pr_review_report.txt` : `beff1e8cfbdb5267cd2f9963e9cab39e7455ce25346ab3d589a0a03a2d972228`
  - `evidence/phase6/ci_status.json` : `880977e01a0fcf03f9c7657f98a9ac087643786493d11e8a41c857594e7672cf`

## P8 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: oh-gc pr create failed: /bin/sh: 1: Syntax error: word unexpected (expecting ")")

## P8 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: pr-review-report missing: pass --pr-review-report <path> (machine-readable zero-issue report). Run the review, drive issues to zero, then re-run.

## P1 design-orchestrate — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: fix OpenHarmony CI codecheck defects (53): ThresholdReason enum to UPPER_CASE, CollectAndLand 6 params -> ResmonSamples struct, ResmonThrCollector::Collect split under 50 lines, net collector index constants, named constants for test magic numbers, test_util inline functions split

## P1 design-orchestrate — PASS
- gate: `gate_design.py`
- reason: design sections 7/7 ok; contract v2 build_artifacts=1 test_cases=36 device_cases=6 requirements=18 changed_files=29
- artifacts (path : sha256):
  - `evidence/phase1/AR_design.md` : `7f292059a7320eb0bb2fef577d70cd39fbd02ffef3f6b3ebea9c2f9ecaf54253`
  - `evidence/phase1/design_check.txt` : `b642dc4c7c13a4c5845b688c91744827e6af61d9552525741f4123773f0fcef2`
  - `evidence/phase1/ar_contract.json` : `d92ab4fa8bcaf7687013fe8a91a5d14669e7e58db0387e25084c4371995fc8d4`

## P2 feature-develop — PASS
- gate: `gate_develop.py`
- reason: base/head 428e80c18ff1->799192071663, 46 file(s) changed (0 untracked), style_ok=True strict_ok=True hygiene_ok=True changed_files_cov=29/29
- artifacts (path : sha256):
  - `evidence/phase2/diff.patch` : `68851dbfdce5b6fb82e5d4b79998923305dac473ad6be64585702f12823027c0`
  - `evidence/phase2/changed_files.txt` : `dbba6b34741d5ec045342b679eb7f272e0aec87721ec4f86af4d1a75e8387b8a`
  - `evidence/phase2/style_report.txt` : `04706dba5d22b48ca24c71381813904d7a5bcf5cd67193eea1f752e9519976e9`
  - `evidence/phase2/strict_cpp_report.txt` : `c67e9861bb84e86631a7355f3bf5eb9dce2e84f44aa2b72086f99b55674205a4`
  - `evidence/phase2/file_hygiene_report.txt` : `77d229a6540e715f000f1714fb4337985804d7b0f5d7615c053b20a4998799d0`
  - `evidence/phase2/changed_files_coverage.txt` : `cb8d5abd79c53d89e952823de245d30516db4c9a3d155e6a7a63a6b23ad84c49`

## P3 test-develop — PASS
- gate: `gate_test_develop.py`
- reason: test-develop authorship: contract=ok, required=36 authored=36, new_test_files=14
- artifacts (path : sha256):
  - `evidence/phase3/new_test_files.txt` : `b50dec4ad26664ce95f291cb90bf7198426c35b5720b7fbdea68d8e59c59a0a6`
  - `evidence/phase3/test_style_report.txt` : `bda67e9f5e8f3068a8576faece0d07fea8764426eb5c19ceb14d28e792c6715d`
  - `evidence/phase3/test_hygiene_report.txt` : `925ad821ed353eec1fb468036d16d7b0e557af9fcb7ac5a1f38f159788833b3c`
  - `evidence/phase3/authorship_coverage.txt` : `52b4cf59b56cca9c958c0168b352a93f6c79a9ca813c63644dd1c0acacefc781`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__BUILD.gn` : `38681a9417b2f2ee90b8ed8d2fd0182391a6b6905e1ac06e51531dd1dc0bdb72`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_config_test.cpp` : `836dcff49494b2fe22f96c0272d962764a1843eef2c93c1d6229358cfc03dd50`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_cpu_collector_test.cpp` : `7d81d45ca62a145bcc3100108bfdf28c2e622425376829467d7db0f7ad58b943`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_event_listener_test.cpp` : `c1d27b19e06014a443f4460ff4f908d1f79b998bb96af4c16b1d99a2d52b2050`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_io_collector_test.cpp` : `0e2700b50e361a0c3710d8293034e34afe61d6e0166d033604a99ccd8d45ea5d`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_landing_test.cpp` : `a418def816124c77c61c9851b1db273ab9352fe9113a733f017a1cdab5c85b47`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_mem_collector_test.cpp` : `b5d7a46f6e9a77e9902740a7b1e3cf37994b846793909720668931a922fb15fe`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_net_collector_test.cpp` : `166902d2f5034509d8b1b27661e8f7552dc903c28c5e48186f30d36b535e5ac3`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_pwr_collector_test.cpp` : `dd8ba8d58fb4e8085337c84b0f1769672d26bd4168ec02c49ae4f6d323abbd03`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_ring_buffer_test.cpp` : `d2b68c04b8ef161a8cd80c4ed5291066b6b2c9485eb540fd4b5a72e523bce184`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_test_util.h` : `7cb27e81470bffd645aa31ae1071791cf6c047f5cde527435b209248a93beb3e`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_thr_collector_test.cpp` : `b354f7b9b33819171ff19154c58620a63dabe3a1ae6e0fa5a70a042077fa3291`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resmon_threshold_test.cpp` : `f108d7d3d03baf32e2991981b754912a31669c93bd57485d2c7d685bc8e48125`
  - `evidence/phase3/authored/plugins__reliability__resource_monitor__test__unittest__common__resource_monitor_plugin_test.cpp` : `9e7d7a4645be520e86a5b4431a67a18be26b36b0b4539dc855320ecec8e18ee0`

## P4 build-verify — PASS
- gate: `gate_build.py`
- reason: exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- artifacts (path : sha256):
  - `evidence/phase4/build_stdout.log` : `6a91d4a94a5b8abdcf7cbf27cab616c77e79bdaf75211400c1912b07099d305f`
  - `evidence/phase4/build_banner.txt` : `0cb6211e794b4b56781a90e7b4da37b81188b5e7d14eb54b34a7025298d80f8f`
  - `evidence/phase4/artifact_check.txt` : `7ff2842e1a10ca8feb227a25c3d44eb3f3ec3f577fef94f6f342e75e6168ccd3`
  - `evidence/phase4/metric_findings.json` : `a349871f191ee1d365328e38b99d46c9940cf56af6c39a0d23da73523ba1f8b6`
  - `evidence/phase4/clang_tidy_note.txt` : `9a04ffb3711aebf11cc38f91c4ccfe92e4579bceb5c78378263dfb94d30807b5`
  - `evidence/phase4/clang_tidy_findings.json` : `2e21e60c3afafacd7c1358f14d67a562b7a40b471124e567d4996ea3db85b274`

## P5 test-author — PASS
- gate: `gate_test_ut.py`
- reason: tests=38 failures=0 errors=0 fresh=2026-08-20-10-18-52 gtest_cov=36/36
- artifacts (path : sha256):
  - `evidence/phase5/test_build_stdout.log` : `52fea4bc76cc4dc0ba609946e3b0f538be0129c4c993032e044d981e5824d759`
  - `evidence/phase5/start_sh_stdout.txt` : `735cdfcb7420d8583ccc47fec419a42a6dccea5cb6626975bad11c8936b5a54d`
  - `evidence/phase5/report_dir.txt` : `a7b2ee242c613971e9506d80f7b2b56342eb01460ce87f7ba6f5f47ee88f06d3`
  - `evidence/phase5/summary_report.xml` : `36a7e40e0b379c30634aa1dfbba7c5fc72cabf87a9641988ab2d144666a3607e`
  - `evidence/phase5/result_hiview__resource_monitor__ResourceMonitorTest.xml` : `c4d871f894e62e60bfa256e94c0c235a25cffc1d4f36b386bad561377e90218e`
  - `evidence/phase5/gtest_coverage.txt` : `fe6c1d8d8a5db469f8fae4b6d2602f8979fab8158a94a053d528d79f38bed1c0`

## P6 device-functional — FAIL
- gate: `gate_device_func.py`
- reason: device not reachable
- artifacts (path : sha256):
  - `evidence/phase6/device_cmds.txt` : `2d28b61f2186757777498729e3acfcb7dd66b12f58044e67733f840caa036dac`

## P6 device-functional — FAIL
- gate: `gate_device_func.py`
- reason: nonce=True trigger_window=True marker=True runtime=True e2e=True device_cases=5/6 artifact_hash=True provenance=False artifact_loaded=False side_effect=False negative_control=False uptime 1826904.43->1826994.28 mono=True MISSING_device_markers=AR_RESMON_THRESH_CPU_OK BAD_device_cases=d2,d5
- artifacts (path : sha256):
  - `evidence/phase6/hilog_capture.txt` : `61ab75c2f3cdec7de969836966a21188cd1939021b913342fe0e110c51677742`
  - `evidence/phase6/hilog_baseline_window.txt` : `551409b225acdd269cc740695688e6af8e822cf101361de52a901b41b189aaa7`
  - `evidence/phase6/hilog_trigger_window.txt` : `886ff0fa141bc1bf1082f5401b90fbc46ad6712240a0675fa1956596038ef211`
  - `evidence/phase6/device_cmds.txt` : `625c78cf68e3afa0cd3c8105d607fade96c5d14765b20f8cbc530edf67a580f9`
  - `evidence/phase6/run_meta.txt` : `a3637207dcc26976727f9b2aa622079bbd7e8cfff25f83de7935ec77fa4c2ca3`
  - `evidence/phase6/artifact_runtime_proof.txt` : `96996ee1a715b667afda0a1f881435e5ea1f2bb7e2ebd8074f34bcaaa31cbddf`
  - `evidence/phase6/device_marker_coverage.txt` : `48d9486f5d487a87dd8f150efe93d61f05cf11c133e142e0321dda7063b7023b`
  - `evidence/phase6/device_case_results.json` : `660f3daf7c014df30880b0f0e9553d5d5d39b78181f39425efc8e71c1b176b69`

## P6 device-functional — PASS
- gate: `gate_device_func.py`
- reason: nonce=True trigger_window=True marker=True runtime=True e2e=True device_cases=6/6 artifact_hash=True provenance=True artifact_loaded=True side_effect=True negative_control=True uptime 1827074.08->1827155.26 mono=True
- artifacts (path : sha256):
  - `evidence/phase6/hilog_capture.txt` : `327cfbcfb4df75db160ae7e23274a7cee148201827bb4919183f8de7a274d0b6`
  - `evidence/phase6/hilog_baseline_window.txt` : `e2d73a4fb4bccca6df6abfbdfe6404afffb631e42e013bbdd993598722b8e10f`
  - `evidence/phase6/hilog_trigger_window.txt` : `317f5ca98821d1b0af66c0d7d6cf6775c08b0b0a4f74830772958f29500263b5`
  - `evidence/phase6/device_cmds.txt` : `f6b0d40c76db10df51b147d5bdba7fc923cd8b90ca1fbd576502b2eeb0ca07eb`
  - `evidence/phase6/run_meta.txt` : `b494f894f2256809278c38948fef665777b7e5b1055a4fcecb2c4d9d7276722d`
  - `evidence/phase6/artifact_runtime_proof.txt` : `96996ee1a715b667afda0a1f881435e5ea1f2bb7e2ebd8074f34bcaaa31cbddf`
  - `evidence/phase6/device_marker_coverage.txt` : `1fc54e59d8f9e9aaec028c510b285963d9fbff0e6de2723fc46590af3caa7aee`
  - `evidence/phase6/device_case_results.json` : `7a74daa9fdb24b6e3c76cc6a1b3d0d944d8c5b03365255869b640da118b0f576`

## P7 quality-verify — FAIL
- gate: `gate_integration.py`
- reason: type=UT tests=38 failures=2 errors=0 fresh=2026-08-20-19-44-25 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided
- artifacts (path : sha256):
  - `evidence/phase7/start_sh_stdout.txt` : `1ce1a7def23d4efe7bbc2dec6ed218ecb63bdcc2cd186f071428fe55d0748bd2`
  - `evidence/phase7/summary_report.xml` : `bf634de35763cbc6c1f79fdd6390c9fc6a42127eee6a23a1642c386c9fa40a44`
  - `evidence/phase7/report_dir.txt` : `1e28a460ea389180fb55be389a3e1a7a1c9b7d6290a6dd63513231e019f138e2`
  - `evidence/phase7/coverage_report.md` : `aee924330d06648320da39b3daf05c1a5cea9494b91239b5bdf0c0f5a61a996f`
  - `evidence/phase7/performance_report.md` : `bdccd6795f652ca7cb67b51fb3c34a52270dcda335512f9d70997a1678a8745b`
  - `evidence/phase7/power_report.md` : `bfea5156c295f8a468d9779e4464dc74487a143c391168ed7fbc5e32b33becf8`
  - `evidence/phase7/stability_report.md` : `5c23eeff0ee175bb686b3f02a951cc2a357b9f75add57075ef694c23de2dbe52`
  - `evidence/phase7/metric_findings.json` : `d0d497a8c7e18ca9582918668288904b59ec11b389b459c7f3df16e8d71b887e`
  - `evidence/phase7/code_review_report.txt` : `f5709531ae0c0d3e4a8ecdd87ac190de7c1a2854f36f5da9f1e465d38440c43d`

## P7 quality-verify — PASS
- gate: `gate_integration.py`
- reason: type=UT tests=38 failures=0 errors=0 fresh=2026-08-20-19-44-51 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided
- artifacts (path : sha256):
  - `evidence/phase7/start_sh_stdout.txt` : `9f16b774fee3a027a9493760e50680c6777e77f26dbcc3efea13ca9e558217e8`
  - `evidence/phase7/summary_report.xml` : `c0a4382543cc0e5141b56056356deaf97d36ae3011461285b133c857400fd726`
  - `evidence/phase7/report_dir.txt` : `9622ed3cdf18b7da7018f66ead9aa928093a00b41de2fed82ae8b115eb5a155f`
  - `evidence/phase7/coverage_report.md` : `aee924330d06648320da39b3daf05c1a5cea9494b91239b5bdf0c0f5a61a996f`
  - `evidence/phase7/performance_report.md` : `bdccd6795f652ca7cb67b51fb3c34a52270dcda335512f9d70997a1678a8745b`
  - `evidence/phase7/power_report.md` : `bfea5156c295f8a468d9779e4464dc74487a143c391168ed7fbc5e32b33becf8`
  - `evidence/phase7/stability_report.md` : `5c23eeff0ee175bb686b3f02a951cc2a357b9f75add57075ef694c23de2dbe52`
  - `evidence/phase7/metric_findings.json` : `d0d497a8c7e18ca9582918668288904b59ec11b389b459c7f3df16e8d71b887e`
  - `evidence/phase7/code_review_report.txt` : `f5709531ae0c0d3e4a8ecdd87ac190de7c1a2854f36f5da9f1e465d38440c43d`

## P8 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: oh-gc pr create failed: ›   Error: API error 409: 
 ›   {"error_code":409,"error_code_name":"UN_KNOW","error_message":"Another 
 ›   open merge request already exists for this source branch: 
 ›   !4485","trace_id":"<REDACTED-SERIAL>"}

## P8 upload-review — FAIL
- gate: `gate_upload_ci.py`
- reason: oh-gc pr create failed: ›   Error: API error 409: 
 ›   {"error_code":409,"error_code_name":"UN_KNOW","error_message":"Another 
 ›   open merge request already exists for this source branch: 
 ›   !4485","trace_id":"<REDACTED-SERIAL>"}

## P8 upload-review — PASS
- gate: `gate_upload_ci.py`
- reason: pr=4485 overall=success ci_ok=True pushed=5151de16333e pr_head=5151de16333e sha_ok=True fresh=True local_review=skipped (--pr re-verify) pr_review=review_issue_count=0
- artifacts (path : sha256):
  - `evidence/phase6/full_diff.patch` : `5be9115fb30509166b3fee405f9927c23b4311999ba3ee14f2d0dc299fdbddf2`
  - `evidence/phase6/full_diff.stat.txt` : `a487cad352b6b1d2cab2fab085f84e42b08979bcff41cd910a95ea3f94859c35`
  - `evidence/phase6/pr.json` : `566b690d7b61991795b1bf8b66f74ac22287953d8c6400a18b5f139eda9ba2a7`
  - `evidence/phase6/pr_create.txt` : `ec8774c385269ea3ee65854b7d085c3e69dfcb2656021114964291685472dd80`
  - `evidence/phase6/pr_review_report.txt` : `8065b86dc148695295c15fb8b35adb1a6e1e8c57751fcabd3d628be82fd4ebe3`
  - `evidence/phase6/ci_status.json` : `350a398657b0842b87fb57d1886ebaff2da047d0ea4b84edf054ac59a796da01`
