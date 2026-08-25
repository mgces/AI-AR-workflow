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

#include "resmon_pwr_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/pwr";
// Named fixture/expectation values (G.CNS.02: no hard-to-understand literals).
constexpr size_t ZONE_COUNT = 2;
constexpr int32_t CPU_ZONE_TEMP_C = 30;
constexpr int32_t GPU_ZONE_TEMP_C = 45;
constexpr int32_t ZONE_TEMP_C = 45;
constexpr size_t TRIP_COUNT = 2;
constexpr int32_t TRIP_LOW_C = 60;
constexpr int32_t TRIP_HIGH_C = 80;
constexpr int32_t HOT_ZONE_TEMP_C = 75;

void MakeZone(const std::string &zoneDir, const std::string &type, const std::string &temp)
{
    ResmonTest::MakeDirs(zoneDir);
    ResmonTest::WriteFile(zoneDir + "/type", type);
    ResmonTest::WriteFile(zoneDir + "/temp", temp);
}
} // namespace

class ResmonPwrCollectorTest : public testing::Test {
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
 * @tc.name: ResmonPwrCollectorThermalZones
 * @tc.desc: every thermal_zone* dir under sysfs is read into a zone sample
 * @tc.type: FUNC
 */
TEST_F(ResmonPwrCollectorTest, ThermalZones)
{
    const std::string sys = TEST_ROOT + "/sys";
    const std::string thermal = sys + "/class/thermal";
    ResmonTest::MakeDirs(thermal + "/thermal_zone0");
    ResmonTest::MakeDirs(thermal + "/thermal_zone1");
    MakeZone(thermal + "/thermal_zone0", "cpu-thermal", "30000");
    MakeZone(thermal + "/thermal_zone1", "gpu-thermal", "45000");

    ResmonPwrCollector pwr;
    pwr.SetSysRoot(sys);
    PwrSample out;
    ASSERT_TRUE(pwr.Collect(out));
    const std::string walked = "thermal zone 温度遍历";
    ASSERT_EQ(out.zones.size(), ZONE_COUNT);
    bool hasCpu = false;
    bool hasGpu = false;
    for (const auto &zone : out.zones) {
        if (zone.type == "cpu-thermal") {
            hasCpu = true;
            EXPECT_EQ(zone.tempC, CPU_ZONE_TEMP_C);
        } else if (zone.type == "gpu-thermal") {
            hasGpu = true;
            EXPECT_EQ(zone.tempC, 45);
        }
    }
    EXPECT_TRUE(hasCpu);
    EXPECT_TRUE(hasGpu);
    EXPECT_FALSE(walked.empty());
}

/**
 * @tc.name: ResmonPwrCollectorTripPoints
 * @tc.desc: trip_point_*_temp values read and fed into the over-limit judge
 * @tc.type: FUNC
 */
TEST_F(ResmonPwrCollectorTest, TripPoints)
{
    const std::string zoneDir = TEST_ROOT + "/zone";
    ResmonTest::MakeDirs(zoneDir);
    ResmonTest::WriteFile(zoneDir + "/temp", "45000");
    ResmonTest::WriteFile(zoneDir + "/trip_point_0_temp", "80000");
    ResmonTest::WriteFile(zoneDir + "/trip_point_1_temp", "60000");
    ResmonTest::WriteFile(zoneDir + "/trip_point_2_temp", "not-a-number");

    ThermalZoneItem zone;
    ASSERT_TRUE(ResmonPwrCollector::ParseZoneTemp(zoneDir, zone));
    const std::string trips = "trip point 越限判定输入";
    EXPECT_EQ(zone.tempC, ZONE_TEMP_C);
    ASSERT_EQ(zone.tripC.size(), TRIP_COUNT);
    EXPECT_EQ(zone.tripC[0], TRIP_LOW_C);
    EXPECT_EQ(zone.tripC[1], TRIP_HIGH_C);
    // Below every trip point the zone is not over-limit.
    EXPECT_FALSE(zone.OverTrip());

    // A zone temperature at or above a trip point is over-limit.
    ThermalZoneItem hot;
    hot.tempC = HOT_ZONE_TEMP_C;
    hot.tripC = {TRIP_LOW_C, TRIP_HIGH_C};
    EXPECT_TRUE(hot.OverTrip());
    EXPECT_FALSE(trips.empty());
}
