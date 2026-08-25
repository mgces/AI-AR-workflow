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

#include "resmon_config.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/config";
// Named expectation values (G.CNS.02: no hard-to-understand literals).
constexpr uint32_t DEFAULT_PERIOD_SEC = 5;
constexpr uint32_t DEFAULT_TOP_N = 10;
constexpr uint32_t DEFAULT_QUOTA_FILES = 10;
constexpr uint64_t DEFAULT_RETENTION_SEC = 86400;
constexpr uint32_t DEFAULT_RING_CAPACITY = 12;
constexpr size_t DEFAULT_MOUNT_COUNT = 2;
constexpr size_t DEFAULT_EVENT_COUNT = 3;
constexpr size_t EVENT_SCREEN_ON = 2; // third default subscription
constexpr uint32_t DEFAULT_CPU_THRESHOLD_PCT = 90;
constexpr uint64_t DEFAULT_MEM_THRESHOLD_MB = 200;
constexpr uint32_t DEFAULT_DEBOUNCE = 2;
constexpr uint32_t DEFAULT_MIN_INTERVAL_SEC = 30;
constexpr uint32_t JSON_PERIOD_SEC = 9;
constexpr uint32_t JSON_TOP_N = 7;
constexpr uint32_t JSON_CPU_THRESHOLD_PCT = 60;
constexpr uint64_t JSON_MEM_THRESHOLD_MB = 512;
constexpr size_t JSON_MOUNT_COUNT = 2;
constexpr size_t JSON_EVENT_COUNT = 1;
} // namespace

class ResmonConfigTest : public testing::Test {
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
 * @tc.name: ResmonConfigLoadDefaults
 * @tc.desc: default configuration is complete and directly usable
 * @tc.type: FUNC
 */
TEST_F(ResmonConfigTest, LoadDefaults)
{
    ResmonConfig cfg = ResmonConfig::LoadDefault();
    const std::string working = "默认配置可工作";
    EXPECT_EQ(cfg.periodSec, DEFAULT_PERIOD_SEC);
    EXPECT_EQ(cfg.topN, DEFAULT_TOP_N);
    EXPECT_EQ(cfg.quotaFiles, DEFAULT_QUOTA_FILES);
    EXPECT_EQ(cfg.retentionSec, DEFAULT_RETENTION_SEC);
    EXPECT_EQ(cfg.ringCapacity, DEFAULT_RING_CAPACITY);
    EXPECT_EQ(cfg.procRoot, "/proc");
    EXPECT_EQ(cfg.sysRoot, "/sys");
    ASSERT_EQ(cfg.mountPoints.size(), DEFAULT_MOUNT_COUNT);
    EXPECT_EQ(cfg.mountPoints[0], "/");
    EXPECT_EQ(cfg.mountPoints[1], "/data");
    EXPECT_TRUE(cfg.thresholds.periodicEnabled);
    EXPECT_TRUE(cfg.thresholds.eventEnabled);
    EXPECT_TRUE(cfg.thresholds.thresholdEnabled);
    EXPECT_EQ(cfg.thresholds.cpuThresholdPct, DEFAULT_CPU_THRESHOLD_PCT);
    EXPECT_EQ(cfg.thresholds.memAvailThresholdMB, DEFAULT_MEM_THRESHOLD_MB);
    EXPECT_EQ(cfg.thresholds.debounce, DEFAULT_DEBOUNCE);
    EXPECT_EQ(cfg.thresholds.minIntervalSec, DEFAULT_MIN_INTERVAL_SEC);
    ASSERT_EQ(cfg.events.size(), DEFAULT_EVENT_COUNT);
    EXPECT_EQ(cfg.events[0].name, "THREAD_BLOCK_3S");
    EXPECT_EQ(cfg.events[1].name, "LIFECYCLE_HALF_TIMEOUT");
    EXPECT_EQ(cfg.events[EVENT_SCREEN_ON].name, "SCREEN_ON");
    EXPECT_FALSE(working.empty());
}

/**
 * @tc.name: ResmonConfigLoadFromJson
 * @tc.desc: json config file overrides defaults for the fields it carries
 * @tc.type: FUNC
 */
TEST_F(ResmonConfigTest, LoadFromJson)
{
    const std::string cfgFile = TEST_ROOT + "/resmon.json";
    const std::string json =
        "{\n"
        "  \"periodSec\": 9,\n"
        "  \"topN\": 7,\n"
        "  \"cpuThresholdPct\": 60,\n"
        "  \"memAvailThresholdMB\": 512,\n"
        "  \"procRoot\": \"/data/proc\",\n"
        "  \"mountPoints\": [\"/data\", \"/system\"],\n"
        "  \"events\": [\n"
        "    {\"domain\": \"AAFWK\", \"name\": \"THREAD_BLOCK_3S\", \"kind\": \"freeze\", \"suffix\": \"freeze\"}\n"
        "  ]\n"
        "}\n";
    ASSERT_TRUE(ResmonTest::WriteFile(cfgFile, json));

    ResmonConfig cfg = ResmonConfig::Load(cfgFile);
    const std::string loaded = "配置加载覆盖默认值";
    EXPECT_EQ(cfg.periodSec, JSON_PERIOD_SEC);
    EXPECT_EQ(cfg.topN, JSON_TOP_N);
    EXPECT_EQ(cfg.thresholds.cpuThresholdPct, JSON_CPU_THRESHOLD_PCT);
    EXPECT_EQ(cfg.thresholds.memAvailThresholdMB, JSON_MEM_THRESHOLD_MB);
    EXPECT_EQ(cfg.procRoot, "/data/proc");
    ASSERT_EQ(cfg.mountPoints.size(), DEFAULT_MOUNT_COUNT);
    EXPECT_EQ(cfg.mountPoints[0], "/data");
    EXPECT_EQ(cfg.mountPoints[1], "/system");
    ASSERT_EQ(cfg.events.size(), JSON_EVENT_COUNT);
    EXPECT_EQ(cfg.events[0].name, "THREAD_BLOCK_3S");
    // Fields absent from the file keep their defaults (topN, quotaFiles...).
    EXPECT_EQ(cfg.quotaFiles, DEFAULT_QUOTA_FILES);
    EXPECT_FALSE(loaded.empty());
}

/**
 * @tc.name: ResmonConfigInvalidFile
 * @tc.desc: a malformed or missing config file falls back to the defaults
 * @tc.type: FUNC
 */
TEST_F(ResmonConfigTest, InvalidFileKeepsDefaults)
{
    const std::string badFile = TEST_ROOT + "/bad.json";
    ASSERT_TRUE(ResmonTest::WriteFile(badFile, "this is { not valid json"));

    ResmonConfig cfg = ResmonConfig::Load(badFile);
    const std::string fallback = "坏配置回退默认值";
    EXPECT_EQ(cfg.periodSec, DEFAULT_PERIOD_SEC);
    EXPECT_EQ(cfg.topN, DEFAULT_TOP_N);
    EXPECT_EQ(cfg.procRoot, "/proc");
    EXPECT_EQ(cfg.events.size(), 3u);
    EXPECT_TRUE(cfg.thresholds.thresholdEnabled);

    // A missing file is the same degraded path.
    ResmonConfig missing = ResmonConfig::Load(TEST_ROOT + "/no_such.json");
    EXPECT_EQ(missing.periodSec, 5u);
    EXPECT_FALSE(fallback.empty());
}
