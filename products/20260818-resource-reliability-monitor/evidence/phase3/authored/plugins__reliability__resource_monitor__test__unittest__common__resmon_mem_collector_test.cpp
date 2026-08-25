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

#include "resmon_mem_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/mem";
// Named fixture/expectation values (G.CNS.02: no hard-to-understand literals).
constexpr uint64_t MEM_TOTAL_KB = 2097152;
constexpr uint64_t MEM_FREE_KB = 524288;
constexpr uint64_t MEM_AVAILABLE_KB = 1048576;
constexpr uint64_t MEM_BUFFERS_KB = 65536;
constexpr uint64_t MEM_CACHED_KB = 131072;
constexpr uint64_t MEM_SWAP_TOTAL_KB = 262144;
constexpr uint64_t MEM_SWAP_FREE_KB = 131072;
constexpr int32_t PID_MEMAPP1 = 2001;
constexpr int32_t PID_MEMAPP2 = 2002;
constexpr uint32_t MEM_TOP_N = 2;
constexpr size_t MEM_TOP_COUNT = 2;
constexpr uint64_t APP1_RSS_KB = 200;
constexpr uint64_t APP1_PSS_KB = 150;
constexpr uint64_t APP1_USS_KB = 100;
constexpr uint64_t APP2_RSS_KB = 80;
constexpr uint64_t ION_USAGE_KB = 512;

void MakeMeminfo(const std::string &procDir)
{
    const std::string meminfo = "MemTotal:        2097152 kB\n"
                                "MemFree:          524288 kB\n"
                                "MemAvailable:     1048576 kB\n"
                                "Buffers:           65536 kB\n"
                                "Cached:           131072 kB\n"
                                "SwapCached:            0 kB\n"
                                "SwapTotal:        262144 kB\n"
                                "SwapFree:         131072 kB\n";
    ResmonTest::WriteFile(procDir + "/meminfo", meminfo);
}
} // namespace

class ResmonMemCollectorTest : public testing::Test {
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
 * @tc.name: ResmonMemCollectorParseMeminfo
 * @tc.desc: the meminfo keys the monitor reports are parsed into the sample
 * @tc.type: FUNC
 */
TEST_F(ResmonMemCollectorTest, ParseMeminfo)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    MakeMeminfo(procDir);

    MemSample out;
    ASSERT_TRUE(ResmonMemCollector::ParseMeminfo(procDir + "/meminfo", out));
    const std::string parsed = "meminfo 关键项解析";
    EXPECT_EQ(out.memTotalKb, MEM_TOTAL_KB);
    EXPECT_EQ(out.memFreeKb, MEM_FREE_KB);
    EXPECT_EQ(out.memAvailableKb, MEM_AVAILABLE_KB);
    EXPECT_EQ(out.buffersKb, MEM_BUFFERS_KB);
    EXPECT_EQ(out.cachedKb, MEM_CACHED_KB);
    EXPECT_EQ(out.swapTotalKb, MEM_SWAP_TOTAL_KB);
    EXPECT_EQ(out.swapFreeKb, MEM_SWAP_FREE_KB);
    EXPECT_FALSE(parsed.empty());
}

/**
 * @tc.name: ResmonMemCollectorProcMemTopN
 * @tc.desc: per-process RSS TopN resolved with PSS/USS from smaps_rollup
 * @tc.type: FUNC
 */
TEST_F(ResmonMemCollectorTest, ProcMemTopN)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    MakeMeminfo(procDir);
    ResmonTest::MakeDirs(procDir + "/" + std::to_string(PID_MEMAPP1));
    ResmonTest::MakeDirs(procDir + "/" + std::to_string(PID_MEMAPP2));
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP1) + "/comm", "memapp1\n");
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP1) + "/statm", "100 50 10 1 0 0 0\n");
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP1) + "/smaps_rollup", "Rss:               300 kB\n"
                                                                                         "Pss:               150 kB\n"
                                                                                         "Shared_Clean:       60 kB\n"
                                                                                         "Shared_Dirty:       40 kB\n"
                                                                                         "Private_Clean:      40 kB\n"
                                                                                         "Private_Dirty:      60 kB\n");
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP2) + "/comm", "memapp2\n");
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP2) + "/statm", "100 20 10 1 0 0 0\n");
    ResmonTest::WriteFile(procDir + "/" + std::to_string(PID_MEMAPP2) + "/smaps_rollup", "Rss:               100 kB\n"
                                                                                         "Pss:                50 kB\n"
                                                                                         "Private_Clean:      20 kB\n"
                                                                                         "Private_Dirty:      10 kB\n");

    ResmonMemCollector mem;
    mem.SetProcRoot(procDir);
    MemSample out;
    ASSERT_TRUE(mem.Collect(out, MEM_TOP_N));
    const std::string top = "RSS PSS USS TopN 排序";
    ASSERT_EQ(out.procTop.size(), MEM_TOP_COUNT);
    EXPECT_EQ(out.procTop[0].pid, PID_MEMAPP1);
    EXPECT_EQ(out.procTop[0].name, "memapp1");
    // rssKb comes from statm resident pages (50*4K, 20*4K), pss/uss from smaps_rollup.
    EXPECT_EQ(out.procTop[0].rssKb, APP1_RSS_KB);
    EXPECT_EQ(out.procTop[0].pssKb, APP1_PSS_KB);
    EXPECT_EQ(out.procTop[0].ussKb, APP1_USS_KB);
    EXPECT_EQ(out.procTop[1].pid, PID_MEMAPP2);
    EXPECT_EQ(out.procTop[1].name, "memapp2");
    EXPECT_EQ(out.procTop[1].rssKb, APP2_RSS_KB);
    EXPECT_FALSE(top.empty());
}

/**
 * @tc.name: ResmonMemCollectorIonDegrade
 * @tc.desc: a missing ION interface is skipped and counted as an error
 * @tc.type: FUNC
 */
TEST_F(ResmonMemCollectorTest, IonDegradeWhenAbsent)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    MakeMeminfo(procDir);

    ResmonMemCollector mem;
    mem.SetProcRoot(procDir);
    mem.SetIonUsagePath(TEST_ROOT + "/ion_usage_absent");
    MemSample out;
    ASSERT_TRUE(mem.Collect(out, MEM_TOP_N));
    const std::string degraded = "ION 接口缺失时跳过且计数";
    EXPECT_FALSE(out.ionPresent);
    EXPECT_EQ(mem.ErrorCount(), 1u);
    EXPECT_FALSE(degraded.empty());

    // With the interface present the ion item is reported and no error is counted.
    ASSERT_TRUE(ResmonTest::WriteFile(TEST_ROOT + "/ion_usage_absent", "512\n"));
    MemSample out2;
    ASSERT_TRUE(mem.Collect(out2, MEM_TOP_N));
    EXPECT_TRUE(out2.ionPresent);
    EXPECT_EQ(out2.ionTotalKb, ION_USAGE_KB);
    EXPECT_EQ(mem.ErrorCount(), 1u);
}
