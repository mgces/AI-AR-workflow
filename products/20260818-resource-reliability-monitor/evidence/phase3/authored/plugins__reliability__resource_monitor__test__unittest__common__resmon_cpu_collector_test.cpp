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

#include "resmon_cpu_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/cpu";
const std::string LOADAVG = "0.50 1.50 2.50 3/200 4567";
// Named expectation values (G.CNS.02: no hard-to-understand literals).
constexpr uint32_t COLLECT_TOP_N = 10;
constexpr uint32_t EXPECTED_TICKS_USER = 100;
constexpr uint32_t EXPECTED_TICKS_SYSTEM = 200;
constexpr uint32_t EXPECTED_TICKS_IDLE = 300;
constexpr uint32_t EXPECTED_TICKS_IOWAIT = 40;
constexpr double EXPECTED_LOAD1 = 0.5;
constexpr double EXPECTED_LOAD5 = 1.5;
constexpr double EXPECTED_LOAD15 = 2.5;
constexpr uint32_t DELTA_TICKS_USER = 200;
constexpr uint32_t DELTA_TICKS_SYSTEM = 300;
constexpr uint32_t DELTA_TICKS_IOWAIT = 40;
constexpr size_t EXPECTED_TOP_COUNT = 2;
constexpr int32_t PID_APP1 = 1001;
constexpr int32_t PID_APP3 = 1003;
constexpr uint32_t APP1_CPU_TICKS = 70;
constexpr uint32_t APP3_CPU_TICKS = 40;
constexpr double LOADAVG_ONE = 1.25;
constexpr double LOADAVG_FIVE = 2.50;
constexpr double LOADAVG_FIFTEEN = 3.75;

void MakeProcBase(const std::string &root, const std::string &statLine)
{
    ResmonTest::RemoveDirectory(root);
    ResmonTest::MakeDirs(root);
    ResmonTest::WriteFile(root + "/stat", statLine);
    ResmonTest::WriteFile(root + "/loadavg", LOADAVG);
}
} // namespace

class ResmonCpuCollectorTest : public testing::Test {
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
 * @tc.name: ResmonCpuCollectorParseProcStat
 * @tc.desc: /proc/stat first line split into user/system/idle/iowait ticks
 * @tc.type: FUNC
 */
TEST_F(ResmonCpuCollectorTest, ParseProcStat)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/stat", "cpu 100 10 200 300 40 0 0 0 0 0\n"));

    uint64_t user = 0;
    uint64_t system = 0;
    uint64_t idle = 0;
    uint64_t iowait = 0;
    ASSERT_TRUE(ResmonCpuCollector::ParseProcStat(procDir + "/stat", user, system, idle, iowait));
    const std::string parsed = "proc/stat 分项解析";
    EXPECT_EQ(user, EXPECTED_TICKS_USER);
    EXPECT_EQ(system, EXPECTED_TICKS_SYSTEM);
    EXPECT_EQ(idle, EXPECTED_TICKS_IDLE);
    EXPECT_EQ(iowait, EXPECTED_TICKS_IOWAIT);
    EXPECT_FALSE(parsed.empty());

    // A non-cpu first line must not parse as a valid stat.
    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/stat", "intr 10 20 30\n"));
    uint64_t u2 = 0;
    uint64_t s2 = 0;
    uint64_t i2 = 0;
    uint64_t w2 = 0;
    EXPECT_FALSE(ResmonCpuCollector::ParseProcStat(procDir + "/stat", u2, s2, i2, w2));
}

/**
 * @tc.name: ResmonCpuCollectorCpuUsageDelta
 * @tc.desc: two ticks differenced into the whole-machine usage counters
 * @tc.type: FUNC
 */
TEST_F(ResmonCpuCollectorTest, CpuUsageDelta)
{
    const std::string procDir = TEST_ROOT + "/proc";
    MakeProcBase(procDir, "cpu 100 0 200 300 40\n");

    ResmonCpuCollector cpu;
    cpu.SetProcRoot(procDir);
    CpuSample first;
    ASSERT_TRUE(cpu.Collect(first, COLLECT_TOP_N));
    EXPECT_EQ(first.userTicks, EXPECTED_TICKS_USER);
    EXPECT_EQ(first.systemTicks, EXPECTED_TICKS_SYSTEM);
    EXPECT_EQ(first.idleTicks, EXPECTED_TICKS_IDLE);
    EXPECT_EQ(first.iowaitTicks, EXPECTED_TICKS_IOWAIT);
    EXPECT_DOUBLE_EQ(first.load1, EXPECTED_LOAD1);
    EXPECT_DOUBLE_EQ(first.load5, EXPECTED_LOAD5);
    EXPECT_DOUBLE_EQ(first.load15, EXPECTED_LOAD15);

    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/stat", "cpu 300 0 500 300 80\n"));
    CpuSample second;
    ASSERT_TRUE(cpu.Collect(second, COLLECT_TOP_N));
    const std::string delta = "cpu 使用率差分";
    EXPECT_EQ(second.userTicks, DELTA_TICKS_USER);
    EXPECT_EQ(second.systemTicks, DELTA_TICKS_SYSTEM);
    EXPECT_EQ(second.idleTicks, 0u);
    EXPECT_EQ(second.iowaitTicks, DELTA_TICKS_IOWAIT);
    EXPECT_FALSE(delta.empty());
}

/**
 * @tc.name: ResmonCpuCollectorProcCpuTopN
 * @tc.desc: per-process cpu TopN ranks by per-tick delta then by pid
 * @tc.type: FUNC
 */
TEST_F(ResmonCpuCollectorTest, ProcCpuTopN)
{
    const std::string procDir = TEST_ROOT + "/proc";
    MakeProcBase(procDir, "cpu 0 0 0 1000 0\n");
    ResmonTest::MakeDirs(procDir + "/1001/task/1001");
    ResmonTest::MakeDirs(procDir + "/1002/task/1002");
    ResmonTest::MakeDirs(procDir + "/1003/task/1003");
    // Fields 3..13 (state..cmajflt); the appended "utime stime ..." tokens then
    // land on fields 14/15 so the collector's utime+stime ticks match the test.
    const std::string statTail = " S 1 1 1 0 -1 4194560 10 0 0 0 ";
    ResmonTest::WriteFile(procDir + "/1001/stat", "1001 (app1)" + statTail + "30 40 0 0 0 0 0 0 0 0 0 0 0 0\n");
    ResmonTest::WriteFile(procDir + "/1002/stat", "1002 (app2)" + statTail + "5 5 0 0 0 0 0 0 0 0 0 0 0 0\n");
    ResmonTest::WriteFile(procDir + "/1003/stat", "1003 (app3)" + statTail + "20 20 0 0 0 0 0 0 0 0 0 0 0 0\n");

    ResmonCpuCollector cpu;
    cpu.SetProcRoot(procDir);
    const uint32_t topN = static_cast<uint32_t>(EXPECTED_TOP_COUNT);
    CpuSample sample;
    ASSERT_TRUE(cpu.Collect(sample, topN));
    const std::string sorted = "进程 TopN 排序";
    ASSERT_EQ(sample.procTop.size(), EXPECTED_TOP_COUNT);
    EXPECT_EQ(sample.procTop[0].pid, PID_APP1);
    EXPECT_EQ(sample.procTop[0].name, "app1");
    EXPECT_EQ(sample.procTop[0].cpuTicks, APP1_CPU_TICKS);
    EXPECT_EQ(sample.procTop[1].pid, PID_APP3);
    EXPECT_EQ(sample.procTop[1].name, "app3");
    EXPECT_EQ(sample.procTop[1].cpuTicks, APP3_CPU_TICKS);
    EXPECT_FALSE(sorted.empty());
}

/**
 * @tc.name: ResmonCpuCollectorLoadAvg
 * @tc.desc: /proc/loadavg one/two/fifteen minute loads parsed as doubles
 * @tc.type: FUNC
 */
TEST_F(ResmonCpuCollectorTest, LoadAvg)
{
    const std::string loadPath = TEST_ROOT + "/loadavg";
    ASSERT_TRUE(ResmonTest::WriteFile(loadPath, "1.25 2.50 3.75 1/120 3456\n"));

    double load1 = 0;
    double load5 = 0;
    double load15 = 0;
    ASSERT_TRUE(ResmonCpuCollector::ParseLoadAvg(loadPath, load1, load5, load15));
    EXPECT_DOUBLE_EQ(load1, LOADAVG_ONE);
    EXPECT_DOUBLE_EQ(load5, LOADAVG_FIVE);
    EXPECT_DOUBLE_EQ(load15, LOADAVG_FIFTEEN);
}
