#!/usr/bin/env python3
"""准备 P3 验证用例代码。
基于 AR section 15 的可测断言,为 ability_runtime 的 AppfreezeManagerTest 新增测试用例。
这些测试覆盖 AR 的核心行为:recovery 延后、session 隔离、状态机。
测试写在 test/unittest/dfr_test/appfreeze_manager_test/appfreeze_manager_test.cpp
"""
# 这只是预览生成的测试代码,等编译通过后再写入
test_cases = '''
// ============ P3 新增验证用例 (AR section 15.1) ============

/**
 * @tc.number: AppfreezeManagerTest_RecoveryNotReleasedBeforeLogCaptureFinished
 * @tc.name: RecoveryNotReleasedBeforeLogCaptureFinished
 * @tc.desc: AR 15.1 - PENDING_ACCEPTED 时不立即 save/recover,等日志采集完成
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_RecoveryNotReleasedBeforeLogCaptureFinished, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 500;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21001;
    appInfo.uid = 20001;
    appInfo.bundleName = "RecoveryNotReleasedBeforeLogCaptureFinished";

    // 开始采集,但不 FinishFreezeLogCapture
    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);

    // 日志未完成时,WaitFreezeLogCapture 应该等待(超时)
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);

    // recovery 不应该已释放
    EXPECT_FALSE(session.recoveryReleased);
    EXPECT_FALSE(session.recoveryReleaseRequested);
}

/**
 * @tc.number: AppfreezeManagerTest_SameSessionIdReleaseOnlyOnce
 * @tc.name: SameSessionIdReleaseOnlyOnce
 * @tc.desc: AR 15.1 - 相同 sessionId 的 release callback 只执行一次
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_SameSessionIdReleaseOnlyOnce, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 600;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21002;
    appInfo.uid = 20001;
    appInfo.bundleName = "SameSessionIdReleaseOnlyOnce";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:success,binder:success");

    // 第一次 release 应该成功
    EXPECT_TRUE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));

    // 第二次 release 同一 session 应该失败(只执行一次)
    EXPECT_FALSE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));
}

/**
 * @tc.number: AppfreezeManagerTest_DifferentSessionIdNoRecovery
 * @tc.name: DifferentSessionIdNoRecovery
 * @tc.desc: AR 15.1 - 不同或迟到的 sessionId 不触发 recovery
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_DifferentSessionIdNoRecovery, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 700;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21003;
    appInfo.uid = 20001;
    appInfo.bundleName = "DifferentSessionIdNoRecovery";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:success");

    // 不同 pid 的 release 应该失败
    EXPECT_FALSE(appfreezeManager->ReleaseFreezeRecovery(99999, "released_after_log"));
}

/**
 * @tc.number: AppfreezeManagerTest_DiagnosticTimeoutReleasesRecovery
 * @tc.name: DiagnosticTimeoutReleasesRecovery
 * @tc.desc: AR 15.1 - 诊断超时后才 ScheduleAppFreezeRecovery
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_DiagnosticTimeoutReleasesRecovery, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 800;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21004;
    appInfo.uid = 20001;
    appInfo.bundleName = "DiagnosticTimeoutReleasesRecovery";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    // 等待超时(1ms)
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);

    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    // 超时后 recoveryResult 应该是 released_after_timeout
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");
    EXPECT_FALSE(session.recoveryStartAfterLog);
}

/**
 * @tc.number: AppfreezeManagerTest_LocalCaptureDoesNotReleaseRecovery
 * @tc.name: LocalCaptureDoesNotReleaseRecovery
 * @tc.desc: AR 15.1 - 本地采集完成不释放 recovery
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_LocalCaptureDoesNotReleaseRecovery, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 900;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21005;
    appInfo.uid = 20001;
    appInfo.bundleName = "LocalCaptureDoesNotReleaseRecovery";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);

    // 仅开始采集,未 FinishFreezeLogCapture,recovery 不应释放
    EXPECT_FALSE(session.recoveryReleased);
    EXPECT_TRUE(session.logCaptureRunning);
    EXPECT_FALSE(session.logCaptureFinished);
}

/**
 * @tc.number: AppfreezeManagerTest_PidReusedDifferentSessionIsolation
 * @tc.name: PidReusedDifferentSessionIsolation
 * @tc.desc: AR 15.1/7.2 - PID 重用时不同 recordId 不共享 session
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_PidReusedDifferentSessionIsolation, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 1000;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21006;
    appInfo.uid = 20001;
    appInfo.bundleName = "PidReusedFirst";

    // 第一次 freeze(第一个 session)
    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:success");
    auto session1 = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_TRUE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));

    // 同 pid 的新 freeze(模拟 PID 重用,新 session)
    FaultData faultData2;
    faultData2.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData2.detectTime = 2000;
    faultData2.waitSaveState = true;
    appfreezeManager->BeginFreezeLogCapture(faultData2, appInfo, true);
    auto session2 = appfreezeManager->GetAppFreezeSession(appInfo.pid);

    // 新 session 不应继承旧 session 的完成状态
    EXPECT_FALSE(session2.recoveryReleased);
    EXPECT_TRUE(session2.logCaptureRunning);
    EXPECT_NE(session2.freezeSessionId, session1.freezeSessionId);
}

/**
 * @tc.number: AppfreezeManagerTest_LateCallbackDoesNotDuplicateRelease
 * @tc.name: LateCallbackDoesNotDuplicateRelease
 * @tc.desc: AR 15.1/14.2 - 迟到的日志完成回调不产生第二个 release
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_LateCallbackDoesNotDuplicateRelease, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 1100;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21007;
    appInfo.uid = 20001;
    appInfo.bundleName = "LateCallbackDoesNotDuplicateRelease";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    // 超时释放
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");

    // 迟到的完成回调不应改变 release 状态
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:late");
    session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");
    EXPECT_FALSE(session.recoveryStartAfterLog);
}

/**
 * @tc.number: AppfreezeManagerTest_BinderDegradeSkipsBinderCapture
 * @tc.name: BinderDegradeSkipsBinderCapture
 * @tc.desc: AR 15.1/11.2 - BINDER_DEGRADED 时 binder capture 被跳过
 */
HWTEST_F(AppfreezeManagerTest, AppfreezeManagerTest_BinderDegradeSkipsBinderCapture, TestSize.Level1)
{
    FaultData faultData;
    faultData.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData.detectTime = 1200;
    faultData.waitSaveState = true;
    AppfreezeManager::AppInfo appInfo;
    appInfo.pid = 21008;
    appInfo.uid = 20001;
    appInfo.bundleName = "BinderDegradeSkipsBinderCapture";

    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    appfreezeManager->MarkBinderCaptureDegraded(appInfo.pid, "multi_process_freeze_storm");
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:success,binder:skipped");

    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.binderCaptureStatus, "skipped");
    EXPECT_TRUE(session.binderDegraded);
    EXPECT_EQ(session.degradeReason, "multi_process_freeze_storm");
}
'''
print(test_cases)
print(f"\n# 共 {test_cases.count('HWTEST_F')} 个测试用例")
