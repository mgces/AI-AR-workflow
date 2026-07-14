
// ============ P3 新增验证用例 (AR section 15.1) ============

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
    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_FALSE(session.recoveryReleased);
    EXPECT_FALSE(session.recoveryReleaseRequested);
}

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
    EXPECT_TRUE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));
    EXPECT_FALSE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));
}

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
    EXPECT_FALSE(appfreezeManager->ReleaseFreezeRecovery(99999, "released_after_log"));
}

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
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");
    EXPECT_FALSE(session.recoveryStartAfterLog);
}

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
    EXPECT_FALSE(session.recoveryReleased);
    EXPECT_TRUE(session.logCaptureRunning);
    EXPECT_FALSE(session.logCaptureFinished);
}

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
    appfreezeManager->BeginFreezeLogCapture(faultData, appInfo, true);
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:success");
    auto session1 = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_TRUE(appfreezeManager->ReleaseFreezeRecovery(appInfo.pid, "released_after_log"));
    FaultData faultData2;
    faultData2.errorObject.name = AppFreezeType::APP_INPUT_BLOCK;
    faultData2.detectTime = 2000;
    faultData2.waitSaveState = true;
    appfreezeManager->BeginFreezeLogCapture(faultData2, appInfo, true);
    auto session2 = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_FALSE(session2.recoveryReleased);
    EXPECT_TRUE(session2.logCaptureRunning);
    EXPECT_NE(session2.freezeSessionId, session1.freezeSessionId);
}

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
    auto result = appfreezeManager->WaitFreezeLogCapture(appInfo.pid, 1);
    EXPECT_EQ(result, AppfreezeManager::LogCaptureWaitResult::TIMEOUT);
    auto session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");
    appfreezeManager->FinishFreezeLogCapture(appInfo.pid, "success", "stack:late");
    session = appfreezeManager->GetAppFreezeSession(appInfo.pid);
    EXPECT_EQ(session.recoveryResult, "released_after_timeout");
    EXPECT_FALSE(session.recoveryStartAfterLog);
}

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
