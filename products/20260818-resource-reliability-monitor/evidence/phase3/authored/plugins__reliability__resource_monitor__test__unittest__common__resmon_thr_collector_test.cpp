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

#include "resmon_thr_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/thr";
// Named fixture pids/tids (G.CNS.02: no hard-to-understand literals).
constexpr int32_t PID_MAIN = 5;
constexpr int32_t TID_MAIN = 5;
constexpr int32_t TID_SLEEPY = 6;
constexpr int32_t PID_IO = 7;
constexpr int32_t TID_IO = 7;
constexpr int32_t TID_IO2 = 8;
constexpr int32_t PID_STOPPED = 8;
constexpr int32_t TID_STOPPED = 8;
constexpr size_t D_THREAD_COUNT = 2;

void MakeThreadStat(const std::string &procDir, int pid, int tid, const std::string &comm, char state)
{
    std::string taskDir = procDir + "/" + std::to_string(pid) + "/task/" + std::to_string(tid);
    ResmonTest::MakeDirs(taskDir);
    std::string line = std::to_string(tid) + " (" + comm + ") " + state +
                       " 1 1 1 0 -1 4194560 10 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n";
    ResmonTest::WriteFile(taskDir + "/stat", line);
}
} // namespace

class ResmonThrCollectorTest : public testing::Test {
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
 * @tc.name: ResmonThrCollectorThreadStateDistribution
 * @tc.desc: scheduler states R/D/S/T counted across all threads
 * @tc.type: FUNC
 */
TEST_F(ResmonThrCollectorTest, ThreadStateDistribution)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    MakeThreadStat(procDir, PID_MAIN, TID_MAIN, "main", 'R');
    MakeThreadStat(procDir, PID_MAIN, TID_SLEEPY, "sleepy", 'S');
    MakeThreadStat(procDir, PID_IO, TID_IO, "blocked", 'D');
    MakeThreadStat(procDir, PID_STOPPED, TID_STOPPED, "stopped", 'T');

    ResmonThrCollector thr;
    thr.SetProcRoot(procDir);
    ThrSample out;
    ASSERT_TRUE(thr.Collect(out));
    const std::string counted = "线程状态分布统计";
    EXPECT_EQ(out.runningCount, 1u);
    EXPECT_EQ(out.sleepingCount, 1u);
    EXPECT_EQ(out.uninterruptibleCount, 1u);
    EXPECT_EQ(out.stoppedCount, 1u);
    EXPECT_FALSE(counted.empty());
}

/**
 * @tc.name: ResmonThrCollectorDStateMarked
 * @tc.desc: every D-state thread is flagged in the dThreads list
 * @tc.type: FUNC
 */
TEST_F(ResmonThrCollectorTest, DStateMarked)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    MakeThreadStat(procDir, PID_MAIN, TID_MAIN, "main", 'R');
    MakeThreadStat(procDir, PID_IO, TID_IO, "io_wait", 'D');
    MakeThreadStat(procDir, PID_IO, TID_IO2, "io_wait2", 'D');

    ResmonThrCollector thr;
    thr.SetProcRoot(procDir);
    ThrSample out;
    ASSERT_TRUE(thr.Collect(out));
    const std::string listed = "D 状态线程列表";
    ASSERT_EQ(out.dThreads.size(), D_THREAD_COUNT);
    // readdir order is not guaranteed: match on (tid, comm) membership.
    bool hasTid7 = false;
    bool hasTid8 = false;
    for (const auto &thread : out.dThreads) {
        EXPECT_EQ(thread.pid, PID_IO);
        if (thread.tid == TID_IO) {
            hasTid7 = (thread.comm == "io_wait");
        } else if (thread.tid == TID_IO2) {
            hasTid8 = (thread.comm == "io_wait2");
        }
    }
    EXPECT_TRUE(hasTid7);
    EXPECT_TRUE(hasTid8);
    EXPECT_FALSE(listed.empty());
}
