# AR_design: CheckCoredumpUID 改用 fault_coredump.json 白名单

- 组件: `base/hiviewdfx/faultloggerd`
- GN build_target: `faultloggerd` (part `faultloggerd`, subsystem `hiviewdfx`)
- base_commit: `f5005e1e2cc6c2a5af9958eb6fe000c45ebf5584` (component HEAD)

## 目标组件

`base/hiviewdfx/faultloggerd`(OpenHarmony hiviewdfx 子系统下的故障日志/coredump 守护进程)。

本 AR 只动 **`faultloggerd` 守护进程**(`services/`),不动 `processdump`(`tools/process_dump/`)。
关键事实(初探已确认):

- 授权检查在 `services/coredump/coredump_manager_service.cpp` 的
  `CoredumpRequestValidator::CheckCoredumpUID(uint32_t callerUid)`(声明于
  `coredump_manager_service.h:44`,`private static`)。
- 调用链:`CoredumpManagerService::OnRequest` → `ValidateRequest` →
  `IsAuthorizedUid`(`coredump_manager_service.cpp:134`)→ `CheckCoredumpUID`(`:81`)。
- 现有配置文件 `services/config/fault_coredump.json` 已存在,且已通过
  `services/BUILD.gn:151-155` 的 `ohos_prebuilt_etc("fault_coredump.json")`
  安装到设备 `/system/etc/fault_coredump.json`,作为 `faultloggerd` exe 的 dep(`:195`)。
- `services` 目标已具备 JSON 读取全部依赖:external_dep `"cJSON:cjson"`(`BUILD.gn:211`)、
  dep `:libdfx_util`(`:198`,提供 `LoadStringFromFile`)、include 目录 `./coredump`;
  `coredump_manager_service.cpp:17-18` 已 `#include <cJSON.h>` 与 `<fstream>`(已暂存未用)。
- 同组件 `tools/process_dump/coredump/coredump_config_manager.{h,cpp}` 已有一套成熟的
  cJSON 配置读取范式(`CoredumpConfigManager` 单例 + `LoadStringFromFile` + cJSON +
  `GetIntSafe/GetBoolSafe/GetStrSafe` 安全访问器 + `CJSONDeleter` RAII),作为本设计对齐的范本。

## 详细功能需求

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

## 完整代码框架

### 文件清单

| # | 路径(相对组件根) | 动作 | 说明 |
|---|---|---|---|
| 1 | `services/config/fault_coredump.json` | 改 | 顶层新增 `coredumpUidWhitelist: [0,1202,7005]` |
| 2 | `services/coredump/coredump_uid_whitelist.h` | 新增 | 白名单读取器单例头 |
| 3 | `services/coredump/coredump_uid_whitelist.cpp` | 新增 | cJSON 读取 + 缓存 + fail-safe 实现 |
| 4 | `services/coredump/coredump_manager_service.cpp` | 改 | `CheckCoredumpUID` 改为调白名单读取器 |
| 5 | `services/BUILD.gn` | 改 | `faultloggerd_sources` 增 `coredump/coredump_uid_whitelist.cpp` |
| 6 | `test/unittest/faultloggerd/coredump_uid_whitelist_test.cpp` | 新增(P3) | 白名单读取器单测 |
| 7 | `test/unittest/faultloggerd/BUILD.gn` | 改(P3) | 把新测试源加入 `test_service`(或新 target) |

> #6/#7 属测试文件,在 P3 新增;P1b 只落 #1–#5 的功能改动。

### 每个文件功能

- **`fault_coredump.json`** —— 顶层加 `"coredumpUidWhitelist"` 整数数组(默认填现状三值)。
  保留原有 `coredumpProfiles.FULL` 不变。
- **`coredump_uid_whitelist.h`** —— 声明单例 `CoredumpUidWhitelist`:
  `static CoredumpUidWhitelist& GetInstance();`、`bool IsAllowed(uint32_t uid) const;`、
  `void LoadForTest(const std::string& path);`(注入测试路径,清缓存重载)、
  常量 `DEFAULT_UIDS = {0,1202,7005}`、默认路径常量 `/system/etc/fault_coredump.json`。
- **`coredump_uid_whitelist.cpp`** —— 实现:懒加载读文件(`LoadStringFromFile`+`cJSON_Parse`,
  RAII `CJSONDeleter`)→ 取 `coredumpUidWhitelist` 数组(`cJSON_GetObjectItemCaseSensitive` +
  逐项 `cJSON_IsNumber`/`valueint`,负数/非数跳过)→ 填充 `std::vector<int>` 缓存;
  任一步失败 → 回退 `DEFAULT_UIDS` 并 `DFXLOGE` 告警;`IsAllowed` 用 `std::find`。
- **`coredump_manager_service.cpp`** —— 删掉 `:83` 局部 `coredumpUids` 硬编码与 `:84` 的
  `std::find`,改为 `return CoredumpUidWhitelist::GetInstance().IsAllowed(callerUid);`,
  保留命中/未命中 `DFXLOGI`;新增包含 `#include "coredump_uid_whitelist.h"`。
- **`services/BUILD.gn`** —— `faultloggerd_sources` 列表加 `"coredump/coredump_uid_whitelist.cpp"`。

### 每个文件代码框架（骨架）

`coredump_uid_whitelist.h` 骨架:

```cpp
#ifndef SERVICES_COREDUMP_COREDUMP_UID_WHITELIST_H
#define SERVICES_COREDUMP_COREDUMP_UID_WHITELIST_H
#include <cstdint>
#include <string>
#include <vector>
namespace OHOS {
namespace HiviewDFX {
class CoredumpUidWhitelist {
public:
    static CoredumpUidWhitelist& GetInstance();
    bool IsAllowed(uint32_t uid) const;
    void LoadForTest(const std::string& path);  // 测试注入:清缓存并按 path 重载
private:
    CoredumpUidWhitelist() = default;
    void EnsureLoaded() const;
    mutable std::vector<int> uids_{0, 1202, 7005};   // fail-safe 默认
    mutable bool loaded_{false};
    std::string path_{"/system/etc/fault_coredump.json"};
};
} // namespace HiviewDFX
} // namespace OHOS
#endif
```

`coredump_uid_whitelist.cpp` 骨架:

```cpp
#include "coredump_uid_whitelist.h"
#include <algorithm>
#include <cJSON.h>
#include "dfx_log.h"
#include "file_util.h"   // LoadStringFromFile
namespace OHOS {
namespace HiviewDFX {
namespace {
constexpr const char* const COREDUMP_UID_KEY = "coredumpUidWhitelist";
struct CJSONDeleter { void operator()(cJSON* p) const { if (p) cJSON_Delete(p); } };
}
CoredumpUidWhitelist& CoredumpUidWhitelist::GetInstance() {
    static CoredumpUidWhitelist inst;
    return inst;
}
void CoredumpUidWhitelist::LoadForTest(const std::string& path) {
    path_ = path;
    loaded_ = false;
    uids_ = {0, 1202, 7005};
    EnsureLoaded();
}
void CoredumpUidWhitelist::EnsureLoaded() const {
    if (loaded_) { return; }
    std::string content;
    if (!OHOS::HiviewDFX::LoadStringFromFile(path_, content) || content.empty()) {
        DFXLOGE("coredump uid whitelist: read fail, fallback defaults, path=%{public}s", path_.c_str());
        loaded_ = true;  // uids_ 仍为默认
        return;
    }
    std::unique_ptr<cJSON, CJSONDeleter> root(cJSON_Parse(content.c_str()));
    cJSON* arr = root ? cJSON_GetObjectItemCaseSensitive(root.get(), COREDUMP_UID_KEY) : nullptr;
    if (!arr || !cJSON_IsArray(arr)) {
        DFXLOGE("coredump uid whitelist: field missing/invalid, fallback defaults");
        loaded_ = true;
        return;
    }
    std::vector<int> parsed;
    cJSON* it = nullptr;
    cJSON_ArrayForEach(it, arr) {
        if (cJSON_IsNumber(it) && it->valueint >= 0) { parsed.push_back(it->valueint); }
    }
    if (!parsed.empty()) { uids_ = std::move(parsed); }
    loaded_ = true;
}
bool CoredumpUidWhitelist::IsAllowed(uint32_t uid) const {
    EnsureLoaded();
    return std::find(uids_.begin(), uids_.end(), static_cast<int>(uid)) != uids_.end();
}
} // namespace HiviewDFX
} // namespace OHOS
```

`coredump_manager_service.cpp` `CheckCoredumpUID` 改造骨架(`:81`):

```cpp
bool CoredumpRequestValidator::CheckCoredumpUID(uint32_t callerUid)
{
    if (CoredumpUidWhitelist::GetInstance().IsAllowed(callerUid)) {
        DFXLOGI("UID %{public}d is in uidList.", callerUid);
        return true;
    }
    DFXLOGI("UID %{public}d is not in uidList.", callerUid);
    return false;
}
```

(顶部 `#include` 区加 `#include "coredump_uid_whitelist.h"`。)

`fault_coredump.json` 改动(顶层新增一行键,余不动):

```json
{
    "coredumpUidWhitelist": [0, 1202, 7005],
    "coredumpProfiles": { "FULL": { ... 保持原样 ... } }
}
```

`services/BUILD.gn` 改动:`faultloggerd_sources` 数组中加入:
`"coredump/coredump_uid_whitelist.cpp",`

## 完整测试框架

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

## 需测试的功能点

1. **白名单命中允许**:`IsAllowed(uid)` 对白名单内 UID 返回 true(等价现状)。
2. **白名单外拒绝**:非白名单 UID 返回 false。
3. **配置驱动**:改 `coredumpUidWhitelist` 内容后,允许/拒绝集合随之变化(无需改码)。
4. **fail-safe 回退**:文件缺失 / 字段缺失 / JSON 非法 / 数组空 → 回退默认 `{0,1202,7005}`,
   绝不静默清空。
5. **健壮解析**:负数与非数字元素被忽略而不崩溃;合法项正常纳入。
6. **懒加载缓存**:同一实例多次查询只解析一次(性能与可预期性)。
7. **既有授权链不回归**:`CoredumpRequestValidator001` 在默认配置下行为不变。
8. **真机端到端**:设备上改配置文件后,白名单内 UID 可触发 coredump、白名单外被拒
   (hilog 出现对应 marker)。

## 真机测试用例构造

设备:`/system/etc/fault_coredump.json` 可写(已 root 板,`dev_remount_rw`)。
P4 用 faultloggerd 真机链路端到端验证,**marker 为只在该用例真实成功时出现在 hilog 的串**:

- **DC1(允许)**:`hdc shell` remount rw → 推一份 `coredumpUidWhitelist:[0,1202,7005,<测试UID>]`
  的 `fault_coredump.json` → 重启 faultloggerd / 触发一次该 UID 的 coredump 请求 →
  grep hilog 应出现 `AR_COREDUMP_UID_WHITELIST_OK`(白名单命中并放行)。
- **DC2(拒绝)**:把测试 UID 从白名单移除 → 同样触发 coredump 请求 →
  应被 `CheckCoredumpUID` 拒绝,grep hilog 出现 `AR_COREDUMP_UID_WHITELIST_DENY`
  (且无 core 文件生成)。
- **新鲜度**:P4 用 nonce + `/proc/uptime` + 新建报告目录保证 hilog 是本次真实抓取,非历史。
- marker 由实现侧在 `CheckCoredumpUID` 命中/未命中分支补一条带 token 的 `DFXLOGI`
  (或 P4 测试桩经 param 开关打开),保证 marker 与真实放行/拒绝一一对应。

```ar-contract
{
  "build_artifacts": ["hiviewdfx/faultloggerd/faultloggerd"],
  "test_cases": [
    {"point": "默认/缺配置 fail-safe 回退 {0,1202,7005}", "gtest": "CoredumpUidWhitelistTest.AllowsDefaultUids_001"},
    {"point": "自定义白名单命中放行、未命中拒绝", "gtest": "CoredumpUidWhitelistTest.RespectsCustomWhitelist_001"},
    {"point": "JSON 缺失/损坏字段 fail-safe 回退默认", "gtest": "CoredumpUidWhitelistTest.FailsSafeOnBadConfig_001"}
  ],
  "device_cases": [
    {"desc": "设备改 fault_coredump.json 加白名单 UID 后 coredump 被放行", "marker": "AR_COREDUMP_UID_WHITELIST_OK"},
    {"desc": "白名单外 UID 触发 coredump 被拒绝", "marker": "AR_COREDUMP_UID_WHITELIST_DENY"}
  ]
}
```
