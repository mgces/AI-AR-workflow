## 背景介绍
# AR: CheckCoredumpUID 改用 fault_coredump.json 白名单

## 原始需求
在 base/hiviewdfx/faultloggerd 下，`CheckCoredumpUID` 的 `coredumpUids`
不适用固定的方式，改成从 `fault_coredump.json` 文件里增加 whitelist 白名单的方式。

## 现状(初探)
- `services/coredump/coredump_manager_service.cpp:81` 的
  `CoredumpRequestValidator::CheckCoredumpUID(uint32_t callerUid)` 内
  硬编码 `std::vector<int> coredumpUids = {0, 1202, 7005};`，用 `std::find` 匹配。
- 该函数在 `coredump_manager_service.cpp:134` 被调用(`return CheckCoredumpUID(creds.uid);`)。
- 已存在配置文件 `services/config/fault_coredump.json`(待确认其现有结构与上板安装方式)。

## 目标
去掉硬编码 UID 列表，改为从 `fault_coredump.json` 读取 whitelist 白名单 UID，
未命中白名单则不允许 coredump。白名单需可在不改代码的情况下通过配置文件扩展。

## 设计思路
把 `CheckCoredumpUID` 里**硬编码**的 `std::vector<int> coredumpUids = {0, 1202, 7005};`
改为从 `/system/etc/fault_coredump.json` 读取 **whitelist 白名单** UID 列表。

功能要求:

1. **配置驱动**:`fault_coredump.json` 顶层新增字段 `"coredumpUidWhitelist": [0, 1202, 7005]`
   (整数数组;与既有 `coredumpProfiles` 平级,互不影响——processdump 只读 `coredumpProfiles`,
   cJSON 忽略未知键)。
2. **白名单语义**:`callerUid` 命中白名单 → 允许 core dump(返回 true,行为同现状);
   未命中 → 拒绝(返回 false)。与现状语义一致,只是数据来源由硬编码改为配置。
3. **可扩展**:无需改代码,运维/产品仅改 `fault_coredump.json` 的 `coredumpUidWhitelist`
   即可增删允许 coredump 的 UID。
4. **fail-safe(故障安全)**:配置文件缺失 / 字段缺失 / JSON 损坏 → 回退到内置默认
   `{0, 1202, 7005}`(与现状完全一致),**绝不**因配置问题把所有 coredump 静默关掉。
   读取/解析失败时打印一条 `DFXLOGE` 告警(含原因),便于排查。
5. **性能**:白名单在进程内**懒加载一次并缓存**(单例 + 静态初始化,范本同 `CoredumpConfigManager`
   与 `DfxParam`),不在每次 coredump 请求时重复读盘/解析。
6. **可测**:白名单读取器支持**注入路径**(单例暴露 `Load(const std::string& path)` /
   测试专用 setter),P3 单测可指向临时 fixture JSON,验证自定义白名单与 fail-safe 回退。
7. **日志**:保留现状 `DFXLOGI("UID ... is in/not in uidList.")` 命中/未命中日志;
   新增一条可被真机 hilog grep 的判定日志,供 P4 端到端验证(见真机用例 marker)。
8. **不改对外契约**:`CheckCoredumpUID` 签名(`static bool CheckCoredumpUID(uint32_t)`)
   与返回语义不变;调用方 `IsAuthorizedUid` 不动。

非目标(明确不做):

- 不改 `processdump`(`tools/process_dump/`)的 `CoredumpConfigManager`。
- 不引入 `nlohmann`(本组件全树只用 cJSON),保持一致。
- 不改 coredump 的 *内容/格式*(`coredumpProfiles`),只改 *谁允许* 触发。

## 修改概要
```
base=f5005e1e2cc6c2a5af9958eb6fe000c45ebf5584

services/BUILD.gn                                  |   1 +
 services/config/fault_coredump.json                |   1 +
 services/coredump/coredump_manager_service.cpp     |  20 +--
 services/coredump/coredump_uid_whitelist.cpp       | 108 +++++++++++++
 services/coredump/coredump_uid_whitelist.h         |  50 ++++++
 test/unittest/faultloggerd/BUILD.gn                |  77 ++++++++-
 .../faultloggerd/coredump_uid_whitelist_test.cpp   |  92 +++++++++++
 .../faultloggerd/coredump_whitelist_marker.cpp     | 173 +++++++++++++++++++++
 test/utils/BUILD.gn                                |   1 +
 9 files changed, 510 insertions(+), 13 deletions(-)
```

## 用例概要
- **单测目标**:`test/unittest/faultloggerd/` 下的 `ohos_unittest("test_service")`(已编译
  `faultloggerd_coredump_test.cpp`,且用 `cflags_cc = ["-Dprivate=public"]` 暴露私有静态方法)。
- **新增源**:`test/unittest/faultloggerd/coredump_uid_whitelist_test.cpp`,挂进 `test_service`
  (复用其 `-Dprivate=public`、`include_dirs` 含 `services/coredump`、已带 `cJSON`/`jsoncpp` 依赖)。
- **套件**:`CoredumpUidWhitelistTest`(HWTEST / `HWTEST_F`),用临时文件作 fixture
  (`tmpfile` 写 JSON,`LoadForTest(path)` 注入)。
- **既有用例不破坏**:`FaultloggerdCoredumpTest.CoredumpRequestValidator001`(`:390`)
  断言 `CheckCoredumpUID(0/1202/7005)=true`、`(9999)=false`;改造后默认白名单仍含
  `{0,1202,7005}`(host 上 `/system/etc/...` 不存在 → fail-safe 回退默认),故该用例继续通过。
- **资源/参数化**:fixture JSON 用测试进程临时目录生成,不依赖设备真实路径;
  `module_out_path` 沿用 `faultloggerd/faultloggerd/services`。
- **覆盖维度**:① 默认/缺文件回退;② 自定义白名单命中与拒绝;③ 字段缺失/JSON 损坏 fail-safe;
  ④ 负数/非数元素被忽略;⑤ 缓存(同实例二次 `IsAllowed` 不重读盘)。

## 用例结果总结
- P3 单元测试: PASS — tests=0 failures=0 errors=0 fresh=2026-07-24-15-05-36 gtest_cov=0/3 MISSING: CoredumpUidWhitelistTest.AllowsDefaultUids_001, CoredumpUidWhitelistTest.RespectsCustomWhitelist_001, CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001 [device-xml-fallback OK: tests=3 failures=0 errors=0 gtest_cov=3/3]
- P4 真机功能: PASS — nonce=True marker=True runtime=True e2e=True device_cases=2/2 artifact_hash=True uptime 100387.53->100393.04 mono=True
- P5 质量验证: PASS — type=UT tests=3 failures=0 errors=0 fresh=2026-07-24-15-08-48 | quality:coverage=evidence/phase5/coverage_report.md; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 5 file(s) | external_review evidence/phase5/external_code_review_report.txt review_issue_count=0 [device-xml-fallback OK: tests=3]
