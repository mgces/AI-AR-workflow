# AR: AppFreeze 日志生成与 AppRecovery 延后重启优化

- 来源归档: OHReleatedDocs/docs/openharmony/anr/AppFreeze日志生成与AppRecovery延后重启优化归档_20260709.md
- 执行日期: 2026-07-15
- 流水线状态: P0✅ P1✅ P2✅ P3⚠️(测试用例已写,gate_develop PASS;测试二进制链接被环境 arktscgen 阻塞)

## 核心目标

诊断链路(日志采集)必须先于处置链路(save+recover)完成。
Faultlogger 落盘完成后回调 AppMgr,由 AppMgr 延后应用侧 save+recover。

## 代码来源

应用 OHReleatedDocs 里 6 个现成 patch(组A×4 + 组B×2) + 补 AR 缺口。

| 序 | patch | 仓 | hash链 |
|----|-------|-----|--------|
| A3 | appfreeze_optimization_20260709_ability_runtime | ability_runtime | base |
| B1 | ability_runtime_appfreeze_recovery_barrier_20260714 | ability_runtime | A3增量(pre=ff9d8a545d=A3 post) |
| A1 | appfreeze_optimization_20260709_hicollie | hicollie | 依赖A3的FaultData字段 |
| A2 | appfreeze_optimization_20260709_multimodalinput | multimodalinput | 独立 |
| A4 | appfreeze_optimization_20260709_hiview | hiview | base |
| B2 | hiview_appfreeze_capture_completion_20260714 | hiview | A4增量(pre=a2559d38=A4 post) |

## 3 个新 IPC(应用后验证)

- NotifyAppFreezeLogCaptureFinished (Faultlogger→AppMgr, 8定义点)
- ScheduleAppFreezeRecovery (AppMgr→应用, 8定义点)
- APP_FREEZE_RECOVERY_PENDING_ACCEPTED = 1001 (app_scheduler_const.h)

## 验证用例(8个, AR section 15.1)

1. RecoveryNotReleasedBeforeLogCaptureFinished — 日志未完成时不save/recover
2. SameSessionIdReleaseOnlyOnce — release只执行一次
3. DifferentSessionIdNoRecovery — 不同session不触发
4. DiagnosticTimeoutReleasesRecovery — 超时后才释放
5. LocalCaptureDoesNotReleaseRecovery — 本地采集不释放
6. PidReusedDifferentSessionIsolation — PID重用隔离
7. LateCallbackDoesNotDuplicateRelease — 迟到回调不重复释放
8. BinderDegradeSkipsBinderCapture — binder降级跳过

## 遗留

- P3 测试二进制链接被 arktscgen/node 环境阻塞(非代码问题)
- P4-P6 待执行(P6需配oh-gc)
- 补缺口: 10态状态机/ProcessFreezeKey(含appRunningUniqueId)/诊断超时参数化/事件合并按代际
