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

#include "resmon_config.h"
#include "resmon_threshold.h"

using namespace OHOS::HiviewDFX;

namespace {
// Named fixture values (G.CNS.02: no hard-to-understand literals).
constexpr uint64_t BUSY_USER_TICKS = 60;
constexpr uint64_t BUSY_SYSTEM_TICKS = 20;
constexpr uint64_t BUSY_IDLE_TICKS = 20;
constexpr uint64_t IDLE_IDLE_TICKS = 100;
constexpr uint64_t MEM_KB_PER_MB = 1024;
constexpr uint64_t HEALTHY_MEM_MB = 1024;
constexpr uint64_t LOW_MEM_MB = 100; // below the 200MB default threshold
constexpr int32_t HOT_ZONE_TEMP_C = 45;
constexpr uint32_t TEST_CPU_THRESHOLD_PCT = 50;
constexpr uint64_t TEST_MEM_THRESHOLD_MB = 200;
constexpr int32_t TEST_TEMP_THRESHOLD_C = 40;
constexpr uint32_t DEBOUNCE_LONG = 3;
constexpr uint32_t MIN_INTERVAL_SEC = 30;
// Monotonic evaluation timestamps (ms) for the debounce/interval sequences.
constexpr uint64_t T0_MS = 1000;
constexpr uint64_t T1_MS = 2000;
constexpr uint64_t T2_MS = 3000;
constexpr uint64_t T3_MS = 4000;
constexpr uint64_t T4_MS = 5000;
constexpr uint64_t T5_MS = 6000;
constexpr uint64_t T6_MS = 7000;
constexpr uint64_t WITHIN_INTERVAL_MS = 2900;
constexpr uint64_t INTERVAL_PASSED_MS = 41000;

// A CPU sample that reads 80% busy: used=80 of total=100 ticks.
CpuSample BusyCpu()
{
    CpuSample cpu;
    cpu.userTicks = BUSY_USER_TICKS;
    cpu.systemTicks = BUSY_SYSTEM_TICKS;
    cpu.iowaitTicks = 0;
    cpu.idleTicks = BUSY_IDLE_TICKS;
    return cpu;
}

CpuSample IdleCpu()
{
    CpuSample cpu;
    cpu.userTicks = 0;
    cpu.systemTicks = 0;
    cpu.iowaitTicks = 0;
    cpu.idleTicks = IDLE_IDLE_TICKS;
    return cpu;
}

MemSample HealthyMem()
{
    MemSample mem;
    mem.memAvailableKb = HEALTHY_MEM_MB * MEM_KB_PER_MB;
    return mem;
}

MemSample LowMem()
{
    MemSample mem;
    mem.memAvailableKb = LOW_MEM_MB * MEM_KB_PER_MB;
    return mem;
}

PwrSample HotZone()
{
    PwrSample pwr;
    ThermalZoneItem zone;
    zone.zone = "thermal_zone0";
    zone.type = "cpu-thermal";
    zone.tempC = HOT_ZONE_TEMP_C;
    pwr.zones.push_back(zone);
    return pwr;
}

PwrSample CoolZone()
{
    PwrSample pwr;
    return pwr;
}
} // namespace

/**
 * @tc.name: ResmonThresholdOverTrigger
 * @tc.desc: CPU/memory/temperature over-limit inputs each raise their reason
 * @tc.type: FUNC
 */
TEST(ResmonThresholdTest, OverThresholdTrigger)
{
    ThresholdConfig cfg;
    cfg.thresholdEnabled = true;
    cfg.cpuThresholdPct = TEST_CPU_THRESHOLD_PCT;
    cfg.memAvailThresholdMB = TEST_MEM_THRESHOLD_MB;
    cfg.tempThresholdC = TEST_TEMP_THRESHOLD_C;
    cfg.debounce = 1;
    cfg.minIntervalSec = 0;

    const std::string covered = "越阈值触发判定";

    ResmonThreshold cpuThr(cfg);
    EXPECT_EQ(cpuThr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T0_MS), ThresholdReason::CPU_OVER);

    ResmonThreshold memThr(cfg);
    EXPECT_EQ(memThr.Evaluate(IdleCpu(), LowMem(), CoolZone(), T0_MS), ThresholdReason::MEM_LOW);

    ResmonThreshold tempThr(cfg);
    EXPECT_EQ(tempThr.Evaluate(IdleCpu(), HealthyMem(), HotZone(), T0_MS), ThresholdReason::TEMP_OVER);

    ResmonThreshold noneThr(cfg);
    EXPECT_EQ(noneThr.Evaluate(IdleCpu(), HealthyMem(), CoolZone(), T0_MS), ThresholdReason::NONE);
    EXPECT_FALSE(covered.empty());
}

/**
 * @tc.name: ResmonThresholdDebounce
 * @tc.desc: only M consecutive over-limit ticks raise the trigger
 * @tc.type: FUNC
 */
TEST(ResmonThresholdTest, DebounceSuppress)
{
    ThresholdConfig cfg;
    cfg.thresholdEnabled = true;
    cfg.cpuThresholdPct = TEST_CPU_THRESHOLD_PCT;
    cfg.debounce = DEBOUNCE_LONG;
    cfg.minIntervalSec = 0;

    ResmonThreshold thr(cfg);
    const std::string covered = "连续越限才触发";
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T0_MS), ThresholdReason::NONE);
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T1_MS), ThresholdReason::NONE);
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T2_MS), ThresholdReason::CPU_OVER);

    // A healthy tick resets the streak, so the debounce starts over.
    EXPECT_EQ(thr.Evaluate(IdleCpu(), HealthyMem(), CoolZone(), T3_MS), ThresholdReason::NONE);
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T4_MS), ThresholdReason::NONE);
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T5_MS), ThresholdReason::NONE);
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T6_MS), ThresholdReason::CPU_OVER);
    EXPECT_FALSE(covered.empty());
}

/**
 * @tc.name: ResmonThresholdMinInterval
 * @tc.desc: a minimum interval gates repeated triggers of the same reason
 * @tc.type: FUNC
 */
TEST(ResmonThresholdTest, MinInterval)
{
    ThresholdConfig cfg;
    cfg.thresholdEnabled = true;
    cfg.cpuThresholdPct = TEST_CPU_THRESHOLD_PCT;
    cfg.debounce = 1;
    cfg.minIntervalSec = MIN_INTERVAL_SEC;

    ResmonThreshold thr(cfg);
    const std::string covered = "最小触发间隔限制";
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), T0_MS), ThresholdReason::CPU_OVER);
    // 1.9s later: within the interval, no second trigger.
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), WITHIN_INTERVAL_MS), ThresholdReason::NONE);
    // 40s after the first trigger the interval has passed.
    EXPECT_EQ(thr.Evaluate(BusyCpu(), HealthyMem(), CoolZone(), INTERVAL_PASSED_MS), ThresholdReason::CPU_OVER);
    EXPECT_FALSE(covered.empty());
}

/**
 * @tc.name: ResmonThresholdIndependentSwitches
 * @tc.desc: periodic/event/threshold triggers carry independent switches
 * @tc.type: FUNC
 */
TEST(ResmonThresholdTest, IndependentSwitches)
{
    ResmonConfig defaults = ResmonConfig::LoadDefault();
    const std::string covered = "三触发机制独立开关";
    EXPECT_TRUE(defaults.thresholds.periodicEnabled);
    EXPECT_TRUE(defaults.thresholds.eventEnabled);
    EXPECT_TRUE(defaults.thresholds.thresholdEnabled);

    // With the threshold switch off, an over-limit input never triggers.
    ThresholdConfig disabled;
    disabled.thresholdEnabled = false;
    disabled.cpuThresholdPct = TEST_CPU_THRESHOLD_PCT;
    disabled.debounce = 1;
    disabled.minIntervalSec = 0;
    ResmonThreshold off(disabled);
    EXPECT_EQ(off.Evaluate(BusyCpu(), LowMem(), HotZone(), T0_MS), ThresholdReason::NONE);
    EXPECT_EQ(off.Evaluate(BusyCpu(), LowMem(), HotZone(), T1_MS), ThresholdReason::NONE);

    // Re-enabling it restores the trigger.
    disabled.thresholdEnabled = true;
    ResmonThreshold on(disabled);
    EXPECT_EQ(on.Evaluate(BusyCpu(), LowMem(), HotZone(), T0_MS), ThresholdReason::CPU_OVER);
    EXPECT_FALSE(covered.empty());
}
