# AppFreeze 延后重启优化 — Patch 依赖链与流水线编译分析

## 一、背景与目标

基于归档文档 `AppFreeze日志生成与AppRecovery延后重启优化归档_20260709.md`，使用 AI-AR-workflow
证据门控流水线推进 AppFreeze 日志采集与 AppRecovery 延后重启优化。

核心问题：AppFreeze 检测后，AppRecovery 的 `save+recover`（处置链路）在 Hiview 日志采集
（诊断链路）完成前就执行了，导致 Hiview 拿到 partial log / 非原始冻结现场。

选定方案：Faultlogger 落盘完成后直接回调 AppMgr，由 AppMgr 延后应用侧 `save+recover`。

本文分析 patch 依赖链、编译环境障碍与绕过方案、IPC 架构，为后续实施提供参考。

## 二、Patch 依赖链分析

### 2.1 六个 patch 概览

| 组 | patch | 仓 | 行数 | 文件数 | 内容 |
|----|-------|-----|------|--------|------|
| A1 | `appfreeze_optimization_20260709_hicollie` | hicollie | 63 | 1 | freeze 字段数据源（samplerStartTime/hasBusinessStack） |
| A2 | `appfreeze_optimization_20260709_multimodalinput` | multimodalinput | 202 | 6 | input freeze timing 字段 |
| A3 | `appfreeze_optimization_20260709_ability_runtime` | ability_runtime | 2701 | 17 | session 模型 + BINDER_DEGRADED + FaultData 扩展 |
| A4 | `appfreeze_optimization_20260709_hiview` | hiview | 845 | 8 | LogCaptureStatus + FINAL_LOG_CAPTURE_STATUS |
| B1 | `ability_runtime_appfreeze_recovery_barrier_20260714` | ability_runtime | 987 | 29 | 3 个新 IPC + recordId 防重 + recovery barrier |
| B2 | `hiview_appfreeze_capture_completion_20260714` | hiview | 225 | 8 | capture completion 回调 + keyed 串行 + binder 降级 |

### 2.2 hash 链证明 B 是 A 的严格增量

git blob hash 链证明组B 的 pre-image = 组A 的 post-image：

```
appfreeze_manager.h:  A3 post ff9d8a545d = B1 pre ff9d8a545d
appfreeze_inner.cpp:  A3 post 63dbad143f = B1 pre 63dbad143f
event_log_task.h:     A4 post a2559d38   = B2 pre a2559d38
```

应用顺序锁定为：**A3 → B1 → A1 → A2 → A4 → B2**。

### 2.3 编译依赖

- A3 定义 `FaultData` 扩展字段（freezeSessionId/freezeHalfTime/freezeFullTime/samplerStartTime 等）
- A1（hicollie）写 A3 新增的 `faultData.samplerStartTime` → A1 编译依赖 A3 先应用
- A2（multimodalinput）完全独立，走 hisysevent 通道，不碰 FaultData
- B2 引用 A4 新增的 `logCaptureStatuses_`/`LogCaptureStatus` → B2 编译依赖 A4 先应用

## 三、新增 IPC 架构

### 3.1 三个跨仓 IPC 接口

```
应用侧                    AppMgr(服务端)              Hiview/Faultlogger
  |                          |                            |
  | NotifyAppFault(pending)  |                            |
  |------------------------->|                            |
  | <--- PENDING_ACCEPTED --|                            |
  | (不立即 save+recover)    |                            |
  |                          |     HiSysEvent             |
  |                          |--------------------------->|
  |                          |                  EventLogger catcher
  |                          |                  Faultlogger 落盘
  |                          |<--- NotifyAppFreezeLogCaptureFinished ---|
  |                          | (pid, sessionId, finalStatus, result)    |
  | <-- ScheduleAppFreezeRecovery ---|                    |
  | (sessionId, releaseReason)       |                    |
  | save + recover                   |                    |
  | ---> appRecovery marker -------->|                    |
  |                          | kill/restart               |
```

### 3.2 接口定义点（应用后验证）

| 接口 | 定义位置 | 作用 |
|------|----------|------|
| `NotifyAppFreezeLogCaptureFinished` | IAppMgr/AppMgrProxy/AppMgrStub/AppMgrClient（8 个点） | Faultlogger → AppMgr 完成回调 |
| `ScheduleAppFreezeRecovery` | IAppScheduler/AppSchedulerHost/AppSchedulerProxy/MainThread（8 个点） | AppMgr → 应用释放 recovery |
| `APP_FREEZE_RECOVERY_PENDING_ACCEPTED = 1001` | app_scheduler_const.h | NotifyAppFault 返回码，应用收到才延后 |

### 3.3 IPC code 枚举

```cpp
// app_mgr_ipc_interface_code.h
NOTIFY_APP_FREEZE_LOG_CAPTURE_FINISHED = 139,  // 新增

// app_scheduler_interface.h
enum {
    ...
    SCHEDULE_MEM_APPLICATION_TRANSACTION,
    SCHEDULE_APP_FREEZE_RECOVERY,  // 新增
};
```

## 四、编译环境障碍与绕过

### 4.1 障碍清单

| 障碍 | 根因 | 绕过方案 |
|------|------|----------|
| `js_rawheap_translator` 缺失 | prebuilts 预编译不完整 | `--no-prebuilt-sdk` 跳过 SDK build |
| 系统 python3 3.8 vs 需要 3.12 | `check_linux_cpu.py` 等脚本用 3.9+ 语法 | `export PATH="$prebuilts/python/.../3.12.10/bin:$PATH"` |
| `faultloggerd` unused function `-Werror` | 存量代码 5 个未使用函数 | 加 `__attribute__((unused))` |
| `arktscgen` node 工具失败 | ace_engine 的 node 工具链不完整 | **无法绕过**，阻塞测试二进制链接 |
| `appfreeze_manager` 非 GN target | appdfr 代码编译进 `libability_runtime.so`，非独立 target | 用 ninja `.o` 路径直接编译 |

### 4.2 build.sh 的 SDK build 逻辑

```bash
# build.sh line 208-209
if [[ "$*" != *ohos-sdk* ]]; then
  args_list+=("--prebuilt-sdk=true")  # 强制 SDK build
fi
```

`--no-prebuilt-sdk` 参数含 `ohos-sdk` 子串，使条件为假，跳过 `--prebuilt-sdk=true`。
hb 支持 `--no-prebuilt-sdk` flag 直接跳过 ohos-sdk 预编译。

### 4.3 ninja 直接编译

gate_build.py 硬编码 `./build.sh --product-name rk3568 --ccache --build-target <target>`，
不支持 `--no-prebuilt-sdk`。绕过方式：

```bash
# 设置 PATH + 直接 ninja
export PATH="$PY3_DIR/bin:$NINJA_DIR/bin:$PATH"
ninja -w dupbuild=warn -k 0 -C out/rk3568 \
  obj/foundation/ability/ability_runtime/services/appdfr/src/app_manager/appfreeze_manager.o \
  hiview_package
```

`-w dupbuild=warn`：build.ninja 有重复 stamp 规则（contacts_data 等），需降为 warning。
`-k 0`：跳过无关失败（arktscgen 等）继续编译。

## 五、验证用例设计（AR section 15）

### 5.1 P3 新增 8 个验证用例

| 测试名 | AR 断言 | 验证点 |
|--------|---------|--------|
| RecoveryNotReleasedBeforeLogCaptureFinished | §15.1 | 日志未完成时不 save/recover |
| SameSessionIdReleaseOnlyOnce | §15.1 | release 原子只执行一次 |
| DifferentSessionIdNoRecovery | §15.1 | 不同 session 不触发 |
| DiagnosticTimeoutReleasesRecovery | §15.1 | 诊断超时后才释放 |
| LocalCaptureDoesNotReleaseRecovery | §15.1 | 本地采集不释放 |
| PidReusedDifferentSessionIsolation | §15.1/7.2 | PID 重用隔离 |
| LateCallbackDoesNotDuplicateRelease | §15.1/14.2 | 迟到回调不重复释放 |
| BinderDegradeSkipsBinderCapture | §15.1/11.2 | binder 降级跳过 |

### 5.2 组B 未覆盖的 AR 缺口

| 缺口 | AR 章节 | 落点 |
|------|---------|------|
| 10 态状态机 | §7.3 | `appfreeze_manager.h` AppFreezeSession 加 `state` 枚举 |
| ProcessFreezeKey(pid+recordId+appRunningUniqueId) | §7.2 | `app_running_record.h:860 GetAppRunningUniqueId()` |
| 诊断绝对超时参数化 | §9.1 | `appfreeze_manager.cpp` B1 的 `diagnosticTimeoutTask` |
| 事件合并按代际 | §7.4 | `appfreeze_manager.cpp:276-288` `freezeEventMap_` |

## 六、关键文件索引

### 源码（patch 应用后）
- `foundation/ability/ability_runtime/services/appdfr/include/appfreeze_manager.h` — AppFreezeSession 结构 + freezeSessions_ map
- `foundation/ability/ability_runtime/services/appdfr/src/appfreeze_manager.cpp` — session 生命周期 + WaitFreezeLogCapture
- `foundation/ability/ability_runtime/frameworks/native/appkit/dfr/appfreeze_inner.cpp` — NotifyANR + PENDING_ACCEPTED 判断
- `foundation/ability/ability_runtime/services/appmgr/src/app_mgr_service_inner.cpp` — NotifyAppFreezeLogCaptureFinished + ScheduleAppFreezeRecovery
- `foundation/ability/ability_runtime/interfaces/inner_api/app_manager/` — IPC 接口/proxy/stub/host/client
- `base/hiviewdfx/hiview/plugins/eventlogger/event_logger.cpp` — keyed 串行 + binder 降级
- `base/hiviewdfx/hiview/plugins/faultlogger/service/bdfr_base/base/faultlog_event_pipeline.cpp` — 落盘后回调 AppMgr

### Patch 文件
- `OHReleatedDocs/patches/appfreeze_optimization_20260709_{ability_runtime,hiview,hicollie,multimodalinput}.patch`
- `OHReleatedDocs/docs/artifacts/patches/{ability_runtime_appfreeze_recovery_barrier,hiview_appfreeze_capture_completion}_20260714.patch`

### 流水线证据
- `specs/pipeline/20260714-appfreeze-recovery-ar/ability_runtime/` — pipeline.json + evidence/manifest.jsonl
- `specs/pipeline/20260714-appfreeze-recovery-ar/hiview/` — 同上
