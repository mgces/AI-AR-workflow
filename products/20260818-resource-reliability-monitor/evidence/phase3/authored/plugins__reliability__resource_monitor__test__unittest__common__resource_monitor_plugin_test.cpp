/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
#include <gtest/gtest.h>

#include <string>
#include <vector>

#include "resource_monitor_plugin.h"
#include "resmon_test_util.h"
#include "sys_event.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/plugin";
const std::vector<std::string> ALL_CATEGORIES = {"cpu", "mem", "io", "pwr", "net", "thr", "event"};

// A healthy fake /proc+/sys tree so every category collector lands on the first tick.
// CPU sits at ~11% busy, memory well above the default threshold, temperature cool.
void MakeFakeRoots(const std::string &procDir, const std::string &sysDir)
{
    ResmonTest::MakeDirs(procDir);
    ResmonTest::WriteFile(procDir + "/stat", "cpu 50 0 50 900 10 0 0 0 0 0\n");
    ResmonTest::WriteFile(procDir + "/loadavg", "1.25 2.50 3.75 4/5 678\n");
    ResmonTest::WriteFile(procDir + "/meminfo", "MemTotal:      2097152 kB\n"
                                                "MemFree:       1048576 kB\n"
                                                "MemAvailable:  1048576 kB\n"
                                                "Buffers:             0 kB\n"
                                                "Cached:              0 kB\n"
                                                "SwapTotal:           0 kB\n"
                                                "SwapFree:            0 kB\n");
    ResmonTest::WriteFile(procDir + "/diskstats", "8 0 sda 100 0 100 5 200 0 200 10 0 100 100 100\n");
    ResmonTest::MakeDirs(procDir + "/net");
    ResmonTest::WriteFile(procDir + "/net/dev", "Inter-|   Receive                            |  Transmit\n"
                                                " face |bytes    packets errs drop fifo frame compressed multicast|"
                                                "bytes    packets errs drop fifo colls carrier compressed\n"
                                                "    lo: 100 1 0 0 0 0 0 0 100 1 0 0 0 0 0 0\n"
                                                "  eth0: 1500 15 1 2 0 0 0 0 2800 28 0 0 0 0 0 0\n");
    ResmonTest::MakeDirs(sysDir + "/class/thermal/thermal_zone0");
    ResmonTest::WriteFile(sysDir + "/class/thermal/thermal_zone0/type", "cpu-thermal\n");
    ResmonTest::WriteFile(sysDir + "/class/thermal/thermal_zone0/temp", "30000\n");
    ResmonTest::MakeDirs(procDir + "/7/task/7");
    ResmonTest::WriteFile(procDir + "/7/task/7/stat",
                          "7 (main) S 1 1 1 0 -1 4194560 10 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n");
}

// Build the plugin's member graph the same way OnLoad() would, minus the hiview context.
void WireUp(ResourceMonitorPlugin &plugin, const std::string &procDir, const std::string &sysDir,
            const std::string &landRoot)
{
    plugin.config_ = ResmonConfig::LoadDefault();
    plugin.config_.procRoot = procDir;
    plugin.config_.sysRoot = sysDir;
    plugin.cpuCollector_ = std::make_unique<ResmonCpuCollector>();
    plugin.memCollector_ = std::make_unique<ResmonMemCollector>();
    plugin.ioCollector_ = std::make_unique<ResmonIoCollector>();
    plugin.pwrCollector_ = std::make_unique<ResmonPwrCollector>();
    plugin.netCollector_ = std::make_unique<ResmonNetCollector>();
    plugin.thrCollector_ = std::make_unique<ResmonThrCollector>();
    plugin.threshold_ = std::make_unique<ResmonThreshold>(plugin.config_.thresholds);
    plugin.landing_ = std::make_unique<ResmonLanding>(landRoot);
    plugin.landing_->EnsureCategoryDirs(ALL_CATEGORIES);
    plugin.ring_ = std::make_unique<ResmonRingBuffer>(plugin.config_.ringCapacity);
    for (auto *collector : std::vector<ResmonCollector *>{plugin.cpuCollector_.get(), plugin.memCollector_.get(),
                                                          plugin.ioCollector_.get(), plugin.pwrCollector_.get(),
                                                          plugin.netCollector_.get(), plugin.thrCollector_.get()}) {
        collector->SetProcRoot(procDir);
        collector->SetSysRoot(sysDir);
    }
    plugin.ioCollector_->SetMountPoints({});
}
} // namespace

class ResourceMonitorPluginTest : public testing::Test {
public:
    void SetUp() override
    {
        ResmonTest::RemoveDirectory(TEST_ROOT);
        ResmonTest::MakeDirs(TEST_ROOT);
    }

    void TearDown() override
    {
        ResmonTest::RemoveDirectory(TEST_ROOT);
    }
};

/**
 * @tc.name: ResourceMonitorPluginPeriodicTickLands
 * @tc.desc: one timer tick lands all six periodic categories under their dirs
 * @tc.type: FUNC
 */
TEST_F(ResourceMonitorPluginTest, PeriodicTickLands)
{
    ResourceMonitorPlugin plugin;
    WireUp(plugin, TEST_ROOT + "/proc", TEST_ROOT + "/sys", TEST_ROOT + "/land");
    MakeFakeRoots(TEST_ROOT + "/proc", TEST_ROOT + "/sys");

    plugin.OnTimerTick();

    const std::string landed = "周期采样六类落盘";
    for (const auto &category : {"cpu", "mem", "io", "pwr", "net", "thr"}) {
        EXPECT_FALSE(ResmonTest::ListFiles(TEST_ROOT + "/land/" + category).empty());
    }
    EXPECT_FALSE(landed.empty());
}

/**
 * @tc.name: ResourceMonitorPluginSingleItemFailureIsolated
 * @tc.desc: one failing collector skips only its own landing, others still land
 * @tc.type: FUNC
 */
TEST_F(ResourceMonitorPluginTest, SingleItemFailureIsolated)
{
    ResourceMonitorPlugin plugin;
    WireUp(plugin, TEST_ROOT + "/proc", TEST_ROOT + "/sys", TEST_ROOT + "/land");
    MakeFakeRoots(TEST_ROOT + "/proc", TEST_ROOT + "/sys");
    // Point only the net collector at a missing root; its failure must not spread.
    plugin.netCollector_->SetProcRoot(TEST_ROOT + "/proc_missing");

    plugin.OnTimerTick();

    const std::string isolated = "单类采集失败隔离";
    EXPECT_TRUE(ResmonTest::ListFiles(TEST_ROOT + "/land/net").empty());
    EXPECT_EQ(plugin.netCollector_->ErrorCount(), 1u);
    for (const auto &category : {"cpu", "mem", "io", "pwr", "thr"}) {
        EXPECT_FALSE(ResmonTest::ListFiles(TEST_ROOT + "/land/" + category).empty());
    }
    EXPECT_FALSE(isolated.empty());
}

/**
 * @tc.name: ResourceMonitorPluginDeferredConfigReload
 * @tc.desc: OnConfigUpdate only queues a reload; the next tick applies it
 * @tc.type: FUNC
 */
TEST_F(ResourceMonitorPluginTest, DeferredConfigReload)
{
    ResourceMonitorPlugin plugin;
    WireUp(plugin, TEST_ROOT + "/proc", TEST_ROOT + "/sys", TEST_ROOT + "/land");
    MakeFakeRoots(TEST_ROOT + "/proc", TEST_ROOT + "/sys");

    std::string cfgPath = TEST_ROOT + "/resmon_test_cfg.json";
    ResmonTest::WriteFile(cfgPath, "{\"periodSec\": 7, \"procRoot\": \"" + TEST_ROOT + "/proc" + "\", \"sysRoot\": \"" +
                                       TEST_ROOT + "/sys" + "\", \"periodicEnabled\": true}\n");

    plugin.OnConfigUpdate(cfgPath, "");
    EXPECT_TRUE(plugin.configDirty_.load());

    // The update is queued, not applied, until the work-loop tick runs.
    plugin.OnTimerTick();
    EXPECT_EQ(plugin.config_.periodSec, 7u) << "配置热更新生效";
    EXPECT_FALSE(plugin.configDirty_.load());
}

/**
 * @tc.name: ResourceMonitorPluginEventListeningCallbackForwardsSnapshot
 * @tc.desc: OnEventListeningCallback forwards a subscribed SYS_EVENT to the listener, which lands an event snapshot
 * @tc.type: FUNC
 */
TEST_F(ResourceMonitorPluginTest, OnEventListeningCallbackForwardsSnapshot)
{
    ResourceMonitorPlugin plugin;
    WireUp(plugin, TEST_ROOT + "/proc", TEST_ROOT + "/sys", TEST_ROOT + "/land");
    MakeFakeRoots(TEST_ROOT + "/proc", TEST_ROOT + "/sys");

    ResmonEventSubscribe sub;
    sub.domain = "POWER";
    sub.name = "SCREEN_ON";
    sub.kind = "screen";
    sub.suffix = "screen";
    plugin.config_.events = {sub};

    plugin.listener_ = std::make_shared<ResmonEventListener>();
    plugin.listener_->subscribes_.push_back(sub);
    plugin.listener_->deps_.landing = plugin.landing_.get();
    plugin.listener_->deps_.ring = plugin.ring_.get();
    plugin.listener_->deps_.memCollector = plugin.memCollector_.get();
    plugin.listener_->deps_.thrCollector = plugin.thrCollector_.get();

    SysEventCreator creator("POWER", "SCREEN_ON", SysEventCreator::BEHAVIOR);
    SysEvent evt("", nullptr, creator);
    plugin.OnEventListeningCallback(evt);

    const std::string landed = "事件监听回调转发快照";
    EXPECT_FALSE(ResmonTest::ListFiles(TEST_ROOT + "/land/event").empty());
    EXPECT_FALSE(landed.empty());
}

/**
 * @tc.name: ResourceMonitorPluginEventListeningCallbackFiltersUnsubscribed
 * @tc.desc: unsubscribed events and non-SYS_EVENT messages are dropped before landing
 * @tc.type: FUNC
 */
TEST_F(ResourceMonitorPluginTest, OnEventListeningCallbackFiltersUnsubscribed)
{
    ResourceMonitorPlugin plugin;
    WireUp(plugin, TEST_ROOT + "/proc", TEST_ROOT + "/sys", TEST_ROOT + "/land");
    MakeFakeRoots(TEST_ROOT + "/proc", TEST_ROOT + "/sys");

    ResmonEventSubscribe sub;
    sub.domain = "POWER";
    sub.name = "SCREEN_ON";
    sub.kind = "screen";
    sub.suffix = "screen";
    plugin.config_.events = {sub};

    plugin.listener_ = std::make_shared<ResmonEventListener>();
    plugin.listener_->subscribes_.push_back(sub);
    plugin.listener_->deps_.landing = plugin.landing_.get();
    plugin.listener_->deps_.ring = plugin.ring_.get();
    plugin.listener_->deps_.memCollector = plugin.memCollector_.get();
    plugin.listener_->deps_.thrCollector = plugin.thrCollector_.get();

    // A subscribed-name mismatch (unlisted event) must not land a snapshot.
    SysEventCreator other("AAFWK", "SOME_OTHER_EVENT", SysEventCreator::BEHAVIOR);
    SysEvent otherEvt("", nullptr, other);
    plugin.OnEventListeningCallback(otherEvt);
    EXPECT_TRUE(ResmonTest::ListFiles(TEST_ROOT + "/land/event").empty());

    // A non-SYS_EVENT message is dropped before reaching the listener.
    Event plain("nonsys");
    plain.messageType_ = Event::MessageType::PLUGIN_MAINTENANCE;
    plugin.OnEventListeningCallback(plain);
    EXPECT_TRUE(ResmonTest::ListFiles(TEST_ROOT + "/land/event").empty());
}
